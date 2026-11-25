// Enregistre un VRAI fantôme pour les captures de la fiche : le pilote expert (tools/route-check.mjs) joue le
// niveau en entier et le GhostRecorder du jeu relève sa course, comme pour un joueur.
//   node store/tools/make-ghost.mjs <identifiant du niveau>   → store/tools/data/ghost-<id>.json
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CONFIG } from '../../src/config.js';
import { Game } from '../../src/game/game.js';
import { LEVELS } from '../../src/game/worlds.js';
import { GhostRecorder } from '../../src/game/ghost.js';
import { Pilot, runPlan, GOAL_OF } from '../../tools/route-check.mjs';

const id = process.argv[2] ?? 'city-02';
const level = LEVELS.find((l) => l.id === id);
const g = new Game(CONFIG, level);
const DT = CONFIG.physics.fixedDt;
const rec = new GhostRecorder(DT);
const step = g.fixedUpdate.bind(g);
g.fixedUpdate = (dt) => {
  step(dt);
  rec.step(g);
};
g.events.on('impact', (e) => rec.bounce(g.runTime, e.speed ?? 0));
const p = new Pilot(g);
for (let i = 0; i < 36; i++) g.fixedUpdate(DT);
for (const ps of level.passages ?? []) {
  const plan = ps.plan === 'shot' ? [['shot']] : ps.plan;
  if (!(runPlan(p, plan) && !p.dead && (p.won || p.until(GOAL_OF(ps.goal), 3)))) throw new Error(`pilote bloqué : ${ps.name}`);
}
const ghost = rec.finish({ time: g.runTime, stars: 3, deaths: 0 });
const out = join(dirname(fileURLToPath(import.meta.url)), 'data', `ghost-${id}.json`);
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(ghost));
console.log(`${out} : ${ghost.n} positions, ${ghost.t.toFixed(1)} s`);
