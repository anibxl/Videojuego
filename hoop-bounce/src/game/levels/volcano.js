// MONDE 3 — VOLCAN (10 niveaux). Lave mortelle, plateformes qui s'effondrent, geysers de feu,
// chutes de pierres, ascenseurs de pierre. Plus exigeant que la Neige : le rythme et le timing comptent.
import { walls, bounds, floor, basin, hoopAt } from './common.js';

const lava = (x0, x1) => ({ x: x0, y: -0.4, w: x1 - x0 });

const V1 = {
  id: 'volcano-1',
  difficulty: 'hard',
  number: 1,
  nameKey: 'level.volcano.1',
  bounds: bounds(50),
  spawn: { x: 3, y: 0 },
  solids: [...walls(50), floor(-4, 10, 'rock'), basin(10, 13), floor(13, 22, 'rock'), basin(22, 25), floor(25, 54, 'rock')],
  lava: [lava(10, 13), lava(22, 25)],
  // Une bouche de pierre crache des flammes au-dessus du deuxième bassin
  lasers: [{ x1: 25.6, y1: 2.0, x2: 21.4, y2: 2.0, period: 2.6, on: 1.3, phase: 0 }],
  stars: [{ x: 11.5, y: 3.4 }, { x: 18, y: 1.4 }, { x: 23.8, y: 3.4 }],
  hoop: hoopAt(40),
  hints: [{ x: 4.4, y: 4.3, key: 'hint.lava' }],
  passages: [
    { name: 'Premier bassin', start: [3, 0], goal: ['on', 13, 22, 0], plan: [['goTo', 9.3], ['hop', 3, 15]] },
    { name: 'Deuxième bassin (flammes)', start: [15, 0], goal: ['on', 25, 34, 0], plan: [['goTo', 21.0], ['charge', 3], ['waitCycle', 2.6, 0.15, 0.25], ['jump', 1, 27]] },
    { name: 'Roche → panier', start: [30, 0], goal: ['win'], plan: 'shot' },
  ],
};

const V2 = {
  id: 'volcano-2',
  difficulty: 'expert',
  number: 2,
  nameKey: 'level.volcano.2',
  bounds: bounds(50),
  spawn: { x: 3, y: 0 },
  solids: [...walls(50), floor(-4, 8, 'rock'), basin(8, 26), floor(26, 54, 'rock')],
  lava: [lava(8, 26)],
  crumbles: [
    { x: 10, y: 0.4, w: 1.8 },
    { x: 14, y: 0.9, w: 1.8 },
    { x: 18, y: 0.6, w: 1.8 },
    { x: 22, y: 0.9, w: 1.8 },
  ],
  // Colonne de feu qui jaillit de la lave entre deux pierres : on part au bon moment
  lasers: [{ x1: 16.9, y1: -0.4, x2: 16.9, y2: 5.5, period: 2.4, on: 1.3, phase: 0, style: 'flame' }],
  stars: [{ x: 12.9, y: 4.4 }, { x: 18.9, y: 5.6 }, { x: 24.3, y: 6.2 }],
  hoop: hoopAt(42),
  hints: [{ x: 4.2, y: 4.3, key: 'hint.crumble' }],
  passages: [
    { name: 'Pierres fragiles', start: [3, 0], goal: ['on', 26, 34, 0], plan: [['goTo', 7.3], ['charge', 3], ['waitCycle', 2.4, 0.65, 0.75], ['jump', 1, 10.9], ['jump', 1, 14.9], ['jump', 1, 18.9], ['jump', 1, 22.9], ['jump', 1, 28.5]] },
    { name: 'Roche → panier', start: [32, 0], goal: ['win'], plan: 'shot' },
  ],
};

const V3 = {
  id: 'volcano-3',
  difficulty: 'hard',
  number: 3,
  nameKey: 'level.volcano.3',
  bounds: bounds(50),
  spawn: { x: 3, y: 0 },
  // Au bout, une marche d'où dévalent les rochers de lave
  solids: [...walls(50), floor(-4, 54, 'rock'), { x: 37.6, y: 0, w: 16.4, h: 1.6, style: 'block' }],
  geysers: [
    { x: 12, y: 0, phase: 0 },
    { x: 17, y: 0, phase: 0.3 },
    { x: 22, y: 0, phase: 0.6 },
  ],
  // Rochers de lave qui dévalent vers les geysers
  boulders: [{ x1: 26.4, x2: 37, y: 0, r: 0.6, dir: -1, speed: 6, period: 2.7, phase: 0 }],
  stars: [{ x: 14.5, y: 2.2 }, { x: 19.5, y: 3.2 }, { x: 31, y: 2.6 }],
  hoop: hoopAt(46, 3.4, 1.6),
  hints: [{ x: 4.4, y: 4.3, key: 'hint.geyser' }],
  passages: [
    { name: 'Entre les geysers', start: [3, 0], goal: ['on', 24, 26, 0], plan: [['goTo', 7], ['waitCycle', 3.2, 0.93, 1.03], ['run', 1, 24.2, 26, 0], ['goTo', 25]] },
    { name: 'Rochers de lave → marche', start: [25, 0], goal: ['on', 38, 46, 1.6], plan: [['charge', 2], ['dodgeBoulders', 38.6, 3.4, 35.6]] },
    { name: 'Marche → panier', start: [39.5, 1.6], goal: ['win'], plan: 'shot' },
  ],
};

const V4 = {
  id: 'volcano-4',
  difficulty: 'expert',
  number: 4,
  nameKey: 'level.volcano.4',
  bounds: bounds(44, 15),
  spawn: { x: 3, y: 0 },
  solids: [...walls(44), floor(-4, 10, 'rock'), basin(10, 12.8), floor(12.8, 20, 'rock', 3.6), basin(20, 22.8), floor(22.8, 48, 'rock', 7)],
  lava: [lava(10, 12.8), lava(20, 22.8)],
  movers: [
    { x: 10.2, y: -0.1, w: 2.4, h: 0.35, style: 'stone', path: { dx: 0, dy: 3.6, period: 5, phase: 0 } },
    { x: 20.2, y: 3.5, w: 2.4, h: 0.35, style: 'stone', path: { dx: 0, dy: 3.4, period: 5, phase: 0.5 } },
  ],
  crushers: [{ x: 25.4, w: 2.2, top: 9.6, bottom: 7, period: 2.3, phase: 0 }],
  stars: [{ x: 11.4, y: 6.2 }, { x: 16.4, y: 5.4 }, { x: 26.5, y: 8.0 }],
  hoop: hoopAt(39, 3.4, 7),
  hints: [{ x: 4.4, y: 4.3, key: 'hint.elevator' }],
  passages: [
    { name: 'Premier ascenseur', start: [3, 0], goal: ['on', 12.8, 20, 3.6], plan: [['goTo', 8.6], ['waitMover', 'movers', 0, 'y', '<', 0.05], ['jump', 1, 11.4], ['waitMover', 'movers', 0, 'y', '>', 3.55], ['run', 1, 13, 20, 3.6]] },
    { name: 'Deuxième ascenseur', start: [16, 3.6], goal: ['on', 22.8, 24.6, 7], plan: [['goTo', 18.8], ['waitMover', 'movers', 1, 'y', '<', 0.05], ['jump', 1, 21.4], ['waitMover', 'movers', 1, 'y', '>', 3.35], ['run', 1, 23, 24.6, 7], ['goTo', 24.2]] },
    { name: 'Broyeur de pierre', start: [24.2, 7], goal: ['on', 28.2, 44, 7], plan: [['goTo', 24.2], ['waitCycle', 2.3, 2.05, 2.15], ['run', 1, 28.4, 44, 7]] },
    { name: 'Sommet → panier', start: [30.5, 7], goal: ['win'], plan: 'shot' },
  ],
};

const V5 = {
  id: 'volcano-5',
  difficulty: 'expert',
  number: 5,
  nameKey: 'level.volcano.5',
  bounds: bounds(52, 13),
  spawn: { x: 3, y: 0 },
  solids: [...walls(52), floor(-4, 30, 'rock'), basin(30, 33), floor(33, 56, 'rock')],
  lava: [lava(30, 33)],
  rockfalls: [
    { x: 10, y: 12, phase: 0 },
    { x: 14, y: 12, phase: 0.2 },
    { x: 18, y: 12, phase: 0.4 },
    { x: 22, y: 12, phase: 0.6 },
    { x: 26, y: 12, phase: 0.8 },
  ],
  maces: [{ x: 31.5, y: 8.4, len: 5.6, r: 0.6, amp: 0.8, period: 2.8, phase: 0 }],
  crushers: [{ x: 37, w: 2.4, top: 2.8, bottom: 0, period: 2.2, phase: 0 }],
  stars: [{ x: 12, y: 1.4 }, { x: 22, y: 0.7 }, { x: 31.5, y: 2.2 }],
  hoop: hoopAt(48),
  hints: [{ x: 4.6, y: 4.3, key: 'hint.rocks' }],
  passages: [
    { name: 'Sous la pluie de pierres', start: [3, 0], goal: ['on', 27, 29.6, 0], plan: [['goTo', 6], ['waitCycle', 2.8, 0.25, 0.35], ['run', 1, 27, 29.4, 0], ['goTo', 28.6]] },
    { name: 'Bassin sous le boulet', start: [28.6, 0], goal: ['on', 33, 36.4, 0], plan: [['goTo', 29.3], ['charge', 3], ['waitCycle', 2.8, 1.73, 1.83], ['jump', 1, 34.6], ['goTo', 35.6]] },
    { name: 'Broyeur', start: [35.6, 0], goal: ['on', 40.2, 52, 0], plan: [['goTo', 35.6], ['waitCycle', 2.2, 1.85, 1.95], ['run', 1, 40.4, 52, 0]] },
    { name: 'Roche → panier', start: [41, 0], goal: ['win'], plan: 'shot' },
  ],
};

const V6 = {
  id: 'volcano-6',
  difficulty: 'expert',
  number: 6,
  nameKey: 'level.volcano.6',
  bounds: bounds(50, 13.5),
  spawn: { x: 3, y: 0 },
  solids: [
    ...walls(50),
    { x: -4, y: -6, w: 12, h: 6, style: 'rock' },
    { x: 8, y: -6, w: 5, h: 4.8, style: 'rock' },            // fond du bassin de lave
    { x: 13, y: -6, w: 15.6, h: 6, style: 'rock' },
    { x: 28.6, y: -6, w: 25.4, h: 11, style: 'rock' },       // falaise (dessus à 5)
  ],
  lava: [{ x: 8, y: -0.4, w: 5 }],
  crumbles: [{ x: 9.6, y: 0.4, w: 1.8, h: 0.45 }],
  geysers: [
    { x: 17, y: 0, phase: 0 },
    { x: 21.5, y: 0, phase: 0.5 },
  ],
  movers: [{ x: 26, y: -0.1, w: 2.4, h: 0.35, style: 'stone', path: { dx: 0, dy: 5.05, period: 6, phase: 0 } }],
  rockfalls: [
    { x: 32.4, y: 12, phase: 0 },
    { x: 35.6, y: 12, phase: 0.45 },
  ],
  stars: [
    { x: 10.5, y: 2.8 },
    { x: 19.25, y: 2.6 },
    { x: 34, y: 6.4 },
  ],
  // Colonne de feu au bord de la falaise
  lasers: [{ x1: 39.4, y1: 5, x2: 39.4, y2: 10, period: 2.4, on: 1.3, phase: 0, style: 'flame' }],
  hoop: { x: 46.5, y: 8.4, facing: -1, mount: 'pole', floorY: 5 },
  passages: [
    { name: 'Départ → au-delà de la lave', start: [3, 0], goal: ['on', 13, 26, 0], plan: [['goTo', 7.3], ['hop', 2, 10.5], ['jump', 1]] },
    { name: 'Geysers → ascenseur → falaise', start: [14, 0], goal: ['on', 28.6, 50, 5], plan: [['waitCycle', 3.2, 0.98, 1.08], ['goTo', 24.5], ['waitMover', 'movers', 0, 'y', '<', 0.03], ['jump', 1, 27.2], ['waitMover', 'movers', 0, 'y', '>', 4.95], ['run', 1, 28.8, 50, 5]] },
    { name: 'Chute de pierres → après les pierres', start: [29.5, 5], goal: ['on', 37, 38.6, 5], plan: [['waitCycle', 2.8, 0.43, 0.53], ['run', 1, 37.2, 38.6, 5], ['goTo', 37.8]] },
    { name: 'Colonne de feu', start: [37.8, 5], goal: ['on', 40.4, 50, 5], plan: [['goTo', 37.8], ['waitCycle', 2.4, 0.2, 0.3], ['run', 1, 40.6, 50, 5]] },
    { name: 'Falaise → panier', start: [41, 5], goal: ['win'], plan: 'shot' },
  ],
};


const V7 = {
  id: 'volcano-7',
  difficulty: 'expert',
  number: 7,
  nameKey: 'level.volcano.7',
  bounds: bounds(54),
  spawn: { x: 3, y: 0 },
  solids: [...walls(54), floor(-4, 8, 'rock'), basin(8, 22), floor(22, 30, 'rock'), basin(30, 33), floor(33, 58, 'rock'), { x: 41.6, y: 0, w: 12.4, h: 1.6, style: 'block' }],
  lava: [lava(8, 22), lava(30, 33)],
  // Les rochers de lave dévalent de la marche et finissent dans le bassin
  boulders: [{ x1: 31, x2: 41, y: 0, r: 0.6, dir: -1, speed: 6.5, period: 2.6, phase: 0.2 }],
  crumbles: [
    { x: 9.6, y: 0.5, w: 1.8 },
    { x: 13.4, y: 0.5, w: 1.8 },
    { x: 17.2, y: 0.5, w: 1.8 },
  ],
  geysers: [
    { x: 24, y: 0, phase: 0 },
    { x: 27, y: 0, phase: 0.45 },
  ],
  cannons: [{ x: 31.5, y: -0.9, angle: Math.PI / 2, speed: 7, period: 2.6, phase: 0, size: 0.32 }],
  stars: [{ x: 12.3, y: 4.2 }, { x: 25.5, y: 3.2 }, { x: 31.5, y: 4.2 }],
  hoop: hoopAt(49, 3.4, 1.6),
  passages: [
    { name: 'Gué de pierres fragiles', start: [3, 0], goal: ['on', 22, 23.4, 0], plan: [['goTo', 7.3], ['hop', 2, 10.5], ['jump', 1, 14.3], ['jump', 1, 18.1], ['jump', 1, 22.7], ['goTo', 22.6]] },
    { name: 'Deux geysers', start: [22.6, 0], goal: ['on', 28, 29.6, 0], plan: [['waitCycle', 3.2, 1.38, 1.48], ['run', 1, 28.2, 29.6, 0], ['goTo', 28.8]] },
    { name: 'Bassin, boules de feu et rochers', start: [28.8, 0], goal: ['on', 42, 54, 1.6], plan: [['charge', 3], ['waitCycle', 2.6, 1.65, 1.75], ['jump', 1, 34.8], ['dodgeBoulders', 42.6, 3.4, 39.6]] },
    { name: 'Marche → panier', start: [43, 1.6], goal: ['win'], plan: 'shot' },
  ],
};

const V8 = {
  id: 'volcano-8',
  difficulty: 'hard',
  number: 8,
  nameKey: 'level.volcano.8',
  bounds: bounds(58, 13.5),
  spawn: { x: 4, y: 0 },
  solids: [...walls(58), floor(-4, 8, 'rock'), basin(8, 20), floor(20, 34, 'rock'), basin(34, 36.8), floor(36.8, 62, 'rock', 4.0)],
  lava: [lava(8, 20), lava(34, 36.8)],
  movers: [
    { x: 8.2, y: -0.5, w: 3.2, h: 0.5, style: 'stone', path: { dx: 8.6, dy: 0, period: 5.4, phase: 0 } },
    { x: 34.2, y: -0.1, w: 2.4, h: 0.35, style: 'stone', path: { dx: 0, dy: 4.0, period: 5, phase: 0 } },
  ],
  rockfalls: [
    { x: 27, y: 12, phase: 0 },
    { x: 30.5, y: 12, phase: 0.5 },
  ],
  // Jet de flammes au ras du plateau : on le saute ou on attend qu'il s'éteigne
  lasers: [{ x1: 44.6, y1: 4.5, x2: 41, y2: 4.5, period: 2.2, on: 1.0, phase: 0 }],
  stars: [{ x: 14, y: 2.6 }, { x: 28.7, y: 1.4 }, { x: 42.5, y: 6.4 }],
  hoop: hoopAt(52, 3.4, 4),
  passages: [
    { name: 'Radeau de pierre', start: [4, 0], goal: ['on', 20, 25.6, 0], plan: [['ride', 0, 25], ['goTo', 23]] },
    { name: 'Chute de pierres', start: [23, 0], goal: ['on', 32, 33.6, 0], plan: [['waitCycle', 2.8, 0.48, 0.58], ['run', 1, 32, 33.6, 0], ['goTo', 32.8]] },
    { name: 'Ascenseur → plateau', start: [32.8, 0], goal: ['on', 36.8, 38.8, 4], plan: [['waitMover', 'movers', 1, 'y', '<', 0.05], ['jump', 1, 35.4], ['waitMover', 'movers', 1, 'y', '>', 3.95], ['run', 1, 37, 38.8, 4], ['goTo', 38]] },
    { name: 'Jet de flammes', start: [38, 4], goal: ['on', 46.4, 58, 4], plan: [['goTo', 38], ['waitCycle', 2.2, 2.05, 2.15], ['run', 1, 46.6, 58, 4]] },
    { name: 'Plateau → panier', start: [46.8, 4], goal: ['win'], plan: 'shot' },
  ],
};

const V9 = {
  id: 'volcano-9',
  difficulty: 'expert',
  number: 9,
  nameKey: 'level.volcano.9',
  bounds: bounds(52, 12),
  spawn: { x: 3, y: 0 },
  solids: [...walls(52), floor(-4, 9, 'rock'), basin(9, 14.6), floor(14.6, 23, 'rock'), basin(23, 29.4), floor(29.4, 56, 'rock'), { x: 41.6, y: 0, w: 12.4, h: 1.6, style: 'block' }],
  boulders: [{ x1: 35.4, x2: 41, y: 0, r: 0.55, dir: -1, speed: 6, period: 2.2, phase: 0 }],
  lava: [lava(9, 14.6), lava(23, 29.4)],
  trampolines: [{ x: 6.4, y: 0, w: 1.6 }, { x: 21.4, y: 0, w: 1.6 }],
  geysers: [{ x: 19.6, y: 0, phase: 0 }],
  cannons: [{ x: 33.5, y: -0.3, angle: Math.PI / 2, speed: 8, period: 3.2, phase: 0.5, size: 0.32 }],
  checkpoints: [{ x: 16.4, y: 0 }],
  stars: [{ x: 11, y: 6.4 }, { x: 19.6, y: 3.6 }, { x: 26.6, y: 6.6 }],
  hoop: hoopAt(48.5, 3.4, 1.6),
  passages: [
    { name: 'Trampoline au-dessus de la lave', start: [3, 0], goal: ['on', 14.6, 18.6, 0], plan: [['run', 1, 14.8, 18.6, 0], ['goTo', 16.4]] },
    { name: 'Geyser → trampoline → lave', start: [16.4, 0], goal: ['on', 29.4, 38, 0], plan: [['waitCycle', 3.2, 0.70, 0.80], ['run', 1, 29.6, 38, 0]] },
    { name: 'Colonne de feu', start: [31, 0], goal: ['on', 34.4, 35.2, 0], plan: [['goTo', 31.6], ['waitCycle', 3.2, 2.2, 2.3], ['run', 1, 34.6, 35.2, 0]] },
    { name: 'Rochers de lave → marche', start: [34.8, 0], goal: ['on', 42, 54, 1.6], plan: [['charge', 2], ['dodgeBoulders', 42.6, 3.2, 39.8]] },
    { name: 'Marche → panier', start: [43, 1.6], goal: ['win'], plan: 'shot' },
  ],
};

const V10 = {
  id: 'volcano-10',
  difficulty: 'extreme',
  number: 10,
  nameKey: 'level.volcano.10',
  bounds: bounds(90, 13),
  spawn: { x: 3, y: 0 },
  solids: [
    ...walls(90),
    floor(-4, 8, 'rock'), basin(8, 11), floor(11, 18, 'rock'), basin(18, 30), floor(30, 38, 'rock'), basin(38, 40.8),
    floor(40.8, 64, 'rock', 4.2), floor(64, 66, 'rock'), basin(66, 69), floor(69, 94, 'rock'),
  ],
  lava: [lava(8, 11), lava(18, 30), lava(38, 40.8), lava(66, 69)],
  geysers: [
    { x: 14, y: 0, phase: 0 },
    { x: 47, y: 4.2, phase: 0 },
    { x: 51, y: 4.2, phase: 0.5 },
  ],
  crumbles: [
    { x: 19.6, y: 0.5, w: 1.6 },
    { x: 23.2, y: 0.5, w: 1.6 },
    { x: 26.8, y: 0.5, w: 1.6 },
  ],
  rockfalls: [
    { x: 33, y: 12, phase: 0 },
    { x: 35.4, y: 12, phase: 0.5 },
  ],
  movers: [{ x: 38.2, y: -0.1, w: 2.4, h: 0.35, style: 'stone', path: { dx: 0, dy: 4.2, period: 5, phase: 0 } }],
  maces: [{ x: 49, y: 10.4, len: 5, r: 0.55, amp: 0.6, period: 3.2, phase: 0.25 }],
  // Final : broyeur de pierre puis jet de flammes devant le panier
  crushers: [{ x: 72.6, w: 2.4, top: 2.8, bottom: 0, period: 2.4, phase: 0 }],
  lasers: [{ x1: 80.6, y1: 0.55, x2: 77.6, y2: 0.55, period: 2.0, on: 1.0, phase: 0.3 }],
  checkpoints: [{ x: 31.4, y: 0 }, { x: 42, y: 4.2 }, { x: 70.2, y: 0 }],
  stars: [{ x: 9.5, y: 3.4 }, { x: 25.6, y: 4.6 }, { x: 49, y: 6.0 }],
  hoop: hoopAt(85),
  passages: [
    { name: 'Premier bassin', start: [3, 0], goal: ['on', 11, 13, 0], plan: [['goTo', 7.3], ['hop', 3, 12.2], ['goTo', 12.2]] },
    { name: 'Geyser', start: [12.2, 0], goal: ['on', 15, 17.8, 0], plan: [['waitCycle', 3.2, 0.78, 0.88], ['run', 1, 15.2, 17.8, 0], ['goTo', 16.8]] },
    { name: 'Gué de pierres fragiles', start: [16.8, 0], goal: ['on', 30, 32, 0], plan: [['hop', 3, 20.4], ['jump', 1, 24], ['jump', 1, 27.6], ['jump', 1, 31], ['goTo', 31]] },
    { name: 'Chute de pierres', start: [31, 0], goal: ['on', 36.4, 37.8, 0], plan: [['waitCycle', 2.8, 0.60, 0.70], ['run', 1, 36.4, 37.8, 0], ['goTo', 37.2]] },
    { name: 'Ascenseur', start: [37.2, 0], goal: ['on', 40.8, 44, 4.2], plan: [['waitMover', 'movers', 0, 'y', '<', 0.05], ['jump', 1, 39.4], ['waitMover', 'movers', 0, 'y', '>', 4.15], ['run', 1, 41, 44, 4.2], ['goTo', 42.5]] },
    { name: 'Geysers du plateau', start: [42.5, 4.2], goal: ['on', 52, 62, 4.2], plan: [['waitCycle', 3.2, 0.80, 0.90], ['run', 1, 52.2, 62, 4.2], ['goTo', 56]] },
    { name: 'Saut final au-dessus de la lave', start: [56, 4.2], goal: ['on', 69, 72.2, 0], plan: [['goTo', 63.2], ['hop', 4, 70.8], ['goTo', 71.4]] },
    { name: 'Broyeur', start: [71.4, 0], goal: ['on', 75.6, 76.9, 0], plan: [['goTo', 71.4], ['waitCycle', 2.4, 2.1, 2.2], ['run', 1, 75.6, 76.9, 0], ['goTo', 76.2]] },
    { name: 'Jet de flammes', start: [76.2, 0], goal: ['on', 81.2, 90, 0], plan: [['goTo', 76.2], ['waitCycle', 2.0, 1.35, 1.45], ['run', 1, 81.4, 90, 0]] },
    { name: 'Roche → panier', start: [81.4, 0], goal: ['win'], plan: 'shot' },
  ],
};

export const VOLCANO_LEVELS = [V1, V2, V3, V4, V5, V6, V7, V8, V9, V10];
