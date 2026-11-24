// MODE FANTÔME (phase 3) : enregistrement, format compact, relecture exacte, stockage, réglage.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../src/config.js';
import { Game } from '../src/game/game.js';
import { LEVELS } from '../src/game/worlds.js';
import { GhostRecorder, GhostPlayer, GhostStore, encodeSamples, decodeSamples, GHOST_HZ, isValidGhost } from '../src/game/ghost.js';
import { Settings, defaultSettings, sanitize } from '../src/shared/settings.js';
import { Pilot, runPlan, GOAL_OF } from '../tools/route-check.mjs';

const DT = CONFIG.physics.fixedDt;

/** Stockage en mémoire (avec une taille maximale, pour simuler un stockage plein). */
function memoryStorage(limit = Infinity) {
  const m = new Map();
  return {
    get length() {
      return m.size;
    },
    key: (i) => [...m.keys()][i] ?? null,
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem(k, v) {
      const used = [...m.entries()].reduce((n, [kk, vv]) => n + (kk === k ? 0 : kk.length + vv.length), 0);
      if (used + k.length + v.length > limit) throw new Error('QuotaExceededError');
      m.set(k, String(v));
    },
    removeItem: (k) => m.delete(k),
    map: m,
  };
}

/** Joue un niveau en entier avec le pilote, en enregistrant le fantôme et la vraie trajectoire. */
function playAndRecord(index) {
  const level = LEVELS[index];
  const g = new Game(CONFIG, level);
  const rec = new GhostRecorder(DT);
  const truth = [];
  g.events.on('impact', (e) => rec.bounce(g.runTime, e.speed));
  const step0 = g.fixedUpdate.bind(g);
  let lastRun = -1;
  const sampleTruth = () => {
    // vraie position du ballon sur chaque cran de la grille de 60 Hz (horloge de course)
    if (g.runTime < lastRun) truth.length = 0;
    lastRun = g.runTime;
    const f = g.runTime * GHOST_HZ;
    const i = Math.round(f);
    if (Math.abs(f - i) < 1e-6 && truth.length === i) truth.push([g.body.x, g.body.y, g.body.angle]);
  };
  rec.step(g);
  sampleTruth();
  g.fixedUpdate = (dt) => {
    step0(dt);
    rec.step(g);
    sampleTruth();
  };
  for (let i = 0; i < 36; i++) g.fixedUpdate(DT);
  const p = new Pilot(g);
  for (const ps of level.passages) {
    const ok = runPlan(p, ps.plan === 'shot' ? [['shot']] : ps.plan) && !p.dead && (p.won || p.until(GOAL_OF(ps.goal), 3));
    if (!ok) break;
  }
  return { g, rec, truth, won: g.state === 'won' };
}

test('format compact : aller-retour au centième près, sauts (téléporteur) et rotation continue', () => {
  const n = 2000;
  const buf = new Int32Array(n * 3);
  let x = 1;
  let y = 0.4;
  let a = 0;
  const truth = [];
  for (let i = 0; i < n; i++) {
    x += 0.12 + Math.sin(i * 0.1) * 0.05;
    y = 0.4 + Math.abs(Math.sin(i * 0.05)) * 3;
    a += 0.3; // la rotation tourne sans arrêt : elle doit rester continue après repliement
    if (i === 700) x += 40; // téléporteur
    if (i === 1300) y += 12;
    truth.push([x, y, a]);
    buf[i * 3] = Math.round(x * 100);
    buf[i * 3 + 1] = Math.round(y * 100);
    buf[i * 3 + 2] = Math.round(a * 100);
  }
  const text = encodeSamples(buf, n);
  const { xs, ys, as } = decodeSamples(text, n);
  for (let i = 0; i < n; i++) {
    assert.ok(Math.abs(xs[i] - truth[i][0]) <= 0.0051, `x ${i}`);
    assert.ok(Math.abs(ys[i] - truth[i][1]) <= 0.0051, `y ${i}`);
    assert.ok(Math.abs(as[i] - truth[i][2]) <= 0.006, `rotation ${i} : ${as[i]} / ${truth[i][2]}`);
  }
  // ≈ 3 octets par échantillon (un peu plus aux sauts), puis base64
  assert.ok(text.length < n * 3 * 1.4, `taille ${text.length}`);
});

test('les 50 niveaux : le fantôme rejoue exactement la partie (écart ≤ 1 cm), sans rien changer à la simulation', () => {
  let maxBytes = 0;
  for (let li = 0; li < LEVELS.length; li++) {
    const { g, rec, truth, won } = playAndRecord(li);
    assert.ok(won, `${LEVELS[li].id} : le pilote termine le niveau`);
    const data = rec.finish(g.result);
    assert.ok(isValidGhost(data), `${LEVELS[li].id} : données valides`);
    maxBytes = Math.max(maxBytes, data.d.length);
    const player = new GhostPlayer(data);
    // Chaque échantillon = la vraie position au même instant de course
    assert.equal(player.n, truth.length, `${LEVELS[li].id} : un échantillon par 1/60 s de course`);
    let worst = 0;
    const out = {};
    for (let i = 0; i < truth.length; i++) {
      player.at(i / GHOST_HZ, out);
      worst = Math.max(worst, Math.abs(out.x - truth[i][0]), Math.abs(out.y - truth[i][1]));
    }
    assert.ok(worst <= 0.0051, `${LEVELS[li].id} : écart maximal ${worst.toFixed(4)} u`);
    // Le fantôme finit dans le panier, au temps du record
    assert.ok(Math.abs(player.duration - data.t) <= 1 / GHOST_HZ + 1e-6, `${LEVELS[li].id} : durée ${player.duration} / ${data.t}`);
    assert.ok(data.b.length > 0, `${LEVELS[li].id} : rebonds enregistrés`);
  }
  // Un niveau entier pèse quelques kilo-octets
  assert.ok(maxBytes < 24000, `le plus gros fantôme fait ${maxBytes} caractères`);
});

test('l’enregistrement ne modifie pas la partie : même résultat avec ou sans fantôme', () => {
  for (const li of [3, 17, 28, 38, 46]) {
    const level = LEVELS[li];
    const plain = new Game(CONFIG, level);
    for (let i = 0; i < 36; i++) plain.fixedUpdate(DT);
    const p0 = new Pilot(plain);
    for (const ps of level.passages) runPlan(p0, ps.plan === 'shot' ? [['shot']] : ps.plan) && (p0.won || p0.until(GOAL_OF(ps.goal), 3));
    const { g } = playAndRecord(li);
    assert.equal(g.state, plain.state, level.id);
    assert.equal(g.runTime, plain.runTime, `${level.id} : même temps au millième près`);
    assert.equal(g.body.x, plain.body.x);
  }
});

test('l’enregistreur repart de zéro quand le niveau recommence', () => {
  const g = new Game(CONFIG, LEVELS[0]);
  const rec = new GhostRecorder(DT);
  rec.step(g);
  for (let i = 0; i < 240; i++) {
    g.fixedUpdate(DT);
    rec.step(g);
  }
  assert.ok(rec.n > 100);
  g.restart();
  rec.step(g);
  g.fixedUpdate(DT);
  rec.step(g);
  assert.equal(rec.n, 1, 'après un recommencement : un seul échantillon (temps 0)');
});

test('relecture : interpolation entre deux échantillons, pas à travers un saut ; fin du parcours', () => {
  const n = 4;
  const buf = new Int32Array([0, 0, 0, 100, 0, 0, 5000, 0, 0, 5100, 0, 0]);
  const data = { v: 1, hz: 60, t: 3 / 60, n, d: encodeSamples(buf, n), b: [1], s: 3, k: 0, at: 0 };
  const p = new GhostPlayer(data);
  const o = {};
  p.at(0.5 / 60, o);
  assert.ok(Math.abs(o.x - 0.5) < 1e-6, 'interpolé');
  p.at(1.25 / 60, o);
  assert.equal(o.x, 1, 'saut de 49 u : pas de position intermédiaire');
  assert.equal(o.jumped, true);
  p.at(1.75 / 60, o);
  assert.equal(o.x, 50);
  p.at(10, o);
  assert.equal(o.done, true);
  assert.equal(o.x, 51);
  p.at(1.5 / 60, o);
  assert.ok(o.sinceBounce >= 0 && o.sinceBounce < 0.02, 'temps depuis le dernier rebond');
});

test('stockage : on ne garde que le meilleur essai, conservé après « fermeture » du jeu', () => {
  const storage = memoryStorage();
  const store = new GhostStore(storage);
  const make = (t) => ({ v: 1, hz: 60, t, n: 3, d: encodeSamples(new Int32Array([0, 0, 0, 10, 0, 0, 20, 0, 0]), 3), b: [], s: 2, k: 0, at: Date.now() });
  assert.equal(store.has('snow-3'), false);
  assert.equal(store.offer('snow-3', make(40)), 'first');
  assert.equal(store.offer('snow-3', make(41)), 'slower');
  assert.equal(store.offer('snow-3', make(40)), 'slower', 'égalité : on garde l’ancien');
  assert.equal(store.offer('snow-3', make(37.5)), 'record');
  // Nouvelle partie (nouveau magasin, même stockage) : le record est toujours là
  const again = new GhostStore(storage);
  assert.equal(again.bestTime('snow-3'), 37.5);
  assert.equal(again.has('snow-4'), false);
  // Donnée abîmée : ignorée, sans erreur
  storage.setItem('hoopbounce.ghost.snow-4', '{pas du json');
  assert.equal(new GhostStore(storage).get('snow-4'), null);
  // Une seule clé par niveau, et aucune autre clé touchée
  assert.deepEqual([...storage.map.keys()].sort(), ['hoopbounce.ghost.snow-3', 'hoopbounce.ghost.snow-4']);
});

test('stockage plein : les plus vieux fantômes laissent la place, jamais celui du niveau joué', () => {
  const storage = memoryStorage(900);
  const store = new GhostStore(storage);
  const make = (t, at) => ({ v: 1, hz: 60, t, n: 3, d: 'A'.repeat(200), b: [], s: 0, k: 0, at });
  assert.equal(store.offer('a', make(10, 1)), 'first');
  assert.equal(store.offer('b', make(10, 2)), 'first');
  assert.equal(store.offer('c', make(10, 3)), 'first');
  assert.equal(store.offer('d', make(10, 4)), 'first');
  assert.equal(storage.getItem('hoopbounce.ghost.a'), null, 'le plus ancien a été libéré');
  assert.ok(storage.getItem('hoopbounce.ghost.d'));
  // Stockage indisponible : aucune erreur
  assert.equal(new GhostStore(null).offer('x', make(5, 1)), 'error');
  assert.equal(new GhostStore(null).has('x'), false);
});

test('réglage « Fantôme » : activé par défaut, enregistré, valeur abîmée corrigée', () => {
  assert.equal(defaultSettings('fr').ghost, true);
  assert.equal(sanitize({ ghost: 'oui' }, defaultSettings('fr')).ghost, true);
  assert.equal(sanitize({ ghost: false }, defaultSettings('fr')).ghost, false);
  const storage = memoryStorage();
  const s = new Settings(storage, 'fr-FR');
  s.set('ghost', false);
  assert.equal(new Settings(storage, 'fr-FR').get('ghost'), false);
  // Anciennes sauvegardes de réglages (sans la clé) : le fantôme est activé
  storage.setItem('hoopbounce.settings', JSON.stringify({ music: 0.2, sfx: 0.5, vibration: false, lang: 'en', quality: 'low' }));
  const old = new Settings(storage, 'fr-FR');
  assert.equal(old.get('ghost'), true);
  assert.equal(old.get('music'), 0.2);
});
