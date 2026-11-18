// MONDE 2 — NEIGE. Sol glissant, plateformes de glace, vent de neige, stalactites, rampes de glace.
// (Niveau de démonstration de l'étape 7 : les 10 niveaux du monde viendront après validation.)
import { walls, bounds } from './common.js';

const S1 = {
  id: 'snow-1',
  number: 1,
  nameKey: 'level.snow.1',
  bounds: bounds(62, 11.5),
  spawn: { x: 3, y: 0 },
  solids: [
    ...walls(62),
    { x: -4, y: -6, w: 23, h: 6, style: 'snow' },            // neige (adhérence normale)
    { x: 19, y: -6, w: 11, h: 6, style: 'ice' },             // lac gelé : on glisse
    { x: 34, y: -6, w: 32, h: 6, style: 'snow' },            // après la crevasse
    { x: 9, y: 0, w: 4, h: 2.6, style: 'snow' },             // butte enneigée
    { points: [{ x: 13, y: 0 }, { x: 19, y: 0 }, { x: 13, y: 2.6 }], style: 'ice' }, // rampe de glace
    { x: 20, y: 6, w: 9, h: 1, style: 'block' },             // surplomb gelé (stalactites)
    { x: 38, y: 1.6, w: 2.5, h: 0.5, style: 'ice' },         // plateformes de glace
    { x: 42.5, y: 3.0, w: 2.5, h: 0.5, style: 'ice' },
  ],
  icicles: [
    { x: 22.5, y: 6, len: 1.3 },
    { x: 26.5, y: 6, len: 1.3 },
  ],
  winds: [{ x: 35, y: 0, w: 12, h: 9, force: -10, gust: 2.6 }],
  stars: [
    { x: 11, y: 4.4 },
    { x: 32, y: 2.6 },
    { x: 43.7, y: 4.8 },
  ],
  hoop: { x: 54, y: 3.4, facing: -1, mount: 'pole' },
  hints: [{ x: 4.5, y: 4.3, key: 'hint.ice' }],
};

export const SNOW_LEVELS = [S1];
