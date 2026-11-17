// Outil de level design : vérifie que chaque passage du niveau est faisable et estime sa difficulté.
// Pour chaque passage (plateforme A → plateforme B), on essaie des centaines de séquences de
// commandes aléatoires (direction + touchers) et on mesure le taux de réussite.
//   Taux élevé  = passage facile.  Taux faible = passage exigeant.  0 % = passage impossible (bug).
//
// Usage : node tools/route-check.mjs [essais par passage] [numéro de passage] [--save]
//   --save : enregistre une solution par passage dans tests/fixtures/routes.json
//            (rejouée par tests/routes.test.mjs : le niveau doit rester faisable)

import { CONFIG } from '../src/config.js';
import { Game } from '../src/game/game.js';
import { DEMO_LEVEL } from '../src/game/levels/demo.js';
import { createRng } from '../src/core/math.js';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const DT = CONFIG.physics.fixedDt;
const R = CONFIG.ball.radius;
const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const SAVE = process.argv.includes('--save');
const TRIES = Number(args[0] ?? 600);
const ONLY = args[1] !== undefined ? Number(args[1]) : null;

const on = (x1, x2, y) => (g) => g.body.grounded && Math.abs(g.body.y - (y + R)) < 0.06 && g.body.x > x1 && g.body.x < x2;
const onMover = (g) => g.body.grounded && g.body.contacts.some((c, i) => i < g.body.contactCount && c.collider.tag === 'mover');

export const ROUTES = [
  ['Sol → marche', [1.5, 0], on(6.5, 9, 1.2)],
  ['Marche → planche 1', [7.6, 1.2], on(3, 6, 3.3)],
  ['Planche 1 → planche 2', [4.5, 3.3], on(0, 3.2, 5.5)],
  ['Planche 2 → planche 3', [1.6, 5.5], on(3.6, 6.4, 7.7)],
  ['Planche 3 → corniche L1', [5.0, 7.7], on(6.8, 9, 9.9)],
  ['L1 → planche 4 (1 rebond en l\'air)', [8.0, 9.9], on(0, 3.4, 14.6)],
  ['Planche 4 → planche 5', [1.7, 14.6], on(5, 9, 17)],
  ['Planche 5 → L2 (2 rebonds en l\'air)', [7.0, 17], on(0, 3, 23.2)],
  ['L2 → dalle (avant les piques)', [1.3, 23.2], on(3, 5.4, 26.4)],
  ['Dalle : saut par-dessus les piques', [4.0, 26.4], on(6.8, 9, 26.4)],
  ['Dalle → planche 6', [8.0, 26.4], on(7.6, 9, 28.8)],
  ['Planche 6 → dessus du plafond piégé', [8.3, 28.8], on(4.8, 7.4, 31.25)],
  ['Plafond → planche 7', [6.1, 31.25], on(0, 3.6, 33.6)],
  ['Planche 7 → planche 8', [1.8, 33.6], on(4.6, 7.6, 35.8)],
  ['Planche 8 → L3', [6.1, 35.8], on(0, 2.8, 37.6)],
  ['L3 → plateforme mobile (tremplin)', [1.2, 37.6], onMover],
  ['Plateforme mobile → L4 (scie)', 'mover', on(6.6, 9, 48)],
  ['L4 → planche 9', [8.0, 48], on(3, 6, 50.4)],
  ['Planche 9 → planche 10', [4.5, 50.4], on(5.6, 9, 52.8)],
  ['Planche 10 → PANIER', [7.3, 52.8], (g) => g.state === 'won'],
];

/** Place le ballon au départ du passage et attend `wait` pas (phase des éléments mobiles). */
export function setup(start, wait) {
  let spawn;
  if (start === 'mover') {
    const m = DEMO_LEVEL.movers[0];
    spawn = { x: m.x + m.w / 2, y: m.y + m.h };
  } else spawn = { x: start[0], y: start[1] };
  const game = new Game(CONFIG, { ...DEMO_LEVEL, spawn });
  for (let i = 0; i < wait; i++) game.fixedUpdate(DT);
  return game;
}

const randomWait = (start, rng) =>
  start === 'mover' ? 30 + Math.floor((rng() * DEMO_LEVEL.movers[0].path.period) / DT) : 36 + Math.floor(rng() * 200);

function randomScript(rng) {
  const segs = [];
  const apex = rng() < 0.6; // 60 % des essais : on tape au sommet de chaque saut, comme un joueur à l'aise
  let t = 0;
  const n = 1 + Math.floor(rng() * 3);
  for (let i = 0; i < n; i++) {
    const d = 0.05 + rng() * 1.2;
    segs.push({ until: (t += d), axis: [-1, 0, 1][Math.floor(rng() * 3)] });
  }
  const taps = [];
  const k = 1 + Math.floor(rng() * 3);
  for (let i = 0; i < k; i++) taps.push(rng() * 2.2);
  taps.sort((a, b) => a - b);
  if (apex) taps.length = 1; // seul le premier toucher est aléatoire, les suivants suivent le sommet
  return { segs, taps, apex, apexTaps: 1 + Math.floor(rng() * 2), jitter: (rng() - 0.5) * 0.12 };
}

/** Joue un script ; renvoie { ok, death }. */
export function play(start, goal, wait, s) {
  const g = setup(start, wait);
  let tapI = 0;
  let deaths = 0;
  let apexDone = 0;
  let apexAt = -1;
  let prevVy = 0;
  g.events.on('death', () => deaths++);
  const steps = Math.round(3.6 / DT);
  for (let i = 0; i < steps; i++) {
    const t = i * DT;
    const seg = s.segs.find((x) => t < x.until);
    g.controller.setAxis(seg ? seg.axis : 0);
    while (tapI < s.taps.length && s.taps[tapI] <= t) {
      g.controller.requestBounce();
      tapI++;
    }
    if (s.apex && tapI > 0 && apexDone < s.apexTaps) {
      if (prevVy > 0 && g.body.vy <= 0 && !g.body.grounded) apexAt = t + Math.max(0, s.jitter);
      if (apexAt >= 0 && t >= apexAt) {
        g.controller.requestBounce();
        apexDone++;
        apexAt = -1;
      }
    }
    prevVy = g.body.vy;
    g.fixedUpdate(DT);
    if (deaths) return { ok: false, death: true };
    if (i > 12 && goal(g)) return { ok: true };
  }
  return { ok: false };
}

function trial(start, goal, rng) {
  const wait = randomWait(start, rng);
  const script = randomScript(rng);
  return { ...play(start, goal, wait, script), wait, script };
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
const solutions = [];
if (isMain) console.log(`${TRIES} essais aléatoires par passage\n`);
if (isMain) ROUTES.forEach(([name, start, goal], idx) => {
  if (ONLY !== null && idx !== ONLY) return;
  const rng = createRng(1000 + idx);
  let ok = 0;
  let deaths = 0;
  let example = null;
  for (let i = 0; i < TRIES; i++) {
    const r = trial(start, goal, rng);
    if (r.ok) {
      ok++;
      example ??= { wait: r.wait, script: r.script };
    }
    if (r.death) deaths++;
  }
  const pct = (100 * ok) / TRIES;
  const bar = '█'.repeat(Math.round(pct / 4)).padEnd(25, '·');
  const flag = ok === 0 ? '  ⚠ IMPOSSIBLE ?' : '';
  console.log(`${String(idx).padStart(2)} ${name.padEnd(40)} ${bar} ${pct.toFixed(1).padStart(5)} %  (morts ${((100 * deaths) / TRIES).toFixed(0)} %)${flag}`);
  solutions[idx] = example;
});

if (isMain && SAVE) {
  const out = new URL('../tests/fixtures/routes.json', import.meta.url);
  writeFileSync(out, JSON.stringify(ROUTES.map(([name], i) => ({ name, ...solutions[i] })), null, 1));
  console.log(`\nSolutions enregistrées dans tests/fixtures/routes.json`);
}
