/* ==========================================================
   CONFIGURATION DE L'APPLICATION
   Ces valeurs sont PUBLIQUES par conception : la sécurité est assurée
   par les règles (RLS) de la base de données Supabase, pas par le secret
   de cette clé. Ne mettez JAMAIS ici une clé « service_role ».
   ========================================================== */
window.EGLISE_CONFIG = {
  SUPABASE_URL: 'https://mgogadvfeysbyqnzzvpw.supabase.co',
  SUPABASE_KEY: 'sb_publishable_MYCOa8C8dWY7e5zHcNifeg_zxVOndOL',

  // Valeurs affichées tant que l'administrateur n'a pas choisi le nom/logo/couleurs dans « Apparence »
  NOM_PAR_DEFAUT: 'MEJ',
  SOUS_TITRE_PAR_DEFAUT: "Ministère d'Évangélisation Jubilé",
  COULEUR_1: '#4A3B85',   // la couleur de l'église (reprise du logo MEJ)
  COULEUR_2: '#7A64C4',   // sa nuance claire
  DEVISE: 'XAF',

  // On s'inscrit avec son NUMÉRO DE TÉLÉPHONE, pas avec une adresse mail.
  // Supabase a besoin d'un identifiant de type « email » : l'application le
  // fabrique à partir du numéro (064283322 → 064283322@eglise.invalid).
  // « .invalid » est un domaine réservé : aucun courrier ne peut y être envoyé.
  DOMAINE_INTERNE: 'eglise.invalid',
  INDICATIF: '242'          // Congo-Brazzaville
};
