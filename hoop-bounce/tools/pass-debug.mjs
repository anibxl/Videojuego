// Débogage d'un passage : joue les passages précédents, puis le passage demandé ÉTAPE PAR ÉTAPE en
// affichant la position du ballon après chaque manœuvre (et la cause d'une mort éventuelle).
//
// Usage : node tools/pass-debug.mjs <niveau 1..50 | id> <n° du passage (1..)>
import { CONFIG } from '../src/config.js';
import { Game } from '../src/game/game.js';
import { LEVELS } from '../src/game/worlds.js';
import { Pilot, runPlan, GOAL_OF } from './route-check.mjs';

const DT = CONFIG.physics.fixedDt;
const [arg, pArg] = process.argv.slice(2);
const L = LEVELS[/^\d+$/.test(arg) ? Number(arg) - 1 : LEVELS.findIndex((l) => l.id === arg)];
const k = Number(pArg) - 1;
const g = new Game(CONFIG, L);
g.events.on('death', (e) => console.log(`   ✕ mort (${e?.cause ?? e?.kind ?? JSON.stringify(e)}) en x=${g.body.x.toFixed(2)} y=${g.body.y.toFixed(2)} t=${g.time.toFixed(2)}`));
for (let i = 0; i < 36; i++) g.fixedUpdate(DT);
const p = new Pilot(g);
for (const q of L.passages.slice(0, k)) {
  const ok = runPlan(p, q.plan === 'shot' ? [['shot']] : q.plan) && !p.dead && (p.won || p.until(GOAL_OF(q.goal), 3));
  if (!ok) throw new Error(`passage précédent en échec : ${q.name}`);
}
const ps = L.passages[k];
console.log(`${L.id} — ${ps.name} — départ x=${g.body.x.toFixed(2)} y=${g.body.y.toFixed(2)} t=${g.time.toFixed(2)}`);
for (const step of ps.plan === 'shot' ? [['shot']] : ps.plan) {
  const ok = runPlan(p, [step]);
  const b = g.body;
  console.log(`${ok ? ' ✓' : ' ✗'} ${JSON.stringify(step)} → x=${b.x.toFixed(2)} y=${b.y.toFixed(2)} vx=${b.vx.toFixed(2)} t=${g.time.toFixed(2)} niveau=${g.controller.level}`);
  if (!ok || p.dead) break;
}
const ok = !p.dead && (p.won || p.until(GOAL_OF(ps.goal), 3));
console.log(ok ? 'objectif atteint' : `objectif NON atteint : ${JSON.stringify(ps.goal)}`);
