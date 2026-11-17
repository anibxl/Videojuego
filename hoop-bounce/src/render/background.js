// Décor de fond : le ciel passe du crépuscule (bas de la tour) à la nuit étoilée (sommet).
// Silhouettes de la ville en parallaxe, étoiles, lune. Tout est procédural (aucune image).

import { clamp, createRng, lerp } from '../core/math.js';

// Palette du ciel selon l'altitude (0 = bas du niveau, 1 = sommet)
const SKY = [
  { at: 0.0, top: '#5b3a8e', bottom: '#ff9a6a' },
  { at: 0.45, top: '#2b2167', bottom: '#8a4f9e' },
  { at: 1.0, top: '#070a1f', bottom: '#1e1a4f' },
];

function hexToRgb(h) {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const SKY_RGB = SKY.map((s) => ({ at: s.at, top: hexToRgb(s.top), bottom: hexToRgb(s.bottom) }));

function skyAt(t, key) {
  for (let i = 0; i < SKY_RGB.length - 1; i++) {
    const a = SKY_RGB[i];
    const b = SKY_RGB[i + 1];
    if (t <= b.at) {
      const k = (t - a.at) / (b.at - a.at);
      const c = a[key].map((v, j) => Math.round(lerp(v, b[key][j], k)));
      return `rgb(${c[0]},${c[1]},${c[2]})`;
    }
  }
  const c = SKY_RGB[SKY_RGB.length - 1][key];
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

export class Background {
  constructor(levelHeight) {
    this.levelHeight = levelHeight;
    const rng = createRng(42);

    // Deux rangées d'immeubles (u, repère monde, parallaxe différente)
    this.layers = [
      { parallax: 0.35, color: '#4a3272', buildings: makeSkyline(rng, 2.2, 4.4, 0.9), windows: false },
      { parallax: 0.55, color: '#2c1f4f', buildings: makeSkyline(rng, 1.3, 3.2, 1.3), windows: true },
    ];
    for (const layer of this.layers) {
      if (!layer.windows) continue;
      layer.lights = [];
      for (const b of layer.buildings) {
        for (let y = 0.6; y < b.h - 0.4; y += 0.55) {
          for (let x = 0.25; x < b.w - 0.3; x += 0.42) {
            if (rng() < 0.32) layer.lights.push({ x: b.x + x, y, a: 0.35 + rng() * 0.5 });
          }
        }
      }
    }

    // Étoiles (apparaissent avec l'altitude)
    this.stars = Array.from({ length: 140 }, () => ({
      x: rng() * 14 - 2.5,
      y: 14 + rng() * (levelHeight * 0.55),
      r: 0.012 + rng() * 0.03,
      tw: rng() * Math.PI * 2,
    }));
  }

  /**
   * @param {CanvasRenderingContext2D} ctx  en espace écran (px CSS)
   * @param {import('./camera.js').Camera} cam
   */
  draw(ctx, cam, w, h, time) {
    const alt = clamp(cam.y / this.levelHeight, 0, 1);
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, skyAt(alt, 'top'));
    g.addColorStop(1, skyAt(alt, 'bottom'));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    const s = cam.scale;

    // Étoiles
    const starAlpha = clamp((alt - 0.15) / 0.4, 0, 1);
    if (starAlpha > 0) {
      const p = 0.5;
      ctx.fillStyle = '#ffffff';
      for (const st of this.stars) {
        const sx = (st.x - cam.x) * s + w / 2;
        const sy = h / 2 - (st.y - cam.y * p) * s;
        if (sy < -4 || sy > h + 4) continue;
        ctx.globalAlpha = starAlpha * (0.45 + 0.55 * Math.sin(time * 2 + st.tw) ** 2);
        ctx.beginPath();
        ctx.arc(sx, sy, Math.max(0.7, st.r * s), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    // Lune (vers le sommet)
    {
      const p = 0.55;
      const mx = (6.6 - cam.x) * s + w / 2;
      const my = h / 2 - (this.levelHeight * 0.59 - cam.y * p) * s;
      const mr = 1.1 * s;
      if (my > -mr * 4 && my < h + mr * 4) {
        const glow = ctx.createRadialGradient(mx, my, mr * 0.6, mx, my, mr * 4);
        glow.addColorStop(0, 'rgba(255,240,210,0.22)');
        glow.addColorStop(1, 'rgba(255,240,210,0)');
        ctx.fillStyle = glow;
        ctx.fillRect(mx - mr * 4, my - mr * 4, mr * 8, mr * 8);
        ctx.fillStyle = '#fff3dc';
        ctx.beginPath();
        ctx.arc(mx, my, mr, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(200,180,160,0.25)';
        ctx.beginPath();
        ctx.arc(mx - mr * 0.3, my - mr * 0.2, mr * 0.22, 0, Math.PI * 2);
        ctx.arc(mx + mr * 0.35, my + mr * 0.3, mr * 0.14, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Ville en parallaxe (posée au pied de la tour, elle disparaît en montant)
    // La ville s'efface en montant : au-dessus des toits, il ne reste que le ciel
    const cityAlpha = clamp(1 - (cam.y - 8) / 14, 0, 1);
    if (cityAlpha > 0) ctx.globalAlpha = cityAlpha;
    for (const layer of this.layers) {
      if (cityAlpha <= 0) break;
      const p = layer.parallax;
      const baseY = h / 2 - (0 - cam.y * p) * s; // y écran du pied des immeubles
      if (baseY < -2) continue;
      ctx.fillStyle = layer.color;
      for (const b of layer.buildings) {
        const x = (b.x - cam.x * p) * s + w / 2;
        ctx.fillRect(x, baseY - b.h * s, b.w * s + 1, b.h * s + h);
      }
      if (layer.lights) {
        ctx.fillStyle = '#ffc978';
        for (const l of layer.lights) {
          const x = (l.x - cam.x * p) * s + w / 2;
          const y = baseY - (l.y + 0.22) * s;
          ctx.globalAlpha = l.a * cityAlpha;
          ctx.fillRect(x, y, 0.16 * s, 0.22 * s);
        }
        ctx.globalAlpha = cityAlpha;
      }
    }
    ctx.globalAlpha = 1;
  }
}

function makeSkyline(rng, minH, maxH, minW) {
  const out = [];
  let x = -8;
  while (x < 18) {
    const w = minW + rng() * 1.6;
    out.push({ x, w, h: minH + rng() * (maxH - minH) });
    x += w + rng() * 0.25;
  }
  return out;
}
