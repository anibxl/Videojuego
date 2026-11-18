// MONDE 4 — FORÊT. Lianes, plateformes en bois, champignons rebondissants, troncs qui roulent,
// branches qui bougent. (Niveau de démonstration de l'étape 7.)
import { walls, bounds } from './common.js';

const F1 = {
  id: 'forest-1',
  number: 1,
  nameKey: 'level.forest.1',
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
  hints: [{ x: 8.6, y: 4.8, key: 'hint.vine' }],
};

export const FOREST_LEVELS = [F1];
