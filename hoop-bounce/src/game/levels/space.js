// MONDE 5 — ESPACE : EXPERT (refonte phase 2). 50 à 70 s par niveau pour un joueur.
// Gravité réduite (worlds.js : on retombe lentement, les rebonds montent 25 % plus haut), plateformes
// flottantes, astéroïdes, portails à double sens, zones de gravité inversée, trous noirs, pistons et
// lasers de la station. Les derniers niveaux combinent presque toutes les mécaniques du jeu.
//
// 41 Premiers pas lunaires  sauts lunaires, plateformes flottantes, le premier trou noir (découverte)
// 42 La ceinture            astéroïdes : entre eux, par-dessus, en dessous (rythme)
// 43 Les portails           portails à double sens : l'aller-retour vers l'interrupteur (★ puzzle)
// 44 La tête en bas         gravité inversée : rouler au plafond, sauter vers le sol (★ mémorable)
// 45 Les trous noirs        ils attirent : sauter assez haut, ou assez loin (précision)
// 46 La station             pistons et lasers (rapide)
// 47 Le laboratoire         caisse, interrupteurs, portails (puzzle)
// 48 Le monde à l'envers    zones inversées et astéroïdes (technique)
// 49 Le grand vide          plateformes flottantes au-dessus du vide et des trous noirs (précision)
// 50 L'odyssée              tout le jeu en un niveau (★ finale)

import { level } from './kit.js';
import { P6, P7, P8, P9, P10 } from './_space_old.js';

const glow = { skin: 'glow' };
/** Plateforme flottante (mobile) de largeur w, qui monte et descend de dy. */
const float = (x, y, w, dy, period, phase = 0) => ({ x, y, w, h: 0.5, style: 'float', path: { dx: 0, dy, period, phase } });
/** Plot lumineux fixe, dessus à `top`. */
const pad = (s, x, top, w = 2.5) => s.block(x, top - 0.5, w, 0.5, 'block', glow);

// 41 — Premiers pas lunaires
const L41 = level({ id: 'space-1', difficulty: 'medium', number: 1, nameKey: 'lv.space.1', idea: 'gravité réduite : sauts lunaires, plateformes flottantes, premier trou noir', maxY: 12 }, (c) => {
  c.section(8, (s) => {
    s.ground(0, 8);
    s.spawn(2);
    s.hint(5, 4.3, 'hint.space');
  });
  c.section(22, (s) => {
    s.ground(0, 6);
    s.ground(12, 22);
    s.star(9, 5.4);
    s.pass('Premier saut lunaire', [-6, 0], ['on', 12.2, 22, 0], [['goTo', 5.2], ['hop', 3, 14], ['goTo', 16]]);
  });
  // Le grand saut, au-dessus du trou noir
  c.section(28, (s) => {
    s.ground(0, 4);
    s.add('magnets', { x: 8.5, y: -1.8, radius: 3.2, strength: 16, core: 0.7 });
    s.ground(13, 28);
    s.checkpoint(1, 0);
    s.hint(9, 4.4, 'hint.blackhole', 0.8);
    s.star(9, 6.6);
    s.pass('Le grand saut', [-6, 0], ['on', 13.2, 28, 0], [['goTo', 3.4], ['hop', 5, 15.4], ['goTo', 18]]);
  });
  // Les plateformes flottantes
  c.section(30, (s) => {
    s.ground(0, 3);
    const m = s.add('movers', float(6, 1.5, 2.6, 0.6, 3.4), float(11, 3.0, 2.6, 0.6, 3.8, 0.3), float(16, 2.0, 2.6, 0.6, 3.2, 0.6), float(21, 3.4, 2.6, 0.6, 3.6, 0.1));
    s.ground(26, 30);
    s.checkpoint(1, 0);
    s.hint(1.6, 4.3, 'hint.floating');
    s.star(17.3, 5.4);
    s.pass('Les plateformes flottantes', [-4, 0], ['on', 26.2, 30, 0], [['goTo', 2.2], ['hopTo', 2, 'movers', m, 1.3], ['hopTo', 2, 'movers', m + 1, 1.3], ['hopTo', 1, 'movers', m + 2, 1.3], ['hopTo', 2, 'movers', m + 3, 1.3], ['hop', 2, 27.6], ['goTo', 28]]);
  });
  // Les plots lumineux : on monte, on redescend
  c.section(26, (s) => {
    s.ground(0, 2);
    pad(s, 4.6, 2.4);
    pad(s, 9.4, 4.4);
    pad(s, 14.2, 2.8);
    s.ground(19, 26);
    s.checkpoint(1, 0);
    s.star(10.6, 6.8);
    s.pass('Les plots lumineux', [-2, 0], ['on', 19.2, 26, 0], [['goTo', 1.2], ['hop', 2, 5.85, 2.4], ['settle'], ['hop', 2, 10.65, 4.4], ['settle'], ['hop', 1, 15.45, 2.8], ['settle'], ['hop', 1, 21, 0], ['goTo', 21.4]]);
  });
  c.section(16, (s) => {
    s.ground(0, 16);
    s.hoop(10, 3.4);
    s.pass('Le panier', [-2, 0], ['win'], 'shot');
  });
});

// 42 — La ceinture d'astéroïdes
const L42 = level({ id: 'space-2', difficulty: 'hard', number: 2, nameKey: 'lv.space.2', idea: 'astéroïdes : passer entre eux, par-dessus, en dessous', maxY: 12 }, (c) => {
  c.section(8, (s) => {
    s.ground(0, 8);
    s.spawn(2);
    s.hint(5, 4.3, 'hint.asteroids');
  });
  // Entre les astéroïdes qui montent et descendent
  c.section(26, (s) => {
    s.ground(0, 2);
    pad(s, 5, 2);
    s.add('asteroids', { x: 9.2, y: 5.5, r: 0.7, path: { dx: 0, dy: -4, period: 3.6, phase: 0 } });
    pad(s, 11, 3.4);
    s.add('asteroids', { x: 15.2, y: 6, r: 0.7, path: { dx: 0, dy: -4.4, period: 4, phase: 0.5 } });
    pad(s, 17, 2.2);
    s.ground(22, 26);
    s.star(9.2, 7.4);
    s.pass('Première plateforme', [-6, 0], ['on', 5, 7.5, 2], [['goTo', 1.2], ['hop', 2, 6.25, 2]]);
    s.pass('Entre les astéroïdes (1)', [6.25, 2], ['on', 11, 13.5, 3.4], [['settle'], ['waitCycle', 3.6, 0.65, 0.75], ['hop', 2, 12.25, 3.4]]);
    s.pass('Entre les astéroïdes (2)', [12.25, 3.4], ['on', 17, 19.5, 2.2], [['settle'], ['waitCycle', 4, 2.35, 2.45], ['hop', 2, 18.25, 2.2]]);
    s.pass('Plateforme → sol', [18.25, 2.2], ['on', 22.2, 26, 0], [['settle'], ['hop', 1, 23.4], ['goTo', 24]]);
  });
  // L'astéroïde qui roule : on saute par-dessus
  c.section(22, (s) => {
    s.ground(0, 22);
    const k = s.add('asteroids', { x: 6, y: 0.7, r: 0.7, path: { dx: 8, dy: 0, period: 4.4, phase: 0 } });
    s.checkpoint(0.6, 0);
    s.star(10, 3.4);
    s.pass('L’astéroïde qui roule', [-2, 0], ['on', 17, 22, 0], [['goTo', 2.6], ['waitMover', 'rollers', k, 'x', '<', 0.3], ['jumpOver', 'rollers', k, 3], ['goTo', 19]]);
  });
  // La passerelle : un astéroïde roule sur un pont étroit au-dessus du vide
  c.section(24, (s) => {
    s.ground(0, 3);
    s.block(3, -0.5, 16, 0.5, 'block', glow);
    const k = s.add('asteroids', { x: 6, y: 0.7, r: 0.7, path: { dx: 8, dy: 0, period: 4, phase: 0.5 } });
    s.ground(19, 24);
    s.checkpoint(1, 0);
    s.star(11, 3.6);
    s.pass('La passerelle', [-3, 0], ['on', 19.2, 24, 0], [['goTo', 1.6], ['waitMover', 'rollers', k, 'x', '>', 7.7], ['jumpOver', 'rollers', k, 3], ['run', 1, 19.4, 24, 0], ['goTo', 21]]);
  });
  // La pluie d'astéroïdes : trois astéroïdes tombent sur le chemin, on passe dessous au bon moment
  c.section(26, (s) => {
    s.ground(0, 26);
    s.add('asteroids', { x: 6, y: 7, r: 0.7, path: { dx: 0, dy: -6.2, period: 3.2, phase: 0 } }, { x: 11, y: 7, r: 0.7, path: { dx: 0, dy: -6.2, period: 3.2, phase: 0.33 } }, { x: 16, y: 7, r: 0.7, path: { dx: 0, dy: -6.2, period: 3.2, phase: 0.66 } });
    s.checkpoint(0.6, 0);
    s.star(11, 2);
    s.pass('La pluie d’astéroïdes', [-3, 0], ['on', 20, 26, 0], [['goTo', 1.6], ['waitCycle', 3.2, 0.0, 0.1], ['run', 1, 20.2, 26, 0]]);
  });
  // La grande pluie : deux rideaux d'astéroïdes, un abri entre les deux
  c.section(30, (s) => {
    s.ground(0, 30);
    for (const [x, ph] of [[4, 0], [6.4, 0.15], [8.8, 0.3]]) s.add('asteroids', { x, y: 7, r: 0.7, path: { dx: 0, dy: -6.2, period: 3, phase: ph } });
    for (const [x, ph] of [[16.4, 0.5], [18.8, 0.65], [21.2, 0.8]]) s.add('asteroids', { x, y: 7, r: 0.7, path: { dx: 0, dy: -6.2, period: 3, phase: ph } });
    s.checkpoint(0.6, 0);
    s.star(12.6, 1.4);
    s.pass('La grande pluie', [-3, 0], ['on', 25, 30, 0], [['goTo', 1.4], ['waitCycle', 3, 0.0, 0.1], ['goTo', 12.6], ['waitCycle', 3, 1.5, 1.6], ['run', 1, 25.2, 30, 0]]);
  });
  c.section(16, (s) => {
    s.ground(0, 16);
    s.hoop(10, 3.4);
    s.pass('Le panier', [-2, 0], ['win'], 'shot');
  });
});

// 43 — Les portails : à double sens
const L43 = level({ id: 'space-3', difficulty: 'hard', number: 3, nameKey: 'lv.space.3', idea: 'portails à double sens : l’aller-retour vers l’interrupteur', maxY: 12 }, (c) => {
  c.section(8, (s) => {
    s.ground(0, 8);
    s.spawn(2);
    s.hint(5, 4.3, 'hint.portal');
  });
  // Le premier portail traverse la cloison
  c.section(20, (s) => {
    s.ground(0, 20);
    s.block(8, 0, 1.2, 16, 'wall');
    s.add('teleporters', { a: { x: 5, y: 0.9 }, b: { x: 12.4, y: 0.9 }, r: 0.8, twoWay: true });
    s.star(12.4, 3);
    s.pass('Le premier portail', [-6, 0], ['on', 13.5, 20, 0], [['goTo', 3], ['hold', 1, 5.2], ['settle'], ['goTo', 16]]);
  });
  // Le détour : l'interrupteur est enfermé dans une cabine ; on y va, et on revient par le même portail
  c.section(26, (s) => {
    s.ground(0, 26);
    s.block(4, 6, 6, 0.4, 'block', glow);
    s.block(4, 9.6, 6, 0.4, 'block', glow);
    s.block(4, 6.4, 0.4, 3.2, 'wall');
    s.block(9.6, 6.4, 0.4, 3.2, 'wall');
    const sw = s.add('switches', { x: 7, y: 6.4, w: 1.2, target: 'cabin' });
    s.add('teleporters', { a: { x: 2.2, y: 0.9 }, b: { x: 5.4, y: 7.4 }, r: 0.8, twoWay: true });
    s.add('doors', { id: 'cabin', x: 16, y: 0, w: 0.8, h: 3.4, open: { dx: 0, dy: 3.4 }, duration: 0.8 });
    s.block(16, 3.4, 0.8, 8.6, 'wall');
    s.checkpoint(-1, 0);
    s.star(7.6, 8.4);
    s.pass('Vers la cabine', [-4, 0], ['switch', sw], [['goTo', 0.4], ['hold', 1, 2.4], ['settle'], ['goTo', 7.6]]);
    s.pass('Retour par le même portail', [7.6, 6.4], ['on', 0, 4, 0], [['hold', -1, 5.2], ['settle'], ['goTo', 3.6]]);
    s.pass('La porte est ouverte', [3.6, 0], ['on', 18, 26, 0], [['run', 1, 18.2, 26, 0]]);
  });
  // Les portails en chaîne : de plot en plot au-dessus des pics
  c.section(30, (s) => {
    s.ground(0, 30);
    s.add('spikes', { x: 4, y: 0, w: 22, dir: 'up' });
    pad(s, 9, 2.4, 3);
    pad(s, 17, 2.4, 3);
    s.add('teleporters', { a: { x: 2.4, y: 0.9 }, b: { x: 9.8, y: 3.4 }, r: 0.8, twoWay: true }, { a: { x: 11.4, y: 3.3 }, b: { x: 17.8, y: 3.4 }, r: 0.8, twoWay: true }, { a: { x: 19.4, y: 3.3 }, b: { x: 27.6, y: 0.9 }, r: 0.8, twoWay: true });
    s.checkpoint(0.6, 0);
    s.star(14, 4.4);
    s.pass('Premier portail de la chaîne', [-4, 0], ['on', 9, 12, 2.4], [['goTo', 0.6], ['hold', 1, 2.4], ['settle'], ['goTo', 10.2]]);
    s.pass('Deuxième portail', [10.2, 2.4], ['on', 17, 20, 2.4], [['hold', 1, 11.4], ['settle'], ['goTo', 18.2]]);
    s.pass('Troisième portail', [18.2, 2.4], ['on', 26.2, 30, 0], [['hold', 1, 19.4], ['settle'], ['goTo', 28.4]]);
  });
  // Le portail gardé : un laser devant le portail, une cloison derrière
  c.section(26, (s) => {
    s.ground(0, 26);
    s.add('lasers', { x1: 5, y1: 0, x2: 5, y2: 12, period: 2.6, on: 1.2, phase: 0 });
    s.block(10, 0, 1.2, 16, 'wall');
    s.block(13, 0, 6, 4, 'block', glow);
    s.add('teleporters', { a: { x: 8, y: 0.9 }, b: { x: 14.6, y: 5 }, r: 0.8, twoWay: true });
    s.checkpoint(1, 0);
    s.star(16, 6.6);
    s.pass('Le portail gardé', [-2, 0], ['on', 13.2, 19, 4], [['goTo', 2.6], ['waitCycle', 2.6, 0.0, 0.1], ['hold', 1, 8.2], ['settle'], ['goTo', 16.4]]);
    s.pass('Descendre de l’estrade', [16.4, 4], ['on', 20, 26, 0], [['hold', 1, 19.4], ['goTo', 22]]);
  });
  // Le portail perché : on saute dedans, on ressort derrière la cloison au-dessus des pics
  c.section(26, (s) => {
    s.ground(0, 26);
    s.block(4, 0, 4, 3.6, 'block', glow);
    s.block(11, 0, 1.2, 16, 'wall');
    s.add('spikes', { x: 12.2, y: 0, w: 8, dir: 'up' });
    pad(s, 14.6, 3.4);
    s.add('teleporters', { a: { x: 7, y: 4.5 }, b: { x: 15.8, y: 4.4 }, r: 0.8, twoWay: true });
    s.checkpoint(1, 0);
    s.star(18, 6);
    s.pass('Sur l’estrade', [-4, 0], ['on', 4.2, 6.4, 3.6], [['goTo', 0.6], ['hop', 3, 5, 3.6]]);
    s.pass('Le portail perché', [5, 3.6], ['on', 14.6, 17.1, 3.4], [['hold', 1, 7], ['settle'], ['goTo', 15.6]]);
    s.pass('Par-dessus les pics', [15.6, 3.4], ['on', 20.4, 26, 0], [['hop', 1, 22], ['goTo', 22.4]]);
  });
  c.section(16, (s) => {
    s.ground(0, 16);
    s.hoop(10, 3.4);
    s.pass('Le panier', [-2, 0], ['win'], 'shot');
  });
});

// 44 — La tête en bas : la gravité s'inverse dans les zones violettes
const L44 = level({ id: 'space-4', difficulty: 'hard', number: 4, nameKey: 'lv.space.4', idea: 'gravité inversée : le plafond devient le sol', maxY: 12 }, (c) => {
  c.section(8, (s) => {
    s.ground(0, 8);
    s.spawn(2);
    s.hint(5, 4.3, 'hint.inverted');
  });
  // Le premier plafond : on roule dessus, au-dessus des pics
  c.section(30, (s) => {
    s.ground(0, 30);
    s.block(4, 6.4, 14, 1, 'block', glow);
    s.add('gravityZones', { x: 4, y: 0, w: 14, h: 6.4 });
    s.add('spikes', { x: 6, y: 0, w: 12, dir: 'up' });
    s.star(11, 5.6);
    s.pass('Le premier plafond', [-6, 0], ['on', 19, 30, 0], [['run', 1, 19.2, 30, 0], ['goTo', 26]]);
  });
  // Les pics du plafond : sauter vers le bas, au-dessus des pics suspendus
  c.section(32, (s) => {
    s.ground(0, 32);
    s.block(3, 6.4, 18, 1, 'block', glow);
    s.add('gravityZones', { x: 3, y: 0, w: 18, h: 6.4 });
    s.add('spikes', { x: 5, y: 0, w: 16, dir: 'up' }, { x: 10.4, y: 6.4, w: 1.8, dir: 'down' });
    s.checkpoint(0.8, 0);
    s.star(11.3, 3.6);
    s.pass('Les pics suspendus', [-6, 0], ['on', 22, 32, 0], [['goTo', 0.8], ['jumpAt', 1, 8.6], ['run', 1, 22.2, 32, 0], ['goTo', 28]]);
  });
  // Les lasers du plafond
  c.section(32, (s) => {
    s.ground(0, 32);
    s.block(3, 6.4, 18, 1, 'block', glow);
    s.add('gravityZones', { x: 3, y: 0, w: 18, h: 6.4 });
    s.add('spikes', { x: 5, y: 0, w: 16, dir: 'up' });
    s.add('lasers', { x1: 8.6, y1: 3.4, x2: 8.6, y2: 6.4, period: 3, on: 1.2, phase: 0 }, { x1: 14.6, y1: 3.4, x2: 14.6, y2: 6.4, period: 3, on: 1.2, phase: 0.35 });
    s.checkpoint(0.8, 0);
    s.star(11.6, 5.6);
    s.pass('Les lasers du plafond', [-4, 0], ['on', 22, 32, 0], [['goTo', 0.8], ['waitCycle', 3, 0.2, 0.3], ['run', 1, 22.2, 32, 0], ['goTo', 28]]);
  });
  // Le pont invisible : il n'y a plus de sol, seulement le plafond
  c.section(34, (s) => {
    s.ground(0, 4);
    s.block(4, 6.4, 18, 1, 'block', glow);
    s.add('gravityZones', { x: 4, y: -3, w: 18, h: 9.4 });
    s.ground(22, 34);
    s.checkpoint(1, 0);
    s.star(13, 5.6);
    s.pass('Le pont invisible', [-4, 0], ['on', 23, 34, 0], [['goTo', 1], ['run', 1, 23.2, 34, 0], ['goTo', 28]]);
  });
  // Deux plafonds à la suite
  c.section(34, (s) => {
    s.ground(0, 34);
    s.block(3, 6.4, 8, 1, 'block', glow);
    s.block(15, 6.4, 8, 1, 'block', glow);
    s.add('gravityZones', { x: 3, y: 0, w: 8, h: 6.4 }, { x: 15, y: 0, w: 8, h: 6.4 });
    s.add('spikes', { x: 4.6, y: 0, w: 6.4, dir: 'up' }, { x: 16.6, y: 0, w: 6.4, dir: 'up' });
    s.checkpoint(0.8, 0);
    s.star(13, 3.6);
    s.pass('Deux plafonds', [-6, 0], ['on', 25, 34, 0], [['goTo', 0.8], ['run', 1, 25.2, 34, 0], ['goTo', 29]]);
  });
  c.section(16, (s) => {
    s.ground(0, 16);
    s.hoop(10, 3.4);
    s.pass('Le panier', [-2, 0], ['win'], 'shot');
  });
});

// 45 — Les trous noirs : ils attirent le ballon
const L45 = level({ id: 'space-5', difficulty: 'hard', number: 5, nameKey: 'lv.space.5', idea: 'trous noirs : sauter assez haut, assez loin, ou les contourner', maxY: 13 }, (c) => {
  c.section(8, (s) => {
    s.ground(0, 8);
    s.spawn(2);
    s.hint(5, 4.3, 'hint.blackhole');
  });
  // Deux trous noirs sous deux sauts
  c.section(30, (s) => {
    s.ground(0, 4);
    s.add('magnets', { x: 6.6, y: -1.6, radius: 3.6, strength: 24, core: 0.7 });
    pad(s, 9, 1.6, 3);
    s.add('magnets', { x: 15.6, y: -1.6, radius: 4.2, strength: 26, core: 0.7 });
    s.ground(21, 30);
    s.star(6.6, 5.4);
    s.star(15.6, 6);
    s.pass('Le premier trou noir', [-6, 0], ['on', 9, 12, 1.6], [['goTo', 3.4], ['hop', 4, 10.4, 1.6]]);
    s.pass('Le deuxième trou noir', [10.4, 1.6], ['on', 21.2, 30, 0], [['settle'], ['goTo', 11.4], ['hop', 4, 22.6], ['goTo', 24]]);
  });
  // Le trou noir suspendu : il faut sauter bas pour passer dessous
  c.section(26, (s) => {
    s.ground(0, 6);
    s.add('magnets', { x: 12, y: 7, radius: 3.4, strength: 22, core: 0.7 });
    pad(s, 10.8, 1.2, 2.4);
    s.ground(18, 26);
    s.checkpoint(1, 0);
    s.star(12, 2.8);
    s.pass('Sous le trou noir', [-2, 0], ['on', 10.8, 13.2, 1.2], [['goTo', 5.2], ['hop', 1, 12, 1.2]]);
    s.pass('Vers l’autre rive', [12, 1.2], ['on', 18.2, 26, 0], [['settle'], ['hop', 1, 19.6], ['goTo', 20]]);
  });
  // Le grand trou noir : un plot au milieu, juste au-dessus
  c.section(26, (s) => {
    s.ground(0, 4);
    pad(s, 10.4, 3.2, 2.4);
    s.add('magnets', { x: 11.6, y: -2, radius: 4.4, strength: 22, core: 0.8 });
    s.ground(19, 26);
    s.checkpoint(1, 0);
    s.star(11.6, 5.8);
    s.pass('Le plot du grand trou noir', [-6, 0], ['on', 10.4, 12.8, 3.2], [['goTo', 3.4], ['hop', 5, 11.6, 3.2]]);
    s.pass('Quitter le grand trou noir', [11.6, 3.2], ['on', 19.2, 26, 0], [['settle'], ['hop', 3, 20.6], ['goTo', 21]]);
  });
  // Les plateformes flottantes entre deux trous noirs
  c.section(30, (s) => {
    s.ground(0, 3);
    const m = s.add('movers', float(6, 1.4, 2.6, 0.8, 3.6), float(12, 2.8, 2.6, 0.8, 3.6, 0.5), float(18, 1.6, 2.6, 0.8, 3.6, 0.25));
    s.add('magnets', { x: 10.4, y: -1.4, radius: 3.6, strength: 22, core: 0.7 }, { x: 16.4, y: -1.4, radius: 3.6, strength: 22, core: 0.7 });
    s.ground(24, 30);
    s.checkpoint(1, 0);
    s.star(13.3, 5.6);
    s.pass('Plateformes et trous noirs', [-5, 0], ['on', 24.2, 30, 0], [['goTo', 2.2], ['hopTo', 2, 'movers', m, 1.3], ['hopTo', 2, 'movers', m + 1, 1.3], ['hopTo', 2, 'movers', m + 2, 1.3], ['hop', 2, 25.6], ['goTo', 26]]);
  });
  c.section(16, (s) => {
    s.ground(0, 16);
    s.hoop(10, 3.4);
    s.pass('Le panier', [-2, 0], ['win'], 'shot');
  });
});

export const SPACE_LEVELS = [L41, L42, L43, L44, L45, P6, P7, P8, P9, P10];
