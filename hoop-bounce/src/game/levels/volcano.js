// MONDE 3 — VOLCAN : ENCHAÎNEMENTS TECHNIQUES (refonte phase 2). 40 à 50 s par niveau pour un joueur.
// Lave mortelle, pierres qui s'effondrent, flammes, geysers de feu, chutes de pierres, canons à boules de
// feu, rochers de lave, ascenseurs de pierre. Le rythme compte : chaque piège est parfaitement régulier,
// on l'observe, puis on enchaîne.
//
// 21 Premières braises     la lave : bassins, îlots, flammes, pierres fragiles (découverte)
// 22 Les geysers           lire le rythme des geysers : courir, s'arrêter, repartir (rythme)
// 23 Chute de pierres      les ombres annoncent les pierres : galerie, abris, cheminée (observation)
// 24 Les canons            boules de feu : sous la lave, en face, du plafond (précision)
// 25 La coulée             rochers de lave : sauter, ou se cacher dans une niche (rapide)
// 26 La forge              le bloc de pierre fait un pont, puis une marche ; soufflet → porte (puzzle)
// 27 Le pont des geysers   pont de pierres fragiles entre les geysers (★ mémorable)
// 28 Les ascenseurs        ascenseurs de pierre au-dessus de la lave, pierres qui tombent (technique)
// 29 Le cratère            téléporteurs de lave : choisir la bonne bouche (puzzle)
// 30 Le cœur du volcan     tout le volcan en un niveau (★ finale)

import { level } from './kit.js';
import { V6, V7, V8, V9, V10 } from './_volcano_old.js';

const rock = 'rock';

/** Bassin de lave de x0 à x1 (surface 0,4 sous le sol `top`). */
function pool(s, x0, x1, top = 0) {
  s.ground(x0, x1, top - 1.2, rock);
  s.add('lava', { x: x0, y: top - 0.4, w: x1 - x0 });
}
const flame = (x, y0, y1, phase = 0, period = 2.6, on = 1.2) => ({ x1: x, y1: y0, x2: x, y2: y1, period, on, phase, style: 'flame' });

// 21 — Premières braises : la lave, puis tout ce qui en sort
const L21 = level({ id: 'volcano-1', difficulty: 'easy', number: 1, nameKey: 'lv.volcano.1', idea: 'la lave : bassins, îlots, flammes, pierres fragiles' }, (c) => {
  c.section(8, (s) => {
    s.ground(0, 8, 0, rock);
    s.spawn(2);
    s.hint(5, 4.3, 'hint.lava');
  });
  c.section(22, (s) => {
    s.ground(0, 5, 0, rock);
    pool(s, 5, 8);
    s.ground(8, 13, 0, rock);
    pool(s, 13, 17);
    s.ground(17, 22, 0, rock);
    s.star(6.5, 3);
    s.star(15, 3.4);
    s.pass('Deux bassins', [-6, 0], ['on', 17.3, 22, 0], [['goTo', 4.2], ['hop', 3, 9.6], ['dribbleRun', 1, 2, 12.4, 18.6]]);
  });
  // Les îlots : on enchaîne les rebonds sans s'arrêter
  c.section(24, (s) => {
    s.ground(0, 2, 0, rock);
    pool(s, 2, 21);
    s.block(4.6, -1.2, 2, 1.6, rock);
    s.block(9, -1.2, 2, 2.0, rock);
    s.block(13.4, -1.2, 2, 1.6, rock);
    s.block(17.8, -1.2, 2, 1.2, rock);
    s.ground(21, 24, 0, rock);
    s.checkpoint(1, 0);
    s.star(12.2, 3.6);
    s.pass('Les îlots', [-2, 0], ['on', 21.2, 24, 0], [['goTo', 1.2], ['hop', 3, 5.6, 0.4], ['jump', 1, 10, 0.8], ['jump', 1, 14.4, 0.4], ['jump', 1, 18.8, 0], ['jump', 1, 22.4, 0]]);
  });
  // Les soupiraux : deux flammes en alternance, on s'arrête entre les deux
  c.section(20, (s) => {
    s.ground(0, 20, 0, rock);
    s.add('lasers', flame(6, 0, 10.5, 0), flame(12, 0, 10.5, 0.5));
    s.hint(2.5, 4.3, 'hint.flame');
    s.star(9, 1.2);
    s.pass('Les soupiraux', [-2, 0], ['on', 15, 20, 0], [['goTo', 3.2], ['waitCycle', 2.6, 0.05, 0.15], ['goTo', 9], ['waitCycle', 2.6, 1.35, 1.45], ['run', 1, 15.2, 20, 0]]);
  });
  // Les pierres fragiles
  c.section(22, (s) => {
    s.ground(0, 3, 0, rock);
    pool(s, 3, 17);
    s.add('crumbles', { x: 4.6, y: 0, w: 2, h: 0.45 }, { x: 8.8, y: 0, w: 2, h: 0.45 }, { x: 13, y: 0.2, w: 2, h: 0.45 });
    s.ground(17, 22, 0, rock);
    s.checkpoint(1, 0);
    s.hint(1.5, 4.3, 'hint.crumble');
    s.star(11.9, 3.2);
    s.pass('Les pierres fragiles', [-2, 0], ['on', 17.3, 22, 0], [['goTo', 1.8], ['hop', 3, 5.6, 0.45], ['jump', 1, 9.8, 0.45], ['jump', 1, 14, 0.65], ['jump', 1, 18.8, 0]]);
  });
  c.section(16, (s) => {
    s.ground(0, 16, 0, rock);
    s.hoop(10, 3.4);
    s.pass('Le panier', [-2, 0], ['win'], 'shot');
  });
});

// 22 — Les geysers : un rythme à lire
const L22 = level({ id: 'volcano-2', difficulty: 'medium', number: 2, nameKey: 'lv.volcano.2', idea: 'geysers : courir, s’arrêter, repartir' }, (c) => {
  c.section(8, (s) => {
    s.ground(0, 8, 0, rock);
    s.spawn(2);
    s.hint(5, 4.3, 'hint.geyser');
  });
  // Trois geysers : le deuxième est à contretemps, on l'attend entre deux jets
  c.section(26, (s) => {
    s.ground(0, 26, 0, rock);
    s.add('geysers', { x: 6, y: 0 }, { x: 13, y: 0, phase: 0.5 }, { x: 20, y: 0 });
    s.star(9.5, 1.2);
    s.star(16.5, 1.2);
    s.pass('Trois geysers', [-6, 0], ['on', 22.5, 26, 0], [['goTo', 2], ['waitCycle', 3.2, 0.0, 0.1], ['goTo', 9.5], ['waitCycle', 3.2, 1.6, 1.7], ['goTo', 16.5], ['waitCycle', 3.2, 0.0, 0.1], ['run', 1, 22.7, 26, 0]]);
  });
  // Les marches brûlantes : un geyser sur chaque marche ; on attend au pied de la suivante
  c.section(30, (s) => {
    s.ground(0, 30, 0, rock);
    s.block(3, 0, 27, 1.4, rock);
    s.block(13, 1.4, 17, 1.4, rock);
    s.block(23, 2.8, 7, 1.4, rock);
    s.add('geysers', { x: 7.5, y: 1.4 }, { x: 17.5, y: 2.8, phase: 0.5 });
    s.checkpoint(1, 0);
    s.star(7.5, 6.8);
    s.star(17.5, 8.2);
    s.pass('Première marche', [-2, 0], ['on', 3.3, 6.2, 1.4], [['goTo', 1], ['hop', 2, 4.4, 1.4]]);
    s.pass('Le geyser de la première marche', [4.4, 1.4], ['on', 13.3, 16.5, 2.8], [['goTo', 5.8], ['waitCycle', 3.2, 0.0, 0.1], ['run', 1, 9.6, 12.2, 1.4], ['goTo', 11.2], ['hop', 2, 14.4, 2.8]]);
    s.pass('Le geyser de la deuxième marche', [14.4, 2.8], ['on', 23.3, 30, 4.2], [['goTo', 15.8], ['waitCycle', 3.2, 1.6, 1.7], ['run', 1, 19.6, 22.2, 2.8], ['goTo', 21.2], ['hop', 2, 24.4, 4.2]]);
  });
  // Le lac de feu : deux geysers jaillissent de la lave, un îlot entre les deux
  c.section(24, (s) => {
    s.ground(0, 4, 4.2, rock);
    s.ground(4, 6, 0, rock);
    pool(s, 6, 14.6);
    s.block(8.6, -1.2, 2.6, 1.6, rock);
    s.add('geysers', { x: 7.3, y: -0.4, h: 6 }, { x: 12.8, y: -0.4, h: 6, phase: 0.22 });
    s.ground(14.6, 24, 0, rock);
    s.checkpoint(2, 4.2);
    s.star(9.9, 2.4);
    s.pass('Descendre au bord du lac', [-2, 4.2], ['on', 4.2, 6, 0], [['hold', 1, 4], ['goTo', 5.4]]);
    s.pass('Le lac de feu', [5.4, 0], ['on', 14.8, 24, 0], [['goTo', 5.4], ['waitCycle', 3.2, 0.0, 0.1], ['hop', 3, 9.6, 0.4], ['goTo', 10.7], ['waitCycle', 3.2, 0.0, 0.1, 0.22], ['hop', 3, 15.6, 0], ['goTo', 17]]);
  });
  c.section(16, (s) => {
    s.ground(0, 16, 0, rock);
    s.hoop(10, 3.4);
    s.pass('Le panier', [-2, 0], ['win'], 'shot');
  });
});

// 23 — Chute de pierres : les ombres annoncent les pierres
const L23 = level({ id: 'volcano-3', difficulty: 'medium', number: 3, nameKey: 'lv.volcano.3', idea: 'chutes de pierres : regarder les ombres', maxY: 11 }, (c) => {
  c.section(8, (s) => {
    s.ground(0, 8, 0, rock);
    s.spawn(2);
    s.hint(5, 4.3, 'hint.rocks');
  });
  // La galerie : trois pierres l'une après l'autre ; on part juste après la première
  c.section(22, (s) => {
    s.ground(0, 22, 0, rock);
    s.block(2, 6, 18, 2, rock);
    s.add('rockfalls', { x: 6, y: 6, phase: 0 }, { x: 11, y: 6, phase: 0.2 }, { x: 16, y: 6, phase: 0.4 });
    s.star(11, 1.2);
    s.pass('La galerie', [-6, 0], ['on', 19, 22, 0], [['goTo', 0], ['waitCycle', 2.8, 1.6, 1.7], ['run', 1, 19.2, 22, 0]]);
  });
  // Les abris : des rangées de pierres en alternance ; entre deux rangées, on est à l'abri
  c.section(28, (s) => {
    s.ground(0, 28, 0, rock);
    s.block(0, 6.4, 28, 2, rock);
    for (const x of [3, 5, 7]) s.add('rockfalls', { x, y: 6.4, phase: 0 });
    for (const x of [12, 14, 16]) s.add('rockfalls', { x, y: 6.4, phase: 0.5 });
    for (const x of [21, 23, 25]) s.add('rockfalls', { x, y: 6.4, phase: 0 });
    s.checkpoint(0.6, 0);
    s.star(9.5, 1.2);
    s.star(18.5, 1.2);
    s.pass('Les abris', [-2, 0], ['on', 26.6, 28, 0], [['goTo', 0.6], ['waitCycle', 2.8, 1.55, 2.3], ['goTo', 9.5], ['waitCycle', 2.8, 0.15, 1.1], ['goTo', 18.5], ['waitCycle', 2.8, 1.55, 2.3], ['run', 1, 26.8, 28, 0]]);
  });
  // Le pont fragile : une pierre tombe sur la pierre du milieu
  c.section(22, (s) => {
    s.ground(0, 3, 0, rock);
    pool(s, 3, 17);
    s.add('crumbles', { x: 4.6, y: 0, w: 2, h: 0.45 }, { x: 8.8, y: 0, w: 2, h: 0.45 }, { x: 13, y: 0, w: 2, h: 0.45 });
    s.add('rockfalls', { x: 9.8, y: 10.5, phase: 0 });
    s.ground(17, 22, 0, rock);
    s.checkpoint(1, 0);
    s.star(9.8, 2.6);
    s.pass('Le pont fragile', [-2, 0], ['on', 17.3, 22, 0], [['goTo', 1.8], ['waitCycle', 2.8, 0.6, 0.7], ['hop', 3, 5.6, 0.45], ['jump', 1, 9.8, 0.45], ['jump', 1, 14, 0.45], ['jump', 1, 18.8, 0]]);
  });
  // La cheminée : on monte, les pierres tombent du haut
  c.section(22, (s) => {
    s.ground(0, 22, 0, rock);
    s.block(3, 0, 19, 1.6, rock);
    s.block(9, 1.6, 13, 1.6, rock);
    s.block(15, 3.2, 7, 1.6, rock);
    s.add('rockfalls', { x: 8.3, y: 11, phase: 0 }, { x: 14.3, y: 11, phase: 0.5 });
    s.star(14.3, 6.4);
    s.pass('Première marche', [-2, 0], ['on', 3.3, 7.4, 1.6], [['goTo', 1], ['hop', 2, 4.4, 1.6], ['goTo', 6.8]]);
    s.pass('Deuxième marche', [6.8, 1.6], ['on', 9.3, 13.4, 3.2], [['goTo', 6.8], ['waitCycle', 2.8, 1.7, 1.8], ['hop', 2, 10.4, 3.2], ['goTo', 12.8]]);
    s.pass('Le haut de la cheminée', [12.8, 3.2], ['on', 15.3, 22, 4.8], [['goTo', 12.8], ['waitCycle', 2.8, 0.3, 0.4], ['hop', 2, 16.4, 4.8]]);
  });
  c.section(16, (s) => {
    s.ground(0, 16, 4.8, rock);
    s.hoop(10, 3.4, 4.8);
    s.pass('Le panier', [-2, 4.8], ['win'], 'shot');
  });
});

// 24 — Les canons : des boules de feu, d'abord de la lave, puis en face, puis du plafond
const L24 = level({ id: 'volcano-4', difficulty: 'hard', number: 4, nameKey: 'lv.volcano.4', idea: 'canons : sous la lave, en face, du plafond' }, (c) => {
  c.section(8, (s) => {
    s.ground(0, 8, 0, rock);
    s.spawn(2);
    s.hint(5, 4.3, 'hint.cannon');
  });
  // Les bouches de lave : des boules de feu jaillissent entre les îlots
  c.section(22, (s) => {
    s.ground(0, 3, 0, rock);
    pool(s, 3, 18.2);
    s.block(5.3, -1.2, 2.2, 1.6, rock);
    s.block(9.9, -1.2, 2.2, 1.6, rock);
    s.block(14.5, -1.2, 2.2, 1.6, rock);
    s.add('cannons', { x: 8.7, y: -0.9, angle: Math.PI / 2, period: 2.6, phase: 0 }, { x: 13.3, y: -0.9, angle: Math.PI / 2, period: 2.6, phase: 0.5 }, { x: 17.4, y: -0.9, angle: Math.PI / 2, period: 2.6, phase: 0 });
    s.ground(18.2, 22, 0, rock);
    s.star(11, 3.6);
    s.pass('Les bouches de lave', [-6, 0], ['on', 18.4, 22, 0], [['goTo', 2.2], ['waitCycle', 2.6, 0.25, 0.35], ['hop', 3, 6.4, 0.4], ['jump', 1, 11, 0.4], ['jump', 1, 15.6, 0.4], ['jump', 1, 19.8, 0]]);
  });
  // Le couloir : un canon tire droit vers toi, saute la boule de feu
  c.section(24, (s) => {
    s.ground(0, 2.4, 1.4, rock);
    s.ground(2.4, 24, 0, rock);
    s.block(20, 0, 4, 1.4, rock);
    s.add('cannons', { x: 20.4, y: 0.55, dir: -1, period: 3.2, phase: 0 });
    s.checkpoint(1.2, 1.4);
    s.star(12, 2.8);
    s.pass('Le rebord', [-2, 0], ['on', 0.3, 2.2, 1.4], [['goTo', -1.2], ['hop', 2, 1.2, 1.4]]);
    s.pass('Le couloir', [1.2, 1.4], ['on', 20.5, 24, 1.4], [['goTo', 1.2], ['waitCycle', 3.2, 2.9, 3.0], ['jumpAt', 1, 9, 13], ['hold', 1, 16], ['hop', 2, 21.6, 1.4]]);
  });
  // La batterie : les canons tirent du plafond
  c.section(24, (s) => {
    s.ground(0, 4, 1.4, rock);
    s.ground(4, 24, 0, rock);
    s.block(5, 6.4, 16, 2, rock);
    s.add('cannons', { x: 8, y: 6.0, angle: -Math.PI / 2, period: 2.4, phase: 0 }, { x: 12, y: 6.0, angle: -Math.PI / 2, period: 2.4, phase: 0 }, { x: 16, y: 6.0, angle: -Math.PI / 2, period: 2.4, phase: 0 });
    s.checkpoint(2, 1.4);
    s.star(12, 1.2);
    s.pass('La batterie', [-2, 1.4], ['on', 20, 24, 0], [['goTo', 2.6], ['waitCycle', 2.4, 0.9, 1.0], ['run', 1, 20.2, 24, 0]]);
  });
  // Le pont de pierres fragiles sous le feu : impossible de s'arrêter, il faut partir au bon moment
  c.section(22, (s) => {
    s.ground(0, 3, 0, rock);
    pool(s, 3, 18.2);
    s.add('crumbles', { x: 5.3, y: 0, w: 2.2, h: 0.45 }, { x: 9.9, y: 0, w: 2.2, h: 0.45 }, { x: 14.5, y: 0, w: 2.2, h: 0.45 });
    s.add('cannons', { x: 8.7, y: -0.9, angle: Math.PI / 2, period: 2.6, phase: 0.25 }, { x: 13.3, y: -0.9, angle: Math.PI / 2, period: 2.6, phase: 0.75 }, { x: 17.4, y: -0.9, angle: Math.PI / 2, period: 2.6, phase: 0.25 });
    s.ground(18.2, 22, 0, rock);
    s.checkpoint(1, 0);
    s.star(13.3, 4.2);
    s.pass('Pierres fragiles sous le feu', [-2, 0], ['on', 18.4, 22, 0], [['goTo', 2.2], ['waitCycle', 2.6, 1.85, 1.95], ['hop', 3, 6.4, 0.45], ['jump', 1, 11, 0.45], ['jump', 1, 15.6, 0.45], ['jump', 1, 19.8, 0]]);
  });
  c.section(16, (s) => {
    s.ground(0, 16, 0, rock);
    s.hoop(10, 3.4);
    s.pass('Le panier', [-2, 0], ['win'], 'shot');
  });
});

// 25 — La coulée : les rochers de lave dévalent ; on saute, ou on se cache
const L25 = level({ id: 'volcano-5', difficulty: 'hard', number: 5, nameKey: 'lv.volcano.5', idea: 'rochers de lave : sauter, ou se cacher' }, (c) => {
  c.section(8, (s) => {
    s.ground(0, 8, 0, rock);
    s.spawn(2);
    s.hint(5, 4.3, 'hint.boulder');
  });
  c.section(22, (s) => {
    s.ground(0, 22, 0, rock);
    s.block(19, 0, 3, 1.4, rock);
    s.add('boulders', { x1: 1.5, x2: 18.5, y: 0, r: 0.6, dir: -1, speed: 6, period: 3.6, phase: 0 });
    s.star(10, 2.8);
    s.pass('Premier rocher', [-6, 0], ['on', 19.3, 22, 1.4], [['goTo', -0.6], ['waitCycle', 3.6, 0.0, 0.1], ['jumpBoulder', 0, 2.2], ['goTo', 17.8], ['hop', 2, 20.4, 1.4]]);
  });
  // Deux rochers à la suite
  c.section(26, (s) => {
    s.ground(0, 26, 1.4, rock);
    s.block(16, 1.4, 10, 1.4, rock);
    s.add('boulders', { x1: 1.5, x2: 15.5, y: 1.4, r: 0.6, dir: -1, speed: 6.5, period: 4.4, phase: 0 }, { x1: 1.5, x2: 15.5, y: 1.4, r: 0.6, dir: -1, speed: 6.5, period: 4.4, phase: 0.5 });
    s.checkpoint(0.4, 1.4);
    s.star(8.5, 4.4);
    s.pass('Deux rochers', [-2, 1.4], ['on', 16.3, 26, 2.8], [['goTo', 0.4], ['waitCycle', 4.4, 2.7, 2.8], ['jumpBoulder', 2, 2.2], ['jumpBoulder', 1, 2.2], ['dribbleRun', 1, 2, 13.6, 18], ['goTo', 22]]);
  });
  // Le gros rocher : trop gros pour sauter, on se cache dans la niche, puis on file sur le rebord
  c.section(30, (s) => {
    s.ground(0, 9, 2.8, rock);
    s.ground(9, 11.6, 1.0, rock);
    s.ground(11.6, 30, 2.8, rock);
    s.block(25.6, 2.8, 4.4, 1.4, rock);
    s.add('boulders', { x1: 3.6, x2: 25, y: 2.8, r: 1.4, dir: -1, speed: 6, period: 8, phase: 0 });
    s.checkpoint(0.4, 2.8);
    s.star(10.3, 3.8);
    s.pass('Dans la niche', [-2, 2.8], ['on', 9.2, 11.4, 1.0], [['goTo', 0.4], ['waitCycle', 8, 7.2, 7.3], ['hold', 1, 9.6], ['goTo', 10.3]]);
    s.pass('Sortir de la niche', [10.3, 1.0], ['on', 25.9, 30, 4.2], [['waitCycle', 8, 3.0, 3.1], ['hop', 2, 13], ['goTo', 23.6], ['hop', 2, 27, 4.2]]);
  });
  c.section(16, (s) => {
    s.ground(0, 16, 4.2, rock);
    s.hoop(10, 3.4, 4.2);
    s.pass('Le panier', [-2, 4.2], ['win'], 'shot');
  });
});

export const VOLCANO_LEVELS = [L21, L22, L23, L24, L25, V6, V7, V8, V9, V10];
