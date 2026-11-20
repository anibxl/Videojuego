// Étape 18 — game feel : ralentis, caméra, voix des surfaces, effets des mondes, identité sonore.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TimeFx } from '../src/core/time-fx.js';
import { Camera } from '../src/render/camera.js';
import { CONFIG } from '../src/config.js';
import { Sfx, surfaceOf } from '../src/audio/sfx.js';
import { Music, SONGS } from '../src/audio/music.js';
import { PENTA, BOUNCE_MOTIF } from '../src/audio/ui-voice.js';
import { Particles } from '../src/render/particles.js';
import { WorldFx } from '../src/render/world-fx.js';
import { Confetti } from '../src/render/confetti.js';

const WORLDS = ['city', 'snow', 'volcano', 'forest', 'space'];

test('ralenti : entrée, maintien, puis retour progressif (sans saut) à la vitesse normale', () => {
  const t = new TimeFx();
  t.slowmo(0.2, 0.4, 0.8, 0.05);
  const curve = [];
  for (let i = 0; i < 120; i++) curve.push(t.update(1 / 60));
  assert.ok(Math.min(...curve) <= 0.2001, 'atteint la vitesse la plus lente');
  // Pendant le retour, la vitesse ne fait que remonter, par petits pas
  const low = curve.indexOf(Math.min(...curve));
  for (let i = low + 1; i < curve.length; i++) {
    assert.ok(curve[i] >= curve[i - 1] - 1e-9, 'jamais de rechute');
    assert.ok(curve[i] - curve[i - 1] < 0.08, 'pas de saut brutal');
  }
  assert.equal(curve.at(-1), 1);
  assert.equal(t.active, false);
});

test('arrêt sur image : ne coupe pas un ralenti plus fort, et clear() remet tout à 1', () => {
  const t = new TimeFx();
  t.slowmo(0.1, 1, 0.5);
  t.update(0.2);
  t.hitStop(0.05, 0.5);
  assert.ok(t.update(1 / 60) <= 0.1 + 1e-9);
  t.clear();
  assert.equal(t.update(1 / 60), 1);
});

test('caméra : une impulsion (gros atterrissage) revient au repos', () => {
  const cam = new Camera(CONFIG.camera);
  cam.setViewport(844, 390);
  const bounds = { minX: -50, maxX: 50, minY: -10, maxY: 40 };
  const target = { x: 0, y: 1, vx: 0, vy: 0, grounded: true, groundY: 0.6 };
  cam.snap(0, 1, bounds);
  for (let i = 0; i < 60; i++) cam.update(1 / 60, target, bounds);
  const restY = cam.y;
  cam.impulse(0, -3);
  let minY = restY;
  for (let i = 0; i < 20; i++) {
    cam.update(1 / 60, target, bounds);
    minY = Math.min(minY, cam.y);
  }
  assert.ok(minY < restY - 0.02, "l'image s'enfonce");
  for (let i = 0; i < 120; i++) cam.update(1 / 60, target, bounds);
  assert.ok(Math.abs(cam.y - restY) < 0.01, 'puis revient');
});

test('caméra : moins d’animations demandées → secousses atténuées ; plan d’ouverture ; regard vers le bas en chute', () => {
  const a = new Camera(CONFIG.camera);
  const b = new Camera(CONFIG.camera);
  b.motionScale = 0.4;
  a.addTrauma(0.5);
  b.addTrauma(0.5);
  assert.ok(b.trauma < a.trauma);
  a.establish(0.9);
  assert.ok(a.zoom < 1 && a.zoomTarget === 1);
  const cam = new Camera(CONFIG.camera);
  cam.setViewport(844, 390);
  const bounds = { minX: -50, maxX: 50, minY: -40, maxY: 40 };
  for (let i = 0; i < 40; i++) cam.update(1 / 60, { x: 0, y: 10, vx: 0, vy: -20, grounded: false, groundY: 0 }, bounds);
  assert.ok(cam.lookY < -0.5, 'regarde vers le bas pendant une grande chute');
});

test('voix des surfaces : chaque monde a son sol, le métal et le bois sont reconnus', () => {
  assert.equal(surfaceOf('ground', 'city'), 'court');
  assert.equal(surfaceOf('ground', 'snow'), 'snow');
  assert.equal(surfaceOf('ground', 'volcano'), 'rock');
  assert.equal(surfaceOf('ground', 'forest'), 'grass');
  assert.equal(surfaceOf('block', 'space'), 'tech');
  assert.equal(surfaceOf('mover', 'city'), 'metal');
  assert.equal(surfaceOf('log', 'forest'), 'wood');
  assert.equal(surfaceOf('ice', 'snow'), 'ice');
  assert.equal(surfaceOf('rim', 'space'), 'rim');
});

test('sons et musique : aucun plantage tant que l’audio n’est pas déverrouillé', () => {
  const sfx = new Sfx();
  const music = new Music(sfx);
  assert.doesNotThrow(() => {
    sfx.impact(15, 'ground', 2);
    sfx.bounce(5, 1);
    sfx.win(true);
    sfx.fail();
    sfx.spawn();
    sfx.star(3);
    sfx.coin(2);
    sfx.buy('legendary');
    sfx.equip();
    sfx.select(1);
    sfx.motion(5, 10, 'snow');
    sfx.listen(10, 8);
    sfx.setSpace('space');
    music.stinger('win', 'forest');
    music.setIntensity(0.8);
    music.update();
  });
});

test('identité sonore : gamme pentatonique et motif du rebond aux intervalles qui raccourcissent', () => {
  assert.equal(PENTA.length, 15);
  const { times, notes } = BOUNCE_MOTIF;
  assert.equal(times.length, notes.length);
  for (let i = 2; i < times.length; i++) assert.ok(times[i] - times[i - 1] < times[i - 1] - times[i - 2], 'comme un ballon qui rebondit');
  for (const n of notes) assert.ok(n >= 0 && n < PENTA.length);
});

test('musique : chaque monde a sa variation B, sa couche d’intensité, sa réverbération et la tonalité de son jingle', () => {
  for (const w of WORLDS) {
    const s = SONGS[w];
    assert.ok(s.leadB && s.layer && s.verb && s.key, w);
    assert.ok(['major', 'minor'].includes(s.key.scale));
  }
});

test('effets des mondes : impact, roulement, gerbe et décor pour les 5 mondes, dans le réservoir préalloué', () => {
  const p = new Particles();
  const fx = new WorldFx(p);
  const cam = { x: 0, y: 3, halfWidth: 8, halfHeight: 5 };
  for (const w of WORLDS) {
    for (const surf of ['court', 'snow', 'ice', 'rock', 'grass', 'tech', 'metal', 'wood']) {
      fx.impact(w, surf, 0, 0, 0.9);
      fx.roll(w, surf, 0, 0, 5, 7);
    }
    fx.burst(w, 0, 0);
    fx.debris(w, cam, 10);
    assert.match(fx.tint(w), /^\d+,\d+,\d+$/);
  }
  assert.ok(p.items.filter((q) => q.alive).length > 50);
  assert.equal(p.items.length, 384);
  p.update(5);
  assert.equal(p.items.filter((q) => q.alive).length, 0, 'tout disparaît');
});

test('confettis : sans canvas (ou hors navigateur), rien ne plante', () => {
  const c = new Confetti(null);
  assert.doesNotThrow(() => {
    c.celebrate(1);
    c.pop(10, 10);
  });
});
