// Tests des contrôles et de la logique de jeu.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { CONFIG } from '../src/config.js';
import { Game } from '../src/game/game.js';
import { TEST_COURT } from '../src/game/levels/test-court.js';

const DT = CONFIG.physics.fixedDt;
const R = CONFIG.ball.radius;

function settledGame(spawnX = 0) {
  const game = new Game(CONFIG, { ...TEST_COURT, spawn: { x: spawnX, y: R + 0.001 } });
  for (let i = 0; i < 60; i++) game.fixedUpdate(DT);
  assert.ok(game.body.grounded);
  return game;
}

function run(game, seconds, onStep) {
  const n = Math.round(seconds / DT);
  for (let i = 0; i < n; i++) {
    game.fixedUpdate(DT);
    onStep?.(game);
  }
}

function jumpApex(game, holdSeconds, direction = 1) {
  game.controller.press(direction);
  run(game, holdSeconds);
  game.controller.release();
  const y0 = game.body.y;
  let apex = y0;
  run(game, 1.5, (g) => (apex = Math.max(apex, g.body.y)));
  return apex - y0;
}

test('appui très court = petit rebond, appui long = grand saut', () => {
  const small = jumpApex(settledGame(), DT);
  const big = jumpApex(settledGame(), CONFIG.controls.chargeTime + 0.2);
  assert.ok(small < CONFIG.controls.minJumpHeight + 0.15, `petit saut ${small}`);
  assert.ok(Math.abs(big - CONFIG.controls.maxJumpHeight) < 0.25, `grand saut ${big}`);
});

test('la hauteur augmente continûment avec la durée d\'appui', () => {
  let last = 0;
  for (let t = 0.05; t <= CONFIG.controls.chargeTime; t += 0.1) {
    const h = jumpApex(settledGame(), t);
    assert.ok(h > last, `t=${t.toFixed(2)} h=${h} <= ${last}`);
    last = h;
  }
});

test('la direction suit le côté choisi', () => {
  const g1 = settledGame();
  jumpApex(g1, 0.3, 1);
  assert.ok(g1.body.x > 0.5);
  const g2 = settledGame();
  jumpApex(g2, 0.3, -1);
  assert.ok(g2.body.x < -0.5);
});

test('relâcher en l\'air : le saut part au prochain contact (buffer)', () => {
  const game = settledGame();
  let launches = 0;
  game.events.on('launch', () => launches++);
  // Petit saut, puis on appuie / relâche pendant la descente
  game.controller.press(1);
  game.controller.release();
  run(game, 0.12);
  assert.equal(launches, 1);
  // Attendre la descente et relâcher juste avant de toucher le sol
  while (!(game.body.vy < 0 && game.body.y < R + 0.25)) game.fixedUpdate(DT);
  game.controller.press(1);
  run(game, 0.02);
  game.controller.release();
  run(game, 0.3);
  assert.equal(launches, 2, 'le saut demandé en l\'air doit partir au contact');
});

test('une demande trop ancienne expire', () => {
  const game = settledGame();
  let launches = 0;
  game.events.on('launch', () => launches++);
  game.controller.press(1);
  run(game, CONFIG.controls.chargeTime);
  game.controller.release();
  run(game, 0.05);
  assert.equal(launches, 1);
  // Relâchement au sommet d'un grand saut : bien plus long que le buffer avant l'atterrissage
  game.controller.press(1);
  game.controller.release();
  run(game, 0.6);
  assert.equal(launches, 1);
});

test('pendant la charge, le ballon arrête de rebondir', () => {
  const game = new Game(CONFIG, { ...TEST_COURT, spawn: { x: 0, y: 4 } });
  game.controller.press(1);
  run(game, 1.2);
  assert.ok(game.body.grounded && Math.abs(game.body.vy) < 0.05, `vy=${game.body.vy}`);
});

test('panier compté quand le ballon tombe dans le cercle', () => {
  const hoop = TEST_COURT.hoops[0];
  const game = new Game(CONFIG, TEST_COURT);
  const h = game.level.hoops[0];
  game.body.reset(h.centerX, hoop.y + 2);
  let scored = 0;
  game.events.on('score', () => scored++);
  run(game, 1);
  assert.equal(scored, 1);
});

test('pas de panier si le ballon passe par en dessous', () => {
  const game = new Game(CONFIG, TEST_COURT);
  const h = game.level.hoops[0];
  game.body.reset(h.centerX, h.rimY - 1.5);
  game.body.vy = 12; // monte à travers le cercle puis retombe dedans
  let scored = 0;
  game.events.on('score', () => scored++);
  run(game, 2);
  assert.equal(scored, 0);
});

test('la prévisualisation correspond exactement au vrai saut', () => {
  const game = settledGame();
  game.controller.press(1);
  run(game, 0.4);
  const out = new Float64Array(2 * 400);
  const { count } = game.predictTrajectory(1.5, out);
  game.controller.release();
  // Le saut part au pas suivant, depuis la même position : les trajectoires doivent coïncider
  for (let i = 1; i < Math.min(count, 60); i++) {
    game.fixedUpdate(DT);
    assert.ok(Math.abs(game.body.x - out[i * 2]) < 1e-9 && Math.abs(game.body.y - out[i * 2 + 1]) < 1e-9, `écart au point ${i}`);
  }
});
