# Application de gestion d'église — mode d'emploi

Site **statique** : rien à installer, rien à compiler. Vous déposez le dossier sur
Netlify et c'est en ligne. La base de données (comptes, cellules, programmes,
finances, discussions) est déjà créée et sécurisée chez Supabase.

---

## 1. Mettre en ligne (5 minutes)

1. Allez sur **https://app.netlify.com/drop**
2. Faites glisser le **ZIP** (ou le dossier décompressé) dans la zone.
3. Netlify vous donne une adresse `https://xxxx.netlify.app` : c'est votre application.

`index.html` est bien à la racine du ZIP.
Pour mettre à jour : sur Netlify, onglet **Deploys** → glissez le nouveau dossier.

---

## 2. Déjà fait pour vous

- **L'envoi du logo est réparé** : il manquait un droit de lecture sur l'espace de
  stockage, ce qui faisait échouer l'opération même pour l'administrateur.
  Si jamais le stockage refusait encore, le logo est maintenant gardé directement
  dans la base : il s'affiche quand même.

- **Plus d'adresse mail nulle part.** On s'inscrit et on se connecte avec son
  **numéro de téléphone** et un mot de passe. Rien d'autre à saisir, aucun lien à
  confirmer, aucun courrier envoyé.
- **L'inscription est directe** : la personne crée son compte et entre aussitôt.
- **Vous êtes administrateur** : connectez-vous avec le numéro **064283322** et le
  mot de passe que vous aviez choisi. (Votre compte a été basculé de l'adresse mail
  vers le numéro ; le mot de passe n'a pas changé.)

Il ne reste donc qu'à ouvrir l'application, vous connecter, et mettre le **nom** et
le **logo** de l'église dans **Plus → Apparence**.

> Le logo devient à la fois le logo dans l'application **et** son icône (écran
> d'accueil du téléphone, onglet du navigateur), et **les couleurs de toute
> l'application s'adaptent à celles du logo**. Un logo carré, PNG à fond
> transparent, d'au moins 512 × 512 pixels, donne le meilleur résultat.

---

## 3. Qui voit quoi

| Rôle | Ses écrans |
|---|---|
| **Administrateur** | Tout : tableau de bord, cellules, membres, départements, fiches reçues, programmes, calendrier, messages, discussions, dimanches, finances, apparence |
| **Berger** | Sa cellule et ses membres, sa fiche de réunion, son historique, + les écrans communs |
| **Chef de département** | Son département et ses ouvriers, + les écrans communs |
| **Comptable** | Cultes du dimanche et finances, + les écrans communs |
| **Membre** | Accueil, programmes, calendrier, messages, discussions, son profil |

Écrans communs à tous : **Accueil** (verset du jour, prochains rendez-vous, dernier
message du pasteur), **Programmes**, **Calendrier**, **Messages**, **Discussions**,
**Mon compte**, **Guide**.

Un compte gênant peut être **suspendu** depuis l'écran Membres : il perd aussitôt
tout accès, et peut être réactivé plus tard.

---

## 4. Ce que fait l'application

**Cellules** — créer une cellule, définir jour et heure de réunion, nommer un
berger (il devient berger et ne voit alors que sa cellule).

**Membres** — recherche, filtres (tous, actifs, sans cellule, suspendus), rôle,
statut, cellule et département de chaque personne.

**Fiches de réunion** — chaque semaine le berger saisit hommes / femmes / enfants
(le **total est calculé par la base de données**, impossible à falsifier), nouveaux
venus, conversions, familles visitées, témoignages, difficultés. Une seule fiche par
réunion ; elle reste modifiable depuis l'historique.

**Programmes et calendrier** — titre, type (jeunes, prière, croisade, convention…),
thème, dates, et **pour qui** : toute l'église, une cellule ou un département — un
programme réservé n'est visible que par eux. Le bouton *Séances* ajoute les dates
successives d'une même activité ; elles remplissent le calendrier de chacun.

**Messages du pasteur** — enseignement ou annonce, avec lien vidéo/audio, pour toute
l'église ou pour un groupe, avec date de publication éventuellement programmée.

**Discussions** — un salon pour toute l'assemblée, un salon par cellule, un salon
par département. Chacun ne voit que les salons auxquels il appartient. On supprime
ses propres messages ; l'administrateur peut supprimer n'importe lequel.

**Cultes du dimanche** — présents, absents, nouveaux venus, thème, prédicateur,
offrande et dîme. Une fiche par dimanche.

**Finances** — entrées (dîme, offrande, don…) et sorties (loyer, matériel,
transport, aide sociale…), en **francs CFA**, avec totaux et solde du mois, de
l'année ou depuis le début.

---

## 4 bis. Les illustrations

Chaque écran s'ouvre sur une illustration : l'assemblée mains levées, une personne
à genoux dans la lumière, la Bible ouverte, la croix à l'aube, la colombe, l'horizon
de la ville au lever du jour. Elles sont **dessinées dans le site** (SVG), pas
téléchargées : quelques kilo-octets au lieu de plusieurs méga-octets, donc un
affichage immédiat même avec une connexion lente — et elles prennent
automatiquement les couleurs de votre logo.

Dans **Apparence → Ambiance illustrée**, vous choisissez soit « Au fil des écrans »
(l'illustration change selon la page), soit une seule ambiance gardée partout.

> Depuis cette version, trois ambiances (prière, croix, adoration) et l'écran
> « Messages du pasteur » utilisent de **vraies photos de l'église** (dossier
> `img/`) à la place du dessin. Les trois autres ambiances (Bible, colombe,
> ville) restent en dessin : envoyez-moi d'autres photos si vous voulez les
> remplacer aussi.

## 4 quater. L'écran de bienvenue

À l'ouverture du site, une photo plein écran (`img/bienvenue.jpg`) s'affiche
quelques secondes avec un bouton **Entrer**. Elle ne réapparaît pas tant que
le navigateur reste ouvert. Pour la changer, remplacez le fichier
`img/bienvenue.jpg` par une autre image de même nom.

---

## 4 ter. Les discussions

Il y a **un salon pour toute l'église** — tout le monde y écrit, c'est le grand
groupe — **plus un salon par cellule** et **un salon par département**, réservés à
leurs membres. On passe de l'un à l'autre par les pastilles en haut de l'écran
Discussions.

---

## 5. Installer sur le téléphone

Ouvrir l'adresse du site dans le navigateur, puis :

- **Android (Chrome)** : menu ⋮ → *Ajouter à l'écran d'accueil*
- **iPhone (Safari)** : Partager → *Sur l'écran d'accueil*

L'icône et le nom de votre église apparaissent comme une vraie application.

---

## 5 bis. Comment fonctionne la connexion par téléphone

Supabase exige techniquement un identifiant de type « adresse ». L'application en
fabrique un tout seul à partir du numéro :
`064283322` devient `064283322@eglise.invalid`.

`.invalid` est un domaine **réservé par la norme internet** : aucun courrier ne peut
y être envoyé, et personne ne peut le posséder. Cet identifiant n'apparaît nulle part
dans l'application — les écrans n'affichent que le numéro. Un déclencheur dans la base
active chaque compte à sa création, donc il n'y a jamais de lien à confirmer.

Conséquence utile : **deux personnes ne peuvent pas s'inscrire avec le même numéro.**

---

## 6. Sécurité

La clé Supabase dans `js/config.js` est une clé **publique**, faite pour être dans un
navigateur. Toute la sécurité est appliquée **dans la base de données**, par des
règles (Row Level Security) qu'on ne peut pas contourner depuis le navigateur :

- un **berger** ne lit et n'écrit que les fiches et les membres de **sa** cellule ;
- un membre ne voit **ni** les finances, **ni** les cultes du dimanche, **ni** les
  salons de discussion auxquels il n'appartient pas ;
- un compte **suspendu** n'a accès à **aucune** donnée ;
- personne ne peut **se donner un rôle** : à l'inscription le rôle est forcé à
  « membre », et seul un administrateur peut le changer ;
- le nom affiché dans les discussions est écrit **par la base**, pas par le navigateur.

Ne mettez **jamais** la clé `service_role` de Supabase dans ce site.

---

## 7. Contenu du dossier

```
index.html                 l'application (tous les écrans)
manifest.webmanifest       nom + icône pour l'installation sur téléphone
_headers                   réglages de sécurité Netlify
css/app.css                charte : bleu profond, bleu électrique, accent orange ; Montserrat + Inter
js/config.js               adresse Supabase, clé publique, valeurs par défaut
js/marque.js               nom, logo, icône et couleurs de l'église
js/noyau.js                connexion, inscription, navigation, rôles, verset du jour
js/admin.js                tableau de bord, cellules, membres, départements, fiches
js/berger.js               ma cellule, fiche de réunion, mon département
js/gestion.js              programmes, calendrier, messages, dimanches, finances
js/chat.js                 discussions
js/membre.js               accueil, menu Plus, profil, guide
js/apparence.js            écran « Apparence »
js/app.js                  démarrage
icons/ fonts/ vendor/      icônes par défaut, polices, bibliothèque Supabase
```
