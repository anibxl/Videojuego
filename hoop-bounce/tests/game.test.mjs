// Tests des contrôles, de la jauge et des règles du niveau.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { CONFIG } from '../src/config.js';
import { Game } from '../src/game/game.js';
import { DEMO_LEVEL } from '../src/game/levels/demo.js';

const DT = CONFIG.physics.fixedDt;
const R = CONFIG.ball.radius;
const C = CONFIG.controls;
const JUMP = (C.bounceVelocity * C.bounceVelocity) / (2 * CONFIG.physics.gravity);

/** Partie avec le ballon posé à (x, y = surface). */
function gameAt(x, surfaceY = 0, levelPatch = {}) {
  const game = new Game(CONFIG, { ...DEMO_LEVEL, spawn: { x, y: surfaceY }, ...levelPatch });
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

function untilApex(game) {
  let guard = 0;
  do game.fixedUpdate(DT);
  while (game.body.vy > 0 && ++guard < 1000);
  return game.body.y;
}

test('toucher fait rebondir le ballon à la hauteur prévue', () => {
  const g = gameAt(1.5);
  const y0 = g.body.y;
  g.controller.requestBounce();
  const apex = untilApex(g);
  assert.ok(Math.abs(apex - y0 - JUMP) < 0.08, `hauteur ${apex - y0} attendu≈${JUMP}`);
});

test('rebond en l\'air au sommet : on regagne une hauteur de saut', () => {
  const g = gameAt(1.5);
  const y0 = g.body.y;
  g.controller.requestBounce();
  untilApex(g);
  g.controller.requestBounce();
  const apex = untilApex(g);
  assert.ok(Math.abs(apex - y0 - 2 * JUMP) < 0.15, `hauteur ${apex - y0} attendu≈${2 * JUMP}`);
});

test('jauge : un saut + deux rebonds en l\'air, puis refus', () => {
  const g = gameAt(1.5);
  let bounces = 0;
  let denied = 0;
  g.events.on('bounce', () => bounces++);
  g.events.on('bounceDenied', () => denied++);
  for (let i = 0; i < 4; i++) {
    g.controller.requestBounce();
    untilApex(g);
  }
  assert.equal(bounces, C.gaugeSegments);
  assert.equal(denied, 1);
  assert.ok(g.controller.gauge < 1e-6);
});

test('jauge : se recharge progressivement une fois au sol', () => {
  const g = gameAt(1.5);
  g.controller.gauge = 0;
  run(g, 0.1);
  const partial = g.controller.gauge;
  assert.ok(partial > 0.05 && partial < 0.5, `recharge partielle ${partial}`);
  run(g, 1);
  assert.equal(g.controller.gauge, 1);
});

test('jauge : pas de recharge en l\'air', () => {
  const g = gameAt(1.5);
  g.controller.requestBounce();
  run(g, 0.05);
  const after = g.controller.gauge;
  run(g, 0.3);
  assert.equal(g.controller.gauge, after);
});

test('déplacement très réactif au sol, arrêt rapide quand on lâche', () => {
  const g = gameAt(1.5);
  g.controller.setAxis(1);
  run(g, 0.2);
  assert.ok(g.body.vx > C.maxSpeed * 0.95, `vx après 0,2 s : ${g.body.vx}`);
  g.controller.setAxis(-1);
  run(g, 0.2);
  assert.ok(g.body.vx < -C.maxSpeed * 0.6, `demi-tour : ${g.body.vx}`);
  g.controller.setAxis(0);
  run(g, 0.35);
  assert.ok(Math.abs(g.body.vx) < 0.05, `arrêt : ${g.body.vx}`);
});

test('au sol, le ballon roule sans glisser', () => {
  const g = gameAt(1.5);
  g.controller.setAxis(1);
  run(g, 0.4);
  assert.ok(Math.abs(g.body.vx + g.body.angularVelocity * R) < 1e-6);
});

test('plateforme traversable : on passe par en dessous, on se pose dessus', () => {
  // Planche à 3,3 entre x = 3 et 6 : on saute dessous avec deux rebonds
  const g = gameAt(4.5);
  g.controller.requestBounce();
  untilApex(g);
  g.controller.requestBounce();
  run(g, 2.5);
  assert.ok(g.body.grounded);
  assert.ok(Math.abs(g.body.y - (3.3 + R)) < 0.01, `posé à y=${g.body.y}`);
});

test('les piques tuent et on réapparaît au dernier point de contrôle', () => {
  const g = gameAt(4.0, 26.4); // sur la dalle piégée, piques à x = 5,4 → 6,8
  let deaths = 0;
  g.events.on('death', () => deaths++);
  g.checkpoint = { x: 1.3, y: 23.2 };
  g.controller.setAxis(1);
  run(g, 1.0);
  assert.equal(deaths, 1);
  run(g, CONFIG.feel.deathDelay + 0.1);
  assert.equal(g.state, 'playing');
  assert.ok(Math.abs(g.body.x - 1.3) < 0.2 && Math.abs(g.body.y - (23.2 + R)) < 0.2);
});

test('ramasser une étoile', () => {
  const g = gameAt(7.6, 1.2); // sur la marche, étoile à (7,8 ; 3,0)
  let stars = 0;
  g.events.on('star', () => stars++);
  g.controller.requestBounce();
  run(g, 0.6);
  assert.equal(stars, 1);
  assert.equal(g.starsCollected, 1);
});

test('le tremplin propulse sans consommer la jauge', () => {
  const g = gameAt(2.0, 37.6); // à côté du tremplin
  let pads = 0;
  g.events.on('pad', () => pads++);
  g.controller.setAxis(1);
  run(g, 0.25);
  g.controller.setAxis(0);
  let apex = 0;
  run(g, 1.2, (gg) => (apex = Math.max(apex, gg.body.y)));
  assert.ok(pads >= 1);
  assert.ok(apex > 37.6 + 5.5, `apex ${apex}`);
  assert.equal(g.controller.gauge, 1);
});

test('la plateforme mobile entraîne le ballon', () => {
  const m = DEMO_LEVEL.movers[0];
  const g = gameAt(m.x + m.w / 2, m.y + m.h);
  // Laisser la plateforme bouger : le ballon doit rester dessus sans rien faire
  run(g, m.path.period / 2);
  const mover = g.level.movers[0].mover;
  const center = m.x + m.w / 2 + mover.offsetX;
  assert.ok(g.body.grounded, 'toujours posé');
  assert.ok(Math.abs(g.body.x - center) < 0.3, `x=${g.body.x} centre=${center}`);
});

test('marquer le panier termine le niveau', () => {
  const g = gameAt(1.5);
  const h = g.level.hoop;
  g.body.reset(h.centerX, h.rimY + 2);
  let win = null;
  g.events.on('win', (e) => (win = e));
  run(g, 1);
  assert.ok(win, 'victoire');
  assert.equal(g.state, 'won');
  assert.equal(win.stars, 0);
});

test('pas de panier si le ballon passe par en dessous', () => {
  const g = gameAt(1.5);
  const h = g.level.hoop;
  g.body.reset(h.centerX, h.rimY - 1.2);
  g.body.vy = 11;
  let win = 0;
  g.events.on('win', () => win++);
  run(g, 2);
  assert.equal(win, 0);
});

test('recommencer remet tout à zéro', () => {
  const g = gameAt(7.6, 1.2);
  g.controller.requestBounce();
  run(g, 0.6);
  assert.equal(g.starsCollected, 1);
  g.restart();
  assert.equal(g.starsCollected, 0);
  assert.ok(g.level.stars.every((s) => !s.collected));
  assert.equal(g.runTime, 0);
});
