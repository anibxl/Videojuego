# 🏀 Hoop Bounce — Documentation officielle du projet

> **Mémoire permanente du projet.** Ce fichier est mis à jour après chaque étape importante du
> développement (voir la section [Comment tenir ce document à jour](#comment-tenir-ce-document-à-jour)).
>
> **Dernière mise à jour :** 20/11/2026 · **Version :** 1.0.0 (build 1) · **Version de test :**
> `HoopBounce_Test_v1.apk` (1.0.0-test1) · **Étape en cours :** essais de la version de test Android sur
> téléphone par le porteur du projet et ses amis (étape 20) ; rien n'est publié sur le Play Store.

## Sommaire

1. [Présentation du jeu](#1-présentation-du-jeu)
2. [Gameplay](#2-gameplay)
3. [Architecture](#3-architecture)
4. [Interface](#4-interface)
5. [Progression](#5-progression)
5 bis. [Publication Google Play](#5-bis-publication-google-play-version-100)
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
- ◀ / ▶ accélèrent le ballon : pleine vitesse (7,5 u/s) en ~0,27 s au sol (accélération 28 u/s²).
- Appuyer dans l'autre sens freine franchement (×1,9).
- Relâché, le ballon continue de rouler et ralentit doucement (inertie).
- En l'air, le contrôle est réduit (15 u/s², un peu plus de la moitié du sol : assez pour corriger une
  trajectoire) et l'élan est conservé.
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
  planche traversable 0,55 · trampoline 0,30 (+ propulsion) · glace 0,50 · neige 0,48 · roche 0,55 · bois 0,50 ·
  caisse 0,12 · astéroïde 0,60.
- **Adhérence** (`grip`) : la glace (0,22) réduit l'accélération et le freinage au sol ; sa faible résistance
  au roulement laisse filer le ballon. Les rebonds gardent exactement leur hauteur sur toutes les surfaces.
- **Gravité du niveau** : réglable par monde (`gravityScale`, `jumpScale`) ; l'Espace a une gravité ×0,55 et
  des rebonds 25 % plus hauts (même rapport entre les 5 niveaux de puissance).
- **Gravité inversée** (zones de l'Espace) : le ballon « tombe » vers le plafond ; REBOND le renvoie vers le
  bas ; même dribble, même puissance, tout est simplement retourné.
- Frottement de Coulomb couplé à la rotation (le ballon prend de l'effet, roule, « mord » les surfaces).
- Inertie d'une sphère creuse (vrai ballon de basket : I = 2/3·m·r²).
- Unités : 1 u ≈ 30 cm ; rayon du ballon 0,4 u (≈ 12 cm).

### Règles
- Le panier n'est validé que lorsque le ballon est **entièrement passé** dans le cercle (centre sous le cercle
  d'au moins un rayon, dans l'axe du filet).
- Un ballon qui entre puis **ressort par le haut** (rebond sur le cercle) ne compte pas.
- Un ballon qui passe **par en dessous** du cercle ne compte pas.
- **Pics**, **chute dans le vide**, **lave**, **feu**, **pierres**, **stalactites**, **eau**, **scies**,
  **boulets**, **lasers**, **jets de flammes**, **projectiles de canon**, **pilons**, **rochers qui dévalent**,
  **cœur d'un trou noir** : le ballon éclate et le niveau recommence (étoiles comprises)…
- … **sauf si un point de contrôle (drapeau) a été atteint** : l'écran **« Niveau échoué »** propose
  **Recommencer** ou **Regarder une publicité → Continuer depuis le dernier checkpoint** (étape 13). On
  réapparaît alors au drapeau en gardant les étoiles déjà ramassées (les plateformes fragiles, plaques qui
  tombent, caisses, stalactites et lianes reprennent leur état de départ). **S'il n'y a aucune publicité
  disponible** (pas de réseau) ou si la limite du jour est atteinte, la reprise est **offerte** : le joueur
  n'est jamais puni. Les niveaux longs et difficiles ont un ou deux drapeaux.
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

**Éléments des mondes (étape 7)** — chacun a sa règle, son dessin, ses sons, ses particules et un test :

| Monde | Élément | Comportement |
|---|---|---|
| Ville | **Caisse à pousser** | bloc lourd soumis à la gravité ; le ballon la pousse en roulant contre elle (2,6 u/s) ; elle s'arrête dès qu'on ne pousse plus, bute contre les blocs, tombe dans les trous (pont) ; on peut monter dessus (marche) |
| Neige | **Sol glissant / plateformes de glace** | adhérence ×0,22 : on met du temps à accélérer et à s'arrêter |
| Neige | **Rampes de glace** | polygones inclinés : on les dévale très vite (impossible de les remonter) |
| Neige | **Vent de neige** | zone de poussée horizontale en rafales (sensible surtout en l'air) |
| Neige | **Stalactites** | tremblent 0,45 s quand le ballon passe dessous, tombent, tuent, se brisent au sol, repoussent |
| Volcan | **Lave** | mortelle au contact ; surface ondulante, bulles, lueur |
| Volcan | **Plateformes fragiles** | tremblent et se fissurent au contact, disparaissent après 0,5 s, reviennent après 2,8 s |
| Volcan | **Geysers de feu** | jet périodique (3,2 s, dont 1,1 s de feu), fumée d'avertissement 0,75 s avant ; mortels pendant le jet |
| Volcan | **Chutes de pierres** | rocher qui tombe toujours au même endroit, à intervalles réguliers ; ombre qui grandit au sol pour prévenir |
| Volcan | **Ascenseurs de pierre** | plateformes verticales (dalle, chaînes, runes incandescentes) |
| Forêt | **Lianes** | on les attrape en les touchant en l'air ; ◀ ▶ donnent de l'élan (balancement) ; REBOND lâche prise avec l'élan + un petit saut ; physiquement une corde (contrainte de distance) |
| Forêt | **Plateformes en bois** | blocs et planches de bois (son « toc » creux) |
| Forêt | **Champignons rebondissants** | propulsent à une hauteur propre à chaque champignon, sans toucher à la puissance |
| Forêt | **Troncs qui roulent** | corps ronds mobiles, solides ; on saute par-dessus ou on monte dessus |
| Forêt | **Branches mobiles** | planches traversables qui bougent (on monte par en dessous) |
| Forêt | **Rivière** | eau mortelle (éclaboussure) |
| Espace | **Gravité réduite** | réglage du monde (×0,55) : on flotte, on saute plus haut et plus loin |
| Espace | **Astéroïdes mobiles** | obstacles ronds, solides, qui dérivent |
| Espace | **Portails** | téléporteurs à double sens (A ⇄ B), vitesse conservée |
| Espace | **Plateformes flottantes** | flottent doucement (réacteurs bleus) |
| Espace | **Gravité inversée** | zones où la gravité s'inverse : on roule au plafond au-dessus des pièges |

**Pièges de l'étape 9 (tous les mondes)** — toujours annoncés avant de frapper, pour que chaque échec
paraisse mérité :

| Piège | Comportement | Avertissement |
|---|---|---|
| **Plaque qui tombe** | tremble 0,4 s quand on se pose dessus, puis chute en emportant le ballon ; revient 3 s plus tard | tremblement, fissures orange |
| **Bloc temporisé** (plateforme ou mur) | apparaît et disparaît selon un cycle (3 s, solide 1,8 s) ; ne réapparaît jamais sur le ballon | clignote avant de disparaître ; silhouette en pointillés quand il est absent |
| **Scie mobile** | disque qui tourne sur un rail (aller-retour) ; mortelle | rail visible, trajectoire prévisible |
| **Boulet qui se balance** | pendule régulier au bout d'une chaîne (boule de glace, de roche brûlante, tronc à pointes…) ; mortel | mouvement régulier et visible |
| **Laser temporisé** | faisceau entre deux émetteurs, allumé une partie du cycle ; mortel quand il est allumé | grésillement en pointillés 0,7 s avant, émetteurs qui s'allument |
| **Aimant** | attire (rouge) ou repousse (bleu) le ballon dans un rayon donné | ondes du champ, cercle de portée |
| **Canon** | tire des projectiles en ligne droite (boulets, boules de neige, boules de feu, plasma), à vitesse constante, jusqu'au premier obstacle ; peut aussi tirer vers le haut (colonne de feu) | la bouche rougeoit 0,5 s avant le tir |
| **Point de contrôle** | drapeau : réapparition sur place après une chute, étoiles conservées | drapeau qui se déploie |

**Pièges de l'étape 10 (propres à chaque monde)** — même règle : toujours annoncés, toujours prévisibles
(fonctions pures du temps), mortels au contact :

| Piège | Où | Comportement | Avertissement |
|---|---|---|---|
| **Pilon** (`crushers`) | Ville : presse hydraulique · Neige : bloc de glace · Volcan : broyeur de pierre · Forêt : tronc-marteau · Espace : piston | bloc lourd sur une tige qui attend en haut, s'écrase d'un coup jusqu'au sol (0,14 s), y reste 0,35 s puis remonte lentement (0,9 s) ; on passe dessous juste après sa remontée | tremblement 0,5 s, bande rouge au sol, choc et poussière à l'impact |
| **Rocher qui dévale** (`boulders`) | Neige : boule de neige · Volcan : rocher de lave · Forêt : rondin · Espace : boule de plasma | part d'un bout de sa piste à chaque cycle et roule à vitesse constante jusqu'à l'autre, puis disparaît (crevasse, bassin, rebord) ; on le saute ou on passe au-dessus | grondement, poussière et flèche rouge au point de départ 0,7 s avant |
| **Jet de flammes** (laser au style « flamme ») | Volcan | souffle de feu qui sort d'une bouche de pierre, horizontal ou vertical (colonne de feu dans la lave) | la bouche rougeoie et crache des étincelles |
| **Trou noir** (aimant avec un cœur) | Espace | attire le ballon comme un aimant ; son cœur (horizon noir) est mortel | spirales de matière aspirée, disque d'accrétion, cercle de portée |

Règle de placement : un rocher ne part jamais sous le ballon sans prévenir (son point de départ est une marche,
une souche ou un rebord visible, et le grondement le précède), un pilon laisse toujours au moins ~1 s pour passer.

Le moteur gère aussi, sans qu'il soit utilisé dans les niveaux actuels : le **panier fixé au mur**.

### Objets

- **Étoiles** (3 par niveau) : scintillement, son ascendant, étoile qui s'allume dans le HUD.
- **Pièces** : gagnées en terminant les niveaux et en obtenant des étoiles (voir [Les récompenses](#les-récompenses)),
  dépensées dans la boutique.

### Futurs ajouts (gameplay)

Voir aussi [Idées futures](#8-idées-futures).
- Nouveaux éléments : surfaces collantes, interrupteurs à minuterie, paniers mobiles.
- Modes prévus (présentés dans le menu, pas encore développés) : **Endless**, **Course Multijoueur**,
  **Créateur de Maps** — voir [Modes à venir](#modes-à-venir-étape-19).
- Nouveaux articles de boutique (saisons, événements).

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
├── worlds.html             Ancienne carte des mondes : renvoie vers la sélection du menu (index.html#mondes)
├── shop.html               Boutique (pièces, ballons, effets, traînées, animations de panier)
├── play.html               Écran de jeu (?world=snow&level=1, &intro=1 pour l'introduction du monde)
├── PROJECT.md              Ce document (documentation officielle, mémoire du projet)
├── README.md               Guide rapide : lancer, tester, régler
├── package.json            Version et scripts (npm start, npm test)
├── capacitor.config.json   Application Android : identifiant com.echospeed.hoopbounce, nom, dossier web (www/)
├── android/                Projet Android natif (Capacitor 8) : manifeste, icônes, écran de démarrage, signature
├── store/                  ★ Fiche Google Play : icône, feature graphic, captures, textes, checklist, confidentialité
├── native/
│   └── android/README.md   Projet Android et AdMob : ce qui est en place, synchronisation, vrais identifiants
├── assets/
│   └── fonts/              Polices embarquées + licences OFL
│       ├── unbounded.woff2     Titres, logo, boutons principaux (latin, ~50 Ko)
│       ├── outfit.woff2        Textes de l'interface (latin, ~32 Ko)
│       └── LICENSE-*.txt       Licences SIL Open Font License 1.1
├── css/
│   ├── fonts.css           Déclaration des polices (@font-face)
│   ├── boot.css            Écran de chargement (logo, ballon qui rebondit, barre, fondu vers le menu)
│   ├── menu.css            Styles du menu (accueil, pages, fenêtres, animations)
│   ├── menu-views.css      Styles des pages Mondes (cartes, niveaux) et Collection du menu
│   ├── live.css            Récompense quotidienne, Missions, Succès, Bonus (coffre, roue), révélation des récompenses
│   ├── shop.css            Styles de la boutique
│   ├── polish.css          Finitions communes à toutes les pages (onde au toucher, boutons, transitions,
│   │                       bouton « Regarder une publicité », annonce de test simulée)
│   └── style.css           Styles de l'écran de jeu (HUD, commandes, pause, victoire, tutoriel, intro de monde)
├── src/
│   ├── config.js           ★ TOUS les réglages : physique, matériaux, commandes, caméra, sensations
│   ├── boot/boot.js        Écran de chargement : étapes réelles, barre, particules, sortie vers le menu
│   ├── main.js             Écran de jeu : assemble tout, niveaux, pause, victoire, progression
│   ├── core/               Briques de base, sans dépendance au navigateur
│   ├── physics/            Moteur physique (sans navigateur)
│   ├── game/               Règles du jeu (sans navigateur)
│   │   ├── worlds.js       ★ Les 5 mondes (identité, mécaniques, réglages, niveaux)
│   │   └── levels/         Les niveaux par monde (données) + README du format
│   ├── render/             Rendu Canvas du jeu (thèmes des mondes)
│   ├── audio/              Sons et musique du jeu
│   ├── worlds/             Carte des mondes (illustrations animées, déblocage, choix du niveau)
│   ├── shop/               Boutique (grille, aperçu animé, achats, textes)
│   ├── input/              Entrées tactiles et clavier du jeu
│   ├── platform/           Fonctions propres à l'appareil (vibrations)
│   ├── menu/               Tout le menu principal
│   └── shared/             Ce que le menu, la boutique et le jeu partagent (réglages, porte-monnaie,
│                           statistiques, récompenses quotidiennes, missions, succès, coffres,
│                           publicités récompensées, coffre bonus et roue de la chance)
├── tools/build-web.mjs     Prépare www/ (fichiers du jeu seulement) pour l'application Android
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
| `src/game/levels/` | Les niveaux, décrits comme de simples données, un fichier par monde ; `README.md` décrit le format complet. |
| `src/render/` | Tout ce qui se dessine pendant la partie : décor de chaque monde, surfaces, éléments, caméra, ballon, effets. |
| `src/audio/` | Effets sonores et musique des mondes (synthétisés). |
| `src/worlds/` | Carte des mondes : cartes animées, cadenas, animation de déblocage, choix du niveau. |
| `src/shop/` | Boutique : onglets, grille d'articles, aperçu animé, achat, équipement, textes FR/EN/ES. |
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
| `main.js` | Écran de jeu : crée la partie, le rendu, la caméra, le son, la musique ; branche les événements (effets, sons, vibrations, y compris ceux des mondes) ; HUD (couleur du monde), pause, victoire (fin de monde, déblocage), tutoriel, introduction des mondes, transition entre mondes, enchaînement des niveaux, sauvegarde de la progression. |

**`src/core/`**

| Fichier | Rôle |
|---|---|
| `loop.js` | Boucle à pas fixe (« fix your timestep ») avec interpolation, ralenti (`timeScale`), protection contre les longues pauses. |
| `time-fx.js` | Effets de temps (étape 18) : ralentis et arrêts sur image à trois phases (entrée, maintien, retour en douceur) ; le plus fort l'emporte. |
| `math.js` | Outils : `clamp`, `lerp`, lissage critique (`smoothDamp`), amortissement, point le plus proche sur un segment, générateur aléatoire déterministe. |
| `events.js` | Bus d'événements minimal (logique → présentation). |

**`src/physics/`**

| Fichier | Rôle |
|---|---|
| `ball-body.js` | Le ballon : intégration, sous-pas adaptatifs, résolution des contacts (rebond, frottement, rotation), surfaces mobiles, planches traversables, détection du sol, sens de la gravité (inversée), matériau du sol (glace), formes désactivées (plateformes effondrées). |
| `colliders.js` | Formes de collision : une seule primitive, la « capsule » (segment épaissi) ; cercles, polygones, planches traversables. |
| `world.js` | Le monde : liste des formes, éléments mobiles, recherche de la surface sous un point (ombre du ballon). |
| `mover.js` | Trajets aller-retour en douceur et plateformes mobiles (position et vitesse exactes à chaque instant). |

**`src/game/`**

| Fichier | Rôle |
|---|---|
| `game.js` | Une partie : états (en jeu / chute / victoire), pas de simulation, contacts, trampolines, champignons, interrupteurs, ventilateurs, vent, zones de gravité, caisses, lianes, plateformes fragiles, stalactites, geysers, chutes de pierres, téléporteurs, étoiles, pièges, panier ; `load()` pour changer de niveau. |
| `ball-controller.js` | Les commandes : déplacement avec inertie (selon l'adhérence du sol), dribble (rebond au sol, renvoi vers le sol en l'air, dans le sens de la gravité), puissance à 5 niveaux et son retour quand le ballon reste au sol ; gravité du niveau. |
| `level.js` | Construit un niveau jouable (formes physiques, éléments, panier) à partir de ses données. |
| `worlds.js` | Les 5 mondes : identité (nom, accroche, couleur), mécaniques présentées, réglages physiques, niveaux ; liste à plat `LEVELS`. |
| `levels/city.js` … `space.js` | Les niveaux de chaque monde (données). `common.js` : briques communes ; `index.js` : compatibilité ; `README.md` : format. |
| `elements.js` | Porte coulissante, ventilateur, téléporteur (sens unique ou double sens). |
| `world-elements.js` | Éléments des mondes : caisse, vent, stalactite, lave/eau, plateforme fragile, geyser, chute de pierres, liane, zone de gravité ; pièges de l'étape 9 : plaque qui tombe, bloc temporisé, boulet, laser, aimant (et trou noir), canon ; pièges de l'étape 10 : pilon, rocher qui dévale. |
| `hazards.js` | Tests de contact avec les pics et les scies (avec marge de tolérance). |
| `hoop.js` | Le panier : formes de collision, détection d'un panier valide (en deux temps), filet. |
| `net.js` | Filet simulé (Verlet + contraintes de cordes), qui réagit au ballon. |
| `progress.js` | Progression enregistrée sur l'appareil : niveaux terminés, étoiles, meilleurs temps, mondes débloqués (et déjà annoncés), statistiques par monde ; conversion de l'ancien format. |
| `i18n.js` | Textes de l'écran de jeu en français, anglais et espagnol. |

**`src/render/`**

| Fichier | Rôle |
|---|---|
| `renderer.js` | Dessine une image : décor du monde, éléments, panier (arrière puis avant pour que le ballon passe « dedans »), ballon, effets, particules d'ambiance de premier plan, vignette teintée, jauge, débogage. |
| `themes.js` | Identité visuelle des 5 mondes : ciel, astres, plans de décor, particules, lumière, couleurs des surfaces. |
| `background.js` | Décor d'un monde : ciel précalculé (dégradés, nébuleuses, étoiles, soleil, lune, Terre, planète), plans en parallaxe (immeubles avec fenêtres, graffitis et lampadaires ; montagnes enneigées et sapins ; volcans en éruption et roches ; arbres, champignons et rivière ; astéroïdes et cratères), brume, rayons de lumière, particules d'ambiance ; effets d'identité (enseignes au néon, avions, nuages de froid, chaleur, papillons, débris en apesanteur). |
| `world-draw.js` | Dessin des surfaces selon le monde (matériaux), des pics et plateformes thématiques, des éléments des mondes et des pièges (plaques, blocs temporisés, scies, boulets, lasers, aimants, canons). |
| `cosmetics.js` | Cosmétiques de la boutique : petit système de particules préalloué (`Fx` : points, anneaux, étoiles, bulles, étincelles, éclairs, pièces, serpentins, fumée, halos, flammes), 9 effets de rebond, 10 traînées, 10 animations de panier. |
| `ball-sprite.js` | Textures des 25 ballons (cuir, coutures, motifs, matières, facettes, spirale, veines d'énergie), générées au démarrage ; `drawFace` dessine le visage des ballons amusants (droit, regarde dans le sens du mouvement, cligne des yeux, yeux qui roulent) ; `drawAura` l'aura des légendaires ; `skinInfo` dit ce qu'il faut dessiner. |
| `camera.js` | Caméra : lissage, anticipation dans le sens de la course (et de la direction demandée), cadrage qui garde le sol au-dessus des commandes, secousses, zoom et cadrage sur le panier à la victoire, recul quand le ballon monte haut, coups de zoom amortis ; étape 18 : impulsions directionnelles (poids des atterrissages), regard vers le bas en chute, plan d'ouverture, mouvements réduits si le système le demande. |
| `world-fx.js` | Effets propres à chaque monde (étape 18) : matière soulevée au contact, particules de roulement, gerbe des rebonds à pleine puissance, lucioles, réaction du décor (feuilles, neige, cendres, poussière, poussière d'étoiles qui tombent). |
| `confetti.js` | Confettis de victoire par-dessus l'écran de victoire (canvas en coordonnées écran ; boucle arrêtée dès qu'il n'y en a plus). |
| `ball-sprite.js` | Textures du ballon générées au démarrage (cuir et coutures qui tournent, reflet fixe). |
| `ball-visual.js` | Déformations du ballon (écrasement à l'impact, étirement en vol, détente au rebond, étirement au dribble). |
| `particles.js` | Particules (poussière, confettis, scintillements, ondes, éclats, traits de vitesse, éclairs, nuages, braises et feuilles, lucioles) et textes flottants, avec réservoirs préalloués (384 particules depuis l'étape 18). |

**`src/audio/`, `src/input/`, `src/platform/`**

| Fichier | Rôle |
|---|---|
| `audio/ui-voice.js` | Identité sonore (étape 18) : timbre « pop », gamme pentatonique, motif du rebond ; tous les sons d'interface (boutons, pages, sélection, onglets, équipement, achat par rareté, pièces, récompenses, coffres, roue), partagés par le menu, la boutique et le jeu. |
| `audio/sfx.js` | Sons du jeu synthétisés. Étape 18 : voix de chaque surface selon le monde (`surfaceOf`), roulement et souffle continus, réverbération par monde, stéréo selon la position à l'écran, rebond en couches, filet, panier parfait, échec, apparition. Avant : impacts selon la surface (glace, neige, bois, roche, astéroïde, écho dans l'espace), rebond, dribble, trampoline, téléporteur, interrupteur, porte, vent continu (ventilateur, vent de neige), étoiles, chute (grésillement dans la lave, éclaboussure dans l'eau), victoire, monde débloqué, et les sons des mécaniques (stalactites, plateformes fragiles, geysers, pierres, lianes, champignons, gravité, caisse). |
| `audio/music.js` | Musique et ambiance de chaque monde, synthétisées (séquenceur à programmation anticipée, fondu enchaîné entre mondes, musique baissée en pause et à la victoire). Étape 18 : forme A/B en 8 mesures avec roulement, couche d'intensité dynamique, réverbération par monde, jingles de victoire / panier parfait / échec dans la tonalité du monde, ambiances enrichies, grondements signalés au jeu (`onAmbient`). |
| `worlds/redirect.js` | Ancienne carte des mondes : renvoie vers `index.html#mondes` (garde `?world=` et `?unlock=all`). |
| `worlds/art.js` | Illustration animée de chaque monde (diorama dessiné avec le vrai décor et les vrais éléments du monde), utilisée par les cartes des mondes du menu. |
| `input/input.js` | Zones tactiles (moitié gauche = direction, moitié droite = rebond), multi-doigts, clavier. |
| `platform/haptics.js` | Vibrations (API Vibration ; à remplacer par Capacitor Haptics). |

**`src/boot/`**

| Fichier | Rôle |
|---|---|
| `boot.js` | Écran de chargement (script classique, exécuté avant tout le reste) : suit les étapes réelles du chargement (polices, page, code du menu, première image du décor), anime la barre et les particules, puis fondu + léger zoom vers le menu. Ne s'affiche qu'au lancement (pas au retour d'une partie). Expose `window.__boot` (`done(étape)`, `revealed`, `finished`). |

**`src/menu/`**

| Fichier | Rôle |
|---|---|
| `main.js` | Menu : navigation (avec le bouton retour d'Android), effet de pression des boutons, sons, vibrations, réglages appliqués en direct, fenêtres, lancement de la partie ; niveau à reprendre sous JOUER et progression sur les tuiles ; rafraîchissement au retour de la boutique ou d'une partie. |
| `scene.js` | Décor vivant du menu (salle de basket la nuit, projecteurs, parquet verni, panier, ballon qui rebondit, poussières, parallaxe), avec 3 niveaux de qualité. |
| `pages.js` | Contenu HTML des pages statiques « Modes à venir » (3 cartes illustrées en SVG animé) et Paramètres. |
| `worlds-view.js` | Page Mondes : 5 cartes de mondes (illustration, progression, cadenas et condition), animation de déblocage, grille des 10 niveaux, lancement de n'importe quel niveau débloqué. |
| `collection-view.js` | Page Collection : articles possédés par catégorie, aperçu animé, Équiper / Déséquiper, badge « Équipé ». |
| `live-views.js` | Pages Récompense quotidienne (calendrier de 7 jours), Missions (3 par jour) et Succès (4 paliers), pastilles de l'accueil. |
| `about-page.js` | Page « À propos » (étape 16) : identité du jeu, version, créateur, copyright, crédits, liens (politique de confidentialité, conditions d'utilisation). |
| `bonus-view.js` | Page Bonus du jour (étape 13) : coffre bonus (gratuit ou amélioré avec une publicité) et roue de la chance (rotation, ralentissement, clics, pointeur). |
| `rewards-fx.js` | Révélation d'une récompense : coffre qui tombe, tremble et s'ouvre, rayons, butin, pluie de pièces, pièces qui filent vers le compteur. |
| `sound.js` | Musique d'ambiance du menu (avec le motif du rebond toutes les 4 mesures) ; les sons d'interface viennent de la voix partagée `audio/ui-voice.js`. |
| `icons.js` | Icônes SVG dessinées à la main. |
| `i18n.js` | Textes du menu en français, anglais et espagnol. |

**`src/shared/`**

| Fichier | Rôle |
|---|---|
| `catalog.js` | Catalogue de la boutique (articles, raretés, prix, textes) et barème des pièces. |
| `wallet.js` | Porte-monnaie et inventaire : pièces gagnées, articles possédés et équipés, étoiles déjà récompensées ; articles donnés (récompenses), articles achetés. |
| `stats.js` | Statistiques du joueur : compteurs à vie (succès) et du jour (missions), remis à zéro à minuit (heure locale). |
| `rewards.js` | Récompenses communes : pièces, coffres (commun, rare, épique), articles exclusifs, article au hasard ; doublons convertis en pièces. |
| `daily.js` | Récompense quotidienne : calendrier de 7 jours, une récompense par jour, mémorisée, nouveau cycle après le 7e jour. |
| `missions.js` | Missions quotidiennes : 9 modèles, 3 missions tirées par jour (facile, moyenne, difficile), progression, récompenses. |
| `achievements.js` | Succès : 40 succès sur 4 paliers, mesure de la progression, récompenses à récupérer. |
| `live-i18n.js` | Textes des missions, des succès, des paliers, des coffres et de la page Bonus (FR / EN / ES), partagés par le menu et le jeu. |
| `ads-config.js` | ★ **Configuration des publicités** (étape 13) : identifiants AdMob de test et de production, limites par jour, public et classification. **Le seul fichier à modifier avant la publication.** |
| `ads.js` | Gestionnaire centralisé des publicités récompensées : chargement à l'avance, affichage, validation de la récompense, erreurs, absence d'annonce, nouvelles tentatives, moments interdits, limites du jour. Fournisseurs AdMob (Android) et annonce de test (navigateur). |
| `about.js` | ★ **Contenu de la page « À propos »** (étape 16) : nom, créateur, première année du copyright, liste des crédits (rôle, noms, précision, icône), adresses des liens. **Le seul fichier à modifier pour ajouter un crédit ou relier un lien.** |
| `bonus.js` | Coffre bonus quotidien et roue de la chance (8 cases pondérées) : disponibilité, tirage, récompenses, sauvegarde. |
| `ui-polish.js` | Onde lumineuse au point touché sur les éléments interactifs de toutes les pages (sauf commandes de jeu). |
| `settings.js` | Réglages du joueur (musique, effets, vibrations, langue, qualité), enregistrés et corrigés s'ils sont abîmés. |
| `version.js` | Numéro de version affiché dans les paramètres. |

**Tests et outils**

| Fichier | Rôle |
|---|---|
| `tests/physics.test.mjs` | Moteur physique : chute libre, rebonds, repos sans tremblement, aucune traversée, roulement, déterminisme, planches traversables, surfaces mobiles. |
| `tests/game.test.mjs` | Commandes (dribble, puissance, inertie), éléments (trampoline, pics, ventilateur, porte, téléporteur, plateforme, vide), panier. |
| `tests/shop.test.mjs` | Boutique : catalogue, raretés et fourchettes de prix (étape 17), gains de pièces inchangés, achats, équipement, nouveaux objets sauvegardés et toujours équipés après relance, visages et auras, nouveaux effets dessinés, textes. |
| `tests/mechanics.test.mjs` | Les pièges de l'étape 9 (plaque, bloc temporisé, scie, boulet, laser, canon, aimant, drapeau) et les 21 mécaniques des mondes (caisse, glace, rampe, vent, stalactite, lave, plateforme fragile, geyser, pierres, ascenseur, liane, champignon, tronc, branche, gravité réduite, portails, astéroïde, gravité inversée). |
| `tests/progress.test.mjs` | Progression (déblocage des mondes, statistiques, animation annoncée une fois, conversion de l'ancien format), mondes, textes de jeu dans les trois langues. |
| `tests/menu.test.mjs` | Textes du menu dans les trois langues, réglages. |
| `tests/about.test.mjs` | Page À propos : version 1.0.0, créateur, copyright, crédits demandés et traduits, liens intégrés / « Bientôt » sans adresse, vrais liens externes avec adresse. |
| `tests/ads.test.mjs` | Publicités : identifiants test / production, récompense seulement si l'annonce va au bout, moments interdits, limites du jour sauvegardées, coffre bonus (une fois par jour, amélioré plus riche), roue (lancer gratuit, lancers bonus, tirage pondéré). |
| `tests/live.test.mjs` | Statistiques (jour, minuit), coffres et doublons, récompense quotidienne (une par jour, 7 jours, cycle), missions (tirage, renouvellement, récompense unique), succès (paliers, progression, récupération), textes. |
| `tests/routes.test.mjs` | Chaque passage de chaque niveau reste faisable (solutions enregistrées + solutions expertes). |
| `tests/fixtures/test-yard.js` | Terrain d'essai pour les tests de mécanique (indépendant des niveaux). |
| `tests/fixtures/routes.json` | Solutions enregistrées des passages (générées par l'outil). |
| `tools/route-check.mjs` | Outil de level design : essaie des centaines de séquences de commandes par passage et mesure la difficulté ; « pilote » pour écrire les solutions expertes (rouler jusqu'à, charger, sauter, viser). |

### Ajouter un niveau ou un élément

- **Niveau** : l'ajouter dans le fichier de son monde (`src/game/levels/<monde>.js`, format complet dans
  `src/game/levels/README.md`), ajouter son nom et ses aides dans `src/game/i18n.js`, ajouter ses passages dans
  `tools/route-check.mjs`, puis `node tools/route-check.mjs 400 --save`.
- **Élément** : ses données dans le niveau, sa construction dans `game/level.js`, sa logique dans
  `game/world-elements.js` et `game/game.js`, son dessin dans `render/world-draw.js`, ses sons dans
  `audio/sfx.js`, ses effets dans `main.js`, un test dans `tests/mechanics.test.mjs`.
- **Monde** : son entrée dans `game/worlds.js`, son thème dans `render/themes.js` (et ses formes dans
  `background.js` si besoin), son morceau dans `audio/music.js`, sa scène dans `worlds/art.js`, ses textes.

---

## 4. Interface

### Écran de chargement (au lancement)

Le premier écran du jeu, affiché dès l'ouverture (il ne dépend que de `css/boot.css` et `src/boot/boot.js`) :

- **Fond** : dégradé bleu nuit vers le noir, faisceau de projecteur venu d'en haut qui respire lentement, halo
  orange derrière le logo, lueurs bleue et violette dans les coins ; **particules** (poussières lumineuses
  chaudes et froides, quelques halos flous) qui montent en ondulant.
- **Logo** au centre : **HoopBounce** en grand (« Hoop » blanc, « Bounce » dégradé orange, police Unbounded),
  puis **« Par EchoSpeed »** (« By » / « Por » selon la langue). Entrée douce : les deux mots montent en se
  précisant (flou → net), un **reflet** traverse le logo, la signature apparaît en resserrant ses lettres. Le
  texte attend que la police soit chargée (aucun changement de police visible).
- **Ballon de basket** au-dessus du logo qui **rebondit doucement** (chute accélérée, remontée qui ralentit,
  écrasement au contact, rotation, ombre qui grandit et s'assombrit à l'impact).
- **Barre de progression** fine et discrète en bas (orange lumineux) : elle avance avec les étapes réelles du
  chargement.
- **Sortie** : la barre se remplit, puis l'écran **s'efface en fondu avec un léger zoom** pendant que le décor
  du menu arrive (léger dézoom) et que l'accueil fait son entrée animée. Aucune coupure.
- **Durée** : le temps du chargement, avec un minimum de 1,1 s pour que le logo ait le temps d'apparaître
  (sinon il clignoterait) et un garde-fou de 8 s (le menu s'ouvre même si une étape ne répond pas). En local
  (application Android), l'écran dure ≈ 1,5 s puis 0,9 s de transition.
- **Seulement au lancement** : en revenant d'une partie, de la boutique ou d'une page du menu (même session),
  le menu s'ouvre directement. `?noboot` dans l'adresse le désactive (tests).
- Mouvement réduit (réglage du système) : pas de zoom ni de faisceau animé, rebond plus lent.

### Menu principal (`index.html`)

**Décor vivant (canvas)** : salle de basket la nuit, tribunes avec lumières floues, bandeau LED où glisse un
reflet orange, faisceaux de projecteurs, parquet verni en perspective (lignes du terrain, reflets), panier au
loin dont le filet ondule, **ballon qui rebondit lentement** avec ombre et reflet, poussières dans la lumière,
dérive lente de la caméra et **parallaxe sur 4 plans** (suit aussi le doigt / la souris). Le décor s'assombrit
et recule légèrement quand une page est ouverte.

**Accueil**
- Logo : ballon vectoriel + « HOOP » (blanc) / « BOUNCE » (dégradé orange), police Unbounded ; slogan.
- Bouton **JOUER** : seul élément chaud et lumineux de l'écran, lueur qui « respire », reflet qui balaie.
- Sous JOUER : **le niveau à reprendre** (« Monde 2 · Niveau 3 — Stalactites »), ou « Tous les niveaux sont
  terminés ! ».
- **Dock** de 5 tuiles : Mondes, Modes, Magasin, Collection, Paramètres (chaque tuile a sa couleur d'accent) ;
  **pastilles de progression** sur Mondes (niveaux terminés / 50) et Collection (articles possédés / 25).
- Solde de **pièces** en haut à droite (ouvre la boutique). Tout est relu au retour d'une partie ou de la
  boutique.
- **Cadeau, Missions, Succès** (étape 12) : trois boutons en haut à droite, chacun avec sa couleur ; une
  **pastille rouge** compte ce qui attend d'être récupéré et l'icône s'agite doucement. Sur petit écran, seules
  les icônes restent.
- **Bonus** (étape 13) : quatrième bouton (icône de roue, orange), pastille quand le coffre du jour ou le lancer
  gratuit attend.
- **Première visite du jour** : la page Récompense quotidienne s'ouvre d'elle-même (une fois par jour).

**Pages**

| Page | Contenu |
|---|---|
| **Mondes** (étape 11) | Vraie **sélection des mondes**, puis des niveaux — voir [Sélection des mondes](#sélection-des-mondes-et-des-niveaux-indexhtmlmondes). |
| Modes à venir | 3 cartes de présentation verrouillées « 🔒 À venir » : Endless, Course Multijoueur, Créateur de Maps (étape 19, voir plus bas). Toucher une carte : tremblement, cadenas qui bascule, son sourd, message. |
| Magasin | La tuile ouvre la boutique (`shop.html`). |
| **Collection** (étape 11) | Tous les articles possédés, aperçu, Équiper / Déséquiper — voir [Collection](#collection-indexhtmlcollection). |
| **Récompense quotidienne** (étape 12) | Calendrier de 7 jours — voir [Revenir chaque jour](#revenir-chaque-jour-étape-12). |
| **Missions** (étape 12) | 3 missions du jour — voir [Revenir chaque jour](#revenir-chaque-jour-étape-12). |
| **Succès** (étape 12) | 40 succès sur 4 paliers — voir [Revenir chaque jour](#revenir-chaque-jour-étape-12). |
| **Bonus du jour** (étape 13) | Coffre bonus et roue de la chance — voir [Bonus du jour](#bonus-du-jour-indexhtmlbonus). |
| Paramètres | Musique, effets sonores (curseurs appliqués en direct), vibrations, qualité graphique (basse / moyenne / haute), langue (FR / EN / ES), politique de confidentialité, **À propos de Hoop Bounce** (ouvre la page À propos, étape 16), version. |
| **À propos** (étape 16) | Identité, version, créateur, copyright, crédits et liens — voir [À propos](#à-propos-indexhtmlapropos). |

### Écran de jeu (`play.html`)

- **HUD discret** : monde-niveau dans la couleur du monde (« 2-1 · Premières glissades ») et étoiles en haut à
  gauche ; recommencer et pause en haut à droite.
- **Commandes** : ◀ ▶ (bas gauche), grand bouton de rebond (bas droite) entouré de l'**anneau de puissance**
  (5 segments : blanc, ambre au niveau 4, or au niveau 5 ; le dernier cran clignote avant de redescendre).
- **Jauge au-dessus du ballon** : 5 barres croissantes (même code couleur), visible dès que la puissance monte.
- **Pause** : Reprendre, Recommencer, **Choisir un niveau** (ouvre directement les 10 niveaux du monde en cours
  dans le menu), Menu principal. Pause automatique quand l'application passe en arrière-plan. La carte s'ouvre
  avec un ressort et ses boutons arrivent l'un après l'autre ; petit son à chaque bouton.
- **Victoire** : niveau, « Panier ! », étoiles qui tombent une à une, temps (et « Nouveau record »),
  **« Récompense : 🪙 +45 »** (compteur qui défile), puis le bouton facultatif **« 🎁 Regarder une publicité →
  Doubler les pièces »** (étape 13). Il ne s'active qu'à la fin des animations de victoire. Après l'annonce
  validée, le compteur file jusqu'au double, un **« ×2 »** jaillit, des pièces éclatent autour du compteur et un
  son de cascade retentit. Annonce interrompue ou indisponible : petit message, le joueur continue normalement.
  Boutons
  Niveau suivant / Rejouer / **Niveaux** / Menu. Dernier niveau d'un monde : « Monde terminé ! », « Nouveau monde
  débloqué : … » (fanfare) et **Monde suivant**. Après le tout dernier niveau : « Bravo ! » et un message.
- **Niveau échoué** (étape 13, seulement si un drapeau a été atteint) : « Niveau échoué », étoiles gardées,
  **Recommencer** (bouton principal, Entrée / Espace) et **« 🎁 Regarder une publicité → Continuer depuis le
  dernier drapeau »** ; sans annonce disponible, le bouton devient doré : **« Continuer depuis le drapeau —
  Aucune publicité disponible : c'est offert »**. Liens Niveaux et Menu. Sans drapeau atteint, le niveau
  recommence aussitôt, comme avant (aucun écran en plus).
- **Annonce de test** (navigateur, développement) : écran sombre « Annonce de test AdMob — TEST », barre de
  5 s, croix pour fermer (fermer avant la fin = pas de récompense). Pendant une annonce, musique et sons se
  taisent.
- **Introduction d'un monde** : sur le décor du monde (la partie attend), « MONDE 2 », le nom en très grand
  (dégradé vers la couleur du monde), l'accroche, les 5 mécaniques en pastilles qui apparaissent en cascade,
  le niveau, « Touche pour jouer » (ou automatiquement après ~4 s). Affichée en arrivant depuis la carte, au
  premier niveau d'un monde, et après chaque transition entre mondes.
- **Tutoriel** (premier lancement du niveau 1) : étiquettes orange au-dessus des boutons (« Rouler »,
  « Rebondir · Appuie plusieurs fois ») qui disparaissent dès qu'on a roulé et rebondi 3 fois.
- **Textes d'aide** peints sur le décor dans chaque niveau.
- Message « Tourne ton téléphone » en portrait sur téléphone.

### Boutique (`shop.html`)

- **En-tête** : retour, onglets **Ballons / Visages / Rebonds / Traînées / Paniers** (avec le nombre possédé),
  progression de la collection (barre + 7/51), solde de pièces (« 612 480 », qui défile à chaque achat et
  tremble s'il manque des pièces).
- **À gauche** : **aperçu animé** de l'article choisi, combiné avec les autres articles équipés (ballon qui
  rebondit sur un parquet avec sa traînée et son effet de rebond ; tir dans un panier pour les animations),
  étiquette de rareté, nom, description et bouton : **Acheter · prix**, **Équiper**, **✓ Équipé**, ou
  « Il te manque N ».
  - **Objectif d'épargne** (étape 17) : barre « 112 480 / 1 000 000 » dans la couleur de la rareté pour tout
    article pas encore possédé.
  - Les articles verrouillés se prévisualisent comme les autres.
- **À droite** : grille d'articles triés par rareté puis par prix. Chaque carte montre :
  - la vignette dessinée avec le vrai rendu, le nom et la rareté en couleur ;
  - le prix, abrégé au-delà de 100 000 (« 650 k », « 1 M »), ou l'état « Possédé / Équipé » ;
  - un **cadenas** sur les articles non possédés et une coche sur l'article équipé.
  - Épiques : lueur violette. **Légendaires** : fond doré, bordure dorée qui respire et reflet animé.
  - Les cartes apparaissent en cascade. L'encart « Comment gagner des pièces » mentionne aussi les gains
    quotidiens.
- **Achat** : les pièces défilent, onde et étiquette de la couleur de la rareté, fanfare, vibration ; l'article
  est équipé aussitôt.
  - **Épique** : rayons violets qui tournent, éclats, « ÉPIQUE ! », son bonus.
  - **Légendaire** : grands rayons dorés, 26 éclats, étiquette dorée « LÉGENDAIRE ! » plus longue, vibration
    plus forte.
- `shop.html?item=ball-diamond` ouvre directement un article (bouton « Débloquer » de la Collection).
- Accès : tuile « Magasin » et solde de pièces du menu, bouton « Boutique » de la Collection ; le retour ramène
  à la page d'où l'on vient (accueil ou Collection).

### Sélection des mondes et des niveaux (`index.html#mondes`)

Refaite à l'étape 11 : plus de page « Bientôt disponible ». Tout se passe dans le menu, sans rechargement.

- **En-tête** : retour, « Mondes », fil d'Ariane (« Monde 2 · Neige » quand un monde est ouvert), **progression
  totale** (étoiles / 150, barre, pourcentage).
- **5 grandes cartes** qui défilent à l'horizontale (aimantées ; molette sur ordinateur) : 🏙️ Ville, ❄️ Neige,
  🌋 Volcan, 🌲 Forêt, 🌌 Espace. Chaque carte : **illustration animée** du vrai décor du monde (seule la carte
  au centre est animée), numéro, emoji et nom, « 10 niveaux », accroche, **barre de progression** qui se
  remplit à l'ouverture, étoiles (x/30) et niveaux terminés (x/10), badge « ✓ Terminé ».
- **Animations des cartes** : apparition en cascade, léger flottement du décor (décalé d'une carte à l'autre),
  la carte au centre se soulève et prend la lumière de son monde, reflet qui la balaie, élévation au survol.
- **Monde verrouillé** : décor éteint, **cadenas** et **condition de déblocage** (« Termine les 10 niveaux de
  Neige ») ; le toucher fait trembler le cadenas, avec un son sourd et un message.
- **Déblocage** (une seule fois par monde) : la carte vient au centre, le cadenas tremble, s'ouvre et s'envole,
  ondes et étincelles de la couleur du monde, « Monde débloqué ! », fanfare et vibration.
- **Ouvrir un monde** : les cartes glissent vers la gauche et **les 10 niveaux apparaissent aussitôt** (à gauche
  le monde : illustration, nom, accroche, progression ; à droite une grille 5 × 2). Chaque case : **numéro**,
  nom, **étoiles obtenues (0 à 3)**, **coche** si terminé, **cadenas** si verrouillé, pastille de difficulté ;
  le prochain niveau à jouer « respire » avec l'étiquette « À jouer ». Les cases arrivent une à une.
- **Rejouer n'importe quel niveau débloqué** d'un toucher (la case grossit, rideau, partie) — plus besoin de
  finir une partie pour choisir un autre niveau. Un niveau verrouillé tremble et dit lequel terminer d'abord.
- Retour (bouton, Échap, retour Android) : d'abord aux cartes des mondes, puis à l'accueil.
- Liens : `index.html?world=snow#mondes` ouvre directement les niveaux de la Neige (bouton « Choisir un
  niveau » de la partie) ; `?unlock=all` ouvre tout pour tester ; l'ancienne adresse `worlds.html` y renvoie.

### Collection (`index.html#collection`)

Corrigée à l'étape 11 (elle restait vide : elle lisait un ancien catalogue vide au lieu de l'inventaire de la
boutique).

- **Source unique** : le porte-monnaie partagé avec la boutique et le jeu (`shared/wallet.js`, clé
  `hoopbounce.inventory`). Un article acheté apparaît **dès le retour au menu**.
- **Album complet** (étape 17) : **tous les articles** sont visibles, possédés ou non.
- **En-tête** : retour, « Collection », progression (barre + « 7/51 possédés »), bouton **Boutique**.
- **À gauche** : **aperçu animé** de l'article choisi, porté avec le reste de la tenue équipée (même rendu que
  dans le jeu), étiquette de rareté (ou « Par défaut »), badge **« ✓ Équipé »**, nom, description et bouton
  **Équiper** ou **Déséquiper**.
- **À droite** : onglets **Tout / Ballons / Visages / Rebonds / Traînées / Paniers** et la grille :
  - **articles possédés** : vignette, nom, rareté, badge « Équipé », lueur ou bordure dorée qui respire ;
  - **articles verrouillés** : bordure en pointillés, vignette grisée, cadenas, prix (ou « ★ Exclusif ») ;
    leur aperçu animé reste disponible ;
  - **« Nouveau ! »** sur les articles débloqués depuis la dernière visite (petit saut lumineux), une seule
    fois (clé `hoopbounce.collectionSeen`).
  - Sous la grille, la progression **par rareté** (« Commun 1/9 · Rare 1/12 · Épique 0/13 · Légendaire
    1/13 »), puis « Collection complète ! » quand tout est obtenu.
  - Article verrouillé choisi : bouton **« Débloquer · 25 000 »**, qui ouvre la boutique sur cet article
    (ou « Exclusif · Récompense quotidienne / Succès »).
- **Déséquiper** remet l'article de base de la catégorie (ballon classique, onde, aucune traînée, confettis).
- **Enregistré tout de suite** : l'article équipé reste équipé au prochain lancement (jeu, boutique, menu).
- Sons : sélection, carillon à l'équipement, son descendant au retrait ; vibration courte ; message.

### Récompense quotidienne, Missions, Succès (`index.html#quotidien`, `#missions`, `#succes`)

Même style que le reste du menu (verre sombre, accent orange, ressorts) ; chaque page a son compteur de pièces.

- **Récompense quotidienne** : 7 cases (la 7e, dorée et plus large, est balayée par un reflet). Case récupérée :
  coche verte ; **aujourd'hui** : case dorée qui respire, illustration qui flotte, étiquette « Aujourd'hui » ;
  demain : « Demain » ; les suivantes sont plus discrètes. Gros bouton **Récupérer** (pulsation et reflet), ou
  « Reviens demain · Prochaine récompense dans 13 h 18 min » (compte à rebours en direct ; à minuit, la page
  se met à jour d'elle-même). En-tête : semaine et jour (« Semaine 1 · Jour 3/7 »).
- **Récupération** : la case grossit et fait un tour sur elle-même, puis la **révélation** : fond sombre,
  **rayons de lumière** qui tournent, **coffre** qui tombe, tremble et **s'ouvre dans un éclair**, le butin
  surgit (pièces, article avec sa rareté), **pluie de pièces** sur tout l'écran ; « Super ! » puis les pièces
  **filent vers le compteur**, qui rebondit. **Son** (choc, grincement, fanfare, tintements) et **vibration
  légère**.
- **Missions** : 3 cartes (facile vert, moyenne bleue, difficile violette) : icône, palier, texte, **barre de
  progression animée** (elle se remplit à l'ouverture, un reflet la parcourt), valeur (« 4/5 », « 3/10 min »),
  récompenses (pièces, coffre, article), puis « Récupérer » (bouton qui pulse) ou « ✓ Récupérée ».
  **Mission terminée** : la carte s'entoure de vert, un **éclat lumineux** la traverse, son de validation.
  En-tête : « 1/3 accomplies » et « Nouvelles missions dans 13 h 18 min ».
- **Succès** : progression totale (barre, « 12/40 obtenus »), « 3 à récupérer », onglets **Tous / Débutant /
  Intermédiaire / Expert / Légende** (chacun avec son compte et un point rouge s'il y a quelque chose à
  récupérer), grille de cartes : **médaille hexagonale** à la couleur du palier (bronze, argent, or, violet) avec
  son icône, nom, description, **barre de progression**, récompense, « Récupérer ». Pas encore atteint :
  médaille grisée et valeur (« 240/1 000 ») ; **prêt** : médaille qui brille et carte balayée par un reflet doré ;
  obtenu : « ✓ Obtenu ». Les succès prêts sont en tête de liste.
- **Pendant la partie** : une bannière glisse en haut de l'écran — « **Mission terminée !** » (vert) ou
  « **Succès débloqué !** » (or) — avec un arpège lumineux et une vibration.

### Bonus du jour (`index.html#bonus`)

Même style que les autres pages (verre sombre, ressorts), deux panneaux côte à côte :

- **Coffre bonus** : un coffre qui flotte et scintille, **« 🎁 Coffre gratuit »** OU **« 📺 Regarder une
  publicité → Coffre amélioré »** (« Plus de pièces · article presque garanti · skins et effets rares »).
  Coffre amélioré : le coffre de la page **se transforme** (orange et or, gemme rose) dans un éclair avec un
  son de surprise, tremble, puis la grande révélation (rayons, butin, pluie de pièces). Une fois ouvert :
  « ✓ Coffre du jour ouvert · Revient dans 12 h 53 min » (coffre entrouvert, éteint).
- **Roue de la chance** : roue à 8 cases (pièces 100 / 250 / 500 / 1000, coffre, coffre rare, effet, skin
  rare), cercle doré avec lumières, pointeur. **« 🎡 Lancer gratuit »** (1 par jour) puis **« 📺 Regarder une
  publicité → Lancer supplémentaire · 3 restants »**. Lancer : **rotation fluide** (≈ 5,6 s, 6 tours),
  **ralentissement progressif** (les dernières cases passent au ralenti : suspense), **clic à chaque case**
  (plus grave quand la roue ralentit), **pointeur qui sautille**, lumières du bord qui clignotent, puis la case
  gagnante grossit et la révélation de la récompense s'ouvre.
- Boutons de publicité : « Chargement de la publicité… », « Aucune publicité disponible pour le moment »,
  « Limite du jour atteinte — revenez demain ». Les options gratuites restent toujours utilisables.
- En-tête : temps avant le renouvellement (minuit) et compteur de pièces ; mention « Publicités toujours
  facultatives ».

### À propos (`index.html#apropos`)

Ouverte depuis **Paramètres › À propos de Hoop Bounce**. Le retour ramène aux Paramètres, même quand la page
est ouverte par un lien direct. Même style que le reste du menu (verre sombre, accent orange, ressorts). La page
a deux colonnes, qui restent côte à côte sur téléphone en paysage.

- **Carte d'identité** (à gauche) :
  - le logo du menu (ballon + HOOP / BOUNCE) et l'accroche « Un jeu de basket de plateforme » ;
  - deux pastilles : **Version 1.0.0** (orange, lue dans `version.js`) et **Créateur EchoSpeed** ;
  - **« © 2026 EchoSpeed. Tous droits réservés. »** : l'année se met à jour seule (« 2026–2027 »…).
- **Liens** :
  - **Politique de confidentialité** : la vraie page en ligne si une adresse est renseignée, sinon la version
    intégrée au jeu (« Lire dans le jeu ») ;
  - **Conditions d'utilisation** : vrai lien quand une adresse existe ; sinon une pastille « Bientôt », et le
    toucher fait trembler le bouton avec le message « Bientôt disponible ».
  - Les vrais liens s'ouvrent dans le navigateur, avec une icône « lien externe ».
- **Crédits** (à droite) : une ligne par rôle (icône, rôle en orange, noms, précision) :
  - Développement, Design ;
  - Musiques (compositions originales jouées en temps réel) ;
  - Effets sonores (synthétisés, aucun fichier audio) ;
  - Graphismes (dessinés par le code) ;
  - Polices (Unbounded, Outfit — SIL OFL 1.1) ;
  - Technologies (Capacitor, Google Mobile Ads).
  - En bas : « ♥ Merci de jouer ! ».
- **Animations** :
  - ouverture : la page glisse depuis la droite et ses blocs apparaissent en cascade ;
  - le ballon du logo tombe, s'écrase et rebondit, le nom glisse, un reflet traverse la carte ;
  - le halo orange respire, le cœur bat deux fois ;
  - clic : effet de pression des boutons, onde au toucher, survol (icône orange, flèche qui avance) ; sons du
    menu.
- **Compléter** : tout se fait dans `src/shared/about.js` :
  - un crédit = un bloc à copier (rôle et précision en FR / EN / ES, noms, icône) ;
  - un lien = une adresse dans `LINKS` (`privacy`, `terms`).

### Modes à venir (étape 19)

Page **« Modes à venir »** (tuile *Modes* de l'accueil, `index.html#modes`). Elle **présente** les futurs modes ;
**aucun n'est développé** ni jouable. Code : `modesPage()` dans `src/menu/pages.js`, styles `.fmode*` et `.m-*`
dans `css/menu.css`, textes `mode.<id>` et `mode.<id>.desc` dans `src/menu/i18n.js` (FR / EN / ES).

| Carte | Titre | Description | Illustration animée | Couleur |
|---|---|---|---|---|
| `endless` | 🌊 Endless | « Un défi sans fin. Va le plus loin possible et bats ton meilleur score. » | ciel de nuit, vagues sur trois plans et plateformes qui **défilent sans fin**, pièces, ballon qui court avec traînée, compteur « 2 480 m », grand ∞ lumineux | bleu |
| `race` | 🏁 Course Multijoueur | « Affronte tes amis sur les mêmes niveaux et sois le premier à réussir le panier. » | **écran partagé** « J1 / VS / J2 » : **le même niveau** deux fois (plateforme, pics, panier). J2 part plus vite mais **se fait piéger par les pics** (éclatement) et repart du début ; J1 réussit le panier le premier (anneau doré) | rose-rouge |
| `creator` | 🛠️ Créateur de Maps | « Crée tes propres niveaux et joue avec tes amis. » | plan **quadrillé**, **barre d'outils** (bloc, pics, panier, gomme), **curseur** qui pose une **plateforme** (contour en pointillés puis bloc qui tombe en place), pics, panier, ballon | menthe |

**Style** : carte premium (dégradé de la couleur du mode, bord lumineux, ombre), illustration en haut (cadrage
320 × 150 conservé), **cadenas** en haut à droite, pastille **« 🔒 À venir »** qui respire, **reflet** qui balaie
l'illustration de temps en temps, entrée en cascade à l'ouverture de la page, carte qui se soulève au survol.
Animations uniquement en `transform` / `opacity`, **mises en pause quand la page est fermée**, coupées si le
système demande moins d'animations. 3 colonnes en paysage (1 seule sur un écran très étroit).

**Course Multijoueur — fonctionnement prévu** (validé par le porteur du projet, pas encore développé) :
- tous les joueurs jouent **le même niveau** (les niveaux du mode solo) ;
- chaque joueur a **son propre ballon** (avec ses cosmétiques) ;
- **la physique est exactement celle du mode solo** (même moteur déterministe, mêmes réglages) ;
- **le premier qui marque gagne** ;
- les erreurs et les pièges (chute, éclatement, retour au drapeau) créent des **retournements de situation**.
Ce n'est pas une course classique : c'est une **compétition de maîtrise, de rapidité et de précision**.
Pistes techniques : affichage en écran partagé ou ballons « fantômes » des adversaires sur le même écran,
comparaison en direct (position, chutes) ; la simulation déterministe permet de rejouer exactement la partie
d'un adversaire à partir de ses commandes (fantômes asynchrones, vérification des résultats).

**Pour ouvrir un mode dans une future mise à jour** : retirer `data-locked` de sa carte, lui donner une
destination (page ou `play.html?mode=…`), remplacer la pastille « À venir » par « Jouer ».

### Ancienne carte des mondes (`worlds.html`)

Remplacée à l'étape 11 par la sélection du menu ; l'adresse renvoie vers `index.html#mondes`. Ce qui suit
décrit l'ancienne page (étapes 7 à 10), conservé pour l'historique :

- **En-tête** : retour, « MONDES », total d'étoiles, **barre de progression** et **pourcentage** global.
- **5 cartes** qui défilent à l'horizontale (aimantées, monde au centre agrandi et entouré de sa couleur ;
  molette, flèches du clavier). Chaque carte : **illustration animée** du monde (son vrai décor, ses éléments
  emblématiques et le ballon qui rebondit ; seul le monde au centre est animé), numéro, nom, accroche, barre
  de progression et pourcentage, étoiles obtenues, niveaux terminés / disponibles / prévus, badge « Terminé ».
- **Monde verrouillé** : illustration éteinte, **cadenas**, « Termine le monde N pour l'ouvrir » ; le toucher
  fait trembler le cadenas (message).
- **Animation de déblocage** (une seule fois par monde) : la carte vient au centre, le cadenas tremble, s'ouvre,
  grossit et s'envole ; ondes et étincelles de la couleur du monde ; le monde reprend ses couleurs ; badge
  « Monde débloqué ! » ; fanfare et vibration.
- **Chemin** pointillé qui relie les mondes ; la partie parcourue est colorée. Pagination en points.
- **Choix du niveau** (panneau) : 10 emplacements par monde : niveaux terminés (étoiles), prochain niveau
  (pulsation), verrouillés, « Bientôt » pour ceux qui ne sont pas encore créés. Lancer un niveau : un pan de
  la couleur du monde balaie l'écran, puis l'introduction du monde.
- `?unlock=all` : tout est ouvert (pour tester), sans rien enregistrer en plus.

### Boutons

| Bouton | Comportement |
|---|---|
| Tous les boutons du menu | Enfoncement à la pression, léger **grossissement au relâcher** (ressort), **éclat lumineux** au point touché, **petit « pop » sonore** (étape 11 ; les boutons qui ont leur propre son — navigation, retour, JOUER, mondes, niveaux — gardent le leur), vibration courte. |
| JOUER | Accord montant + souffle, éclair dans le décor, l'accueil s'efface, fondu au noir vers la partie. |
| Tuiles du dock | Icône qui prend sa couleur d'accent et halo coloré à la pression ; son d'ouverture. |
| Retour (pages) | Son descendant ; la page glisse, l'accueil revient. |
| Boutons du jeu (HUD, pause, victoire) | Enfoncement net (×0,86) puis **rebond élastique** au relâcher. |
| Commandes tactiles | Assombrissement et léger rétrécissement tant qu'on appuie ; **onde lumineuse** à chaque appui (couleur du monde sur REBOND). |
| Toutes les pages (étape 10) | **Onde lumineuse au point touché** (`shared/ui-polish.js`, sauf commandes de jeu) ; boutons principaux traversés par un **reflet** qui balaie ; légère élévation au survol (souris). |

### Animations et transitions

- **À propos** (étape 16) : ballon du logo qui tombe et rebondit, reflet sur la carte, halo qui respire, cœur
  qui bat ; bouton « Bientôt » qui tremble.
- **Écran de chargement → menu** (étape 14) : fondu + léger zoom de l'écran de chargement, décor du menu qui se
  dézoome, puis l'entrée de l'accueil (elle attend la fin de l'écran de chargement pour être vue).
- **Entrée du menu** : logo et JOUER glissent depuis la gauche, tuiles qui montent en cascade, pièces en fondu.
- **Ouverture d'une page** : l'accueil s'efface, la page glisse depuis la droite (ressort), ses blocs
  apparaissent en cascade ; le décor s'assombrit et zoome légèrement.
- **Fenêtres** (confidentialité, crédits) : fond qui s'assombrit, carte qui monte.
- **Contrôles segmentés** : indicateur qui glisse sous l'option choisie.
- **Menu → jeu** : fondu au noir, puis fondu depuis le noir à l'arrivée.
- **Niveau suivant** : fondu rapide au noir.
- **Changement de monde** : un grand pan de la couleur du monde suivant balaie l'écran en biais ; le nouveau
  monde apparaît derrière, puis son introduction ; la musique passe d'un morceau à l'autre en fondu enchaîné.
- **Carte → niveau** : balayage de la couleur du monde puis fondu ; **jeu → carte / menu** : fondu au noir.
- **Victoire** : ralenti (×0,3 pendant 0,9 s), zoom de caméra vers le panier, secousse, carte qui monte, étoiles
  qui tombent une à une (son ascendant).
- **Étoiles du HUD** : apparition avec rebond.
- **Entre toutes les pages** (étape 10) : si le chargement dure, un petit ballon tourne au centre du voile
  (`css/polish.css`).
- **Caméra** (étape 10) : recul doux (jusqu'à −9 %) quand le ballon s'élève loin du sol (on voit où il va
  retomber) ; **coups de zoom** amortis (ressort) au rebond à pleine puissance, à l'étoile, à l'éclatement et
  au panier ; **arrêt sur image** très bref à l'éclatement (90 ms) et à l'étoile (45 ms).

### Effets visuels (jeu)

- Ballon : écrasement à l'impact, étirement en vol, détente au rebond, étirement vers le bas au dribble,
  rotation réelle, « pop » à l'apparition ; **ombre douce** (nette et sombre au contact, large et diffuse en
  hauteur) avec **occlusion de contact** ; **liseré de lumière du monde** sur le bord du ballon (néons magenta
  et cyan, reflet de la neige, lave par en dessous, soleil filtré, nébuleuse) ; **images fantômes** quand il
  file très vite (sans traînée équipée).
- Rebond : onde de choc (blanche → ambre → or selon la puissance), poussière ; à partir de la puissance 3,
  **éclair lumineux et traits de vitesse** ; à la puissance 5, onde dorée, secousse et coup de zoom.
- Atterrissages : **matière du monde soulevée** (petits nuages de neige et éclats de glace, braises et fumée,
  feuilles et brins d'herbe, étincelles spatiales) et éclair au sol sur les gros impacts.
- **Éclairage** : chaque monde a son étalonnage (halos colorés cuits dans la vignette : néons de la ville,
  lumière blanche de la neige, lueur rouge du volcan, soleil de la forêt, nébuleuse de l'espace).
- Impacts forts : poussière et secousse de caméra.
- Trampoline : toile qui se creuse puis vibre, onde menthe.
- Ventilateur : colonne de vent lumineuse, filets d'air qui montent.
- Téléporteur : anneaux qui tournent, particules qui spiralent, scintillements à l'entrée et à la sortie.
- Interrupteur / porte : lueur ambre, voyant rouge → vert, message « La porte s'ouvre ! ».
- Étoile ramassée : scintillements, onde dorée.
- Chute : le ballon éclate en morceaux, flash rouge, secousse.
- Panier : filet animé, confettis, « SWISH ! » ou « PANIER ! » ; **gerbe de rayons** qui tourne derrière le panier
  (dorée pour un swish), cercle qui s'illumine, double onde de choc, éclair blanc de l'écran.
- **Mondes** : chaque monde a son ciel, sa lumière (vignette teintée), ses plans de décor animés, ses particules
  d'ambiance (poussières lumineuses du soir, flocons, braises et cendres, lucioles et feuilles, poussière
  d'étoiles), dont une partie passe devant le niveau ; poussière d'impact à la couleur du sol (neige blanche).
- **Éléments des mondes** : caisse (bois, pochoir), vent de neige (filets et flocons emportés), stalactites
  (tremblement, éclats), lave (vagues, bulles, lueur), plateformes fragiles (fissures qui s'élargissent, contour
  fantôme), geysers (fumée puis colonne de feu en trois couches), chutes de pierres (ombre, graviers, rocher qui
  tourne, débris), ascenseurs de pierre (runes), lianes (feuilles, boucle lumineuse), champignons (écrasement,
  onde), troncs (cernes qui tournent), branches feuillues, rivière, plateformes flottantes (réacteurs),
  astéroïdes, zones de gravité (chevrons qui montent), portails.
- **Identité des mondes (étape 10)** : Ville — grandes **enseignes au néon** qui grésillent (HOOPS, OPEN 24H,
  DINER, ARCADE, anneau), **avions** très loin aux feux clignotants ; Neige — **petits nuages de froid** au ras du
  sol, **traces du ballon dans la neige** qui s'effacent lentement ; Volcan — **chaleur visible** (colonnes d'air
  chaud qui ondulent au-dessus de l'écran et de chaque bassin de lave) ; Forêt — **papillons** qui voltigent ;
  Espace — **débris qui flottent** en apesanteur et poussières qui remontent lentement.

### Son et sensations — game feel (étape 18)

Objectif : que **chaque action du joueur produise une réaction — son + animation + effet visuel** — et que les
30 premières secondes donnent envie de continuer. Aucun nouveau mode ; **les trajectoires du ballon n'ont pas
changé** (voir « Physique » plus bas).

**Identité sonore** (`src/audio/ui-voice.js`, partagée par le menu, la boutique et le jeu)
- Un **timbre** : le « pop » du ballon (sinus qui grimpe très vite, octave au triangle, souffle bref), sur tous les
  boutons, onglets et choix.
- Une **gamme** : do majeur pentatonique — aucune fausse note, tout s'enchaîne avec la musique du menu.
- Un **motif** : le **motif du rebond**, cinq notes qui montent sur le rythme d'un ballon qui rebondit (les
  intervalles raccourcissent). On l'entend à l'achat, au déblocage d'un monde, sur JOUER, dans les jingles de
  victoire de chaque monde et, très doucement, dans la musique du menu toutes les 4 mesures.
- Petite réverbération de salle commune.

**Menu et boutique**

| Action | Son |
|---|---|
| Toucher un bouton | « pop » (légèrement varié à chaque fois) |
| Ouvrir / fermer une page | souffle qui monte (ou descend) + deux notes |
| Changer de sélection (article, option, monde du carrousel) | petit « tic » clair dont la note suit la position |
| Changer d'onglet | glissé + pop |
| Équiper un objet | « clac » de mise en place + carillon |
| Acheter | pièces versées, coup grave, motif du rebond ; **rare** : souffle ; **épique** : deuxième voix et nappe ; **légendaire** : sous-basse, chœur de cloches, étincelles |
| Pas assez de pièces / verrouillé | deux notes sourdes, jamais agressives |
| Pièces qui défilent | tintement dont la hauteur monte à chaque pièce |

**Jeu**
- **Rebond** en couches : choc grave, claquement du cuir, « pop » élastique qui **monte d'une note de la gamme à
  chaque niveau de puissance**, souffle à partir de la puissance 3, coup de sous-basse à 4 et 5, carillon et grand
  souffle à la puissance maximale.
- **Surfaces** : chaque contact a sa voix — bitume du terrain (ville), **métal** (plateformes, planches, portes en
  ville), neige (choc feutré + crissement), glace (tintement), **roche** (graviers), **herbe et terre** (froissement),
  bois, **plateforme spatiale** (résonance synthétique + écho), astéroïde, cercle (métal qui résonne), planche du
  panier (plexiglas). Au-delà d'une certaine vitesse, une **couche de poids** (sous-basse) s'ajoute.
- **Roulement** en continu, qui suit la vitesse et la surface (bitume, métal, neige qui crisse, glace qui siffle,
  roche, herbe, bois, plateforme spatiale), et **souffle de l'air** quand le ballon file (gros rebonds, chutes).
- **Espace sonore** : réverbération propre à chaque monde (rue, montagne, caverne, sous-bois, vide spatial) et
  **position stéréo** de chaque son selon sa place à l'écran (pièges, chocs, étoiles).
- **Panier** : filet (« swish » de mailles), basse, arpège ; **panier parfait** : souffle aspiré, sous-basse,
  accord brillant et pluie de cloches. **Niveau terminé** : jingle du monde (son instrument, sa tonalité) sur le
  motif du rebond — version enrichie pour un panier parfait. **Niveau échoué** : trois notes qui descendent
  doucement + jingle d'échec du monde. **Étoile** : note qui monte avec le nombre d'étoiles. **Apparition** du
  ballon : « bloop » qui monte. **Récompenses** : pièces qui tintent.

**Musique et ambiances des mondes** (`src/audio/music.js`)
- Forme en **8 mesures** : A (thème), puis B (variation de la mélodie, coup de grosse caisse en plus) et un petit
  **roulement de batterie** à la fin de chaque cycle.
- **Intensité dynamique** : une couche de percussions et de contre-chant monte quand on joue vite et fort
  (puissance, vitesse), redescend au calme, disparaît en pause et à la victoire (transitions de plusieurs secondes).
- Réverbération propre à chaque monde ; l'Espace a maintenant aussi une mélodie (cloches).
- Ambiances enrichies :

| Monde | Fond | Nouveaux sons ponctuels |
|---|---|---|
| Ville | circulation, néons | **dribbles d'un terrain de basket au loin** et crissement de baskets, **train** qui passe |
| Neige | vent en deux couches | **sifflement du vent sur les crêtes**, **avalanche** très lointaine (l'image tremble à peine) |
| Volcan | grondement, chaleur | **lave qui glougloute** ; les éruptions lointaines font **trembler l'image et tomber des cendres** |
| Forêt | feuillage, ruisseau | **grillons**, **grenouille** |
| Espace | bourdon qui respire | **pulsar** (battements qui s'éloignent), **scintillement cosmique** |

**Sensations**

| Moment | Réaction |
|---|---|
| Chaque appui sur REBOND | onde lumineuse sur le bouton (couleur de la puissance), segment de l'anneau qui « claque », vibration (plus franche à 4 et 5), un tic de vibration au dribble en l'air |
| Puissance 4-5 | le ballon s'entoure d'une **lueur ambre puis dorée** qui pulse |
| Rebond puissance 4 | léger coup de caméra vers le bas, petit zoom arrière |
| Rebond puissance 5 | double onde au sol, **gerbe de la matière du monde**, secousse, coup de zoom, **arrêt sur image** de 35 ms, son puissant |
| Gros atterrissage | **l'image encaisse le poids** (elle s'enfonce puis revient en ressort), onde au sol, matière soulevée, couche grave dans le son, et au-delà d'une certaine force le décor réagit (voir plus bas) |
| Panier | ralenti **progressif** (plus de retour brutal), zoom sur le panier, secousse, gerbe de rayons, filet |
| **Panier parfait** (sans toucher le cercle) | ralenti plus marqué (×0,2), **zoom plus serré** (×1,24), **halo doré sur les bords de l'écran**, étincelles et traits dorés, son spécial, vibration plus riche ; carte « **Panier parfait !** » avec halo doré qui respire et titre qui brille |
| Victoire | **confettis plein écran** (deux canons dans les coins puis pluie), gerbe dorée à chaque étoile qui se pose, jingle de réussite du monde, vibration légère, pièces qui tintent |
| Étoile | scintillements, onde, traits dorés, arrêt sur image bref, note qui monte |
| Apparition du ballon | « bloop », onde blanche, scintillements |

**Effets visuels des mondes** (`src/render/world-fx.js`)

| Monde | Au contact du sol | En roulant | Le décor réagit (gros chocs, grondements) |
|---|---|---|---|
| Ville | poussière du bitume, étincelles sur le métal, **reflets néon** (magenta / cyan) | poussière, étincelles sur le métal à grande vitesse | poussière des toits |
| Neige | neige soulevée, flocons ; glace : éclats et éclat lumineux | gerbe de neige ; glace : scintillements et **rayures brillantes** qui s'effacent | neige qui tombe des branches |
| Volcan | braises, fumée, étincelles | braises et graviers | **cendres et braises** qui retombent |
| Forêt | brins d'herbe, feuilles, **lucioles qui s'envolent** | brins d'herbe | **feuilles qui tombent des arbres** |
| Espace | poussière cosmique, anneau d'énergie | étincelles cyan et violettes | poussière d'étoiles |

**Caméra** (`src/render/camera.js`)
- Suivi plus naturel : l'anticipation suit aussi la **direction demandée** (◀ ▶), pas seulement la vitesse ;
  **regard vers le bas** pendant une grande chute (jusqu'à 1,1 u) pour voir où l'on va atterrir.
- **Impulsions directionnelles** amorties (gros atterrissages, rebonds puissants) ; secousses plus rondes.
- **Plan d'ouverture** : au début de chaque niveau, l'image part 10 % plus large et se resserre en douceur.
- **Ralentis et arrêts sur image progressifs** (`src/core/time-fx.js`) : entrée, maintien, retour en courbe douce.
- **Jamais gênante** : tous ces mouvements restent petits, amortis, et sont **réduits de 60 %** quand le téléphone
  demande moins d'animations (réglage d'accessibilité du système).

**Physique et contrôle**
- **Les trajectoires n'ont pas changé** (gravité, hauteurs de rebond, accélérations, freinage) : les 50 niveaux ont
  été équilibrés et vérifiés avec ces valeurs. Un essai de freinage plus franc au sol (3,5 → 4,6 u/s²) rendait 16
  passages non conformes à leurs solutions vérifiées : il a été abandonné.
- Le ballon **paraît** plus élastique et plus lourd : écrasement plus marqué à l'impact, ressort de déformation
  moins amorti (petite oscillation de caoutchouc), étirement un peu plus fort en vol (réglages `CONFIG.feel`,
  purement visuels), plus le son, la caméra et les vibrations ci-dessus.
- **Précision** : un **repère d'atterrissage** discret (petit anneau) apparaît sous le ballon quand il est haut,
  là où l'ombre devient trop pâle pour viser.
- **Réponse des commandes** : chaque appui a une réaction immédiate (onde sur le bouton, vibration, son).

---

## 5. Progression

### Les mondes

| # | Monde | Accroche | Couleur | Ambiance | Mécaniques | Niveaux |
|---|---|---|---|---|---|---|
| 1 | **Ville** (tutoriel) | Le terrain du coucher de soleil | orange | ville moderne la nuit : gratte-ciel et immeubles détaillés (fenêtres qui s'allument et s'éteignent, néons qui pulsent, grandes enseignes au néon qui grésillent, châteaux d'eau, balises rouges), voie rapide où passent des voitures, avions au loin, projecteurs qui balaient le ciel, lune, vitrines, graffitis, lumière magenta et cyan ; lo-fi hip-hop | plateformes mobiles, trampolines, ventilateurs, caisse, scies, lasers, presses hydrauliques | 10 / 10 |
| 2 | **Neige** | Les sommets gelés | bleu glacier | montagnes enneigées ombrées, sapins enneigés, brume, petits nuages de froid, soleil d'hiver pâle, petits flocons, rafales, glace qui brille, traces dans la neige, couleurs froides ; boîte à musique | sol glissant, vent, stalactites, plaques qui tombent, boules de neige, blocs de glace, canon à boules de neige | 10 / 10 |
| 3 | **Volcan** | Au cœur de la lave | orange feu | volcans qui fument et rougeoient, nuages de fumée, roches fissurées éclairées de rouge, rivière de lave animée, braises, cendres, chaleur visible ; tambours graves | lave, plateformes fragiles, geysers, chutes de pierres, ascenseurs, jets de flammes, rochers de lave, broyeurs | 10 / 10 |
| 4 | **Forêt** | Les bois enchantés | vert | collines, arbres détaillés, herbe vivante, rayons de soleil, oiseaux, papillons, feuilles qui tombent, champignons, lucioles ; marimba et flûte | lianes, champignons, branches mobiles, troncs, rivière, troncs-marteaux, rondins qui dévalent, branches qui cassent, planche magique | 10 / 10 |
| 5 | **Espace** (monde final) | Au-delà des étoiles | violet | nébuleuses, étoiles qui scintillent, étoiles filantes, planètes, la Terre, station spatiale, débris qui flottent en apesanteur, poussières qui remontent ; nappes de synthé | gravité réduite, astéroïdes, portails, plateformes flottantes, gravité inversée, lasers, trous noirs, pistons, boules de plasma | 10 / 10 |

**Ambiance sonore de chaque monde** (étape 10, `audio/music.js`) — en plus de la musique, un fond continu et des
petits sons ponctuels, chacun à son propre rythme aléatoire, pour reconnaître le monde les yeux fermés :
Ville — rumeur de la circulation, bourdonnement des néons, **voitures qui passent d'un côté à l'autre** (effet
Doppler et stéréo), klaxons, **sirène** lointaine, grésillement de néon ; Neige — vent en deux couches,
**rafales qui sifflent**, carillons cristallins, **craquements de la glace** ; Volcan — grondement profond, souffle
de chaleur, crépitements, **bulles de lave**, **éruptions lointaines** ; Forêt — feuillage, **ruisseau**, oiseaux,
**coucou**, **pic-vert**, brise ; Espace — bourdon qui respire, harmoniques qui scintillent, bips, **messages
radio**, souffles.

- **50 niveaux** (10 par monde). La difficulté monte vite (voir [La difficulté](#la-difficulté)) : chaque niveau
  ajoute une difficulté nouvelle, et l'Espace est le monde final.
- **Matériaux par monde** (seule l'apparence change, la physique reste celle du rôle de la surface) : Ville :
  trottoir et asphalte, béton, briques, métal à rivets et bandes de chantier ; Neige : neige, glace brillante,
  bois enneigé (petites stalactites), roche gelée ; Volcan : basalte poreux aux fissures incandescentes, pierre
  fissurée, orgues basaltiques, lave ; Forêt : herbe et terre (cailloux, racines, fleurs), pierre moussue, bois ;
  Espace : pont métallique à bande lumineuse, coque, plateformes lumineuses, cloisons. Les pics et les
  plateformes mobiles changent aussi (pointes d'acier, éclats de glace, obsidienne brûlante, ronces, pointes
  néon ; nacelle de chantier, planche enneigée ou moussue, dalle de pierre, plateforme flottante), en gardant
  toujours une pointe rouge ou brûlante pour que le danger reste lisible.
- **Déblocage automatique** : un monde s'ouvre quand **tous les niveaux disponibles** du monde précédent sont
  terminés (la Ville est ouverte dès le départ). Dans un monde, chaque niveau terminé ouvre le suivant.
- La première fois que la carte montre un monde ouvert, elle joue l'**animation de déblocage** (une seule fois).
- Pourcentage d'un monde = niveaux terminés / niveaux disponibles ; étoiles = obtenues / 3 × niveaux
  disponibles ; le total de l'en-tête additionne les 5 mondes.

### Les niveaux

| # | Ville | Neige | Volcan | Forêt | Espace |
|---|---|---|---|---|---|
Ce que chaque niveau ajoute (en **gras** : la difficulté apportée par l'étape 10) :

| # | Ville | Neige | Volcan | Forêt | Espace |
|---|---|---|---|---|---|
| 1 | Premier panier — rouler, rebondir | Premières glissades — glace, **boule de neige qu'on saute sur place** | Premières braises — bassins, **jet de flammes au-dessus du bassin** | La clairière — champignons, **tronc-marteau** | Premiers pas lunaires — **trou noir au fond du vide** |
| 2 | Le mur — charger, scie | La rampe — crevasse, **bloc de glace sur la réception** | Pierres fragiles — **colonne de feu au milieu du gué** | Le sentier de bois — tronc, **planche qui clignote** | Plateformes flottantes, laser, **piston** |
| 3 | Trampoline au-dessus des pics | Stalactites — **boule de neige dans le couloir** | Les geysers — **rochers de lave qui dévalent** | La première liane — **rondins sur l'autre rive** | Portails — **boules de plasma** |
| 4 | Plateforme mobile, scie | Vent glacial — **bloc de glace dans le vent de face** | Ascenseurs — **broyeur au sommet** | Branches mouvantes — **la dernière branche casse** | Astéroïdes — **trou noir sous les plateformes** |
| 5 | Le souffle — ventilateur, mur temporisé, **premier pilon** | Glace vive — plaque qui tombe, **canon à boules de neige** | Pluie de pierres, boulet, **broyeur** | Liane après liane, tronc à pointes | Gravité inversée, **deux lasers décalés** |
| 6 | L'interrupteur — porte, téléporteur, **premier laser** | Le grand lac — **avalanche à franchir par les plateformes** | Terre de feu — **colonne de feu sur la falaise** | Sous les feuillages — **tronc-marteau sur la cabane** | Apesanteur — **piston** |
| 7 | La caisse, scie, **deux pilons décalés** | Bourrasques — boulet, **second boulet** | Le gué de feu — canon, **rochers de lave vers le bassin** | Rebonds sauvages — boulet, **rondins jusqu'à la souche** | Portails, bloc temporisé, **boules de plasma** |
| 8 | Les toits — **scie au milieu du vide** | Le pont de bois — **avalanche de deux boules** | La forge — **jet de flammes au ras du plateau** | Rivière aux troncs — **rondins sur le toit de la cabane** | Monde à l'envers — **piston** |
| 9 | Le chantier — **plaque fragile au milieu des pics** | Descente glacée — boulet, **bloc de glace sur la bosse** | Trampolines de lave, canon, **rochers de lave** | Canopée — **tronc-marteau** | Ceinture d'astéroïdes — **laser avant le sol** |
| 10 | Grand final — **pilon rapide devant le panier** | Sommet — **avalanche puis bloc de glace** | Cœur du volcan — **broyeur puis jet de flammes** | Cœur de la forêt — **tronc-marteau de la cabane** | Au-delà des étoiles — **trou noir, piston final** |

- Identifiants : `first-shot`, `the-wall`, `trampoline`, `moving`, `updraft`, `final`, `city-crate`,
  `city-roofs`, `city-site`, `city-finale`, puis `snow-1` … `snow-10`, `volcano-1` … `volcano-10`,
  `forest-1` … `forest-10`, `space-1` … `space-10`.
- Chaque niveau décrit ses **passages** (`passages`) : départ, objectif et une **solution experte** sous forme de
  plan de manœuvres (rouler jusqu'à, charger, sauter en visant, attendre le bon moment d'un geyser, monter sur
  une plateforme mobile, se balancer aux lianes…). L'outil les joue et les tests les rejouent.
- Chaque passage de chaque niveau est vérifié par l'outil (`tools/route-check.mjs`) : solutions aléatoires et
  solutions expertes scriptées, rejouées par les tests.
- **JOUER** (menu) reprend au premier niveau ouvert non terminé, tous mondes confondus.
- Liens directs : `play.html?world=snow&level=1` (ou `play.html?level=N`, N dans la liste de tous les niveaux).

### Le système d'étoiles

- 3 étoiles placées dans chaque niveau (souvent sur la trajectoire idéale, parfois à un endroit risqué).
- Elles sont facultatives ; une chute les remet en jeu (le niveau recommence).
- On conserve le **meilleur nombre d'étoiles** par niveau, ainsi que le **meilleur temps**.
- Les étoiles sont comptées par monde et au total sur la carte des mondes.
- Certaines étoiles sont placées à des **endroits risqués** (au ras d'une scie, d'un boulet, d'un laser, au-dessus
  de la lave) pour récompenser les joueurs les plus habiles.
- Chaque nouvelle étoile rapporte **25 pièces** (une seule fois).

### La difficulté

- **5 paliers** affichés (pastille sur la carte, et dans l'intro) : **facile** (vert), **moyen** (ambre),
  **difficile** (orange), **expert** (rouge), **extrême** (violet, pastille qui pulse).
- **Courbe voulue (étape 10)** — le jeu devient difficile beaucoup plus vite :

  | Niveaux | Paliers | Ce que vit le joueur |
  |---|---|---|
  | 1–4 | facile, moyen | apprendre les commandes et les premiers éléments |
  | 5–14 | difficile (un moyen pour souffler) | **on commence à échouer** (premier pilon au niveau 5) |
  | 15–29 | difficile, expert | **plusieurs essais** par niveau |
  | 30–44 | expert, extrême | **vraiment difficile** |
  | 45–50 | extrême | **très exigeant, mais toujours faisable** |

  Paliers par monde — Ville : F F M M D M D D D E · Neige : D D D D E D E D E E · Volcan : D E D E E E E D E X ·
  Forêt : E E E E X E X E X X · Espace : E E E E X X X X X X (F facile, M moyen, D difficile, E expert, X extrême).
- **Chaque niveau introduit une difficulté nouvelle** (tableau ci-dessus) : aucun niveau ne répète le précédent.
- **Jamais injuste** : chaque piège est annoncé, prévisible et vérifié. Les fenêtres de passage sont calculées
  par balayage (outil `scan`) : en général 0,5 à 1,5 s, jusqu'à ~0,25–0,45 s dans les derniers niveaux
  (Forêt 5, Espace 5). Les niveaux longs ont des drapeaux.

### Revenir chaque jour (étape 12)

Tout est enregistré sur l'appareil, automatiquement, et relu par chaque page :

| Clé | Contenu |
|---|---|
| `hoopbounce.stats` | Statistiques : compteurs à vie et compteurs du jour (remis à zéro à minuit, heure locale) |
| `hoopbounce.daily` | Récompense quotidienne : jours récupérés, dernier jour, total |
| `hoopbounce.missions` | Missions du jour : date, les 3 missions, récupérées, déjà annoncées |
| `hoopbounce.achievements` | Succès récupérés et déjà annoncés |
| `hoopbounce.dailyAuto` | Jour où la récompense quotidienne s'est ouverte d'elle-même |

**Statistiques comptées par le jeu** : rebonds du joueur, paniers marqués, swish, niveaux terminés (rejouer
compris) et niveaux différents terminés aujourd'hui, niveaux terminés sans mourir (une chute, même avec un
drapeau, compte comme une mort), étoiles ramassées dans les niveaux réussis, chutes, parties lancées, temps de
jeu (seulement quand on joue vraiment : pas en pause, pas pendant l'intro), niveaux terminés par monde ;
pièces gagnées (niveaux, récompenses), coffres ouverts, récompenses quotidiennes, missions accomplies.

**Récompense quotidienne** — la première connexion de chaque jour donne **une seule** récompense :

| Jour | 1 | 2 | 3 | 4 | 5 | 6 | 7 |
|---|---|---|---|---|---|---|---|
| Récompense | 100 pièces | 200 pièces | Coffre commun | 350 pièces | Traînée exclusive « Hoop Bounce » | 500 pièces | Skin exclusif « Hoop Bounce » |

- On avance d'un jour à chaque récupération ; **manquer un jour ne fait rien perdre**. Après le 7e jour, une
  nouvelle semaine commence ; les exclusifs déjà possédés sont alors remplacés par des pièces.

**Coffres** :

| Coffre | Pièces | Article (non possédé) |
|---|---|---|
| Commun | 120 à 250 | 35 % de chances : commun ou rare |
| Rare | 300 à 500 | 60 % : rare ou épique |
| Épique | 600 à 900 | toujours : épique ou légendaire |

Si tous les articles possibles sont déjà possédés, des pièces les remplacent. Un article exclusif déjà possédé
vaut des pièces (150 à 1 000 selon la rareté).

**Missions quotidiennes** — 3 par jour (une facile, une moyenne, une difficile), tirées automatiquement d'après
la date (le même jour donne les mêmes missions), renouvelées à minuit. Leur progression vient des compteurs du
jour.

| Mission | Facile · moyenne · difficile | Pièces |
|---|---|---|
| Terminer N niveaux différents | 2 · 3 · 5 | 100 · 140 · 200 |
| Marquer N paniers | 5 · 10 · 15 | 100 · 160 · 220 |
| Obtenir N étoiles | 4 · 7 · 10 | 110 · 160 · 220 |
| Finir N niveaux sans mourir | 1 · 2 · 3 | 130 · 190 · 260 |
| Jouer pendant N minutes | 5 · 10 · 15 | 90 · 150 · 210 |
| Faire N rebonds | 30 · 60 · 100 | 80 · 130 · 180 |
| Terminer N niveaux du monde X (un monde ouvert) | 1 · 1 · 2 | 120 · 150 · 220 |
| Jouer N parties | 3 · 4 · 6 | 70 · 100 · 150 |
| Marquer N swish | 1 · 2 · 3 | 110 · 160 · 210 |

La mission difficile ajoute un **coffre commun** (55 %), un **coffre rare** (25 %) ou un **article** au hasard
(20 %) ; la moyenne ajoute parfois (25 %) un coffre commun.

**Succès** — 40 succès sur 4 paliers ; chacun a sa récompense à récupérer :

| Palier | Succès (objectif → récompense) |
|---|---|
| **Débutant** (bronze) | Premier panier (1er niveau → 100) · Échauffement (100 rebonds → 100) · Chasseur d'étoiles (10 étoiles → 150) · Sans faute (1 niveau sans mourir → 150) · Premier achat (1 article → coffre commun) · Habitué (10 parties → 100) · Roi de la ville (monde Ville → coffre commun) · Tirelire (1 000 pièces gagnées → 150) · Bienvenue ! (1 récompense quotidienne → 100) · En mission (1 mission → 100) |
| **Intermédiaire** (argent) | Dix sur dix (10 niveaux → 300) · Pluie d'étoiles (50 étoiles → coffre rare) · Dribbleur (1 000 rebonds → 300) · Tireur (100 paniers → 300) · Swish ! (25 swish → article rare) · Accro du shopping (5 articles → 400) · Montagnard (monde Neige → coffre rare) · Ne lâche rien (100 chutes → 200) · Passionné (30 min → 300) · Économe (5 000 pièces → 500) · Chasseur de trésors (5 coffres → 300) |
| **Expert** (or) | À mi-chemin (25 niveaux → coffre épique) · Volcanologue (monde Volcan → 600) · Gardien de la forêt (monde Forêt → 700) · **Perfection** (un monde avec toutes les étoiles → traînée exclusive **Aurore**) · Tireur d'élite (500 paniers → 800) · Collectionneur (10 articles → coffre épique) · Infatigable (5 000 rebonds → 800) · Impeccable (20 niveaux sans mourir → 800) · Fortune (20 000 pièces → 1 000) · Constellation naissante (100 étoiles → 800) · Agent spécial (15 missions → coffre rare) |
| **Légende** (violet) | **Au-delà des étoiles** (les 50 niveaux → ballon exclusif **Légende**) · **Constellation** (150 étoiles → animation de panier exclusive **Constellation**) · **Maître du swish** (100 swish → effet de rebond exclusif **Couronne**) · Astronaute (monde Espace → coffre épique) · Fidèle (7 récompenses quotidiennes → coffre épique) · Légende des missions (30 missions → 1 500) · Marathonien (3 h → 2 000) · Collection complète (tous les articles de la boutique → 3 000) |

**Articles exclusifs** (jamais en vente ; dans la boutique, ils portent l'étiquette « Exclusif · Récompense
quotidienne » ou « Exclusif · Succès ») :

| Article | Catégorie | Rareté | Comment l'obtenir |
|---|---|---|---|
| Hoop Bounce (ballon orange, panneau bleu nuit et monogramme « HB ») | Ballon | Légendaire | 7e jour de la récompense quotidienne |
| Hoop Bounce (ruban orange et bleu nuit semé de ballons) | Traînée | Épique | 5e jour de la récompense quotidienne |
| Légende (noir et or, coutures lumineuses) | Ballon | Légendaire | Succès « Au-delà des étoiles » |
| Aurore (voiles verts, turquoise et violets qui ondulent) | Traînée | Légendaire | Succès « Perfection » |
| Couronne (anneau d'or et pointes d'étoiles) | Effet de rebond | Légendaire | Succès « Maître du swish » |
| Constellation (étoiles reliées par des fils de lumière) | Animation de panier | Légendaire | Succès « Constellation » |

### Publicités récompensées (étape 13)

**Principe : aucune publicité forcée.** Toutes les annonces sont des **publicités récompensées** (Google AdMob,
SDK officiel Google Mobile Ads via le plugin Capacitor `@capacitor-community/admob`). Le joueur **choisit** de
les regarder en échange d'une récompense. La récompense n'est donnée **qu'après la validation complète** de
l'annonce par le SDK.

**Gestionnaire centralisé** (`src/shared/ads.js`, une seule instance partagée `getAds()`) :

| Fonction | Rôle |
|---|---|
| `prepare(emplacement)` | Charge une annonce à l'avance, quand son bouton apparaît (jamais au lancement). En cas d'échec : nouvel essai après 8 s, puis 16, 32… (jusqu'à 2 min). |
| `showRewarded(emplacement)` | Affiche l'annonce à la demande du joueur → `rewarded` (donner la récompense), `dismissed` (fermée avant la fin), `unavailable` (aucune annonce), `capped` (limite du jour), `blocked` (moment interdit), `error`. Si l'annonce n'est pas encore prête, attend jusqu'à 6 s. |
| `status(emplacement)` | `ready` · `loading` · `unavailable` · `capped` · `blocked` : l'état affiché sur les boutons. |
| `block()` / `unblock()` | Moments interdits : `playing` (pendant un niveau) et `animation` (animations de victoire). |
| `onChange(fn)` | Prévient l'interface pour mettre à jour les boutons. |

**Emplacements et récompenses**

| Emplacement | Où | Récompense | Limite / jour |
|---|---|---|---|
| `doubleCoins` | Écran de victoire | Pièces du niveau doublées (animation ×2, éclat de pièces, son) | 15 |
| `checkpoint` | Écran « Niveau échoué » | Reprise au dernier drapeau, étoiles et progression gardées (offerte si aucune annonce) | 15 |
| `bonusChest` | Page Bonus | Coffre amélioré : 450–750 pièces, 85 % de chances d'un article rare, épique ou légendaire (au lieu du coffre commun : 120–250 pièces, 35 % d'un article commun ou rare) | 1 |
| `wheelSpin` | Page Bonus | Lancer supplémentaire de la roue | 3 |

**Roue de la chance** (`src/shared/bonus.js`) — chances : 100 pièces 24 %, coffre commun 15 %, 250 pièces 20 %,
effet de rebond rare / épique 9 %, 500 pièces 12 %, coffre rare 9 %, 1 000 pièces 7 %, skin de ballon épique /
légendaire 4 %. Un article déjà possédé est remplacé par des pièces.

**Règles imposées par le gestionnaire** (quel que soit l'écran) : jamais pendant un niveau, jamais pendant une
animation importante, jamais au lancement du jeu (le SDK n'est même pas initialisé avant le premier bouton
affiché), jamais automatiquement après une partie. Les plafonds par jour gardent les récompenses précieuses.
Le jeu reste entièrement jouable sans regarder une seule annonce.

**Sauvegardes** : `hoopbounce.ads` (annonces regardées par emplacement aujourd'hui, total) et
`hoopbounce.bonus` (coffre du jour ouvert ou non et lequel, lancer gratuit utilisé, lancers bonus du jour,
nombre de lancers et de coffres, dernière case). Les récompenses vont dans `hoopbounce.coins` /
`hoopbounce.inventory` et les statistiques (`hoopbounce.stats`). Le tirage est enregistré **avant**
l'animation : quitter pendant que la roue tourne ne fait rien perdre.

**Développement** : seuls les **identifiants de test officiels de Google** sont utilisés (`useTestAds: true`).
Dans le navigateur, une annonce de test simulée remplace AdMob ; `?ads=none` simule l'absence d'annonce,
`?ads=fail` une erreur, `?ads=instant` une annonce éclair (tests automatisés).

**Configuration avant publication** (détails dans `native/android/README.md`) :
1. Console AdMob : créer l'application Android et **4 blocs « Avec récompense »** (`doubleCoins`,
   `checkpoint`, `bonusChest`, `wheelSpin`).
2. `src/shared/ads-config.js` : remplacer les identifiants `prod` (les `XXXX`) et passer `useTestAds` à
   `false`. Garde-fou : tant qu'un `XXXX` reste, le jeu reste en mode test.
3. `AndroidManifest.xml` : balise `com.google.android.gms.ads.APPLICATION_ID` avec le vrai identifiant
   d'application.
4. Fichier `app-ads.txt` sur le site du développeur ; message de consentement RGPD dans la console AdMob
   (« Confidentialité et messages ») ; déclarations Play Console (contient des annonces, sécurité des données,
   public cible / Familles).
5. Politique de confidentialité en ligne (texte du menu, mis à jour à l'étape 13).

### Le déblocage des modes

🔴 **Pas encore défini.** Les 3 modes prévus (Endless, Course Multijoueur, Créateur de Maps) sont affichés
« À venir » dans le menu (étape 19) ; aucun n'est développé. Proposition à valider le moment venu : Endless après
le monde 2, Course Multijoueur et Créateur de Maps dans des mises à jour dédiées (elles demandent un serveur pour
jouer et partager entre amis).

### La boutique (`shop.html`) — économie de collection (étape 17)

Tout se débloque **en jouant**, avec les pièces : **aucun achat avec de l'argent réel**. Depuis l'étape 17, les
objets sont de **vrais objectifs à long terme** :
- les **prix ont été multipliés** ;
- les **gains du jeu n'ont pas changé** : pièces des niveaux, récompense quotidienne, missions, succès, coffres,
  roue.

**51 articles** en 5 onglets :
- 4 offerts et équipés au départ ;
- **41 en vente** ;
- 6 exclusifs, gagnés avec les récompenses quotidiennes et les succès, présentés à la fin de chaque onglet.

| Rareté | Fourchette de prix | Articles en vente | Total |
|---|---|---|---|
| Commun (gris bleuté) | 6 000 – 10 000 | 9 | 65 000 |
| Rare (bleu) | 15 000 – 50 000 | 12 | 352 000 |
| Épique (violet) | 75 000 – 250 000 | 12 | 1 750 000 |
| Légendaire (or) | 500 000 – 1 000 000 | 8 | 5 600 000 |
| **Tout acheter** | | **41** | **7 767 000** |

| Onglet | Commun | Rare | Épique | Légendaire |
|---|---|---|---|---|
| 🏀 **Ballons** | Classique (offert), Street 6 000, Rétro 7 500 | Givre 18 000, Néon 25 000, **Ombre** 45 000 | Magma 85 000, Galaxie 120 000, **Plasma** 180 000, **Arc-en-ciel** 240 000 | Or pur 500 000, **Diamant** 1 000 000 · exclusifs : Hoop Bounce, Légende |
| 🎭 **Visages** (ballons amusants) | **Souriant** 6 500, **Pirate** 9 500 | **Ninja** 22 000, **Robot** 38 000 | **Fantôme** 95 000, **Yeux fous** 160 000 | **Extraterrestre** 550 000 |
| ✨ **Effets de rebond** | Onde (offert), Étincelles 6 000, **Fumée** 8 500 | Bulles 16 000, Étoiles 28 000 | **Flammes** 80 000, Éclairs 140 000 | Arc-en-ciel 500 000, **Particules cosmiques** 800 000 · exclusif : Couronne |
| 🌈 **Traînées** | Aucune (offert), Sillage 6 000 | Glace 18 000, Feu 30 000, **Énergie** 48 000 | Arc-en-ciel 120 000, **Galaxie** 230 000 | Plasma 600 000 · exclusifs : Hoop Bounce (épique), Aurore |
| 🏆 **Animations de panier** | Confettis (offert), Serpentins 6 000, **Explosion de confettis** 9 000 | Feu d'artifice 22 000, **Électrique** 42 000 | Jackpot 100 000, **Spatial** 200 000 | Supernova 650 000, **Triomphe légendaire** 1 000 000 · exclusif : Constellation |

En gras : les 20 nouveaux articles. « Foudre » s'appelle désormais « Éclairs », « Poudreuse » « Glace » et
« Flammes » (traînée) « Feu » ; leurs identifiants ne changent pas, donc les achats déjà faits restent.

**Rendu des nouveaux objets** (même dessin dans le jeu, l'aperçu de la boutique et les vignettes) :
- **Ballons** :
  - **Ombre** : noir d'encre, fumée violette, coutures lumineuses ;
  - **Plasma** : veines d'énergie rose et cyan qui brillent ;
  - **Arc-en-ciel** : spirale de 12 couleurs ;
  - **Diamant** : facettes triangulaires, reflets, éclat bleu glacier.
- **Visages** : le visage est dessiné à chaque image par-dessus le ballon. Il ne tourne pas avec le ballon :
  il reste droit, se décale vers le sens du mouvement et cligne des yeux toutes les ~4 s.
  - **Souriant** : joues roses ;
  - **Pirate** : foulard rouge à pois, bandeau sur l'œil, dent ;
  - **Ninja** : masque noir, bandeau rouge dont les pans flottent derrière ;
  - **Robot** : visière cyan lumineuse, grille, antenne qui clignote ;
  - **Fantôme** : yeux creux, bouche qui ondule, halo pâle ;
  - **Yeux fous** : pupilles qui roulent selon la vitesse et tremblent quand ça va vite ;
  - **Extraterrestre** : yeux en amande, antennes à boule lumineuse, aura verte.
- **Légendaires « beaucoup plus impressionnants »** : les ballons légendaires (Or pur, Diamant, Extraterrestre,
  Légende) ont une **aura** dans le jeu : halo qui respire et 3 étincelles en orbite.
  - **Particules cosmiques** : nébuleuse, double anneau, spirale d'étoiles.
  - **Triomphe légendaire** : halo d'or, 3 ondes de lumière, couronne de 9 étoiles, pluie de pièces et
    serpentins dorés.
- **Autres effets** :
  - **Fumée** : bouffées qui gonflent ;
  - **Flammes** : flammes qui montent et lueur ;
  - **Énergie** : halo vert-cyan, cœur électrique qui ondule, petits éclairs ;
  - **Galaxie** : ruban de nébuleuse semé d'étoiles ;
  - **Explosion de confettis** : 70 confettis et une onde ;
  - **Électrique** : 9 éclairs, anneaux, étincelles ;
  - **Spatial** : nébuleuse, planète à anneau, étoiles filantes.

**Rythme de déblocage estimé** (gains actuels, joueur régulier) :
- **Une première partie complète** (50 niveaux, 150 étoiles) rapporte ~7 750 pièces, plus les succès en cours
  de route (15 550 pièces de succès au total, plus des coffres). Le **premier objet commun (6 000)** s'achète
  donc vers la fin de la première partie, ou plus tôt avec les gains quotidiens. Un nouveau joueur ne peut pas
  acheter plusieurs objets d'un coup.
- **Ensuite, chaque jour** : récompense quotidienne (~190 en moyenne), 3 missions (~460), coffre bonus (~185),
  lancer gratuit de la roue (~360), parties rejouées (10 par niveau). Total : **~1 400 pièces par jour** sans
  publicité, **~3 000** en regardant les publicités facultatives (coffre amélioré, 3 lancers, pièces doublées).
- Délai approximatif pour acheter :

  | Objet | Sans publicité | Avec les publicités facultatives |
  |---|---|---|
  | rare (25 000) | ~2–3 semaines | ~1 semaine |
  | épique (120 000) | ~3 mois | ~6 semaines |
  | légendaire (500 000) | ~1 an | ~6 mois |
  | Diamant (1 000 000) | ~2 ans | ~11 mois |

- En plus des achats, **des objets tombent directement** :
  - coffres des missions et des succès ;
  - coffre bonus amélioré : 85 % de chances d'un objet rare, épique ou légendaire ;
  - roue de la chance : effet ou skin rare ;
  - récompense quotidienne.
  - La collection avance donc aussi sans acheter. Voir « Bugs connus » pour l'effet de ces tirages sur la
    valeur des légendaires.

**Sauvegarde** : les achats et les objets équipés sont dans `hoopbounce.inventory` (rien ne change pour les
anciennes sauvegardes). Ils restent après fermeture du jeu, ce que vérifient des tests qui relancent le
porte-monnaie.

### Les récompenses

| Action | Pièces |
|---|---|
| Premier panier d'un niveau | 40 + 10 par monde (Ville 40 … Espace 80) |
| Chaque étoile obtenue pour la première fois | 25 |
| Les 3 étoiles d'un niveau (première fois) | +20 |
| Rejouer un niveau déjà terminé | 10 |
| « Swish » (panier sans toucher le cercle) | +5 |
| Récompense quotidienne, missions, succès (étape 12) | voir [Revenir chaque jour](#revenir-chaque-jour-étape-12) |
| Publicité facultative sur l'écran de victoire (étape 13) | pièces du niveau doublées |
| Coffre bonus et roue de la chance (étape 13) | voir [Publicités récompensées](#publicités-récompensées-étape-13) |

- Une première partie complète rapporte environ **7 750 pièces** (50 niveaux, 150 étoiles) ; depuis l'étape 17, le
  catalogue complet coûte **7 767 000** : un objectif de collection à très long terme (voir la boutique ci-dessus).
- Le gain s'affiche sur l'écran de victoire (compteur qui défile, tintements) et s'ajoute au solde du menu.

---

## 5 bis. Publication Google Play (version 1.0.0)

**Rien n'est publié.** Tout ce qu'il faut pour une fiche professionnelle et un premier envoi est prêt dans
`store/` et `android/`. Le détail pas à pas est dans **`store/CHECKLIST.md`**.

### Identité

| Élément | Valeur |
|---|---|
| Nom sur le téléphone | Hoop Bounce |
| Titre Play Store | « Hoop Bounce: Basket & Rebonds » (FR) · « Hoop Bounce: Basketball Jump » (EN) · « Hoop Bounce: Bota y Encesta » (ES) |
| Développeur | EchoSpeed |
| Identifiant du paquet | `com.echospeed.hoopbounce` (⚠️ définitif après le premier envoi) |
| Version / build | 1.0.0 / 1 |
| SDK cible / minimum | Android 16 (API 36) / Android 7.0 (API 24) |
| Catégorie | Jeux › Arcade |
| Classification attendue | PEGI 3 · ESRB Everyone (questionnaire IARC) |
| Public cible recommandé | 13 ans et plus (pas d'obligations Familles ; annonces « PG » maximum) |
| Prix | Gratuit, aucun achat intégré, publicités récompensées facultatives |
| Pays | Tous |
| Langues | Français (par défaut), anglais, espagnol |

### Visuels

- **Icône** (`store/src/icon.svg` → `store/icon/icon-512.png`) :
  - un gros ballon de basket qui plonge dans un cercle blanc avec son filet, sur fond bleu nuit et halo orange ;
  - formes épaisses, aucun petit détail : lisible à 48 px et reconnaissable à 16 px.
  - Déclinée en icône adaptative Android (motif dans la zone sûre + fond), ronde et classique, pour toutes les
    densités.
- **Feature graphic 1024 × 500** (`store/src/feature-graphic.html` → `store/feature-graphic/`, FR / EN / ES) :
  - salle de basket la nuit : projecteurs, parquet en perspective, tribunes floues ;
  - logo HoopBounce, « Dribble · Rebondis · Marque », « Par EchoSpeed » ;
  - un ballon lumineux qui file vers un panier (panneau de verre, cercle, filet), avec traînée, impact de
    rebond et étincelles.
- **Écran de démarrage natif** : le fond du jeu (`#04070F`) et le ballon, puis l'écran de chargement du jeu
  (enchaînement sans flash blanc).
- **Captures** (`store/screenshots/`, 10 par langue, 1920 × 1080) : Gameplay (panier « SWISH ! »), Menu, Ville,
  Neige, Volcan, Forêt, Espace, Boutique, Missions, Récompenses quotidiennes.
  - Chaque capture existe en version « fiche » (légende + cadre) et en version brute.
  - Ce que chacune doit montrer et l'ordre conseillé : `store/SCREENSHOTS.md`. Google n'en accepte que 8 par
    type d'appareil.
- Tous les visuels se régénèrent :
  - `node store/tools/render-assets.mjs` pour l'icône, la bannière, les icônes et les écrans de démarrage ;
  - `node store/tools/screenshots.mjs fr|en|es` pour les captures, prises dans le vrai jeu avec un profil de
    joueur préparé.

### Textes (`store/LISTING.md`)

- Pour chaque langue (FR, EN, ES) : titre, description courte, description complète, points forts et
  mots-clés, avec un ton dynamique.
- Longueurs vérifiées (titre ≤ 30, courte ≤ 80, complète ≤ 4 000).
- Les mots-clés sont intégrés au texte, car Google Play n'a pas de champ dédié.

### Politique de confidentialité (`store/privacy-policy.html`)

- Page autonome en FR / EN / ES, à héberger (GitHub Pages ou site du développeur). Son URL est obligatoire.
- Elle explique :
  - données uniquement sur l'appareil, aucun compte ;
  - publicités AdMob facultatives et données collectées par le SDK ;
  - consentement UMP, enfants, permissions, suppression.
- Reste à remplacer : `[E-MAIL DE CONTACT]`.

### Projet Android (`android/`, Capacitor 8)

- `npm run android:sync` copie le jeu (`tools/build-web.mjs` → `www/`) dans l'application ;
  `npm run android:open` ouvre Android Studio.
- Manifeste :
  - paysage forcé (`sensorLandscape`) ;
  - identifiant d'application AdMob (test) ;
  - permissions Internet et Vibreur.
- `MainActivity` : plein écran immersif (barres système masquées).
- Thème : fond `#04070F` sur l'écran de démarrage, la fenêtre et les barres système.
- Signature de la version publiée via `android/keystore.properties` (ignoré par Git, modèle
  `keystore.properties.example`).
- Construction de l'AAB : `./gradlew bundleRelease`, avec la signature d'application par Google Play.
- Elle n'a pas pu être faite dans l'environnement de développement : le téléchargement du SDK Android y est
  bloqué. Elle se fait dans Android Studio (`store/CHECKLIST.md` § 10).

### Version de test Android — APK (étape 20)

**Fichier :** `dist/HoopBounce_Test_v1.apk` (≈ 0,5 Mo), à installer à la main pour soi et des amis testeurs.
Guide complet : `native/test-apk/README.md`.

| | |
|---|---|
| Nom affiché | **Hoop Bounce Test** (icône du ballon) |
| Identifiant | `com.echospeed.hoopbounce.test` — distinct de la version Play Store : les deux peuvent coexister |
| Version | `1.0.0-test1` (code 1) ; « 1.0.0 (test 1) » dans Paramètres et À propos |
| Android | 7.0 minimum (API 24), cible Android 14 (API 34) ; paysage, plein écran immersif, écran toujours allumé |
| Processeurs | tous (aucun code natif) |
| Permissions | **vibreur uniquement** — aucune permission Internet : tout fonctionne hors ligne |
| Publicités | **annonces de TEST simulées** par le jeu (aucun identifiant AdMob, aucune vraie publicité, aucune requête réseau) ; `useTestAds: true` vérifié par un test |
| Signature | clé de **test** (`native/test-apk/keys/`, non versionnée), schémas v2 + v3 ; empreinte SHA-256 `894f0b7d…35bfd8` |
| Débogage | WebView inspectable depuis un ordinateur (`chrome://inspect`, débogage USB) |

**Comment elle est construite** (`npm run android:test-apk` → `tools/build-test-apk.mjs`) : le projet Capacitor
(`android/`) a besoin de Gradle, du SDK Android et des bibliothèques Google (dl.google.com), bloqués dans
l'environnement de développement. La version de test utilise donc une **enveloppe minimale**
(`native/test-apk/` : une activité Java, une WebView plein écran, les fichiers du jeu servis depuis l'APK sous une
adresse https locale — les modules JavaScript l'exigent, et la sauvegarde reste attachée à une origine stable),
assemblée avec les outils Android d'Ubuntu (`aapt2`, `javac`, `dalvik-exchange`, `zipalign`, `apksigner`, API 23
pour la compilation). Les fichiers du jeu sont exactement ceux de l'application Capacitor (`tools/build-web.mjs`).

**Vérifié avant la génération** (navigateur mobile simulé 844 × 390, tactile) — 30 contrôles, **0 erreur** :
lancement (écran de chargement → menu), les 9 pages du menu, récompense quotidienne, coffre bonus, roue gratuite
et roue avec annonce de test, achat et équipement d'un skin dans la boutique, skin visible en jeu, panier et
pièces gagnées, pièces doublées par annonce de test, échec puis reprise au drapeau par annonce de test, niveau 1
des 5 mondes jouable (55-60 images/s), sauvegarde (pièces, skin équipé, progression) après fermeture ; plus les
330 tests automatiques.

**Vérifié après la génération** :
- les **mêmes 30 contrôles rejoués sur les fichiers extraits de l'APK**, servis exactement comme le fait
  l'application (même table de types, mêmes en-têtes) : tout passe, 0 erreur ;
- les 93 fichiers du jeu sont présents ; `apksigner verify` : signature valide d'Android 7 à Android 16 ;
  `zipalign` correct ; `aapt dump badging` : paquet, versions, permission et activité de lancement conformes.

**Non vérifiable ici** : l'installation et l'exécution sur un vrai téléphone (pas d'appareil ni d'émulateur
Android dans l'environnement de développement) → premier essai à faire par le porteur du projet.

**Mettre à jour les testeurs** : `node tools/build-test-apk.mjs --build 2` → `HoopBounce_Test_v2.apk`, signée
avec **la même clé de test** (sinon il faut désinstaller, ce qui efface la progression de test).

### Avant d'appuyer sur « Publier » (résumé de la checklist)

1. Comptes Play Console et AdMob ; confirmer l'identifiant du paquet.
2. Vrais identifiants AdMob (`ads-config.js`, `strings.xml`), `useTestAds: false`, `app-ads.txt`, message RGPD.
3. Politique de confidentialité en ligne ; fiche FR / EN / ES ; questionnaires de contenu (annonces,
   classification, public cible, sécurité des données).
4. AAB signé (build 1) → test interne → test fermé (12 testeurs, 14 jours si compte personnel) → production en
   déploiement progressif.

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

### Phase 4 — Gameplay principal ✅
- ✅ Dribble et puissance à 5 niveaux
- ✅ Retour de la puissance quand le ballon reste au sol
- ✅ Physique plus franche (gravité, accélération)
- ✅ Panier validé seulement quand le ballon est entièrement passé
- ✅ 6 niveaux courts avec 3 étoiles chacun
- ✅ HUD, pause, victoire, tutoriel, progression
- ✅ Validation par le porteur du projet (passage à l'étape des mondes)
- 🔴 Réglages fins après retours sur appareil

### Phase 5 — Mondes ✅
- ✅ 5 mondes définis : Ville, Neige, Volcan, Forêt, Espace (10 niveaux prévus chacun)
- ✅ Identité de chaque monde : décor, couleurs, ambiance, lumière, particules, effets, animations
- ✅ Musique et ambiance sonore de chaque monde, sons des mécaniques
- ✅ 21 mécaniques propres aux mondes (moteur, rendu, sons, tests)
- ✅ Carte des mondes : illustrations, cadenas, déblocage animé, barre de progression, étoiles, pourcentage
- ✅ Choix du niveau, écran d'introduction de chaque monde, transition entre mondes
- ✅ Déblocage automatique du monde suivant
- ✅ Les 50 niveaux, difficulté progressive dans chaque monde et d'un monde à l'autre, tous vérifiés
- ✅ Décors de qualité « jeu mobile » refaits pour chaque monde ; matériaux, pics et plateformes par monde
- ✅ Retours du porteur du projet sur les 50 niveaux et les décors (→ passe de finition de l'étape 10)
- ✅ Mondes beaucoup plus reconnaissables : enseignes au néon, avions, nuages de froid, traces dans la neige,
  chaleur visible, papillons, débris en apesanteur, éclairage et étalonnage par monde
- ✅ Ambiance sonore propre à chaque monde (fond continu et sons ponctuels)
- ✅ Difficulté refaite : 5 paliers, courbe beaucoup plus raide, une difficulté nouvelle par niveau
- ✅ Pièges propres aux mondes : pilons, rochers qui dévalent, jets de flammes, trous noirs
- 🟡 Validation de la passe de finition par le porteur du projet
- ✅ Vraie sélection des mondes et des niveaux dans le menu (étape 11) : la tuile « Mondes » n'ouvre plus de
  page d'attente

### Phase 6 — Économie, magasin et skins 🟡
- ✅ Gagner des pièces (niveaux, étoiles, 3 étoiles, rejouer, swish)
- ✅ Boutique premium : 25 articles (ballons, effets de rebond, traînées, animations de panier), 4 raretés,
  aperçu animé, achat, équipement, progression de la collection
- ✅ Articles équipés visibles en jeu
- ✅ Page Collection du menu : articles possédés, aperçu, Équiper / Déséquiper, badge « Équipé » (étape 11)
- ✅ Coffres, récompense quotidienne, missions et succès (étape 12)
- ✅ Économie de collection (étape 17) : prix de 6 000 à 1 000 000, 51 articles (20 nouveaux dont 7 ballons à
  visage), Collection en album avec articles verrouillés visibles, animations de déblocage par rareté

### Phase 6 bis — Finition « vrai jeu mobile » 🟡
- ✅ Sensations : caméra (recul en hauteur, coups de zoom, arrêt sur image), contrôle en l'air plus vif
- ✅ Ombres douces, lumière du monde sur le ballon, étalonnage des couleurs
- ✅ Effets de rebond (éclair, traits de vitesse, matière du monde) et de panier (gerbe de rayons, ondes)
- ✅ Animations d'interface : onde au toucher, boutons élastiques, reflets, transitions entre pages
- ✅ Performances revérifiées (60 images/s, décors du volcan allégés)
- 🟡 Validation par le porteur du projet ; réglages fins sur un vrai téléphone

### Phase 6 ter — Expérience utilisateur 🟡
- ✅ Sélection des mondes (grandes cartes, cadenas et condition, déblocage animé) et des 10 niveaux
- ✅ Rejouer n'importe quel niveau débloqué depuis le menu ; « Choisir un niveau » depuis la pause
- ✅ Collection corrigée : articles achetés visibles, aperçu, équiper / déséquiper, choix enregistré
- ✅ Progression plus claire : niveau à reprendre sous JOUER, pastilles sur les tuiles, barres par monde
- ✅ Sons de clic, ouverture animée des fenêtres, animations des cartes de mondes
- 🟡 Validation par le porteur du projet

### Phase 6 quater — Revenir chaque jour 🟡
- ✅ Récompense quotidienne : calendrier de 7 jours, coffre, traînée et skin exclusifs, révélation animée
- ✅ Missions quotidiennes : 3 par jour, tirées automatiquement, renouvelées à minuit, barres animées
- ✅ Succès : 40 succès sur 4 paliers, médailles, récompenses à récupérer
- ✅ Statistiques comptées pendant la partie, bannières « Mission terminée » / « Succès débloqué »
- ✅ Coffres et 6 articles exclusifs ; pastilles sur l'accueil ; ouverture automatique une fois par jour
- 🟡 Validation par le porteur du projet ; équilibrage des récompenses

### Phase 6 quinquies — Publicités récompensées 🟡
- ✅ Gestionnaire centralisé (chargement, affichage, récompense validée, erreurs, absence d'annonce, limites)
- ✅ Configuration unique `ads-config.js` : identifiants de test officiels, production prête à remplir
- ✅ Doubler les pièces (victoire), reprendre au drapeau (échec), coffre bonus amélioré, lancer de roue
- ✅ Page Bonus du jour : coffre gratuit ou amélioré, roue de la chance animée
- ✅ Annonce de test simulée dans le navigateur ; politique de confidentialité mise à jour
- 🟡 Validation par le porteur du projet ; essai du vrai SDK sur un appareil (phase Android)

### Phase 6 sexies — Écran de chargement 🟡
- ✅ Écran de chargement premium : logo HoopBounce, « Par EchoSpeed », ballon qui rebondit, particules,
  barre de progression qui suit les étapes réelles
- ✅ Fondu + léger zoom vers le menu, ouverture automatique ; seulement au lancement
- 🟡 Validation par le porteur du projet

### Phase 6 septies — Son et sensations (game feel) 🟡
- ✅ Identité sonore partagée (timbre, gamme, motif du rebond) : menu, boutique, jeu
- ✅ Sons des surfaces, roulement, souffle, réverbération par monde, stéréo ; panier parfait, échec, jingles
- ✅ Musique A/B avec intensité dynamique ; ambiances enrichies (dont grondements qui font trembler l'image)
- ✅ Retours des gros rebonds, gros atterrissages, panier parfait, victoire (confettis plein écran)
- ✅ Effets visuels propres à chaque monde (contact, roulement, décor qui réagit), lueur de puissance
- ✅ Caméra : impulsions, regard vers le bas, plan d'ouverture, ralentis progressifs, mouvements réduits
- 🟡 Validation par le porteur du projet ; essai au casque et sur haut-parleur de téléphone

### Phase 7 — Modes de jeu 🟡
- ✅ Page « Modes à venir » : 3 cartes de présentation illustrées et animées, verrouillées (étape 19)
- 🔴 **Endless** : course infinie (passages générés à la suite), distance et meilleur score
- 🔴 **Course Multijoueur** : les joueurs jouent le même niveau, chacun avec son ballon, physique identique au
  solo ; le premier qui marque gagne ; les erreurs et les pièges créent des retournements (temps réel ou
  fantômes asynchrones ; demande un serveur)
- 🔴 **Créateur de Maps** : éditeur de niveaux (plateformes, obstacles, panier), essai, partage avec les amis
  (demande un format de niveau partageable et un serveur)

### Phase 8 — Android 🟡
- ✅ Projet Capacitor 8 (`android/`) : identifiant `com.echospeed.hoopbounce`, version 1.0.0 (build 1), SDK 36
- ✅ Plugin AdMob installé, identifiant d'application (test) dans le manifeste
- ✅ Verrouillage en paysage, plein écran immersif, vibreur
- ✅ Icône (adaptative, ronde, classique), écran de démarrage natif assorti, nom de l'application
- ✅ **Version de test APK** installable à la main : `dist/HoopBounce_Test_v1.apk` (enveloppe WebView minimale,
  annonces de test simulées, hors ligne) (étape 20)
- 🟡 AAB signé à construire dans Android Studio (SDK Android indisponible dans l'environnement de développement)
- 🟡 Tests sur vrais appareils avec la version de test (entrée de gamme, milieu de gamme, haut de gamme) ;
  🔴 annonces de test AdMob réelles sur appareil (seulement avec la version Capacitor)
- 🔴 Vibrations natives (Capacitor Haptics), si `navigator.vibrate` ne suffit pas dans la WebView

### Phase 9 — Publication 🟡
- ✅ Fiche Play Store : icône 512, feature graphic 1024 × 500, 10 captures × 3 langues, textes FR / EN / ES
- ✅ Checklist complète avant publication (`store/CHECKLIST.md`)
- 🟡 Politique de confidentialité prête (`store/privacy-policy.html`) : e-mail à ajouter, puis hébergement
- 🔴 Vrais identifiants AdMob, `app-ads.txt`, message de consentement
- 🔴 Déclarations Play Console : annonces, classification, public cible, sécurité des données
- 🔴 Test interne, test fermé (12 testeurs × 14 jours), puis publication progressive

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
- ✅ 5 mondes : thèmes, musiques, ambiances, 21 mécaniques, carte des mondes, intro, transitions, déblocage
- ✅ Musique pendant la partie (une par monde) ; qualité graphique appliquée aux particules du jeu
- ✅ 50 niveaux (10 par monde) avec solutions expertes en données ; décors et matériaux par monde
- ✅ Pièges : plaques qui tombent, blocs temporisés, scies, boulets, lasers, aimants, canons, points de contrôle
- ✅ Niveaux enrichis : rythme facile / moyen / difficile, étoiles risquées, drapeaux dans les niveaux longs
- ✅ Boutique, pièces et cosmétiques
- ✅ Passe de finition : identité visuelle et sonore des mondes, difficulté à 5 paliers, 4 pièges propres aux
  mondes, sensations de jeu, éclairage, ombres, effets, animations d'interface
- ✅ Tests automatiques + outil de vérification des niveaux (avec pilote pour les solutions expertes, dont
  `jumpBoulder` et `dodgeBoulders` pour les rochers)
- ✅ Sélection des mondes et des niveaux dans le menu, Collection complète, niveau à reprendre sous JOUER
- ✅ Récompense quotidienne (7 jours), missions quotidiennes (3 par jour), 40 succès, coffres, 6 exclusifs
- ✅ Publicités récompensées facultatives (AdMob) : doubler les pièces, reprendre au drapeau, coffre bonus,
  roue de la chance ; page Bonus du jour (étape 13)
- ✅ Écran de chargement (logo, signature EchoSpeed, ballon, particules, barre, fondu vers le menu) (étape 14)
- ✅ Version de test Android (étape 20) : `HoopBounce_Test_v1.apk`, vérifiée avant et après la génération
- ✅ Page « Modes à venir » (étape 19) : Endless, Course Multijoueur, Créateur de Maps (présentation seulement)
- ✅ Son et sensations (étape 18) : identité sonore, sons des surfaces et du roulement, musique dynamique,
  jingles, ambiances, retours des grands moments, effets des mondes, caméra
- ✅ Nouvelle économie de la boutique (étape 17) : prix par rareté, 20 nouveaux objets, album de collection
- ✅ Page « À propos » (étape 16) : version, créateur, copyright, crédits faciles à compléter, liens reliables
- ✅ Préparation Google Play (étape 15) : icône, feature graphic, captures, textes FR / EN / ES, checklist,
  politique de confidentialité, projet Android Capacitor, version 1.0.0
- ✅ Documentation (README, PROJECT.md, format des niveaux)

### En cours 🟡
- 🟡 Essais de `HoopBounce_Test_v1.apk` sur téléphone par le porteur du projet et ses amis (étape 20) : noter ce
  qui ne va pas (démarrage, performances, son, vibrations, encoche, sauvegarde, confort des commandes)
- 🟡 Attente des retours du porteur du projet sur la page « Modes à venir » (étape 19) et sur le son et les
  sensations (étape 18)
- 🟡 Décision en attente (étape 17) : pondérer les objets tirés des coffres et de la roue

### À faire — court terme 🔴
- 🔴 Publication (quand le porteur du projet le décide) : suivre `store/CHECKLIST.md` (comptes, AdMob, AAB,
  tests fermés)
- 🔴 Essayer l'application sur de vrais téléphones (encoche, vibrations, annonces de test, performances)
- 🔴 Ajuster le ressenti (gravité, hauteurs, dribble, inertie) selon les retours — toute modification de
  trajectoire demande de revérifier les 50 niveaux (`node tools/route-check.mjs 400 --save`)
- 🔴 Écouter les sons sur de vrais téléphones (haut-parleur mono, casque) et ajuster les volumes relatifs
- 🔴 Ajuster la difficulté (notamment la plateforme mobile du niveau 4)
- 🔴 Faire apparaître le panier du niveau 5 dès le départ (il est hors de l'écran au début)
- 🔴 Éviter que l'étiquette « Rebondir » du tutoriel recouvre le panier du niveau 1
- 🔴 Éprouver la nouvelle courbe de difficulté avec de vrais joueurs (et sur un vrai téléphone) : surtout
  Forêt 5 et Espace 5 (fenêtres les plus serrées)

### À faire — moyen terme 🔴
- 🔴 Équilibrer les prix et les gains après les retours (pièces des missions, des succès, des coffres, de la roue
  et du doublement par publicité comprises)
- 🔴 Notifications Android (rappel de la récompense quotidienne) une fois l'application emballée
- 🔴 Nouveaux éléments (surfaces collantes, interrupteurs à minuterie…)
- 🔴 Accessibilité : taille des boutons réglable, inversion gauche / droite pour les gauchers

### À faire — long terme 🔴
- 🔴 Développer les modes présentés dans « Modes à venir » : Endless, Course Multijoueur, Créateur de Maps
- 🔴 Emballage Android (Capacitor), tests sur appareils, publication Play Store
- 🔴 Sauvegarde dans le cloud (Google Play Games)

---

## 8. Idées futures

**Gameplay**
- Surfaces : boue (colle), caoutchouc (super-rebond).
- Combinaisons de mécaniques entre mondes (glace + vent, lianes au-dessus de la lave…), niveaux bonus.
- Boss de fin de monde (un panier qui bouge, un parcours chronométré).
- Aimants qui attirent ou repoussent le ballon.
- Interrupteurs à minuterie, portes multiples, leviers.
- Paniers mobiles, paniers multiples (marquer dans l'ordre).
- Vent latéral, tapis roulants, canons à ballon.
- Bonus « tir parfait » : marquer sans toucher le cercle (« swish ») rapporte plus.
- Ralenti « bullet time » au-dessus du panier.

**Modes** (les trois premiers sont annoncés dans le menu depuis l'étape 19)
- **Endless** : passages générés à l'infini à partir des briques des 50 niveaux, difficulté qui monte, distance et
  meilleur score, pièces en route.
- **Course Multijoueur** : compétition de maîtrise sur le même niveau ; chacun son ballon, physique du solo ; le
  premier qui marque gagne ; écran partagé ou fantômes des adversaires ; en temps réel ou contre des parties
  enregistrées.
- **Créateur de Maps** : poser plateformes, obstacles et panier sur une grille, tester son niveau, le partager par
  un code ; les niveaux utilisent le même format que les 50 niveaux du jeu (`src/game/levels/`).
- Idées retirées de la page (gardées pour plus tard) : Trickshot (marquer depuis des positions imposées, avec des
  rebonds sur les murs), Défis quotidiens (un niveau par jour, classement).
- Contre-la-montre avec fantôme de son meilleur passage.

**Personnalisation**
- Skins de ballons (classique, néon, rétro, plage, or…), traînées lumineuses, effets de panier.
- Filets et paniers personnalisés.

**Progression et social**
- Mondes supplémentaires (plage, gymnase, toits, désert…).
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
- Ciel (dégradés, nébuleuses, étoiles, astres) et vignette **précalculés à la résolution exacte de l'écran**
  et copiés 1:1 à chaque image : une image agrandie coûtait ~10 fois plus cher (4,3 ms → 0,45 ms par copie
  mesuré en rendu logiciel).
- Silhouettes du décor regroupées en quelques chemins par plan (un remplissage par couleur au lieu d'un par
  forme : immeubles et fenêtres, montagnes et neiges, sapins, arbres et feuillages…).
- Particules d'ambiance : **fonctions du temps** (aucune mise à jour, aucune allocation) ; leur nombre suit la
  qualité graphique (basse 40 %, moyenne 70 %, haute 100 %).
- Éléments périodiques (geysers, chutes de pierres) : fonctions pures du temps du niveau (rien à simuler).
- Pas de grand halo animé ni de dégradé recréé à chaque image (rayons de lumière : un dégradé partagé).
- Silhouettes de fond : chaque plan n'est rempli que jusqu'au plan suivant (moins de surface repeinte).
- Résolution interne du canvas plafonnée à 2× (aucun gain visible au-delà, beaucoup plus de pixels).
- Résultat (Chromium sans carte graphique, écran 844×390 en ×2) : **0 à 4 images lentes sur 240** selon le
  monde, avec les décors détaillés de la v0.7.0 (voitures, fenêtres animées, fumée, oiseaux…).
- Fenêtres animées, voitures, fumée, oiseaux, étoiles filantes : fonctions du temps, regroupées par couleur
  dans quelques chemins ; seuls les détails des surfaces visibles à l'écran sont dessinés.

**Menu**
- Plans fixes du décor précalculés à chaque redimensionnement ; faisceaux des projecteurs incrustés une fois
  pour toutes.
- Lueur du bouton JOUER animée par l'opacité d'un calque (pas de repeinture d'ombre à chaque image).
- 3 niveaux de qualité graphique (résolution, particules, reflets).
- Aucun `backdrop-filter` (flou recalculé à chaque image, coûteux sur mobile).

**Carte des mondes**
- Seul le monde au centre est animé ; les autres illustrations sont dessinées une fois.
- Résolution des illustrations plafonnée à 1,5×.

**Général**
- Rendu et musique arrêtés quand l'application est en arrière-plan ; la musique est programmée à chaque image
  (aucun minuteur) et ne rattrape pas les notes manquées au retour.
- Sons synthétisés : aucun fichier audio à charger ; sons limités en fréquence ; compresseur anti-saturation.
- Polices réduites au sous-ensemble latin (~83 Ko au total).
- Résultat : **60 images/s stables** dans tous les écrans, mesurées dans Chromium sans carte graphique.

**Étape 12 (revenir chaque jour)**
- Statistiques : comptées en mémoire pendant la partie, enregistrées en groupe (fin de niveau, toutes les 5 s de
  jeu, mise en arrière-plan) — aucune écriture à chaque rebond.
- Missions et succès vérifiés au plus une fois toutes les 1,2 s pendant la partie (calcul très léger).
- Révélation des récompenses : éléments DOM animés uniquement en transform / opacity ; les rayons sont un seul
  dégradé conique (taille limitée à 130 % du petit côté de l'écran) ; la pluie de pièces dure 2,5 s puis est retirée.

**Étape 10 (finition)**
- Nouveaux effets choisis pour leur faible coût : ombre et liseré de lumière du ballon = petites images
  précalculées ; étalonnage des mondes **cuit dans la vignette** déjà copiée à chaque image (coût nul) ;
  enseignes au néon précalculées avec leur halo ; nouveaux pièges = fonctions pures du temps.
- Particules d'impact dans le même réservoir préalloué (traits de vitesse, éclairs, nuages, éclats).
- Chaleur du volcan allégée après mesure : le grand dégradé plein écran animé (≈ 6 ms en rendu logiciel) est
  remplacé par la lueur cuite dans la vignette ; il ne reste que de fines ondulations (0,2 ms).
- Onde au toucher des pages : un élément créé puis retiré, jamais sur les commandes de jeu.

**Son et sensations (étape 18)**
- Roulement et souffle : **deux sources de bruit en boucle créées une fois**, dont on ne fait que régler le volume
  et le filtre à chaque image (aucun nœud audio créé en continu).
- Réverbérations : une seule par contexte audio, régénérée seulement au changement de monde.
- Particules de roulement émises **à la distance parcourue** (une gerbe tous les 0,9 u), pas à chaque image ;
  réservoir agrandi à 384, toujours préalloué.
- Confettis de victoire : canvas séparé dont la boucle **s'arrête dès qu'il n'y a plus de confettis**.
- Halo doré plein écran : un seul dégradé, dessiné seulement pendant le moment (≈ 1,6 s).
- Mesure (Chromium sans carte graphique, 844 × 390) : **60 images/s** dans les 5 mondes pendant les nouveaux
  effets ; aucune erreur dans la console (jeu, menu, boutique).

**Écran de chargement (étape 14)**
- Aucune image à télécharger : fond en dégradés CSS, ballon en SVG intégré à la page, particules sur un petit
  canvas (≤ 46 points). Il s'affiche donc avant même que le code du menu soit chargé.
- Durée liée aux étapes réelles (polices, page, menu, première image du décor) : pas d'attente artificielle au-delà
  de 1,1 s ; boucle d'animation arrêtée et élément retiré dès la fin.
- Rebond, écrasement, rotation et ombre en animations CSS (`transform` / `opacity`) : fluides même pendant que
  le code du menu se charge.

**Publicités (étape 13)**
- Le SDK publicitaire n'est **ni chargé ni initialisé au démarrage** : seulement quand un bouton de publicité
  apparaît (fin d'animation de victoire, écran d'échec, page Bonus). Aucun coût pendant le jeu.
- Une annonce est **préchargée** pendant que le joueur regarde l'écran : l'affichage est immédiat au toucher.
- Échecs de chargement : nouvelles tentatives espacées (8 s → 2 min), pas de boucle qui épuise la batterie.
- Roue de la chance animée par `transform` dans `requestAnimationFrame` (une seule couche), libellés en
  unités de conteneur (`cqw`) : nette à toutes les tailles sans recalcul.
- Mesure (Chromium sans carte graphique, 844×390 en ×2) : **médiane 16,7 ms (60 images/s)** sur les 5 grands
  finals, 0 à 9 images lentes sur 240 ; rendu d'une image ≈ 8–10 ms en logiciel (bien moins sur un GPU mobile).

---

## 10. Bugs connus

| Gravité | Bug | Statut |
|---|---|---|
| Info | Son (étape 18) : réglé au casque dans un navigateur, **pas encore écouté sur le haut-parleur d'un téléphone** (souvent mono et pauvre en graves : la couche de poids et la stéréo y seront moins sensibles). | 🔴 À tester (phase Android) |
| Info | Physique (étape 18) : les trajectoires sont volontairement inchangées pour garder l'équilibre vérifié des 50 niveaux ; un freinage plus franc au sol a été essayé puis abandonné (16 passages à revérifier). | 🟡 À rediscuter avec les retours des joueurs |
| ✅ | Boutique (étape 18, en cours de développement) : l'achat d'un objet épique ou légendaire plantait (variable supprimée par erreur). | ✅ Corrigé avant publication |
| Info | Économie (étape 17) : les coffres et la roue donnent toujours des **objets entiers** tirés au hasard parmi les raretés prévues : coffre épique → épique ou légendaire ; coffre bonus amélioré → rare, épique ou légendaire ; roue → skin épique ou légendaire. Avec les nouveaux prix, un légendaire (500 000+) peut donc tomber d'un coffre. Les gains n'ont pas été réduits, comme demandé. | 🟡 À décider : pondérer les tirages vers les raretés basses, si les légendaires doivent rester rares |
| ✅ | Boutique entre 920 et 1 100 px de large : le compteur de pièces sortait de l'écran ; sur les cartes légendaires, le prix et « ★ Exclusif » débordaient. | ✅ Corrigé (v1.0.0) |
| Info | Version de test (APK) : construite et vérifiée (signature, contenu, jeu rejoué depuis l'APK), mais **pas encore lancée sur un vrai téléphone** (aucun appareil ni émulateur disponible). Sur un téléphone dont « Android System WebView » n'est pas à jour (avant 2020), le jeu peut ne pas démarrer. | 🔴 À tester par le porteur du projet |
| Info | Version de test : pas de vraies annonces de test AdMob (SDK absent de l'enveloppe) ; ce sont les annonces de test simulées du jeu. Les vraies annonces de test se vérifient avec la version Capacitor (`android/`). | 🟡 Normal pour cette version |
| Info | Projet Capacitor (`android/`, version Play Store) jamais construit (SDK Android indisponible dans l'environnement de développement) : à faire dans Android Studio. | 🔴 À tester |
| Info | Fournisseur AdMob (application Android) écrit d'après la documentation du plugin, **pas encore essayé sur un appareil** : événements de récompense et de fermeture à confirmer avec les annonces de test. | 🔴 À tester (phase Android) |
| Faible | Écran de victoire sur petit téléphone : la bannière « Mission terminée ! » recouvre quelques secondes le titre « Panier ! ». | 🟡 À améliorer |
| Info | Les limites de publicités par jour suivent l'heure de l'appareil (comme la récompense quotidienne). | 🟡 Normal hors ligne |
| ✅ | Ouvrir une page du menu pendant l'entrée animée de l'accueil laissait les boutons du haut par-dessus l'en-tête. | ✅ Corrigé (v0.11.0) |
| Info | La journée change à minuit, heure de l'appareil : changer l'heure du téléphone permet de récupérer plus tôt (aucun serveur pour vérifier). | 🟡 Normal hors ligne ; à revoir si un compte en ligne arrive |
| Info | Les statistiques comptent à partir de la v0.11.0 : les succès basés sur les rebonds, paniers, chutes ou le temps de jeu repartent de zéro (ceux basés sur les niveaux, les étoiles et les achats tiennent compte de la progression existante). | 🟡 Sans conséquence (phase de développement) |
| ✅ | Le bouton JOUER du menu affichait toujours « Niveau 1 · Premier dribble ». | ✅ Corrigé (v0.10.0 : il affiche le niveau à reprendre) |
| ✅ | Collection : un article acheté dans la boutique n'apparaissait pas (la page lisait un ancien catalogue vide). | ✅ Corrigé (v0.10.0 : lecture de l'inventaire partagé, relu au retour de la boutique) |
| Faible | Niveau 5 : le panier est hors de l'écran au départ (on le découvre en montant). | 🔴 À corriger |
| Faible | Niveau 1 : l'étiquette « Rebondir » du tutoriel recouvre en partie le panier (elle disparaît après 3 rebonds). | 🔴 À corriger |
| ✅ | Ancienne page « Magasin » du menu restée dans le code. | ✅ Retirée (v0.10.0) |
| ✅ | La page « Collection » du menu restait vide. | ✅ Corrigé (v0.10.0) |
| Info | Pièges et timings vérifiés par simulation (chaque passage a une solution), pas encore par des joueurs. La nouvelle courbe (étape 10) est volontairement raide : à éprouver avec de vrais joueurs. | 🟡 À équilibrer après retours |
| Info | Contrôle légèrement plus vif (étape 10) : les anciennes solutions enregistrées ont été régénérées. | ✅ Fait |
| ✅ | La tuile « Mondes » du menu ouvrait une page d'attente. | ✅ Corrigé (v0.10.0 : sélection des mondes et des niveaux) |
| ✅ | Carte : « Terminé » affiché alors que des niveaux prévus manquaient. | ✅ Résolu (v0.7.0 : les 50 niveaux existent) |
| Info | Difficulté des 50 niveaux vérifiée par simulation (chaque passage a une solution), mais pas encore éprouvée par des joueurs : certains timings (geysers, astéroïdes) peuvent sembler serrés. | 🟡 À équilibrer après retours |
| Info | Ancienne progression : les niveaux de démonstration de l'étape 7 (`snow-1`, `volcano-1`, `forest-1`, `space-1`) sont devenus les niveaux 6 de leur monde ; un niveau `…-1` déjà terminé compte pour le nouveau niveau 1. | 🟡 Sans conséquence (phase de développement) |
| Faible | Le son de déblocage sur la carte peut rester muet si le navigateur n'autorise pas encore l'audio (aucun toucher sur la page). | 🟡 Limitation des navigateurs |
| Info | Décors plus riches (v0.7.0) : 0 à 4 images lentes sur 240 selon le monde en rendu logiciel. | 🟡 À surveiller sur appareil réel |
| ✅ | Le réglage « Musique » agit maintenant dans la partie (musique de chaque monde). | ✅ Corrigé (v0.6.0) |
| ✅ | La qualité graphique agit maintenant sur les particules d'ambiance du jeu. | ✅ Corrigé (v0.6.0) |
| Faible | Version en ligne (lien de prévisualisation claude.ai) : le bouton « Menu » de la partie n'a pas pu être vérifié sur cet hébergement. En local, il fonctionne. | 🟡 À vérifier |
| Info | Jamais testé sur un vrai téléphone : sons, vibrations et confort tactile vérifiés seulement dans le code et dans un navigateur simulé. | 🔴 À tester (phase Android) |
| ✅ | Niveau 6 : quelques images lentes (≈ 2 %) en rendu logiciel. | ✅ Corrigé (v0.6.0 : ciel et vignette copiés 1:1) |

---

## 11. Journal des modifications

### 20/11/2026 — Étape 20 : version de test Android (APK) (v1.0.0-test1)
- **Ajouté** :
  - **`dist/HoopBounce_Test_v1.apk`** (≈ 0,5 Mo) : « Hoop Bounce Test », `com.echospeed.hoopbounce.test`,
    Android 7.0+, cible Android 14, tous processeurs, hors ligne, vibreur seulement, annonces de **test**
    simulées, signée (v2 + v3) avec une clé de test ;
  - enveloppe Android minimale `native/test-apk/` (manifeste, `MainActivity` : WebView plein écran, fichiers du
    jeu servis depuis l'APK, plein écran immersif, encoche, bouton retour, pause en arrière-plan) et guide
    d'installation `native/test-apk/README.md` ;
  - script `tools/build-test-apk.mjs` (`npm run android:test-apk`, `--build N`) ;
  - 2 tests (`tests/test-build.test.mjs` : identifiants de test, paquet distinct, pas d'Internet) ;
  - vérification complète avant et après la génération (30 contrôles, 0 erreur ; voir « Version de test
    Android »).
- **Modifié** : `.gitignore` (dossier `build/`, clé de test) ; `package.json` (script `android:test-apk`).
- **Inchangé** : le jeu lui-même ; les publicités restent en mode test (`useTestAds: true`), aucun identifiant
  AdMob réel.
- **Reste à faire** :
  - installer et essayer l'APK sur de vrais téléphones, puis recueillir les retours des amis testeurs ;
  - version Play Store (AAB, vraies annonces de test AdMob) depuis `android/` dans Android Studio.

### 20/11/2026 — Étape 19 (suite) : carte « Course Multijoueur » précisée (v1.0.0)
- **Modifié** :
  - description : « Affronte tes amis sur les mêmes niveaux et sois le premier à réussir le panier. » (FR / EN / ES) ;
  - illustration : **écran partagé** J1 / VS / J2 sur le même niveau ; J2 se fait piéger par les pics et repart,
    J1 marque le premier (étiquettes « P1 / P2 » en anglais).
- **Ajouté** : le fonctionnement prévu du mode (même niveau, un ballon par joueur, physique du solo, le premier
  qui marque gagne, retournements dus aux erreurs et aux pièges) dans « Modes à venir » et la roadmap.
- **Non fait, volontairement** : le mode n'est pas développé.
- **Reste à faire** : retours du porteur du projet.

### 20/11/2026 — Étape 19 : page « Modes à venir » (v1.0.0)
- **Ajouté** :
  - **3 cartes de présentation** dans le menu (`index.html#modes`), toutes verrouillées « 🔒 À venir » :
    🌊 **Endless**, 🏁 **Course Multijoueur**, 🛠️ **Créateur de Maps**, avec les descriptions demandées ;
  - une **illustration animée** par carte (SVG intégré + animations CSS) : défilement infini au-dessus des vagues ;
    trois ballons qui se dépassent avec classement en direct ; curseur qui pose une plateforme sur un plan
    quadrillé avec barre d'outils ;
  - style premium : couleur par mode, bord lumineux, cadenas qui bascule au toucher, pastille qui respire, reflet
    qui balaie l'illustration, entrée en cascade, carte qui se soulève au survol ;
  - textes FR / EN / ES ; 2 tests (`tests/modes.test.mjs`).
- **Modifié** :
  - la page s'appelle « Modes à venir » (« Coming modes », « Próximos modos ») ;
  - les anciennes cartes Trickshot et Défis quotidiens sont retirées (idées gardées dans « Idées futures ») ;
  - roadmap, tâches et idées futures : les modes prévus sont Endless, Course Multijoueur, Créateur de Maps.
- **Non fait, volontairement** : aucun des trois modes n'est développé (interface seulement).
- **Reste à faire** : retours du porteur du projet.

### 20/11/2026 — Étape 18 : son et sensations de jeu (game feel) (v1.0.0)
- **Ajouté** :
  - **identité sonore** partagée (`src/audio/ui-voice.js`) : timbre « pop », gamme pentatonique, **motif du rebond** ;
    sons de menu, de boutique et d'écrans de jeu unifiés (clic, ouverture, sélection, onglet, équipement, achat par
    rareté, refus, pièces, récompenses) ;
  - jeu : **voix de chaque surface** selon le monde, **roulement** et **souffle** continus, **réverbération** par
    monde, **stéréo**, rebond en couches (une note de plus par niveau de puissance), filet, **panier parfait**,
    échec, apparition du ballon, pièces qui tintent ;
  - musique : forme **A/B** en 8 mesures avec roulement, **intensité dynamique**, réverbération, **jingles** de
    victoire / panier parfait / échec dans la tonalité de chaque monde ; ambiances enrichies (terrain de basket et
    train, sifflement du vent et avalanche, lave qui glougloute, grillons et grenouille, pulsar et scintillements) ;
  - sensations : **ralentis progressifs** (`src/core/time-fx.js`), retours des rebonds 4 et 5 (gerbe du monde,
    arrêt sur image), **poids des gros atterrissages** (impulsion de caméra), **panier parfait** (ralenti ×0,2,
    zoom ×1,24, halo doré, carte « Panier parfait ! »), **confettis plein écran** à la victoire
    (`src/render/confetti.js`), lueur de puissance autour du ballon, onde sur le bouton REBOND, segments de
    l'anneau qui claquent, vibrations graduées ;
  - **effets des mondes** (`src/render/world-fx.js`) : contact, roulement (dont rayures sur la glace), lucioles,
    décor qui réagit (feuilles, neige, cendres, poussière, poussière d'étoiles) ;
  - caméra : impulsions directionnelles, regard vers le bas en chute, anticipation de la direction, **plan
    d'ouverture**, mouvements réduits si le système le demande ;
  - **repère d'atterrissage** sous le ballon quand il est haut ;
  - 10 tests (`tests/feel.test.mjs`).
- **Modifié** :
  - ballon plus élastique à l'écran (`CONFIG.feel`, purement visuel) ;
  - le ralenti du panier revient en douceur au lieu de s'arrêter d'un coup ;
  - réservoir de particules : 256 → 384.
- **Inchangé** : trajectoires et physique (les 50 niveaux restent vérifiés), aucun nouveau mode.
- **Reste à faire** :
  - retours du porteur du projet ;
  - écoute sur de vrais téléphones (haut-parleur et casque) ;
  - décision sur la pondération des coffres et de la roue (étape 17).

### 19/11/2026 — Étape 17 : économie de la boutique (v1.0.0)
- **Ajouté** :
  - **20 nouveaux objets** (51 au total) :
    - ballons Ombre, Plasma, Arc-en-ciel, Diamant ;
    - **7 ballons à visage** (Souriant, Pirate, Ninja, Robot, Fantôme, Yeux fous, Extraterrestre), avec un
      onglet « Visages » ;
    - effets de rebond Fumée, Flammes, Particules cosmiques ;
    - traînées Énergie, Galaxie ;
    - animations de panier Explosion de confettis, Électrique, Spatial, Triomphe légendaire ;
  - visages animés (`drawFace`) et **aura des ballons légendaires** (`drawAura`), dans le jeu, l'aperçu et les
    vignettes ;
  - nouvelles particules (fumée, halo, flamme) ;
  - boutique :
    - cadenas sur les articles non possédés, prix abrégés (« 650 k », « 1 M ») ;
    - barre d'objectif d'épargne ;
    - animations d'achat par rareté (rayons, éclats, « ÉPIQUE ! », « LÉGENDAIRE ! ») ;
    - cartes épiques lumineuses, cartes légendaires dorées qui respirent ;
  - Collection en **album** :
    - tous les articles visibles, les verrouillés grisés avec leur prix et leur aperçu ;
    - badge « Nouveau ! » ;
    - progression par rareté ;
    - bouton « Débloquer » qui ouvre la boutique sur l'article ;
  - 3 tests (prix, sauvegarde des nouveaux objets, rendu).
- **Modifié** :
  - **prix** : commun 6 000–9 500, rare 16 000–48 000, épique 80 000–240 000, légendaire 500 000–1 000 000 ;
  - « Foudre » devient « Éclairs », « Poudreuse » devient « Glace », la traînée « Flammes » devient « Feu » ;
  - les pièces s'affichent avec séparateur de milliers.
- **Inchangé** : tous les gains (niveaux, récompense quotidienne, missions, succès, coffres, roue, valeur des
  doublons).
- **Reste à faire** :
  - retours du porteur du projet ;
  - décider s'il faut pondérer les objets tirés des coffres et de la roue (voir « Bugs connus »).

### 19/11/2026 — Étape 16 : page « À propos » (v1.0.0)
- **Ajouté** :
  - page **À propos** (`src/menu/about-page.js`, `#apropos`), ouverte depuis **Paramètres › À propos de Hoop
    Bounce** :
    - nom du jeu et logo, version 1.0.0, créateur EchoSpeed, copyright ;
    - crédits : développement, design, musiques, effets sonores, graphismes, polices, technologies ;
    - boutons Politique de confidentialité et Conditions d'utilisation ;
  - contenu centralisé dans `src/shared/about.js` : crédits à compléter, adresses des liens à relier ;
  - animations d'ouverture, de clic et de survol ; 8 icônes ; textes FR / EN / ES ;
  - 3 tests (`tests/about.test.mjs`).
- **Modifié** :
  - la ligne « Crédits » des Paramètres devient « À propos de Hoop Bounce » ;
  - le retour d'une sous-page ramène à sa page parente ;
  - l'historique distingue les pages ouvertes par le menu et celles ouvertes par un lien direct.
- **Reste à faire** :
  - retours du porteur du projet ;
  - renseigner l'adresse en ligne de la politique de confidentialité (`LINKS.privacy`) une fois hébergée ;
  - conditions d'utilisation (facultatives).

### 19/11/2026 — Étape 15 : préparation de la publication Google Play (v1.0.0)
- **Ajouté** :
  - **icône** (`store/src/icon.svg`) : ballon qui plonge dans un cercle blanc, sur fond bleu nuit ;
    PNG 512 et 1024, icônes Android adaptative, ronde et classique ;
  - **feature graphic** 1024 × 500 en FR / EN / ES (`store/src/feature-graphic.html`) ;
  - **10 captures** par langue, prises dans le vrai jeu (`store/tools/screenshots.mjs`), en version « fiche »
    (légende + cadre) et brute ; guide de ce que chaque capture doit montrer (`store/SCREENSHOTS.md`) ;
  - **textes de la fiche** FR / EN / ES : titre, descriptions courte et complète, points forts, mots-clés
    (`store/LISTING.md`) ;
  - **checklist complète** avant publication (`store/CHECKLIST.md`) :
    - icône, captures, feature graphic, confidentialité ;
    - catégorie, classification, public cible, sécurité des données ;
    - pays, langues, version, build ;
    - AAB, AdMob, tests ;
  - **politique de confidentialité** autonome à héberger (`store/privacy-policy.html`) ;
  - **projet Android Capacitor 8** (`android/`, `capacitor.config.json`, `tools/build-web.mjs`) :
    - `com.echospeed.hoopbounce`, version 1.0.0 (build 1), SDK 36 ;
    - paysage, plein écran immersif, AdMob (test), vibreur ;
    - icônes, écran de démarrage assorti, signature par `keystore.properties`.
- **Modifié** :
  - version **1.0.0** (`package.json`, `src/shared/version.js`) ;
  - crédits du menu : « EchoSpeed » ;
  - `native/android/README.md` réécrit pour le projet réel.
- **Corrigé** : boutique entre 920 et 1 100 px de large :
  - le compteur de pièces sortait de l'écran ;
  - le prix ou « ★ Exclusif » débordait des cartes.
- **Reste à faire** :
  - retours du porteur du projet ;
  - comptes Play Console et AdMob ;
  - vrais identifiants publicitaires ;
  - hébergement de la politique de confidentialité ;
  - AAB signé dans Android Studio ;
  - tests sur appareils, test fermé, puis publication.

### 19/11/2026 — Étape 14 : écran de chargement (v0.13.0)
- **Ajouté** :
  - **écran de chargement** (`css/boot.css`, `src/boot/boot.js`, balisage en tête de `index.html`) :
    - fond dégradé sombre, faisceau et halos lumineux, particules qui montent ;
    - **HoopBounce** en grand et **« Par EchoSpeed »**, avec une entrée animée et un reflet ;
    - ballon qui rebondit doucement (écrasement, rotation, ombre) ;
    - barre de progression discrète qui suit les étapes réelles du chargement ;
  - sortie en **fondu avec léger zoom**, décor du menu qui se dézoome, ouverture automatique du menu.
- **Modifié** :
  - le menu signale à l'écran de chargement qu'il est prêt (code chargé, première image dessinée) ;
  - l'entrée animée de l'accueil et l'ouverture automatique de la récompense quotidienne attendent la fin de
    l'écran de chargement.
- **Reste à faire** :
  - retours du porteur du projet ;
  - écran de démarrage natif Android assorti (préparation Play Store).

### 19/11/2026 — Étape 13 : publicités récompensées facultatives (v0.12.0)
- **Ajouté** :
  - **gestionnaire de publicités** centralisé (`shared/ads.js`) : chargement, affichage, récompense après
    validation complète, erreurs de chargement, absence d'annonce, nouvelles tentatives, moments interdits
    (pendant un niveau, pendant les animations), limites par jour sauvegardées (`hoopbounce.ads`) ;
    fournisseurs **Google AdMob** (SDK officiel via `@capacitor-community/admob`, consentement UMP) et
    **annonce de test** simulée dans le navigateur ;
  - **configuration unique** `shared/ads-config.js` : identifiants de **test officiels** de Google pendant le
    développement, emplacements de production prêts à remplir, garde-fou tant qu'un `XXXX` reste ;
  - **Doubler les pièces** sur l'écran de victoire (×2 qui jaillit, éclat de pièces, son de cascade) ;
  - écran **« Niveau échoué »** quand un drapeau a été atteint : Recommencer, ou **continuer depuis le dernier
    drapeau** avec une publicité (offert si aucune annonce n'est disponible) ;
  - page **Bonus du jour** (`menu/bonus-view.js`, `#bonus`) : **coffre bonus** gratuit ou **amélioré** avec une
    publicité (nouveau coffre `super`), **roue de la chance** à 8 cases (1 lancer gratuit, 3 lancers bonus avec
    publicité), rotation fluide, ralentissement progressif, clics, pointeur, révélation ; bouton **Bonus** avec
    pastille sur l'accueil ; sauvegarde `hoopbounce.bonus` (`shared/bonus.js`) ;
  - sons : cascade de pièces (jeu), élan, clic de roue et surprise (menu) ;
  - `native/android/README.md` : Capacitor, manifeste, vrais identifiants, `app-ads.txt`, consentement,
    déclarations Play Console ;
  - 5 nouveaux tests (`tests/ads.test.mjs`).
- **Modifié** : après une chute avec un drapeau atteint, le jeu attend le choix du joueur (`holdAtCheckpoint`) ;
  la politique de confidentialité (3 langues) mentionne les publicités facultatives AdMob ; les textes du menu
  se rabattent sur `shared/live-i18n.js` ; récompenses : article au hasard limité à une catégorie et à
  plusieurs raretés.
- **Reste à faire** : retours du porteur du projet ; essai du vrai SDK AdMob sur un appareil ; préparation
  finale du Play Store (après validation).

### 19/11/2026 — Étape 12 : revenir chaque jour (v0.11.0)
- **Ajouté** :
  - **récompense quotidienne** (`shared/daily.js`, page `#quotidien`) : calendrier de 7 jours (100, 200 pièces,
    coffre commun, 350, traînée exclusive, 500, skin exclusif Hoop Bounce), une récompense par jour, mémorisée ;
    ouverture automatique à la première visite du jour ; compte à rebours jusqu'à minuit ;
  - **révélation des récompenses** (`menu/rewards-fx.js`, `css/live.css`) : coffre qui tombe, tremble et s'ouvre
    dans un éclair, rayons, butin, pluie de pièces, pièces qui filent vers le compteur, son et vibration ;
  - **missions quotidiennes** (`shared/missions.js`, page `#missions`) : 3 missions tirées chaque jour parmi
    9 modèles, barres animées, récompenses (pièces, coffres, articles), éclat et son à la réussite ;
  - **succès** (`shared/achievements.js`, page `#succes`) : 40 succès sur 4 paliers, médailles, onglets,
    récompenses à récupérer ;
  - **statistiques** (`shared/stats.js`) comptées par le jeu ; **bannière** « Mission terminée ! » / « Succès
    débloqué ! » pendant la partie ;
  - **coffres** (`shared/rewards.js`) et **6 articles exclusifs** (2 ballons, 2 traînées, 1 effet de rebond,
    1 animation de panier), dessinés dans `render/ball-sprite.js` et `render/cosmetics.js`, présentés
    « Exclusif » dans la boutique ;
  - boutons **Cadeau / Missions / Succès** sur l'accueil avec pastilles ; textes partagés `shared/live-i18n.js` ;
  - 6 nouveaux tests (`tests/live.test.mjs`).
- **Modifié** : la Collection compte les 31 articles ; le porte-monnaie sait donner un article, ajouter des
  pièces et compter les achats.
- **Corrigé** : boutons de l'accueil visibles par-dessus une page ouverte pendant l'entrée animée.
- **Reste à faire** : retours du porteur du projet ; équilibrage des récompenses ; rappel par notification une
  fois sur Android.

### 19/11/2026 — Étape 11 : expérience utilisateur (v0.10.0)
- **Ajouté** :
  - **sélection des mondes** dans le menu (`src/menu/worlds-view.js`, `css/menu-views.css`) : 5 grandes cartes
    (🏙️ ❄️ 🌋 🌲 🌌, « 10 niveaux », illustration animée, progression, étoiles, badge « Terminé »), cadenas et
    condition de déblocage, animation de déblocage ; ouvrir un monde montre aussitôt ses 10 niveaux (numéro,
    étoiles 0–3, coche, cadenas, difficulté, « À jouer ») ; **n'importe quel niveau débloqué se relance
    directement** depuis le menu ;
  - **« Choisir un niveau »** dans la pause et **« Niveaux »** à la victoire : ouvrent les niveaux du monde en
    cours dans le menu ;
  - **Collection** (`src/menu/collection-view.js`) : tous les articles possédés, aperçu animé, Équiper /
    Déséquiper (`Wallet.unequip`), badge « Équipé », onglets par catégorie, lien vers la boutique ;
  - **progression plus claire** : niveau à reprendre sous JOUER, pastilles de progression sur les tuiles
    Mondes et Collection, progression totale dans l'en-tête des mondes ;
  - **finitions** : vues qui glissent l'une sur l'autre, cartes qui flottent, se soulèvent et sont balayées
    par un reflet, barres qui se remplissent, cases de niveau qui arrivent une à une ; ouverture à ressort des
    fenêtres de pause et de victoire ; **sons de clic** dans le menu, les fenêtres du jeu et la boutique ;
    carillon d'équipement et fanfare de déblocage dans le menu ;
  - 2 nouveaux tests (299 au total).
- **Modifié** : `worlds.html` renvoie vers `index.html#mondes` ; la boutique revient à la page d'où l'on vient
  (accueil ou Collection) ; le menu relit pièces, progression et collection au retour d'une partie ou de la
  boutique.
- **Retiré** : page d'attente « Mondes », ancienne page « Magasin » du menu (`shop-data.js`), ancienne carte
  (`src/worlds/main.js`, `css/worlds.css`).
- **Reste à faire** : retours du porteur du projet ; essais sur un vrai téléphone.

### 18/11/2026 — Étape 10 : grande passe de finition (v0.9.0)
- **Ajouté** :
  - **identité des mondes** : enseignes au néon et avions (Ville), nuages de froid et traces du ballon dans la
    neige (Neige), chaleur visible au-dessus des bassins et de l'écran (Volcan), papillons (Forêt), débris
    en apesanteur et poussières qui remontent (Espace) ; éclairage propre à chaque monde (liseré coloré sur le
    ballon, étalonnage) ;
  - **ambiance sonore** de chaque monde : fonds continus enrichis et sons ponctuels (voitures en stéréo,
    sirène, néons ; rafales, craquements de glace ; bulles de lave, éruptions ; ruisseau, coucou, pic-vert ;
    messages radio, souffles) ;
  - **4 pièges propres aux mondes** (`game/world-elements.js`, `render/world-draw.js`) : pilons (presse, bloc de
    glace, broyeur, tronc-marteau, piston), rochers qui dévalent (boules de neige, rochers de lave, rondins,
    plasma), jets de flammes, trous noirs ; sons, effets, 3 nouveaux tests (297 au total) ;
  - **difficulté à 5 paliers** (facile → extrême) et nouvelle courbe : chaque niveau ajoute une difficulté,
    échecs dès le niveau 5, plusieurs essais dès le 15, vraiment difficile dès le 30, très exigeant dès le 45 ;
    les 50 niveaux sont retouchés et revérifiés (nouvelles manœuvres du pilote : `jumpBoulder`, `dodgeBoulders`) ;
  - **sensations** : recul de caméra en hauteur, coups de zoom, arrêt sur image, ombres douces avec occlusion de
    contact, images fantômes, effets de rebond selon la puissance, matière du monde aux impacts, gerbe de
    rayons et ondes au panier ;
  - **interface** : onde lumineuse au toucher sur toutes les pages, boutons élastiques, reflets sur les boutons
    principaux, petit ballon de chargement entre les pages, onde sur les commandes de jeu
    (`css/polish.css`, `shared/ui-polish.js`).
- **Modifié** : contrôle un peu plus vif (accélération au sol 26 → 28 u/s², en l'air 13 → 15 u/s²) ;
  mécaniques présentées dans l'introduction de chaque monde ; chaleur du volcan allégée (performances) ;
  solutions enregistrées des niveaux régénérées.
- **Reste à faire** : retours du porteur du projet ; éprouver la difficulté avec de vrais joueurs et sur un
  téléphone ; tuile « Mondes » du menu (accord en attente) ; page Collection.

### 18/11/2026 — Étape 9 : niveaux enrichis et boutique (v0.8.0)
- **Ajouté** :
  - 7 nouveaux pièges (`game/world-elements.js`) : plaques qui tombent, blocs temporisés (plateformes et murs),
    scies mobiles, boulets qui se balancent, lasers temporisés, aimants, canons (y compris vers le haut) ;
    dessins thématiques (`render/world-draw.js`), sons et effets ; points de contrôle actifs ;
  - niveaux enrichis : nouveaux pièges introduits progressivement dans chaque monde, difficulté affichée
    (facile / moyen / difficile) et alternée, étoiles risquées, drapeaux dans les niveaux longs ; tous les
    passages revérifiés (fenêtres de timing calculées par balayage) ;
  - **boutique** (`shop.html`, `src/shop/`) : 25 articles en 4 catégories et 4 raretés, aperçu animé, achat,
    équipement, progression de la collection, animation de déblocage ; catalogue (`shared/catalog.js`),
    porte-monnaie (`shared/wallet.js`), cosmétiques en jeu (`render/cosmetics.js`, 8 ballons dans
    `render/ball-sprite.js`) ;
  - **pièces** gagnées en jouant, affichées sur l'écran de victoire ; accès à la boutique depuis le menu
    (tuile « Magasin » et solde de pièces) et depuis la carte des mondes ;
  - 14 nouveaux tests (267 au total).
- **Modifié** : après une chute, on réapparaît au dernier drapeau atteint (sinon le niveau recommence) ; la
  tuile « Magasin » du menu ouvre la boutique (seule modification du menu).
- **Reste à faire** : retours du porteur du projet, équilibrage des timings, des prix et des gains ; page
  Collection du menu ; tuile « Mondes » (accord en attente).

### 18/11/2026 — Étape 8 : les 50 niveaux et la refonte des décors (v0.7.0)
- **Ajouté** :
  - **50 niveaux** (10 par monde), difficulté progressive dans chaque monde et d'un monde à l'autre ; noms et
    aides en FR/EN/ES ;
  - solutions expertes décrites dans les données de chaque niveau (`passages`), jouées par un pilote plus
    humain (visée selon le temps de vol, correction de la dérive, freinage), avec de nouvelles manœuvres
    (`fly`, `hopTo`, `stayOn`, `jumpOver`, `dribbleRun`, `ride`…) ; 253 tests ;
  - décors refaits : ville de nuit (immeubles détaillés, fenêtres qui s'allument, néons, voitures sur une voie
    rapide, projecteurs, lune), neige (montagnes ombrées, petits flocons, rafales discrètes), volcan (volcans
    fumants, roches aux reflets rouges, rivière de lave, braises lentes), forêt (arbres détaillés, herbe
    vivante, oiseaux, feuilles, rayons), espace (station spatiale, étoiles filantes, nébuleuses, poussières) ;
  - matériaux par monde pour les sols, blocs et murs, pics et plateformes mobiles thématiques.
- **Modifié** : les niveaux de démonstration deviennent les niveaux 6 de leur monde ; l'ancien « Grand final »
  de la Ville s'appelle « L'interrupteur » (le grand final est le niveau 10) ; outil de vérification piloté
  par les données des niveaux. **Gameplay, commandes et menu inchangés.**
- **Reste à faire** : retours du porteur du projet sur les niveaux et les décors, équilibrage, tests sur
  téléphone.

### 18/11/2026 — Étape 7 : les mondes (v0.6.0)
- **Ajouté** :
  - 5 mondes (`src/game/worlds.js`) : Ville (tutoriel), Neige, Volcan, Forêt, Espace, 10 niveaux prévus chacun,
    avec leur identité : décor et couleurs (`render/themes.js`, `render/background.js`), lumière, particules
    d'ambiance, surfaces (`render/world-draw.js`), musique et ambiance sonore (`audio/music.js`), sons ;
  - 21 mécaniques propres aux mondes (`game/world-elements.js`) : caisse à pousser ; sol glissant, plateformes
    et rampes de glace, vent de neige, stalactites ; lave, plateformes fragiles, geysers de feu, chutes de
    pierres, ascenseurs de pierre ; lianes, plateformes en bois, champignons, troncs qui roulent, branches
    mobiles, rivière ; gravité réduite, astéroïdes, portails à double sens, plateformes flottantes, gravité
    inversée ;
  - moteur : sens de la gravité, matériau du sol (adhérence), formes désactivables, gravité par niveau ;
  - carte des mondes (`worlds.html`, `src/worlds/`) : illustrations animées, cadenas, animation de déblocage,
    barres de progression, étoiles, pourcentages, chemin, choix du niveau ;
  - écran d'introduction de chaque monde, transition entre mondes (balayage coloré + fondu musical) ;
  - progression par monde avec déblocage automatique (conversion de l'ancienne progression) ;
  - niveau « La caisse » (Ville) et un niveau de démonstration par nouveau monde ; format des niveaux documenté
    (`src/game/levels/README.md`) ;
  - textes FR/EN/ES des mondes, mécaniques, carte et introduction ; 44 nouveaux tests (101 au total) ; pilote
    dans l'outil de vérification pour écrire les solutions expertes.
- **Modifié** :
  - les niveaux sont rangés par monde (`levels/city.js`…) ; `levels/index.js` reste pour la compatibilité ;
  - HUD « monde-niveau » dans la couleur du monde ; pause et victoire avec accès à la carte ; victoire de fin de
    monde (« Monde terminé ! », monde débloqué, « Monde suivant ») ;
  - ciel et vignette précalculés à la résolution de l'écran, décor regroupé en chemins (0 image lente) ;
  - commandes et gameplay de base **inchangés** (mêmes réglages ; les tests et les solutions des 6 niveaux
    d'origine passent toujours) ; **menu inchangé**.
- **Reste à faire** : validation des mondes par le porteur du projet, puis les 50 niveaux ; relier la tuile
  « Mondes » du menu à la carte (accord requis).

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
