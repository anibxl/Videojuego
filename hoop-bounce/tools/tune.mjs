// Réglage d'un passage chronométré : essaie toutes les fenêtres de départ d'une étape `waitCycle` du plan
// et affiche celles qui réussissent (█) ou échouent (·). Sert à choisir une fenêtre sûre, au centre d'une
// plage qui réussit (marge pour un vrai joueur).
//
// Usage : node tools/tune.mjs <niveau 1..50 | id> <n° du passage (1..)> [pas = 0.05] [--full]
//   --full : joue d'abord les passages précédents depuis le départ (état réel d'arrivée)

import { CONFIG } from '../src/config.js';
import { Game } from '../src/game/game.js';
import { LEVELS } from '../src/game/worlds.js';
import { Pilot, runPlan, GOAL_OF } from './route-check.mjs';

const DT = CONFIG.physics.fixedDt;
const FULL = process.argv.includes('--full');
const [arg, pArg, stepArg] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const li = /^\d+$/.test(arg) ? Number(arg) - 1 : LEVELS.findIndex((l) => l.id === arg);
const L = LEVELS[li];
const ps = L.passages[Number(pArg) - 1];
const step = Number(stepArg ?? 0.05);
const wi = ps.plan.findIndex((s) => s[0] === 'waitCycle');
if (wi < 0) throw new Error('pas de waitCycle dans ce passage');
const period = ps.plan[wi][1];
const goal = GOAL_OF(ps.goal);
let line = '';
const ok = [];
for (let a = 0; a < period - 1e-9; a += step) {
  const plan = ps.plan.map((s, i) => (i === wi ? ['waitCycle', period, a, a + step, ...s.slice(4)] : s));
  const g = new Game(CONFIG, FULL ? L : { ...L, spawn: { x: ps.start[0], y: ps.start[1] } });
  for (let i = 0; i < 36; i++) g.fixedUpdate(DT);
  const p = new Pilot(g);
  let pre = true;
  if (FULL) {
    for (const q of L.passages.slice(0, Number(pArg) - 1)) {
      if (!(runPlan(p, q.plan === 'shot' ? [['shot']] : q.plan) && !p.dead && (p.won || p.until(GOAL_OF(q.goal), 3)))) {
        pre = false;
        break;
      }
    }
  }
  if (!pre) throw new Error('un passage précédent échoue');
  const r = runPlan(p, plan) && !p.dead && (p.won || p.until(goal, 3));
  line += r ? '█' : '·';
  if (r) ok.push(+a.toFixed(2));
}
console.log(`${L.id} — ${ps.name} — période ${period}`);
console.log(line);
console.log(ok.length ? `réussit pour : ${ok.join(' ')}` : 'aucune fenêtre ne réussit');
