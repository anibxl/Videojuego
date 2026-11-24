// MONDE 5 — ESPACE : EXPERT, TRÈS LONG (refonte de la campagne). 90 à 120 s par niveau pour un joueur.
// Gravité réduite (worlds.js : on retombe lentement, les rebonds montent 25 % plus haut), plateformes
// flottantes, astéroïdes, portails à double sens, zones de gravité inversée, trous noirs, pistons et
// lasers de la station. Les derniers niveaux combinent presque toutes les mécaniques du jeu.
//
// 41 Premiers pas lunaires  sauts lunaires, plateformes flottantes, le premier trou noir (découverte)
// 42 La ceinture            astéroïdes : entre eux, par-dessus, en dessous (rythme)
// 43 Les portails           portails à double sens : l'aller-retour vers l'interrupteur (★ puzzle)
// 44 La tête en bas         gravité inversée : rouler au plafond, sauter vers le sol (★ mémorable)
// 45 Les trous noirs        ils attirent : sauter assez haut, ou assez loin (précision)
// 46 La station farceuse    NIVEAU TROLL : pistons et lasers, sas, fausse arrivée (rapide)
// 47 Le laboratoire         caisse, interrupteurs, portails (puzzle)
// 48 Le monde à l'envers    zones inversées et astéroïdes (technique)
// 49 Le grand vide          plateformes flottantes au-dessus du vide et des trous noirs (précision)
// 50 L'odyssée              tout le jeu en un niveau (★ finale)
//
// Refonte de la campagne : 2 à 3 étapes de la boîte `stage` (plus bas) par niveau, toujours dans un ordre
// différent (murs qui surgissent, dalles fantômes, rafales, marches qui jaillissent, sortie cachée, deux
// leviers, faux sol, leviers sous les pistons, ressort). 46 « La station farceuse » est un NIVEAU TROLL
// (sas qui se referme, fausse arrivée).

import { level } from './kit.js';

const glow = { skin: 'glow' };
/** Plateforme flottante (mobile) de largeur w, qui monte et descend de dy. */
const float = (x, y, w, dy, period, phase = 0) => ({ x, y, w, h: 0.5, style: 'float', path: { dx: 0, dy, period, phase } });
// ─── Étapes de la campagne (monde 5) ──────────────────────────────────────────
// Briques réglées pour la gravité lunaire : chaque niveau de l'espace en enchaîne plusieurs, dans un ordre et
// avec des réglages qui lui sont propres, en plus de ses étapes d'origine. Toutes partent du sol (y = 0) et y
// reviennent ; chacune a son point de contrôle.
const stage = {
  /** Deux murs qui surgissent (grilles rayées au sol), le second plus haut. */
  walls(c, h1 = 2.6, h2 = 3.8) {
    c.section(26, (s) => {
      s.ground(0, 26);
      const a = s.add('traps', { kind: 'rise', x: 8, y: 0, w: 0.8, h: h1, from: { dx: 0, dy: -h1 }, trigger: { x1: 4, x2: 6 }, warn: 0.45 });
      const b = s.add('traps', { kind: 'rise', x: 18, y: 0, w: 0.8, h: h2, from: { dx: 0, dy: -h2 }, trigger: { x1: 14, x2: 15.5 }, warn: 0.45 });
      s.checkpoint(0.8, 0);
      s.star(13, 3);
      s.pass('Premier mur qui surgit', [-2, 0], ['on', 9.5, 13.5, 0], [['goTo', 5], ['waitTrap', a, 'out'], ['goTo', 5.4], ['hop', 4, 11, 0], ['settle']]);
      s.pass('Deuxième mur, plus haut', [11, 0], ['on', 19.5, 26, 0], [['goTo', 14.6], ['waitTrap', b, 'out'], ['goTo', 14.8], ['hop', 5, 22, 0], ['goTo', 23], ['wait', 2]]);
    });
  },
  /** Passerelle de verre qui s'efface au-dessus des pics. */
  vanish(c) {
    c.section(26, (s) => {
      s.ground(0, 26);
      s.add('spikes', { x: 3, y: 0, w: 18, dir: 'up' });
      for (const [x, top] of [[4.6, 0.8], [9, 1.6], [13.4, 2.4], [17.6, 1.2]]) s.add('crumbles', { x, y: top - 0.35, w: 2, h: 0.35, look: 'vanish', delay: 0.8, respawn: 2.5 });
      s.checkpoint(0.8, 0);
      s.star(14.4, 5);
      s.pass('La passerelle qui s’efface', [-2, 0], ['on', 21.3, 26, 0], [['goTo', 1.6], ['hop', 2, 5.6, 0.8], ['jump', 1, 10, 1.6], ['jump', 1, 14.4, 2.4], ['jump', 1, 18.6, 1.2], ['jump', 1, 23, 0], ['goTo', 23.4], ['wait', 2]]);
    });
  },
  /** Coup de vent soudain au-dessus des pics : on l'attend, puis deux piliers. */
  gust(c) {
    c.section(26, (s) => {
      s.ground(0, 26);
      s.add('spikes', { x: 4, y: 0, w: 14, dir: 'up' });
      s.block(6, 0, 2, 2, 'block', glow);
      s.block(11, 0, 2, 2.6, 'block', glow);
      s.add('winds', { x: 2, y: 0, w: 18, h: 10, force: -12, sudden: { warn: 0.8, dur: 1.4, rest: 9 } });
      s.checkpoint(0.6, 0);
      s.star(12, 6);
      s.pass('Laisser passer le souffle', [-2, 0], ['on', 0.3, 4, 0], [['goTo', 2.8], ['wait', 2.7], ['goTo', 2.6]]);
      s.pass('Les piliers dans le souffle', [2.6, 0], ['on', 18.3, 26, 0], [['hop', 3, 7, 2], ['settle'], ['hop', 3, 12, 2.6], ['settle'], ['hop', 3, 20, 0], ['goTo', 21], ['wait', 2]]);
    });
  },
  /** Le mur aux marches : chaque marche atteinte fait sortir la suivante de la paroi (zigzag). */
  popSteps(c) {
    c.section(28, (s) => {
      s.ground(0, 14);
      s.block(7.6, 2.8, 1.4, 6.2);
      s.block(14, 0, 8, 7);
      s.ground(22, 28);
      const a = s.add('traps', { kind: 'pop', x: 12.4, y: 1.6, w: 1.6, h: 0.5, from: { dx: 1.6, dy: 0 }, trigger: { x1: 10, x2: 12.6, y1: -1, y2: 1.4 }, warn: 0.4, speed: 6 });
      const b = s.add('traps', { kind: 'pop', x: 9, y: 3.4, w: 1.4, h: 0.5, from: { dx: -1.4, dy: 0 }, trigger: { x1: 12.3, x2: 14.1, y1: 1.9, y2: 3.4 }, warn: 0.4, speed: 6 });
      const d = s.add('traps', { kind: 'pop', x: 12.4, y: 5.2, w: 1.6, h: 0.5, from: { dx: 1.6, dy: 0 }, trigger: { x1: 8.8, x2: 10.6, y1: 3.7, y2: 5.2 }, warn: 0.4, speed: 6 });
      s.checkpoint(0.8, 0);
      s.star(9.7, 6.6);
      s.pass('Première marche', [-2, 0], ['on', 12.5, 14, 2.1], [['goTo', 11], ['waitTrap', a, 'out'], ['hop', 2, 13.4, 2.1], ['settle']]);
      s.pass('Deuxième marche', [13.2, 2.1], ['on', 9.1, 10.4, 3.9], [['waitTrap', b, 'out'], ['hop', 2, 9.7, 3.9], ['settle']]);
      s.pass('Troisième marche', [9.7, 3.9], ['on', 12.5, 14, 5.7], [['waitTrap', d, 'out'], ['hop', 2, 13.2, 5.7], ['settle']]);
      s.pass('Le haut de la paroi', [13.2, 5.7], ['on', 22.4, 28, 0], [['hop', 2, 15.6, 7], ['goTo', 21.4], ['hold', 1, 22.2], ['goTo', 25], ['wait', 2]]);
    });
  },
  /** Le sas : la porte se referme derrière toi ; un portail caché derrière la caisse mène dehors. */
  hiddenExit(c) {
    c.section(28, (s) => {
      s.ground(0, 28);
      s.block(6, 3.4, 15, 1.2);
      s.block(20, 0, 1, 3.4);
      s.add('traps', { kind: 'close', x: 6.2, y: 0, w: 0.5, h: 3.4, from: { dx: 0, dy: 3.4 }, trigger: { x1: 8, x2: 10 }, warn: 0.35 });
      s.block(12, 0, 1.4, 1);
      s.add('teleporters', { a: { x: 16, y: 0.9 }, b: { x: 24, y: 0.9 }, r: 0.75, hidden: true });
      s.checkpoint(1, 0);
      s.star(16, 2.4);
      s.pass('Dans le sas', [-2, 0], ['on', 8.6, 11, 0], [['goTo', 9.6]]);
      s.pass('Le portail derrière la caisse', [9.6, 0], ['on', 22, 28, 0], [['wait', 2], ['hop', 1, 15, 0], ['hold', 1, 15.6], ['goTo', 25], ['wait', 2]]);
    });
  },
  /** Deux leviers, deux portes : le ressort rouge mène au premier, la borne au second. */
  twoSwitches(c, id) {
    c.section(34, (s) => {
      s.ground(0, 34);
      s.add('trampolines', { x: 3, y: 0, w: 1.6, boost: 1.2 });
      s.block(7, 0, 4, 8, 'block', glow);
      const a = s.add('switches', { x: 8.4, y: 8, w: 1.2, target: `${id}A` });
      s.add('doors', { id: `${id}A`, x: 15, y: 0, w: 0.8, h: 3.2, open: { dx: 0, dy: 3.2 }, duration: 0.8 });
      s.block(15, 3.2, 0.8, 9, 'wall');
      s.block(18, 0, 2, 2, 'block', glow);
      const b = s.add('switches', { x: 18.4, y: 2, w: 1.2, target: `${id}B` });
      s.add('doors', { id: `${id}B`, x: 25, y: 0, w: 0.8, h: 3.2, open: { dx: 0, dy: 3.2 }, duration: 0.8 });
      s.block(25, 3.2, 0.8, 9, 'wall');
      s.checkpoint(0.8, 0);
      s.star(9, 10.6);
      s.pass('Le ressort → premier levier', [-2, 0], ['switch', a], [['goTo', 1.2], ['hold', 1, 3.3], ['fly', 9]]);
      s.pass('Première porte', [9, 8], ['on', 16, 17.6, 0], [['goTo', 10.4], ['hold', 1, 11.2], ['goTo', 14], ['wait', 0.4], ['goTo', 16.6]]);
      s.pass('La borne → second levier', [16.6, 0], ['switch', b], [['wait', 1.5], ['hop', 3, 19, 2]]);
      s.pass('Seconde porte', [19, 2], ['on', 26, 34, 0], [['goTo', 19.6], ['hold', 1, 20.3], ['goTo', 24], ['wait', 0.4], ['goTo', 29], ['wait', 2]]);
    });
  },
  /** Le faux sol : fissuré, il cache des pics ; on saute sur le pilier. */
  fakeFloor(c) {
    c.section(24, (s) => {
      s.ground(0, 4);
      s.ground(4, 14, -1.2);
      s.add('spikes', { x: 4, y: -1.2, w: 10, dir: 'up' });
      s.add('crumbles', { x: 4, y: -0.5, w: 4.2, h: 0.5, look: 'fake', delay: 0.12, respawn: 3 });
      s.block(8.4, -1.2, 2.2, 2.4, 'block', glow);
      s.ground(14, 24);
      s.checkpoint(0.8, 0);
      s.hint(1.5, 4.3, 'hint.fake');
      s.star(6.2, 4);
      s.pass('Le faux sol', [-2, 0], ['on', 8.5, 10.5, 1.2], [['goTo', 3], ['hop', 4, 9.5, 1.2], ['settle']]);
      s.pass('Pilier → la suite', [9.5, 1.2], ['on', 14.5, 24, 0], [['hop', 4, 16.4, 0], ['goTo', 17], ['wait', 2]]);
    });
  },
  /** Deux leviers sous les pistons : chacun ouvre sa porte. */
  pistonSwitches(c, id) {
    c.section(34, (s) => {
      s.ground(0, 34);
      s.add('crushers', { x: 4, w: 2.4, top: 3.2, bottom: 0, period: 2.4, phase: 0 }, { x: 14, w: 2.4, top: 3.2, bottom: 0, period: 2.4, phase: 0 });
      s.add('switches', { x: 4.6, y: 0, w: 1.2, target: `${id}A` }, { x: 14.6, y: 0, w: 1.2, target: `${id}B` });
      s.add('doors', { id: `${id}A`, x: 10, y: 0, w: 0.8, h: 3.2, open: { dx: 0, dy: 3.2 }, duration: 0.8 },
        { id: `${id}B`, x: 20, y: 0, w: 0.8, h: 3.2, open: { dx: 0, dy: 3.2 }, duration: 0.8 });
      s.block(10, 3.2, 0.8, 9, 'wall');
      s.block(20, 3.2, 0.8, 9, 'wall');
      s.checkpoint(0.6, 0);
      s.star(15.2, 1.4);
      s.pass('Le levier sous le premier piston', [-2, 0], ['on', 7, 9.4, 0], [['goTo', 1.6], ['waitCycle', 2.4, 1.8, 1.9], ['run', 1, 7.2, 9.4, 0], ['goTo', 8.4]]);
      s.pass('Le levier sous le second piston', [8.4, 0], ['on', 17, 19.4, 0], [['goTo', 11.6], ['waitCycle', 2.4, 1.8, 1.9], ['run', 1, 17.2, 19.4, 0], ['goTo', 18.4]]);
      s.pass('Les deux portes ouvertes', [18.4, 0], ['on', 22, 34, 0], [['goTo', 26], ['wait', 2]]);
    });
  },
  /** Le ressort rouge envoie sur la falaise ; de là, on s'élance au-dessus des pics. */
  boostSpring(c) {
    c.section(30, (s) => {
      s.ground(0, 30);
      s.add('trampolines', { x: 3, y: 0, w: 1.6, boost: 1.3 });
      s.block(9, 0, 8, 7.4, 'block', glow);
      s.add('spikes', { x: 17, y: 0, w: 4.6, dir: 'up' });
      s.checkpoint(0.8, 0);
      s.hint(0.5, 4.3, 'hint.spring');
      s.star(13, 11);
      s.pass('Le ressort rouge → la falaise', [-2, 0], ['on', 9.3, 17, 7.4], [['goTo', 1.2], ['hold', 1, 3.3], ['fly', 12.5], ['settle']]);
      s.pass('S’élancer au-dessus des pics', [12.5, 7.4], ['on', 22, 30, 0], [['goTo', 10], ['hold', 1, 16.6], ['run', 1, 22.2, 30, 0], ['goTo', 26], ['wait', 2]]);
    });
  },
  /** TROLL — Le sas tentant : le couloir tout droit se referme et son portail renvoie au début ; le bon chemin est sur le toit. */
  trollSas(c) {
    c.section(32, (s) => {
      s.ground(0, 32);
      s.block(8, 2.2, 12, 1.2);
      s.block(19.5, 0, 0.5, 2.2);
      s.add('traps', { kind: 'close', x: 8.2, y: 0, w: 0.5, h: 2.2, from: { dx: 0, dy: 2.2 }, trigger: { x1: 10, x2: 12, y1: -1, y2: 2 }, warn: 0.3 });
      s.add('teleporters', { a: { x: 17.5, y: 0.9 }, b: { x: 1, y: 0.9 }, r: 0.75 });
      s.hint(14, 1.2, 'hint.troll2', 0.7);
      s.hint(5, 4.6, 'hint.exit');
      s.checkpoint(0.8, 0);
      s.star(14, 5.4);
      s.pass('Pas le couloir : le toit', [-2, 0], ['on', 8.2, 19.8, 3.4], [['goTo', 5], ['hop', 3, 9.8, 3.4], ['settle']]);
      s.pass('Descendre du toit', [9.8, 3.4], ['on', 22, 32, 0], [['goTo', 19.4], ['hold', 1, 20.2], ['goTo', 24], ['wait', 2]]);
    });
  },
  /** TROLL — « Arrivée » ? Le sol cède… sur un ressort qui envoie sur la vraie route, tout en haut. */
  trollFakeEnd(c) {
    c.section(30, (s) => {
      s.ground(0, 6);
      s.ground(6, 14, -3);
      s.add('trampolines', { x: 6, y: -3, w: 8, boost: 1.3 });
      s.add('crumbles', { x: 6, y: -0.5, w: 8, h: 0.5, look: 'fake', delay: 0.12, respawn: 999 });
      s.block(14, -3, 8, 9, 'block', glow);
      s.ground(22, 30);
      s.hint(10, 2.4, 'hint.finish');
      s.hint(18, 9.4, 'hint.troll4', 0.8);
      s.checkpoint(0.8, 0);
      s.star(10, 6);
      s.pass('L’arrivée ?', [-2, 0], ['on', 14.3, 22, 6], [['hold', 1, 7], ['fly', 10], ['fly', 17], ['settle']]);
      s.pass('La vraie route', [17, 6], ['on', 22.5, 30, 0], [['goTo', 21.4], ['hold', 1, 22.2], ['goTo', 25], ['wait', 2]]);
    });
  },
};

/** Plot lumineux fixe, dessus à `top`. */
const pad = (s, x, top, w = 2.5) => s.block(x, top - 0.5, w, 0.5, 'block', glow);

// 41 — Premiers pas lunaires
const L41 = level({ id: 'space-01', difficulty: 'medium', number: 1, nameKey: 'lv.space.1', idea: 'gravité réduite : sauts lunaires, plateformes flottantes, premier trou noir', maxY: 12 }, (c) => {
  c.section(8, (s) => {
    s.ground(0, 8);
    s.spawn(2);
    s.hint(5, 4.3, 'hint.space');
  });
  // NOUVEAU — étapes de la campagne (voir `stage`)
  stage.boostSpring(c);
  stage.vanish(c);
  stage.walls(c, 2.4, 3.2);
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
const L42 = level({ id: 'space-02', difficulty: 'hard', number: 2, nameKey: 'lv.space.2', idea: 'astéroïdes : passer entre eux, par-dessus, en dessous', maxY: 12 }, (c) => {
  c.section(8, (s) => {
    s.ground(0, 8);
    s.spawn(2);
    s.hint(5, 4.3, 'hint.asteroids');
  });
  // NOUVEAU — étapes de la campagne (voir `stage`)
  stage.gust(c);
  stage.fakeFloor(c);
  stage.popSteps(c);
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
const L43 = level({ id: 'space-03', difficulty: 'hard', number: 3, nameKey: 'lv.space.3', idea: 'portails à double sens : l’aller-retour vers l’interrupteur', maxY: 12 }, (c) => {
  c.section(8, (s) => {
    s.ground(0, 8);
    s.spawn(2);
    s.hint(5, 4.3, 'hint.portal');
  });
  // NOUVEAU — étapes de la campagne (voir `stage`)
  stage.hiddenExit(c);
  stage.twoSwitches(c, 'p43');
  stage.walls(c, 3, 3.8);
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
const L44 = level({ id: 'space-04', difficulty: 'hard', number: 4, nameKey: 'lv.space.4', idea: 'gravité inversée : le plafond devient le sol', maxY: 12 }, (c) => {
  c.section(8, (s) => {
    s.ground(0, 8);
    s.spawn(2);
    s.hint(5, 4.3, 'hint.inverted');
  });
  // NOUVEAU — étapes de la campagne (voir `stage`)
  stage.vanish(c);
  stage.pistonSwitches(c, 't44');
  stage.boostSpring(c);
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
const L45 = level({ id: 'space-05', difficulty: 'hard', number: 5, nameKey: 'lv.space.5', idea: 'trous noirs : sauter assez haut, assez loin, ou les contourner', maxY: 13 }, (c) => {
  c.section(8, (s) => {
    s.ground(0, 8);
    s.spawn(2);
    s.hint(5, 4.3, 'hint.blackhole');
  });
  // NOUVEAU — étapes de la campagne (voir `stage`)
  stage.fakeFloor(c);
  stage.gust(c);
  stage.hiddenExit(c);
  // Deux trous noirs sous deux sauts
  c.section(30, (s) => {
    s.ground(0, 4);
    s.add('magnets', { x: 6.6, y: -1.6, radius: 3.6, strength: 24, core: 0.7 });
    pad(s, 9, 1.6, 3);
    s.add('magnets', { x: 15.6, y: -1.6, radius: 4.2, strength: 26, core: 0.7 });
    s.ground(21, 30);
    s.star(6.6, 5.4);
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

const laser = (x, y0, y1, phase = 0, period = 3, on = 1.2) => ({ x1: x, y1: y0, x2: x, y2: y1, period, on, phase });

// 46 — La station : pistons et lasers
const L46 = level({ id: 'space-06', difficulty: 'hard', number: 6, nameKey: 'lv.space.6', idea: 'pistons et lasers de la station : le bon tempo', maxY: 12 }, (c) => {
  c.section(8, (s) => {
    s.ground(0, 8);
    s.spawn(2);
    s.hint(5, 4.3, 'hint.crusher');
  });
  // NOUVEAU — étapes de la campagne (voir `stage`)
  stage.trollSas(c);
  stage.trollFakeEnd(c);
  stage.pistonSwitches(c, 's46');
  c.section(18, (s) => {
    s.ground(0, 18);
    s.add('crushers', { x: 7, w: 2.4, top: 3, bottom: 0, period: 2.2, phase: 0 });
    s.star(8.2, 1.2);
    s.pass('Le premier piston', [-6, 0], ['on', 12, 18, 0], [['goTo', 4.4], ['waitCycle', 2.2, 1.6, 1.7], ['run', 1, 12.2, 18, 0]]);
  });
  // Laser, puis piston
  c.section(20, (s) => {
    s.ground(0, 20);
    s.add('lasers', laser(5, 0, 7, 0));
    s.add('crushers', { x: 9.2, w: 2.2, top: 2.8, bottom: 0, period: 2.2, phase: 0.3 });
    s.checkpoint(0.6, 0);
    s.pass('Le laser', [-2, 0], ['on', 6.6, 8.6, 0], [['goTo', 2.6], ['waitCycle', 3, 0.63, 0.73], ['run', 1, 6.8, 8.6, 0], ['goTo', 7.8]]);
    s.pass('Le piston derrière', [7.8, 0], ['on', 14, 20, 0], [['goTo', 7.8], ['waitCycle', 2.2, 1.25, 1.35], ['run', 1, 14.2, 20, 0]]);
  });
  // Le couloir des pistons : trois pistons en vague, on court derrière la vague
  c.section(26, (s) => {
    s.ground(0, 26);
    s.add('crushers', { x: 5, w: 2.2, top: 3, bottom: 0, period: 2.4, phase: 0 }, { x: 10, w: 2.2, top: 3, bottom: 0, period: 2.4, phase: 0.85 }, { x: 15, w: 2.2, top: 3, bottom: 0, period: 2.4, phase: 0.7 });
    s.checkpoint(0.6, 0);
    s.star(12.6, 1.2);
    s.pass('Le couloir des pistons', [-3, 0], ['on', 20, 26, 0], [['goTo', 2.4], ['waitCycle', 2.4, 1.5, 1.6], ['run', 1, 20.2, 26, 0]]);
  });
  // Les lasers croisés : deux lasers, un refuge entre les deux, puis un piston
  c.section(28, (s) => {
    s.ground(0, 28);
    s.add('lasers', laser(5, 0, 12, 0, 2.6, 1.2), laser(12, 0, 12, 0.5, 2.6, 1.2));
    s.add('crushers', { x: 17.4, w: 2.4, top: 3, bottom: 0, period: 2.6, phase: 0.25 });
    s.checkpoint(0.6, 0);
    s.pass('Les lasers croisés', [-3, 0], ['on', 14, 16.6, 0], [['goTo', 2.6], ['waitCycle', 2.6, 0.0, 0.1], ['goTo', 8.5], ['waitCycle', 2.6, 1.3, 1.4], ['run', 1, 14.2, 16.6, 0], ['goTo', 15.4]]);
    s.pass('Le dernier piston', [15.4, 0], ['on', 22, 28, 0], [['goTo', 15.4], ['waitCycle', 2.6, 1.6, 1.7], ['run', 1, 22.2, 28, 0]]);
  });
  // Le quai : trois plateformes flottantes, de plus en plus mobiles
  c.section(28, (s) => {
    s.ground(0, 3);
    const m = s.add('movers', float(6, 1.2, 2.6, 0.6, 3.4), float(11.6, 2.4, 2.6, 1.0, 3.6, 0.4), float(17.2, 1.4, 2.6, 1.4, 3.2, 0.7));
    s.ground(22, 28);
    s.checkpoint(1, 0);
    s.star(12.9, 5);
    s.pass('Le quai flottant', [-3, 0], ['on', 22.2, 28, 0], [['goTo', 2.2], ['hopTo', 2, 'movers', m, 1.3], ['hopTo', 2, 'movers', m + 1, 1.3], ['hopTo', 2, 'movers', m + 2, 1.3], ['hop', 2, 23.6], ['goTo', 24]]);
  });
  c.section(16, (s) => {
    s.ground(0, 16);
    s.hoop(10, 3.4);
    s.pass('Le panier', [-2, 0], ['win'], 'shot');
  });
});

// 47 — Le laboratoire : caisse, portail, deux leviers
const L47 = level({ id: 'space-07', difficulty: 'hard', number: 7, nameKey: 'lv.space.7', idea: 'puzzle : la caisse mène au portail, le portail mène au levier', maxY: 13 }, (c) => {
  c.section(8, (s) => {
    s.ground(0, 8);
    s.spawn(2);
    s.hint(5, 4.3, 'hint.lab');
  });
  // NOUVEAU — étapes de la campagne (voir `stage`)
  stage.twoSwitches(c, 'l47');
  stage.popSteps(c);
  stage.vanish(c);
  // La soute : la caisse sert de marche vers l'étagère du portail
  c.section(24, (s) => {
    s.ground(0, 24);
    const k = s.add('crates', { x: 4, y: 0, w: 1.6, h: 1.6 });
    s.block(13, 0, 11, 3.6, 'block', glow);
    s.star(16, 6);
    s.pass('Pousser la caisse', [-6, 0], ['crate', k, 11.3], [['goTo', 2.6], ['hold', 1, 10.95]]);
    s.pass('Caisse → étagère', [11, 0], ['on', 13.3, 16, 3.6], [['goTo', 9], ['hop', 2, 12.2, 1.6], ['settle'], ['hop', 2, 14.4, 3.6]]);
  });
  // La salle scellée : le portail de l'étagère y mène ; on revient par le même
  c.section(26, (s) => {
    s.ground(0, 6, 3.6, 'block');
    s.ground(6, 26);
    s.block(10, 6, 7, 0.4, 'block', glow);
    s.block(10, 9.8, 7, 0.4, 'block', glow);
    s.block(10, 6.4, 0.4, 3.4, 'wall');
    s.block(16.6, 6.4, 0.4, 3.4, 'wall');
    const sw = s.add('switches', { x: 13.8, y: 6.4, w: 1.2, target: 'labA' });
    s.add('teleporters', { a: { x: 3.4, y: 4.5 }, b: { x: 11.6, y: 7.4 }, r: 0.8, twoWay: true });
    s.add('doors', { id: 'labA', x: 21, y: 0, w: 0.8, h: 3.4, open: { dx: 0, dy: 3.4 }, duration: 0.8 });
    s.block(21, 3.4, 0.8, 9.6, 'wall');
    s.checkpoint(1, 3.6);
    s.pass('Le portail de l’étagère', [-8, 3.6], ['switch', sw], [['goTo', 1.2], ['hold', 1, 3.6], ['settle'], ['goTo', 14.4]]);
    s.pass('Retour par le portail', [14.4, 6.4], ['on', 0, 6, 3.6], [['hold', -1, 11.8], ['settle'], ['goTo', 4.8]]);
    s.pass('Descendre → la porte', [4.8, 3.6], ['on', 22, 26, 0], [['hold', 1, 6.4], ['run', 1, 22.2, 26, 0]]);
  });
  // Le second levier est sur la dernière plateforme flottante
  c.section(26, (s) => {
    s.ground(0, 3);
    const m = s.add('movers', float(6, 1.4, 2.6, 0.8, 3.6), float(11.6, 2.8, 2.6, 0.8, 3.6, 0.5));
    pad(s, 17, 4.2, 3);
    const sw = s.add('switches', { x: 17.9, y: 4.2, w: 1.2, target: 'labB' });
    s.ground(22, 26);
    s.checkpoint(1, 0);
    s.star(12.9, 6.4);
    s.pass('Plateformes flottantes → le second levier', [-3, 0], ['switch', sw], [['goTo', 2.2], ['hopTo', 3, 'movers', m, 1.3], ['hopTo', 2, 'movers', m + 1, 1.3], ['hop', 2, 18.5, 4.2]]);
    s.pass('Vers la rive', [18.5, 4.2], ['on', 22.2, 26, 0], [['settle'], ['hop', 1, 23.4], ['goTo', 23.8]]);
  });
  // Le sas : la porte du second levier, sous un laser
  c.section(20, (s) => {
    s.ground(0, 20);
    s.add('lasers', laser(5, 0, 13, 0, 2.6, 1.0));
    s.add('doors', { id: 'labB', x: 10, y: 0, w: 0.8, h: 3.4, open: { dx: 0, dy: 3.4 }, duration: 0.8 });
    s.block(10, 3.4, 0.8, 9.6, 'wall');
    s.star(7.6, 1.2);
    s.pass('Le sas', [-2, 0], ['on', 13, 20, 0], [['goTo', 2.6], ['waitCycle', 2.6, 0.0, 0.1], ['run', 1, 13.2, 20, 0]]);
  });
  c.section(16, (s) => {
    s.ground(0, 16);
    s.hoop(10, 3.4);
    s.pass('Le panier', [-2, 0], ['win'], 'shot');
  });
});

// 48 — Le monde à l'envers : zones inversées, astéroïdes, pics des deux côtés
const L48 = level({ id: 'space-08', difficulty: 'expert', number: 8, nameKey: 'lv.space.8', idea: 'gravité inversée et astéroïdes', maxY: 12 }, (c) => {
  c.section(8, (s) => {
    s.ground(0, 8);
    s.spawn(2);
  });
  // NOUVEAU — étapes de la campagne (voir `stage`)
  stage.walls(c, 2.8, 4);
  stage.hiddenExit(c);
  stage.gust(c);
  // Au plafond, sous les astéroïdes qui montent
  c.section(32, (s) => {
    s.ground(0, 32);
    s.block(3, 6.4, 18, 1, 'block', glow);
    s.add('gravityZones', { x: 3, y: 0, w: 18, h: 6.4 });
    s.add('spikes', { x: 4.6, y: 0, w: 16.4, dir: 'up' });
    s.add('asteroids', { x: 9, y: 0.8, r: 0.7, path: { dx: 0, dy: 4.8, period: 3.2, phase: 0 } }, { x: 15, y: 0.8, r: 0.7, path: { dx: 0, dy: 4.8, period: 3.2, phase: 0.5 } });
    s.star(12, 5.6);
    s.pass('Les astéroïdes du plafond', [-6, 0], ['on', 22, 32, 0], [['goTo', 0.8], ['waitCycle', 3.2, 0.0, 0.1], ['run', 1, 22.2, 32, 0], ['goTo', 28]]);
  });
  // Pics au plafond et pics au sol : deux sauts vers le bas
  c.section(34, (s) => {
    s.ground(0, 34);
    s.block(3, 6.4, 20, 1, 'block', glow);
    s.add('gravityZones', { x: 3, y: 0, w: 20, h: 6.4 });
    s.add('spikes', { x: 4.6, y: 0, w: 18.4, dir: 'up' }, { x: 9.4, y: 6.4, w: 1.8, dir: 'down' }, { x: 16.4, y: 6.4, w: 1.8, dir: 'down' });
    s.checkpoint(0.8, 0);
    s.pass('Les pics du plafond', [-6, 0], ['on', 24, 34, 0], [['goTo', 0.8], ['jumpAt', 1, 7.6], ['jumpAt', 1, 14.6], ['run', 1, 24.2, 34, 0], ['goTo', 30]]);
  });
  // Le pont invisible sous les lasers
  c.section(34, (s) => {
    s.ground(0, 4);
    s.block(4, 6.4, 18, 1, 'block', glow);
    s.add('gravityZones', { x: 4, y: -3, w: 18, h: 9.4 });
    s.add('lasers', laser(10, 3.6, 6.4, 0, 3, 1.2), laser(16, 3.6, 6.4, 0.4, 3, 1.2));
    s.ground(22, 34);
    s.checkpoint(1, 0);
    s.star(13, 5.6);
    s.pass('Le pont invisible sous les lasers', [-6, 0], ['on', 23, 34, 0], [['goTo', 1], ['waitCycle', 3, 0.2, 0.3], ['run', 1, 23.2, 34, 0], ['goTo', 28]]);
  });
  // Deux plafonds presque collés : on passe de l'un à l'autre sans toucher les pics
  c.section(36, (s) => {
    s.ground(0, 36);
    s.block(3, 6.4, 8, 1, 'block', glow);
    s.block(12, 6.4, 12, 1, 'block', glow);
    s.add('gravityZones', { x: 3, y: 0, w: 8, h: 6.4 }, { x: 12, y: 0, w: 12, h: 6.4 });
    s.add('spikes', { x: 4.6, y: 0, w: 19.4, dir: 'up' }, { x: 18.6, y: 6.4, w: 1.8, dir: 'down' });
    s.checkpoint(0.8, 0);
    s.star(11.5, 3.6);
    s.pass('D’un plafond à l’autre', [-6, 0], ['on', 26, 36, 0], [['goTo', 0.8], ['jumpAt', 1, 16.8], ['run', 1, 26.2, 36, 0], ['goTo', 31]]);
  });
  c.section(16, (s) => {
    s.ground(0, 16);
    s.hoop(10, 3.4);
    s.pass('Le panier', [-2, 0], ['win'], 'shot');
  });
});

// 49 — Le grand vide : plateformes au-dessus du vide et des trous noirs
const L49 = level({ id: 'space-09', difficulty: 'expert', number: 9, nameKey: 'lv.space.9', idea: 'plateformes flottantes, astéroïdes et trous noirs au-dessus du vide', maxY: 13 }, (c) => {
  c.section(8, (s) => {
    s.ground(0, 8);
    s.spawn(2);
  });
  // NOUVEAU — étapes de la campagne (voir `stage`)
  stage.popSteps(c);
  stage.boostSpring(c);
  stage.fakeFloor(c);
  // Cinq plateformes flottantes, un trou noir dessous
  c.section(32, (s) => {
    s.ground(0, 3);
    const m = s.add('movers', float(5, 1.1, 2.4, 0.6, 3.4), float(10, 2.9, 2.4, 0.8, 3.8, 0.3), float(15, 1.7, 2.4, 0.6, 3.2, 0.6), float(20, 3.5, 2.4, 0.6, 3.6, 0.1), float(25, 2.1, 2.4, 0.8, 3.8, 0.45));
    s.add('magnets', { x: 16, y: -2, radius: 4, strength: 20, core: 0.8 });
    s.ground(29.4, 32);
    s.star(16.2, 5);
    s.pass('Cinq plateformes', [-6, 0], ['on', 29.6, 32, 0], [['goTo', 2.2], ['hopTo', 2, 'movers', m, 1.2], ['hopTo', 2, 'movers', m + 1, 1.2], ['hopTo', 1, 'movers', m + 2, 1.2], ['hopTo', 2, 'movers', m + 3, 1.2], ['hopTo', 1, 'movers', m + 4, 1.2], ['hop', 2, 30.6], ['goTo', 30.8]]);
  });
  // Les plots et les astéroïdes, au-dessus du vide
  c.section(28, (s) => {
    s.ground(0, 2);
    pad(s, 5, 2);
    s.add('asteroids', { x: 9.2, y: 5.5, r: 0.7, path: { dx: 0, dy: -4, period: 3.6, phase: 0 } });
    pad(s, 11, 3.4);
    s.add('asteroids', { x: 15.2, y: 6, r: 0.7, path: { dx: 0, dy: -4.4, period: 4, phase: 0.5 } });
    pad(s, 17, 2.2);
    s.add('magnets', { x: 21, y: -2, radius: 3.6, strength: 20, core: 0.8 });
    s.ground(24, 28);
    s.checkpoint(1, 0);
    s.pass('Premier plot', [-2, 0], ['on', 5, 7.5, 2], [['goTo', 1.2], ['hop', 2, 6.25, 2]]);
    s.pass('Entre les astéroïdes (1)', [6.25, 2], ['on', 11, 13.5, 3.4], [['settle'], ['waitCycle', 3.6, 0.65, 0.75], ['hop', 2, 12.25, 3.4]]);
    s.pass('Entre les astéroïdes (2)', [12.25, 3.4], ['on', 17, 19.5, 2.2], [['settle'], ['waitCycle', 4, 2.35, 2.45], ['hop', 2, 18.25, 2.2]]);
    s.pass('Au-dessus du trou noir', [18.25, 2.2], ['on', 24.2, 28, 0], [['settle'], ['hop', 3, 25.4], ['goTo', 25.8]]);
  });
  // Les plateformes qui clignotent au-dessus du vide
  c.section(28, (s) => {
    s.ground(0, 3);
    s.add('blinkers', { x: 5.6, y: 1, w: 2.6, h: 0.5, period: 3.2, on: 2.0, phase: 0 }, { x: 11.4, y: 2.2, w: 2.6, h: 0.5, period: 3.2, on: 2.0, phase: 0.6 }, { x: 17.2, y: 1, w: 2.6, h: 0.5, period: 3.2, on: 2.0, phase: 0.2 });
    s.add('magnets', { x: 14, y: -2.4, radius: 3.6, strength: 18, core: 0.8 });
    s.ground(23, 28);
    s.checkpoint(1, 0);
    s.star(12.7, 5);
    s.pass('Les plateformes qui clignotent', [-2, 0], ['on', 23.2, 28, 0], [['goTo', 2.2], ['waitCycle', 3.2, 0.0, 0.1], ['hop', 2, 6.9, 1.5], ['jump', 1, 12.7, 2.7], ['jump', 1, 18.5, 1.5], ['jump', 1, 24.6, 0], ['goTo', 25]]);
  });
  // Le dernier saut : au-dessus du plus grand trou noir
  c.section(26, (s) => {
    s.ground(0, 4);
    s.add('magnets', { x: 9, y: -1.8, radius: 3.4, strength: 18, core: 0.8 });
    s.ground(13.4, 26);
    s.checkpoint(1, 0);
    s.star(9, 7);
    s.pass('Le dernier saut', [-3, 0], ['on', 13.6, 26, 0], [['goTo', 3.4], ['hop', 5, 15.6], ['goTo', 17]]);
  });
  c.section(16, (s) => {
    s.ground(0, 16);
    s.hoop(10, 3.4);
    s.pass('Le panier', [-2, 0], ['win'], 'shot');
  });
});

// 50 — L'odyssée : plateformes flottantes, portail, plafond inversé, pluie d'astéroïdes, trou noir,
// pistons, levier et porte, puis le dernier panier du jeu.
const L50 = level({ id: 'space-10', difficulty: 'expert', number: 10, nameKey: 'lv.space.10', idea: 'finale : tout le jeu', maxY: 13 }, (c) => {
  c.section(8, (s) => {
    s.ground(0, 8);
    s.spawn(2);
  });
  // NOUVEAU — étapes de la campagne (voir `stage`)
  stage.walls(c, 3, 4);
  stage.twoSwitches(c, 'o50');
  c.section(26, (s) => {
    s.ground(0, 3);
    const m = s.add('movers', float(6, 1.5, 2.6, 0.6, 3.4), float(11, 3.0, 2.6, 0.6, 3.8, 0.3), float(16, 2.0, 2.6, 0.6, 3.2, 0.6));
    s.ground(21, 26);
    s.star(12.3, 5.4);
    s.pass('Les plateformes flottantes', [-6, 0], ['on', 21.2, 26, 0], [['goTo', 2.2], ['hopTo', 2, 'movers', m, 1.3], ['hopTo', 2, 'movers', m + 1, 1.3], ['hopTo', 1, 'movers', m + 2, 1.3], ['hop', 2, 22.6], ['goTo', 23]]);
  });
  // Le portail à travers la cloison, puis le plafond au-dessus des pics
  c.section(36, (s) => {
    s.ground(0, 36);
    s.block(5, 0, 1.2, 16, 'wall');
    s.add('teleporters', { a: { x: 3, y: 0.9 }, b: { x: 8, y: 0.9 }, r: 0.8, twoWay: true });
    s.block(11, 6.4, 14, 1, 'block', glow);
    s.add('gravityZones', { x: 11, y: 0, w: 14, h: 6.4 });
    s.add('spikes', { x: 12.6, y: 0, w: 12.4, dir: 'up' }, { x: 17.6, y: 6.4, w: 1.8, dir: 'down' });
    s.checkpoint(-3, 0);
    s.pass('Le portail', [-3, 0], ['on', 7, 10, 0], [['goTo', 1.2], ['hold', 1, 3.2], ['settle'], ['goTo', 8.6]]);
    s.pass('Le plafond aux pics', [8.6, 0], ['on', 26, 36, 0], [['goTo', 8.6], ['wait', 2], ['jumpAt', 1, 15.8], ['run', 1, 26.2, 36, 0], ['goTo', 31]]);
  });
  // La pluie d'astéroïdes, puis le trou noir
  c.section(36, (s) => {
    s.ground(0, 20);
    s.add('asteroids', { x: 5, y: 7, r: 0.7, path: { dx: 0, dy: -6.2, period: 3.2, phase: 0 } }, { x: 9, y: 7, r: 0.7, path: { dx: 0, dy: -6.2, period: 3.2, phase: 0.25 } }, { x: 13, y: 7, r: 0.7, path: { dx: 0, dy: -6.2, period: 3.2, phase: 0.5 } });
    s.add('magnets', { x: 25.4, y: -1.8, radius: 3.4, strength: 18, core: 0.8 });
    s.ground(29.6, 36);
    s.checkpoint(0.6, 0);
    s.star(25.4, 7);
    s.pass('La pluie d’astéroïdes', [-5, 0], ['on', 16.5, 20, 0], [['goTo', 1.4], ['waitCycle', 3.2, 0.0, 0.1], ['run', 1, 16.6, 20, 0], ['goTo', 19.4]]);
    s.pass('Le trou noir', [19.4, 0], ['on', 29.8, 36, 0], [['hop', 5, 31.8], ['goTo', 32.4]]);
  });
  // Le levier et les pistons
  c.section(30, (s) => {
    s.ground(0, 30);
    s.block(2, 0, 4, 3.2, 'block', glow);
    const sw = s.add('switches', { x: 3.4, y: 3.2, w: 1.2, target: 'odyssey' });
    s.add('crushers', { x: 10, w: 2.4, top: 3, bottom: 0, period: 2.2, phase: 0 }, { x: 16, w: 2.4, top: 3, bottom: 0, period: 2.2, phase: 0.5 });
    s.add('doors', { id: 'odyssey', x: 25, y: 0, w: 0.8, h: 3.4, open: { dx: 0, dy: 3.4 }, duration: 0.8 });
    s.block(25, 3.4, 0.8, 9.6, 'wall');
    s.checkpoint(0.6, 0);
    s.star(14.2, 1.2);
    s.pass('Le levier', [-2, 0], ['switch', sw], [['goTo', 0.4], ['hop', 3, 4, 3.2]]);
    s.pass('Les pistons', [4, 3.2], ['on', 26, 30, 0], [['hold', 1, 6.4], ['goTo', 7.6], ['waitCycle', 2.2, 1.6, 1.7], ['goTo', 14.2], ['waitCycle', 2.2, 0.5, 0.6], ['run', 1, 26.2, 30, 0]]);
  });
  c.section(16, (s) => {
    s.ground(0, 16);
    s.hoop(10, 3.4);
    s.pass('Le dernier panier', [-2, 0], ['win'], 'shot');
  });
});

export const SPACE_LEVELS = [L41, L42, L43, L44, L45, L46, L47, L48, L49, L50];
