# 🏀 Hoop Bounce (titre provisoire)

Jeu de plateforme 2D pour Android, **à l'horizontale** : on fait rouler et rebondir une balle de basket
jusqu'au panier.

**Étape 17 (actuelle) :** **économie de collection**. 51 objets (dont 7 ballons à visage), prix de 6 000 à
1 000 000 selon la rareté, gains du jeu inchangés ; Collection en album avec les objets verrouillés visibles,
animations de déblocage épiques et légendaires.

**Version 1.0.0 — étape 15 :** **préparation de la publication Google Play** (rien n'est publié).
Tout est dans `store/` : icône, feature graphic, captures en 3 langues, textes de la fiche, checklist complète
(`store/CHECKLIST.md`), politique de confidentialité. Le projet Android (Capacitor 8) est dans `android/` :
`npm install && npm run android:sync && npm run android:open`.

**Étape 14 :** **écran de chargement**. Au lancement : HoopBounce en grand, « Par EchoSpeed », ballon
qui rebondit, particules et barre de progression discrète, puis fondu avec léger zoom vers le menu. Il ne dure
que le temps du chargement (minimum 1,1 s) et ne revient pas en sortant d'une partie (`?noboot` le désactive).

**Étape 13 :** **publicités récompensées, toujours facultatives** (Google AdMob, identifiants
de test uniquement pendant le développement). Doubler les pièces après une victoire, reprendre au dernier
drapeau après un échec (offert si aucune annonce n'est disponible), coffre bonus quotidien gratuit ou amélioré,
roue de la chance (1 lancer gratuit par jour, lancers bonus). Jamais d'annonce pendant un niveau, au lancement ou
automatiquement. Accès : bouton Bonus de l'accueil. Configuration : `src/shared/ads-config.js` (seul fichier à
modifier avant la publication) et `native/android/README.md`. Dans le navigateur, une annonce de test simulée
s'affiche (`?ads=none` : aucune annonce, `?ads=fail` : erreur).

**Étape 12 :** **revenir chaque jour**. Récompense quotidienne sur 7 jours (pièces, coffre, traînée
et skin exclusifs, coffre qui s'ouvre, pluie de pièces), 3 missions quotidiennes renouvelées à minuit, 40 succès
sur 4 paliers (Débutant → Légende) avec leurs récompenses, statistiques comptées pendant la partie. Tout est
enregistré automatiquement. Accès : boutons Cadeau, Missions et Succès en haut de l'accueil.

**Étape 11 :** **expérience utilisateur**. Vraie sélection des mondes dans le menu (grandes cartes,
cadenas et condition de déblocage, puis les 10 niveaux de chaque monde : étoiles, coche, cadenas) ; on relance
n'importe quel niveau débloqué depuis le menu ou depuis la pause ; Collection corrigée (articles achetés,
aperçu, équiper / déséquiper, badge « Équipé ») ; progression plus claire, sons de clic, animations.

**Étape 10 :** grande passe de **finition**. Mondes reconnaissables au premier coup d'œil (néons,
avions, nuages de froid, traces dans la neige, chaleur visible, papillons, débris en apesanteur, lumière propre
à chaque monde) et à l'oreille (ambiance sonore par monde) ; difficulté à **5 paliers** qui monte vite, une
difficulté nouvelle par niveau, et 4 pièges propres aux mondes (pilons, rochers qui dévalent, jets de flammes,
trous noirs) ; caméra, ombres, effets de rebond et de panier, animations d'interface. Étape 9 : boutique
(ballons, effets, traînées, animations de panier, 4 raretés, pièces gagnées en jouant, aucun achat réel).

📘 **Documentation complète du projet (concept, mécaniques, architecture, roadmap, tâches, bugs, journal) :
[PROJECT.md](PROJECT.md).** Ce README n'est qu'un guide rapide.

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

### Les niveaux de la Ville (`src/game/levels/city.js`)

Courts, chacun avec un départ, quelques obstacles, 3 étoiles et un panier. Chaque niveau introduit une idée :

| # | Nom | Idée |
|---|---|---|
| 1 | Premier panier | rouler, rebondir, enchaîner (les étoiles dessinent la montée vers le panier) |
| 2 | Le mur | charger la puissance pour franchir un mur |
| 3 | Trampoline | passer un champ de pics, panier sur une estrade |
| 4 | Plateforme mobile | traverser le vide |
| 5 | Le souffle | un ventilateur mène à la terrasse du panier |
| 6 | Grand final | interrupteur, porte et téléporteur |
| 7 | La caisse | pousser la caisse pour s'en servir de marche |

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

## Les mondes (`index.html#mondes`, `src/game/worlds.js`)

| # | Monde | Ambiance | Mécaniques |
|---|---|---|---|
| 1 | Ville (tutoriel) | coucher de soleil, immeubles, graffitis, lampadaires | plateformes, plateformes mobiles, trampolines, ventilateurs, caisse à pousser |
| 2 | Neige | montagnes, sapins, flocons, brume, lumière froide | sol glissant, plateformes de glace, vent de neige, stalactites, rampes de glace |
| 3 | Volcan | lave, roches, cendres, éruptions, braises | lave mortelle, plateformes fragiles, geysers de feu, chutes de pierres, ascenseurs de pierre |
| 4 | Forêt | grands arbres, rayons de lumière, champignons, rivière, lucioles | lianes, bois, champignons rebondissants, troncs qui roulent, branches mobiles |
| 5 | Espace | planètes, étoiles, nébuleuses, astéroïdes, la Terre | gravité réduite, astéroïdes, portails, plateformes flottantes, gravité inversée |

- Chaque monde a son décor animé, ses particules, sa lumière, sa musique et son ambiance sonore, ses sons.
- **Sélection des mondes** (menu, tuile « Mondes ») : 5 grandes cartes illustrées et animées, cadenas et
  condition de déblocage, animation de déblocage, progression et étoiles ; ouvrir un monde affiche ses
  10 niveaux (numéro, étoiles, coche, cadenas, difficulté) et tout niveau débloqué se relance d'un toucher.
- **Introduction** de chaque monde et **transition** colorée entre deux mondes.
- **Déblocage** : un monde s'ouvre quand tous les niveaux disponibles du précédent sont terminés.
- 50 niveaux : 10 par monde, 5 paliers de difficulté (facile → extrême) ; l'Espace est le monde final.
- Depuis la partie : pause → « Choisir un niveau », victoire → « Niveaux » (ouvre les niveaux du monde en
  cours). Lien direct : `index.html?world=snow#mondes` ; `?unlock=all` ouvre tout pour tester ; l'ancienne
  adresse `worlds.html` y renvoie.
- **Collection** (menu) : tous les articles possédés, aperçu, Équiper / Déséquiper, badge « Équipé » ; le
  choix est enregistré.
- Format des niveaux et de tous les éléments : `src/game/levels/README.md`.

## La boutique (`shop.html`)

- 25 articles : 8 ballons, 6 effets de rebond, 6 traînées, 5 animations de panier ; raretés Commun, Rare,
  Épique, Légendaire ; le premier de chaque catégorie est offert.
- Pièces : premier panier d'un niveau 40 à 80 (selon le monde), chaque nouvelle étoile 25, 3 étoiles +20,
  rejouer 10, swish +5. Tout se débloque en jouant.
- Aperçu animé avant l'achat, achat, équipement ; les articles équipés apparaissent en jeu.
- Accès : tuile « Magasin » du menu, solde de pièces, bouton « Boutique » de la Collection.

## Tester

```bash
cd hoop-bounce
python3 -m http.server 8080
```

Ordinateur : <http://localhost:8080> (le menu ; `index.html#mondes` la sélection des mondes ; `play.html?world=snow&level=1`
ouvre directement un niveau). Téléphone Android : même Wi-Fi, `http://<IP-de-l-ordinateur>:8080`
dans Chrome, téléphone tenu à l'horizontale. `?debug` dans l'adresse (ou `²`) affiche les collisions et
la zone du vent.

## Architecture

```
hoop-bounce/
├── index.html, css/menu.css    menu principal
├── css/menu-views.css           pages Mondes et Collection du menu
├── worlds.html                 ancienne carte : renvoie vers index.html#mondes
├── play.html, css/style.css    partie (HUD, commandes, pause, victoire, tutoriel, intro de monde)
├── css/fonts.css, assets/fonts polices embarquées (licence OFL)
├── src/
│   ├── config.js               ★ TOUS les réglages (physique, déplacement, puissances, caméra…)
│   ├── main.js                 assemble la partie : niveaux, pause, victoire, progression
│   ├── menu/                   menu : décor, pages, sons, icônes, textes (FR/EN/ES), boutique
│   ├── shared/                 réglages du joueur et version, communs au menu et au jeu
│   ├── core/                   boucle à pas fixe (120 Hz), maths, bus d'événements
│   ├── physics/                balle, formes de collision, éléments mobiles
│   ├── game/                   contrôleur (dribble, puissance), éléments, éléments des mondes, pièges,
│   │                           panier, progression par monde, textes de jeu (FR/EN/ES)
│   │   ├── worlds.js           les 5 mondes
│   │   └── levels/             les niveaux de chaque monde = de simples données (+ README du format)
│   ├── render/                 rendu Canvas, thèmes et décors des mondes, caméra, déformations, particules
│   ├── audio/                  sons et musiques synthétisés (aucun fichier)
│   ├── worlds/                 carte des mondes (illustrations animées, déblocage)
│   ├── input/                  tactile deux pouces + clavier
│   └── platform/               vibrations (à remplacer par le plugin Capacitor)
├── tests/                      tests automatiques (Node)
└── tools/route-check.mjs       outil de level design : chaque passage est-il faisable ?
```

Ajouter un élément de gameplay : ses données dans le niveau, sa construction dans `game/level.js`,
sa logique dans `game/world-elements.js` et `game/game.js`, son dessin dans `render/world-draw.js`.

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
npm test                               # 316 tests : physique, dribble, éléments, pièges, mécaniques des mondes, boutique,
                                       # panier, progression, niveaux faisables, menu, publicités
node tools/route-check.mjs 400         # difficulté de chaque passage de chaque niveau
node tools/route-check.mjs 400 snow-3  # un seul niveau (identifiant ou numéro 1..50)
node tools/route-check.mjs 0           # vérification rapide : solutions expertes seulement
node tools/route-check.mjs 400 --save  # après une modification voulue d'un niveau
```

Les tests de mécanique utilisent un terrain d'essai (`tests/fixtures/test-yard.js`) indépendant des vrais
niveaux. Le test `routes.test.mjs` rejoue une solution par passage de chaque niveau (les tirs au panier et la
plateforme mobile ont aussi une solution « experte » scriptée) : si un réglage rend un passage impossible,
il échoue.
