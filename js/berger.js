/* ==========================================================
   ESPACE BERGER ET CHEF DE DÉPARTEMENT
   · Ma cellule · Fiche de réunion · Historique
   · Mon département
   Rappel : la base de données n'autorise un berger à lire et à écrire
   QUE les fiches et les membres de SA cellule (règles RLS).
   ========================================================== */
(function () {
  'use strict';

  var App = window.App, sb = App.sb, $ = App.$, esc = App.esc;
  var mesFiches = [], celluleCourante = null;

  function cellules() { return App.etat.mesCellules || []; }
  function celluleActive() {
    var l = cellules();
    if (!l.length) return null;
    return App.par(l, celluleCourante) || l[0];
  }

  function sansCellule(zone) {
    $(zone).innerHTML = App.vide('Aucune cellule ne vous est confiée',
      "Un administrateur doit vous nommer berger d'une cellule. Contactez un responsable de l'église.");
  }

  function carteMembre(u) {
    return '<div class="membre"><div class="mb-haut"><div>' +
      '<div class="mb-nom">' + esc(App.nomComplet(u)) + '</div>' +
      '<div class="mb-detail">' + esc(App.ROLES[u.role] || 'Membre') + '</div></div>' +
      '<span class="etat ' + u.statut + '">' + esc(App.STATUTS[u.statut]) + '</span></div>' +
      (u.telephone ? '<div class="mb-chiffres"><a href="tel:' + esc(String(u.telephone).replace(/\s/g, '')) +
        '" style="color:var(--v1);font-weight:700;text-decoration:none">' + esc(u.telephone) + '</a></div>' : '') +
      '</div>';
  }

  /* =========================================================
     MA CELLULE
     ========================================================= */
  App.ecrans['ma-cellule'] = async function () {
    var c = celluleActive();
    if (!c) { sansCellule('infos-cellule'); $('membres-cellule').innerHTML = ''; $('mc-sous').textContent = '—'; $('mc-nb').textContent = ''; return; }
    celluleCourante = c.id;
    $('mc-sous').textContent = c.nom + (c.quartier ? ' · ' + c.quartier : '');
    $('infos-cellule').innerHTML = '<div class="carte">' +
      '<div class="fc-ligne"><span>Nom</span><b>' + esc(c.nom) + '</b></div>' +
      '<div class="fc-ligne"><span>Quartier</span><b>' + esc(c.quartier || '—') + '</b></div>' +
      '<div class="fc-ligne"><span>Adresse</span><b>' + esc(c.adresse || '—') + '</b></div>' +
      '<div class="fc-ligne"><span>Réunion</span><b>' + esc(c.jour_reunion ? App.cap(c.jour_reunion) + (c.heure_reunion ? ' à ' + App.fmtHeure(c.heure_reunion) : '') : 'Non défini') + '</b></div>' +
      '</div>' +
      (cellules().length > 1 ? '<div class="filtres" style="margin-top:14px">' + cellules().map(function (x) {
        return '<button class="' + (x.id === c.id ? 'on' : '') + '" data-act="choisir-cellule" data-id="' + esc(x.id) + '">' + esc(x.nom) + '</button>';
      }).join('') + '</div>' : '') +
      '<div style="margin-top:14px"><button class="btn btn-plein btn-s" data-act="nouvelle-fiche">Remplir la fiche de cette semaine</button></div>';

    $('membres-cellule').innerHTML = '<p class="chargement">Chargement…</p>';
    try {
      var membres = await App.lireTout(function () {
        return sb.from('users').select('*').eq('cellule_id', c.id).order('nom');
      });
      $('mc-nb').textContent = membres.length + (membres.length > 1 ? ' personnes' : ' personne');
      $('membres-cellule').innerHTML = membres.length
        ? membres.map(carteMembre).join('')
        : App.vide('Aucun membre', "L'administrateur ajoute les membres à votre cellule depuis son écran « Membres ».");
    } catch (e) {
      $('membres-cellule').innerHTML = App.htmlErreur(e);
    }
  };
  App.actions['choisir-cellule'] = function (d) { celluleCourante = d.id; App.ecrans['ma-cellule'](); };

  /* =========================================================
     MON DÉPARTEMENT (chef de département)
     ========================================================= */
  App.ecrans['mon-departement'] = async function () {
    var deps = App.etat.mesDepartements || [];
    if (!deps.length) {
      $('md-infos').innerHTML = App.vide('Aucun département ne vous est confié',
        "Un administrateur doit vous nommer chef d'un département.");
      $('md-ouvriers').innerHTML = ''; $('md-nb').textContent = ''; $('md-sous').textContent = '—';
      return;
    }
    var d = deps[0];
    $('md-sous').textContent = d.nom;
    $('md-infos').innerHTML = '<div class="carte">' +
      '<div class="fc-ligne"><span>Département</span><b>' + esc(d.nom) + '</b></div>' +
      '<div class="fc-ligne"><span>Description</span><b>' + esc(d.description || '—') + '</b></div>' +
      '</div>' +
      (deps.length > 1 ? '<div class="filtres" style="margin-top:14px">' + deps.map(function (x, i) {
        return '<button class="' + (i === 0 ? 'on' : '') + '" data-act="choisir-departement" data-id="' + esc(x.id) + '">' + esc(x.nom) + '</button>';
      }).join('') + '</div>' : '');
    $('md-ouvriers').innerHTML = '<p class="chargement">Chargement…</p>';
    try {
      var ouvriers = await App.lireTout(function () {
        return sb.from('users').select('*').eq('departement_id', d.id).order('nom');
      });
      $('md-nb').textContent = ouvriers.length + (ouvriers.length > 1 ? ' ouvriers' : ' ouvrier');
      $('md-ouvriers').innerHTML = ouvriers.length
        ? ouvriers.map(carteMembre).join('')
        : App.vide('Aucun ouvrier', "L'administrateur rattache les membres à votre département.");
    } catch (e) { $('md-ouvriers').innerHTML = App.htmlErreur(e); }
  };
  App.actions['choisir-departement'] = function (d) {
    var deps = App.etat.mesDepartements || [];
    var i = deps.findIndex(function (x) { return x.id === d.id; });
    if (i > 0) { var t = deps[0]; deps[0] = deps[i]; deps[i] = t; }
    App.ecrans['mon-departement']();
  };

  /* =========================================================
     HISTORIQUE DES FICHES
     ========================================================= */
  App.ecrans['mes-fiches'] = async function () {
    var z = $('liste-mes-fiches');
    if (!cellules().length) { sansCellule('liste-mes-fiches'); return; }
    z.innerHTML = '<p class="chargement">Chargement…</p>';
    try {
      mesFiches = await App.lireTout(function () {
        return sb.from('fiches_cellule').select('*').order('date_reunion', { ascending: false });
      });
      z.innerHTML = mesFiches.length
        ? mesFiches.map(function (f) {
          var c = App.par(cellules(), f.cellule_id);
          return App.htmlFiche(f, { cellule: c ? c.nom : 'Ma cellule', modifier: true });
        }).join('')
        : App.vide('Aucune fiche enregistrée', 'Remplissez votre premier compte rendu après la réunion de cellule.',
          '<div style="margin-top:14px"><button class="btn btn-plein btn-s" data-act="nouvelle-fiche">Nouvelle fiche</button></div>');
    } catch (e) {
      z.innerHTML = App.htmlErreur(e);
    }
  };

  /* =========================================================
     FICHE DE RÉUNION
     ========================================================= */
  var ficheEnCours = null;

  function remplirChamps(f) {
    var v = function (id, val) { $(id).value = val; };
    v('fc-date', f ? f.date_reunion : App.iso(new Date()));
    v('fc-heure-debut', f ? String(f.heure_debut).slice(0, 5) : '');
    v('fc-heure-fin', f ? String(f.heure_fin).slice(0, 5) : '');
    v('fc-hommes', f ? f.nb_hommes : 0);
    v('fc-femmes', f ? f.nb_femmes : 0);
    v('fc-enfants', f ? f.nb_enfants : 0);
    v('fc-nouveaux', f ? f.nb_nouveaux_venus : 0);
    v('fc-conversions', f ? f.nb_conversions_7j : 0);
    v('fc-familles', f ? f.nb_familles_visitees_7j : 0);
    v('fc-temoignages', f ? f.nb_temoignages : 0);
    v('fc-difficultes', f ? (f.difficultes_suggestions || '') : '');
    window.calculerTotal();
  }

  var nouvelleFiche = window.nouvelleFiche = function (fiche) {
    if (!cellules().length) { App.aller('mes-fiches'); sansCellule('liste-mes-fiches'); return; }
    ficheEnCours = fiche || null;
    var plusieurs = cellules().length > 1;
    $('fc-bloc-cellule').hidden = !plusieurs;
    if (plusieurs) {
      $('fc-cellule').innerHTML = cellules().map(function (c) { return '<option value="' + esc(c.id) + '">' + esc(c.nom) + '</option>'; }).join('');
      $('fc-cellule').value = fiche ? fiche.cellule_id : (celluleActive() || {}).id;
    }
    $('fc-titre').textContent = fiche ? 'Modifier la fiche' : 'Fiche de réunion';
    $('fc-titre-pc').textContent = fiche ? 'Modifier le compte rendu' : 'Fiche de compte rendu';
    $('btn-fiche').textContent = fiche ? 'Enregistrer les modifications' : 'Enregistrer la fiche';
    App.erreurEcran('err-fiche', '');
    remplirChamps(fiche);
    App.aller('fiche-cellule');
  };
  App.actions['nouvelle-fiche'] = function () { nouvelleFiche(); };
  App.actions['modifier-fiche'] = function (d) {
    var f = App.par(mesFiches, d.id);
    if (f) nouvelleFiche(f);
  };
  App.ecrans['fiche-cellule'] = function () { /* préparé par nouvelleFiche() */ };

  window.calculerTotal = function () {
    var n = function (id) { return Math.max(0, parseInt($(id).value, 10) || 0); };
    $('fc-total').value = n('fc-hommes') + n('fc-femmes') + n('fc-enfants');
  };

  window.enregistrerFiche = async function () {
    var n = function (id) { return Math.max(0, parseInt($(id).value, 10) || 0); };
    var celluleId = cellules().length > 1 ? $('fc-cellule').value : (celluleActive() || {}).id;
    var date = $('fc-date').value, hd = $('fc-heure-debut').value, hf = $('fc-heure-fin').value;
    var err = '';
    if (!celluleId) err = 'Aucune cellule ne vous est confiée.';
    else if (!date) err = 'Indiquez la date de la réunion.';
    else if (date > App.iso(new Date())) err = 'La date de réunion ne peut pas être dans le futur.';
    else if (!hd || !hf) err = "Indiquez l'heure de début et l'heure de fin.";
    else if (hf <= hd) err = "L'heure de fin doit être après l'heure de début.";
    else if (n('fc-hommes') + n('fc-femmes') + n('fc-enfants') === 0) err = 'Indiquez au moins une personne présente.';
    App.erreurEcran('err-fiche', err);
    if (err) { window.scrollTo(0, 0); return; }

    var donnees = {
      cellule_id: celluleId,
      berger_id: App.etat.profil.id,
      date_reunion: date, heure_debut: hd, heure_fin: hf,
      nb_hommes: n('fc-hommes'), nb_femmes: n('fc-femmes'), nb_enfants: n('fc-enfants'),
      nb_nouveaux_venus: n('fc-nouveaux'), nb_conversions_7j: n('fc-conversions'),
      nb_familles_visitees_7j: n('fc-familles'), nb_temoignages: n('fc-temoignages'),
      difficultes_suggestions: $('fc-difficultes').value.trim() || null
    };
    var b = $('btn-fiche');
    App.occupe(b, true, 'Enregistrement…');
    try {
      if (ficheEnCours) await App.q(sb.from('fiches_cellule').update(donnees).eq('id', ficheEnCours.id));
      else await App.q(sb.from('fiches_cellule').insert(donnees));
      ficheEnCours = null;
      App.flash('Fiche enregistrée. Merci !');
      App.aller('mes-fiches');
    } catch (e) {
      if (e && e.code === '23505') App.erreurEcran('err-fiche', "Une fiche existe déjà pour cette cellule à cette date. Modifiez-la depuis l'historique.");
      else App.erreurEcran('err-fiche', App.msgErreur(e));
      window.scrollTo(0, 0);
    } finally { App.occupe(b, false); }
  };
})();
