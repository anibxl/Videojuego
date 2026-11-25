// Captures d'écran de la fiche Play Store, prises dans le VRAI jeu (1920 × 1080, paysage 16:9).
//
//   node store/tools/screenshots.mjs            français (par défaut)
//   node store/tools/screenshots.mjs en         anglais (ou es)
//
// Produit, pour chaque langue :
//   store/screenshots/raw/<langue>/NN-nom.jpg   capture brute du jeu
//   store/screenshots/<langue>/NN-nom.jpg       version « fiche » : titre marketing + capture encadrée
// Les 8 captures (gameplay, Trickshot, skins, Hoop Pass, Mode Fantôme, coffres, succès, collection) sont
// décrites dans store/SCREENSHOTS.md. Identité : store/BRAND.md (police Outfit, terrain de nuit, orange).
// Le jeu est servi localement ; un profil de joueur crédible est préparé (progression, pièces, objets, Pass,
// et un vrai fantôme enregistré par le pilote expert : store/tools/make-ghost.mjs).

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

// ─── Titres marketing ───────────────────────────────────────────────────────
const CAPTIONS = {
  fr: {
    gameplay: ['50 niveaux', '5 mondes à traverser en dribblant'],
    trickshot: ['50 Trickshots', 'du facile à l’impossible'],
    skins: ['Débloquez des skins', '63 objets à collectionner'],
    pass: ['Complétez le Hoop Pass', '50 niveaux de récompenses'],
    ghost: ['Défiez votre fantôme', 'battez votre meilleur temps'],
    chest: ['Ouvrez des coffres', 'jusqu’au légendaire'],
    achievements: ['Relevez des défis', '62 succès, dont des défis cachés'],
    collection: ['Votre collection', 'ballons, rebonds, traînées, paniers'],
  },
  en: {
    gameplay: ['50 levels', '5 worlds to dribble through'],
    trickshot: ['50 trickshots', 'from easy to impossible'],
    skins: ['Unlock skins', '63 items to collect'],
    pass: ['Complete the Hoop Pass', '50 tiers of rewards'],
    ghost: ['Race your ghost', 'beat your best time'],
    chest: ['Open chests', 'all the way to legendary'],
    achievements: ['Take on challenges', '62 achievements, hidden ones included'],
    collection: ['Your collection', 'balls, bounces, trails, hoops'],
  },
  es: {
    gameplay: ['50 niveles', '5 mundos para atravesar botando'],
    trickshot: ['50 trickshots', 'de fácil a imposible'],
    skins: ['Desbloquea skins', '63 objetos para coleccionar'],
    pass: ['Completa el Hoop Pass', '50 niveles de recompensas'],
    ghost: ['Reta a tu fantasma', 'supera tu mejor tiempo'],
    chest: ['Abre cofres', 'hasta el legendario'],
    achievements: ['Supera desafíos', '62 logros, incluidos desafíos ocultos'],
    collection: ['Tu colección', 'balones, rebotes, estelas, aros'],
  },
}[LANG];

// Couleur d'ambiance du cadre, par capture
const ACCENT = { gameplay: '255,122,47', trickshot: '63,224,255', skins: '255,194,61', pass: '255,201,77', ghost: '150,190,255', chest: '255,170,60', achievements: '180,107,255', collection: '255,122,47' };

const SCENES = [
  { n: '01', id: 'gameplay', world: 'volcano', level: 2, goal: true },
  { n: '02', id: 'trickshot', trick: 30 },
  { n: '03', id: 'skins', url: '/shop.html', wait: 1800, shop: 'ball-diamond' },
  { n: '04', id: 'pass', url: '/index.html?noboot#pass', wait: 2600 },
  { n: '05', id: 'ghost', world: 'city', level: 2, ghost: 'city-02' },
  { n: '07', id: 'achievements', url: '/index.html?noboot#succes', wait: 2600 },
  { n: '08', id: 'collection', url: '/index.html?noboot#collection', wait: 2600 },
  // Le coffre en dernier (sa fenêtre resterait ouverte sur les pages suivantes), ouvert depuis le calendrier
  { n: '06', id: 'chest', url: '/index.html?noboot#quotidien', wait: 2600, chest: 'legendary' },
];

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 960, height: 540 }, deviceScaleFactor: 2, locale: LOCALE });
// Pas de bannières ni de cartes « Succès débloqué », pas d'écran de chargement, pas d'aide du Pass
await ctx.addInitScript(() => {
  try {
    sessionStorage.setItem('hoopbounce.booted', '1');
  } catch {}
  document.addEventListener('DOMContentLoaded', () => {
    const s = document.createElement('style');
    s.textContent = '.live-banner,.ach-unlocks,.hp-howto,.toast,.start-card{display:none!important}';
    document.head.appendChild(s);
  });
});
const page = await ctx.newPage();

// ─── Profil de joueur ───────────────────────────────────────────────────────
const ghost = readFileSync(join(ROOT, 'store/tools/data/ghost-city-02.json'), 'utf8');
await page.goto(`${BASE}/index.html?noboot`);
await page.evaluate(async ({ lang, ghost }) => {
  localStorage.clear();
  const { Progress } = await import('/src/game/progress.js');
  const { WORLDS } = await import('/src/game/worlds.js');
  const { Wallet } = await import('/src/shared/wallet.js');
  const { Stats, dayKey } = await import('/src/shared/stats.js');
  const { HoopPass } = await import('/src/shared/pass.js');
  const { TrickshotProgress } = await import('/src/trickshot/progress.js');
  localStorage.setItem('hoopbounce.settings', JSON.stringify({ lang }));
  const pr = new Progress(WORLDS);
  const STARS = [3, 3, 2, 3, 3, 2, 3, 1, 3, 2];
  WORLDS.forEach((w, wi) => {
    const n = [10, 10, 6, 0, 0][wi];
    w.levels.slice(0, n).forEach((l, i) => pr.complete(l.id, STARS[i], 22 + i * 3.7));
  });
  for (let i = 0; i < 5; i++) pr.markSeen?.(i);
  const wallet = new Wallet();
  for (const id of ['ball-neon', 'ball-frost', 'ball-street', 'ball-galaxy', 'ball-gold', 'trail-streak', 'trail-flame', 'bounce-sparks', 'bounce-stars', 'goal-streamers', 'goal-fireworks']) wallet.grant(id);
  wallet.equip('ball-galaxy');
  wallet.equip('trail-flame');
  wallet.equip('bounce-stars');
  wallet.equip('goal-fireworks');
  wallet.addCoins(48250 - wallet.coins);
  wallet.addGems?.(140 - (wallet.gems ?? 0));
  localStorage.setItem('hoopbounce.daily', JSON.stringify({ v: 1, streak: 3, last: dayKey(), total: 3 }));
  localStorage.setItem('hoopbounce.dailyAuto', dayKey());
  localStorage.setItem('hoopbounce.tutorialDone', '1');
  const stats = new Stats();
  stats.add('games', 140, false);
  stats.add('trickshots', 18, false);
  stats.save();
  const pass = new HoopPass();
  pass.welcome?.(wallet);
  for (let i = 0; i < 42; i++) pass.addXp('level', { first: true });
  const ts = new TrickshotProgress({ total: 50 });
  for (let n = 1; n <= 18; n++) ts.record(n, { stars: n % 4 ? 3 : 2, score: 3000 + n * 37 });
  localStorage.setItem('hoopbounce.ghost.city-02', ghost);
}, { lang: LANG, ghost });

function shotPath(kind, s) {
  const dir = kind === 'raw' ? join(ROOT, 'store/screenshots/raw', LANG) : join(ROOT, 'store/screenshots', LANG);
  mkdirSync(dir, { recursive: true });
  return join(dir, `${s.n}-${s.id}.jpg`);
}

const FIX = JSON.parse(readFileSync(join(ROOT, 'tests/fixtures/trickshot.json'), 'utf8'));

for (const s of SCENES) {
  if (s.trick) {
    // Trickshot : la solution enregistrée est lancée, capture en plein vol
    await page.goto(`${BASE}/trickshot.html?level=${s.trick}&unlock=1`);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(1500);
    const f = FIX[s.trick];
    await page.evaluate(() => document.getElementById('intro-card')?.classList.remove('show'));
    await page.waitForFunction((r) => window.__ts.game.time >= r, f.release, { timeout: 8000 }).catch(() => {});
    await page.evaluate((f) => window.__ts.game.launch((f.angle * Math.PI) / 180, f.power), f);
    await page.waitForTimeout(650);
  } else if (s.url) {
    await page.goto(BASE + s.url);
    await page.evaluate(() => document.fonts.ready);
    if (s.shop) {
      await page.waitForTimeout(800);
      await page.locator(`[data-id="${s.shop}"], [data-item="${s.shop}"]`).first().click({ force: true }).catch(() => {});
    }
    await page.waitForTimeout(s.wait);
    if (s.chest) {
      await page.evaluate((k) => {
        window.__menu.fx.reveal({ title: '', coins: 500, gems: 0, item: null, chest: k }); // (attend un clic : on ne l'attend pas)
      }, s.chest);
      await page.waitForTimeout(520 + 1700 + 260);
    }
  } else {
    await page.goto(`${BASE}/play.html?world=${s.world}&level=${s.level}`);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(1200);
    // Fermeture normale de l'introduction (comme un toucher) : les commandes s'activent
    await page.evaluate(() => window.__game.hideIntro());
    await page.waitForTimeout(150);
    if (s.ghost) {
      // Le fantôme (le meilleur essai) part avec une petite avance ; le joueur roule derrière lui
      await page.waitForTimeout(450);
      await page.keyboard.down('ArrowRight');
      await page.waitForTimeout(1150);
      await page.keyboard.up('ArrowRight');
      await page.waitForTimeout(120);
    } else {
      await page.evaluate(() => {
        const g = window.__game;
        const L = g.game.level;
        const b = g.game.body;
        b.x = L.hoop.centerX - 0.15;
        b.y = L.hoop.rimY + 1.6;
        b.vx = 0.2;
        b.vy = -1;
        g.camera.snap(b.x, b.y - 1.2, L.bounds);
      });
      await page.waitForTimeout(520);
    }
  }
  await page.screenshot({ path: shotPath('raw', s), type: 'jpeg', quality: 90 });
}

// ─── Versions « fiche » : titre marketing + capture encadrée ───────────────
// Police intégrée au cadre (une page sans origine ne peut pas charger une police d'une autre origine)
const fonts = `@font-face{font-family:Outfit;src:url(data:font/woff2;base64,${readFileSync(join(ROOT, 'assets/fonts/outfit.woff2')).toString('base64')}) format("woff2");font-weight:100 900}`;
const icon = Buffer.from(readFileSync(join(ROOT, 'store/src/icon.svg'))).toString('base64');
const framer = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
for (const s of SCENES) {
  const img = readFileSync(shotPath('raw', s)).toString('base64');
  const [title, sub] = CAPTIONS[s.id];
  const a = ACCENT[s.id];
  await framer.setContent(`<html><head><style>${fonts}
    body{margin:0;width:1920px;height:1080px;overflow:hidden;font-family:Outfit,sans-serif;color:#f2f5ff;
      background:radial-gradient(ellipse 55% 45% at 50% 100%,rgba(${a},.30),transparent 70%),radial-gradient(ellipse 50% 60% at 0% 0%,rgba(60,100,230,.24),transparent 70%),radial-gradient(ellipse 40% 50% at 100% 0%,rgba(${a},.14),transparent 70%),linear-gradient(180deg,#0d1838,#050913)}
    .cap{position:absolute;left:0;right:0;top:46px;text-align:center}
    .cap h1{margin:0;font-weight:800;font-size:76px;line-height:1;letter-spacing:-.025em;text-shadow:0 4px 30px rgba(2,6,20,.6)}
    .cap p{margin:14px 0 0;font-weight:700;font-size:34px;letter-spacing:.01em;background:linear-gradient(180deg,#ffc08a,#ff7a2f 70%);-webkit-background-clip:text;background-clip:text;color:transparent}
    .shot{position:absolute;left:50%;top:236px;width:1440px;height:810px;margin-left:-720px;border-radius:34px;overflow:hidden;
      box-shadow:0 0 0 7px #0e1630,0 0 0 9px rgba(255,255,255,.14),0 34px 90px rgba(2,6,20,.7),0 0 110px rgba(${a},.28)}
    .shot img{width:100%;height:100%;display:block}
    .brand{position:absolute;left:54px;top:50px;display:flex;align-items:center;gap:14px;font-weight:800;font-size:26px;letter-spacing:-.01em;text-transform:uppercase}
    .brand img{width:58px;height:58px;border-radius:14px;box-shadow:0 6px 18px rgba(2,6,20,.5)}
    .brand span{color:#ff7a2f}
    </style></head><body>
    <div class="brand"><img src="data:image/svg+xml;base64,${icon}">Hoop&nbsp;<span>Bounce</span></div>
    <div class="cap"><h1>${title}</h1><p>${sub}</p></div>
    <div class="shot"><img src="data:image/jpeg;base64,${img}"></div></body></html>`);
  await framer.evaluate(() => document.fonts.ready);
  await framer.waitForTimeout(150);
  await framer.screenshot({ path: shotPath('framed', s), type: 'jpeg', quality: 90 });
}

await browser.close();
server.close();
console.log(`Captures ${LANG} : store/screenshots/${LANG}/ et store/screenshots/raw/${LANG}/`);
