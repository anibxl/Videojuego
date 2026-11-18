// MONDE 2 — NEIGE (10 niveaux). Sol glissant, plateformes de glace, vent de neige, stalactites,
// rampes de glace, planches de bois. Plus exigeant que la Ville : on apprend à garder (ou à maîtriser)
// son élan sur la glace.
import { walls, bounds, floor, hoopAt } from './common.js';

const S1 = {
  id: 'snow-1',
  difficulty: 'easy',
  number: 1,
  nameKey: 'level.snow.1',
  bounds: bounds(48),
  spawn: { x: 3, y: 0 },
  solids: [...walls(48), floor(-4, 12, 'snow'), floor(12, 30, 'ice'), floor(30, 52, 'snow'), { x: 18, y: 0, w: 2, h: 1.0, style: 'snow' }],
  // Boule de neige : elle dévale de la bosse et traverse le lac ; on la saute sur place
  boulders: [{ x1: 20, x2: 34, y: 0, r: 0.6, dir: 1, speed: 5.5, period: 3.4, phase: 0 }],
  stars: [{ x: 13, y: 2.4 }, { x: 19, y: 3.4 }, { x: 25.5, y: 2.6 }],
  hoop: hoopAt(41),
  hints: [{ x: 5, y: 4.3, key: 'hint.ice' }, { x: 26, y: 5.2, key: 'hint.snowball', size: 0.8 }],
  passages: [
    { name: 'Neige → lac gelé → bosse', start: [3, 0], goal: ['on', 20.5, 30, 0], plan: [['goTo', 16], ['waitCycle', 3.4, 0.8, 0.9], ['hop', 2, 22.5]] },
    { name: 'Sauter la boule de neige', start: [24, 0], goal: ['on', 34.6, 48, 0], plan: [['goTo', 24], ['charge', 3], ['waitCycle', 3.4, 1.7, 1.8], ['jump', 0], ['wait', 0.5], ['run', 1, 34.8, 48, 0]] },
    { name: 'Lac → panier', start: [35, 0], goal: ['win'], plan: 'shot' },
  ],
};

const S2 = {
  id: 'snow-2',
  difficulty: 'medium',
  number: 2,
  nameKey: 'level.snow.2',
  bounds: bounds(50),
  spawn: { x: 3, y: 0 },
  solids: [
    ...walls(50),
    floor(-4, 16, 'snow'),
    { x: 6, y: 0, w: 4, h: 2.0, style: 'snow' },
    { points: [{ x: 10, y: 0 }, { x: 16, y: 0 }, { x: 10, y: 2.0 }], style: 'ice' },
    floor(16, 28, 'ice'),
    floor(32, 54, 'snow'),
  ],
  // Bloc de glace suspendu au-dessus de la réception : on choisit le moment de s'élancer
  crushers: [{ x: 33, w: 2.4, top: 2.8, bottom: 0, period: 2.6, phase: 0 }],
  stars: [{ x: 8, y: 4.0 }, { x: 30, y: 2.4 }, { x: 34.2, y: 1.2 }],
  hoop: hoopAt(45),
  hints: [{ x: 3.4, y: 4.6, key: 'hint.ramp', size: 0.8 }],
  passages: [
    { name: 'Départ → butte', start: [3, 0], goal: ['on', 6, 10, 2.0], plan: [['goTo', 4.4], ['hop', 3, 8]] },
    { name: 'Rampe → crevasse → sous le bloc', start: [8, 2.0], goal: ['on', 35.8, 54, 0], plan: [['goTo', 8.2], ['waitCycle', 2.6, 0.25, 0.35], ['jumpAt', 1, 27.0], ['run', 1, 36, 54, 0]] },
    { name: 'Neige → panier', start: [38, 0], goal: ['win'], plan: 'shot' },
  ],
};

const S3 = {
  id: 'snow-3',
  difficulty: 'easy',
  number: 3,
  nameKey: 'level.snow.3',
  bounds: bounds(52),
  spawn: { x: 3, y: 0 },
  solids: [
    ...walls(52),
    floor(-4, 8, 'snow'),
    floor(8, 34, 'ice'),
    floor(34, 56, 'snow'),
    { x: 10, y: 4.5, w: 22, h: 1, style: 'block' },
    { x: 21, y: 0, w: 1.5, h: 0.8, style: 'ice' },
  ],
  icicles: [{ x: 14, y: 4.5, len: 1.2 }, { x: 18.5, y: 4.5, len: 1.2 }, { x: 25, y: 4.5, len: 1.2 }, { x: 29.5, y: 4.5, len: 1.2 }],
  // Une boule de neige remonte le couloir sous les stalactites : impossible de s'arrêter pour l'attendre
  boulders: [{ x1: 23, x2: 34, y: 0, r: 0.55, dir: -1, speed: 5, period: 3.2, phase: 0 }],
  stars: [{ x: 16.2, y: 1.4 }, { x: 21.7, y: 2.2 }, { x: 27.3, y: 1.4 }],
  hoop: hoopAt(46),
  hints: [{ x: 4.5, y: 4.3, key: 'hint.icicles' }],
  passages: [
    { name: 'Sous les stalactites', start: [3, 0], goal: ['on', 34.5, 41, 0], plan: [['jumpAt', 1, 19.8], ['jumpBoulder', 0, 2.6], ['run', 1, 34.5, 41, 0]] },
    { name: 'Neige → panier', start: [37, 0], goal: ['win'], plan: 'shot' },
  ],
};

const S4 = {
  id: 'snow-4',
  difficulty: 'medium',
  number: 4,
  nameKey: 'level.snow.4',
  bounds: bounds(54),
  spawn: { x: 3, y: 0 },
  solids: [...walls(54), floor(-4, 12, 'snow'), floor(15, 24, 'snow'), floor(30.5, 58, 'snow')],
  winds: [
    { x: 8, y: 0, w: 12, h: 9, force: -7, gust: 2.6 },
    { x: 21, y: 0, w: 13, h: 9, force: 9, gust: 3 },
  ],
  crushers: [{ x: 18.8, w: 2, top: 2.6, bottom: 0, period: 2.9, phase: 0 }],
  stars: [{ x: 13.5, y: 4.4 }, { x: 27, y: 3.2 }, { x: 33, y: 1.4 }],
  hoop: hoopAt(46),
  hints: [{ x: 4.4, y: 4.3, key: 'hint.wind' }],
  passages: [
    { name: 'Vent de face', start: [3, 0], goal: ['on', 15, 24, 0], plan: [['goTo', 11.5], ['hop', 5, 16.6]] },
    { name: 'Vent dans le dos : la grande crevasse', start: [16.6, 0], goal: ['on', 30.5, 42, 0], plan: [['goTo', 17], ['waitCycle', 2.9, 2.75, 2.85], ['dribbleRun', 1, 3, 22.8]] },
    { name: 'Neige → panier', start: [36, 0], goal: ['win'], plan: 'shot' },
  ],
};

const S5 = {
  id: 'snow-5',
  difficulty: 'hard',
  number: 5,
  nameKey: 'level.snow.5',
  bounds: bounds(50),
  spawn: { x: 4, y: 0 },
  solids: [
    ...walls(50),
    floor(-4, 54, 'snow'),
    { x: 9, y: 1.1, w: 2.5, h: 0.5, style: 'ice' },
    { x: 13.8, y: 2.1, w: 2.2, h: 0.5, style: 'ice' },
    { x: 23, y: 2.5, w: 2, h: 0.5, style: 'ice' },
  ],
  fallers: [{ x: 18.6, y: 1.4, w: 2, h: 0.4 }],
  spikes: [{ x: 8, y: 0, w: 19, dir: 'up' }],
  // Canon à boules de neige : ses tirs traversent le chemin des plateformes
  cannons: [{ x: 30, y: 4.4, dir: -1, period: 2.2, speed: 6, phase: 0 }],
  stars: [{ x: 12.6, y: 4.0 }, { x: 17.3, y: 4.4 }, { x: 24, y: 4.8 }],
  hoop: hoopAt(42),
  hints: [{ x: 4, y: 4.3, key: 'hint.icyPlatforms' }],
  passages: [
    { name: 'Glace 1', start: [4, 0], goal: ['on', 9, 11.5, 1.6], plan: [['goTo', 7.2], ['hop', 3, 10.25]] },
    { name: 'Glace 2', start: [10.25, 1.6], goal: ['on', 13.8, 16, 2.6], plan: [['hop', 3, 14.9]] },
    { name: 'Plaque qui tombe → glace 4 (canon)', start: [14.9, 2.6], goal: ['on', 23, 25, 3.0], plan: [['charge', 3], ['waitCycle', 2.2, 1.9, 2.0], ['jump', 1, 19.6], ['jump', 1, 24]] },
    { name: 'Glace 4 → neige', start: [24, 3.0], goal: ['on', 27, 38, 0], plan: [['charge', 2], ['waitCycle', 2.2, 1.4, 1.5], ['jump', 1, 29.5]] },
    { name: 'Neige → panier', start: [33, 0], goal: ['win'], plan: 'shot' },
  ],
};

// 6 — Le grand lac : toutes les mécaniques de la neige réunies (ancien niveau de démonstration).
const S6 = {
  id: 'snow-6',
  difficulty: 'medium',
  number: 6,
  nameKey: 'level.snow.6',
  bounds: bounds(62, 11.5),
  spawn: { x: 3, y: 0 },
  solids: [
    ...walls(62),
    floor(-4, 19, 'snow'),
    floor(19, 30, 'ice'),
    floor(34, 66, 'snow'),
    { x: 9, y: 0, w: 4, h: 2.6, style: 'snow' },
    { points: [{ x: 13, y: 0 }, { x: 19, y: 0 }, { x: 13, y: 2.6 }], style: 'ice' },
    { x: 20, y: 6, w: 9, h: 1, style: 'block' },
    { x: 38, y: 1.6, w: 2.5, h: 0.5, style: 'ice' },
    { x: 42.5, y: 3.0, w: 2.5, h: 0.5, style: 'ice' },
    { x: 38.4, y: 0, w: 1.0, h: 0.8, style: 'snow' },
  ],
  icicles: [{ x: 22.5, y: 6, len: 1.3 }, { x: 26.5, y: 6, len: 1.3 }],
  winds: [{ x: 35, y: 0, w: 12, h: 9, force: -10, gust: 2.6 }],
  // Boules de neige poussées par le vent vers la crevasse : on atterrit entre deux
  boulders: [{ x1: 39.4, x2: 49.2, y: 0, r: 0.6, dir: -1, speed: 6.5, period: 2.4, phase: 0 }],
  stars: [{ x: 11, y: 4.4 }, { x: 32, y: 2.6 }, { x: 43.7, y: 4.8 }],
  hoop: hoopAt(57),
  passages: [
    { name: 'Départ → butte enneigée', start: [3, 0], goal: ['on', 9, 13, 2.6], plan: [['goTo', 7.4], ['hop', 4, 11]] },
    { name: 'Rampe → crevasse', start: [11, 2.6], goal: ['on', 34, 38.2, 0], plan: [['jumpAt', 1, 28.4], ['run', 1, 34.2, 38.2, 0]] },
    { name: 'Boules de neige', start: [36, 0], goal: ['on', 50.8, 62, 0], plan: [['goTo', 36.4], ['hop', 3, 39.2, 2.1], ['hop', 3, 43.7, 3.5], ['hop', 3, 52.5, 0]] },
    { name: 'Vent → panier', start: [51.5, 0], goal: ['win'], plan: 'shot' },
  ],
};

const S7 = {
  id: 'snow-7',
  difficulty: 'hard',
  number: 7,
  nameKey: 'level.snow.7',
  bounds: bounds(54),
  spawn: { x: 4, y: 0 },
  solids: [
    ...walls(54),
    floor(-4, 58, 'snow'),
    { x: 9.5, y: 1.5, w: 2.4, h: 0.5, style: 'ice' },
    { x: 15, y: 2.7, w: 2.4, h: 0.5, style: 'ice' },
    { x: 20.5, y: 1.7, w: 2.2, h: 0.5, style: 'ice' },
    { x: 25.5, y: 2.9, w: 2.2, h: 0.5, style: 'ice' },
  ],
  spikes: [{ x: 8, y: 0, w: 22, dir: 'up' }],
  winds: [{ x: 13, y: 0, w: 16, h: 9, force: -5, gust: 2.2 }],
  maces: [
    { x: 18, y: 10, len: 5, r: 0.5, amp: 0.55, period: 3.4, phase: 0 },
    { x: 30.2, y: 10.4, len: 5.4, r: 0.5, amp: 0.45, period: 3.0, phase: 0.5 },
  ],
  stars: [{ x: 13.4, y: 4.6 }, { x: 18.9, y: 3.6 }, { x: 28.5, y: 5.2 }],
  hoop: hoopAt(46),
  passages: [
    { name: 'Glace 1', start: [4, 0], goal: ['on', 9.5, 11.9, 2.0], plan: [['goTo', 7.3], ['hop', 3, 10.7]] },
    { name: 'Glace 2 (vent)', start: [10.7, 2.0], goal: ['on', 15, 17.4, 3.2], plan: [['hop', 4, 16.2]] },
    { name: 'Glace 3 (boulet de glace)', start: [16.2, 3.2], goal: ['on', 20.5, 22.7, 2.2], plan: [['charge', 4], ['waitCycle', 3.4, 1.57, 1.68], ['jump', 1, 21.7]] },
    { name: 'Glace 4', start: [21.6, 2.2], goal: ['on', 25.5, 27.7, 3.4], plan: [['hop', 4, 26.6]] },
    { name: 'Glace 4 → neige (second boulet)', start: [26.6, 3.4], goal: ['on', 30, 40, 0], plan: [['charge', 3], ['waitCycle', 3.0, 1.78, 1.88], ['jump', 1, 32.5]] },
    { name: 'Neige → panier', start: [36, 0], goal: ['win'], plan: 'shot' },
  ],
};

const S8 = {
  id: 'snow-8',
  difficulty: 'hard',
  number: 8,
  nameKey: 'level.snow.8',
  bounds: bounds(60),
  spawn: { x: 4, y: 0 },
  solids: [
    ...walls(60),
    floor(-4, 8, 'snow'),
    floor(20, 64, 'snow'),
    { x: 26, y: 4.8, w: 8, h: 1, style: 'block' },
  ],
  movers: [{ x: 8.2, y: -0.5, w: 3.2, h: 0.5, path: { dx: 8.6, dy: 0, period: 5.2, phase: 0 } }],
  icicles: [{ x: 28, y: 4.8, len: 1.2 }, { x: 31.5, y: 4.8, len: 1.2 }],
  spikes: [{ x: 40, y: 0, w: 2, dir: 'up' }],
  // Avalanche : deux boules de neige à la suite dévalent vers les pics
  boulders: [
    { x1: 42.4, x2: 50, y: 0, r: 0.55, dir: -1, speed: 6, period: 2.6, phase: 0 },
    { x1: 42.4, x2: 50, y: 0, r: 0.45, dir: -1, speed: 6, period: 2.6, phase: 0.3 },
  ],
  stars: [{ x: 14, y: 2.6 }, { x: 29.8, y: 1.6 }, { x: 46, y: 2.4 }],
  hoop: hoopAt(56),
  hints: [{ x: 3.6, y: 4.3, key: 'hint.wood' }],
  passages: [
    { name: 'Planche mobile', start: [4, 0], goal: ['on', 20, 26, 0], plan: [['ride', 0, 25], ['goTo', 22.5]] },
    { name: 'Sous les stalactites', start: [22.5, 0], goal: ['on', 35, 39.6, 0], plan: [['run', 1, 35, 39.6, 0], ['goTo', 37.6]] },
    { name: 'Pics → avalanche', start: [37.6, 0], goal: ['on', 51, 60, 0], plan: [['goTo', 38.6], ['hop', 3, 43.4], ['dodgeBoulders', 51, 3.6]] },
    { name: 'Neige → panier', start: [51.5, 0], goal: ['win'], plan: 'shot' },
  ],
};

const S9 = {
  id: 'snow-9',
  difficulty: 'hard',
  number: 9,
  nameKey: 'level.snow.9',
  bounds: bounds(62),
  spawn: { x: 3, y: 0 },
  solids: [
    ...walls(62),
    floor(-4, 11, 'snow'),
    { x: 5, y: 0, w: 3, h: 1.6, style: 'snow' },
    { x: 8, y: 0, w: 3, h: 3.2, style: 'snow' },
    { points: [{ x: 11, y: 0 }, { x: 17, y: 0 }, { x: 11, y: 3.2 }], style: 'ice' },
    floor(11, 24, 'ice'),
    floor(28.5, 40, 'ice'),
    { x: 33.5, y: 0, w: 1.5, h: 0.8, style: 'ice' },
    floor(44, 66, 'snow'),
  ],
  maces: [{ x: 26.2, y: 8.5, len: 6, r: 0.55, amp: 0.8, period: 2.6, phase: 0 }],
  // Bloc de glace au-dessus de la bosse : on la franchit sous lui, sans perdre son élan
  crushers: [{ x: 32.8, w: 2.8, top: 3.4, bottom: 0.8, period: 2.5, phase: 0 }],
  checkpoints: [{ x: 30.4, y: 0 }],
  stars: [{ x: 9.5, y: 5.2 }, { x: 26.2, y: 2.4 }, { x: 42, y: 2.4 }],
  hoop: hoopAt(56),
  passages: [
    { name: 'Marche 1', start: [3, 0], goal: ['on', 5, 8, 1.6], plan: [['goTo', 3.2], ['hop', 3, 6.5]] },
    { name: 'Marche 2', start: [6.5, 1.6], goal: ['on', 8, 11, 3.2], plan: [['hop', 3, 9.5]] },
    { name: 'Grande descente → crevasse', start: [9.5, 3.2], goal: ['on', 28.5, 33, 0], plan: [['waitCycle', 2.6, 1.45, 1.55], ['jumpAt', 1, 23.2], ['run', 1, 28.6, 33.2, 0]] },
    { name: 'Bosse → deuxième crevasse', start: [29.5, 0], goal: ['on', 44, 52, 0], plan: [['goTo', 29.6], ['waitCycle', 2.5, 1.55, 1.65], ['jumpAt', 1, 32.4], ['jumpAt', 1, 39.2]] },
    { name: 'Neige → panier', start: [47, 0], goal: ['win'], plan: 'shot' },
  ],
};

const S10 = {
  id: 'snow-10',
  difficulty: 'hard',
  number: 10,
  nameKey: 'level.snow.10',
  bounds: bounds(80, 12),
  spawn: { x: 2, y: 0 },
  solids: [
    ...walls(80),
    floor(-4, 10, 'snow'),
    { x: 4, y: 0, w: 3, h: 1.8, style: 'snow' },
    { x: 7, y: 0, w: 3, h: 3.4, style: 'snow' },
    { points: [{ x: 10, y: 0 }, { x: 16, y: 0 }, { x: 10, y: 3.4 }], style: 'ice' },
    floor(10, 26, 'ice'),
    { x: 17, y: 5, w: 8, h: 1, style: 'block' },
    floor(30, 84, 'snow'),
    { x: 38.8, y: 1.5, w: 2.2, h: 0.5, style: 'ice' },
    { x: 48, y: 1.9, w: 2, h: 0.5, style: 'ice' },
  ],
  fallers: [{ x: 43.5, y: 2.8, w: 2, h: 0.4 }],
  checkpoints: [{ x: 33, y: 0 }, { x: 54.2, y: 0 }],
  icicles: [{ x: 20, y: 5, len: 1.2 }, { x: 23.5, y: 5, len: 1.2 }],
  spikes: [{ x: 38, y: 0, w: 14.4, dir: 'up' }],
  winds: [{ x: 38, y: 0, w: 14, h: 9, force: -5, gust: 2.4 }],
  // Dernière ligne droite : avalanche puis bloc de glace devant le panier
  boulders: [{ x1: 53, x2: 62.6, y: 0, r: 0.6, dir: -1, speed: 6.5, period: 2.5, phase: 0 }],
  crushers: [{ x: 65.6, w: 2.2, top: 2.8, bottom: 0, period: 2.6, phase: 0 }],
  stars: [{ x: 8.5, y: 5.4 }, { x: 28, y: 2.6 }, { x: 46.5, y: 4.8 }],
  hoop: hoopAt(74, 3.6),
  passages: [
    { name: 'Marche 1', start: [2, 0], goal: ['on', 4, 7, 1.8], plan: [['goTo', 2.4], ['hop', 3, 5.5]] },
    { name: 'Marche 2', start: [5.5, 1.8], goal: ['on', 7, 10, 3.4], plan: [['hop', 3, 8.5]] },
    { name: 'Rampe, stalactites, crevasse', start: [8.5, 3.4], goal: ['on', 30, 37.6, 0], plan: [['jumpAt', 1, 25.2], ['run', 1, 30.2, 37.4, 0], ['goTo', 35.5]] },
    { name: 'Glace 1 (vent)', start: [35.5, 0], goal: ['on', 38.8, 41, 2.0], plan: [['goTo', 36.4], ['hop', 3, 39.9]] },
    { name: 'Plaque qui tombe → glace 3', start: [39.9, 2.0], goal: ['on', 48, 50, 2.4], plan: [['hop', 4, 44.5], ['jump', 1, 49]] },
    { name: 'Glace 3 → neige', start: [49, 2.4], goal: ['on', 52.6, 56, 0], plan: [['hop', 2, 54.5]] },
    { name: 'Avalanche', start: [54.5, 0], goal: ['on', 64.2, 65.4, 0], plan: [['dodgeBoulders', 63.5, 3.6], ['goTo', 64.8]] },
    { name: 'Bloc de glace', start: [64.6, 0], goal: ['on', 68.4, 84, 0], plan: [['goTo', 64.6], ['waitCycle', 2.6, 2.5, 2.6], ['run', 1, 68.6, 84, 0]] },
    { name: 'Neige → panier', start: [69, 0], goal: ['win'], plan: 'shot' },
  ],
};

export const SNOW_LEVELS = [S1, S2, S3, S4, S5, S6, S7, S8, S9, S10];
