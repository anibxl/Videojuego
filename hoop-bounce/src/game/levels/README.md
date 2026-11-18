# Format des niveaux

Un niveau est un simple objet de données. Les niveaux sont rangés par monde (`city.js`, `snow.js`,
`volcano.js`, `forest.js`, `space.js`) ; la liste des mondes et leurs réglages est dans `../worlds.js`.

Repère : x vers la droite, y vers le haut, sol à y = 0. Le ballon fait 0,4 u de rayon.
Hauteur d'un rebond (le centre du ballon monte de) : 1,4 · 2,2 · 3,1 · 4,1 · 5,2 u selon la puissance
(× `jumpScale` dans le monde Espace). Pour franchir un obstacle de hauteur H depuis le sol, il faut un rebond
d'au moins H (+ une marge).

## Champs communs

| Champ | Forme | Rôle |
|---|---|---|
| `id` | texte unique | sert à la progression (ne jamais le changer une fois publié) |
| `number` | entier | numéro dans le monde (1..10) |
| `nameKey` | clé de traduction | nom affiché (`src/game/i18n.js`) |
| `bounds` | `{ minX, maxX, minY, maxY }` | limites de la caméra (`bounds(fin, hautMax)` dans `common.js`) |
| `spawn` | `{ x, y }` | départ (y = surface sous le ballon) |
| `stars` | 3 × `{ x, y }` | étoiles facultatives |
| `hoop` | `{ x, y, facing, mount, floorY }` | x = avant du cercle, y = hauteur du cercle, `mount` : `pole` ou `wall` |
| `hints` | `{ x, y, key, size }` | texte peint sur le décor |

Réglages de monde (ajoutés automatiquement par `worlds.js`) : `theme`, `gravityScale`, `jumpScale`.

## Éléments de base (tous les mondes)

| Champ | Forme | Notes |
|---|---|---|
| `solids` | `{ x, y, w, h, style }` ou `{ points: [{x,y}…], style }` | style : `ground`, `wall`, `block`, `snow`, `ice` (glisse), `rock`, `wood` ; `material` pour forcer un matériau ; `points` = polygone (rampes) |
| `planks` | `{ x1, x2, y, style }` | planche traversable par en dessous (`style: 'wood'`) |
| `movers` | `{ x, y, w, h, path, style }` | `path = { dx, dy, period, phase }` ; style : (défaut), `stone` (ascenseur de pierre), `float` (plateforme flottante) |
| `trampolines` | `{ x, y, w }` | |
| `spikes` | `{ x, y, w, dir }` | `dir` : `up`, `down` |
| `fans` | `{ x, y, w, h, strength }` | souffle vers le haut |
| `switches` / `doors` | `{ x, y, w, target }` / `{ id, x, y, w, h, open:{dx,dy} }` | |
| `teleporters` | `{ a:{x,y}, b:{x,y}, r, twoWay }` | `twoWay: true` = portails à double sens |
| `checkpoints` | `{ x, y }` | |

## Éléments des mondes

| Monde | Champ | Forme | Comportement |
|---|---|---|---|
| Ville | `crates` | `{ x, y, w, h }` | caisse poussée par le ballon, bute contre les blocs rectangulaires, sert de marche ou de pont |
| Neige | `winds` | `{ x, y, w, h, force, gust }` | vent horizontal en rafales (`force` en u/s², signe = sens) |
| Neige | `icicles` | `{ x, y, len, trigger }` | stalactite accrochée en (x, y) ; tombe quand le ballon passe dessous ; repousse |
| Volcan | `lava` | `{ x, y, w }` | surface de lave mortelle à la hauteur y |
| Volcan | `crumbles` | `{ x, y, w, h, delay, respawn }` | s'effondre `delay` s après le contact, revient après `respawn` s |
| Volcan | `geysers` | `{ x, y, w, h, period, on, phase }` | jet de feu périodique, fumée d'avertissement |
| Volcan | `rockfalls` | `{ x, y, size, period, phase }` | rocher qui tombe de y, toujours au même endroit, ombre d'avertissement |
| Forêt | `water` | `{ x, y, w }` | rivière (mortelle) |
| Forêt | `vines` | `{ x, y, len }` | liane accrochée en (x, y) ; on l'attrape en l'air, ◀ ▶ pour se balancer, REBOND pour lâcher |
| Forêt | `mushrooms` | `{ x, y, w, height, base }` | chapeau en y ; propulse à `height` u |
| Forêt | `logs` | `{ x, y, r, path }` | tronc rond qui roule sur un trajet |
| Forêt | `branches` | `{ x1, x2, y, path }` | branche traversable qui bouge |
| Espace | `asteroids` | `{ x, y, r, path, spin }` | astéroïde rond, solide, mobile |
| Espace | `gravityZones` | `{ x, y, w, h }` | gravité inversée tant que le centre du ballon est dans la zone |

Après une modification voulue d'un niveau : `node tools/route-check.mjs 400 --save` (et ajouter ses
passages dans `tools/route-check.mjs` pour un nouveau niveau).
