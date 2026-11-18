// MONDE 3 — VOLCAN. Lave mortelle, plateformes qui s'effondrent, geysers de feu, chutes de pierres,
// ascenseurs de pierre. (Niveau de démonstration de l'étape 7.)
import { walls, bounds } from './common.js';

const V1 = {
  id: 'volcano-1',
  number: 1,
  nameKey: 'level.volcano.1',
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
  hints: [{ x: 4.4, y: 4.3, key: 'hint.lava' }],
};

export const VOLCANO_LEVELS = [V1];
