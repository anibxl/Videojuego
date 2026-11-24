// PIÈGES SURPRISES (campagne) : bloc qui sort d'un mur, mur qui surgit, porte qui se referme, coup de vent
// soudain, ressort surpuissant, faux sol, dalle qui s'efface, portail caché. Chaque piège est annoncé
// (avertissement avant d'agir) et remis à zéro quand le joueur réapparaît : on peut toujours réessayer.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { CONFIG } from '../src/config.js';
import { Game } from '../src/game/game.js';
import { buildLevel } from '../src/game/level.js';

const DT = CONFIG.physics.fixedDt;
const R = CONFIG.ball.radius;

function yard(extra = {}, spawnX = 3) {
  return new Game(CONFIG, {
    id: 'yard',
    bounds: { minX: -2, maxX: 42, minY: -4, maxY: 12 },
    spawn: { x: spawnX, y: 0 },
    hoop: { x: 36, y: 3.4, facing: -1, mount: 'pole' },
    ...extra,
    solids: [
      { x: -4, y: -6, w: 48, h: 6, style: 'ground' },
      { x: -4, y: 0, w: 4, h: 16, style: 'wall' },
      { x: 40, y: 0, w: 4, h: 16, style: 'wall' },
      ...(extra.solids ?? []),
    ],
  });
}

function run(g, sec, each) {
  for (let i = 0; i < Math.round(sec / DT); i++) {
    each?.(g);
    g.fixedUpdate(DT);
  }
}

test('mur qui surgit : rien avant la zone, avertissement, puis il se dresse et arrête le ballon', () => {
  const g = yard({ traps: [{ kind: 'rise', x: 14, y: 0, w: 0.8, h: 3, from: { dx: 0, dy: -3 }, trigger: { x1: 8, x2: 12 }, warn: 0.5, speed: 12 }] });
  const tp = g.level.traps[0];
  const events = [];
  g.events.on('trapWarn', () => events.push(['warn', g.time]));
  g.events.on('trapMove', () => events.push(['move', g.time]));
  assert.equal(tp.state, 'idle');
  assert.ok(tp.colliders.every((c) => c.disabled), 'pas solide au repos');
  run(g, 0.6, (gg) => (gg.controller.right = true));
  assert.equal(tp.state, 'idle', 'pas encore dans la zone');
  run(g, 4, (gg) => (gg.controller.right = true));
  assert.equal(events[0][0], 'warn');
  assert.equal(events[1][0], 'move');
  assert.ok(events[1][1] - events[0][1] >= 0.49, 'avertissement avant le mouvement');
  assert.equal(tp.state, 'out');
  assert.ok(tp.colliders.every((c) => !c.disabled), 'solide une fois sorti');
  assert.ok(g.body.x < 14 - R + 0.05, `le ballon est arrêté par le mur (x = ${g.body.x.toFixed(2)})`);
});

test('bloc qui sort d\'un mur : pousse le ballon sans le traverser, puis rentre (hold)', () => {
  // Bloc caché dans un pilier à gauche, il sort vers la droite au-dessus du chemin
  const g = yard({
    solids: [{ x: 10, y: 0, w: 2, h: 6, style: 'wall' }],
    traps: [{ kind: 'pop', x: 12, y: 0, w: 2, h: 1.2, from: { dx: -2, dy: 0 }, trigger: { x1: 12.4, x2: 15 }, warn: 0.3, speed: 6, hold: 1.5 }],
  }, 13);
  const tp = g.level.traps[0];
  run(g, 0.2);
  assert.equal(tp.state, 'warn');
  run(g, 1.2);
  assert.equal(tp.state, 'out');
  assert.ok(g.body.x > 14 + R - 0.06, `ballon poussé hors du bloc (x = ${g.body.x.toFixed(2)})`);
  assert.ok(Number.isFinite(g.body.x) && g.body.y > 0, 'pas éjecté dans le décor');
  run(g, 2.5);
  assert.equal(tp.state, 'idle', 'rentré après hold, réarmé (ballon hors zone)');
});

test('porte qui se referme derrière le joueur : remise à zéro à la réapparition', () => {
  const g = yard({ traps: [{ kind: 'close', x: 9, y: 0, w: 0.6, h: 4, from: { dx: 0, dy: 4 }, trigger: { x1: 11, x2: 14 }, warn: 0.3 }], checkpoints: [{ x: 6, y: 0 }] });
  const tp = g.level.traps[0];
  run(g, 3, (gg) => (gg.controller.right = gg.body.x < 12.5));
  assert.equal(tp.state, 'out', 'la porte s\'est refermée derrière');
  assert.ok(g.body.x > 9.6);
  g._respawnAtCheckpoint();
  assert.equal(tp.state, 'idle', 'rouverte quand on réapparaît');
  g.restart();
  assert.equal(tp.state, 'idle');
});

test('coup de vent soudain : calme, avertissement, puis souffle fort un moment', () => {
  const g = yard({ winds: [{ x: 10, y: 0, w: 10, h: 6, force: -30, sudden: { warn: 0.6, dur: 1 } }] }, 11);
  const w = g.level.winds[0];
  assert.equal(w.accelAt(12, 1, 0), 0, 'calme avant le déclenchement');
  const ev = [];
  g.events.on('gustWarn', () => ev.push('warn'));
  g.events.on('gust', () => ev.push('gust'));
  run(g, 0.3);
  assert.equal(w.state, 'warn');
  assert.equal(w.accelAt(12, 1, g.time), 0, 'pas encore de vent pendant l\'avertissement');
  const x0 = g.body.x;
  run(g, 0.9);
  assert.deepEqual(ev, ['warn', 'gust']);
  assert.ok(g.body.x < x0 - 0.3, 'le ballon est poussé');
  run(g, 1.5);
  assert.ok(w.state === 'spent' || w.state === 'calm', 'le coup de vent est passé (réarmé si le ballon est sorti de la zone)');
  // Le vent ordinaire (sans `sudden`) ne change pas
  const calm = yard({ winds: [{ x: 10, y: 0, w: 10, h: 6, force: 20 }] });
  assert.ok(calm.level.winds[0].accelAt(12, 1, 0) > 0);
});

test('ressort surpuissant : propulse plus haut qu\'un trampoline normal', () => {
  const peak = (boost) => {
    const g = yard({ trampolines: [{ x: 6, y: 0, w: 1.6, boost }] }, 6.8);
    let top = 0;
    run(g, 2.5, (gg) => (top = Math.max(top, gg.body.y)));
    return top;
  };
  const normal = peak(undefined);
  const big = peak(1.4);
  assert.ok(big > normal * 1.6, `plus haut : ${big.toFixed(1)} contre ${normal.toFixed(1)}`);
});

test('faux sol et dalle qui s\'efface : ce sont des sols fragiles (même moteur, autre apparence)', () => {
  const g = yard({ crumbles: [{ x: 10, y: -0.5, w: 4, h: 0.5, look: 'fake', delay: 0.1 }, { x: 20, y: 1.5, w: 2, h: 0.4, look: 'vanish', delay: 1.2 }] });
  assert.equal(g.level.crumbles[0].def.look, 'fake');
  assert.equal(g.level.crumbles[1].def.look, 'vanish');
  const c = g.level.crumbles[0];
  assert.equal(c.touch(), true);
  run(g, 0.2);
  assert.equal(c.state, 'gone', 'le faux sol cède presque tout de suite');
});

test('portail caché : un téléporteur normal, seulement plus discret', () => {
  const L = buildLevel({ id: 'x', spawn: { x: 1, y: 0 }, hoop: { x: 30, y: 3.4 }, teleporters: [{ a: { x: 5, y: 1 }, b: { x: 20, y: 1 }, hidden: true }] }, CONFIG);
  assert.equal(L.teleporters[0].def.hidden, true);
  assert.ok(L.teleporters[0].destination(5, 1), 'il fonctionne comme les autres');
});
