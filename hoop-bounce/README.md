# 🏀 Hoop Bounce (titre provisoire)

Jeu de plateforme 2D pour Android, **à l'horizontale** : on fait rouler et rebondir une balle de basket
jusqu'au panier.

**Étape 3 (actuelle) :** nouveau gameplay et un premier niveau, « Premier dribble ».

## Les commandes

| | Tactile (deux pouces) | Clavier |
|---|---|---|
| Rouler | ◀ ▶ en bas à gauche (on peut glisser d'un bouton à l'autre) | `←` `→` (ou `Q`/`A`, `D`) |
| Rebondir | bouton REBOND en bas à droite (toute la moitié droite de l'écran) | `Espace`, `↑`, `Z`/`W` |
| Recommencer | bouton ↺ | `R` |
| Son | bouton 🔊 | `M` |

Les zones tactiles sont bien plus grandes que les boutons dessinés : moitié gauche = direction, moitié droite
= rebond. On peut diriger et rebondir en même temps.

## Les règles du rebond

- Une balle ne rebondit que contre une surface : un appui fait rebondir **tout de suite si la balle touche
  le sol**. En l'air, l'appui est **mémorisé** et le rebond part au prochain contact. On joue en rythme,
  comme un dribble.
- **Chaque rebond enchaîné augmente la puissance** (5 niveaux : 1,5 · 2,3 · 3,2 · 4,2 · 5,3 u de haut).
- **Si l'on attend ~1,6 s**, la puissance redescend progressivement (un niveau toutes les 0,4 s).
- La puissance s'affiche au-dessus de la balle (barres) et autour du bouton REBOND (anneau).
  Le dernier cran clignote juste avant de redescendre. Couleurs : blanc, puis ambre au niveau 4, or au niveau 5.

La balle a une vraie inertie : elle accélère progressivement, roule longtemps une fois relâchée, garde son élan
en l'air (contrôle réduit) et roule sans glisser.

## Le niveau 1 « Premier dribble »

Un parcours horizontal (`src/game/levels/level-01.js`). Chaque section présente un élément dans un endroit sûr,
puis le met à l'épreuve :

| Section | Élément | Étoile |
|---|---|---|
| A | rouler, rebondir (une marche) | au-dessus de la marche |
| B | enchaîner les rebonds pour franchir un mur (puissance 3) | |
| C | **trampoline** au-dessus d'un champ de **pics** | au sommet du saut |
| D | **plateforme mobile** au-dessus du vide | |
| E | **ventilateur** jusqu'à une corniche, **interrupteur** en hauteur | au-dessus de l'interrupteur |
| F | la **porte** ne s'ouvre que si l'interrupteur a été activé | |
| G | **téléporteur** pour franchir un grand mur | |
| H | le terrain : **marquer le panier** (puissance 4 ou 5, viser en dirigeant pendant la descente) | |

5 drapeaux servent de points de contrôle. Les pics et le vide font réapparaître au dernier drapeau atteint.
À l'arrivée : temps, chutes, étoiles et record.

## Tester

```bash
cd hoop-bounce
python3 -m http.server 8080
```

Ordinateur : <http://localhost:8080>. Téléphone Android : même Wi-Fi, `http://<IP-de-l-ordinateur>:8080`
dans Chrome, téléphone tenu à l'horizontale. `?debug` dans l'adresse (ou `²`) affiche les collisions et
la zone du vent.

## Architecture

```
hoop-bounce/
├── index.html, css/style.css   page et interface (HUD, boutons tactiles, écran de fin)
├── src/
│   ├── config.js               ★ TOUS les réglages (physique, déplacement, puissances, caméra…)
│   ├── main.js                 assemble tout (seul fichier qui connaît tout le monde)
│   ├── core/                   boucle à pas fixe (120 Hz), maths, bus d'événements
│   ├── physics/                balle, formes de collision, éléments mobiles
│   ├── game/                   contrôleur, éléments (porte, ventilateur, téléporteur), pièges, panier
│   │   └── levels/level-01.js  le niveau = un simple fichier de données
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
- délai avant que la puissance redescende → `controls.comboDecayDelay`, `comboDecayStep` ;
- inertie → `controls.groundAccel`, `airAccel`, `groundBrake`, `physics.rollingResistance` ;
- rebond naturel de la balle → `materials.*.restitution` ;
- trampoline → `controls.trampolineVelocity` ; ventilateur → `strength` dans le niveau, `fans.*` ;
- caméra → `camera.*`.

## Tests

```bash
cd hoop-bounce
npm test                               # 39 tests : physique, commandes, puissance, éléments, niveau faisable
node tools/route-check.mjs 500         # difficulté de chaque passage
node tools/route-check.mjs 500 --save  # après une modification voulue du niveau
```

Le test `routes.test.mjs` rejoue une solution par passage du niveau (les passages techniques, comme la
plateforme mobile ou le tir au panier, ont une solution « experte » scriptée) : si un réglage rend un
passage impossible, il échoue.
