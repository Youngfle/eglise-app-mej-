/* ==========================================================
   VIE DE L'ÉGLISE (V2 et V3)
   · Programmes et calendrier des séances
   · Cultes du dimanche
   · Finances (francs CFA)
   · Messages du pasteur
   Lecture pour les membres actifs ; écriture réservée par les règles RLS
   (administrateur, et comptable pour les finances et les dimanches).
   ========================================================== */
(function () {
  'use strict';

  var App = window.App, sb = App.sb, $ = App.$, esc = App.esc;
  var champ = App.champ, champZone = App.champZone, champSelect = App.champSelect, vide = App.vider;

  function estAdmin() { return App.etat.role === 'super_admin'; }
  function estComptable() { return App.etat.role === 'super_admin' || App.etat.role === 'comptable'; }

  /* Listes cellules/départements pour les formulaires de l'administrateur */
  async function listesCibles() {
    var D = App.donnees;
    if (!D.cellules.length && !D.departements.length) { try { await App.chargerAdmin(); } catch (e) { /* rien */ } }
    return D;
  }

  /* =========================================================
     PROGRAMMES
     ========================================================= */
  var programmes = [], seances = [], filtreProg = 'avenir';

  function dateFin(p) { return new Date(p.date_fin || p.date_debut || 0).getTime(); }
  function estPasse(p) { return p.date_debut ? dateFin(p) < Date.now() - 6 * 3600e3 : false; }

  window.filtrerProgrammes = function (bouton, valeur) {
    filtreProg = valeur;
    $('filtres-programmes').querySelectorAll('button').forEach(function (b) { b.classList.toggle('on', b === bouton); });
    rendreProgrammes();
  };

  function htmlDatePastille(iso) {
    if (!iso) return '<span class="date"><span class="j">?</span><span class="m">date</span></span>';
    var d = new Date(iso);
    return '<span class="date"><span class="j">' + d.getDate() + '</span><span class="m">' +
      esc(d.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '')) + '</span></span>';
  }

  function rendreProgrammes() {
    var z = $('liste-programmes');
    var liste = programmes.filter(function (p) {
      if (filtreProg === 'avenir') return !estPasse(p);
      if (filtreProg === 'passe') return estPasse(p);
      return true;
    });
    if (!liste.length) {
      z.innerHTML = App.vide('Aucun programme',
        filtreProg === 'avenir' ? "Aucune activité prévue pour le moment." : "Rien à afficher ici.",
        estAdmin() ? '<div style="margin-top:14px"><button class="btn btn-plein btn-s" data-act="form-programme">Créer un programme</button></div>' : '');
      return;
    }
    z.innerHTML = liste.map(function (p) {
      var quand = p.date_debut ? App.fmtDateHeure(p.date_debut) : 'Date à préciser';
      if (p.date_fin && p.date_debut && String(p.date_fin).slice(0, 10) !== String(p.date_debut).slice(0, 10)) quand += ' → ' + App.fmtDateHeure(p.date_fin);
      var nb = seances.filter(function (s) { return s.programme_id === p.id; }).length;
      var cible = p.cellule_id ? 'Réservé à une cellule' : (p.departement_id ? 'Réservé à un département' : "Toute l'église");
      return '<div class="prog' + (estPasse(p) ? ' passe' : '') + '">' + htmlDatePastille(p.date_debut) +
        '<div class="corps"><b>' + esc(p.titre) + '</b><span class="quand">' + esc(quand) + '</span>' +
        (p.theme ? '<p><b>Thème :</b> ' + esc(p.theme) + '</p>' : '') +
        (p.description ? '<p>' + esc(p.description) + '</p>' : '') +
        '<div class="puces-type"><span class="etat or">' + esc(App.TYPES_PROGRAMME[p.type] || 'Autre') + '</span>' +
        '<span class="etat termine">' + esc(cible) + '</span>' +
        (nb ? '<span class="etat en_cours">' + nb + ' séance' + (nb > 1 ? 's' : '') + '</span>' : '') + '</div>' +
        (estAdmin() ? '<div class="mb-actions">' +
          '<button class="btn btn-doux btn-s" data-act="form-programme" data-id="' + esc(p.id) + '">Modifier</button>' +
          '<button class="btn btn-vide btn-s" data-act="seances" data-id="' + esc(p.id) + '">Séances</button>' +
          '<button class="btn btn-rouge btn-s" data-act="suppr-programme" data-id="' + esc(p.id) + '">Supprimer</button></div>' : '') +
        '</div></div>';
    }).join('');
  }

  async function chargerProgrammes() {
    var r = await Promise.all([
      App.lireTout(function () { return sb.from('programmes').select('*').order('date_debut', { ascending: true, nullsFirst: false }); }),
      App.lireTout(function () { return sb.from('calendrier_programmes').select('*').order('date'); })
    ]);
    programmes = r[0]; seances = r[1];
    return programmes;
  }
  App.chargerProgrammes = chargerProgrammes;

  App.ecrans.programmes = async function () {
    var z = $('liste-programmes');
    z.innerHTML = '<p class="chargement">Chargement…</p>';
    try { await chargerProgrammes(); rendreProgrammes(); }
    catch (e) { z.innerHTML = App.htmlErreur(e); }
  };

  var formulaireProgramme = window.formulaireProgramme = async function (id) {
    var p = id ? App.par(programmes, id) : null;
    var D = await listesCibles();
    var cibles = [{ v: '', t: "Toute l'église" }]
      .concat(D.cellules.map(function (c) { return { v: 'c:' + c.id, t: 'Cellule ' + c.nom }; }))
      .concat(D.departements.map(function (d) { return { v: 'd:' + d.id, t: 'Département ' + d.nom }; }));
    var cibleActuelle = p && p.cellule_id ? 'c:' + p.cellule_id : (p && p.departement_id ? 'd:' + p.departement_id : '');
    App.ouvrir('<h3>' + (p ? 'Modifier le programme' : 'Nouveau programme') + '</h3>' +
      '<div class="alerte"></div>' +
      '<form data-form="programme"><input type="hidden" name="id" value="' + esc(p ? p.id : '') + '">' +
      champ('titre', 'Titre', p && p.titre, 'text', 'placeholder="Veillée de prière" maxlength="120"') +
      champSelect('type', 'Type', App.optionsDe(App.TYPES_PROGRAMME), p ? p.type : 'autre', null) +
      champ('theme', 'Thème', p && p.theme, 'text', 'placeholder="La foi qui déplace les montagnes"') +
      '<div class="paire-champ">' +
      champ('date_debut', 'Début', App.isoVersLocal(p && p.date_debut), 'datetime-local') +
      champ('date_fin', 'Fin (facultatif)', App.isoVersLocal(p && p.date_fin), 'datetime-local') + '</div>' +
      champSelect('cible', 'Pour qui ?', cibles, cibleActuelle, null,
        "Un programme réservé n'est visible que par la cellule ou le département choisi.") +
      champZone('description', 'Description', p && p.description, 'Quelques mots sur cette activité…') +
      '<div class="duo"><button type="button" class="btn btn-vide" data-conf="0">Annuler</button>' +
      '<button class="btn btn-plein">' + (p ? 'Enregistrer' : 'Créer') + '</button></div></form>');
  };
  App.actions['form-programme'] = function (d) { formulaireProgramme(d.id); };

  App.formulaires.programme = async function (form) {
    var b = form.querySelector('.btn-plein');
    var cible = form.cible.value;
    var donnees = {
      titre: vide(form.titre.value), type: form.type.value, theme: vide(form.theme.value),
      description: vide(form.description.value),
      date_debut: App.localVersIso(form.date_debut.value),
      date_fin: App.localVersIso(form.date_fin.value),
      cellule_id: cible.indexOf('c:') === 0 ? cible.slice(2) : null,
      departement_id: cible.indexOf('d:') === 0 ? cible.slice(2) : null
    };
    if (!donnees.titre) { App.erreurFeuille('Le titre est obligatoire.'); return; }
    if (donnees.date_fin && donnees.date_debut && donnees.date_fin < donnees.date_debut) {
      App.erreurFeuille("La date de fin doit être après la date de début."); return;
    }
    App.occupe(b, true, 'Enregistrement…');
    try {
      if (form.id.value) await App.q(sb.from('programmes').update(donnees).eq('id', form.id.value));
      else {
        donnees.created_by = App.etat.profil.id;
        await App.q(sb.from('programmes').insert(donnees));
      }
      App.fermer();
      await chargerProgrammes();
      App.rechargerEcran();
      App.flash('Programme enregistré.');
    } catch (e) { App.erreurFeuille(App.msgErreur(e)); } finally { App.occupe(b, false); }
  };

  App.actions['suppr-programme'] = async function (d) {
    var p = App.par(programmes, d.id);
    if (!p) return;
    var ok = await App.confirmer('Supprimer « ' + p.titre + ' » ?', 'Le programme et ses séances seront supprimés.', 'Supprimer', true);
    if (!ok) return;
    try {
      await App.q(sb.from('programmes').delete().eq('id', p.id));
      await chargerProgrammes();
      App.rechargerEcran();
      App.flash('Programme supprimé.');
    } catch (e) { App.flash(App.msgErreur(e)); }
  };

  /* ---------- Séances d'un programme (calendrier_programmes) ---------- */
  App.actions.seances = function (d) { fenetreSeances(d.id); };
  function fenetreSeances(programmeId) {
    var p = App.par(programmes, programmeId);
    if (!p) return;
    var mes = seances.filter(function (s) { return s.programme_id === programmeId; });
    App.ouvrir('<h3>Séances — ' + esc(p.titre) + '</h3>' +
      '<p>Ajoutez les dates de cette activité : elles apparaissent dans le calendrier de tous les membres concernés.</p>' +
      '<div class="alerte"></div>' +
      (mes.length ? mes.map(function (s) {
        return '<div class="mouvement"><div class="corps"><b>' + esc(App.cap(App.fmtDate(s.date, true))) + '</b>' +
          (s.notes ? '<small>' + esc(s.notes) + '</small>' : '') + '</div>' +
          '<span class="etat ' + s.statut + '">' + esc(App.STATUTS_SEANCE[s.statut]) + '</span>' +
          '<button class="btn btn-rouge btn-s" data-act="suppr-seance" data-id="' + esc(s.id) + '" data-prog="' + esc(programmeId) + '">✕</button></div>';
      }).join('') : '<p class="note" style="margin-bottom:14px">Aucune séance enregistrée.</p>') +
      '<form data-form="seance" style="margin-top:14px"><input type="hidden" name="programme_id" value="' + esc(programmeId) + '">' +
      '<div class="paire-champ">' + champ('date', 'Nouvelle date', App.iso(new Date()), 'date') +
      champSelect('statut', 'Statut', App.optionsDe(App.STATUTS_SEANCE), 'prevu', null) + '</div>' +
      champ('notes', 'Note (facultatif)', '', 'text', 'placeholder="Lieu, orateur…"') +
      '<div class="duo"><button type="button" class="btn btn-vide" data-conf="0">Fermer</button>' +
      '<button class="btn btn-plein">Ajouter la séance</button></div></form>');
  }
  App.formulaires.seance = async function (form) {
    var b = form.querySelector('.btn-plein');
    App.occupe(b, true, 'Ajout…');
    try {
      await App.q(sb.from('calendrier_programmes').insert({
        programme_id: form.programme_id.value, date: form.date.value,
        statut: form.statut.value, notes: vide(form.notes.value)
      }));
      await chargerProgrammes();
      fenetreSeances(form.programme_id.value);
      App.rechargerEcran();
      App.flash('Séance ajoutée.');
    } catch (e) { App.erreurFeuille(App.msgErreur(e)); App.occupe(b, false); }
  };
  App.actions['suppr-seance'] = async function (d) {
    try {
      await App.q(sb.from('calendrier_programmes').delete().eq('id', d.id));
      await chargerProgrammes();
      fenetreSeances(d.prog);
      App.rechargerEcran();
    } catch (e) { App.erreurFeuille(App.msgErreur(e)); }
  };

  /* =========================================================
     CALENDRIER
     ========================================================= */
  App.ecrans.calendrier = async function () {
    var z = $('liste-calendrier');
    z.innerHTML = '<p class="chargement">Chargement…</p>';
    try {
      await chargerProgrammes();
      var auj = App.iso(new Date());
      // Les séances déclarées + les programmes qui ont une date mais aucune séance
      var evenements = seances.map(function (s) {
        var p = App.par(programmes, s.programme_id);
        return { date: s.date, titre: p ? p.titre : 'Programme', type: p ? p.type : 'autre', statut: s.statut, notes: s.notes };
      });
      programmes.forEach(function (p) {
        if (p.date_debut && !seances.some(function (s) { return s.programme_id === p.id; })) {
          evenements.push({ date: String(p.date_debut).slice(0, 10), titre: p.titre, type: p.type, statut: 'prevu', heure: p.date_debut });
        }
      });
      var avenir = evenements.filter(function (e) { return e.date >= auj; }).sort(function (a, b) { return a.date < b.date ? -1 : 1; });
      if (!avenir.length) {
        z.innerHTML = App.vide('Calendrier vide', "Aucune date à venir pour l'instant.");
        return;
      }
      var mois = '', html = '';
      avenir.slice(0, 120).forEach(function (e) {
        var d = App.dateDe(e.date);
        var m = d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
        if (m !== mois) { mois = m; html += '<h3 class="section">' + esc(App.cap(m)) + '</h3>'; }
        html += '<div class="prog">' + htmlDatePastille(e.date) +
          '<div class="corps"><b>' + esc(e.titre) + '</b>' +
          '<span class="quand">' + esc(App.cap(App.fmtDate(e.date, true))) + (e.heure ? ' · ' + esc(new Date(e.heure).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }).replace(':', 'h')) : '') + '</span>' +
          (e.notes ? '<p>' + esc(e.notes) + '</p>' : '') +
          '<div class="puces-type"><span class="etat or">' + esc(App.TYPES_PROGRAMME[e.type] || 'Autre') + '</span>' +
          '<span class="etat ' + e.statut + '">' + esc(App.STATUTS_SEANCE[e.statut]) + '</span></div>' +
          '</div></div>';
      });
      z.innerHTML = html;
    } catch (e) { z.innerHTML = App.htmlErreur(e); }
  };

  /* =========================================================
     MESSAGES DU PASTEUR
     ========================================================= */
  var messages = [];
  App.ecrans.messages = async function () {
    var z = $('liste-messages');
    z.innerHTML = '<p class="chargement">Chargement…</p>';
    try {
      messages = await App.lireTout(function () {
        return sb.from('messages_pasteur').select('*').order('date_publication', { ascending: false });
      });
      if (!messages.length) {
        z.innerHTML = App.vide('Aucun message', "Les enseignements et annonces du pasteur s'afficheront ici.",
          estAdmin() ? '<div style="margin-top:14px"><button class="btn btn-plein btn-s" data-act="form-message">Publier un message</button></div>' : '');
        return;
      }
      z.innerHTML = messages.map(htmlMessage).join('');
    } catch (e) { z.innerHTML = App.htmlErreur(e); }
  };

  function htmlMessage(m) {
    var cible = m.cible === 'tous' ? "Toute l'église" : (m.cible === 'cellule' ? 'Une cellule' : 'Un département');
    var futur = new Date(m.date_publication).getTime() > Date.now();
    return '<div class="msg"><h4>' + esc(m.titre) + '</h4>' +
      '<div class="meta">' + esc(App.fmtDateHeure(m.date_publication)) + ' · ' + esc(cible) + (futur ? ' · publication programmée' : '') + '</div>' +
      (m.contenu ? '<div class="texte">' + esc(m.contenu) + '</div>' : '') +
      ((m.lien_video || m.lien_audio) ? '<div class="liens">' +
        (m.lien_video ? '<a href="' + esc(m.lien_video) + '" target="_blank" rel="noopener">▶ Vidéo</a>' : '') +
        (m.lien_audio ? '<a href="' + esc(m.lien_audio) + '" target="_blank" rel="noopener">♪ Audio</a>' : '') + '</div>' : '') +
      (estAdmin() ? '<div class="mb-actions">' +
        '<button class="btn btn-doux btn-s" data-act="form-message" data-id="' + esc(m.id) + '">Modifier</button>' +
        '<button class="btn btn-rouge btn-s" data-act="suppr-message" data-id="' + esc(m.id) + '">Supprimer</button></div>' : '') +
      '</div>';
  }
  App.htmlMessage = htmlMessage;

  var formulaireMessage = window.formulaireMessage = async function (id) {
    var m = id ? App.par(messages, id) : null;
    var D = await listesCibles();
    var cibles = [{ v: '', t: "Toute l'église" }]
      .concat(D.cellules.map(function (c) { return { v: 'c:' + c.id, t: 'Cellule ' + c.nom }; }))
      .concat(D.departements.map(function (d) { return { v: 'd:' + d.id, t: 'Département ' + d.nom }; }));
    var cibleActuelle = m && m.cellule_id ? 'c:' + m.cellule_id : (m && m.departement_id ? 'd:' + m.departement_id : '');
    App.ouvrir('<h3>' + (m ? 'Modifier le message' : 'Publier un message') + '</h3>' +
      '<div class="alerte"></div>' +
      '<form data-form="message"><input type="hidden" name="id" value="' + esc(m ? m.id : '') + '">' +
      champ('titre', 'Titre', m && m.titre, 'text', 'placeholder="Le pouvoir de la prière" maxlength="140"') +
      champZone('contenu', 'Message', m && m.contenu, 'Votre enseignement ou votre annonce…') +
      '<div class="paire-champ">' +
      champ('lien_video', 'Lien vidéo', m && m.lien_video, 'url', 'placeholder="https://…"') +
      champ('lien_audio', 'Lien audio', m && m.lien_audio, 'url', 'placeholder="https://…"') + '</div>' +
      champSelect('cible', 'Destinataires', cibles, cibleActuelle, null) +
      champ('date_publication', 'Publier le', App.isoVersLocal(m ? m.date_publication : new Date().toISOString()), 'datetime-local',
        '') +
      '<div class="duo"><button type="button" class="btn btn-vide" data-conf="0">Annuler</button>' +
      '<button class="btn btn-plein">' + (m ? 'Enregistrer' : 'Publier') + '</button></div></form>');
  };
  App.actions['form-message'] = function (d) { formulaireMessage(d.id); };

  App.formulaires.message = async function (form) {
    var b = form.querySelector('.btn-plein');
    var cible = form.cible.value;
    var donnees = {
      titre: vide(form.titre.value), contenu: vide(form.contenu.value),
      lien_video: vide(form.lien_video.value), lien_audio: vide(form.lien_audio.value),
      cible: cible.indexOf('c:') === 0 ? 'cellule' : (cible.indexOf('d:') === 0 ? 'departement' : 'tous'),
      cellule_id: cible.indexOf('c:') === 0 ? cible.slice(2) : null,
      departement_id: cible.indexOf('d:') === 0 ? cible.slice(2) : null,
      date_publication: App.localVersIso(form.date_publication.value) || new Date().toISOString()
    };
    if (!donnees.titre) { App.erreurFeuille('Le titre est obligatoire.'); return; }
    App.occupe(b, true, 'Publication…');
    try {
      if (form.id.value) await App.q(sb.from('messages_pasteur').update(donnees).eq('id', form.id.value));
      else {
        donnees.auteur_id = App.etat.profil.id;
        await App.q(sb.from('messages_pasteur').insert(donnees));
      }
      App.fermer();
      App.rechargerEcran();
      App.flash('Message enregistré.');
    } catch (e) { App.erreurFeuille(App.msgErreur(e)); } finally { App.occupe(b, false); }
  };

  App.actions['suppr-message'] = async function (d) {
    var ok = await App.confirmer('Supprimer ce message ?', 'Il ne sera plus visible par les membres.', 'Supprimer', true);
    if (!ok) return;
    try {
      await App.q(sb.from('messages_pasteur').delete().eq('id', d.id));
      App.rechargerEcran();
      App.flash('Message supprimé.');
    } catch (e) { App.flash(App.msgErreur(e)); }
  };

  /* =========================================================
     CULTES DU DIMANCHE
     ========================================================= */
  var dimanches = [];
  App.ecrans.dimanche = async function () {
    var z = $('liste-dimanche');
    z.innerHTML = '<p class="chargement">Chargement…</p>';
    try {
      dimanches = await App.lireTout(function () {
        return sb.from('fiches_dimanche').select('*').order('date', { ascending: false });
      });
      var debutMois = App.iso(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
      var duMois = dimanches.filter(function (f) { return f.date >= debutMois; });
      var moyenne = duMois.length ? Math.round(duMois.reduce(function (s, f) { return s + (f.nb_presents || 0); }, 0) / duMois.length) : 0;
      $('di-sommes').innerHTML =
        '<div><span>Cultes ce mois</span><b>' + duMois.length + '</b></div>' +
        '<div><span>Présence moyenne</span><b>' + moyenne + '</b></div>' +
        '<div class="e"><span>Offrandes + dîmes</span><b>' + App.fmtMontant(duMois.reduce(function (s, f) {
          return s + Number(f.offrande_totale || 0) + Number(f.dime_totale || 0);
        }, 0)) + '</b></div>';
      if (!dimanches.length) {
        z.innerHTML = App.vide('Aucune fiche de dimanche', 'Enregistrez le premier culte : présences, offrandes et dîmes.',
          '<div style="margin-top:14px"><button class="btn btn-plein btn-s" data-act="form-dimanche">Nouvelle fiche</button></div>');
        return;
      }
      z.innerHTML = dimanches.map(function (f) {
        return '<div class="membre"><div class="mb-haut"><div>' +
          '<div class="mb-nom">' + esc(App.cap(App.fmtDate(f.date, true))) + '</div>' +
          '<div class="mb-detail">' + esc([f.theme, f.predicateur ? 'Prédicateur : ' + f.predicateur : ''].filter(Boolean).join(' · ') || 'Culte du dimanche') + '</div>' +
          '</div><div style="text-align:right"><div class="total-fiche">' + (f.nb_presents || 0) + '</div>' +
          '<div class="mb-detail" style="margin-top:0">présents</div></div></div>' +
          '<div class="mb-chiffres"><b>' + (f.nb_nouveaux || 0) + '</b> nouveaux · <b>' + (f.nb_absents || 0) + '</b> absents · ' +
          'Offrande <b>' + App.fmtMontant(f.offrande_totale) + '</b> · Dîme <b>' + App.fmtMontant(f.dime_totale) + '</b></div>' +
          (f.remarques ? '<div class="mb-note">' + esc(f.remarques) + '</div>' : '') +
          '<div class="mb-actions">' +
          '<button class="btn btn-doux btn-s" data-act="form-dimanche" data-id="' + esc(f.id) + '">Modifier</button>' +
          (estAdmin() ? '<button class="btn btn-rouge btn-s" data-act="suppr-dimanche" data-id="' + esc(f.id) + '">Supprimer</button>' : '') +
          '</div></div>';
      }).join('');
    } catch (e) { z.innerHTML = App.htmlErreur(e); }
  };

  function dimancheDernier() {
    var d = new Date();
    d.setDate(d.getDate() - ((d.getDay() + 7) % 7));
    return App.iso(d);
  }
  var formulaireDimanche = window.formulaireDimanche = function (id) {
    var f = id ? App.par(dimanches, id) : null;
    App.ouvrir('<h3>' + (f ? 'Modifier la fiche' : 'Culte du dimanche') + '</h3>' +
      '<div class="alerte"></div>' +
      '<form data-form="dimanche"><input type="hidden" name="id" value="' + esc(f ? f.id : '') + '">' +
      champ('date', 'Date du culte', f ? f.date : dimancheDernier(), 'date') +
      champ('theme', 'Thème', f && f.theme, 'text', 'placeholder="La grâce qui relève"') +
      champ('predicateur', 'Prédicateur', f && f.predicateur, 'text', 'placeholder="Pasteur…"') +
      '<div class="paire-champ">' +
      champ('nb_presents', 'Présents', f ? f.nb_presents : 0, 'number', 'min="0" inputmode="numeric"') +
      champ('nb_absents', 'Absents', f ? f.nb_absents : 0, 'number', 'min="0" inputmode="numeric"') + '</div>' +
      champ('nb_nouveaux', 'Nouveaux venus', f ? f.nb_nouveaux : 0, 'number', 'min="0" inputmode="numeric"') +
      '<div class="paire-champ">' +
      champ('offrande_totale', 'Offrande (F)', f ? f.offrande_totale : 0, 'number', 'min="0" step="1" inputmode="numeric"') +
      champ('dime_totale', 'Dîme (F)', f ? f.dime_totale : 0, 'number', 'min="0" step="1" inputmode="numeric"') + '</div>' +
      champZone('remarques', 'Remarques', f && f.remarques, 'Déroulé, invités, difficultés…') +
      '<div class="duo"><button type="button" class="btn btn-vide" data-conf="0">Annuler</button>' +
      '<button class="btn btn-plein">Enregistrer</button></div></form>');
  };
  App.actions['form-dimanche'] = function (d) { formulaireDimanche(d.id); };

  App.formulaires.dimanche = async function (form) {
    var b = form.querySelector('.btn-plein');
    var n = function (c) { return Math.max(0, Number(form[c].value) || 0); };
    if (!form.date.value) { App.erreurFeuille('Indiquez la date du culte.'); return; }
    if (form.date.value > App.iso(new Date())) { App.erreurFeuille('La date ne peut pas être dans le futur.'); return; }
    var donnees = {
      date: form.date.value, theme: vide(form.theme.value), predicateur: vide(form.predicateur.value),
      nb_presents: n('nb_presents'), nb_absents: n('nb_absents'), nb_nouveaux: n('nb_nouveaux'),
      offrande_totale: n('offrande_totale'), dime_totale: n('dime_totale'),
      remarques: vide(form.remarques.value)
    };
    App.occupe(b, true, 'Enregistrement…');
    try {
      if (form.id.value) await App.q(sb.from('fiches_dimanche').update(donnees).eq('id', form.id.value));
      else {
        donnees.rempli_par = App.etat.profil.id;
        await App.q(sb.from('fiches_dimanche').insert(donnees));
      }
      App.fermer();
      App.rechargerEcran();
      App.flash('Fiche du dimanche enregistrée.');
    } catch (e) {
      App.erreurFeuille(e && e.code === '23505' ? 'Une fiche existe déjà pour ce dimanche : modifiez-la.' : App.msgErreur(e));
    } finally { App.occupe(b, false); }
  };

  App.actions['suppr-dimanche'] = async function (d) {
    var ok = await App.confirmer('Supprimer cette fiche ?', 'Les chiffres de ce dimanche seront perdus.', 'Supprimer', true);
    if (!ok) return;
    try {
      await App.q(sb.from('fiches_dimanche').delete().eq('id', d.id));
      App.rechargerEcran();
      App.flash('Fiche supprimée.');
    } catch (e) { App.flash(App.msgErreur(e)); }
  };

  /* =========================================================
     FINANCES
     ========================================================= */
  var finances = [], filtreFin = 'mois';
  window.filtrerFinances = function (bouton, valeur) {
    filtreFin = valeur;
    $('filtres-finances').querySelectorAll('button').forEach(function (b) { b.classList.toggle('on', b === bouton); });
    rendreFinances();
  };

  function debutPeriode() {
    var d = new Date();
    if (filtreFin === 'mois') return App.iso(new Date(d.getFullYear(), d.getMonth(), 1));
    if (filtreFin === 'annee') return App.iso(new Date(d.getFullYear(), 0, 1));
    return '0001-01-01';
  }

  function rendreFinances() {
    var z = $('liste-finances'), debut = debutPeriode();
    var liste = finances.filter(function (f) { return f.date >= debut; });
    var entrees = liste.filter(function (f) { return f.type === 'entree'; }).reduce(function (s, f) { return s + Number(f.montant); }, 0);
    var sorties = liste.filter(function (f) { return f.type === 'sortie'; }).reduce(function (s, f) { return s + Number(f.montant); }, 0);
    var solde = entrees - sorties;
    $('fn-sommes').innerHTML =
      '<div class="e"><span>Entrées</span><b>' + App.fmtMontant(entrees) + '</b></div>' +
      '<div class="s"><span>Sorties</span><b>' + App.fmtMontant(sorties) + '</b></div>' +
      '<div><span>Solde</span><b style="color:' + (solde < 0 ? '#B12E48' : 'var(--v1)') + '">' + App.fmtMontant(solde) + '</b></div>';
    $('fn-sous').textContent = filtreFin === 'mois' ? 'Ce mois-ci' : (filtreFin === 'annee' ? 'Cette année' : 'Depuis le début');
    if (!liste.length) {
      z.innerHTML = App.vide('Aucun mouvement', 'Enregistrez les entrées (dîmes, offrandes, dons) et les sorties.',
        '<div style="margin-top:14px"><button class="btn btn-plein btn-s" data-act="form-finance">Nouveau mouvement</button></div>');
      return;
    }
    z.innerHTML = liste.map(function (f) {
      var e = f.type === 'entree';
      return '<div class="mouvement"><span class="fl ' + (e ? 'e' : 's') + '">' + (e ? '↓' : '↑') + '</span>' +
        '<div class="corps"><b>' + esc(f.categorie) + '</b><small>' + esc(App.fmtDate(f.date)) +
        (f.description ? ' · ' + esc(f.description) : '') + '</small></div>' +
        '<span class="montant ' + (e ? 'e' : 's') + '">' + (e ? '+' : '−') + ' ' + App.fmtMontant(f.montant) + '</span>' +
        '<button class="btn btn-doux btn-s" data-act="form-finance" data-id="' + esc(f.id) + '">✎</button></div>';
    }).join('');
  }

  App.ecrans.finances = async function () {
    var z = $('liste-finances');
    z.innerHTML = '<p class="chargement">Chargement…</p>';
    try {
      finances = await App.lireTout(function () { return sb.from('finances').select('*').order('date', { ascending: false }); });
      rendreFinances();
    } catch (e) { z.innerHTML = App.htmlErreur(e); }
  };

  var formulaireFinance = window.formulaireFinance = function (id) {
    var f = id ? App.par(finances, id) : null;
    var type = f ? f.type : 'entree';
    var cats = App.CATEGORIES_FINANCE[type].map(function (c) { return { v: c, t: c }; });
    App.ouvrir('<h3>' + (f ? 'Modifier le mouvement' : 'Nouveau mouvement') + '</h3>' +
      '<div class="alerte"></div>' +
      '<form data-form="finance"><input type="hidden" name="id" value="' + esc(f ? f.id : '') + '">' +
      champSelect('type', 'Nature', [{ v: 'entree', t: 'Entrée (dîme, offrande, don…)' }, { v: 'sortie', t: 'Sortie (dépense)' }], type, null) +
      champSelect('categorie', 'Catégorie', cats, f && f.categorie, null) +
      champ('montant', 'Montant (F CFA)', f && f.montant ? Math.round(f.montant) : '', 'number', 'min="1" step="1" inputmode="numeric" placeholder="50000"') +
      champ('date', 'Date', f ? f.date : App.iso(new Date()), 'date') +
      champZone('description', 'Description', f && f.description, 'Précisions éventuelles…') +
      '<div class="duo"><button type="button" class="btn btn-vide" data-conf="0">Annuler</button>' +
      '<button class="btn btn-plein">Enregistrer</button></div>' +
      (f && estAdmin() ? '<button type="button" class="btn btn-rouge" style="margin-top:10px" data-act="suppr-finance" data-id="' + esc(f.id) + '">Supprimer ce mouvement</button>' : '') +
      '</form>');
    // La liste des catégories suit la nature choisie
    var sel = $('x-type');
    sel.addEventListener('change', function () {
      var liste = App.CATEGORIES_FINANCE[sel.value];
      $('x-categorie').innerHTML = liste.map(function (c) { return '<option value="' + esc(c) + '">' + esc(c) + '</option>'; }).join('');
    });
  };
  App.actions['form-finance'] = function (d) { formulaireFinance(d.id); };

  App.formulaires.finance = async function (form) {
    var b = form.querySelector('.btn-plein');
    var montant = Number(form.montant.value);
    if (!(montant > 0)) { App.erreurFeuille('Indiquez un montant supérieur à zéro.'); return; }
    if (!form.date.value) { App.erreurFeuille('Indiquez la date du mouvement.'); return; }
    var donnees = {
      type: form.type.value, categorie: form.categorie.value, montant: montant,
      devise: App.CFG.DEVISE || 'XAF', date: form.date.value, description: vide(form.description.value)
    };
    App.occupe(b, true, 'Enregistrement…');
    try {
      if (form.id.value) await App.q(sb.from('finances').update(donnees).eq('id', form.id.value));
      else {
        donnees.enregistre_par = App.etat.profil.id;
        await App.q(sb.from('finances').insert(donnees));
      }
      App.fermer();
      App.rechargerEcran();
      App.flash('Mouvement enregistré.');
    } catch (e) { App.erreurFeuille(App.msgErreur(e)); } finally { App.occupe(b, false); }
  };

  App.actions['suppr-finance'] = async function (d) {
    var ok = await App.confirmer('Supprimer ce mouvement ?', 'Il disparaîtra définitivement des comptes.', 'Supprimer', true);
    if (!ok) return;
    try {
      await App.q(sb.from('finances').delete().eq('id', d.id));
      App.fermer();
      App.rechargerEcran();
      App.flash('Mouvement supprimé.');
    } catch (e) { App.flash(App.msgErreur(e)); }
  };

  App.estComptable = estComptable;
})();
