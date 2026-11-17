# 🏀 Hoop Bounce (titre provisoire)

Jeu mobile Android, **en mode portrait, jouable d'une seule main** : on fait grimper un ballon de basket
le long d'une tour jusqu'au panier.

**Étape 2 (actuelle) :** nouveau gameplay et un niveau de démonstration, « La Tour ».

## Le jeu en 5 secondes

- **Glisser** le pouce à gauche ou à droite → le ballon roule / se dirige.
- **Toucher** l'écran → le ballon rebondit.
- La **jauge** au-dessus du ballon (3 crans) : chaque rebond en coûte un. Elle se recharge
  progressivement quand le ballon est posé. Depuis le sol : un saut + deux rebonds en l'air.
- But : **marquer dans le panier** en haut de la tour, en ramassant les **3 étoiles** et en évitant les
  **piques** et la **scie**.

## Tester

```bash
cd hoop-bounce
python3 -m http.server 8080
```

- Ordinateur : <http://localhost:8080> (fenêtre étroite pour simuler un téléphone).
- Téléphone Android : même Wi-Fi, `http://<IP-de-l-ordinateur>:8080` dans Chrome.
- `?debug` dans l'adresse (ou la touche `²`) : formes de collision, zones mortelles, vitesse, jauge.

| Action | Tactile | Clavier |
|---|---|---|
| Diriger | garder le doigt et glisser ← → | `←` `→` (ou `Q`/`A`, `D`) |
| Rebondir | toucher (un 2ᵉ doigt marche aussi) | `Espace`, `↑`, `Z`/`W` |
| Recommencer | bouton ↺ | `R` |
| Son | bouton 🔊 | `M` |

## Détails de conception

**Contrôles à une main.** Le doigt posé n'importe où devient un joystick invisible : glisser de ~34 px
donne la pleine vitesse, et le centre suit le doigt quand on dépasse, donc un demi-tour est instantané.
Chaque nouveau contact fait rebondir, **au moment du toucher** (pas au relâcher) : aucune latence.
Un repère discret s'affiche au-dessus du pouce.

**Sensations.**
- Accélération forte, demi-tour encore plus vif. En l'air on garde son élan, au sol on s'arrête net.
- Au sol, le ballon roule sans glisser.
- Un rebond donne toujours la même poussée. Taper au **sommet** du saut rapporte le plus de hauteur
  (taper trop tôt en gaspille) : simple à prendre en main, avec de la marge pour progresser.
- Chaque rebond en l'air monte d'un ton, avec une onde de choc et une petite vibration.
- Le ballon s'écrase et s'étire, le filet bouge, les pièges sont un peu plus petits que leur dessin
  (un frôlement ne tue jamais).

**Le niveau « La Tour »** (`src/game/levels/demo.js`). Chaque salle apprend une chose, puis la combine :
1. rouler et rebondir ;
2. rebonds en l'air et gestion de la jauge ;
3. piques au sol et au plafond (on apprend à ne pas trop rebondir) ;
4. tremplin, plateforme mobile, scie ;
5. ascension finale vers le panier, sous un plafond piégé.

Il y a 4 points de contrôle (drapeaux) : après une erreur, on repart du dernier atteint.
Le temps, le nombre de chutes et les étoiles sont affichés à l'arrivée, avec le record.

## Architecture

```
hoop-bounce/
├── index.html, css/style.css   page et interface (étoiles, chrono, boutons, écran de fin)
├── src/
│   ├── config.js               ★ TOUS les réglages (physique, contrôles, jauge, caméra, sensations)
│   ├── main.js                 assemble tout (seul fichier qui connaît tout le monde)
│   ├── core/                   boucle à pas fixe, maths, bus d'événements
│   ├── physics/                ballon, formes de collision (dont planches traversables), éléments mobiles
│   ├── game/                   contrôleur, jauge, pièges, panier, filet, construction du niveau
│   │   └── levels/demo.js      le niveau = un simple fichier de données
│   ├── render/                 rendu Canvas, décor, caméra, déformations, particules
│   ├── audio/                  sons synthétisés (aucun fichier)
│   ├── input/                  tactile une main + clavier
│   └── platform/               vibrations (à remplacer par le plugin Capacitor)
├── tests/                      tests automatiques (Node)
└── tools/route-check.mjs       outil de level design : chaque passage est-il faisable ? à quel point ?
```

La logique (`physics/`, `game/`) ne dépend pas du navigateur. Elle émet des événements
(`bounce`, `star`, `death`, `win`…) que la présentation (son, vibrations, effets, caméra) écoute.

### Régler les sensations (`src/config.js`)

- hauteur d'un rebond → `controls.bounceVelocity` ;
- nombre de rebonds dans la jauge → `controls.gaugeSegments` ; vitesse de recharge → `controls.rechargeRate` ;
- vitesse et nervosité du déplacement → `controls.maxSpeed`, `groundAccel`, `airAccel`, `airBrake` ;
- sensibilité du glissement → `input.dragFullPx` ;
- rebond naturel du ballon → `materials.*.restitution` ;
- caméra → `camera.*`.

## Tests

```bash
cd hoop-bounce
npm test                              # 47 tests : physique, contrôles, jauge, règles, niveau faisable
node tools/route-check.mjs 600        # difficulté de chaque passage du niveau
node tools/route-check.mjs 600 --save # après une modif voulue du niveau : enregistre de nouvelles solutions
```

Le test `routes.test.mjs` rejoue une solution enregistrée pour chacun des 20 passages du niveau :
si un réglage rend un passage impossible, il échoue.
