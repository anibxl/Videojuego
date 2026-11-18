// MONDE 4 — FORÊT (10 niveaux). Lianes, plateformes en bois, champignons rebondissants, troncs qui
// roulent, branches qui bougent, rivière. Plus exigeant que le Volcan : on enchaîne des mouvements en l'air.
import { walls, bounds, floor, basin, hoopAt } from './common.js';

const water = (x0, x1) => ({ x: x0, y: -0.5, w: x1 - x0 });

const F1 = {
  id: 'forest-1',
  difficulty: 'easy',
  number: 1,
  nameKey: 'level.forest.1',
  bounds: bounds(50, 14),
  spawn: { x: 3, y: 0 },
  solids: [...walls(50), floor(-4, 54, 'ground'), { x: 13, y: 0, w: 6, h: 4, style: 'wood' }, { x: 21, y: 0, w: 1.4, h: 9, style: 'block' }],
  mushrooms: [{ x: 9, y: 1.0, w: 1.8, height: 6 }, { x: 16.6, y: 4.9, w: 1.8, height: 6.5, base: 4 }],
  // Tronc-marteau : il s'abat d'un coup dans la clairière
  crushers: [{ x: 26.6, w: 2.4, top: 3.0, bottom: 0, period: 2.4, phase: 0 }],
  stars: [{ x: 9.9, y: 6.4 }, { x: 17.5, y: 10.4 }, { x: 27.8, y: 1.2 }],
  hoop: hoopAt(42),
  hints: [{ x: 4.4, y: 4.3, key: 'hint.mushroom' }],
  passages: [
    { name: 'Champignon → souche', start: [3, 0], goal: ['on', 13, 19, 4], plan: [['goTo', 7.2], ['hop', 2, 9.9], ['fly', 15]] },
    { name: 'Champignon → par-dessus le grand mur', start: [14.2, 4], goal: ['on', 22.4, 26, 0], plan: [['hop', 2, 17.5], ['fly', 24], ['goTo', 25]] },
    { name: 'Sous le tronc-marteau', start: [25, 0], goal: ['on', 29.8, 40, 0], plan: [['goTo', 25.2], ['waitCycle', 2.4, 2.15, 2.25], ['run', 1, 30, 40, 0]] },
    { name: 'Clairière → panier', start: [32, 0], goal: ['win'], plan: 'shot' },
  ],
};

const F2 = {
  id: 'forest-2',
  difficulty: 'medium',
  number: 2,
  nameKey: 'level.forest.2',
  bounds: bounds(54),
  spawn: { x: 3, y: 0 },
  solids: [...walls(54), floor(-4, 22, 'ground'), basin(22, 32, 'ground'), floor(32, 58, 'ground')],
  water: [water(22, 32)],
  planks: [{ x1: 21.6, x2: 24.6, y: 2.0, style: 'wood' }],
  // Planche magique qui apparaît et disparaît au-dessus de la rivière
  blinkers: [{ x: 26.8, y: 2.6, w: 3.2, h: 0.4, period: 2.6, on: 1.4, phase: 0 }],
  logs: [{ x: 12, y: 0.6, r: 0.6, path: { dx: 5, dy: 0, period: 5, phase: 0 } }],
  stars: [{ x: 14.5, y: 3.2 }, { x: 25.7, y: 4.4 }, { x: 31, y: 5.4 }],
  hoop: hoopAt(46),
  hints: [{ x: 4.4, y: 4.3, key: 'hint.log' }],
  passages: [
    { name: 'Par-dessus le tronc', start: [3, 0], goal: ['on', 18.2, 21.6, 0], plan: [['goTo', 9.4], ['waitMover', 'rollers', 0, 'x', '<', 0.3], ['jumpOver', 'rollers', 0], ['goTo', 19.8]] },
    { name: 'Première planche', start: [19.8, 0], goal: ['on', 21.6, 24.6, 2.0], plan: [['hop', 3, 23.1]] },
    { name: 'Planche qui clignote → rive', start: [23.1, 2.0], goal: ['on', 32, 40, 0], plan: [['charge', 3], ['waitCycle', 2.6, 2.2, 2.3], ['jump', 1, 28.4], ['jump', 1, 34]] },
    { name: 'Rive → panier', start: [36, 0], goal: ['win'], plan: 'shot' },
  ],
};

const F3 = {
  id: 'forest-3',
  difficulty: 'easy',
  number: 3,
  nameKey: 'level.forest.3',
  bounds: bounds(44, 12),
  spawn: { x: 3, y: 0 },
  solids: [...walls(44), floor(-4, 12, 'ground'), basin(12, 19, 'ground'), floor(19, 48, 'ground'), { x: 27.6, y: 0, w: 16.4, h: 1.4, style: 'wood' }],
  water: [water(12, 19)],
  vines: [{ x: 13.8, y: 9.4, len: 6.4 }],
  // Rondins qui dévalent de la souche vers la rivière
  boulders: [{ x1: 18.6, x2: 27, y: 0, r: 0.55, dir: -1, speed: 5.5, period: 2.8, phase: 0 }],
  stars: [{ x: 12.6, y: 4.6 }, { x: 16.6, y: 5.4 }, { x: 22, y: 2.4 }],
  hoop: hoopAt(38.5, 3.4, 1.4),
  hints: [{ x: 4.4, y: 4.6, key: 'hint.vine' }],
  passages: [
    { name: 'La première liane', start: [3, 0], goal: ['on', 19, 27, 0], plan: [['goTo', 10.6], ['charge', 4], ['waitCycle', 2.8, 0.7, 0.8], ['vines', 19]] },
    { name: 'Rondins → souche', start: [21, 0], goal: ['on', 28, 44, 1.4], plan: [['charge', 2], ['dodgeBoulders', 28.6, 3.2, 25.6]] },
    { name: 'Souche → panier', start: [29, 1.4], goal: ['win'], plan: 'shot' },
  ],
};

const F4 = {
  id: 'forest-4',
  difficulty: 'medium',
  number: 4,
  nameKey: 'level.forest.4',
  bounds: bounds(38, 16),
  spawn: { x: 3, y: 0 },
  solids: [...walls(38), floor(-4, 42, 'ground'), { x: 18.5, y: 0, w: 19.5, h: 7.6, style: 'wood' }],
  branches: [
    { x1: 8, x2: 10.5, y: 2.4, path: { dx: 0, dy: 1.2, period: 4, phase: 0 } },
    { x1: 11.5, x2: 14, y: 4.6, path: { dx: 1, dy: 0, period: 3.6, phase: 0.25 } },
  ],
  // La dernière branche casse dès qu'on se pose dessus
  fallers: [{ x: 15, y: 6.2, w: 2.5, h: 0.4 }],
  stars: [{ x: 9.25, y: 5.8 }, { x: 13, y: 7.4 }, { x: 16.3, y: 9.6 }],
  hoop: hoopAt(30, 3.4, 7.6),
  hints: [{ x: 4.2, y: 4.3, key: 'hint.branches' }],
  passages: [
    { name: 'De branche en branche', start: [3, 0], goal: ['on', 18.5, 38, 7.6], plan: [['goTo', 9.25], ['hopTo', 4, 'branches', 0, 1.25], ['hopTo', 2, 'branches', 1, 1.25], ['hop', 2, 16.25, 6.6], ['jump', 1, 20.5]] },
    { name: 'Cabane → panier', start: [21, 7.6], goal: ['win'], plan: 'shot' },
  ],
};

const F5 = {
  id: 'forest-5',
  difficulty: 'hard',
  number: 5,
  nameKey: 'level.forest.5',
  bounds: bounds(54, 12),
  spawn: { x: 3, y: 0 },
  solids: [...walls(54), floor(-4, 11, 'ground'), basin(11, 30, 'ground'), floor(30, 58, 'ground')],
  water: [water(11, 30)],
  vines: [{ x: 13.4, y: 9.6, len: 6.4 }, { x: 19.2, y: 9.6, len: 6.4 }, { x: 25, y: 9.6, len: 6.4 }],
  maces: [{ x: 22.1, y: 12.5, len: 4.2, r: 0.5, amp: 0.7, period: 3.2, phase: 0 }],
  stars: [{ x: 16.3, y: 5.4 }, { x: 22.1, y: 7.4 }, { x: 28, y: 5.4 }],
  hoop: hoopAt(46),
  passages: [
    { name: 'Trois lianes et un tronc à pointes', start: [3, 0], goal: ['on', 30, 40, 0], plan: [['goTo', 10.2], ['charge', 4], ['waitCycle', 3.2, 0.55, 0.65], ['vines', 30]] },
    { name: 'Rive → panier', start: [36, 0], goal: ['win'], plan: 'shot' },
  ],
};

const F6 = {
  id: 'forest-6',
  difficulty: 'medium',
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
  // Tronc-marteau sur la plateforme de la cabane
  crushers: [{ x: 43.4, w: 2.2, top: 8.4, bottom: 5.6, period: 2.3, phase: 0 }],
  hoop: { x: 50.5, y: 9.0, facing: -1, mount: 'pole', floorY: 5.6 },
  passages: [
    { name: 'Rivière : les lianes', start: [3, 0], goal: ['on', 23, 40, 0], plan: [['goTo', 10.2], ['charge', 4], ['vines', 23]] },
    { name: 'Tronc → branches → cabane', start: [24, 0], goal: ['on', 40, 42.8, 5.6], plan: [['waitMover', 'rollers', 0, 'x', '>', 4.3], ['waitMover', 'rollers', 0, 'x', '<', 1.6], ['hop', 3, 31], ['goTo', 34.7], ['charge', 4], ['jump', 0], ['hopTo', 2, 'branches', 1, 1.2], ['hop', 2, 41.6], ['goTo', 42.2]] },
    { name: 'Tronc-marteau', start: [42.2, 5.6], goal: ['on', 46.2, 54, 5.6], plan: [['goTo', 42.2], ['waitCycle', 2.3, 2.0, 2.1], ['run', 1, 46.4, 54, 5.6]] },
    { name: 'Cabane → panier', start: [46.4, 5.6], goal: ['win'], plan: 'shot' },
  ],
};


const F7 = {
  id: 'forest-7',
  difficulty: 'hard',
  number: 7,
  nameKey: 'level.forest.7',
  bounds: bounds(54, 16),
  spawn: { x: 3, y: 0 },
  solids: [...walls(54), floor(-4, 58, 'ground'), { x: 23, y: 0, w: 9, h: 3, style: 'wood' }, { x: 45, y: 0, w: 9, h: 1.4, style: 'wood' }],
  spikes: [{ x: 14, y: 0, w: 9, dir: 'up' }],
  boulders: [{ x1: 36.6, x2: 44.4, y: 0, r: 0.55, dir: -1, speed: 6, period: 2.4, phase: 0 }],
  mushrooms: [{ x: 10, y: 1.0, w: 1.8, height: 5.4 }],
  vines: [{ x: 15.6, y: 12, len: 7 }],
  maces: [{ x: 35.2, y: 6.6, len: 5.4, r: 0.55, amp: 0.8, period: 2.8, phase: 0 }],
  checkpoints: [{ x: 27.5, y: 3 }],
  stars: [{ x: 10.9, y: 6 }, { x: 18.2, y: 5.4 }, { x: 35.2, y: 2.4 }],
  hoop: hoopAt(50.5, 3.4, 1.4),
  passages: [
    { name: 'Champignon → liane → souche', start: [3, 0], goal: ['on', 23, 32, 3], plan: [['goTo', 8.2], ['hop', 2, 10.9], ['vines', 23, false]] },
    { name: 'Souche → tronc balancier → rondins → souche', start: [28.5, 3], goal: ['on', 45.4, 54, 1.4], plan: [['goTo', 30.5], ['waitCycle', 2.8, 1.2, 1.3], ['hold', 1, 38.4], ['dodgeBoulders', 45.8, 3.4, 42.8]] },
    { name: 'Souche → panier', start: [46, 1.4], goal: ['win'], plan: 'shot' },
  ],
};

const F8 = {
  id: 'forest-8',
  difficulty: 'medium',
  number: 8,
  nameKey: 'level.forest.8',
  bounds: bounds(48, 15),
  spawn: { x: 3, y: 0 },
  solids: [...walls(48), floor(-4, 10, 'ground'), basin(10, 22, 'ground'), floor(22, 52, 'ground'), { x: 34, y: 0, w: 14, h: 6.4, style: 'wood' }, { x: 42, y: 6.4, w: 6, h: 1.2, style: 'wood' }],
  // Des rondins dévalent le toit de la cabane
  boulders: [{ x1: 36.4, x2: 41.4, y: 6.4, r: 0.5, dir: -1, speed: 5.5, period: 2.3, phase: 0 }],
  water: [water(10, 22)],
  logs: [{ x: 10.7, y: -0.2, r: 0.7, path: { dx: 10.6, dy: 0, period: 7, phase: 0 } }],
  branches: [
    { x1: 26, x2: 28.5, y: 2.6, path: { dx: 0, dy: 1, period: 4, phase: 0 } },
    { x1: 30, x2: 32.5, y: 4.8, path: { dx: 1, dy: 0, period: 3.6, phase: 0.25 } },
  ],
  stars: [{ x: 16, y: 2.4 }, { x: 27.25, y: 5.8 }, { x: 33.2, y: 7.6 }],
  hoop: hoopAt(46, 3.4, 7.6),
  passages: [
    { name: 'Le tronc flottant', start: [3, 0], goal: ['on', 22, 25, 0], plan: [['goTo', 9], ['waitMover', 'rollers', 0, 'x', '<', 0.15], ['hopTo', 1, 'rollers', 0, 0], ['stayOn', 'rollers', 0, 'x', '>', 10.2], ['hop', 2, 23.5]] },
    { name: 'Branches → cabane → rondins', start: [24, 0], goal: ['on', 42, 48, 7.6], plan: [['goTo', 27.25], ['hopTo', 4, 'branches', 0, 1.25], ['hopTo', 2, 'branches', 1, 1.25], ['charge', 2], ['jump', 1, 34.8], ['goTo', 34.9], ['wait', 2], ['charge', 2], ['dodgeBoulders', 42.6, 3, 39.6]] },
    { name: 'Souche → panier', start: [42.6, 7.6], goal: ['win'], plan: 'shot' },
  ],
};

const F9 = {
  id: 'forest-9',
  difficulty: 'hard',
  number: 9,
  nameKey: 'level.forest.9',
  bounds: bounds(60, 12),
  spawn: { x: 3, y: 0 },
  solids: [...walls(60), floor(-4, 11, 'ground'), basin(11, 36, 'ground'), floor(36, 64, 'ground')],
  water: [water(11, 36)],
  vines: [{ x: 13.4, y: 9.6, len: 6.4 }, { x: 19.2, y: 9.6, len: 6.4 }, { x: 25, y: 9.6, len: 6.4 }, { x: 30.8, y: 9.6, len: 6.4 }],
  logs: [{ x: 41, y: 0.6, r: 0.6, path: { dx: 4.4, dy: 0, period: 5, phase: 0 } }],
  crushers: [{ x: 49.4, w: 2.2, top: 2.8, bottom: 0, period: 2.2, phase: 0 }],
  checkpoints: [{ x: 37.6, y: 0 }],
  stars: [{ x: 16.3, y: 5.4 }, { x: 27.9, y: 4.2 }, { x: 43.2, y: 2.4 }],
  hoop: hoopAt(58),
  passages: [
    { name: 'Quatre lianes', start: [3, 0], goal: ['on', 36, 39.6, 0], plan: [['goTo', 10.2], ['charge', 4], ['vines', 36], ['goTo', 38]] },
    { name: 'Par-dessus le tronc', start: [38, 0], goal: ['on', 46.6, 48.8, 0], plan: [['waitMover', 'rollers', 0, 'x', '<', 0.3], ['jumpOver', 'rollers', 0], ['goTo', 48]] },
    { name: 'Tronc-marteau', start: [48, 0], goal: ['on', 52.2, 60, 0], plan: [['goTo', 48.2], ['waitCycle', 2.2, 1.9, 2.0], ['run', 1, 52.4, 60, 0]] },
    { name: 'Rive → panier', start: [52.6, 0], goal: ['win'], plan: 'shot' },
  ],
};

const F10 = {
  id: 'forest-10',
  difficulty: 'hard',
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
  vines: [{ x: 16.4, y: 12, len: 7.4 }, { x: 22.2, y: 12, len: 6.8 }, { x: 28, y: 12, len: 6.4 }],
  logs: [{ x: 38, y: 0.6, r: 0.6, path: { dx: 5, dy: 0, period: 5, phase: 0 } }],
  branches: [
    { x1: 46, x2: 48.5, y: 2.6, path: { dx: 0, dy: 1.2, period: 4, phase: 0 } },
    { x1: 50, x2: 52.5, y: 4.8, path: { dx: 0.8, dy: 0, period: 3.6, phase: 0.25 } },
    { x1: 54, x2: 56.5, y: 7, path: { dx: 0, dy: 1, period: 4.4, phase: 0.5 } },
  ],
  maces: [{ x: 26.4, y: 15, len: 5.2, r: 0.5, amp: 0.55, period: 3.4, phase: 0 }],
  crushers: [{ x: 63.4, w: 2.4, top: 10.8, bottom: 8, period: 2.1, phase: 0 }],
  checkpoints: [{ x: 35.6, y: 0 }, { x: 60.6, y: 8 }],
  stars: [{ x: 6.9, y: 7.2 }, { x: 26.3, y: 7.4 }, { x: 52, y: 8 }],
  hoop: hoopAt(72, 3.4, 8),
  passages: [
    { name: 'Champignon → souche', start: [3, 0], goal: ['on', 10, 14, 4.2], plan: [['goTo', 4.2], ['hop', 2, 6.9], ['fly', 12]] },
    { name: 'Trois lianes', start: [12, 4.2], goal: ['on', 34, 37, 0], plan: [['goTo', 13.2], ['waitCycle', 3.4, 0.25, 0.35], ['charge', 2], ['vines', 34], ['goTo', 35.4]] },
    { name: 'Par-dessus le tronc', start: [35.4, 0], goal: ['on', 44, 45.6, 0], plan: [['waitMover', 'rollers', 0, 'x', '<', 0.3], ['jumpOver', 'rollers', 0], ['goTo', 44.8]] },
    { name: 'Branches → cabane', start: [44.8, 0], goal: ['on', 58, 63, 8], plan: [['hopTo', 4, 'branches', 0, 1.25], ['hopTo', 3, 'branches', 1, 1.25], ['hopTo', 3, 'branches', 2, 1.25], ['hop', 2, 60], ['goTo', 62.2]] },
    { name: 'Tronc-marteau de la cabane', start: [62.2, 8], goal: ['on', 66.4, 76, 8], plan: [['goTo', 62.2], ['waitCycle', 2.1, 1.8, 1.9], ['run', 1, 66.6, 76, 8]] },
    { name: 'Cabane → panier', start: [66.6, 8], goal: ['win'], plan: 'shot' },
  ],
};

export const FOREST_LEVELS = [F1, F2, F3, F4, F5, F6, F7, F8, F9, F10];
