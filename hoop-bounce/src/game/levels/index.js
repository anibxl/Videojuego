// Les niveaux du jeu, dans l'ordre. Chaque niveau = un simple objet de données.
//
// Repère : x vers la droite, y vers le haut, sol à y = 0. Le ballon fait 0,4 u de rayon.
// Hauteur d'un rebond (le centre du ballon monte de) : 1,4 · 2,2 · 3,1 · 4,1 · 5,2 u selon la puissance.
// Pour passer au-dessus d'un cercle à la hauteur Y depuis le sol, il faut que 0,4 + hauteur ≥ Y + 0,46.
//
// Formes :
//   solids      { x, y, w, h, style }              style : ground, wall, block
//   movers      { x, y, w, h, path }               path = { dx, dy, period, phase }
//   trampolines { x, y, w }
//   spikes      { x, y, w, dir }                   dir : up, down
//   fans        { x, y, w, h, strength }
//   switches    { x, y, w, target }                target = id de porte
//   doors       { id, x, y, w, h, open:{dx,dy} }
//   teleporters { a:{x,y}, b:{x,y}, r }            sens unique A → B
//   stars       { x, y }                           3 par niveau
//   hoop        { x, y, facing, mount, floorY }    x = avant du cercle, y = hauteur du cercle
//   hints       { x, y, key, size }                texte peint sur le décor (clé de traduction)

/** Sol de -4 à `end`, murs aux deux bouts (zone jouable de 0 à `end`). */
function court(end) {
  return [
    { x: -4, y: -6, w: end + 8, h: 6, style: 'ground' },
    { x: -4, y: 0, w: 4, h: 16, style: 'wall' },
    { x: end, y: 0, w: 4, h: 16, style: 'wall' },
  ];
}

const bounds = (end, maxY = 10.5) => ({ minX: -1.5, maxX: end + 1.5, minY: -4, maxY });

// 1 — Rouler, rebondir, enchaîner. Les étoiles dessinent la montée vers le panier.
const L1 = {
  id: 'first-shot',
  number: 1,
  nameKey: 'level.1',
  bounds: bounds(28),
  spawn: { x: 3, y: 0 },
  solids: court(28),
  stars: [
    { x: 8, y: 1.9 },
    { x: 11, y: 2.8 },
    { x: 14, y: 3.6 },
  ],
  hoop: { x: 17.5, y: 2.5, facing: -1, mount: 'pole' },
  hints: [
    { x: 5.5, y: 4.9, key: 'hint.move' },
    { x: 5.5, y: 4.2, key: 'hint.bounce', size: 0.8 },
  ],
};

// 2 — Un mur : il faut charger la puissance.
const L2 = {
  id: 'the-wall',
  number: 2,
  nameKey: 'level.2',
  bounds: bounds(34),
  spawn: { x: 3, y: 0 },
  solids: [...court(34), { x: 10, y: 0, w: 2, h: 2.0, style: 'block' }],
  stars: [
    { x: 11, y: 3.4 },
    { x: 17.5, y: 5.2 },
    { x: 21.3, y: 4.5 },
  ],
  hoop: { x: 24, y: 3.4, facing: -1, mount: 'pole' },
  hints: [{ x: 5.2, y: 4.3, key: 'hint.charge' }],
};

// 3 — Trampoline au-dessus des pics, panier sur une estrade.
const L3 = {
  id: 'trampoline',
  number: 3,
  nameKey: 'level.3',
  bounds: bounds(38),
  spawn: { x: 3, y: 0 },
  solids: [...court(38), { x: 28, y: 0, w: 10, h: 2.0, style: 'block' }],
  trampolines: [{ x: 11, y: 0, w: 1.6 }],
  spikes: [{ x: 14, y: 0, w: 5.4, dir: 'up' }],
  stars: [
    { x: 16, y: 6.1 },
    { x: 24, y: 3.2 },
    { x: 36.3, y: 3.6 },
  ],
  hoop: { x: 32, y: 5.0, facing: -1, mount: 'pole', floorY: 2.0 },
  hints: [{ x: 5.4, y: 4.3, key: 'hint.spikes' }],
};

// 4 — Plateforme mobile au-dessus du vide.
const L4 = {
  id: 'moving',
  number: 4,
  nameKey: 'level.4',
  bounds: bounds(38),
  spawn: { x: 3, y: 0 },
  solids: [
    { x: -4, y: -6, w: 14, h: 6, style: 'ground' },
    { x: 22, y: -6, w: 20, h: 6, style: 'ground' },
    { x: -4, y: 0, w: 4, h: 16, style: 'wall' },
    { x: 38, y: 0, w: 4, h: 16, style: 'wall' },
  ],
  movers: [{ x: 10.2, y: -0.5, w: 3.6, h: 0.5, path: { dx: 8.2, dy: 0, period: 4.8, phase: 0 } }],
  stars: [
    { x: 13.4, y: 2.6 },
    { x: 18.6, y: 2.6 },
    { x: 27, y: 4.8 },
  ],
  hoop: { x: 31, y: 3.3, facing: -1, mount: 'pole' },
  hints: [{ x: 5, y: 4.3, key: 'hint.platform' }],
};

// 5 — Le ventilateur mène à une terrasse où se trouve le panier.
const L5 = {
  id: 'updraft',
  number: 5,
  nameKey: 'level.5',
  bounds: bounds(38, 13),
  spawn: { x: 3, y: 0 },
  solids: [...court(38), { x: 12.4, y: 0, w: 25.6, h: 5.2, style: 'block' }],
  fans: [{ x: 9, y: 0, w: 2.2, h: 9, strength: 95 }],
  stars: [
    { x: 10.1, y: 7.8 },
    { x: 17, y: 6.8 },
    { x: 31.5, y: 9.4 },
  ],
  hoop: { x: 25, y: 7.8, facing: -1, mount: 'pole', floorY: 5.2 },
  hints: [{ x: 4.6, y: 4.3, key: 'hint.fan' }],
};

// 6 — Interrupteur, porte, téléporteur : tout ce qu'on a appris.
const L6 = {
  id: 'final',
  number: 6,
  nameKey: 'level.6',
  bounds: bounds(52),
  spawn: { x: 3, y: 0 },
  solids: [
    ...court(52),
    { x: 7, y: 0, w: 3, h: 2.4, style: 'block' },
    { x: 16, y: 2.7, w: 1.2, h: 13.3, style: 'wall' },
    { x: 25, y: 0, w: 2, h: 16, style: 'wall' },
  ],
  switches: [{ x: 7.9, y: 2.4, w: 1.2, target: 'gate' }],
  doors: [{ id: 'gate', x: 16.2, y: 0, w: 0.8, h: 2.7, open: { dx: 0, dy: 2.7 }, duration: 0.8 }],
  teleporters: [{ a: { x: 22.5, y: 0.9 }, b: { x: 30, y: 1.3 }, r: 0.8 }],
  stars: [
    { x: 8.5, y: 4.6 },
    { x: 20, y: 3.0 },
    { x: 35.5, y: 4.6 },
  ],
  hoop: { x: 41, y: 3.4, facing: -1, mount: 'pole' },
  hints: [{ x: 3.8, y: 3.7, key: 'hint.switch', size: 0.8 }],
};

export const LEVELS = [L1, L2, L3, L4, L5, L6];
