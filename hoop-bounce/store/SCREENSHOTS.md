# Hoop Bounce — Captures d'écran du Play Store

## Ce qui est prêt

**18 captures** prises dans le **vrai jeu**, en 3 langues, au format **1920 × 1080** (paysage 16:9, JPEG), chacune
avec un **titre marketing** et un sous-titre, dans l'identité du jeu (`store/BRAND.md`) : les **5 mondes avec
leurs pièges** (2 vues par monde), le gameplay, le Trickshot, le Hoop Pass, les skins, le Mode Fantôme, les
coffres, les succès et la collection.

| Dossier | Contenu |
|---|---|
| `store/screenshots/fr/` · `en/` · `es/` | **versions « fiche »** : titre en haut, capture encadrée — à envoyer sur Google Play |
| `store/screenshots/raw/fr/` · `en/` · `es/` | captures brutes du jeu (site, réseaux sociaux, montage) |

| N° | Fichier | Titre (FR · EN · ES) | Ce qu'on voit |
|---|---|---|---|
| 1 | `01-gameplay.jpg` | **50 niveaux** · 50 levels · 50 niveles | Volcan 3-2 : panier « SWISH ! », rayons, confettis |
| 2 | `02-city-a.jpg` | **Monde 1 · La Ville** · World 1 · The City · Mundo 1 · La Ciudad | 1-9 : presse à pointes, laser vertical, 2 étoiles |
| 3 | `03-snow-a.jpg` | **Monde 2 · La Neige** · World 2 · The Snow · Mundo 2 · La Nieve | 2-7 : deux blocs de glace écraseurs, étoile |
| 4 | `04-volcano-a.jpg` | **Monde 3 · Le Volcan** · World 3 · The Volcano · Mundo 3 · El Volcán | 3-7 : trois geysers de feu en éruption, lave, dalles qui s'effondrent |
| 5 | `05-forest-a.jpg` | **Monde 4 · La Forêt** · World 4 · The Forest · Mundo 4 · El Bosque | 4-10 : rondin à pointes qui se balance, tronc qui roule |
| 6 | `06-space-a.jpg` | **Monde 5 · L'Espace** · World 5 · Space · Mundo 5 · El Espacio | 5-9 : trou noir, plateformes qui clignotent, vide |
| 7 | `07-trickshot.jpg` | **50 Trickshots** · 50 trickshots · 50 trickshots | carte 30 « Portails en chaîne », le ballon en plein vol vers le panier |
| 8 | `08-pass.jpg` | **Complétez le Hoop Pass** · Complete the Hoop Pass · Completa el Hoop Pass | Hoop Pass de Noël, niveau 10, récompenses à récupérer |
| 9 | `09-skins.jpg` | **Débloquez des skins** · Unlock skins · Desbloquea skins | boutique, ballon légendaire « Diamant » en aperçu, objets légendaires |
| 10 | `10-ghost.jpg` | **Défiez votre fantôme** · Race your ghost · Reta a tu fantasma | niveau 1-2 : le joueur sur le trampoline, son fantôme bleuté devant lui |
| 11 | `11-chest.jpg` | **Ouvrez des coffres** · Open chests · Abre cofres | ouverture d'un coffre légendaire (rayons, éclair, pièces) |
| 12 | `12-achievements.jpg` | **Relevez des défis** · Take on challenges · Supera desafíos | page Succès (62 succès, catégories, récompenses) |
| 13 | `13-collection.jpg` | **Votre collection** · Your collection · Tu colección | collection : ballons, rebonds, traînées, objet légendaire |
| 14 | `14-city-b.jpg` | **Les scies de la Ville** · City saws · Las sierras de la Ciudad | 1-7 : trois scies circulaires qui montent et descendent |
| 15 | `15-snow-b.jpg` | **Le pont de glace** · The ice bridge · El puente de hielo | 2-4 : dalles de glace qui tombent, pics au bout |
| 16 | `16-volcano-b.jpg` | **Les canons du Volcan** · Volcano cannons · Los cañones del Volcán | 3-4 : canons dans la lave, boule de feu, dalles fragiles |
| 17 | `17-forest-b.jpg` | **La rivière aux lianes** · The vine river · El río de lianas | 4-2 : deux lianes au-dessus de la rivière |
| 18 | `18-space-b.jpg` | **Le monde à l'envers** · Upside-down world · El mundo al revés | 5-8 : ballon collé au plafond (gravité inversée), astéroïdes, tapis de pics |

## Répartition conseillée sur la fiche

Google Play accepte **8 captures au plus par type d'appareil** (téléphone, tablette 7", tablette 10") ; le format
1920 × 1080 convient aux trois. Les 18 captures se répartissent ainsi (les 3 premières de chaque liste sont les
plus vues) :

| Type d'appareil | Captures, dans l'ordre | Idée |
|---|---|---|
| **Téléphone** | 01 · 02 · 04 · 07 · 08 · 03 · 05 · 06 | le jeu d'abord : gameplay, les 5 mondes et leurs pièges, Trickshot, Hoop Pass |
| **Tablette 7"** | 16 · 14 · 09 · 15 · 10 · 17 · 11 · 18 | les autres pièges des mondes, skins, fantôme, coffres |
| **Tablette 10"** | 01 · 07 · 08 · 09 · 12 · 13 · 11 · 10 | les modes et la collection : Trickshot, Pass, skins, succès, collection, coffres |

Ainsi, les 18 images sont toutes utilisées. S'il faut une seule liste (par exemple pour un autre store) : **1 → 8**.

## Les refaire

`node store/tools/screenshots.mjs fr` (puis `en`, `es`) — environ 1 min 30 par langue. Le script prépare un profil
de joueur crédible (Ville et Neige terminées, 6 niveaux du Volcan, 48 250 pièces, 18 Trickshots, Hoop Pass niveau
10, objets rares et légendaires équipés) et un **vrai fantôme** enregistré par le pilote expert
(`node store/tools/make-ghost.mjs city-02` → `store/tools/data/ghost-city-02.json`), puis prend chaque capture au
bon moment.

Pour les scènes de monde (`spot` dans `SCENES`) : le ballon est posé à un endroit sûr, la caméra cadre plusieurs
pièges à la fois, hors des boutons tactiles, les textes d'aide sont masqués, et l'image est **figée** au moment
voulu (geysers à pleine hauteur, boule de feu en vol) avant la capture. Pour trouver d'autres endroits riches en
pièges : `node store/tools/find-traps.mjs [monde]` (les fenêtres de 17 unités qui montrent le plus de pièges
différents).

## Règles de Google Play (respectées)

- 2 à 8 captures par type d'appareil ; JPEG ou PNG 24 bits ; côté court ≥ 320 px, côté long ≤ 3 840 px,
  rapport ≤ 2:1. Pour les mises en avant des jeux : au moins 4 captures paysage d'au moins 1920 × 1080. ✅
- Images réelles du jeu ; titres courts ; pas de « n° 1 », de prix, de promesse ou de cadre d'appareil d'une autre
  marque. ✅
