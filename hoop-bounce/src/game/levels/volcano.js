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

// 26 — La forge : le bloc de pierre fait un pont sous la hotte, le second une marche vers le soufflet
const L26 = level({ id: 'volcano-6', difficulty: 'medium', number: 6, nameKey: 'lv.volcano.6', idea: 'puzzle : un bloc pour pont, un bloc pour marche, le soufflet ouvre la forge', maxY: 11 }, (c) => {
  c.section(8, (s) => {
    s.ground(0, 8, 0, rock);
    s.spawn(2);
    s.hint(5, 4.3, 'hint.forge');
  });
  // La rigole de lave sous la hotte : trop basse pour sauter, il faut un pont
  c.section(24, (s) => {
    s.ground(0, 12, 0, rock);
    pool(s, 12, 15.2);
    s.ground(15.2, 24, 0, rock);
    s.block(10, 1.3, 7.6, 6, rock);
    const k = s.add('crates', { x: 4, y: 0, w: 3.1, h: 1.2 });
    s.star(13.6, 0.8);
    s.pass('Pousser le bloc dans la rigole', [-6, 0], ['crate', k, 11.9], [['goTo', 2.6], ['hold', 1, 11.6]]);
    s.pass('Le pont de pierre', [11, 0], ['on', 18, 24, 0], [['goTo', 10.2], ['run', 1, 18.2, 24, 0]]);
  });
  // Le soufflet est en haut : le second bloc sert de marche
  c.section(22, (s) => {
    s.ground(0, 22, 0, rock);
    const k = s.add('crates', { x: 3, y: 0, w: 1.6, h: 1.6 });
    s.block(12, 0, 10, 3.2, rock);
    const sw = s.add('switches', { x: 16.4, y: 3.2, w: 1.2, target: 'forge' });
    s.checkpoint(1, 0);
    s.pass('Le bloc contre la paroi', [-3, 0], ['crate', k, 10.3], [['goTo', 1.6], ['hold', 1, 9.95]]);
    s.pass('Bloc → paroi', [10, 0], ['on', 12.3, 22, 3.2], [['goTo', 8], ['hop', 2, 11.2, 1.6], ['settle'], ['hop', 3, 13.6, 3.2]]);
    s.pass('Le soufflet', [13.6, 3.2], ['switch', sw], [['goTo', 14.4], ['hop', 1, 17, 3.2]]);
  });
  // Les marteaux-pilons de la forge
  c.section(18, (s) => {
    s.ground(0, 18, 3.2, rock);
    s.add('crushers', { x: 4.6, w: 2.2, top: 6.4, bottom: 3.2, period: 2.4, phase: 0 }, { x: 10.8, w: 2.2, top: 6.4, bottom: 3.2, period: 2.4, phase: 0.5 });
    s.hint(1.5, 7.4, 'hint.crusher');
    s.star(8.7, 4.4);
    s.pass('Les marteaux-pilons', [-5, 3.2], ['on', 14.5, 18, 3.2], [['goTo', 2.4], ['wait', 1], ['waitCycle', 2.4, 1.8, 1.9], ['goTo', 8.7], ['waitCycle', 2.4, 1.2, 1.3], ['run', 1, 14.7, 18, 3.2]]);
  });
  // Les becs de gaz de la forge, puis la porte qui vient de s'ouvrir
  c.section(24, (s) => {
    s.ground(0, 4, 3.2, rock);
    s.ground(4, 24, 0, rock);
    s.add('lasers', flame(8, 0, 10.5, 0, 2.2, 1.0), flame(13, 0, 10.5, 0.5, 2.2, 1.0));
    s.add('doors', { id: 'forge', x: 19, y: 0, w: 0.8, h: 3.4, open: { dx: 0, dy: 3.4 }, duration: 0.8 });
    s.block(19, 3.4, 0.8, 8, 'wall');
    s.checkpoint(5, 0);
    s.star(10.5, 1.2);
    s.pass('Descendre', [-4, 3.2], ['on', 4.2, 7, 0], [['hold', 1, 4.4], ['goTo', 5.6]]);
    s.pass('Les becs de gaz', [5.6, 0], ['on', 20, 24, 0], [['goTo', 5.6], ['waitCycle', 2.2, 0.0, 0.1], ['goTo', 10.5], ['waitCycle', 2.2, 1.1, 1.2], ['run', 1, 20.2, 24, 0]]);
  });
  c.section(16, (s) => {
    s.ground(0, 16, 0, rock);
    s.hoop(10, 3.4);
    s.pass('Le panier', [-2, 0], ['win'], 'shot');
  });
});

// 27 — Le pont des geysers : des pierres fragiles entre les geysers ; on souffle sur les piliers
const L27 = level({ id: 'volcano-7', difficulty: 'hard', number: 7, nameKey: 'lv.volcano.7', idea: 'pont de pierres fragiles entre les geysers, piliers de repos' }, (c) => {
  c.section(8, (s) => {
    s.ground(0, 8, 0, rock);
    s.spawn(2);
    s.hint(5, 4.3, 'hint.geyser');
  });
  // Une travée : deux pierres fragiles, deux geysers, un pilier au bout
  const span = (name, phases, star, wait) => c.section(14, (s) => {
    pool(s, 0, 12);
    s.add('crumbles', { x: 2.6, y: 0, w: 2, h: 0.45 }, { x: 7.2, y: 0, w: 2, h: 0.45 });
    s.add('geysers', { x: 5.9, y: -0.4, h: 6, phase: phases[0] }, { x: 10.6, y: -0.4, h: 6, phase: phases[1] });
    s.block(12, -1.2, 2, 1.6, rock);
    s.checkpoint(-1, 0.4);
    if (star) s.star(star, 3.8);
    s.pass(name, [-1, 0.4], ['on', 12.2, 13.8, 0.4], [['goTo', -0.8], ['waitCycle', 3.2, wait, wait + 0.1], ['hop', 3, 3.6, 0.45], ['jump', 1, 8.2, 0.45], ['jump', 1, 13, 0.4], ['goTo', 13]]);
  });
  c.section(4, (s) => {
    s.ground(0, 2, 0, rock);
    pool(s, 2, 2.8);
    s.block(2.8, -1.2, 1.2, 1.6, rock);
    s.pass('Le premier pilier', [-6, 0], ['on', 2.9, 4, 0.4], [['goTo', 1], ['hop', 1, 3.4, 0.4]]);
  });
  span('Première travée', [0, 0], 5.9, 1.4);
  span('Deuxième travée', [0, 0.3], 10.6, 2.6);
  span('Troisième travée', [0.5, 0], null, 1.0);
  span('Quatrième travée', [0.25, 0.5], 10.6, 2.0);
  c.section(22, (s) => {
    pool(s, 0, 2);
    s.ground(2, 22, 0, rock);
    s.hoop(14, 3.4);
    s.pass('Le panier', [-1, 0.4], ['win'], [['hop', 2, 4, 0], ['shot']]);
  });
});

// 28 — Les ascenseurs : des pierres qui montent de la lave, des navettes, des pierres qui tombent
const L28 = level({ id: 'volcano-8', difficulty: 'medium', number: 8, nameKey: 'lv.volcano.8', idea: 'ascenseurs et navettes de pierre au-dessus de la lave', maxY: 14 }, (c) => {
  c.section(8, (s) => {
    s.ground(0, 8, 0, rock);
    s.spawn(2);
    s.hint(5, 4.3, 'hint.elevator');
  });
  c.section(16, (s) => {
    s.ground(0, 4, 0, rock);
    pool(s, 4, 7);
    const m = s.add('movers', { x: 4.1, y: -0.5, w: 2.8, h: 0.5, style: 'stone', path: { dx: 0, dy: 4.4, period: 4.4, phase: 0 } });
    s.block(7, -1.2, 9, 5.6, rock);
    s.star(5.5, 6.4);
    s.pass('L’ascenseur de lave', [-6, 0], ['on', 7.3, 16, 4.4], [['goTo', 2.8], ['waitMover', 'movers', m, 'y', '<', 0.05], ['goTo', 5.5], ['waitMover', 'movers', m, 'y', '>', 4.3], ['run', 1, 7.5, 16, 4.4]]);
  });
  // Les navettes : deux plateformes de pierre au-dessus du lac de lave
  c.section(26, (s) => {
    s.ground(0, 2, 4.4, rock);
    pool(s, 2, 24);
    const m1 = s.add('movers', { x: 2, y: 3.9, w: 2.6, h: 0.5, style: 'stone', path: { dx: 6.6, dy: 0, period: 4, phase: 0 } });
    s.block(11.2, -1.2, 2, 5.6, rock);
    const m2 = s.add('movers', { x: 13.2, y: 3.9, w: 2.6, h: 0.5, style: 'stone', path: { dx: 8.2, dy: 0, period: 4.4, phase: 0.5 } });
    s.ground(24, 26, 4.4, rock);
    s.checkpoint(1, 4.4);
    s.star(17.6, 6.4);
    s.pass('Première navette', [-2, 4.4], ['on', 11.3, 13.1, 4.4], [['goTo', 1], ['ride', m1, 20], ['goTo', 12.2]]);
    s.pass('Deuxième navette', [12.2, 4.4], ['on', 24.1, 26, 4.4], [['goTo', 12.6], ['ride', m2, 20], ['goTo', 25.2]]);
  });
  // Le grand ascenseur : des pierres tombent sur la plateforme, on monte entre deux chutes
  c.section(22, (s) => {
    s.ground(0, 4, 4.4, rock);
    pool(s, 4, 7, 4.4);
    const m = s.add('movers', { x: 4.3, y: 3.9, w: 2.4, h: 0.5, style: 'stone', path: { dx: 0, dy: 4.4, period: 5, phase: 0 } });
    s.block(7, 4.4, 15, 4.4, rock);
    s.add('rockfalls', { x: 5.5, y: 14, period: 5, phase: 0.6 });
    s.checkpoint(1.4, 4.4);
    s.pass('Le grand ascenseur', [-2, 4.4], ['on', 7.3, 22, 8.8], [['goTo', 2.8], ['waitMover', 'movers', m, 'y', '<', 0.05], ['goTo', 5.5], ['waitMover', 'movers', m, 'y', '>', 4.3], ['run', 1, 7.5, 12, 8.8]]);
  });
  // La descente : deux plaques fragiles au-dessus de la lave, jusqu'au panier
  c.section(22, (s) => {
    s.ground(0, 4, 8.8, rock);
    pool(s, 4, 22, 4.4);
    s.add('crumbles', { x: 5.4, y: 7.2, w: 2, h: 0.45 }, { x: 10, y: 5.8, w: 2, h: 0.45 });
    s.block(14.6, 4.4, 7.4, 0.2, rock);
    s.star(11, 8);
    s.pass('La descente', [-2, 8.8], ['on', 15, 22, 4.6], [['goTo', 2.8], ['hop', 2, 6.4, 7.65], ['jump', 1, 11, 6.25], ['jump', 1, 16.4, 4.6]]);
  });
  c.section(16, (s) => {
    s.ground(0, 16, 4.6, rock);
    s.hoop(10, 3.4, 4.6);
    s.pass('Le panier', [-2, 4.6], ['win'], 'shot');
  });
});

// 29 — Le cratère : des bouches de lave qui téléportent ; regarder où chacune mène
const L29 = level({ id: 'volcano-9', difficulty: 'hard', number: 9, nameKey: 'lv.volcano.9', idea: 'puzzle : choisir la bonne bouche (téléporteurs), interrupteur sur l’îlot', maxY: 11 }, (c) => {
  c.section(8, (s) => {
    s.ground(0, 8, 0, rock);
    s.spawn(2);
    s.hint(5, 4.3, 'hint.mouths');
  });
  // L'îlot aux deux bouches : la plus proche ramène au bord
  c.section(28, (s) => {
    s.ground(0, 6, 0, rock);
    s.block(5.4, 0, 0.6, 0.8, rock);
    pool(s, 6, 22);
    s.block(10, -1.2, 7, 1.6, rock);
    s.ground(22, 28, 0, rock);
    s.block(22, 0, 0.6, 0.8, rock);
    s.add('teleporters', { a: { x: 4, y: 2.6 }, b: { x: 13.2, y: 2.6 }, r: 0.8 });
    s.add('teleporters', { a: { x: 16, y: 1.3 }, b: { x: 1.6, y: 1.6 }, r: 0.8 });
    s.add('teleporters', { a: { x: 11, y: 1.3 }, b: { x: 24.4, y: 1.6 }, r: 0.8 });
    s.star(13.6, 4);
    s.pass('La bouche du bord', [-6, 0], ['on', 11.8, 15, 0.4], [['goTo', 2.8], ['hop', 2, 4.4], ['settle'], ['goTo', 13.6]]);
    s.pass('La bonne bouche', [13.6, 0.4], ['on', 22.2, 28, 0], [['run', -1, 22.7, 28, 0], ['settle'], ['goTo', 25.4]]);
  });
  // Le cratère en étages : une bouche monte au rebord, les pierres fragiles passent entre les geysers
  c.section(30, (s) => {
    s.ground(0, 4, 0, rock);
    pool(s, 4, 26);
    s.block(5, -1.2, 4, 6.8, rock);
    s.add('crumbles', { x: 10.4, y: 5.2, w: 2, h: 0.45 }, { x: 14.8, y: 5.2, w: 2, h: 0.45 });
    s.add('geysers', { x: 13.6, y: -0.4, h: 8.4, phase: 0 });
    s.block(19, -1.2, 4, 6.8, rock);
    s.ground(26, 30, 0, rock);
    s.add('teleporters', { a: { x: 2.4, y: 0.9 }, b: { x: 6.4, y: 6.6 }, r: 0.8 });
    s.add('teleporters', { a: { x: 22.2, y: 6.5 }, b: { x: 27, y: 1.6 }, r: 0.8 });
    s.checkpoint(1, 0);
    s.pass('Monter au rebord', [-2, 0], ['on', 5.2, 8.8, 5.6], [['goTo', 1], ['hold', 1, 2.2], ['settle'], ['goTo', 7.6]]);
    s.pass('Entre les geysers', [7.6, 5.6], ['on', 19.2, 21.4, 5.6], [['goTo', 7.8], ['waitCycle', 3.2, 0.0, 0.1], ['hop', 3, 11.4, 5.65], ['jump', 1, 15.8, 5.65], ['jump', 1, 20.2, 5.6], ['goTo', 20.4]]);
    s.pass('La bouche du bas', [20.4, 5.6], ['on', 26.2, 30, 0], [['hold', 1, 22], ['settle'], ['goTo', 28]]);
  });
  // La bouche au-dessus du pont fragile : on arrive en l'air, il faut enchaîner
  c.section(26, (s) => {
    s.ground(0, 5, 0, rock);
    pool(s, 5, 22);
    s.add('crumbles', { x: 9, y: 0, w: 2, h: 0.45 }, { x: 12.2, y: 0, w: 2, h: 0.45 }, { x: 15.4, y: 0, w: 2, h: 0.45 }, { x: 18.6, y: 0, w: 2, h: 0.45 });
    s.ground(22, 26, 0, rock);
    s.add('teleporters', { a: { x: 3.2, y: 2.6 }, b: { x: 9.6, y: 2.6 }, r: 0.8 });
    s.checkpoint(1, 0);
    s.star(14.8, 3);
    s.pass('La bouche du pont', [-2, 0], ['on', 22.2, 26, 0], [['goTo', 1.8], ['hop', 2, 3.6], ['jump', 1, 13.2, 0.45], ['jump', 1, 16.4, 0.45], ['jump', 1, 19.6, 0.45], ['jump', 1, 23.4, 0]]);
  });
  // L'interrupteur de l'îlot : seule une bouche y mène ; il ouvre la grille du panier
  c.section(26, (s) => {
    s.ground(0, 10, 0, rock);
    pool(s, 10, 18);
    s.block(13, -1.2, 2.4, 5.2, rock);
    s.block(15, 4, 0.4, 0.6, rock);
    const sw = s.add('switches', { x: 13.4, y: 4, w: 1.2, target: 'crater' });
    s.ground(18, 26, 0, rock);
    s.add('teleporters', { a: { x: 6, y: 2.6 }, b: { x: 13.9, y: 5.4 }, r: 0.8 });
    s.add('doors', { id: 'crater', x: 23, y: 0, w: 0.8, h: 3.4, open: { dx: 0, dy: 3.4 }, duration: 0.8 });
    s.block(23, 3.4, 0.8, 8, 'wall');
    s.checkpoint(1, 0);
    s.star(14.2, 7.4);
    s.pass('La bouche de l’îlot', [-2, 0], ['switch', sw], [['goTo', 4.8], ['hop', 2, 6.4]]);
    s.pass('Sauter sur l’autre rive', [14.2, 4], ['on', 18.2, 22.4, 0], [['settle'], ['goTo', 14.4], ['hop', 2, 19.6, 0], ['goTo', 20.4]]);
    s.pass('La grille s’ouvre', [20.4, 0], ['x', 24.4], [['hold', 1, 25]]);
  });
  c.section(16, (s) => {
    s.ground(0, 16, 0, rock);
    s.hoop(10, 3.4);
    s.pass('Le panier', [-2, 0], ['win'], 'shot');
  });
});

// 30 — Le cœur du volcan : pierres qui tombent sur le pont fragile, geysers sur les marches,
// ascenseur sous les canons, coulée de rochers, puis le soufflet qui ouvre le dernier panier.
const L30 = level({ id: 'volcano-10', difficulty: 'expert', number: 10, nameKey: 'lv.volcano.10', idea: 'finale : tout le volcan', maxY: 13 }, (c) => {
  c.section(8, (s) => {
    s.ground(0, 8, 0, rock);
    s.spawn(2);
  });
  // Le pont fragile sous les pierres
  c.section(22, (s) => {
    s.ground(0, 3, 0, rock);
    pool(s, 3, 17);
    s.add('crumbles', { x: 4.6, y: 0, w: 2, h: 0.45 }, { x: 8.8, y: 0, w: 2, h: 0.45 }, { x: 13, y: 0, w: 2, h: 0.45 });
    s.add('rockfalls', { x: 9.8, y: 12, phase: 0 }, { x: 14, y: 12, phase: 0.5 });
    s.ground(17, 22, 0, rock);
    s.star(9.8, 2.6);
    s.pass('Le pont sous les pierres', [-6, 0], ['on', 17.3, 22, 0], [['goTo', 1.8], ['waitCycle', 2.8, 2.4, 2.8], ['hop', 3, 5.6, 0.45], ['jump', 1, 9.8, 0.45], ['jump', 1, 14, 0.45], ['jump', 1, 18.8, 0]]);
  });
  // Deux marches de basalte
  c.section(10, (s) => {
    s.ground(0, 10, 0, rock);
    s.block(2, 0, 8, 1.4, rock);
    s.block(6, 1.4, 4, 1.4, rock);
    s.checkpoint(0.6, 0);
    s.pass('Les marches', [-2, 0], ['on', 6.3, 10, 2.8], [['goTo', 0.4], ['hop', 2, 3.4, 1.4], ['settle'], ['hop', 2, 7.4, 2.8]]);
  });
  // L'ascenseur sous les canons : les canons du plafond tirent entre deux montées
  c.section(18, (s) => {
    s.ground(0, 3, 2.8, rock);
    pool(s, 3, 6, 2.8);
    const m = s.add('movers', { x: 3.3, y: 2.3, w: 2.4, h: 0.5, style: 'stone', path: { dx: 0, dy: 4, period: 4.4, phase: 0 } });
    s.block(6, 2.8, 12, 4, rock);
    s.block(9, 11, 9, 2, rock);
    s.add('cannons', { x: 12, y: 10.6, angle: -Math.PI / 2, period: 2.2, phase: 0 }, { x: 15, y: 10.6, angle: -Math.PI / 2, period: 2.2, phase: 0.5 });
    s.checkpoint(1.4, 2.8);
    s.pass('L’ascenseur', [-2, 2.8], ['on', 6.3, 10.6, 6.8], [['goTo', 2.2], ['waitMover', 'movers', m, 'y', '<', 0.05], ['goTo', 4.5], ['waitMover', 'movers', m, 'y', '>', 3.9], ['run', 1, 6.5, 10.6, 6.8], ['goTo', 9.6]]);
    s.pass('Sous les canons', [9.6, 6.8], ['on', 16.4, 18, 6.8], [['goTo', 9.6], ['waitCycle', 2.2, 1.3, 1.4], ['run', 1, 16.6, 18, 6.8]]);
  });
  // La coulée : deux rochers de lave, puis la marche
  c.section(22, (s) => {
    s.ground(0, 22, 6.8, rock);
    s.block(16, 6.8, 6, 1.4, rock);
    s.add('boulders', { x1: 1.5, x2: 15.5, y: 6.8, r: 0.6, dir: -1, speed: 6.5, period: 4.4, phase: 0 }, { x1: 1.5, x2: 15.5, y: 6.8, r: 0.6, dir: -1, speed: 6.5, period: 4.4, phase: 0.5 });
    s.checkpoint(0.4, 6.8);
    s.star(8.5, 9.8);
    s.pass('La coulée', [-2, 6.8], ['on', 16.3, 22, 8.2], [['goTo', 0.4], ['waitCycle', 4.4, 3.4, 3.5], ['jumpBoulder', 1, 2.2], ['jumpBoulder', 0, 2.2], ['dribbleRun', 1, 2, 13.6, 18], ['goTo', 20]]);
  });
  // Le soufflet du cœur : il ouvre la dernière porte, gardée par deux flammes
  c.section(30, (s) => {
    s.ground(0, 6, 8.2, rock);
    s.ground(6, 30, 0, rock);
    const sw = s.add('switches', { x: 3.4, y: 8.2, w: 1.2, target: 'heart' });
    s.add('lasers', flame(13, 0, 11, 0, 2.2, 1.0));
    s.add('doors', { id: 'heart', x: 25, y: 0, w: 0.8, h: 3.4, open: { dx: 0, dy: 3.4 }, duration: 0.8 });
    s.block(25, 3.4, 0.8, 9.6, 'wall');
    s.checkpoint(7.5, 0);
    s.star(13, 4.6);
    s.pass('Le soufflet du cœur', [-2, 8.2], ['switch', sw], [['goTo', 2.4], ['hop', 1, 4, 8.2]]);
    s.pass('Descendre', [4, 8.2], ['on', 6.2, 9, 0], [['hold', 1, 6.4], ['goTo', 7.8]]);
    s.pass('La flamme et la porte', [7.8, 0], ['on', 26, 30, 0], [['goTo', 9], ['waitCycle', 2.2, 0.0, 0.3], ['run', 1, 26.2, 30, 0]]);
  });
  c.section(16, (s) => {
    s.ground(0, 16, 0, rock);
    s.hoop(10, 3.4);
    s.pass('Le dernier panier', [-2, 0], ['win'], 'shot');
  });
});

export const VOLCANO_LEVELS = [L21, L22, L23, L24, L25, L26, L27, L28, L29, L30];
