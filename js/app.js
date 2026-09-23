/* ==========================================================
   DÉMARRAGE DE L'APPLICATION
   (ce fichier est chargé en dernier : tous les écrans sont prêts)
   ========================================================== */

/* Écran de bienvenue : affiché une seule fois par visite (pas à chaque écran),
   puis mémorisé pour le reste de la session du navigateur. */
(function () {
  var CLE = 'bienvenue_vue_v1';
  var el = document.getElementById('ecran-bienvenue');
  if (!el) return;
  if (sessionStorage.getItem(CLE)) { el.remove(); return; }
  var minuteur = setTimeout(window.fermerEcranBienvenue, 4500);
  window.fermerEcranBienvenue = function () {
    clearTimeout(minuteur);
    try { sessionStorage.setItem(CLE, '1'); } catch (e) { /* sans conséquence */ }
    el.classList.add('sorti');
    setTimeout(function () { el.remove(); }, 550);
  };
})();

window.App.demarrer();
