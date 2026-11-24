// MONDE 2 — NEIGE : PREMIÈRES COMBINAISONS (refonte phase 2). 30 à 40 s par niveau pour un joueur.
// Glace (on garde son élan), vent (en rafales), stalactites, plaques qui cèdent, boules de neige,
// blocs de glace qui s'écrasent. Les premiers niveaux présentent une idée ; les suivants les combinent.
//
// 11 Premières glissades  la glace : élan, freinage, piliers glissants, tremplin (détente)
// 12 Col venteux          vent de face, vent dans le dos, rafales (technique)
// 13 La grotte de glace   stalactites : passer vite, ou les faire tomber et attendre (observation)
// 14 Le pont de glace     le pont s'effondre derrière toi (rapide) ★
// 15 L'avalanche          boules de neige : sauter, ou se cacher dans un creux (rythme) ★
// 16 Patinoire au vent    glace + vent : freiner à temps (technique)
// 17 Le glacier           blocs de glace qui s'écrasent sur la glace (précision)
// 18 Le chalet            le panier est enfermé : tremplin de glace → interrupteur → porte (puzzle)
// 19 Le sommet            trampolines, plaques qui cèdent et stalactites, en montée (technique)
// 20 Tempête de neige     vent, avalanche, pont qui cède, stalactites (finale) ★

import { level } from './kit.js';

const snow = 'snow';
const ice = 'ice';

// 11 — Premières glissades
const L11 = level({ id: 'snow-1', difficulty: 'easy', number: 1, nameKey: 'lv.snow.1', idea: 'la glace : élan, freinage, piliers, tremplin' }, (c) => {
  c.section(8, (s) => {
    s.ground(0, 8, 0, snow);
    s.spawn(2);
    s.hint(5, 4.3, 'hint.ice');
  });
  c.section(16, (s) => {
    s.ground(0, 16, 0, ice);
    s.block(12, 0, 4, 1.2, snow);
    s.star(8, 1.2);
    s.pass('Le lac gelé → la butte', [-6, 0], ['on', 12.3, 16, 1.2], [['goTo', 9.6], ['hop', 2, 13.6, 1.2]]);
  });
  // Piliers de glace au-dessus des pics : on se pose, on freine, on repart
  c.section(20, (s) => {
    s.ground(0, 20, 0, snow);
    s.add('spikes', { x: 0.2, y: 0, w: 14.4, dir: 'up' });
    s.block(1.8, 0, 2.4, 1.4, ice);
    s.block(6.4, 0, 2.4, 2.2, ice);
    s.block(10.8, 0, 2.4, 1.6, ice);
    s.star(7.6, 4);
    s.pass('Pilier de glace 1', [-1, 1.2], ['on', 1.9, 4.1, 1.4], [['goTo', -0.8], ['hop', 3, 3, 1.4], ['settle']]);
    s.pass('Pilier de glace 2', [3, 1.4], ['on', 6.5, 8.7, 2.2], [['goTo', 3], ['hop', 3, 7.6, 2.2], ['settle']]);
    s.pass('Pilier de glace 3', [7.6, 2.2], ['on', 10.9, 13.1, 1.6], [['goTo', 7.6], ['hop', 3, 12, 1.6], ['settle']]);
    s.pass('Retour sur la neige', [12, 1.6], ['on', 14.8, 20, 0], [['goTo', 12], ['hop', 3, 16.6, 0]]);
  });
  // La pente de glace et le tremplin au-dessus de la crevasse
  c.section(22, (s) => {
    s.ground(0, 3, 2.2, snow);
    s.add('solids', { points: [{ x: 3, y: 2.2 }, { x: 3, y: -6 }, { x: 10, y: -6 }, { x: 10, y: 0 }], style: ice });
    s.ground(10, 12, 0, ice);
    s.ground(17, 22, 0, snow);
    s.checkpoint(1, 2.2);
    s.star(14.5, 3.4);
    s.pass('Remonter sur la terrasse', [-2, 0], ['on', 0.3, 3, 2.2], [['goTo', -1.4], ['hop', 3, 1.4, 2.2]]);
    s.pass('Pente de glace → tremplin', [1.4, 2.2], ['on', 17.2, 22, 0], [['goTo', 1.2], ['jumpAt', 1, 11.4, 19]]);
  });
  c.section(16, (s) => {
    s.ground(0, 16, 0, snow);
    s.hoop(10, 3.4);
    s.pass('Le panier', [-3, 0], ['win'], 'shot');
  });
});

// 12 — Col venteux
const L12 = level({ id: 'snow-2', difficulty: 'medium', number: 2, nameKey: 'lv.snow.2', idea: 'vent de face, vent dans le dos, rafales' }, (c) => {
  c.section(8, (s) => {
    s.ground(0, 8, 0, snow);
    s.spawn(2);
    s.hint(5, 4.3, 'hint.wind');
  });
  // Vent de face : chaque marche demande un peu plus de puissance
  c.section(18, (s) => {
    s.ground(0, 18, 0, snow);
    s.add('winds', { x: 0, y: 0, w: 18, h: 10, force: -9, gust: 2.6 });
    s.block(5, 0, 4, 1.4, snow);
    s.block(11, 0, 7, 2.8, snow);
    s.star(10, 4.4);
    s.pass('Vent de face : première marche', [-6, 0], ['on', 5.3, 9, 1.4], [['goTo', 3.8], ['hop', 3, 6.4, 1.4]]);
    s.pass('Vent de face : deuxième marche', [6.6, 1.4], ['on', 11.3, 18, 2.8], [['goTo', 8.4], ['hop', 4, 12.4, 2.8]]);
  });
  // Vent dans le dos : il porte au-dessus de la grande crevasse
  c.section(22, (s) => {
    s.ground(0, 4, 2.8, snow);
    s.ground(13, 22, 2.8, snow);
    s.add('winds', { x: 0, y: 0, w: 15, h: 12, force: 10, gust: 3 });
    s.checkpoint(1, 2.8);
    s.star(8.5, 7);
    s.pass('Vent dans le dos : la crevasse', [-3, 2.8], ['on', 13.3, 22, 2.8], [['goTo', -5], ['dribbleRun', 1, 4, 3.3, 16]]);
  });
  // Les rafales : trois piliers de neige au-dessus des pics, le vent repousse
  c.section(20, (s) => {
    s.ground(0, 20, 0, snow);
    s.ground(0, 2, 2.8, snow);
    s.add('spikes', { x: 2, y: 0, w: 14.5, dir: 'up' });
    s.block(4.5, 0, 2, 2.4, snow);
    s.block(8.8, 0, 2, 3.2, snow);
    s.block(13, 0, 2, 2.4, snow);
    s.add('winds', { x: 2, y: 0, w: 15, h: 10, force: -6, gust: 2.2 });
    s.star(9.8, 5.8);
    s.pass('Pilier 1', [-2, 2.8], ['on', 4.6, 6.4, 2.4], [['goTo', 1.2], ['hop', 2, 5.5, 2.4], ['settle']]);
    s.pass('Pilier 2', [5.5, 2.4], ['on', 8.9, 10.7, 3.2], [['goTo', 5.5], ['hop', 3, 9.8, 3.2], ['settle']]);
    s.pass('Pilier 3', [9.8, 3.2], ['on', 13.1, 14.9, 2.4], [['goTo', 9.8], ['hop', 2, 14, 2.4], ['settle']]);
    s.pass('Retour sur la neige', [14, 2.4], ['on', 16.8, 20, 0], [['goTo', 14], ['hop', 2, 18.4, 0]]);
  });
  c.section(16, (s) => {
    s.ground(0, 16, 0, snow);
    s.hoop(10, 3.4);
    s.pass('Le panier', [-2, 0], ['win'], 'shot');
  });
});

// 13 — La grotte de glace
const L13 = level({ id: 'snow-3', difficulty: 'medium', number: 3, nameKey: 'lv.snow.3', idea: 'stalactites : vitesse ou patience' }, (c) => {
  c.section(8, (s) => {
    s.ground(0, 8, 0, snow);
    s.spawn(2);
    s.hint(4.5, 4.3, 'hint.icicles');
  });
  // Galerie basse : à pleine vitesse, les stalactites tombent derrière soi
  c.section(18, (s) => {
    s.ground(0, 18, 0, snow);
    s.block(0, 4.6, 18, 3, 'rock');
    s.add('icicles', { x: 4, y: 4.6, len: 1.3 }, { x: 8, y: 4.6, len: 1.3 }, { x: 12, y: 4.6, len: 1.3 }, { x: 15.5, y: 4.6, len: 1.3 });
    s.star(10, 1.2);
    s.pass('La galerie (pleine vitesse)', [-6, 0], ['on', 17, 30, 0], [['goTo', -2], ['run', 1, 17.2, 30, 0]]);
  });
  // La marche sous la stalactite : il faut s'arrêter. On la fait tomber, on attend, on passe.
  c.section(14, (s) => {
    s.ground(0, 14, 0, snow);
    s.block(0, 4.8, 14, 3, 'rock');
    s.block(6, 0, 8, 1.4, ice);
    s.add('icicles', { x: 7, y: 4.8, len: 1.4 }, { x: 10.6, y: 4.8, len: 1.4 });
    s.checkpoint(1, 0);
    s.star(8.8, 2.6);
    s.pass('Faire tomber la stalactite, puis monter', [-1, 0], ['on', 11.8, 14, 1.4], [['goTo', 5.4], ['goTo', 3.4], ['wait', 1.2], ['hop', 2, 7.4, 1.4], ['settle'], ['goTo', 9.4], ['goTo', 7.6], ['wait', 1.2], ['run', 1, 12, 14, 1.4]]);
  });
  // Le puits : on descend sous trois stalactites décalées
  c.section(18, (s) => {
    s.ground(0, 4, 1.4, snow);
    s.ground(4, 14, 0, snow);
    s.ground(14, 18, 1.4, snow);
    s.block(0, 6, 18, 2, 'rock');
    s.add('icicles', { x: 6.5, y: 6, len: 1.3 }, { x: 8.5, y: 6, len: 1.3 }, { x: 10.5, y: 6, len: 1.3 });
    s.star(9, 2);
    s.pass('Le creux sous les stalactites', [-1, 1.4], ['on', 14.3, 18, 1.4], [['goTo', 1.6], ['hold', 1, 4.6], ['goTo', 12.8], ['hop', 3, 15.5, 1.4]]);
  });
  c.section(16, (s) => {
    s.ground(0, 16, 1.4, snow);
    s.hoop(10, 3.4, 1.4);
    s.pass('Sortie de la grotte → panier', [-2, 1.4], ['win'], 'shot');
  });
});

// 14 — Le pont de glace : il s'effondre derrière toi
const L14 = level({ id: 'snow-4', difficulty: 'medium', number: 4, nameKey: 'lv.snow.4', idea: 'le pont s’effondre : ne jamais s’arrêter' }, (c) => {
  c.section(10, (s) => {
    s.ground(0, 10, 0, snow);
    s.spawn(2);
    s.hint(5.5, 4.3, 'hint.fallers');
  });
  c.section(26, (s) => {
    s.ground(24, 26, 0, snow);
    for (let i = 0; i < 12; i++) s.add('fallers', { x: i * 2, y: -0.4, w: 2, h: 0.4 });
    s.star(8, 1.4);
    s.pass('Le pont qui s’effondre', [-6, 0], ['on', 24.2, 40, 0], [['goTo', -3], ['run', 1, 24.4, 40, 0]]);
  });
  // Le pont a déjà cédé par endroits : deux trous à sauter sans s'arrêter
  c.section(28, (s) => {
    s.ground(0, 2, 0, snow);
    s.ground(26, 28, 0, snow);
    for (const x of [2, 4, 6, 12, 14, 16, 22, 24]) s.add('fallers', { x, y: -0.4, w: 2, h: 0.4 });
    s.checkpoint(1, 0);
    s.star(10, 2.8);
    s.pass('Le pont troué', [0.5, 0], ['on', 26.2, 42, 0], [['goTo', 0.5], ['dribbleRun', 1, 2, 7, 12.8], ['dribbleRun', 1, 2, 17, 22.8], ['run', 1, 26.4, 42, 0]]);
  });
  // Les plaques suspendues : de plus en plus haut, il faut enchaîner
  c.section(20, (s) => {
    s.ground(0, 4, 0, snow);
    s.ground(16, 20, 2.6, snow);
    s.add('fallers', { x: 4.6, y: 0.6, w: 2.4, h: 0.4 }, { x: 9, y: 1.4, w: 2.4, h: 0.4 }, { x: 13, y: 2.2, w: 2.4, h: 0.4 });
    s.pass('Plaques suspendues', [-2, 0], ['on', 16.2, 20, 2.6], [['goTo', 1.4], ['dribbleRun', 1, 2, 3.4, 5.8], ['jump', 1, 10.2], ['jump', 1, 14.2], ['jump', 1, 17.6]]);
  });
  // La descente : trois plaques qui cèdent, de plus en plus bas
  c.section(18, (s) => {
    s.ground(0, 3, 2.6, snow);
    s.ground(14, 18, 0, snow);
    s.add('fallers', { x: 4, y: 1.8, w: 2.2, h: 0.4 }, { x: 7.6, y: 1.0, w: 2.2, h: 0.4 }, { x: 11.2, y: 0.2, w: 2.2, h: 0.4 });
    s.checkpoint(1, 2.6);
    s.star(8.7, 3.6);
    s.pass('La descente des plaques', [-2, 2.6], ['on', 14.2, 18, 0], [['goTo', 1.2], ['hop', 1, 5.1, 2.2], ['jump', 1, 8.7, 1.4], ['jump', 1, 12.3, 0.6], ['jump', 1, 15.5, 0]]);
  });
  c.section(16, (s) => {
    s.ground(0, 16, 0, snow);
    s.hoop(10, 3.4, 0);
    s.pass('Le panier', [-2, 0], ['win'], 'shot');
  });
});

// 15 — L'avalanche
const L15 = level({ id: 'snow-5', difficulty: 'medium', number: 5, nameKey: 'lv.snow.5', idea: 'boules de neige : sauter ou se cacher' }, (c) => {
  c.section(8, (s) => {
    s.ground(0, 8, 0, snow);
    s.spawn(2);
    s.hint(4.5, 4.3, 'hint.snowball');
  });
  c.section(18, (s) => {
    s.ground(0, 18, 0, snow);
    s.add('boulders', { x1: 2, x2: 11, y: 0, r: 0.6, dir: -1, speed: 5.5, period: 3.2, phase: 0 });
    s.star(7, 2.6);
    s.pass('Sauter la boule de neige', [-6, 0], ['on', 12.2, 30, 0], [['goTo', 0.4], ['waitCycle', 3.2, 0.5, 0.55], ['charge', 2], ['jump', 1, 3.6], ['run', 1, 12.4, 30, 0]]);
  });
  // Le creux : on s'y met à l'abri pendant que la boule passe au-dessus, puis on repart
  c.section(20, (s) => {
    s.ground(0, 6, 0, snow);
    s.ground(6, 9, -1.8, snow);
    s.ground(9, 20, 0, snow);
    s.add('boulders', { x1: 4.6, x2: 15, y: 0, r: 0.7, dir: -1, speed: 6, period: 5.5, phase: 0.2 });
    s.checkpoint(1, 0);
    s.star(7.5, -1);
    s.pass('Se cacher dans le creux', [-2, 0], ['on', 6.2, 8.8, -1.8], [['goTo', 3], ['waitCycle', 5.5, 3.2, 3.3], ['run', 1, 6.4, 8.8, -1.8], ['goTo', 7.4]]);
    s.pass('Sortir derrière la boule', [7.4, -1.8], ['on', 10, 19, 0], [['waitCycle', 5.5, 1.0, 1.1], ['hop', 3, 11.5, 0], ['run', 1, 12, 18, 0], ['goTo', 18.4]]);
  });
  // La grande avalanche : elle part derrière toi, il faut atteindre le rocher avant elle
  c.section(24, (s) => {
    s.ground(0, 24, 0, snow);
    s.block(18, 0, 6, 1.6, 'rock');
    s.add('boulders', { x1: 0.5, x2: 17.6, y: 0, r: 0.85, dir: 1, speed: 6.2, period: 6, phase: 0 });
    s.star(10, 1.4);
    s.pass('L’avalanche te poursuit', [-2, 0], ['on', 18.3, 24, 1.6], [['goTo', -1.2], ['waitCycle', 6, 5.0, 5.1], ['dribbleRun', 1, 2, 15.4, 19.5]]);
  });
  c.section(16, (s) => {
    s.ground(0, 16, 1.6, snow);
    s.hoop(10, 3.4, 1.6);
    s.pass('Le panier', [-2, 1.6], ['win'], 'shot');
  });
});

// 16 — Patinoire au vent
const L16 = level({ id: 'snow-6', difficulty: 'hard', number: 6, nameKey: 'lv.snow.6', idea: 'glace + vent : freiner à temps' }, (c) => {
  c.section(8, (s) => {
    s.ground(0, 8, 0, snow);
    s.spawn(2);
  });
  // Vent dans le dos sur la glace : freiner avant les pics, sauter sur la berge
  c.section(20, (s) => {
    s.ground(0, 9, 0, ice);
    s.ground(9, 20, 0, snow);
    s.add('spikes', { x: 14, y: 0, w: 3, dir: 'up' });
    s.block(17, 0, 3, 1.6, snow);
    s.add('winds', { x: 0, y: 0, w: 17, h: 8, force: 7, gust: 2.4 });
    s.star(11, 1.2);
    s.pass('Patinoire, vent dans le dos', [-6, 0], ['on', 17.2, 20, 1.6], [['goTo', 13.2], ['settle'], ['hop', 4, 19, 1.6]]);
  });
  // Vent de face sur la glace : il faut garder de l'élan pour atteindre la marche
  c.section(20, (s) => {
    s.ground(0, 2, 1.6, snow);
    s.ground(2, 20, 0, ice);
    s.block(14, 0, 6, 2.2, snow);
    s.add('winds', { x: 2, y: 0, w: 18, h: 8, force: -8, gust: 2 });
    s.checkpoint(0.8, 1.6);
    s.star(8, 2.6);
    s.pass('Patinoire, vent de face', [0.6, 1.6], ['on', 14.3, 20, 2.2], [['goTo', 0.8], ['hold', 1, 3], ['goTo', 11.6], ['hop', 3, 15.6, 2.2]]);
  });
  // Îlots de glace sur l'eau glacée (pics), vent de travers
  c.section(22, (s) => {
    s.ground(0, 22, 0, snow);
    s.ground(0, 2, 2.2, snow);
    s.add('spikes', { x: 2, y: 0, w: 17, dir: 'up' });
    s.block(4.4, 0, 2.6, 1.8, ice);
    s.block(9.4, 0, 2.6, 2.6, ice);
    s.block(14.4, 0, 2.6, 1.8, ice);
    s.add('winds', { x: 2, y: 0, w: 18, h: 9, force: 5, gust: 2.6 });
    s.star(10.7, 5);
    s.pass('Îlot 1', [-2, 2.2], ['on', 4.5, 6.9, 1.8], [['goTo', 1.2], ['hop', 2, 5.4, 1.8], ['settle']]);
    s.pass('Îlot 2', [5.4, 1.8], ['on', 9.5, 11.9, 2.6], [['goTo', 5.4], ['hop', 3, 10.4, 2.6], ['settle']]);
    s.pass('Îlot 3', [10.4, 2.6], ['on', 14.5, 16.9, 1.8], [['goTo', 10.4], ['hop', 2, 15.2, 1.8], ['settle']]);
    s.pass('Berge', [15.2, 1.8], ['on', 19.3, 22, 0], [['goTo', 15.2], ['hop', 2, 20.4, 0]]);
  });
  c.section(16, (s) => {
    s.ground(0, 16, 0, snow);
    s.hoop(10, 3.4);
    s.pass('Le panier', [-2, 0], ['win'], 'shot');
  });
});

// 17 — Le glacier : blocs de glace qui s'écrasent sur un sol glissant
const L17 = level({ id: 'snow-7', difficulty: 'hard', number: 7, nameKey: 'lv.snow.7', idea: 'blocs de glace sur la glace (précision)' }, (c) => {
  c.section(8, (s) => {
    s.ground(0, 8, 0, snow);
    s.spawn(2);
    s.hint(4.5, 4.3, 'hint.crusher');
  });
  c.section(12, (s) => {
    s.ground(0, 12, 0, ice);
    s.ground(8.5, 12, 0, snow);
    s.add('crushers', { x: 4.4, w: 2.4, top: 3.0, bottom: 0, period: 2.6, phase: 0 });
    s.pass('Premier bloc', [-4, 0], ['on', 8.6, 12, 0], [['goTo', 2.6], ['waitCycle', 2.6, 1.85, 1.95], ['run', 1, 8.8, 12, 0]]);
  });
  c.section(16, (s) => {
    s.ground(0, 16, 0, ice);
    s.ground(6, 8, 0, snow);
    s.ground(13, 16, 0, snow);
    s.add('crushers', { x: 2.8, w: 2.2, top: 3.0, bottom: 0, period: 2.4, phase: 0.3 }, { x: 9.6, w: 2.2, top: 3.0, bottom: 0, period: 2.4, phase: 0.8 });
    s.star(7, 1.4);
    s.pass('Deuxième bloc → îlot de neige', [-2, 0], ['on', 6.2, 7.8, 0], [['goTo', 1], ['waitCycle', 2.4, 1.0, 1.1], ['run', 1, 6.3, 7.8, 0], ['goTo', 7]]);
    s.pass('Troisième bloc', [7, 0], ['on', 13.2, 16, 0], [['waitCycle', 2.4, 1.8, 1.9], ['run', 1, 13.3, 16, 0]]);
  });
  // Bloc au-dessus d'une marche de glace
  c.section(16, (s) => {
    s.ground(0, 16, 0, snow);
    s.block(5, 0, 11, 1.6, ice);
    s.add('crushers', { x: 6.4, w: 2.4, top: 4.6, bottom: 1.6, period: 2.8, phase: 0 });
    s.checkpoint(1, 0);
    s.star(7.6, 5.6);
    s.pass('La marche sous le bloc', [-2, 0], ['on', 10, 16, 1.6], [['goTo', 3.2], ['waitCycle', 2.8, 1.35, 1.45], ['charge', 3], ['jump', 1, 11.5, 1.6]]);
  });
  c.section(14, (s) => {
    s.ground(0, 14, 1.6, ice);
    s.ground(8, 14, 1.6, snow);
    s.add('crushers', { x: 3, w: 2.2, top: 4.6, bottom: 1.6, period: 2.2, phase: 0 }, { x: 5.6, w: 2.2, top: 4.6, bottom: 1.6, period: 2.2, phase: 0.5 });
    s.star(11, 3.4);
    s.pass('Les deux derniers blocs', [-2, 1.6], ['on', 8.2, 14, 1.6], [['goTo', 1], ['waitCycle', 2.2, 1.65, 1.75], ['run', 1, 8.4, 14, 1.6]]);
  });
  c.section(16, (s) => {
    s.ground(0, 16, 1.6, snow);
    s.hoop(10, 3.4, 1.6);
    s.pass('Le panier', [-2, 1.6], ['win'], 'shot');
  });
});

// 18 — Le chalet : le panier est enfermé. Le remonte-pente, la pente de glace, le tremplin… et
// l'interrupteur sur le rocher. Ensuite seulement, la porte du chalet s'ouvre.
const L18 = level({ id: 'snow-8', difficulty: 'medium', number: 8, nameKey: 'lv.snow.8', idea: 'deux interrupteurs : la barrière du remonte-pente, puis la porte du chalet', maxY: 12 }, (c) => {
  c.section(8, (s) => {
    s.ground(0, 8, 0, snow);
    s.spawn(2);
  });
  // La barrière du remonte-pente est fermée ; son interrupteur est sur le toit de la cabane
  c.section(16, (s) => {
    s.ground(0, 16, 0, snow);
    s.block(3, 0, 4, 2.6, 'wood');
    const sw = s.add('switches', { x: 4.4, y: 2.6, w: 1.2, target: 'lift' });
    s.add('doors', { id: 'lift', x: 12, y: 0, w: 0.8, h: 3.4, open: { dx: 0, dy: 3.4 }, duration: 0.8 });
    s.block(12, 3.4, 0.8, 8.6, 'wall');
    s.hint(0.5, 4.4, 'hint.switch');
    s.star(5, 4.8);
    s.pass('Toit de la cabane → interrupteur', [-6, 0], ['switch', sw], [['goTo', 1.4], ['hop', 3, 5, 2.6]]);
    s.pass('La barrière s’ouvre', [5, 2.6], ['on', 13.5, 16, 0], [['hold', 1, 7.4], ['run', 1, 13.6, 16, 0]]);
  });
  // Le remonte-pente : une nacelle monte jusqu'au départ de la piste
  c.section(12, (s) => {
    s.ground(0, 12, 0, snow);
    s.block(7, 0, 5, 4.4, snow);
    const m = s.add('movers', { x: 3.6, y: -0.5, w: 2.4, h: 0.5, path: { dx: 0, dy: 4.4, period: 4.4, phase: 0 } });
    s.pass('Le remonte-pente', [-2, 0], ['on', 7.3, 12, 4.4], [['goTo', 2], ['waitMover', 'movers', m, 'y', '<', 0.05], ['goTo', 4.8], ['waitMover', 'movers', m, 'y', '>', 4.3], ['run', 1, 7.5, 12, 4.4]]);
  });
  // La piste de glace et le tremplin qui envoie sur le rocher de l'interrupteur
  c.section(24, (s) => {
    s.ground(0, 2, 4.4, snow);
    s.add('solids', { points: [{ x: 2, y: 4.4 }, { x: 2, y: -6 }, { x: 11, y: -6 }, { x: 11, y: 0 }], style: ice });
    s.ground(11, 13, 0, ice);
    s.add('solids', { points: [{ x: 13, y: 0 }, { x: 13, y: -6 }, { x: 15, y: -6 }, { x: 15, y: 1 }], style: ice });
    s.ground(15, 16, 1, ice);
    s.ground(16, 18, -2, snow);
    s.block(18, -2, 6, 5.4, 'rock');
    const sw = s.add('switches', { x: 20.6, y: 3.4, w: 1.2, target: 'chalet' });
    s.checkpoint(0.8, 4.4);
    s.star(17, 7);
    s.pass('Piste de glace → tremplin → rocher', [0.8, 4.4], ['on', 18.3, 24, 3.4], [['goTo', 0.8], ['dribbleRun', 1, 3, 14.6, 19.8]]);
    s.pass('Interrupteur', [19.4, 3.4], ['switch', sw], [['goTo', 19], ['hop', 1, 21.2, 3.4]]);
  });
  // Redescendre devant le chalet : la porte est ouverte
  c.section(26, (s) => {
    s.ground(0, 26, 0, snow);
    s.add('doors', { id: 'chalet', x: 8, y: 0, w: 0.8, h: 3.2, open: { dx: 0, dy: 3.2 }, duration: 0.8 });
    s.block(8, 3.2, 0.8, 9, 'wall');
    s.block(8, 7.6, 18, 0.6, 'wood');
    s.hoop(19, 3.4);
    s.star(14, 2);
    s.pass('Descendre du rocher', [-3, 3.4], ['on', 1, 7.5, 0], [['hold', 1, 0.5], ['run', 1, 1.5, 7.5, 0], ['goTo', 5]]);
    s.pass('Dans le chalet → panier', [5, 0], ['win'], [['hold', 1, 11], ['shot']]);
  });
});

// 19 — Le sommet : on monte, encore et encore. Trampoline, plaques qui cèdent, stalactites du sommet.
const L19 = level({ id: 'snow-9', difficulty: 'hard', number: 9, nameKey: 'lv.snow.9', idea: 'ascension : trampoline, plaques, corniche, stalactites', maxY: 17 }, (c) => {
  c.section(8, (s) => {
    s.ground(0, 8, 0, snow);
    s.spawn(2);
  });
  c.section(14, (s) => {
    s.ground(0, 14, 0, snow);
    s.add('trampolines', { x: 2.5, y: 0, w: 1.6 });
    s.block(6.5, 0, 7.5, 5, 'rock');
    s.star(4, 7);
    s.pass('Trampoline → première corniche', [-6, 0], ['on', 6.8, 14, 5], [['goTo', 1.2], ['hold', 1, 3.3], ['fly', 9]]);
  });
  // Plaques suspendues qui cèdent : on enchaîne sans s'arrêter
  c.section(18, (s) => {
    s.ground(0, 2, 5, 'rock');
    s.ground(14, 18, 7.4, 'rock');
    s.add('fallers', { x: 2.8, y: 5.4, w: 2.4, h: 0.4 }, { x: 6.8, y: 6.2, w: 2.4, h: 0.4 }, { x: 10.6, y: 7.0, w: 2.4, h: 0.4 });
    s.checkpoint(0.6, 5);
    s.pass('Plaques qui cèdent', [-2, 5], ['on', 14.2, 18, 7.4], [['goTo', 0.6], ['hop', 2, 4, 5.8], ['jump', 1, 8, 6.6], ['jump', 1, 11.8, 7.4], ['jump', 1, 15.5, 7.4]]);
  });
  // La corniche venteuse : des plaques qui cèdent, le vent repousse
  c.section(18, (s) => {
    s.ground(0, 3, 7.4, 'rock');
    s.ground(14, 18, 7.4, 'rock');
    s.add('fallers', { x: 4, y: 7.0, w: 2.2, h: 0.4 }, { x: 7.6, y: 7.0, w: 2.2, h: 0.4 }, { x: 11.2, y: 7.0, w: 2.2, h: 0.4 });
    s.add('winds', { x: 0, y: 6, w: 18, h: 6, force: -5, gust: 2.4 });
    s.checkpoint(1, 7.4);
    s.star(9, 9.4);
    s.pass('La corniche venteuse', [-2, 7.4], ['on', 14.2, 18, 7.4], [['goTo', 1.4], ['dribbleRun', 1, 2, 2.4, 5.4], ['jump', 1, 9], ['jump', 1, 12.4], ['jump', 1, 15.6]]);
  });
  // Deuxième trampoline : le dernier étage avant l'arête
  c.section(14, (s) => {
    s.ground(0, 14, 7.4, 'rock');
    s.add('trampolines', { x: 3, y: 7.4, w: 1.6 });
    s.block(7, 7.4, 7, 2.4, 'rock');
    s.pass('Trampoline → dernier étage', [-2, 7.4], ['on', 7.3, 14, 9.8], [['goTo', 1.6], ['hold', 1, 3.8], ['fly', 9.5]]);
  });
  // L'arête et ses stalactites : on les fait tomber avant de passer
  c.section(18, (s) => {
    s.ground(0, 18, 9.8, 'rock');
    s.block(3, 14, 12, 2, 'rock');
    s.add('icicles', { x: 6, y: 14, len: 1.4 }, { x: 9.5, y: 14, len: 1.4 }, { x: 13, y: 14, len: 1.4 });
    s.add('winds', { x: 0, y: 9.8, w: 18, h: 6, force: -5, gust: 2.4 });
    s.star(9.5, 10.8);
    s.pass('L’arête aux stalactites', [-2, 9.8], ['on', 15, 18, 9.8], [['goTo', 2], ['run', 1, 15.2, 18, 9.8]]);
  });
  c.section(16, (s) => {
    s.ground(0, 16, 9.8, snow);
    s.hoop(10, 3.4, 9.8);
    s.pass('Le panier du sommet', [-2, 9.8], ['win'], 'shot');
  });
});

// 20 — Tempête de neige : vent dans le dos, avalanche, pont qui cède sous les stalactites, et le panier.
const L20 = level({ id: 'snow-10', difficulty: 'hard', number: 10, nameKey: 'lv.snow.10', idea: 'finale : vent, avalanche, pont, stalactites' }, (c) => {
  c.section(8, (s) => {
    s.ground(0, 8, 0, snow);
    s.spawn(2);
  });
  c.section(22, (s) => {
    s.ground(0, 6, 0, snow);
    s.ground(11.8, 22, 0, snow);
    s.add('winds', { x: 0, y: 0, w: 14, h: 12, force: 10, gust: 3 });
    s.star(8.9, 4.6);
    s.pass('La tempête porte au-dessus de la crevasse', [-6, 0], ['on', 12.1, 22, 0], [['goTo', -6], ['dribbleRun', 1, 3, 5.3, 15]]);
  });
  // L'avalanche
  c.section(22, (s) => {
    s.ground(0, 22, 0, snow);
    s.block(17, 0, 5, 1.6, 'rock');
    s.add('boulders', { x1: 0.5, x2: 16.6, y: 0, r: 0.85, dir: 1, speed: 6.2, period: 6, phase: 0.3 });
    s.checkpoint(-4, 0);
    s.pass('L’avalanche', [-3, 0], ['on', 17.3, 22, 1.6], [['goTo', -1.2], ['waitCycle', 6, 2.5, 2.6], ['dribbleRun', 1, 2, 14.4, 18.5]]);
  });
  // Le tunnel : stalactites et vent de face, à pleine vitesse
  c.section(20, (s) => {
    s.ground(0, 20, 1.6, 'rock');
    s.block(0, 6.2, 20, 2, 'rock');
    s.add('icicles', { x: 4, y: 6.2, len: 1.4 }, { x: 7.5, y: 6.2, len: 1.4 }, { x: 11, y: 6.2, len: 1.4 }, { x: 14.5, y: 6.2, len: 1.4 });
    s.add('winds', { x: 0, y: 1.6, w: 20, h: 4.6, force: -6, gust: 2.2 });
    s.checkpoint(1, 1.6);
    s.star(9.2, 2.6);
    s.pass('Le tunnel de glace', [-2, 1.6], ['on', 17, 19.6, 1.6], [['goTo', 0.6], ['run', 1, 17.2, 19.6, 1.6]]);
  });
  // Le pont qui cède sous les stalactites
  c.section(26, (s) => {
    s.ground(0, 2, 1.6, 'rock');
    s.ground(24, 26, 1.6, 'rock');
    for (let i = 0; i < 11; i++) s.add('fallers', { x: 2 + i * 2, y: 1.2, w: 2, h: 0.4 });
    s.block(4, 7, 18, 2, 'rock');
    s.add('icicles', { x: 9, y: 7, len: 1.4 }, { x: 15, y: 7, len: 1.4 });
    s.checkpoint(0.8, 1.6);
    s.star(12, 3);
    s.pass('Le pont sous les stalactites', [0.6, 1.6], ['on', 24.2, 40, 1.6], [['goTo', 0.6], ['run', 1, 24.4, 40, 1.6]]);
  });
  c.section(16, (s) => {
    s.ground(0, 16, 1.6, snow);
    s.hoop(10, 3.4, 1.6);
    s.pass('Le panier', [-2, 1.6], ['win'], 'shot');
  });
});

export const SNOW_LEVELS = [L11, L12, L13, L14, L15, L16, L17, L18, L19, L20];
