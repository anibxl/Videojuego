// MONDE 4 — FORÊT (10 niveaux). Lianes, plateformes en bois, champignons rebondissants, troncs qui
// roulent, branches qui bougent, rivière. Plus exigeant que le Volcan : on enchaîne des mouvements en l'air.
import { walls, bounds, floor, basin, hoopAt } from './common.js';

const water = (x0, x1) => ({ x: x0, y: -0.5, w: x1 - x0 });

const F1 = {
  id: 'forest-1',
  number: 1,
  nameKey: 'level.forest.1',
  bounds: bounds(50, 14),
  spawn: { x: 3, y: 0 },
  solids: [...walls(50), floor(-4, 54, 'ground'), { x: 13, y: 0, w: 6, h: 4, style: 'wood' }, { x: 21, y: 0, w: 1.4, h: 9, style: 'block' }],
  mushrooms: [{ x: 9, y: 1.0, w: 1.8, height: 6 }, { x: 16.6, y: 4.9, w: 1.8, height: 6.5, base: 4 }],
  stars: [{ x: 9.9, y: 6.4 }, { x: 17.5, y: 10.4 }, { x: 25, y: 6 }],
  hoop: hoopAt(42),
  hints: [{ x: 4.4, y: 4.3, key: 'hint.mushroom' }],
  passages: [
    { name: 'Champignon → souche', start: [3, 0], goal: ['on', 13, 19, 4], plan: [['goTo', 7.2], ['hop', 2, 9.9], ['fly', 15]] },
    { name: 'Champignon → par-dessus le grand mur', start: [14.2, 4], goal: ['on', 22.4, 34, 0], plan: [['hop', 2, 17.5], ['fly', 26]] },
    { name: 'Clairière → panier', start: [32, 0], goal: ['win'], plan: 'shot' },
  ],
};

const F2 = {
  id: 'forest-2',
  number: 2,
  nameKey: 'level.forest.2',
  bounds: bounds(54),
  spawn: { x: 3, y: 0 },
  solids: [...walls(54), floor(-4, 22, 'ground'), basin(22, 32, 'ground'), floor(32, 58, 'ground')],
  water: [water(22, 32)],
  planks: [{ x1: 21.6, x2: 24.6, y: 2.0, style: 'wood' }, { x1: 26.8, x2: 30, y: 3.0, style: 'wood' }],
  logs: [{ x: 12, y: 0.6, r: 0.6, path: { dx: 5, dy: 0, period: 5, phase: 0 } }],
  stars: [{ x: 14.5, y: 3.2 }, { x: 25.7, y: 4.4 }, { x: 31, y: 5.4 }],
  hoop: hoopAt(46),
  hints: [{ x: 4.4, y: 4.3, key: 'hint.log' }],
  passages: [
    { name: 'Par-dessus le tronc', start: [3, 0], goal: ['on', 18.2, 21.6, 0], plan: [['goTo', 9.4], ['waitMover', 'rollers', 0, 'x', '<', 0.3], ['jumpOver', 'rollers', 0], ['goTo', 19.8]] },
    { name: 'Première planche', start: [19.8, 0], goal: ['on', 21.6, 24.6, 2.0], plan: [['hop', 3, 23.1]] },
    { name: 'Deuxième planche', start: [23.1, 2.0], goal: ['on', 26.8, 30, 3.0], plan: [['hop', 3, 28.4]] },
    { name: 'Planche → rive', start: [28.4, 3.0], goal: ['on', 32, 40, 0], plan: [['hop', 2, 34]] },
    { name: 'Rive → panier', start: [36, 0], goal: ['win'], plan: 'shot' },
  ],
};

const F3 = {
  id: 'forest-3',
  number: 3,
  nameKey: 'level.forest.3',
  bounds: bounds(44, 12),
  spawn: { x: 3, y: 0 },
  solids: [...walls(44), floor(-4, 12, 'ground'), basin(12, 19, 'ground'), floor(19, 48, 'ground')],
  water: [water(12, 19)],
  vines: [{ x: 13.8, y: 9.4, len: 6.4 }],
  stars: [{ x: 12.6, y: 4.6 }, { x: 16.6, y: 5.4 }, { x: 22, y: 2.4 }],
  hoop: hoopAt(37),
  hints: [{ x: 4.4, y: 4.6, key: 'hint.vine' }],
  passages: [
    { name: 'La première liane', start: [3, 0], goal: ['on', 19, 28, 0], plan: [['goTo', 10.6], ['charge', 4], ['vines', 19]] },
    { name: 'Rive → panier', start: [27, 0], goal: ['win'], plan: 'shot' },
  ],
};

const F4 = {
  id: 'forest-4',
  number: 4,
  nameKey: 'level.forest.4',
  bounds: bounds(38, 16),
  spawn: { x: 3, y: 0 },
  solids: [...walls(38), floor(-4, 42, 'ground'), { x: 18.5, y: 0, w: 19.5, h: 7.6, style: 'wood' }],
  branches: [
    { x1: 8, x2: 10.5, y: 2.4, path: { dx: 0, dy: 1.2, period: 4, phase: 0 } },
    { x1: 11.5, x2: 14, y: 4.6, path: { dx: 1, dy: 0, period: 3.6, phase: 0.25 } },
    { x1: 15, x2: 17.5, y: 6.6, path: { dx: 0, dy: 1, period: 4.4, phase: 0.5 } },
  ],
  stars: [{ x: 9.25, y: 5.8 }, { x: 13, y: 7.4 }, { x: 16.3, y: 9.6 }],
  hoop: hoopAt(30, 3.4, 7.6),
  hints: [{ x: 4.2, y: 4.3, key: 'hint.branches' }],
  passages: [
    { name: 'De branche en branche', start: [3, 0], goal: ['on', 18.5, 38, 7.6], plan: [['goTo', 9.25], ['hopTo', 4, 'branches', 0, 1.25], ['hopTo', 2, 'branches', 1, 1.25], ['hopTo', 2, 'branches', 2, 1.25], ['hop', 2, 20.5]] },
    { name: 'Cabane → panier', start: [21, 7.6], goal: ['win'], plan: 'shot' },
  ],
};

const F5 = {
  id: 'forest-5',
  number: 5,
  nameKey: 'level.forest.5',
  bounds: bounds(54, 12),
  spawn: { x: 3, y: 0 },
  solids: [...walls(54), floor(-4, 11, 'ground'), basin(11, 30, 'ground'), floor(30, 58, 'ground')],
  water: [water(11, 30)],
  vines: [{ x: 13.4, y: 9.6, len: 6.4 }, { x: 19.2, y: 9.6, len: 6.4 }, { x: 25, y: 9.6, len: 6.4 }],
  stars: [{ x: 16.3, y: 5.4 }, { x: 22.1, y: 5.4 }, { x: 28, y: 5.4 }],
  hoop: hoopAt(46),
  passages: [
    { name: 'Trois lianes', start: [3, 0], goal: ['on', 30, 40, 0], plan: [['goTo', 10.2], ['charge', 4], ['vines', 30]] },
    { name: 'Rive → panier', start: [36, 0], goal: ['win'], plan: 'shot' },
  ],
};

const F6 = {
  id: 'forest-6',
  number: 6,
  nameKey: 'level.forest.6',
  bounds: bounds(54, 14),
  spawn: { x: 2.6, y: 0 },
  solids: [
    ...walls(54),
    { x: -4, y: -6, w: 15, h: 6, style: 'ground' },
    { x: 11, y: -6, w: 12, h: 4, style: 'ground' },          // lit de la rivière (sous l'eau)
    { x: 23, y: -6, w: 35, h: 6, style: 'ground' },
    { x: 40, y: 0, w: 14, h: 5.6, style: 'wood' },           // cabane dans les arbres
  ],
  water: [{ x: 11, y: -0.5, w: 12 }],
  mushrooms: [{ x: 5.6, y: 0.9, w: 1.8, height: 7 }],
  vines: [
    { x: 13.4, y: 9.6, len: 6.4 },
    { x: 19.2, y: 9.6, len: 6.4 },
  ],
  logs: [{ x: 27, y: 0.6, r: 0.6, path: { dx: 4.4, dy: 0, period: 5, phase: 0 } }],
  branches: [
    { x1: 33.5, x2: 36, y: 2.5, path: { dx: 0, dy: 1.2, period: 4, phase: 0 } },
    { x1: 37, x2: 39.4, y: 4.4, path: { dx: 0.8, dy: 0, period: 3.5, phase: 0.25 } },
  ],
  stars: [
    { x: 6.5, y: 7.8 },
    { x: 16.3, y: 5.6 },
    { x: 29.2, y: 3.4 },
  ],
  hoop: { x: 47, y: 9.0, facing: -1, mount: 'pole', floorY: 5.6 },
  passages: [
    { name: 'Rivière : les lianes', start: [3, 0], goal: ['on', 23, 40, 0], plan: [['goTo', 10.2], ['charge', 4], ['vines', 23]] },
    { name: 'Tronc → branches → cabane', start: [24, 0], goal: ['on', 40, 54, 5.6], plan: [['waitMover', 'rollers', 0, 'x', '>', 4.3], ['waitMover', 'rollers', 0, 'x', '<', 1.6], ['hop', 3, 31], ['goTo', 34.7], ['charge', 4], ['jump', 0], ['hopTo', 2, 'branches', 1, 1.2], ['hop', 2, 42]] },
    { name: 'Cabane → panier', start: [42, 5.6], goal: ['win'], plan: 'shot' },
  ],
};


const F7 = {
  id: 'forest-7',
  number: 7,
  nameKey: 'level.forest.7',
  bounds: bounds(54, 16),
  spawn: { x: 3, y: 0 },
  solids: [...walls(54), floor(-4, 58, 'ground'), { x: 23, y: 0, w: 9, h: 3, style: 'wood' }],
  spikes: [{ x: 14, y: 0, w: 9, dir: 'up' }],
  mushrooms: [{ x: 10, y: 1.0, w: 1.8, height: 5.4 }],
  vines: [{ x: 15.6, y: 12, len: 7 }],
  stars: [{ x: 10.9, y: 6 }, { x: 18.2, y: 5.4 }, { x: 27.5, y: 5.2 }],
  hoop: hoopAt(45),
  passages: [
    { name: 'Champignon → liane → souche', start: [3, 0], goal: ['on', 23, 32, 3], plan: [['goTo', 8.2], ['hop', 2, 10.9], ['vines', 23, false]] },
    { name: 'Souche → sol', start: [26, 3], goal: ['on', 32.2, 40, 0], plan: [['run', 1, 32.4, 40, 0]] },
    { name: 'Sol → panier', start: [36, 0], goal: ['win'], plan: 'shot' },
  ],
};

const F8 = {
  id: 'forest-8',
  number: 8,
  nameKey: 'level.forest.8',
  bounds: bounds(48, 15),
  spawn: { x: 3, y: 0 },
  solids: [...walls(48), floor(-4, 10, 'ground'), basin(10, 22, 'ground'), floor(22, 52, 'ground'), { x: 34, y: 0, w: 14, h: 6.4, style: 'wood' }],
  water: [water(10, 22)],
  logs: [{ x: 10.7, y: -0.2, r: 0.7, path: { dx: 10.6, dy: 0, period: 7, phase: 0 } }],
  branches: [
    { x1: 26, x2: 28.5, y: 2.6, path: { dx: 0, dy: 1, period: 4, phase: 0 } },
    { x1: 30, x2: 32.5, y: 4.8, path: { dx: 1, dy: 0, period: 3.6, phase: 0.25 } },
  ],
  stars: [{ x: 16, y: 2.4 }, { x: 27.25, y: 5.8 }, { x: 33.2, y: 7.6 }],
  hoop: hoopAt(43, 3.4, 6.4),
  passages: [
    { name: 'Le tronc flottant', start: [3, 0], goal: ['on', 22, 25, 0], plan: [['goTo', 9], ['waitMover', 'rollers', 0, 'x', '<', 0.15], ['hopTo', 1, 'rollers', 0, 0], ['stayOn', 'rollers', 0, 'x', '>', 10.2], ['hop', 2, 23.5]] },
    { name: 'Branches → cabane', start: [24, 0], goal: ['on', 34, 48, 6.4], plan: [['goTo', 27.25], ['hopTo', 4, 'branches', 0, 1.25], ['hopTo', 2, 'branches', 1, 1.25], ['hop', 2, 36]] },
    { name: 'Cabane → panier', start: [37, 6.4], goal: ['win'], plan: 'shot' },
  ],
};

const F9 = {
  id: 'forest-9',
  number: 9,
  nameKey: 'level.forest.9',
  bounds: bounds(60, 12),
  spawn: { x: 3, y: 0 },
  solids: [...walls(60), floor(-4, 11, 'ground'), basin(11, 36, 'ground'), floor(36, 64, 'ground')],
  water: [water(11, 36)],
  vines: [{ x: 13.4, y: 9.6, len: 6.4 }, { x: 19.2, y: 9.6, len: 6.4 }, { x: 25, y: 9.6, len: 6.4 }, { x: 30.8, y: 9.6, len: 6.4 }],
  logs: [{ x: 41, y: 0.6, r: 0.6, path: { dx: 4.4, dy: 0, period: 5, phase: 0 } }],
  stars: [{ x: 16.3, y: 5.4 }, { x: 27.9, y: 5.4 }, { x: 43.2, y: 3.2 }],
  hoop: hoopAt(54),
  passages: [
    { name: 'Quatre lianes', start: [3, 0], goal: ['on', 36, 39.6, 0], plan: [['goTo', 10.2], ['charge', 4], ['vines', 36], ['goTo', 38]] },
    { name: 'Par-dessus le tronc', start: [38, 0], goal: ['on', 46.6, 50, 0], plan: [['waitMover', 'rollers', 0, 'x', '<', 0.3], ['jumpOver', 'rollers', 0], ['goTo', 48]] },
    { name: 'Rive → panier', start: [48, 0], goal: ['win'], plan: 'shot' },
  ],
};

const F10 = {
  id: 'forest-10',
  number: 10,
  nameKey: 'level.forest.10',
  bounds: bounds(76, 17),
  spawn: { x: 3, y: 0 },
  solids: [
    ...walls(76),
    floor(-4, 14, 'ground'),
    { x: 10, y: 0, w: 4, h: 4.2, style: 'wood' },
    basin(14, 34, 'ground'),
    floor(34, 80, 'ground'),
    { x: 58, y: 0, w: 18, h: 8, style: 'wood' },
  ],
  water: [water(14, 34)],
  mushrooms: [{ x: 6, y: 1.0, w: 1.8, height: 6 }],
  vines: [{ x: 16.4, y: 12, len: 6.4 }, { x: 22.2, y: 12, len: 6.4 }, { x: 28, y: 12, len: 6.4 }],
  logs: [{ x: 38, y: 0.6, r: 0.6, path: { dx: 5, dy: 0, period: 5, phase: 0 } }],
  branches: [
    { x1: 46, x2: 48.5, y: 2.6, path: { dx: 0, dy: 1.2, period: 4, phase: 0 } },
    { x1: 50, x2: 52.5, y: 4.8, path: { dx: 0.8, dy: 0, period: 3.6, phase: 0.25 } },
    { x1: 54, x2: 56.5, y: 7, path: { dx: 0, dy: 1, period: 4.4, phase: 0.5 } },
  ],
  stars: [{ x: 6.9, y: 7.2 }, { x: 26.3, y: 8 }, { x: 52, y: 8 }],
  hoop: hoopAt(70, 3.4, 8),
  passages: [
    { name: 'Champignon → souche', start: [3, 0], goal: ['on', 10, 14, 4.2], plan: [['goTo', 4.2], ['hop', 2, 6.9], ['fly', 12]] },
    { name: 'Trois lianes', start: [12, 4.2], goal: ['on', 34, 37, 0], plan: [['goTo', 13.2], ['charge', 2], ['vines', 34], ['goTo', 35.4]] },
    { name: 'Par-dessus le tronc', start: [35.4, 0], goal: ['on', 44, 45.6, 0], plan: [['waitMover', 'rollers', 0, 'x', '<', 0.3], ['jumpOver', 'rollers', 0], ['goTo', 44.8]] },
    { name: 'Branches → cabane', start: [44.8, 0], goal: ['on', 58, 76, 8], plan: [['hopTo', 4, 'branches', 0, 1.25], ['hopTo', 3, 'branches', 1, 1.25], ['hopTo', 3, 'branches', 2, 1.25], ['hop', 2, 60]] },
    { name: 'Cabane → panier', start: [61, 8], goal: ['win'], plan: 'shot' },
  ],
};

export const FOREST_LEVELS = [F1, F2, F3, F4, F5, F6, F7, F8, F9, F10];
