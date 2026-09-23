/* ==========================================================
   MARQUE : nom, logo, icône et couleurs de l'application
   ----------------------------------------------------------
   - Le nom et le logo choisis par l'administrateur (écran « Apparence »)
     sont enregistrés dans Supabase (table parametres_application + bucket « branding »).
   - Ce fichier les applique partout :
       * dans l'application (logo + nom sur chaque écran)
       * sur l'onglet du navigateur (titre + favicon)
       * sur le téléphone (icône d'écran d'accueil + nom sous l'icône)
       * dans les couleurs (extraites automatiquement du logo)
   - Les dernières valeurs sont gardées en cache local pour un affichage
     immédiat, sans clignotement, au chargement suivant.
   ========================================================== */
(function () {
  'use strict';

  var CFG = window.EGLISE_CONFIG;
  var CLE_CACHE = 'marque_eglise_v1';
  var BASE_STOCKAGE = CFG.SUPABASE_URL + '/storage/v1/object/public/branding/';
  var LOGO_LOCAL = 'img/logo.png';   // logo de secours, affiché tant qu'aucun logo n'est enregistré
  var DEFAUT = {
    nom: CFG.NOM_PAR_DEFAUT,
    sous_titre: CFG.SOUS_TITRE_PAR_DEFAUT,
    logo_url: null,
    couleur_principale: CFG.COULEUR_1,
    couleur_secondaire: CFG.COULEUR_2,
    ambiance: 'auto',
    updated_at: null
  };

  var marque = Object.assign({}, DEFAUT);
  var urlManifeste = null;

  /* ---------------------------------------------------------
     COULEURS
     --------------------------------------------------------- */
  function hexVersRgb(h) {
    h = String(h).replace('#', '');
    return [0, 2, 4].map(function (i) { return parseInt(h.substr(i, 2), 16) || 0; });
  }
  function rgbVersHex(r, g, b) {
    return '#' + [r, g, b].map(function (v) {
      return Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
    }).join('');
  }
  function rgbVersHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b), h = 0, s = 0, l = (max + min) / 2, d = max - min;
    if (d) {
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60;
    }
    return [h, s, l];
  }
  function hslVersRgb(h, s, l) {
    h = (((h % 360) + 360) % 360) / 360;
    if (!s) { var v = l * 255; return [v, v, v]; }
    var q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
    function f(t) {
      if (t < 0) t += 1; if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    }
    return [f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255];
  }
  function luminance(r, g, b) {
    var a = [r, g, b].map(function (v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
  }
  function contrasteAvecBlanc(hex) {
    var c = hexVersRgb(hex);
    return 1.05 / (luminance(c[0], c[1], c[2]) + 0.05);
  }
  /* Assombrit la couleur jusqu'à ce que le texte blanc reste lisible dessus */
  function assombrirPourBlanc(hex, minimum) {
    var hsl = rgbVersHsl.apply(null, hexVersRgb(hex)), h = hsl[0], s = hsl[1], l = hsl[2], n = 0;
    var c = hex;
    while (contrasteAvecBlanc(c) < minimum && l > 0.05 && n++ < 80) {
      l -= 0.012;
      c = rgbVersHex.apply(null, hslVersRgb(h, s, l));
    }
    return c;
  }
  function melangerAvecBlanc(hex, part) {
    var c = hexVersRgb(hex);
    return rgbVersHex(c[0] + (255 - c[0]) * part, c[1] + (255 - c[1]) * part, c[2] + (255 - c[2]) * part);
  }
  function eclaircir(hex, delta) {
    var hsl = rgbVersHsl.apply(null, hexVersRgb(hex));
    return rgbVersHex.apply(null, hslVersRgb(hsl[0], hsl[1], Math.min(0.9, hsl[2] + delta)));
  }
  function couleurValide(c) { return /^#[0-9a-f]{6}$/i.test(c || ''); }

  /* Palette complète de l'application à partir des 2 couleurs du logo */
  function palette(principale, secondaire) {
    var c1 = assombrirPourBlanc(couleurValide(principale) ? principale : CFG.COULEUR_1, 4.5);
    var c2 = couleurValide(secondaire) ? assombrirPourBlanc(secondaire, 3.2) : eclaircir(c1, 0.1);
    var c3 = melangerAvecBlanc(c2, 0.28);
    return { c1: c1, c2: c2, c3: c3 };
  }

  function appliquerCouleurs(principale, secondaire) {
    var p = palette(principale, secondaire), st = document.documentElement.style;
    st.setProperty('--v1', p.c1);
    st.setProperty('--v2', p.c2);
    st.setProperty('--v3', p.c3);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', p.c1);
    return p;
  }

  /* Extrait les 2 couleurs dominantes d'une image (logo) */
  function extraireCouleurs(img) {
    var N = 72, cv = document.createElement('canvas');
    cv.width = cv.height = N;
    var ctx = cv.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, N, N);
    var d = ctx.getImageData(0, 0, N, N).data;
    var NB = 12, cases = [], i;
    for (i = 0; i < NB; i++) cases.push({ poids: 0, r: 0, g: 0, b: 0 });
    var opaques = 0, sombres = 0;
    for (i = 0; i < d.length; i += 4) {
      if (d[i + 3] < 200) continue;
      opaques++;
      var r = d[i], g = d[i + 1], b = d[i + 2], hsl = rgbVersHsl(r, g, b);
      if (hsl[2] > 0.93) continue;                       // blanc
      if (hsl[2] < 0.1) { sombres++; continue; }         // noir
      if (hsl[1] < 0.22) continue;                       // gris
      var w = hsl[1] * (1 - Math.abs(hsl[2] - 0.5));     // favorise les couleurs vives
      var k = Math.floor(hsl[0] / (360 / NB)) % NB;
      cases[k].poids += w; cases[k].r += r * w; cases[k].g += g * w; cases[k].b += b * w;
    }
    var utiles = cases.filter(function (c) { return c.poids > 0; }).sort(function (a, b) { return b.poids - a.poids; });
    if (!utiles.length) {
      // Logo noir/gris/blanc : couleur neutre sobre
      return { principale: sombres > opaques * 0.05 ? '#1F2A44' : CFG.COULEUR_1, secondaire: null, neutre: true };
    }
    function hex(c) { return rgbVersHex(c.r / c.poids, c.g / c.poids, c.b / c.poids); }
    function teinte(c) { return rgbVersHsl(c.r / c.poids, c.g / c.poids, c.b / c.poids)[0]; }
    var premiere = utiles[0], hp = teinte(premiere);
    var autre = null;
    for (i = 1; i < utiles.length; i++) {
      var dh = Math.abs(teinte(utiles[i]) - hp);
      if (Math.min(dh, 360 - dh) >= 45 && utiles[i].poids >= premiere.poids * 0.12) { autre = utiles[i]; break; }
    }
    return { principale: hex(premiere), secondaire: autre ? hex(autre) : null, neutre: false };
  }

  /* ---------------------------------------------------------
     IMAGES ET ICÔNES
     --------------------------------------------------------- */
  function chargerImage(src) {
    return new Promise(function (ok, ko) {
      var img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = function () { ok(img); };
      img.onerror = function () { ko(new Error('Image illisible')); };
      img.src = src;
    });
  }
  function versBlob(canvas) {
    return new Promise(function (ok, ko) {
      canvas.toBlob(function (b) { b ? ok(b) : ko(new Error('Export impossible')); }, 'image/png');
    });
  }
  function tailleImage(img) {
    return { w: img.naturalWidth || img.width || 512, h: img.naturalHeight || img.height || 512 };
  }
  /* Logo redimensionné (PNG, transparence conservée) */
  function dessinerLogo(img, cote) {
    var t = tailleImage(img), r = Math.min(cote / t.w, cote / t.h, 1);
    var w = Math.max(1, Math.round(t.w * r)), h = Math.max(1, Math.round(t.h * r));
    var cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    cv.getContext('2d').drawImage(img, 0, 0, w, h);
    return cv;
  }
  /* Le logo est-il clair (ex. blanc sur transparent) ? Alors l'icône aura un fond de couleur */
  function logoEstClair(img) {
    var cv = document.createElement('canvas');
    cv.width = cv.height = 48;
    var ctx = cv.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, 48, 48);
    var d = ctx.getImageData(0, 0, 48, 48).data, somme = 0, n = 0;
    for (var i = 0; i < d.length; i += 4) {
      if (d[i + 3] < 200) continue;
      somme += luminance(d[i], d[i + 1], d[i + 2]); n++;
    }
    return n > 0 && somme / n > 0.72;
  }
  /* Icône carrée pleine (les téléphones arrondissent eux-mêmes les coins) */
  function dessinerIcone(img, taille, marge, fond) {
    var cv = document.createElement('canvas');
    cv.width = cv.height = taille;
    var ctx = cv.getContext('2d');
    ctx.fillStyle = fond;
    ctx.fillRect(0, 0, taille, taille);
    var t = tailleImage(img), zone = taille * (1 - 2 * marge), r = Math.min(zone / t.w, zone / t.h);
    var w = t.w * r, h = t.h * r;
    ctx.drawImage(img, (taille - w) / 2, (taille - h) / 2, w, h);
    return cv;
  }
  /* Icône « monogramme » quand il n'y a pas de logo : initiale sur dégradé aux couleurs de l'application */
  function initiale(nom) {
    var m = String(nom || '').trim().match(/[A-Za-zÀ-ÿ0-9]/);
    return (m ? m[0] : 'É').toUpperCase();
  }
  function dessinerMonogramme(taille) {
    var p = palette(marque.couleur_principale, marque.couleur_secondaire);
    var cv = document.createElement('canvas');
    cv.width = cv.height = taille;
    var ctx = cv.getContext('2d');
    var g = ctx.createLinearGradient(0, 0, taille, taille);
    g.addColorStop(0, p.c1); g.addColorStop(1, p.c2);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, taille, taille);
    ctx.fillStyle = '#fff';
    ctx.font = '800 ' + Math.round(taille * 0.52) + 'px Montserrat, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(initiale(marque.nom), taille / 2, taille * 0.5 + taille * 0.2);
    return cv;
  }

  /* Prépare tous les fichiers à envoyer à partir du logo choisi par l'administrateur */
  async function preparerFichiers(imgLogo, couleurFond) {
    var fond = logoEstClair(imgLogo) ? couleurFond : '#ffffff';
    var cote = 1024, blobLogo;
    for (var essai = 0; essai < 4; essai++) {
      blobLogo = await versBlob(dessinerLogo(imgLogo, cote));
      if (blobLogo.size <= 1.8 * 1024 * 1024) break;
      cote = Math.round(cote * 0.7);
    }
    return {
      'logo.png': blobLogo,
      'icon-192.png': await versBlob(dessinerIcone(imgLogo, 192, 0.1, fond)),
      'icon-512.png': await versBlob(dessinerIcone(imgLogo, 512, 0.1, fond)),
      'icon-maskable-512.png': await versBlob(dessinerIcone(imgLogo, 512, 0.22, fond)),
      'apple-touch-icon.png': await versBlob(dessinerIcone(imgLogo, 180, 0.1, fond))
    };
  }

  /* Version très légère du logo, à enregistrer dans la base si le stockage refuse */
  function logoCompact(img) {
    var cv = dessinerLogo(img, 256);
    try { return cv.toDataURL('image/png'); } catch (e) { return null; }
  }

  /* ---------------------------------------------------------
     APPLICATION DE LA MARQUE À LA PAGE
     --------------------------------------------------------- */
  function versionUrl() {
    return marque.updated_at ? '?v=' + encodeURIComponent(marque.updated_at) : '';
  }
  function urlLogo() {
    return marque.logo_url ? marque.logo_url + versionUrl() : LOGO_LOCAL;
  }
  function echapperAttr(s) {
    return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }
  /* Remplit une tuile logo : image si logo, sinon initiale */
  function remplirTuile(el, logo, nom) {
    if (!el) return;
    el.classList.add('logo-tuile');
    el.classList.toggle('avec-image', !!logo);
    el.innerHTML = logo ? '<img alt="" src="' + echapperAttr(logo) + '">' : echapperAttr(initiale(nom));
  }
  function nomCourt(nom) {
    nom = String(nom || '').trim();
    if (nom.length <= 12) return nom;
    var mot = nom.split(/\s+/)[0];
    return (mot.length >= 3 ? mot : nom).slice(0, 12);
  }

  function majLien(rel, href, type) {
    var el = document.querySelector('link[rel="' + rel + '"]');
    if (!el) { el = document.createElement('link'); el.rel = rel; document.head.appendChild(el); }
    if (type) el.type = type;
    el.href = href;
  }
  function majMeta(nom, contenu) {
    var el = document.querySelector('meta[name="' + nom + '"]');
    if (!el) { el = document.createElement('meta'); el.name = nom; document.head.appendChild(el); }
    el.setAttribute('content', contenu);
  }

  function appliquerIconesEtManifeste(p) {
    var v = versionUrl(), i192, i512, iMask, apple, fav;
    var dansStockage = !!marque.logo_url && marque.logo_url.indexOf(BASE_STOCKAGE) === 0;
    if (dansStockage) {
      i192 = BASE_STOCKAGE + 'icon-192.png' + v;
      i512 = BASE_STOCKAGE + 'icon-512.png' + v;
      iMask = BASE_STOCKAGE + 'icon-maskable-512.png' + v;
      apple = BASE_STOCKAGE + 'apple-touch-icon.png' + v;
      fav = i192;
    } else if (marque.logo_url) {
      // logo enregistré directement dans la base : il sert aussi d'icône
      i192 = i512 = iMask = apple = fav = marque.logo_url;
    } else {
      // aucun logo enregistré dans Supabase : on garde le logo de secours
      i192 = i512 = iMask = apple = fav = LOGO_LOCAL;
    }
    majLien('icon', fav, 'image/png');
    majLien('apple-touch-icon', apple);

    var racine = new URL('./', location.href).href;
    var manifeste = {
      name: marque.nom,
      short_name: nomCourt(marque.nom),
      description: 'Application de gestion — ' + marque.nom,
      start_url: racine,
      scope: racine,
      display: 'standalone',
      orientation: 'portrait',
      lang: 'fr',
      background_color: '#ffffff',
      theme_color: p.c1,
      icons: [
        { src: i192, sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: i512, sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: iMask, sizes: '512x512', type: 'image/png', purpose: 'maskable' }
      ]
    };
    try {
      var blob = new Blob([JSON.stringify(manifeste)], { type: 'application/manifest+json' });
      var ancien = urlManifeste;
      urlManifeste = URL.createObjectURL(blob);
      majLien('manifest', urlManifeste);
      if (ancien) URL.revokeObjectURL(ancien);
    } catch (e) { /* le manifeste statique reste en place */ }
  }

  function appliquerTexteEtLogos() {
    var logo = urlLogo();
    document.querySelectorAll('[data-logo]').forEach(function (el) { remplirTuile(el, logo, marque.nom); });
    document.querySelectorAll('[data-nom]').forEach(function (el) { el.textContent = marque.nom; });
    document.querySelectorAll('[data-sous-titre]').forEach(function (el) {
      el.textContent = (marque.sous_titre || '').trim() || CFG.SOUS_TITRE_PAR_DEFAUT;
    });
  }

  function appliquer() {
    var p = appliquerCouleurs(marque.couleur_principale, marque.couleur_secondaire);
    document.title = marque.nom;
    majMeta('application-name', marque.nom);
    majMeta('apple-mobile-web-app-title', nomCourt(marque.nom));
    if (document.body) {
      appliquerTexteEtLogos();
      appliquerIconesEtManifeste(p);
    }
    return p;
  }

  function sauverCache() {
    try { localStorage.setItem(CLE_CACHE, JSON.stringify(marque)); } catch (e) { /* stockage indisponible : sans conséquence */ }
  }
  function lireCache() {
    try {
      var c = JSON.parse(localStorage.getItem(CLE_CACHE) || 'null');
      if (c && typeof c.nom === 'string') marque = Object.assign({}, DEFAUT, c);
    } catch (e) { /* cache illisible : on ignore */ }
  }

  /* Lit la marque officielle dans Supabase (lecture publique, même sans compte) */
  async function charger(sb) {
    try {
      var r = await sb.from('parametres_application').select('*').maybeSingle();
      if (r.data) {
        marque = Object.assign({}, DEFAUT, r.data);
        sauverCache();
        appliquer();
      }
    } catch (e) { /* hors ligne : on garde le cache */ }
    return marque;
  }

  /* Enregistre la marque (super admin). options : { nom, sous_titre, couleur_principale, couleur_secondaire,
       fichiers (résultat de preparerFichiers) | null, retirerLogo (bool) } */
  async function enregistrer(sb, o) {
    var maj = {
      nom: o.nom,
      sous_titre: o.sous_titre || null,
      couleur_principale: o.couleur_principale,
      couleur_secondaire: o.couleur_secondaire
    };
    if (o.ambiance) maj.ambiance = o.ambiance;
    var depot = sb.storage.from('branding');
    if (o.fichiers) {
      var noms = Object.keys(o.fichiers), echec = null;
      for (var i = 0; i < noms.length; i++) {
        var res = await depot.upload(noms[i], o.fichiers[noms[i]], { upsert: true, contentType: 'image/png', cacheControl: '300' });
        if (res.error) { echec = res.error; break; }
      }
      if (!echec) {
        maj.logo_url = BASE_STOCKAGE + 'logo.png';
      } else if (o.logoDeSecours) {
        // Le stockage a refusé l'envoi : on garde quand même le logo, enregistré
        // directement dans la base sous forme d'image réduite. L'application
        // fonctionne normalement ; seule l'icône du téléphone sera un peu moins fine.
        console.warn('Stockage indisponible, logo enregistré dans la base :', echec.message);
        maj.logo_url = o.logoDeSecours;
        marque.secours = echec.message;
      } else {
        throw new Error("Envoi du logo impossible : " + echec.message);
      }
    } else if (o.retirerLogo) {
      await depot.remove(['logo.png', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'apple-touch-icon.png']);
      maj.logo_url = null;
    }
    var r = await sb.from('parametres_application').update(maj).eq('id', true).select().single();
    if (r.error) throw new Error('Enregistrement impossible : ' + r.error.message);
    marque = Object.assign({}, DEFAUT, r.data);
    sauverCache();
    appliquer();
    return marque;
  }

  /* ---------------------------------------------------------
     DÉMARRAGE : cache immédiat, puis DOM, puis serveur
     --------------------------------------------------------- */
  lireCache();
  appliquerCouleurs(marque.couleur_principale, marque.couleur_secondaire);
  document.title = marque.nom;
  document.addEventListener('DOMContentLoaded', function () { appliquer(); });

  window.Marque = {
    get: function () { return marque; },
    charger: charger,
    enregistrer: enregistrer,
    appliquer: appliquer,
    palette: palette,
    extraireCouleurs: extraireCouleurs,
    chargerImage: chargerImage,
    preparerFichiers: preparerFichiers,
    logoCompact: logoCompact,
    remplirTuile: remplirTuile,
    urlLogo: urlLogo,
    initiale: initiale,
    nomCourt: nomCourt,
    couleurValide: couleurValide,
    BASE_STOCKAGE: BASE_STOCKAGE,
    DEFAUT: DEFAUT
  };
})();
