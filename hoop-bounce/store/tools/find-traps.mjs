// Repère, pour les captures de la fiche, les endroits des niveaux où le plus de pièges différents sont visibles à la
// fois (fenêtre de 17 u de large). node store/tools/find-traps.mjs [monde]
import { LEVELS } from '../../src/game/worlds.js';

const W = 17;
const world = process.argv[2];
const SKIP = new Set(['solids', 'stars', 'hints', 'checkpoints', 'passages', 'switches', 'doors', 'trampolines', 'movers', 'teleporters', 'crates', 'mushrooms', 'vines', 'fans']);
const xOf = (e) => e.x ?? e.x1 ?? e.cx ?? e.a?.x ?? e.points?.[0]?.x;
const out = [];
for (const [i, l] of LEVELS.entries()) {
  if (world && l.world !== world) continue;
  const items = [];
  for (const [k, v] of Object.entries(l)) {
    if (!Array.isArray(v) || SKIP.has(k)) continue;
    for (const e of v) {
      const x = xOf(e);
      if (typeof x === 'number') items.push({ k, x });
    }
  }
  const max = Math.max(...items.map((e) => e.x), 0);
  for (let x0 = 0; x0 < max; x0 += 1) {
    const inside = items.filter((e) => e.x >= x0 && e.x < x0 + W);
    const kinds = new Set(inside.map((e) => e.k));
    out.push({ n: i + 1, id: l.id, world: l.world, x0, kinds: kinds.size, count: inside.length, list: [...kinds].join(',') });
  }
}
const best = {};
for (const o of out) {
  const key = o.world;
  if (!best[key]) best[key] = [];
  best[key].push(o);
}
for (const [w, list] of Object.entries(best)) {
  list.sort((a, b) => b.kinds - a.kinds || b.count - a.count);
  const seen = new Set();
  console.log(`== ${w}`);
  for (const o of list) {
    if (seen.has(o.id)) continue;
    seen.add(o.id);
    console.log(`  ${o.n} ${o.id} x0=${o.x0} sortes=${o.kinds} n=${o.count} : ${o.list}`);
    if (seen.size >= 6) break;
  }
}
