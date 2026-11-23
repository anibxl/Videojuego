// Vérification d'un niveau EN ENTIER : le « pilote » (tools/route-check.mjs) joue tous les passages à la
// suite dans une seule partie, depuis le départ jusqu'au panier, comme un joueur. On obtient :
//   - la preuve que le niveau se termine sans téléportation entre les passages (aucun blocage) ;
//   - la durée de la solution experte (temps de jeu) et la longueur du niveau.
// La durée d'un vrai joueur est estimée à ~1,4 × la durée experte (hésitations, observation, une ou deux
// erreurs) ; les objectifs de durée par monde sont vérifiés sur cette estimation.
//
// Usage : node tools/level-run.mjs [niveau 1..50 | id] [--verbose]

import { fileURLToPath } from 'node:url';
import { CONFIG } from '../src/config.js';
import { Game } from '../src/game/game.js';
import { LEVELS, WORLDS } from '../src/game/worlds.js';
import { Pilot, runPlan, GOAL_OF } from './route-check.mjs';

const DT = CONFIG.physics.fixedDt;
export const PLAYER_FACTOR = 1.4;
/** Durées visées pour un joueur (secondes), par monde. */
export const TARGETS = { city: [20, 30], snow: [30, 40], volcano: [40, 50], forest: [45, 60], space: [50, 70] };

/** Joue le niveau en entier. @returns {{ ok, time, failedAt, deaths }} */
export function runLevel(index, { verbose = false } = {}) {
  const level = LEVELS[index];
  const g = new Game(CONFIG, level);
  const p = new Pilot(g);
  let deaths = 0;
  g.events.on('death', () => deaths++);
  for (let i = 0; i < 36; i++) g.fixedUpdate(DT);
  const passages = level.passages ?? [];
  for (const [k, ps] of passages.entries()) {
    const goal = GOAL_OF(ps.goal);
    const plan = ps.plan === 'shot' ? [['shot']] : ps.plan;
    const t0 = g.time;
    const ok = runPlan(p, plan) && !p.dead && (p.won || p.until(goal, 3));
    if (verbose) console.log(`   ${ok ? '✓' : '✗'} ${ps.name}  (${(g.time - t0).toFixed(1)} s)`);
    if (!ok) return { ok: false, time: g.time, failedAt: k, deaths, name: ps.name };
  }
  return { ok: g.state === 'won' || p.won, time: g.time, failedAt: null, deaths };
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  const arg = process.argv.slice(2).find((a) => !a.startsWith('--'));
  const verbose = process.argv.includes('--verbose');
  const only = arg === undefined ? null : /^\d+$/.test(arg) ? Number(arg) - 1 : LEVELS.findIndex((l) => l.id === arg);
  let fails = 0;
  let total = 0;
  for (const [i, l] of LEVELS.entries()) {
    if (only !== null && i !== only) continue;
    const r = runLevel(i, { verbose });
    const [lo, hi] = TARGETS[l.world];
    const est = r.time * PLAYER_FACTOR;
    const inRange = est >= lo && est <= hi;
    total += est;
    if (!r.ok) fails++;
    const len = l.bounds.maxX - l.bounds.minX;
    console.log(`${String(i + 1).padStart(2)} ${l.id.padEnd(16)} ${r.ok ? '✓' : `✗ bloqué à « ${r.name} »`}  expert ${r.time.toFixed(1).padStart(5)} s → joueur ~${est.toFixed(0).padStart(3)} s ${inRange ? '' : `(visé ${lo}–${hi})`}  long. ${len.toFixed(0)} u  passages ${l.passages?.length ?? 0}  ${l.difficulty ?? ''}`);
  }
  if (only === null) console.log(`\n${fails ? `⚠ ${fails} niveau(x) en échec` : 'Tous les niveaux se terminent ✓'} — durée totale estimée ~${(total / 60).toFixed(0)} min`);
  void WORLDS;
}
