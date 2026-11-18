// Décor de fond d'un monde : ciel, astres, plans de silhouettes en parallaxe, effets propres au
// monde (fenêtres et lampadaires, brume, éruptions, rayons de lumière, étoiles…) et particules
// d'ambiance. Tout est procédural et peu coûteux :
//  - le ciel (dégradés, nébuleuses, étoiles, astres) est précalculé une fois par taille d'écran ;
//  - les silhouettes sont de simples chemins remplis, seulement ceux qui sont à l'écran ;
//  - les particules sont des fonctions du temps (aucune mise à jour, aucune allocation).

import { createRng } from '../core/math.js';
import { themeOf } from './themes.js';

const TAU = Math.PI * 2;
const wrap = (v, m) => ((v % m) + m) % m;

function makeCanvas(w, h) {
  const c = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(w, h) : document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function hashString(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

export class Background {
  /**
   * @param {{bounds:{minX:number,maxX:number}, theme?:string}} level
   * @param {{particles?:number}} [options]  particles : facteur de densité (qualité graphique)
   */
  constructor(level, options = {}) {
    this.themeId = level.theme ?? 'city';
    this.theme = themeOf(this.themeId);
    const T = this.theme;
    const rng = createRng(hashString(this.themeId) % 100000 + 7);
    const { minX, maxX } = level.bounds;
    const span = maxX - minX;
    const density = options.particles ?? 1;

    this.layers = T.layers.map((def) => ({
      ...def,
      shapes: makeShapes(def, rng, minX * def.parallax - 25, minX * def.parallax + span * def.parallax + 35),
    }));

    this.bokeh = (T.bokeh ?? []).length
      ? Array.from({ length: 12 }, () => ({
          x: minX * 0.25 + rng() * (span * 0.25 + 30) - 10,
          y: 2 + rng() * 9,
          r: 0.6 + rng() * 1.8,
          a: 0.04 + rng() * 0.08,
          c: T.bokeh[(rng() * T.bokeh.length) | 0],
          phase: rng() * TAU,
        }))
      : [];

    const P = T.particles;
    const count = Math.round(P.count * density);
    this.particles = Array.from({ length: count }, (_, i) => makeParticle(P.kind, P.colors, rng, i / Math.max(1, count)));
    this.ash = T.ash ? Array.from({ length: Math.round(T.ash.count * density) }, () => makeParticle('ash', [T.ash.color], rng, rng())) : [];
    this.leaves = T.leaves ? Array.from({ length: Math.round(T.leaves.count * density) }, () => makeParticle('leaf', T.leaves.colors, rng, rng())) : [];
    this.rays = T.rays ? Array.from({ length: T.rays.count }, (_, i) => ({ x: 0.08 + (i + rng() * 0.6) / T.rays.count, w: 0.05 + rng() * 0.07, phase: rng() * TAU })) : [];
    this.twinkles = T.stars ? Array.from({ length: 22 }, () => ({ x: rng(), y: rng() * 0.75, r: 0.6 + rng() * 1.1, phase: rng() * TAU, speed: 1 + rng() * 2.5 })) : [];
    this._starSeed = (rng() * 1e6) | 0;
    this._sprites = new Map();
  }

  // ─── Ressources précalculées ──────────────────────────────────────────────

  _sprite(c, soft = 0.55) {
    const key = `${c}|${soft}`;
    let s = this._sprites.get(key);
    if (s) return s;
    const size = 64;
    s = makeCanvas(size, size);
    const g = s.getContext('2d');
    const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grad.addColorStop(0, `rgba(${c},1)`);
    grad.addColorStop(soft, `rgba(${c},0.35)`);
    grad.addColorStop(1, `rgba(${c},0)`);
    g.fillStyle = grad;
    g.fillRect(0, 0, size, size);
    this._sprites.set(key, s);
    return s;
  }

  /**
   * Ciel complet (dégradé, halo, nébuleuses, étoiles, astres), précalculé à la résolution exacte de
   * l'écran (pixels physiques) : une copie 1:1 par image, sans mise à l'échelle (bien moins coûteux).
   * Recalculé seulement si la taille change.
   */
  _skyCanvas(w, h, dpr = 1) {
    if (this._sky && this._skyW === w && this._skyH === h && this._skyDpr === dpr) return this._sky;
    const T = this.theme;
    // Dégradés : basse résolution (aucune perte visible), puis agrandis dans le canvas final
    const lw = Math.max(16, Math.round(w / 4));
    const lh = Math.max(16, Math.round(h / 4));
    const low = makeCanvas(lw, lh);
    const g = low.getContext('2d');
    const lin = g.createLinearGradient(0, 0, 0, lh);
    for (const [o, c] of T.sky.stops) lin.addColorStop(o, c);
    g.fillStyle = lin;
    g.fillRect(0, 0, lw, lh);
    const glow = g.createRadialGradient(lw * 0.5, lh * 0.75, 0, lw * 0.5, lh * 0.75, Math.max(lw, lh) * 0.75);
    glow.addColorStop(0, `rgba(${T.sky.glow},${T.sky.glowAlpha})`);
    glow.addColorStop(1, `rgba(${T.sky.glow},0)`);
    g.fillStyle = glow;
    g.fillRect(0, 0, lw, lh);
    for (const c of T.celestial) {
      if (c.kind !== 'nebula') continue;
      const r = c.r * Math.max(lw, lh);
      const n = g.createRadialGradient(c.x * lw, c.y * lh, 0, c.x * lw, c.y * lh, r);
      n.addColorStop(0, `rgba(${c.color},0.32)`);
      n.addColorStop(0.5, `rgba(${c.color},0.1)`);
      n.addColorStop(1, `rgba(${c.color},0)`);
      g.fillStyle = n;
      g.fillRect(0, 0, lw, lh);
    }

    const sky = makeCanvas(Math.max(1, Math.round(w * dpr)), Math.max(1, Math.round(h * dpr)));
    const s = sky.getContext('2d');
    s.scale(dpr, dpr);
    s.imageSmoothingEnabled = true;
    s.drawImage(low, 0, 0, w, h);

    // Étoiles fixes (espace)
    if (T.stars) {
      const rng = createRng(this._starSeed);
      for (let i = 0; i < T.stars; i++) {
        const x = rng() * w;
        const y = rng() * h * 0.85;
        const r = rng() < 0.85 ? 0.6 + rng() * 0.6 : 1.2 + rng() * 0.8;
        s.fillStyle = `rgba(255,255,255,${0.35 + rng() * 0.55})`;
        s.beginPath();
        s.arc(x, y, r, 0, TAU);
        s.fill();
      }
    }

    const m = Math.min(w, h);
    for (const c of T.celestial) {
      const x = c.x * w;
      const y = c.y * h;
      const r = c.r * m * 1.6;
      if (c.kind === 'sun') {
        const halo = s.createRadialGradient(x, y, 0, x, y, r * 6);
        halo.addColorStop(0, `rgba(${c.color},0.6)`);
        halo.addColorStop(0.25, `rgba(${c.color},0.22)`);
        halo.addColorStop(1, `rgba(${c.color},0)`);
        s.fillStyle = halo;
        s.fillRect(x - r * 6, y - r * 6, r * 12, r * 12);
        const disk = s.createLinearGradient(0, y - r, 0, y + r);
        disk.addColorStop(0, '#fff1c9');
        disk.addColorStop(1, '#ff9a5c');
        s.fillStyle = disk;
        s.beginPath();
        s.arc(x, y, r, 0, TAU);
        s.fill();
        // Bandes du soleil couchant
        s.fillStyle = 'rgba(208,88,106,0.55)';
        for (let i = 0; i < 4; i++) s.fillRect(x - r, y + r * (0.15 + i * 0.22), r * 2, r * (0.05 + i * 0.03));
      } else if (c.kind === 'moon') {
        const halo = s.createRadialGradient(x, y, 0, x, y, r * 3.5);
        halo.addColorStop(0, `rgba(${c.color},0.35)`);
        halo.addColorStop(1, `rgba(${c.color},0)`);
        s.fillStyle = halo;
        s.fillRect(x - r * 4, y - r * 4, r * 8, r * 8);
        s.fillStyle = `rgb(${c.color})`;
        s.beginPath();
        s.arc(x, y, r, 0, TAU);
        s.fill();
        s.fillStyle = 'rgba(160,180,215,0.35)';
        s.beginPath();
        s.arc(x - r * 0.3, y - r * 0.2, r * 0.22, 0, TAU);
        s.arc(x + r * 0.35, y + r * 0.25, r * 0.15, 0, TAU);
        s.fill();
      } else if (c.kind === 'earth') {
        const atm = s.createRadialGradient(x, y, r * 0.9, x, y, r * 1.6);
        atm.addColorStop(0, 'rgba(120,190,255,0.5)');
        atm.addColorStop(1, 'rgba(120,190,255,0)');
        s.fillStyle = atm;
        s.fillRect(x - r * 2, y - r * 2, r * 4, r * 4);
        const ocean = s.createRadialGradient(x - r * 0.4, y - r * 0.4, r * 0.1, x, y, r);
        ocean.addColorStop(0, '#5fb6ff');
        ocean.addColorStop(1, '#1a4f9c');
        s.fillStyle = ocean;
        s.beginPath();
        s.arc(x, y, r, 0, TAU);
        s.fill();
        s.save();
        s.clip();
        s.fillStyle = '#4fae6a';
        for (const [dx, dy, rx, ry] of [[-0.35, -0.2, 0.35, 0.22], [0.25, 0.25, 0.3, 0.2], [0.1, -0.45, 0.18, 0.1], [-0.1, 0.55, 0.25, 0.12]]) {
          s.beginPath();
          s.ellipse(x + dx * r, y + dy * r, rx * r, ry * r, 0.4, 0, TAU);
          s.fill();
        }
        s.fillStyle = 'rgba(255,255,255,0.5)';
        s.beginPath();
        s.ellipse(x + r * 0.1, y - r * 0.05, r * 0.7, r * 0.08, -0.3, 0, TAU);
        s.fill();
        // Côté nuit
        const night = s.createLinearGradient(x - r, y, x + r, y);
        night.addColorStop(0.45, 'rgba(5,3,26,0)');
        night.addColorStop(1, 'rgba(5,3,26,0.75)');
        s.fillStyle = night;
        s.fillRect(x - r, y - r, r * 2, r * 2);
        s.restore();
      } else if (c.kind === 'planet') {
        if (c.ring) {
          s.strokeStyle = `rgba(${c.color},0.45)`;
          s.lineWidth = r * 0.18;
          s.beginPath();
          s.ellipse(x, y, r * 2, r * 0.55, -0.35, 0, TAU);
          s.stroke();
        }
        const p = s.createRadialGradient(x - r * 0.4, y - r * 0.4, r * 0.1, x, y, r);
        p.addColorStop(0, `rgba(${c.color},1)`);
        p.addColorStop(1, 'rgba(90,40,70,1)');
        s.fillStyle = p;
        s.beginPath();
        s.arc(x, y, r, 0, TAU);
        s.fill();
      }
    }
    this._sky = sky;
    this._skyW = w;
    this._skyH = h;
    this._skyDpr = dpr;
    return sky;
  }

  // ─── Dessin ───────────────────────────────────────────────────────────────

  draw(ctx, cam, w, h, time) {
    const T = this.theme;
    ctx.imageSmoothingEnabled = true;
    const m = ctx.getTransform();
    const dpr = m.a;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(this._skyCanvas(w, h, dpr), 0, 0);
    ctx.setTransform(m);
    const s = cam.scale;

    if (this.twinkles.length) {
      ctx.fillStyle = '#ffffff';
      for (const t of this.twinkles) {
        const a = 0.5 + 0.5 * Math.sin(time * t.speed + t.phase);
        ctx.globalAlpha = a * 0.9;
        const x = t.x * w;
        const y = t.y * h;
        const r = t.r * (1 + a);
        ctx.fillRect(x - r * 2, y - 0.4, r * 4, 0.8);
        ctx.fillRect(x - 0.4, y - r * 2, 0.8, r * 4);
      }
      ctx.globalAlpha = 1;
    }

    // Lumières floues
    if (this.bokeh.length) {
      ctx.globalCompositeOperation = 'lighter';
      for (const b of this.bokeh) {
        const p = 0.25;
        const x = (b.x - cam.x * p) * s + w / 2;
        const y = h / 2 - (b.y - cam.y * p) * s;
        const r = b.r * s;
        if (x < -r || x > w + r || y < -r || y > h + r) continue;
        ctx.globalAlpha = b.a * (0.75 + 0.25 * Math.sin(time * 0.6 + b.phase));
        ctx.drawImage(this._sprite(b.c), x - r, y - r, r * 2, r * 2);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }

    // Particules lointaines (derrière les silhouettes)
    this._drawParticles(ctx, cam, w, h, time, 0);

    // Plans de silhouettes. Sous son pied, chaque plan n'est rempli que jusqu'au pied du plan suivant.
    for (let li = 0; li < this.layers.length; li++) {
      const layer = this.layers[li];
      const p = layer.parallax;
      const baseY = h / 2 + cam.y * p * s;
      const next = this.layers[li + 1];
      const fillTo = next ? Math.min(h, h / 2 + cam.y * next.parallax * s) : h;
      const ox = w / 2 - cam.x * p * s;
      drawLayer(ctx, layer, ox, baseY, s, w, h, time, this);
      if (baseY < fillTo) {
        ctx.fillStyle = layer.color;
        ctx.fillRect(0, baseY, w, fillTo - baseY);
      }
      if (layer.river && baseY < h) this._drawRiver(ctx, baseY, w, s, time, ox);
      // Brume entre les plans (neige)
      if (T.fog && li === 1) this._drawFog(ctx, baseY, w, h, s);
    }

    // Rayons de lumière (forêt)
    if (this.rays.length) {
      ctx.globalCompositeOperation = 'lighter';
      const c = T.rays.color;
      if (!this._rayGrad || this._rayH !== h) {
        this._rayGrad = ctx.createLinearGradient(0, 0, 0, h);
        this._rayGrad.addColorStop(0, `rgba(${c},0.17)`);
        this._rayGrad.addColorStop(1, `rgba(${c},0)`);
        this._rayH = h;
      }
      ctx.fillStyle = this._rayGrad;
      for (const r of this.rays) {
        ctx.globalAlpha = 0.6 + 0.4 * Math.sin(time * 0.35 + r.phase);
        const x = wrap(r.x * w - cam.x * 0.08 * s, w * 1.2) - w * 0.1;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x + r.w * w, 0);
        ctx.lineTo(x + r.w * w + h * 0.45, h);
        ctx.lineTo(x + h * 0.45 - r.w * w * 0.5, h);
        ctx.closePath();
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }
  }

  /** Particules au premier plan (devant le niveau) : quelques flocons, braises, lucioles… */
  drawFront(ctx, cam, w, h, time) {
    this._drawParticles(ctx, cam, w, h, time, 1);
  }

  _drawFog(ctx, baseY, w, h, s) {
    const F = this.theme.fog;
    const top = baseY - s * 3.5;
    const bottom = Math.min(h, baseY + s * 1.5);
    if (bottom <= top) return;
    const grad = ctx.createLinearGradient(0, top, 0, bottom);
    grad.addColorStop(0, `rgba(${F.color},0)`);
    grad.addColorStop(0.6, `rgba(${F.color},${F.alpha})`);
    grad.addColorStop(1, `rgba(${F.color},${F.alpha * 0.6})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, top, w, bottom - top);
  }

  _drawRiver(ctx, baseY, w, s, time, ox) {
    const hh = s * 0.5;
    const grad = ctx.createLinearGradient(0, baseY, 0, baseY + hh);
    grad.addColorStop(0, 'rgba(120,200,190,0.55)');
    grad.addColorStop(1, 'rgba(40,110,110,0.4)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, baseY, w, hh);
    ctx.fillStyle = 'rgba(220,255,240,0.35)';
    for (let i = 0; i < 14; i++) {
      const x = wrap(ox * 0.6 + i * 97 + time * 18, w + 120) - 60;
      ctx.fillRect(x, baseY + hh * (0.25 + 0.5 * ((i * 7) % 5) / 5), 26 + (i % 3) * 12, 1.5);
    }
  }

  _drawParticles(ctx, cam, w, h, time, front) {
    const s = cam.scale;
    const list = this.particles;
    const kind = this.theme.particles.kind;
    const W = w + 80;
    const H = h + 80;
    const additive = kind !== 'snow';
    if (additive) ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < list.length; i++) {
      const p = list[i];
      if (p.front !== front) continue;
      const px = wrap(p.u * W + p.su * time * 60 - cam.x * p.par * s + Math.sin(time * p.wf + p.ph) * p.wa, W) - 40;
      const py = wrap(p.v * H + p.sv * time * 60 + cam.y * p.par * s + Math.cos(time * p.wf * 0.8 + p.ph) * p.wa * 0.6, H) - 40;
      let a = p.a;
      if (kind === 'fireflies' || kind === 'stardust' || kind === 'motes') a *= 0.35 + 0.65 * Math.max(0, Math.sin(time * p.blink + p.ph));
      else if (kind === 'embers') a *= 0.6 + 0.4 * Math.sin(time * p.blink + p.ph);
      if (a <= 0.01) continue;
      ctx.globalAlpha = a;
      if (kind === 'snow') {
        ctx.fillStyle = `rgb(${p.c})`;
        ctx.beginPath();
        ctx.arc(px, py, p.r, 0, TAU);
        ctx.fill();
      } else {
        const r = p.r * 3;
        ctx.drawImage(this._sprite(p.c, kind === 'embers' ? 0.25 : 0.4), px - r, py - r, r * 2, r * 2);
      }
    }
    if (additive) ctx.globalCompositeOperation = 'source-over';
    // Cendres (volcan) et feuilles (forêt) : en fond seulement
    if (front === 0) {
      for (const p of this.ash) {
        const px = wrap(p.u * W + p.su * time * 60 - cam.x * p.par * s, W) - 40;
        const py = wrap(p.v * H + p.sv * time * 60 + cam.y * p.par * s, H) - 40;
        ctx.globalAlpha = p.a;
        ctx.fillStyle = `rgb(${p.c})`;
        ctx.fillRect(px, py, p.r * 1.6, p.r * 1.6);
      }
      for (const p of this.leaves) {
        const px = wrap(p.u * W + p.su * time * 60 - cam.x * p.par * s + Math.sin(time * p.wf + p.ph) * p.wa, W) - 40;
        const py = wrap(p.v * H + p.sv * time * 60 + cam.y * p.par * s, H) - 40;
        ctx.globalAlpha = p.a;
        ctx.fillStyle = `rgb(${p.c})`;
        ctx.beginPath();
        ctx.ellipse(px, py, p.r * 2.2, p.r, time * p.blink + p.ph, 0, TAU);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }
}

// ─── Particules ─────────────────────────────────────────────────────────────

function makeParticle(kind, colors, rng, k) {
  const front = rng() < 0.3 ? 1 : 0;
  const near = front ? 1 : 0.4 + rng() * 0.6;
  const p = {
    u: rng(),
    v: rng(),
    su: 0,
    sv: 0,
    par: 0.15 + near * 0.5,
    wf: 0.3 + rng() * 0.8,
    wa: 0,
    ph: rng() * TAU,
    blink: 0.8 + rng() * 2,
    r: 1,
    a: 0.6,
    c: colors[(rng() * colors.length) | 0],
    front,
  };
  void k;
  switch (kind) {
    case 'snow':
      p.sv = (0.35 + rng() * 0.5) * near;
      p.su = -0.12 * near;
      p.wa = 10 + rng() * 14;
      p.r = (front ? 2.2 : 1) + rng() * 1.8 * near;
      p.a = front ? 0.75 : 0.45 + rng() * 0.35;
      break;
    case 'embers':
      p.sv = -(0.25 + rng() * 0.45) * near;
      p.su = 0.05 + rng() * 0.1;
      p.wa = 8 + rng() * 10;
      p.r = 0.8 + rng() * 1.3 * near;
      p.a = 0.55 + rng() * 0.4;
      break;
    case 'ash':
      p.sv = 0.08 + rng() * 0.12;
      p.su = 0.06;
      p.r = 0.8 + rng() * 1.2;
      p.a = 0.18 + rng() * 0.22;
      p.front = 0;
      break;
    case 'fireflies':
      p.su = (rng() - 0.5) * 0.08;
      p.sv = (rng() - 0.5) * 0.05;
      p.wa = 18 + rng() * 26;
      p.r = 1.1 + rng() * 1.1;
      p.a = 0.7 + rng() * 0.3;
      p.v = 0.3 + rng() * 0.7;
      break;
    case 'leaf':
      p.sv = 0.18 + rng() * 0.2;
      p.su = 0.08;
      p.wa = 20 + rng() * 20;
      p.r = 1.6 + rng() * 1.4;
      p.a = 0.55;
      p.front = 0;
      break;
    case 'stardust':
      p.su = -0.03 - rng() * 0.05;
      p.r = 0.6 + rng() * 1;
      p.a = 0.5 + rng() * 0.4;
      break;
    default: // motes : poussières lumineuses du soir
      p.su = 0.04 + rng() * 0.06;
      p.sv = -0.03 - rng() * 0.04;
      p.wa = 10 + rng() * 12;
      p.r = 0.8 + rng() * 1.2;
      p.a = 0.35 + rng() * 0.35;
  }
  return p;
}

// ─── Silhouettes ────────────────────────────────────────────────────────────

function makeShapes(def, rng, x0, x1) {
  const out = [];
  let x = x0;
  while (x < x1) {
    const w = def.minW + rng() * (def.maxW - def.minW);
    const h = def.minH + rng() * (def.maxH - def.minH);
    const sh = { x, w, h, seed: rng() };
    switch (def.kind) {
      case 'buildings': {
        sh.round = rng() < 0.15 ? 0.4 : 0.08;
        sh.step = rng() < 0.35 ? 0.2 + rng() * 0.3 : 0;
        sh.antenna = rng() < 0.25;
        if (def.windows) {
          sh.windows = [];
          const cols = Math.max(1, Math.floor((w - 0.3) / 0.45));
          const rows = Math.max(1, Math.floor((h - 0.6) / 0.6));
          for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) if (rng() < 0.32) sh.windows.push([0.25 + c * 0.45, 0.5 + r * 0.6]);
          }
        }
        if (def.lamps && rng() < 0.45) sh.lamp = 0.2 + rng() * 0.6;
        if (def.graffiti && rng() < 0.45) {
          const hues = ['255,95,140', '80,220,255', '255,210,80', '160,120,255', '90,240,170'];
          sh.tag = { c1: hues[(rng() * hues.length) | 0], c2: hues[(rng() * hues.length) | 0], u: 0.12 + rng() * 0.2, v: 0.3 + rng() * 0.15 };
        }
        x += w + rng() * (def.gap ?? 0.5);
        break;
      }
      case 'mountains':
        sh.peak = 0.35 + rng() * 0.3;
        x += w * (0.45 + rng() * 0.3);
        break;
      case 'firs':
        x += w * (0.55 + rng() * 0.7);
        break;
      case 'volcanoes':
        sh.crater = 0.12 + rng() * 0.08;
        sh.phase = rng() * 10;
        x += w * (1.1 + rng() * 0.8);
        break;
      case 'rocks': {
        sh.pts = [];
        const n = 4 + ((rng() * 3) | 0);
        for (let i = 0; i <= n; i++) sh.pts.push([i / n, i === 0 || i === n ? 0 : 0.55 + rng() * 0.45]);
        x += w * (0.7 + rng() * 0.4);
        break;
      }
      case 'trees':
        sh.blobs = Array.from({ length: 3 + ((rng() * 3) | 0) }, () => [rng() * 2 - 1, rng() * 0.6, 0.9 + rng() * 1.1]);
        sh.mush = def.mushrooms && rng() < 0.4 ? 0.3 + rng() * 0.5 : 0;
        x += w + 0.6 + rng() * 2.6;
        break;
      case 'asteroidsBg':
        sh.y = 4 + rng() * 6;
        sh.speed = 0.05 + rng() * 0.12;
        x += w * (1 + rng());
        break;
      case 'craters':
        sh.holes = Array.from({ length: 1 + ((rng() * 2) | 0) }, () => [0.2 + rng() * 0.6, 0.3 + rng() * 0.3]);
        x += w * (0.6 + rng() * 0.4);
        break;
      default:
        x += w;
    }
    out.push(sh);
  }
  return out;
}

/**
 * Dessine un plan de silhouettes. Les formes d'un même plan sont regroupées en quelques chemins
 * (un remplissage par couleur au lieu d'un par forme) : beaucoup moins d'appels de dessin.
 */
function drawLayer(ctx, layer, ox, baseY, s, w, h, time, bg) {
  const kind = layer.kind;
  const body = new Path2D();
  const detail = new Path2D(); // neige des sommets, fenêtres, feuillage, cratères…
  const extras = [];           // formes dessinées à part (lampadaires, graffitis, volcans…)
  let hasDetail = false;
  for (const sh of layer.shapes) {
    const x = ox + sh.x * s;
    const ww = sh.w * s;
    const margin = kind === 'trees' ? ww * 2 : kind === 'mountains' || kind === 'volcanoes' ? ww : 0;
    if (x + ww + margin < 0 || x - margin > w) continue;
    const top = baseY - sh.h * s;
    switch (kind) {
      case 'buildings': {
        const r = Math.min(ww * 0.5, sh.round * s);
        body.moveTo(x, baseY + 1);
        body.lineTo(x, top + r);
        body.quadraticCurveTo(x, top, x + r, top);
        if (sh.step) {
          body.lineTo(x + ww * 0.55, top);
          body.lineTo(x + ww * 0.55, top + sh.step * s);
          body.lineTo(x + ww, top + sh.step * s);
        } else {
          body.lineTo(x + ww - r, top);
          body.quadraticCurveTo(x + ww, top, x + ww, top + r);
        }
        body.lineTo(x + ww, baseY + 1);
        body.closePath();
        if (sh.antenna) body.rect(x + ww * 0.3, top - s * 0.6, Math.max(1, s * 0.05), s * 0.6);
        if (sh.windows) {
          const ws = s * 0.16;
          for (const [u, v] of sh.windows) {
            const wy = top + v * s;
            if (wy > baseY - ws) continue;
            detail.rect(x + u * s, wy, ws, ws * 1.3);
            hasDetail = true;
          }
        }
        if (sh.tag || sh.lamp) extras.push([sh, x, ww, top]);
        break;
      }
      case 'mountains': {
        const px = x + ww * sh.peak;
        body.moveTo(x - ww * 0.6, baseY + 1);
        body.lineTo(px, top);
        body.lineTo(x + ww * 1.6, baseY + 1);
        body.closePath();
        const k = 0.28;
        detail.moveTo(px, top);
        detail.lineTo(px + (ww * 1.6 - ww * sh.peak) * k, top + sh.h * s * k);
        detail.lineTo(px + ww * 0.12, top + sh.h * s * k * 0.75);
        detail.lineTo(px - ww * 0.05, top + sh.h * s * k * 1.05);
        detail.lineTo(px - (ww * sh.peak + ww * 0.6) * k, top + sh.h * s * k);
        detail.closePath();
        hasDetail = true;
        break;
      }
      case 'firs': {
        const cx = x + ww / 2;
        const tiers = 3;
        const th = (sh.h * s) / (tiers - 0.4);
        for (let i = 0; i < tiers; i++) {
          const ty = top + (sh.h * s * i) / (tiers + 0.6);
          const tw = ww * (0.45 + i * 0.28);
          body.moveTo(cx, ty);
          body.lineTo(cx + tw, ty + th);
          body.lineTo(cx - tw, ty + th);
          body.closePath();
          detail.moveTo(cx, ty);
          detail.lineTo(cx + tw * 0.42, ty + th * 0.42);
          detail.lineTo(cx - tw * 0.42, ty + th * 0.42);
          detail.closePath();
        }
        body.rect(cx - ww * 0.08, baseY - sh.h * s * 0.12, ww * 0.16, sh.h * s * 0.12 + 1);
        hasDetail = true;
        break;
      }
      case 'rocks':
        body.moveTo(x, baseY + 1);
        for (const [u, v] of sh.pts) body.lineTo(x + u * ww, baseY - v * sh.h * s);
        body.lineTo(x + ww, baseY + 1);
        body.closePath();
        if (layer.cracks && sh.seed < 0.45) {
          const cx = x + ww * (0.3 + sh.seed * 0.4);
          detail.moveTo(cx, baseY);
          detail.lineTo(cx + ww * 0.08, baseY - sh.h * s * 0.3);
          detail.lineTo(cx - ww * 0.04, baseY - sh.h * s * 0.55);
          hasDetail = true;
        }
        break;
      case 'trees': {
        const cx = x + ww / 2;
        const sway = Math.sin(time * 0.5 + sh.seed * 6) * s * 0.06;
        body.rect(x + ww * 0.3, top + sh.h * s * 0.35, ww * 0.4, sh.h * s * 0.65 + 1);
        for (const [bx, by, br] of sh.blobs) {
          const r = br * ww * 0.9;
          detail.moveTo(cx + bx * ww + sway + r, top + by * sh.h * s * 0.4);
          detail.arc(cx + bx * ww + sway, top + by * sh.h * s * 0.4, r, 0, TAU);
        }
        hasDetail = true;
        if (sh.mush) extras.push([sh, x, ww, top]);
        break;
      }
      case 'craters':
        body.moveTo(x - ww * 0.2, baseY + 1);
        body.quadraticCurveTo(x + ww * 0.5, top - sh.h * s * 0.3, x + ww * 1.2, baseY + 1);
        body.closePath();
        for (const [u, v] of sh.holes) {
          detail.moveTo(x + u * ww + ww * 0.1, baseY - v * sh.h * s);
          detail.ellipse(x + u * ww, baseY - v * sh.h * s, ww * 0.1, ww * 0.035, 0, 0, TAU);
        }
        hasDetail = true;
        break;
      default:
        extras.push([sh, x, ww, top]);
    }
  }

  ctx.fillStyle = layer.color;
  ctx.fill(body);
  if (hasDetail) {
    switch (kind) {
      case 'buildings':
        ctx.fillStyle = layer.windows;
        ctx.fill(detail);
        break;
      case 'mountains':
      case 'firs':
        ctx.fillStyle = layer.snowCap;
        ctx.fill(detail);
        break;
      case 'rocks':
        ctx.strokeStyle = layer.cracks;
        ctx.lineWidth = Math.max(1, s * 0.03);
        ctx.globalAlpha = 0.35 + 0.3 * Math.sin(time * 1.4);
        ctx.stroke(detail);
        ctx.globalAlpha = 1;
        break;
      case 'trees':
        ctx.fillStyle = layer.canopy;
        ctx.fill(detail);
        break;
      case 'craters':
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.fill(detail);
        break;
      default:
    }
  }

  for (const [sh, x, ww, top] of extras) {
    switch (kind) {
      case 'buildings':
        drawBuildingExtras(ctx, layer, sh, x, ww, top, baseY, s, time);
        break;
      case 'trees': {
        const mx = x + ww * 1.4;
        const mr = s * sh.mush;
        ctx.fillStyle = 'rgba(230,220,200,0.55)';
        ctx.fillRect(mx - mr * 0.2, baseY - mr, mr * 0.4, mr);
        ctx.fillStyle = 'rgba(220,80,70,0.7)';
        ctx.beginPath();
        ctx.ellipse(mx, baseY - mr, mr * 0.8, mr * 0.5, 0, Math.PI, TAU);
        ctx.fill();
        break;
      }
      case 'volcanoes':
        ctx.fillStyle = layer.color;
        drawVolcano(ctx, layer, sh, x, ww, top, baseY, s, time, bg);
        break;
      case 'asteroidsBg': {
        const ay = baseY - sh.y * s + Math.sin(time * 0.3 + sh.seed * 9) * s * 0.3;
        const r = sh.h * s;
        ctx.fillStyle = layer.color;
        ctx.beginPath();
        ctx.ellipse(x + Math.sin(time * sh.speed) * s, ay, r * 1.2, r, sh.seed * 3, 0, TAU);
        ctx.fill();
        break;
      }
      default:
    }
  }
}

/** Graffitis et lampadaires d'un immeuble (le corps et les fenêtres sont regroupés). */
function drawBuildingExtras(ctx, layer, sh, x, ww, top, baseY, s, time) {
  if (sh.tag) {
    // Graffitis : un tag stylisé, deux couleurs vives
    const gx = x + ww * sh.tag.u;
    const gy = baseY - (baseY - top) * sh.tag.v;
    const gw = Math.min(ww * 0.7, s * 2.2);
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = `rgb(${sh.tag.c1})`;
    ctx.beginPath();
    ctx.ellipse(gx + gw * 0.3, gy, gw * 0.32, s * 0.28, -0.2, 0, TAU);
    ctx.ellipse(gx + gw * 0.72, gy - s * 0.06, gw * 0.26, s * 0.24, 0.25, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = `rgb(${sh.tag.c2})`;
    ctx.lineWidth = Math.max(1.5, s * 0.07);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(gx + gw * 0.08, gy + s * 0.1);
    ctx.quadraticCurveTo(gx + gw * 0.35, gy - s * 0.45, gx + gw * 0.55, gy + s * 0.05);
    ctx.quadraticCurveTo(gx + gw * 0.75, gy + s * 0.35, gx + gw * 0.95, gy - s * 0.2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  if (sh.lamp) {
    // Lampadaire moderne et son cône de lumière
    const lx = x + ww * sh.lamp;
    const lh = s * 2.6;
    ctx.fillStyle = layer.color;
    ctx.fillRect(lx - s * 0.035, baseY - lh, s * 0.07, lh);
    ctx.fillRect(lx - s * 0.035, baseY - lh, s * 0.45, s * 0.07);
    const hx = lx + s * 0.4;
    const hy = baseY - lh + s * 0.07;
    ctx.globalCompositeOperation = 'lighter';
    const flicker = 0.85 + 0.15 * Math.sin(time * 3 + sh.seed * 20);
    const cone = ctx.createLinearGradient(0, hy, 0, baseY);
    cone.addColorStop(0, `rgba(255,214,150,${0.22 * flicker})`);
    cone.addColorStop(1, 'rgba(255,214,150,0)');
    ctx.fillStyle = cone;
    ctx.beginPath();
    ctx.moveTo(hx - s * 0.12, hy);
    ctx.lineTo(hx + s * 0.12, hy);
    ctx.lineTo(hx + s * 1.1, baseY);
    ctx.lineTo(hx - s * 1.1, baseY);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = `rgba(255,230,180,${0.9 * flicker})`;
    ctx.fillRect(hx - s * 0.12, hy - s * 0.03, s * 0.24, s * 0.06);
    ctx.globalCompositeOperation = 'source-over';
  }
  ctx.fillStyle = layer.color;
}

function drawVolcano(ctx, layer, sh, x, ww, top, baseY, s, time, bg) {
  const cx = x + ww / 2;
  const cw = ww * sh.crater;
  ctx.beginPath();
  ctx.moveTo(x - ww * 0.3, baseY + 1);
  ctx.lineTo(cx - cw, top);
  ctx.lineTo(cx + cw, top);
  ctx.lineTo(x + ww * 1.3, baseY + 1);
  ctx.closePath();
  ctx.fill();
  // Coulée de lave sur le flanc (s'arrête à mi-pente)
  ctx.strokeStyle = 'rgba(255,100,30,0.4)';
  ctx.lineWidth = Math.max(1, s * 0.06);
  ctx.beginPath();
  ctx.moveTo(cx - cw * 0.3, top);
  ctx.quadraticCurveTo(cx - ww * 0.08, top + sh.h * s * 0.3, cx - ww * 0.14, top + sh.h * s * 0.55);
  ctx.stroke();
  // Éruption : lueur du cratère qui pulse + gerbes de lave (fonction du temps)
  const cycle = (time * 0.22 + sh.phase) % 1;
  const burst = cycle < 0.28 ? Math.sin((cycle / 0.28) * Math.PI) : 0;
  ctx.globalCompositeOperation = 'lighter';
  const gr = ww * (0.35 + burst * 0.35);
  ctx.globalAlpha = 0.35 + burst * 0.5;
  ctx.drawImage(bg._sprite('255,110,40', 0.35), cx - gr, top - gr * 0.7, gr * 2, gr * 1.6);
  if (burst > 0) {
    ctx.fillStyle = 'rgba(255,170,80,0.9)';
    for (let i = 0; i < 9; i++) {
      const a = -Math.PI / 2 + (i - 4) * 0.16;
      const t = cycle / 0.28;
      const v = s * (2.4 + (i % 3) * 0.6);
      const px = cx + Math.cos(a) * v * t;
      const py = top + Math.sin(a) * v * t + s * 3.2 * t * t;
      ctx.globalAlpha = 1 - t;
      ctx.fillRect(px - 1.5, py - 1.5, 3, 3);
    }
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = layer.color;
}
