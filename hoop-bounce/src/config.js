// Tous les réglages du jeu au même endroit.
// Unités : 1 unité ≈ 30 cm. La balle fait 0,4 u de rayon (≈ 12 cm, comme un vrai ballon).
// Repère physique : x vers la droite, y vers le HAUT.

export const CONFIG = Object.freeze({
  physics: Object.freeze({
    fixedDt: 1 / 120,          // pas de simulation fixe (s) — indépendant du framerate
    gravity: 30,               // u/s²
    maxFallSpeed: 26,          // vitesse de chute maximale (u/s)
    maxSubstepTravel: 0.2,     // déplacement max par sous-pas, en fraction du rayon (anti-traversée)
    maxSubsteps: 16,
    solverIterations: 3,
    restVelocity: 1.1,         // vitesse normale (u/s) sous laquelle on ne rebondit plus
    airDrag: 0.02,
    angularDrag: 0.12,
    rollingResistance: 0.12,   // la balle garde son élan longtemps
    groundNormalMinY: 0.5,
  }),

  ball: Object.freeze({
    radius: 0.4,
    inertiaFactor: 2 / 3,      // sphère creuse (ballon de basket) : I = 2/3 · m · r²
  }),

  // Rebond naturel (restitution) et frottement de la balle contre chaque matériau.
  materials: Object.freeze({
    ground:     Object.freeze({ restitution: 0.6,  friction: 0.7 }),
    platform:   Object.freeze({ restitution: 0.58, friction: 0.7 }),
    wall:       Object.freeze({ restitution: 0.5,  friction: 0.45 }),
    plank:      Object.freeze({ restitution: 0.55, friction: 0.7 }),
    trampoline: Object.freeze({ restitution: 0.3,  friction: 0.7 }),
    door:       Object.freeze({ restitution: 0.5,  friction: 0.5 }),
    rim:        Object.freeze({ restitution: 0.55, friction: 0.35 }),
    backboard:  Object.freeze({ restitution: 0.6,  friction: 0.3 }),
  }),

  controls: Object.freeze({
    // Déplacement : la balle a de l'inertie (elle accélère et ralentit progressivement)
    maxSpeed: 7.5,             // u/s
    groundAccel: 20,           // u/s² en appuyant sur ◀ / ▶ au sol
    airAccel: 10,              // contrôle en l'air, plus faible
    turnBoost: 1.9,            // freinage plus franc quand on appuie dans l'autre sens
    groundBrake: 2.5,          // sans appui au sol, la balle roule longtemps
    airBrake: 0,               // en l'air, l'élan est conservé
    groundGrace: 0.06,

    // Rebond : hauteur (u) pour chaque niveau de puissance
    bounceHeights: Object.freeze([1.5, 2.3, 3.2, 4.2, 5.3]),
    comboDecayDelay: 1.6,      // s sans rebondir avant que la puissance redescende
    comboDecayStep: 0.4,       // s pour perdre un niveau ensuite
    coyoteTime: 0.16,          // on peut encore rebondir juste après avoir quitté le sol
    bufferTime: 0.45,          // un appui en l'air déclenche le rebond au prochain contact
    bounceCooldown: 0.1,

    trampolineVelocity: 19,    // ≈ 6 u de haut
  }),

  fans: Object.freeze({
    verticalDrag: 1.6,         // amortit la balle dans le souffle : elle flotte au lieu d'osciller
    horizontalDrag: 1.8,       // freine un peu la balle dans le souffle : elle se laisse « attraper »
  }),

  camera: Object.freeze({
    viewHeight: 10.5,          // hauteur visible (u)
    minViewWidth: 13,          // largeur visible minimale (écrans peu larges)
    smoothTimeX: 0.22,
    smoothTimeY: 0.35,
    lookAhead: 0.32,           // anticipation dans le sens du mouvement (s de vitesse)
    maxLookAhead: 3.2,
    lookAheadSmooth: 0.6,
    verticalDeadZone: 0.25,
    focusOffsetY: 2.0,
    groundLift: 2.0,           // centre de l'image au-dessus de la dernière surface touchée :
                               // le sol reste visible au-dessus des boutons tactiles
    followAbove: 1.7,          // si la balle monte haut, on la suit (elle reste 1,7 u au-dessus du centre)
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
    bounceSquash: 0.24,
    impactShakeSpeed: 18,
    deathDelay: 0.8,
    winSlowMo: 0.3,
  }),

  hoop: Object.freeze({
    rimRadius: 0.06,
    innerWidthFactor: 1.9,     // diamètre intérieur = 1,9 × diamètre de la balle (comme en vrai)
    backboardHeight: 2.2,
    backboardBelowRim: 0.35,
    backboardThickness: 0.12,
    bracketLength: 0.25,
    netDepth: 1.0,
    netColumns: 6,
    netRows: 5,
  }),

  pickups: Object.freeze({
    starRadius: 0.45,
    checkpointRadius: 0.9,
    hazardForgiveness: 0.12,   // les pièges sont un peu plus petits que leur dessin : c'est juste
  }),

  world: Object.freeze({
    fallLimit: -5,             // sous cette hauteur (chute dans le vide), on réapparaît
  }),
});
