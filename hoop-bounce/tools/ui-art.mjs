// Génère les illustrations d'interface de Hoop Bounce (assets/ui/*.svg) : pièce, gemme, coffres.
//
//   node tools/ui-art.mjs
//
// Une seule direction artistique pour tout : lumière en haut à gauche, contour sombre de la couleur du
// matériau (jamais noir), reflets francs, ombres colorées. Les coffres sont générés à partir d'un même
// modèle (bois, ferrures, serrure, gravures) avec une palette par rareté, en deux pièces (couvercle et
// caisse) pour pouvoir s'ouvrir. Modifier ici puis relancer : les fichiers SVG sont écrasés.

import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'ui');
mkdirSync(OUT, { recursive: true });
const svg = (vb, body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}">${body}</svg>\n`;
const write = (name, content) => writeFileSync(join(OUT, name), content);

// ─── Pièce ──────────────────────────────────────────────────────────────────
// Disque d'or épais (tranche visible), bord biseauté et cannelé, face creusée, ballon en relief.
write('coin.svg', svg('0 0 64 64', `
<defs>
  <linearGradient id="edge" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c27c12"/><stop offset="1" stop-color="#7d4507"/></linearGradient>
  <linearGradient id="rim" x1=".15" y1="0" x2=".85" y2="1"><stop offset="0" stop-color="#fff7cf"/><stop offset=".35" stop-color="#ffd358"/><stop offset=".7" stop-color="#eda21d"/><stop offset="1" stop-color="#b9700b"/></linearGradient>
  <radialGradient id="face" cx="62%" cy="72%" r="85%"><stop offset="0" stop-color="#ffe07a"/><stop offset=".55" stop-color="#f6b934"/><stop offset="1" stop-color="#d98c10"/></radialGradient>
  <linearGradient id="relief" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff4c2"/><stop offset="1" stop-color="#ffcc4a"/></linearGradient>
</defs>
<circle cx="32" cy="34.6" r="28.4" fill="url(#edge)"/>
<circle cx="32" cy="31" r="28.4" fill="url(#rim)"/>
<circle cx="32" cy="31" r="25.8" fill="none" stroke="#b97410" stroke-opacity=".45" stroke-width="1.6" stroke-dasharray="1.6 2.4"/>
<circle cx="32" cy="31" r="22" fill="url(#face)"/>
<path d="M12.6 26.5a20.4 20.4 0 0 1 30-14.6" fill="none" stroke="#a9650a" stroke-opacity=".5" stroke-width="2.2" stroke-linecap="round"/>
<path d="M51.6 34a20.4 20.4 0 0 1-31.5 13.2" fill="none" stroke="#fff3c0" stroke-opacity=".7" stroke-width="1.6" stroke-linecap="round"/>
<g transform="translate(32 31)" fill="none" stroke-linecap="round">
  <g stroke="#fff3c4" stroke-opacity=".85" stroke-width="2.2" transform="translate(.7 .9)">
    <circle r="11.5"/><path d="M0-11.5v23M-11.5 0h23M-7.4-8.7c3 2.6 4.4 5.6 4.4 8.7s-1.4 6.1-4.4 8.7M7.4-8.7c-3 2.6-4.4 5.6-4.4 8.7s1.4 6.1 4.4 8.7"/>
  </g>
  <g stroke="#b06a09" stroke-width="2.2">
    <circle r="11.5"/><path d="M0-11.5v23M-11.5 0h23M-7.4-8.7c3 2.6 4.4 5.6 4.4 8.7s-1.4 6.1-4.4 8.7M7.4-8.7c-3 2.6-4.4 5.6-4.4 8.7s1.4 6.1 4.4 8.7"/>
  </g>
</g>
<path d="M9.5 22a24 24 0 0 1 15-14.6" fill="none" stroke="#fff" stroke-opacity=".85" stroke-width="2.6" stroke-linecap="round"/>
<circle cx="32" cy="31" r="28.4" fill="none" stroke="#8a4f08" stroke-opacity=".55" stroke-width="1"/>
`));

// ─── Gemme ──────────────────────────────────────────────────────────────────
// Taille brillant vue de face : table, couronne et pavillon à facettes, éclats blancs.
{
  const A = [18, 12], B = [32, 11], C = [46, 12], P = [32, 57];
  const g = [6, 12.5, 19, 25.5, 32, 38.5, 45, 51.5, 58].map((x) => [x, 25]);
  const tri = (pts, fill, op = 1) => `<polygon points="${pts.map((p) => p.join(',')).join(' ')}" fill="${fill}"${op < 1 ? ` fill-opacity="${op}"` : ''}/>`;
  const pav = ['#2a8fe0', '#1d74c9', '#39a6ee', '#1b67b6', '#2b94e6', '#155aa5', '#2783d6', '#124e94'];
  let body = '';
  // Pavillon (bas) : 8 facettes vers la pointe
  for (let i = 0; i < 8; i++) body += tri([g[i], g[i + 1], P], pav[i]);
  // Reflets internes du pavillon
  body += tri([g[2], g[4], [32, 44]], '#7fdcff', 0.45) + tri([g[5], g[6], [36, 40]], '#c6f2ff', 0.35);
  // Couronne (haut) : éventails depuis A, B, C
  body += tri([A, g[0], g[1]], '#9fe6ff') + tri([A, g[1], g[2]], '#c9f4ff') + tri([A, B, g[2]], '#e9fbff');
  body += tri([B, g[2], g[3]], '#a6e8ff') + tri([B, g[3], g[4]], '#7fd8fb') + tri([B, g[4], g[5]], '#62c9f6') + tri([B, g[5], g[6]], '#4fb8f0');
  body += tri([B, C, g[6]], '#7fd2f8') + tri([C, g[6], g[7]], '#3ea6e8') + tri([C, g[7], g[8]], '#2f8fd8');
  // Table
  body += tri([[22, 14.5], [42, 14.5], [37, 21], [27, 21]], '#ffffff', 0.55);
  // Ligne de rondiste
  body += `<path d="M6 25H58" stroke="#e6f9ff" stroke-opacity=".6" stroke-width=".8"/>`;
  // Arêtes claires
  body += `<path d="M18 12 6 25M32 11 19 25M32 11 45 25M46 12 58 25M19 25 32 57M45 25 32 57" stroke="#ffffff" stroke-opacity=".22" stroke-width=".7" fill="none"/>`;
  // Éclats
  body += `<path d="M14.5 19.5 20 14" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-opacity=".95"/>`;
  body += `<path d="M49 15.5l1.2 3 3 1.2-3 1.2-1.2 3-1.2-3-3-1.2 3-1.2z" fill="#fff"/>`;
  // Contour
  body += `<polygon points="18,12 32,11 46,12 58,25 32,57 6,25" fill="none" stroke="#0d3f80" stroke-width="1.6" stroke-linejoin="round"/>`;
  write('gem.svg', svg('0 0 64 64', body));
}

// ─── Coffres ────────────────────────────────────────────────────────────────
// Même modèle pour toutes les raretés : caisse en planches, ferrures latérales rivetées, plinthe,
// serrure ; couvercle bombé aux planches courbes, bandeau avant. Les raretés hautes ajoutent des
// gravures, des clous, une pierre et un ornement.
const CHESTS = {
  common: { wood: ['#c58547', '#94592a', '#5b3216'], metal: ['#dfe6f1', '#94a2ba', '#4d5a72'], lock: ['#ffe39a', '#d9a23a', '#7e520f'], gem: null, engrave: false, studs: false, crest: false },
  rare: { wood: ['#4e8ee0', '#2b5fae', '#16346e'], metal: ['#f5f8fd', '#b1bfd6', '#5a6a89'], lock: ['#f5f8fd', '#b1bfd6', '#5a6a89'], gem: ['#c4ecff', '#4fb4ff', '#1a5fb0'], engrave: false, studs: true, crest: false },
  epic: { wood: ['#a466ef', '#6f36be', '#3b1872'], metal: ['#fff2bf', '#eab441', '#94600f'], lock: ['#fff2bf', '#eab441', '#94600f'], gem: ['#ffd2fa', '#ff6fe6', '#9a1f8c'], engrave: true, studs: true, crest: false },
  super: { wood: ['#f5964a', '#c95720', '#76280d'], metal: ['#fff2bf', '#eab441', '#94600f'], lock: ['#fff2bf', '#eab441', '#94600f'], gem: ['#ffe1fb', '#ff8ff0', '#a1279a'], engrave: true, studs: true, crest: false },
  premium: { wood: ['#3557ad', '#1c3477', '#0b1636'], metal: ['#f6fcff', '#acdcf2', '#4a7896'], lock: ['#f6fcff', '#acdcf2', '#4a7896'], gem: ['#e4fdff', '#6ff0ff', '#0f8fae'], engrave: true, studs: true, crest: false },
  legendary: { wood: ['#b8402f', '#80211b', '#45100d'], metal: ['#fff4c4', '#f0bb44', '#93600c'], lock: ['#fff4c4', '#f0bb44', '#93600c'], gem: ['#fff0c2', '#ffb02e', '#b5520a'], engrave: true, studs: true, crest: true },
};

function grads(k) {
  const { wood, metal, lock, gem } = k;
  return `<defs>
  <linearGradient id="wood" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${wood[0]}"/><stop offset=".55" stop-color="${wood[1]}"/><stop offset="1" stop-color="${wood[2]}"/></linearGradient>
  <linearGradient id="metal" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${metal[2]}"/><stop offset=".25" stop-color="${metal[0]}"/><stop offset=".6" stop-color="${metal[1]}"/><stop offset="1" stop-color="${metal[2]}"/></linearGradient>
  <linearGradient id="metalH" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${metal[0]}"/><stop offset=".5" stop-color="${metal[1]}"/><stop offset="1" stop-color="${metal[2]}"/></linearGradient>
  <linearGradient id="lock" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${lock[0]}"/><stop offset=".55" stop-color="${lock[1]}"/><stop offset="1" stop-color="${lock[2]}"/></linearGradient>
  ${gem ? `<linearGradient id="gem" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${gem[0]}"/><stop offset=".5" stop-color="${gem[1]}"/><stop offset="1" stop-color="${gem[2]}"/></linearGradient>` : ''}
</defs>`;
}

const rivet = (x, y, k, r = 2.2) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${k.metal[2]}"/><circle cx="${x - 0.5}" cy="${y - 0.6}" r="${r * 0.62}" fill="${k.metal[0]}"/>`;
/** Équerre de coin (raretés hautes) : pièce de métal en L avec un rivet. */
const corner = (x, y, sx, sy, k) =>
  `<path d="M${x} ${y}h${12 * sx}v${4 * sy}h${-8 * sx}v${8 * sy}h${-4 * sx}z" fill="url(#metalH)" stroke="${k.metal[2]}" stroke-width=".8"/>` + rivet(x + 2.2 * sx, y + 2.2 * sy, k, 1.1);
/** Gravure : cadre fin incrusté dans le bois, coins arrondis. */
const inlay = (x, y, w, h, k) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="none" stroke="${k.metal[1]}" stroke-opacity=".55" stroke-width="1"/><rect x="${x + 0.8}" y="${y + 0.9}" width="${w}" height="${h}" rx="3" fill="none" stroke="#000" stroke-opacity=".18" stroke-width=".8"/>`;
/** Rainure le long d'une ferrure verticale. */
const groove = (x, y1, y2, k) => `<path d="M${x} ${y1}V${y2}" stroke="${k.metal[2]}" stroke-opacity=".45" stroke-width="1"/><path d="M${x + 1} ${y1}V${y2}" stroke="#fff" stroke-opacity=".35" stroke-width=".7"/>`;

/** Caisse (coordonnées 0..120 × 40..100, translatées en 0..60). */
function chestBody(name, k) {
  let b = grads(k) + '<g transform="translate(0 -40)">';
  b += `<rect x="8" y="44" width="104" height="52" rx="6" fill="url(#wood)"/>`;
  // Planches : joints sombres + liseré clair
  for (const y of [61, 78]) b += `<path d="M10 ${y}H110" stroke="${k.wood[2]}" stroke-opacity=".55" stroke-width="1.6"/><path d="M10 ${y + 1.6}H110" stroke="#fff" stroke-opacity=".12" stroke-width="1"/>`;
  // Veines du bois
  b += `<path d="M28 52c10-2 20 1 30-1M66 70c9-2 18 1 26-1M30 86c8-1.5 16 1 24-.5" fill="none" stroke="${k.wood[2]}" stroke-opacity=".3" stroke-width="1" stroke-linecap="round"/>`;
  // Ombre sous le couvercle
  b += `<rect x="8" y="44" width="104" height="5" fill="#000" fill-opacity=".28"/>`;
  // Ferrures latérales et plinthe
  for (const x of [8, 98]) {
    b += `<rect x="${x}" y="44" width="14" height="52" rx="${x === 8 ? 6 : 6}" fill="url(#metal)"/>`;
    b += rivet(x + 7, 54, k) + rivet(x + 7, 86, k);
  }
  b += `<rect x="8" y="90" width="104" height="6.5" rx="3" fill="url(#metalH)"/>`;
  if (k.studs) for (let x = 30; x <= 90; x += 12) b += rivet(x, 93.2, k, 1.6);
  if (k.engrave) {
    b += inlay(27, 64, 18, 22, k) + inlay(75, 64, 18, 22, k);
    b += groove(14.5, 58, 82, k) + groove(104.5, 58, 82, k);
    b += corner(22, 90, 1, -1, k) + corner(98, 90, -1, -1, k);
  }
  // Serrure
  b += `<rect x="49" y="44" width="22" height="26" rx="5" fill="url(#lock)" stroke="${k.lock[2]}" stroke-width="1.2"/>`;
  b += `<path d="M52 47h16" stroke="#fff" stroke-opacity=".5" stroke-width="1.4" stroke-linecap="round"/>`;
  if (k.gem) {
    b += `<path d="M60 49l7 7-7 9-7-9z" fill="url(#gem)" stroke="${k.gem[2]}" stroke-width="1"/><path d="M57 54.5l3-3.5" stroke="#fff" stroke-width="1.4" stroke-linecap="round" opacity=".9"/>`;
  } else {
    b += `<circle cx="60" cy="55" r="3.2" fill="${k.lock[2]}"/><path d="M60 57v6" stroke="${k.lock[2]}" stroke-width="2.6" stroke-linecap="round"/>`;
  }
  // Contour de la caisse
  b += `<rect x="8" y="44" width="104" height="52" rx="6" fill="none" stroke="${k.wood[2]}" stroke-width="2"/>`;
  b += '</g>';
  write(`chest-${name}-body.svg`, svg('0 0 120 60', b));
}

/** Couvercle bombé (coordonnées 0..120 × 0..50). */
function chestLid(name, k) {
  const dome = 'M8 48V28C8 11 30 5 60 5s52 6 52 23v20z';
  let b = grads(k).replace('</defs>', `<clipPath id="dome"><path d="${dome}"/></clipPath></defs>`);
  b += `<path d="${dome}" fill="url(#wood)"/>`;
  b += `<g clip-path="url(#dome)">`;
  // Planches courbes
  for (const y of [17, 29]) b += `<path d="M8 ${y + 12}C8 ${y - 2} 30 ${y - 8} 60 ${y - 8}S112 ${y - 2} 112 ${y + 12}" fill="none" stroke="${k.wood[2]}" stroke-opacity=".5" stroke-width="1.6"/>`;
  // Reflet du bombé (lumière en haut à gauche)
  b += `<path d="M16 22C20 13 36 9 56 9" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="3" stroke-linecap="round"/>`;
  // Ferrures du couvercle
  for (const x of [8, 98]) b += `<rect x="${x}" y="0" width="14" height="50" fill="url(#metal)"/>` + rivet(x + 7, 22, k);
  if (k.engrave) b += groove(14.5, 8, 36, k) + groove(104.5, 8, 36, k) + inlay(30, 20, 18, 12, k) + inlay(72, 20, 18, 12, k);
  b += `</g>`;
  // Bandeau avant
  b += `<path d="M8 36h104v4H8z" fill="#000" fill-opacity=".22"/>`;
  b += `<rect x="6" y="39" width="108" height="10" rx="3.5" fill="url(#metalH)" stroke="${k.metal[2]}" stroke-width="1"/>`;
  b += `<path d="M9 47.6H111" stroke="${k.metal[2]}" stroke-opacity=".6" stroke-width="1.2"/>`;
  b += `<path d="M10 41.2H110" stroke="#fff" stroke-opacity=".55" stroke-width="1.2" stroke-linecap="round"/>`;
  if (k.studs) for (let x = 18; x <= 102; x += 14) b += rivet(x, 44.5, k, 1.5);
  // Fermoir
  b += `<path d="M52 36h16v13H52z" fill="url(#lock)" stroke="${k.lock[2]}" stroke-width="1.2"/>`;
  // Ornement (légendaire) : couronne dorée sur le dessus
  if (k.crest) {
    b += `<path d="M48 22l4.5 3.5L60 16l7.5 9.5L72 22l-2 9H50z" fill="url(#lock)" stroke="${k.lock[2]}" stroke-width="1.1" stroke-linejoin="round"/>`;
    b += `<circle cx="60" cy="25.5" r="2.4" fill="url(#gem)"/>`;
  }
  b += `<path d="${dome}" fill="none" stroke="${k.wood[2]}" stroke-width="2"/>`;
  write(`chest-${name}-lid.svg`, svg('0 0 120 50', b));
}

for (const [name, k] of Object.entries(CHESTS)) {
  chestBody(name, k);
  chestLid(name, k);
}
console.log(`assets/ui : coin.svg, gem.svg, ${Object.keys(CHESTS).length} coffres (couvercle + caisse)`);
