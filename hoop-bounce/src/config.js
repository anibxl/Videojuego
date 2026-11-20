// Tous les réglages du jeu au même endroit.
// Unités : 1 unité ≈ 30 cm. La balle fait 0,4 u de rayon (≈ 12 cm, comme un vrai ballon).
// Repère physique : x vers la droite, y vers le HAUT.

export const CONFIG = Object.freeze({
  physics: Object.freeze({
    fixedDt: 1 / 120,          // pas de simulation fixe (s) — indépendant du framerate
    gravity: 34,               // u/s² — franche : aucune sensation de flottement
    maxFallSpeed: 28,          // vitesse de chute maximale (u/s)
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
    // Matériaux des mondes. grip : adhérence pour rouler/freiner (1 = normal) ;
    // rolling : résistance au roulement (1 = normal, la glace laisse filer le ballon).
    crate:      Object.freeze({ restitution: 0.12, friction: 0.6 }),
    ice:        Object.freeze({ restitution: 0.5,  friction: 0.1, grip: 0.22, rolling: 0.15 }),
    snow:       Object.freeze({ restitution: 0.48, friction: 0.8 }),
    rock:       Object.freeze({ restitution: 0.55, friction: 0.7 }),
    wood:       Object.freeze({ restitution: 0.5,  friction: 0.75 }),
    mushroom:   Object.freeze({ restitution: 0.3,  friction: 0.7 }),
    log:        Object.freeze({ restitution: 0.45, friction: 0.7 }),
    asteroid:   Object.freeze({ restitution: 0.6,  friction: 0.6 }),
  }),

  controls: Object.freeze({
    // Déplacement : de l'inertie, mais une réponse vive (aucune lourdeur)
    maxSpeed: 7.5,             // u/s
    groundAccel: 28,           // u/s² en appuyant sur ◀ / ▶ au sol (pleine vitesse en ~0,27 s)
    airAccel: 15,              // contrôle en l'air, plus faible (mais assez pour corriger une trajectoire)
    turnBoost: 1.9,            // freinage plus franc quand on appuie dans l'autre sens
    groundBrake: 3.5,          // sans appui au sol, la balle roule encore un peu
    airBrake: 0,               // en l'air, l'élan est conservé
    groundGrace: 0.06,

    // Rebond : hauteur (u) pour chaque niveau de puissance (le centre du ballon monte de…)
    bounceHeights: Object.freeze([1.4, 2.2, 3.1, 4.1, 5.2]),
    coyoteTime: 0.12,          // on peut encore rebondir juste après avoir quitté le sol
    bounceCooldown: 0.06,
    // Dribble : en l'air, un appui renvoie le ballon vers le sol, et il rebondit au contact
    slamSpeed: 15,             // u/s vers le bas
    // La puissance redescend quand le ballon reste au sol
    restDelay: 0.55,           // s au sol avant de commencer à perdre de la puissance
    restStep: 0.32,            // s pour perdre un niveau ensuite
    restHopGrace: 0.15,        // les petits rebonds naturels comptent comme « au sol »

    trampolineVelocity: 20,    // ≈ 5,9 u de haut
  }),

  fans: Object.freeze({
    verticalDrag: 1.6,         // amortit la balle dans le souffle : elle flotte au lieu d'osciller
    horizontalDrag: 1.8,       // freine un peu la balle dans le souffle : elle se laisse « attraper »
  }),

  // ─── Éléments des mondes ───────────────────────────────────────────────────
  crate: Object.freeze({
    pushSpeed: 2.6,            // vitesse de la caisse poussée (u/s) : lourde, mais pas pénible
    pushAccel: 9,
    friction: 16,              // décélération au sol quand on ne pousse plus (u/s²)
    impactTransfer: 0.22,      // part de la vitesse d'un choc transmise à la caisse
    maxFall: 24,
  }),
  icicle: Object.freeze({
    trigger: 1.4,              // distance horizontale qui déclenche la chute (u)
    shakeTime: 0.45,           // tremblement d'avertissement (s)
    regrowDelay: 2.6,
    growTime: 0.7,
  }),
  crumble: Object.freeze({
    delay: 0.5,                // temps entre le contact et l'effondrement (s)
    respawn: 2.8,
  }),
  geyser: Object.freeze({
    period: 3.2,
    onTime: 1.1,
    warnTime: 0.75,
  }),
  rockfall: Object.freeze({
    period: 2.8,
    warnTime: 0.85,
    gravity: 26,
  }),
  vine: Object.freeze({
    grabReach: 0.22,
    minRope: 1.2,
    regrabDelay: 0.45,
    releaseBoost: 6.5,         // petit saut en lâchant la liane (u/s)
    releaseCarry: 1.08,
  }),

  // ─── Pièges de l'étape 9 ────────────────────────────────────────────────────
  faller: Object.freeze({
    delay: 0.4,                // tremblement avant la chute (s)
    respawn: 3,
  }),
  blinker: Object.freeze({
    period: 3,
    onTime: 1.8,
    warnTime: 0.6,             // clignotement avant de disparaître
  }),
  laser: Object.freeze({
    period: 3,
    onTime: 1.2,
    warnTime: 0.7,             // grésillement avant de s'allumer
  }),
  cannon: Object.freeze({
    speed: 7,                  // u/s : on peut toujours esquiver en sautant
    period: 2.6,
    warnTime: 0.5,
  }),

  // ─── Pièges de l'étape 10 ───────────────────────────────────────────────────
  crusher: Object.freeze({
    period: 3,
    warnTime: 0.5,             // tremblement avant de s'écraser
    slamTime: 0.14,
    holdTime: 0.35,
    riseTime: 0.9,
  }),
  boulder: Object.freeze({
    speed: 6,
    period: 3.2,
    warnTime: 0.7,             // grondement avant le départ
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

  // Déformations visuelles du ballon (aucun effet sur la physique). Étape 18 : ballon plus élastique —
  // écrasement plus marqué à l'impact, ressort moins amorti (petite oscillation de caoutchouc).
  feel: Object.freeze({
    squashPerSpeed: 0.015,
    squashMax: 0.34,
    squashStiffness: 540,
    squashDamping: 19,
    stretchPerSpeed: 0.0055,
    stretchMax: 0.14,
    bounceSquash: 0.28,
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
