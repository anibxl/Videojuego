// Tests de la physique du ballon : node --test tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { CONFIG } from '../src/config.js';
import { BallBody } from '../src/physics/ball-body.js';
import { PhysicsWorld } from '../src/physics/world.js';
import { createCapsule, createCircle, createPolygonEdges, createOneWay, boxPoints } from '../src/physics/colliders.js';
import { Mover } from '../src/physics/mover.js';

const DT = CONFIG.physics.fixedDt;
const R = CONFIG.ball.radius;
const G = CONFIG.physics.gravity;

function makeBall(physicsOverrides = {}) {
  return new BallBody({
    radius: R,
    inertiaFactor: CONFIG.ball.inertiaFactor,
    physics: { ...CONFIG.physics, ...physicsOverrides },
  });
}

function floorWorld(material = CONFIG.materials.ground) {
  const world = new PhysicsWorld({ gravity: G });
  world.add(createPolygonEdges(boxPoints(-100, -5, 200, 5), material, 'floor'));
  return world;
}

const NO_DRAG = { airDrag: 0, angularDrag: 0, rollingResistance: 0, maxFallSpeed: Infinity };

test('chute libre conforme à la formule y = y0 - g·t²/2', () => {
  const world = new PhysicsWorld({ gravity: G });
  const ball = makeBall(NO_DRAG);
  ball.reset(0, 100);
  const steps = 120; // 1 s
  for (let i = 0; i < steps; i++) ball.step(world, DT);
  const expected = 100 - 0.5 * G * 1 * 1;
  // Euler semi-implicite : erreur d'ordre g·dt·t/2 ≈ 0,14 u sur 1 s
  assert.ok(Math.abs(ball.y - expected) < 0.2, `y=${ball.y} attendu≈${expected}`);
  assert.ok(Math.abs(ball.vy + G) < 1e-9);
});

test('la hauteur de rebond suit e² (restitution du parquet)', () => {
  const world = floorWorld();
  const ball = makeBall(NO_DRAG);
  const h0 = 4;
  ball.reset(0, R + h0);
  let apex = 0;
  let bounced = false;
  for (let i = 0; i < 600; i++) {
    ball.step(world, DT);
    if (ball.contactCount > 0) bounced = true;
    if (bounced) apex = Math.max(apex, ball.y - R);
    if (bounced && ball.vy < 0 && apex > 0.5) break;
  }
  const e = CONFIG.materials.ground.restitution;
  const ratio = apex / h0;
  assert.ok(Math.abs(ratio - e * e) < 0.03, `ratio=${ratio.toFixed(3)} attendu≈${(e * e).toFixed(3)}`);
});

test('le ballon finit par se poser et ne tremble pas', () => {
  const world = floorWorld();
  const ball = makeBall();
  ball.reset(0, 3);
  for (let i = 0; i < 120 * 6; i++) ball.step(world, DT);
  assert.ok(Math.abs(ball.y - R) < 1e-3, `y=${ball.y}`);
  assert.ok(ball.speed < 1e-3, `vitesse résiduelle ${ball.speed}`);
  assert.ok(ball.grounded);
  // Encore une seconde : la position ne doit pas bouger d'un poil
  const y = ball.y;
  for (let i = 0; i < 120; i++) ball.step(world, DT);
  assert.ok(Math.abs(ball.y - y) < 1e-6);
});

test('aucune traversée, même à très grande vitesse contre une paroi fine', () => {
  const world = new PhysicsWorld({ gravity: 0 });
  // Mur infiniment fin (segment, rayon 0)
  world.add(createCapsule(5, -10, 5, 10, 0, CONFIG.materials.wall, 'wall', -1, 0));
  for (const speed of [50, 200, 800]) {
    const ball = makeBall(NO_DRAG);
    ball.reset(0, 0);
    ball.vx = speed;
    for (let i = 0; i < 120; i++) ball.step(world, DT);
    assert.ok(ball.x < 5 - R + 1e-6, `vitesse ${speed} : x=${ball.x}`);
    assert.ok(ball.vx < 0, 'le ballon doit repartir en arrière');
  }
});

test('un ballon qui glisse se met à rouler sans glisser (v = v0 / (1 + k))', () => {
  const world = floorWorld();
  const ball = makeBall(NO_DRAG);
  ball.reset(0, R);
  ball.vx = 6;
  for (let i = 0; i < 240; i++) ball.step(world, DT);
  const k = CONFIG.ball.inertiaFactor;
  const expected = 6 / (1 + k);
  assert.ok(Math.abs(ball.vx - expected) < 0.05, `vx=${ball.vx} attendu≈${expected}`);
  // Roulement sans glissement : v + ω·R = 0
  assert.ok(Math.abs(ball.vx + ball.angularVelocity * R) < 1e-3);
});

test('aucun gain d\'énergie avec un rebond parfait', () => {
  const world = floorWorld({ restitution: 1, friction: 0 });
  const ball = makeBall(NO_DRAG);
  ball.reset(0, R + 3);
  let maxH = 0;
  for (let i = 0; i < 120 * 20; i++) {
    ball.step(world, DT);
    maxH = Math.max(maxH, ball.y - R);
  }
  assert.ok(maxH <= 3 + 0.05, `hauteur max ${maxH}`);
  assert.ok(maxH > 2.8, 'le ballon ne doit pas perdre d\'énergie non plus');
});

test('simulation déterministe', () => {
  const run = () => {
    const world = floorWorld();
    world.add(createCircle(2, 1.5, 0.3, CONFIG.materials.rim, 'rim'));
    const ball = makeBall();
    ball.reset(0, 4);
    ball.vx = 3.3;
    ball.angularVelocity = 2;
    for (let i = 0; i < 600; i++) ball.step(world, DT);
    return [ball.x, ball.y, ball.vx, ball.vy, ball.angle];
  };
  assert.deepEqual(run(), run());
});

test('posé en équilibre instable sur le cercle, le ballon finit par tomber', () => {
  const world = floorWorld();
  world.add(createCircle(0, 3, 0.06, CONFIG.materials.rim, 'rim'));
  const ball = makeBall();
  ball.reset(0.01, 3 + 0.06 + R);
  for (let i = 0; i < 120 * 3; i++) ball.step(world, DT);
  assert.ok(ball.y < 1, `le ballon est resté perché : y=${ball.y}`);
});

test('surfaceBelow trouve le sol et les plateformes', () => {
  const world = floorWorld();
  world.add(createPolygonEdges(boxPoints(2, 0, 2, 1.5), CONFIG.materials.platform));
  assert.ok(Math.abs(world.surfaceBelow(0, 5) - 0) < 1e-9);
  assert.ok(Math.abs(world.surfaceBelow(3, 5) - 1.5) < 1e-9);
  assert.ok(Math.abs(world.surfaceBelow(3, 1) - 0) < 1e-9); // sous la plateforme
});

test('plateforme traversable : traversée par en dessous, solide par le dessus', () => {
  const world = floorWorld();
  world.add(createOneWay(-2, 2, 2, CONFIG.materials.plank));
  const ball = makeBall(NO_DRAG);
  ball.reset(0, R);
  ball.vy = 12; // monte bien au-dessus de la planche
  let maxY = 0;
  for (let i = 0; i < 120 * 3; i++) {
    ball.step(world, DT);
    maxY = Math.max(maxY, ball.y);
  }
  assert.ok(maxY > 2 + R, 'le ballon doit traverser par en dessous');
  assert.ok(Math.abs(ball.y - (2 + R)) < 1e-3, `il doit se poser sur la planche : y=${ball.y}`);
});

test('plateforme traversable : un saut trop court retombe au travers', () => {
  const world = floorWorld();
  world.add(createOneWay(-2, 2, 2, CONFIG.materials.plank));
  const ball = makeBall(NO_DRAG);
  ball.reset(0, R);
  ball.vy = Math.sqrt(2 * G * 1.9); // le centre monte à 2,3 : le bas du ballon reste sous la planche
  for (let i = 0; i < 120 * 3; i++) ball.step(world, DT);
  assert.ok(ball.y < 1, `y=${ball.y}`);
});

test('surface mobile : le frottement entraîne le ballon posé', () => {
  const world = new PhysicsWorld({ gravity: G });
  const mover = new Mover(createPolygonEdges(boxPoints(-2, -0.5, 4, 0.5), CONFIG.materials.platform), { dx: 4, dy: 0, period: 4, phase: 0 });
  world.addMover(mover);
  const ball = makeBall();
  ball.reset(0, R);
  let t = 0;
  for (let i = 0; i < 60; i++) {
    t += DT;
    world.update(t);
    ball.step(world, DT);
  }
  // Physiquement, un ballon roule vers l'arrière d'un support qui accélère : il prend
  // k/(1+k) = 40 % de sa vitesse (le contrôleur de jeu compense, voir game.test.mjs).
  const vPlatform = world.colliders[0].vx;
  assert.ok(ball.grounded);
  assert.ok(Math.abs(ball.vx - 0.4 * vPlatform) < 0.1 * vPlatform, `ballon ${ball.vx} plateforme ${vPlatform}`);
});
