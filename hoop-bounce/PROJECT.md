# 🏀 Hoop Bounce — Documentation officielle du projet

> **Mémoire permanente du projet.** Ce fichier est mis à jour après chaque étape importante du
> développement (voir la section [Comment tenir ce document à jour](#comment-tenir-ce-document-à-jour)).
>
> **Dernière mise à jour :** 17/11/2026 · **Version :** 0.5.0 · **Étape en cours :** validation du
> gameplay principal par le porteur du projet, avant la création des mondes.

## Sommaire

1. [Présentation du jeu](#1-présentation-du-jeu)
2. [Gameplay](#2-gameplay)
3. [Architecture](#3-architecture)
4. [Interface](#4-interface)
5. [Progression](#5-progression)
6. [Roadmap](#6-roadmap)
7. [Liste des tâches](#7-liste-des-tâches)
8. [Idées futures](#8-idées-futures)
9. [Optimisations](#9-optimisations)
10. [Bugs connus](#10-bugs-connus)
11. [Journal des modifications](#11-journal-des-modifications)
12. [Comment tenir ce document à jour](#comment-tenir-ce-document-à-jour)

---

## 1. Présentation du jeu

### Nom du projet

**Hoop Bounce** (titre provisoire). Dossier du projet : `hoop-bounce/` dans le dépôt `Videojuego`.

### Concept

Un jeu de plateforme 2D mobile, **à l'horizontale**, où le joueur contrôle un **ballon de basket**. On le
fait rouler et rebondir à travers de courts niveaux remplis d'obstacles pour le faire **entrer dans un panier**.
Les rebonds se chargent en enchaînant les appuis, comme un dribble.

### Vision

- Un **vrai jeu mobile premium**, du niveau d'un titre publié sur le Google Play Store.
- **Qualité plutôt que quantité** : peu de fonctionnalités, mais toutes parfaitement finies.
- Une **physique réaliste et satisfaisante** : chaque rebond doit faire plaisir.
- Des commandes **simples mais qui donnent une sensation de maîtrise**.
- Un style graphique **moderne, propre, sombre (bleu nuit / noir), sobre et élégant** — jamais l'apparence
  d'un jeu Flash.
- Le jeu doit être **amusant dès les 30 premières secondes**.

### Objectif du jeu

Dans chaque niveau : partir du départ, franchir les obstacles, ramasser si possible les 3 étoiles, et faire
**entrer complètement le ballon dans le panier**. Ce n'est **pas** un jeu où il faut monter le plus haut
possible : c'est un jeu de niveaux et de précision.

### Public visé

- Joueurs mobiles occasionnels et réguliers, à partir d'environ 8 ans (aucune violence, aucun texte complexe).
- Amateurs de jeux de plateforme courts et de jeux d'adresse « encore un essai ».
- Fans de basket attirés par l'univers (ballon, panier, terrain, « swish »).
- Plateforme visée : **Android** (téléphones et tablettes), en **paysage**. Langues : français, anglais,
  espagnol.

---

## 2. Gameplay

### Contrôles

| Action | Tactile (deux pouces) | Clavier (ordinateur, pour tester) |
|---|---|---|
| Rouler à gauche / à droite | boutons ◀ ▶ en bas à gauche (toute la moitié gauche de l'écran ; on peut glisser d'un bouton à l'autre sans lever le pouce) | `←` `→` · `Q`/`A` · `D` |
| Rebondir | grand bouton en bas à droite (toute la moitié droite de l'écran) | `Espace` · `↑` · `Z`/`W` |
| Pause / reprendre | bouton ⏸ en haut à droite | `Échap` · `P` |
| Recommencer le niveau | bouton ↺ en haut à droite | `R` |
| Niveau suivant (écran de victoire) | bouton « Niveau suivant » | `Entrée` |
| Affichage de débogage | — | `²` ou `F3`, ou `?debug` dans l'adresse |

Plusieurs doigts sont gérés en même temps (diriger et rebondir simultanément). Les appuis sont pris en
compte **au moment du toucher** (aucune latence liée au relâcher).

### Mécaniques

#### Déplacement (inertie)
- ◀ / ▶ accélèrent le ballon : pleine vitesse (7,5 u/s) en ~0,3 s au sol.
- Appuyer dans l'autre sens freine franchement (×1,9).
- Relâché, le ballon continue de rouler et ralentit doucement (inertie).
- En l'air, le contrôle est réduit (accélération deux fois plus faible) et l'élan est conservé.
- Au sol, le ballon **roule sans glisser** : sa rotation suit exactement sa vitesse.
- Sur une plateforme mobile, le déplacement est calculé par rapport à la plateforme (on est transporté).

#### Rebond — le principe du dribble
- **Ballon au sol** (ou qui vient de le quitter, 0,12 s de tolérance) : l'appui le fait **rebondir tout de suite**.
- **Ballon en l'air** : l'appui le **renvoie vers le sol d'un coup sec** (15 u/s vers le bas, comme une main
  qui dribble) et il **rebondit dès le contact**. Plusieurs appuis pendant la même chute ne donnent qu'un rebond.
- **Puissance** : chaque rebond déclenché par le joueur fait monter la puissance d'un niveau (5 niveaux).
  Hauteur du rebond (le centre du ballon monte de) : **1,4 · 2,2 · 3,1 · 4,1 · 5,2 u**.
- **Charger la puissance** : en tapant vite, on enchaîne de petits dribbles près du sol ; la puissance maximale
  s'obtient en ~1 s, puis on laisse partir le grand rebond.
- **Retour au niveau de départ** : quand le ballon reste au sol ~0,55 s sans rebondir, la puissance baisse
  d'un niveau toutes les 0,32 s jusqu'au niveau 1. Les petits rebonds naturels comptent comme « au sol ».
  La puissance ne baisse jamais pendant que le ballon est en l'air.
- Même niveau = même hauteur : c'est prévisible, donc maîtrisable. On ne peut jamais dépasser la puissance 5.

#### Physique
- Moteur maison, déterministe, conçu pour un ballon contre un décor.
- Pas de simulation fixe de **1/120 s**, rendu interpolé (fluide à 60, 90 ou 120 Hz).
- Sous-pas adaptatifs : le ballon ne parcourt jamais plus de 20 % de son rayon par sous-pas → **aucune
  traversée de mur**, même très vite.
- Gravité **34 u/s²** (franche : pas de flottement). Vitesse de chute max 28 u/s.
- Rebond selon le matériau (restitution) : sol 0,60 · bloc 0,58 · mur 0,50 · porte 0,50 · cercle 0,55 · planche du panier 0,60 ·
  planche traversable 0,55 · trampoline 0,30 (+ propulsion).
- Frottement de Coulomb couplé à la rotation (le ballon prend de l'effet, roule, « mord » les surfaces).
- Inertie d'une sphère creuse (vrai ballon de basket : I = 2/3·m·r²).
- Unités : 1 u ≈ 30 cm ; rayon du ballon 0,4 u (≈ 12 cm).

### Règles
- Le panier n'est validé que lorsque le ballon est **entièrement passé** dans le cercle (centre sous le cercle
  d'au moins un rayon, dans l'axe du filet).
- Un ballon qui entre puis **ressort par le haut** (rebond sur le cercle) ne compte pas.
- Un ballon qui passe **par en dessous** du cercle ne compte pas.
- **Pics** et **chute dans le vide** : le ballon éclate et le niveau recommence (étoiles comprises).
- **Étoiles** : 3 par niveau, facultatives ; on garde le meilleur nombre obtenu.
- Le chronomètre tourne pendant la partie ; le meilleur temps est enregistré par niveau.

### Interactions et obstacles

| Élément | Comportement | Couleur |
|---|---|---|
| Sol, blocs | surfaces solides ; le dessus praticable est souligné d'un liseré crème | bleu nuit + crème |
| Murs | bords nets, plus clairs que le décor | bleu |
| **Pics** | contact = le niveau recommence ; zone mortelle légèrement plus petite que le dessin (un frôlement ne tue pas) | corail |
| **Trampoline** | toile affleurante (on roule dessus) ; propulse vers le haut (~5,9 u) sans toucher à la puissance | menthe |
| **Plateforme mobile** | aller-retour en douceur (sinusoïde) ; transporte le ballon | crème + ambre |
| **Ventilateur** | grille encastrée dans le sol ; colonne de vent qui pousse vers le haut, de plus en plus faible en montant (le ballon flotte) ; freine un peu le ballon pour qu'il se laisse « attraper » | bleu ciel |
| **Interrupteur** | se presse en roulant ou en tombant dessus ; ouvre la porte associée (une fois pour toutes) | ambre |
| **Porte** | bloc qui coulisse dans le mur à l'ouverture ; voyant rouge (fermée) / vert (ouverte) | ambre |
| **Téléporteur** | sens unique A → B ; conserve la vitesse ; la sortie se réarme quand on s'en éloigne | violet |
| **Panier** | cercle (collision réelle), planche, poteau ; filet simulé qui réagit au ballon | orange + blanc |

Le moteur gère aussi, sans qu'ils soient utilisés dans les niveaux actuels : **planches traversables par en
dessous**, **scies mobiles**, **points de contrôle (drapeaux)**, **panier fixé au mur**.

### Objets

- **Étoiles** (3 par niveau) : scintillement, son ascendant, étoile qui s'allume dans le HUD.
- **Pièces** : affichées dans le menu (solde à 0), **pas encore gagnables**.

### Futurs ajouts (gameplay)

Voir aussi [Idées futures](#8-idées-futures).
- Mondes et nouveaux niveaux (en attente de validation du gameplay).
- Nouveaux éléments : planches traversables, scies, plateformes verticales, surfaces glissantes / collantes,
  aimants, interrupteurs à minuterie, paniers mobiles.
- Modes : Trickshot, Endless, Défis quotidiens, Multijoueur.
- Skins de ballons et traînées.

---

## 3. Architecture

### Choix techniques

- **JavaScript (modules ES) + Canvas 2D**, sans dépendance ni étape de compilation. Le jeu tourne dans
  n'importe quel navigateur moderne.
- **Android** : le dossier sera emballé avec **Capacitor** (étape à venir) pour produire un APK / AAB
  publiable sur le Play Store. Les vibrations passeront alors par le plugin `@capacitor/haptics`.
- **Moteur physique maison** (contrôle total du ressenti, déterministe, testable).
- **Sons et musique synthétisés** en temps réel (Web Audio) : aucun fichier audio.
- **Polices embarquées** (Unbounded, Outfit — licence SIL OFL 1.1) : fonctionnent hors ligne.
- **Tests** : `node --test` (aucune dépendance), navigateur headless (Playwright) pour les vérifications visuelles.
- Pourquoi pas Godot : le moteur ne pouvait pas être exécuté dans l'environnement de développement, donc ce
  qui était écrit n'aurait pas pu être testé.

### Organisation complète des fichiers

```
hoop-bounce/
├── index.html              Menu principal (point d'entrée de l'application)
├── play.html               Écran de jeu (?level=N pour ouvrir un niveau précis)
├── PROJECT.md              Ce document (documentation officielle, mémoire du projet)
├── README.md               Guide rapide : lancer, tester, régler
├── package.json            Version et scripts (npm start, npm test)
├── assets/
│   └── fonts/              Polices embarquées + licences OFL
│       ├── unbounded.woff2     Titres, logo, boutons principaux (latin, ~50 Ko)
│       ├── outfit.woff2        Textes de l'interface (latin, ~32 Ko)
│       └── LICENSE-*.txt       Licences SIL Open Font License 1.1
├── css/
│   ├── fonts.css           Déclaration des polices (@font-face)
│   ├── menu.css            Styles du menu (accueil, pages, fenêtres, animations)
│   └── style.css           Styles de l'écran de jeu (HUD, commandes, pause, victoire, tutoriel)
├── src/
│   ├── config.js           ★ TOUS les réglages : physique, matériaux, commandes, caméra, sensations
│   ├── main.js             Écran de jeu : assemble tout, niveaux, pause, victoire, progression
│   ├── core/               Briques de base, sans dépendance au navigateur
│   ├── physics/            Moteur physique (sans navigateur)
│   ├── game/               Règles du jeu (sans navigateur)
│   │   └── levels/         Les niveaux (données)
│   ├── render/             Rendu Canvas du jeu
│   ├── audio/              Sons du jeu
│   ├── input/              Entrées tactiles et clavier du jeu
│   ├── platform/           Fonctions propres à l'appareil (vibrations)
│   ├── menu/               Tout le menu principal
│   └── shared/             Ce que le menu et le jeu partagent (réglages, version)
├── tests/                  Tests automatiques (node --test)
│   └── fixtures/           Terrain d'essai et solutions enregistrées des niveaux
└── tools/                  Outils de développement (level design)
```

### À quoi sert chaque dossier

| Dossier | Rôle |
|---|---|
| `src/core/` | Briques génériques : boucle à pas fixe, maths, bus d'événements. |
| `src/physics/` | Corps du ballon, formes de collision, monde physique, éléments mobiles. Aucune dépendance au navigateur : testable dans Node. |
| `src/game/` | Règles du jeu : contrôleur (dribble, puissance), éléments, pièges, panier, construction d'un niveau, progression, textes. Sans navigateur. |
| `src/game/levels/` | Les niveaux, décrits comme de simples données. |
| `src/render/` | Tout ce qui se dessine pendant la partie : décor, caméra, ballon, effets. |
| `src/audio/` | Effets sonores du jeu (synthétisés). |
| `src/input/` | Zones tactiles et clavier, traduits en commandes. |
| `src/platform/` | Vibrations (point unique à remplacer par Capacitor). |
| `src/menu/` | Menu principal : décor vivant, pages, sons, musique, icônes, textes, boutique. |
| `src/shared/` | Réglages du joueur et numéro de version, communs au menu et au jeu. |
| `tests/` | Tests automatiques ; `fixtures/` contient le terrain d'essai et les solutions des niveaux. |
| `tools/` | Outil de vérification des niveaux. |

La logique (`physics/`, `game/`) émet des **événements** (`bounce`, `slam`, `star`, `death`, `win`…) que la
présentation (son, vibrations, effets, caméra, interface) écoute. Les deux restent indépendantes.

### À quoi sert chaque script

**Racine de `src/`**

| Fichier | Rôle |
|---|---|
| `config.js` | Tous les réglages chiffrés, commentés (gravité, hauteurs de rebond, accélérations, matériaux, caméra, ressentis…). C'est ici qu'on règle les sensations. |
| `main.js` | Écran de jeu : crée la partie, le rendu, la caméra, le son ; branche les événements (effets, sons, vibrations) ; HUD, pause, victoire, tutoriel, enchaînement des niveaux, sauvegarde de la progression. |

**`src/core/`**

| Fichier | Rôle |
|---|---|
| `loop.js` | Boucle à pas fixe (« fix your timestep ») avec interpolation, ralenti (`timeScale`), protection contre les longues pauses. |
| `math.js` | Outils : `clamp`, `lerp`, lissage critique (`smoothDamp`), amortissement, point le plus proche sur un segment, générateur aléatoire déterministe. |
| `events.js` | Bus d'événements minimal (logique → présentation). |

**`src/physics/`**

| Fichier | Rôle |
|---|---|
| `ball-body.js` | Le ballon : intégration, sous-pas adaptatifs, résolution des contacts (rebond, frottement, rotation), surfaces mobiles, planches traversables, détection du sol. |
| `colliders.js` | Formes de collision : une seule primitive, la « capsule » (segment épaissi) ; cercles, polygones, planches traversables. |
| `world.js` | Le monde : liste des formes, éléments mobiles, recherche de la surface sous un point (ombre du ballon). |
| `mover.js` | Trajets aller-retour en douceur et plateformes mobiles (position et vitesse exactes à chaque instant). |

**`src/game/`**

| Fichier | Rôle |
|---|---|
| `game.js` | Une partie : états (en jeu / chute / victoire), pas de simulation, contacts, trampolines, interrupteurs, ventilateurs, téléporteurs, étoiles, pièges, panier ; `load()` pour changer de niveau. |
| `ball-controller.js` | Les commandes : déplacement avec inertie, dribble (rebond au sol, renvoi vers le sol en l'air), puissance à 5 niveaux et son retour quand le ballon reste au sol. |
| `level.js` | Construit un niveau jouable (formes physiques, éléments, panier) à partir de ses données. |
| `levels/index.js` | Les 6 niveaux (données) + la documentation du format. |
| `elements.js` | Porte coulissante, ventilateur, téléporteur. |
| `hazards.js` | Tests de contact avec les pics et les scies (avec marge de tolérance). |
| `hoop.js` | Le panier : formes de collision, détection d'un panier valide (en deux temps), filet. |
| `net.js` | Filet simulé (Verlet + contraintes de cordes), qui réagit au ballon. |
| `progress.js` | Progression enregistrée sur l'appareil : niveaux débloqués, étoiles, meilleurs temps. |
| `i18n.js` | Textes de l'écran de jeu en français, anglais et espagnol. |

**`src/render/`**

| Fichier | Rôle |
|---|---|
| `renderer.js` | Dessine une image : décor, éléments, panier (arrière puis avant pour que le ballon passe « dedans »), ballon, effets, jauge, débogage. |
| `background.js` | Décor de fond : nuit bleue, lumières floues, silhouettes de ville en parallaxe (dégradés précalculés). |
| `camera.js` | Caméra : lissage, anticipation dans le sens de la course, cadrage qui garde le sol au-dessus des commandes, secousses, zoom et cadrage sur le panier à la victoire. |
| `ball-sprite.js` | Textures du ballon générées au démarrage (cuir et coutures qui tournent, reflet fixe). |
| `ball-visual.js` | Déformations du ballon (écrasement à l'impact, étirement en vol, détente au rebond, étirement au dribble). |
| `particles.js` | Particules (poussière, confettis, scintillements, ondes, éclats) et textes flottants, avec réservoirs préalloués. |

**`src/audio/`, `src/input/`, `src/platform/`**

| Fichier | Rôle |
|---|---|
| `audio/sfx.js` | Sons du jeu synthétisés : impacts selon la surface, rebond (plus aigu à chaque niveau), dribble, trampoline, téléporteur, interrupteur, porte, vent continu, étoiles, chute, victoire. |
| `input/input.js` | Zones tactiles (moitié gauche = direction, moitié droite = rebond), multi-doigts, clavier. |
| `platform/haptics.js` | Vibrations (API Vibration ; à remplacer par Capacitor Haptics). |

**`src/menu/`**

| Fichier | Rôle |
|---|---|
| `main.js` | Menu : navigation (avec le bouton retour d'Android), effet de pression des boutons, sons, vibrations, réglages appliqués en direct, fenêtres, lancement de la partie. |
| `scene.js` | Décor vivant du menu (salle de basket la nuit, projecteurs, parquet verni, panier, ballon qui rebondit, poussières, parallaxe), avec 3 niveaux de qualité. |
| `pages.js` | Contenu HTML des pages Mondes, Modes, Magasin, Collection, Paramètres. |
| `sound.js` | Sons d'interface et musique d'ambiance synthétisés. |
| `icons.js` | Icônes SVG dessinées à la main. |
| `i18n.js` | Textes du menu en français, anglais et espagnol. |
| `shop-data.js` | Catalogue de la boutique et de la collection (vides, prêts à être remplis). |

**`src/shared/`**

| Fichier | Rôle |
|---|---|
| `settings.js` | Réglages du joueur (musique, effets, vibrations, langue, qualité), enregistrés et corrigés s'ils sont abîmés. |
| `version.js` | Numéro de version affiché dans les paramètres. |

**Tests et outils**

| Fichier | Rôle |
|---|---|
| `tests/physics.test.mjs` | Moteur physique : chute libre, rebonds, repos sans tremblement, aucune traversée, roulement, déterminisme, planches traversables, surfaces mobiles. |
| `tests/game.test.mjs` | Commandes (dribble, puissance, inertie), éléments (trampoline, pics, ventilateur, porte, téléporteur, plateforme, vide), panier. |
| `tests/progress.test.mjs` | Progression et textes de jeu dans les trois langues. |
| `tests/menu.test.mjs` | Textes du menu dans les trois langues, réglages. |
| `tests/routes.test.mjs` | Chaque passage de chaque niveau reste faisable (solutions enregistrées + solutions expertes). |
| `tests/fixtures/test-yard.js` | Terrain d'essai pour les tests de mécanique (indépendant des niveaux). |
| `tests/fixtures/routes.json` | Solutions enregistrées des passages (générées par l'outil). |
| `tools/route-check.mjs` | Outil de level design : essaie des centaines de séquences de commandes par passage et mesure la difficulté. |

### Ajouter un niveau ou un élément

- **Niveau** : l'ajouter dans `src/game/levels/index.js` (format documenté en tête du fichier), ajouter son nom
  et ses aides dans `src/game/i18n.js`, ajouter ses passages dans `tools/route-check.mjs`, puis
  `node tools/route-check.mjs 400 --save`.
- **Élément** : ses données dans le niveau, sa construction dans `game/level.js`, sa règle dans `game/game.js`,
  son dessin dans `render/renderer.js`, un test dans `tests/game.test.mjs` (terrain d'essai).

---

## 4. Interface

### Menu principal (`index.html`)

**Décor vivant (canvas)** : salle de basket la nuit, tribunes avec lumières floues, bandeau LED où glisse un
reflet orange, faisceaux de projecteurs, parquet verni en perspective (lignes du terrain, reflets), panier au
loin dont le filet ondule, **ballon qui rebondit lentement** avec ombre et reflet, poussières dans la lumière,
dérive lente de la caméra et **parallaxe sur 4 plans** (suit aussi le doigt / la souris). Le décor s'assombrit
et recule légèrement quand une page est ouverte.

**Accueil**
- Logo : ballon vectoriel + « HOOP » (blanc) / « BOUNCE » (dégradé orange), police Unbounded ; slogan.
- Bouton **JOUER** : seul élément chaud et lumineux de l'écran, lueur qui « respire », reflet qui balaie.
- **Dock** de 5 tuiles : Mondes, Modes, Magasin, Collection, Paramètres (chaque tuile a sa couleur d'accent).
- Solde de **pièces** en haut à droite (ouvre le Magasin).

**Pages**

| Page | Contenu |
|---|---|
| Mondes | Page d'attente : chemin décoratif avec nœuds verrouillés, « De nouveaux terrains arrivent ». |
| Modes | 4 cartes verrouillées « À venir » : Trickshot, Endless, Défis quotidiens, Multijoueur. Toucher une carte : tremblement + message. |
| Magasin | Onglets À la une / Ballons / Traînées / Pièces, bannière « La boutique ouvre bientôt », emplacements d'articles « Bientôt » (catalogue vide prêt dans `shop-data.js`). |
| Collection | Page vide : filtres (Tous, Classiques, Rares, Légendaires), compteur, emplacements en pointillés. |
| Paramètres | Musique, effets sonores (curseurs appliqués en direct), vibrations, qualité graphique (basse / moyenne / haute), langue (FR / EN / ES), politique de confidentialité, crédits, version. |

### Écran de jeu (`play.html`)

- **HUD discret** : niveau (« NIVEAU 2 · Le mur ») et étoiles en haut à gauche ; recommencer et pause en haut
  à droite.
- **Commandes** : ◀ ▶ (bas gauche), grand bouton de rebond (bas droite) entouré de l'**anneau de puissance**
  (5 segments : blanc, ambre au niveau 4, or au niveau 5 ; le dernier cran clignote avant de redescendre).
- **Jauge au-dessus du ballon** : 5 barres croissantes (même code couleur), visible dès que la puissance monte.
- **Pause** : Reprendre, Recommencer, Menu principal. Pause automatique quand l'application passe en arrière-plan.
- **Victoire** : niveau, « Panier ! », étoiles qui tombent une à une, temps (et « Nouveau record »), boutons
  Niveau suivant / Rejouer / Menu. Après le dernier niveau : « Bravo ! » et un message.
- **Tutoriel** (premier lancement du niveau 1) : étiquettes orange au-dessus des boutons (« Rouler »,
  « Rebondir · Appuie plusieurs fois ») qui disparaissent dès qu'on a roulé et rebondi 3 fois.
- **Textes d'aide** peints sur le décor dans chaque niveau.
- Message « Tourne ton téléphone » en portrait sur téléphone.

### Boutons

| Bouton | Comportement |
|---|---|
| Tous les boutons du menu | Enfoncement à la pression, léger **grossissement au relâcher** (ressort), **éclat lumineux** au point touché, son, vibration courte. |
| JOUER | Accord montant + souffle, éclair dans le décor, l'accueil s'efface, fondu au noir vers la partie. |
| Tuiles du dock | Icône qui prend sa couleur d'accent et halo coloré à la pression ; son d'ouverture. |
| Retour (pages) | Son descendant ; la page glisse, l'accueil revient. |
| Boutons du jeu (HUD, pause, victoire) | Enfoncement à ressort. |
| Commandes tactiles | Assombrissement et léger rétrécissement tant qu'on appuie. |

### Animations et transitions

- **Entrée du menu** : logo et JOUER glissent depuis la gauche, tuiles qui montent en cascade, pièces en fondu.
- **Ouverture d'une page** : l'accueil s'efface, la page glisse depuis la droite (ressort), ses blocs
  apparaissent en cascade ; le décor s'assombrit et zoome légèrement.
- **Fenêtres** (confidentialité, crédits) : fond qui s'assombrit, carte qui monte.
- **Contrôles segmentés** : indicateur qui glisse sous l'option choisie.
- **Menu → jeu** : fondu au noir, puis fondu depuis le noir à l'arrivée.
- **Niveau suivant** : fondu rapide au noir.
- **Victoire** : ralenti (×0,3 pendant 0,9 s), zoom de caméra vers le panier, secousse, carte qui monte, étoiles
  qui tombent une à une (son ascendant).
- **Étoiles du HUD** : apparition avec rebond.

### Effets visuels (jeu)

- Ballon : écrasement à l'impact, étirement en vol, détente au rebond, étirement vers le bas au dribble,
  rotation réelle, ombre portée, « pop » à l'apparition.
- Rebond : onde de choc (blanche → ambre → or selon la puissance), poussière ; petite secousse au niveau 5.
- Impacts forts : poussière et secousse de caméra.
- Trampoline : toile qui se creuse puis vibre, onde menthe.
- Ventilateur : colonne de vent lumineuse, filets d'air qui montent.
- Téléporteur : anneaux qui tournent, particules qui spiralent, scintillements à l'entrée et à la sortie.
- Interrupteur / porte : lueur ambre, voyant rouge → vert, message « La porte s'ouvre ! ».
- Étoile ramassée : scintillements, onde dorée.
- Chute : le ballon éclate en morceaux, flash rouge, secousse.
- Panier : filet animé, confettis, « SWISH ! » ou « PANIER ! ».

---

## 5. Progression

### Les mondes

🔴 **Pas encore créés** (en attente de validation du gameplay). Les 6 niveaux actuels formeront probablement
le premier monde. La page « Mondes » du menu est une page d'attente.

### Les niveaux

| # | Identifiant | Nom | Ce qu'il apprend | Puissance nécessaire pour le panier |
|---|---|---|---|---|
| 1 | `first-shot` | Premier panier | rouler, rebondir, enchaîner (les étoiles dessinent la montée vers le panier) | 3 |
| 2 | `the-wall` | Le mur | charger la puissance pour franchir un mur | 3 pour le mur, 4 pour le panier |
| 3 | `trampoline` | Trampoline | trampoline au-dessus d'un champ de pics, panier sur une estrade | 2 pour l'estrade, 3–4 pour le panier |
| 4 | `moving` | Plateforme mobile | traverser le vide sur une plateforme | 4 |
| 5 | `updraft` | Le souffle | ventilateur jusqu'à une terrasse, panier en hauteur | ventilateur, puis 3–4 |
| 6 | `final` | Grand final | interrupteur, porte, téléporteur | 3 pour l'interrupteur, 4 pour le panier |

- Le joueur commence au niveau 1 ; terminer un niveau débloque le suivant.
- **JOUER** reprend au premier niveau non terminé (après le dernier, on reprend au dernier).
- Lien direct : `play.html?level=N`.

### Le système d'étoiles

- 3 étoiles placées dans chaque niveau (souvent sur la trajectoire idéale, parfois à un endroit risqué).
- Elles sont facultatives ; une chute les remet en jeu (le niveau recommence).
- On conserve le **meilleur nombre d'étoiles** par niveau, ainsi que le **meilleur temps**.
- Usage futur prévu (à valider) : débloquer mondes et modes à partir d'un total d'étoiles.

### Le déblocage des modes

🔴 **Pas encore défini.** Les 4 modes sont affichés « À venir » dans le menu. Proposition à valider :
Trickshot après le monde 1, Endless après le monde 2, Défis quotidiens après 30 étoiles, Multijoueur dans une
mise à jour dédiée.

### Les skins

🔴 **Pas encore créés.** La page Collection (vide) et le catalogue de la boutique (`src/menu/shop-data.js`)
sont prêts à les accueillir. Le ballon est dessiné par programme (`render/ball-sprite.js`), ce qui facilitera
les variantes (couleurs, motifs, matières).

### Les récompenses

🔴 **Pas encore définies.** Le solde de pièces est affiché (0) mais les pièces ne se gagnent pas encore.
Pistes : pièces par niveau terminé et par étoile, bonus pour un « swish », coffres de fin de monde.

---

## 6. Roadmap

Légende : ✅ Terminé · 🟡 En cours · 🔴 À faire

### Phase 1 — Fondations ✅
- ✅ Choix technique (JavaScript + Canvas, Capacitor pour Android)
- ✅ Moteur physique maison (pas fixe, sous-pas, rebond, frottement, rotation)
- ✅ Boucle à pas fixe avec interpolation
- ✅ Tests automatiques du moteur
- ✅ Architecture logique / présentation séparées

### Phase 2 — Prototypes de gameplay ✅
- ✅ Étape 1 : charge et saut (paysage) — abandonné au profit des étapes suivantes
- ✅ Étape 2 : version verticale à une main avec jauge de rebonds — abandonnée (demande de jeu horizontal)
- ✅ Étape 3 : plateforme horizontale, 3 commandes, puissance par enchaînement, éléments de jeu

### Phase 3 — Menu principal ✅
- ✅ Décor vivant (salle, projecteurs, parquet, panier, ballon, parallaxe)
- ✅ Accueil, dock, pièces
- ✅ Pages Mondes, Modes, Magasin, Collection, Paramètres
- ✅ Animations, transitions, sons, musique, vibrations
- ✅ 3 langues, réglages enregistrés, polices embarquées

### Phase 4 — Gameplay principal 🟡
- ✅ Dribble et puissance à 5 niveaux
- ✅ Retour de la puissance quand le ballon reste au sol
- ✅ Physique plus franche (gravité, accélération)
- ✅ Panier validé seulement quand le ballon est entièrement passé
- ✅ 6 niveaux courts avec 3 étoiles chacun
- ✅ HUD, pause, victoire, tutoriel, progression
- 🟡 Validation par le porteur du projet (ressenti, difficulté)
- 🔴 Réglages fins après retours

### Phase 5 — Mondes 🔴
- 🔴 Définir les mondes (thèmes, nombre de niveaux)
- 🔴 Écran de sélection des mondes et des niveaux
- 🔴 Nouveaux niveaux et nouveaux éléments
- 🔴 Thème visuel propre à chaque monde

### Phase 6 — Économie, magasin et skins 🔴
- 🔴 Gagner des pièces (niveaux, étoiles, swish)
- 🔴 Skins de ballons et traînées
- 🔴 Magasin fonctionnel et page Collection
- 🔴 Récompenses (coffres, fin de monde)

### Phase 7 — Modes de jeu 🔴
- 🔴 Trickshot
- 🔴 Endless
- 🔴 Défis quotidiens
- 🔴 Multijoueur

### Phase 8 — Android 🔴
- 🔴 Projet Capacitor (Android)
- 🔴 Vibrations natives (Capacitor Haptics), verrouillage en paysage, plein écran
- 🔴 Icône, écran de démarrage, nom de l'application
- 🔴 Tests sur vrais appareils (entrée de gamme, milieu de gamme, haut de gamme)

### Phase 9 — Publication 🔴
- 🔴 Fiche Play Store (textes, captures, vidéo)
- 🔴 Politique de confidentialité hébergée en ligne
- 🔴 Classification du contenu, conformité Play
- 🔴 Bêta fermée, puis publication

---

## 7. Liste des tâches

### Fait ✅
- ✅ Moteur physique, boucle, caméra, rendu, effets, sons
- ✅ Menu principal complet (5 pages, réglages, 3 langues)
- ✅ Dribble, puissance, retour de puissance au sol
- ✅ Éléments : trampoline, pics, plateforme mobile, ventilateur, interrupteur, porte, téléporteur, vide
- ✅ Panier validé entièrement, filet, confettis, ralenti, zoom
- ✅ 6 niveaux, étoiles, progression, records
- ✅ HUD, pause (manuelle et automatique), victoire, tutoriel
- ✅ Réglages du menu appliqués dans le jeu (volume des effets, vibrations, langue)
- ✅ 57 tests automatiques + outil de vérification des niveaux
- ✅ Documentation (README, PROJECT.md)

### En cours 🟡
- 🟡 Attente des retours du porteur du projet sur le gameplay principal

### À faire — court terme 🔴
- 🔴 Ajuster le ressenti (gravité, hauteurs, dribble, inertie) selon les retours
- 🔴 Ajuster la difficulté (notamment la plateforme mobile du niveau 4)
- 🔴 Afficher le bon niveau sur le bouton JOUER du menu (actuellement « Niveau 1 » fixe) — demande une
  modification du menu, en attente d'accord
- 🔴 Faire apparaître le panier du niveau 5 dès le départ (il est hors de l'écran au début)
- 🔴 Éviter que l'étiquette « Rebondir » du tutoriel recouvre le panier du niveau 1
- 🔴 Musique pendant la partie (le réglage « Musique » ne concerne que le menu pour l'instant)
- 🔴 Appliquer la qualité graphique choisie au jeu (elle ne concerne que le décor du menu pour l'instant)

### À faire — moyen terme 🔴
- 🔴 Mondes, écran de sélection des niveaux, niveaux supplémentaires
- 🔴 Pièces, skins, magasin, collection
- 🔴 Nouveaux éléments (planches traversables, scies, plateformes verticales…)
- 🔴 Accessibilité : taille des boutons réglable, inversion gauche / droite pour les gauchers

### À faire — long terme 🔴
- 🔴 Modes Trickshot, Endless, Défis quotidiens, Multijoueur
- 🔴 Emballage Android (Capacitor), tests sur appareils, publication Play Store
- 🔴 Sauvegarde dans le cloud (Google Play Games)

---

## 8. Idées futures

**Gameplay**
- Planches traversables par en dessous (déjà gérées par le moteur).
- Scies mobiles (déjà gérées par le moteur).
- Plateformes verticales, plateformes qui s'effondrent, ascenseurs.
- Surfaces : glace (glisse), boue (colle), caoutchouc (super-rebond).
- Aimants qui attirent ou repoussent le ballon.
- Interrupteurs à minuterie, portes multiples, leviers.
- Paniers mobiles, paniers multiples (marquer dans l'ordre).
- Vent latéral, tapis roulants, canons à ballon.
- Bonus « tir parfait » : marquer sans toucher le cercle (« swish ») rapporte plus.
- Ralenti « bullet time » au-dessus du panier.

**Modes**
- Trickshot : marquer depuis des positions imposées, avec des rebonds sur les murs.
- Endless : niveaux générés à l'infini, score croissant.
- Défis quotidiens : un niveau par jour, classement.
- Multijoueur : course au panier en temps réel ou fantômes asynchrones.
- Contre-la-montre avec fantôme de son meilleur passage.

**Personnalisation**
- Skins de ballons (classique, néon, rétro, plage, or…), traînées lumineuses, effets de panier.
- Filets et paniers personnalisés.

**Progression et social**
- Mondes thématiques (gymnase, terrain de rue, plage, toits, espace…).
- Succès / trophées, classements Google Play Games.
- Partage de replays en vidéo courte.

**Technique**
- Éditeur de niveaux intégré.
- Sauvegarde cloud, synchronisation multi-appareils.

---

## 9. Optimisations

**Simulation**
- Pas fixe de 1/120 s et rendu interpolé : fluidité identique à 60, 90 ou 120 Hz, sans dépendre de la vitesse
  de l'appareil.
- Sous-pas adaptatifs (seulement quand le ballon va vite).
- Élimination rapide des collisions par boîtes englobantes.
- Objets de contact et particules **préalloués et réutilisés** : pas d'à-coups dus au ramasse-miettes.
- Coût mesuré : ~0,04 ms par pas de simulation.

**Rendu du jeu**
- Seuls les éléments visibles à l'écran sont dessinés.
- Textures du ballon, des étoiles et des halos générées une fois au démarrage.
- Ciel et vignette **précalculés en basse résolution** puis plaqués en une opération (au lieu de grands
  dégradés recalculés à chaque image).
- Silhouettes de fond : chaque plan n'est rempli que jusqu'au plan suivant (moins de surface repeinte).
- Résolution interne du canvas plafonnée à 2× (aucun gain visible au-delà, beaucoup plus de pixels).
- Coût mesuré du dessin : ~0,3 ms par image.

**Menu**
- Plans fixes du décor précalculés à chaque redimensionnement ; faisceaux des projecteurs incrustés une fois
  pour toutes.
- Lueur du bouton JOUER animée par l'opacité d'un calque (pas de repeinture d'ombre à chaque image).
- 3 niveaux de qualité graphique (résolution, particules, reflets).
- Aucun `backdrop-filter` (flou recalculé à chaque image, coûteux sur mobile).

**Général**
- Rendu et musique arrêtés quand l'application est en arrière-plan.
- Sons synthétisés : aucun fichier audio à charger ; sons limités en fréquence ; compresseur anti-saturation.
- Polices réduites au sous-ensemble latin (~83 Ko au total).
- Résultat : **60 images/s stables** dans tous les écrans, mesurées dans Chromium sans carte graphique.

---

## 10. Bugs connus

| Gravité | Bug | Statut |
|---|---|---|
| Moyenne | Le bouton JOUER du menu affiche toujours « Niveau 1 · Premier dribble » alors qu'il reprend au premier niveau non terminé. | 🔴 En attente d'accord (modification du menu) |
| Faible | Niveau 5 : le panier est hors de l'écran au départ (on le découvre en montant). | 🔴 À corriger |
| Faible | Niveau 1 : l'étiquette « Rebondir » du tutoriel recouvre en partie le panier (elle disparaît après 3 rebonds). | 🔴 À corriger |
| Faible | Le réglage « Musique » n'agit que dans le menu (pas encore de musique en jeu). | 🔴 À faire |
| Faible | La qualité graphique choisie n'agit que sur le décor du menu. | 🔴 À faire |
| Faible | Version en ligne (lien de prévisualisation claude.ai) : le bouton « Menu » de la partie n'a pas pu être vérifié sur cet hébergement. En local, il fonctionne. | 🟡 À vérifier |
| Info | Jamais testé sur un vrai téléphone : sons, vibrations et confort tactile vérifiés seulement dans le code et dans un navigateur simulé. | 🔴 À tester (phase Android) |
| Info | Niveau 6 : quelques images lentes (≈ 2 %) mesurées en rendu logiciel, à surveiller sur appareil réel. | 🟡 À surveiller |

---

## 11. Journal des modifications

### 17/11/2026 — Création de PROJECT.md (v0.5.0)
- **Ajouté** : ce document (présentation, gameplay, architecture, interface, progression, roadmap, tâches,
  idées, optimisations, bugs, journal) ; consigne de mise à jour automatique dans `CLAUDE.md`.
- **Modifié** : README (lien vers PROJECT.md).
- **Reste à faire** : retours sur le gameplay principal, puis les mondes.

### 17/11/2026 — Étape 5 : gameplay principal (commit `a5ee230`, v0.5.0)
- **Ajouté** : dribble (rebond immédiat au sol, renvoi vers le sol en l'air), retour de la puissance quand le
  ballon reste au sol, 6 niveaux courts avec 3 étoiles, HUD discret (niveau, étoiles, pause, recommencer),
  pause (et pause automatique), écran de victoire (ralenti, zoom, confettis, étoiles animées, niveau suivant),
  tutoriel du premier lancement, progression enregistrée, textes de jeu FR/EN/ES, terrain d'essai pour les
  tests, vérification de chaque niveau.
- **Modifié** : gravité 30 → 34, accélération plus vive, panier validé seulement quand le ballon est entièrement
  passé, une chute fait recommencer le niveau, réglages du menu appliqués dans le jeu.
- **Reste à faire** : validation du ressenti, réglage de la difficulté, mondes.

### 17/11/2026 — Étape 4 : menu principal (commit `0c70772`, v0.4.0)
- **Ajouté** : menu premium (décor vivant, accueil, dock, 5 pages, paramètres complets), sons et musique
  synthétisés, 3 langues, polices embarquées, réglages partagés avec le jeu.
- **Modifié** : le jeu passe dans `play.html` (bouton menu, fondu d'entrée).
- **Reste à faire** : gameplay principal.

### 17/11/2026 — Étape 3 : plateforme horizontale (commit `e1072e9`, v0.3.0)
- **Ajouté** : jeu horizontal à 3 commandes, puissance qui monte en enchaînant les rebonds, trampoline,
  ventilateur, interrupteur et porte, téléporteur, style graphique nuit bleue.
- **Modifié** : abandon du jeu vertical.
- **Reste à faire** : menu, niveaux.

### 17/11/2026 — Étape 2 : version verticale (commit `a7ec5be`, v0.2.0)
- **Ajouté** : contrôles à une main (glisser + toucher), jauge de 3 rebonds, niveau « La Tour »,
  planches traversables, plateformes mobiles, scies, points de contrôle.
- **Reste à faire** : abandonné à l'étape 3 (demande d'un jeu horizontal).

### 17/11/2026 — Étape 1 : fondations (commit `d7420e7`, v0.1.0)
- **Ajouté** : moteur physique maison, contrôle « charge et saut », caméra, scène de test, tests automatiques.
- **Reste à faire** : remplacé par les étapes suivantes.

---

## Comment tenir ce document à jour

Après **chaque étape importante** (nouvelle fonctionnalité, refonte, nouveau niveau ou monde, correction
notable) :

1. Ajouter une entrée **en haut** du [Journal des modifications](#11-journal-des-modifications) : date, ajouté,
   modifié, reste à faire (et le commit si disponible).
2. Mettre à jour la **Roadmap** (✅ / 🟡 / 🔴) et la **Liste des tâches**.
3. Mettre à jour les sections touchées : Gameplay, Architecture (nouveaux fichiers), Interface, Progression.
4. Ajouter les nouvelles **Optimisations** et mettre à jour les **Bugs connus** (corrigés → retirés ou notés
  ✅, nouveaux → ajoutés).
5. Mettre à jour l'en-tête (date, version, étape en cours) et `src/shared/version.js` / `package.json` si la
  version change.
