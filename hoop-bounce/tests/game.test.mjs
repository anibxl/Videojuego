// Tests des contrôles, de la puissance de rebond et des éléments du niveau 1.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { CONFIG } from '../src/config.js';
import { Game } from '../src/game/game.js';
import { LEVEL_01 } from '../src/game/levels/level-01.js';

const DT = CONFIG.physics.fixedDt;
const R = CONFIG.ball.radius;
const C = CONFIG.controls;
const H = C.bounceHeights;

/** Partie avec la balle posée en (x, surface). */
function gameAt(x, surfaceY = 0) {
  const game = new Game(CONFIG, { ...LEVEL_01, spawn: { x, y: surfaceY } });
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

/** Avance jusqu'au sommet du saut et renvoie la hauteur atteinte. */
function untilApex(game) {
  let guard = 0;
  do game.fixedUpdate(DT);
  while (game.body.vy > 0 && ++guard < 2000);
  return game.body.y;
}

/** Avance jusqu'au prochain contact avec le sol. */
function untilLanding(game) {
  let guard = 0;
  do game.fixedUpdate(DT);
  while (!game.body.grounded && ++guard < 2000);
}

test('un appui au sol fait rebondir immédiatement à la hauteur du niveau 1', () => {
  const g = gameAt(2.5);
  const y0 = g.body.y;
  g.controller.pressBounce();
  g.fixedUpdate(DT);
  assert.ok(g.body.vy > 0, 'le rebond part au pas suivant');
  const apex = untilApex(g);
  assert.ok(Math.abs(apex - y0 - H[0]) < 0.08, `hauteur ${apex - y0} attendu≈${H[0]}`);
});

test('enchaîner les rebonds augmente la puissance, niveau par niveau', () => {
  const g = gameAt(2.5);
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

test('un appui en l\'air est mémorisé et part au contact', () => {
  const g = gameAt(2.5);
  let bounces = 0;
  g.events.on('bounce', () => bounces++);
  g.controller.pressBounce();
  untilApex(g);
  // Descente : on appuie un peu avant de toucher le sol
  while (g.body.y > R + 0.6) g.fixedUpdate(DT);
  g.controller.pressBounce();
  run(g, 0.3);
  assert.equal(bounces, 2);
  assert.equal(g.controller.level, 3);
});

test('un appui trop tôt en l\'air n\'est pas gardé indéfiniment', () => {
  const g = gameAt(2.5);
  let bounces = 0;
  g.events.on('bounce', () => bounces++);
  for (let i = 0; i < 3; i++) {
    g.controller.pressBounce();
    untilApex(g);
    untilLanding(g);
  }
  // Rebond niveau 4 : on appuie juste après le décollage, l'appui expire avant l'atterrissage
  g.controller.pressBounce();
  run(g, 0.05);
  g.controller.pressBounce();
  run(g, 2.5);
  assert.equal(bounces, 4);
});

test('sans rebondir quelques secondes, la puissance redescend progressivement', () => {
  const g = gameAt(2.5);
  for (let i = 0; i < 3; i++) {
    g.controller.pressBounce();
    untilApex(g);
    untilLanding(g);
  }
  assert.equal(g.controller.level, 4);
  const since = () => g.controller.time - g.controller.lastBounceTime;
  while (since() < C.comboDecayDelay - 0.05) g.fixedUpdate(DT);
  assert.equal(g.controller.level, 4, 'pas encore de baisse');
  run(g, 0.05 + C.comboDecayStep + 0.02);
  assert.equal(g.controller.level, 3, 'un niveau perdu');
  run(g, 3);
  assert.equal(g.controller.level, 1, 'retour au niveau normal');
});

test('inertie : accélération progressive, la balle continue de rouler une fois relâchée', () => {
  const g = gameAt(96.5); // terrain plat de la fin
  g.controller.right = true;
  run(g, 0.15);
  const early = g.body.vx;
  assert.ok(early > 2 && early < C.maxSpeed * 0.6, `pas instantané : ${early}`);
  run(g, 0.4);
  assert.ok(g.body.vx > C.maxSpeed * 0.97, `vitesse max : ${g.body.vx}`);
  g.controller.right = false;
  run(g, 0.5);
  assert.ok(g.body.vx > C.maxSpeed * 0.75, `elle garde son élan : ${g.body.vx}`);
  assert.ok(Math.abs(g.body.vx + g.body.angularVelocity * R) < 1e-6, 'roule sans glisser');
});

test('appuyer dans l\'autre sens freine franchement', () => {
  const g = gameAt(96.5);
  g.controller.right = true;
  run(g, 0.6);
  g.controller.right = false;
  g.controller.left = true;
  run(g, 0.25);
  assert.ok(g.body.vx < 0, `demi-tour en 0,25 s : ${g.body.vx}`);
});

test('le trampoline propulse au-dessus des pics', () => {
  const g = gameAt(24.5);
  let tramp = 0;
  let deaths = 0;
  g.events.on('trampoline', () => tramp++);
  g.events.on('death', () => deaths++);
  g.controller.right = true;
  run(g, 2.6);
  assert.ok(tramp >= 1, 'trampoline utilisé');
  assert.equal(deaths, 0, 'les pics sont franchis');
  assert.ok(g.body.x > 35.2, `x=${g.body.x}`);
  assert.equal(g.starsCollected, 1, 'l\'étoile au sommet du saut est ramassée');
});

test('le ventilateur fait flotter la balle jusqu\'à la corniche', () => {
  const g = gameAt(55.6);
  let maxY = 0;
  // Entrer dans le souffle puis freiner, comme un joueur
  g.controller.right = true;
  while (g.body.x < 57.9) g.fixedUpdate(DT);
  g.controller.right = false;
  g.controller.left = true;
  while (g.body.vx > 0.5) g.fixedUpdate(DT);
  g.controller.left = false;
  run(g, 2.5, (gg) => (maxY = Math.max(maxY, gg.body.y)));
  assert.ok(maxY > 4.5, `hauteur atteinte ${maxY}`);
  // Puis on glisse vers la corniche
  g.controller.right = true;
  run(g, 1.5);
  assert.ok(g.body.grounded && Math.abs(g.body.y - (3.8 + R)) < 0.05, `posée sur la corniche : y=${g.body.y}`);
});

test('l\'interrupteur ouvre la porte', () => {
  const g = gameAt(67.3, 6.15 + 0.14);
  const door = g.level.doors[0];
  run(g, 0.2);
  assert.equal(g.level.switches[0].pressed, true);
  run(g, 1);
  assert.ok(door.isOpen, 'porte ouverte');
});

test('porte fermée : on ne passe pas ; ouverte : on passe', () => {
  const g = gameAt(76);
  g.controller.right = true;
  run(g, 2);
  assert.ok(g.body.x < 79.2, `bloquée par la porte : x=${g.body.x}`);
  g.level.doors[0].open();
  run(g, 2);
  assert.ok(g.body.x > 80.5, `passée : x=${g.body.x}`);
});

test('le téléporteur fait passer le grand mur en gardant la vitesse', () => {
  const g = gameAt(84);
  let tp = null;
  g.events.on('teleport', (e) => (tp = e));
  g.controller.right = true;
  run(g, 1.5);
  assert.ok(tp, 'téléporté');
  assert.ok(tp.vx > 3, `vitesse conservée : ${tp.vx}`);
  assert.ok(g.body.x > 92, `de l'autre côté du mur : x=${g.body.x}`);
});

test('tomber dans le vide fait réapparaître au dernier point de contrôle', () => {
  const g = gameAt(39.8);
  let cause = null;
  g.events.on('death', (e) => (cause = e.cause));
  // Attendre que la plateforme soit loin, puis rouler dans le vide
  while (g.level.movers[0].mover.offsetX < 4) g.fixedUpdate(DT);
  g.controller.right = true;
  run(g, 2);
  assert.equal(cause, 'fall');
  run(g, CONFIG.feel.deathDelay);
  assert.ok(Math.abs(g.body.x - 39.5) < 0.6, `réapparition : x=${g.body.x}`);
});

test('la plateforme mobile transporte la balle au-dessus du vide', () => {
  const m = LEVEL_01.movers[0];
  const g = gameAt(m.x + m.w / 2, m.y + m.h);
  run(g, m.path.period / 2);
  const mover = g.level.movers[0].mover;
  assert.ok(g.body.grounded);
  assert.ok(Math.abs(g.body.x - (m.x + m.w / 2 + mover.offsetX)) < 0.3);
});

test('marquer le panier termine le niveau', () => {
  const g = gameAt(2.5);
  const h = g.level.hoop;
  g.body.reset(h.centerX, h.rimY + 2);
  let win = null;
  g.events.on('win', (e) => (win = e));
  run(g, 1);
  assert.ok(win);
  assert.equal(g.state, 'won');
});

test('pas de panier si la balle passe par en dessous', () => {
  const g = gameAt(2.5);
  const h = g.level.hoop;
  g.body.reset(h.centerX, h.rimY - 1.2);
  g.body.vy = 11;
  let win = 0;
  g.events.on('win', () => win++);
  run(g, 2);
  assert.equal(win, 0);
});

test('recommencer remet tout à zéro (étoiles, interrupteur, porte)', () => {
  const g = gameAt(67.3, 6.29);
  run(g, 1);
  assert.ok(g.level.doors[0].opening);
  g.restart();
  assert.equal(g.level.switches[0].pressed, false);
  assert.equal(g.level.doors[0].progress, 0);
  assert.equal(g.starsCollected, 0);
});
