# HoopBounce — Captures d'écran du Play Store

## Ce qui est prêt

Les 10 captures sont **déjà générées** dans le vrai jeu, en 3 langues, au format **1920 × 1080** (paysage 16:9,
JPEG) :

| Dossier | Contenu |
|---|---|
| `store/screenshots/fr/` · `en/` · `es/` | **versions « fiche »** : légende en haut, capture encadrée — à envoyer sur Google Play |
| `store/screenshots/raw/fr/` · `en/` · `es/` | captures brutes du jeu (pour refaire un montage, le site, les réseaux) |

Pour les refaire après une modification du jeu : `node store/tools/screenshots.mjs fr` (puis `en`, `es`).
Le script prépare un profil de joueur crédible, puis prend chaque capture au bon moment :
- 48 250 pièces, Ville et Neige terminées avec des étoiles ;
- traînée de flammes et effet d'étoiles équipés ;
- récompense du 3e jour à récupérer, missions en cours.

## Règles de Google Play

- **2 à 8 captures par type d'appareil** (téléphone, tablette 7", tablette 10", Chromebook).
- Formats acceptés : JPEG ou PNG 24 bits (sans transparence).
- Côté le plus court ≥ 320 px, côté le plus long ≤ 3 840 px, rapport ≤ 2:1.
- Pour être mis en avant (recommandations de jeux), au moins **4 captures paysage en 1920 × 1080** ou plus.
- Pas de mentions trompeuses, pas de « n° 1 », pas de cadres d'appareils d'autres marques.
- Les légendes restent courtes et lisibles ; le jeu reste le sujet principal.

Le Play Store n'accepte que **8 captures par type d'appareil**. Les 10 captures servent donc ainsi :

| Ordre | Téléphone (8) | Tablettes 7" et 10" (8) |
|---|---|---|
| 1 | 01 Gameplay | 01 Gameplay |
| 2 | 03 Ville | 02 Menu principal |
| 3 | 04 Neige | 03 Ville |
| 4 | 05 Volcan | 05 Volcan |
| 5 | 06 Forêt | 07 Espace |
| 6 | 07 Espace | 08 Boutique |
| 7 | 08 Boutique | 09 Missions |
| 8 | 10 Récompenses quotidiennes | 10 Récompenses quotidiennes |

Les 3 premières captures sont les plus vues (elles apparaissent dans les résultats de recherche) : elles
montrent l'action et la variété des mondes, pas un menu.

## Liste des captures et ce qui doit être visible

### 01 — Gameplay (`01-gameplay.jpg`) · « Dribble, rebondis, marque ! »
- Le **moment du panier** : ballon qui traverse le filet, gerbe de rayons, confettis ou feu d'artifice,
  mot **« SWISH ! »** ou « PANIER ! » en grand.
- L'interface de jeu complète et propre : monde-niveau et étoiles en haut à gauche, recommencer et pause en
  haut à droite, ◀ ▶ en bas à gauche, bouton de rebond avec son anneau de puissance en bas à droite.
- Un décor riche (Ville la nuit : néons « OPEN 24H », « DINER »), une étoile visible.
- À éviter : écran de victoire par-dessus, tutoriel, bannière de mission, ballon immobile.

### 02 — Menu principal (`02-menu.jpg`) · « Un vrai jeu de basket de plateforme »
- Logo HOOP BOUNCE, bouton **JOUER** lumineux avec le niveau à reprendre (« Monde 3 · Niveau 5 »).
- Les boutons Cadeau / Missions / Succès / Bonus avec leurs **pastilles rouges** (il y a des choses à
  récupérer), solde de pièces élevé (48 250).
- Dock complet (Mondes 24/50, Collection 13/51) : on voit que le jeu a du contenu.
- Le décor de salle de basket avec le ballon qui rebondit et le panier.
- À éviter : écran de chargement, page ouverte, pièces à 0.

### 03 — Monde Ville (`03-city.jpg`) · « Monde 1 · La Ville — néons, scies et toits »
- Ballon **en plein saut** avec sa **traînée de flammes**.
- Plusieurs éléments du monde à l'écran : scie circulaire, trampoline, plateforme mobile, enseignes au néon.
- Deux ou trois **étoiles** à ramasser ; le panier visible au loin si possible.

### 04 — Monde Neige (`04-snow.jpg`) · « Monde 2 · La Neige — glace et stalactites »
- Ballon en l'air au-dessus de la **glace brillante**, sous une planche enneigée hérissée de **stalactites**.
- Montagnes et sapins enneigés, bloc de glace, boule de neige, étoiles.
- Couleurs froides bien lisibles (contraste avec l'orange du ballon).

### 05 — Monde Volcan (`05-volcano.jpg`) · « Monde 3 · Le Volcan — lave et geysers »
- **Rivière de lave** lumineuse en bas de l'écran, plateformes de pierre au-dessus.
- Ballon en saut avec traînée de feu ; une étoile au-dessus de la lave (prise de risque).
- Idéalement un **geyser** ou un jet de flammes en action.

### 06 — Monde Forêt (`06-forest.jpg`) · « Monde 4 · La Forêt — lianes et rivières »
- Une **liane** qui pend, la **rivière** en bas, rayons de soleil entre les arbres, champignons, papillons.
- Ballon en saut au-dessus de l'eau, étoiles.

### 07 — Monde Espace (`07-space.jpg`) · « Monde 5 · L'Espace — astéroïdes et trous noirs »
- La **Terre** et la planète à anneaux en fond, nébuleuse violette.
- **Astéroïdes**, plateformes lumineuses flottantes et l'anneau d'un **trou noir**.
- Ballon en apesanteur au milieu, étoiles.

### 08 — Boutique (`08-shop.jpg`) · « 51 objets à collectionner »
- Onglet **Ballons** avec la grille des articles et leurs **raretés en couleur** (commun, rare, épique,
  légendaire) et leurs prix.
- Un **article épique sélectionné** (Galaxie) dans le grand aperçu animé (ballon qui rebondit avec son effet).
- Compteur de collection (13/51), solde de pièces, prix et cadenas des objets à débloquer bien visibles ;
  les cartes légendaires dorées en bas de la grille.

### 09 — Missions quotidiennes (`09-missions.jpg`) · « 3 nouvelles missions chaque jour »
- Les **3 cartes** (facile vert, moyenne bleue, difficile violette) avec des **barres de progression**
  différentes : une terminée avec **« Récupérer »**, une en cours, une à 33 %.
- Les récompenses (pièces, coffre rare) et le compte à rebours « Nouvelles missions dans… ».

### 10 — Récompenses quotidiennes (`10-daily.jpg`) · « Une récompense chaque jour »
- Le **calendrier de 7 jours** : jours 1 et 2 cochés, **jour 3 « Aujourd'hui »** (coffre) qui brille, jours
  suivants visibles, **jour 7 doré** avec le ballon exclusif Hoop Bounce.
- Le gros bouton **« Récupérer »**.

## Vidéo de présentation (facultatif, recommandé)

30 secondes en paysage (YouTube, non répertoriée acceptée), sans écran noir au début :
1. 0–3 s : un panier « SWISH ! » ;
2. 3–20 s : un enchaînement par monde (Ville, Neige, Volcan, Forêt, Espace), 3 s chacun ;
3. 20–26 s : boutique et ballons ;
4. 26–30 s : logo HoopBounce et « Par EchoSpeed ».

Enregistrement : sur un téléphone, avec l'enregistreur d'écran d'Android, en qualité graphique « Haute ».
