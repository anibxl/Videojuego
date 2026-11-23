// MONDE 1 — VILLE : DÉCOUVERTE (refonte phase 2). 20 à 30 s par niveau pour un joueur.
// Chaque niveau présente UNE idée, avec très peu de pièges ; les mécaniques arrivent une à une.
// Construits section par section avec le kit (./kit.js) ; format des éléments : ./README.md.
//
//  1 Premier panier      rouler, rebondir, charger la puissance (détente, tutoriel)
//  2 Rebonds de quartier les trampolines, et les premiers pics (facile)
//  3 Le chantier         plateformes mobiles et monte-charge (technique)
//  4 La caisse           pousser une caisse pour s'en faire une marche, puis un pont (puzzle) ★
//  5 Le souffle          les ventilateurs des toits (détente)
//  6 Le panier enfermé   l'interrupteur est tout en haut, la porte tout en bas (puzzle) ★
//  7 La scierie          le rythme des scies (précision)
//  8 Le métro            un réseau de téléporteurs (puzzle) ★
//  9 L'usine             lasers et presses (rapide)
// 10 Grand final         caisse → interrupteur → ventilateur → téléporteur → panier ★

import { level } from './kit.js';

// 1 — Rouler, rebondir, puis charger la puissance pour monter de plus en plus haut.
const L1 = level({ id: 'first-shot', difficulty: 'easy', number: 1, nameKey: 'lv.city.1', idea: 'tutoriel : rouler, rebondir, charger' }, (c) => {
  c.section(14, (s) => {
    s.ground(0, 14);
    s.spawn(2);
    s.hint(5, 4.9, 'hint.move');
    s.hint(5, 4.2, 'hint.bounce', 0.8);
    s.star(10, 1.9);
    s.pass('Premiers rebonds', [2, 0], ['x', 11], [['goTo', 8.5], ['hop', 1, 11]]);
  });
  // Trottoir puis perron : chaque marche demande un rebond plus fort
  c.section(16, (s) => {
    s.ground(0, 16);
    s.block(2, 0, 3, 0.8, 'block', { skin: 'curb' });
    s.block(8, 0, 5, 1.8, 'block');
    s.hint(1, 4.3, 'hint.charge');
    s.star(10.5, 4.2);
    s.pass('Le trottoir', [-2, 0], ['on', 2.2, 5, 0.8], [['goTo', 0.2], ['hop', 1, 3.4, 0.8]]);
    s.pass('Le perron', [3.4, 0.8], ['on', 8.3, 13, 1.8], [['goTo', 4.2, 0.3], ['hop', 2, 9.6, 1.8]]);
  });
  // Le fossé : on peut y tomber sans danger, il faut sauter par-dessus
  c.section(16, (s) => {
    s.ground(0, 4);
    s.ground(4, 8.5, -1.6);
    s.ground(8.5, 16);
    s.star(6.2, 2.6);
    s.pass('Descendre et franchir le fossé', [-3, 1.8], ['on', 9, 15, 0], [['goTo', 1.2], ['hop', 3, 11]]);
  });
  // Le mur de briques : la puissance 3
  c.section(12, (s) => {
    s.ground(0, 12);
    s.block(4, 0, 2, 2.6, 'block', { skin: 'brick' });
    s.pass('Le mur', [-3, 0], ['on', 6.5, 12, 0], [['goTo', 1.4], ['hop', 4, 8.4]]);
  });
  c.section(18, (s) => {
    s.ground(0, 18);
    s.hoop(11, 3.4);
    s.pass('Le panier', [-3, 0], ['win'], 'shot');
  });
});

// 2 — Les trampolines : passer les premiers pics, monter sur un balcon, enchaîner deux trampolines.
const L2 = level({ id: 'the-wall', difficulty: 'easy', number: 2, nameKey: 'lv.city.2', idea: 'trampolines et premiers pics' }, (c) => {
  c.section(10, (s) => {
    s.ground(0, 10);
    s.spawn(2);
  });
  c.section(14, (s) => {
    s.ground(0, 14);
    s.add('trampolines', { x: 1.5, y: 0, w: 1.6 });
    s.add('spikes', { x: 4.4, y: 0, w: 3.6, dir: 'up' });
    s.hint(-4, 4.3, 'hint.spikes');
    s.star(6.2, 5.6);
    s.pass('Trampoline au-dessus des pics', [-8, 0], ['on', 8.6, 14, 0], [['goTo', 0.3], ['hold', 1, 2.3], ['fly', 10.5]]);
  });
  // Balcon trop haut pour un rebond : le trampoline y mène
  c.section(16, (s) => {
    s.ground(0, 16);
    s.add('trampolines', { x: 2.5, y: 0, w: 1.6 });
    s.block(6.5, 0, 9.5, 5.2, 'block');
    s.star(4.2, 7.2);
    s.pass('Trampoline → balcon', [-3, 0], ['on', 7, 16, 5.2], [['goTo', 1.4], ['hold', 1, 3.3], ['fly', 9.5]]);
  });
  // Descente puis deux trampolines à la suite au-dessus d'une fosse de pics
  c.section(24, (s) => {
    s.ground(0, 24);
    s.add('trampolines', { x: 8, y: 0, w: 1.4 }, { x: 14.2, y: 0, w: 1.4 });
    s.add('spikes', { x: 9.6, y: 0, w: 4.4, dir: 'up' }, { x: 15.8, y: 0, w: 3.6, dir: 'up' });
    s.star(12, 6.4);
    s.star(17.6, 6.4);
    s.pass('Descente du balcon', [-6, 5.2], ['on', 0.5, 7, 0], [['goTo', -1], ['hold', 1, 0.6], ['run', 1, 0.6, 7, 0], ['goTo', 5.5]]);
    s.pass('Deux trampolines à la suite', [5.5, 0], ['on', 19.8, 24, 0], [['hold', 1, 8.6], ['fly', 14.9], ['fly', 21.5]]);
  });
  c.section(18, (s) => {
    s.ground(0, 18);
    s.hoop(11, 3.4);
    s.pass('Le panier', [-1, 0], ['win'], 'shot');
  });
});


// 3 — Le chantier : une nacelle au-dessus du vide, un monte-charge, une deuxième nacelle tout en haut.
const L3 = level({ id: 'trampoline', difficulty: 'medium', number: 3, nameKey: 'lv.city.3', idea: 'plateformes mobiles et monte-charge' }, (c) => {
  c.section(6, (s) => {
    s.ground(0, 6);
    s.spawn(1.5);
    s.hint(3.5, 4.3, 'hint.platform');
  });
  c.section(20, (s) => {
    s.ground(0, 3);
    s.ground(15, 20);
    const m = s.add('movers', { x: 3.2, y: -0.5, w: 3.4, h: 0.5, path: { dx: 8.4, dy: 0, period: 3.6, phase: 0 } });
    s.star(9, 1.0);
    s.pass('Nacelle au-dessus du vide', [-4.5, 0], ['on', 15.2, 34, 0], [['goTo', 1.6], ['ride', m]]);
  });
  c.section(16, (s) => {
    s.ground(0, 16);
    s.block(9, 0, 7, 5.2, 'block', { skin: 'scaffold' });
    const m = s.add('movers', { x: 5.6, y: -0.5, w: 2.4, h: 0.5, path: { dx: 0, dy: 5.2, period: 5, phase: 0 } });
    s.star(6.8, 6.8);
    s.pass('Monte-charge', [-3, 0], ['on', 9.3, 16, 5.2], [['goTo', 3.8], ['waitMover', 'movers', m, 'y', '<', 0.05], ['goTo', 6.8], ['waitMover', 'movers', m, 'y', '>', 5.1], ['run', 1, 9.5, 16, 5.2]]);
  });
  c.section(24, (s) => {
    s.ground(0, 4, 5.2);
    s.ground(14.2, 18, 5.2);
    s.ground(18, 24);
    s.checkpoint(1.5, 5.2);
    const m = s.add('movers', { x: 4.2, y: 4.7, w: 3, h: 0.5, path: { dx: 7, dy: 0, period: 3.4, phase: 0.6 } });
    s.star(9.4, 6.5);
    s.pass('Nacelle du haut', [-4, 5.2], ['x', 14.6], [['goTo', 2.4], ['ride', m]]);
  });
  c.section(18, (s) => {
    s.ground(0, 18);
    s.hoop(11, 3.4);
    s.pass('Descente → panier', [-4, 5.2], ['win'], [['hold', 1, 1], ['shot']]);
  });
});

// 4 — La caisse : s'en faire une marche pour atteindre la corniche, puis la pousser dans la fente du
// tunnel pour s'en faire un pont (impossible de sauter : le plafond est trop bas).
const L4 = level({ id: 'moving', difficulty: 'medium', number: 4, nameKey: 'lv.city.4', idea: 'caisse : une marche, puis un pont', maxY: 11 }, (c) => {
  c.section(18, (s) => {
    s.ground(0, 18);
    s.spawn(2);
    const k = s.add('crates', { x: 5, y: 0, w: 1.6, h: 1.6 });
    s.block(13, 0, 5, 5.6, 'block');
    s.hint(6, 4.6, 'hint.crate');
    s.star(9, 2.6);
    s.pass('Pousser la caisse contre le mur', [2, 0], ['crate', k, 11.2], [['hold', 1, 10.85]]);
    s.pass('Caisse → corniche', [10.5, 0], ['on', 13.3, 18, 5.6], [['goTo', 8.6], ['hop', 2, 12.2, 1.6], ['settle'], ['charge', 5], ['jump', 1, 15.5]]);
  });
  // Le tunnel : plafond bas au-dessus d'une fente garnie de pics. La caisse s'y loge et fait un pont.
  c.section(22, (s) => {
    s.ground(0, 9, 5.6);
    s.ground(9, 12.2, 4.6);
    s.ground(12.2, 22, 5.6);
    s.add('spikes', { x: 9, y: 4.6, w: 3.2, dir: 'up' });
    s.block(6.6, 6.85, 8, 3.2, 'block');
    const k = s.add('crates', { x: 3, y: 5.6, w: 3.1, h: 1.0 });
    s.checkpoint(1.2, 5.6);
    s.star(10.6, 6.3);
    s.pass('La caisse fait un pont', [0.5, 5.6], ['on', 13, 22, 5.6], [['goTo', 1.6], ['hold', 1, 13.6], ['run', 1, 14, 22, 5.6]]);
    void k;
  });
  c.section(20, (s) => {
    s.ground(0, 20);
    s.star(3, 3.2);
    s.hoop(13, 3.4);
    s.pass('Descente → panier', [-6, 5.6], ['win'], [['hold', 1, 1], ['shot']]);
  });
});

// 5 — Le souffle : les ventilateurs des toits portent le ballon de toit en toit, jusqu'au belvédère.
const L5 = level({ id: 'updraft', difficulty: 'easy', number: 5, nameKey: 'lv.city.5', idea: 'ventilateurs (détente)', maxY: 13 }, (c) => {
  c.section(6, (s) => {
    s.ground(0, 6);
    s.spawn(2);
    s.hint(6, 4.3, 'hint.fan');
  });
  c.section(16, (s) => {
    s.ground(0, 16);
    s.add('fans', { x: 3, y: 0, w: 2.2, h: 10, strength: 110 });
    s.block(6.1, 0, 9.9, 5.2, 'block');
    s.star(4.1, 6.4);
    s.pass('Ventilateur → premier toit', [-4, 0], ['on', 6.4, 16, 5.2], [['goTo', 1.6], ['hold', 1, 3.6], ['float', 4.1, 1.3], ['run', 1, 6.6, 16, 5.2]]);
  });
  // Entre deux immeubles : on tombe dans la ruelle, le ventilateur remonte au toit suivant
  c.section(20, (s) => {
    s.ground(0, 4, 5.2);
    s.ground(4, 12);
    s.add('fans', { x: 9.5, y: 0, w: 2.2, h: 11, strength: 115 });
    s.ground(12, 20, 6.6);
    s.star(10.6, 8.6);
    s.pass('La ruelle et son ventilateur', [-4, 5.2], ['on', 12.3, 20, 6.6], [['hold', 1, 5], ['goTo', 7.6], ['hold', 1, 9.8], ['float', 10.6, 1.7], ['run', 1, 12.5, 20, 6.6]]);
  });
  // La cheminée : un conduit qui mène au belvédère
  c.section(18, (s) => {
    s.ground(0, 5, 6.6);
    s.ground(5, 18, 2.4);
    s.add('fans', { x: 7.6, y: 2.4, w: 2.2, h: 11, strength: 120 });
    s.block(11.5, 2.4, 6.5, 6.6, 'block');
    s.star(15, 10.6);
    s.pass('La cheminée → belvédère', [-4, 6.6], ['on', 11.8, 18, 9.0], [['hold', 1, 5.4], ['goTo', 6.2], ['hold', 1, 7.8], ['float', 8.7, 2.2], ['run', 1, 12, 18, 9.0]]);
  });
  c.section(16, (s) => {
    s.ground(0, 16);
    s.hoop(10, 3.4);
    s.pass('Descente → panier', [-5, 9.0], ['win'], [['hold', 1, 1], ['shot']]);
  });
});

// 6 — Le panier enfermé : une porte le protège ; l'interrupteur est tout en haut de la tour.
const L6 = level({ id: 'final', difficulty: 'medium', number: 6, nameKey: 'lv.city.6', idea: 'interrupteur en hauteur, porte du panier', maxY: 12.5 }, (c) => {
  c.section(12, (s) => {
    s.ground(0, 12);
    s.spawn(2);
  });
  c.section(24, (s) => {
    s.ground(0, 24);
    s.add('trampolines', { x: 3, y: 0, w: 1.6 });
    s.block(6.5, 0, 5, 5.2, 'block');
    s.block(13, 0, 4.4, 7.8, 'block');
    const sw = s.add('switches', { x: 14.6, y: 7.8, w: 1.2, target: 'cage' });
    s.hint(-2, 4.4, 'hint.switch');
    s.star(9, 7.4);
    s.star(15.2, 10.4);
    s.pass('Trampoline → toit', [-8, 0], ['on', 6.8, 11.5, 5.2], [['goTo', 1.6], ['hold', 1, 3.6], ['fly', 9]]);
    s.pass('Toit → interrupteur', [9, 5.2], ['switch', sw], [['goTo', 10.2], ['hop', 4, 15.2, 7.8]]);
    s.pass('Redescendre', [15.2, 7.8], ['on', 18, 24, 0], [['hold', 1, 17.6], ['run', 1, 18.2, 24, 0]]);
  });
  // La cage du panier : la porte s'est ouverte en bas du mur
  c.section(22, (s) => {
    s.ground(0, 22);
    s.add('doors', { id: 'cage', x: 4, y: 0, w: 0.8, h: 3.2, open: { dx: 0, dy: 3.2 }, duration: 0.8 });
    s.block(4, 3.2, 0.8, 8.8, 'wall');
    s.hoop(15, 3.4);
    s.pass('Porte ouverte → panier', [-4, 0], ['win'], [['goTo', 3], ['wait', 0.4], ['hold', 1, 7], ['shot']]);
  });
});

// 7 — La scierie : des scies qui montent et descendent, une scie qui balaie le sol, une scie au-dessus
// d'une marche. On observe leur rythme, puis on passe.
const L7 = level({ id: 'city-crate', difficulty: 'medium', number: 7, nameKey: 'lv.city.7', idea: 'rythme des scies (précision)' }, (c) => {
  c.section(7, (s) => {
    s.ground(0, 7);
    s.spawn(2);
  });
  c.section(12, (s) => {
    s.ground(0, 12);
    s.add('saws', { x: 6.5, y: 0.7, r: 0.6, path: { dx: 0, dy: 2.8, period: 2.6, phase: 0 } });
    s.star(6.5, 4.6);
    s.pass('Sous la scie qui monte', [-3, 0], ['on', 8, 12, 0], [['goTo', 3.8], ['waitCycle', 2.6, 0.8, 0.9], ['run', 1, 8.2, 12, 0]]);
  });
  c.section(16, (s) => {
    s.ground(0, 16);
    s.add('saws', { x: 3.5, y: 0.7, r: 0.6, path: { dx: 0, dy: 2.8, period: 2.2, phase: 0.5 } }, { x: 8, y: 0.7, r: 0.6, path: { dx: 0, dy: 2.8, period: 2.2, phase: 0 } });
    s.star(5.8, 1.0);
    s.pass('Deux scies en alternance', [-2, 0], ['on', 9.6, 16, 0], [['goTo', 1.2], ['waitCycle', 2.2, 1.8, 1.9], ['run', 1, 9.8, 16, 0]]);
  });
  // La scie qui balaie le sol : on la saute quand elle arrive
  c.section(16, (s) => {
    s.ground(0, 16);
    s.add('saws', { x: 4, y: 0.6, r: 0.55, path: { dx: 6, dy: 0, period: 3, phase: 0 } });
    s.star(7, 3.4);
    s.pass('La scie qui balaie le sol', [-4, 0], ['on', 11.4, 16, 0], [['goTo', 0.6], ['waitCycle', 3, 0.9, 0.95], ['dribbleRun', 1, 2, 5, 9]]);
  });
  // La marche gardée : une scie tourne au-dessus
  c.section(14, (s) => {
    s.ground(0, 14);
    s.block(6, 0, 8, 1.8, 'block');
    s.add('saws', { x: 7.4, y: 3.4, r: 0.6, path: { dx: 3.4, dy: 0, period: 2.2, phase: 0 } });
    s.checkpoint(1, 0);
    s.pass('La marche gardée', [-2, 0], ['on', 11.2, 14, 1.8], [['goTo', 4.6], ['waitCycle', 2.2, 1.6, 1.65], ['charge', 3], ['jump', 1, 7.6, 1.8], ['run', 1, 11.4, 14, 1.8]]);
  });
  c.section(18, (s) => {
    s.ground(0, 18, 1.8);
    s.hoop(11, 3.4, 1.8);
    s.pass('Le panier', [-2, 1.8], ['win'], 'shot');
  });
});

// 8 — Le métro : trois stations, trois téléporteurs. Le dernier est au fond d'un puits.
const L8 = level({ id: 'city-roofs', difficulty: 'medium', number: 8, nameKey: 'lv.city.8', idea: 'réseau de téléporteurs', maxY: 12 }, (c) => {
  c.section(12, (s) => {
    s.ground(0, 12);
    s.spawn(2);
  });
  // Station 1 : un mur infranchissable, le téléporteur mène sur le quai du haut
  c.section(18, (s) => {
    s.ground(0, 18);
    s.block(9, 0, 9, 7.5, 'block');
    s.add('teleporters', { a: { x: 5.5, y: 0.9 }, b: { x: 11, y: 8.4 }, r: 0.8 });
    s.hint(1, 4.3, 'hint.teleport');
    s.star(3.5, 2);
    s.pass('Station 1 → quai du haut', [-6, 0], ['on', 9.5, 18, 7.5], [['goTo', 3], ['hold', 1, 5.6], ['run', 1, 11.5, 18, 7.5], ['goTo', 14]]);
  });
  // Station 2 : un trou béant dans le quai ; le téléporteur au bord renvoie sur l'autre rive
  c.section(20, (s) => {
    s.ground(0, 3, 7.5);
    s.ground(14, 20, 7.5);
    s.checkpoint(0.8, 7.5);
    s.add('teleporters', { a: { x: 2.2, y: 8.4 }, b: { x: 15.5, y: 8.4 }, r: 0.8 });
    s.star(8.5, 9.5);
    s.pass('Station 2 → autre rive', [-4, 7.5], ['on', 14.5, 20, 7.5], [['hold', 1, 2.3], ['run', 1, 16, 20, 7.5], ['goTo', 18]]);
  });
  // La rame : une plateforme mobile traverse le tunnel jusqu'à la station 3
  c.section(18, (s) => {
    s.ground(0, 3, 7.5);
    s.ground(14, 18, 7.5);
    const m = s.add('movers', { x: 3.2, y: 7, w: 3.4, h: 0.5, path: { dx: 7.4, dy: 0, period: 4.2, phase: 0.3 } });
    s.star(8.6, 8.6);
    s.pass('La rame de métro', [-2, 7.5], ['x', 14.3], [['goTo', 1.4], ['ride', m]]);
  });
  // Station 3 : le téléporteur est au fond d'un puits, il ressort sur la place du panier
  c.section(14, (s) => {
    s.ground(0, 5, 7.5);
    s.ground(5, 9, 2.5);
    s.ground(9, 14, 7.5);
    s.add('teleporters', { a: { x: 7, y: 3.4 }, b: { x: 11, y: 8.4 }, r: 0.8 });
    s.checkpoint(2, 7.5);
    s.pass('Au fond du puits', [-4, 7.5], ['on', 10.5, 14, 7.5], [['hold', 1, 5.6], ['goTo', 5.8], ['hold', 1, 6.8], ['run', 1, 10.5, 14, 7.5]]);
  });
  c.section(18, (s) => {
    s.ground(0, 18, 7.5);
    s.star(6, 9.6);
    s.hoop(11, 3.4, 7.5);
    s.pass('Le panier', [-2, 7.5], ['win'], 'shot');
  });
});

// 9 — L'usine : barrière laser, presse, deux lasers en alternance, double presse. Rapide.
const L9 = level({ id: 'city-site', difficulty: 'hard', number: 9, nameKey: 'lv.city.9', idea: 'lasers et presses (rapide)' }, (c) => {
  c.section(10, (s) => {
    s.ground(0, 10);
    s.spawn(2);
    s.hint(5, 4.3, 'hint.laser');
  });
  c.section(10, (s) => {
    s.ground(0, 10);
    s.add('lasers', { x1: 5, y1: 0, x2: 5, y2: 6, period: 2.4, on: 1.2, phase: 0 });
    s.pass('Barrière laser', [-3, 0], ['on', 6.4, 10, 0], [['goTo', 3], ['waitCycle', 2.4, 0.3, 0.4], ['run', 1, 6.6, 10, 0]]);
  });
  c.section(10, (s) => {
    s.ground(0, 10);
    s.add('crushers', { x: 4, w: 2.4, top: 3.0, bottom: 0, period: 2.4, phase: 0 });
    s.star(5.2, 4.8);
    s.pass('Sous la presse', [-3, 0], ['on', 7, 10, 0], [['goTo', 2.6], ['waitCycle', 2.4, 1.85, 1.95], ['run', 1, 7.2, 10, 0]]);
  });
  c.section(14, (s) => {
    s.ground(0, 14);
    s.add('lasers', { x1: 4, y1: 0, x2: 4, y2: 6, period: 3, on: 1.2, phase: 0 }, { x1: 8.5, y1: 0, x2: 8.5, y2: 6, period: 3, on: 1.2, phase: 0.5 });
    s.checkpoint(1, 0);
    s.star(6.2, 1.2);
    s.pass('Deux lasers en alternance', [-3, 0], ['on', 10, 14, 0], [['goTo', 2], ['waitCycle', 3, 0.85, 0.95], ['run', 1, 10.2, 14, 0]]);
  });
  c.section(14, (s) => {
    s.ground(0, 14);
    s.add('crushers', { x: 3.2, w: 2.2, top: 2.8, bottom: 0, period: 2.2, phase: 0 }, { x: 7.4, w: 2.2, top: 2.8, bottom: 0, period: 2.2, phase: 0.12 });
    s.star(10.5, 2.2);
    s.pass('Double presse', [-3, 0], ['on', 10, 14, 0], [['goTo', 1.6], ['waitCycle', 2.2, 1.35, 1.45], ['run', 1, 10.2, 14, 0]]);
  });
  c.section(18, (s) => {
    s.ground(0, 18);
    s.hoop(11, 3.4);
    s.pass('Le panier', [-3, 0], ['win'], 'shot');
  });
});

// 10 — Grand final : la caisse pour atteindre l'interrupteur, la porte, le ventilateur, la barrière laser,
// et le téléporteur qui dépose sur la place du panier.
const L10 = level({ id: 'city-finale', difficulty: 'hard', number: 10, nameKey: 'lv.city.10', idea: 'finale : caisse → interrupteur → ventilateur → téléporteur', maxY: 12 }, (c) => {
  c.section(18, (s) => {
    s.ground(0, 18);
    s.spawn(3.4);
    const k = s.add('crates', { x: 5, y: 0, w: 1.6, h: 1.6 });
    s.block(13, 0, 5, 5.6, 'block');
    s.star(9, 2.6);
    s.pass('Pousser la caisse', [3.4, 0], ['crate', k, 11.2], [['hold', 1, 10.85]]);
    s.pass('Caisse → toit', [10.5, 0], ['on', 13.3, 18, 5.6], [['goTo', 8.6], ['hop', 2, 12.2, 1.6], ['settle'], ['charge', 5], ['jump', 1, 15.5]]);
  });
  // Sur le toit : l'interrupteur ouvre la porte en bas, de l'autre côté
  c.section(12, (s) => {
    s.ground(0, 6, 5.6);
    s.ground(6, 12);
    const sw = s.add('switches', { x: 3.2, y: 5.6, w: 1.2, target: 'gate' });
    s.checkpoint(1, 5.6);
    s.pass('Interrupteur du toit', [-2, 5.6], ['switch', sw], [['goTo', 2.2], ['hop', 1, 3.8, 5.6]]);
    s.pass('Descendre', [3.8, 5.6], ['on', 7, 12, 0], [['hold', 1, 6.4], ['run', 1, 7.2, 12, 0], ['goTo', 9]]);
  });
  c.section(18, (s) => {
    s.ground(0, 18);
    s.add('doors', { id: 'gate', x: 2, y: 0, w: 0.8, h: 3.2, open: { dx: 0, dy: 3.2 }, duration: 0.8 });
    s.block(2, 3.2, 0.8, 8, 'wall');
    s.add('fans', { x: 6, y: 0, w: 2.2, h: 9, strength: 95 });
    s.block(10, 0, 8, 5.2, 'block');
    s.star(7.1, 6.6);
    s.pass('Porte → ventilateur → terrasse', [-3, 0], ['on', 10.3, 18, 5.2], [['goTo', 1], ['wait', 0.3], ['hold', 1, 6.9], ['wait', 1.6], ['run', 1, 10.5, 18, 5.2]]);
  });
  c.section(8, (s) => {
    s.ground(0, 8, 5.2);
    s.add('teleporters', { a: { x: 5.5, y: 6.1 }, b: { x: 12.5, y: 0.9 }, r: 0.8 });
    s.star(3, 7);
    s.pass('Téléporteur → place du panier', [-3, 5.2], ['x', 12], [['hold', 1, 5.6]]);
  });
  c.section(20, (s) => {
    s.ground(0, 20);
    s.hoop(13, 3.4);
    s.pass('Le panier', [4.5, 0], ['win'], 'shot');
  });
});

export const CITY_LEVELS = [L1, L2, L3, L4, L5, L6, L7, L8, L9, L10];
