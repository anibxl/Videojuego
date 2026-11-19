// Génère les visuels de la fiche Play Store et les icônes Android à partir des sources de `store/src/`.
//
//   npx -y playwright@1 install chromium   (une fois, si Playwright n'est pas installé)
//   node store/tools/render-assets.mjs
//
// Produit :
//   store/icon/icon-512.png                    icône haute résolution Google Play (512 × 512, PNG 32 bits)
//   store/icon/icon-1024.png                   même icône en grand (réseaux sociaux, site)
//   store/feature-graphic/feature-graphic-{fr,en,es}.png   bannière 1024 × 500 (PNG 24 bits, sans transparence)
//   android/app/src/main/res/mipmap-*/ic_launcher*.png     icônes Android (classique, ronde, adaptative)
//   android/app/src/main/res/drawable*/splash.png          écran de démarrage natif (fond du jeu + ballon)

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

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const RES = join(ROOT, 'android/app/src/main/res');
const TYPES = { '.html': 'text/html', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png' };

// Petit serveur local (les polices ne se chargent pas en file://)
const server = createServer((req, res) => {
  const path = join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!path.startsWith(ROOT) || !existsSync(path)) return res.writeHead(404).end();
  res.writeHead(200, { 'content-type': TYPES[extname(path)] ?? 'application/octet-stream' }).end(readFileSync(path));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;

const browser = await chromium.launch();
const icon = readFileSync(join(ROOT, 'store/src/icon.svg'), 'utf8');

/** Variante de l'icône : 'full', 'background' (fond seul), 'foreground' (motif seul, réduit à la zone sûre). */
function iconVariant(kind) {
  let s = icon;
  if (kind === 'background') s = s.replace('<g id="fg-layer">', '<g id="fg-layer" display="none">');
  if (kind === 'foreground') {
    // Icône adaptative : 108 dp dont ~72 dp visibles → motif réduit aux 2/3, fond transparent
    s = s.replace('<g id="bg-layer">', '<g id="bg-layer" display="none">');
    s = s.replace('<g id="fg-layer">', '<g id="fg-layer" transform="translate(256 256) scale(0.667) translate(-256 -256)">');
  }
  return s;
}

async function renderSvg(svg, size, out, { shape = 'square', transparent = false } = {}) {
  const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
  const radius = shape === 'round' ? '50%' : shape === 'rounded' ? '18%' : '0';
  const uri = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
  await page.setContent(`<html><body style="margin:0;background:transparent"><img src="${uri}" style="display:block;width:${size}px;height:${size}px;border-radius:${radius}"></body></html>`);
  await page.waitForFunction(() => document.images[0].complete);
  mkdirSync(dirname(out), { recursive: true });
  await page.screenshot({ path: out, omitBackground: transparent || shape !== 'square' });
  await page.close();
}

// ─── Icônes de la fiche ──────────────────────────────────────────────────────
await renderSvg(iconVariant('full'), 512, join(ROOT, 'store/icon/icon-512.png'));
await renderSvg(iconVariant('full'), 1024, join(ROOT, 'store/icon/icon-1024.png'));

// ─── Icônes Android ─────────────────────────────────────────────────────────
const DENSITIES = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
for (const [d, k] of Object.entries(DENSITIES)) {
  const dir = join(RES, `mipmap-${d}`);
  await renderSvg(iconVariant('full'), 48 * k, join(dir, 'ic_launcher.png'), { shape: 'rounded' });
  await renderSvg(iconVariant('full'), 48 * k, join(dir, 'ic_launcher_round.png'), { shape: 'round' });
  await renderSvg(iconVariant('foreground'), 108 * k, join(dir, 'ic_launcher_foreground.png'), { transparent: true });
  await renderSvg(iconVariant('background'), 108 * k, join(dir, 'ic_launcher_background.png'));
}

// ─── Écran de démarrage natif : fond du jeu et ballon (enchaîne avec l'écran de chargement) ─
const SPLASH = {
  drawable: [480, 320],
  'drawable-land-mdpi': [480, 320], 'drawable-land-hdpi': [800, 480], 'drawable-land-xhdpi': [1280, 720],
  'drawable-land-xxhdpi': [1600, 960], 'drawable-land-xxxhdpi': [1920, 1280],
  'drawable-port-mdpi': [320, 480], 'drawable-port-hdpi': [480, 800], 'drawable-port-xhdpi': [720, 1280],
  'drawable-port-xxhdpi': [960, 1600], 'drawable-port-xxxhdpi': [1280, 1920],
};
const ball = icon.slice(icon.indexOf('<g transform="translate(256 222)">'), icon.indexOf('  <!-- filet'));
const defs = icon.slice(icon.indexOf('<defs>'), icon.indexOf('</defs>') + 7);
for (const [dir, [w, h]] of Object.entries(SPLASH)) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  const r = Math.round(Math.min(w, h) * 0.11);
  await page.setContent(`<html><body style="margin:0;width:${w}px;height:${h}px;background:radial-gradient(ellipse 60% 55% at 50% 55%, rgba(255,110,40,.12), transparent 70%),linear-gradient(180deg,#070c1a,#04070f 60%,#03050b);display:grid;place-items:center">
    <svg width="${r * 2}" height="${r * 2}" viewBox="124 90 264 264" xmlns="http://www.w3.org/2000/svg">${defs}${ball}</svg></body></html>`);
  await page.screenshot({ path: join(RES, dir, 'splash.png') });
  await page.close();
}

// ─── Feature graphic 1024 × 500 ─────────────────────────────────────────────
for (const lang of ['fr', 'en', 'es']) {
  const page = await browser.newPage({ viewport: { width: 1024, height: 500 }, deviceScaleFactor: 1 });
  await page.goto(`${base}/store/src/feature-graphic.html?lang=${lang}`);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(200);
  mkdirSync(join(ROOT, 'store/feature-graphic'), { recursive: true });
  await page.locator('#fg').screenshot({ path: join(ROOT, `store/feature-graphic/feature-graphic-${lang}.png`) });
  await page.close();
}

await browser.close();
server.close();
console.log('Visuels générés : store/icon, store/feature-graphic, icônes et écrans de démarrage Android.');
