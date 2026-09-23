/* ==========================================================
   ESPACE ADMINISTRATEUR (super_admin)
   Tableau de bord · Cellules · Membres · Départements · Fiches reçues
   ========================================================== */
(function () {
  'use strict';

  var App = window.App, sb = App.sb, $ = App.$, esc = App.esc;
  var champ = App.champ, champZone = App.champZone, champSelect = App.champSelect, vide = App.vider;
  var D = { membres: [], cellules: [], departements: [], fiches: [], membresCellule: [], ouvriers: [] };
  App.donnees = D;

  /* ---------------------------------------------------------
     CHARGEMENT COMMUN À TOUS LES ÉCRANS D'ADMINISTRATION
     --------------------------------------------------------- */
  var enCours = null, chargeeLe = 0;
  async function charger(forcer) {
    if (!forcer && enCours) return enCours;
    if (!forcer && Date.now() - chargeeLe < 45000) return Promise.resolve(D);
    enCours = (async function () {
      try {
        var r = await Promise.all([
          // on ne demande que les colonnes utiles : moins de données à transporter
          App.lireTout(function () { return sb.from('users').select('id,nom,prenom,email,telephone,role,statut,cellule_id,departement_id,created_at').order('nom'); }),
          App.lireTout(function () { return sb.from('cellules').select('id,nom,quartier,adresse,berger_id,jour_reunion,heure_reunion').order('nom'); }),
          App.lireTout(function () { return sb.from('departements').select('id,nom,description,chef_id').order('nom'); }),
          App.lireTout(function () { return sb.from('membres_cellule').select('user_id,cellule_id,statut'); }),
          App.lireTout(function () { return sb.from('ouvriers').select('user_id,departement_id'); }),
          App.lireTout(function () { return sb.from('fiches_cellule').select('*').order('date_reunion', { ascending: false }).limit(400); })
        ]);
        D.membres = r[0]; D.cellules = r[1]; D.departements = r[2];
        D.membresCellule = r[3]; D.ouvriers = r[4]; D.fiches = r[5];
        chargeeLe = Date.now();
        App.majCompteur(D.membres.filter(function (u) { return u.statut === 'actif' && !u.cellule_id; }).length);
        return D;
      } finally { enCours = null; }
    })();
    return enCours;
  }
  App.chargerAdmin = charger;
  function rafraichir() { chargeeLe = 0; return charger(true); }
  App.rafraichirAdmin = rafraichir;

  function nomCellule(id) { var c = App.par(D.cellules, id); return c ? c.nom : null; }
  function nomDepartement(id) { var d = App.par(D.departements, id); return d ? d.nom : null; }
  function membresDe(celluleId) {
    return D.membresCellule.filter(function (m) { return m.cellule_id === celluleId && m.statut === 'actif'; });
  }

  async function remplir(idZone, rendu) {
    var z = $(idZone);
    if (!z) return;
    if (!z.dataset.rempli) z.innerHTML = App.squelette(3);
    try {
      await charger();
      z.dataset.rempli = '1';
      rendu(z);
    } catch (e) {
      console.error(e);
      z.innerHTML = App.htmlErreur(e);
    }
  }

  /* =========================================================
     TABLEAU DE BORD
     ========================================================= */
  function carteKpi(couleur, svg, valeur, libelle) {
    return '<div class="kpi"><div class="pic ' + couleur + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor">' + svg + '</svg></div>' +
      '<b>' + valeur + '</b><span>' + esc(libelle) + '</span></div>';
  }
  var ICO = {
    gens: '<circle cx="9" cy="8.5" r="3.4"/><path d="M3 19c1-3 3.4-4.5 6-4.5S14 16 15 19"/><path d="M16 7.5a3.4 3.4 0 0 1 0 6.5"/>',
    maison: '<path d="M4 10.5L12 4l8 6.5V19a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19z"/>',
    etoile: '<path d="M12 3.5l2.5 5.4 5.9.7-4.4 4 1.2 5.9L12 16.6 6.8 19.5 8 13.6 3.6 9.6l5.9-.7z"/>',
    feuille: '<rect x="4.5" y="3.5" width="15" height="17" rx="4"/><path d="M8.5 9h7M8.5 13h7"/>'
  };

  function histogramme(points) {
    var max = Math.max.apply(null, points.map(function (p) { return p.v; }).concat([1]));
    var L = 320, H = 150, n = points.length, larg = L / n * 0.5, pas = L / n;
    var barres = points.map(function (p, i) {
      var h = Math.max(2, p.v / max * (H - 32));
      var x = i * pas + (pas - larg) / 2;
      return '<rect x="' + x.toFixed(1) + '" y="' + (H - 22 - h).toFixed(1) + '" width="' + larg.toFixed(1) + '" height="' + h.toFixed(1) + '" rx="5" fill="url(#dg)"/>' +
        (p.v ? '<text x="' + (x + larg / 2).toFixed(1) + '" y="' + (H - 26 - h).toFixed(1) + '" text-anchor="middle" font-size="10.5" font-weight="700" fill="var(--doux)">' + p.v + '</text>' : '') +
        '<text x="' + (x + larg / 2).toFixed(1) + '" y="' + (H - 5) + '" text-anchor="middle" font-size="10" font-weight="600" fill="var(--faible)">' + esc(p.l) + '</text>';
    }).join('');
    return '<svg viewBox="0 0 ' + L + ' ' + H + '" role="img" aria-label="Présences des 8 dernières semaines">' +
      '<defs><linearGradient id="dg" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="var(--v2)"/><stop offset="1" stop-color="var(--v1)"/></linearGradient></defs>' +
      barres + '</svg>';
  }

  function anneau(parts) {
    var total = parts.reduce(function (s, p) { return s + p.v; }, 0);
    var r = 52, c = 2 * Math.PI * r, a = 0;
    var arcs = total ? parts.filter(function (p) { return p.v; }).map(function (p) {
      var l = p.v / total * c;
      var s = '<circle cx="66" cy="66" r="' + r + '" fill="none" stroke="' + p.c + '" stroke-width="20"' +
        ' stroke-dasharray="' + (Math.max(0, l - 2)).toFixed(1) + ' ' + (c - l + 2).toFixed(1) + '" stroke-dashoffset="' + (-a).toFixed(1) + '" transform="rotate(-90 66 66)"/>';
      a += l;
      return s;
    }).join('') : '<circle cx="66" cy="66" r="' + r + '" fill="none" stroke="var(--trait)" stroke-width="20"/>';
    var lignes = parts.filter(function (p) { return p.v; }).map(function (p) {
      return '<div class="rp-ligne"><span class="gauche"><i style="background:' + p.c + '"></i>' + esc(p.l) + '</span><b>' + p.v + '</b></div>';
    }).join('');
    return '<div class="repart"><svg viewBox="0 0 132 132">' + arcs +
      '<text x="66" y="62" text-anchor="middle" font-size="26" font-weight="700" fill="var(--encre)">' + total + '</text>' +
      '<text x="66" y="80" text-anchor="middle" font-size="11" font-weight="600" fill="var(--faible)">membres</text></svg>' +
      '<div class="details">' + (lignes || '<p class="chargement">Aucun membre</p>') + '</div></div>';
  }

  var chargerTableau = window.chargerTableau = async function () {
    $('tb-kpi').innerHTML = App.squelette(2);
    try { await rafraichir(); } catch (e) { $('tb-kpi').innerHTML = App.htmlErreur(e); return; }
    rendreTableau();
  };

  function rendreTableau() {
    var actifs = D.membres.filter(function (u) { return u.statut === 'actif'; });
    var sansCellule = actifs.filter(function (u) { return !u.cellule_id; });
    var lundi = App.lundi(new Date()), lundiIso = App.iso(lundi);
    var fichesSemaine = D.fiches.filter(function (f) { return f.date_reunion >= lundiIso; });
    var presentsSemaine = fichesSemaine.reduce(function (s, f) { return s + f.nb_total_presents; }, 0);

    $('tb-periode2').textContent = "Semaine du " + App.fmtDate(lundiIso);
    $('tb-semaine-sous').textContent = fichesSemaine.length + ' fiche' + (fichesSemaine.length > 1 ? 's' : '') +
      ' reçue' + (fichesSemaine.length > 1 ? 's' : '') + ' sur ' + D.cellules.length + ' cellule' + (D.cellules.length > 1 ? 's' : '');

    var rappels = [];
    if (sansCellule.length) rappels.push(['membres', sansCellule.length + ' membre' + (sansCellule.length > 1 ? 's' : '') + ' sans cellule', 'à rattacher']);
    var sansBerger = D.cellules.filter(function (c) { return !c.berger_id; }).length;
    if (sansBerger) rappels.push(['cellules', sansBerger + ' cellule' + (sansBerger > 1 ? 's' : '') + ' sans berger', 'à pourvoir']);
    $('tb-rappel').innerHTML = rappels.map(function (r) {
      return '<button class="reglage" data-act="aller" data-id="' + r[0] + '" style="background:var(--or-pale);border-color:transparent">' +
        '<span class="ico" style="background:rgba(184,134,47,.16)"><svg viewBox="0 0 24 24"><path d="M12 8.5v4.5M12 16.4v.1"/><circle cx="12" cy="12" r="8.5"/></svg></span>' +
        '<span class="corps"><b>' + esc(r[1]) + '</b><small>' + esc(r[2]) + '</small></span><span class="fleche">›</span></button>';
    }).join('');

    $('tb-kpi').innerHTML =
      carteKpi('v', ICO.gens, actifs.length, 'Membres actifs') +
      carteKpi('o', ICO.maison, D.cellules.length, D.cellules.length > 1 ? 'Cellules' : 'Cellule') +
      carteKpi('t', ICO.feuille, fichesSemaine.length, 'Fiches cette semaine') +
      carteKpi('b', ICO.etoile, presentsSemaine, 'Présents en cellule');

    var points = [];
    for (var i = 7; i >= 0; i--) {
      var deb = new Date(lundi); deb.setDate(deb.getDate() - 7 * i);
      var fin = new Date(deb); fin.setDate(fin.getDate() + 7);
      var dIso = App.iso(deb), fIso = App.iso(fin), somme = 0;
      D.fiches.forEach(function (f) { if (f.date_reunion >= dIso && f.date_reunion < fIso) somme += f.nb_total_presents; });
      points.push({ v: somme, l: deb.getDate() + '/' + (deb.getMonth() + 1) });
    }
    $('tb-presences').innerHTML = D.fiches.length
      ? histogramme(points) + '<div class="legende"><span><i style="background:var(--degrade)"></i>Total des présents par semaine</span></div>'
      : App.vide('Aucune fiche pour le moment', 'Les comptes rendus des bergers apparaîtront ici.');

    var parRole = {};
    actifs.forEach(function (u) { parRole[u.role] = (parRole[u.role] || 0) + 1; });
    var couleurs = { super_admin: 'var(--v-encre)', berger: 'var(--v1)', chef_departement: 'var(--v2)', comptable: 'var(--or)', membre: 'var(--v3)' };
    $('tb-membres').innerHTML = anneau(Object.keys(App.ROLES).map(function (r) {
      return { l: App.ROLES[r], v: parRole[r] || 0, c: couleurs[r] };
    }));

    $('tb-semaine').innerHTML = D.cellules.length
      ? D.cellules.map(function (c) {
        var f = fichesSemaine.filter(function (x) { return x.cellule_id === c.id; })[0];
        return '<div class="fc-ligne"><span>' + esc(c.nom) + '</span>' +
          (f ? '<b class="statut-actif">✓ ' + f.nb_total_presents + ' présents</b>' : '<b style="color:var(--faible)">— en attente</b>') + '</div>';
      }).join('')
      : App.vide('Aucune cellule', 'Créez votre première cellule pour commencer.',
        '<div style="margin-top:14px"><button class="btn btn-plein btn-s" data-act="aller" data-id="cellules">Créer une cellule</button></div>');
  }
  App.ecrans.tableau = function () {
    if ($('tb-kpi').dataset.rempli) { charger().then(rendreTableau).catch(function () { }); return; }
    $('tb-kpi').dataset.rempli = '1';
    chargerTableau();
  };
  App.actions.aller = function (d) { App.aller(d.id); };

  /* =========================================================
     CELLULES
     ========================================================= */
  App.ecrans.cellules = function () {
    remplir('liste-cellules', function (z) {
      $('ce-sous').textContent = D.cellules.length ? D.cellules.length + (D.cellules.length > 1 ? ' cellules' : ' cellule') : 'Aucune cellule';
      if (!D.cellules.length) {
        z.innerHTML = App.vide('Aucune cellule', 'Créez une cellule, puis nommez un berger qui remplira les fiches de réunion.',
          '<div style="margin-top:14px"><button class="btn btn-plein btn-s" data-act="form-cellule">Créer une cellule</button></div>');
        return;
      }
      z.innerHTML = D.cellules.map(function (c) {
        var berger = c.berger_id ? App.par(D.membres, c.berger_id) : null;
        var nb = membresDe(c.id).length;
        var derniere = D.fiches.filter(function (f) { return f.cellule_id === c.id; })[0];
        var infos = [];
        if (c.quartier) infos.push(c.quartier);
        if (c.jour_reunion) infos.push(App.cap(c.jour_reunion) + (c.heure_reunion ? ' à ' + App.fmtHeure(c.heure_reunion) : ''));
        return '<div class="membre"><div class="mb-haut"><div>' +
          '<div class="mb-nom">' + esc(c.nom) + '</div>' +
          '<div class="mb-detail">' + esc(infos.join(' · ') || 'Jour de réunion non défini') + '</div>' +
          '</div><span class="etat ' + (berger ? 'actif' : 'en_attente') + '">' + (berger ? 'Berger nommé' : 'Sans berger') + '</span></div>' +
          '<div class="mb-chiffres"><b>' + nb + '</b> membre' + (nb > 1 ? 's' : '') + ' · Berger : <b>' + esc(berger ? App.nomComplet(berger) : 'à nommer') + '</b>' +
          (derniere ? ' · Dernière fiche : ' + esc(App.fmtDate(derniere.date_reunion)) : ' · Aucune fiche') + '</div>' +
          '<div class="mb-actions">' +
          '<button class="btn btn-doux btn-s" data-act="form-cellule" data-id="' + esc(c.id) + '">Modifier</button>' +
          '<button class="btn btn-vide btn-s" data-act="berger" data-id="' + esc(c.id) + '">Nommer un berger</button>' +
          '<button class="btn btn-rouge btn-s" data-act="suppr-cellule" data-id="' + esc(c.id) + '">Supprimer</button>' +
          '</div></div>';
      }).join('');
    });
  };

  var formulaireCellule = window.formulaireCellule = function (id) {
    var c = id ? App.par(D.cellules, id) : null;
    var jours = App.JOURS.map(function (j) { return { v: j, t: App.cap(j) }; });
    App.ouvrir('<h3>' + (c ? 'Modifier la cellule' : 'Nouvelle cellule') + '</h3>' +
      '<div class="alerte"></div>' +
      '<form data-form="cellule"><input type="hidden" name="id" value="' + esc(c ? c.id : '') + '">' +
      champ('nom', 'Nom de la cellule', c && c.nom, 'text', 'placeholder="Cellule Bethel" maxlength="80"') +
      champ('quartier', 'Quartier', c && c.quartier, 'text', 'placeholder="Bacongo"') +
      champ('adresse', 'Adresse', c && c.adresse, 'text', 'placeholder="Rue, repère…"') +
      '<div class="paire-champ">' +
      champSelect('jour_reunion', 'Jour de réunion', jours, c && c.jour_reunion, 'Non défini') +
      champ('heure_reunion', 'Heure', c && c.heure_reunion ? String(c.heure_reunion).slice(0, 5) : '', 'time') +
      '</div>' +
      '<div class="duo"><button type="button" class="btn btn-vide" data-conf="0">Annuler</button>' +
      '<button class="btn btn-plein">' + (c ? 'Enregistrer' : 'Créer la cellule') + '</button></div></form>');
  };
  App.actions['form-cellule'] = function (d) { formulaireCellule(d.id); };

  App.formulaires.cellule = async function (form) {
    var b = form.querySelector('.btn-plein');
    var donnees = {
      nom: vide(form.nom.value), quartier: vide(form.quartier.value), adresse: vide(form.adresse.value),
      jour_reunion: vide(form.jour_reunion.value), heure_reunion: vide(form.heure_reunion.value)
    };
    if (!donnees.nom) { App.erreurFeuille('Le nom de la cellule est obligatoire.'); return; }
    App.occupe(b, true, 'Enregistrement…');
    try {
      if (form.id.value) await App.q(sb.from('cellules').update(donnees).eq('id', form.id.value));
      else await App.q(sb.from('cellules').insert(donnees));
      App.fermer();
      await rafraichir();
      App.rechargerEcran();
      App.flash(form.id.value ? 'Cellule modifiée.' : 'Cellule créée.');
    } catch (e) { App.erreurFeuille(App.msgErreur(e)); } finally { App.occupe(b, false); }
  };

  App.actions.berger = function (d) {
    var c = App.par(D.cellules, d.id);
    if (!c) return;
    var candidats = D.membres.filter(function (u) { return u.statut === 'actif'; })
      .map(function (u) { return { id: u.id, nom: App.nomComplet(u) + ' — ' + App.ROLES[u.role] }; });
    App.ouvrir('<h3>Berger de « ' + esc(c.nom) + ' »</h3>' +
      '<p>Le berger voit uniquement sa cellule et remplit la fiche de réunion chaque semaine.</p>' +
      '<div class="alerte"></div>' +
      '<form data-form="berger"><input type="hidden" name="id" value="' + esc(c.id) + '">' +
      champSelect('berger_id', 'Berger', candidats, c.berger_id, 'Aucun berger',
        'La personne choisie devient « berger » et est rattachée à cette cellule.') +
      '<div class="duo"><button type="button" class="btn btn-vide" data-conf="0">Annuler</button>' +
      '<button class="btn btn-plein">Enregistrer</button></div></form>');
  };
  App.formulaires.berger = async function (form) {
    var b = form.querySelector('.btn-plein');
    App.occupe(b, true, 'Enregistrement…');
    try {
      var celluleId = form.id.value, bergerId = vide(form.berger_id.value);
      await App.q(sb.from('cellules').update({ berger_id: bergerId }).eq('id', celluleId));
      if (bergerId) {
        await App.q(sb.from('membres_cellule').upsert({ user_id: bergerId, cellule_id: celluleId, statut: 'actif' }, { onConflict: 'user_id,cellule_id' }));
        var u = App.par(D.membres, bergerId);
        if (u && u.role === 'membre') await App.q(sb.from('users').update({ role: 'berger' }).eq('id', bergerId));
      }
      App.fermer();
      await rafraichir();
      App.rechargerEcran();
      App.flash(bergerId ? 'Berger nommé.' : 'Berger retiré.');
    } catch (e) { App.erreurFeuille(App.msgErreur(e)); } finally { App.occupe(b, false); }
  };

  App.actions['suppr-cellule'] = async function (d) {
    var c = App.par(D.cellules, d.id);
    if (!c) return;
    var nbFiches = D.fiches.filter(function (f) { return f.cellule_id === c.id; }).length;
    if (nbFiches) {
      App.info('Suppression impossible', 'La cellule « ' + c.nom + ' » a déjà ' + nbFiches + ' compte' + (nbFiches > 1 ? 's' : '') + ' rendu' + (nbFiches > 1 ? 's' : '') +
        '. Cet historique est conservé : vous pouvez retirer son berger et ses membres, mais pas supprimer la cellule.');
      return;
    }
    var ok = await App.confirmer('Supprimer « ' + c.nom + ' » ?', "Les membres de cette cellule n'appartiendront plus à aucune cellule. Cette action est définitive.", 'Supprimer', true);
    if (!ok) return;
    try {
      await App.q(sb.from('cellules').delete().eq('id', c.id));
      await rafraichir();
      App.rechargerEcran();
      App.flash('Cellule supprimée.');
    } catch (e) { App.flash(App.msgErreur(e)); }
  };

  /* =========================================================
     MEMBRES
     ========================================================= */
  var filtreMembres = 'tout';
  window.filtrerMembres = function (bouton, valeur) {
    filtreMembres = valeur;
    $('filtres-membres').querySelectorAll('button').forEach(function (b) { b.classList.toggle('on', b === bouton); });
    rendreMembres();
  };
  var rendreMembres = window.rendreMembres = function () {
    var z = $('liste-membres');
    if (!z || !z.dataset.rempli) return;
    var q = App.sansAccent($('me-q').value.trim());
    var liste = D.membres.filter(function (u) {
      if (filtreMembres === 'actif' && u.statut !== 'actif') return false;
      if (filtreMembres === 'suspendu' && u.statut !== 'suspendu') return false;
      if (filtreMembres === 'sans' && (u.cellule_id || u.statut !== 'actif')) return false;
      if (!q) return true;
      // recherche par nom ou par numéro (avec ou sans espaces)
      var tel = App.normaliserTel(u.telephone);
      return App.sansAccent(App.nomComplet(u)).indexOf(q) >= 0 || tel.indexOf(q.replace(/\D/g, '')) >= 0 && q.replace(/\D/g, '') !== '';
    });
    $('me-sous').textContent = D.membres.length + (D.membres.length > 1 ? ' personnes inscrites' : ' personne inscrite');
    if (!liste.length) {
      z.innerHTML = App.vide('Aucun résultat', q ? 'Aucune personne ne correspond à votre recherche.' : 'Aucune personne dans cette catégorie.');
      return;
    }
    z.innerHTML = liste.map(function (u) {
      var lieux = [];
      var nc = nomCellule(u.cellule_id); if (nc) lieux.push('Cellule ' + nc);
      var nd = nomDepartement(u.departement_id); if (nd) lieux.push(nd);
      var moi = u.id === (App.etat.profil && App.etat.profil.id);
      return '<div class="membre"><div class="mb-haut"><div>' +
        '<div class="mb-nom">' + esc(App.nomComplet(u)) + '</div>' +
        '<div class="mb-detail">' + esc(App.ROLES[u.role]) + (lieux.length ? ' · ' + esc(lieux.join(' · ')) : ' · sans cellule') + '</div>' +
        '</div><span class="etat ' + u.statut + '">' + esc(App.STATUTS[u.statut]) + '</span></div>' +
        '<div class="mb-chiffres">' + (u.telephone ? '📞 ' + esc(App.fmtTel(u.telephone)) : 'Numéro non renseigné') +
        (App.estIdentifiantInterne(u.email) ? '' : ' · ' + esc(u.email)) + '</div>' +
        '<div class="mb-actions"><button class="btn btn-doux btn-s" data-act="form-membre" data-id="' + esc(u.id) + '">Modifier</button>' +
        (moi ? '' : (u.statut === 'suspendu'
          ? '<button class="btn btn-vert btn-s" data-act="basculer-statut" data-id="' + esc(u.id) + '" data-vers="actif">Réactiver</button>'
          : '<button class="btn btn-rouge btn-s" data-act="basculer-statut" data-id="' + esc(u.id) + '" data-vers="suspendu">Suspendre</button>')) +
        '</div></div>';
    }).join('');
  };
  App.ecrans.membres = function () { remplir('liste-membres', rendreMembres); };

  App.actions['basculer-statut'] = async function (d) {
    var u = App.par(D.membres, d.id);
    if (!u) return;
    if (d.vers === 'suspendu') {
      var ok = await App.confirmer('Suspendre ' + App.nomComplet(u) + ' ?',
        "La personne n'aura plus aucun accès à l'application tant qu'elle ne sera pas réactivée.", 'Suspendre', true);
      if (!ok) return;
    }
    try {
      await App.q(sb.from('users').update({ statut: d.vers }).eq('id', d.id));
      await rafraichir();
      App.rechargerEcran();
      App.flash(d.vers === 'actif' ? 'Compte réactivé.' : 'Compte suspendu.');
    } catch (e) { App.flash(App.msgErreur(e)); }
  };

  App.actions['form-membre'] = function (d) {
    var u = App.par(D.membres, d.id);
    if (!u) return;
    var moi = u.id === (App.etat.profil && App.etat.profil.id);
    App.ouvrir('<h3>' + esc(App.nomComplet(u)) + '</h3><p>' +
      esc(u.telephone ? App.fmtTel(u.telephone) : (App.estIdentifiantInterne(u.email) ? '' : u.email)) + '</p>' +
      '<div class="alerte"></div>' +
      '<form data-form="membre"><input type="hidden" name="id" value="' + esc(u.id) + '">' +
      (moi
        ? '<div class="mb-note" style="margin:0 0 14px">Vous ne pouvez pas modifier votre propre rôle ni votre propre statut : c\'est une sécurité pour ne pas vous bloquer hors de l\'application.</div>'
        : champSelect('role', 'Rôle', App.optionsDe(App.ROLES), u.role, null) +
          champSelect('statut', 'Statut', App.optionsDe(App.STATUTS), u.statut, null)) +
      champSelect('cellule_id', 'Cellule', D.cellules, u.cellule_id, 'Aucune cellule') +
      champSelect('departement_id', 'Département', D.departements, u.departement_id, 'Aucun département') +
      '<div class="duo"><button type="button" class="btn btn-vide" data-conf="0">Annuler</button>' +
      '<button class="btn btn-plein">Enregistrer</button></div></form>');
  };
  App.formulaires.membre = async function (form) {
    var b = form.querySelector('.btn-plein');
    var id = form.id.value, u = App.par(D.membres, id);
    App.occupe(b, true, 'Enregistrement…');
    try {
      if (form.role) {
        var maj = {};
        if (form.role.value !== u.role) maj.role = form.role.value;
        if (form.statut.value !== u.statut) maj.statut = form.statut.value;
        if (Object.keys(maj).length) await App.q(sb.from('users').update(maj).eq('id', id));
      }
      // La table de liaison « membres_cellule » fait foi (un déclencheur met users.cellule_id à jour)
      var cel = vide(form.cellule_id.value);
      if (cel !== (u.cellule_id || null)) {
        await App.q(sb.from('membres_cellule').delete().eq('user_id', id));
        if (cel) await App.q(sb.from('membres_cellule').insert({ user_id: id, cellule_id: cel, statut: 'actif' }));
      }
      var dep = vide(form.departement_id.value);
      if (dep !== (u.departement_id || null)) {
        await App.q(sb.from('ouvriers').delete().eq('user_id', id));
        if (dep) await App.q(sb.from('ouvriers').insert({ user_id: id, departement_id: dep }));
      }
      App.fermer();
      await rafraichir();
      if (id === (App.etat.profil && App.etat.profil.id)) App.etat.profil = await App.lireProfil();
      App.rechargerEcran();
      App.flash('Modifications enregistrées.');
    } catch (e) { App.erreurFeuille(App.msgErreur(e)); } finally { App.occupe(b, false); }
  };

  /* =========================================================
     DÉPARTEMENTS
     ========================================================= */
  App.ecrans.departements = function () {
    remplir('liste-departements', function (z) {
      if (!D.departements.length) {
        z.innerHTML = App.vide('Aucun département', 'Louange, intercession, accueil, protocole… créez-les ici et nommez un chef.',
          '<div style="margin-top:14px"><button class="btn btn-plein btn-s" data-act="form-departement">Créer un département</button></div>');
        return;
      }
      z.innerHTML = D.departements.map(function (d) {
        var chef = d.chef_id ? App.par(D.membres, d.chef_id) : null;
        var nb = D.ouvriers.filter(function (o) { return o.departement_id === d.id; }).length;
        return '<div class="membre"><div class="mb-haut"><div>' +
          '<div class="mb-nom">' + esc(d.nom) + '</div>' +
          '<div class="mb-detail">' + esc(d.description || 'Pas de description') + '</div>' +
          '</div><span class="etat ' + (chef ? 'actif' : 'en_attente') + '">' + (chef ? 'Chef nommé' : 'Sans chef') + '</span></div>' +
          '<div class="mb-chiffres"><b>' + nb + '</b> ouvrier' + (nb > 1 ? 's' : '') + ' · Chef : <b>' + esc(chef ? App.nomComplet(chef) : 'à nommer') + '</b></div>' +
          '<div class="mb-actions">' +
          '<button class="btn btn-doux btn-s" data-act="form-departement" data-id="' + esc(d.id) + '">Modifier</button>' +
          '<button class="btn btn-rouge btn-s" data-act="suppr-departement" data-id="' + esc(d.id) + '">Supprimer</button>' +
          '</div></div>';
      }).join('');
    });
  };

  var formulaireDepartement = window.formulaireDepartement = function (id) {
    var d = id ? App.par(D.departements, id) : null;
    var candidats = D.membres.filter(function (u) { return u.statut === 'actif'; })
      .map(function (u) { return { id: u.id, nom: App.nomComplet(u) }; });
    App.ouvrir('<h3>' + (d ? 'Modifier le département' : 'Nouveau département') + '</h3>' +
      '<div class="alerte"></div>' +
      '<form data-form="departement"><input type="hidden" name="id" value="' + esc(d ? d.id : '') + '">' +
      champ('nom', 'Nom', d && d.nom, 'text', 'placeholder="Louange" maxlength="80"') +
      champZone('description', 'Description', d && d.description, 'Rôle du département dans l\'église…') +
      champSelect('chef_id', 'Chef de département', candidats, d && d.chef_id, 'Aucun chef',
        'Le chef voit son département et ses ouvriers.') +
      '<div class="duo"><button type="button" class="btn btn-vide" data-conf="0">Annuler</button>' +
      '<button class="btn btn-plein">' + (d ? 'Enregistrer' : 'Créer') + '</button></div></form>');
  };
  App.actions['form-departement'] = function (d) { formulaireDepartement(d.id); };

  App.formulaires.departement = async function (form) {
    var b = form.querySelector('.btn-plein');
    var donnees = { nom: vide(form.nom.value), description: vide(form.description.value), chef_id: vide(form.chef_id.value) };
    if (!donnees.nom) { App.erreurFeuille('Le nom du département est obligatoire.'); return; }
    App.occupe(b, true, 'Enregistrement…');
    try {
      var depId = form.id.value;
      if (depId) await App.q(sb.from('departements').update(donnees).eq('id', depId));
      else depId = (await App.q(sb.from('departements').insert(donnees).select().single())).id;
      if (donnees.chef_id) {
        await App.q(sb.from('ouvriers').upsert({ user_id: donnees.chef_id, departement_id: depId }, { onConflict: 'user_id,departement_id' }));
        var u = App.par(D.membres, donnees.chef_id);
        if (u && u.role === 'membre') await App.q(sb.from('users').update({ role: 'chef_departement' }).eq('id', donnees.chef_id));
      }
      App.fermer();
      await rafraichir();
      App.rechargerEcran();
      App.flash('Département enregistré.');
    } catch (e) { App.erreurFeuille(App.msgErreur(e)); } finally { App.occupe(b, false); }
  };

  App.actions['suppr-departement'] = async function (d) {
    var dep = App.par(D.departements, d.id);
    if (!dep) return;
    var ok = await App.confirmer('Supprimer « ' + dep.nom + ' » ?', "Les ouvriers de ce département n'appartiendront plus à aucun département.", 'Supprimer', true);
    if (!ok) return;
    try {
      await App.q(sb.from('departements').delete().eq('id', dep.id));
      await rafraichir();
      App.rechargerEcran();
      App.flash('Département supprimé.');
    } catch (e) { App.flash(App.msgErreur(e)); }
  };

  /* =========================================================
     FICHES REÇUES
     ========================================================= */
  var rendreFichesAdmin = window.rendreFichesAdmin = function () {
    var z = $('liste-fiches');
    if (!z || !z.dataset.rempli) return;
    var filtre = $('fi-cellule').value;
    var liste = filtre ? D.fiches.filter(function (f) { return f.cellule_id === filtre; }) : D.fiches;
    if (!liste.length) {
      z.innerHTML = App.vide('Aucune fiche', 'Les comptes rendus remplis par les bergers apparaîtront ici.');
      return;
    }
    z.innerHTML = liste.slice(0, 200).map(function (f) {
      var b = App.par(D.membres, f.berger_id);
      return App.htmlFiche(f, { cellule: nomCellule(f.cellule_id) || 'Cellule supprimée', berger: b ? App.nomComplet(b) : null });
    }).join('');
  };
  App.ecrans.fiches = function () {
    remplir('liste-fiches', function () {
      var s = $('fi-cellule'), garde = s.value;
      s.innerHTML = '<option value="">Toutes les cellules</option>' + D.cellules.map(function (c) {
        return '<option value="' + esc(c.id) + '">' + esc(c.nom) + '</option>';
      }).join('');
      s.value = garde;
      rendreFichesAdmin();
    });
  };
})();
