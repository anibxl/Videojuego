# Hoop Bounce — Captures d'écran du Play Store

## Ce qui est prêt

**8 captures** prises dans le **vrai jeu**, en 3 langues, au format **1920 × 1080** (paysage 16:9, JPEG), chacune
avec un **titre marketing** et un sous-titre, dans l'identité du jeu (`store/BRAND.md`) :

| Dossier | Contenu |
|---|---|
| `store/screenshots/fr/` · `en/` · `es/` | **versions « fiche »** : titre en haut, capture encadrée — à envoyer sur Google Play |
| `store/screenshots/raw/fr/` · `en/` · `es/` | captures brutes du jeu (site, réseaux sociaux, montage) |

| N° | Fichier | Titre (FR · EN · ES) | Ce qu'on voit |
|---|---|---|---|
| 1 | `01-gameplay.jpg` | **50 niveaux** · 50 levels · 50 niveles | Monde 3 (Volcan) : panier « SWISH ! », rayons, confettis |
| 2 | `02-trickshot.jpg` | **50 Trickshots** · 50 trickshots · 50 trickshots | carte 30 « Portails en chaîne », le ballon en plein vol vers le panier |
| 3 | `03-skins.jpg` | **Débloquez des skins** · Unlock skins · Desbloquea skins | boutique, ballon légendaire « Diamant » en aperçu, objets légendaires |
| 4 | `04-pass.jpg` | **Complétez le Hoop Pass** · Complete the Hoop Pass · Completa el Hoop Pass | Hoop Pass de Noël, niveau 10, récompenses à récupérer |
| 5 | `05-ghost.jpg` | **Défiez votre fantôme** · Race your ghost · Reta a tu fantasma | niveau 1-2 : le joueur sur le trampoline, son fantôme bleuté devant lui |
| 6 | `06-chest.jpg` | **Ouvrez des coffres** · Open chests · Abre cofres | ouverture d'un coffre légendaire (rayons, éclair, pièces) |
| 7 | `07-achievements.jpg` | **Relevez des défis** · Take on challenges · Supera desafíos | page Succès (62 succès, catégories, récompenses) |
| 8 | `08-collection.jpg` | **Votre collection** · Your collection · Tu colección | collection : ballons, rebonds, traînées, objet légendaire |

Ordre conseillé sur la fiche : **1 → 8** (les 3 premières sont les plus vues : gameplay, Trickshot, skins).
Téléphone **et** tablettes 7" / 10" : les mêmes 8 fichiers (le format 1920 × 1080 convient aux deux).

## Les refaire

`node store/tools/screenshots.mjs fr` (puis `en`, `es`). Le script prépare un profil de joueur crédible (Ville et
Neige terminées, 6 niveaux du Volcan, 48 250 pièces, 18 Trickshots, Hoop Pass niveau 10, objets rares et
légendaires équipés) et un **vrai fantôme** enregistré par le pilote expert (`node store/tools/make-ghost.mjs
city-02` → `store/tools/data/ghost-city-02.json`), puis prend chaque capture au bon moment.

## Règles de Google Play (respectées)

- 2 à 8 captures par type d'appareil ; JPEG ou PNG 24 bits ; côté court ≥ 320 px, côté long ≤ 3 840 px,
  rapport ≤ 2:1. Pour les mises en avant des jeux : au moins 4 captures paysage d'au moins 1920 × 1080. ✅
- Images réelles du jeu ; titres courts ; pas de « n° 1 », de prix, de promesse ou de cadre d'appareil d'une autre
  marque. ✅
