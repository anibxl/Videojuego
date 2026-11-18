// MONDE 3 — VOLCAN (10 niveaux). Lave mortelle, plateformes qui s'effondrent, geysers de feu,
// chutes de pierres, ascenseurs de pierre. Plus exigeant que la Neige : le rythme et le timing comptent.
import { walls, bounds, floor, basin, hoopAt } from './common.js';

const lava = (x0, x1) => ({ x: x0, y: -0.4, w: x1 - x0 });

const V1 = {
  id: 'volcano-1',
  number: 1,
  nameKey: 'level.volcano.1',
  bounds: bounds(50),
  spawn: { x: 3, y: 0 },
  solids: [...walls(50), floor(-4, 10, 'rock'), basin(10, 13), floor(13, 22, 'rock'), basin(22, 25), floor(25, 54, 'rock')],
  lava: [lava(10, 13), lava(22, 25)],
  stars: [{ x: 11.5, y: 3.4 }, { x: 18, y: 1.4 }, { x: 23.8, y: 3.6 }],
  hoop: hoopAt(40),
  hints: [{ x: 4.4, y: 4.3, key: 'hint.lava' }],
  passages: [
    { name: 'Premier bassin', start: [3, 0], goal: ['on', 13, 22, 0], plan: [['goTo', 9.3], ['hop', 3, 15]] },
    { name: 'Deuxième bassin', start: [15, 0], goal: ['on', 25, 34, 0], plan: [['goTo', 21.3], ['hop', 3, 27]] },
    { name: 'Roche → panier', start: [30, 0], goal: ['win'], plan: 'shot' },
  ],
};

const V2 = {
  id: 'volcano-2',
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
  stars: [{ x: 12.9, y: 4.4 }, { x: 18.9, y: 5.6 }, { x: 24.3, y: 6.2 }],
  hoop: hoopAt(42),
  hints: [{ x: 4.2, y: 4.3, key: 'hint.crumble' }],
  passages: [
    { name: 'Pierres fragiles', start: [3, 0], goal: ['on', 26, 34, 0], plan: [['goTo', 7.3], ['hop', 3, 10.9], ['jump', 1, 14.9], ['jump', 1, 18.9], ['jump', 1, 22.9], ['jump', 1, 28.5]] },
    { name: 'Roche → panier', start: [32, 0], goal: ['win'], plan: 'shot' },
  ],
};

const V3 = {
  id: 'volcano-3',
  number: 3,
  nameKey: 'level.volcano.3',
  bounds: bounds(50),
  spawn: { x: 3, y: 0 },
  solids: [...walls(50), floor(-4, 54, 'rock')],
  geysers: [
    { x: 12, y: 0, phase: 0 },
    { x: 17, y: 0, phase: 0.3 },
    { x: 22, y: 0, phase: 0.6 },
  ],
  stars: [{ x: 14.5, y: 2.2 }, { x: 19.5, y: 3.2 }, { x: 24.5, y: 2.2 }],
  hoop: hoopAt(43),
  hints: [{ x: 4.4, y: 4.3, key: 'hint.geyser' }],
  passages: [
    { name: 'Entre les geysers', start: [3, 0], goal: ['on', 26, 34, 0], plan: [['goTo', 7], ['waitCycle', 3.2, 0.93, 1.03], ['run', 1, 26.2, 34, 0]] },
    { name: 'Roche → panier', start: [34, 0], goal: ['win'], plan: 'shot' },
  ],
};

const V4 = {
  id: 'volcano-4',
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
  stars: [{ x: 11.4, y: 6.2 }, { x: 16.4, y: 5.4 }, { x: 21.4, y: 9.8 }],
  hoop: hoopAt(35, 3.4, 7),
  hints: [{ x: 4.4, y: 4.3, key: 'hint.elevator' }],
  passages: [
    { name: 'Premier ascenseur', start: [3, 0], goal: ['on', 12.8, 20, 3.6], plan: [['goTo', 8.6], ['waitMover', 'movers', 0, 'y', '<', 0.05], ['jump', 1, 11.4], ['waitMover', 'movers', 0, 'y', '>', 3.55], ['run', 1, 13, 20, 3.6]] },
    { name: 'Deuxième ascenseur', start: [16, 3.6], goal: ['on', 22.8, 44, 7], plan: [['goTo', 18.8], ['waitMover', 'movers', 1, 'y', '<', 0.05], ['jump', 1, 21.4], ['waitMover', 'movers', 1, 'y', '>', 3.35], ['run', 1, 23, 44, 7]] },
    { name: 'Sommet → panier', start: [25.5, 7], goal: ['win'], plan: 'shot' },
  ],
};

const V5 = {
  id: 'volcano-5',
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
  stars: [{ x: 12, y: 1.4 }, { x: 20, y: 1.4 }, { x: 31.5, y: 3.6 }],
  hoop: hoopAt(45),
  hints: [{ x: 4.6, y: 4.3, key: 'hint.rocks' }],
  passages: [
    { name: 'Sous la pluie de pierres', start: [3, 0], goal: ['on', 27, 29.6, 0], plan: [['goTo', 6], ['waitCycle', 2.8, 0.25, 0.35], ['run', 1, 27, 29.4, 0], ['goTo', 28.6]] },
    { name: 'Bassin', start: [28.6, 0], goal: ['on', 33, 40, 0], plan: [['goTo', 29.3], ['hop', 3, 35]] },
    { name: 'Roche → panier', start: [37, 0], goal: ['win'], plan: 'shot' },
  ],
};

const V6 = {
  id: 'volcano-6',
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
  hoop: { x: 44, y: 8.4, facing: -1, mount: 'pole', floorY: 5 },
  passages: [
    { name: 'Départ → au-delà de la lave', start: [3, 0], goal: ['on', 13, 26, 0], plan: [['goTo', 7.3], ['hop', 2, 10.5], ['jump', 1]] },
    { name: 'Geysers → ascenseur → falaise', start: [14, 0], goal: ['on', 28.6, 50, 5], plan: [['waitCycle', 3.2, 0.98, 1.08], ['goTo', 24.5], ['waitMover', 'movers', 0, 'y', '<', 0.03], ['jump', 1, 27.2], ['waitMover', 'movers', 0, 'y', '>', 4.95], ['run', 1, 28.8, 50, 5]] },
    { name: 'Chute de pierres → après les pierres', start: [29.5, 5], goal: ['on', 37, 50, 5], plan: [['waitCycle', 2.8, 0.43, 0.53], ['run', 1, 37.2, 50, 5]] },
    { name: 'Falaise → panier', start: [37.5, 5], goal: ['win'], plan: 'shot' },
  ],
};


const V7 = {
  id: 'volcano-7',
  number: 7,
  nameKey: 'level.volcano.7',
  bounds: bounds(54),
  spawn: { x: 3, y: 0 },
  solids: [...walls(54), floor(-4, 8, 'rock'), basin(8, 22), floor(22, 30, 'rock'), basin(30, 33), floor(33, 58, 'rock')],
  lava: [lava(8, 22), lava(30, 33)],
  crumbles: [
    { x: 9.6, y: 0.5, w: 1.8 },
    { x: 13.4, y: 0.5, w: 1.8 },
    { x: 17.2, y: 0.5, w: 1.8 },
  ],
  geysers: [
    { x: 24, y: 0, phase: 0 },
    { x: 27, y: 0, phase: 0.45 },
  ],
  stars: [{ x: 12.3, y: 4.2 }, { x: 25.5, y: 3.2 }, { x: 31.5, y: 3.6 }],
  hoop: hoopAt(46),
  passages: [
    { name: 'Gué de pierres fragiles', start: [3, 0], goal: ['on', 22, 23.4, 0], plan: [['goTo', 7.3], ['hop', 2, 10.5], ['jump', 1, 14.3], ['jump', 1, 18.1], ['jump', 1, 22.7], ['goTo', 22.6]] },
    { name: 'Deux geysers', start: [22.6, 0], goal: ['on', 28, 29.6, 0], plan: [['waitCycle', 3.2, 1.38, 1.48], ['run', 1, 28.2, 29.6, 0], ['goTo', 28.8]] },
    { name: 'Dernier bassin', start: [28.8, 0], goal: ['on', 33, 42, 0], plan: [['hop', 3, 34.8]] },
    { name: 'Roche → panier', start: [38, 0], goal: ['win'], plan: 'shot' },
  ],
};

const V8 = {
  id: 'volcano-8',
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
  stars: [{ x: 14, y: 2.6 }, { x: 28.7, y: 1.4 }, { x: 35.4, y: 6.6 }],
  hoop: hoopAt(49, 3.4, 4),
  passages: [
    { name: 'Radeau de pierre', start: [4, 0], goal: ['on', 20, 25.6, 0], plan: [['ride', 0, 25], ['goTo', 23]] },
    { name: 'Chute de pierres', start: [23, 0], goal: ['on', 32, 33.6, 0], plan: [['waitCycle', 2.8, 0.48, 0.58], ['run', 1, 32, 33.6, 0], ['goTo', 32.8]] },
    { name: 'Ascenseur → plateau', start: [32.8, 0], goal: ['on', 36.8, 58, 4], plan: [['waitMover', 'movers', 1, 'y', '<', 0.05], ['jump', 1, 35.4], ['waitMover', 'movers', 1, 'y', '>', 3.95], ['run', 1, 37, 58, 4]] },
    { name: 'Plateau → panier', start: [40, 4], goal: ['win'], plan: 'shot' },
  ],
};

const V9 = {
  id: 'volcano-9',
  number: 9,
  nameKey: 'level.volcano.9',
  bounds: bounds(52, 12),
  spawn: { x: 3, y: 0 },
  solids: [...walls(52), floor(-4, 9, 'rock'), basin(9, 14.6), floor(14.6, 23, 'rock'), basin(23, 29.4), floor(29.4, 56, 'rock')],
  lava: [lava(9, 14.6), lava(23, 29.4)],
  trampolines: [{ x: 6.4, y: 0, w: 1.6 }, { x: 21.4, y: 0, w: 1.6 }],
  geysers: [{ x: 19.6, y: 0, phase: 0 }],
  stars: [{ x: 11, y: 6.4 }, { x: 19.6, y: 4.8 }, { x: 26.6, y: 6.6 }],
  hoop: hoopAt(44),
  passages: [
    { name: 'Trampoline au-dessus de la lave', start: [3, 0], goal: ['on', 14.6, 18.6, 0], plan: [['run', 1, 14.8, 18.6, 0], ['goTo', 16.4]] },
    { name: 'Geyser → trampoline → lave', start: [16.4, 0], goal: ['on', 29.4, 38, 0], plan: [['waitCycle', 3.2, 0.70, 0.80], ['run', 1, 29.6, 38, 0]] },
    { name: 'Roche → panier', start: [35, 0], goal: ['win'], plan: 'shot' },
  ],
};

const V10 = {
  id: 'volcano-10',
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
  stars: [{ x: 9.5, y: 3.4 }, { x: 25.6, y: 4.6 }, { x: 49, y: 6.2 }],
  hoop: hoopAt(82),
  passages: [
    { name: 'Premier bassin', start: [3, 0], goal: ['on', 11, 13, 0], plan: [['goTo', 7.3], ['hop', 3, 12.2], ['goTo', 12.2]] },
    { name: 'Geyser', start: [12.2, 0], goal: ['on', 15, 17.8, 0], plan: [['waitCycle', 3.2, 0.78, 0.88], ['run', 1, 15.2, 17.8, 0], ['goTo', 16.8]] },
    { name: 'Gué de pierres fragiles', start: [16.8, 0], goal: ['on', 30, 32, 0], plan: [['hop', 3, 20.4], ['jump', 1, 24], ['jump', 1, 27.6], ['jump', 1, 31], ['goTo', 31]] },
    { name: 'Chute de pierres', start: [31, 0], goal: ['on', 36.4, 37.8, 0], plan: [['waitCycle', 2.8, 0.60, 0.70], ['run', 1, 36.4, 37.8, 0], ['goTo', 37.2]] },
    { name: 'Ascenseur', start: [37.2, 0], goal: ['on', 40.8, 44, 4.2], plan: [['waitMover', 'movers', 0, 'y', '<', 0.05], ['jump', 1, 39.4], ['waitMover', 'movers', 0, 'y', '>', 4.15], ['run', 1, 41, 44, 4.2], ['goTo', 42.5]] },
    { name: 'Geysers du plateau', start: [42.5, 4.2], goal: ['on', 52, 62, 4.2], plan: [['waitCycle', 3.2, 0.80, 0.90], ['run', 1, 52.2, 62, 4.2], ['goTo', 56]] },
    { name: 'Saut final au-dessus de la lave', start: [56, 4.2], goal: ['on', 69, 80, 0], plan: [['goTo', 63.2], ['hop', 4, 71.6]] },
    { name: 'Roche → panier', start: [72, 0], goal: ['win'], plan: 'shot' },
  ],
};

export const VOLCANO_LEVELS = [V1, V2, V3, V4, V5, V6, V7, V8, V9, V10];
