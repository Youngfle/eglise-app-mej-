/* ==========================================================
   SCÈNES — illustrations d'arrière-plan
   ----------------------------------------------------------
   Vraies photos de l'église (dossier img/) quand elles existent,
   sinon dessins originaux en SVG qui prennent automatiquement les
   couleurs de l'église (variables CSS --v1 / --v2).
   Thèmes : prière, adoration, Bible ouverte, croix à l'aube, colombe,
   et l'horizon de la ville au lever du jour.
   ========================================================== */
(function () {
  'use strict';

  var n = 0;

  /* --- silhouette d'une personne debout ---------------------------------
     x : position, sol : ligne du sol, h : hauteur, bras : 'leve' | 'joint' | 'bas' */
  function personne(x, sol, h, bras) {
    var tete = sol - h * 0.88, rt = h * 0.075;
    var epaule = sol - h * 0.74, hanche = sol - h * 0.42;
    var l = h * 0.115;                                  // demi-largeur du buste
    var p = '<circle cx="' + x + '" cy="' + tete.toFixed(1) + '" r="' + rt.toFixed(1) + '"/>' +
      '<path d="M' + (x - l) + ' ' + epaule.toFixed(1) +
      ' Q' + x + ' ' + (epaule - h * 0.05).toFixed(1) + ' ' + (x + l) + ' ' + epaule.toFixed(1) +
      ' L' + (x + l * 0.85) + ' ' + hanche.toFixed(1) +
      ' L' + (x + l * 0.9) + ' ' + sol + ' L' + (x - l * 0.9) + ' ' + sol +
      ' L' + (x - l * 0.85) + ' ' + hanche.toFixed(1) + ' Z"/>';
    var e = h * 0.055;                                  // épaisseur des bras
    if (bras === 'leve') {
      p += '<path d="M' + (x - l) + ' ' + epaule.toFixed(1) +
        ' Q' + (x - l * 2.3) + ' ' + (epaule - h * 0.22).toFixed(1) + ' ' + (x - l * 1.5) + ' ' + (sol - h * 1.08).toFixed(1) +
        ' l' + e.toFixed(1) + ' ' + (e * 0.6).toFixed(1) +
        ' Q' + (x - l * 1.5) + ' ' + (epaule - h * 0.14).toFixed(1) + ' ' + (x - l * 0.4) + ' ' + (epaule + h * 0.04).toFixed(1) + ' Z"/>';
      p += '<path d="M' + (x + l) + ' ' + epaule.toFixed(1) +
        ' Q' + (x + l * 2.3) + ' ' + (epaule - h * 0.22).toFixed(1) + ' ' + (x + l * 1.5) + ' ' + (sol - h * 1.08).toFixed(1) +
        ' l-' + e.toFixed(1) + ' ' + (e * 0.6).toFixed(1) +
        ' Q' + (x + l * 1.5) + ' ' + (epaule - h * 0.14).toFixed(1) + ' ' + (x + l * 0.4) + ' ' + (epaule + h * 0.04).toFixed(1) + ' Z"/>';
    } else if (bras === 'joint') {
      p += '<path d="M' + (x - l) + ' ' + epaule.toFixed(1) +
        ' Q' + (x - l * 1.7) + ' ' + (epaule + h * 0.12).toFixed(1) + ' ' + x + ' ' + (epaule + h * 0.1).toFixed(1) +
        ' Q' + (x + l * 1.7) + ' ' + (epaule + h * 0.12).toFixed(1) + ' ' + (x + l) + ' ' + epaule.toFixed(1) +
        ' L' + (x + l * 0.7) + ' ' + (epaule + h * 0.05).toFixed(1) +
        ' Q' + x + ' ' + (epaule + h * 0.17).toFixed(1) + ' ' + (x - l * 0.7) + ' ' + (epaule + h * 0.05).toFixed(1) + ' Z"/>';
    } else {
      p += '<path d="M' + (x - l) + ' ' + epaule.toFixed(1) + ' q-' + (l * 0.7) + ' ' + (h * 0.18).toFixed(1) + ' -' + (l * 0.3) + ' ' + (h * 0.34).toFixed(1) +
        ' l' + (e).toFixed(1) + ' 0 q-' + (l * 0.1) + ' -' + (h * 0.18).toFixed(1) + ' ' + (l * 0.6) + ' -' + (h * 0.3).toFixed(1) + ' Z"/>';
      p += '<path d="M' + (x + l) + ' ' + epaule.toFixed(1) + ' q' + (l * 0.7) + ' ' + (h * 0.18).toFixed(1) + ' ' + (l * 0.3) + ' ' + (h * 0.34).toFixed(1) +
        ' l-' + (e).toFixed(1) + ' 0 q' + (l * 0.1) + ' -' + (h * 0.18).toFixed(1) + ' -' + (l * 0.6) + ' -' + (h * 0.3).toFixed(1) + ' Z"/>';
    }
    return p;
  }

  /* --- silhouette agenouillée, mains jointes --- */
  function agenouille(x, sol, h) {
    var tete = sol - h * 0.9, rt = h * 0.085;
    return '<circle cx="' + x + '" cy="' + tete.toFixed(1) + '" r="' + rt.toFixed(1) + '"/>' +
      // buste légèrement penché en avant
      '<path d="M' + (x - h * 0.13) + ' ' + (sol - h * 0.76).toFixed(1) +
      ' Q' + x + ' ' + (sol - h * 0.84).toFixed(1) + ' ' + (x + h * 0.14) + ' ' + (sol - h * 0.74).toFixed(1) +
      ' Q' + (x + h * 0.2) + ' ' + (sol - h * 0.42).toFixed(1) + ' ' + (x + h * 0.1) + ' ' + (sol - h * 0.3).toFixed(1) +
      ' L' + (x - h * 0.16) + ' ' + (sol - h * 0.3).toFixed(1) + ' Z"/>' +
      // jambes repliées
      '<path d="M' + (x - h * 0.18) + ' ' + (sol - h * 0.32).toFixed(1) +
      ' L' + (x + h * 0.14) + ' ' + (sol - h * 0.32).toFixed(1) +
      ' Q' + (x + h * 0.34) + ' ' + (sol - h * 0.3).toFixed(1) + ' ' + (x + h * 0.36) + ' ' + sol +
      ' L' + (x - h * 0.26) + ' ' + sol + ' Q' + (x - h * 0.3) + ' ' + (sol - h * 0.2).toFixed(1) + ' ' + (x - h * 0.18) + ' ' + (sol - h * 0.32).toFixed(1) + ' Z"/>' +
      // mains jointes devant le visage
      '<path d="M' + (x + h * 0.02) + ' ' + (sol - h * 0.74).toFixed(1) +
      ' Q' + (x + h * 0.24) + ' ' + (sol - h * 0.72).toFixed(1) + ' ' + (x + h * 0.2) + ' ' + (sol - h * 0.86).toFixed(1) +
      ' Q' + (x + h * 0.16) + ' ' + (sol - h * 0.94).toFixed(1) + ' ' + (x + h * 0.08) + ' ' + (sol - h * 0.82).toFixed(1) + ' Z"/>';
  }

  function rayons(cx, cy, nb, longueur, largeur, opacite) {
    var s = '';
    for (var i = 0; i < nb; i++) {
      var a = (i / nb) * 360;
      s += '<path d="M' + cx + ' ' + cy + ' l' + (-largeur) + ' ' + (-longueur) + ' l' + (largeur * 2) + ' 0 Z" ' +
        'transform="rotate(' + a.toFixed(1) + ' ' + cx + ' ' + cy + ')" opacity="' + opacite + '"/>';
    }
    return s;
  }

  var SCENES = {
    /* Une personne en prière, à genoux, dans la lumière */
    priere: function (id) {
      return '<g fill="#fff" opacity=".1">' + rayons(840, 150, 16, 420, 16, .5) + '</g>' +
        '<circle cx="840" cy="150" r="78" fill="url(#halo' + id + ')"/>' +
        '<path d="M0 372 Q240 330 470 366 T1200 350 L1200 420 L0 420 Z" fill="rgba(0,0,0,.34)"/>' +
        '<g fill="rgba(0,0,0,.72)">' + agenouille(840, 372, 210) + '</g>';
    },
    /* L'assemblée, mains levées */
    adoration: function (id) {
      var g = '';
      var gens = [[170, 150, 'leve'], [300, 176, 'leve'], [430, 158, 'bas'], [560, 182, 'leve'],
                  [690, 164, 'leve'], [820, 186, 'bas'], [950, 160, 'leve'], [1070, 178, 'leve']];
      gens.forEach(function (p) { g += personne(p[0], 400, p[1], p[2]); });
      return '<circle cx="600" cy="120" r="150" fill="url(#halo' + id + ')"/>' +
        '<g fill="#fff" opacity=".07">' + rayons(600, 120, 12, 460, 22, .6) + '</g>' +
        '<g fill="rgba(0,0,0,.68)">' + g + '</g>' +
        '<path d="M0 400 L1200 400 L1200 420 L0 420 Z" fill="rgba(0,0,0,.4)"/>';
    },
    /* La Bible ouverte, dans un faisceau de lumière */
    bible: function (id) {
      return '<circle cx="600" cy="90" r="160" fill="url(#halo' + id + ')"/>' +
        '<g fill="#fff" opacity=".08"><path d="M600 60 L840 420 L360 420 Z"/></g>' +
        '<g fill="rgba(0,0,0,.7)">' +
        '<path d="M600 250 Q470 214 360 244 L360 372 Q470 344 600 378 Z"/>' +
        '<path d="M600 250 Q730 214 840 244 L840 372 Q730 344 600 378 Z"/>' +
        '<path d="M596 246 h8 v134 h-8 Z"/>' +
        '<path d="M345 240 q-16 6 -16 22 v112 q0 16 16 20 l15 -22 Z"/>' +
        '<path d="M855 240 q16 6 16 22 v112 q0 16 -16 20 l-15 -22 Z"/>' +
        '</g>' +
        '<g stroke="#fff" stroke-width="3" opacity=".16" fill="none">' +
        '<path d="M400 278 h150M400 302 h130M400 326 h150"/>' +
        '<path d="M650 278 h150M650 302 h130M650 326 h150"/></g>';
    },
    /* La croix sur la colline, au lever du jour */
    croix: function (id) {
      return '<circle cx="880" cy="200" r="120" fill="url(#halo' + id + ')"/>' +
        '<g fill="#fff" opacity=".07">' + rayons(880, 200, 14, 400, 18, .6) + '</g>' +
        '<path d="M0 330 Q200 268 420 312 Q640 356 860 300 Q1040 256 1200 292 L1200 420 L0 420 Z" fill="rgba(0,0,0,.36)"/>' +
        '<path d="M0 372 Q300 340 620 366 Q900 388 1200 356 L1200 420 L0 420 Z" fill="rgba(0,0,0,.6)"/>' +
        '<g fill="rgba(0,0,0,.78)">' +
        '<path d="M292 132 h26 v212 h-26 Z"/><path d="M252 186 h106 v24 h-106 Z"/>' +
        '<path d="M196 214 h16 v130 h-16 Z"/><path d="M172 248 h64 v16 h-64 Z"/>' +
        '<path d="M402 214 h16 v130 h-16 Z"/><path d="M378 248 h64 v16 h-64 Z"/>' +
        '</g>' +
        '<g fill="rgba(255,255,255,.3)"><path d="M980 120 q14 -12 28 0 q-14 -5 -28 0 Z"/>' +
        '<path d="M1030 96 q14 -12 28 0 q-14 -5 -28 0 Z"/>' +
        '<path d="M1076 130 q11 -9 22 0 q-11 -4 -22 0 Z"/></g>';
    },
    /* La colombe et le rameau */
    colombe: function (id) {
      return '<circle cx="600" cy="170" r="150" fill="url(#halo' + id + ')"/>' +
        '<g fill="#fff" opacity=".07">' + rayons(600, 170, 18, 400, 14, .55) + '</g>' +
        '<g fill="rgba(255,255,255,.9)">' +
        '<path d="M470 236 q78 -52 166 -34 q42 8 70 -10 q-10 30 -46 44 q-60 24 -128 22 q-40 -2 -62 -22 Z"/>' +
        '<path d="M566 206 q26 -66 96 -84 q-30 40 -22 76 q-32 -8 -74 8 Z"/>' +
        '<path d="M700 192 q22 -6 34 6 q-14 2 -22 12 Z"/>' +
        '<path d="M470 236 q-40 22 -70 18 q30 16 66 8 Z"/>' +
        '</g>' +
        '<g fill="rgba(0,0,0,.35)"><path d="M0 386 L1200 386 L1200 420 L0 420 Z"/></g>';
    },
    /* L'horizon de la ville au lever du jour */
    ville: function (id) {
      var b = '';
      var imm = [[60, 120], [120, 80], [180, 160], [250, 110], [320, 190], [400, 140], [470, 100],
                 [540, 170], [620, 130], [700, 200], [790, 150], [870, 110], [940, 170], [1020, 130], [1100, 90]];
      imm.forEach(function (p, i) {
        var larg = 44 + (i % 3) * 14;
        b += '<rect x="' + p[0] + '" y="' + (380 - p[1]) + '" width="' + larg + '" height="' + p[1] + '" rx="3"/>';
      });
      // palmiers
      var pal = '';
      [[80, 380, 70], [1130, 380, 84]].forEach(function (p) {
        pal += '<path d="M' + p[0] + ' ' + p[1] + ' q6 -' + p[2] * 0.6 + ' 2 -' + p[2] + ' l8 0 q6 ' + p[2] * 0.4 + ' 6 ' + p[2] + ' Z"/>';
        for (var k = 0; k < 5; k++) {
          var dx = (k - 2) * 26 || 4, x0 = p[0] + 4, y0 = p[1] - p[2] - 6;
          pal += '<path d="M' + x0 + ' ' + y0 +
            ' q' + dx.toFixed(1) + ' -22 ' + (dx * 1.5).toFixed(1) + ' 10' +
            ' q' + (-dx * 0.6).toFixed(1) + ' -12 ' + (-dx * 0.5).toFixed(1) + ' -4 Z"/>';
        }
      });
      return '<circle cx="600" cy="300" r="170" fill="url(#halo' + id + ')"/>' +
        '<g fill="rgba(0,0,0,.55)">' + b + '</g>' +
        '<path d="M0 378 L1200 378 L1200 420 L0 420 Z" fill="rgba(0,0,0,.66)"/>' +
        '<g fill="rgba(0,0,0,.78)">' + pal + '</g>';
    }
  };

  /* --------------------------------------------------------
     VRAIES PHOTOS (envoyées par l'église)
     Quand une photo existe pour un thème ou un écran précis,
     elle remplace le dessin SVG. Sinon, le dessin reste utilisé :
     aucune photo n'est obligatoire.
     -------------------------------------------------------- */
  var PHOTOS_THEME = {
    priere: 'img/priere.jpg',
    croix: 'img/croix.jpg',
    adoration: 'img/adoration.jpg',
    bible: 'img/bible.jpg',
    colombe: 'img/colombe.jpg',
    ville: 'img/ville.jpg'
  };
  var PHOTOS_ECRAN = {
    discussions: 'img/discussions.jpg'
  };
  /* Point d'intérêt de chaque photo (les visages) : c'est lui qui reste visible
     quand la photo est recadrée dans un bandeau large ou étroit.
     Pour une nouvelle photo, indiquez « horizontal% vertical% » (0% 0% = en haut à gauche). */
  var CADRAGE = {
    'img/priere.jpg': '42% 38%',
    'img/croix.jpg': '50% 35%',
    'img/adoration.jpg': '50% 18%',
    'img/bible.jpg': '50% 20%',
    'img/colombe.jpg': '42% 18%',
    'img/ville.jpg': '46% 24%',
    'img/discussions.jpg': '55% 26%'
  };
  function imageScene(src) {
    return '<img class="scene photo" src="' + src + '" alt="" decoding="async" style="object-position:' + (CADRAGE[src] || '50% 30%') + '">';
  }

  /* Renvoie le SVG complet d'une scène, prêt à être inséré */
  function scene(nom, ancrage) {
    var id = 's' + (++n);
    var contenu = (SCENES[nom] || SCENES.adoration)(id);
    return '<svg class="scene" viewBox="0 0 1200 420" preserveAspectRatio="' +
      (ancrage === 'bas' ? 'xMidYMax' : 'xMidYMid') + ' slice" aria-hidden="true" focusable="false">' +
      '<defs>' +
      '<linearGradient id="ciel' + id + '" x1="0" y1="0" x2="0.4" y2="1">' +
      '<stop offset="0" stop-color="var(--v-encre)"/><stop offset="55%" stop-color="var(--v1)"/><stop offset="100%" stop-color="var(--v2)"/>' +
      '</linearGradient>' +
      '<radialGradient id="halo' + id + '"><stop offset="0" stop-color="#FFF6DC" stop-opacity=".92"/>' +
      '<stop offset="45%" stop-color="#FFE9A8" stop-opacity=".35"/><stop offset="100%" stop-color="#FFE9A8" stop-opacity="0"/></radialGradient>' +
      '</defs>' +
      '<rect width="1200" height="420" fill="url(#ciel' + id + ')"/>' +
      contenu +
      '</svg>';
  }

  /* Scène choisie automatiquement selon l'écran */
  var PAR_ECRAN = {
    accueil: 'adoration', bienvenue: 'priere', inscription: 'colombe', connexion: 'priere',
    attente: 'colombe', tableau: 'ville', cellules: 'adoration', membres: 'adoration',
    departements: 'ville', fiches: 'bible', 'ma-cellule': 'adoration', 'fiche-cellule': 'bible',
    'mes-fiches': 'bible', 'mon-departement': 'ville', programmes: 'croix', calendrier: 'croix',
    messages: 'bible', discussions: 'colombe', dimanche: 'croix', finances: 'ville',
    apparence: 'colombe', plus: 'ville', 'mon-profil': 'priere', guide: 'bible'
  };

  function choisie() {
    try {
      var a = window.Marque && window.Marque.get().ambiance;
      return a && a !== 'auto' && SCENES[a] ? a : null;
    } catch (e) { return null; }
  }

  window.Scenes = {
    svg: scene,
    liste: ['priere', 'adoration', 'bible', 'croix', 'colombe', 'ville'],
    titres: { priere: 'Prière', adoration: 'Adoration', bible: 'La Parole', croix: 'La croix', colombe: 'La colombe', ville: 'La ville' },
    pourEcran: function (id, ancrage) {
      if (PHOTOS_ECRAN[id]) return imageScene(PHOTOS_ECRAN[id]);
      var nomScene = choisie() || PAR_ECRAN[id] || 'adoration';
      if (PHOTOS_THEME[nomScene]) return imageScene(PHOTOS_THEME[nomScene]);
      return scene(nomScene, ancrage);
    },
    nomPourEcran: function (id) { return choisie() || PAR_ECRAN[id] || 'adoration'; }
  };
})();
