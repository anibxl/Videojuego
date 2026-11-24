// MONDE 4 — FORÊT : PRÉCISION (refonte phase 2). 45 à 60 s par niveau pour un joueur.
// Champignons rebondissants, lianes, branches qui bougent ou qui cassent, troncs qui roulent ou qui
// flottent, troncs-balanciers à pointes, troncs-marteaux, rivière. Les erreurs coûtent plus cher : moins
// de points de contrôle, des chutes dans la rivière.
//
// 31 La clairière          champignons : souche, ronces, rivière, le grand champignon (découverte)
// 32 La rivière aux lianes  une liane, puis trois, puis entre les balanciers (★ mémorable)
// 33 Les branches          branches qui montent, qui glissent, qui cassent (technique)
// 34 Les troncs            troncs qui roulent, rondins qui dévalent, tronc flottant (rapide)
// 35 Le bûcheron           balanciers à pointes et troncs-marteaux (précision)
// 36 La cabane             deux leviers, deux portes, un champignon (puzzle)
// 37 Les planches magiques planches qui apparaissent et disparaissent au-dessus de l'eau (rythme)
// 38 La canopée            tout en hauteur : lianes, branches, champignons (technique)
// 39 Les arbres creux      les troncs creux téléportent ; lequel prendre ? (★ puzzle)
// 40 La forêt profonde     finale (★)

import { level } from './kit.js';

const wood = 'wood';
const moss = 'block';

/** Rivière de x0 à x1 (surface 0,5 sous le sol `top`). */
function river(s, x0, x1, top = 0) {
  s.ground(x0, x1, top - 1.2);
  s.add('water', { x: x0, y: top - 0.5, w: x1 - x0 });
}

// 31 — La clairière : les champignons
const L31 = level({ id: 'forest-1', difficulty: 'medium', number: 1, nameKey: 'lv.forest.1', idea: 'champignons : souche, ronces, rivière, grand champignon', maxY: 14 }, (c) => {
  c.section(8, (s) => {
    s.ground(0, 8);
    s.spawn(2);
    s.hint(5, 4.3, 'hint.mushroom');
  });
  c.section(18, (s) => {
    s.ground(0, 18);
    s.add('mushrooms', { x: 4, y: 1, w: 1.8, height: 6 });
    s.block(9, 0, 9, 4, wood);
    s.star(4.9, 6.4);
    s.pass('Champignon → souche', [-6, 0], ['on', 9.3, 18, 4], [['goTo', 2.2], ['hop', 2, 4.9], ['fly', 11], ['goTo', 16.6]]);
  });
  // Les ronces : trois champignons au-dessus des épines
  c.section(22, (s) => {
    s.ground(0, 22);
    s.add('spikes', { x: 0, y: 0, w: 18, dir: 'up' });
    s.add('mushrooms', { x: 3, y: 1, w: 1.8, height: 5 }, { x: 8.6, y: 1, w: 1.8, height: 5 }, { x: 14.2, y: 1, w: 1.8, height: 5 });
    s.star(9.5, 6.6);
    s.pass('Les ronces', [-1.4, 4], ['on', 18.2, 22, 0], [['hold', 1, -0.2], ['fly', 3.9], ['fly', 9.5], ['fly', 15.1], ['fly', 20]]);
  });
  // Champignons dans la rivière
  c.section(24, (s) => {
    s.ground(0, 3);
    river(s, 3, 19);
    s.add('mushrooms', { x: 6, y: 0.8, w: 1.8, height: 4.4 }, { x: 12, y: 0.8, w: 1.8, height: 4.4 });
    s.ground(19, 24);
    s.checkpoint(1, 0);
    s.star(12.9, 5.4);
    s.pass('Champignons dans la rivière', [-2, 0], ['on', 19.2, 24, 0], [['goTo', 2.2], ['hop', 3, 6.9], ['fly', 12.9], ['fly', 20.6]]);
  });
  // L'escalier de souches : un champignon sur chaque souche
  c.section(24, (s) => {
    s.ground(0, 24);
    s.add('mushrooms', { x: 2.6, y: 1, w: 1.8, height: 5 });
    s.block(6.4, 0, 4.6, 3.2, wood);
    s.add('mushrooms', { x: 8.8, y: 3.4, w: 1.6, height: 5 });
    s.block(13, 0, 4.6, 6.2, wood);
    s.block(17.6, 0, 6.4, 1.2, wood);
    s.checkpoint(0.8, 0);
    s.star(15.3, 8.2);
    s.pass('L’escalier de souches', [-2, 0], ['on', 13.3, 17.4, 6.2], [['goTo', 0.8], ['hop', 2, 3.5], ['fly', 7.6], ['goTo', 7.8], ['hop', 1, 9.6], ['fly', 14.6], ['goTo', 15.3]]);
    s.pass('Redescendre', [15.3, 6.2], ['on', 17.8, 24, 1.2], [['hold', 1, 17.8], ['goTo', 20]]);
  });
  // Le grand champignon : par-dessus le vieux mur moussu
  c.section(22, (s) => {
    s.ground(0, 22);
    s.add('mushrooms', { x: 5, y: 1, w: 1.6, height: 9.6 });
    s.block(10, 0, 1.6, 8.4, moss);
    s.star(10.8, 11.6);
    s.pass('Le grand champignon', [-4, 1.2], ['on', 12, 22, 0], [['goTo', 3.2], ['hop', 2, 5.8], ['fly', 14.5]]);
  });
  c.section(16, (s) => {
    s.ground(0, 16);
    s.hoop(10, 3.4);
    s.pass('Le panier', [-2, 0], ['win'], 'shot');
  });
});

// 32 — La rivière aux lianes
const L32 = level({ id: 'forest-2', difficulty: 'medium', number: 2, nameKey: 'lv.forest.2', idea: 'lianes : une, trois, puis entre les balanciers', maxY: 12 }, (c) => {
  c.section(8, (s) => {
    s.ground(0, 8);
    s.spawn(2);
    s.hint(5, 4.6, 'hint.vine');
  });
  c.section(20, (s) => {
    s.ground(0, 4);
    river(s, 4, 14);
    s.add('vines', { x: 6.8, y: 9.4, len: 6.4 });
    s.ground(14, 20);
    s.star(7.4, 4.6);
    s.pass('La première liane', [-6, 0], ['on', 14.2, 20, 0], [['goTo', 3.2], ['charge', 4], ['vines', 14.4], ['goTo', 17]]);
  });
  // Trois lianes à la suite
  c.section(26, (s) => {
    s.ground(0, 3);
    river(s, 3, 21);
    s.add('vines', { x: 5.6, y: 9.6, len: 6.4 }, { x: 11.4, y: 9.6, len: 6.4 }, { x: 17.2, y: 9.6, len: 6.4 });
    s.ground(21, 26);
    s.checkpoint(1, 0);
    s.star(14.3, 5.4);
    s.pass('Trois lianes', [-3, 0], ['on', 21.2, 26, 0], [['goTo', 2.2], ['charge', 4], ['vines', 21.4], ['goTo', 23.6]]);
  });
  // Les balanciers : deux troncs à pointes se balancent entre les lianes
  c.section(26, (s) => {
    s.ground(0, 3);
    river(s, 3, 21);
    s.add('vines', { x: 5.6, y: 9.6, len: 6.4 }, { x: 11.4, y: 9.6, len: 6.4 }, { x: 17.2, y: 9.6, len: 6.4 });
    s.add('maces', { x: 8.5, y: 12.5, len: 4.2, r: 0.5, amp: 0.7, period: 3.2, phase: 0 }, { x: 14.3, y: 12.5, len: 4.2, r: 0.5, amp: 0.7, period: 3.2, phase: 0.5 });
    s.ground(21, 26);
    s.checkpoint(1, 0);
    s.star(11.4, 4.2);
    s.pass('Entre les balanciers', [-2.6, 0], ['on', 21.2, 26, 0], [['goTo', 2.2], ['charge', 4], ['waitCycle', 3.2, 1.8, 1.9], ['vines', 21.4], ['goTo', 23.6]]);
  });
  // La dernière liane mène sur la souche
  c.section(18, (s) => {
    s.ground(0, 2);
    river(s, 2, 11);
    s.add('vines', { x: 4.6, y: 10, len: 6 });
    s.block(11, -1.2, 7, 4.2, wood);
    s.star(9.6, 6);
    s.pass('Liane → souche', [-2.6, 0], ['on', 11.2, 18, 3], [['goTo', 1.2], ['charge', 4], ['vines', 11.4], ['goTo', 13]]);
  });
  // Redescendre par la liane, sous le balancier
  c.section(20, (s) => {
    s.ground(0, 2, 3, wood);
    river(s, 2, 14);
    s.add('vines', { x: 5, y: 10.4, len: 6 });
    s.add('maces', { x: 10, y: 12, len: 5.6, r: 0.5, amp: 0.7, period: 3, phase: 0 });
    s.ground(14, 20);
    s.checkpoint(1, 3);
    s.star(8.4, 6.4);
    s.pass('Redescendre par la liane', [-4, 3], ['on', 14.2, 20, 0], [['goTo', 1.2], ['charge', 4], ['waitCycle', 3, 0.5, 0.6], ['vines', 14.4], ['goTo', 16]]);
  });
  c.section(16, (s) => {
    s.ground(0, 16);
    s.hoop(10, 3.4);
    s.pass('Le panier', [-2, 0], ['win'], 'shot');
  });
});

// 33 — Les branches : elles montent, elles glissent, elles cassent
const L33 = level({ id: 'forest-3', difficulty: 'hard', number: 3, nameKey: 'lv.forest.3', idea: 'branches mobiles, branches fragiles, jusqu’à la cabane', maxY: 17 }, (c) => {
  c.section(8, (s) => {
    s.ground(0, 8);
    s.spawn(2);
    s.hint(5, 4.3, 'hint.branches');
  });
  // On monte de branche en branche jusqu'au premier palier
  c.section(20, (s) => {
    s.ground(0, 20);
    const b0 = s.add('branches', { x1: 4, x2: 6.5, y: 2.4, path: { dx: 0, dy: 1.2, period: 4, phase: 0 } });
    const b1 = s.add('branches', { x1: 7.5, x2: 10, y: 4.6, path: { dx: 1, dy: 0, period: 3.6, phase: 0.25 } });
    s.block(13, 0, 7, 6.6, wood);
    s.star(9.2, 7.6);
    s.pass('Les branches qui bougent', [-6, 0], ['on', 13.3, 20, 6.6], [['goTo', 5.25], ['hopTo', 4, 'branches', b0, 1.25], ['hopTo', 2, 'branches', b1, 1.25], ['hop', 2, 14.4, 6.6], ['goTo', 18.6]]);
  });
  // Les branches fragiles au-dessus de la rivière
  c.section(22, (s) => {
    s.ground(0, 2, 6.6, wood);
    river(s, 2, 18);
    s.add('fallers', { x: 3, y: 6.2, w: 2.4, h: 0.4 }, { x: 6.4, y: 6.2, w: 2.4, h: 0.4 }, { x: 9.8, y: 6.2, w: 2.4, h: 0.4 }, { x: 13.2, y: 6.2, w: 2.4, h: 0.4 });
    s.block(18, -1.2, 4, 7.8, wood);
    s.checkpoint(1, 6.6);
    s.star(11, 8.6);
    s.pass('Les branches fragiles', [-2, 6.6], ['on', 18.2, 22, 6.6], [['goTo', 1], ['hop', 2, 4.2, 6.6], ['jump', 1, 7.6, 6.6], ['jump', 1, 11, 6.6], ['jump', 1, 14.4, 6.6], ['jump', 1, 19.6, 6.6]]);
  });
  // Les branches qui glissent : on attend que la suivante revienne
  c.section(24, (s) => {
    s.ground(0, 2, 6.6, wood);
    river(s, 2, 18);
    const b0 = s.add('branches', { x1: 3, x2: 5.6, y: 6.6, path: { dx: 4.4, dy: 0, period: 4.4, phase: 0 } });
    const b1 = s.add('branches', { x1: 10.4, x2: 13, y: 6.6, path: { dx: 4.4, dy: 0, period: 4.4, phase: 0.5 } });
    s.block(18, -1.2, 6, 7.8, wood);
    s.checkpoint(1, 6.6);
    s.star(12, 8.6);
    s.pass('Première branche glissante', [-2, 6.6], ['on', 10.4, 13, 6.6], [['goTo', 1.6], ['waitMover', 'branches', b0, 'x', '<', 0.1], ['hopTo', 1, 'branches', b0, 1.3], ['stayOn', 'branches', b0, 'x', '>', 4.3], ['hopTo', 1, 'branches', b1, 1.3]]);
    s.pass('Deuxième branche glissante', [11.7, 6.6], ['on', 18.2, 24, 6.6], [['stayOn', 'branches', b1, 'x', '>', 4.3], ['hop', 1, 19.6, 6.6], ['goTo', 21]]);
  });
  // L'échelle de branches : jusqu'au toit de la cabane
  c.section(18, (s) => {
    s.ground(0, 18, 6.6, wood);
    const b0 = s.add('branches', { x1: 3.4, x2: 5.9, y: 8.4, path: { dx: 0, dy: 1.4, period: 3.6, phase: 0 } });
    const b1 = s.add('branches', { x1: 7.4, x2: 9.9, y: 10.4, path: { dx: 0, dy: 1.2, period: 3.6, phase: 0.5 } });
    s.block(12, 6.6, 6, 4.8, wood);
    s.star(8.6, 13.2);
    s.pass('L’échelle de branches', [-3, 6.6], ['on', 12.3, 18, 11.4], [['goTo', 4.65], ['hopTo', 3, 'branches', b0, 1.25], ['hopTo', 2, 'branches', b1, 1.25], ['hop', 2, 13.6, 11.4], ['goTo', 14]]);
  });
  // Le toit de la cabane
  c.section(16, (s) => {
    s.ground(0, 16, 11.4, wood);
    s.hoop(10, 3.4, 11.4);
    s.pass('Le panier de la cabane', [-2, 11.4], ['win'], 'shot');
  });
});

// 34 — Les troncs : ils roulent, ils dévalent, ils flottent
const L34 = level({ id: 'forest-4', difficulty: 'medium', number: 4, nameKey: 'lv.forest.4', idea: 'troncs qui roulent, rondins qui dévalent, tronc flottant' }, (c) => {
  c.section(8, (s) => {
    s.ground(0, 8);
    s.spawn(2);
    s.hint(5, 4.3, 'hint.log');
  });
  c.section(20, (s) => {
    s.ground(0, 20);
    const k = s.add('logs', { x: 6, y: 0.6, r: 0.6, path: { dx: 6, dy: 0, period: 5, phase: 0 } });
    s.star(9, 2.8);
    s.pass('Par-dessus le tronc', [-6, 0], ['on', 15, 20, 0], [['goTo', 3.2], ['waitMover', 'rollers', k, 'x', '<', 0.3], ['jumpOver', 'rollers', k], ['goTo', 17]]);
  });
  // Les rondins dévalent la pente de la souche
  c.section(24, (s) => {
    s.ground(0, 24);
    s.block(20, 0, 4, 1.4, wood);
    s.add('boulders', { x1: 1.5, x2: 19.5, y: 0, r: 0.55, dir: -1, speed: 6, period: 4.4, phase: 0 }, { x1: 1.5, x2: 19.5, y: 0, r: 0.55, dir: -1, speed: 6, period: 4.4, phase: 0.5 });
    s.checkpoint(0.4, 0);
    s.star(10, 2.6);
    s.pass('Les rondins', [-3, 0], ['on', 20.3, 24, 1.4], [['goTo', 0.4], ['waitCycle', 4.4, 3.2, 3.3], ['jumpBoulder', 1, 2.2], ['jumpBoulder', 0, 2.2], ['dribbleRun', 1, 2, 18, 21.4], ['goTo', 22.6]]);
  });
  // Le tronc flottant
  c.section(24, (s) => {
    s.ground(0, 3, 1.4, wood);
    river(s, 3, 18);
    const k = s.add('logs', { x: 3.7, y: -0.2, r: 0.7, path: { dx: 13.6, dy: 0, period: 8, phase: 0 } });
    s.ground(18, 24);
    s.checkpoint(1.6, 1.4);
    s.star(10.4, 2.2);
    s.pass('Le tronc flottant', [-1.4, 1.4], ['on', 18.2, 24, 0], [['goTo', 2.2], ['waitMover', 'rollers', k, 'x', '<', 0.15], ['hopTo', 1, 'rollers', k, 0], ['stayOn', 'rollers', k, 'x', '>', 13.2], ['hop', 2, 19.6], ['goTo', 20.4]]);
  });
  // Deux troncs qui roulent l'un vers l'autre
  c.section(24, (s) => {
    s.ground(0, 24);
    const a = s.add('logs', { x: 4, y: 0.6, r: 0.6, path: { dx: 5, dy: 0, period: 4, phase: 0 } });
    const b = s.add('logs', { x: 12, y: 0.6, r: 0.6, path: { dx: 5, dy: 0, period: 4, phase: 0.5 } });
    s.checkpoint(0.6, 0);
    s.star(10.5, 2.8);
    s.pass('Premier tronc', [-3.6, 0], ['on', 10, 11.4, 0], [['goTo', 1.6], ['waitMover', 'rollers', a, 'x', '<', 0.3], ['jumpOver', 'rollers', a], ['goTo', 10.7]]);
    s.pass('Deuxième tronc', [10.7, 0], ['on', 19.5, 24, 0], [['waitMover', 'rollers', b, 'x', '<', 0.3], ['jumpOver', 'rollers', b], ['goTo', 21]]);
  });
  c.section(16, (s) => {
    s.ground(0, 16);
    s.hoop(10, 3.4);
    s.pass('Le panier', [-2, 0], ['win'], 'shot');
  });
});

// 35 — Le bûcheron : balanciers à pointes et troncs-marteaux
const L35 = level({ id: 'forest-5', difficulty: 'hard', number: 5, nameKey: 'lv.forest.5', idea: 'balanciers à pointes et troncs-marteaux : le bon moment', maxY: 12 }, (c) => {
  c.section(8, (s) => {
    s.ground(0, 8);
    s.spawn(2);
    s.hint(5, 4.3, 'hint.mace');
  });
  // Le premier balancier
  c.section(18, (s) => {
    s.ground(0, 18);
    s.add('maces', { x: 9, y: 6.4, len: 5.4, r: 0.55, amp: 0.8, period: 2.8, phase: 0 });
    s.star(9, 2.2);
    s.pass('Le premier balancier', [-6, 0], ['on', 14, 18, 0], [['goTo', 3], ['waitCycle', 2.8, 1.2, 1.3], ['run', 1, 14.2, 18, 0]]);
  });
  // Le tronc-marteau, puis un balancier juste derrière
  c.section(22, (s) => {
    s.ground(0, 22);
    s.add('crushers', { x: 4, w: 2.4, top: 3.2, bottom: 0, period: 2.4, phase: 0 });
    s.add('maces', { x: 13, y: 6.4, len: 5.4, r: 0.55, amp: 0.8, period: 2.4, phase: 0.5 });
    s.checkpoint(0.4, 0);
    s.star(9, 1.2);
    s.pass('Le tronc-marteau', [-3, 0], ['on', 8, 10, 0], [['goTo', 1.6], ['waitCycle', 2.4, 1.8, 1.9], ['run', 1, 8.2, 10, 0], ['goTo', 9]]);
    s.pass('Le balancier derrière', [9, 0], ['on', 18, 22, 0], [['goTo', 9], ['waitCycle', 2.4, 0.0, 0.1], ['run', 1, 18.2, 22, 0]]);
  });
  // Le pont de rondins : deux balanciers au-dessus de la rivière
  c.section(24, (s) => {
    s.ground(0, 3);
    river(s, 3, 21);
    s.block(3, -1.2, 18, 1.2, wood);
    s.add('maces', { x: 8, y: 6.4, len: 5.4, r: 0.55, amp: 0.8, period: 3, phase: 0 }, { x: 15, y: 6.4, len: 5.4, r: 0.55, amp: 0.8, period: 3, phase: 0.5 });
    s.ground(21, 24);
    s.checkpoint(1, 0);
    s.star(11.5, 1.2);
    s.pass('Le pont de rondins', [-2, 0], ['on', 21.2, 24, 0], [['goTo', 1.2], ['waitCycle', 3, 1.3, 1.4], ['goTo', 11.5], ['waitCycle', 3, 1.7, 1.8], ['run', 1, 21.4, 24, 0]]);
  });
  // Deux troncs-marteaux en alternance, une souche au milieu
  c.section(22, (s) => {
    s.ground(0, 22);
    s.add('crushers', { x: 4, w: 2.4, top: 3.2, bottom: 0, period: 2.2, phase: 0 }, { x: 12, w: 2.4, top: 3.2, bottom: 0, period: 2.2, phase: 0.5 });
    s.checkpoint(0.6, 0);
    s.star(9.2, 1.2);
    s.pass('Deux troncs-marteaux', [-1, 0], ['on', 17, 22, 0], [['goTo', 1.6], ['waitCycle', 2.2, 1.6, 1.7], ['goTo', 9.2], ['waitCycle', 2.2, 0.5, 0.6], ['run', 1, 17.2, 22, 0]]);
  });
  c.section(16, (s) => {
    s.ground(0, 16);
    s.hoop(10, 3.4);
    s.pass('Le panier', [-2, 0], ['win'], 'shot');
  });
});

const blink = (x, y, w, phase, period = 3, on = 1.6) => ({ x, y, w, h: 0.4, period, on, phase });

// 36 — La cabane : deux leviers, deux portes
const L36 = level({ id: 'forest-6', difficulty: 'medium', number: 6, nameKey: 'lv.forest.6', idea: 'puzzle : levier du champignon, levier de la caisse, la cabane s’ouvre', maxY: 12 }, (c) => {
  c.section(8, (s) => {
    s.ground(0, 8);
    s.spawn(2);
    s.hint(5, 4.3, 'hint.levers');
  });
  // Le premier levier est sur la planche, là-haut : seul le champignon y mène
  c.section(24, (s) => {
    s.ground(0, 24);
    s.add('mushrooms', { x: 3, y: 1, w: 1.8, height: 6.4 });
    s.block(7, 5.4, 4.4, 0.5, wood);
    const sw = s.add('switches', { x: 8.6, y: 5.9, w: 1.2, target: 'gateA' });
    s.add('doors', { id: 'gateA', x: 17, y: 0, w: 0.8, h: 3.4, open: { dx: 0, dy: 3.4 }, duration: 0.8 });
    s.block(17, 3.4, 0.8, 8.6, 'wall');
    s.star(9.2, 8);
    s.pass('Champignon → levier', [-6, 0], ['switch', sw], [['goTo', 1.4], ['hop', 2, 3.9], ['fly', 9.2]]);
    s.pass('La première porte', [9.2, 5.9], ['on', 18.2, 24, 0], [['hold', 1, 11.8], ['run', 1, 18.2, 24, 0]]);
  });
  // Le second levier : la caisse sert de marche
  c.section(24, (s) => {
    s.ground(0, 24);
    const k = s.add('crates', { x: 4, y: 0, w: 1.6, h: 1.6 });
    s.block(13, 0, 6, 3.2, wood);
    const sw = s.add('switches', { x: 15.6, y: 3.2, w: 1.2, target: 'gateB' });
    s.checkpoint(1, 0);
    s.hint(1.5, 4.3, 'hint.crate');
    s.star(16.2, 6);
    s.pass('Pousser la caisse', [-3, 0], ['crate', k, 11.3], [['goTo', 2.6], ['hold', 1, 10.95]]);
    s.pass('Caisse → souche', [11, 0], ['on', 13.3, 15.4, 3.2], [['goTo', 9], ['hop', 2, 12.2, 1.6], ['settle'], ['hop', 2, 14.2, 3.2]]);
    s.pass('Le second levier', [14.2, 3.2], ['switch', sw], [['goTo', 14.2], ['hop', 1, 16.2, 3.2]]);
  });
  // La porte de la cabane, puis le champignon qui monte au balcon
  c.section(24, (s) => {
    s.ground(0, 24);
    s.add('doors', { id: 'gateB', x: 4, y: 0, w: 0.8, h: 3.4, open: { dx: 0, dy: 3.4 }, duration: 0.8 });
    s.block(4, 3.4, 0.8, 8.6, 'wall');
    const b = s.add('branches', { x1: 8, x2: 10.6, y: 0.6, path: { dx: 0, dy: 4.6, period: 5, phase: 0 } });
    s.block(11.4, 0, 12.6, 5.2, wood);
    s.star(9.3, 7.4);
    s.pass('Descendre de la souche', [-6, 3.2], ['on', 0, 3.4, 0], [['hold', 1, -4.6], ['goTo', 1.6]]);
    s.pass('La porte de la cabane → le monte-charge', [1.6, 0], ['on', 11.6, 24, 5.2], [['goTo', 6.6], ['waitMover', 'branches', b, 'y', '<', 0.05], ['hopTo', 1, 'branches', b, 1.3], ['stayOn', 'branches', b, 'y', '>', 4.5], ['hop', 1, 13.2, 5.2], ['goTo', 20]]);
  });
  // Le balcon : des planches pourries au-dessus du vide
  c.section(20, (s) => {
    s.ground(0, 2, 5.2, wood);
    s.ground(2, 18, 0);
    s.add('spikes', { x: 2, y: 0, w: 16, dir: 'up' });
    s.add('fallers', { x: 3, y: 4.8, w: 2.4, h: 0.4 }, { x: 6.6, y: 4.8, w: 2.4, h: 0.4 }, { x: 10.2, y: 4.8, w: 2.4, h: 0.4 }, { x: 13.8, y: 4.8, w: 2.4, h: 0.4 });
    s.ground(18, 20, 4.6, wood);
    s.checkpoint(1, 5.2);
    s.star(11.4, 7.2);
    s.pass('Les planches pourries', [-2, 5.2], ['on', 18.2, 20, 4.6], [['goTo', 1], ['hop', 2, 4.2, 5.2], ['jump', 1, 7.8, 5.2], ['jump', 1, 11.4, 5.2], ['jump', 1, 15, 5.2], ['jump', 1, 19, 4.6]]);
  });
  c.section(16, (s) => {
    s.ground(0, 16, 4.6, wood);
    s.hoop(10, 3.4, 4.6);
    s.pass('Le panier du balcon', [-2, 4.6], ['win'], 'shot');
  });
});

// 37 — Les planches magiques : elles apparaissent et disparaissent au-dessus de l'eau
const L37 = level({ id: 'forest-7', difficulty: 'hard', number: 7, nameKey: 'lv.forest.7', idea: 'planches qui clignotent : vague, escalier, descente', maxY: 12 }, (c) => {
  c.section(8, (s) => {
    s.ground(0, 8);
    s.spawn(2);
    s.hint(5, 4.3, 'hint.blinkers');
  });
  // La vague : les planches apparaissent l'une après l'autre
  c.section(22, (s) => {
    s.ground(0, 3);
    river(s, 3, 19);
    s.add('blinkers', blink(5, 0, 2.4, 0), blink(9.6, 0, 2.4, 0.8), blink(14.2, 0, 2.4, 0.6));
    s.ground(19, 22);
    s.star(10.8, 3.4);
    s.pass('La vague', [-6, 0], ['on', 19.2, 22, 0], [['goTo', 2.2], ['waitCycle', 3, 1.6, 1.7], ['hop', 3, 6.2, 0.4], ['jump', 1, 10.8, 0.4], ['jump', 1, 15.4, 0.4], ['jump', 1, 20.4, 0]]);
  });
  // L'escalier magique jusqu'à la souche
  c.section(24, (s) => {
    s.ground(0, 2);
    river(s, 2, 16);
    s.add('blinkers', blink(3.4, 1.2, 2.4, 0), blink(7.6, 2.8, 2.4, 0.8), blink(11.8, 4.4, 2.4, 0.6));
    s.block(16, -1.2, 8, 7.6, wood);
    s.checkpoint(1, 0);
    s.star(9, 5.4);
    s.pass('L’escalier magique', [-2, 0], ['on', 16.2, 24, 6.4], [['goTo', 1.2], ['waitCycle', 3, 2.5, 2.6], ['hop', 3, 4.6, 1.6], ['jump', 1, 8.8, 3.2], ['jump', 1, 13, 4.8], ['jump', 1, 17.6, 6.4], ['goTo', 22.6]]);
  });
  // La descente : planche magique, branche fragile, planche magique
  c.section(24, (s) => {
    s.ground(0, 2, 6.4, wood);
    river(s, 2, 19);
    s.add('blinkers', blink(3.4, 5.6, 2.4, 0), blink(12.2, 3.2, 2.4, 0.7));
    s.add('fallers', { x: 7.8, y: 4.4, w: 2.4, h: 0.4 });
    s.ground(19, 24);
    s.checkpoint(0.8, 6.4);
    s.star(9, 7);
    s.pass('La descente', [-2, 6.4], ['on', 19.2, 24, 0], [['goTo', 1], ['waitCycle', 3, 1.9, 2.0], ['hop', 2, 4.6, 6.0], ['jump', 1, 9, 4.8], ['jump', 1, 13.4, 3.6], ['jump', 1, 20.4, 0], ['goTo', 21]]);
  });
  // Les planches sous le balancier
  c.section(22, (s) => {
    s.ground(0, 3);
    river(s, 3, 17);
    s.add('blinkers', blink(5, 0, 2.6, 0, 3.2, 2.0), blink(10, 0, 2.6, 0.5, 3.2, 2.0));
    s.add('maces', { x: 8.6, y: 7.2, len: 4.6, r: 0.55, amp: 0.8, period: 3.2, phase: 0.25 });
    s.ground(17, 22);
    s.checkpoint(1, 0);
    s.star(8.6, 1.4);
    s.pass('Sous le balancier', [-2, 0], ['on', 17.2, 22, 0], [['goTo', 2.2], ['waitCycle', 3.2, 2.8, 2.9], ['hop', 3, 6.3, 0.4], ['jump', 1, 11.3, 0.4], ['jump', 1, 18.4, 0]]);
  });
  c.section(16, (s) => {
    s.ground(0, 16);
    s.hoop(10, 3.4);
    s.pass('Le panier', [-2, 0], ['win'], 'shot');
  });
});

// 38 — La canopée : tout se passe en haut des arbres ; la rivière est loin en dessous
const L38 = level({ id: 'forest-8', difficulty: 'hard', number: 8, nameKey: 'lv.forest.8', idea: 'en haut des arbres : lianes, branches, champignons, branches fragiles', maxY: 18 }, (c) => {
  c.section(8, (s) => {
    s.ground(0, 8, 6, wood);
    s.spawn(2, 6);
  });
  // Les lianes de la canopée
  c.section(26, (s) => {
    river(s, 0, 20);
    s.add('vines', { x: 2.6, y: 15.6, len: 6.4 }, { x: 8.4, y: 15.6, len: 6.4 }, { x: 14.2, y: 15.6, len: 6.4 });
    s.ground(20, 26, 6, wood);
    s.star(11.3, 11.4);
    s.pass('Les lianes de la canopée', [-6, 6], ['on', 20.2, 26, 6], [['goTo', -0.8], ['charge', 4], ['vines', 20.4], ['goTo', 22.6]]);
  });
  // Les branches qui montent au-dessus du vide
  c.section(22, (s) => {
    s.ground(0, 2, 6, wood);
    river(s, 2, 12);
    const b0 = s.add('branches', { x1: 3, x2: 5.5, y: 7.2, path: { dx: 0, dy: 1.4, period: 3.6, phase: 0 } });
    const b1 = s.add('branches', { x1: 7, x2: 9.5, y: 9.2, path: { dx: 0, dy: 1.2, period: 3.6, phase: 0.5 } });
    s.block(12, -1.2, 10, 11.6, wood);
    s.checkpoint(1, 6);
    s.star(8.2, 12);
    s.pass('Les branches au-dessus du vide', [-2, 6], ['on', 12.2, 22, 10.4], [['goTo', 1.4], ['hopTo', 2, 'branches', b0, 1.25], ['hopTo', 2, 'branches', b1, 1.25], ['hop', 2, 13.4, 10.4], ['goTo', 18.6]]);
  });
  // Le champignon de la canopée : par-dessus le grand arbre
  c.section(24, (s) => {
    s.ground(0, 6, 10.4, wood);
    s.add('mushrooms', { x: 3.4, y: 11, w: 1.6, height: 5 });
    river(s, 6, 14);
    s.block(9.4, -1.2, 1.6, 15.2, moss);
    s.ground(14, 24, 8, wood);
    s.star(10.2, 16.6);
    s.pass('Le champignon de la canopée', [-3.4, 10.4], ['on', 14.2, 24, 8], [['goTo', 1.6], ['hop', 1, 4.2], ['fly', 15.4], ['goTo', 18]]);
  });
  // Deux lianes courtes entre les grands arbres
  c.section(18, (s) => {
    s.ground(0, 2, 8, wood);
    river(s, 2, 14);
    s.add('vines', { x: 4.6, y: 16.8, len: 5.8 }, { x: 10, y: 16.8, len: 5.8 });
    s.ground(14, 18, 8, wood);
    s.checkpoint(1, 8);
    s.star(7.3, 12.4);
    s.pass('Deux lianes courtes', [-6, 8], ['on', 14.2, 18, 8], [['goTo', 1.2], ['charge', 4], ['vines', 14.4], ['goTo', 16]]);
  });
  // Les branches fragiles, jusqu'au nid
  c.section(22, (s) => {
    s.ground(0, 2, 8, wood);
    river(s, 2, 18);
    s.add('fallers', { x: 3, y: 7.6, w: 2.4, h: 0.4 }, { x: 6.6, y: 7.0, w: 2.4, h: 0.4 }, { x: 10.2, y: 6.4, w: 2.4, h: 0.4 }, { x: 13.8, y: 5.8, w: 2.4, h: 0.4 });
    s.ground(18, 22, 5.8, wood);
    s.checkpoint(1, 8);
    s.star(11.4, 8.8);
    s.pass('Les branches fragiles', [-2, 8], ['on', 18.2, 22, 5.8], [['goTo', 1], ['hop', 2, 4.2, 8], ['jump', 1, 7.8, 7.4], ['jump', 1, 11.4, 6.8], ['jump', 1, 15, 6.2], ['jump', 1, 19.6, 5.8]]);
  });
  c.section(16, (s) => {
    s.ground(0, 16, 5.8, wood);
    s.hoop(10, 3.4, 5.8);
    s.pass('Le panier du nid', [-2, 5.8], ['win'], 'shot');
  });
});

// 39 — Les arbres creux : on entre dans un tronc, on ressort ailleurs
const L39 = level({ id: 'forest-9', difficulty: 'hard', number: 9, nameKey: 'lv.forest.9', idea: 'puzzle : arbres creux (téléporteurs), le bon tronc, le levier du sommet', maxY: 14 }, (c) => {
  c.section(8, (s) => {
    s.ground(0, 8);
    s.spawn(2);
    s.hint(5, 4.3, 'hint.hollow');
  });
  // Le premier arbre creux traverse le grand mur moussu
  c.section(22, (s) => {
    s.ground(0, 22);
    s.block(8, 0, 4, 12, moss);
    s.add('teleporters', { a: { x: 5, y: 0.9 }, b: { x: 14.6, y: 1.4 }, r: 0.8 });
    s.star(14.6, 3);
    s.pass('Le premier arbre creux', [-6, 0], ['on', 16, 22, 0], [['goTo', 3], ['hold', 1, 6], ['settle'], ['run', 1, 16.2, 22, 0]]);
  });
  // Deux troncs sur la rive : l'un mène à l'îlot sans issue, l'autre à l'îlot de la liane
  c.section(30, (s) => {
    s.ground(0, 5);
    s.block(4.6, 0, 0.4, 0.8, wood);
    river(s, 5, 26);
    s.block(7.4, -1.2, 2.4, 4.2, wood);
    s.block(12, -1.2, 3, 4.2, wood);
    s.add('vines', { x: 17.6, y: 12.6, len: 6.4 });
    s.ground(26, 30);
    s.add('teleporters', { a: { x: 1.4, y: 2.6 }, b: { x: 8.6, y: 4.4 }, r: 0.8 });
    s.add('teleporters', { a: { x: 8.6, y: 3.9 + 1.0 }, b: { x: 0.2, y: 1.6 }, r: 0.8 });
    s.add('teleporters', { a: { x: 3.4, y: 2.6 }, b: { x: 13, y: 4.4 }, r: 0.8 });
    s.checkpoint(-2, 0);
    s.star(20.6, 6.4);
    s.pass('Le bon tronc', [-3, 0], ['on', 12.2, 14.8, 3], [['goTo', 2.4], ['hop', 2, 3.6], ['settle'], ['goTo', 13]]);
    s.pass('La liane de l’îlot', [13, 3], ['on', 26.2, 30, 0], [['goTo', 13.6], ['charge', 4], ['vines', 26.4], ['goTo', 27.6]]);
  });
  // L'arbre creux du rondin : on ressort devant un tronc qui roule
  c.section(24, (s) => {
    s.ground(0, 24);
    s.block(5.6, 0, 3.4, 10, moss);
    s.add('teleporters', { a: { x: 3.2, y: 0.9 }, b: { x: 10.4, y: 1.4 }, r: 0.8 });
    const k = s.add('logs', { x: 13.4, y: 0.6, r: 0.6, path: { dx: 5, dy: 0, period: 4.4, phase: 0 } });
    s.checkpoint(0.6, 0);
    s.star(16, 2.8);
    s.pass('L’arbre creux du rondin', [-2, 0], ['on', 9.4, 11.4, 0], [['goTo', 1.4], ['waitMover', 'rollers', k, 'x', '>', 4.6], ['hold', 1, 3.4], ['settle'], ['goTo', 10.6]]);
    s.pass('Par-dessus le rondin', [10.6, 0], ['on', 20.5, 24, 0], [['waitMover', 'rollers', k, 'x', '<', 0.3], ['jumpOver', 'rollers', k], ['goTo', 22]]);
  });
  // L'arbre creux du marteau : on ressort entre deux troncs-marteaux
  c.section(24, (s) => {
    s.ground(0, 24);
    s.block(4, 0, 3, 10, moss);
    s.add('teleporters', { a: { x: 2, y: 0.9 }, b: { x: 12.4, y: 1.4 }, r: 0.8 });
    s.add('crushers', { x: 8.4, w: 2.2, top: 3.2, bottom: 0, period: 2.4, phase: 0 }, { x: 15.2, w: 2.2, top: 3.2, bottom: 0, period: 2.4, phase: 0.5 });
    s.checkpoint(0.6, 0);
    s.star(12.4, 3.4);
    s.pass('L’arbre creux du marteau', [-2, 0], ['on', 11.2, 13.6, 0], [['goTo', 0.6], ['hold', 1, 2.2], ['settle'], ['goTo', 12.4]]);
    s.pass('Sous le marteau', [12.4, 0], ['on', 19, 24, 0], [['goTo', 12.4], ['waitCycle', 2.4, 0.8, 0.9], ['run', 1, 19.2, 24, 0]]);
  });
  // L'arbre du levier : deux troncs creux montent au sommet, le levier ouvre la grille
  c.section(28, (s) => {
    s.ground(0, 28);
    s.block(7, 0, 4, 4.4, wood);
    s.block(12, 0, 5, 8.8, wood);
    const sw = s.add('switches', { x: 14.8, y: 8.8, w: 1.2, target: 'grove' });
    s.add('teleporters', { a: { x: 4.4, y: 0.9 }, b: { x: 8.2, y: 5.4 }, r: 0.8 });
    s.add('teleporters', { a: { x: 10.2, y: 5.3 }, b: { x: 13.4, y: 9.8 }, r: 0.8 });
    s.add('doors', { id: 'grove', x: 24, y: 0, w: 0.8, h: 3.4, open: { dx: 0, dy: 3.4 }, duration: 0.8 });
    s.block(24, 3.4, 0.8, 10, 'wall');
    s.checkpoint(1, 0);
    s.star(15.4, 11.4);
    s.pass('Premier tronc → souche', [-2, 0], ['on', 7.2, 9.8, 4.4], [['goTo', 3], ['hold', 1, 4.6], ['settle'], ['goTo', 8.2]]);
    s.pass('Deuxième tronc → sommet', [8.2, 4.4], ['on', 12.2, 14.4, 8.8], [['hold', 1, 10.3], ['settle'], ['goTo', 13.4]]);
    s.pass('Le levier du sommet', [13.4, 8.8], ['switch', sw], [['hop', 1, 15.4, 8.8]]);
    s.pass('La grille du bosquet', [15.4, 8.8], ['on', 25, 28, 0], [['hold', 1, 17.4], ['run', 1, 25.2, 28, 0]]);
  });
  c.section(16, (s) => {
    s.ground(0, 16);
    s.hoop(10, 3.4);
    s.pass('Le panier', [-2, 0], ['win'], 'shot');
  });
});

// 40 — La forêt profonde : champignon et liane, branches qui glissent, troncs et balancier,
// planches magiques, troncs-marteaux, et le dernier panier.
const L40 = level({ id: 'forest-10', difficulty: 'expert', number: 10, nameKey: 'lv.forest.10', idea: 'finale : toute la forêt', maxY: 14 }, (c) => {
  c.section(8, (s) => {
    s.ground(0, 8);
    s.spawn(2);
  });
  // Champignon → liane → souche
  c.section(24, (s) => {
    s.ground(0, 6);
    s.add('mushrooms', { x: 2.4, y: 1, w: 1.8, height: 5.4 });
    river(s, 6, 16);
    s.add('vines', { x: 8, y: 12, len: 7 });
    s.block(16, -1.2, 8, 4.2, wood);
    s.star(10.6, 5.4);
    s.pass('Champignon → liane → souche', [-6, 0], ['on', 16.2, 24, 3], [['goTo', 0.6], ['hop', 2, 3.3], ['vines', 16.4, false], ['goTo', 20.6]]);
  });
  // Les branches qui glissent au-dessus de la rivière
  c.section(24, (s) => {
    s.ground(0, 2, 3, wood);
    river(s, 2, 18);
    const b0 = s.add('branches', { x1: 3, x2: 5.6, y: 3, path: { dx: 4.4, dy: 0, period: 4.4, phase: 0 } });
    const b1 = s.add('branches', { x1: 10.4, x2: 13, y: 3, path: { dx: 4.4, dy: 0, period: 4.4, phase: 0.5 } });
    s.block(18, -1.2, 6, 4.2, wood);
    s.checkpoint(1, 3);
    s.star(12, 5);
    s.pass('Première branche', [-3.4, 3], ['on', 10.4, 13, 3], [['goTo', 1.6], ['waitMover', 'branches', b0, 'x', '<', 0.1], ['hopTo', 1, 'branches', b0, 1.3], ['stayOn', 'branches', b0, 'x', '>', 4.3], ['hopTo', 1, 'branches', b1, 1.3]]);
    s.pass('Deuxième branche', [11.7, 3], ['on', 18.2, 24, 3], [['stayOn', 'branches', b1, 'x', '>', 4.3], ['hop', 1, 19.6, 3], ['goTo', 21]]);
  });
  // Le tronc qui roule sous le balancier
  c.section(22, (s) => {
    s.ground(0, 22, 3, wood);
    const k = s.add('logs', { x: 7, y: 3.6, r: 0.6, path: { dx: 6, dy: 0, period: 5, phase: 0.25 } });
    s.add('maces', { x: 17.4, y: 9.4, len: 5.4, r: 0.55, amp: 0.8, period: 2.8, phase: 0 });
    s.checkpoint(1, 3);
    s.star(10, 5.8);
    s.pass('Par-dessus le tronc', [-3, 3], ['on', 14.4, 15.6, 3], [['goTo', 3.6], ['waitMover', 'rollers', k, 'x', '<', 0.3], ['jumpOver', 'rollers', k], ['goTo', 15]]);
    s.pass('Sous le balancier', [15, 3], ['on', 20.5, 22, 3], [['goTo', 15], ['waitCycle', 2.8, 1.7, 1.8], ['run', 1, 20.7, 22, 3]]);
  });
  // Les planches magiques, en descendant vers la rive
  c.section(24, (s) => {
    s.ground(0, 2, 3, wood);
    river(s, 2, 19);
    s.add('blinkers', blink(3.6, 2.2, 2.4, 0), blink(8.2, 1.4, 2.4, 0.8), blink(12.8, 0.6, 2.4, 0.6));
    s.ground(19, 24);
    s.checkpoint(0.8, 3);
    s.star(9.4, 4.4);
    s.pass('Les planches magiques', [-1.4, 3], ['on', 19.2, 24, 0], [['goTo', 1], ['waitCycle', 3, 2.1, 2.2], ['hop', 2, 4.8, 2.6], ['jump', 1, 9.4, 1.8], ['jump', 1, 14, 1.0], ['jump', 1, 20.6, 0], ['goTo', 21]]);
  });
  // Les deux troncs-marteaux de la scierie
  c.section(22, (s) => {
    s.ground(0, 22);
    s.add('crushers', { x: 4, w: 2.4, top: 3.2, bottom: 0, period: 2.2, phase: 0 }, { x: 12, w: 2.4, top: 3.2, bottom: 0, period: 2.2, phase: 0.5 });
    s.checkpoint(0.6, 0);
    s.star(9.2, 1.2);
    s.pass('La scierie', [-3, 0], ['on', 17, 22, 0], [['goTo', 1.6], ['waitCycle', 2.2, 1.6, 1.7], ['goTo', 9.2], ['waitCycle', 2.2, 0.5, 0.6], ['run', 1, 17.2, 22, 0]]);
  });
  c.section(16, (s) => {
    s.ground(0, 16);
    s.hoop(10, 3.4);
    s.pass('Le dernier panier', [-2, 0], ['win'], 'shot');
  });
});

export const FOREST_LEVELS = [L31, L32, L33, L34, L35, L36, L37, L38, L39, L40];
