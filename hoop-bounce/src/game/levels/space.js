// MONDE 5 — ESPACE. Gravité réduite, astéroïdes mobiles, portails, plateformes flottantes,
// zones de gravité inversée. (Niveau de démonstration de l'étape 7.)
import { walls, bounds } from './common.js';

const P1 = {
  id: 'space-1',
  number: 1,
  nameKey: 'level.space.1',
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
  hints: [{ x: 4.6, y: 4.3, key: 'hint.space' }],
};

export const SPACE_LEVELS = [P1];
