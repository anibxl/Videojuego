// Captures d'écran de la fiche Play Store, prises dans le vrai jeu (1920 × 1080, paysage 16:9).
//
//   node store/tools/screenshots.mjs            français (par défaut)
//   node store/tools/screenshots.mjs en         anglais (ou es)
//
// Produit, pour chaque langue :
//   store/screenshots/raw/<langue>/NN-nom.jpg   capture brute du jeu
//   store/screenshots/<langue>/NN-nom.jpg       version « fiche » : légende + capture dans un cadre
// Le contenu de chaque capture est décrit dans store/SCREENSHOTS.md.
// Le jeu est servi localement ; un profil de joueur crédible est préparé (pièces, étoiles, missions…).

import { createServer } from 'node:http';
import { readFileSync, mkdirSync, existsSync } from 'node:fs';
import { extname, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
let chromium;
try {
  ({ chromium } = require('playwright'));
} catch {
  ({ chromium } = await import('playwright'));
}

const LANG = process.argv[2] ?? 'fr';
const LOCALE = { fr: 'fr-FR', en: 'en-US', es: 'es-ES' }[LANG] ?? 'fr-FR';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json' };

const server = createServer((req, res) => {
  let path = join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (path.endsWith('/')) path += 'index.html';
  if (!path.startsWith(ROOT) || !existsSync(path)) return res.writeHead(404).end();
  res.writeHead(200, { 'content-type': TYPES[extname(path)] ?? 'application/octet-stream' }).end(readFileSync(path));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const BASE = `http://127.0.0.1:${server.address().port}`;

// ─── Légendes (version « fiche ») ───────────────────────────────────────────
const CAPTIONS = {
  fr: {
    gameplay: ['Dribble, rebondis,', 'marque !'],
    menu: ['Un vrai jeu de basket', 'de plateforme'],
    city: ['Monde 1 · La Ville', 'néons, scies et toits'],
    snow: ['Monde 2 · La Neige', 'glace et stalactites'],
    volcano: ['Monde 3 · Le Volcan', 'lave et geysers'],
    forest: ['Monde 4 · La Forêt', 'lianes et rivières'],
    space: ['Monde 5 · L’Espace', 'astéroïdes et trous noirs'],
    shop: ['51 objets', 'à collectionner'],
    missions: ['3 nouvelles missions', 'chaque jour'],
    daily: ['Une récompense', 'chaque jour'],
  },
  en: {
    gameplay: ['Dribble, bounce,', 'score!'],
    menu: ['A real basketball', 'platformer'],
    city: ['World 1 · The City', 'neon, saws and rooftops'],
    snow: ['World 2 · The Snow', 'ice and icicles'],
    volcano: ['World 3 · The Volcano', 'lava and geysers'],
    forest: ['World 4 · The Forest', 'vines and rivers'],
    space: ['World 5 · Space', 'asteroids and black holes'],
    shop: ['51 items', 'to collect'],
    missions: ['3 new missions', 'every day'],
    daily: ['A reward', 'every day'],
  },
  es: {
    gameplay: ['¡Bota, rebota', 'y encesta!'],
    menu: ['Un auténtico juego de', 'plataformas de baloncesto'],
    city: ['Mundo 1 · La Ciudad', 'neones, sierras y tejados'],
    snow: ['Mundo 2 · La Nieve', 'hielo y estalactitas'],
    volcano: ['Mundo 3 · El Volcán', 'lava y géiseres'],
    forest: ['Mundo 4 · El Bosque', 'lianas y ríos'],
    space: ['Mundo 5 · El Espacio', 'asteroides y agujeros negros'],
    shop: ['51 objetos', 'para coleccionar'],
    missions: ['3 misiones nuevas', 'cada día'],
    daily: ['Una recompensa', 'cada día'],
  },
}[LANG];

// Couleur d'ambiance du cadre, par capture
const ACCENT = { gameplay: '255,122,47', menu: '255,122,47', city: '96,190,255', snow: '150,210,255', volcano: '255,110,50', forest: '110,220,140', space: '180,107,255', shop: '255,201,77', missions: '63,224,184', daily: '255,201,77' };

// ─── Scènes ─────────────────────────────────────────────────────────────────
// level : niveau à ouvrir ; at : position du ballon (fraction de la longueur du niveau) ; goal : tir au panier
const SCENES = [
  { n: '01', id: 'gameplay', world: 'city', level: 4, goal: true },
  { n: '02', id: 'menu', url: '/index.html?noboot', wait: 2600 },
  { n: '03', id: 'city', world: 'city', level: 4, at: 0.55, y: 5.2, vx: 3, vy: 4 },
  { n: '04', id: 'snow', world: 'snow', level: 3, at: 0.33, y: 3.4, vx: 3, vy: 1.5 },
  { n: '05', id: 'volcano', world: 'volcano', level: 7, at: 0.4, y: 5, vx: 2.5, vy: 3 },
  { n: '06', id: 'forest', world: 'forest', level: 3, at: 0.4, y: 5, vx: 2.5, vy: 3 },
  { n: '07', id: 'space', world: 'space', level: 4, at: 0.42, y: 5.4, vx: 2, vy: 2.5 },
  { n: '08', id: 'shop', url: '/shop.html', wait: 1800, shop: true },
  { n: '09', id: 'missions', url: '/index.html?noboot#missions', wait: 2600 },
  { n: '10', id: 'daily', url: '/index.html?noboot#quotidien', wait: 2600 },
];

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 960, height: 540 }, deviceScaleFactor: 2, locale: LOCALE });
// Pas de bannières « Succès débloqué » ni d'écran de chargement dans les captures
await ctx.addInitScript(() => {
  try {
    sessionStorage.setItem('hoopbounce.booted', '1');
  } catch {}
  document.addEventListener('DOMContentLoaded', () => {
    const s = document.createElement('style');
    s.textContent = '.live-banner{display:none!important}';
    document.head.appendChild(s);
  });
});
const page = await ctx.newPage();

// ─── Profil de joueur ───────────────────────────────────────────────────────
await page.goto(`${BASE}/index.html?noboot`);
await page.evaluate(async () => {
  localStorage.clear();
  const { Progress } = await import('/src/game/progress.js');
  const { WORLDS } = await import('/src/game/worlds.js');
  const { Wallet } = await import('/src/shared/wallet.js');
  const { Missions } = await import('/src/shared/missions.js');
  const { Stats, dayKey } = await import('/src/shared/stats.js');
  const pr = new Progress(WORLDS);
  const STARS = [3, 3, 2, 3, 3, 2, 3, 1, 3, 2];
  WORLDS.forEach((w, wi) => {
    const n = [10, 10, 4, 0, 0][wi];
    w.levels.slice(0, n).forEach((l, i) => pr.complete(l.id, STARS[i], 20 + i * 3.7));
  });
  for (let i = 0; i < 5; i++) pr.markSeen?.(i);
  const wallet = new Wallet();
  for (const id of ['ball-neon', 'ball-frost', 'ball-street', 'trail-streak', 'trail-flame', 'bounce-sparks', 'bounce-stars', 'goal-streamers', 'goal-fireworks']) wallet.grant(id);
  wallet.equip('trail-flame');
  wallet.equip('bounce-stars');
  wallet.equip('goal-fireworks');
  wallet.addCoins(48250 - wallet.coins);
  const y = new Date(Date.now() - 864e5);
  localStorage.setItem('hoopbounce.daily', JSON.stringify({ v: 1, streak: 2, last: dayKey(y), total: 2 }));
  localStorage.setItem('hoopbounce.dailyAuto', dayKey());
  localStorage.setItem('hoopbounce.tutorialDone', '1');
  const m = new Missions();
  m.ensure(['city', 'snow', 'volcano']);
  const stats = new Stats();
  m.data.list.forEach((mi, i) => stats.add(mi.stat, Math.max(1, Math.round(mi.target * [1, 0.6, 0.3][i])), false));
  stats.save();
});

function shotPath(kind, s) {
  const dir = kind === 'raw' ? join(ROOT, 'store/screenshots/raw', LANG) : join(ROOT, 'store/screenshots', LANG);
  mkdirSync(dir, { recursive: true });
  return join(dir, `${s.n}-${s.id}.jpg`);
}

for (const s of SCENES) {
  if (s.url) {
    await page.goto(BASE + s.url);
    await page.evaluate(() => document.fonts.ready);
    if (s.shop) {
      // Un bel article épique sélectionné dans l'aperçu
      await page.waitForTimeout(800);
      await page.locator('[data-id="ball-galaxy"], [data-item="ball-galaxy"]').first().click({ force: true }).catch(() => {});
    }
    await page.waitForTimeout(s.wait);
  } else {
    await page.goto(`${BASE}/play.html?world=${s.world}&level=${s.level}`);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(1200);
    await page.evaluate((s) => {
      const g = window.__game;
      g.state.intro = false;
      g.hideIntro?.();
      document.querySelectorAll('.intro').forEach((el) => el.classList.add('hidden'));
      const L = g.game.level;
      const b = g.game.body;
      if (s.goal) {
        b.x = L.hoop.centerX - 0.15;
        b.y = L.hoop.rimY + 1.6;
        b.vx = 0.2;
        b.vy = -1;
      } else {
        b.x = L.bounds.minX + (L.bounds.maxX - L.bounds.minX) * s.at;
        b.y = s.y;
        b.vx = s.vx;
        b.vy = s.vy;
      }
      g.camera.snap(b.x, b.y + (s.goal ? -1.2 : 0), L.bounds);
    }, s);
    await page.waitForTimeout(s.goal ? 520 : 380);
  }
  await page.screenshot({ path: shotPath('raw', s), type: 'jpeg', quality: 90 });
}

// ─── Versions « fiche » : légende + capture encadrée ───────────────────────
const fonts = `@font-face{font-family:Unbounded;src:url(${BASE}/assets/fonts/unbounded.woff2) format("woff2");font-weight:200 900}@font-face{font-family:Outfit;src:url(${BASE}/assets/fonts/outfit.woff2) format("woff2");font-weight:100 900}`;
const framer = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
for (const s of SCENES) {
  const img = readFileSync(shotPath('raw', s)).toString('base64');
  const [l1, l2] = CAPTIONS[s.id];
  const a = ACCENT[s.id];
  await framer.setContent(`<html><head><style>${fonts}
    body{margin:0;width:1920px;height:1080px;overflow:hidden;font-family:Outfit,sans-serif;color:#f2f5ff;
      background:radial-gradient(ellipse 60% 50% at 50% 100%,rgba(${a},.28),transparent 70%),radial-gradient(ellipse 50% 60% at 0% 0%,rgba(60,100,230,.22),transparent 70%),linear-gradient(180deg,#0a1230,#04070f)}
    .cap{position:absolute;left:0;right:0;top:44px;text-align:center;font-family:Unbounded,sans-serif;font-weight:800;font-size:58px;line-height:1.08;letter-spacing:-.01em}
    .cap b{display:block;font-weight:700;font-size:40px;margin-top:6px;background:linear-gradient(180deg,#ffb067,#ff7a2f 60%,#f05312);-webkit-background-clip:text;background-clip:text;color:transparent}
    .shot{position:absolute;left:50%;top:232px;width:1440px;height:810px;margin-left:-720px;border-radius:30px;overflow:hidden;
      box-shadow:0 0 0 6px #10182e,0 0 0 8px rgba(255,255,255,.12),0 30px 80px rgba(0,0,0,.6),0 0 90px rgba(${a},.25)}
    .shot img{width:100%;height:100%;display:block}
    .brand{position:absolute;left:56px;top:56px;font-family:Unbounded,sans-serif;font-weight:800;font-size:26px}
    .brand span{color:#ff7a2f}
    </style></head><body>
    <div class="brand">Hoop<span>Bounce</span></div>
    <div class="cap">${l1}<b>${l2}</b></div>
    <div class="shot"><img src="data:image/jpeg;base64,${img}"></div></body></html>`);
  await framer.evaluate(() => document.fonts.ready);
  await framer.waitForTimeout(100);
  await framer.screenshot({ path: shotPath('framed', s), type: 'jpeg', quality: 88 });
}

await browser.close();
server.close();
console.log(`Captures ${LANG} : store/screenshots/${LANG}/ et store/screenshots/raw/${LANG}/`);
