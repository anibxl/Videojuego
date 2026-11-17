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

export function createBallTextures() {
  return { surface: createSurface(), shading: createShading() };
}

function createSurface() {
  const c = makeCanvas(SIZE);
  const g = c.getContext('2d');
  const r = SIZE / 2;
  g.translate(r, r);

  g.save();
  g.beginPath();
  g.arc(0, 0, r - 1, 0, Math.PI * 2);
  g.clip();

  // Cuir
  const base = g.createRadialGradient(0, 0, r * 0.2, 0, 0, r);
  base.addColorStop(0, '#f47a2a');
  base.addColorStop(1, '#de5f17');
  g.fillStyle = base;
  g.fillRect(-r, -r, SIZE, SIZE);

  // Grain du cuir
  const rng = createRng(7);
  for (let i = 0; i < 1400; i++) {
    const a = rng() * Math.PI * 2;
    const d = Math.sqrt(rng()) * r;
    g.fillStyle = rng() < 0.5 ? 'rgba(90,30,0,0.13)' : 'rgba(255,190,140,0.10)';
    g.beginPath();
    g.arc(Math.cos(a) * d, Math.sin(a) * d, 1.1 + rng() * 1.3, 0, Math.PI * 2);
    g.fill();
  }

  // Coutures
  g.strokeStyle = '#2b1206';
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
