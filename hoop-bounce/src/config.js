// Tous les réglages du jeu au même endroit.
// Unités : 1 unité ≈ 30 cm. Le ballon fait 0,4 u de rayon (≈ 12 cm, comme un vrai ballon).
// Repère physique : x vers la droite, y vers le HAUT.

export const CONFIG = Object.freeze({
  physics: Object.freeze({
    fixedDt: 1 / 120,          // pas de simulation fixe (s) — indépendant du framerate
    gravity: 30,               // u/s²
    maxFallSpeed: 24,          // vitesse de chute maximale (u/s) : la chute reste lisible
    maxSubstepTravel: 0.2,     // déplacement max par sous-pas, en fraction du rayon (anti-traversée)
    maxSubsteps: 16,
    solverIterations: 3,       // passes de résolution des contacts par sous-pas
    restVelocity: 1.1,         // vitesse normale (u/s) sous laquelle on ne rebondit plus
    airDrag: 0.02,             // frottement de l'air (1/s), très faible
    angularDrag: 0.15,         // amortissement de la rotation en l'air (1/s)
    rollingResistance: 0.35,   // résistance au roulement au sol (1/s)
    groundNormalMinY: 0.5,     // un contact dont la normale a y >= ceci compte comme « sol »
  }),

  ball: Object.freeze({
    radius: 0.4,
    inertiaFactor: 2 / 3,      // sphère creuse (ballon de basket) : I = 2/3 · m · r²
  }),

  // Rebond (restitution) et frottement du ballon contre chaque matériau.
  materials: Object.freeze({
    wood:      Object.freeze({ restitution: 0.55, friction: 0.6 }),
    platform:  Object.freeze({ restitution: 0.5,  friction: 0.7 }),
    plank:     Object.freeze({ restitution: 0.5,  friction: 0.7 }),
    wall:      Object.freeze({ restitution: 0.45, friction: 0.4 }),
    pad:       Object.freeze({ restitution: 0.3,  friction: 0.7 }),
    rim:       Object.freeze({ restitution: 0.55, friction: 0.35 }),
    backboard: Object.freeze({ restitution: 0.6,  friction: 0.3 }),
  }),

  controls: Object.freeze({
    // Déplacement horizontal
    maxSpeed: 6.5,             // u/s
    groundAccel: 48,           // u/s² quand on dirige au sol
    airAccel: 34,              // u/s² quand on dirige en l'air
    groundBrake: 26,           // freinage au sol quand on lâche la direction
    airBrake: 5,               // en l'air, l'élan est conservé
    turnBoost: 1.6,            // accélération supplémentaire quand on change de sens
    groundGrace: 0.06,         // s : marge pendant laquelle on est encore « au sol »

    // Rebond
    bounceVelocity: 13,        // vitesse verticale donnée par un rebond (≈ 2,8 u de haut)
    bounceCarry: 0.25,         // si l'on monte déjà, on ajoute 25 % de la poussée
    padVelocity: 20,           // tremplin (≈ 6,7 u de haut)

    // Jauge
    gaugeSegments: 3,          // nombre de rebonds quand la jauge est pleine
    rechargeRate: 1.7,         // jauge par seconde au sol (un cran ≈ 0,2 s)
    rechargeGrace: 0.08,       // s : les petits rebonds naturels au sol rechargent aussi
  }),

  input: Object.freeze({
    dragFullPx: 34,            // glissement (px) pour atteindre la vitesse maximale
    dragDeadPx: 4,             // zone morte pour qu'un simple toucher ne fasse pas bouger
  }),

  camera: Object.freeze({
    viewWidth: 9.8,            // largeur visible (u) : tout le niveau en largeur
    minViewHeight: 14,         // hauteur visible minimale (écrans larges)
    smoothTimeY: 0.28,         // lissage vertical (s)
    smoothTimeX: 0.3,
    lookAheadUp: 0.11,         // anticipation verticale (s de vitesse)
    lookAheadMaxUp: 2.6,
    lookAheadMaxDown: 1.6,
    lookAheadSmooth: 0.35,
    verticalDeadZone: 0.8,     // les petits rebonds ne bougent pas la caméra
    focusOffsetY: 2.4,         // le ballon est un peu sous le centre : on voit où l'on monte
    shakeMax: 0.16,
    shakeDecay: 2.6,
  }),

  feel: Object.freeze({
    squashPerSpeed: 0.013,
    squashMax: 0.32,
    squashStiffness: 520,
    squashDamping: 24,
    stretchPerSpeed: 0.005,
    stretchMax: 0.13,
    bounceSquash: 0.26,        // écrasement au moment d'un rebond
    impactShakeSpeed: 17,
    deathDelay: 0.75,          // s entre l'explosion et la réapparition
    winSlowMo: 0.3,            // ralenti au moment du panier final
  }),

  hoop: Object.freeze({
    rimRadius: 0.06,
    innerWidthFactor: 1.9,     // diamètre intérieur = 1,9 × diamètre du ballon (comme en vrai)
    backboardHeight: 2.2,
    backboardBelowRim: 0.35,
    backboardThickness: 0.12,
    bracketLength: 0.25,
    netDepth: 1.0,
    netColumns: 6,
    netRows: 5,
  }),

  pickups: Object.freeze({
    starRadius: 0.45,          // zone de ramassage (en plus du rayon du ballon)
    checkpointRadius: 0.9,
    hazardForgiveness: 0.12,   // les pièges sont un peu plus petits que leur dessin : c'est juste
  }),
});
