// MONDE 1 — VILLE (monde tutoriel). Chaque niveau = un simple objet de données.
// Le format complet (tous les éléments, y compris ceux des autres mondes) est décrit dans levels/README.md.
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

import { court, walls, bounds } from './common.js';

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
  passages: [{ name: 'Départ → panier', start: [3, 0], goal: ['win'], plan: 'shot' }],
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
  passages: [
    { name: 'Départ → au-delà du mur', start: [3, 0], goal: ['on', 12.3, 22, 0], plan: [['goTo', 8.2], ['hop', 3, 13.5]] },
    { name: 'Après le mur → panier', start: [15, 0], goal: ['win'], plan: 'shot' },
  ],
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
  passages: [
    { name: 'Trampoline → au-delà des pics', start: [3, 0], goal: ['on', 19.6, 28, 0], plan: [['goTo', 9.6], ['jump', 1], ['fly', 22]] },
    { name: 'Sol → estrade', start: [22, 0], goal: ['on', 28, 38, 2.0], plan: [['goTo', 25.6], ['hop', 3, 29.6]] },
    { name: 'Estrade → panier', start: [29.2, 2.0], goal: ['win'], plan: 'shot' },
  ],
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
  passages: [
    { name: 'Plateforme mobile → autre rive', start: [8, 0], goal: ['on', 22.2, 30, 0], plan: [['ride', 0]] },
    { name: 'Rive → panier', start: [24, 0], goal: ['win'], plan: 'shot' },
  ],
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
  passages: [
    { name: 'Ventilateur → terrasse', start: [6, 0], goal: ['on', 12.4, 38, 5.2], plan: [['hold', 1, 9.6], ['wait', 1.6], ['run', 1, 12.6, 38, 5.2]] },
    { name: 'Terrasse → panier', start: [14, 5.2], goal: ['win'], plan: 'shot' },
  ],
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
  passages: [
    { name: 'Départ → interrupteur', start: [3, 0], goal: ['switch', 0], plan: [['goTo', 5.4], ['hop', 4, 8.5]] },
    { name: 'Porte ouverte → téléporteur', start: [12, 0], goal: ['x', 27.5], prep: ['openDoors'], plan: [['hold', 1, 27.6]] },
    { name: 'Après le mur → panier', start: [31, 0], goal: ['win'], plan: 'shot' },
  ],
};

// 7 — La caisse : la terrasse du panier est trop haute ; on pousse la caisse contre elle pour s'en
// servir de marche (du dessus de la caisse, un rebond de puissance 5 suffit).
const L7 = {
  id: 'city-crate',
  number: 7,
  nameKey: 'level.city.7',
  bounds: bounds(46, 14),
  spawn: { x: 3, y: 0 },
  solids: [...court(46), { x: 17, y: 0, w: 29, h: 5.6, style: 'block' }],
  crates: [{ x: 8, y: 0, w: 1.6, h: 1.6 }],
  stars: [
    { x: 8.8, y: 3.2 },
    { x: 15.6, y: 6.6 },
    { x: 38, y: 8.2 },
  ],
  hoop: { x: 29, y: 9.0, facing: -1, mount: 'pole', floorY: 5.6 },
  hints: [{ x: 4.6, y: 4.3, key: 'hint.crate' }],
  passages: [
    { name: 'Pousser la caisse contre la terrasse', start: [3, 0], goal: ['crate', 0, 15.2], plan: [['hold', 1, 14.85]] },
    { name: 'Caisse → terrasse', start: [16.2, 1.6], goal: ['on', 17, 46, 5.6], prep: ['crateAt', 0, 15.4], plan: [['wait', 0.3], ['charge', 5], ['jump', 1]] },
    { name: 'Terrasse → panier', start: [19, 5.6], goal: ['win'], plan: 'shot' },
  ],
};

// 8 — Les toits : d'immeuble en immeuble au-dessus du vide, antennes à éviter, nacelle mobile.
const L8 = {
  id: 'city-roofs',
  number: 8,
  nameKey: 'level.city.8',
  bounds: bounds(60, 11),
  spawn: { x: 3, y: 0 },
  solids: [
    ...walls(60),
    { x: -4, y: -6, w: 16, h: 6, style: 'ground' },
    { x: 15.5, y: -6, w: 8.5, h: 7.2, style: 'block', skin: 'brick' },
    { x: 28, y: -6, w: 6, h: 6.4, style: 'block', skin: 'concrete' },
    { x: 44, y: -6, w: 20, h: 6, style: 'ground' },
  ],
  spikes: [{ x: 19, y: 1.2, w: 1.6, dir: 'up' }],
  movers: [{ x: 34.2, y: -0.1, w: 3.2, h: 0.5, path: { dx: 6.6, dy: 0, period: 4.6, phase: 0 } }],
  stars: [
    { x: 13.8, y: 3.4 },
    { x: 19.8, y: 3.8 },
    { x: 39, y: 2.6 },
  ],
  hoop: { x: 54, y: 3.4, facing: -1, mount: 'pole' },
  passages: [
    { name: 'Premier toit → deuxième', start: [3, 0], goal: ['on', 15.5, 19, 1.2], plan: [['goTo', 11.2], ['hop', 4, 17]] },
    { name: 'Au-dessus des antennes', start: [17, 1.2], goal: ['on', 20.6, 24, 1.2], plan: [['goTo', 17.4], ['hop', 3, 22.3]] },
    { name: 'Saut vers le toit bas', start: [22.3, 1.2], goal: ['on', 28, 34, 0.4], plan: [['goTo', 23.3], ['hop', 4, 30]] },
    { name: 'Nacelle → dernier toit', start: [31, 0.4], goal: ['on', 44, 60, 0], plan: [['ride', 0, 40]] },
    { name: 'Dernier toit → panier', start: [46, 0], goal: ['win'], plan: 'shot' },
  ],
};

// 9 — Le chantier : trampoline au-dessus des pics, échafaudage, monte-charge, saut final.
const L9 = {
  id: 'city-site',
  number: 9,
  nameKey: 'level.city.9',
  bounds: bounds(62, 12),
  spawn: { x: 3, y: 0 },
  solids: [
    ...court(62),
    { x: 14.4, y: 0, w: 6, h: 2.4, style: 'block', skin: 'metal' },
    { x: 23.4, y: 0, w: 11, h: 5.6, style: 'block', skin: 'brick' },
  ],
  trampolines: [{ x: 7, y: 0, w: 1.6 }],
  spikes: [
    { x: 9.4, y: 0, w: 4.8, dir: 'up' },
    { x: 43, y: 0, w: 2.4, dir: 'up' },
  ],
  movers: [{ x: 20.6, y: 1.9, w: 2.6, h: 0.5, path: { dx: 0, dy: 3.2, period: 5, phase: 0 } }],
  stars: [
    { x: 11.6, y: 6.4 },
    { x: 21.9, y: 7.8 },
    { x: 44.2, y: 3.3 },
  ],
  hoop: { x: 55.5, y: 3.4, facing: -1, mount: 'pole' },
  hints: [{ x: 4.6, y: 4.3, key: 'hint.site' }],
  passages: [
    { name: 'Trampoline → échafaudage', start: [3, 0], goal: ['on', 14.4, 20.4, 2.4], plan: [['run', 1, 14.6, 20.4, 2.4], ['goTo', 17]] },
    { name: 'Monte-charge → étage', start: [17, 2.4], goal: ['on', 23.4, 34.4, 5.6], plan: [['goTo', 19.2], ['waitMover', 'movers', 0, 'y', '<', 0.05], ['goTo', 21.9], ['waitMover', 'movers', 0, 'y', '>', 3.15], ['run', 1, 23.6, 34.4, 5.6]] },
    { name: 'Descente', start: [27, 5.6], goal: ['on', 34.6, 41, 0], plan: [['run', 1, 34.8, 41, 0], ['goTo', 39]] },
    { name: 'Au-dessus des pics', start: [39, 0], goal: ['on', 45.4, 62, 0], plan: [['goTo', 42], ['hop', 4, 47.5]] },
    { name: 'Sol → panier', start: [47, 0], goal: ['win'], plan: 'shot' },
  ],
};

// 10 — Grand final de la ville : mur, nacelle, ventilateur, interrupteur, porte et téléporteur.
const L10 = {
  id: 'city-finale',
  number: 10,
  nameKey: 'level.city.10',
  bounds: bounds(82, 13.5),
  spawn: { x: 3, y: 0 },
  solids: [
    ...walls(82),
    { x: -4, y: -6, w: 22, h: 6, style: 'ground' },
    { x: 28, y: -6, w: 58, h: 6, style: 'ground' },
    { x: 10, y: 0, w: 2, h: 2.8, style: 'block', skin: 'brick' },
    { x: 39.4, y: 0, w: 16.6, h: 5.2, style: 'block', skin: 'concrete' },
    { x: 49.6, y: 8.0, w: 1.2, h: 13, style: 'wall' },
  ],
  movers: [{ x: 18.2, y: -0.5, w: 3.4, h: 0.5, path: { dx: 6.4, dy: 0, period: 4.6, phase: 0 } }],
  spikes: [{ x: 33.2, y: 0, w: 1.8, dir: 'up' }],
  fans: [{ x: 36.2, y: 0, w: 2.2, h: 9, strength: 95 }],
  switches: [{ x: 41.6, y: 5.2, w: 1.2, target: 'gate' }],
  doors: [{ id: 'gate', x: 49.8, y: 5.2, w: 0.8, h: 2.8, open: { dx: 0, dy: 2.8 }, duration: 0.8 }],
  teleporters: [{ a: { x: 53.6, y: 6.1 }, b: { x: 60.5, y: 0.9 }, r: 0.8 }],
  stars: [
    { x: 11, y: 5.2 },
    { x: 23.2, y: 2.6 },
    { x: 37.1, y: 8.6 },
  ],
  hoop: { x: 73, y: 3.6, facing: -1, mount: 'pole' },
  passages: [
    { name: 'Départ → au-delà du mur', start: [3, 0], goal: ['on', 12.3, 18, 0], plan: [['goTo', 8.2], ['hop', 4, 14.6]] },
    { name: 'Nacelle', start: [14, 0], goal: ['on', 28.2, 32.6, 0], plan: [['ride', 0, 25], ['goTo', 30.5]] },
    { name: 'Pics → ventilateur → terrasse', start: [30, 0], goal: ['on', 39.6, 49.5, 5.2], plan: [['goTo', 31.4], ['hop', 3, 35.6], ['hold', 1, 36.9], ['wait', 1.6], ['run', 1, 39.8, 49.5, 5.2]] },
    { name: 'Interrupteur → porte → téléporteur', start: [40, 5.2], goal: ['x', 59.5], plan: [['hold', 1, 59.6]] },
    { name: 'Rue → panier', start: [62, 0], goal: ['win'], plan: 'shot' },
  ],
};

export const CITY_LEVELS = [L1, L2, L3, L4, L5, L6, L7, L8, L9, L10];
