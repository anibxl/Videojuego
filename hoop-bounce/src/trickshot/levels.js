// Les cartes du mode TRICKSHOT — « le Laboratoire » (v2, étape 23).
//
// Moins de cartes, mais chacune est un vrai casse-tête construit autour d'UNE idée, sans grand sol plat :
// plateformes suspendues, tunnels, cages de verre, puits, chambres fermées ; le ballon part en hauteur,
// dans un coin ou enfermé ; le panier est à gauche, en hauteur, suspendu, caché derrière un mur...
// Toutes ont au moins une solution en UN SEUL tir (3 étoiles possibles), trouvée par
// tools/trickshot-check.mjs et rejouée par tests/trickshot.test.mjs. Chaque mécanique annoncée est
// indispensable : sans elle, aucun tir ne marque (vérifié en la retirant).
//
// Champs : éléments du moteur (solids, trampolines, fans, movers, switches, doors, teleporters, lasers…)
// + propres au mode : breakables (caisses), fans[].target (ventilateur allumé par un bouton),
// hoop.hang (panier suspendu), solids[].hang (plateforme suspendue), diff, intro, name, hint.
// Outils de construction : ./kit.js.

import { EXPERT_CARDS } from './cards-expert.js';
import { tee, frame, floor, plat, wall, block, glass, bumper, bramp, hoopPole, hoopWall, hoopHang, T } from './kit.js';

const BASE_CARDS = [
  // ═══════════════ CHAPITRE 1 — CALIBRATION : le tir, les rebonds, la bande ═══════════════
  {
    id: 'premier-tir', intro: ['aim'],
    name: T('Premier tir', 'First Shot', 'Primer tiro'),
    hint: T('Touche le ballon, puis tire vers l’arrière n’importe où sur l’écran. Relâche !', 'Touch the ball, then pull back anywhere on the screen. Release!', '¡Toca el balón y tira hacia atrás en cualquier parte de la pantalla. Suelta!'),
    start: tee(3, 5), hoop: hoopPole(17.5, 4, 1),
    solids: [...frame(), plat(-1, 5, 6, { h: 0.6 }), floor(13, 25)],
  },
  {
    id: 'rebond', intro: ['bounce'],
    name: T('Rebond', 'Bounce', 'Rebote'),
    hint: T('Le panier est sous une dalle : fais rebondir le ballon sur la plaque du milieu.', 'The hoop is under a slab: bounce the ball off the middle plate.', 'El aro está bajo una losa: rebota el balón en la placa del medio.'),
    start: tee(3, 3.5), hoop: hoopPole(18.5, 2.2, 1),
    solids: [...frame(), plat(-1, 3.5, 6), plat(8, 1.2, 6), floor(16, 25), plat(15.5, 4.8, 8.5, { h: 0.6, hang: true })],
  },
  {
    id: 'la-bande', intro: ['bank'],
    name: T('La bande', 'Bank Shot', 'La banda'),
    hint: T('Le panier tourne le dos : renvoie le ballon contre le mur de gauche.', 'The hoop faces away: bounce the ball off the left wall.', 'El aro está de espaldas: rebota el balón en la pared izquierda.'),
    start: tee(19, 4), hoop: hoopWall(1.4, 4.2),
    solids: [...frame(), plat(16.5, 4, 7.5), floor(-1, 5, 1), block(4.5, 7.6, 9.5, 0.6)],
  },
  {
    id: 'le-tunnel',
    name: T('Le tunnel', 'The Tunnel', 'El túnel'),
    hint: T('Le seul passage est un tunnel bas : enchaîne les rebonds.', 'The only way is a low tunnel: chain the bounces.', 'El único paso es un túnel bajo: encadena los rebotes.'),
    start: tee(2.5, 1), hoop: hoopPole(21.1, 2, 1),
    solids: [...frame(), floor(-1, 25), wall(4.5, 4.6, 8.6, 8.9), plat(18.6, 6.1, 6.4, { h: 0.6, hang: true })],
  },

  // ═══════════════ CHAPITRE 2 — LES MACHINES : trampoline, ventilateur, ascenseur ═══════════════
  {
    id: 'trampoline', intro: ['trampoline'],
    name: T('Trampoline', 'Trampoline', 'Trampolín'),
    hint: T('Tu es dans une cage basse : le trampoline te fera passer le mur.', 'You are in a low cage: the trampoline will get you over the wall.', 'Estás en una jaula baja: el trampolín te hará pasar el muro.'),
    start: tee(2.5, 1), hoop: hoopHang(14, 5.6),
    solids: [...frame(), floor(-1, 10), glass(-1, 3.6, 6, 0.3), wall(10, -2, 1, 7), floor(11, 25)],
    trampolines: [{ x: 6.4, y: 1, w: 2.4 }],
  },
  {
    id: 'colonne-d-air', intro: ['fan'],
    name: T('Colonne d’air', 'Air Column', 'Columna de aire'),
    hint: T('Le plafond est bas : seul le souffle du ventilateur monte jusqu’au panier.', 'The ceiling is low: only the fan’s blast reaches the hoop.', 'El techo es bajo: solo el soplo del ventilador llega al aro.'),
    start: tee(20, 1), hoop: hoopWall(5.3, 8.3, 1),
    solids: [...frame(), floor(8.5, 25), block(9.1, 7, 14.9, 0.6), floor(-1, 6.2)],
    fans: [{ x: 6.2, y: 1, w: 2.3, h: 10.6, strength: 98 }],
  },
  {
    id: 'la-machine',
    name: T('La machine', 'The Machine', 'La máquina'),
    hint: T('Trampoline, puis ventilateur : deux machines, un seul tir.', 'Trampoline, then fan: two machines, one shot.', 'Trampolín y luego ventilador: dos máquinas, un solo tiro.'),
    start: tee(20.5, 5), hoop: hoopHang(3, 8.1, 1),
    solids: [...frame(), plat(17, 5, 7, { h: 0.6 }), block(16, 6.4, 8, 0.6), floor(7.8, 12.8), wall(7, -2, 0.8, 7.1), floor(-1, 7)],
    trampolines: [{ x: 9.3, y: 1, w: 2.4 }],
    fans: [{ x: 4.2, y: 1, w: 2.6, h: 10.6, strength: 97 }],
  },
  {
    id: 'l-ascenseur', intro: ['mover'],
    name: T('L’ascenseur', 'The Elevator', 'El ascensor'),
    hint: T('Attends le bon moment : l’ascenseur renvoie le ballon vers le panier.', 'Wait for the right moment: the elevator sends the ball to the hoop.', 'Espera el momento justo: el ascensor envía el balón al aro.'),
    start: tee(2.5, 3.4), hoop: hoopPole(19.2, 5.2, 4.1),
    solids: [...frame(), plat(-1, 3.4, 5.5, { h: 0.6 }), wall(7.3, 7.5, 6.6, 6), plat(17.2, 4.1, 6.8, { h: 0.6 })],
    movers: [{ x: 11.4, y: 2.2, w: 3.6, h: 0.5, path: { dx: 0, dy: 3.9, period: 2.5, phase: 0 } }],
  },

  // ═══════════════ CHAPITRE 3 — LES CIRCUITS : caisses, boutons, ponts, portes ═══════════════
  {
    id: 'le-couvercle', intro: ['crate'],
    name: T('Le couvercle', 'The Lid', 'La tapa'),
    hint: T('Le panier est dans une fosse fermée par une caisse : arrive assez vite pour la briser.', 'The hoop is in a pit closed by a crate: come in fast enough to smash it.', 'El aro está en un foso cerrado por una caja: llega lo bastante rápido para romperla.'),
    start: tee(20.5, 8), hoop: hoopPole(7.6, 3, 1),
    solids: [...frame(), plat(17, 8, 7, { h: 0.6 }), floor(5, 12), wall(5, 1, 0.6, 5), wall(11.4, 1, 0.6, 5)],
    breakables: [{ x: 5.6, y: 5.4, w: 5.8, h: 0.6, strength: 8 }],
  },
  {
    id: 'le-pont', intro: ['switch', 'bridge'],
    name: T('Le pont', 'The Bridge', 'El puente'),
    hint: T('Passe sur le bouton : le pont descend dans le tunnel, au-dessus du vide.', 'Roll over the button: the bridge drops into the tunnel, over the void.', 'Pasa por el botón: el puente baja en el túnel, sobre el vacío.'),
    start: tee(2.5, 5.7), hoop: hoopPole(18.4, 2.2, 1),
    solids: [...frame(), plat(-1, 5.7, 7.2, { h: 0.6 }), wall(8.5, 5.8, 9.4, 7.7), floor(16.9, 25)],
    switches: [{ x: 4.4, y: 5.7, w: 1.4, target: 'bridge' }],
    doors: [{ id: 'bridge', x: 8.2, y: 5.38, w: 9.7, h: 0.4, open: { dx: 0, dy: -1.78 }, duration: 0.4 }],
  },
  {
    id: 'la-porte',
    name: T('La porte', 'The Gate', 'La puerta'),
    hint: T('Touche le bouton : le volet s’ouvre… pendant que le ballon roule encore.', 'Hit the button: the gate opens… while the ball is still rolling.', 'Toca el botón: la compuerta se abre… mientras el balón sigue rodando.'),
    start: tee(2.5, 4), hoop: hoopPole(19.2, 2.1, 1),
    solids: [...frame(), plat(-1, 4, 5.5, { h: 0.6 }), floor(10.1, 25), wall(10.1, 1, 1.4, 2.9), wall(15.4, 5.5, 0.5, 8), block(15.9, 7.3, 8.1, 0.6)],
    switches: [{ x: 10.2, y: 3.9, w: 1.2, target: 'gate' }],
    doors: [{ id: 'gate', x: 15.4, y: 1, w: 0.5, h: 4.5, open: { dx: 0, dy: -4.6 }, duration: 0.3 }],
  },
  {
    id: 'le-souffleur',
    name: T('Le souffleur', 'The Blower', 'El soplador'),
    hint: T('Le ventilateur est éteint : un bouton l’allume.', 'The fan is off: a button switches it on.', 'El ventilador está apagado: un botón lo enciende.'),
    start: tee(2.5, 3.5), hoop: hoopHang(17.5, 9.7, -1),
    solids: [...frame(), plat(-1, 3.5, 5, { h: 0.6 }), plat(7.7, 2.8, 3.6, { h: 0.5 }), floor(13, 17.6), block(-1, 7.5, 14.8, 0.6), block(16.8, 7.5, 8, 0.6)],
    switches: [{ x: 8.9, y: 2.8, w: 1.2, target: 'air' }],
    fans: [{ x: 14, y: 1, w: 2.6, h: 11.5, strength: 104, target: 'air' }],
  },

  // ═══════════════ CHAPITRE 4 — LES PORTAILS : téléporteurs, lasers ═══════════════
  {
    id: 'le-portail', intro: ['teleporter'],
    name: T('Le portail', 'The Portal', 'El portal'),
    hint: T('Tu es enfermé : le portail est la seule sortie. On en ressort à la même vitesse.', 'You are locked in: the portal is the only way out. You exit at the same speed.', 'Estás encerrado: el portal es la única salida. Sales a la misma velocidad.'),
    start: tee(2, 1.5), hoop: hoopPole(19, 3.8, 1),
    solids: [...frame(), plat(-1, 1.5, 8.2, { h: 0.6 }), glass(7, 1.5, 0.3, 5.2), glass(-1, 6.4, 8.3, 0.3), floor(15.5, 25)],
    teleporters: [{ a: { x: 4.2, y: 3.5 }, b: { x: 13.6, y: 8.7 }, r: 0.9 }],
  },
  {
    id: 'double-portail',
    name: T('Double portail', 'Double Portal', 'Doble portal'),
    hint: T('Trois salles fermées : le premier portail mène à droite, le second jusqu’au panier.', 'Three closed rooms: the first portal leads right, the second to the hoop.', 'Tres salas cerradas: el primer portal lleva a la derecha, el segundo hasta el aro.'),
    start: tee(2, 1.5), hoop: hoopPole(5.2, 9.2, 7.8, -1),
    solids: [...frame(), plat(-1, 1.5, 10.2, { h: 0.6 }), wall(9.2, -2, 0.5, 15.5), glass(-1, 7.5, 10.2, 0.3), floor(9.7, 25)],
    teleporters: [{ a: { x: 6.9, y: 2.8 }, b: { x: 12.5, y: 5.9 }, r: 0.8 }, { a: { x: 20.7, y: 3 }, b: { x: 4.3, y: 10.6 }, r: 0.8 }],
  },
  {
    id: 'rideau-laser', intro: ['laser'],
    name: T('Rideau laser', 'Laser Curtain', 'Cortina láser'),
    hint: T('Le laser garde l’entrée du portail : attends qu’il s’éteigne.', 'The laser guards the portal: wait for it to switch off.', 'El láser vigila el portal: espera a que se apague.'),
    start: tee(2.5, 4), hoop: hoopHang(20.2, 5.5, -1),
    solids: [...frame(), plat(-1, 4, 5.5, { h: 0.6 }), block(-1, 8.2, 14.5, 0.6), wall(13.5, -2, 0.6, 10.2)],
    teleporters: [{ a: { x: 9.8, y: 4.6 }, b: { x: 14.2, y: 10.2 }, r: 0.9 }],
    lasers: [{ x1: 7.9, y1: -1, x2: 7.9, y2: 8.2, period: 2.6, on: 1.3, phase: 0 }],
  },
  {
    id: 'portail-et-bande',
    name: T('Portail et bande', 'Portal Bank', 'Portal y banda'),
    hint: T('À la sortie du portail, il faudra encore rebondir sur le mur.', 'Out of the portal, you still need to bank off the wall.', 'Al salir del portal, todavía hay que rebotar en el muro.'),
    start: tee(2.5, 5), hoop: hoopWall(19, 3.2, 1),
    solids: [...frame(), plat(-1, 5, 5, { h: 0.6 }), wall(13, -2, 0.6, 15.5), block(13.6, 7.2, 4, 0.5), floor(13.6, 25, 0.6)],
    teleporters: [{ a: { x: 9.8, y: 2.5 }, b: { x: 16.5, y: 6.9 }, r: 0.85 }],
  },

  // ═══════════════ CHAPITRE 5 — LES TRICKSHOTS : tout s'enchaîne ═══════════════
  {
    id: 'reaction-en-chaine', intro: ['hatch'],
    name: T('Réaction en chaîne', 'Chain Reaction', 'Reacción en cadena'),
    hint: T('Bande sur le mur, bouton, trappe, trampoline, fenêtre : tout s’enchaîne.', 'Bank off the wall, button, hatch, trampoline, window: it all chains.', 'Banda en el muro, botón, trampilla, trampolín, ventana: todo se encadena.'),
    start: tee(21.5, 8.3), hoop: hoopPole(17.5, 6.3, 5.2),
    solids: [...frame(), floor(-1, 25), plat(15.8, 8.3, 9.2, { h: 0.6 }), wall(15.8, 1, 0.6, 4.2), plat(16.4, 5.2, 8.6, { h: 0.4 })],
    switches: [{ x: 7.4, y: 1, w: 1.4, target: 'hatch' }],
    trampolines: [{ x: 11.5, y: 1, w: 2.4 }],
    doors: [{ id: 'hatch', x: 11.3, y: 1, w: 2.8, h: 0.5, open: { dx: 0, dy: -1.2 }, duration: 0.3 }],
  },
  {
    id: 'zigzag', intro: ['bumper'],
    name: T('Zigzag', 'Zigzag', 'Zigzag'),
    hint: T('Les bumpers rendent toute l’énergie : va à droite, puis redescends à gauche.', 'Bumpers give back all the energy: go right, then drop down on the left.', 'Los bumpers devuelven toda la energía: a la derecha y luego baja por la izquierda.'),
    start: tee(2.5, 9.6), hoop: hoopWall(3.4, 3.8, 1),
    solids: [...frame(), floor(-1, 25), block(-1, 9, 17, 0.6), block(10, 5, 15, 0.6), bumper(23.2, 5.6, 0.8, 7.9)],
  },
  {
    id: 'flipper',
    name: T('Le flipper', 'Pinball', 'El pinball'),
    hint: T('Les rampes-bumpers font faire le tour de la salle au ballon.', 'The bumper ramps send the ball around the room.', 'Las rampas-bumper hacen que el balón dé la vuelta a la sala.'),
    start: tee(3, 1), hoop: hoopPole(7, 6.6, 5.4, 1),
    solids: [...frame(), floor(-1, 25), block(-1, 4.8, 16, 0.6), bramp([[19, 1], [24, 1], [24, 6]]), bramp([[24, 8], [24, 12], [20, 12]])],
  },
  {
    id: 'le-grand-trickshot',
    name: T('Le grand trickshot', 'The Grand Trickshot', 'El gran trickshot'),
    hint: T('Rebond, portail, bouton, porte, ventilateur, bumper… panier.', 'Bounce, portal, button, gate, fan, bumper… basket.', 'Rebote, portal, botón, puerta, ventilador, bumper… canasta.'),
    start: tee(2.5, 5.3), hoop: hoopHang(17.2, 10.8, 1),
    solids: [...frame(), floor(-1, 17.1), floor(17.1, 18.3, 0.86), floor(18.3, 25), plat(-1, 5.3, 5.5, { h: 0.6 }), block(11, 4.5, 2.3, 0.5),
      wall(13.3, 1, 0.5, 7.2), block(13.3, 8.2, 7.1, 0.6), wall(13.5, 8.8, 0.6, 4.7), wall(20.4, 4.6, 0.6, 4.9), bramp([[24, 10.1], [24, 13.5], [20.6, 13.5]])],
    teleporters: [{ a: { x: 12.15, y: 1.9 }, b: { x: 15.4, y: 3.5 }, r: 0.75 }],
    switches: [{ x: 17.1, y: 0.86, w: 1.2, target: 'gate' }],
    doors: [{ id: 'gate', x: 20.4, y: 1, w: 0.6, h: 3.6, open: { dx: 0, dy: -3.7 }, duration: 0.3 }],
    fans: [{ x: 21.1, y: 1, w: 2.8, h: 12.2, strength: 198 }],
  },
];

const CARDS = Object.fromEntries([...BASE_CARDS, ...EXPERT_CARDS].map((c) => [c.id, c]));

/** Les 5 paliers de 10 cartes (ordre = difficulté mesurée). */
export const TS_BANDS = ['easy', 'medium', 'hard', 'very', 'impossible'];

const ORDER = [
  // FACILE (1–10)
  'premier-tir', 'les-marches', 'double-verrou', 'la-glissade', 'trampoline',
  'le-couvercle', 'le-portail', 'colonne-d-air', 'double-portail', 'portail-et-bande',
  // MOYEN (11–20)
  'l-abime', 'la-machine', 'la-bande', 'la-navette', 'reaction-en-chaine',
  'double-trampoline', 'le-pont', 'rebond', 'la-porte', 'rideau-laser',
  // DIFFICILE (21–30)
  'le-plafond', 'le-puits', 'les-scies', 'le-grand-huit', 'les-clignotants',
  'flipper-geant', 'le-grand-trickshot', 'l-ascenseur', 'le-souffleur', 'portails-en-chaine',
  // TRÈS DIFFICILE (31–40)
  'lasers-croises', 'la-mecanique', 'le-tremplin', 'flipper', 'la-cheminee',
  'la-fenetre', 'portail-du-ciel', 'zigzag', 'le-tunnel', 'la-guillotine',
  // IMPOSSIBLE (41–50)
  'l-horloge', 'le-labyrinthe', 'rebond-du-fond', 'la-niche', 'le-coffre-fort',
  'laser-et-portail', 'le-mur-de-caisses', 'la-tour', 'trou-de-serrure', 'chas-de-l-aiguille',
];

// Une nouveauté (« Nouveau : … » sur la carte d'intro) s'annonce sur la PREMIÈRE carte du parcours qui l'utilise.
const MECHS = {
  trampoline: (c) => c.trampolines?.length,
  fan: (c) => c.fans?.length,
  mover: (c) => c.movers?.length,
  crate: (c) => c.breakables?.length,
  switch: (c) => c.switches?.length,
  teleporter: (c) => c.teleporters?.length,
  laser: (c) => c.lasers?.length,
  blinker: (c) => c.blinkers?.length,
  saw: (c) => c.saws?.length,
  bumper: (c) => c.solids.some((s) => s.style === 'bumper'),
  ice: (c) => c.solids.some((s) => s.style === 'ice'),
};
const announced = new Set();

export const TS_LEVELS = ORDER.map((id, i) => {
  const card = { ...CARDS[id], n: i + 1, diff: TS_BANDS[Math.floor(i / 10)] };
  const fresh = Object.keys(MECHS).filter((m) => !announced.has(m) && MECHS[m](card));
  fresh.forEach((m) => announced.add(m));
  const intro = [...(card.intro ?? []).filter((m) => !(m in MECHS)), ...fresh];
  if (intro.length) card.intro = intro;
  else delete card.intro;
  return card;
});
