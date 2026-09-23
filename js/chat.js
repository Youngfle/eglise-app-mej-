/* ==========================================================
   ÉCHANGES (messagerie)
   · Salons de groupe : toute l'église, une cellule, un département
   · Messages privés : de membre à membre
   La base de données n'autorise à lire et à écrire que dans les salons
   auxquels on appartient et dans ses propres conversations (règles RLS) :
   le navigateur ne décide rien.
   Téléphone : la liste des conversations, puis la conversation en plein
   écran (zone de saisie en bas, jamais superposée aux messages).
   Ordinateur : la liste à gauche, la conversation à droite.
   ========================================================== */
(function () {
  'use strict';

  var App = window.App, sb = App.sb, $ = App.$, esc = App.esc;

  var groupes = [], conversations = [], annuaire = null;
  var courante = null;          // { cle, type: 'groupe'|'prive', nom, sous, salon?, cellule_id?, departement_id?, autre_id? }
  var messages = [], signature = '';
  var minuteurFil = null, minuteurListe = null, minuteurBadge = null;
  var CLE_VUS = 'echanges_vus_v1';

  function moiId() { return App.etat.profil && App.etat.profil.id; }
  function heure(d) { return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }).replace(':', 'h'); }
  function quand(iso) {
    if (!iso) return '';
    var d = new Date(iso), auj = App.iso(new Date()), j = App.iso(d);
    if (j === auj) return heure(d);
    var hier = new Date(); hier.setDate(hier.getDate() - 1);
    if (j === App.iso(hier)) return 'Hier';
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }).replace('.', '');
  }
  function initiales(prenom, nom) { return App.initiales({ prenom: prenom, nom: nom }); }

  /* Dernière visite de chaque salon de groupe (pastille « nouveau ») */
  function vus() { try { return JSON.parse(localStorage.getItem(CLE_VUS) || '{}'); } catch (e) { return {}; } }
  function marquerVu(cle, iso) {
    try { var v = vus(); v[cle] = iso || new Date().toISOString(); localStorage.setItem(CLE_VUS, JSON.stringify(v)); } catch (e) { /* sans conséquence */ }
  }

  /* ---------------------------------------------------------
     LES SALONS DE GROUPE AUXQUELS J'APPARTIENS
     --------------------------------------------------------- */
  async function nommerSesGroupes() {
    var p = App.etat.profil;
    if (!p) return;
    try {
      if (p.cellule_id && (!App.celluleDuProfil || App.celluleDuProfil.id !== p.cellule_id)) {
        App.celluleDuProfil = await App.q(sb.from('cellules').select('id,nom').eq('id', p.cellule_id).maybeSingle());
      }
      if (p.departement_id && (!App.departementDuProfil || App.departementDuProfil.id !== p.departement_id)) {
        App.departementDuProfil = await App.q(sb.from('departements').select('id,nom').eq('id', p.departement_id).maybeSingle());
      }
    } catch (e) { /* le salon gardera un nom générique */ }
  }

  function listerGroupes() {
    var E = App.etat, p = E.profil, D = App.donnees || {}, vus = {};
    var liste = [{ cle: 'eglise', type: 'groupe', icone: '⛪', nom: "Toute l'église", sous: "Tous les membres de l'église", salon: 'eglise' }];
    function cellule(c) {
      if (!c || vus['c' + c.id]) return;
      vus['c' + c.id] = 1;
      liste.push({ cle: 'c' + c.id, type: 'groupe', icone: '👥', nom: 'Cellule ' + c.nom, sous: 'Salon de la cellule', salon: 'cellule', cellule_id: c.id });
    }
    function departement(d) {
      if (!d || vus['d' + d.id]) return;
      vus['d' + d.id] = 1;
      liste.push({ cle: 'd' + d.id, type: 'groupe', icone: '🎵', nom: d.nom, sous: 'Salon du département', salon: 'departement', departement_id: d.id });
    }
    if (p && p.cellule_id) cellule(App.celluleDuProfil || { id: p.cellule_id, nom: 'ma cellule' });
    (E.mesCellules || []).forEach(cellule);
    if (p && p.departement_id) departement(App.departementDuProfil || { id: p.departement_id, nom: 'Mon département' });
    (E.mesDepartements || []).forEach(departement);
    if (E.role === 'super_admin') {
      (D.cellules || []).forEach(cellule);
      (D.departements || []).forEach(departement);
    }
    return liste;
  }

  /* Dernier message de chaque salon, pour l'aperçu dans la liste */
  async function apercusGroupes() {
    await Promise.all(groupes.map(async function (g) {
      try {
        var q = sb.from('discussions').select('contenu,created_at,auteur_id,auteur_nom').eq('salon', g.salon);
        if (g.cellule_id) q = q.eq('cellule_id', g.cellule_id);
        if (g.departement_id) q = q.eq('departement_id', g.departement_id);
        var r = await App.q(q.order('created_at', { ascending: false }).limit(1));
        g.dernier = r[0] || null;
      } catch (e) { g.dernier = null; }
    }));
  }

  async function chargerConversations() {
    try { conversations = await App.q(sb.rpc('mes_conversations')) || []; }
    catch (e) { conversations = conversations || []; }
    majBadge();
    return conversations;
  }

  /* ---------------------------------------------------------
     LISTE DES CONVERSATIONS
     --------------------------------------------------------- */
  function itemConversation(c) {
    var on = courante && courante.cle === c.cle ? ' on' : '';
    return '<button class="conv' + on + '" data-act="ouvrir-conversation" data-cle="' + esc(c.cle) + '">' +
      '<span class="avatar' + (c.type === 'groupe' ? ' groupe' : '') + '">' + (c.type === 'groupe' ? c.icone : esc(c.initiales)) + '</span>' +
      '<span class="conv-corps"><span class="conv-ligne"><b>' + esc(c.nom) + '</b><small>' + esc(quand(c.le)) + '</small></span>' +
      '<span class="conv-ligne"><span class="conv-apercu">' + esc(c.apercu || c.sous || '') + '</span>' +
      (c.non_lus ? '<span class="non-lus">' + (c.non_lus > 99 ? '99+' : c.non_lus) + '</span>' : (c.nouveau ? '<span class="point-nouveau"></span>' : '')) +
      '</span></span></button>';
  }

  function entreesPrivees() {
    return conversations.map(function (c) {
      return {
        cle: 'p' + c.interlocuteur_id, type: 'prive', autre_id: c.interlocuteur_id,
        nom: ((c.prenom || '') + ' ' + (c.nom || '')).trim() || 'Membre',
        initiales: initiales(c.prenom, c.nom), le: c.dernier_le,
        apercu: (c.dernier_de_moi ? 'Vous : ' : '') + c.dernier_contenu, non_lus: Number(c.non_lus) || 0
      };
    });
  }
  function entreesGroupes() {
    var v = vus();
    return groupes.map(function (g) {
      var d = g.dernier;
      return Object.assign({}, g, {
        le: d ? d.created_at : null,
        apercu: d ? (d.auteur_id === moiId() ? 'Vous : ' : (d.auteur_nom ? d.auteur_nom.split(' ')[0] + ' : ' : '')) + d.contenu : g.sous,
        nouveau: d && d.auteur_id !== moiId() && (!v[g.cle] || v[g.cle] < d.created_at)
      });
    });
  }

  function rendreListe() {
    var z = $('conv-liste');
    if (!z) return;
    var filtre = App.sansAccent(($('conv-recherche') || {}).value || '');
    var garder = function (c) { return !filtre || App.sansAccent(c.nom).indexOf(filtre) >= 0; };
    var g = entreesGroupes().filter(garder), p = entreesPrivees().filter(garder);
    z.innerHTML =
      '<h4 class="conv-titre">Groupes</h4>' + (g.map(itemConversation).join('') || '<p class="note conv-vide">Aucun groupe trouvé.</p>') +
      '<h4 class="conv-titre">Messages privés</h4>' +
      (p.length ? p.map(itemConversation).join('')
        : '<p class="note conv-vide">' + (filtre ? 'Aucune conversation trouvée.' : 'Aucune conversation pour le moment. Touchez « Nouveau » pour écrire à un membre.') + '</p>');
  }

  async function rafraichirListe() {
    await Promise.all([apercusGroupes(), chargerConversations()]);
    rendreListe();
  }

  /* ---------------------------------------------------------
     OUVRIR UNE CONVERSATION
     --------------------------------------------------------- */
  function trouver(cle) {
    var g = groupes.filter(function (x) { return x.cle === cle; })[0];
    if (g) return g;
    if (cle.charAt(0) !== 'p') return null;
    var id = cle.slice(1), c = conversations.filter(function (x) { return x.interlocuteur_id === id; })[0];
    var a = c || (annuaire || []).filter(function (x) { return x.id === id; })[0];
    if (!a) return { cle: cle, type: 'prive', autre_id: id, nom: 'Membre', sous: 'Message privé', initiales: '?' };
    return { cle: cle, type: 'prive', autre_id: id, nom: ((a.prenom || '') + ' ' + (a.nom || '')).trim() || 'Membre',
      sous: a.role ? App.ROLES[a.role] || 'Membre' : 'Message privé', initiales: initiales(a.prenom, a.nom) };
  }

  function afficherVue(vue) {
    $('messagerie').dataset.vue = vue;
    document.body.classList.toggle('conversation-ouverte', vue === 'fil');
  }

  async function ouvrir(cle, ajouterHistorique) {
    var c = trouver(cle);
    if (!c) return;
    courante = c;
    messages = []; signature = '';
    $('conv-avatar').className = 'avatar' + (c.type === 'groupe' ? ' groupe' : '');
    $('conv-avatar').textContent = c.type === 'groupe' ? c.icone : c.initiales;
    $('conv-nom').textContent = c.nom;
    $('conv-sous').textContent = c.type === 'groupe' ? c.sous : 'Message privé';
    $('di-texte').placeholder = c.type === 'groupe' ? 'Écrire à « ' + c.nom + ' »…' : 'Écrire à ' + c.nom.split(' ')[0] + '…';
    $('fil').innerHTML = '<p class="chargement" style="text-align:center">Chargement…</p>';
    afficherVue('fil');
    rendreListe();
    // sur téléphone, le bouton « retour » du navigateur ramène à la liste
    if (ajouterHistorique !== false && estTelephone()) history.pushState({ conversation: cle }, '', '#discussions');
    await lire();
    clearInterval(minuteurFil);
    minuteurFil = setInterval(function () { if (App.ecranCourant() === 'discussions' && courante) lire(true); }, 6000);
  }
  App.actions['ouvrir-conversation'] = function (d) { ouvrir(d.cle); };

  function fermerConversation() {
    courante = null;
    clearInterval(minuteurFil);
    afficherVue('liste');
    rendreListe();
  }
  App.actions['fermer-conversation'] = function () {
    if (history.state && history.state.conversation) history.back();
    else fermerConversation();
  };
  window.addEventListener('popstate', function () {
    if (App.ecranCourant() === 'discussions' && courante && estTelephone() && !(history.state && history.state.conversation)) fermerConversation();
  });

  function estTelephone() { return !window.matchMedia('(min-width:1000px)').matches; }

  /* Ouvrir une conversation privée depuis un autre écran (fiche d'un membre, ma cellule…) */
  App.ecrireA = function (userId) {
    App.conversationDemandee = 'p' + userId;
    App.aller('discussions');
  };
  App.actions['ecrire-a'] = function (d) { App.ecrireA(d.id); };

  /* ---------------------------------------------------------
     LIRE ET AFFICHER LES MESSAGES
     --------------------------------------------------------- */
  function requete() {
    var c = courante;
    if (c.type === 'prive') {
      var a = moiId(), b = c.autre_id;
      return sb.from('messages_prives').select('*')
        .or('and(expediteur_id.eq.' + a + ',destinataire_id.eq.' + b + '),and(expediteur_id.eq.' + b + ',destinataire_id.eq.' + a + ')')
        .order('created_at', { ascending: false }).limit(200);
    }
    var q = sb.from('discussions').select('*').eq('salon', c.salon);
    if (c.cellule_id) q = q.eq('cellule_id', c.cellule_id);
    if (c.departement_id) q = q.eq('departement_id', c.departement_id);
    return q.order('created_at', { ascending: false }).limit(200);
  }

  function rendreFil() {
    var z = $('fil'), moi = moiId(), prive = courante.type === 'prive';
    if (!messages.length) {
      z.innerHTML = '<div class="fil-vide">' + App.vide(prive ? 'Nouvelle conversation' : "Personne n'a encore écrit ici",
        prive ? 'Écrivez votre premier message à ' + courante.nom + '.' : 'Soyez le premier à écrire dans « ' + courante.nom + ' ».') + '</div>';
      return;
    }
    var jour = '', html = '', precedent = null;
    messages.forEach(function (m) {
      var d = new Date(m.created_at), j = App.iso(d);
      var auteur = prive ? m.expediteur_id : m.auteur_id, deMoi = auteur === moi;
      if (j !== jour) {
        jour = j; precedent = null;
        html += '<div class="jour-fil"><span>' + esc(j === App.iso(new Date()) ? "Aujourd'hui" : App.cap(App.fmtDate(j, true))) + '</span></div>';
      }
      var suite = precedent === auteur;
      precedent = auteur;
      html += '<div class="bulle' + (deMoi ? ' moi' : '') + (suite ? ' suite' : '') + '">' +
        (!deMoi && !prive && !suite ? '<div class="qui">' + esc(m.auteur_nom || 'Membre') + '</div>' : '') +
        '<div class="txt">' + esc(m.contenu) + '</div>' +
        '<div class="h">' + esc(heure(d)) + (prive && deMoi ? (m.lu_le ? ' · Lu' : '') : '') + '</div>' +
        (deMoi || App.etat.role === 'super_admin'
          ? '<button class="suppr" title="Supprimer" aria-label="Supprimer" data-act="suppr-discussion" data-id="' + esc(m.id) + '">✕</button>' : '') +
        '</div>';
    });
    z.innerHTML = html;
  }

  function enBas() { var z = $('fil'); return z.scrollHeight - z.scrollTop - z.clientHeight < 120; }
  function allerEnBas() { var z = $('fil'); z.scrollTop = z.scrollHeight; }

  async function lire(silencieux) {
    if (!courante) return;
    var cle = courante.cle;
    try {
      var lignes = await App.q(requete());
      if (!courante || courante.cle !== cle) return;    // on a changé de conversation entre-temps
      lignes.reverse();
      var sig = lignes.length + '|' + (lignes.length ? lignes[lignes.length - 1].id + (lignes[lignes.length - 1].lu_le || '') : '');
      if (sig === signature && silencieux) return;
      var etaitEnBas = !silencieux || enBas();
      signature = sig;
      messages = lignes;
      rendreFil();
      if (etaitEnBas) allerEnBas();
      if (courante.type === 'prive') marquerLus();
      else if (lignes.length) { marquerVu(cle, lignes[lignes.length - 1].created_at); rendreListe(); }
    } catch (e) {
      if (!silencieux) $('fil').innerHTML = App.htmlErreur(e);
    }
  }

  async function marquerLus() {
    var moi = moiId(), autre = courante.autre_id;
    var aLire = messages.some(function (m) { return m.destinataire_id === moi && !m.lu_le; });
    if (!aLire) return;
    try {
      await App.q(sb.from('messages_prives').update({ lu_le: new Date().toISOString() })
        .eq('destinataire_id', moi).eq('expediteur_id', autre).is('lu_le', null));
      conversations.forEach(function (c) { if (c.interlocuteur_id === autre) c.non_lus = 0; });
      majBadge();
      rendreListe();
    } catch (e) { /* sans conséquence */ }
  }

  /* ---------------------------------------------------------
     ÉCRIRE, SUPPRIMER
     --------------------------------------------------------- */
  App.actions['envoyer-message'] = async function () {
    var zone = $('di-texte'), texte = zone.value.trim();
    if (!texte || !courante) return;
    var b = $('di-envoyer');
    b.disabled = true;
    try {
      if (courante.type === 'prive') {
        await App.q(sb.from('messages_prives').insert({ expediteur_id: moiId(), destinataire_id: courante.autre_id, contenu: texte }));
      } else {
        await App.q(sb.from('discussions').insert({
          salon: courante.salon, auteur_id: moiId(), contenu: texte,
          cellule_id: courante.cellule_id || null, departement_id: courante.departement_id || null
        }));
      }
      zone.value = '';
      ajusterZone();
      await lire();
      allerEnBas();
      if (courante.type === 'prive') chargerConversations().then(rendreListe);
      else apercusGroupes().then(rendreListe);
    } catch (e) {
      App.flash(App.msgErreur(e));
    } finally { b.disabled = false; zone.focus(); }
  };

  App.actions['suppr-discussion'] = async function (d) {
    var ok = await App.confirmer('Supprimer ce message ?', courante && courante.type === 'prive'
      ? 'Il disparaîtra aussi chez votre correspondant.' : 'Il disparaîtra pour tout le monde.', 'Supprimer', true);
    if (!ok) return;
    try {
      await App.q(sb.from(courante.type === 'prive' ? 'messages_prives' : 'discussions').delete().eq('id', d.id));
      await lire();
    } catch (e) { App.flash(App.msgErreur(e)); }
  };

  /* ---------------------------------------------------------
     NOUVEAU MESSAGE : choisir un membre dans l'annuaire
     --------------------------------------------------------- */
  async function chargerAnnuaire() {
    if (annuaire) return annuaire;
    annuaire = (await App.q(sb.rpc('annuaire'))) || [];
    return annuaire;
  }

  App.actions['nouveau-message'] = async function () {
    App.ouvrir('<h3>Nouveau message</h3><p>Choisissez la personne à qui écrire.</p>' +
      '<div class="recherche" style="margin-bottom:12px"><input id="an-q" type="search" placeholder="Rechercher un nom…" autocomplete="off"></div>' +
      '<div id="an-liste" class="annuaire"><p class="chargement">Chargement…</p></div>' +
      '<button class="btn btn-vide" style="margin-top:12px" data-conf="0">Fermer</button>');
    try {
      await chargerAnnuaire();
      rendreAnnuaire();
      $('an-q').addEventListener('input', rendreAnnuaire);
    } catch (e) { $('an-liste').innerHTML = App.htmlErreur(e); }
  };

  function rendreAnnuaire() {
    var z = $('an-liste');
    if (!z) return;
    var q = App.sansAccent($('an-q').value.trim()), moi = moiId(), p = App.etat.profil || {};
    var liste = annuaire.filter(function (u) {
      return u.id !== moi && (!q || App.sansAccent((u.prenom || '') + ' ' + (u.nom || '')).indexOf(q) >= 0);
    });
    // les membres de ma cellule et de mon département d'abord
    function proche(u) { return (p.cellule_id && u.cellule_id === p.cellule_id) || (p.departement_id && u.departement_id === p.departement_id) ? 0 : 1; }
    liste.sort(function (a, b) { return proche(a) - proche(b); });
    z.innerHTML = liste.length ? liste.slice(0, 200).map(function (u) {
      var tags = [];
      if (p.cellule_id && u.cellule_id === p.cellule_id) tags.push('Ma cellule');
      if (p.departement_id && u.departement_id === p.departement_id) tags.push('Mon département');
      return '<button class="conv" data-act="choisir-destinataire" data-id="' + esc(u.id) + '">' +
        '<span class="avatar">' + esc(initiales(u.prenom, u.nom)) + '</span>' +
        '<span class="conv-corps"><span class="conv-ligne"><b>' + esc(((u.prenom || '') + ' ' + (u.nom || '')).trim() || 'Membre') + '</b></span>' +
        '<span class="conv-ligne"><span class="conv-apercu">' + esc([App.ROLES[u.role] || 'Membre'].concat(tags).join(' · ')) + '</span></span></span></button>';
    }).join('') : '<p class="note" style="padding:10px 4px">Aucune personne ne correspond.</p>';
  }

  App.actions['choisir-destinataire'] = function (d) {
    App.fermer();
    ouvrir('p' + d.id);
  };

  /* ---------------------------------------------------------
     PASTILLE DES MESSAGES NON LUS (navigation)
     --------------------------------------------------------- */
  function majBadge() {
    var n = conversations.reduce(function (s, c) { return s + (Number(c.non_lus) || 0); }, 0);
    document.querySelectorAll('[data-compteur-messages]').forEach(function (el) {
      el.textContent = n > 99 ? '99+' : n;
      el.hidden = !(n > 0);
    });
  }
  App.surveillerMessages = function () {
    clearInterval(minuteurBadge);
    if (App.etat.etat !== 'dedans') return;
    chargerConversations();
    minuteurBadge = setInterval(function () {
      if (document.visibilityState === 'visible' && App.ecranCourant() !== 'discussions') chargerConversations();
    }, 45000);
  };

  /* ---------------------------------------------------------
     ÉCRAN
     --------------------------------------------------------- */
  App.ecrans.discussions = async function () {
    await nommerSesGroupes();
    if (App.etat.role === 'super_admin') { try { await App.chargerAdmin(); } catch (e) { /* rien */ } }
    groupes = listerGroupes();
    var demandee = App.conversationDemandee;
    App.conversationDemandee = null;
    if (courante && !trouver(courante.cle)) courante = null;
    rendreListe();
    if (demandee) {
      if (demandee.charAt(0) === 'p' && !conversations.some(function (c) { return 'p' + c.interlocuteur_id === demandee; })) {
        try { await chargerAnnuaire(); } catch (e) { /* le nom restera générique */ }
      }
      ouvrir(demandee);
    } else if (courante) {
      ouvrir(courante.cle, false);
    } else if (!estTelephone()) {
      ouvrir(groupes[0].cle, false);          // sur ordinateur, une conversation est toujours ouverte
    } else {
      afficherVue('liste');
    }
    await rafraichirListe();
    clearInterval(minuteurListe);
    minuteurListe = setInterval(function () { if (App.ecranCourant() === 'discussions') rafraichirListe(); }, 20000);
  };
  App.quitter.discussions = function () {
    clearInterval(minuteurFil); clearInterval(minuteurListe);
    minuteurFil = minuteurListe = null;
    document.body.classList.remove('conversation-ouverte');
    if (estTelephone()) courante = null;
  };

  /* ---------------------------------------------------------
     ZONE DE SAISIE ET CLAVIER DU TÉLÉPHONE
     --------------------------------------------------------- */
  function ajusterZone() {
    var zone = $('di-texte');
    zone.style.height = 'auto';
    zone.style.height = Math.min(120, zone.scrollHeight) + 'px';
  }

  /* Quand le clavier s'ouvre, la conversation se réduit à la partie visible de
     l'écran : la zone de saisie reste collée au-dessus du clavier. */
  function suivreClavier() {
    var vv = window.visualViewport;
    if (!vv) return;
    var r = document.documentElement;
    var maj = function () {
      r.style.setProperty('--hauteur-visible', vv.height + 'px');
      r.style.setProperty('--decalage-visible', vv.offsetTop + 'px');
      if (courante && document.activeElement === $('di-texte') && enBas()) allerEnBas();
    };
    vv.addEventListener('resize', maj);
    vv.addEventListener('scroll', maj);
    maj();
  }

  document.addEventListener('DOMContentLoaded', function () {
    var zone = $('di-texte');
    if (!zone) return;
    zone.addEventListener('input', ajusterZone);
    zone.addEventListener('keydown', function (e) {
      // Entrée envoie sur ordinateur ; sur téléphone, Entrée va à la ligne (bouton pour envoyer)
      if (e.key === 'Enter' && !e.shiftKey && !estTelephone()) { e.preventDefault(); App.actions['envoyer-message'](); }
    });
    zone.addEventListener('focus', function () { setTimeout(allerEnBas, 250); });
    var r = $('conv-recherche');
    if (r) r.addEventListener('input', rendreListe);
    suivreClavier();
  });
})();
