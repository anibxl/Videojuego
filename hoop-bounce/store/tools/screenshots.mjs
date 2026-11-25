// Captures d'écran de la fiche Play Store, prises dans le VRAI jeu (1920 × 1080, paysage 16:9).
//
//   node store/tools/screenshots.mjs            français (par défaut)
//   node store/tools/screenshots.mjs en         anglais (ou es)
//
// Produit, pour chaque langue :
//   store/screenshots/raw/<langue>/NN-nom.jpg   capture brute du jeu
//   store/screenshots/<langue>/NN-nom.jpg       version « fiche » : titre marketing + capture encadrée
// Les 18 captures (gameplay, les 5 mondes et leurs pièges — 2 vues chacun —, Trickshot, Hoop Pass, skins,
// Mode Fantôme, coffres, succès, collection) sont décrites dans store/SCREENSHOTS.md, avec leur répartition entre
// téléphone et tablettes (8 au plus par type d'appareil). Identité : store/BRAND.md (police Outfit, terrain de nuit, orange).
// Les fichiers du jeu sont servis par Playwright (sans serveur) ; un profil de joueur crédible est préparé (progression, pièces, objets, Pass,
// et un vrai fantôme enregistré par le pilote expert : store/tools/make-ghost.mjs).

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

const BASE = 'http://hoop.test';

// ─── Titres marketing ───────────────────────────────────────────────────────
const CAPTIONS = {
  fr: {
    gameplay: ['50 niveaux', '5 mondes à traverser en dribblant'],
    'city-a': ['Monde 1 · La Ville', 'presses et lasers : trouvez le bon moment'],
    'snow-a': ['Monde 2 · La Neige', 'des blocs de glace qui écrasent tout'],
    'volcano-a': ['Monde 3 · Le Volcan', 'geysers de feu et dalles qui s’effondrent'],
    'forest-a': ['Monde 4 · La Forêt', 'rondins à pointes et troncs qui roulent'],
    'space-a': ['Monde 5 · L’Espace', 'trou noir et plateformes qui clignotent'],
    'city-b': ['Les scies de la Ville', 'des lames qui montent et descendent'],
    'snow-b': ['Le pont de glace', 'des dalles qui tombent, des pics au bout'],
    'volcano-b': ['Les canons du Volcan', 'boules de feu au-dessus de la lave'],
    'forest-b': ['La rivière aux lianes', 'accrochez-vous pour traverser'],
    'space-b': ['Le monde à l’envers', 'gravité inversée, astéroïdes et pics'],
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
    'city-a': ['World 1 · The City', 'crushers and lasers: time it right'],
    'snow-a': ['World 2 · The Snow', 'ice blocks that crush everything'],
    'volcano-a': ['World 3 · The Volcano', 'fire geysers and crumbling slabs'],
    'forest-a': ['World 4 · The Forest', 'spiked logs and rolling trunks'],
    'space-a': ['World 5 · Space', 'a black hole and blinking platforms'],
    'city-b': ['City saws', 'blades that rise and fall'],
    'snow-b': ['The ice bridge', 'falling slabs, spikes at the end'],
    'volcano-b': ['Volcano cannons', 'fireballs above the lava'],
    'forest-b': ['The vine river', 'hang on to get across'],
    'space-b': ['Upside-down world', 'reversed gravity, asteroids and spikes'],
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
    'city-a': ['Mundo 1 · La Ciudad', 'prensas y láseres: elige el momento'],
    'snow-a': ['Mundo 2 · La Nieve', 'bloques de hielo que lo aplastan todo'],
    'volcano-a': ['Mundo 3 · El Volcán', 'géiseres de fuego y losas que se hunden'],
    'forest-a': ['Mundo 4 · El Bosque', 'troncos con pinchos y troncos rodantes'],
    'space-a': ['Mundo 5 · El Espacio', 'un agujero negro y plataformas que parpadean'],
    'city-b': ['Las sierras de la Ciudad', 'cuchillas que suben y bajan'],
    'snow-b': ['El puente de hielo', 'losas que caen, pinchos al final'],
    'volcano-b': ['Los cañones del Volcán', 'bolas de fuego sobre la lava'],
    'forest-b': ['El río de lianas', 'agárrate para cruzar'],
    'space-b': ['El mundo al revés', 'gravedad invertida, asteroides y pinchos'],
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
const ACCENT = {
  'city-a': '255,90,190', 'city-b': '255,90,190', 'snow-a': '150,215,255', 'snow-b': '150,215,255',
  'volcano-a': '255,100,40', 'volcano-b': '255,100,40', 'forest-a': '110,220,120', 'forest-b': '110,220,120',
  'space-a': '170,120,255', 'space-b': '170,120,255',
  gameplay: '255,122,47', trickshot: '63,224,255', skins: '255,194,61', pass: '255,201,77', ghost: '150,190,255', chest: '255,170,60', achievements: '180,107,255', collection: '255,122,47' };

// Scènes de monde (spot) : le ballon est posé (x, sol), la caméra cadrée (cx, cy) sur plusieurs pièges à la fois,
// hors des boutons tactiles ; `until` attend un piège en action (geyser en éruption) avant la capture.
const SCENES = [
  { n: '01', id: 'gameplay', world: 'volcano', level: 2, goal: true },
  { n: '02', id: 'city-a', world: 'city', level: 9, spot: { x: 29, y: 0, cx: 31, cy: 3 }, wait: 500 },
  { n: '03', id: 'snow-a', world: 'snow', level: 7, spot: { x: 26.6, y: 0, cx: 28, cy: 3.5 }, wait: 350 },
  { n: '04', id: 'volcano-a', world: 'volcano', level: 7, spot: { x: 52.6, y: 0.4, cx: 52, cy: 3 }, until: 'geyser', wait: 40 },
  { n: '05', id: 'forest-a', world: 'forest', level: 10, spot: { x: 130.4, y: 3, cx: 132.5, cy: 5 }, wait: 400 },
  { n: '06', id: 'space-a', world: 'space', level: 9, spot: { x: 151.5, y: 0, cx: 157.5, cy: -0.2 }, wait: 350 },
  { n: '07', id: 'trickshot', trick: 30 },
  { n: '08', id: 'pass', url: '/index.html?noboot#pass', wait: 2600 },
  { n: '09', id: 'skins', url: '/shop.html', wait: 1800, shop: 'ball-diamond' },
  { n: '10', id: 'ghost', world: 'city', level: 2, ghost: 'city-02' },
  { n: '12', id: 'achievements', url: '/index.html?noboot#succes', wait: 2600 },
  { n: '13', id: 'collection', url: '/index.html?noboot#collection', wait: 2600 },
  { n: '14', id: 'city-b', world: 'city', level: 7, spot: { x: 18, y: 0, cx: 20, cy: 3 }, wait: 500 },
  { n: '15', id: 'snow-b', world: 'snow', level: 4, spot: { x: 98, y: 0, cx: 97.5, cy: 2.5 }, wait: 500 },
  { n: '16', id: 'volcano-b', world: 'volcano', level: 4, spot: { x: 115, y: 0.45, cx: 114, cy: 3 }, until: 'fireball', wait: 120 },
  { n: '17', id: 'forest-b', world: 'forest', level: 2, spot: { x: 41.3, y: 0, cx: 44.5, cy: 3 }, wait: 450 },
  { n: '18', id: 'space-b', world: 'space', level: 8, spot: { x: 95, y: 5.5, cx: 99, cy: 3.2 }, wait: 500 },
  // Le coffre en dernier (sa fenêtre resterait ouverte sur les pages suivantes), ouvert depuis le calendrier
  { n: '11', id: 'chest', url: '/index.html?noboot#quotidien', wait: 2600, chest: 'legendary' },
];

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 960, height: 540 }, deviceScaleFactor: 2, locale: LOCALE });
await ctx.route(`${BASE}/**`, (route) => {
  let path = join(ROOT, decodeURIComponent(new URL(route.request().url()).pathname));
  if (path.endsWith('/')) path += 'index.html';
  if (!path.startsWith(ROOT) || !existsSync(path)) return route.fulfill({ status: 404, body: '' });
  return route.fulfill({ status: 200, body: readFileSync(path), contentType: TYPES[extname(path)] ?? 'application/octet-stream' });
});
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
    await page.goto(`${BASE}/play.html?world=${s.world}&level=${s.level}&unlock=all`);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(1200);
    // Fermeture normale de l'introduction (comme un toucher) : les commandes s'activent
    await page.evaluate(() => {
      window.__game.hideIntro();
      window.__game.game.level.hints.length = 0; // pas de texte d'aide sur l'image
    });
    await page.waitForTimeout(150);
    if (s.ghost) {
      // Le fantôme (le meilleur essai) part avec une petite avance ; le joueur roule derrière lui
      await page.waitForTimeout(450);
      await page.keyboard.down('ArrowRight');
      await page.waitForTimeout(1150);
      await page.keyboard.up('ArrowRight');
      await page.waitForTimeout(120);
    } else if (s.spot) {
      await page.evaluate((sp) => {
        const g = window.__game;
        const L = g.game.level;
        const b = g.game.body;
        b.x = sp.x;
        b.y = sp.y + b.radius;
        b.vx = 0;
        b.vy = 0;
        // La caméra suit le ballon : on garde le cadrage choisi pendant ~1,5 s
        let n = 0;
        const hold = () => {
          g.camera.snap(sp.cx, sp.cy, L.bounds);
          if (n++ < 90) requestAnimationFrame(hold);
        };
        hold();
      }, s.spot);
      if (s.until === 'geyser') {
        // Jets à pleine hauteur, au début de l'éruption (geysers visibles à l'image seulement)
        await page.waitForFunction((cx) => {
          const g = window.__game.game;
          const on = g.level.geysers.some((y) => {
            const st = y.state(g.time);
            return Math.abs(y.x - cx) < 8 && st.erupting && st.height > 0.95 * y.h;
          });
          if (on) window.__game.loop.stop(); // image figée sur ce moment
          return on;
        }, s.spot.cx, { timeout: 8000, polling: 'raf' });
      }
      if (s.until === 'fireball') await page.waitForFunction(() => (window.__game.game.level.cannons ?? []).some((c) => c.shots(window.__game.game.time).length > 0), null, { timeout: 4000 }).catch(() => {});
      await page.waitForTimeout(s.wait ?? 500);
      await page.evaluate(() => window.__game.loop.stop()); // image figée : rien ne bouge pendant la capture
      await page.waitForTimeout(60);
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
console.log(`Captures ${LANG} : store/screenshots/${LANG}/ et store/screenshots/raw/${LANG}/`);
