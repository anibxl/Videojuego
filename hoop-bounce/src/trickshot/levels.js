// Les 50 cartes du mode TRICKSHOT (aucune n'est reprise du mode principal).
//
// Chaque carte tient sur un écran (24 × 13,5 u, sol à y = 1) et repose sur UNE idée. Le ballon part de
// `start` (centre du ballon posé). Toutes les cartes ont au moins une solution en un seul tir
// (3 étoiles possibles), vérifiée par tools/trickshot-check.mjs et rejouée par tests/trickshot.test.mjs.
//
// Champs : éléments du moteur (solids, trampolines, fans, movers, switches, doors, teleporters, lasers,
// saws, crumbles, blinkers, lava, gravityZones, magnets, cannons, boulders…) + propres au mode :
//   breakables  caisses cassables { x, y, w, h, strength (vitesse d'impact minimale) }
//   fans[].target  ventilateur éteint, allumé par le bouton de même cible
//   gravityScale   gravité du niveau (gravité réduite)
//   diff        'easy' | 'hard' | 'very' | 'impossible'
//   intro       mécaniques découvertes dans ce niveau (badge « Nouveau ! »)
//   name, hint  textes FR / EN / ES

const W = 24;
const H = 13.5;
const F = 1; // dessus du sol
const R = 0.4;

const tee = (x, y = F) => ({ x, y: y + R });
const ground = (x0 = -1, x1 = W + 1, style = 'ground') => ({ x: x0, y: -1, w: x1 - x0, h: F + 1, style });
const wallL = () => ({ x: -1, y: -1, w: 1, h: H + 2, style: 'wall' });
const wallR = () => ({ x: W, y: -1, w: 1, h: H + 2, style: 'wall' });
const ceil = (x0 = -1, x1 = W + 1) => ({ x: x0, y: H, w: x1 - x0, h: 1, style: 'wall' });
const frame = (floor = [ground()]) => [wallL(), wallR(), ceil(), ...floor];
const block = (x, y, w, h, style = 'block') => ({ x, y, w, h, style });
const wall = (x, y, w, h) => ({ x, y, w, h, style: 'wall' });
const bumper = (x, y, w, h) => ({ x, y, w, h, style: 'bumper', material: 'bumper' });
const ice = (x, y, w, h) => ({ x, y, w, h, style: 'ice' });
const rock = (x, y, w, h) => ({ x, y, w, h, style: 'rock' });
const ramp = (pts, style = 'block') => ({ points: pts.map(([x, y]) => ({ x, y })), style });
const bramp = (pts) => ({ ...ramp(pts, 'bumper'), material: 'bumper' }); // rampe-bumper (flipper)
const hoop = (x, y, o = {}) => ({ x, y, facing: -1, mount: 'pole', floorY: F, ...o });
const T = (fr, en, es) => ({ fr, en, es });

export const TS_LEVELS = [
  // ═══════════════ CHAPITRE 1 — LES BASES : rebonds, murs, angles ═══════════════
  {
    n: 1, id: 'premier-tir', diff: 'easy', intro: ['aim'],
    name: T('Premier tir', 'First Shot', 'Primer tiro'),
    hint: T('Pose ton doigt sur le ballon, tire vers l’arrière, relâche !', 'Touch the ball, pull back, release!', '¡Toca el balón, tira hacia atrás y suelta!'),
    start: tee(3), hoop: hoop(12, 3.5), solids: frame(),
  },
  {
    n: 2, id: 'le-mur', diff: 'easy', intro: ['wall'],
    name: T('Le mur', 'The Wall', 'El muro'),
    hint: T('Plus tu tires loin, plus le tir est puissant.', 'The further you pull, the stronger the shot.', 'Cuanto más tiras, más potente es el tiro.'),
    start: tee(3), hoop: hoop(15, 3.5), solids: [...frame(), wall(8.5, 1, 1, 4.5)],
  },
  {
    n: 3, id: 'sous-la-dalle', diff: 'hard',
    name: T('Sous la dalle', 'Under the Slab', 'Bajo la losa'),
    hint: T('Par-dessus ou par-dessous ? À toi de choisir.', 'Over or under? Your call.', '¿Por encima o por debajo? Tú eliges.'),
    start: tee(3), hoop: hoop(19.5, 3), solids: [...frame(), block(7, 5.6, 9, 1)],
  },
  {
    n: 4, id: 'ricochet', diff: 'easy', intro: ['bounce'],
    name: T('Ricochet', 'Ricochet', 'Rebote'),
    hint: T('Le panier est sous la dalle : fais rebondir le ballon au sol.', 'The hoop is under the slab: bounce the ball off the floor.', 'El aro está bajo la losa: rebota el balón en el suelo.'),
    start: tee(3), hoop: hoop(17.5, 2), solids: [...frame(), block(14, 4.6, 10, 1)],
  },
  {
    n: 5, id: 'la-bande', diff: 'hard', intro: ['bank'],
    name: T('La bande', 'Bank Shot', 'La banda'),
    hint: T('Le panier tourne le dos : fais rebondir le ballon sur le mur de gauche.', 'The hoop faces away: bounce the ball off the left wall.', 'El aro está de espaldas: rebota el balón en la pared izquierda.'),
    start: tee(16), hoop: hoop(1.4, 4.5, { mount: 'wall' }), solids: [...frame(), block(5, 8.5, 8, 5)],
  },
  {
    n: 6, id: 'le-puits', diff: 'hard',
    name: T('Le puits', 'The Well', 'El pozo'),
    start: tee(3), hoop: hoop(15.15, 4.5, { mount: 'wall' }), solids: [...frame(), wall(14, 1, 1, 8), wall(17.2, 1, 1, 8)],
  },
  {
    n: 7, id: 'escalier', diff: 'easy',
    name: T('L’escalier', 'The Stairs', 'La escalera'),
    start: tee(2.5, 7), hoop: hoop(19.5, 3.4),
    solids: [...frame(), block(-1, 1, 7, 6), block(6, 1, 3, 4.5), block(9, 1, 3, 3), block(12, 1, 3, 1.5)],
  },
  {
    n: 8, id: 'la-lucarne', diff: 'hard',
    name: T('La lucarne', 'The Window', 'El tragaluz'),
    start: tee(3), hoop: hoop(19.6, 6.6, { mount: 'wall' }),
    solids: [...frame(), block(16.5, 1, 8.5, 3.6), wall(16.5, 10, 1, 3.5)],
  },
  {
    n: 9, id: 'angle-mort', diff: 'hard', intro: ['lob'],
    name: T('Angle mort', 'Blind Spot', 'Ángulo muerto'),
    hint: T('Un tir en cloche retombe presque à la verticale.', 'A high lob drops almost straight down.', 'Un tiro bombeado cae casi en vertical.'),
    start: tee(3), hoop: hoop(16.4, 3), solids: [...frame(), wall(14.5, 1, 1, 6)],
  },
  {
    n: 10, id: 'examen', diff: 'hard',
    name: T('L’examen', 'The Exam', 'El examen'),
    start: tee(3), hoop: hoop(19, 3.2),
    solids: [...frame(), wall(10, 1, 1, 7), block(10, 11, 15, 2.5)],
  },

  // ═══════════════ CHAPITRE 2 — MACHINES : trampolines, ventilateurs, plateformes mobiles ═══════════════
  {
    n: 11, id: 'trampoline', diff: 'easy', intro: ['trampoline'],
    name: T('Trampoline', 'Trampoline', 'Trampolín'),
    hint: T('Le trampoline propulse le ballon vers le haut.', 'The trampoline launches the ball upward.', 'El trampolín lanza el balón hacia arriba.'),
    start: tee(3), hoop: hoop(19, 5.5, { mount: 'wall' }),
    solids: [...frame(), block(-1, 5, 13, 1)], trampolines: [{ x: 13, y: F, w: 3 }],
  },
  {
    n: 12, id: 'souffle', diff: 'easy', intro: ['fan'],
    name: T('Le souffle', 'Updraft', 'La corriente'),
    hint: T('Le ventilateur fait flotter le ballon.', 'The fan makes the ball float.', 'El ventilador hace flotar el balón.'),
    start: tee(3), hoop: hoop(13.4, 7, { mount: 'wall' }),
    solids: [...frame(), block(5, 4.4, 4.6, 9.1)], fans: [{ x: 10, y: F, w: 2.2, h: 8, strength: 95 }],
  },
  {
    n: 13, id: 'la-herse', diff: 'very', intro: ['mover'],
    name: T('La herse', 'The Portcullis', 'El rastrillo'),
    hint: T('La grille monte et descend : tire au bon moment.', 'The gate goes up and down: shoot at the right time.', 'La reja sube y baja: tira en el momento justo.'),
    start: tee(3), hoop: hoop(16, 3.5),
    solids: [...frame(), wall(11, 1, 1, 1.5), wall(11, 7.5, 1, 6)],
    movers: [{ x: 11, y: 2.5, w: 1, h: 5, path: { dx: 0, dy: 5, period: 3.4, phase: 0 } }],
  },
  {
    n: 14, id: 'double-saut', diff: 'easy',
    name: T('Double saut', 'Double Jump', 'Doble salto'),
    start: tee(2.5), hoop: hoop(20, 10.5, { mount: 'wall' }),
    solids: [...frame(), block(11, 1, 3.5, 5)], trampolines: [{ x: 6, y: F, w: 2.5 }, { x: 11.5, y: 6, w: 2.5 }],
  },
  {
    n: 15, id: 'interrupteur', diff: 'easy', intro: ['switch'],
    name: T('L’interrupteur', 'The Switch', 'El interruptor'),
    hint: T('Le bouton allume le ventilateur.', 'The button turns on the fan.', 'El botón enciende el ventilador.'),
    start: tee(3), hoop: hoop(16.3, 6.2, { mount: 'wall' }),
    solids: [...frame(), wall(12.4, 3.6, 1, 9.9)],
    switches: [{ x: 7.5, y: F, w: 1.4, target: 'fan' }],
    fans: [{ x: 14, y: F, w: 2.2, h: 9, strength: 95, target: 'fan' }],
  },
  {
    n: 16, id: 'la-trappe', diff: 'hard', intro: ['hatch'],
    name: T('La trappe', 'The Hatch', 'La trampilla'),
    hint: T('Passe sur le bouton pour ouvrir la trappe du trampoline.', 'Roll over the button to open the trampoline hatch.', 'Pasa por el botón para abrir la trampilla del trampolín.'),
    start: tee(2.5), hoop: hoop(18.5, 6.2, { mount: 'wall' }),
    solids: [...frame(), block(-1, 4.4, 11.5, 1), wall(15.6, 1, 0.6, 4.8)],
    switches: [{ x: 6.5, y: F, w: 1.4, target: 'hatch' }],
    trampolines: [{ x: 11, y: F, w: 2.4 }],
    doors: [{ id: 'hatch', x: 10.8, y: F, w: 2.8, h: 0.5, open: { dx: 0, dy: -1.2 }, duration: 0.35 }],
  },
  {
    n: 17, id: 'ascenseur', diff: 'very',
    name: T('L’ascenseur', 'The Elevator', 'El ascensor'),
    hint: T('Le panier est derrière toi : rebondis sur la plateforme mobile.', 'The hoop is behind you: bounce off the moving platform.', 'El aro está detrás de ti: rebota en la plataforma móvil.'),
    start: tee(20), hoop: hoop(4.5, 5.2, { facing: 1, mount: 'wall' }),
    solids: [...frame(), block(-1, 9, 13, 4.5)],
    movers: [{ x: 8.5, y: 2, w: 5, h: 0.5, path: { dx: 0, dy: 3.5, period: 4, phase: 0 } }],
  },
  {
    n: 18, id: 'couloir-d-air', diff: 'very',
    name: T('Couloir d’air', 'Air Corridor', 'Pasillo de aire'),
    start: tee(2.5), hoop: hoop(17.4, 9, { floorY: 7 }),
    solids: [...frame(), block(16.4, 1, 8.6, 6)],
    fans: [{ x: 8.6, y: F, w: 2.2, h: 8, strength: 92 }, { x: 13.2, y: F, w: 2.2, h: 12, strength: 100 }],
  },
  {
    n: 19, id: 'pont-levis', diff: 'very', intro: ['bridge'],
    name: T('Le pont-levis', 'The Drawbridge', 'El puente levadizo'),
    hint: T('Touche le bouton : le pont tombe au-dessus du vide.', 'Hit the button: the bridge drops over the pit.', 'Toca el botón: el puente cae sobre el vacío.'),
    start: tee(2.5), hoop: hoop(20.5, 3.2),
    solids: [...frame([ground(-1, 5.5), ground(18.5, W + 1)]), block(5.5, 5.4, 13, 8.1), block(2.4, 2.6, 2, 0.5)],
    switches: [{ x: 2.8, y: 3.1, w: 1.2, target: 'bridge' }],
    doors: [{ id: 'bridge', x: 5.5, y: 4.9, w: 13, h: 0.5, open: { dx: 0, dy: -4.4 }, duration: 0.6 }],
  },
  {
    n: 20, id: 'la-machine', diff: 'very',
    name: T('La machine', 'The Machine', 'La máquina'),
    start: tee(2.5), hoop: hoop(20.8, 9.5, { mount: 'wall' }),
    solids: [...frame(), block(16.5, 1, 7.5, 3), wall(9, 6.5, 1, 7)],
    trampolines: [{ x: 5.5, y: F, w: 2.4 }],
    fans: [{ x: 17.5, y: 4, w: 2.2, h: 8, strength: 95 }],
    movers: [{ x: 11, y: 3, w: 3.2, h: 0.5, path: { dx: 0, dy: 3.5, period: 3.5, phase: 0 } }],
  },

  // ═══════════════ CHAPITRE 3 — DANGER : téléporteurs, lasers, plateformes qui disparaissent, scies ═══════════════
  {
    n: 21, id: 'portail', diff: 'hard', intro: ['teleporter'],
    name: T('Le portail', 'The Portal', 'El portal'),
    hint: T('Entre dans le portail : tu ressors de l’autre, à la même vitesse.', 'Enter one portal, exit the other at the same speed.', 'Entra en un portal y sal por el otro a la misma velocidad.'),
    start: tee(3), hoop: hoop(18.6, 3.6, { mount: 'wall' }),
    solids: [...frame(), wall(15, 1, 0.6, 7), wall(15, 8, 9, 0.6), wall(21.2, 1, 2.8, 2.6)],
    teleporters: [{ a: { x: 9, y: 6 }, b: { x: 19.2, y: 6.6 }, r: 1.1 }],
  },
  {
    n: 22, id: 'rideau-laser', diff: 'easy', intro: ['laser'],
    name: T('Rideau laser', 'Laser Curtain', 'Cortina láser'),
    hint: T('Attends que le laser s’éteigne.', 'Wait for the laser to switch off.', 'Espera a que el láser se apague.'),
    start: tee(3), hoop: hoop(15.5, 4), solids: frame(),
    lasers: [{ x1: 11, y1: F, x2: 11, y2: H, period: 3, on: 1.1, phase: 0 }],
  },
  {
    n: 23, id: 'sol-fragile', diff: 'hard', intro: ['crumble'],
    name: T('Sol fragile', 'Fragile Floor', 'Suelo frágil'),
    hint: T('Ces dalles s’effondrent après un rebond.', 'These tiles collapse after one bounce.', 'Estas losas se hunden tras un rebote.'),
    start: tee(2.5), hoop: hoop(19, 3.4),
    solids: [...frame([ground(-1, 5), ground(17.5, W + 1)]), block(4.5, 7.4, 11.5, 6.1)],
    crumbles: [{ x: 7.5, y: 2.2, w: 2.4 }, { x: 12, y: 2.8, w: 2.4 }],
  },
  {
    n: 24, id: 'la-scie', diff: 'hard', intro: ['saw', 'spikes'],
    name: T('La scie', 'The Saw', 'La sierra'),
    start: tee(3), hoop: hoop(17.5, 3.5),
    solids: [...frame(), wall(11.5, 1, 1, 3), wall(11.5, 7, 1, 6.5)],
    saws: [{ x: 12, y: 2, r: 0.6, path: { dx: 0, dy: 8, period: 2.6, phase: 0 } }],
    spikes: [{ x: 13.2, y: F, w: 3.4, dir: 'up' }],
  },
  {
    n: 25, id: 'de-l-autre-cote', diff: 'easy',
    name: T('De l’autre côté', 'Other Side', 'Al otro lado'),
    start: tee(3), hoop: hoop(20, 4),
    solids: [...frame(), wall(10, 1, 1, 12.5)],
    teleporters: [{ a: { x: 6, y: 5 }, b: { x: 13.5, y: 10.5 }, r: 0.75 }],
  },
  {
    n: 26, id: 'clignotants', diff: 'hard', intro: ['blinker'],
    name: T('Clignotants', 'Blinkers', 'Intermitentes'),
    hint: T('Ces plateformes apparaissent et disparaissent.', 'These platforms appear and vanish.', 'Estas plataformas aparecen y desaparecen.'),
    start: tee(2.5), hoop: hoop(21, 3.4),
    solids: [...frame([ground(-1, 5), ground(19.5, W + 1)]), block(4.5, 7.2, 13, 6.3)],
    blinkers: [{ x: 8, y: 2.2, w: 2.6, h: 0.45, period: 3, on: 1.7, phase: 0 }, { x: 13, y: 2.8, w: 2.6, h: 0.45, period: 3, on: 1.7, phase: 0.45 }],
  },
  {
    n: 27, id: 'la-caisse', diff: 'hard', intro: ['crate'],
    name: T('La caisse', 'The Crate', 'La caja'),
    hint: T('Un tir puissant casse la caisse.', 'A powerful shot breaks the crate.', 'Un tiro potente rompe la caja.'),
    start: tee(3), hoop: hoop(18.5, 2.4, { mount: 'wall' }),
    solids: [...frame(), wall(15.5, 5.6, 8.5, 0.6)],
    breakables: [{ x: 15.5, y: 1, w: 1, h: 4.6, strength: 4 }],
  },
  {
    n: 28, id: 'passage-secret', diff: 'very', intro: ['secret'],
    name: T('Passage secret', 'Secret Passage', 'Pasadizo secreto'),
    hint: T('Un bouton ouvre un passage dans le mur…', 'A button opens a way through the wall…', 'Un botón abre un paso en el muro…'),
    start: tee(3), hoop: hoop(19, 3.2, { mount: 'wall' }),
    solids: [...frame(), wall(15, 1, 0.6, 1.2), wall(15, 5.8, 0.6, 4.2), wall(15, 10, 9, 0.6), block(9, 1, 1.4, 5)],
    switches: [{ x: 9.1, y: 6, w: 1.2, target: 'secret' }],
    doors: [{ id: 'secret', x: 15, y: 2.2, w: 0.6, h: 3.6, open: { dx: 0, dy: 4 }, duration: 0.5, style: 'wall' }],
  },
  {
    n: 29, id: 'portail-laser', diff: 'very',
    name: T('Portail et laser', 'Portal & Laser', 'Portal y láser'),
    start: tee(3), hoop: hoop(19, 4),
    solids: [...frame(), wall(11, 1, 1, 12.5)],
    teleporters: [{ a: { x: 7, y: 7 }, b: { x: 14.5, y: 10 }, r: 0.75 }],
    lasers: [{ x1: 12, y1: 6.5, x2: W, y2: 6.5, period: 2.6, on: 1.2, phase: 0 }],
  },
  {
    n: 30, id: 'couloir-des-scies', diff: 'very',
    name: T('Couloir des scies', 'Saw Corridor', 'Pasillo de sierras'),
    start: tee(2.5), hoop: hoop(20, 4.5),
    solids: [...frame(), block(5, 7.5, 19, 6)],
    saws: [
      { x: 9, y: 1.8, r: 0.6, path: { dx: 0, dy: 4.8, period: 2.2, phase: 0 } },
      { x: 14, y: 1.8, r: 0.6, path: { dx: 0, dy: 4.8, period: 2.2, phase: 0.5 } },
    ],
    spikes: [{ x: 15.6, y: F, w: 3, dir: 'up' }],
  },

  // ═══════════════ CHAPITRE 4 — LABORATOIRE : gravité, glace, lave, aimants ═══════════════
  {
    n: 31, id: 'la-lune', diff: 'easy', intro: ['lowGravity'], gravityScale: 0.42,
    name: T('La Lune', 'The Moon', 'La Luna'),
    hint: T('Gravité réduite : le ballon flotte longtemps.', 'Low gravity: the ball floats for a long time.', 'Gravedad reducida: el balón flota mucho tiempo.'),
    start: tee(2.5), hoop: hoop(14, 4.2), solids: [...frame(), wall(8, 1, 1, 4.4)],
  },
  {
    n: 32, id: 'tete-en-bas', diff: 'hard', intro: ['gravityFlip'],
    name: T('Tête en bas', 'Upside Down', 'Al revés'),
    hint: T('Dans la zone violette, la gravité s’inverse.', 'In the purple zone, gravity flips.', 'En la zona violeta, la gravedad se invierte.'),
    start: tee(3), hoop: hoop(19.5, 4), solids: [...frame(), wall(14, 1, 1, 10.5)],
    gravityZones: [{ x: 7, y: 1, w: 5, h: 12.5 }],
  },
  {
    n: 33, id: 'patinoire', diff: 'very', intro: ['ice'],
    name: T('La patinoire', 'The Rink', 'La pista de hielo'),
    hint: T('Sur la glace, le ballon glisse sans s’arrêter.', 'On ice, the ball slides without stopping.', 'Sobre el hielo, el balón se desliza sin parar.'),
    start: tee(2.5), hoop: hoop(21, 4.4, { mount: 'wall' }),
    solids: [...frame([ground(-1, W + 1, 'ice')]), block(-1, 3.6, 13, 9.9), ramp([[13, 1], [18.5, 1], [18.5, 3]], 'ice')],
  },
  {
    n: 34, id: 'riviere-de-lave', diff: 'hard', intro: ['lava'],
    name: T('Rivière de lave', 'Lava River', 'Río de lava'),
    hint: T('La lave fait éclater le ballon : rebondis sur les rochers.', 'Lava pops the ball: bounce on the rocks.', 'La lava revienta el balón: rebota en las rocas.'),
    start: tee(2.5), hoop: hoop(19, 3.4),
    solids: [...frame([ground(-1, 5), ground(17.5, W + 1)]), rock(8.2, -1, 1.6, 3.6), rock(12.4, -1, 1.6, 4.2), block(4.5, 7.4, 11.5, 6.1)],
    lava: [{ x: 5, y: 0.7, w: 12.5 }],
  },
  {
    n: 35, id: 'l-aimant', diff: 'very', intro: ['magnet'],
    name: T('L’aimant', 'The Magnet', 'El imán'),
    hint: T('L’aimant attire le ballon : évite son cœur.', 'The magnet pulls the ball: avoid its core.', 'El imán atrae el balón: evita su núcleo.'),
    start: tee(3), hoop: hoop(19, 4), solids: [...frame(), wall(11, 1, 1, 9)],
    magnets: [{ x: 16.5, y: 9, radius: 4, strength: 28, core: 0.55 }],
  },
  {
    n: 36, id: 'boules-de-feu', diff: 'hard', intro: ['fireball'],
    name: T('Boules de feu', 'Fireballs', 'Bolas de fuego'),
    start: tee(3), hoop: hoop(18, 3.5), solids: [...frame(), wall(10, 1, 1, 5)],
    cannons: [
      { x: 23.4, y: 5, dir: -1, period: 2, speed: 7, phase: 0, style: 'fire' },
      { x: 23.4, y: 8.5, dir: -1, period: 2, speed: 7, phase: 0.5, style: 'fire' },
    ],
  },
  {
    n: 37, id: 'boules-de-neige', diff: 'impossible', intro: ['snowball'],
    name: T('Boules de neige', 'Snowballs', 'Bolas de nieve'),
    start: tee(3), hoop: hoop(19.6, 3.4), solids: [...frame(), block(5, 4.8, 12.5, 8.7)],
    boulders: [{ x1: 5, x2: 22, y: F, r: 0.55, dir: -1, speed: 6, period: 2.6, phase: 0, style: 'snow' }],
  },
  {
    n: 38, id: 'glace-et-aimant', diff: 'very',
    name: T('Glace et aimant', 'Ice & Magnet', 'Hielo e imán'),
    hint: T('Le tremplin de glace ne suffit pas : laisse l’aimant courber ta trajectoire.', 'The ice ramp is not enough: let the magnet bend your path.', 'La rampa de hielo no basta: deja que el imán curve tu trayectoria.'),
    start: tee(2.5), hoop: hoop(20.8, 6, { mount: 'wall' }),
    solids: [...frame([ground(-1, W + 1, 'ice')]), block(-1, 4, 11, 9.5), ramp([[11, 1], [15, 1], [15, 2.6]], 'ice')],
    magnets: [{ x: 12.6, y: 6.1, radius: 5.5, strength: 38, core: 0.5 }],
  },
  {
    n: 39, id: 'apesanteur', diff: 'very', gravityScale: 0.3,
    name: T('Apesanteur', 'Zero G', 'Ingravidez'),
    start: tee(2.5), hoop: hoop(21, 4, { mount: 'wall' }),
    solids: [...frame(), wall(9, 1, 1, 8), wall(15, 5.5, 1, 8)],
    gravityZones: [{ x: 10, y: 1, w: 5, h: 5 }],
    teleporters: [{ a: { x: 12.5, y: 10 }, b: { x: 18.5, y: 9 }, r: 0.75 }],
  },
  {
    n: 40, id: 'le-laboratoire', diff: 'hard',
    name: T('Le laboratoire', 'The Lab', 'El laboratorio'),
    start: tee(2.5), hoop: hoop(21.4, 8, { mount: 'wall' }),
    solids: [...frame([ground(-1, 5), ground(19, W + 1)]), rock(10, -1, 1.2, 3.5), wall(16, 1, 1, 6.5)],
    lava: [{ x: 5, y: 0.7, w: 14 }],
    gravityZones: [{ x: 12, y: 1, w: 3.5, h: 12.5 }],
    magnets: [{ x: 19.5, y: 11, radius: 3.5, strength: 24, core: 0.5 }],
  },

  // ═══════════════ CHAPITRE 5 — MAÎTRE : toutes les mécaniques, de vrais casse-têtes ═══════════════
  {
    n: 41, id: 'reaction-en-chaine', diff: 'very',
    name: T('Réaction en chaîne', 'Chain Reaction', 'Reacción en cadena'),
    hint: T('Bouton, trampoline, ventilateur : tout s’enchaîne en un seul tir.', 'Button, trampoline, fan: it all chains in one shot.', 'Botón, trampolín, ventilador: todo se encadena en un solo tiro.'),
    start: tee(2.5), hoop: hoop(20.9, 9.4, { mount: 'wall' }),
    solids: [...frame(), wall(8, 3.4, 1, 10.1), block(15, 1, 3.4, 3)],
    switches: [{ x: 5, y: F, w: 1.4, target: 'air' }],
    trampolines: [{ x: 11, y: F, w: 2 }],
    fans: [{ x: 18.5, y: F, w: 2.2, h: 12, strength: 100, target: 'air' }],
  },
  {
    n: 42, id: 'le-coffre', diff: 'impossible',
    name: T('Le coffre', 'The Vault', 'La caja fuerte'),
    start: tee(3), hoop: hoop(19.5, 3.4, { mount: 'wall' }),
    solids: [...frame(), wall(16, 1, 0.6, 7), wall(16, 8, 8, 0.6), block(7, 1, 1.2, 6)],
    breakables: [{ x: 10.5, y: 1, w: 1.2, h: 2.4, strength: 4 }],
    teleporters: [{ a: { x: 13, y: 1.8 }, b: { x: 18, y: 7 }, r: 0.75 }],
  },
  {
    n: 43, id: 'zigzag', diff: 'very', intro: ['bumper'],
    name: T('Zigzag', 'Zigzag', 'Zigzag'),
    hint: T('Les bumpers renvoient toute l’énergie : à droite, puis redescends à gauche.', 'Bumpers give back all the energy: go right, then drop down on the left.', 'Los bumpers devuelven toda la energía: a la derecha y luego baja por la izquierda.'),
    start: tee(2.5, 9.6), hoop: hoop(3.4, 3.8, { facing: 1, mount: 'wall' }),
    solids: [...frame(), block(-1, 9, 17, 0.6), block(10, 5, 15, 0.6), bumper(23.2, 5.6, 0.8, 7.9)],
  },
  {
    n: 44, id: 'tempete', diff: 'impossible',
    name: T('Tempête', 'Storm', 'Tormenta'),
    hint: T('Deux souffles, un laser : le bon moment, la bonne force.', 'Two gusts, one laser: right moment, right power.', 'Dos ráfagas, un láser: el momento justo, la fuerza justa.'),
    start: tee(2.5), hoop: hoop(20.4, 2.8),
    solids: [...frame(), wall(6.5, 1, 1, 4.4), wall(16.5, 7.7, 1, 5.8)],
    fans: [{ x: 9, y: F, w: 2.2, h: 5.6, strength: 97 }, { x: 13, y: F, w: 2.2, h: 8.2, strength: 58 }],
    lasers: [{ x1: 17, y1: 1, x2: 17, y2: 7.7, period: 2.8, on: 1.2, phase: 0 }],
  },
  {
    n: 45, id: 'flipper', diff: 'hard',
    name: T('Le flipper', 'Pinball', 'El pinball'),
    hint: T('Les rampes-bumpers font faire le tour de l’arène au ballon.', 'The bumper ramps send the ball around the arena.', 'Las rampas-bumper hacen que el balón dé la vuelta a la arena.'),
    start: tee(3), hoop: hoop(7, 6.6, { facing: 1, mount: 'pole', floorY: 5.4 }),
    solids: [...frame(), block(-1, 4.8, 16, 0.6), bramp([[19, 1], [24, 1], [24, 6]]), bramp([[24, 8], [24, 12], [20, 12]])],
  },
  {
    n: 46, id: 'miroir', diff: 'very',
    name: T('Le miroir', 'The Mirror', 'El espejo'),
    start: tee(21.5), hoop: hoop(3, 4, { facing: 1, mount: 'wall' }),
    solids: [...frame([ground(-1, 6.5), ground(17.5, W + 1)]), wall(12, 6.5, 1, 7)],
    lava: [{ x: 6.5, y: 0.7, w: 11 }],
    gravityZones: [{ x: 8, y: 1, w: 3.5, h: 5 }],
  },
  {
    n: 47, id: 'l-horloge', diff: 'impossible',
    name: T('L’horloge', 'The Clock', 'El reloj'),
    start: tee(2.5), hoop: hoop(20.5, 4),
    solids: [...frame(), wall(8, 1, 1, 2.5), wall(8, 7, 1, 6.5), wall(14.5, 1, 1, 2.5), wall(14.5, 7, 1, 6.5)],
    movers: [
      { x: 8, y: 3.5, w: 1, h: 3.5, path: { dx: 0, dy: 3.5, period: 3, phase: 0 } },
      { x: 14.5, y: 3.5, w: 1, h: 3.5, path: { dx: 0, dy: 3.5, period: 3, phase: 0.1 } },
    ],
  },
  {
    n: 48, id: 'aimants-jumeaux', diff: 'very',
    name: T('Aimants jumeaux', 'Twin Magnets', 'Imanes gemelos'),
    start: tee(2.5), hoop: hoop(20.5, 4), solids: [...frame(), wall(11.5, 1, 1, 7.5)],
    magnets: [{ x: 8.5, y: 10, radius: 3.2, strength: -26, core: 0 }, { x: 16, y: 10.5, radius: 3.6, strength: 26, core: 0.5 }],
  },
  {
    n: 49, id: 'le-grand-vide', diff: 'hard', gravityScale: 0.4,
    name: T('Le grand vide', 'The Void', 'El gran vacío'),
    start: tee(2.5, 6), hoop: hoop(21, 7, { mount: 'wall' }),
    solids: [...frame([]), block(-1, -1, 5, 7), block(19, -1, 6, 4)],
    saws: [{ x: 11, y: 4, r: 0.6, path: { dx: 0, dy: 6, period: 3, phase: 0 } }],
    teleporters: [{ a: { x: 8, y: 2.5 }, b: { x: 15, y: 11.5 }, r: 0.75 }],
  },
  {
    n: 50, id: 'trickshot-ultime', diff: 'impossible',
    name: T('Trickshot ultime', 'Ultimate Trickshot', 'Trickshot definitivo'),
    start: tee(2.5), hoop: hoop(20.9, 8.4, { mount: 'wall' }),
    solids: [...frame(), wall(7.5, 1, 1, 3.5), wall(7.5, 7.5, 1, 6), block(16, 1, 2.2, 3)],
    switches: [{ x: 4.5, y: F, w: 1.2, target: 'final' }],
    doors: [{ id: 'final', x: 7.5, y: 4.5, w: 1, h: 3, open: { dx: 0, dy: 3 }, duration: 0.5 }],
    trampolines: [{ x: 10.5, y: F, w: 2.4 }],
    fans: [{ x: 18.5, y: F, w: 2.2, h: 12, strength: 100, target: 'final' }],
    lasers: [{ x1: 14, y1: 4.4, x2: 14, y2: 13.5, period: 2.6, on: 1, phase: 0 }],
  },
];
