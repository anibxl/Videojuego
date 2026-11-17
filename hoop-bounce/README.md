# 🏀 Hoop Bounce (titre provisoire)

Jeu de plateforme 2D pour Android, **à l'horizontale** : on fait rouler et rebondir une balle de basket
jusqu'au panier.

**Étape 5 (actuelle) :** le gameplay principal et 6 niveaux. Le menu de l'étape 4 est inchangé.

## Le menu principal (`index.html`)

- **Décor vivant** (canvas, `src/menu/scene.js`) : salle de basket la nuit, tribunes et lumières floues,
  bandeau LED animé, faisceaux de projecteurs, parquet verni en perspective avec reflets, panier au loin,
  balle qui rebondit lentement (avec ombre et reflet), poussières dans la lumière, parallaxe sur 4 plans.
- **Accueil** : logo, bouton JOUER, dock de 5 tuiles (Mondes, Modes, Magasin, Collection, Paramètres),
  solde de pièces.
- **Pages** : Mondes (bientôt), Modes (Trickshot, Endless, Défis quotidiens, Multijoueur — verrouillés,
  « À venir »), Magasin (onglets et emplacements prêts, catalogue dans `src/menu/shop-data.js`),
  Collection (état vide), Paramètres (musique, effets sonores, vibrations, langue, qualité graphique,
  politique de confidentialité, crédits).
- **Boutons** : pression avec léger grossissement au relâcher, éclat lumineux au point touché, son et
  vibration. Pages qui glissent, accueil qui s'efface, bouton retour d'Android (historique) géré.
- **Sons et musique** synthétisés (`src/menu/sound.js`) : aucun fichier, une ambiance douce en boucle.
- **3 langues** (FR, EN, ES — `src/menu/i18n.js`), langue de l'appareil par défaut.
- **Réglages enregistrés** sur l'appareil et partagés avec le jeu (`src/shared/settings.js`).
- **Polices embarquées** (fonctionnent hors ligne) : Unbounded et Outfit, licence SIL OFL 1.1
  (`assets/fonts/`).
- 60 images/s stables, même sans carte graphique ; la qualité graphique basse allège encore le décor.

## Le gameplay (`play.html`)

**But :** faire entrer le ballon dans le panier. Le panier n'est validé que lorsque le ballon est
**entièrement passé** dans le cercle (un ballon qui ressort par le haut ne compte pas).

### Les commandes

| | Tactile (deux pouces) | Clavier |
|---|---|---|
| Rouler | ◀ ▶ en bas à gauche (on peut glisser d'un bouton à l'autre) | `←` `→` (ou `Q`/`A`, `D`) |
| Rebondir | grand bouton en bas à droite (toute la moitié droite de l'écran) | `Espace`, `↑`, `Z`/`W` |
| Pause | bouton ⏸ | `Échap`, `P` |
| Recommencer | bouton ↺ | `R` |

### Le rebond : le principe du dribble

- **Ballon au sol** : chaque appui le fait rebondir immédiatement.
- **Ballon en l'air** : l'appui le **renvoie vers le sol** d'un coup sec (comme une main qui dribble) et il
  rebondit dès le contact. Chaque pression a donc un effet instantané.
- **Chaque rebond déclenché augmente la puissance** (5 niveaux : 1,4 · 2,2 · 3,1 · 4,1 · 5,2 u de haut).
  En tapant vite, on enchaîne de petits dribbles qui chargent la puissance en ~1 s, puis on laisse partir
  le grand rebond.
- **Quand le ballon reste au sol** ~0,5 s, la puissance redescend progressivement (un niveau toutes les
  0,3 s) jusqu'au niveau de départ. Le dernier cran clignote juste avant.
- La jauge (anneau autour du bouton + barres au-dessus du ballon) indique la puissance du **prochain**
  rebond : blanc, ambre au niveau 4, or au niveau 5.
- Même niveau = même hauteur : c'est prévisible, donc maîtrisable. On ne peut jamais monter plus haut que
  la puissance 5 : c'est un jeu de précision, pas d'escalade.

**Physique :** gravité franche (pas de flottement), accélération vive (pleine vitesse en ~0,3 s) mais de
l'inertie (le ballon continue de rouler), roulement sans glissement, rebonds réalistes selon la surface.

### Les 6 niveaux (`src/game/levels/index.js`)

Courts, chacun avec un départ, quelques obstacles, 3 étoiles et un panier. Chaque niveau introduit une idée :

| # | Nom | Idée |
|---|---|---|
| 1 | Premier panier | rouler, rebondir, enchaîner (les étoiles dessinent la montée vers le panier) |
| 2 | Le mur | charger la puissance pour franchir un mur |
| 3 | Trampoline | passer un champ de pics, panier sur une estrade |
| 4 | Plateforme mobile | traverser le vide |
| 5 | Le souffle | un ventilateur mène à la terrasse du panier |
| 6 | Grand final | interrupteur, porte et téléporteur |

Une chute (pics, vide) fait recommencer le niveau. Au premier lancement, des étiquettes montrent les deux
commandes ; elles disparaissent dès qu'on a roulé et rebondi trois fois.

### Panier et victoire

Filet animé, ralenti avec zoom de caméra vers le panier, secousse, confettis, « SWISH ! » si le ballon n'a
touché ni le cercle ni la planche, son, puis écran de victoire : étoiles qui tombent une à une, temps, record,
**Niveau suivant** / Rejouer / Menu. La progression (niveaux débloqués, étoiles, records) est enregistrée sur
l'appareil ; JOUER reprend au premier niveau non terminé.

### Interface

Discrète : niveau et étoiles en haut à gauche, recommencer et pause en haut à droite. Elle disparaît pendant la
pause et la victoire. L'application mise en arrière-plan se met en pause d'elle-même. Textes en FR / EN / ES
(langue choisie dans le menu, `src/game/i18n.js`).

## Tester

```bash
cd hoop-bounce
python3 -m http.server 8080
```

Ordinateur : <http://localhost:8080> (le menu ; `play.html?level=3` ouvre directement le niveau 3). Téléphone Android : même Wi-Fi, `http://<IP-de-l-ordinateur>:8080`
dans Chrome, téléphone tenu à l'horizontale. `?debug` dans l'adresse (ou `²`) affiche les collisions et
la zone du vent.

## Architecture

```
hoop-bounce/
├── index.html, css/menu.css    menu principal
├── play.html, css/style.css    partie (HUD, commandes, pause, victoire, tutoriel)
├── css/fonts.css, assets/fonts polices embarquées (licence OFL)
├── src/
│   ├── config.js               ★ TOUS les réglages (physique, déplacement, puissances, caméra…)
│   ├── main.js                 assemble la partie : niveaux, pause, victoire, progression
│   ├── menu/                   menu : décor, pages, sons, icônes, textes (FR/EN/ES), boutique
│   ├── shared/                 réglages du joueur et version, communs au menu et au jeu
│   ├── core/                   boucle à pas fixe (120 Hz), maths, bus d'événements
│   ├── physics/                balle, formes de collision, éléments mobiles
│   ├── game/                   contrôleur (dribble, puissance), éléments, pièges, panier, progression,
│   │                           textes de jeu (FR/EN/ES)
│   │   └── levels/index.js     les 6 niveaux = de simples données
│   ├── render/                 rendu Canvas, décor, caméra, déformations, particules
│   ├── audio/                  sons synthétisés (aucun fichier)
│   ├── input/                  tactile deux pouces + clavier
│   └── platform/               vibrations (à remplacer par le plugin Capacitor)
├── tests/                      tests automatiques (Node)
└── tools/route-check.mjs       outil de level design : chaque passage est-il faisable ?
```

Ajouter un élément de gameplay : ses données dans le niveau, sa construction dans `game/level.js`,
sa règle dans `game/game.js`, son dessin dans `render/renderer.js`.

### Régler les sensations (`src/config.js`)

- hauteur de chaque niveau de puissance → `controls.bounceHeights` ;
- dribble en l'air → `controls.slamSpeed` ;
- retour de la puissance quand le ballon reste au sol → `controls.restDelay`, `restStep` ;
- gravité → `physics.gravity` ;
- inertie → `controls.groundAccel`, `airAccel`, `groundBrake`, `physics.rollingResistance` ;
- rebond naturel de la balle → `materials.*.restitution` ;
- trampoline → `controls.trampolineVelocity` ; ventilateur → `strength` dans le niveau, `fans.*` ;
- caméra → `camera.*`.

## Tests

```bash
cd hoop-bounce
npm test                               # 57 tests : physique, dribble, éléments, panier, niveaux faisables, menu
node tools/route-check.mjs 400         # difficulté de chaque passage de chaque niveau
node tools/route-check.mjs 400 3       # seulement le niveau 3
node tools/route-check.mjs 400 --save  # après une modification voulue d'un niveau
```

Les tests de mécanique utilisent un terrain d'essai (`tests/fixtures/test-yard.js`) indépendant des vrais
niveaux. Le test `routes.test.mjs` rejoue une solution par passage de chaque niveau (les tirs au panier et la
plateforme mobile ont aussi une solution « experte » scriptée) : si un réglage rend un passage impossible,
il échoue.
