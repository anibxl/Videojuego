// Plan d'un niveau (outil de level design) : géométrie, pièges, étoiles, panier et TRAJECTOIRE du pilote
// (solution experte jouée du départ au panier). Écrit un SVG, puis une image PNG (Chromium de Playwright).
//
// Usage : node tools/level-map.mjs <niveau 1..50 | id> [dossier de sortie]

import { writeFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { CONFIG } from '../src/config.js';
import { Game } from '../src/game/game.js';
import { LEVELS } from '../src/game/worlds.js';
import { Pilot, runPlan, GOAL_OF } from './route-check.mjs';

const DT = CONFIG.physics.fixedDt;
const arg = process.argv[2] ?? '1';
const outDir = process.argv[3] ?? '.';
const index = /^\d+$/.test(arg) ? Number(arg) - 1 : LEVELS.findIndex((l) => l.id === arg);
const L = LEVELS[index];

// Trajectoire du pilote
const g = new Game(CONFIG, L);
const p = new Pilot(g);
const trail = [];
const deaths = [];
g.events.on('death', () => deaths.push([g.body.x, g.body.y]));
const step0 = g.fixedUpdate.bind(g);
let k = 0;
g.fixedUpdate = (dt) => {
  step0(dt);
  if (k++ % 4 === 0) trail.push([g.body.x, g.body.y]);
};
let failed = null;
for (let i = 0; i < 36; i++) g.fixedUpdate(DT);
for (const ps of L.passages ?? []) {
  const ok = runPlan(p, ps.plan === 'shot' ? [['shot']] : ps.plan) && !p.dead && (p.won || p.until(GOAL_OF(ps.goal), 3));
  if (!ok) {
    failed = ps.name;
    break;
  }
}

const S = 22; // px par unité
const { minX, maxX, minY } = L.bounds;
const maxY = Math.max(L.bounds.maxY, ...trail.map((t) => t[1] + 1));
const W = (maxX - minX) * S;
const H = (maxY - minY) * S;
const X = (x) => ((x - minX) * S).toFixed(1);
const Y = (y) => ((maxY - y) * S).toFixed(1);
const rect = (x, y, w, h, fill, extra = '') => `<rect x="${X(x)}" y="${Y(y + h)}" width="${(w * S).toFixed(1)}" height="${(h * S).toFixed(1)}" fill="${fill}" ${extra}/>`;
const out = [];
const STYLE = { ground: '#3a4660', wall: '#262f45', block: '#56637f', ice: '#9fd8ff', snow: '#dfe9f5', rock: '#5a3a30', wood: '#7a5530' };
for (const s of L.solids ?? []) {
  if (s.points) out.push(`<polygon points="${s.points.map((q) => `${X(q.x)},${Y(q.y)}`).join(' ')}" fill="${STYLE[s.style] ?? '#56637f'}"/>`);
  else out.push(rect(s.x, s.y, s.w, s.h, STYLE[s.style] ?? '#56637f'));
}
for (const s of L.planks ?? []) out.push(rect(s.x1, s.y - 0.15, s.x2 - s.x1, 0.15, '#a0703a'));
for (const s of L.spikes ?? []) out.push(rect(s.x, s.dir === 'down' ? s.y - 0.5 : s.y, s.w, 0.5, '#ff4d5e'));
for (const s of L.lava ?? []) out.push(rect(s.x, s.y - 0.6, s.w, 0.6, '#ff7a1a'));
for (const s of L.water ?? []) out.push(rect(s.x, s.y - 0.6, s.w, 0.6, '#3a9cff'));
for (const s of L.trampolines ?? []) out.push(rect(s.x, s.y, s.w, 0.3, '#3fe08a'));
for (const s of L.fans ?? []) out.push(rect(s.x, s.y, s.w, s.h, 'rgba(120,220,255,0.18)'), rect(s.x, s.y, s.w, 0.3, '#78dcff'));
for (const s of L.movers ?? []) out.push(rect(s.x, s.y, s.w, s.h, '#c99a4a'), rect(s.x + s.path.dx, s.y + s.path.dy, s.w, s.h, 'none', 'stroke="#c99a4a" stroke-dasharray="4 3"'));
for (const s of L.fallers ?? []) out.push(rect(s.x, s.y, s.w, s.h, '#d0a060', 'stroke="#fff" stroke-dasharray="2 2"'));
for (const s of L.blinkers ?? []) out.push(rect(s.x, s.y, s.w, s.h, 'rgba(180,140,255,0.6)', 'stroke="#b48cff" stroke-dasharray="3 2"'));
for (const s of L.crumbles ?? []) out.push(rect(s.x, s.y, s.w, s.h, '#8a5a3a', 'stroke="#ffb070" stroke-dasharray="2 2"'));
for (const s of L.crates ?? []) out.push(rect(s.x, s.y, s.w ?? 1.2, s.h ?? 1.2, '#b07a3a'));
for (const s of L.doors ?? []) out.push(rect(s.x, s.y, s.w, s.h, '#7a4a2a', 'stroke="#ffcc66"'));
for (const s of L.switches ?? []) out.push(rect(s.x, s.y, s.w, 0.25, '#ffd24d'));
for (const s of L.saws ?? []) out.push(`<circle cx="${X(s.x)}" cy="${Y(s.y)}" r="${s.r * S}" fill="#ff4d5e" opacity=".8"/><line x1="${X(s.x)}" y1="${Y(s.y)}" x2="${X(s.x + (s.path?.dx ?? 0))}" y2="${Y(s.y + (s.path?.dy ?? 0))}" stroke="#ff4d5e" stroke-dasharray="3 3"/>`);
for (const s of L.lasers ?? []) out.push(`<line x1="${X(s.x1)}" y1="${Y(s.y1)}" x2="${X(s.x2)}" y2="${Y(s.y2)}" stroke="#ff3070" stroke-width="3" stroke-dasharray="6 3"/>`);
for (const s of L.crushers ?? []) out.push(rect(s.x, s.bottom, s.w, s.top - s.bottom, 'rgba(255,80,80,0.12)'), rect(s.x, s.top, s.w, s.h ?? 1.2, '#9a4a4a'));
for (const s of L.cannons ?? []) out.push(`<circle cx="${X(s.x)}" cy="${Y(s.y)}" r="${0.4 * S}" fill="#444" stroke="#ff9a3d" stroke-width="2"/>`);
for (const s of L.boulders ?? []) out.push(`<line x1="${X(s.x1)}" y1="${Y(s.y + s.r)}" x2="${X(s.x2)}" y2="${Y(s.y + s.r)}" stroke="#d0d8e8" stroke-width="${s.r * S * 2}" opacity=".25"/>`);
for (const s of L.geysers ?? []) out.push(rect(s.x, s.y, s.w, s.h, 'rgba(255,120,40,0.25)'));
for (const s of L.rockfalls ?? []) out.push(`<line x1="${X(s.x)}" y1="${Y(s.y)}" x2="${X(s.x)}" y2="${Y(0)}" stroke="#a87" stroke-dasharray="2 4"/>`);
for (const s of L.icicles ?? []) out.push(`<polygon points="${X(s.x - 0.25)},${Y(s.y)} ${X(s.x + 0.25)},${Y(s.y)} ${X(s.x)},${Y(s.y - s.len)}" fill="#cfefff"/>`);
for (const s of L.winds ?? []) out.push(rect(s.x, s.y, s.w, s.h, s.force > 0 ? 'rgba(200,230,255,0.12)' : 'rgba(255,200,200,0.12)'));
for (const s of L.teleporters ?? []) out.push(`<circle cx="${X(s.a.x)}" cy="${Y(s.a.y)}" r="${(s.r ?? 0.8) * S}" fill="none" stroke="#b48cff" stroke-width="3"/><circle cx="${X(s.b.x)}" cy="${Y(s.b.y)}" r="${(s.r ?? 0.8) * S}" fill="none" stroke="#e0c8ff" stroke-width="2" stroke-dasharray="3 2"/>`);
for (const s of L.vines ?? []) out.push(`<line x1="${X(s.x)}" y1="${Y(s.y)}" x2="${X(s.x)}" y2="${Y(s.y - s.len)}" stroke="#4a9a4a" stroke-width="3"/>`);
for (const s of L.mushrooms ?? []) out.push(rect(s.x - s.w / 2, s.y - 0.3, s.w, 0.3, '#ff5a8a'));
for (const s of L.branches ?? []) out.push(rect(s.x1, s.y - 0.15, s.x2 - s.x1, 0.2, '#6a4a2a'));
for (const s of L.logs ?? []) out.push(`<circle cx="${X(s.x)}" cy="${Y(s.y)}" r="${s.r * S}" fill="#8a5a30"/>`);
for (const s of L.maces ?? []) out.push(`<line x1="${X(s.x)}" y1="${Y(s.y)}" x2="${X(s.x)}" y2="${Y(s.y - s.len)}" stroke="#888"/><circle cx="${X(s.x)}" cy="${Y(s.y - s.len)}" r="${s.r * S}" fill="#777"/>`);
for (const s of L.asteroids ?? []) out.push(`<circle cx="${X(s.x)}" cy="${Y(s.y)}" r="${s.r * S}" fill="#7a6a9a"/>`);
for (const s of L.gravityZones ?? []) out.push(rect(s.x, s.y, s.w, s.h, 'rgba(180,140,255,0.15)', 'stroke="#b48cff" stroke-dasharray="4 4"'));
for (const s of L.magnets ?? []) out.push(`<circle cx="${X(s.x)}" cy="${Y(s.y)}" r="${s.radius * S}" fill="rgba(120,80,255,0.12)"/>`);
for (const s of L.checkpoints ?? []) out.push(`<line x1="${X(s.x)}" y1="${Y(s.y)}" x2="${X(s.x)}" y2="${Y(s.y + 1.4)}" stroke="#3fe0b8" stroke-width="3"/>`);
for (const s of L.stars ?? []) out.push(`<text x="${X(s.x)}" y="${Y(s.y)}" font-size="20" text-anchor="middle" dominant-baseline="middle" fill="#ffd24d">★</text>`);
const h = L.hoop;
out.push(`<circle cx="${X(h.x + 0.45)}" cy="${Y(h.y)}" r="${0.46 * S}" fill="none" stroke="#ff7a2f" stroke-width="4"/>`);
out.push(`<polyline points="${trail.map(([x, y]) => `${X(x)},${Y(y)}`).join(' ')}" fill="none" stroke="#7fffd0" stroke-width="2" opacity=".85"/>`);
for (const [x, y] of deaths) out.push(`<text x="${X(x)}" y="${Y(y)}" font-size="22" fill="#ff3050" text-anchor="middle">✕</text>`);
const title = `${index + 1} · ${L.id} · ${failed ? `ÉCHEC : ${failed}` : `ok ${g.time.toFixed(1)} s`}`;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H + 30}" viewBox="0 -30 ${W} ${H + 30}"><rect x="0" y="-30" width="${W}" height="${H + 30}" fill="#0c1222"/><text x="10" y="-10" font-family="sans-serif" font-size="18" fill="${failed ? '#ff6070' : '#cfe'}">${title}</text>${out.join('')}</svg>`;
mkdirSync(outDir, { recursive: true });
const base = join(outDir, `map-${String(index + 1).padStart(2, '0')}`);
writeFileSync(`${base}.svg`, svg);
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: Math.ceil(W), height: Math.ceil(H + 30) } });
await page.setContent(`<html><body style="margin:0">${svg}</body></html>`);
await page.screenshot({ path: `${base}.png` });
await browser.close();
console.log(title, '→', `${base}.png`);
