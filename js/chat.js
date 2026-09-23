/* ==========================================================
   DISCUSSIONS (V4)
   Trois sortes de salons : toute l'église, une cellule, un département.
   La base de données n'autorise à lire et à écrire que dans les salons
   auxquels on appartient (règles RLS) : le navigateur ne décide rien.
   ========================================================== */
(function () {
  'use strict';

  var App = window.App, sb = App.sb, $ = App.$, esc = App.esc;

  var salons = [], salonCourant = null, messages = [], minuteur = null, premierAffichage = true;

  function salonsDisponibles() {
    var E = App.etat, p = E.profil, D = App.donnees, liste = [{ cle: 'eglise', nom: "Toute l'église", salon: 'eglise' }];
    var vues = {};
    function ajouterCellule(c) {
      if (!c || vues['c' + c.id]) return;
      vues['c' + c.id] = 1;
      liste.push({ cle: 'c' + c.id, nom: '👥 ' + c.nom, salon: 'cellule', cellule_id: c.id });
    }
    function ajouterDepartement(d) {
      if (!d || vues['d' + d.id]) return;
      vues['d' + d.id] = 1;
      liste.push({ cle: 'd' + d.id, nom: '🎵 ' + d.nom, salon: 'departement', departement_id: d.id });
    }
    (E.mesCellules || []).forEach(ajouterCellule);
    (E.mesDepartements || []).forEach(ajouterDepartement);
    if (E.role === 'super_admin') {
      (D.cellules || []).forEach(ajouterCellule);
      (D.departements || []).forEach(ajouterDepartement);
    } else {
      if (p && p.cellule_id) ajouterCellule(App.celluleDuProfil || { id: p.cellule_id, nom: App.nomMaCellule || '…' });
      if (p && p.departement_id) ajouterDepartement(App.departementDuProfil || { id: p.departement_id, nom: App.nomMonDepartement || '…' });
    }
    return liste;
  }

  /* Le nom de sa propre cellule / de son département est lisible par son membre */
  async function nommerSesGroupes() {
    var p = App.etat.profil;
    if (!p) return;
    try {
      if (p.cellule_id && !App.celluleDuProfil) {
        var c = await App.q(sb.from('cellules').select('id,nom').eq('id', p.cellule_id).maybeSingle());
        if (c) App.celluleDuProfil = c;
      }
      if (p.departement_id && !App.departementDuProfil) {
        var d = await App.q(sb.from('departements').select('id,nom').eq('id', p.departement_id).maybeSingle());
        if (d) App.departementDuProfil = d;
      }
    } catch (e) { /* sans conséquence : le salon gardera un nom générique */ }
  }

  function rendreSalons() {
    $('salons').innerHTML = salons.map(function (s) {
      return '<button class="' + (s.cle === salonCourant.cle ? 'on' : '') + '" data-act="salon" data-cle="' + esc(s.cle) + '">' + esc(s.nom) + '</button>';
    }).join('');
    $('di-sous').textContent = salonCourant.salon === 'eglise'
      ? "Tous les membres de l'église écrivent ici"
      : 'Salon réservé à ' + salonCourant.nom.replace(/^[^ ]+ /, '');
  }
  App.actions.salon = function (d) {
    var s = salons.filter(function (x) { return x.cle === d.cle; })[0];
    if (!s || s.cle === salonCourant.cle) return;
    salonCourant = s;
    messages = [];
    premierAffichage = true;
    rendreSalons();
    $('fil').innerHTML = '<p class="chargement" style="text-align:center">Chargement…</p>';
    lire();
  };

  function requete() {
    var q = sb.from('discussions').select('*').eq('salon', salonCourant.salon);
    if (salonCourant.cellule_id) q = q.eq('cellule_id', salonCourant.cellule_id);
    if (salonCourant.departement_id) q = q.eq('departement_id', salonCourant.departement_id);
    return q.order('created_at', { ascending: false }).limit(150);
  }

  function rendreFil() {
    var z = $('fil'), moiId = App.etat.profil.id;
    if (!messages.length) {
      z.innerHTML = '<div style="padding:30px 0">' + App.vide('Personne n\'a encore parlé',
        'Soyez le premier à écrire dans « ' + salonCourant.nom + ' ».') + '</div>';
      return;
    }
    var jour = '', html = '';
    messages.forEach(function (m) {
      var d = new Date(m.created_at), j = App.iso(d);
      if (j !== jour) {
        jour = j;
        var auj = App.iso(new Date());
        html += '<div class="jour-fil">' + esc(j === auj ? "Aujourd'hui" : App.fmtDate(j, true)) + '</div>';
      }
      var moi = m.auteur_id === moiId;
      html += '<div class="bulle' + (moi ? ' moi' : '') + '">' +
        (moi ? '' : '<div class="qui">' + esc(m.auteur_nom || 'Membre') + '</div>') +
        '<div class="txt">' + esc(m.contenu) + '</div>' +
        '<div class="h">' + esc(d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }).replace(':', 'h')) + '</div>' +
        (moi || App.etat.role === 'super_admin'
          ? '<button class="suppr" title="Supprimer" data-act="suppr-discussion" data-id="' + esc(m.id) + '">✕</button>' : '') +
        '</div>';
    });
    z.innerHTML = html;
    if (premierAffichage) { premierAffichage = false; z.scrollIntoView(false); }
  }

  var derniereSignature = '';
  async function lire(silencieux) {
    if (!salonCourant) return;
    try {
      var lignes = await App.q(requete());
      lignes.reverse();   // du plus ancien au plus récent
      var signature = lignes.length + '|' + (lignes.length ? lignes[lignes.length - 1].id : '');
      if (signature === derniereSignature && silencieux) return;
      derniereSignature = signature;
      messages = lignes;
      var enBas = window.innerHeight + window.scrollY >= document.body.scrollHeight - 140;
      rendreFil();
      if (enBas || !silencieux) window.scrollTo(0, document.body.scrollHeight);
    } catch (e) {
      if (!silencieux) $('fil').innerHTML = App.htmlErreur(e);
    }
  }

  App.ecrans.discussions = async function () {
    await nommerSesGroupes();
    if (App.etat.role === 'super_admin') { try { await App.chargerAdmin(); } catch (e) { /* rien */ } }
    salons = salonsDisponibles();
    if (!salonCourant || !salons.some(function (s) { return s.cle === salonCourant.cle; })) salonCourant = salons[0];
    rendreSalons();
    $('ecrire').hidden = false;
    premierAffichage = true;
    await lire();
    clearInterval(minuteur);
    minuteur = setInterval(function () { if (App.ecranCourant() === 'discussions') lire(true); }, 8000);
  };
  App.quitter.discussions = function () {
    clearInterval(minuteur);
    minuteur = null;
    $('ecrire').hidden = true;
  };

  App.actions['envoyer-message'] = async function () {
    var zone = $('di-texte'), texte = zone.value.trim();
    if (!texte) return;
    var b = $('di-envoyer');
    b.disabled = true;
    var ligne = {
      salon: salonCourant.salon, auteur_id: App.etat.profil.id, contenu: texte,
      cellule_id: salonCourant.cellule_id || null, departement_id: salonCourant.departement_id || null
    };
    try {
      await App.q(sb.from('discussions').insert(ligne));
      zone.value = '';
      zone.style.height = 'auto';
      await lire();
      window.scrollTo(0, document.body.scrollHeight);
    } catch (e) {
      App.flash(App.msgErreur(e));
    } finally { b.disabled = false; }
  };

  App.actions['suppr-discussion'] = async function (d) {
    var ok = await App.confirmer('Supprimer ce message ?', 'Il disparaîtra pour tout le monde.', 'Supprimer', true);
    if (!ok) return;
    try {
      await App.q(sb.from('discussions').delete().eq('id', d.id));
      await lire();
    } catch (e) { App.flash(App.msgErreur(e)); }
  };

  /* La zone de saisie grandit avec le texte ; Entrée envoie, Maj+Entrée va à la ligne */
  document.addEventListener('DOMContentLoaded', function () {
    var zone = $('di-texte');
    if (!zone) return;
    zone.addEventListener('input', function () {
      zone.style.height = 'auto';
      zone.style.height = Math.min(96, zone.scrollHeight) + 'px';
    });
    zone.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); App.actions['envoyer-message'](); }
    });
  });
})();
