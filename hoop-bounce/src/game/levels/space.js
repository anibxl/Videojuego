// MONDE 5 — ESPACE (10 niveaux), le monde final. Gravité réduite (réglée dans worlds.js), astéroïdes
// mobiles, portails, plateformes flottantes, zones de gravité inversée.
import { walls, bounds, floor, hoopAt } from './common.js';

/** Plateforme flottante (mobile, style « float ») de largeur w, qui monte et descend de dy. */
const float = (x, y, w, dy, period, phase = 0) => ({ x, y, w, h: 0.5, style: 'float', path: { dx: 0, dy, period, phase } });
/** Plateforme lumineuse fixe. */
const pad = (x, top, w) => ({ x, y: top - 0.5, w, h: 0.5, style: 'block', skin: 'glow' });

const P1 = {
  id: 'space-1',
  number: 1,
  nameKey: 'level.space.1',
  bounds: bounds(60, 12),
  spawn: { x: 3, y: 0 },
  solids: [...walls(60), floor(-4, 12), floor(18, 30), floor(37, 64)],
  stars: [{ x: 15, y: 5.2 }, { x: 24, y: 2.4 }, { x: 33.5, y: 6.4 }],
  hoop: hoopAt(50),
  hints: [{ x: 4.6, y: 4.3, key: 'hint.space' }],
  passages: [
    { name: 'Premier saut lunaire', start: [3, 0], goal: ['on', 18, 30, 0], plan: [['goTo', 11.3], ['hop', 3, 20]] },
    { name: 'Grand saut', start: [21, 0], goal: ['on', 37, 46, 0], plan: [['goTo', 29.3], ['hop', 4, 39.5]] },
    { name: 'Sol → panier', start: [42, 0], goal: ['win'], plan: 'shot' },
  ],
};

const P2 = {
  id: 'space-2',
  number: 2,
  nameKey: 'level.space.2',
  bounds: bounds(58, 12),
  spawn: { x: 3, y: 0 },
  solids: [...walls(58), floor(-4, 10), floor(32, 62)],
  movers: [float(12, 1.5, 2.6, 0.6, 3.4), float(17, 3.0, 2.6, 0.6, 3.8, 0.3), float(22, 2.0, 2.6, 0.6, 3.2, 0.6), float(27, 3.4, 2.6, 0.6, 3.6, 0.1)],
  stars: [{ x: 15.6, y: 5.6 }, { x: 24.6, y: 5.8 }, { x: 30.6, y: 6.6 }],
  hoop: hoopAt(48),
  hints: [{ x: 4.4, y: 4.3, key: 'hint.floating' }],
  passages: [
    { name: 'Quatre plateformes flottantes', start: [3, 0], goal: ['on', 32, 40, 0], plan: [['goTo', 9.4], ['hopTo', 2, 'movers', 0, 1.3], ['hopTo', 2, 'movers', 1, 1.3], ['hopTo', 1, 'movers', 2, 1.3], ['hopTo', 2, 'movers', 3, 1.3], ['hop', 2, 34]] },
    { name: 'Sol → panier', start: [38, 0], goal: ['win'], plan: 'shot' },
  ],
};

const P3 = {
  id: 'space-3',
  number: 3,
  nameKey: 'level.space.3',
  bounds: bounds(60, 12),
  spawn: { x: 3, y: 0 },
  solids: [
    ...walls(60),
    floor(-4, 64),
    { x: 14, y: 0, w: 1.2, h: 16, style: 'wall' },
    { x: 25, y: 0, w: 4, h: 3.6, style: 'block', skin: 'glow' },
    { x: 30, y: 0, w: 1.2, h: 16, style: 'wall' },
  ],
  spikes: [{ x: 20, y: 0, w: 3.4, dir: 'up' }],
  teleporters: [
    { a: { x: 12, y: 0.9 }, b: { x: 17.6, y: 0.9 }, r: 0.8, twoWay: true },
    { a: { x: 28.2, y: 4.5 }, b: { x: 33.6, y: 0.9 }, r: 0.8, twoWay: true },
  ],
  stars: [{ x: 21.7, y: 4.4 }, { x: 27, y: 6.4 }, { x: 38, y: 3 }],
  hoop: hoopAt(52),
  hints: [{ x: 4.4, y: 4.3, key: 'hint.portal' }],
  passages: [
    { name: 'Premier portail', start: [3, 0], goal: ['on', 15.2, 19.6, 0], plan: [['hold', 1, 17.3], ['goTo', 18.2]] },
    { name: 'Pics → estrade', start: [18.2, 0], goal: ['on', 25, 29, 3.6], plan: [['hop', 5, 26.6, 3.6]] },
    { name: 'Portail perché', start: [26, 3.6], goal: ['x', 33], plan: [['hold', 1, 33.4]] },
    { name: 'Sol → panier', start: [38, 0], goal: ['win'], plan: 'shot' },
  ],
};

const P4 = {
  id: 'space-4',
  number: 4,
  nameKey: 'level.space.4',
  bounds: bounds(54, 12),
  spawn: { x: 3, y: 0 },
  solids: [...walls(54), floor(-4, 10), pad(13, 2, 2.5), pad(19, 3.4, 2.5), pad(25, 2.2, 2.5), floor(30, 58)],
  asteroids: [
    { x: 17.2, y: 5.5, r: 0.7, path: { dx: 0, dy: -4, period: 3.6, phase: 0 } },
    { x: 23.2, y: 6, r: 0.7, path: { dx: 0, dy: -4.4, period: 4, phase: 0.5 } },
  ],
  stars: [{ x: 14.25, y: 4.4 }, { x: 20.25, y: 6 }, { x: 28.4, y: 5 }],
  hoop: hoopAt(46),
  hints: [{ x: 4.4, y: 4.3, key: 'hint.asteroids' }],
  passages: [
    { name: 'Première plateforme', start: [3, 0], goal: ['on', 13, 15.5, 2], plan: [['goTo', 9.4], ['hop', 2, 14.25, 2]] },
    { name: 'Entre les astéroïdes (1)', start: [14.25, 2], goal: ['on', 19, 21.5, 3.4], plan: [['waitCycle', 3.6, 0.65, 0.75], ['hop', 2, 20.25]] },
    { name: 'Entre les astéroïdes (2)', start: [20.25, 3.4], goal: ['on', 25, 27.5, 2.2], plan: [['waitCycle', 4, 2.35, 2.45], ['hop', 2, 26.25]] },
    { name: 'Plateforme → sol', start: [26.25, 2.2], goal: ['on', 30, 38, 0], plan: [['hop', 2, 32]] },
    { name: 'Sol → panier', start: [36, 0], goal: ['win'], plan: 'shot' },
  ],
};

const P5 = {
  id: 'space-5',
  number: 5,
  nameKey: 'level.space.5',
  bounds: bounds(44, 12),
  spawn: { x: 3, y: 0 },
  solids: [...walls(44), floor(-4, 48), { x: 12, y: 6.4, w: 12, h: 1, style: 'block', skin: 'glow' }],
  gravityZones: [{ x: 12, y: 0, w: 12, h: 6.4 }],
  spikes: [{ x: 14.4, y: 0, w: 9.6, dir: 'up' }],
  stars: [{ x: 16, y: 5.6 }, { x: 20, y: 5.6 }, { x: 27, y: 2.6 }],
  hoop: hoopAt(37),
  hints: [{ x: 4.6, y: 4.3, key: 'hint.inverted' }],
  passages: [
    { name: 'Au plafond', start: [3, 0], goal: ['on', 24.6, 31, 0], plan: [['run', 1, 24.6, 31, 0], ['goTo', 28]] },
    { name: 'Sol → panier', start: [28, 0], goal: ['win'], plan: 'shot' },
  ],
};

const P6 = {
  id: 'space-6',
  number: 6,
  nameKey: 'level.space.6',
  bounds: bounds(62, 12),
  spawn: { x: 3, y: 0 },
  solids: [
    ...walls(62),
    { x: -4, y: -6, w: 14, h: 6, style: 'ground' },
    { x: 26, y: -6, w: 40, h: 6, style: 'ground' },
    { x: 33, y: 0, w: 1.2, h: 16, style: 'wall' },           // paroi : on passe par les portails
    { x: 40, y: 6.6, w: 8, h: 1, style: 'block' },           // plafond de la zone inversée
  ],
  movers: [
    { x: 12, y: 1.5, w: 2.6, h: 0.5, style: 'float', path: { dx: 0, dy: 0.6, period: 3.4, phase: 0 } },
    { x: 16.8, y: 3.0, w: 2.6, h: 0.5, style: 'float', path: { dx: 0, dy: 0.6, period: 3.8, phase: 0.3 } },
    { x: 21.6, y: 2.0, w: 2.6, h: 0.5, style: 'float', path: { dx: 0, dy: 0.6, period: 3.2, phase: 0.6 } },
  ],
  asteroids: [{ x: 15.4, y: 5.4, r: 0.6, path: { dx: 0, dy: -2.6, period: 4.4, phase: 0 } }],
  teleporters: [{ a: { x: 31.6, y: 0.9 }, b: { x: 35.6, y: 0.9 }, r: 0.8, twoWay: true }],
  gravityZones: [{ x: 40, y: 0, w: 8, h: 6.6 }],
  spikes: [{ x: 42.2, y: 0, w: 5.2, dir: 'up' }],
  stars: [
    { x: 18.1, y: 5.6 },
    { x: 31.6, y: 3.4 },
    { x: 44, y: 5.6 },
  ],
  hoop: { x: 56, y: 3.4, facing: -1, mount: 'pole' },
  passages: [
    { name: 'Plateformes flottantes', start: [3, 0], goal: ['on', 26, 33, 0], plan: [['goTo', 9.4], ['hopTo', 2, 'movers', 0, 1.3], ['hopTo', 2, 'movers', 1, 1.3], ['hopTo', 1, 'movers', 2, 1.3], ['hop', 2, 28]] },
    { name: 'Portails', start: [27, 0], goal: ['x', 34.5], plan: [['hold', 1, 34.6]] },
    { name: 'Gravité inversée', start: [36, 0], goal: ['on', 48, 60, 0], plan: [['run', 1, 48.2, 60, 0]] },
    { name: 'Zone inversée → panier', start: [50, 0], goal: ['win'], plan: 'shot' },
  ],
};


const P7 = {
  id: 'space-7',
  number: 7,
  nameKey: 'level.space.7',
  bounds: bounds(62, 12),
  spawn: { x: 3, y: 0 },
  solids: [...walls(62), floor(-4, 10), pad(19, 4.0, 2.5), pad(25.5, 3.0, 2.5), pad(31.5, 4.2, 2.5), floor(40, 66)],
  teleporters: [
    { a: { x: 8, y: 0.9 }, b: { x: 20.25, y: 4.9 }, r: 0.8 },
    { a: { x: 33.4, y: 5.1 }, b: { x: 44, y: 0.9 }, r: 0.8 },
  ],
  asteroids: [{ x: 23.6, y: 6, r: 0.7, path: { dx: 0, dy: -4.4, period: 4, phase: 0 } }],
  stars: [{ x: 14, y: 3 }, { x: 26.75, y: 6.2 }, { x: 38, y: 3.4 }],
  hoop: hoopAt(54),
  passages: [
    { name: 'Portail vers la plateforme', start: [3, 0], goal: ['on', 19, 21.5, 4], plan: [['hold', 1, 19.9], ['goTo', 20.3]] },
    { name: 'Sous l\'astéroïde', start: [20.3, 4], goal: ['on', 25.5, 28, 3], plan: [['waitCycle', 4, 0.9, 1.0], ['hop', 2, 26.75]] },
    { name: 'Plateforme du portail', start: [26.75, 3], goal: ['on', 31.5, 34, 4.2], plan: [['hop', 2, 32.4]] },
    { name: 'Portail vers le sol', start: [32.4, 4.2], goal: ['x', 43], plan: [['hold', 1, 43.5]] },
    { name: 'Sol → panier', start: [46, 0], goal: ['win'], plan: 'shot' },
  ],
};

const P8 = {
  id: 'space-8',
  number: 8,
  nameKey: 'level.space.8',
  bounds: bounds(66, 12),
  spawn: { x: 3, y: 0 },
  solids: [
    ...walls(66),
    floor(-4, 70),
    { x: 10, y: 6.4, w: 12, h: 1, style: 'block', skin: 'glow' },
    { x: 32, y: 6.4, w: 14, h: 1, style: 'block', skin: 'glow' },
  ],
  gravityZones: [{ x: 10, y: 0, w: 12, h: 6.4 }, { x: 32, y: 0, w: 14, h: 6.4 }],
  spikes: [
    { x: 12, y: 0, w: 10, dir: 'up' },
    { x: 34, y: 0, w: 12, dir: 'up' },
    { x: 41, y: 6.4, w: 1.6, dir: 'down' },
  ],
  stars: [{ x: 16, y: 5.6 }, { x: 41.8, y: 4.2 }, { x: 44.5, y: 5.6 }],
  hoop: hoopAt(59),
  passages: [
    { name: 'Première zone inversée', start: [3, 0], goal: ['on', 23, 31.4, 0], plan: [['run', 1, 23, 31.4, 0], ['goTo', 27]] },
    { name: 'Pics suspendus', start: [27, 0], goal: ['on', 46.5, 54, 0], plan: [['jumpAt', 1, 39.6], ['run', 1, 46.6, 54, 0], ['goTo', 50]] },
    { name: 'Sol → panier', start: [50, 0], goal: ['win'], plan: 'shot' },
  ],
};

const P9 = {
  id: 'space-9',
  number: 9,
  nameKey: 'level.space.9',
  bounds: bounds(58, 12),
  spawn: { x: 3, y: 0 },
  solids: [...walls(58), floor(-4, 9), floor(36, 62)],
  movers: [float(11, 1.1, 2.4, 0.6, 3.4), float(16, 2.9, 2.4, 0.8, 3.8, 0.3), float(21, 1.7, 2.4, 0.6, 3.2, 0.6), float(26, 3.5, 2.4, 0.6, 3.6, 0.1), float(31, 2.1, 2.4, 0.8, 3.8, 0.45)],
  asteroids: [
    { x: 14.7, y: 8.4, r: 0.6, path: { dx: 0, dy: -5, period: 4, phase: 0 } },
    { x: 24.7, y: 8.8, r: 0.6, path: { dx: 0, dy: -5.6, period: 4.6, phase: 0.5 } },
  ],
  spikes: [{ x: 38.5, y: 0, w: 2.5, dir: 'up' }],
  stars: [{ x: 17.2, y: 6 }, { x: 27.2, y: 6.6 }, { x: 39.7, y: 3.6 }],
  hoop: hoopAt(51),
  passages: [
    { name: 'Plateforme 1', start: [3, 0], goal: ['onMover', 0], plan: [['goTo', 8.4], ['hopTo', 2, 'movers', 0, 1.2]] },
    { name: 'Astéroïde 1 → plateforme 2', start: [12.2, 1.6], goal: ['onMover', 1], plan: [['waitCycle', 4, 0.5, 0.6], ['hopTo', 2, 'movers', 1, 1.2]] },
    { name: 'Plateforme 3', start: [17.2, 3.95], goal: ['onMover', 2], plan: [['hopTo', 2, 'movers', 2, 1.2]] },
    { name: 'Astéroïde 2 → plateforme 4', start: [22.2, 2.8], goal: ['onMover', 3], plan: [['waitCycle', 4.6, 1.07, 1.18], ['hopTo', 2, 'movers', 3, 1.2]] },
    { name: 'Plateforme 5', start: [27.2, 4.1], goal: ['onMover', 4], plan: [['hopTo', 2, 'movers', 4, 1.2]] },
    { name: 'Plateforme 5 → sol', start: [32.2, 3.4], goal: ['on', 36, 38.2, 0], plan: [['hop', 2, 37.2]] },
    { name: 'Pics', start: [37.2, 0], goal: ['on', 41, 48, 0], plan: [['hop', 2, 43]] },
    { name: 'Sol → panier', start: [45, 0], goal: ['win'], plan: 'shot' },
  ],
};

const P10 = {
  id: 'space-10',
  number: 10,
  nameKey: 'level.space.10',
  bounds: bounds(104, 12),
  spawn: { x: 3, y: 0 },
  solids: [
    ...walls(104),
    floor(-4, 10),
    floor(22, 64),
    { x: 34, y: 0, w: 1.2, h: 16, style: 'wall' },
    { x: 42, y: 6.4, w: 12, h: 1, style: 'block', skin: 'glow' },
    floor(82, 108),
  ],
  movers: [float(12, 1.5, 2.4, 0.6, 3.4), float(17, 3.1, 2.4, 0.6, 3.8, 0.3), float(66, 1.9, 2.4, 0.6, 3.4), float(72, 2.9, 2.4, 0.8, 3.8, 0.3), float(77, 1.7, 2.4, 0.6, 3.2, 0.6)],
  spikes: [
    { x: 25, y: 0, w: 2, dir: 'up' },
    { x: 44, y: 0, w: 10, dir: 'up' },
    { x: 50.4, y: 6.4, w: 1.4, dir: 'down' },
  ],
  teleporters: [{ a: { x: 32.6, y: 0.9 }, b: { x: 37, y: 0.9 }, r: 0.8, twoWay: true }],
  gravityZones: [{ x: 42, y: 0, w: 12, h: 6.4 }],
  asteroids: [{ x: 70.2, y: 6, r: 0.7, path: { dx: 0, dy: -4, period: 4, phase: 0 } }],
  stars: [{ x: 15.6, y: 5.4 }, { x: 51.1, y: 4.2 }, { x: 75, y: 6 }],
  hoop: hoopAt(96),
  passages: [
    { name: 'Deux plateformes flottantes', start: [3, 0], goal: ['on', 22, 24.6, 0], plan: [['goTo', 9.4], ['hopTo', 2, 'movers', 0, 1.2], ['hopTo', 2, 'movers', 1, 1.2], ['hop', 2, 23.4]] },
    { name: 'Pics', start: [23.4, 0], goal: ['on', 27.5, 32, 0], plan: [['goTo', 23.8], ['hop', 3, 29]] },
    { name: 'Portail', start: [29, 0], goal: ['on', 37, 41.6, 0], plan: [['hold', 1, 36.9], ['goTo', 39]] },
    { name: 'Zone inversée et pics suspendus', start: [39, 0], goal: ['on', 55, 63.4, 0], plan: [['jumpAt', 1, 49], ['run', 1, 55, 63.4, 0], ['goTo', 60]] },
    { name: 'Dernières plateformes', start: [60, 0], goal: ['on', 82, 90, 0], plan: [['goTo', 63.4], ['hopTo', 2, 'movers', 2, 1.2], ['hopTo', 2, 'movers', 3, 1.2], ['hopTo', 1, 'movers', 4, 1.2], ['hop', 2, 84]] },
    { name: 'Sol → panier', start: [86, 0], goal: ['win'], plan: 'shot' },
  ],
};

export const SPACE_LEVELS = [P1, P2, P3, P4, P5, P6, P7, P8, P9, P10];
