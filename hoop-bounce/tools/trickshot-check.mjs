// Outil de conception des niveaux TRICKSHOT : chaque niveau doit pouvoir être réussi du premier coup
// (3 étoiles possibles), et sa difficulté affichée doit correspondre à la réalité.
//
// Pour chaque niveau, on simule des milliers de tirs (angle × puissance × instant du tir, pour les
// niveaux où des éléments bougent) sur 4 processus, avec la vraie physique du jeu :
//  - taux de réussite = part des tirs de la grille qui marquent → difficulté mesurée ;
//  - si aucun tir de la grille ne marque, recherche locale autour des tirs les plus proches du panier.
//
// Usage : node tools/trickshot-check.mjs [niveaux, ex. 1-10 ou 7] [--quick] [--save]
//   --quick : grille 2 fois plus grossière (conception rapide ; le taux est alors moins précis)
//   --save : enregistre une solution par niveau dans tests/fixtures/trickshot.json (rejouée par les tests) ;
//            on retient de préférence un tir qui se sert de TOUTES les mécaniques de la carte
//            (« ⚠ mécanique contournée » sinon : la carte est à revoir)

import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { cpus } from 'node:os';
import { TS_LEVELS } from '../src/trickshot/levels.js';
import { TrickshotGame, DT } from '../src/trickshot/game.js';
import { TRICKSHOT } from '../src/trickshot/config.js';

const FIXTURE = new URL('../tests/fixtures/trickshot.json', import.meta.url);
const DEG = Math.PI / 180;

/** Simule un tir ; renvoie la réussite et la plus petite distance à l'ouverture du panier. */
export function runShot(def, angle, power, release) {
  const g = new TrickshotGame(def);
  while (g.time + 1e-9 < release) g.fixedUpdate(DT);
  if (!g.launch(angle, power)) return { won: false, d: 99 };
  const h = g.level.hoop;
  const tx = h.centerX;
  const ty = h.rimY + 0.25;
  let d = 99;
  const limit = g.time + TRICKSHOT.maxShotTime + 1;
  while ((g.state === 'playing' || g.state === 'dying') && g.time < limit) {
    g.fixedUpdate(DT);
    const b = g.body;
    if (g.state === 'playing') d = Math.min(d, Math.hypot(b.x - tx, b.y - ty));
  }
  return { won: g.state === 'won', d };
}

/** Instants de tir à essayer : un seul si rien ne bouge, sinon répartis sur la période des éléments. */
export function releaseTimes(def, samples = 6) {
  const periods = [
    ...(def.movers ?? []).map((m) => m.path?.period),
    ...(def.saws ?? []).map((s) => s.path?.period),
    ...(def.lasers ?? []).map((l) => l.period ?? 3),
    ...(def.blinkers ?? []).map((b) => b.period ?? 3),
    ...(def.cannons ?? []).map((c) => c.period ?? 2.6),
    ...(def.boulders ?? []).map((b) => b.period ?? 3.2),
  ].filter(Boolean);
  if (!periods.length) return [0.3];
  const P = Math.max(...periods);
  return Array.from({ length: samples }, (_, i) => +(0.3 + (i * P) / samples).toFixed(3));
}

// ─── Processus de calcul ─────────────────────────────────────────────────────
if (!isMainThread) {
  const { index, shots } = workerData;
  const def = TS_LEVELS[index];
  const out = shots.map(([a, p, r]) => {
    const res = runShot(def, a * DEG, p, r);
    return [a, p, r, res.won ? 1 : 0, +res.d.toFixed(3)];
  });
  parentPort.postMessage(out);
}

function runParallel(index, shots, threads) {
  const chunk = Math.ceil(shots.length / threads);
  const jobs = [];
  for (let i = 0; i < threads; i++) {
    const part = shots.slice(i * chunk, (i + 1) * chunk);
    if (!part.length) continue;
    jobs.push(
      new Promise((resolve, reject) => {
        const w = new Worker(fileURLToPath(import.meta.url), { workerData: { index, shots: part } });
        w.once('message', resolve);
        w.once('error', reject);
      }),
    );
  }
  return Promise.all(jobs).then((parts) => parts.flat());
}

export const CLASS_BANDS = [
  // Seuils calés sur les 50 cartes (refonte de la campagne) : chaque palier regroupe 10 cartes.
  ['easy', 0.0147],     // ≥ 1,47 % des tirs de la grille marquent
  ['medium', 0.006],    // ≥ 0,6 %
  ['hard', 0.0026],     // ≥ 0,26 %
  ['very', 0.0007],     // ≥ 0,07 %
  ['impossible', 0],    // moins : il faut trouver LE tir (mais il existe toujours)
];
export const classOf = (frac) => CLASS_BANDS.find(([, min]) => frac >= min)?.[0] ?? 'impossible';

/** Vrai si le tir ne marque plus dès qu'on retire n'importe laquelle des mécaniques de la carte. */
export function usesAllMechanics(def, [a, p, r]) {
  const shot = (d) => runShot(d, a * DEG, p, r).won;
  for (const k of ['trampolines', 'fans', 'movers', 'switches', 'teleporters', 'breakables']) if (def[k]?.length && shot({ ...def, [k]: [] })) return false;
  if (def.solids.some((x) => x.style === 'bumper') && shot({ ...def, solids: def.solids.filter((x) => x.style !== 'bumper') })) return false;
  return true;
}

/** Parmi les tirs gagnants, celui qui se sert de toutes les mécaniques (en partant du milieu de la liste). */
function pickSolution(def, wins) {
  const mid = Math.floor(wins.length / 2);
  const order = wins.map((w, i) => [Math.abs(i - mid), w]).sort((x, y) => x[0] - y[0]).map((x) => x[1]);
  for (const w of order.slice(0, 120)) if (usesAllMechanics(def, w)) return { sol: w, all: true };
  return { sol: wins[mid], all: false };
}

async function checkLevel(index, threads, quick = false) {
  const def = TS_LEVELS[index];
  const t0 = Date.now();
  const rel = releaseTimes(def, quick ? 4 : 6);
  const aStep = (rel.length > 1 ? 2.5 : 1.5) * (quick ? 2 : 1);
  const pStep = (rel.length > 1 ? 0.035 : 0.025) * (quick ? 2 : 1);
  const grid = [];
  for (const r of rel) for (let a = -30; a <= 210; a += aStep) for (let p = 0.15; p <= 1.0001; p += pStep) grid.push([+a.toFixed(2), +p.toFixed(3), r]);
  const res = await runParallel(index, grid, threads);
  const wins = res.filter((x) => x[3]);
  let frac = wins.length / res.length;
  let { sol, all } = wins.length ? pickSolution(def, wins) : { sol: null, all: false };
  let refined = false;
  if (!sol) {
    // Recherche locale autour des tirs les plus proches du panier
    const best = [...res].sort((x, y) => x[4] - y[4]).slice(0, 24);
    const local = [];
    for (const [a, p, r] of best) for (let k = 0; k < 40; k++) local.push([+(a + (Math.random() - 0.5) * aStep * 2).toFixed(3), +Math.min(1, Math.max(0.12, p + (Math.random() - 0.5) * pStep * 2)).toFixed(4), +(r + (rel.length > 1 ? (Math.random() - 0.5) * 0.4 : 0)).toFixed(3)]);
    const lr = await runParallel(index, local, threads);
    const lw = lr.filter((x) => x[3]);
    if (lw.length) {
      ({ sol, all } = pickSolution(def, lw));
      refined = true;
      frac = Math.min(frac, 0.0005);
    }
  }
  const nearest = Math.min(...res.map((x) => x[4]));
  return { all, n: def.n, id: def.id, declared: def.diff, measured: sol ? classOf(frac) : 'IMPOSSIBLE (aucune solution)', frac, sol, refined, nearest, ms: Date.now() - t0, samples: res.length };
}

async function main() {
  const args = process.argv.slice(2);
  const save = args.includes('--save');
  const quick = args.includes('--quick');
  const sel = args.find((a) => /^\d/.test(a));
  let indices = TS_LEVELS.map((_, i) => i);
  if (sel) {
    const [a, b] = sel.split('-').map(Number);
    indices = indices.filter((i) => i + 1 >= a && i + 1 <= (b ?? a));
  }
  const threads = Math.max(1, Math.min(4, cpus().length));
  const fixture = existsSync(FIXTURE) ? JSON.parse(readFileSync(FIXTURE, 'utf8')) : {};
  let bad = 0;
  for (const i of indices) {
    const r = await checkLevel(i, threads, quick);
    const ok = !!r.sol;
    if (!ok) bad++;
    const mark = !ok ? '❌' : r.measured === r.declared ? '✅' : '≈ ';
    console.log(`${mark} ${String(r.n).padStart(2)} ${r.id.padEnd(22)} annoncé ${r.declared.padEnd(10)} mesuré ${r.measured.padEnd(10)} réussite ${(r.frac * 100).toFixed(2).padStart(6)} %${r.refined ? ' (fine)' : ''}  ${r.sol ? `tir ${r.sol[0]}° ${r.sol[1]} à ${r.sol[2]} s${r.all ? '' : ' ⚠ mécanique contournée'}` : `au plus près ${r.nearest.toFixed(2)} u`}  (${(r.ms / 1000).toFixed(1)} s)`);
    if (save && ok) fixture[r.n] = { angle: r.sol[0], power: r.sol[1], release: r.sol[2], frac: +r.frac.toFixed(5) };
  }
  if (save) {
    writeFileSync(FIXTURE, JSON.stringify(fixture, null, 1) + '\n');
    console.log(`\nSolutions enregistrées : ${FIXTURE.pathname}`);
  }
  if (bad) console.log(`\n${bad} niveau(x) sans solution trouvée.`);
}

if (isMainThread && process.argv[1] === fileURLToPath(import.meta.url)) main();
