// Tests des commandes (dribble, puissance), de la physique ressentie et des éléments de jeu.
// Ils utilisent un terrain d'essai (tests/fixtures/test-yard.js), indépendant des vrais niveaux.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { CONFIG } from '../src/config.js';
import { Game } from '../src/game/game.js';
import { TEST_YARD } from './fixtures/test-yard.js';

const DT = CONFIG.physics.fixedDt;
const R = CONFIG.ball.radius;
const C = CONFIG.controls;
const H = C.bounceHeights;

/** Partie avec le ballon posé en (x, surface). */
function gameAt(x, surfaceY = 0) {
  const game = new Game(CONFIG, { ...TEST_YARD, spawn: { x, y: surfaceY } });
  run(game, 0.3);
  return game;
}

function run(game, seconds, onStep) {
  const n = Math.round(seconds / DT);
  for (let i = 0; i < n; i++) {
    game.fixedUpdate(DT);
    onStep?.(game);
  }
}

/** Avance tant que `cond` est vrai (10 s de jeu maximum, sinon le test échoue au lieu de bloquer). */
function stepWhile(game, cond) {
  let n = 0;
  while (cond(game)) {
    game.fixedUpdate(DT);
    if (++n > 1200) throw new Error('condition jamais atteinte');
  }
}

function untilApex(game) {
  let guard = 0;
  do game.fixedUpdate(DT);
  while (game.body.vy > 0 && ++guard < 2000);
  return game.body.y;
}

function untilLanding(game) {
  let guard = 0;
  do game.fixedUpdate(DT);
  while (!game.body.grounded && ++guard < 2000);
}

// ─── Rebond et puissance ────────────────────────────────────────────────────

test('au sol, un appui fait rebondir tout de suite, à la hauteur du niveau 1', () => {
  const g = gameAt(3);
  const y0 = g.body.y;
  g.controller.pressBounce();
  g.fixedUpdate(DT);
  assert.ok(g.body.vy > 0, 'le rebond part au pas suivant (8 ms)');
  const apex = untilApex(g);
  assert.ok(Math.abs(apex - y0 - H[0]) < 0.08, `hauteur ${(apex - y0).toFixed(2)} attendu≈${H[0]}`);
});

test('en rythme (un appui par retombée), la puissance monte niveau par niveau', () => {
  const g = gameAt(3);
  const y0 = g.body.y;
  const levels = [];
  g.events.on('bounce', (e) => levels.push(e.level));
  for (let i = 0; i < H.length + 1; i++) {
    g.controller.pressBounce();
    const apex = untilApex(g);
    const expected = H[Math.min(i, H.length - 1)];
    assert.ok(Math.abs(apex - y0 - expected) < 0.1, `rebond ${i + 1} : ${(apex - y0).toFixed(2)} attendu≈${expected}`);
    untilLanding(g);
  }
  assert.deepEqual(levels, [1, 2, 3, 4, 5, 5]);
});

test('en l\'air, un appui renvoie le ballon vers le sol (dribble), puis il rebondit au contact', () => {
  const g = gameAt(3);
  let slams = 0;
  let bounces = 0;
  g.events.on('slam', () => slams++);
  g.events.on('bounce', () => bounces++);
  g.controller.pressBounce();
  run(g, 0.15); // en pleine montée
  g.controller.pressBounce();
  g.fixedUpdate(DT);
  assert.equal(slams, 1);
  assert.ok(g.body.vy <= -C.slamSpeed + 1e-9, `renvoyé vers le sol : vy=${g.body.vy}`);
  run(g, 0.4);
  assert.equal(bounces, 2, 'rebond déclenché au contact');
});

test('taper vite charge la puissance en moins d\'une seconde', () => {
  const g = gameAt(3);
  const t0 = g.controller.time;
  let i = 0;
  while (g.controller.level < 5 && i++ < 200) {
    g.controller.pressBounce();
    run(g, 0.12);
  }
  const dt = g.controller.time - t0;
  assert.equal(g.controller.level, 5);
  assert.ok(dt < 1.0, `puissance max en ${dt.toFixed(2)} s`);
});

test('plusieurs appuis pendant la même chute ne donnent qu\'un seul rebond', () => {
  const g = gameAt(3);
  let bounces = 0;
  g.events.on('bounce', () => bounces++);
  g.controller.pressBounce();
  untilApex(g);
  g.controller.pressBounce();
  g.fixedUpdate(DT);
  g.controller.pressBounce();
  g.fixedUpdate(DT);
  run(g, 0.3);
  assert.equal(bounces, 2);
});

test('la puissance ne redescend pas tant que le ballon est en l\'air', () => {
  const g = gameAt(3);
  for (let i = 0; i < 4; i++) {
    g.controller.pressBounce();
    untilApex(g);
    untilLanding(g);
  }
  assert.equal(g.controller.level, 5);
  g.controller.pressBounce(); // grand rebond : ~1 s en l'air
  run(g, 0.9);
  assert.equal(g.controller.level, 5);
});

test('quand le ballon reste au sol, la puissance revient progressivement au niveau 1', () => {
  const g = gameAt(3);
  for (let i = 0; i < 3; i++) {
    g.controller.pressBounce();
    untilApex(g);
    untilLanding(g);
  }
  assert.equal(g.controller.level, 4);
  // Le ballon retombe, fait quelques petits rebonds naturels puis se pose
  let firstDrop = null;
  run(g, 4, (gg) => {
    if (firstDrop === null && gg.controller.level < 4) firstDrop = gg.controller.time;
  });
  assert.ok(firstDrop !== null, 'la puissance a baissé');
  assert.equal(g.controller.level, 1, 'retour au niveau de départ');
});

// ─── Déplacement ────────────────────────────────────────────────────────────

test('déplacement : réponse vive, puis le ballon garde un peu son élan', () => {
  const g = gameAt(56);
  g.controller.right = true;
  run(g, 0.1);
  assert.ok(g.body.vx > 2, `réagit tout de suite : ${g.body.vx.toFixed(2)}`);
  run(g, 0.25);
  assert.ok(g.body.vx > C.maxSpeed * 0.97, `vitesse max en 0,35 s : ${g.body.vx.toFixed(2)}`);
  g.controller.right = false;
  run(g, 0.3);
  assert.ok(g.body.vx > 4.5, `inertie : ${g.body.vx.toFixed(2)}`);
  run(g, 2.5);
  assert.ok(Math.abs(g.body.vx) < 0.05, 'finit par s\'arrêter');
});

test('appuyer dans l\'autre sens freine franchement', () => {
  const g = gameAt(56);
  g.controller.right = true;
  run(g, 0.6);
  g.controller.right = false;
  g.controller.left = true;
  run(g, 0.2);
  assert.ok(g.body.vx < 0, `demi-tour en 0,2 s : ${g.body.vx.toFixed(2)}`);
});

test('au sol, le ballon roule sans glisser', () => {
  const g = gameAt(56);
  g.controller.right = true;
  run(g, 0.4);
  assert.ok(Math.abs(g.body.vx + g.body.angularVelocity * R) < 1e-6);
});

// ─── Éléments ───────────────────────────────────────────────────────────────

test('le trampoline propulse au-dessus des pics', () => {
  const g = gameAt(7.5);
  let tramp = 0;
  let deaths = 0;
  g.events.on('trampoline', () => tramp++);
  g.events.on('death', () => deaths++);
  g.controller.right = true;
  run(g, 2.2);
  assert.ok(tramp >= 1);
  assert.equal(deaths, 0);
  assert.ok(g.body.x > 16.2, `x=${g.body.x.toFixed(2)}`);
});

test('les pics font recommencer au départ du niveau', () => {
  const g = gameAt(12.2);
  let deaths = 0;
  g.events.on('death', () => deaths++);
  g.controller.right = true;
  run(g, 1);
  assert.equal(deaths, 1);
  run(g, CONFIG.feel.deathDelay + 0.1);
  assert.equal(g.state, 'playing');
  assert.ok(Math.abs(g.body.x - 12.2) < 0.3, `réapparu au départ : x=${g.body.x.toFixed(2)}`);
});

test('le ventilateur fait flotter le ballon jusqu\'à la corniche', () => {
  const g = gameAt(16.8);
  let maxY = 0;
  g.controller.right = true;
  stepWhile(g, (gg) => gg.body.x < 18.6);
  g.controller.right = false;
  g.controller.left = true;
  stepWhile(g, (gg) => gg.body.vx > 0.5);
  g.controller.left = false;
  run(g, 2.5, (gg) => (maxY = Math.max(maxY, gg.body.y)));
  assert.ok(maxY > 4.5, `hauteur ${maxY.toFixed(2)}`);
  g.controller.right = true;
  run(g, 0.7);
  g.controller.right = false;
  run(g, 1.3);
  assert.ok(g.body.grounded && Math.abs(g.body.y - (3.8 + R)) < 0.1, `sur la corniche : y=${g.body.y.toFixed(2)}`);
});

test('l\'interrupteur ouvre la porte ; fermée elle bloque, ouverte on passe', () => {
  const g = gameAt(37);
  g.controller.right = true;
  run(g, 1.5);
  assert.ok(g.body.x < 40, 'bloqué');
  const sw = new Game(CONFIG, { ...TEST_YARD, spawn: { x: 25.6, y: 3.8 + 0.14 } });
  run(sw, 0.4);
  assert.equal(sw.level.switches[0].pressed, true);
  run(sw, 1);
  assert.ok(sw.level.doors[0].isOpen);
  g.level.doors[0].open();
  run(g, 2);
  assert.ok(g.body.x > 41, `passé : x=${g.body.x.toFixed(2)}`);
});

test('le téléporteur fait passer le grand mur en gardant la vitesse', () => {
  const g = gameAt(42);
  let tp = null;
  g.events.on('teleport', (e) => (tp = e));
  g.controller.right = true;
  run(g, 1.5);
  assert.ok(tp);
  assert.ok(tp.vx > 3);
  assert.ok(g.body.x > 50);
});

test('la plateforme mobile transporte le ballon', () => {
  const m = TEST_YARD.movers[0];
  const g = gameAt(m.x + m.w / 2, m.y + m.h);
  run(g, m.path.period / 2);
  const mover = g.level.movers[0].mover;
  assert.ok(g.body.grounded);
  assert.ok(Math.abs(g.body.x - (m.x + m.w / 2 + mover.offsetX)) < 0.3);
});

test('tomber dans le vide fait recommencer', () => {
  const g = gameAt(28);
  let cause = null;
  g.events.on('death', (e) => (cause = e.cause));
  stepWhile(g, (gg) => gg.level.movers[0].mover.offsetX < 2);
  g.controller.right = true;
  run(g, 2);
  assert.equal(cause, 'fall');
});

// ─── Panier ─────────────────────────────────────────────────────────────────

test('le panier n\'est validé qu\'une fois le ballon entièrement passé dans le cercle', () => {
  const g = gameAt(3);
  const h = g.level.hoop;
  g.body.reset(h.centerX, h.rimY + 2);
  let win = null;
  let yAtWin = null;
  g.events.on('win', (e) => {
    win = e;
    yAtWin = g.body.y;
  });
  run(g, 1);
  assert.ok(win);
  assert.ok(yAtWin < h.rimY - R, `ballon entièrement sous le cercle : y=${yAtWin.toFixed(2)}`);
});

test('un ballon qui entre puis ressort par le haut ne compte pas ; il compte s\'il rentre en entier', () => {
  const g = gameAt(3);
  const h = g.level.hoop;
  const x = h.centerX;
  const Y = h.rimY;
  // Le centre franchit le cercle vers le bas…
  assert.equal(h.checkScore(x, Y + 0.1, x, Y - 0.1), false);
  // …puis ressort par le haut (rebond sur le cercle) : rien n'est validé
  assert.equal(h.checkScore(x, Y - 0.1, x, Y + 0.2), false);
  assert.equal(h.checkScore(x, Y + 0.2, x, Y + 0.5), false);
  // Nouvelle entrée, et cette fois le ballon passe entièrement sous le cercle : panier
  assert.equal(h.checkScore(x, Y + 0.1, x, Y - 0.1), false);
  assert.equal(h.checkScore(x, Y - 0.1, x, Y - R * 0.6), false);
  assert.equal(h.checkScore(x, Y - R * 0.6, x, Y - R * 1.2), true);
});

test('pas de panier si le ballon passe par en dessous', () => {
  const g = gameAt(3);
  const h = g.level.hoop;
  g.body.reset(h.centerX, h.rimY - 1.2);
  g.body.vy = 11;
  let win = 0;
  g.events.on('win', () => win++);
  run(g, 2);
  assert.equal(win, 0);
});

test('ramasser une étoile, recommencer remet tout à zéro', () => {
  const g = gameAt(5);
  g.controller.pressBounce();
  run(g, 0.5);
  assert.equal(g.starsCollected, 1);
  g.restart();
  assert.equal(g.starsCollected, 0);
  assert.ok(g.level.stars.every((s) => !s.collected));
});
