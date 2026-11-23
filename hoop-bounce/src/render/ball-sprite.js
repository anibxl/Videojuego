// Textures du ballon générées au démarrage (aucun fichier image à charger).
//  - `surface` : cuir orange granuleux + coutures. Tourne avec le ballon.
//  - `shading` : reflet et ombre propre. NE tourne PAS : la lumière vient toujours d'en haut à gauche.

import { createRng } from '../core/math.js';

const SIZE = 256;

function makeCanvas(size) {
  const c = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(size, size) : document.createElement('canvas');
  c.width = size;
  c.height = size;
  return c;
}

/** Apparence de chaque ballon de la boutique (le premier est le ballon d'origine). */
const SKINS = {
  'ball-classic': { base: ['#f47a2a', '#de5f17'], grain: ['rgba(90,30,0,0.13)', 'rgba(255,190,140,0.10)'], seam: '#2b1206' },
  'ball-street': { base: ['#c96a33', '#94451c'], grain: ['rgba(60,20,0,0.2)', 'rgba(255,210,170,0.14)'], seam: '#1c0c05', scuffs: true },
  'ball-retro': { base: ['#f2f2f2', '#d8d8d8'], grain: ['rgba(0,0,0,0.05)', 'rgba(255,255,255,0.1)'], seam: '#14213d', bands: ['#d62839', '#f4f4f4', '#1d4ed8'] },
  'ball-frost': { base: ['#e6f6ff', '#8cc7ee'], grain: ['rgba(60,120,170,0.12)', 'rgba(255,255,255,0.3)'], seam: '#3f7fb5', frost: true },
  'ball-neon': { base: ['#1a1d3a', '#07081a'], grain: ['rgba(0,0,0,0.2)', 'rgba(120,140,255,0.06)'], seam: '#5ff4ff', glow: '#5ff4ff' },
  'ball-lava': { base: ['#2a1410', '#0d0605'], grain: ['rgba(0,0,0,0.25)', 'rgba(255,120,60,0.08)'], seam: '#ff7a2a', glow: '#ff5a1a', cracks: true },
  'ball-galaxy': { base: ['#4b2a9b', '#120a3a'], grain: ['rgba(0,0,0,0.15)', 'rgba(200,170,255,0.08)'], seam: '#d9c8ff', stars: true },
  'ball-gold': { base: ['#ffe9a3', '#c98f1b'], grain: ['rgba(120,70,0,0.12)', 'rgba(255,250,220,0.22)'], seam: '#7a5208', shine: true },
  // Exclusifs (récompense du 7e jour, succès « Au-delà des étoiles »)
  'ball-hoop': { base: ['#ff8a3d', '#d4521a'], grain: ['rgba(90,30,0,0.12)', 'rgba(255,200,150,0.12)'], seam: '#0d1838', logo: true },
  'ball-legend': { base: ['#2a2412', '#07060a'], grain: ['rgba(0,0,0,0.25)', 'rgba(255,210,120,0.07)'], seam: '#ffd36b', glow: '#ffb52e', shine: true, aura: '255,190,70' },
  // Étape 17 : nouveaux ballons
  'ball-shadow': { base: ['#1c1726', '#050408'], grain: ['rgba(0,0,0,0.3)', 'rgba(160,120,255,0.05)'], seam: '#6d4bd8', glow: '#8a5cff', smoke: true },
  'ball-plasma': { base: ['#2a0f4a', '#0a0418'], grain: ['rgba(0,0,0,0.2)', 'rgba(255,120,255,0.06)'], seam: '#ff7af5', glow: '#ff4ff0', veins: ['#ff8af7', '#7af2ff'] },
  'ball-rainbow': { base: ['#ffffff', '#e8e8e8'], grain: ['rgba(0,0,0,0.05)', 'rgba(255,255,255,0.12)'], seam: '#ffffff', rainbow: true, glow: '#ffffff' },
  'ball-gold-aura': null,
  'ball-diamond': { base: ['#f4fbff', '#9fd6f2'], grain: ['rgba(80,140,190,0.05)', 'rgba(255,255,255,0.25)'], seam: '#ffffff', facets: true, shine: true, glow: '#bdf2ff', aura: '170,235,255' },
  // Ballons avec un visage (le visage reste droit et regarde dans le sens du mouvement : drawFace)
  'ball-smile': { base: ['#ffcf3f', '#f0a412'], grain: ['rgba(120,70,0,0.1)', 'rgba(255,240,180,0.14)'], seam: '#a05f00', face: 'smile' },
  'ball-pirate': { base: ['#f47a2a', '#de5f17'], grain: ['rgba(90,30,0,0.13)', 'rgba(255,190,140,0.10)'], seam: '#2b1206', face: 'pirate' },
  'ball-ninja': { base: ['#2b3140', '#11141c'], grain: ['rgba(0,0,0,0.25)', 'rgba(180,190,220,0.06)'], seam: '#0a0c12', face: 'ninja' },
  'ball-robot': { base: ['#c9d2de', '#7c8798'], grain: ['rgba(40,50,70,0.12)', 'rgba(255,255,255,0.2)'], seam: '#55606f', face: 'robot', rivets: true },
  'ball-ghost': { base: ['#f4f2ff', '#c9c3ee'], grain: ['rgba(90,80,160,0.06)', 'rgba(255,255,255,0.3)'], seam: '#b7aee6', face: 'ghost', aura: '210,200,255' },
  'ball-googly': { base: ['#f47a2a', '#de5f17'], grain: ['rgba(90,30,0,0.13)', 'rgba(255,190,140,0.10)'], seam: '#2b1206', face: 'googly' },
  // Saison 1 — Noël (Hoop Pass) et objets à gemmes
  'ball-xmas': { base: ['#d42a3a', '#8f1424'], grain: ['rgba(60,0,10,0.15)', 'rgba(255,200,200,0.1)'], seam: '#ffd36b', snowflakes: true, shine: true },
  'ball-santa': { base: ['#d42a3a', '#a01828'], grain: ['rgba(60,0,10,0.15)', 'rgba(255,200,200,0.1)'], seam: '#7a0f1c', face: 'santa' },
  'ball-polaris': { base: ['#1d2d62', '#060b22'], grain: ['rgba(0,0,0,0.2)', 'rgba(180,210,255,0.08)'], seam: '#ffe9a8', stars: true, snowflakes: true, glow: '#bfe7ff', shine: true, aura: '255,230,160' },
  'ball-crystal': { base: ['#e9f8ff', '#7fc4ea'], grain: ['rgba(80,140,190,0.05)', 'rgba(255,255,255,0.25)'], seam: '#ffffff', facets: true, frost: true, glow: '#c8f4ff', aura: '180,240,255' },
  'ball-aurora': { base: ['#0f2a3a', '#06121c'], grain: ['rgba(0,0,0,0.2)', 'rgba(120,255,200,0.06)'], seam: '#7affd0', glow: '#7affd0', veins: ['#6dffc0', '#b48cff'], aura: '120,255,200' },
  'ball-alien': { base: ['#8dff7a', '#1f9e3a'], grain: ['rgba(0,60,10,0.12)', 'rgba(220,255,210,0.14)'], seam: '#0f5a20', glow: '#9dff8a', face: 'alien', aura: '120,255,140' },
};
delete SKINS['ball-gold-aura'];
SKINS['ball-gold'].aura = '255,205,80';

/** Infos d'apparence utiles au rendu (visage, aura des légendaires). */
export function skinInfo(id) {
  const S = SKINS[id] ?? SKINS['ball-classic'];
  return { face: S.face ?? null, aura: S.aura ?? null };
}

export function createBallTextures(skin = 'ball-classic') {
  return { surface: createSurface(SKINS[skin] ?? SKINS['ball-classic']), shading: createShading() };
}

function createSurface(S) {
  const c = makeCanvas(SIZE);
  const g = c.getContext('2d');
  const r = SIZE / 2;
  g.translate(r, r);

  g.save();
  g.beginPath();
  g.arc(0, 0, r - 1, 0, Math.PI * 2);
  g.clip();

  // Cuir (ou matière)
  const base = g.createRadialGradient(0, 0, r * 0.2, 0, 0, r);
  base.addColorStop(0, S.base[0]);
  base.addColorStop(1, S.base[1]);
  g.fillStyle = base;
  g.fillRect(-r, -r, SIZE, SIZE);
  const rng = createRng(7);
  if (S.bands) {
    // Panneaux rétro de trois couleurs
    const w = SIZE / 3;
    S.bands.forEach((col, i) => {
      g.fillStyle = col;
      g.fillRect(-r + i * w, -r, w, SIZE);
    });
  }
  if (S.stars) {
    const neb = g.createRadialGradient(-r * 0.3, r * 0.2, 0, -r * 0.3, r * 0.2, r * 0.9);
    neb.addColorStop(0, 'rgba(255,110,200,0.55)');
    neb.addColorStop(1, 'rgba(255,110,200,0)');
    g.fillStyle = neb;
    g.fillRect(-r, -r, SIZE, SIZE);
    const neb2 = g.createRadialGradient(r * 0.4, -r * 0.3, 0, r * 0.4, -r * 0.3, r * 0.7);
    neb2.addColorStop(0, 'rgba(90,180,255,0.5)');
    neb2.addColorStop(1, 'rgba(90,180,255,0)');
    g.fillStyle = neb2;
    g.fillRect(-r, -r, SIZE, SIZE);
  }
  if (S.rainbow) {
    // Spirale de couleurs
    const cols = ['#ff5a5a', '#ffaa3c', '#ffe650', '#5ae678', '#50b4ff', '#aa6eff'];
    for (let i = 0; i < 12; i++) {
      g.fillStyle = cols[i % cols.length];
      g.beginPath();
      g.moveTo(0, 0);
      g.arc(0, 0, r * 1.5, (i / 12) * Math.PI * 2, ((i + 1) / 12) * Math.PI * 2 + 0.02);
      g.closePath();
      g.fill();
    }
    const soft = g.createRadialGradient(0, 0, 0, 0, 0, r);
    soft.addColorStop(0, 'rgba(255,255,255,0.55)');
    soft.addColorStop(0.5, 'rgba(255,255,255,0.12)');
    soft.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = soft;
    g.fillRect(-r, -r, SIZE, SIZE);
  }
  if (S.facets) {
    // Diamant : facettes triangulaires claires et sombres
    const rngF = createRng(31);
    const pts = [];
    for (let i = 0; i < 9; i++) for (let j = 0; j < 9; j++) pts.push([-r + (i / 8) * SIZE + (rngF() - 0.5) * 18, -r + (j / 8) * SIZE + (rngF() - 0.5) * 18]);
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        const a = pts[i * 9 + j];
        const b = pts[(i + 1) * 9 + j];
        const c = pts[i * 9 + j + 1];
        const d = pts[(i + 1) * 9 + j + 1];
        for (const tri of [[a, b, d], [a, d, c]]) {
          const l = rngF();
          g.fillStyle = l < 0.33 ? 'rgba(255,255,255,0.55)' : l < 0.66 ? 'rgba(150,215,245,0.35)' : 'rgba(60,140,200,0.25)';
          g.beginPath();
          g.moveTo(tri[0][0], tri[0][1]);
          g.lineTo(tri[1][0], tri[1][1]);
          g.lineTo(tri[2][0], tri[2][1]);
          g.closePath();
          g.fill();
          g.strokeStyle = 'rgba(255,255,255,0.35)';
          g.lineWidth = 1;
          g.stroke();
        }
      }
    }
  }
  if (S.shine) {
    const sh = g.createLinearGradient(-r, -r, r, r);
    sh.addColorStop(0.3, 'rgba(255,255,255,0)');
    sh.addColorStop(0.45, 'rgba(255,255,255,0.45)');
    sh.addColorStop(0.55, 'rgba(255,255,255,0)');
    g.fillStyle = sh;
    g.fillRect(-r, -r, SIZE, SIZE);
  }

  // Grain
  for (let i = 0; i < 1400; i++) {
    const a = rng() * Math.PI * 2;
    const d = Math.sqrt(rng()) * r;
    g.fillStyle = rng() < 0.5 ? S.grain[0] : S.grain[1];
    g.beginPath();
    g.arc(Math.cos(a) * d, Math.sin(a) * d, 1.1 + rng() * 1.3, 0, Math.PI * 2);
    g.fill();
  }
  if (S.scuffs) {
    g.fillStyle = 'rgba(255,220,190,0.18)';
    for (let i = 0; i < 9; i++) {
      g.beginPath();
      g.ellipse((rng() - 0.5) * r * 1.4, (rng() - 0.5) * r * 1.4, 6 + rng() * 14, 3 + rng() * 6, rng() * 3, 0, Math.PI * 2);
      g.fill();
    }
  }
  if (S.stars) {
    for (let i = 0; i < 70; i++) {
      g.fillStyle = `rgba(255,255,255,${0.4 + rng() * 0.6})`;
      g.beginPath();
      g.arc((rng() - 0.5) * SIZE, (rng() - 0.5) * SIZE, 0.6 + rng() * 1.6, 0, Math.PI * 2);
      g.fill();
    }
  }
  if (S.frost) {
    g.strokeStyle = 'rgba(255,255,255,0.65)';
    g.lineWidth = 1.5;
    for (let i = 0; i < 14; i++) {
      const x = (rng() - 0.5) * SIZE * 0.9;
      const y = (rng() - 0.5) * SIZE * 0.9;
      const l = 6 + rng() * 10;
      g.beginPath();
      for (let k = 0; k < 3; k++) {
        const a = (k * Math.PI) / 3;
        g.moveTo(x - Math.cos(a) * l, y - Math.sin(a) * l);
        g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
      }
      g.stroke();
    }
  }
  if (S.snowflakes) {
    // Flocons de neige à six branches
    g.strokeStyle = 'rgba(255,255,255,0.85)';
    g.lineWidth = 1.6;
    g.lineCap = 'round';
    for (let i = 0; i < 11; i++) {
      const x = (rng() - 0.5) * SIZE * 0.9;
      const y = (rng() - 0.5) * SIZE * 0.9;
      const l = 5 + rng() * 7;
      g.beginPath();
      for (let k = 0; k < 6; k++) {
        const a = (k * Math.PI) / 3;
        const ex = x + Math.cos(a) * l;
        const ey = y + Math.sin(a) * l;
        g.moveTo(x, y);
        g.lineTo(ex, ey);
        // petites barbes
        g.moveTo(x + Math.cos(a) * l * 0.55, y + Math.sin(a) * l * 0.55);
        g.lineTo(x + Math.cos(a + 0.5) * l * 0.8, y + Math.sin(a + 0.5) * l * 0.8);
      }
      g.stroke();
    }
  }
  if (S.smoke) {
    for (let i = 0; i < 7; i++) {
      const x = (rng() - 0.5) * SIZE * 0.8;
      const y = (rng() - 0.5) * SIZE * 0.8;
      const sm = g.createRadialGradient(x, y, 0, x, y, 30 + rng() * 30);
      sm.addColorStop(0, 'rgba(140,100,255,0.35)');
      sm.addColorStop(1, 'rgba(140,100,255,0)');
      g.fillStyle = sm;
      g.fillRect(-r, -r, SIZE, SIZE);
    }
  }
  if (S.veins) {
    g.save();
    g.lineJoin = 'round';
    g.lineCap = 'round';
    for (let i = 0; i < 12; i++) {
      const col = S.veins[i % 2];
      g.shadowColor = col;
      g.shadowBlur = 12;
      g.strokeStyle = col;
      g.lineWidth = 1.5 + rng() * 2;
      let x = (rng() - 0.5) * SIZE * 0.3;
      let y = (rng() - 0.5) * SIZE * 0.3;
      const a0 = rng() * Math.PI * 2;
      g.beginPath();
      g.moveTo(x, y);
      for (let k = 0; k < 6; k++) {
        x += Math.cos(a0 + (rng() - 0.5) * 1.6) * 22;
        y += Math.sin(a0 + (rng() - 0.5) * 1.6) * 22;
        g.lineTo(x, y);
      }
      g.stroke();
    }
    g.restore();
  }
  if (S.rivets) {
    g.fillStyle = 'rgba(60,70,90,0.55)';
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      g.beginPath();
      g.arc(Math.cos(a) * r * 0.82, Math.sin(a) * r * 0.82, 4, 0, Math.PI * 2);
      g.fill();
    }
  }
  if (S.cracks) {
    g.save();
    g.shadowColor = S.glow;
    g.shadowBlur = 10;
    g.strokeStyle = '#ffb04a';
    g.lineWidth = 2.5;
    g.lineJoin = 'round';
    for (let i = 0; i < 9; i++) {
      let x = (rng() - 0.5) * SIZE * 0.8;
      let y = (rng() - 0.5) * SIZE * 0.8;
      g.beginPath();
      g.moveTo(x, y);
      for (let k = 0; k < 4; k++) {
        x += (rng() - 0.5) * 34;
        y += (rng() - 0.5) * 34;
        g.lineTo(x, y);
      }
      g.stroke();
    }
    g.restore();
  }

  if (S.logo) {
    // Ballon officiel : panneau bleu nuit avec le monogramme « HB » et un anneau orange
    g.fillStyle = '#0d1838';
    g.beginPath();
    g.arc(0, 0, r * 0.46, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = '#ffb36b';
    g.lineWidth = SIZE * 0.025;
    g.beginPath();
    g.arc(0, 0, r * 0.38, 0, Math.PI * 2);
    g.stroke();
    g.fillStyle = '#ffffff';
    g.font = `900 ${Math.round(r * 0.42)}px system-ui, -apple-system, "Segoe UI", sans-serif`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('HB', 0, r * 0.03);
  }

  // Coutures (lumineuses pour certains ballons)
  g.save();
  if (S.glow) {
    g.shadowColor = S.glow;
    g.shadowBlur = 14;
  }
  g.strokeStyle = S.seam;
  g.lineWidth = SIZE * 0.03;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(0, -r);
  g.lineTo(0, r);
  g.moveTo(-r, 0);
  g.lineTo(r, 0);
  g.stroke();
  for (const side of [-1, 1]) {
    g.beginPath();
    g.arc(side * r * 1.32, 0, r * 0.98, 0, Math.PI * 2);
    g.stroke();
  }
  g.restore();
  g.restore();
  return c;
}

function createShading() {
  const c = makeCanvas(SIZE);
  const g = c.getContext('2d');
  const r = SIZE / 2;
  g.translate(r, r);
  g.beginPath();
  g.arc(0, 0, r - 1, 0, Math.PI * 2);
  g.clip();

  // Ombre propre (côté opposé à la lumière)
  const shadow = g.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.35, 0, 0, r * 1.02);
  shadow.addColorStop(0, 'rgba(0,0,0,0)');
  shadow.addColorStop(0.7, 'rgba(40,8,0,0.18)');
  shadow.addColorStop(1, 'rgba(30,5,0,0.55)');
  g.fillStyle = shadow;
  g.fillRect(-r, -r, SIZE, SIZE);

  // Reflet doux
  const hl = g.createRadialGradient(-r * 0.38, -r * 0.42, 0, -r * 0.38, -r * 0.42, r * 0.75);
  hl.addColorStop(0, 'rgba(255,240,220,0.55)');
  hl.addColorStop(0.35, 'rgba(255,220,180,0.18)');
  hl.addColorStop(1, 'rgba(255,220,180,0)');
  g.fillStyle = hl;
  g.fillRect(-r, -r, SIZE, SIZE);

  // Liseré sombre pour détacher le ballon du décor
  g.strokeStyle = 'rgba(40,10,0,0.45)';
  g.lineWidth = SIZE * 0.025;
  g.beginPath();
  g.arc(0, 0, r - SIZE * 0.0125, 0, Math.PI * 2);
  g.stroke();
  return c;
}

// ─── Visages (ballons amusants) ─────────────────────────────────────────────
//
// Dessinés à chaque image par-dessus le ballon, sans tourner avec lui : le visage reste droit, se décale
// un peu dans le sens du mouvement, cligne des yeux ; les « Yeux fous » roulent selon la vitesse.
// Repère : centre du ballon, y vers le BAS, rayon r.

const TAU = Math.PI * 2;

/**
 * @param {CanvasRenderingContext2D} g
 * @param {string} face  type de visage (skinInfo(id).face)
 * @param {number} r     rayon du ballon
 * @param {{vx:number, vy:number, t:number}} m  vitesse (y vers le haut) et temps (s)
 */
export function drawFace(g, face, r, m) {
  if (!face) return;
  const vx = m.vx ?? 0;
  const vy = m.vy ?? 0;
  const sp = Math.hypot(vx, vy);
  const lookX = Math.max(-1, Math.min(1, vx / 6));
  const lookY = Math.max(-1, Math.min(1, -vy / 8));
  const blink = (m.t % 3.7) < 0.12 ? 0.12 : 1;
  g.save();
  g.translate(lookX * r * 0.14, lookY * r * 0.08);
  const eye = (x, y, w, h, pupil = true, col = '#1b1020') => {
    g.save();
    g.translate(x, y);
    g.scale(1, blink);
    g.fillStyle = col;
    g.beginPath();
    g.ellipse(0, 0, w, h, 0, 0, TAU);
    g.fill();
    if (pupil) {
      g.fillStyle = 'rgba(255,255,255,0.9)';
      g.beginPath();
      g.arc(-w * 0.3 + lookX * w * 0.2, -h * 0.35, w * 0.32, 0, TAU);
      g.fill();
    }
    g.restore();
  };
  const smile = (y, w, depth, col = '#3a1608', lw = r * 0.09) => {
    g.strokeStyle = col;
    g.lineWidth = lw;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(-w, y);
    g.quadraticCurveTo(0, y + depth, w, y);
    g.stroke();
  };
  switch (face) {
    case 'smile':
      eye(-r * 0.3, -r * 0.18, r * 0.11, r * 0.17);
      eye(r * 0.3, -r * 0.18, r * 0.11, r * 0.17);
      g.fillStyle = 'rgba(255,90,90,0.35)';
      for (const sx of [-1, 1]) {
        g.beginPath();
        g.ellipse(sx * r * 0.52, r * 0.12, r * 0.13, r * 0.08, 0, 0, TAU);
        g.fill();
      }
      smile(r * 0.18, r * 0.36, r * 0.34);
      break;
    case 'pirate': {
      // Foulard rouge à pois sur le haut, bandeau sur l'œil gauche
      g.fillStyle = '#d62839';
      g.beginPath();
      g.arc(0, 0, r * 1.01, Math.PI * 1.08, Math.PI * 1.92);
      g.quadraticCurveTo(0, -r * 0.42, -r * 0.92, -r * 0.4);
      g.fill();
      g.fillStyle = '#fff';
      for (const [x, y] of [[-0.45, -0.66], [0, -0.78], [0.45, -0.66], [-0.2, -0.55], [0.24, -0.55]]) {
        g.beginPath();
        g.arc(x * r, y * r, r * 0.05, 0, TAU);
        g.fill();
      }
      g.strokeStyle = '#140a06';
      g.lineWidth = r * 0.05;
      g.beginPath();
      g.moveTo(-r * 0.95, -r * 0.3);
      g.lineTo(r * 0.75, -r * 0.05);
      g.stroke();
      g.fillStyle = '#140a06';
      g.beginPath();
      g.ellipse(-r * 0.3, -r * 0.12, r * 0.19, r * 0.16, -0.2, 0, TAU);
      g.fill();
      eye(r * 0.3, -r * 0.12, r * 0.1, r * 0.15);
      smile(r * 0.28, r * 0.3, r * 0.16);
      g.fillStyle = '#fff';
      g.fillRect(r * 0.02, r * 0.3, r * 0.12, r * 0.09);
      break;
    }
    case 'ninja': {
      // Masque noir sur les yeux, bandeau rouge dont les pans flottent à l'arrière
      const back = vx >= 0 ? -1 : 1;
      g.fillStyle = '#c1121f';
      g.beginPath();
      g.moveTo(back * r * 0.8, -r * 0.42);
      const wave = Math.sin(m.t * 14) * r * 0.12 * Math.min(1, 0.3 + sp / 8);
      g.quadraticCurveTo(back * r * 1.3, -r * 0.6 + wave, back * r * 1.7, -r * 0.35 + wave);
      g.lineTo(back * r * 1.6, -r * 0.18 + wave);
      g.quadraticCurveTo(back * r * 1.2, -r * 0.32 + wave, back * r * 0.85, -r * 0.2);
      g.fill();
      g.fillRect(-r, -r * 0.62, r * 2, r * 0.16);
      g.fillStyle = '#0a0c12';
      g.fillRect(-r, -r * 0.38, r * 2, r * 0.34);
      g.fillStyle = '#f2f4f8';
      for (const sx of [-1, 1]) {
        g.save();
        g.translate(sx * r * 0.3, -r * 0.21);
        g.scale(1, blink);
        g.beginPath();
        g.moveTo(-r * 0.15, 0);
        g.quadraticCurveTo(0, sx * -r * 0.0 - r * 0.12, r * 0.15, 0);
        g.quadraticCurveTo(0, r * 0.07, -r * 0.15, 0);
        g.fill();
        g.fillStyle = '#0a0c12';
        g.beginPath();
        g.arc(lookX * r * 0.05, -r * 0.01, r * 0.045, 0, TAU);
        g.fill();
        g.fillStyle = '#f2f4f8';
        g.restore();
      }
      break;
    }
    case 'robot': {
      // Antenne qui clignote, visière lumineuse, grille
      g.strokeStyle = '#55606f';
      g.lineWidth = r * 0.07;
      g.beginPath();
      g.moveTo(0, -r * 0.95);
      g.lineTo(0, -r * 1.3);
      g.stroke();
      const on = Math.sin(m.t * 6) > 0;
      g.fillStyle = on ? '#ff4d5e' : '#7a2630';
      g.beginPath();
      g.arc(0, -r * 1.36, r * 0.1, 0, TAU);
      g.fill();
      g.fillStyle = '#1a2230';
      g.beginPath();
      if (g.roundRect) g.roundRect(-r * 0.62, -r * 0.42, r * 1.24, r * 0.42, r * 0.14);
      else g.rect(-r * 0.62, -r * 0.42, r * 1.24, r * 0.42);
      g.fill();
      g.fillStyle = '#5ff4ff';
      g.shadowColor = '#5ff4ff';
      g.shadowBlur = r * 0.3;
      for (const sx of [-1, 1]) g.fillRect(sx * r * 0.28 - r * 0.1 + lookX * r * 0.05, -r * 0.3, r * 0.2, r * 0.18 * blink);
      g.shadowBlur = 0;
      g.fillStyle = '#3c4656';
      for (let i = 0; i < 5; i++) g.fillRect(-r * 0.3 + i * r * 0.14, r * 0.22, r * 0.07, r * 0.2);
      break;
    }
    case 'ghost':
      eye(-r * 0.28, -r * 0.12, r * 0.13, r * 0.22, false, '#2a2050');
      eye(r * 0.28, -r * 0.12, r * 0.13, r * 0.22, false, '#2a2050');
      g.fillStyle = '#2a2050';
      g.beginPath();
      g.ellipse(0, r * 0.36, r * 0.12, r * 0.16 + Math.sin(m.t * 3) * r * 0.03, 0, 0, TAU);
      g.fill();
      break;
    case 'googly':
      for (const sx of [-1, 1]) {
        const ex = sx * r * 0.3;
        const ey = -r * 0.2;
        g.fillStyle = '#fff';
        g.strokeStyle = '#2b1206';
        g.lineWidth = r * 0.04;
        g.beginPath();
        g.arc(ex, ey, r * 0.24, 0, TAU);
        g.fill();
        g.stroke();
        // Pupille qui roule : suit la vitesse, avec un tremblement quand ça va vite
        const wob = Math.min(1, sp / 6);
        const a = Math.atan2(-vy, vx) + Math.sin(m.t * (11 + sx)) * wob * 1.6;
        const d = r * 0.11 * (0.4 + 0.6 * wob);
        g.fillStyle = '#111';
        g.beginPath();
        g.arc(ex + Math.cos(a) * d, ey + Math.sin(a) * d + (wob < 0.2 ? r * 0.06 : 0), r * 0.11, 0, TAU);
        g.fill();
      }
      smile(r * 0.3, r * 0.22, r * 0.14);
      break;
    case 'santa': {
      // Père Noël : bonnet à bordure blanche et pompon, moustache, grande barbe, joues roses
      g.fillStyle = '#fbfdff';
      g.beginPath();
      g.arc(0, 0, r * 1.01, Math.PI * 0.06, Math.PI * 0.94);
      g.quadraticCurveTo(-r * 0.5, r * 0.12, 0, r * 0.2);
      g.quadraticCurveTo(r * 0.5, r * 0.12, r * Math.cos(Math.PI * 0.06), r * Math.sin(Math.PI * 0.06));
      g.fill();
      g.fillStyle = 'rgba(200,215,235,0.6)';
      for (const [x, y] of [[-0.4, 0.55], [0.1, 0.72], [0.45, 0.48], [-0.1, 0.42]]) {
        g.beginPath();
        g.arc(x * r, y * r, r * 0.07, 0, TAU);
        g.fill();
      }
      // Bordure du bonnet
      g.save();
      g.beginPath();
      g.arc(0, 0, r * 1.02, 0, TAU);
      g.clip();
      g.fillStyle = '#fbfdff';
      g.beginPath();
      g.moveTo(-r * 1.1, -r * 0.46);
      g.quadraticCurveTo(0, -r * 0.66, r * 1.1, -r * 0.46);
      g.lineTo(r * 1.1, -r * 0.7);
      g.quadraticCurveTo(0, -r * 0.92, -r * 1.1, -r * 0.7);
      g.closePath();
      g.fill();
      g.restore();
      g.fillStyle = '#fbfdff';
      g.beginPath();
      g.arc(r * 0.72, -r * 1.02, r * 0.17, 0, TAU);
      g.fill();
      eye(-r * 0.28, -r * 0.2, r * 0.09, r * 0.13);
      eye(r * 0.28, -r * 0.2, r * 0.09, r * 0.13);
      g.fillStyle = 'rgba(255,140,150,0.55)';
      for (const sx of [-1, 1]) {
        g.beginPath();
        g.ellipse(sx * r * 0.5, r * 0.02, r * 0.12, r * 0.08, 0, 0, TAU);
        g.fill();
      }
      g.fillStyle = '#f2f5fb';
      for (const sx of [-1, 1]) {
        g.beginPath();
        g.ellipse(sx * r * 0.18, r * 0.16, r * 0.2, r * 0.1, sx * 0.25, 0, TAU);
        g.fill();
      }
      g.fillStyle = '#e8828a';
      g.beginPath();
      g.arc(0, r * 0.06, r * 0.08, 0, TAU);
      g.fill();
      break;
    }
    case 'alien':
      // Deux antennes à boule lumineuse, grands yeux noirs en amande
      for (const sx of [-1, 1]) {
        g.strokeStyle = '#1f9e3a';
        g.lineWidth = r * 0.06;
        g.beginPath();
        g.moveTo(sx * r * 0.35, -r * 0.88);
        g.quadraticCurveTo(sx * r * 0.55, -r * 1.2, sx * r * 0.62, -r * 1.32);
        g.stroke();
        g.fillStyle = '#d8ff6a';
        g.shadowColor = '#d8ff6a';
        g.shadowBlur = r * 0.4 * (0.6 + 0.4 * Math.sin(m.t * 5 + sx));
        g.beginPath();
        g.arc(sx * r * 0.62, -r * 1.34, r * 0.1, 0, TAU);
        g.fill();
        g.shadowBlur = 0;
        g.save();
        g.translate(sx * r * 0.32, -r * 0.12);
        g.rotate(sx * 0.45);
        g.scale(1, blink);
        g.fillStyle = '#0b0f14';
        g.beginPath();
        g.ellipse(0, 0, r * 0.15, r * 0.26, 0, 0, TAU);
        g.fill();
        g.fillStyle = 'rgba(180,255,200,0.85)';
        g.beginPath();
        g.arc(-r * 0.04, -r * 0.1, r * 0.05, 0, TAU);
        g.fill();
        g.restore();
      }
      smile(r * 0.38, r * 0.12, r * 0.06, '#0b3a14', r * 0.05);
      break;
    default:
  }
  g.restore();
}

/** Aura des ballons légendaires : halo qui respire et étincelles en orbite (repère y vers le bas). */
export function drawAura(g, rgb, r, t) {
  const k = 0.75 + 0.25 * Math.sin(t * 3);
  const halo = g.createRadialGradient(0, 0, r * 0.8, 0, 0, r * 1.9);
  halo.addColorStop(0, `rgba(${rgb},${0.45 * k})`);
  halo.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = halo;
  g.beginPath();
  g.arc(0, 0, r * 1.9, 0, TAU);
  g.fill();
  g.fillStyle = `rgba(${rgb},0.95)`;
  for (let i = 0; i < 3; i++) {
    const a = t * 2.2 + (i * TAU) / 3;
    const rr = r * (1.3 + 0.08 * Math.sin(t * 4 + i));
    g.beginPath();
    g.arc(Math.cos(a) * rr, Math.sin(a) * rr * 0.55, r * 0.07, 0, TAU);
    g.fill();
  }
}
