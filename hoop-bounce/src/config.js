// Tous les réglages du jeu au même endroit.
// Unités : 1 unité ≈ 30 cm. Le ballon fait 0,4 u de rayon (≈ 12 cm, comme un vrai ballon),
// donc la gravité « réaliste » vaut 9,81 / 0,3 ≈ 32,7 u/s².
// Repère physique : x vers la droite, y vers le HAUT.

export const CONFIG = Object.freeze({
  physics: Object.freeze({
    fixedDt: 1 / 120,          // pas de simulation fixe (s) — indépendant du framerate
    gravity: 32.7,             // u/s²
    maxSubstepTravel: 0.2,     // déplacement max par sous-pas, en fraction du rayon (anti-traversée)
    maxSubsteps: 16,
    solverIterations: 3,       // passes de résolution des contacts par sous-pas
    restVelocity: 1.1,         // vitesse normale (u/s) sous laquelle on ne rebondit plus
    airDrag: 0.04,             // frottement de l'air linéaire (1/s), très faible
    angularDrag: 0.15,         // amortissement de la rotation en l'air (1/s)
    rollingResistance: 0.35,   // résistance au roulement au sol (1/s)
    groundNormalMinY: 0.5,     // un contact dont la normale a y >= ceci compte comme « sol »
  }),

  ball: Object.freeze({
    radius: 0.4,
    // Inertie d'une sphère creuse (ballon de basket) : I = 2/3 · m · r²
    inertiaFactor: 2 / 3,
  }),

  // Coefficient de restitution (rebond) et de frottement du ballon contre chaque matériau.
  materials: Object.freeze({
    wood:      Object.freeze({ restitution: 0.80, friction: 0.60 }), // parquet
    platform:  Object.freeze({ restitution: 0.72, friction: 0.70 }),
    wall:      Object.freeze({ restitution: 0.70, friction: 0.50 }),
    rubber:    Object.freeze({ restitution: 0.92, friction: 0.80 }),
    rim:       Object.freeze({ restitution: 0.55, friction: 0.35 }), // cercle métallique
    backboard: Object.freeze({ restitution: 0.65, friction: 0.30 }), // planche en verre
  }),

  controls: Object.freeze({
    chargeTime: 1.0,           // temps (s) pour atteindre la charge maximale
    chargeCurve: 1.35,         // > 1 : la charge monte vite au début puis ralentit
    minJumpHeight: 0.45,       // hauteur (u) d'un appui très court
    maxJumpHeight: 7.0,        // hauteur (u) à pleine charge
    launchAngleDeg: 64,        // angle du saut par rapport à l'horizontale
    backspin: 5,               // rotation arrière donnée au tir (rad/s)
    coyoteTime: 0.1,           // on peut encore sauter juste après avoir quitté le sol (s)
    launchBuffer: 0.4,         // un relâchement en l'air déclenche le saut au prochain contact (s)
    launchCooldown: 0.1,       // délai minimal entre deux sauts (s)
    chargeBounceScale: 0.3,    // pendant la charge, le ballon « s'écrase » : rebonds amortis
  }),

  camera: Object.freeze({
    viewMin: 9,                // le plus petit côté de l'écran montre 9 u
    smoothTimeX: 0.22,         // temps de lissage horizontal (s)
    smoothTimeY: 0.32,         // temps de lissage vertical (s)
    lookAhead: 0.22,           // anticipation : décale la caméra dans le sens du mouvement (s)
    maxLookAhead: 2.5,         // u
    lookAheadSmooth: 0.5,      // s
    verticalDeadZone: 0.9,     // u — les petits rebonds ne font pas bouger la caméra
    focusOffsetY: 1.6,         // la caméra regarde un peu au-dessus du ballon
    chargeZoom: 0.035,         // léger zoom avant pendant la charge
    shakeMax: 0.12,            // amplitude max des secousses (u)
    shakeDecay: 2.5,           // décroissance des secousses (1/s)
  }),

  feel: Object.freeze({
    squashPerSpeed: 0.012,     // écrasement visuel par u/s d'impact
    squashMax: 0.32,
    squashStiffness: 520,      // ressort de l'écrasement
    squashDamping: 26,
    stretchPerSpeed: 0.0045,   // étirement en vol
    stretchMax: 0.12,
    chargeSquash: 0.2,         // écrasement à pleine charge (au sol)
    impactShakeSpeed: 16,      // u/s au-delà desquels l'impact secoue la caméra
    previewTime: 0.5,          // durée de l'arc de prévisualisation (s)
    previewTimeDebug: 2.5,
  }),

  hoop: Object.freeze({
    rimRadius: 0.06,           // épaisseur du cercle (collision)
    innerWidthFactor: 1.9,     // diamètre intérieur = 1,9 × diamètre du ballon (comme en vrai)
    backboardHeight: 2.2,
    backboardBelowRim: 0.35,
    backboardThickness: 0.12,
    bracketLength: 0.25,
    netDepth: 1.0,
    netColumns: 6,
    netRows: 5,
  }),

  world: Object.freeze({
    fallLimit: -12,            // sous cette hauteur, le ballon réapparaît
  }),
});
