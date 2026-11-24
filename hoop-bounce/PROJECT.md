# 🏀 Hoop Bounce — Documentation officielle du projet

> **Mémoire permanente du projet.** Ce fichier est mis à jour après chaque étape importante du
> développement (voir la section [Comment tenir ce document à jour](#comment-tenir-ce-document-à-jour)).
>
> **Dernière mise à jour :** 24/11/2026 · **Version :** 1.7.0-dev (non publiée ; la version publiable reste
> 1.0.0, build 1) · **Saison en cours :** 🎄 **Noël** (saison 1 : menu décoré + **Hoop Pass**) · **Version de
> test Android :** **`HoopBounce_Test_v10.apk` (1.9.0-test10, mise à jour)** · **iOS :** projet Xcode prêt
> (`ios/`) · **Phase en cours :** **phase 4 : économie** (roulette quotidienne, calendrier, gemmes rares, coffres,
> pièces, Pass prêt pour l'achat intégré) ; phases 2 (refonte des 50 niveaux) et 3 (Mode Fantôme) terminées ;
> rien n'est publié.

## Sommaire

1. [Présentation du jeu](#1-présentation-du-jeu)
2. [Gameplay](#2-gameplay)
3. [Architecture](#3-architecture)
4. [Interface](#4-interface)
4 bis. [Mode TRICKSHOT](#4-bis-mode-trickshot-étapes-22-et-23)
4 ter. [Saisons — Saison 1 : Noël](#4-ter-saisons--saison-1--noël)
4 quater. [Hoop Pass et gemmes](#4-quater-hoop-pass-et-gemmes-saison-1--noël)
4 quinquies. [Mode Fantôme](#4-quinquies-mode-fantôme-phase-3)
4 sexies. [Économie](#4-sexies-économie-phase-4)
5. [Progression](#5-progression)
5 bis. [Publication Google Play](#5-bis-publication-google-play-version-100)
5 ter. [Version iPhone (iOS)](#5-ter-version-iphone-ios)
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
- **Mode Fantôme** (phase 3) : en rejouant un niveau, un ballon fantôme rejoue le meilleur essai du joueur ; aide
  visuelle seulement, sans collision ni effet sur la partie (voir [Mode Fantôme](#4-quinquies-mode-fantôme-phase-3)).

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
- **Police embarquée** : une seule famille, **Outfit** (variable 100 → 900, licence SIL OFL 1.1), hors ligne.
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
├── trickshot.html          ★ Mode TRICKSHOT : écran de jeu du mode (?level=N)
├── PROJECT.md              Ce document (documentation officielle, mémoire du projet)
├── README.md               Guide rapide : lancer, tester, régler
├── package.json            Version et scripts (npm start, npm test)
├── capacitor.config.json   Application Android : identifiant com.echospeed.hoopbounce, nom, dossier web (www/)
├── android/                Projet Android natif (Capacitor 8) : manifeste, icônes, écran de démarrage, signature
├── store/                  ★ Fiche Google Play : icône, feature graphic, captures, textes, checklist, confidentialité
├── native/
│   └── android/README.md   Projet Android et AdMob : ce qui est en place, synchronisation, vrais identifiants
├── assets/
│   ├── ui/                 ★ Illustrations d'interface (pièce, gemme, 6 coffres) — générées par tools/ui-art.mjs
│   └── fonts/              Police embarquée + licence OFL
│       ├── outfit.woff2        La seule police du jeu (variable 100 → 900, latin, ~32 Ko)
│       └── LICENSE-*.txt       Licences SIL Open Font License 1.1
├── css/
│   ├── fonts.css           Déclaration de la police (@font-face, Outfit)
│   ├── tokens.css          ★ Système de design : typographie, arrondis, ombres, surfaces, couleurs, mouvement,
│   │                       pièce et gemme (chargé en premier sur toutes les pages)
│   ├── type.css            Règles communes à toutes les pages : hiérarchie du texte, icônes, micro-animations,
│   │                       mouvement des boutons (chargé en dernier)
│   ├── boot.css            Écran de chargement (logo, ballon qui rebondit, barre, fondu vers le menu)
│   ├── menu.css            Styles du menu (accueil, pages, fenêtres, animations)
│   ├── menu-views.css      Styles des pages Mondes (cartes, niveaux) et Collection du menu
│   ├── live.css            Récompense quotidienne, Missions, Succès, Bonus (coffre, roue), révélation des récompenses
│   ├── shop.css            Styles de la boutique
│   ├── season-christmas.css  Saison de Noël : décorations du menu (guirlande, bonnet, houx, cadeaux, neige)
│   ├── pass.css            Hoop Pass : bouton « billet » de l'accueil et page du passe de saison
│   ├── trickshot.css       Écran du mode TRICKSHOT (HUD, carte d'intro, pause, victoire, échec)
│   ├── trickshot-menu.css  Pages du menu du mode TRICKSHOT (carte des modes, accueil du mode, 50 niveaux)
│   ├── polish.css          Finitions communes à toutes les pages (onde au toucher, boutons, transitions,
│   │                       bouton « Regarder une publicité », annonce de test simulée)
│   ├── ghost.css           ★ Mode Fantôme : carte de départ, bouton « Fantôme », bandeau « Nouveau record »
│   └── style.css           Styles de l'écran de jeu (HUD, commandes, pause, victoire, tutoriel, intro de monde)
├── src/
│   ├── config.js           ★ TOUS les réglages : physique, matériaux, commandes, caméra, sensations
│   ├── boot/boot.js        Écran de chargement : étapes réelles, barre, particules, sortie vers le menu
│   ├── main.js             Écran de jeu : assemble tout, niveaux, pause, victoire, progression
│   ├── core/               Briques de base, sans dépendance au navigateur
│   ├── physics/            Moteur physique (sans navigateur)
│   ├── game/               Règles du jeu (sans navigateur)
│   │   ├── worlds.js       ★ Les 5 mondes (identité, mécaniques, réglages, niveaux)
│   │   ├── ghost.js        ★ Mode Fantôme : enregistrement, format compact, relecture, stockage
│   │   └── levels/         Les niveaux par monde (données) + README du format
│   ├── render/             Rendu Canvas du jeu (thèmes des mondes)
│   ├── audio/              Sons et musique du jeu
│   ├── worlds/             Carte des mondes (illustrations animées, déblocage, choix du niveau)
│   ├── shop/               Boutique (grille, aperçu animé, achats, textes)
│   ├── input/              Entrées tactiles et clavier du jeu
│   ├── platform/           Fonctions propres à l'appareil (vibrations)
│   ├── menu/               Tout le menu principal (dont scene-christmas.js et season-decor.js : Saison de Noël,
│   │                       pass-view.js : page du Hoop Pass)
│   ├── trickshot/          ★ Mode TRICKSHOT : règles, 50 niveaux, visée, rendu de l'arène, progression, textes
│   └── shared/             Ce que le menu, la boutique et le jeu partagent (réglages, porte-monnaie,
│                           statistiques, récompenses quotidiennes, missions, succès, coffres,
│                           publicités récompensées, roulette quotidienne, Hoop Pass, achats)
├── tools/build-web.mjs     Prépare www/ (fichiers du jeu seulement) pour l'application Android
├── tests/                  Tests automatiques (node --test)
│   └── fixtures/           Terrain d'essai et solutions enregistrées des niveaux
└── tools/                  Outils de développement (level design ; trickshot-check.mjs et trickshot-atlas.html
                            pour le mode TRICKSHOT)
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
| `tools/` | Outils de conception et de vérification des niveaux (partie complète, plan, fenêtres, solutions aléatoires), du Trickshot, des illustrations et des builds. |

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
| `ghost.js` | ★ **Mode Fantôme** (phase 3, sans navigateur) : `GhostRecorder` (position, rotation, rebonds à 60 Hz sur l'horloge du chronomètre), `encodeSamples` / `decodeSamples` (écarts sur 3 octets, échappement aux sauts, base64), `GhostPlayer` (relecture interpolée, traînée), `GhostStore` (une clé par niveau, meilleur essai seulement, place libérée si le stockage est plein). |
| `i18n.js` | Textes de l'écran de jeu en français, anglais et espagnol. |

**`src/render/`**

| Fichier | Rôle |
|---|---|
| `renderer.js` | Dessine une image : décor du monde, éléments, panier (arrière puis avant pour que le ballon passe « dedans »), ballon, effets, particules d'ambiance de premier plan, vignette teintée, jauge, débogage ; le ballon fantôme sous le vrai ballon. |
| `ghost-draw.js` | ★ Dessin du ballon fantôme : sprite précalculé (verre givré blanc bleuté, coutures, liseré), halo léger, traînée fine, anneau de rebond. |
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
| `platform/vibrate.js` | Vibrations multiplateformes (étape 21) : `navigator.vibrate` sur Android, retour haptique natif (`@capacitor/haptics`) sur iPhone, au même rythme. |
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
| `bonus-view.js` | Page Roulette quotidienne (étape 13, refaite à la phase 4) : roue de la chance seule (rotation, ralentissement, clics, pointeur), lancer gratuit, compte à rebours, 3 lancers avec publicité (pastilles), état « revenez demain ». |
| `rewards-fx.js` | Révélation d'une récompense : coffre qui tombe, tremble et s'ouvre, rayons, butin (pièces, 💎 gemmes, un ou plusieurs objets), pluie de pièces, pièces qui filent vers le compteur. Aussi utilisée par la boutique (coffres en gemmes). |
| `pass-view.js` | Page **Hoop Pass** : en-tête de saison, niveau et XP, carte Premium, piste défilante des 50 niveaux (Premium / Gratuit), montées de niveau animées, récupération, « Tout récupérer », « Mon niveau », étincelles. État du bouton de l'accueil (`passHomeState`). |
| `snowfall.js` | Neige de la saison de Noël (étape 25) : trois plans (lointain, cristaux, flocons flous), vent, parallaxe, flocons précalculés. |
| `sound.js` | Musique d'ambiance du menu (avec le motif du rebond toutes les 4 mesures) ; les sons d'interface viennent de la voix partagée `audio/ui-voice.js`. |
| `icons.js` | Icônes SVG dessinées à la main. |
| `i18n.js` | Textes du menu en français, anglais et espagnol. |

**`src/shared/`**

| Fichier | Rôle |
|---|---|
| `catalog.js` | Catalogue de la boutique (articles, raretés, prix, textes) et barème des pièces. |
| `wallet.js` | Porte-monnaie et inventaire : pièces gagnées, **💎 gemmes** (`hoopbounce.gems`), articles possédés et équipés, étoiles déjà récompensées ; articles donnés (récompenses), articles achetés en pièces ou en gemmes (`buyWithGems`). |
| `pass.js` | ★ **Système du Hoop Pass** (sans navigateur) : XP, niveaux, états des récompenses, récupération, Premium, cadeau de bienvenue, fin de saison ; `awardPassXp()` appelé par le jeu, le Trickshot, les missions et les succès. |
| `seasons/` | ★ **Configuration des saisons** : `christmas.js` (thème, textes, couleurs, dates, barème d'XP, prix du Premium, 50 niveaux et récompenses, objets exclusifs) et `index.js` (registre). |
| `gem-offers.js` | Offres en gemmes de la boutique : coffres premium et légendaire, pack de saison. |
| `stats.js` | Statistiques du joueur : compteurs à vie (succès) et du jour (missions), remis à zéro à minuit (heure locale). |
| `rewards.js` | Récompenses communes : pièces, gemmes, coffres (commun, rare, épique, premium, légendaire ; tables de chances `CHESTS`, `chestOdds`, `pickRarity` depuis la phase 4), articles exclusifs, article au hasard ; doublons convertis en pièces. |
| `daily.js` | Récompense quotidienne : calendrier de 7 jours (`DAILY_CALENDAR`, phase 4 : pièces, gemmes, coffres, gros lot du 7e jour qui change selon la semaine), une récompense par jour, mémorisée, nouveau cycle après le 7e jour, `week()` pour l'affichage. |
| `missions.js` | Missions quotidiennes : 9 modèles, 3 missions tirées par jour (facile, moyenne, difficile), progression, récompenses. |
| `achievements.js` | Succès : 40 succès sur 4 paliers, mesure de la progression, récompenses à récupérer. |
| `live-i18n.js` | Textes des missions, des succès, des paliers, des coffres et de la page Bonus (FR / EN / ES), partagés par le menu et le jeu. |
| `ads-config.js` | ★ **Configuration des publicités** (étape 13) : identifiants AdMob de test et de production, limites par jour, public et classification. **Le seul fichier à modifier avant la publication.** |
| `ads.js` | Gestionnaire centralisé des publicités récompensées : chargement à l'avance, affichage, validation de la récompense, erreurs, absence d'annonce, nouvelles tentatives, moments interdits, limites du jour. Fournisseurs AdMob (Android) et annonce de test (navigateur). |
| `about.js` | ★ **Contenu de la page « À propos »** (étape 16) : nom, créateur, première année du copyright, liste des crédits (rôle, noms, précision, icône), adresses des liens. **Le seul fichier à modifier pour ajouter un crédit ou relier un lien.** |
| `bonus.js` | Roulette quotidienne (phase 4) : 8 cases pondérées, 1 lancer gratuit + `AD_SPINS_PER_DAY = 3` lancers avec publicité, `status()` (`free` / `ads` / `done`), tirage, récompenses, sauvegarde (v2, anciennes sauvegardes lues). |
| `billing.js` | ★ Phase 4 : **achat du Pass Premium**, prêt pour Google Play Billing. `BILLING.mode` (`'gems'` aujourd'hui, `'store'` plus tard), `premiumOffer()`, `purchasePremium()`, fournisseur `PlayBillingProvider` (vide : aucun paiement réel). |
| `ui-polish.js` | Onde lumineuse au point touché sur les éléments interactifs de toutes les pages (sauf commandes de jeu). |
| `settings.js` | Réglages du joueur (musique, effets, vibrations, langue, qualité, **Fantôme**), enregistrés et corrigés s'ils sont abîmés. |
| `safe-width.js` | Largeur réellement utilisable (encoche des iPhone, étape 21) : classes `fit-760` / `fit-1100` sur `<html>` pour les mises en page compactes. |
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
| `tests/ads.test.mjs` | Publicités : identifiants test / production, récompense seulement si l'annonce va au bout, moments interdits, limites du jour sauvegardées, coffre bonus supprimé (ancienne sauvegarde ignorée), roulette (lancer gratuit, 3 lancers avec publicité au plus, rien avant le gratuit, remise à zéro à minuit, tirage pondéré). |
| `tests/economy.test.mjs` | ★ Phase 4 : **équilibrage de l'économie** sur des joueurs simulés pendant 30 jours (4 graines) : progression régulière, collection jamais finie, légendaires très rares, gemmes rares, effet des publicités ; chances des coffres ; sources de gemmes ; achat du Pass (gemmes / magasin). |
| `tests/live.test.mjs` | Statistiques (jour, minuit), coffres et doublons, récompense quotidienne (une par jour, 7 jours, cycle), missions (tirage, renouvellement, récompense unique), succès (paliers, progression, récupération), textes. |
| `tests/routes.test.mjs` | Chaque passage de chaque niveau reste faisable (solutions enregistrées + solutions expertes). |
| `tests/fixtures/test-yard.js` | Terrain d'essai pour les tests de mécanique (indépendant des niveaux). |
| `tests/fixtures/routes.json` | Solutions enregistrées des passages (générées par l'outil). |
| `tests/trickshot.test.mjs` | Mode TRICKSHOT : 20 cartes (textes, chapitres, montée de la difficulté, cartes variées), **chaque carte gagnée en un seul tir** (solution rejouée), **chaque mécanique indispensable** (solution rejouée sans elle), difficulté annoncée = mesure à une classe près, 3 essais, étoiles et score, décor conservé, visée et **pointillés limités**, progression séparée et **migration v1 → v2**, mode principal intact. |
| `tests/fixtures/trickshot.json` | Une solution en un tir par niveau TRICKSHOT (angle, puissance, instant) et la part de tirs gagnants mesurée. |
| `tools/trickshot-check.mjs` | Solveur du mode TRICKSHOT : essaie des milliers de tirs par niveau (angles × puissances × instants, 4 processus), mesure la part de tirs gagnants → difficulté, cherche finement autour des tirs les plus proches ; `--quick`, `--save`, `N` ou `N-M`. |
| `tools/trickshot-atlas.html` | Atlas des cartes TRICKSHOT (`?from=1&to=25`) avec le trajet de la solution enregistrée, pour relire les niveaux d'un coup d'œil. |
| `tools/ui-art.mjs` | Génère les illustrations d'interface `assets/ui/*.svg` (pièce, gemme, 6 coffres en deux pièces) dans un style commun (étape 25). |
| `tools/route-check.mjs` | Outil de level design : essaie des centaines de séquences de commandes par passage et mesure la difficulté ; « pilote » pour écrire les solutions expertes (rouler jusqu'à, charger, sauter, viser, flotter, tirer au panier). `N`, `id` ou plage `a-b` ; `--save` ; `--part=` (calcul réparti). |
| `tools/economy-sim.mjs` | ★ Phase 4 : **simulateur de l'économie** : des joueurs types (actif, occasionnel ; avec ou sans publicités) jouent N jours avec le vrai code (porte-monnaie, coffres, calendrier, roulette, missions, succès, Pass, boutique) et une horloge simulée. `node tools/economy-sim.mjs 30`. |
| `tools/route-merge.mjs` | Fusionne les fichiers partiels de `route-check --part` dans `tests/fixtures/routes.json`. |
| `tools/level-run.mjs` | ★ Phase 2 : joue un niveau **en entier** (tous les passages à la suite, du départ au panier) et mesure la durée experte → durée joueur estimée (× 1,4), comparée à la fourchette du monde. Utilisé par `tests/routes.test.mjs`. |
| `tools/level-map.mjs` | ★ Phase 2 : plan PNG d'un niveau (géométrie, pièges, étoiles, panier) avec la trajectoire du pilote et les morts. |
| `tools/tune.mjs` | ★ Phase 2 : balaie toutes les fenêtres de départ d'un passage chronométré (`--full` : état réel d'arrivée) pour choisir une fenêtre sûre. |
| `tools/pass-debug.mjs` | ★ Phase 2 : rejoue un passage manœuvre par manœuvre (position, vitesse, puissance, cause d'une mort). |

### Ajouter un niveau ou un élément

- **Niveau** : l'écrire dans le fichier de son monde (`src/game/levels/<monde>.js`) avec le **kit**
  (`level()` + `c.section(longueur, s => …)`, voir l'en-tête de `src/game/levels/kit.js`) : sol, blocs, pièges,
  étoiles (exactement 3), drapeaux, et un `s.pass()` par passage avec sa solution experte. Ajouter son nom et
  ses aides dans `src/game/i18n.js` (3 langues). Vérifier : `node tools/level-run.mjs N --verbose` (partie
  complète), `node tools/level-map.mjs N dossier` (plan), `node tools/tune.mjs N passage --full` (fenêtre d'un
  piège chronométré), `node tools/pass-debug.mjs N passage` ; puis `node tools/route-check.mjs 400 --save`.
- **Élément** : ses données dans le niveau, sa construction dans `game/level.js`, sa logique dans
  `game/world-elements.js` et `game/game.js`, son dessin dans `render/world-draw.js`, ses sons dans
  `audio/sfx.js`, ses effets dans `main.js`, un test dans `tests/mechanics.test.mjs`.
- **Niveau TRICKSHOT** : l'ajouter dans `src/trickshot/levels.js` (nom et indice en 3 langues, `diff`,
  `intro`), puis `node tools/trickshot-check.mjs N --save` : il doit trouver une solution en un tir et une
  difficulté mesurée proche de celle annoncée ; vérifier le dessin dans `tools/trickshot-atlas.html`.
- **Monde** : son entrée dans `game/worlds.js`, son thème dans `render/themes.js` (et ses formes dans
  `background.js` si besoin), son morceau dans `audio/music.js`, sa scène dans `worlds/art.js`, ses textes.

---

## 4. Interface

### Écran de chargement (au lancement)

Le premier écran du jeu, affiché dès l'ouverture (il ne dépend que de `css/boot.css` et `src/boot/boot.js`) :

- **Fond** : dégradé bleu nuit vers le noir, faisceau de projecteur venu d'en haut qui respire lentement, halo
  orange derrière le logo, lueurs bleue et violette dans les coins ; **particules** (poussières lumineuses
  chaudes et froides, quelques halos flous) qui montent en ondulant.
- **Logo** au centre : **HoopBounce** en grand (« Hoop » blanc, « Bounce » dégradé orange, police Outfit),
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
- Logo : ballon vectoriel + « HOOP » (blanc) / « BOUNCE » (dégradé orange), police Outfit ; slogan.
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
- **Hoop Pass** (saison 1) : bouton « billet » à droite de JOUER (médaillon doré du niveau, « Saison 1 · Noël »,
  mini-barre d'XP, pastille rouge des récompenses à récupérer) — voir [Hoop Pass](#4-quater-hoop-pass-et-gemmes-saison-1--noël).

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
| **Roulette** (étape 13, refaite à la phase 4) | Roulette quotidienne : 1 lancer gratuit + 3 avec publicité — voir [Roulette quotidienne](#roulette-quotidienne-indexhtmlbonus--refaite-à-la-phase-4). |
| Paramètres | Musique, effets sonores (curseurs appliqués en direct), vibrations, qualité graphique (basse / moyenne / haute), langue (FR / EN / ES), politique de confidentialité, **À propos de Hoop Bounce** (ouvre la page À propos, étape 16), version. |
| **À propos** (étape 16) | Identité, version, créateur, copyright, crédits et liens — voir [À propos](#à-propos-indexhtmlapropos). |

### Écran de jeu (`play.html`)

- **HUD discret** : monde-niveau dans la couleur du monde (« 2-1 · Premières glissades ») et étoiles en haut à
  gauche ; recommencer et pause en haut à droite.
- **Commandes** : ◀ ▶ (bas gauche), grand bouton de rebond (bas droite) entouré de l'**anneau de puissance**
  (5 segments : blanc, ambre au niveau 4, or au niveau 5 ; le dernier cran clignote avant de redescendre).
- **Jauge au-dessus du ballon** : 5 barres croissantes (même code couleur), visible dès que la puissance monte.
- **Carte de départ** (phase 3) : au lancement et à chaque recommencement, une petite carte en haut au centre :
  monde-niveau, 🏆 meilleur temps, 👻 « Fantôme disponible » (ou « Terminez une première fois ce niveau pour
  débloquer le Fantôme. ») et le bouton **Fantôme · Activé / Désactivé**. Elle ne bloque rien et s'efface dès que
  le joueur s'élance (ou après 6 s).
- **Pause** : Reprendre, Recommencer, **Fantôme · Activé / Désactivé** (phase 3), **Choisir un niveau** (ouvre directement les 10 niveaux du monde en cours
  dans le menu), Menu principal. Pause automatique quand l'application passe en arrière-plan. La carte s'ouvre
  avec un ressort et ses boutons arrivent l'un après l'autre ; petit son à chaque bouton.
- **Victoire** : niveau, « Panier ! », étoiles qui tombent une à une, temps (et « Nouveau record »), bandeau du
  Mode Fantôme : **« ✨ Nouveau record ! · Fantôme mis à jour »** (étincelle, reflet, petits confettis bleutés) ou
  « Fantôme débloqué · Rejouez pour battre votre temps » la première fois,
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

### Boutique (`shop.html`) — refaite à l'étape 24

**Rôle : vendre.** La boutique n'affiche **que les objets qui peuvent être achetés** : ballons, visages,
effets de rebond, traînées et animations de panier **pas encore possédés** (règle commune
`Wallet.isForSale(id)` : payant, non exclusif, non possédé). Les objets exclusifs (récompense quotidienne,
succès) n'y sont pas : une ligne rappelle combien il en reste à gagner en jouant.
- **Ambiance « vitrine »** chaude (or et orange), différente de la Collection (froide, turquoise).
- **En-tête** : retour, « 🛒 Boutique », onglets **Tout / Ballons / Visages / Rebonds / Traînées / Paniers**
  avec le **nombre d'objets à vendre**, bouton **🎒 Ma collection**, solde de pièces.
- **Vitrine** (à gauche) : aperçu animé de l'objet choisi (porté avec la tenue actuelle), rareté, **grande
  étiquette de prix dorée**, nom, description, objectif d'épargne (« 48 000 / 85 000 ») et bouton **Acheter ·
  prix** (ou « Il te manque N »). À l'ouverture, la vitrine montre l'objet le plus cher qu'on peut s'offrir.
- **Rayon** (à droite) : « 38 à vendre », puis les cartes (rareté, puis prix croissant). Chaque carte :
  **aperçu**, rareté, nom, **prix** et **bouton « Acheter »** ; point vert qui pulse si l'objet est à ta portée.
- **Achat** (carte ou vitrine) : pièces débitées une seule fois, animation de la rareté (rayons violets ou
  dorés, « ÉPIQUE ! », « LÉGENDAIRE ! »), son, vibration ; l'objet est **équipé aussitôt**. Sa carte affiche un
  badge **« ✓ Possédé »** pendant 2 s puis **quitte la boutique**. **Jamais deux fois** : `buy()` répond
  `'owned'` et aucun bouton Acheter n'existe pour un objet possédé.
- **Tout acheté** dans un onglet : écran **« 🏆 Tout est à toi ! »** avec un bouton vers la Collection.
- Pièces manquantes : la carte et le solde tremblent, son de refus. `shop.html?item=…` ouvre un objet en vitrine.
- **Onglet 💎 Gemmes** (Hoop Pass) : coffres **premium** (60 💎, objet épique ou légendaire garanti) et
  **légendaire** (150 💎, objet légendaire garanti) ouverts avec la grande révélation du menu ; **offre spéciale
  « Pack Hiver »** (Cristal + Tempête de neige, 240 💎 au lieu de 300, saison 1 seulement, une fois) ; skins très
  rares vendus en gemmes (Cristal 180, Aurore 260, Tempête de neige 120). Solde de gemmes dans l'en-tête (sur
  petit écran : seul le solde de l'onglet affiché ; soldes abrégés dès 10 000, « 125 k »).

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

### Collection (`index.html#collection`) — refaite à l'étape 24

**Rôle : montrer ce que l'on possède et donner envie de compléter.** La Collection n'affiche **que les objets
possédés** : aucun objet verrouillé, **aucun prix, aucun bouton Acheter** (seulement un lien « 🛒 Boutique »
dans l'en-tête pour y aller).
- **Ambiance « album de trophées »** froide (turquoise et violet) : chaque objet est posé sur un **socle
  lumineux**, rangé sur une **étagère** par catégorie (Ballons, Visages, Rebonds, Traînées, Paniers, avec le
  nombre d'objets). Légendaires : fond doré.
- **Résumé de la collection** en haut : **🏀 Skins 9/21 · ✨ Traînées 1/10 · 💥 Effets 2/20** (effets = rebonds
  et animations de panier), chacun avec sa barre de progression, « Complet ! » doré quand tout est obtenu,
  et une ligne « Encore N objets à obtenir : boutique, récompenses quotidiennes, succès ». Chaque résumé est
  aussi un **filtre** (toucher à nouveau pour tout voir). En-tête : pourcentage total (« 24 % · 12/51 »).
- **Vitrine** (à gauche) : aperçu animé de l'objet choisi avec le reste de la tenue, rareté (ou « Par
  défaut »), badge **« ✓ Équipé »**, nom, description, **Équiper** ou **✓ Équipé + Déséquiper**.
- **Badges** sur les cartes : **« Équipé »** (un par catégorie) et **« Nouveau ! »** sur les objets obtenus
  depuis la dernière visite (une seule fois, clé `hoopbounce.collectionSeen`).
- **Déséquiper** remet l'objet de base de la catégorie (ballon classique, onde, aucune traînée, confettis).
  Tout est enregistré tout de suite (`hoopbounce.inventory`, inchangé) : jeu, Trickshot, boutique et menu
  utilisent le même équipement.

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

### Roulette quotidienne (`index.html#bonus`) — refaite à la phase 4

Même style que les autres pages (verre sombre, ressorts). Depuis la phase 4, la page ne contient plus qu'**un
seul panneau centré : la roulette**, récompense quotidienne principale (le coffre bonus a été supprimé). Le menu
l'appelle « Roulette » (FR) / « Spin » (EN) / « Ruleta » (ES) ; titre de la page : « Roulette quotidienne ».

- **Roue** à 8 cases (120 / 250 / 500 / 1 200 pièces, 10 💎, coffre commun, coffre rare, skin épique), cercle
  doré avec lumières, pointeur ; la case 💎 a sa gemme dessinée. Lancer : **rotation fluide** (≈ 5,6 s,
  6 tours), **ralentissement progressif**, **clic à chaque case**, pointeur qui sautille, lumières qui
  clignotent, puis la case gagnante grossit et la révélation de la récompense s'ouvre (pièces, gemmes, coffre
  ou objet).
- **Trois états** (`data-status` du panneau) :
  1. **Gratuit** : gros bouton **« 🎡 Lancer gratuit »** (1 par jour).
  2. **Publicités** : « Lancer gratuit utilisé · Prochain lancer gratuit dans 13 h 52 min » (compte à rebours en
     direct) puis **« 📺 Regarder une publicité → Lancer supplémentaire »**, avec **3 pastilles** (lancers avec
     publicité restants aujourd'hui).
  3. **Terminé** : « Plus de lancers aujourd’hui — reviens demain ! ». Plus aucune
     roulette jusqu'au lendemain (minuit, heure de l'appareil).
- Boutons de publicité : « Chargement de la publicité… », « Aucune publicité disponible pour le moment »,
  « Limite du jour atteinte — revenez demain ». Le lancer gratuit ne demande jamais de publicité.
- En-tête : temps avant le renouvellement et compteur de pièces ; mention « Publicités toujours facultatives ».
- Le point rouge du menu (« Roulette ») s'allume tant que le lancer gratuit du jour n'est pas utilisé.

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
  - Police (Outfit — SIL OFL 1.1) ;
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

### Modes de jeu (étapes 19 et 22)

Page **« Modes de jeu »** (tuile *Modes* de l'accueil, `index.html#modes`). **En tête, la carte jouable du mode
TRICKSHOT** (étape 22, badge « Nouveau », pastille ▶ Jouer avec les niveaux terminés et les étoiles) qui ouvre
l'accueil du mode (voir la section [4 bis](#4-bis-mode-trickshot-étapes-22-et-23)). Ensuite, les trois futurs modes
**présentés** seulement ; **aucun n'est développé** ni jouable. Code : `modesPage()` dans `src/menu/pages.js`, styles `.fmode*` et `.m-*`
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

### Direction artistique et système de design (étape 25)

> **Objectif** : qu'aucun joueur ne puisse dire « ça ressemble à un jeu fait par une IA ». Une seule direction
> artistique, **stylisée haut de gamme** (pas réaliste) : « terrain de nuit » — bleu nuit profond, un accent chaud
> (orange ballon), l'or des récompenses, **une seule lumière venant d'en haut à gauche**, ombres bleu nuit
> (jamais noir pur). Aucune fonctionnalité, règle, sauvegarde ou niveau n'a changé.

**Système de design** (`css/tokens.css`, chargé en premier partout ; `css/type.css`, chargé en dernier partout)
- **Typographie — une seule famille : Outfit** (Unbounded supprimée). Six niveaux :
  grand titre `--t-display` (logo, « Panier ! », grands moments, graisse 800) · titre `--t-h1` (titres de page,
  700) · sous-titre `--t-h2` (titres de cartes) · texte `--t-body` · petit texte `--t-small` · étiquette
  `--t-label` (petites capitales, interlettrage commun). Toutes les graisses ont baissé d'un cran (900/800 → 700) :
  contours moins épais, lecture plus fine ; lueurs autour des textes retirées ; chiffres tabulaires partout.
- **Arrondis** : 5 valeurs pour tout le jeu (`--r-xs` 8 · `--r-sm` 12 · `--r-md` 16 · `--r-lg` 20 · `--r-xl` 26,
  plus `--r-pill`) — 128 arrondis épars ramenés à ce jeu.
- **Ombres** : 4 niveaux (`--sh-1` → `--sh-4`) teintés bleu nuit ; toutes les ombres noires converties.
- **Focus clavier** discret (contour blanc fin) au lieu de l'anneau orange épais.

**Illustrations** (`assets/ui/*.svg`, générées par `tools/ui-art.mjs` : modifier le script puis le relancer)
- **Pièce** : disque d'or épais (tranche visible), bord biseauté et cannelé, face creusée, ballon en relief, reflets.
  Classe `.hb-coin` (et `.coin-ico` : même image partout — menu, boutique, jeu, Pass, révélations, pluie de pièces).
- **Gemme** : taille brillant à facettes (couronne, table, pavillon), reflets internes, éclats. Classe `.hb-gem`.
- **Coffres** : 6 modèles du même atelier, reconnaissables au premier coup d'œil — **commun** (bois brun, fer),
  **rare** (bois bleu, acier, pierre bleue), **épique** (bois violet, or, gravures, équerres), **bonus amélioré**
  (orange et or), **premium** (bleu nuit, argent glacé, cristal), **légendaire** (acajou, or, couronne, pierre
  ambre). Planches, veines, ferrures rivetées, serrure, bombé éclairé ; couvercle et caisse séparés pour s'ouvrir.

**Icônes** (`src/menu/icons.js`) : **plus aucun émoji dans l'interface**. ~20 icônes ajoutées dans le style des
existantes (grille 24, trait 1,9, coins arrondis, couleur du texte) : missions et succès (drapeau, panier, étoile,
chrono, éclat, ville, flocon, volcan, sapin, planète, crâne, coffre, couronne, gemme…), mondes, modes (vague,
drapeau à damier, outils), Bonus (cadeau, écran, roue), sources d'XP du Pass, boutique, collection, publicité du
jeu. Classe commune `.ico` (taille du texte).

**Micro-animations** (le jeu vit même sans toucher) : pièces des soldes qui pivotent lentement, petit éclat
qui scintille sur les pièces et les gemmes, gemmes qui flottent, coffres qui respirent (couvercle qui se soulève
à peine), cartes du Hoop Pass qui flottent chacune à son rythme. Toutes en `transform` / `opacity` ; arrêtées si
« mouvements réduits ».

**Ouverture des coffres** (`menu/rewards-fx.js`, aussi dans la boutique) : le coffre apparaît au centre sur un
halo → tremble de plus en plus fort pendant que **la lumière s'échappe par la fente** (rayons vers le haut) et que
le halo grandit → s'ouvre : couvercle projeté, éclair à la couleur de la rareté, **gerbe de particules** → la
récompense **sort du coffre** ; son à chaque temps, vibrations courtes. Fond plus sombre (le coffre est le seul
sujet) ; la mise en page ne saute plus quand le butin apparaît.

**Hoop Pass** : cartes qui flottent, coffres des cartes disponibles qui respirent, carte récupérée balayée par un
reflet et coche qui apparaît d'un coup (aussi pour « Tout récupérer ») ; le système n'a pas changé.

**Neige de Noël** (`src/menu/snowfall.js`) : une vraie chute de neige en trois plans — **loin** (beaucoup de petits
flocons doux, lents, dessinés *derrière* les sapins), **milieu** (cristaux à six branches de tailles variées qui
tournent lentement), **près** (quelques grands flocons flous qui passent devant). Vent par rafales, balancement
propre à chaque flocon, parallaxe par plan ; flocons précalculés. Les ampoules des sapins sont rondes et
lumineuses. La neige se voit aussi, atténuée, derrière les pages (dont le Hoop Pass, qui n'a plus de points CSS).

**Fonds du jeu** : perspective atmosphérique — la silhouette des plans lointains tire vers la couleur de
l'horizon (précalculé, aucun coût) : plus de profondeur, plan de jeu inchangé. Écran de victoire : halo de rayons
doux qui tourne derrière la carte ; la bannière « Succès débloqué » se range à gauche au lieu de couvrir le titre.

**Boutons** : identité conservée ; appui plus physique (s'enfonce d'1 px, s'assombrit à peine), relâcher élastique
plus doux, transitions d'ombre plus naturelles, léger soulèvement au survol.

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

## 4 bis. Mode TRICKSHOT (étapes 22 et 23)

> **« Un tir. Un rebond. Un panier impossible. »** Un deuxième jeu à l'intérieur du jeu : un mode **totalement
> indépendant** du mode principal (sa progression, ses cartes, son décor, sa musique), qui **ne modifie rien**
> du mode principal (même moteur, mêmes réglages : `TS_CONFIG` en dérive sans le toucher, test à l'appui).
> Étape 22 : première version (50 cartes). **Étape 23 : refonte complète** — nouvelle visée, identité
> « laboratoire de trickshots », **20 cartes** entièrement nouvelles et beaucoup plus travaillées (moins de
> cartes, mais chacune est un vrai casse-tête). En attente de validation.

### La visée (étape 23)

- Le joueur **touche le ballon** (zone généreuse : 90 px ou 1,6 u), puis **continue son geste n'importe où sur
  l'écran** : au milieu, en haut, en bas, sur les côtés. Le ballon reste sélectionné jusqu'au relâchement ; le
  doigt ne cache plus le ballon et la place ne manque jamais, même si le ballon est en bas de l'écran.
- **Direction opposée au geste = angle ; longueur du geste = puissance.** La longueur se mesure **à l'écran**
  (pleine puissance à 36 % de la plus petite dimension de l'écran, `TRICKSHOT.pullScreen`), pas en distance au
  ballon. Au-delà, la puissance reste au maximum (vitesse maximale 30 u/s inchangée).
- Repère du geste là où est le doigt : cercle de pleine puissance en pointillés, trait du geste, jauge de
  puissance (blanc → orange → rouge), petite charge sonore à 100 %. Toucher ailleurs que sur le ballon affiche
  « Touche le ballon, puis tire vers l'arrière n'importe où sur l'écran ».
- **L'aide reste une aide** : les pointillés montrent seulement le **début de l'arc** (5,2 u d'arc au plus,
  `TRICKSHOT.previewLength`, quel que soit le tir), s'arrêtent au premier obstacle et **ne prévoient jamais les
  rebonds** ni les mécanismes. On ne peut donc jamais « poser » la trajectoire dans le panier : il faut doser
  l'angle, la puissance et les rebonds.

### Le principe

- **3 essais au plus.** Entre deux essais le ballon revient au pas de tir, **le décor reste tel quel** (caisse
  cassée, porte ouverte, pont tombé, ventilateur allumé restent : on peut préparer le terrain puis marquer).
- **Étoiles** : ★★★ au premier essai, ★★ au deuxième, ★ au troisième. Après 3 essais ratés : écran « Raté ! ».
- **Score** = étoiles × 1 000 + style : rebonds (+100, 8 au plus), **swish** (+500), planche (+250), portails
  (+200), propulsions (+100), **combo** (+150 par mécanisme déclenché pendant le tir gagnant : bouton, caisse).
- Le tir se termine quand le ballon s'arrête, **tombe dans le vide du bas de la salle**, sort, touche un piège
  ou dure plus de 12 s. Clavier (ordinateur) : flèches, Espace, R, Échap.

### Le laboratoire (identité visuelle, étape 23)

Un décor qui n'a rien à voir avec le mode principal : **un laboratoire de trickshots futuriste**.
- **Fond** (précalculé, peu contrasté pour ne pas gêner la lecture) : mur de panneaux de métal rivetés avec
  grilles d'aération, tuyaux horizontaux et verticaux à brides, câbles qui pendent, bande de danger, rampe de
  néon dans la couleur du chapitre, lampes de plafond et leurs cônes de lumière, plaque « TEST 07 ». Animés :
  **grand engrenage** qui tourne, **écrans de contrôle** (courbes), **gyrophares**. La disposition change à
  chaque carte (aucune salle identique).
- **Premier plan** (net et lumineux : tout ce qui sert au jeu se lit d'un coup d'œil) : plateformes d'acier
  brossé avec **liseré lumineux** sur la face de rebond et bandes de danger aux extrémités, plateformes
  **suspendues par des câbles**, murs techniques, **murs inclinés** à arête néon, **cages de verre** blindé,
  **ascenseurs** jaunes et noirs sur rails, volets d'acier à **voyant rouge / vert**, caisses orange « fragiles »,
  bumpers roses. En bas : **pas de sol continu**, un **vide** (champ d'énergie rose) où le ballon est perdu.
- **Panier néon** : cercle orange lumineux, planche de verre au cadre néon, panier posé sur un poteau, fixé au
  mur ou **suspendu** au plafond ; le **filet s'illumine** au moment du panier.

### Les écrans

1. **Carte du mode** dans « Modes de jeu » → **accueil du mode** (`index.html#trickshot`) : illustration,
   description, cartes terminées, étoiles, pourcentage, les 5 chapitres et leur avancement, **Jouer**.
2. **Sélection des cartes** (`index.html#trickshot-niveaux`) : légende des difficultés, les 5 chapitres côte à
   côte (4 cartes chacun) ; chaque tuile : **numéro, étoiles, meilleur score, difficulté** (pastille), **cadenas**
   si verrouillée. Déblocage **séquentiel** ; la prochaine carte pulse ; une tuile verrouillée tremble.
3. **Écran de jeu** (`trickshot.html?level=N`) : la salle entière à l'écran. HUD minimal : **difficulté** en
   haut à gauche (🟢 Facile, 🟠 Difficile, 🔴 Très difficile, ⚫ Impossible), **essais restants** au centre,
   **recommencer** et **pause** à droite. Carte d'introduction (nom, nouveauté, indice).
4. **Victoire** (étoiles, score qui défile, bonus, record, carte débloquée ; deux colonnes sur écran bas),
   **échec** et **pause**.

### Les sensations (polish de l'étape 23)

- **Ralenti et zoom avant le panier, proportionnés au tir** : le jeu mesure le « spectacle » du tir en cours
  (rebonds + 2 × portails, boutons, caisses + propulsions). Tir direct : ralenti léger (×0,6) et petit zoom
  (×1,12). Beau tir : ×0,4 et zoom ×1,3. **Trickshot spectaculaire** (3 ou plus) : ralenti marqué (×0,22),
  **zoom ×1,5**, légère secousse et son d'aspiration qui monte.
- **Panier** : filet qui s'illumine, onde de choc à la couleur du chapitre, étincelles électriques, rayons
  (trickshot), confettis, « TRICKSHOT ! » (sous le panier s'il est près du plafond), cadrage qui ne sort jamais
  de la salle. Son de laboratoire : accord de synthé, sous-basse, filet (plus ample pour un trickshot), foule
  au premier essai.
- **Bumpers** : éclat et **décharge électrique** sonore. Caisse qui éclate, voyants des portes, vibrations.

### Les difficultés

Chaque carte est vérifiée par le **solveur** (`tools/trickshot-check.mjs`) : il essaie des milliers de tirs et
mesure la **part des tirs qui marquent**. 🟢 Facile ≥ 0,8 % · 🟠 Difficile ≥ 0,3 % · 🔴 Très difficile ≥ 0,08 % ·
⚫ Impossible en dessous. La difficulté affichée est celle mesurée (à une classe près, vérifié par les tests).
**Toutes les cartes ont une solution en un seul tir** (3 étoiles possibles), enregistrée et rejouée par les tests,
et **chaque mécanique est indispensable** : un test rejoue la solution sans le trampoline, le ventilateur,
l'ascenseur, le bouton, les portails, la caisse ou les bumpers, et vérifie qu'elle ne marque plus.
Pendant la conception, une **recherche automatique de réglages** (positions, forces) qui rejette toute variante
où la carte se gagne sans sa mécanique a servi à régler les cartes à mécanismes enchaînés.

### Les 5 chapitres et les 20 cartes

| Chapitre | Cartes | Couleur | Idée |
|---|---|---|---|
| 1 · Calibration | 1–4 | cyan | le tir, le rebond, la bande, le tunnel (plusieurs rebonds) |
| 2 · Les machines | 5–8 | orange | trampoline, colonne d'air, deux machines enchaînées, ascenseur (le bon moment) |
| 3 · Les circuits | 9–12 | vert | caisse-couvercle, pont qui tombe, porte à bouton, ventilateur à allumer |
| 4 · Les portails | 13–16 | violet | portail (sortir d'une cage), deux portails et trois salles, laser + portail, portail + bande |
| 5 · Les trickshots | 17–20 | or | réaction en chaîne, zigzag de bumpers, flipper, **le grand trickshot** |

**Le grand trickshot (carte 20)** : rebond au sol → entrée dans le tunnel → **portail** → atterrissage sur le
**bouton** (encastré dans le sol) → la **porte** du puits s'ouvre → le **ventilateur** propulse le ballon tout en
haut → **rebond sur une rampe-bumper** → chute dans le **panier suspendu**, dans une chambre fermée accessible
seulement par le haut du puits. Sans un seul de ces éléments, aucun tir ne marque.

| N° | Carte | Difficulté | Idée (indice affiché) | Éléments |
|---|---|---|---|---|
| 1 | Premier tir | 🟢 | Touche le ballon, puis tire vers l’arrière n’importe où sur l’écran. Relâche ! | rebonds |
| 2 | Rebond | 🟢 | Le panier est sous une dalle : fais rebondir le ballon sur la plaque du milieu. | suspendu |
| 3 | La bande | 🟢 | Le panier tourne le dos : renvoie le ballon contre le mur de gauche. | rebonds |
| 4 | Le tunnel | 🟠 | Le seul passage est un tunnel bas : enchaîne les rebonds. | suspendu |
| 5 | Trampoline | 🟢 | Tu es dans une cage basse : le trampoline te fera passer le mur. | trampoline, cage de verre, suspendu |
| 6 | Colonne d’air | 🟢 | Le plafond est bas : seul le souffle du ventilateur monte jusqu’au panier. | ventilateur |
| 7 | La machine | 🟢 | Trampoline, puis ventilateur : deux machines, un seul tir. | trampoline, ventilateur, suspendu |
| 8 | L’ascenseur | 🟠 | Attends le bon moment : l’ascenseur renvoie le ballon vers le panier. | ascenseur |
| 9 | Le couvercle | 🟢 | Le panier est dans une fosse fermée par une caisse : arrive assez vite pour la briser. | caisse |
| 10 | Le pont | 🟢 | Passe sur le bouton : le pont descend dans le tunnel, au-dessus du vide. | bouton, porte/pont/trappe |
| 11 | La porte | 🟠 | Touche le bouton : le volet s’ouvre… pendant que le ballon roule encore. | bouton, porte/pont/trappe |
| 12 | Le souffleur | 🔴 | Le ventilateur est éteint : un bouton l’allume. | ventilateur, bouton, suspendu |
| 13 | Le portail | 🟢 | Tu es enfermé : le portail est la seule sortie. On en ressort à la même vitesse. | portails, cage de verre |
| 14 | Double portail | 🟠 | Trois salles fermées : le premier portail mène à droite, le second jusqu’au panier. | portails, cage de verre |
| 15 | Rideau laser | 🟠 | Le laser garde l’entrée du portail : attends qu’il s’éteigne. | portails, laser, suspendu |
| 16 | Portail et bande | 🟠 | À la sortie du portail, il faudra encore rebondir sur le mur. | portails |
| 17 | Réaction en chaîne | 🟠 | Bande sur le mur, bouton, trappe, trampoline, fenêtre : tout s’enchaîne. | trampoline, bouton, porte/pont/trappe |
| 18 | Zigzag | 🔴 | Les bumpers rendent toute l’énergie : va à droite, puis redescends à gauche. | bumpers |
| 19 | Le flipper | 🟠 | Les rampes-bumpers font faire le tour de la salle au ballon. | bumpers |
| 20 | Le grand trickshot | 🔴 | Rebond, portail, bouton, porte, ventilateur, bumper… panier. | ventilateur, bouton, porte/pont/trappe, portails, bumpers, suspendu |

**Sauvegarde** : les cartes de l'étape 22 n'existent plus ; la progression Trickshot passe au format v2. Avoir
réussi N anciennes cartes ouvre d'office les N+1 premières nouvelles ; l'ancienne sauvegarde est gardée telle
quelle (`legacy`). Le mode principal, les pièces, les skins et les récompenses ne sont pas touchés.

### Le code (`src/trickshot/`)

| Fichier | Rôle |
|---|---|
| `config.js` | `TS_CONFIG` (dérivé de `CONFIG` sans le modifier : matériaux `bumper` et `felt`, frein au sol, délai de mort), `TRICKSHOT` (3 essais, vitesse max 30 u/s, tirage max 3,2 u, fin de tir), difficultés, chapitres. |
| `game.js` | `TrickshotGame` (hérite de `Game`) : états visée → vol → fin de tir → victoire ou échec, `launch(angle, puissance)`, décor conservé entre les essais, caisses cassables (`breakables`), ventilateurs allumés par un bouton (`fans[].target`), gravité du niveau (`gravityScale` : la vitesse de lancement suit sa racine, même portée, vol flottant), score et bonus. `simulateShot()` pour le solveur et les tests. |
| `kit.js` | Boîte à outils des cartes : salle sans sol (`frame`), sols partiels (`floor`), plateformes posées ou **suspendues** (`plat`, `hang`), murs, verre (`glass`), murs inclinés (`slope`), bumpers et rampes-bumpers, paniers posés / au mur / **suspendus** (`hoopPole`, `hoopWall`, `hoopHang`). |
| `levels.js` | Les 20 cartes du laboratoire. |
| `aim.js` | Geste → tir (`aimFromDrag`), trajectoire prévue (`trajectory` : longueur d'arc limitée `maxLength`, arrêtée au premier bloc ou rampe). |
| `render.js` | `ArenaRenderer` (hérite du rendu du jeu) : **laboratoire** (fond précalculé de panneaux rivetés, tuyaux, câbles, lampes, néon ; engrenage, écrans et gyrophares animés ; vide du bas), acier à liseré lumineux, verre, murs inclinés, câbles des plateformes et paniers suspendus, volets à voyant, ascenseurs, caisses, panier néon à planche de verre et filet qui s'illumine, pas de tir, élastique, pointillés et repère du geste. |
| `progress.js` | Progression séparée (clé `hoopbounce.trickshot`, format v2 : étoiles, meilleur score, parties par carte ; migration de la v1), déblocage séquentiel, résumé. |
| `i18n.js` | Textes du mode en français, anglais, espagnol (difficultés, chapitres, mécaniques, écrans). |
| `main.js` | Écran de jeu : caméra, visée tactile et clavier, HUD, effets (ralenti, zoom, confettis, foule), sons, écrans de victoire / échec / pause, enchaînement des niveaux. |

Menu : `src/menu/trickshot-view.js` (accueil du mode et sélection des niveaux, illustration `TRICKSHOT_ART`),
carte dans `modesPage()` (`src/menu/pages.js`), pages `trickshot` et `trickshot-niveaux` dans `src/menu/main.js`
(retour : niveaux → accueil du mode → modes). Audio : `SPACES.arena`, `launch()`, `crowd()` dans `sfx.js`,
morceau `arena` dans `music.js` (ajouts seulement).

## 4 ter. Saisons — Saison 1 : Noël

> Les **saisons** sont des événements limités dans le temps qui changent l'ambiance du jeu. **Saison 1 : 🎄 Noël.**
> **Étape 1 (23/11/2026) : seulement le menu principal** — décor, neige, décorations, logo, effets, ambiance
> sonore, style des boutons. **Le gameplay n'est pas touché** (aucune page de jeu ne charge la saison, test à
> l'appui), les boutons restent exactement les mêmes, aucune sauvegarde ne change.

### L'interrupteur (`src/shared/season.js`)

- `SEASON = 'christmas'` : saison en cours. **Mettre `null` à la fin de l'événement** remet le menu habituel
  (salle de basket, musique seule) sans rien toucher d'autre.
- Essai sans changer le code : `index.html?season=off` (menu habituel) ou `?season=christmas`.
- Quand la saison est active : `<html data-season="christmas">` (styles), décor `ChristmasScene` au lieu de la
  salle de basket, décorations ajoutées à l'accueil, couche sonore d'hiver.

### Le décor enneigé (`src/menu/scene-christmas.js`)

Même interface que la salle de basket (`MenuScene`, dont il hérite) ; un **soir d'hiver à la montagne** :
- **ciel du soir** (bleu nuit → lueur rose et pêche à l'horizon), **étoiles** qui scintillent, **lune** ;
- deux chaînes de **montagnes enneigées** (sommets blancs, versants ombrés) ; **brume légère** qui dérive ;
- collines et **forêt de sapins** enneigés ; **chalet** aux fenêtres chaudes qui rayonnent, **guirlande** qui
  clignote sur le toit, **fumée** de cheminée ;
- champ de neige avec congères et **paillettes de givre** qui scintillent ;
- deux **grands sapins décorés** à droite : boules, **guirlandes d'ampoules** qui scintillent, **étoile** dorée ;
- **l'identité du jeu reste là** : le panier, couvert de neige, et la balle qui rebondit dans la poudreuse
  (petites gerbes de neige à chaque rebond) ;
- **neige** qui tombe en permanence : petits flocons sur trois profondeurs, balancement doux, très transparents
  (40 / 90 / 150 selon la qualité graphique) ;
- côté gauche voilé et bas de l'écran assombri : le logo, JOUER et les tuiles restent parfaitement lisibles.
Optimisations : ciel et montagnes dans un seul calque précalculé, sapins dans un calque recadré, flocons
lointains en petits carrés, un halo sur deux pour les ampoules → 60 images/s comme le menu habituel.

### Les décorations (`src/menu/season-decor.js`, `css/season-christmas.css`)

Élégantes et peu nombreuses, toutes décoratives (aucun clic) ; elles s'effacent quand une page s'ouvre :
- **guirlande lumineuse** en haut de l'écran (ampoules de 5 couleurs qui scintillent à des rythmes différents,
  lueurs) et deux **boules de Noël** suspendues qui se balancent ;
- **logo** : un **bonnet de Père Noël** posé sur le ballon (il suit son flottement), quelques **étincelles** et
  un **flocon** autour, un **reflet brillant** qui balaie le mot BOUNCE de temps en temps ;
- ruban **« 🎄 Saison de Noël ❄ »** sous le slogan (FR / EN / ES) : on comprend tout de suite l'événement ;
- bouton **JOUER** : **neige** sur le dessus, **brin de houx**, **lueur dorée** qui respire ;
- deux **cadeaux** à côté de JOUER (petit sursaut de temps en temps), un **sucre d'orge** au bout des tuiles ;
- **tuiles** et boutons du haut : un peu de neige sur le dessus, **lueur dorée** au survol et à l'appui.
« Mouvements réduits » du système : toutes ces animations s'arrêtent.

### L'ambiance sonore (`src/menu/sound.js`)

La musique habituelle du menu est **conservée** ; la saison lui **ajoute** (bus de musique : le réglage
« Musique » s'applique) :
- un **léger vent d'hiver** (bruit filtré dont la couleur et le volume ondulent très lentement) ;
- de **petits grelots** très discrets toutes les 9 à 16 secondes (tintements métalliques, stéréo, réverbération) ;
- une **note de cloche** (célesta) sur l'accord, une mesure sur deux.

### Suite de la saison

- ✅ **Hoop Pass « Saison 1 · Noël »** et gemmes — voir la section suivante.
- 🔴 À valider plus tard : niveaux ou carte Trickshot enneigés, effets de neige en jeu.

---

## 4 quater. Hoop Pass et gemmes (Saison 1 : Noël)

> Le **Hoop Pass** est le passe de saison de Hoop Bounce : en jouant, on gagne de l'XP de Pass, qui fait monter
> un niveau de 1 à 50 ; chaque niveau débloque une récompense **Gratuite** et une récompense **Premium**.
> **Saison 1 : ❄️ Noël ❄️**, du **23/11/2026 au 07/01/2027** (heure de l'appareil). Design propre au jeu :
> bleu nuit, blanc, rouge foncé, doré, touches de vert sapin ; cartes arrondies, profondeur, lumière, neige
> légère ; pas de cadres épais.

### Architecture évolutive (nouvelles saisons)

| Fichier | Rôle |
|---|---|
| `src/shared/seasons/christmas.js` | **Tout le contenu de la saison, en données** : id, numéro, emoji, nom et slogan (FR/EN/ES), dates, palette, barème d'XP, courbe des niveaux, prix du Premium, cadeau de bienvenue, objets exclusifs, 50 niveaux (gratuit / Premium / marquant). |
| `src/shared/seasons/index.js` | Registre des saisons (`SEASON_CONFIGS`, `seasonConfig(id)`). |
| `src/shared/season.js` | `SEASON` : saison en cours (décor du menu + Pass). |
| `src/shared/pass.js` | Le système (identique pour toutes les saisons). |
| `src/menu/pass-view.js`, `css/pass.css` | La page ; ses couleurs viennent de la palette de la saison (variables `--hp-*`). |

**Créer une saison** (Halloween, Été, Espace, Volcan…) : copier `christmas.js`, changer les valeurs (thème,
couleurs, dates, récompenses, objets exclusifs avec `season: '<passId>'`), l'ajouter au registre, passer
`SEASON` à son id. Chaque saison a sa **propre sauvegarde** (`hoopbounce.pass.<passId>`) : une nouvelle saison
repart du niveau 1, l'ancienne est gardée.

### XP de Pass

| Action | XP (phase 4) | Avant |
|---|---|---|
| Terminer un niveau | 50 la première fois, 10 en rejouant | 60 / 15 |
| Réussir un Trickshot | 60 la première fois, 15 en rejouant | 80 / 20 |
| Récupérer une mission quotidienne | 60 | 100 |
| Récupérer un succès | 100 | 150 |

- Niveau n → n+1 : `200 + 4 × (n+1)` XP (208 … 400) ; **14 896 XP** pour le niveau 50.
- Rythme visé (simulateur, voir [Économie](#4-sexies-économie-phase-4)) : un joueur actif atteint le niveau ≈ 47 au
  bout de 30 jours, un joueur occasionnel le niveau ≈ 31 ; le Pass ne se termine pas en quelques jours.
- Le gain s'affiche sur l'écran de victoire du jeu et du Trickshot (« +50 XP · Hoop Pass · niveau 4 ! »).
- Hors saison ou après la fin : plus d'XP, rien ne casse.

### Récompenses (50 niveaux, deux lignes)

- **Gratuit** : pièces (170 → 650), **gemmes** (15 aux niveaux 8 et 16, 20 aux niveaux 24 et 32, 25 aux niveaux
  40 et 48, 40 au niveau 50 : **160 💎**), coffres (commun 3, 9 ; rare 15, 27 ; épique 39, 45), effet de rebond
  **Flocons** (niveau 25).
- **Premium** : gemmes (30 au niveau 1, 20 au 12, 25 au 24 et au 36, 60 au 48 : **160 💎**, moins que son prix),
  coffres rares / épiques / premium, 2 000 à 4 000 pièces, des pièces aux autres niveaux, et les **niveaux
  marquants** : 5 **traînée Sucre d'orge** · 10 **Ballon de Noël** · 20 **effet de victoire « Pluie de
  cadeaux »** · 30 **skin Père Noël** · 40 **coffre légendaire** · 50 **skin MYTHIQUE « Étoile du Nord »**
  (nouvelle rareté, rose).
- **Objets exclusifs** (`exclusive: 'pass'`, `season: 'christmas-1'`) : jamais en boutique ni dans les coffres ;
  **impossibles à obtenir après la saison** ; ceux déjà obtenus restent au joueur.
- **Premium** : débloqué avec **250 💎** (prix inchangé ; version de test, aucun argent réel) ; il donne aussi
  les récompenses Premium des niveaux déjà atteints. **Cadeau de bienvenue** : 50 💎 à la première ouverture.
  Un joueur actif l'obtient vers le **13e jour**, un joueur occasionnel entre le **17e et le 20e jour**.
- **Achat (architecture prête pour Google Play Billing)** : la page passe par `purchasePremium()` de
  `src/shared/billing.js`, jamais directement par le Pass. Aujourd'hui `BILLING.mode = 'gems'` (les gemmes sont
  dépensées). Plus tard : `mode = 'store'`, le fournisseur `PlayBillingProvider` achète le produit
  `hoop_pass_christmas_1` (champ `premium.productId` de la saison) et, une fois l'achat validé, appelle
  `pass.grantPremium('store')`. La sauvegarde garde l'origine (`premiumSource : 'gems' | 'store'`). **Aucun
  paiement réel n'est branché** : en mode `store`, l'achat répond `unavailable`.

### Les 💎 gemmes

Monnaie **rare**, à côté des pièces (sans les remplacer). **Phase 4 : jamais après une partie ni dans les
missions.** Seules sources :
- **Hoop Pass** : 160 💎 sur la ligne gratuite, 160 sur la ligne Premium, cadeau de bienvenue (50) ;
- **Récompense quotidienne** : 45 💎 par semaine (jours 3, 5 et 7) ;
- **Quelques grands succès** (paliers Expert et Légende, 10 à 40 💎) : À mi-chemin 15, Volcanologue 10,
  Gardien de la forêt 15, Au-delà des étoiles 40, Constellation 30, Astronaute 20, Fidèle 10, Légende des
  missions 15 ;
- **Récompenses spéciales** : case 10 💎 de la roulette (5 %), coffres premium (5–15) et légendaires (15–25).

Ordre de grandeur (simulateur) : ≈ 620 💎 gagnées en 30 jours par un joueur actif, ≈ 490 par un joueur
occasionnel ; les publicités n'en ajoutent presque pas. Dépensées uniquement pour : le Pass Premium, les coffres
premium et légendaires, les skins très rares vendus en gemmes, les offres spéciales (onglet Gemmes de la
boutique, `src/shared/gem-offers.js`).

### La page (`index.html#pass`)

- **En-tête** : « HOOP **PASS** » (doré), « Saison 1 · ❄ Noël ❄ », temps restant (« 44 j 10 h », « Saison
  terminée »), gemmes, pièces.
- **Panneau gauche, toujours visible** : anneau du niveau, barre d'XP animée (« → Niv. 13 · 92 / 252 XP »),
  « Gagner de l'XP » (fenêtre du barème), carte **Pass Premium** (« Débloquer · 💎 250 », deuxième toucher
  « Confirmer » ; dorée une fois actif), bouton vert **Tout récupérer (n)**.
- **Piste** à défilement horizontal fluide (doigt natif, molette et glisser à la souris) : **Premium en haut**
  (cartes rouge foncé), **frise des niveaux** au milieu (remplie en or jusqu'au niveau actuel + avancement),
  **Gratuit en bas** (cartes bleu nuit). États : **disponible** (lueur qui pulse, flotte, « Récupérer »),
  **récupéré** (atténué, coche verte), **verrouillé** (cadenas), **Premium non débloqué** (cadenas doré), fin
  de saison (grisé). Niveaux marquants : ruban « Exclusif » ; carte mythique à halo arc-en-ciel tournant.
  Bouton **« Mon niveau »** dès que le niveau actuel sort de l'écran ; fondus sur les bords (envie de défiler).
- **Montées de niveau** : à l'ouverture, les niveaux gagnés depuis la dernière visite défilent (barre qui se
  remplit avec un grain sonore, anneau qui éclate, étincelles et flocons, son de cloches qui monte avec le
  niveau, vibration, colonne qui s'allume), puis un bandeau **« Niveau N atteint ! »** montre les récompenses
  débloquées.
- **Récupérer** : grande révélation (coffre qui s'ouvre, pièces, gemmes, objets) ; « Tout récupérer » montre
  tout le butin d'un coup. **Premium débloqué** : accord doré, éclat qui balaie la ligne Premium.
- Libellés FR / EN / ES ; « mouvements réduits » respecté.

---

## 4 quinquies. Mode Fantôme (phase 3)

**Jouer contre son meilleur essai.** Ce n'est pas un nouveau mode : il est intégré au mode principal, totalement
facultatif, et il ne change **rien** au jeu (physique, niveaux, scores, récompenses) : c'est une aide visuelle.

### Le principe
- À chaque partie, le jeu relève l'essai en cours. Quand le joueur marque le panier, l'essai devient le
  **fantôme** du niveau s'il n'y en avait pas, ou s'il est **plus rapide** que l'ancien (on ne garde que le
  meilleur). En rejouant le niveau, un **ballon fantôme** refait exactement ce parcours, en même temps que lui.
- Le fantôme suit le **chronomètre du niveau** (temps de course : il s'arrête pendant une chute, comme le temps
  affiché). Il part avec le joueur, se fige pendant une chute, repart avec lui ; au panier, il reste un instant
  dans le cercle puis s'efface.
- Il ne peut rien toucher : il est relevé en lecture seule et dessiné à part, jamais simulé (un test vérifie que la
  partie est identique au millième avec ou sans enregistrement).

### Ce qui est enregistré
- Position et **rotation** du ballon **60 fois par seconde de course** (un relevé tous les 2 pas de simulation),
  les **rebonds** (instants des chocs), le **temps**, le **résultat** (étoiles, chutes) et la date.
- Format compact : chaque relevé est l'**écart** avec le précédent, au centième (3 octets : x, y, rotation) ; un
  code d'échappement donne la position absolue après un saut (téléporteur, retour au drapeau). Rotation continue
  reconstruite exactement (entiers modulo un tour).
- **Poids** : 2 à 12 Ko par niveau, **≈ 370 Ko pour les 50 niveaux** ; encodage < 1 ms à la fin d'un niveau.
- **Fidélité** : relecture interpolée entre deux relevés, sans interpolation à travers un saut ; écart avec la
  vraie trajectoire **≤ 0,005 u** (moins d'un pixel), vérifié sur les 50 niveaux.

### L'affichage
- Ballon **translucide blanc bleuté** (verre givré, coutures de basket qui tournent comme pendant le record,
  liseré clair doublé d'un fin trait bleu nuit pour rester lisible sur la neige), **léger halo**, **traînée
  lumineuse fine** (≈ 1/3 s, interrompue aux sauts) et petit anneau à chaque rebond.
- Toujours **dessiné sous le vrai ballon**, à 62 % d'opacité, et il **s'efface quand il s'en approche** (jusqu'à
  20 %) : il ne masque jamais le vrai ballon. Apparition et disparition en fondu quand on change le réglage.

### Le réglage
- Bouton **Fantôme · Activé / Désactivé** sur la carte de départ et dans la pause ; modifiable à tout moment
  (même en pleine partie), **enregistré automatiquement** (réglage `ghost`, activé par défaut, partagé avec le
  menu). Le fantôme désactivé, les essais continuent d'être enregistrés.

### Nouveau record
- Si le joueur bat le temps de son fantôme, le nouveau fantôme **remplace aussitôt l'ancien** et l'écran de
  victoire affiche **« ✨ Nouveau record ! · Fantôme mis à jour »**. Le meilleur temps de la carte de départ est
  celui du fantôme (sinon, le meilleur temps enregistré par la progression).

### Sauvegarde
- Une entrée par niveau : `hoopbounce.ghost.<identifiant du niveau>` dans le stockage de l'appareil — une
  **nouvelle clé** : progression, pièces, gemmes, objets et réglages existants ne sont jamais modifiés. Les
  fantômes restent après fermeture du jeu et lors des mises à jour (même identifiant d'application).
- Donnée abîmée : ignorée sans erreur. Stockage plein : les fantômes les plus anciens laissent la place (jamais
  celui du niveau joué). Stockage indisponible : le jeu continue, sans fantôme.

### Code et tests
- `src/game/ghost.js` (logique, sans navigateur), `src/render/ghost-draw.js` (dessin), `src/main.js` (relevé
  après chaque pas de simulation, relecture à chaque image, carte de départ, boutons, victoire), `css/ghost.css`,
  textes `ghost.*` (FR / EN / ES), réglage `ghost` dans `src/shared/settings.js`.
- `tests/ghost.test.mjs` (8 tests) : format aller-retour (sauts, rotation), **relecture exacte des 50 niveaux**
  joués par le pilote, partie inchangée avec ou sans enregistrement, recommencement, interpolation et sauts,
  meilleur essai seulement et persistance, stockage plein, réglage (y compris anciennes sauvegardes).

---

## 4 sexies. Économie (phase 4)

> Une économie **équilibrée, motivante et professionnelle** : le joueur actif progresse régulièrement, sans
> frustration, et garde toujours un objectif. Les publicités restent **totalement facultatives**. Phase 4 :
> **aucun** changement de gameplay, de niveau, de physique, du Mode Fantôme, du Trickshot ni des menus (seuls
> les textes et la page Roulette suivent les nouvelles règles).

### Ce qui a changé

| Domaine | Phase 4 | Détails |
|---|---|---|
| **Roulette quotidienne** | Récompense quotidienne principale : 1 lancer gratuit par jour, compte à rebours, puis jusqu'à 3 lancers **uniquement** avec une publicité récompensée, puis plus rien jusqu'au lendemain | [Page](#roulette-quotidienne-indexhtmlbonus--refaite-à-la-phase-4) · [Chances](#publicités-récompensées-étape-13) |
| **Coffre bonus quotidien** | **Supprimé** (logique, page, emplacement publicitaire, textes) ; les anciennes sauvegardes restent lisibles | |
| **Récompenses quotidiennes** | 150 · 250 · 10 💎 · coffre commun · 400 + 10 💎 · coffre rare · très grosse récompense (qui change selon la semaine) ; nouveau cycle automatique | [Calendrier](#revenir-chaque-jour-étape-12) |
| **Gemmes** | Rares : Pass, calendrier, grands succès, quelques récompenses spéciales ; **jamais après une partie** | [Gemmes](#les--gemmes) |
| **Pièces** | Les niveaux longs et difficiles rapportent un peu plus (40 → 135) ; rejouer 8 → 16 ; missions −20 % | [Récompenses](#les-récompenses) |
| **Coffres** | Commun très fréquent, rare fréquent, épique rare, légendaire très rare ; tables de chances sans « remontée » de rareté | [Coffres](#revenir-chaque-jour-étape-12) |
| **Hoop Pass** | Prix inchangé (250 💎) ; XP et récompenses rééquilibrées ; achat passé par `billing.js`, prêt pour Google Play Billing (non branché) | [Pass](#récompenses-50-niveaux-deux-lignes) |
| **Publicités** | Doubler les pièces 5/jour, reprise au drapeau 10/jour, roulette 3/jour : 18 au plus, toutes facultatives | [Publicités](#publicités-récompensées-étape-13) |

### Le simulateur (`tools/economy-sim.mjs`)

Des joueurs types jouent 30 jours avec **le vrai code du jeu** (porte-monnaie, coffres, calendrier, roulette,
missions, succès, Hoop Pass, boutique) et une horloge simulée ; ils achètent l'objet le moins cher dès qu'ils
peuvent. `node tools/economy-sim.mjs 30` affiche le tableau jour par jour. Résultats (graine 7) :

| Profil (30 jours) | Pièces gagnées | 💎 gagnées | 1er achat | Premium | Pass | Objets (sur 41) |
|---|---|---|---|---|---|---|
| Actif | 106 858 | 621 | jour 2 | jour 13 | niv. 47 | 27 (2 légendaires) |
| Actif + publicités | 136 520 | 650 | jour 2 | jour 13 | niv. 47 | 23 (1 légendaire) |
| Occasionnel | 66 945 | 490 | jour 4 | jour 20 | niv. 31 | 19 |
| Occasionnel + publicités | 94 994 | 540 | jour 3 | jour 17 | niv. 31 | 22 |

Les objets tombés des coffres dépendent du hasard : sur une graine, le joueur avec publicités peut finir avec
moins d'objets que sans (il en achète autant ou plus, mais en reçoit moins des coffres). Les tests vérifient
donc des **moyennes sur 4 graines** et des bornes (`tests/economy.test.mjs`).

**Avant les réglages**, le premier passage du simulateur montrait une économie beaucoup trop généreuse :
41 objets sur 41 en 15 jours et 1 334 💎 en un mois (la rareté « remontait » quand les objets communs étaient
possédés, trop de coffres, trop de gemmes dans le Pass).

## 5. Progression

### Les mondes

| # | Monde | Accroche | Couleur | Ambiance | Mécaniques | Niveaux |
|---|---|---|---|---|---|---|
| 1 | **Ville** (tutoriel) | Le terrain du coucher de soleil | orange | ville moderne la nuit : gratte-ciel et immeubles détaillés (fenêtres qui s'allument et s'éteignent, néons qui pulsent, grandes enseignes au néon qui grésillent, châteaux d'eau, balises rouges), voie rapide où passent des voitures, avions au loin, projecteurs qui balaient le ciel, lune, vitrines, graffitis, lumière magenta et cyan ; lo-fi hip-hop | plateformes mobiles, trampolines, ventilateurs, caisse, scies, lasers, presses hydrauliques | 10 / 10 |
| 2 | **Neige** | Les sommets gelés | bleu glacier | montagnes enneigées ombrées, sapins enneigés, brume, petits nuages de froid, soleil d'hiver pâle, petits flocons, rafales, glace qui brille, traces dans la neige, couleurs froides ; boîte à musique | sol glissant, vent, stalactites, plaques qui cèdent, boules de neige, blocs de glace qui s'écrasent, remonte-pente | 10 / 10 |
| 3 | **Volcan** | Au cœur de la lave | orange feu | volcans qui fument et rougeoient, nuages de fumée, roches fissurées éclairées de rouge, rivière de lave animée, braises, cendres, chaleur visible ; tambours graves | lave, pierres fragiles, flammes, geysers, chutes de pierres, canons à boules de feu, rochers de lave, ascenseurs et navettes, bloc de pierre (forge), marteaux-pilons, bouches-téléporteurs | 10 / 10 |
| 4 | **Forêt** | Les bois enchantés | vert | collines, arbres détaillés, herbe vivante, rayons de soleil, oiseaux, papillons, feuilles qui tombent, champignons, lucioles ; marimba et flûte | champignons, lianes, balanciers à pointes, branches mobiles et fragiles, troncs (roulants, flottant), rondins, troncs-marteaux, planches magiques, rivière, leviers, arbres creux (téléporteurs) | 10 / 10 |
| 5 | **Espace** (monde final) | Au-delà des étoiles | violet | nébuleuses, étoiles qui scintillent, étoiles filantes, planètes, la Terre, station spatiale, débris qui flottent en apesanteur, poussières qui remontent ; nappes de synthé | gravité réduite, plateformes flottantes, astéroïdes, portails à double sens, gravité inversée, trous noirs, pistons, lasers, caisse et leviers | 10 / 10 |

**Ambiance sonore de chaque monde** (étape 10, `audio/music.js`) — en plus de la musique, un fond continu et des
petits sons ponctuels, chacun à son propre rythme aléatoire, pour reconnaître le monde les yeux fermés :
Ville — rumeur de la circulation, bourdonnement des néons, **voitures qui passent d'un côté à l'autre** (effet
Doppler et stéréo), klaxons, **sirène** lointaine, grésillement de néon ; Neige — vent en deux couches,
**rafales qui sifflent**, carillons cristallins, **craquements de la glace** ; Volcan — grondement profond, souffle
de chaleur, crépitements, **bulles de lave**, **éruptions lointaines** ; Forêt — feuillage, **ruisseau**, oiseaux,
**coucou**, **pic-vert**, brise ; Espace — bourdon qui respire, harmoniques qui scintillent, bips, **messages
radio**, souffles.

- **50 niveaux** (10 par monde), **entièrement refaits à la phase 2** (voir [Les niveaux](#les-niveaux)) : chaque
  niveau a une idée principale et raconte une petite histoire ; la durée et l'exigence montent de monde en monde,
  et l'Espace est le monde final.
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

**Refonte complète (phase 2, 24/11/2026).** Les 50 niveaux ont été refaits de zéro avec le **kit de construction**
(`src/game/levels/kit.js`) : un niveau s'écrit de gauche à droite, section par section, chaque section ayant une
idée et sa solution experte. Mêmes 5 mondes, mêmes mécaniques, même physique et même maniabilité ; les
identifiants des niveaux n'ont pas changé (la progression enregistrée reste valable).

**Durée visée pour un joueur** (estimée à 1,4 × la solution experte jouée par le pilote ; moyenne mesurée) :

| Monde | Visé | Mesuré | Rôle |
|---|---|---|---|
| Ville | 20 – 30 s | 20 – 33 s (moy. 27) | découverte, très peu de pièges |
| Neige | 30 – 40 s | 30 – 36 s (moy. 33) | premières combinaisons |
| Volcan | 40 – 50 s | 42 – 53 s (moy. 47) | enchaînements techniques |
| Forêt | 45 – 60 s | 46 – 57 s (moy. 51) | précision, les erreurs coûtent plus cher (moins de drapeaux, rivière) |
| Espace | 50 – 70 s | 52 – 68 s (moy. 59) | expert, presque toutes les mécaniques |

**Principes appliqués** : une idée principale par niveau (jamais toutes les mécaniques à la fois, sauf les finales) ;
chaque piège est présenté seul avant d'être combiné ; pièges réguliers et annoncés (le joueur comprend toujours
pourquoi il a échoué) ; puzzles d'observation (attendre, observer, activer, détruire, faire tomber, téléporter,
rebondir) ; rythme alterné facile / technique / puzzle / précision / rapide / détente ; drapeaux avant les
passages longs ; **3 étoiles** par niveau, souvent sur un passage risqué.

| # | Niveau | Idée | Palier | Joueur | Passages |
|---|---|---|---|---|---|
| 1 | **Premier tir** | tutoriel : rouler, rebondir, charger | F | ~26 s | 6 |
| 2 | **Les trampolines** | trampolines et premiers pics | F | ~24 s | 5 |
| 3 | **Les nacelles** | plateformes mobiles, monte-charge, nacelle du haut | M | ~32 s | 4 |
| 4 | **La caisse** | la caisse sert de marche, puis de pont sous un plafond bas | M | ~26 s | 4 |
| 5 | **Le souffle des toits** | ventilateurs de toit en toit (détente) | F | ~33 s | 4 |
| 6 | **Le panier verrouillé** | trampoline → toit → interrupteur de la tour → porte du panier | M | ~20 s | 4 |
| 7 | **Les scies** | rythme des scies (précision) | M | ~30 s | 5 |
| 8 | **Le métro** | réseau de téléporteurs, rame de métro, puits | M | ~24 s | 5 |
| 9 | **Le chantier** | lasers et presses (rapide) | D | ~26 s | 5 |
| 10 | **La grande finale** | caisse → interrupteur → porte → ventilateur → téléporteur | D | ~29 s | 7 |
| 11 | **Premières glissades** | la glace : élan, freinage, piliers glissants, tremplin | F | ~30 s | 8 |
| 12 | **Le col venteux** | vent de face, vent dans le dos, rafales | M | ~32 s | 8 |
| 13 | **La grotte de glace** | stalactites : passer vite, ou les faire tomber et attendre | M | ~31 s | 4 |
| 14 | **Le pont de glace** ★ | le pont s'effondre derrière toi : ne jamais s'arrêter | M | ~36 s | 5 |
| 15 | **L'avalanche** ★ | boules de neige : sauter, ou se cacher dans un creux | M | ~35 s | 5 |
| 16 | **Patinoire au vent** | glace + vent : freiner à temps | D | ~32 s | 7 |
| 17 | **Le glacier** | blocs de glace qui s'écrasent (précision) | D | ~36 s | 6 |
| 18 | **Le chalet** | deux interrupteurs : la barrière du remonte-pente, puis la porte du chalet | M | ~32 s | 7 |
| 19 | **Le sommet** | ascension : trampolines, plaques, corniche venteuse, stalactites | D | ~34 s | 6 |
| 20 | **Tempête de neige** | finale : tempête, avalanche, tunnel de glace, pont qui cède | D | ~33 s | 5 |
| 21 | **Premières braises** | la lave : bassins, îlots, flammes, pierres fragiles | F | ~42 s | 5 |
| 22 | **Les geysers** | courir, s'arrêter, repartir ; marches brûlantes ; lac de feu | M | ~50 s | 7 |
| 23 | **Chute de pierres** | les ombres annoncent les pierres : galerie, abris, cheminée | M | ~44 s | 7 |
| 24 | **Les canons** | boules de feu : sous la lave, en face, du plafond | D | ~47 s | 6 |
| 25 | **La coulée** | rochers de lave : sauter, ou se cacher dans la niche | D | ~51 s | 5 |
| 26 | **La forge** ★ | puzzle : bloc-pont sous la hotte, bloc-marche, soufflet, marteaux-pilons | M | ~44 s | 9 |
| 27 | **Le pont des geysers** ★ | pierres fragiles entre les geysers, piliers de repos | D | ~45 s | 6 |
| 28 | **Les ascenseurs** | ascenseurs et navettes de pierre, pierres qui tombent | M | ~49 s | 6 |
| 29 | **Le cratère** | puzzle : choisir la bonne bouche (téléporteurs), interrupteur de l'îlot | D | ~45 s | 10 |
| 30 | **Le cœur du volcan** ★ | finale : tout le volcan | E | ~53 s | 9 |
| 31 | **La clairière** | champignons : souche, ronces, rivière, escalier, grand champignon | M | ~46 s | 7 |
| 32 | **La rivière aux lianes** ★ | une liane, trois lianes, entre les balanciers | M | ~51 s | 6 |
| 33 | **Les branches** | branches qui montent, qui glissent, qui cassent ; échelle de branches | D | ~47 s | 6 |
| 34 | **Les troncs** | troncs qui roulent, rondins qui dévalent, tronc flottant | M | ~57 s | 6 |
| 35 | **Le bûcheron** | balanciers à pointes et troncs-marteaux | D | ~46 s | 6 |
| 36 | **La cabane** | puzzle : levier du champignon, levier de la caisse, monte-charge | M | ~51 s | 9 |
| 37 | **Les planches magiques** | planches qui clignotent : vague, escalier, descente | D | ~54 s | 5 |
| 38 | **La canopée** | tout en hauteur : lianes, branches, champignon, branches fragiles | D | ~50 s | 6 |
| 39 | **Les arbres creux** ★ | puzzle : le bon tronc, rondin, marteau, levier du sommet | D | ~48 s | 12 |
| 40 | **La forêt profonde** ★ | finale : toute la forêt | E | ~55 s | 8 |
| 41 | **Premiers pas lunaires** | sauts lunaires, plateformes flottantes, premier trou noir | M | ~64 s | 5 |
| 42 | **La ceinture d'astéroïdes** | entre les astéroïdes, par-dessus, dessous la pluie | D | ~61 s | 9 |
| 43 | **Les portails** ★ | portails à double sens : l'aller-retour vers l'interrupteur | D | ~54 s | 13 |
| 44 | **La tête en bas** ★ | gravité inversée : le plafond devient le sol, le pont invisible | D | ~56 s | 6 |
| 45 | **Les trous noirs** | sauter assez haut, assez loin, ou les contourner | D | ~63 s | 8 |
| 46 | **La station** | pistons et lasers : le bon tempo | D | ~54 s | 8 |
| 47 | **Le laboratoire** | puzzle : la caisse mène au portail, le portail mène au levier | D | ~55 s | 9 |
| 48 | **Le monde à l'envers** | gravité inversée, astéroïdes, pics des deux côtés | E | ~52 s | 5 |
| 49 | **Le grand vide** | plateformes flottantes, astéroïdes et trous noirs au-dessus du vide | E | ~68 s | 8 |
| 50 | **L'odyssée** ★ | finale : tout le jeu | E | ~61 s | 8 |

★ **14 niveaux marquants** : le pont qui s'effondre (14), l'avalanche et le creux (15), la forge (26), le pont des
geysers (27), le cœur du volcan (30), la rivière aux lianes (32), les arbres creux (39), la forêt profonde (40), les
portails aller-retour (43), le pont invisible (44), l'odyssée (50), et les finales de la Ville et de la Neige.

- Identifiants inchangés : `first-shot`, `the-wall`, `trampoline`, `moving`, `updraft`, `final`, `city-crate`,
  `city-roofs`, `city-site`, `city-finale`, puis `snow-1` … `snow-10`, `volcano-1` … `volcano-10`,
  `forest-1` … `forest-10`, `space-1` … `space-10`. Noms : clés `lv.<monde>.<n>` (3 langues).
- Chaque niveau décrit ses **passages** (`passages`) : départ, objectif et une **solution experte** (plan de
  manœuvres : rouler jusqu'à, charger, sauter en visant, attendre le bon moment, monter sur une plateforme, se
  balancer aux lianes, flotter dans un souffle…).
- **Vérification de référence** : `tools/level-run.mjs` joue **tous les passages à la suite dans une seule partie**,
  du départ au panier (portes, caisses, interrupteurs, pièges chronométrés dans leur état réel) et mesure la
  durée. `tests/routes.test.mjs` le fait pour les 50 niveaux à chaque `npm test` (≈ 6 s).
- Outils de conception : `tools/level-map.mjs` (plan PNG avec la trajectoire du pilote), `tools/tune.mjs`
  (balayage des fenêtres de départ d'un piège chronométré, `--full` = état réel d'arrivée),
  `tools/pass-debug.mjs` (un passage manœuvre par manœuvre), `tools/route-check.mjs` (solutions aléatoires).
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
- **Courbe de la refonte (phase 2)** — la difficulté monte avec les mondes, en alternant des niveaux plus doux :

  | Monde | Ce que vit le joueur | Paliers (1 → 10) |
  |---|---|---|
  | Ville | découverte, chaque mécanique seule, très peu de pièges | F F M M F M M M D D |
  | Neige | premières combinaisons (glace + vent, pont + stalactites) | F M M M M D D M D D |
  | Volcan | enchaînements techniques, pièges chronométrés | F M M D D M D M D E |
  | Forêt | précision : moins de drapeaux, la rivière ne pardonne pas | M M D M D M D D D E |
  | Espace | expert : presque toutes les mécaniques combinées | M D D D D D D E E E |

  (F facile, M moyen, D difficile, E expert.) Les niveaux « puzzle » (Ville 6, Neige 18, Volcan 26 et 29, Forêt 36
  et 39, Espace 43 et 47) et les détentes (Ville 5) font respirer chaque monde ; les finales sont « expert ».
- **Jamais injuste** : chaque piège est périodique et annoncé ; les fenêtres de départ des passages chronométrés
  sont choisies au centre d'une plage qui réussit (outil `tools/tune.mjs`). Une fenêtre trop étroite (< 0,2 s)
  a été corrigée en changeant le niveau, jamais acceptée.
- **Progression non bloquée** : vérifiée pour les 50 niveaux par une partie complète jouée par le pilote ; un test
  vérifie aussi que chaque monde dure en moyenne plus longtemps que le précédent.

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

**Récompense quotidienne** — la première connexion de chaque jour donne **une seule** récompense (calendrier
refait à la phase 4, `DAILY_CALENDAR` dans `src/shared/daily.js`) :

| Jour | 1 | 2 | 3 | 4 | 5 | 6 | 7 |
|---|---|---|---|---|---|---|---|
| Récompense | 150 pièces | 250 pièces | 10 💎 | Coffre commun | 400 pièces + 10 💎 | Coffre rare | **Très grosse récompense** |

- **7e jour** selon la semaine (`bigReward(cycle)`) : semaine 1 → **skin exclusif « Hoop Bounce »** + 500 pièces
  + 25 💎 ; semaine 2 → **traînée exclusive « Hoop Bounce »** + 500 pièces + 25 💎 ; ensuite → **coffre épique**
  + 25 💎. Un exclusif déjà possédé est remplacé par des pièces.
- On avance d'un jour à chaque récupération ; **manquer un jour ne fait rien perdre**. Après le 7e jour, un
  nouveau cycle commence automatiquement. Une semaine rapporte ≈ 1 300 pièces, 45 💎, 2 coffres et le gros lot.
- La page affiche les vraies récompenses de la semaine en cours (`week()`) : pièces, gemmes (gemme dessinée),
  nom du coffre (« Coffre commun », « Coffre rare », « Coffre épique »), « + 400 » sur les jours combinés.

**Coffres** (`CHESTS` dans `src/shared/rewards.js`, phase 4) — « commun très fréquent, rare fréquent, épique
rare, légendaire très rare » :

| Coffre | Pièces | Chance d'un objet | Rareté de l'objet | Gemmes |
|---|---|---|---|---|
| Commun | 100 à 200 | 15 % | commun 82 % · rare 17 % · épique 1 % | — |
| Rare | 250 à 450 | 30 % | commun 30 % · rare 59 % · épique 10 % · légendaire 1 % | — |
| Épique | 600 à 1 000 | 60 % | rare 55 % · épique 40 % · légendaire 5 % | — |
| Premium | 900 à 1 500 | 85 % | rare 35 % · épique 53 % · légendaire 12 % | 5 à 15 |
| Légendaire | 1 500 à 2 500 | 100 % | épique 50 % · légendaire 50 % | 15 à 25 |

- La rareté est tirée **d'abord**, selon ces poids (`pickRarity`) ; si tous les objets de cette rareté sont déjà
  possédés, le joueur reçoit des **pièces de doublon** (150 à 1 000 selon la rareté) au lieu de « remonter » vers
  une rareté supérieure (c'était le cas avant la phase 4 : la collection se finissait trop vite).
- `chestOdds(kind)` donne les chances de chaque coffre (tests, affichage futur).

**Missions quotidiennes** — 3 par jour (une facile, une moyenne, une difficile), tirées automatiquement d'après
la date (le même jour donne les mêmes missions), renouvelées à minuit. Leur progression vient des compteurs du
jour.

| Mission | Facile · moyenne · difficile | Pièces |
|---|---|---|
| Terminer N niveaux différents | 2 · 3 · 5 | 80 · 110 · 160 |
| Marquer N paniers | 5 · 10 · 15 | 80 · 130 · 180 |
| Obtenir N étoiles | 4 · 7 · 10 | 90 · 130 · 180 |
| Finir N niveaux sans mourir | 1 · 2 · 3 | 100 · 150 · 210 |
| Jouer pendant N minutes | 5 · 10 · 15 | 70 · 120 · 170 |
| Faire N rebonds | 30 · 60 · 100 | 60 · 100 · 150 |
| Terminer N niveaux du monde X (un monde ouvert) | 1 · 1 · 2 | 90 · 120 · 180 |
| Jouer N parties | 3 · 4 · 6 | 60 · 80 · 120 |
| Marquer N swish | 1 · 2 · 3 | 90 · 130 · 170 |

Pièces **réduites d'environ 20 %** à la phase 4 (les valeurs ci-dessus sont les nouvelles). La mission difficile
ajoute parfois un coffre : **commun 20 %**, **rare 8 %**, **épique 2 %** (sinon des pièces seulement) ; la
moyenne ajoute un coffre commun 8 % du temps. **Jamais de gemmes** dans les missions.

**Succès** — 40 succès sur 4 paliers ; chacun a sa récompense à récupérer :

| Palier | Succès (objectif → récompense) |
|---|---|
| **Débutant** (bronze) | Premier panier (1er niveau → 100) · Échauffement (100 rebonds → 100) · Chasseur d'étoiles (10 étoiles → 150) · Sans faute (1 niveau sans mourir → 150) · Premier achat (1 article → coffre commun) · Habitué (10 parties → 100) · Roi de la ville (monde Ville → coffre commun) · Tirelire (1 000 pièces gagnées → 150) · Bienvenue ! (1 récompense quotidienne → 100) · En mission (1 mission → 100) |
| **Intermédiaire** (argent) | Dix sur dix (10 niveaux → 300) · Pluie d'étoiles (50 étoiles → coffre rare) · Dribbleur (1 000 rebonds → 300) · Tireur (100 paniers → 300) · Swish ! (25 swish → article rare) · Accro du shopping (5 articles → 400) · Montagnard (monde Neige → coffre rare) · Ne lâche rien (100 chutes → 200) · Passionné (30 min → 300) · Économe (5 000 pièces → 500) · Chasseur de trésors (5 coffres → 300) |
| **Expert** (or) | À mi-chemin (25 niveaux → coffre épique + 15 💎) · Volcanologue (monde Volcan → 600 + 10 💎) · Gardien de la forêt (monde Forêt → 700 + 15 💎) · **Perfection** (un monde avec toutes les étoiles → traînée exclusive **Aurore**) · Tireur d'élite (500 paniers → 800) · Collectionneur (10 articles → coffre épique) · Infatigable (5 000 rebonds → 800) · Impeccable (20 niveaux sans mourir → 800) · Fortune (20 000 pièces → 1 000) · Constellation naissante (100 étoiles → 800) · Agent spécial (15 missions → coffre rare) |
| **Légende** (violet) | **Au-delà des étoiles** (les 50 niveaux → ballon exclusif **Légende** + 40 💎) · **Constellation** (150 étoiles → animation de panier exclusive **Constellation** + 30 💎) · **Maître du swish** (100 swish → effet de rebond exclusif **Couronne**) · Astronaute (monde Espace → coffre épique + 20 💎) · Fidèle (7 récompenses quotidiennes → coffre épique + 10 💎) · Légende des missions (30 missions → 1 500 + 15 💎) · Marathonien (3 h → 2 000) · Collection complète (tous les articles de la boutique → 3 000) |

**Articles exclusifs** (jamais en vente ; dans la boutique, ils portent l'étiquette « Exclusif · Récompense
quotidienne » ou « Exclusif · Succès ») :

| Article | Catégorie | Rareté | Comment l'obtenir |
|---|---|---|---|
| Hoop Bounce (ballon orange, panneau bleu nuit et monogramme « HB ») | Ballon | Légendaire | 7e jour de la récompense quotidienne (1re semaine) |
| Hoop Bounce (ruban orange et bleu nuit semé de ballons) | Traînée | Épique | 7e jour de la récompense quotidienne (2e semaine) |
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

**Emplacements et récompenses** (plafonds revus à la phase 4 ; le coffre bonus a été supprimé)

| Emplacement | Où | Récompense | Limite / jour |
|---|---|---|---|
| `doubleCoins` | Écran de victoire | Pièces du niveau doublées (animation ×2, éclat de pièces, son) | 5 (15 avant) |
| `checkpoint` | Écran « Niveau échoué » | Reprise au dernier drapeau, étoiles et progression gardées (offerte si aucune annonce) | 10 (15 avant) |
| `wheelSpin` | Page Roulette | Lancer supplémentaire de la roulette, **seulement après le lancer gratuit** | 3 |

Au plus **18 annonces par jour**, toutes facultatives. Le simulateur montre qu'elles ajoutent environ **+30 %
de pièces** (×1,1 à ×1,6 selon le profil) et presque **aucune gemme** : elles accélèrent sans être nécessaires.

**Roulette quotidienne** (`src/shared/bonus.js`, phase 4) — 1 lancer gratuit par jour, puis jusqu'à
`AD_SPINS_PER_DAY = 3` lancers avec publicité, puis plus rien jusqu'au lendemain (`status()` : `free` → `ads` →
`done`). `spin()` refuse un lancer avec publicité avant le lancer gratuit ou au-delà de 3. Chances :

| Case | 120 pièces | 250 pièces | 500 pièces | Coffre commun | 10 💎 | Coffre rare | 1 200 pièces | Skin de ballon épique |
|---|---|---|---|---|---|---|---|---|
| Chance | 32 % | 25 % | 13 % | 13 % | 5 % | 6 % | 4 % | 2 % |

Un skin déjà possédé est remplacé par des pièces. Moyenne ≈ 290 pièces par lancer, plus les coffres.

**Règles imposées par le gestionnaire** (quel que soit l'écran) : jamais pendant un niveau, jamais pendant une
animation importante, jamais au lancement du jeu (le SDK n'est même pas initialisé avant le premier bouton
affiché), jamais automatiquement après une partie. Les plafonds par jour gardent les récompenses précieuses.
Le jeu reste entièrement jouable sans regarder une seule annonce.

**Sauvegardes** : `hoopbounce.ads` (annonces regardées par emplacement aujourd'hui, total) et
`hoopbounce.bonus` (version 2 : jour, lancer gratuit utilisé, lancers avec publicité du jour, nombre total de
lancers, dernière case ; l'ancien champ du coffre bonus est ignoré, l'historique des coffres ouverts est gardé). Les récompenses vont
dans `hoopbounce.coins` / `hoopbounce.inventory` et les statistiques (`hoopbounce.stats`). Le tirage est enregistré **avant**
l'animation : quitter pendant que la roue tourne ne fait rien perdre.

**Développement** : seuls les **identifiants de test officiels de Google** sont utilisés (`useTestAds: true`).
Dans le navigateur, une annonce de test simulée remplace AdMob ; `?ads=none` simule l'absence d'annonce,
`?ads=fail` une erreur, `?ads=instant` une annonce éclair (tests automatisés).

**Configuration avant publication** (détails dans `native/android/README.md`) :
1. Console AdMob : créer l'application Android et **3 blocs « Avec récompense »** (`doubleCoins`,
   `checkpoint`, `wheelSpin`).
2. `src/shared/ads-config.js` : remplacer les identifiants `prod` (les `XXXX`) et passer `useTestAds` à
   `false`. Garde-fou : tant qu'un `XXXX` reste, le jeu reste en mode test.
3. `AndroidManifest.xml` : balise `com.google.android.gms.ads.APPLICATION_ID` avec le vrai identifiant
   d'application.
4. Fichier `app-ads.txt` sur le site du développeur ; message de consentement RGPD dans la console AdMob
   (« Confidentialité et messages ») ; déclarations Play Console (contient des annonces, sécurité des données,
   public cible / Familles).
5. Politique de confidentialité en ligne (texte du menu, mis à jour à l'étape 13).

### Le déblocage des modes

✅ **TRICKSHOT** est ouvert dès le départ (son propre déblocage, niveau par niveau). 🔴 **Pas encore défini** pour
les autres : les 3 modes prévus (Endless, Course Multijoueur, Créateur de Maps) sont affichés
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

**Rythme de déblocage** (phase 4, mesuré par le simulateur `tools/economy-sim.mjs` avec le vrai code, moyenne
de 4 tirages sur 30 jours) :
- **Une première partie complète** (50 niveaux, 150 étoiles) rapporte **≈ 8 800 pièces** de niveaux, plus les
  succès en cours de route.
- **Pièces par jour** (tout compris : niveaux, calendrier, roulette, missions, succès, coffres, Pass) :

  | Profil | Sans publicité | Avec les publicités facultatives |
  |---|---|---|
  | Actif (≈ 25 min : 4 nouveaux niveaux + 6 rejoués, 3 missions) | ≈ 3 600 | ≈ 4 600 |
  | Occasionnel (≈ 10 min : 2 + 2, 1 mission) | ≈ 2 200 | ≈ 3 200 |

- **Ce que ça donne en 30 jours** (joueur actif sans publicité) : premier achat le **2e jour**, au moins un
  nouvel objet **chaque semaine**, ≈ **25 à 27 objets sur 41**, dont 0 à 2 légendaires ; Pass Premium vers le
  **13e jour**, Pass niveau ≈ 47 ; ≈ 620 💎. Le joueur occasionnel : premier achat vers le 4e jour, ≈ 19 objets,
  Premium entre le 17e et le 20e jour, Pass niveau ≈ 31. Il reste **toujours un objectif** : la collection
  n'est jamais finie en un mois et les légendaires restent très rares.
- Délai approximatif pour acheter (joueur actif) :

  | Objet | Sans publicité | Avec les publicités facultatives |
  |---|---|---|
  | rare (25 000) | ~1 semaine | ~5–6 jours |
  | épique (120 000) | ~5 semaines | ~4 semaines |
  | légendaire (500 000) | ~4–5 mois | ~3,5 mois |
  | Diamant (1 000 000) | ~9 mois | ~7 mois |

- En plus des achats, **des objets tombent directement** (rareté tirée selon les chances des coffres, doublons
  convertis en pièces) : coffres du calendrier, des missions, des succès et du Pass ; roulette (coffres, skin
  épique 2 %) ; gros lot du 7e jour.

**Sauvegarde** : les achats et les objets équipés sont dans `hoopbounce.inventory` (rien ne change pour les
anciennes sauvegardes). Ils restent après fermeture du jeu, ce que vérifient des tests qui relancent le
porte-monnaie.

### Les récompenses

Barème revu à la phase 4 (`REWARDS`, `firstClearCoins()` et `replayCoins()` dans `src/shared/catalog.js`) : les
niveaux plus longs et plus difficiles rapportent un peu plus.

| Action | Pièces |
|---|---|
| Premier panier d'un niveau | 40 + 15 par monde + bonus de difficulté (facile 0, moyen 10, difficile 20, expert 35, extrême 50) : de **40** (Ville, facile) à **135** (Espace, extrême) |
| Chaque étoile obtenue pour la première fois | 20 |
| Les 3 étoiles d'un niveau (première fois) | +30 |
| Rejouer un niveau déjà terminé | 8 + 2 par monde (Ville 8 … Espace 16) |
| « Swish » (panier sans toucher le cercle) | +5 |
| Récompense quotidienne, missions, succès (étape 12) | voir [Revenir chaque jour](#revenir-chaque-jour-étape-12) |
| Publicité facultative sur l'écran de victoire (étape 13) | pièces du niveau doublées (5 fois par jour) |
| Roulette quotidienne | voir [Publicités récompensées](#publicités-récompensées-étape-13) |
| **Gemmes** | jamais après une partie : voir [Les 💎 gemmes](#les--gemmes) |

- Une première partie complète rapporte environ **8 800 pièces** (50 niveaux, 150 étoiles) ; le catalogue
  complet coûte **7 767 000** : un objectif de collection à très long terme (voir la boutique ci-dessus).
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

**Fichier actuel :** `dist/HoopBounce_Test_v10.apk` (≈ 0,6 Mo, **1.9.0-test10**, économie rééquilibrée) —
une **mise à jour** des v1 à v4 (même identifiant, même clé, versionCode 5 > 4 > 3 > 2 > 1) : elle s'installe par-dessus et
garde toutes les sauvegardes. Guide complet : `native/test-apk/README.md`.

**Mise à jour v10 (phase 4) — vérifié :** identifiant `com.echospeed.hoopbounce.test` inchangé, clé identique
(SHA-256 `894f0b7d…`, contrôlée par le script), versionCode 10, versionName 1.9.0-test10, `apksigner verify`
valide (v2 + v3). Fichiers de l'économie extraits de l'APK identiques aux sources testées ; pages Roulette,
Récompense quotidienne, Hoop Pass et un niveau ouverts depuis les fichiers de l'APK : 0 erreur. **Simulation de
mise à jour v9 → v10** (sauvegarde complète d'un joueur avancé) : pièces, gemmes, objets et équipement,
progression, records, série du calendrier, Pass Premium et récompenses récupérées, réglages et fantômes relus à
l'identique ; l'ancienne sauvegarde du coffre bonus est ignorée sans erreur et la roulette repart d'un lancer
gratuit le lendemain.

**Mise à jour v3 (étape 23) — vérifié :** identifiant inchangé, clé identique (empreinte contrôlée par le script),
versionCode 3, versionName 1.2.0-test3, signature valide. Simulation v2 → v3 (fichiers extraits des deux APK,
même adresse et même stockage, sans cache comme dans l'application) : pièces, skin possédé et équipé,
progression du mode principal, missions et récompenses relus à l'identique ; seule la sauvegarde Trickshot
change (migration v2 : 2 cartes réussies → 3 cartes ouvertes, ancienne sauvegarde gardée) ; 0 erreur.

**Mise à jour v2 (étape 22) — vérifié :** identifiant `com.echospeed.hoopbounce.test` inchangé ; signature avec la
même clé (empreinte SHA-256 `894f0b7d…35bfd8` contrôlée par le script de construction, qui refuse toute autre clé) ;
versionCode 2 ; versionName 1.1.0-test2 ; `apksigner verify` valide (v2 + v3). **Simulation de mise à jour** : jeu
sur les fichiers extraits de la v1 (récompense du jour, niveau réussi, achat et équipement d'un skin), puis mêmes
adresse et stockage avec les fichiers extraits de la v2 → aucune clé perdue ni modifiée, pièces, skin possédé et
équipé, progression relus à l'identique ; mode TRICKSHOT présent ; 0 erreur. L'enveloppe désactive le cache
(`LOAD_NO_CACHE`, `Cache-Control: no-cache`) : la v2 lit forcément ses nouveaux fichiers.

| | |
|---|---|
| Nom affiché | **Hoop Bounce Test** (icône du ballon) |
| Identifiant | `com.echospeed.hoopbounce.test` — distinct de la version Play Store : les deux peuvent coexister |
| Version | v1 : `1.0.0-test1` (1) · v2 : `1.1.0-test2` (2) · v3 : `1.2.0-test3` (3) · v4 : `1.3.0-test4` (4) · v5 : `1.4.0-test5` (5) · v6 : `1.5.0-test6` (6) · v7 : `1.6.0-test7` (7) · v8 : `1.7.0-test8` (8) · v9 : `1.8.0-test9` (9) · **v10 : `1.9.0-test10` (10)** ; « 1.8.0 (test 9) » dans Paramètres et À propos |
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

**Mettre à jour les testeurs** : `node tools/build-test-apk.mjs --build 6` → `HoopBounce_Test_v6.apk`, signée
avec **la même clé de test** (sinon il faut désinstaller, ce qui efface la progression de test). Le script refuse
de construire sans la clé d'origine, avec une autre clé, un autre identifiant ou un versionCode qui n'augmente pas.

### Avant d'appuyer sur « Publier » (résumé de la checklist)

1. Comptes Play Console et AdMob ; confirmer l'identifiant du paquet.
2. Vrais identifiants AdMob (`ads-config.js`, `strings.xml`), `useTestAds: false`, `app-ads.txt`, message RGPD.
3. Politique de confidentialité en ligne ; fiche FR / EN / ES ; questionnaires de contenu (annonces,
   classification, public cible, sécurité des données).
4. AAB signé (build 1) → test interne → test fermé (12 testeurs, 14 jours si compte personnel) → production en
   déploiement progressif.

## 5 ter. Version iPhone (iOS)

**Statut : projet Xcode prêt à compiler** (`ios/`, étape 21). Pas encore compilé : Xcode n'existe que sur Mac.
Guide pas à pas (Mac, Xcode, essai sur son iPhone, TestFlight pour les amis) : **`native/ios/README.md`**.

### Ce qui est identique à Android
Le gameplay, les 50 niveaux, la physique, la boutique, les récompenses, la sauvegarde et les publicités sont
**exactement les mêmes fichiers** (`www/`, préparé par `tools/build-web.mjs`). Rien n'a été changé dans
l'expérience de jeu.

### Projet Xcode (`ios/`, Capacitor 8, Swift Package Manager — pas de CocoaPods)

| Réglage | Valeur |
|---|---|
| Identifiant · nom | `com.echospeed.hoopbounce` · **Hoop Bounce** |
| Version | 1.0.0 (build 1) |
| iOS minimum | **16.0** (iPhone 8 et plus récents) — nécessaire pour les unités CSS de conteneur de la roue |
| Appareils | iPhone et iPad (iPad en plein écran) |
| Orientation | **paysage uniquement** (gauche et droite) |
| Plein écran | barre d'état masquée, barre d'accueil estompée, gestes des bords à confirmer (`App/MainViewController.swift`) |
| WebView | sans défilement, sans rebond, sans aperçu des liens ; encoche et barre d'accueil gérées par le CSS (`contentInset: never`) |
| Publicités | `GADApplicationIdentifier` = application de **test** iOS de Google ; bloc récompensé de **test** iOS choisi automatiquement (`ads-config.js`, `currentPlatform()`) ; SKAdNetwork Google ; texte ATT présent mais **aucune demande de suivi** |
| Vibrations | `@capacitor/haptics` (retour haptique natif) |
| Icône · démarrage | icône 1024 sans transparence ; écran de démarrage sombre avec le ballon (fond `#04070F`) |
| Plugins | `@capacitor-community/admob` 8.4.2 (Google Mobile Ads 13.11, UMP 3.1), `@capacitor/haptics` 8.0.2 — tous deux avec leur version iOS (Swift Package) |
| Commandes | `npm run ios:sync` (copie le jeu et met à jour les plugins), `npm run ios:open` (ouvre Xcode) |

### Compatibilité vérifiée et corrigée (étape 21)
Audit du code web pour Safari / la WebView iOS (WebKit), puis **corrections sans effet sur le jeu** :
- **Son** : WebKit ne démarre l'audio que sur un geste « terminé » (doigt levé, clic, touche), pas au simple
  contact ; le son est désormais (re)déverrouillé aussi à ces moments-là (jeu, menu, boutique), et repris après
  une interruption iOS (appel, Siri : état « interrupted »). Sans cela, le jeu risquait d'être muet sur iPhone.
- **Vibrations** : l'iPhone n'a pas `navigator.vibrate` → module `src/platform/vibrate.js` : Android inchangé
  (`navigator.vibrate`), iPhone = retour haptique natif au même rythme (léger, moyen, fort selon la durée).
- **Publicités** : section `ios` dans `ads-config.js` (identifiants de **test** officiels iOS ; Google refuse
  un bloc Android dans une application iOS), détection automatique de la plateforme. Android inchangé.
- **Encoche** : en paysage, l'encoche ou la Dynamic Island retire ~59 px de chaque côté. Les boutons du jeu
  s'en écartaient déjà ; le menu et la boutique passent maintenant en mise en page compacte selon la **largeur
  réellement utilisable** (`src/shared/safe-width.js`, classes `fit-760` / `fit-1100`) : avant, sur iPhone
  mini / 15 / 16, les étiquettes du haut chevauchaient le logo et le compteur de pièces de la boutique sortait
  de l'écran.
- **Flou des projecteurs du menu** : `ctx.filter` n'existe dans WebKit qu'à partir d'iOS 18 → solution de repli
  équivalente (dessin réduit puis agrandi avec lissage).
- **Texte** : pas d'agrandissement automatique en paysage (`-webkit-text-size-adjust`), pas de menu « aperçu »
  au toucher long (`-webkit-touch-callout`).
- Déjà compatibles : `webkitAudioContext` en repli, `OffscreenCanvas` et `roundRect` avec repli, panoramique
  stéréo testé avant usage, marges `env(safe-area-inset-*)` et `viewport-fit=cover` sur toutes les pages,
  sauvegarde en `localStorage` (conservée par la WebView iOS entre les lancements et les mises à jour).

### Tests dans WebKit (le moteur de Safari et de la WebView iOS)
Dans l'environnement de développement (Linux), avec **WebKitGTK 2.52** piloté par WebDriver :
- **parcours complet : 29 contrôles sur 29, 0 erreur JavaScript** — lancement, son déverrouillé par un vrai
  toucher (menu et jeu), récompense du jour, 9 pages, coffre et roue (dont annonce de test), achat et
  équipement d'un skin, skin en jeu, panier et pièces, pièces doublées et reprise au drapeau (annonces de test),
  5 mondes jouables, **sauvegarde** (pièces, skin, progression) retrouvée après fermeture ;
- **tailles d'iPhone** (paysage) avec encoche simulée : SE (667 × 375), 12/13 mini (812 × 375), 14 Pro / 15 / 16
  (852 × 393), 15 Pro Max / 16 Plus (932 × 430), iPad Air (1180 × 820) : aucun élément hors écran ; boutons du
  jeu à 59 px de l'encoche et au-dessus de la barre d'accueil ;
- **performances** : une image du jeu se calcule en **1 à 2 ms** dans WebKit (budget à 60 images/s : 16,7 ms).
  Le compteur montre 28 à 44 images/s dans cet environnement **sans carte graphique** (tout le dessin y est fait
  par le processeur) ; sur iPhone, le canvas est dessiné par le GPU (Metal). Les 60 images/s sur un vrai
  iPhone restent à confirmer lors du premier essai.

### Reste à faire pour l'iPhone
- 🔴 Première compilation dans Xcode sur un Mac, essai sur un iPhone (60 images/s, son, vibrations, encoche).
- 🔴 TestFlight pour les amis : compte Apple Developer (99 $/an), app créée sur App Store Connect, archive envoyée.
- 🔴 Avant l'App Store : vrais identifiants AdMob iOS, liste SKAdNetwork complète, questionnaire de
  confidentialité, captures iPhone.

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
- ✅ **Étape 25 — direction artistique unifiée** : une seule police, système de design, pièces / gemmes /
  coffres illustrés, icônes sans émoji, vraie neige, ouverture de coffre, micro-animations, profondeur des fonds
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
- ✅ Page Bonus du jour : coffre gratuit ou amélioré, roue de la chance animée (devenue la Roulette quotidienne seule à la phase 4)
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

### Phase 6 octies — Qualité, phase 2 : refonte des 50 niveaux ✅ (en attente de validation)
- ✅ Kit de construction des niveaux par sections ; vérification par partie complète (`level-run`), plan,
  balayage des fenêtres, débogage pas à pas
- ✅ Ville (20–30 s), Neige (30–40 s), Volcan (40–50 s), Forêt (45–60 s), Espace (50–70 s) refaits : 50 niveaux
  uniques, une idée par niveau, 14 niveaux marquants, rythme alterné, 3 étoiles chacun
- ✅ Noms et 14 nouvelles aides en 3 langues ; gains en pièces légèrement relevés
- ✅ Test : les 50 niveaux joués en entier à chaque `npm test` ; difficulté croissante vérifiée
- 🔴 Retours du porteur du projet et de vrais joueurs (durées réelles, passages trop durs)

### Phase 6 nonies — Phase 3 : Mode Fantôme ✅ (en attente de validation)
- ✅ Enregistrement du meilleur essai par niveau (60 Hz, format compact, ≈ 370 Ko pour 50 niveaux)
- ✅ Ballon fantôme synchronisé sur le chronomètre (écart < 1 pixel), traînée, halo, anneau de rebond
- ✅ Carte de départ (meilleur temps, état du fantôme), bouton Activé / Désactivé (départ et pause), enregistré
- ✅ « ✨ Nouveau record ! Fantôme mis à jour » ; sauvegarde à part, conservée lors des mises à jour
- 🔴 Retours du porteur du projet sur téléphone (lisibilité, discrétion, envie de rejouer)

### Phase 6 decies — Phase 4 : économie ✅ (en attente de validation)
- ✅ Roulette quotidienne : 1 lancer gratuit + 3 avec publicité au plus, compte à rebours, « reviens demain »
- ✅ Coffre bonus quotidien supprimé (logique, page, publicité, textes) ; anciennes sauvegardes lues
- ✅ Calendrier de 7 jours (pièces, gemmes, coffres, gros lot variable) ; gemmes rares ; barème des pièces
- ✅ Chances des coffres (commun → légendaire), doublons convertis en pièces ; plafonds de publicités revus
- ✅ Hoop Pass rééquilibré, achat prêt pour Google Play Billing (non branché) ; simulateur + 6 tests
- 🔴 Retours du porteur du projet sur téléphone (rythme ressenti, envie de revenir, prix du Premium)
- 🔴 Plus tard : brancher Google Play Billing (`PlayBillingProvider`) et la vérification des achats

### Phase 7 bis — Saisons 🟡
- ✅ Interrupteur de saison ; **Saison 1 — Noël, étape 1** : menu principal décoré et ambiance d'hiver
- ✅ **Hoop Pass « Saison 1 · Noël »** : 50 niveaux, lignes Gratuit / Premium, XP en jouant, 9 objets
  (dont un mythique), 💎 gemmes, onglet Gemmes de la boutique, architecture prête pour d'autres saisons
- 🔴 Noël, à valider plus tard : contenu enneigé en jeu ; saisons suivantes (Halloween, Été, Espace, Volcan…)

### Phase 7 — Modes de jeu 🟡
- ✅ Page « Modes à venir » : 3 cartes de présentation illustrées et animées, verrouillées (étape 19)
- ✅ **TRICKSHOT** (étape 22) : mode indépendant, lance-pierre, 3 essais, étoiles, score de style, 50 cartes en
  5 chapitres, 4 difficultés mesurées par un solveur, accueil du mode et sélection des 50 niveaux, arène néon,
  ralenti et zoom près du panier, musique propre
- ✅ **TRICKSHOT refondu** (étape 23) : visée n'importe où sur l'écran après avoir touché le ballon, pointillés
  limités au début de l'arc, identité « laboratoire » (métal, néons, machines), **20 cartes** nouvelles (plateformes
  suspendues, tunnels, cages, puits, paniers suspendus ou cachés, chaînes de mécanismes), chaque mécanique
  indispensable, ralenti et zoom selon le spectacle du tir, sons du laboratoire ; 🟡 validation par le porteur du projet
- 🔴 TRICKSHOT, suite (après validation) : nouvelles mécaniques, autres chapitres, défis quotidiens, récompenses
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

### Phase 8 bis — iPhone (iOS) 🟡
- ✅ Projet Xcode Capacitor 8 (`ios/`, Swift Package Manager), paysage, plein écran, iOS 16+ (étape 21)
- ✅ Publicités AdMob iOS en mode test (identifiants de test officiels, choix automatique de la plateforme)
- ✅ Retour haptique natif, son compatible WebKit, mises en page adaptées à l'encoche
- ✅ Parcours complet, sauvegarde et tailles d'iPhone vérifiés dans WebKit
- 🔴 Compilation dans Xcode sur un Mac, essai sur iPhone, TestFlight

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
- ✅ **Phase 3 — Mode Fantôme** : meilleur essai enregistré par niveau, ballon fantôme exact et discret, carte de
  départ, bouton Fantôme (départ et pause), nouveau record animé, sauvegarde séparée, APK de test v9
- ✅ **Phase 2 — refonte des 50 niveaux** : 50 niveaux uniques et plus longs (Ville 20–30 s … Espace 50–70 s),
  une idée et une petite histoire par niveau, puzzles, pièges introduits un par un, 14 niveaux marquants,
  vérification par partie complète, noms et aides en 3 langues, gains relevés, APK de test v8
- ✅ **Étape 25 — qualité visuelle** : direction artistique unique (Outfit seule, hiérarchie, arrondis, ombres),
  pièces, gemmes et 6 coffres illustrés, icônes cohérentes, neige réaliste, ouverture de coffre, effets du Pass,
  victoire, boutons, profondeur des fonds — sans toucher au jeu ni aux sauvegardes
- ✅ **Hoop Pass « Saison 1 · Noël »** + 💎 gemmes : page du Pass, bouton de l'accueil, XP des niveaux,
  Trickshots, missions et succès, Premium, 9 objets de saison, onglet Gemmes de la boutique
- ✅ **Saison de Noël — étape 1** : menu principal décoré (décor enneigé, neige, guirlande, bonnet, cadeaux,
  ambiance sonore d'hiver), désactivable d'un mot à la fin de l'événement
- ✅ **Boutique et Collection refaites** (étape 24) : la boutique vend (objets achetables seulement, Acheter
  sur chaque carte), la collection montre (objets possédés seulement, résumé Skins / Traînées / Effets)
- ✅ **Mode TRICKSHOT refondu** (étape 23) : visée confortable, laboratoire, 20 cartes-casse-têtes, polish,
  version de test v3
- ✅ **Mode TRICKSHOT** (étape 22) : 50 cartes toutes résolubles en un tir, solveur de difficulté, écran de jeu,
  accueil et sélection des niveaux dans le menu, progression séparée, tests
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
- ✅ Version iPhone préparée (étape 21) : projet Xcode, compatibilité WebKit, publicités de test iOS, haptique
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
- 🟡 **Validation de l'économie** (phase 4) avec `HoopBounce_Test_v10.apk` : roulette (lancer gratuit, 3 lancers
  avec publicité de test, compte à rebours), calendrier, rythme des pièces et des gemmes, coffres, Pass Premium
- 🟡 **Validation du Mode Fantôme** avec `HoopBounce_Test_v9.apk` : lisibilité du fantôme dans les 5 mondes,
  discrétion, carte de départ, envie de rejouer
- 🟡 **Validation de la refonte des 50 niveaux** (phase 2) avec `HoopBounce_Test_v8.apk` : durée et difficulté
  ressenties monde par monde, puzzles compris sans aide, passages trop durs ; décision sur les anciens records
- 🟡 **Validation de la qualité visuelle** (étape 25) avec `HoopBounce_Test_v7.apk` : impression générale, lisibilité
  de la police, coffres, neige, fluidité sur téléphone
- 🟡 **Validation du Hoop Pass et des gemmes** avec `HoopBounce_Test_v6.apk` (rythme des gemmes revu à la phase 4)
- 🟡 **Validation du menu de Noël** (saison 1, étape 1) avec `HoopBounce_Test_v5.apk`
- 🟡 **Validation de la Boutique et de la Collection** (étape 24) avec `HoopBounce_Test_v4.apk`
- 🟡 **Validation du mode TRICKSHOT refondu** par le porteur du projet (étape 23) avec `HoopBounce_Test_v3.apk` :
  confort de la visée, force du geste, longueur des pointillés, lisibilité du laboratoire, difficulté des 20 cartes
- 🟡 Première compilation iPhone dans Xcode (Mac) et essai sur iPhone ; TestFlight pour les amis (étape 21)
- 🟡 Essais de `HoopBounce_Test_v1.apk` sur téléphone par le porteur du projet et ses amis (étape 20) : noter ce
  qui ne va pas (démarrage, performances, son, vibrations, encoche, sauvegarde, confort des commandes)
- 🟡 Attente des retours du porteur du projet sur la page « Modes à venir » (étape 19) et sur le son et les
  sensations (étape 18)

### À faire — court terme 🔴
- 🔴 TRICKSHOT : faire jouer les 50 cartes à de vrais joueurs et réajuster celles qui paraissent injustes (la
  mesure du solveur ne remplace pas un humain : il vise parfaitement, mais sans voir les rebonds non plus)
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

**Économie (phase 4)**
- Simulateur (`tools/economy-sim.mjs`) : stockage en mémoire et horloge simulée, aucune attente ; 30 jours d'un
  joueur en ≈ 30 ms : les 6 tests d'économie (des dizaines de simulations) tournent en moins d'une seconde.
- Roulette : la page ne prépare la publicité qu'à l'état « publicités » (jamais avant le lancer gratuit, jamais
  quand la limite est atteinte) : aucune requête inutile.

**Mode Fantôme (phase 3)**
- Relevé : 3 entiers écrits dans un tableau typé (agrandi par doublement) toutes les 2 étapes de simulation ;
  aucun objet créé pendant la partie. Encodage par écarts (3 octets par relevé) : ≈ 11 Ko par minute de course.
- Relecture : positions décodées une fois au chargement du niveau (3 tableaux `Float32Array`) ; à chaque image,
  une interpolation et 10 points de traînée (aucune allocation). Sprite du fantôme dessiné une seule fois.
- Une clé de stockage par niveau : une victoire n'écrit que le fantôme de ce niveau (pas les 50).
- Mesuré dans Chromium (Pixel 7 émulé) : **60 images/s** (médiane 16,7 ms, p95 ≤ 16,8 ms) sur 15 niveaux avec les
  50 fantômes enregistrés, identique au jeu sans fantôme.

**Refonte des niveaux (phase 2)**
- Vérification des 50 niveaux en partie complète : ≈ 6 s pour tout le jeu (simulation à pas fixe sans rendu),
  donc jouée à chaque `npm test`. Les solutions aléatoires (`route-check 400`) sont calculées sur 4 processus
  (`--part` + `route-merge`).
- Niveaux plus longs mais même nombre d'éléments actifs à l'écran : mesuré à **60 images/s** (médiane et p95 à
  16,7 ms) sur 15 niveaux dans Chromium, téléphone Pixel 7 émulé.

**Mode TRICKSHOT (étapes 22-23)**
- Laboratoire : tout le décor fixe (panneaux, tuyaux, câbles, lampes, néon) est précalculé une fois par taille
  d'écran ; seuls l'engrenage, deux écrans et deux gyrophares sont redessinés ; les secousses décalent l'image.
- Cadrage fixe sur l'arène entière (aucun défilement) ; fond d'arène dessiné avec des traits translucides plutôt
  que des flous ; trajectoire prévue calculée analytiquement (≈ 25 points, arrêt au premier obstacle) seulement
  pendant la visée. Mesuré : 60 images/s dans Chromium (1 688 × 780).
- Le décor tourne pendant la visée mais le ballon ne simule rien tant qu'il n'est pas lancé.
- Solveur : 4 processus (`worker_threads`) ; grille rapide (`--quick`) pour itérer, grille complète pour
  enregistrer ; recherche fine seulement autour des tirs les plus proches quand la grille ne trouve rien.

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

**iPhone (étape 21)**
- Mises en page compactes selon la largeur utilisable : une seule mesure (élément invisible) au chargement et
  au redimensionnement, aucune écoute pendant le jeu.
- Repli du flou du menu : un petit canvas agrandi une fois, au lieu d'un filtre (aucun coût par image).
- WebKit : une image du jeu se calcule en 1 à 2 ms (mesuré dans WebKitGTK).

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

**Direction artistique (étape 25)**
- Illustrations en **fichiers SVG** (mis en cache, partagés par toutes les pages) au lieu de dégradés CSS.
- Éclat des pièces : une petite étoile animée en `transform` / `opacity` (l'ancien reflet masqué redessinait
  chaque image : −15 images/s mesurées) ; plus de `filter: drop-shadow` autour des éléments animés (même raison).
- Neige : flocons précalculés (3 sprites de cristaux, 1 point doux, 1 flocon flou) ; ~125 flocons en qualité haute.
- Fonds : profondeur précalculée dans les couleurs des plans (un voile par image coûtait −20 images/s en ×2).
- Mesures (Chromium sans carte graphique, 844×390) : jeu 60 images/s (×1 et ×2) ; menu de Noël ≈ 40 images/s en ×2
  sans GPU (48 avant ; le surcoût vient d'animations composées, quasi gratuites sur le GPU d'un téléphone).

**Hoop Pass**
- Page construite une fois, puis **mise à jour sans reconstruction** (états des cartes seulement) : le
  défilement et les aperçus restent ; seulement 6 aperçus d'objets dessinés.
- Animations sur `transform` / `opacity` (frise remplie par `translateX`, barre par `scaleX`) ; étincelles dans
  un canevas actif seulement pendant un effet ; neige du fond en un seul calque déplacé ; halos sans `filter:
  blur` (déjà dégradés). Mesure (Chromium sans carte graphique, ×2) : page du Pass ≈ autres pages du menu.

---

## 10. Bugs connus

| Gravité | Bug | Statut |
|---|---|---|
| Info | Mode Fantôme : les essais sont enregistrés à partir de cette version ; un niveau terminé avant la mise à jour affiche « Terminez une première fois ce niveau… » jusqu'à la prochaine victoire. | 🟡 Normal (aucun parcours n'existait avant) |
| Info | Mode Fantôme : le fantôme rejoue le temps de course ; s'il y a eu une chute avec retour au drapeau pendant le record, il se fige puis repart du drapeau, exactement comme pendant cet essai. | 🟡 Voulu |
| Info | Phase 2 : les **records de temps** enregistrés avant la refonte ont été faits sur les anciens niveaux (deux fois plus courts) ; ils sont conservés tels quels (les sauvegardes ne sont pas modifiées), donc presque impossibles à battre. | 🟡 À décider : les garder, ou les effacer une fois à la mise à jour (étoiles et niveaux terminés seraient conservés) |
| Info | Phase 2 : les durées sont **estimées** (1,4 × la solution experte) ; à confirmer avec de vrais joueurs, surtout les puzzles (plus longs à comprendre) et l'Espace. | 🔴 À éprouver |
| Info | Phase 2 : en gravité réduite, un ballon chargé au maximum (puissance 5) monte très haut ; quelques passages de l'Espace demandent de ne pas trop charger (les plans experts le font). | 🟡 Voulu (précision) |
| Info | Étape 25 : les nouvelles animations (pièces qui pivotent, éclats, neige) sont mesurées dans un navigateur sans carte graphique ; elles sont prévues pour le GPU des téléphones (transform / opacity). | 🔴 À confirmer sur téléphone (v7) |
| Info | Étape 25 : les « ✓ » et « → » des textes viennent de la police du système (Outfit ne les contient pas) : rendu légèrement différent selon l'appareil. | 🟡 Mineur |
| Info | Hoop Pass : le Premium coûtait 250 💎 et ne se débloquait qu’au **niveau 50** du Pass. | ✅ Résolu (phase 4) : gemmes du calendrier et des grands succès ; Premium vers le 13e jour (joueur actif), 17e–20e (occasionnel), prix inchangé |
| Info | Phase 4 : les gains déjà reçus avant la mise à jour (pièces, gemmes, objets) sont gardés tels quels ; seuls les gains à venir suivent le nouveau barème. Un joueur qui a déjà beaucoup de gemmes peut donc acheter le Premium tout de suite. | 🟡 Normal (les sauvegardes ne sont jamais modifiées) |
| Info | Phase 4 : le calendrier reprend au même jour de la semaine après la mise à jour (série conservée) mais affiche les nouvelles récompenses ; un ancien coffre bonus du jour déjà ouvert n'est pas remplacé par un lancer. | 🟡 Normal |
| Info | Phase 4 : l'achat réel du Premium (Google Play Billing) n'est pas branché ; en mode `store`, l'achat répond `unavailable`. | 🔴 À faire avant la publication d'un Pass payant |
| Info | Hoop Pass : les dates suivent l'heure de l'appareil (comme la récompense quotidienne). | 🟡 Normal hors ligne |
| ✅ | Hoop Pass (en développement) : pastille du bouton de l'accueil coupée après un toucher, accueil pas rafraîchi au retour de la page, son du Premium qui plantait, étiquette « rarity.mythic ». | ✅ Corrigé avant validation |
| Info | TRICKSHOT (étape 23) : progression Trickshot de l'étape 22 convertie (les anciennes cartes n'existent plus) : les déblocages sont gardés, pas les étoiles ni les records des anciennes cartes. | 🟡 Voulu |
| ✅ | TRICKSHOT (étape 23, en développement) : cartes 10, 12, 14 et 20 gagnables sans leur mécanique (tir en cloche ou ricochet), bouton en relief qui freinait le ballon, texte « TRICKSHOT ! » hors écran pour un panier près du plafond. | ✅ Corrigé avant validation |
| Info | TRICKSHOT (étape 22) : la difficulté est **mesurée par simulation** (part des tirs gagnants sur une grille), pas encore par des joueurs. Un niveau « Impossible » a toujours une solution, mais la fenêtre est très étroite. | 🟡 À éprouver |
| Info | TRICKSHOT : quelques cartes sont bien plus simples en deux tirs qu'en un (n° 28 Passage secret : ouvrir le passage, puis tirer au travers) ; c'est voulu (le décor reste entre les essais), la difficulté affichée est celle du tir parfait. | 🟡 Voulu |
| ✅ | TRICKSHOT (en cours de développement) : 10 cartes sans solution ou contournables, ballon qui s'enfonçait dans le sol pendant la visée, carte de victoire qui débordait sur un téléphone en paysage, rampes-bumpers dessinées comme des rectangles. | ✅ Corrigé avant validation |
| Info | Son (étape 18) : réglé au casque dans un navigateur, **pas encore écouté sur le haut-parleur d'un téléphone** (souvent mono et pauvre en graves : la couche de poids et la stéréo y seront moins sensibles). | 🔴 À tester (phase Android) |
| Info | Physique (étape 18) : les trajectoires sont volontairement inchangées pour garder l'équilibre vérifié des 50 niveaux ; un freinage plus franc au sol a été essayé puis abandonné (16 passages à revérifier). | 🟡 À rediscuter avec les retours des joueurs |
| ✅ | Boutique (étape 18, en cours de développement) : l'achat d'un objet épique ou légendaire plantait (variable supprimée par erreur). | ✅ Corrigé avant publication |
| Info | Économie (étape 17) : les coffres et la roue donnent toujours des **objets entiers** tirés au hasard parmi les raretés prévues : coffre épique → épique ou légendaire ; coffre bonus amélioré → rare, épique ou légendaire ; roue → skin épique ou légendaire. Avec les nouveaux prix, un légendaire (500 000+) peut donc tomber d'un coffre. Les gains n'ont pas été réduits, comme demandé. | ✅ Résolu (phase 4) : la rareté est tirée selon des poids (légendaire 1 % dans un coffre rare, 5 % dans un épique), sans remontée ; doublons → pièces |
| ✅ | Boutique entre 920 et 1 100 px de large : le compteur de pièces sortait de l'écran ; sur les cartes légendaires, le prix et « ★ Exclusif » débordaient. | ✅ Corrigé (v1.0.0) |
| Info | iPhone (étape 21) : projet Xcode **jamais compilé** (Xcode n'existe que sur Mac) ; testé dans WebKit (WebKitGTK) sous Linux, pas sur un vrai iPhone. Les 60 images/s sont à confirmer sur appareil. | 🔴 À tester par le porteur du projet |
| Info | iPhone : sur iOS, le son du jeu suit le bouton silencieux (comme la plupart des jeux) : téléphone en mode silencieux = pas de son. | 🟡 Normal |
| ✅ | iPhone mini / 15 / 16 (encoche) : étiquettes du haut du menu sur le logo, compteur de pièces de la boutique hors écran. | ✅ Corrigé (étape 21) |
| ✅ | iPhone : le son pouvait rester muet (déverrouillage au simple contact, refusé par WebKit) ; aucune vibration (`navigator.vibrate` absent). | ✅ Corrigé (étape 21) |
| Info | Version de test (APK) : construite et vérifiée (signature, contenu, jeu rejoué depuis l'APK), mais **pas encore lancée sur un vrai téléphone** (aucun appareil ni émulateur disponible). Sur un téléphone dont « Android System WebView » n'est pas à jour (avant 2020), le jeu peut ne pas démarrer. | 🔴 À tester par le porteur du projet |
| Info | Version de test : pas de vraies annonces de test AdMob (SDK absent de l'enveloppe) ; ce sont les annonces de test simulées du jeu. Les vraies annonces de test se vérifient avec la version Capacitor (`android/`). | 🟡 Normal pour cette version |
| Info | Projet Capacitor (`android/`, version Play Store) jamais construit (SDK Android indisponible dans l'environnement de développement) : à faire dans Android Studio. | 🔴 À tester |
| Info | Fournisseur AdMob (application Android) écrit d'après la documentation du plugin, **pas encore essayé sur un appareil** : événements de récompense et de fermeture à confirmer avec les annonces de test. | 🔴 À tester (phase Android) |
| ✅ | Écran de victoire sur petit téléphone : la bannière « Mission terminée ! » recouvrait quelques secondes le titre « Panier ! ». | ✅ Corrigé (étape 25 : la bannière se range à gauche) |
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

### 24/11/2026 — Phase 4 : économie rééquilibrée (v1.7.0-dev, APK de test v10)

> Une économie plus équilibrée, plus motivante et plus professionnelle. **Aucun** changement de gameplay, de
> niveau, de physique, du Mode Fantôme, du Trickshot ni des menus.

**Ajouté**
- **Roulette quotidienne** (récompense principale) : 1 lancer gratuit par jour, compte à rebours jusqu'au
  prochain, puis jusqu'à **3 lancers uniquement avec une publicité récompensée** (pastilles), puis « Plus de
  lancers aujourd'hui — reviens demain ! ». `Bonus.status()` (`free` / `ads` / `done`) ; `spin()` refuse un
  lancer avec publicité avant le gratuit ou au-delà de 3. Nouvelle case **10 💎** (5 %).
- **Calendrier de 7 jours** : 150 · 250 · 10 💎 · coffre commun · 400 + 10 💎 · coffre rare · très grosse
  récompense (semaine 1 : skin exclusif Hoop Bounce + 500 + 25 💎 ; semaine 2 : traînée exclusive + 500 +
  25 💎 ; ensuite : coffre épique + 25 💎), nouveau cycle automatique ; la page affiche les vraies récompenses.
- **Tables de chances des coffres** (`CHESTS`, `chestOdds`, `pickRarity`) : commun très fréquent, rare fréquent,
  épique rare, légendaire très rare (1 % dans un coffre rare, 5 % dans un épique).
- **Gemmes** sur 8 grands succès (Expert et Légende, 10 à 40 💎) ; puce 💎 dans les révélations de récompense.
- **`src/shared/billing.js`** : achat du Pass Premium passé par une couche dédiée (`BILLING.mode = 'gems'`
  aujourd'hui ; `'store'` + `PlayBillingProvider` + produit `hoop_pass_christmas_1` plus tard, non branché) ;
  `pass.grantPremium(source)`, origine sauvegardée (`premiumSource`).
- **`tools/economy-sim.mjs`** : simulateur de joueurs (actif / occasionnel, avec ou sans publicités) sur le vrai
  code ; **`tests/economy.test.mjs`** (6 tests) : progression, collection jamais finie, légendaires très rares,
  gemmes rares, effet des publicités, chances des coffres, sources de gemmes, achat du Pass.
- Nouvelle section [4 sexies. Économie](#4-sexies-économie-phase-4).

**Modifié**
- **Coffre bonus quotidien supprimé** : logique, page (la Roulette est seule, centrée), emplacement publicitaire
  `bonusChest`, textes (FR / EN / ES), fiche Play, checklist AdMob (3 blocs au lieu de 4). Menu : « Bonus »
  devient « Roulette ».
- **Pièces** : premier panier 40 + 15 par monde + bonus de difficulté (40 → 135), étoile 20, 3 étoiles +30,
  rejouer 8 → 16 selon le monde ; missions −20 % (coffres plus rares, jamais de gemmes) ; une partie complète
  ≈ 8 800 pièces.
- **Coffres** : moins de pièces et d'objets dans les coffres communs ; un doublon donne des pièces au lieu de
  « remonter » vers une rareté supérieure ; la roulette ne donne plus qu'un skin épique.
- **Hoop Pass** : prix inchangé (250 💎) ; XP réduite (niveau 50 / 10, Trickshot 60 / 15, mission 60, succès
  100) ; 160 💎 sur la ligne gratuite (8, 16, 24, 32, 40, 48, 50), 160 sur la ligne Premium (moins que son
  prix) ; moins de coffres (gratuit 21 et 33, Premium 8, 18, 28, 38 retirés).
- **Publicités** : doubler les pièces 5/jour (15 avant), reprise au drapeau 10/jour (15), roulette 3/jour.
- Textes de la boutique (« Comment gagner des pièces »), sous-titres du calendrier, README.

**Vérifié**
- **513 tests** passent (dont les 6 nouveaux tests d'économie et les tests mis à jour : roulette, remise à zéro
  à minuit, limite de 3 publicités, suppression du coffre bonus, calendrier, pièces, gemmes, sauvegardes).
- Simulateur : joueur actif → premier achat jour 2, Premium jour 13, Pass niveau 47, ≈ 25–27 objets sur 41,
  ≈ 620 💎 en 30 jours ; occasionnel → Premium jour 17–20 ; publicités ≈ +30 % de pièces, presque aucune gemme.
- Navigateur (844 × 390) : roulette dans ses 3 états, lancer avec annonce de test, calendrier semaine 1 et
  semaine 3, aucune erreur.
- **Aucune sauvegarde perdue** : simulation de mise à jour v9 → v10 avec une sauvegarde complète (23 456 pièces,
  140 💎, objets, progression, records, série du calendrier, Pass Premium, réglages, fantômes) relue à
  l'identique ; l'ancienne sauvegarde du coffre bonus est ignorée sans erreur.
- `dist/HoopBounce_Test_v10.apk` (1.9.0-test10) : même identifiant, même clé de test (SHA-256 identique à la
  v1), versionCode 10, signature valide ; fichiers de l'APK identiques aux sources testées, 0 erreur.

**Reste à faire**
- Retours du porteur du projet sur téléphone : rythme ressenti, envie de revenir, prix du Premium.
- Plus tard : brancher Google Play Billing et la vérification des achats côté serveur.

### 24/11/2026 — Phase 3 : Mode Fantôme (v1.6.0-dev, APK de test v9)

> Rejouer contre son meilleur essai, directement dans le mode principal. Aide visuelle uniquement : **aucun**
> changement de gameplay, de physique, de niveau ni de score.

**Ajouté**
- `src/game/ghost.js` : enregistrement du meilleur essai (position, rotation, rebonds à 60 Hz sur le chronomètre
  du niveau, temps, résultat), format compact par écarts (≈ 11 Ko par minute), relecture interpolée, stockage
  par niveau (`hoopbounce.ghost.<id>`, meilleur essai seulement, place libérée si le stockage est plein).
- `src/render/ghost-draw.js` : ballon fantôme translucide blanc bleuté (coutures qui tournent, liseré lisible sur la
  neige), halo léger, traînée fine, anneau de rebond ; dessiné sous le vrai ballon, effacé quand il s'en approche.
- **Carte de départ** (meilleur temps, « Fantôme disponible » ou « Terminez une première fois ce niveau pour
  débloquer le Fantôme. », bouton Fantôme), **bouton Fantôme dans la pause**, bandeau de victoire **« ✨ Nouveau
  record ! · Fantôme mis à jour »** (ou « Fantôme débloqué ») ; `css/ghost.css` ; textes FR / EN / ES.
- Réglage `ghost` (activé par défaut, enregistré) ; `tests/ghost.test.mjs` (8 tests).

**Modifié**
- `src/main.js` : relevé après chaque pas de simulation, relecture à chaque image, carte de départ, boutons,
  victoire ; « Nouveau record » n'apparaît qu'une fois sur l'écran de victoire.
- `src/render/renderer.js` : dessine le fantôme sous le vrai ballon ; `play.html` : carte, bouton, bandeau.
- `tests/menu.test.mjs` : la liste des réglages comprend `ghost`.

**Vérifié**
- `npm test` : **507 tests** réussis, dont la **relecture exacte des 50 niveaux** (écart ≤ 0,005 u) et une partie
  identique au millième avec ou sans enregistrement.
- Navigateur (Pixel 7 émulé) : carte sans / avec fantôme, fantôme qui avance pendant que le joueur attend, bouton
  dans la pause (réglage enregistré, conservé après rechargement), record battu → fantôme remplacé et bandeau
  animé, nouveau fantôme chargé en rejouant ; fantôme dans les 5 mondes (téléporteurs, gravité inversée) ;
  **60 images/s** sur 15 niveaux avec les 50 fantômes enregistrés ; aucune erreur.
- **Mise à jour v8 → v9 simulée** : progression, pièces, gemmes, objets et anciens réglages conservés ; le fantôme
  est activé par défaut.
- `dist/HoopBounce_Test_v9.apk` (1.8.0-test9) : même identifiant, même clé de test (SHA-256 identique à la v1),
  versionCode 9.

**Reste à faire**
- Avis du porteur du projet sur téléphone : lisibilité du fantôme, discrétion, carte de départ.

### 24/11/2026 — Qualité, phase 2 : refonte complète des 50 niveaux (v1.5.0-dev, APK de test v8)

> Aucune nouvelle fonctionnalité, aucun nouveau niveau : les **50 niveaux existants** du mode principal sont
> refaits de zéro. Mêmes 5 mondes, mêmes mécaniques, même physique et même maniabilité. **Inchangés** : menus,
> Hoop Pass, boutique, collection, succès, mode Trickshot, sauvegardes.

**Ajouté**
- **Kit de construction des niveaux** (`src/game/levels/kit.js`) : un niveau s'écrit section par section, en
  coordonnées locales ; éléments, étoiles, aides, drapeaux et solutions expertes sont décalés automatiquement.
- **Outils de conception** : `tools/level-run.mjs` (partie complète jouée par le pilote, du départ au panier,
  durée estimée), `tools/level-map.mjs` (plan PNG avec la trajectoire), `tools/tune.mjs` (fenêtres de départ des
  pièges chronométrés, `--full`), `tools/pass-debug.mjs` (un passage manœuvre par manœuvre),
  `tools/route-merge.mjs` (calcul des solutions aléatoires sur 4 processus) ; nouvelles manœuvres du pilote :
  flotter dans un souffle, tirer au panier dans une partie en cours.
- **Noms des 50 niveaux** (`lv.<monde>.<n>`) et **14 nouvelles aides** (téléporteur, laser, plaques, blocs,
  flamme, canon, rocher de lave, forge, bouches, balancier, leviers, planches magiques, arbres creux,
  laboratoire), en français, anglais et espagnol.
- `tests/routes.test.mjs` refait : les 50 niveaux sont **joués en entier** à chaque `npm test` (≈ 6 s), avec leur
  durée ; test de difficulté croissante d'un monde à l'autre ; solutions aléatoires rejouées.

**Modifié**
- **Ville** (20–30 s, découverte) : tutoriel, trampolines, nacelles, caisse-pont, ventilateurs, panier verrouillé,
  scies, métro (téléporteurs), chantier (lasers, presses), finale.
- **Neige** (30–40 s, premières combinaisons) : glace, col venteux, grotte aux stalactites, pont qui s'effondre,
  avalanche (sauter ou se cacher), patinoire au vent, glacier, chalet à deux interrupteurs, sommet, tempête.
- **Volcan** (40–50 s, enchaînements) : bassins et îlots, geysers, chutes de pierres, canons, coulée de rochers,
  forge (bloc-pont, bloc-marche, soufflet, marteaux-pilons), pont des geysers, ascenseurs et navettes, cratère aux
  bouches-téléporteurs, cœur du volcan.
- **Forêt** (45–60 s, précision) : champignons, rivière aux lianes et balanciers, branches mobiles et fragiles,
  troncs (roulant, rondins, flottant), bûcheron, cabane à deux leviers, planches magiques, canopée, arbres creux,
  forêt profonde.
- **Espace** (50–70 s, expert) : sauts lunaires, ceinture d'astéroïdes, portails aller-retour, tête en bas (pont
  invisible), trous noirs, station, laboratoire, monde à l'envers, grand vide, odyssée.
- **3 étoiles par niveau**, souvent sur un passage risqué ; drapeaux avant les passages longs (moins en Forêt).
- Paliers de difficulté : Ville F F M M F M M M D D · Neige F M M M M D D M D D · Volcan F M M D D M D M D E ·
  Forêt M M D M D M D D D E · Espace M D D D D D D E E E.
- **Gains en pièces légèrement relevés** (niveaux plus longs) : premier panier 50 + 15 par monde (40 + 10 avant),
  3 étoiles +25 (+20), rejouer 15 (10) ; une partie complète ≈ 9 000 pièces (7 750 avant).
- `tools/route-check.mjs` : plage de niveaux `a-b`, option `--part` ; `tools/build-test-apk.mjs` : version de test 8.

**Vérifié**
- `npm test` : **499 tests**, tous réussis (dont les 50 niveaux joués en entier et 301 solutions aléatoires
  rejouées ; les 29 passages sans solution aléatoire dépendent de l'état du niveau et sont couverts par la partie
  complète).
- Les **50 niveaux se terminent** en partie complète (aucune progression bloquée) ; durées joueur estimées :
  Ville 20–33 s, Neige 30–36 s, Volcan 42–53 s, Forêt 46–57 s, Espace 52–68 s ; moyenne croissante par monde.
- Jeu dans Chromium (Pixel 7 émulé) : 15 niveaux ouverts, **60 images/s** (médiane et p95 16,7 ms), aucune erreur ;
  rendu de tous les nouveaux pièges vérifié sur captures.
- **Mise à jour v7 → v8 simulée** : progression (niveaux terminés, étoiles, mondes ouverts, records), pièces, gemmes
  et objets équipés conservés ; la partie reprend au premier niveau non terminé (refait).
- `dist/HoopBounce_Test_v8.apk` (1.7.0-test8) : même identifiant `com.echospeed.hoopbounce.test`, même clé de test
  (SHA-256 identique à la v1), versionCode 8 : s'installe par-dessus la v7 sans perdre les sauvegardes.

**Reste à faire**
- Avis du porteur du projet sur les nouveaux niveaux ; essais sur téléphone (durées réelles, passages trop durs,
  lisibilité des puzzles).
- Décider du sort des **anciens records de temps** (faits sur les anciens niveaux, conservés : voir Bugs connus).

### 23/11/2026 — Étape 25 : qualité visuelle, direction artistique unifiée (v1.4.0-dev, APK de test v7)

> Début de la phase « qualité » : **plus aucune nouvelle fonctionnalité**. Gameplay, niveaux, Trickshot, missions,
> succès, boutique, collection, Hoop Pass, progression et sauvegardes : **inchangés**.

**Ajouté**
- `css/tokens.css` (système de design) et `css/type.css` (règles communes : hiérarchie, icônes, micro-animations,
  boutons), chargés sur toutes les pages.
- `assets/ui/` : pièce, gemme, 6 coffres (couvercle + caisse), générés par `tools/ui-art.mjs`.
- ~20 icônes au trait dans `src/menu/icons.js` ; plus aucun émoji dans l'interface.
- `src/menu/snowfall.js` : neige en trois plans (flocons lointains derrière les sapins, cristaux qui tournent,
  grands flocons flous au premier plan) ; ampoules rondes sur les sapins.
- Ouverture de coffre en cinq temps (apparition, secousses et lumière par la fente, ouverture et particules,
  récompense qui sort du coffre, son et vibration) ; effets de récupération du Pass ; rayons de victoire.

**Modifié**
- **Une seule police** (Outfit) : Unbounded supprimée (fichier, préchargement, crédits) ; graisses abaissées,
  lueurs des textes retirées, hiérarchie commune.
- Arrondis ramenés à 5 valeurs, ombres bleu nuit à 4 niveaux, focus discret.
- Pièces et gemmes illustrées partout ; coffres illustrés partout (quotidien, missions, Bonus, Pass, boutique).
- Fonds du jeu : profondeur atmosphérique précalculée. Boutons : mouvement plus doux, ombres plus naturelles.
- Écran de victoire : la bannière « Succès débloqué » ne recouvre plus le titre.
- Boutique : en-tête qui tient avec les deux soldes sous 900 px (compteurs des onglets masqués).
- `tests/modes.test.mjs` vérifie les icônes au lieu des émojis (360 tests).

**Vérifié** : 360 tests ; smoke test complet sans erreur ; jeu à 60 images/s ; mise à jour v6 → v7 simulée sans
perte (pièces, gemmes, skins, progression, Trickshot) ; captures avant / après de toutes les pages.

**Reste à faire**
- Avis du porteur du projet sur le rendu ; essai sur téléphone (fluidité des micro-animations et de la neige).

### 23/11/2026 — Hoop Pass « Saison 1 · Noël » et 💎 gemmes (v1.3.0-dev, APK de test v6)

**Ajouté**
- **Hoop Pass** : système `src/shared/pass.js` + configuration de saison `src/shared/seasons/christmas.js`
  (thème, couleurs, dates 23/11/2026 → 07/01/2027, barème, 50 niveaux, objets exclusifs) et registre ;
  architecture prête pour Halloween, Été, Espace, Volcan…
- **XP de Pass** : niveaux terminés (60 / 15), Trickshots (80 / 20), missions (100), succès (150) ; affichée
  sur les écrans de victoire.
- **Page Hoop Pass** (`src/menu/pass-view.js`, `css/pass.css`) : en-tête de saison et temps restant, anneau et
  barre d'XP, carte Premium, piste défilante Premium / frise / Gratuit, états clairs, « Mon niveau », « Tout
  récupérer », montées de niveau animées (barre, éclat, étincelles, cloches), bandeau « Niveau N atteint ! »,
  révélations, cadeau de bienvenue, déblocage Premium.
- **Bouton « billet » Hoop Pass** à côté de JOUER (niveau, barre, pastille) ; les cadeaux de Noël s'y posent.
- **💎 Gemmes** (`hoopbounce.gems`), coffres **premium** et **légendaire**, nouvelle rareté **mythique**.
- **9 objets** : Ballon de Noël, Père Noël, Étoile du Nord (mythique), Sucre d'orge, Flocons, Pluie de cadeaux
  (exclusifs du Pass) ; Cristal, Aurore, Tempête de neige (vendus en gemmes).
- **Boutique : onglet 💎 Gemmes** (coffres, Pack Hiver, skins rares) et solde de gemmes.
- Sons : niveau du Pass, remplissage, Premium (`audio/ui-voice.js`) ; icône gemme.
- Tests : `tests/pass.test.mjs` (8 tests, **360 au total**) ; smoke test complet sans erreur ; mise à jour v5 →
  v6 simulée : aucune sauvegarde perdue.
- `dist/HoopBounce_Test_v6.apk` (1.5.0-test6) : mise à jour par-dessus les versions précédentes.

**Modifié**
- `rewards-fx.js` : affiche aussi les gemmes et plusieurs objets.
- Boutique : la ligne « objets exclusifs » ne compte plus les objets vendus en gemmes ; en-tête plus compact.
- Le gameplay, les niveaux et les sauvegardes existantes : **inchangés**.

**Reste à faire**
- Avis du porteur du projet ; décider du rythme des gemmes pour le Premium (voir Bugs connus).

### 23/11/2026 — Saison 1 « Noël », étape 1 : le menu principal décoré (APK de test v5)

**Ajouté**
- **Interrupteur de saison** `src/shared/season.js` (`SEASON = 'christmas'`, essai `?season=off`).
- **Décor enneigé** `ChristmasScene` : ciel du soir, lune, étoiles, montagnes enneigées, brume, forêt, chalet
  (fenêtres chaudes, guirlande, fumée), champ de neige qui scintille, deux grands sapins décorés, panier enneigé,
  balle qui rebondit dans la poudreuse, **neige qui tombe en permanence** (discrète, 3 profondeurs).
- **Décorations** : guirlande lumineuse et boules en haut, bonnet de Père Noël sur le logo, étincelles, reflet
  brillant, ruban « Saison de Noël », neige + houx + lueur dorée sur JOUER, cadeaux, sucre d'orge, neige sur les
  tuiles et les boutons du haut, lueur au survol.
- **Ambiance sonore** ajoutée à la musique (conservée) : vent d'hiver léger, grelots discrets, note de cloche.
- `tests/season.test.mjs` (2 tests, 352 au total) ; menu à 60 images/s ; aucune erreur.
- `dist/HoopBounce_Test_v5.apk` (1.4.0-test5) : mise à jour par-dessus les versions précédentes.

**Modifié**
- Carte Trickshot du menu « Modes de jeu » : affichait encore « x/50 » (corrigé en « x/20 »).
- Le jeu, les boutons, les sauvegardes : **inchangés**.

**Reste à faire**
- Avis du porteur du projet sur le menu de Noël ; étapes suivantes de la saison seulement après validation.

### 23/11/2026 — Étape 24 : Boutique et Collection refaites, chacune avec son rôle (APK de test v4)

**Ajouté**
- **Boutique = vendre** : uniquement les objets achetables (non possédés, non exclusifs) ; onglets « Tout » et
  compteurs « à vendre » ; vitrine avec grande étiquette de prix ; **bouton « Acheter » sur chaque carte** ;
  badge « ✓ Possédé » puis disparition de la carte après l'achat ; écran « Tout est à toi ! » ; lien « Ma
  collection » ; ambiance chaude de magasin.
- **Collection = posséder** : uniquement les objets possédés, sans prix ni cadenas ni achat ; **résumé Skins /
  Traînées / Effets** avec barres de progression (et filtres), pourcentage total ; étagères par catégorie,
  socles lumineux ; Équiper / Déséquiper, badges « Équipé » et « Nouveau ! » ; ambiance froide turquoise.
- `Wallet.isForSale(id)`, `Wallet.collectionSummary()`, `COLLECTION_GROUPS` (règles communes, testées).
- 2 tests (350 au total) ; parcours navigateur : achat par la carte, jamais deux fois, catégorie vidée,
  Collection = exactement les objets possédés, équiper / déséquiper enregistrés.
- `dist/HoopBounce_Test_v4.apk` (1.3.0-test4) : mise à jour par-dessus les versions précédentes.

**Modifié**
- Anciens styles de la Collection retirés (le compteur et les onglets partagés avec la page Succès sont
  gardés). Sauvegardes, pièces, objets et équipement **inchangés** (mêmes clés, même format).

**Reste à faire**
- Avis du porteur du projet sur les deux pages (sur téléphone).

### 23/11/2026 — Étape 23 : refonte complète du mode TRICKSHOT (v1.2.0-dev, APK de test v3)

**Ajouté**
- **Nouvelle visée** : on touche le ballon, puis on vise **n'importe où sur l'écran** jusqu'au relâchement ;
  puissance = longueur du geste à l'écran ; repère du geste sous le doigt (cercle, trait, jauge), charge sonore à
  100 %. **Aide limitée** : pointillés réduits au début de l'arc (5,2 u), jamais les rebonds.
- **Identité « laboratoire de trickshots »** : fond de métal riveté, tuyaux, câbles, lampes, néons, engrenage,
  écrans et gyrophares animés ; acier à liseré lumineux, plateformes suspendues, murs inclinés, cages de verre,
  ascenseurs, volets à voyant, vide en bas de la salle ; panier néon à planche de verre, filet qui s'illumine.
- **20 cartes entièrement nouvelles** (au lieu de 50) en 5 chapitres de 4 : Calibration, Machines, Circuits,
  Portails, Trickshots. Départs en hauteur, dans une cage, dans un coin ; paniers à gauche, en hauteur, suspendus,
  enfermés ; chaînes de mécanismes jusqu'au **grand trickshot** (rebond → portail → bouton → porte → ventilateur
  → bumper → panier). Chaque carte : une idée, une solution en un tir, chaque mécanique indispensable.
- `src/trickshot/kit.js` (outils de construction des cartes) ; bonus de score **combo** ; « spectacle » du tir
  (ralenti et zoom proportionnés : jusqu'à ×0,22 et zoom ×1,5) ; sons du laboratoire (bumper électrique, charge,
  aspiration avant le panier, accord de victoire) — ajoutés à `sfx.js` sans rien changer aux sons existants.
- Tests : chaque mécanique indispensable, pointillés limités, cartes variées, migration de la sauvegarde (348 tests).
- **`dist/HoopBounce_Test_v3.apk`** (1.2.0-test3) : mise à jour par-dessus les v1 / v2, sauvegardes conservées.

**Modifié**
- Sauvegarde Trickshot v1 → v2 (déblocages gardés). Menu : sélection des cartes en chapitres côte à côte.
- `Hoop` garde sa définition (`hoop.def`) pour le rendu (aucun effet sur le jeu principal).

**Reste à faire**
- Essayer la v3 sur le téléphone (confort de la visée, force du geste, lisibilité) ; ajuster les cartes selon
  les retours ; aucune nouvelle mécanique ni nouvelle carte avant validation.

### 21/11/2026 — Étape 22 : nouveau mode TRICKSHOT (v1.1.0-dev)

**Ajouté**
- **Mode TRICKSHOT**, totalement indépendant du mode principal (progression, cartes, arène, musique séparées) :
  lance-pierre (doigt sur le ballon, tirer vers l'arrière, angle + puissance, trajectoire en pointillés), 3 essais,
  étoiles selon l'essai, score de style (rebonds, swish, planche, portails, propulsions), meilleur score.
- **50 cartes uniques** en 5 chapitres (bases ; machines ; danger ; laboratoire ; maître), chacune construite
  autour d'une idée, **toutes résolubles en un seul tir** (vérifié et rejoué par les tests).
- Éléments interactifs : caisses cassables, boutons qui ouvrent portes, trappes, ponts et passages secrets ou
  allument des ventilateurs ; bumpers et rampes-bumpers de flipper ; gravité réduite par niveau ; pics, scies,
  lasers, plateformes mobiles / fragiles / clignotantes, portails, glace, lave, aimants, boules de feu et de neige.
- 4 difficultés (🟢 🟠 🔴 ⚫) **mesurées par un solveur** (`tools/trickshot-check.mjs`) ; atlas des cartes
  (`tools/trickshot-atlas.html`).
- Menu : carte jouable « TRICKSHOT » en tête de « Modes de jeu », accueil du mode (illustration, description,
  niveaux terminés, étoiles, pourcentage, chapitres, Jouer), sélection des 50 niveaux (numéro, étoiles, meilleur
  score, difficulté, cadenas, déblocage séquentiel), légende des difficultés.
- Écran de jeu `trickshot.html` : arène néon aux couleurs du chapitre, HUD minimal (difficulté en haut à gauche,
  essais, recommencer, pause), ralenti et zoom près du panier, filet, particules, confettis, foule, jingle,
  écrans victoire / échec / pause ; musique « arène » et sons de lancer.
- `tests/trickshot.test.mjs` (11 tests) ; `trickshot.html` ajouté à la préparation de l'application (`www/`).
- Vérifié de bout en bout **au doigt** (événements tactiles) : Modes → TRICKSHOT → Jouer → niveau 1 → tir raté
  → panier (étoiles) → niveau 2 débloqué et sauvegardé ; aucune erreur, 60 images/s. **346 tests** passent ;
  version en ligne republiée (même lien) pour que le porteur du projet puisse jouer tout de suite.

**Modifié**
- Page « Modes à venir » renommée « Modes de jeu » (Trickshot jouable + 3 modes à venir) ; test des modes adapté.
- Audio : ajouts seulement (espace sonore, morceau et sons de l'arène). Rien d'autre du mode principal n'a changé.

- **Version de test v2** `dist/HoopBounce_Test_v2.apk` (1.1.0-test2, versionCode 2, même identifiant et même clé
  que la v1) : **mise à jour** de l'application de test déjà installée, sauvegardes conservées (simulation v1 → v2
  vérifiée) ; garde-fous ajoutés au script de construction (clé, identifiant, versionCode).

**Reste à faire**
- Installer la v2 par-dessus la v1 sur le téléphone et vérifier que la progression est bien là ;
- Validation du porteur du projet (sensation du tir, lisibilité, difficulté de chaque carte) ; essais par de vrais
  joueurs et sur téléphone ; aucune nouvelle mécanique ni extension du mode avant validation.

### 20/11/2026 — Étape 21 : préparation de la version iPhone (iOS) (v1.0.0)
- **Ajouté** :
  - **projet Xcode** `ios/` (Capacitor 8, Swift Package Manager) : paysage, plein écran, iOS 16+, iPhone et iPad,
    icône et écran de démarrage, `MainViewController.swift` (barre d'état masquée, barre d'accueil estompée,
    gestes des bords à confirmer) ;
  - publicités AdMob iOS en **mode test** : `GADApplicationIdentifier` de test, section `ios` dans
    `ads-config.js`, détection automatique de la plateforme (`currentPlatform()`), SKAdNetwork Google ;
  - `@capacitor/haptics` + `src/platform/vibrate.js` (retour haptique natif sur iPhone, Android inchangé) ;
  - `src/shared/safe-width.js` : mises en page compactes selon la largeur utilisable (encoche) ;
  - scripts `npm run ios:sync` / `ios:open` ; guide `native/ios/README.md` ; 5 tests (`tests/ios.test.mjs`).
- **Corrigé** (compatibilité iPhone, sans effet sur le jeu) : son déverrouillé aussi au doigt levé et repris après
  une interruption iOS ; flou des projecteurs du menu sans `ctx.filter` ; étiquettes du menu sur le logo et
  compteur de la boutique hors écran avec l'encoche ; texte agrandi en paysage ; menu « aperçu » au toucher long.
- **Vérifié** dans WebKit (WebKitGTK 2.52) : parcours complet 29/29 sans erreur, sauvegarde, 5 tailles d'iPhone et
  d'iPad, temps de calcul d'une image 1-2 ms ; non-régression Chromium (30/30) et 335 tests automatiques.
- **Inchangé** : gameplay, niveaux, publicités (toujours en test), sauvegardes.
- **Reste à faire** : compilation dans Xcode sur un Mac, essai sur iPhone, TestFlight (compte Apple Developer).

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
