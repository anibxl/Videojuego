// Décor de fond : nuit bleu profond, lumières floues (bokeh) et silhouettes géométriques en
// plusieurs plans de profondeur. Tout est procédural (aucune image) et peu coûteux à dessiner.

import { createRng } from '../core/math.js';

export class Background {
  constructor(level) {
    const rng = createRng(7);
    const { minX, maxX } = level.bounds;
    const span = maxX - minX;
    const layer = (p, color, minH, maxH, minW, maxW) => ({
      parallax: p,
      color,
      shapes: makeSkyline(rng, minX * p - 25, minX * p + span * p + 35, minH, maxH, minW, maxW),
    });

    // Plans de silhouettes : plus ils sont loin, plus ils sont clairs (brume) et lents
    this.layers = [
      layer(0.18, '#1b3150', 3.5, 8.5, 1.6, 3.2),
      layer(0.34, '#162a45', 2.2, 6, 1.2, 2.6),
      layer(0.55, '#112139', 1.2, 3.8, 1, 2.2),
    ];

    // Lumières floues
    const colors = ['255,190,140', '120,200,255', '255,140,170', '160,140,255'];
    this.bokeh = Array.from({ length: 26 }, () => ({
      x: minX * 0.25 + rng() * (span * 0.25 + 30) - 10,
      y: 2 + rng() * 9,
      r: 0.6 + rng() * 1.8,
      a: 0.05 + rng() * 0.09,
      c: colors[(rng() * colors.length) | 0],
      phase: rng() * Math.PI * 2,
    }));
    this._sprites = new Map();
  }

  _bokehSprite(c) {
    let s = this._sprites.get(c);
    if (s) return s;
    const size = 64;
    s = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(size, size) : document.createElement('canvas');
    s.width = s.height = size;
    const g = s.getContext('2d');
    const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grad.addColorStop(0, `rgba(${c},1)`);
    grad.addColorStop(0.55, `rgba(${c},0.4)`);
    grad.addColorStop(1, `rgba(${c},0)`);
    g.fillStyle = grad;
    g.fillRect(0, 0, size, size);
    this._sprites.set(c, s);
    return s;
  }

  /**
   * Ciel + halo d'horizon, précalculés en basse résolution (dégradés doux : aucune perte visible).
   * Un seul plaquage par image au lieu de deux grands remplissages en dégradé.
   */
  _skyCanvas(w, h) {
    if (this._sky && this._skyW === w && this._skyH === h) return this._sky;
    const sw = Math.max(16, Math.round(w / 4));
    const sh = Math.max(16, Math.round(h / 4));
    const c = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(sw, sh) : document.createElement('canvas');
    c.width = sw;
    c.height = sh;
    const g = c.getContext('2d');
    const lin = g.createLinearGradient(0, 0, 0, sh);
    lin.addColorStop(0, '#0a1222');
    lin.addColorStop(0.55, '#12233d');
    lin.addColorStop(1, '#1d3757');
    g.fillStyle = lin;
    g.fillRect(0, 0, sw, sh);
    const glow = g.createRadialGradient(sw * 0.5, sh * 0.62, 0, sw * 0.5, sh * 0.62, Math.max(sw, sh) * 0.7);
    glow.addColorStop(0, 'rgba(255,170,120,0.12)');
    glow.addColorStop(1, 'rgba(255,170,120,0)');
    g.fillStyle = glow;
    g.fillRect(0, 0, sw, sh);
    this._sky = c;
    this._skyW = w;
    this._skyH = h;
    return c;
  }

  draw(ctx, cam, w, h, time) {
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(this._skyCanvas(w, h), 0, 0, w, h);
    const s = cam.scale;

    // Bokeh
    ctx.globalCompositeOperation = 'lighter';
    for (const b of this.bokeh) {
      const p = 0.25;
      const x = (b.x - cam.x * p) * s + w / 2;
      const y = h / 2 - (b.y - cam.y * p) * s;
      const r = b.r * s;
      if (x < -r || x > w + r || y < -r || y > h + r) continue;
      ctx.globalAlpha = b.a * (0.75 + 0.25 * Math.sin(time * 0.6 + b.phase));
      ctx.drawImage(this._bokehSprite(b.c), x - r, y - r, r * 2, r * 2);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';

    // Silhouettes. Sous son pied, chaque plan n'est rempli que jusqu'au pied du plan suivant
    // (plus proche) : on évite de repeindre trois fois le bas de l'écran.
    for (let li = 0; li < this.layers.length; li++) {
      const layer = this.layers[li];
      const p = layer.parallax;
      const baseY = h / 2 + cam.y * p * s; // pied des silhouettes
      const next = this.layers[li + 1];
      const fillTo = next ? Math.min(h, h / 2 + cam.y * next.parallax * s) : h;
      ctx.fillStyle = layer.color;
      for (const sh of layer.shapes) {
        const x = (sh.x - cam.x * p) * s + w / 2;
        const ww = sh.w * s;
        if (x + ww < 0 || x > w) continue;
        const top = baseY - sh.h * s;
        const r = Math.min(ww * 0.5, sh.round * s);
        ctx.beginPath();
        ctx.moveTo(x, baseY + 1);
        ctx.lineTo(x, top + r);
        ctx.quadraticCurveTo(x, top, x + r, top);
        ctx.lineTo(x + ww - r, top);
        ctx.quadraticCurveTo(x + ww, top, x + ww, top + r);
        ctx.lineTo(x + ww, baseY + 1);
        ctx.closePath();
        ctx.fill();
      }
      if (baseY < fillTo) ctx.fillRect(0, baseY, w, fillTo - baseY);
    }
  }
}

function makeSkyline(rng, x0, x1, minH, maxH, minW, maxW) {
  const out = [];
  let x = x0;
  while (x < x1) {
    const w = minW + rng() * (maxW - minW);
    out.push({ x, w, h: minH + rng() * (maxH - minH), round: rng() < 0.3 ? w * 0.5 : 0.22 });
    x += w + rng() * 0.6;
  }
  return out;
}
