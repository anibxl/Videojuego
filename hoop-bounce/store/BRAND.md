# Hoop Bounce — Identité visuelle officielle

Référence unique pour tout ce qui représente Hoop Bounce : le jeu, la fiche Google Play, l'icône, la bannière,
les captures, la vidéo, les réseaux sociaux. Les valeurs ci-dessous sont **celles du jeu** (`css/tokens.css`) :
la fiche et le jeu sont donc identiques.

## L'idée

**« Terrain de nuit »** — un terrain de basket la nuit, sous une seule lumière chaude. Bleu nuit profond, un
accent orange (le ballon), l'or des récompenses, le bleu glacier des gemmes. Stylisé haut de gamme, jamais
réaliste ni enfantin : formes franches, dégradés doux, une seule source de lumière (en haut à gauche), ombres bleu
nuit (jamais noir pur).

## Nom et logo

- Le nom s'écrit **Hoop Bounce** (deux mots, H et B majuscules). Jamais « HoopBounce » ni « Hoop-Bounce ».
- Logo : **HOOP** en blanc au-dessus de **BOUNCE** en orange, police Outfit 800, capitales, interlettrage
  −0,02 à −0,03 em ; à côté ou au-dessus, le ballon. L'orange du mot BOUNCE est un dégradé
  `#ffb067 → #ff7a2f → #f05312` avec un halo orange doux.
- Signature : « Dribble · Rebondis · **Marque** » (EN « Dribble · Bounce · **Score** », ES « Bota · Rebota ·
  **Encesta** »), petites capitales espacées (0,2 em), dernier mot en orange.
- Zone de protection : la hauteur du « O » de HOOP tout autour du logo.

## Palette officielle

| Rôle | Couleur | Code | Usage |
|---|---|---|---|
| Nuit profonde | ■ | `#050913` → `#0d1838` → `#22357a` | fonds (dégradé radial, plus clair en haut à gauche) |
| Panneaux | ■ | `rgba(13, 21, 42, 0.78)` | cartes et fenêtres en verre sombre |
| Orange ballon | ■ | `#ff7a2f` (clair `#ffb067`, foncé `#c8430f`) | marque, bouton JOUER, accents, cercle du panier |
| Or récompense | ■ | `#ffc94d` | pièces, étoiles, Premium, rang légendaire |
| Bleu gemme | ■ | `#5fd4ff` | gemmes, éléments de saison froide |
| Menthe | ■ | `#3fe0b8` | réussite, « fait », validation |
| Texte | ■ | `#f2f5ff` / `#b6c1dc` / `#74809f` | principal / secondaire / discret |
| Raretés | ■ | commun `#a7b4cc` · rare `#4da3ff` · épique `#b46bff` · légendaire `#ffc23d` · mythique `#ff5f8f` | objets, coffres |

Règle : l'orange est l'accent unique d'un écran (un seul élément orange principal). L'or est réservé à ce qui se
gagne, le bleu gemme aux gemmes.

## Typographie

Une seule famille : **Outfit** (variable 100–900, licence libre SIL OFL, incluse dans le jeu).

| Niveau | Taille (écran paysage) | Graisse |
|---|---|---|
| Grand titre (logo, « Panier ! ») | 28–46 px | 800 |
| Titre de page | 20–26 px | 700 |
| Sous-titre | 15–18 px | 700 |
| Texte | 13–15 px | 500 |
| Étiquette (rareté, catégorie) | 9,5–10,5 px, capitales, interlettrage 0,12 em | 650 |

Chiffres tabulaires dans les compteurs. Pas de seconde police, pas d'italique.

## Formes, cartes, boutons

- **Arrondis** : 8 · 12 · 16 · 20 · 26 px (étiquette, petit bouton, bouton, carte, fenêtre) et pilule.
- **Cartes** : verre sombre (panneau), liseré clair de 1 px en haut (lumière), ombre bleu nuit douce, coins 20 px.
- **Boutons** : principal orange en dégradé avec halo, secondaire en verre ; même pression partout
  (94 %, léger éclat, retour élastique discret), même son au toucher.
- **Icônes** : trait arrondi de 2 px sur grille 24, coins arrondis, une seule couleur (texte ou accent) ;
  illustrations « objets » (pièce, gemme, étoile, coffres) en volume, éclairées d'en haut à gauche.

## Effets

- Lumière : halo radial chaud derrière l'élément important ; reflets en diagonale (balayage lent) sur les objets
  précieux ; jamais de néon criard ni d'effet « arc-en-ciel ».
- Particules : étincelles dorées (récompense), poussière et neige (ambiance), confettis seulement pour les grands
  moments (panier parfait, coffre, montée du Pass).
- Mouvement : courbes douces (`cubic-bezier(.2,.9,.25,1)`), ressort discret pour les apparitions ; durées
  0,18 / 0,32 / 0,6 s.

## Illustrations

- Le ballon orange est le héros de toute illustration (au premier plan, en mouvement, avec sa traînée).
- Le panier : planche de verre bleutée à liseré blanc, carré orange, cercle orange, filet blanc.
- Décors : nuit, projecteurs chauds, légère brume ; les saisons s'ajoutent par petites touches (neige sur la
  planche, flocons) sans changer la base.

## Icône

- **Intemporelle** (`store/src/icon.svg`) : le ballon plonge dans le panier stylisé (planche de verre, carré
  orange, cercle orange, filet), traits de vitesse, halo chaud, fond nuit. C'est l'icône de l'application
  (Android) : elle ne change jamais.
- **Saison de Noël** (`store/src/icon-winter.svg`) : la même, avec un liseré de neige sur la planche et quelques
  flocons discrets. À utiliser sur la fiche Google Play pendant la saison, puis à remplacer par l'intemporelle.
- Lisible jusqu'à 48 px ; couches séparées (fond / motif) pour l'icône adaptative Android.

## Fichiers

| Fichier | Contenu |
|---|---|
| `store/src/icon.svg`, `icon-winter.svg` | sources des icônes |
| `store/src/feature-graphic.html` | source de la bannière (`?lang=fr|en|es`, `&season=winter`) |
| `store/tools/render-assets.mjs` | génère icônes, bannières, icônes Android et écrans de démarrage |
| `store/tools/screenshots.mjs` | génère les captures de la fiche (titres marketing) |
| `css/tokens.css` | les mêmes valeurs dans le jeu |
