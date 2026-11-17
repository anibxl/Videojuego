# 🏀 Hoop Bounce (titre provisoire)

Jeu mobile pour Android : on fait rebondir un ballon de basket jusqu'au panier, avec un seul doigt.

**Étape 1 (actuelle) :** physique, contrôles, caméra et une scène de test. Pas encore de niveaux.

## Tester le jeu

Il faut un petit serveur web local (les modules JavaScript ne se chargent pas en `file://`) :

```bash
cd hoop-bounce
python3 -m http.server 8080
```

- **Sur ordinateur :** ouvrir <http://localhost:8080>.
- **Sur téléphone Android :** même Wi-Fi que l'ordinateur, ouvrir `http://<IP-de-l-ordinateur>:8080` dans Chrome,
  puis le bouton plein écran (il bascule aussi en paysage).
- Ajouter `?debug` à l'adresse (ou le bouton ☰, ou la touche `²`) affiche les formes de collision,
  les normales de contact, la vitesse, la rotation et un arc de prévisualisation plus long.

## Contrôles

| Action | Tactile / souris | Clavier |
|---|---|---|
| Charger | maintenir le doigt | maintenir `←` / `→` (ou `Q`/`A`, `D`, `Espace`) |
| Sauter | relâcher | relâcher la touche |
| Direction | toucher à droite ou à gauche **du ballon** (on peut changer en glissant) | la flèche choisie |
| Replacer le ballon | bouton ↺ | `R` |
| Son | bouton 🔊 | `M` |

- Appui court = petit rebond, appui long = grand saut (pleine charge en 1 s).
- Pendant la charge, le ballon est « pressé » au sol : il arrête de rebondir pour partir d'une position stable.
- Relâcher en l'air n'est pas perdu : le saut part au prochain contact (jusqu'à 0,4 s après).
  On peut aussi encore sauter 0,1 s après avoir quitté un rebord.
- Même charge = même trajectoire : le contrôle s'apprend. L'arc pointillé montre le début de la trajectoire.

## Choix techniques

- **JavaScript (modules ES) + Canvas 2D**, sans dépendance ni étape de compilation.
  L'application Android sera produite en emballant ce dossier avec **Capacitor** (étape ultérieure) :
  vrai APK/AAB publiable sur le Google Play Store, plein écran, vibrations natives.
- **Moteur physique maison**, conçu pour un seul ballon contre un décor statique :
  - pas fixe de 1/120 s, indépendant de l'écran (60/90/120 Hz), rendu interpolé → fluidité parfaite ;
  - sous-pas adaptatifs : le ballon ne parcourt jamais plus de 20 % de son rayon par sous-pas → aucune traversée ;
  - rebond (restitution par matériau), frottement de Coulomb couplé à la rotation → le ballon roule,
    prend de l'effet, un tir avec effet arrière « mord » la planche ;
  - inertie d'une sphère creuse (vrai ballon de basket), gravité réaliste à l'échelle du ballon ;
  - entièrement déterministe : la prévisualisation simule exactement le vrai saut.
- **Sons synthétisés** en temps réel (Web Audio) : aucun fichier, chaque son dépend de la force de l'impact.

## Architecture

```
hoop-bounce/
├── index.html, css/style.css   page et interface (score, boutons)
├── src/
│   ├── config.js               ★ TOUS les réglages (physique, contrôles, caméra, sensations)
│   ├── main.js                 assemble tout (seul fichier qui connaît tout le monde)
│   ├── core/                   boucle à pas fixe, maths, bus d'événements
│   ├── physics/                moteur physique (ballon, formes de collision, monde) — sans navigateur
│   ├── game/                   logique de jeu (contrôleur, panier, filet, niveau) — sans navigateur
│   │   └── levels/             niveaux = simples fichiers de données
│   ├── render/                 rendu Canvas, caméra, déformations du ballon, particules
│   ├── audio/                  effets sonores
│   ├── input/                  tactile, souris, clavier
│   └── platform/               vibrations (à remplacer par le plugin Capacitor)
├── tests/                      tests automatiques (Node)
└── tools/shot-finder.mjs       outil de level design : quelles charges marquent depuis où
```

La logique (`physics/`, `game/`) ne dépend pas du navigateur : elle émet des événements
(`impact`, `launch`, `score`…) que la présentation (son, vibrations, effets, caméra) écoute.

### Régler les sensations

Tout est dans `src/config.js`, commenté. Exemples :

- rebond trop fort / trop mou → `materials.wood.restitution` ;
- sauts trop hauts / trop bas → `controls.maxJumpHeight`, `controls.minJumpHeight` ;
- charge trop rapide → `controls.chargeTime` ;
- angle des sauts → `controls.launchAngleDeg` ;
- caméra trop molle / trop nerveuse → `camera.smoothTimeX`, `camera.smoothTimeY` ;
- taille du ballon à l'écran → `camera.viewMin`.

## Tests

```bash
cd hoop-bounce
npm test                         # ou : node --test tests/*.test.mjs
node tools/shot-finder.mjs 15 19 # charges qui marquent depuis x = 15…19
```

Les tests vérifient notamment : hauteur de rebond conforme à la restitution, ballon qui se pose sans trembler,
aucune traversée même à 800 u/s, roulement sans glissement, déterminisme, petit/grand saut, buffer et coyote time,
panier compté (et refusé par en dessous), prévisualisation identique au vrai saut.
