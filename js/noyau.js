/* ==========================================================
   NOYAU DE L'APPLICATION
   ----------------------------------------------------------
   - Connexion à Supabase (clé PUBLIQUE : la sécurité vient des règles RLS)
   - Outils communs : messages, fenêtres, dates, montants, erreurs
   - Navigation entre écrans + contrôle des rôles
   - Inscription (accès immédiat), connexion, déconnexion, compte suspendu
   Les autres fichiers s'appuient sur `window.App`.
   ========================================================== */
(function () {
  'use strict';

  var CFG = window.EGLISE_CONFIG;
  var sb = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
  });

  var App = window.App = {
    sb: sb,
    CFG: CFG,
    // etat : 'init' | 'dehors' (non connecté) | 'attente' (compte suspendu) | 'dedans'
    etat: { etat: 'init', session: null, profil: null, role: 'membre', mesCellules: [], mesDepartements: [] },
    ecrans: {},        // App.ecrans.nom = fonction appelée à l'ouverture de l'écran « nom »
    quitter: {},       // App.quitter.nom = fonction appelée quand on quitte l'écran
    actions: {},       // clics   : <button data-act="nom" data-id="...">
    formulaires: {}    // envois  : <form data-form="nom">
  };

  var $ = App.$ = function (id) { return document.getElementById(id); };

  App.esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  var esc = App.esc;

  /* ---------------------------------------------------------
     LIBELLÉS
     --------------------------------------------------------- */
  App.ROLES = { super_admin: 'Administrateur', berger: 'Berger', chef_departement: 'Chef de département', comptable: 'Comptable', membre: 'Membre' };
  App.STATUTS = { actif: 'Actif', en_attente: 'En attente', suspendu: 'Suspendu' };
  App.JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
  App.TYPES_PROGRAMME = { jeune: 'Jeunes', priere: 'Prière', croisade: 'Croisade', convention: 'Convention', autre: 'Autre' };
  App.STATUTS_SEANCE = { prevu: 'Prévu', en_cours: 'En cours', termine: 'Terminé', annule: 'Annulé' };
  App.CIBLES = { tous: "Toute l'église", cellule: 'Une cellule', departement: 'Un département' };
  App.CATEGORIES_FINANCE = {
    entree: ['Dîme', 'Offrande', 'Don', 'Vente', 'Autre entrée'],
    sortie: ['Loyer', 'Électricité / eau', 'Matériel', 'Transport', 'Aide sociale', 'Salaire', 'Autre dépense']
  };

  App.nomComplet = function (u) {
    if (!u) return '—';
    var n = ((u.prenom || '') + ' ' + (u.nom || '')).trim();
    return n || App.fmtTel(u.telephone) || '—';
  };
  App.initiales = function (u) {
    var a = ((u && u.prenom) || '').trim().charAt(0), b = ((u && u.nom) || '').trim().charAt(0);
    return ((a + b) || '?').toUpperCase();
  };
  App.cap = function (s) { s = String(s || ''); return s.charAt(0).toUpperCase() + s.slice(1); };

  /* ---------------------------------------------------------
     TÉLÉPHONE : c'est l'identifiant de connexion
     --------------------------------------------------------- */
  /* Garde uniquement les chiffres et enlève l'indicatif du pays s'il est écrit */
  App.normaliserTel = function (t) {
    var d = String(t || '').replace(/\D/g, '');
    if (d.indexOf('00' + CFG.INDICATIF) === 0) d = d.slice(2 + CFG.INDICATIF.length);
    else if (d.indexOf(CFG.INDICATIF) === 0 && d.length > 9) d = d.slice(CFG.INDICATIF.length);
    return d;
  };
  App.telValide = function (t) {
    var d = App.normaliserTel(t);
    return d.length >= 8 && d.length <= 15;
  };
  /* Identifiant technique envoyé à Supabase (jamais montré à l'utilisateur) */
  App.telVersIdentifiant = function (t) {
    return App.normaliserTel(t) + '@' + CFG.DOMAINE_INTERNE;
  };
  /* Champ de connexion : un numéro, ou une ancienne adresse mail */
  App.versIdentifiant = function (saisie) {
    saisie = String(saisie || '').trim();
    return saisie.indexOf('@') >= 0 ? saisie.toLowerCase() : App.telVersIdentifiant(saisie);
  };
  /* Affichage : « 06 42 83 322 » */
  App.fmtTel = function (t) {
    var d = App.normaliserTel(t);
    if (!d) return '—';
    return d.replace(/(\d{2})(\d{2})(\d{2})(\d+)/, '$1 $2 $3 $4');
  };
  /* Un identifiant interne ne doit jamais s'afficher comme une adresse mail */
  App.estIdentifiantInterne = function (email) {
    return String(email || '').indexOf('@' + CFG.DOMAINE_INTERNE) > 0;
  };
  App.sansAccent = function (s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); };

  /* ---------------------------------------------------------
     DATES ET MONTANTS
     --------------------------------------------------------- */
  App.iso = function (d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  };
  App.dateDe = function (s) {
    var p = String(s).slice(0, 10).split('-');
    return new Date(+p[0], +p[1] - 1, +p[2]);
  };
  App.lundi = function (d) {
    var x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
    return x;
  };
  App.fmtDate = function (s, long) {
    if (!s) return '—';
    return App.dateDe(s).toLocaleDateString('fr-FR', long
      ? { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }
      : { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  };
  App.fmtHeure = function (t) {
    if (!t) return '';
    var p = String(t).split(':');
    return p[0] + 'h' + (p[1] || '00');
  };
  App.fmtDateHeure = function (iso) {
    if (!iso) return '';
    var d = new Date(iso);
    return d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }) +
      ' à ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }).replace(':', 'h');
  };
  /* Montant en francs CFA : « 125 000 F » */
  App.fmtMontant = function (n, avecDevise) {
    var v = Math.round(Number(n) || 0).toLocaleString('fr-FR').replace(/ | /g, ' ');
    return avecDevise === false ? v : v + ' F';
  };
  /* Valeur d'un <input type="datetime-local"> → texte ISO complet */
  App.localVersIso = function (v) { return v ? new Date(v).toISOString() : null; };
  App.isoVersLocal = function (s) {
    if (!s) return '';
    var d = new Date(s);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') +
      'T' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  };

  /* ---------------------------------------------------------
     VERSET DU JOUR (Bible Louis Segond 1910, domaine public)
     --------------------------------------------------------- */
  var VERSETS = [
    ["Car je connais les projets que j'ai formés sur vous, projets de paix et non de malheur, afin de vous donner un avenir et de l'espérance.", 'Jérémie 29.11'],
    ["L'Éternel est mon berger : je ne manquerai de rien.", 'Psaume 23.1'],
    ['Je puis tout par celui qui me fortifie.', 'Philippiens 4.13'],
    ['Ta parole est une lampe à mes pieds, et une lumière sur mon sentier.', 'Psaume 119.105'],
    ["Ne crains rien, car je suis avec toi ; ne promène pas des regards inquiets, car je suis ton Dieu.", 'Ésaïe 41.10'],
    ["Recommande à l'Éternel tes œuvres, et tes projets réussiront.", 'Proverbes 16.3'],
    ["C'est ici la journée que l'Éternel a faite : qu'elle soit pour nous un sujet d'allégresse et de joie !", 'Psaume 118.24'],
    ['Que tout ce que vous faites se fasse avec charité.', '1 Corinthiens 16.14'],
    ["Car là où deux ou trois sont assemblés en mon nom, je suis au milieu d'eux.", 'Matthieu 18.20'],
    ["Déchargez-vous sur lui de tous vos soucis, car lui-même prend soin de vous.", '1 Pierre 5.7'],
    ['Cherchez premièrement le royaume et la justice de Dieu ; et toutes ces choses vous seront données par-dessus.', 'Matthieu 6.33'],
    ["Béni soit l'homme qui se confie dans l'Éternel, et dont l'Éternel est l'espérance !", 'Jérémie 17.7'],
    ["Fortifiez-vous et ayez du courage ! Car l'Éternel, ton Dieu, est avec toi dans tout ce que tu entreprendras.", 'Josué 1.9'],
    ["L'Éternel combattra pour vous ; et vous, gardez le silence.", 'Exode 14.14']
  ];
  App.versetDuJour = function () {
    var d = new Date();
    var n = Math.floor(new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() / 864e5);
    return VERSETS[n % VERSETS.length];
  };
  App.htmlVerset = function () {
    var v = App.versetDuJour();
    return '<span class="guill">&ldquo;</span><p>' + esc(v[0]) + '</p><cite>' + esc(v[1]) + '</cite>';
  };

  /* ---------------------------------------------------------
     MESSAGES, ERREURS, BOUTONS OCCUPÉS
     --------------------------------------------------------- */
  var minuteurFlash;
  App.flash = function (msg) {
    var f = $('flash');
    f.textContent = msg;
    f.classList.add('on');
    clearTimeout(minuteurFlash);
    minuteurFlash = setTimeout(function () { f.classList.remove('on'); }, 3400);
  };

  /* Transforme une erreur technique en phrase compréhensible */
  App.msgErreur = function (e) {
    var m = (e && e.message) || String(e || ''), c = e && e.code;
    if (/Failed to fetch|NetworkError|Load failed|network/i.test(m)) return 'Connexion impossible. Vérifiez votre accès internet puis réessayez.';
    if (/Invalid login credentials/i.test(m)) return 'Numéro de téléphone ou mot de passe incorrect.';
    if (/Email not confirmed/i.test(m)) return "Votre compte n'est pas encore activé. Réessayez dans un instant.";
    if (/already registered|already been registered/i.test(m)) return 'Ce numéro est déjà inscrit. Connectez-vous.';
    if (/rate limit|too many|after \d+ seconds/i.test(m) || (e && e.status === 429)) return 'Trop de tentatives. Patientez quelques minutes puis réessayez.';
    if (/Password should be|weak/i.test(m)) return 'Le mot de passe est trop faible (8 caractères minimum).';
    if (/valid email|invalid.*email/i.test(m)) return "Ce numéro de téléphone n'est pas accepté.";
    if (c === '42501' || /row-level security|permission denied/i.test(m)) return 'Action non autorisée pour votre compte.';
    if (c === '23505') return 'Cet enregistrement existe déjà.';
    if (c === '23503') return "Cet élément est encore utilisé ailleurs : l'opération est impossible.";
    if (c === '23514') return "Une des valeurs saisies n'est pas valide.";
    return 'Une erreur est survenue : ' + m;
  };

  App.erreurEcran = function (id, msg, info) {
    var el = $(id);
    if (!el) return;
    el.textContent = msg || '';
    el.classList.toggle('on', !!msg);
    el.classList.toggle('info', !!info);
  };
  App.erreurFeuille = function (msg) {
    var el = $('feuille').querySelector('.alerte');
    if (!el) { App.flash(msg); return; }
    el.textContent = msg || '';
    el.classList.toggle('on', !!msg);
    $('feuille').scrollTop = 0;
  };

  App.occupe = function (b, on, txt) {
    if (!b) return;
    if (on) {
      if (b.dataset.t === undefined) b.dataset.t = b.textContent;
      b.disabled = true;
      if (txt) b.textContent = txt;
    } else {
      b.disabled = false;
      if (b.dataset.t !== undefined) { b.textContent = b.dataset.t; delete b.dataset.t; }
    }
  };

  /* ---------------------------------------------------------
     ACCÈS AUX DONNÉES
     --------------------------------------------------------- */
  App.q = async function (promesse) {
    var r = await promesse;
    if (r.error) throw r.error;
    return r.data;
  };
  /* Lit toutes les lignes, même au-delà de la limite de 1000 par requête */
  App.lireTout = async function (fabrique) {
    var sortie = [], pas = 1000, debut = 0;
    // (un .limit() déjà posé sur la requête reste respecté par range)
    for (;;) {
      var r = await fabrique().range(debut, debut + pas - 1);
      if (r.error) throw r.error;
      sortie = sortie.concat(r.data);
      if (r.data.length < pas) break;
      debut += pas;
    }
    return sortie;
  };
  App.par = function (liste, id) {
    for (var i = 0; i < (liste || []).length; i++) if (liste[i].id === id) return liste[i];
    return null;
  };

  /* ---------------------------------------------------------
     FENÊTRE (« feuille ») ET CONFIRMATION
     --------------------------------------------------------- */
  var resolutionConfirmation = null;

  App.ouvrir = function (html) {
    $('feuille').innerHTML = html;
    $('feuille').scrollTop = 0;
    $('voile').classList.add('on');
    var premier = $('feuille').querySelector('input:not([type=hidden]),select,textarea');
    if (premier && !(window.matchMedia && matchMedia('(pointer:coarse)').matches)) premier.focus();
  };
  App.fermer = window.fermer = function () {
    $('voile').classList.remove('on');
    if (resolutionConfirmation) { var r = resolutionConfirmation; resolutionConfirmation = null; r(false); }
  };
  App.confirmer = function (titre, texte, oui, rouge) {
    return new Promise(function (res) {
      App.ouvrir('<h3>' + esc(titre) + '</h3><p>' + esc(texte) + '</p>' +
        '<div class="duo"><button class="btn btn-vide" data-conf="0">Annuler</button>' +
        '<button class="btn ' + (rouge ? 'btn-rouge' : 'btn-plein') + '" data-conf="1">' + esc(oui) + '</button></div>');
      resolutionConfirmation = res;
    });
  };
  App.info = function (titre, texte) {
    App.ouvrir('<h3>' + esc(titre) + '</h3><p>' + esc(texte) + '</p>' +
      '<button class="btn btn-vide" data-conf="0">J\'ai compris</button>');
  };

  App.vide = function (titre, texte, bouton) {
    return '<div class="vide"><div class="rond"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M12 8v5M12 16.2v.1"/></svg></div>' +
      '<b>' + esc(titre) + '</b>' + esc(texte || '') + (bouton || '') + '</div>';
  };
  /* Squelette animé : l'écran montre tout de suite sa structure pendant le chargement */
  App.squelette = function (n) {
    var un = '<div class="squelette"><i></i><i></i><i></i></div>';
    return new Array(n || 3).fill(un).join('');
  };

  App.htmlErreur = function (e) {
    return '<div class="vide"><b>Chargement impossible</b>' + esc(App.msgErreur(e)) +
      '<div style="margin-top:14px"><button class="btn btn-doux btn-s" data-act="recharger">Réessayer</button></div></div>';
  };

  /* Champs de formulaire pour les fenêtres */
  App.champ = function (nom, libelle, valeur, type, attributs) {
    return '<div class="champ"><label for="x-' + nom + '">' + esc(libelle) + '</label>' +
      '<input id="x-' + nom + '" name="' + nom + '" type="' + (type || 'text') + '" value="' + esc(valeur == null ? '' : valeur) + '" ' + (attributs || '') + '></div>';
  };
  App.champZone = function (nom, libelle, valeur, place) {
    return '<div class="champ"><label for="x-' + nom + '">' + esc(libelle) + '</label>' +
      '<textarea id="x-' + nom + '" name="' + nom + '" placeholder="' + esc(place || '') + '">' + esc(valeur || '') + '</textarea></div>';
  };
  App.champSelect = function (nom, libelle, options, valeur, vide, aide) {
    var opts = (vide === null ? '' : '<option value="">' + esc(vide || '—') + '</option>') +
      (options || []).map(function (o) {
        var v = o.id !== undefined ? o.id : o.v, t = o.nom !== undefined ? o.nom : o.t;
        return '<option value="' + esc(v) + '"' + (String(v) === String(valeur) ? ' selected' : '') + '>' + esc(t) + '</option>';
      }).join('');
    return '<div class="champ"><label for="x-' + nom + '">' + esc(libelle) + '</label>' +
      '<select id="x-' + nom + '" name="' + nom + '">' + opts + '</select>' +
      (aide ? '<p class="aide">' + esc(aide) + '</p>' : '') + '</div>';
  };
  App.vider = function (v) { var s = String(v == null ? '' : v).trim(); return s === '' ? null : s; };
  App.optionsDe = function (objet) {
    return Object.keys(objet).map(function (k) { return { v: k, t: objet[k] }; });
  };

  /* Carte d'une fiche de cellule (admin et berger) */
  App.htmlFiche = function (f, opts) {
    opts = opts || {};
    var chiffres = [
      ['hommes', f.nb_hommes], ['femmes', f.nb_femmes], ['enfants', f.nb_enfants],
      ['nouveaux', f.nb_nouveaux_venus], ['conversions', f.nb_conversions_7j],
      ['familles visitées', f.nb_familles_visitees_7j], ['témoignages', f.nb_temoignages]
    ].map(function (c) { return '<b>' + c[1] + '</b> ' + c[0]; }).join(' · ');
    var detail = [App.cap(App.fmtDate(f.date_reunion)), App.fmtHeure(f.heure_debut) + ' – ' + App.fmtHeure(f.heure_fin)];
    if (opts.berger) detail.push('par ' + opts.berger);
    return '<div class="membre">' +
      '<div class="mb-haut"><div><div class="mb-nom">' + esc(opts.cellule || 'Réunion de cellule') + '</div>' +
      '<div class="mb-detail">' + esc(detail.join(' · ')) + '</div></div>' +
      '<div style="text-align:right"><div class="total-fiche">' + f.nb_total_presents + '</div><div class="mb-detail" style="margin-top:0">présents</div></div></div>' +
      '<div class="mb-chiffres">' + chiffres + '</div>' +
      (f.difficultes_suggestions ? '<div class="mb-note">' + esc(f.difficultes_suggestions) + '</div>' : '') +
      (opts.modifier ? '<div class="mb-actions"><button class="btn btn-doux btn-s" data-act="modifier-fiche" data-id="' + esc(f.id) + '">Modifier</button></div>' : '') +
      '</div>';
  };

  /* ---------------------------------------------------------
     NAVIGATION ET RÔLES
     --------------------------------------------------------- */
  var TOUS = ['super_admin', 'berger', 'chef_departement', 'comptable', 'membre'];
  var ADMIN = ['super_admin'];
  var COMPTES = ['super_admin', 'comptable'];
  var META = {
    accueil: { etat: 'dehors' }, inscription: { etat: 'dehors' }, connexion: { etat: 'dehors' },
    attente: { etat: 'attente' },
    bienvenue: { roles: TOUS }, programmes: { roles: TOUS }, calendrier: { roles: TOUS },
    messages: { roles: TOUS }, discussions: { roles: TOUS }, plus: { roles: TOUS },
    'mon-profil': { roles: TOUS }, guide: { roles: TOUS },
    tableau: { roles: ADMIN }, cellules: { roles: ADMIN }, membres: { roles: ADMIN },
    departements: { roles: ADMIN }, fiches: { roles: ADMIN }, apparence: { roles: ADMIN },
    'ma-cellule': { roles: ['berger'] }, 'fiche-cellule': { roles: ['berger'] }, 'mes-fiches': { roles: ['berger'] },
    'mon-departement': { roles: ['chef_departement'] },
    dimanche: { roles: COMPTES }, finances: { roles: COMPTES }
  };
  App.META = META;

  /* Écrans rangés sous l'onglet « Plus » du téléphone, par rôle */
  var PLUS = {
    super_admin: ['tableau', 'programmes', 'calendrier', 'messages', 'departements', 'fiches', 'dimanche', 'finances', 'apparence', 'guide', 'mon-profil'],
    berger: ['programmes', 'calendrier', 'messages', 'mes-fiches', 'guide', 'mon-profil'],
    chef_departement: ['calendrier', 'messages', 'guide', 'mon-profil'],
    comptable: ['programmes', 'calendrier', 'messages', 'guide', 'mon-profil'],
    membre: ['calendrier', 'guide', 'mon-profil']
  };
  App.PLUS = PLUS;

  App.roleUi = function (p) { return App.ROLES[p.role] ? p.role : 'membre'; };
  function hash() { return location.hash.replace('#', ''); }

  function autorise(id) {
    var m = META[id], E = App.etat;
    if (!m) return false;
    if (m.etat) return E.etat === m.etat;
    return E.etat === 'dedans' && m.roles.indexOf(E.role) >= 0;
  }
  App.autorise = autorise;
  App.pageDAccueil = function () {
    var E = App.etat;
    if (E.etat === 'dedans') return 'bienvenue';
    return E.etat === 'attente' ? 'attente' : 'accueil';
  };

  /* Habille un écran : illustration d'arrière-plan + titre de la page.
     Fait une seule fois par écran, puis plus rien à recalculer. */
  function habiller(id) {
    if (!window.Scenes) return;
    var el = $('e-' + id);
    if (!el) return;
    var titre = el.querySelector('.entete h1');
    titre = titre ? titre.textContent : '';
    el.querySelectorAll('.hero, .dome, .barre, .entete, .bande-valeurs, .appel').forEach(function (bloc) {
      if (bloc.dataset.habille) return;
      bloc.dataset.habille = '1';
      // les bandeaux peu hauts montrent le bas de l'illustration (les silhouettes)
      var bande = bloc.classList.contains('barre') || bloc.classList.contains('entete') || bloc.classList.contains('dome');
      bloc.insertAdjacentHTML('afterbegin', window.Scenes.pourEcran(id, bande ? 'bas' : null) + '<div class="voile-scene"></div>');
      if (bloc.classList.contains('barre') && titre) {
        bloc.insertAdjacentHTML('beforeend', '<div class="titre-ecran">' + esc(titre) + '</div>');
      }
    });
  }
  App.habiller = habiller;

  function activer(id) {
    habiller(id);
    var E = App.etat;
    document.querySelectorAll('.ecran').forEach(function (s) { s.classList.toggle('on', s.id === 'e-' + id); });
    var sousPlus = (PLUS[E.role] || []).indexOf(id) >= 0;
    document.querySelectorAll('.rail nav button, .rail .moi').forEach(function (b) {
      b.classList.toggle('on', b.dataset.cible === id);
    });
    document.querySelectorAll('#nav-bas button').forEach(function (b) {
      b.classList.toggle('on', b.dataset.cible === (sousPlus ? 'plus' : id));
    });
    window.scrollTo(0, 0);
  }

  var ecranCourant = null;
  /* mode : undefined = nouvelle entrée d'historique ; 'remplacer' ; 'retour' */
  var aller = window.aller = App.aller = function (id, mode) {
    if (!autorise(id)) id = App.pageDAccueil();
    if (ecranCourant && ecranCourant !== id && App.quitter[ecranCourant]) App.quitter[ecranCourant]();
    ecranCourant = id;
    activer(id);
    if (mode === 'remplacer') history.replaceState(null, '', '#' + id);
    else if (mode !== 'retour' && hash() !== id) history.pushState(null, '', '#' + id);
    var charger = App.ecrans[id];
    if (charger) charger();
  };
  App.ecranCourant = function () { return ecranCourant; };
  App.rechargerEcran = function () { if (App.ecrans[ecranCourant]) App.ecrans[ecranCourant](); };
  App.actions.recharger = function () { App.rechargerEcran(); };

  /* Affiche/masque les éléments selon l'état de connexion et le rôle */
  function majEtatEtRole() {
    var E = App.etat, app = $('app');
    app.dataset.etat = E.etat;
    app.dataset.role = E.role;
    document.querySelectorAll('[data-roles]').forEach(function (el) {
      el.hidden = !(E.etat === 'dedans' && el.dataset.roles.split(' ').indexOf(E.role) >= 0);
    });
  }
  App.majEtatEtRole = majEtatEtRole;

  function majIdentite() {
    var p = App.etat.profil;
    if (!p) return;
    var ini = App.initiales(p);
    document.querySelectorAll('[data-init]').forEach(function (el) { el.textContent = ini; });
    document.querySelectorAll('[data-prenom]').forEach(function (el) { el.textContent = p.prenom || 'Compte'; });
    $('rail-init').textContent = ini;
    $('rail-nom').textContent = App.nomComplet(p);
    $('rail-role').textContent = App.ROLES[p.role] || 'Membre';
  }
  App.majIdentite = majIdentite;

  /* Pastille rouge : membres pas encore rattachés à une cellule */
  App.majCompteur = function (n) {
    document.querySelectorAll('[data-compteur]').forEach(function (el) {
      el.textContent = n > 99 ? '99+' : n;
      el.hidden = !(n > 0) || App.etat.role !== 'super_admin' || App.etat.etat !== 'dedans';
    });
  };

  /* ---------------------------------------------------------
     SESSION
     --------------------------------------------------------- */
  async function lireProfil() {
    var r = await sb.from('users').select('*').eq('id', App.etat.session.user.id).maybeSingle();
    if (r.error) throw r.error;
    return r.data;
  }
  App.lireProfil = lireProfil;

  function textesAttente() {
    var p = App.etat.profil, bloc = $('bloc-attente');
    bloc.classList.add('refus');
    if (!p) {
      $('attente-titre').textContent = 'Profil introuvable';
      $('attente-texte').textContent = "Votre compte existe mais votre profil n'a pas pu être lu. Réessayez, ou contactez un responsable de l'église.";
    } else if (p.statut === 'suspendu') {
      $('attente-titre').textContent = 'Accès suspendu';
      $('attente-texte').textContent = "Votre compte a été suspendu par l'administration de l'église. Contactez un responsable.";
    } else {
      bloc.classList.remove('refus');
      $('attente-titre').textContent = 'Compte en attente';
      $('attente-texte').textContent = "Un responsable doit encore activer votre compte. Revenez un peu plus tard.";
    }
  }

  App.appliquerSession = async function (session, message) {
    var E = App.etat;
    E.session = session;
    if (!session) {
      E.etat = 'dehors'; E.profil = null; E.role = 'membre'; E.mesCellules = []; E.mesDepartements = [];
      majEtatEtRole();
      var h = hash();
      aller(h === 'inscription' || h === 'connexion' ? h : 'accueil', 'remplacer');
      return;
    }
    var profil = null;
    try { profil = await lireProfil(); }
    catch (e) {
      console.error(e);
      if (e && (e.status === 401 || e.status === 403 || /JWT/i.test(e.message || ''))) {
        try { await sb.auth.signOut(); } catch (x) { /* rien */ }
        return App.appliquerSession(null);
      }
      App.flash(App.msgErreur(e));
    }
    E.profil = profil;

    if (profil && profil.statut === 'actif') {
      E.etat = 'dedans';
      E.role = App.roleUi(profil);
      try {
        if (E.role === 'berger') E.mesCellules = await App.q(sb.from('cellules').select('*').eq('berger_id', profil.id).order('nom'));
        if (E.role === 'chef_departement') E.mesDepartements = await App.q(sb.from('departements').select('*').eq('chef_id', profil.id).order('nom'));
      } catch (e) { console.error(e); }
    } else {
      E.etat = 'attente'; E.role = 'membre';
      textesAttente();
    }
    majEtatEtRole();
    majIdentite();
    if (App.surveillerMessages) App.surveillerMessages();
    var h2 = hash();
    aller(autorise(h2) ? h2 : App.pageDAccueil(), 'remplacer');
    if (message) App.flash(message);
  };

  /* ---------------------------------------------------------
     INSCRIPTION / CONNEXION / DÉCONNEXION
     --------------------------------------------------------- */
  window.inscrire = async function () {
    var val = function (id) { return $(id).value.trim(); };
    var prenom = val('f-prenom'), nom = val('f-nom'), tel = val('f-tel'), mdp = $('f-mdp').value;
    var err = '';
    if (!prenom || !nom) err = 'Indiquez votre prénom et votre nom.';
    else if (!App.telValide(tel)) err = 'Indiquez un numéro de téléphone valide (au moins 8 chiffres).';
    else if (mdp.length < 8) err = 'Le mot de passe doit contenir au moins 8 caractères.';
    App.erreurEcran('err-inscription', err);
    if (err) return;

    var identifiant = App.telVersIdentifiant(tel);
    var b = $('btn-inscrire');
    App.occupe(b, true, 'Création du compte…');
    try {
      // Le profil (table users) est créé AUTOMATIQUEMENT par la base de données :
      // rôle « membre », statut « actif ». Le navigateur ne peut pas choisir son rôle.
      var r = await sb.auth.signUp({
        email: identifiant, password: mdp,
        options: { data: { nom: nom, prenom: prenom, telephone: App.normaliserTel(tel) } }
      });
      var u = r.data && r.data.user;
      if (!r.error && u && u.identities && u.identities.length === 0) {
        App.erreurEcran('err-inscription', 'Ce numéro est déjà inscrit. Connectez-vous avec votre mot de passe.');
        return;
      }
      $('f-mdp').value = '';
      if (!r.error && r.data.session) {
        await App.appliquerSession(r.data.session, 'Bienvenue dans la maison !');
        return;
      }
      // Pas de session renvoyée (ou envoi de courrier refusé) : le compte existe
      // et il est déjà confirmé par la base, on se connecte directement.
      var c = await sb.auth.signInWithPassword({ email: identifiant, password: mdp });
      if (!c.error) {
        await App.appliquerSession(c.data.session, 'Bienvenue dans la maison !');
        return;
      }
      App.erreurEcran('err-inscription', App.msgErreur(r.error || c.error));
    } catch (e) {
      App.erreurEcran('err-inscription', App.msgErreur(e));
    } finally {
      App.occupe(b, false);
    }
  };

  window.connecter = async function () {
    var saisie = $('c-tel').value.trim(), mdp = $('c-mdp').value;
    if (!saisie || !mdp) { App.erreurEcran('err-connexion', 'Saisissez votre numéro et votre mot de passe.'); return; }
    App.erreurEcran('err-connexion', '');
    var b = $('btn-connecter');
    App.occupe(b, true, 'Connexion…');
    try {
      var r = await sb.auth.signInWithPassword({ email: App.versIdentifiant(saisie), password: mdp });
      if (r.error) { App.erreurEcran('err-connexion', App.msgErreur(r.error)); return; }
      $('c-mdp').value = '';
      await App.appliquerSession(r.data.session);
    } catch (e) {
      App.erreurEcran('err-connexion', App.msgErreur(e));
    } finally {
      App.occupe(b, false);
    }
  };

  window.deconnecter = async function () {
    try { await sb.auth.signOut(); } catch (e) { /* hors ligne : on quitte quand même */ }
    location.replace(location.pathname);
  };

  window.reverifierStatut = async function () {
    var b = $('btn-reverifier');
    App.occupe(b, true, 'Vérification…');
    try {
      var p = await lireProfil();
      if (p && p.statut === 'actif') {
        await App.appliquerSession(App.etat.session, 'Votre compte est de nouveau actif.');
      } else {
        App.etat.profil = p;
        textesAttente();
        App.flash("Votre compte n'est pas actif.");
      }
    } catch (e) {
      App.flash(App.msgErreur(e));
    } finally {
      App.occupe(b, false);
    }
  };

  /* ---------------------------------------------------------
     ÉCOUTEURS GÉNÉRAUX
     --------------------------------------------------------- */
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-act]');
    if (el) {
      var f = App.actions[el.dataset.act];
      if (f) { e.preventDefault(); f(el.dataset, el); }
      return;
    }
    var c = e.target.closest('[data-conf]');
    if (c) {
      var r = resolutionConfirmation;
      resolutionConfirmation = null;
      $('voile').classList.remove('on');
      if (r) r(c.dataset.conf === '1');
    }
  });
  document.addEventListener('submit', function (e) {
    var form = e.target.closest('form[data-form]');
    if (!form) return;
    e.preventDefault();
    var h = App.formulaires[form.dataset.form];
    if (h) h(form);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') App.fermer();
    if (e.key === 'Enter' && e.target && e.target.matches) {
      if (e.target.matches('#e-inscription input')) window.inscrire();
      else if (e.target.matches('#e-connexion input')) window.connecter();
    }
  });
  window.addEventListener('popstate', function () {
    var h = hash() || App.pageDAccueil();
    // même écran (ex. retour d'une conversation vers la liste) : l'écran gère lui-même son état
    if (h === ecranCourant) return;
    aller(h, 'retour');
  });

  sb.auth.onAuthStateChange(function (evt) {
    if (evt === 'SIGNED_OUT' && App.etat.session) setTimeout(function () { location.replace(location.pathname); }, 0);
  });

  /* ---------------------------------------------------------
     DÉMARRAGE
     --------------------------------------------------------- */
  App.demarrer = async function () {
    if (window.Marque) window.Marque.charger(sb);   // nom + logo + couleurs (lecture publique)
    $('verset-accueil').innerHTML = App.htmlVerset();
    var session = null;
    try { var r = await sb.auth.getSession(); session = r.data.session; } catch (e) { console.error(e); }
    await App.appliquerSession(session);
  };
})();
