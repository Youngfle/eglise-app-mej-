/* ==========================================================
   ÉCRAN APPARENCE (super admin)
   Le nom et le logo choisis ici deviennent :
     - le logo affiché dans l'application,
     - l'icône de l'application (écran d'accueil du téléphone + onglet du navigateur),
     - le nom lisible sous l'icône et dans l'onglet,
     - et les couleurs de l'application, extraites automatiquement du logo.
   ========================================================== */
(function () {
  'use strict';

  var App = window.App, sb = App.sb, $ = App.$, esc = App.esc, M = window.Marque;

  var choix = {
    image: null,        // <img> du logo choisi (nouveau fichier ou logo déjà enregistré)
    nouveau: null,      // données du nouveau fichier (à envoyer)
    retirer: false,     // l'administrateur a demandé le retrait du logo
    ambiance: 'auto'    // illustration d'arrière-plan
  };

  function majPastilleCouleur() {
    $('ap-c1-txt').textContent = $('ap-c1').value.toUpperCase();
    $('ap-c2-txt').textContent = $('ap-c2').value.toUpperCase();
  }

  /* Remplit l'écran à partir de la marque enregistrée */
  App.ecrans.apparence = function () {
    var m = M.get();
    $('ap-nom').value = m.nom || '';
    $('ap-sous').value = m.sous_titre || '';
    $('ap-c1').value = (m.couleur_principale || App.CFG.COULEUR_1).toLowerCase();
    $('ap-c2').value = (m.couleur_secondaire || App.CFG.COULEUR_2).toLowerCase();
    choix.nouveau = null; choix.retirer = false; choix.image = null;
    choix.ambiance = m.ambiance || 'auto';
    dessinerChoixScenes();
    App.erreurEcran('err-apparence', '');
    var url = M.urlLogo();
    if (url) {
      // On recharge l'image pour pouvoir en relire les couleurs si besoin
      M.chargerImage(url).then(function (img) { choix.image = img; }).catch(function () { });
    }
    apercu();
  };

  /* Vignettes des ambiances illustrées */
  function dessinerChoixScenes() {
    var z = $('ap-scenes');
    if (!z || !window.Scenes) return;
    var liste = [{ cle: 'auto', nom: 'Au fil des écrans' }].concat(window.Scenes.liste.map(function (c) {
      return { cle: c, nom: window.Scenes.titres[c] };
    }));
    z.innerHTML = liste.map(function (o) {
      var apercu = window.Scenes.svg(o.cle === 'auto' ? 'adoration' : o.cle);
      return '<button type="button" class="' + (o.cle === choix.ambiance ? 'on' : '') + '" data-act="ambiance" data-cle="' + esc(o.cle) + '">' +
        apercu + '<div class="voile-scene"></div><span>' + esc(o.nom) + '</span></button>';
    }).join('');
  }
  App.actions.ambiance = function (d) {
    choix.ambiance = d.cle;
    dessinerChoixScenes();
  };

  /* Met à jour l'aperçu (et, si couleurs=true, les couleurs de toute l'application) */
  var apercu = window.apercuApparence = function (couleurs) {
    var nom = $('ap-nom').value.trim() || App.CFG.NOM_PAR_DEFAUT;
    var c1 = $('ap-c1').value, c2 = $('ap-c2').value;
    majPastilleCouleur();
    var logo = choix.retirer ? null : (choix.nouveau ? choix.nouveau.apercu : M.urlLogo());

    ['ap-logo-apercu', 'ap-apercu-mini', 'ap-apercu-icone', 'ap-apercu-fav'].forEach(function (id) {
      M.remplirTuile($(id), logo, nom);
    });
    $('ap-apercu-nom').textContent = nom;
    $('ap-apercu-titre').textContent = nom;
    $('ap-apercu-etiquette').textContent = M.nomCourt(nom);
    $('ap-retirer').hidden = !logo;
    $('ap-logo-info').textContent = choix.nouveau
      ? 'Nouveau logo choisi : ' + choix.nouveau.nomFichier + ' (enregistrez pour l\'appliquer).'
      : (logo ? 'Logo actuel de l\'église.' : 'Aucun logo : l\'icône utilise l\'initiale du nom.');

    // Aperçu « en direct » : on applique les couleurs à la page pendant le réglage
    if (couleurs !== false) {
      var p = M.palette(c1, c2), st = document.documentElement.style;
      st.setProperty('--v1', p.c1); st.setProperty('--v2', p.c2); st.setProperty('--v3', p.c3);
    }
  };

  /* Choix d'un fichier logo */
  window.choisirLogo = function (input) {
    var f = input.files && input.files[0];
    input.value = '';
    if (!f) return;
    if (f.size > 6 * 1024 * 1024) { App.erreurEcran('err-apparence', 'Image trop lourde (6 Mo maximum). Choisissez une image plus légère.'); return; }
    App.erreurEcran('err-apparence', '');
    var lecteur = new FileReader();
    lecteur.onload = async function () {
      try {
        var img = await M.chargerImage(lecteur.result);
        choix.image = img;
        choix.nouveau = { apercu: lecteur.result, nomFichier: f.name };
        choix.retirer = false;
        var c = M.extraireCouleurs(img);
        if (!c.neutre) {
          $('ap-c1').value = c.principale.toLowerCase();
          if (c.secondaire) $('ap-c2').value = c.secondaire.toLowerCase();
          else $('ap-c2').value = M.palette(c.principale, null).c2.toLowerCase();
          App.flash('Couleurs reprises du logo.');
        } else {
          App.flash('Logo ajouté. Ses couleurs sont neutres : vous pouvez choisir les couleurs vous-même.');
        }
        apercu();
      } catch (e) {
        App.erreurEcran('err-apparence', "Cette image n'a pas pu être lue. Essayez un fichier PNG ou JPG.");
      }
    };
    lecteur.onerror = function () { App.erreurEcran('err-apparence', 'Lecture du fichier impossible.'); };
    lecteur.readAsDataURL(f);
  };

  window.retirerLogo = function () {
    choix.nouveau = null; choix.image = null; choix.retirer = true;
    apercu();
  };

  window.couleursDuLogo = function () {
    if (!choix.image || choix.retirer) { App.erreurEcran('err-apparence', "Choisissez d'abord un logo."); return; }
    App.erreurEcran('err-apparence', '');
    try {
      var c = M.extraireCouleurs(choix.image);
      $('ap-c1').value = c.principale.toLowerCase();
      $('ap-c2').value = (c.secondaire || M.palette(c.principale, null).c2).toLowerCase();
      apercu();
      App.flash(c.neutre ? 'Ce logo n\'a pas de couleur vive : couleur sobre appliquée.' : 'Couleurs reprises du logo.');
    } catch (e) {
      App.erreurEcran('err-apparence', "Les couleurs du logo n'ont pas pu être lues.");
    }
  };

  window.couleursParDefaut = function () {
    $('ap-c1').value = App.CFG.COULEUR_1.toLowerCase();
    $('ap-c2').value = App.CFG.COULEUR_2.toLowerCase();
    apercu();
  };

  window.enregistrerApparence = async function () {
    var nom = $('ap-nom').value.trim();
    if (nom.length < 1 || nom.length > 60) { App.erreurEcran('err-apparence', 'Le nom doit contenir entre 1 et 60 caractères.'); return; }
    App.erreurEcran('err-apparence', '');
    var b = $('btn-apparence');
    App.occupe(b, true, 'Enregistrement…');
    try {
      var c1 = $('ap-c1').value, c2 = $('ap-c2').value;
      var fichiers = null, secours = null;
      if (choix.nouveau && choix.image) {
        App.occupe(b, true, 'Préparation des icônes…');
        // On fabrique ici, dans le navigateur, le logo et toutes les tailles d'icônes
        fichiers = await M.preparerFichiers(choix.image, M.palette(c1, c2).c1);
        secours = M.logoCompact(choix.image);
        App.occupe(b, true, 'Envoi du logo…');
      }
      var avant = M.get().secours;
      await M.enregistrer(sb, {
        nom: nom,
        sous_titre: $('ap-sous').value.trim(),
        couleur_principale: c1,
        couleur_secondaire: c2,
        ambiance: choix.ambiance,
        fichiers: fichiers,
        logoDeSecours: secours,
        retirerLogo: choix.retirer
      });
      choix.nouveau = null; choix.retirer = false;
      // on redessine les illustrations avec la nouvelle ambiance
      document.querySelectorAll('[data-habille]').forEach(function (el) {
        el.removeAttribute('data-habille');
        el.querySelectorAll(':scope > svg.scene, :scope > .voile-scene, :scope > .titre-ecran').forEach(function (x) { x.remove(); });
      });
      App.habiller(App.ecranCourant());
      apercu();
      if (M.get().secours && M.get().secours !== avant) {
        App.erreurEcran('err-apparence',
          "Logo enregistré. L'espace de stockage a refusé l'envoi des icônes, le logo a donc été gardé directement dans la base : tout s'affiche normalement.", true);
      } else {
        App.flash('Apparence enregistrée.');
      }
    } catch (e) {
      console.error(e);
      App.erreurEcran('err-apparence', App.msgErreur(e));
    } finally { App.occupe(b, false); }
  };

  // Quand on quitte l'écran sans enregistrer, on remet les couleurs officielles
  var allerOriginal = App.aller;
  window.aller = App.aller = function (id, mode) {
    var avant = document.querySelector('.ecran.on');
    if (avant && avant.id === 'e-apparence' && id !== 'apparence') {
      var m = M.get();
      var p = M.palette(m.couleur_principale, m.couleur_secondaire), st = document.documentElement.style;
      st.setProperty('--v1', p.c1); st.setProperty('--v2', p.c2); st.setProperty('--v3', p.c3);
      M.remplirTuile($('ap-logo-apercu'), M.urlLogo(), m.nom);
    }
    return allerOriginal(id, mode);
  };
})();
