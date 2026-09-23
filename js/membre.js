/* ==========================================================
   ÉCRANS COMMUNS À TOUS
   · Accueil de l'application (verset, prochains rendez-vous, dernier message)
   · Menu « Plus » (téléphone)
   · Mon profil
   · Guide d'utilisation
   ========================================================== */
(function () {
  'use strict';

  var App = window.App, sb = App.sb, $ = App.$, esc = App.esc;

  /* Catalogue des écrans : titre, explication, icône */
  var ECRANS = {
    tableau: ["Tableau de bord", "Chiffres et suivi de l'église", '<rect x="3.5" y="3.5" width="7" height="8.5" rx="2.5"/><rect x="13.5" y="3.5" width="7" height="5" rx="2.5"/><rect x="3.5" y="15.5" width="7" height="5" rx="2.5"/><rect x="13.5" y="12" width="7" height="8.5" rx="2.5"/>'],
    cellules: ["Cellules", "Créer, modifier, nommer un berger", '<circle cx="12" cy="8.5" r="3.6"/><path d="M5 20c1.3-3.6 4-5.3 7-5.3s5.7 1.7 7 5.3"/>'],
    membres: ["Membres", "Rôles, cellules, départements", '<circle cx="9" cy="8.5" r="3.4"/><path d="M3 19c1-3 3.4-4.5 6-4.5S14 16 15 19"/><path d="M16 7.5a3.4 3.4 0 0 1 0 6.5"/>'],
    departements: ["Départements", "Louange, intercession, accueil…", '<rect x="3" y="6" width="18" height="13" rx="4"/><path d="M3 10h18"/>'],
    fiches: ["Fiches reçues", "Comptes rendus des cellules", '<rect x="4.5" y="3.5" width="15" height="17" rx="4"/><path d="M8.5 9h7M8.5 13h7"/>'],
    'ma-cellule': ["Ma cellule", "Ses informations et ses membres", '<circle cx="12" cy="8.5" r="3.6"/><path d="M5 20c1.3-3.6 4-5.3 7-5.3s5.7 1.7 7 5.3"/>'],
    'mes-fiches': ["Historique", "Mes comptes rendus", '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>'],
    'mon-departement': ["Mon département", "Mes ouvriers", '<rect x="3" y="6" width="18" height="13" rx="4"/><path d="M3 10h18"/>'],
    programmes: ["Programmes", "Activités de l'église", '<rect x="3.5" y="5" width="17" height="15.5" rx="4"/><path d="M8 3v4M16 3v4M3.5 10h17"/>'],
    calendrier: ["Calendrier", "Les dates à venir", '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>'],
    messages: ["Messages du pasteur", "Enseignements et annonces", '<path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7A2.5 2.5 0 0 1 17.5 16H9l-5 4z"/>'],
    discussions: ["Discussions", "Échanger avec l'assemblée", '<path d="M7.5 17H6a2.5 2.5 0 0 1-2.5-2.5v-7A2.5 2.5 0 0 1 6 5h9a2.5 2.5 0 0 1 2.5 2.5V9"/><path d="M9 11.5A2.5 2.5 0 0 1 11.5 9H18a2.5 2.5 0 0 1 2.5 2.5v6A2.5 2.5 0 0 1 18 20h-2l-4 3v-3h-1a2.5 2.5 0 0 1-2-1"/>'],
    dimanche: ["Cultes du dimanche", "Présences, offrandes et dîmes", '<path d="M4 5.5A2 2 0 0 1 6 4h5v16H6a2 2 0 0 1-2-1.5z"/><path d="M20 5.5A2 2 0 0 0 18 4h-5v16h5a2 2 0 0 0 2-1.5z"/>'],
    finances: ["Finances", "Entrées, sorties et solde", '<rect x="3" y="6" width="18" height="12.5" rx="3"/><circle cx="12" cy="12.2" r="2.6"/>'],
    apparence: ["Apparence", "Nom, logo et couleurs", '<circle cx="12" cy="12" r="8.5"/><circle cx="8.5" cy="10" r="1.2"/><circle cx="12" cy="7.5" r="1.2"/><circle cx="15.5" cy="10" r="1.2"/>'],
    guide: ["Guide d'utilisation", "Comment utiliser l'application", '<circle cx="12" cy="12" r="8.5"/><path d="M9.8 9.4a2.3 2.3 0 0 1 4.4.8c0 1.6-2.2 2-2.2 3.3M12 17.2v.1"/>'],
    'mon-profil': ["Mon compte", "Profil et déconnexion", '<circle cx="12" cy="8.5" r="3.6"/><path d="M5 20c1.3-3.6 4-5.3 7-5.3s5.7 1.7 7 5.3"/>']
  };

  function ligneReglage(id, vedette) {
    var e = ECRANS[id];
    if (!e) return '';
    return '<button class="reglage' + (vedette ? ' vedette' : '') + '" data-act="aller" data-id="' + esc(id) + '">' +
      '<span class="ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor">' + e[2] + '</svg></span>' +
      '<span class="corps"><b>' + esc(e[0]) + '</b><small>' + esc(e[1]) + '</small></span><span class="fleche">›</span></button>';
  }

  /* =========================================================
     MENU « PLUS » (téléphone)
     ========================================================= */
  App.ecrans.plus = function () {
    var liste = App.PLUS[App.etat.role] || App.PLUS.membre;
    $('liste-plus').innerHTML = liste.map(function (id, i) {
      return ligneReglage(id, id === 'apparence');
    }).join('');
  };

  /* =========================================================
     ACCUEIL DE L'APPLICATION
     ========================================================= */
  App.ecrans.bienvenue = async function () {
    var p = App.etat.profil, d = new Date();
    var heure = d.getHours();
    var salut = (heure < 12 ? 'Bonjour' : (heure < 18 ? 'Bon après-midi' : 'Bonsoir')) + (p.prenom ? ' ' + p.prenom : '');
    $('bv-salut').textContent = salut;
    $('bv-salut-pc').textContent = salut;
    var jour = App.cap(d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }));
    $('bv-jour').textContent = jour;
    $('bv-jour-pc').textContent = jour + ' · ' + App.ROLES[p.role];
    $('verset-app').innerHTML = App.htmlVerset();

    rappels();
    prochainsRendezVous();
    dernierMessage();
  };
  App.actions['recharger-accueil'] = function () { App.ecrans.bienvenue(); };

  /* Rappels personnalisés selon le rôle */
  async function rappels() {
    var z = $('bv-rappels'), E = App.etat, html = '';
    try {
      if (E.role === 'berger' && (E.mesCellules || []).length) {
        var lundi = App.iso(App.lundi(new Date()));
        var fiches = await App.q(sb.from('fiches_cellule').select('id,cellule_id,date_reunion').gte('date_reunion', lundi));
        var manquantes = E.mesCellules.filter(function (c) {
          return !fiches.some(function (f) { return f.cellule_id === c.id; });
        });
        if (manquantes.length) {
          html = '<button class="reglage vedette" data-act="nouvelle-fiche">' +
            '<span class="ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="4.5" y="3.5" width="15" height="17" rx="4"/><path d="M8.5 9h7M8.5 13h7"/></svg></span>' +
            '<span class="corps"><b>Fiche de la semaine à remplir</b><small>' + esc(manquantes.map(function (c) { return c.nom; }).join(', ')) + '</small></span>' +
            '<span class="fleche">›</span></button>';
        }
      }
      if (E.role === 'super_admin') {
        var D = await App.chargerAdmin();
        var sans = D.membres.filter(function (u) { return u.statut === 'actif' && !u.cellule_id; }).length;
        if (sans) {
          html = '<button class="reglage vedette" data-act="aller" data-id="membres">' +
            '<span class="ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="9" cy="8.5" r="3.4"/><path d="M3 19c1-3 3.4-4.5 6-4.5S14 16 15 19"/></svg></span>' +
            '<span class="corps"><b>' + sans + ' membre' + (sans > 1 ? 's' : '') + ' sans cellule</b><small>Rattachez-les depuis l\'écran Membres</small></span>' +
            '<span class="fleche">›</span></button>';
        }
      }
      if (!p_aCellule() && E.role === 'membre') {
        html = '<div class="mb-note" style="margin:0 0 14px">Vous n\'êtes pas encore rattaché à une cellule. Un responsable s\'en occupera prochainement.</div>';
      }
    } catch (e) { /* les rappels ne sont pas essentiels */ }
    z.innerHTML = html;
  }
  function p_aCellule() { return !!(App.etat.profil && App.etat.profil.cellule_id); }

  async function prochainsRendezVous() {
    var z = $('bv-programmes');
    try {
      var progs = await App.chargerProgrammes();
      var maintenant = Date.now();
      var avenir = progs.filter(function (p) {
        return p.date_debut && new Date(p.date_fin || p.date_debut).getTime() >= maintenant - 6 * 3600e3;
      }).slice(0, 3);
      if (!avenir.length) { z.innerHTML = App.vide('Rien de prévu pour le moment', "Les prochaines activités s'afficheront ici."); return; }
      z.innerHTML = avenir.map(function (p) {
        var dd = new Date(p.date_debut);
        return '<div class="prog"><span class="date"><span class="j">' + dd.getDate() + '</span><span class="m">' +
          esc(dd.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '')) + '</span></span>' +
          '<div class="corps"><b>' + esc(p.titre) + '</b><span class="quand">' + esc(App.fmtDateHeure(p.date_debut)) + '</span>' +
          (p.theme ? '<p>' + esc(p.theme) + '</p>' : '') + '</div></div>';
      }).join('');
    } catch (e) { z.innerHTML = App.htmlErreur(e); }
  }

  async function dernierMessage() {
    var z = $('bv-message');
    try {
      var m = await App.q(sb.from('messages_pasteur').select('*')
        .lte('date_publication', new Date().toISOString())
        .order('date_publication', { ascending: false }).limit(1).maybeSingle());
      z.innerHTML = m ? App.htmlMessage(m) : App.vide('Aucun message', "Les annonces du pasteur s'afficheront ici.");
    } catch (e) { z.innerHTML = App.htmlErreur(e); }
  }

  /* =========================================================
     MON PROFIL
     ========================================================= */
  App.ecrans['mon-profil'] = async function () {
    var p = App.etat.profil;
    if (!p) return;
    var t = function (id, v) { $(id).textContent = v || '—'; };
    t('p-nom', App.nomComplet(p));
    t('p-detail', App.ROLES[p.role]);
    t('p-detail-pc', App.ROLES[p.role] + ' · ' + App.STATUTS[p.statut]);
    t('profil-nom', p.nom); t('profil-prenom', p.prenom);
    t('profil-tel', App.fmtTel(p.telephone));
    var interne = App.estIdentifiantInterne(p.email);
    $('ligne-email').hidden = interne;
    if (!interne) t('profil-email', p.email);
    t('profil-role', App.ROLES[p.role]);
    t('profil-cellule', 'Chargement…'); t('profil-departement', 'Chargement…');

    try {
      var c = p.cellule_id ? await App.q(sb.from('cellules').select('nom,jour_reunion,heure_reunion').eq('id', p.cellule_id).maybeSingle()) : null;
      t('profil-cellule', c ? c.nom + (c.jour_reunion ? ' (' + App.cap(c.jour_reunion) + (c.heure_reunion ? ' à ' + App.fmtHeure(c.heure_reunion) : '') + ')' : '') : 'Aucune');
    } catch (e) { t('profil-cellule', p.cellule_id ? 'Non disponible' : 'Aucune'); }
    try {
      var d = p.departement_id ? await App.q(sb.from('departements').select('nom').eq('id', p.departement_id).maybeSingle()) : null;
      t('profil-departement', d ? d.nom : 'Aucun');
    } catch (e) { t('profil-departement', p.departement_id ? 'Non disponible' : 'Aucun'); }
  };

  window.formulaireProfil = function () {
    var p = App.etat.profil;
    App.ouvrir('<h3>Mes informations</h3><p>Votre rôle, votre cellule et votre département sont gérés par l\'administration de l\'église.</p>' +
      '<div class="alerte"></div>' +
      '<form data-form="profil">' +
      '<div class="paire-champ">' + App.champ('prenom', 'Prénom', p.prenom, 'text', 'maxlength="60"') +
      App.champ('nom', 'Nom', p.nom, 'text', 'maxlength="60"') + '</div>' +
      App.champ('telephone', 'Téléphone', App.fmtTel(p.telephone), 'tel', 'inputmode="tel"') +
      '<p class="aide" style="margin:-8px 0 14px">Votre numéro sert aussi d\'identifiant de connexion : ' +
      'il reste inchangé pour vous connecter même si vous le corrigez ici.</p>' +
      '<div class="duo"><button type="button" class="btn btn-vide" data-conf="0">Annuler</button>' +
      '<button class="btn btn-plein">Enregistrer</button></div></form>');
  };
  App.formulaires.profil = async function (form) {
    var b = form.querySelector('.btn-plein');
    var maj = {
      prenom: form.prenom.value.trim(), nom: form.nom.value.trim(),
      telephone: App.normaliserTel(form.telephone.value) || null
    };
    if (!maj.prenom || !maj.nom) { App.erreurFeuille('Le nom et le prénom sont obligatoires.'); return; }
    App.occupe(b, true, 'Enregistrement…');
    try {
      await App.q(sb.from('users').update(maj).eq('id', App.etat.profil.id));
      App.etat.profil = Object.assign(App.etat.profil, maj);
      App.majIdentite();
      App.fermer();
      App.ecrans['mon-profil']();
      App.flash('Informations mises à jour.');
    } catch (e) { App.erreurFeuille(App.msgErreur(e)); } finally { App.occupe(b, false); }
  };

  /* =========================================================
     GUIDE D'UTILISATION
     ========================================================= */
  function bloc(titre, corps) {
    return '<div class="gd-part"><h4><span class="ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor">' +
      '<circle cx="12" cy="12" r="8.5"/><path d="M12 8v5M12 16.2v.1"/></svg></span>' + titre + '</h4>' + corps + '</div>';
  }
  var GUIDES = {
    super_admin:
      bloc('Les membres', '<p>Toute personne qui s\'inscrit entre <b>directement</b> dans l\'application : elle voit les programmes, les messages et les discussions de l\'église.</p><ol><li>Écran <b>Membres</b> : rattachez chaque personne à sa <b>cellule</b> et à son <b>département</b>.</li><li>Changez son <b>rôle</b> si besoin (berger, chef de département, comptable).</li><li>Un compte gênant peut être <b>suspendu</b> : il perd aussitôt tout accès.</li></ol>') +
      bloc('Cellules et bergers', '<ol><li><b>Cellules → Nouvelle cellule</b> : nom, quartier, jour et heure de réunion.</li><li><b>Nommer un berger</b> : la personne devient berger et ne voit alors que sa cellule.</li><li>Chaque semaine, le berger remplit sa <b>fiche de réunion</b>, que vous retrouvez dans <b>Fiches reçues</b>.</li></ol>') +
      bloc('Programmes et calendrier', '<p><b>Programmes → Nouveau programme</b> : titre, type, thème, dates. Choisissez <b>pour qui</b> : toute l\'église, une cellule ou un département — un programme réservé n\'est visible que par eux.</p><p>Le bouton <b>Séances</b> ajoute les dates successives d\'une activité ; elles apparaissent dans le <b>Calendrier</b> de chacun.</p>') +
      bloc('Messages et discussions', '<p><b>Messages</b> : publiez un enseignement ou une annonce, avec un lien vidéo ou audio si vous voulez. Vous pouvez programmer la date de publication.</p><p><b>Discussions</b> : un salon pour toute l\'église, un salon par cellule et par département. Vous pouvez supprimer n\'importe quel message.</p>') +
      bloc('Comptes de l\'église', '<p><b>Cultes du dimanche</b> : présences, nouveaux venus, offrande et dîme de chaque dimanche.</p><p><b>Finances</b> : chaque entrée (dîme, offrande, don) et chaque sortie (loyer, matériel…), avec le solde du mois, de l\'année ou depuis le début. Le comptable a accès à ces deux écrans.</p>') +
      bloc('Apparence', '<p>Choisissez le <b>nom</b> de l\'église et son <b>logo</b> : le logo devient l\'icône de l\'application sur le téléphone et dans l\'onglet du navigateur, et les couleurs s\'adaptent automatiquement à celles du logo.</p>'),
    berger:
      bloc('Votre cellule', '<p><b>Ma cellule</b> affiche les informations de votre cellule et la liste de ses membres avec leur téléphone. Vous ne voyez que votre cellule : c\'est voulu.</p>') +
      bloc('Remplir la fiche après la réunion', '<ol><li>Onglet <b>Fiche</b>.</li><li>Date, heure de début et de fin.</li><li>Hommes, femmes, enfants : le <b>total se calcule tout seul</b>.</li><li>Nouveaux venus, conversions, familles visitées, témoignages.</li><li>Notez vos difficultés ou suggestions, puis <b>Enregistrer</b>.</li></ol><p>Une seule fiche par réunion : pour corriger, passez par <b>Historique → Modifier</b>.</p>') +
      bloc('Rester en lien', '<p>Le salon <b>Discussions</b> de votre cellule vous permet d\'écrire à vos membres entre deux réunions. Le salon de l\'église est ouvert à tous.</p>') +
      bloc('Et si quelqu\'un manque dans ma cellule ?', '<p>Seul l\'administrateur ajoute ou retire des membres. Demandez-lui de placer la personne dans votre cellule depuis son écran <b>Membres</b>.</p>'),
    chef_departement:
      bloc('Votre département', '<p><b>Mon département</b> affiche vos ouvriers et leurs coordonnées. L\'administrateur rattache les membres à votre département.</p>') +
      bloc('Communiquer', '<p>Le salon <b>Discussions</b> de votre département réunit vos ouvriers. Les programmes réservés à votre département apparaissent dans votre calendrier.</p>'),
    comptable:
      bloc('Cultes du dimanche', '<p>Enregistrez chaque dimanche : présents, absents, nouveaux venus, <b>offrande</b> et <b>dîme</b>. Une seule fiche par dimanche ; pour corriger, ouvrez la fiche et modifiez-la.</p>') +
      bloc('Finances', '<p>Chaque mouvement est une <b>entrée</b> (dîme, offrande, don…) ou une <b>sortie</b> (loyer, matériel, transport…). Les totaux et le solde se calculent automatiquement pour le mois, l\'année, ou depuis le début.</p><p>Les montants sont en <b>francs CFA</b>.</p>'),
    membre:
      bloc('Votre espace', '<p>L\'<b>Accueil</b> vous donne le verset du jour, les prochains rendez-vous et le dernier message du pasteur.</p>') +
      bloc('Programmes et calendrier', '<p><b>Programmes</b> liste les activités de l\'église ; <b>Calendrier</b> les range date par date. Vous voyez les activités de toute l\'église, celles de votre cellule et celles de votre département.</p>') +
      bloc('Discussions', '<p>Échangez avec toute l\'assemblée, et avec votre cellule si vous en avez une. Vous pouvez supprimer vos propres messages.</p>') +
      bloc('Vos informations', '<p><b>Compte → Modifier mes informations</b> : nom, prénom et téléphone. Le rôle, la cellule et le département sont gérés par l\'administration.</p>')
  };
  App.ecrans.guide = function () {
    var r = App.etat.role;
    $('guide-contenu').innerHTML = (GUIDES[r] || GUIDES.membre) +
      '<div class="gd-part pro"><h4><span class="ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor">' +
      '<path d="M12 3.5l2.5 5.4 5.9.7-4.4 4 1.2 5.9L12 16.6 6.8 19.5 8 13.6 3.6 9.6l5.9-.7z"/></svg></span>Astuce</h4>' +
      '<p>Ajoutez le site à l\'écran d\'accueil de votre téléphone : il s\'ouvrira en plein écran, avec le logo et le nom de l\'église, comme une vraie application.</p></div>';
  };
})();
