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
  'ball-legend': { base: ['#2a2412', '#07060a'], grain: ['rgba(0,0,0,0.25)', 'rgba(255,210,120,0.07)'], seam: '#ffd36b', glow: '#ffb52e', shine: true },
};

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
