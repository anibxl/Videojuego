// Décor de fond d'un monde : ciel, astres, plans de décor détaillés en parallaxe, effets animés
// propres à chaque monde et particules d'ambiance. Tout est procédural et peu coûteux :
//  - le ciel (dégradés, nébuleuses, étoiles, astres) est précalculé à la résolution de l'écran ;
//  - les formes d'un même plan sont regroupées en quelques chemins (un remplissage par couleur) ;
//  - tout ce qui bouge (fenêtres, voitures, fumée, oiseaux, particules…) est une fonction du temps :
//    aucune mise à jour, aucune allocation par image.
//
// Ville : gratte-ciel, immeubles détaillés (fenêtres qui s'allument, néons, châteaux d'eau, balises),
//         voie rapide où passent des voitures, projecteurs. Neige : montagnes ombrées, sapins, brume,
//         petits flocons, rafales discrètes. Volcan : volcans fumants, roches éclairées par la lave,
//         rivière de lave, fumée, braises. Forêt : collines, arbres détaillés, herbe, rayons de soleil,
//         oiseaux, feuilles. Espace : station spatiale, astéroïdes, cratères, étoiles filantes.

import { createRng } from '../core/math.js';
import { themeOf } from './themes.js';

const TAU = Math.PI * 2;
const wrap = (v, m) => ((v % m) + m) % m;
const hash = (n) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

function makeCanvas(w, h) {
  const c = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(w, h) : document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

/** Mélange deux couleurs #rrggbb (t = part de la seconde). Autres formats : inchangés. */
function mixHex(a, b, t) {
  const re = /^#([0-9a-f]{6})$/i;
  if (!re.test(a ?? '') || !re.test(b ?? '')) return a;
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return `#${pa.map((v, i) => Math.round(v + (pb[i] - v) * t).toString(16).padStart(2, '0')).join('')}`;
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
    const rng = createRng((hashString(this.themeId) % 100000) + 7);
    const { minX, maxX } = level.bounds;
    const span = maxX - minX;
    const density = options.particles ?? 1;

    // Perspective atmosphérique (précalculée, aucun coût par image) : la silhouette des plans lointains
    // tire légèrement vers la couleur de l'horizon ; les plans proches gardent leur contraste.
    const horizon = T.sky?.stops?.[T.sky.stops.length - 1]?.[1];
    const n = T.layers.length;
    this.layers = T.layers.map((def, i) => {
      const k = n > 1 ? 1 - i / (n - 1) : 0;
      return {
        ...def,
        color: horizon && k > 0 ? mixHex(def.color, horizon, 0.2 * k) : def.color,
        shapes: makeShapes(def, rng, minX * def.parallax - 25, minX * def.parallax + span * def.parallax + 35),
      };
    });

    this.bokeh = (T.bokeh ?? []).length
      ? Array.from({ length: 12 }, () => ({
          x: minX * 0.25 + rng() * (span * 0.25 + 30) - 10,
          y: 2 + rng() * 9,
          r: 0.6 + rng() * 1.8,
          a: 0.04 + rng() * 0.07,
          c: T.bokeh[(rng() * T.bokeh.length) | 0],
          phase: rng() * TAU,
        }))
      : [];

    const P = T.particles;
    const count = Math.round(P.count * density);
    this.particles = Array.from({ length: count }, () => makeParticle(P.kind, P.colors, rng));
    this.ash = T.ash ? Array.from({ length: Math.round(T.ash.count * density) }, () => makeParticle('ash', [T.ash.color], rng)) : [];
    this.leaves = T.leaves ? Array.from({ length: Math.round(T.leaves.count * density) }, () => makeParticle('leaf', T.leaves.colors, rng)) : [];
    this.rays = T.rays ? Array.from({ length: T.rays.count }, (_, i) => ({ x: 0.08 + (i + rng() * 0.6) / T.rays.count, w: 0.04 + rng() * 0.06, phase: rng() * TAU })) : [];
    this.twinkles = T.twinkle ? Array.from({ length: T.twinkle }, () => ({ x: rng(), y: rng() * 0.6, r: 0.6 + rng() * 1.1, phase: rng() * TAU, speed: 0.8 + rng() * 2.2 })) : [];
    const E = T.effects ?? {};
    this.searchlights = Array.from({ length: E.searchlights ?? 0 }, (_, i) => ({ x: 0.25 + i * 0.5 + rng() * 0.1, speed: 0.12 + rng() * 0.08, phase: rng() * TAU }));
    this.gusts = Array.from({ length: E.gusts ?? 0 }, () => ({ y: 0.2 + rng() * 0.5, period: 6 + rng() * 5, phase: rng(), len: 0.25 + rng() * 0.2 }));
    this.smoke = Array.from({ length: E.smoke ?? 0 }, () => ({ x: rng(), period: 14 + rng() * 10, phase: rng(), r: 0.12 + rng() * 0.1 }));
    this.birds = Array.from({ length: E.birds ?? 0 }, () => ({ y: 0.12 + rng() * 0.25, speed: 0.025 + rng() * 0.02, phase: rng(), size: 0.7 + rng() * 0.6, flap: 6 + rng() * 3 }));
    this.shooting = !!E.shootingStars;
    // Effets d'identité des mondes (étape 10)
    this.planes = E.planes ? Array.from({ length: E.planes }, (_, i) => ({ y: 0.08 + rng() * 0.12, period: 26 + rng() * 14, phase: i * 0.5 + rng() * 0.3, dir: rng() < 0.5 ? -1 : 1, size: 0.8 + rng() * 0.5 })) : [];
    this.signs = E.neonSigns ? makeNeonSigns(rng, minX, span) : [];
    this.mist = E.mist ? Array.from({ length: Math.round(E.mist * density) }, () => ({ u: rng(), v: 0.62 + rng() * 0.36, r: 0.08 + rng() * 0.1, speed: 0.004 + rng() * 0.008, par: 0.5 + rng() * 0.4, phase: rng() * TAU, a: 0.1 + rng() * 0.12 })) : [];
    this.heat = !!E.heat;
    this.butterflies = E.butterflies ? Array.from({ length: E.butterflies }, () => ({ u: rng(), v: 0.4 + rng() * 0.35, ax: 0.04 + rng() * 0.06, ay: 0.03 + rng() * 0.05, fx: 0.15 + rng() * 0.2, fy: 0.3 + rng() * 0.3, phase: rng() * TAU, flap: 14 + rng() * 6, size: 0.9 + rng() * 0.5, c: ['255,200,80', '120,200,255', '255,140,190', '255,255,255'][(rng() * 4) | 0], par: 0.55 + rng() * 0.3 })) : [];
    this.floaters = E.floaters ? Array.from({ length: E.floaters }, () => makeFloater(rng)) : [];
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
        const tint = ['255,255,255', '200,215,255', '255,230,210'][(rng() * 3) | 0];
        s.fillStyle = `rgba(${tint},${0.3 + rng() * 0.6})`;
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
      if (c.kind === 'smoke') {
        // Nuages de fumée sombres (volcan)
        const sm = s.createRadialGradient(x, y, 0, x, y, c.r * Math.max(w, h));
        sm.addColorStop(0, `rgba(${c.color},0.55)`);
        sm.addColorStop(1, `rgba(${c.color},0)`);
        s.fillStyle = sm;
        s.fillRect(0, 0, w, h);
      } else if (c.kind === 'sun' && c.pale) {
        // Soleil d'hiver pâle derrière un voile
        const halo = s.createRadialGradient(x, y, 0, x, y, r * 7);
        halo.addColorStop(0, `rgba(${c.color},0.75)`);
        halo.addColorStop(0.2, `rgba(${c.color},0.3)`);
        halo.addColorStop(1, `rgba(${c.color},0)`);
        s.fillStyle = halo;
        s.fillRect(x - r * 7, y - r * 7, r * 14, r * 14);
        s.fillStyle = `rgba(${c.color},0.95)`;
        s.beginPath();
        s.arc(x, y, r, 0, TAU);
        s.fill();
      } else if (c.kind === 'sun') {
        const halo = s.createRadialGradient(x, y, 0, x, y, r * 6);
        halo.addColorStop(0, `rgba(${c.color},0.6)`);
        halo.addColorStop(0.25, `rgba(${c.color},0.22)`);
        halo.addColorStop(1, `rgba(${c.color},0)`);
        s.fillStyle = halo;
        s.fillRect(x - r * 6, y - r * 6, r * 12, r * 12);
        const disk = s.createLinearGradient(0, y - r, 0, y + r);
        disk.addColorStop(0, '#fffdf2');
        disk.addColorStop(1, `rgb(${c.color})`);
        s.fillStyle = disk;
        s.beginPath();
        s.arc(x, y, r, 0, TAU);
        s.fill();
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
    if (this.shooting) this._drawShootingStar(ctx, w, h, time);
    if (this.smoke.length) this._drawSmoke(ctx, w, h, time, cam);
    if (this.searchlights.length) this._drawSearchlights(ctx, w, h, time);

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
    if (this.birds.length) this._drawBirds(ctx, w, h, time, cam);
    if (this.planes.length) this._drawPlanes(ctx, w, h, time);

    // Particules lointaines (derrière les plans)
    this._drawParticles(ctx, cam, w, h, time, 0);

    // Plans de décor. Sous son pied, chaque plan n'est rempli que jusqu'au pied du plan suivant.
    for (let li = 0; li < this.layers.length; li++) {
      const layer = this.layers[li];
      const p = layer.parallax;
      const baseY = h / 2 + cam.y * p * s;
      const next = this.layers[li + 1];
      const fillTo = next ? Math.min(h, h / 2 + cam.y * next.parallax * s) : h;
      const ox = w / 2 - cam.x * p * s;
      drawLayer(ctx, layer, ox, baseY, s, w, h, time, this);
      if (this.signs.length && li === 1) this._drawSigns(ctx, ox, baseY, s, w, time, layer.parallax);
      if (this.floaters.length && li === 0) this._drawFloaters(ctx, cam, w, h, time);
      if (baseY < fillTo) {
        ctx.fillStyle = layer.color;
        ctx.fillRect(0, baseY, w, fillTo - baseY);
      }
      if (T.fog && li === 1) this._drawFog(ctx, baseY, w, h, s);
    }

    if (this.gusts.length) this._drawGusts(ctx, w, h, time);
    if (this.mist.length) this._drawMist(ctx, cam, w, h, time);
    if (this.heat) this._drawHeat(ctx, w, h, time);
    if (this.butterflies.length) this._drawButterflies(ctx, cam, w, h, time);

    // Rayons de soleil entre les arbres (forêt)
    if (this.rays.length) {
      ctx.globalCompositeOperation = 'lighter';
      const c = T.rays.color;
      if (!this._rayGrad || this._rayH !== h) {
        this._rayGrad = ctx.createLinearGradient(0, 0, 0, h);
        this._rayGrad.addColorStop(0, `rgba(${c},0.2)`);
        this._rayGrad.addColorStop(1, `rgba(${c},0)`);
        this._rayH = h;
      }
      ctx.fillStyle = this._rayGrad;
      for (const r of this.rays) {
        ctx.globalAlpha = 0.55 + 0.45 * Math.sin(time * 0.3 + r.phase);
        const x = wrap(r.x * w - cam.x * 0.08 * s, w * 1.2) - w * 0.1;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x + r.w * w, 0);
        ctx.lineTo(x + r.w * w + h * 0.5, h);
        ctx.lineTo(x + h * 0.5 - r.w * w * 0.6, h);
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

  // ─── Effets propres aux mondes ────────────────────────────────────────────

  /** Ville : avion de ligne très loin, feux de navigation clignotants. */
  _drawPlanes(ctx, w, h, time) {
    for (const p of this.planes) {
      const u = wrap(time / p.period + p.phase, 1);
      const k = p.dir > 0 ? u : 1 - u;
      const x = -0.1 * w + k * 1.2 * w;
      const y = p.y * h + u * h * 0.02;
      const sz = 7 * p.size;
      ctx.fillStyle = 'rgba(20,24,50,0.9)';
      ctx.beginPath();
      ctx.ellipse(x, y, sz, sz * 0.18, 0, 0, TAU);
      ctx.fill();
      ctx.fillRect(x - sz * 0.2, y - sz * 0.05, sz * 0.4 * 0.6, sz * 0.5);
      ctx.globalCompositeOperation = 'lighter';
      const blink = Math.sin(time * 6 + p.phase * 10) > 0.6;
      ctx.drawImage(this._sprite('255,60,60', 0.3), x - sz * 0.25 - 4, y - 4, 8, 8);
      if (blink) ctx.drawImage(this._sprite('255,255,255', 0.25), x + p.dir * sz - 5, y - 5, 10, 10);
      ctx.drawImage(this._sprite('80,255,140', 0.3), x + sz * 0.25 - 3, y - 3, 6, 6);
      ctx.globalCompositeOperation = 'source-over';
    }
  }

  /** Ville : grandes enseignes au néon sur les immeubles (précalculées), qui grésillent parfois. */
  _drawSigns(ctx, ox, baseY, s, w, time, par) {
    ctx.globalCompositeOperation = 'lighter';
    for (const sg of this.signs) {
      const x = ox + sg.x * par * s;
      const sw = sg.w * s;
      if (x + sw < 0 || x - sw > w) continue;
      const sh = sw * (sg.sprite.height / sg.sprite.width);
      const y = baseY - sg.y * s;
      // Grésillement : rares coupures très brèves, et un léger souffle de la lumière
      const n = Math.floor(time * 12 + sg.phase * 50);
      const cut = hash(n) > 0.985 || (hash(Math.floor(time * 0.5 + sg.phase * 9)) > 0.88 && hash(n + 3) > 0.5);
      const a = cut ? 0.18 : 0.82 + 0.18 * Math.sin(time * 2.4 + sg.phase * 6);
      ctx.globalAlpha = a;
      ctx.drawImage(sg.sprite, x - sw / 2, y - sh / 2, sw, sh);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  /** Neige : petits nuages de froid qui glissent au ras du sol. */
  _drawMist(ctx, cam, w, h, time) {
    const W = w * 1.4;
    for (const m of this.mist) {
      const x = wrap(m.u * W + time * m.speed * w - cam.x * m.par * cam.scale * 0.2, W) - w * 0.2;
      const y = m.v * h + Math.sin(time * 0.4 + m.phase) * 6;
      const r = m.r * h * (1 + 0.15 * Math.sin(time * 0.3 + m.phase));
      ctx.globalAlpha = m.a * (0.7 + 0.3 * Math.sin(time * 0.25 + m.phase * 3));
      ctx.drawImage(this._sprite('240,248,255', 0.5), x - r * 1.6, y - r, r * 3.2, r * 2);
    }
    ctx.globalAlpha = 1;
  }

  /**
   * Volcan : la chaleur se voit — fines colonnes d'air chaud qui ondulent en montant. (La lueur
   * rouge du bas de l'écran est cuite dans l'étalonnage de la vignette : elle ne coûte rien.)
   */
  _drawHeat(ctx, w, h, time) {
    ctx.strokeStyle = 'rgba(255,170,110,0.07)';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const bx = ((i + 0.5) / 6) * w + Math.sin(time * 0.3 + i) * 20;
      const u = wrap(time * 0.12 + i * 0.37, 1);
      const y0 = h * (1 - u * 0.6);
      ctx.moveTo(bx, y0);
      for (let k = 1; k <= 5; k++) ctx.lineTo(bx + Math.sin(time * 3 + k * 1.3 + i) * 7, y0 - k * h * 0.05);
    }
    ctx.stroke();
  }

  /** Forêt : papillons qui voltigent devant les arbres. */
  _drawButterflies(ctx, cam, w, h, time) {
    const W = w * 1.3;
    for (const b of this.butterflies) {
      const x = wrap(b.u * W + Math.sin(time * b.fx + b.phase) * b.ax * w + time * 8 - cam.x * b.par * cam.scale, W) - w * 0.15;
      const y = b.v * h + Math.sin(time * b.fy * 2.1 + b.phase) * b.ay * h + Math.sin(time * 5 + b.phase) * 3;
      const sz = 4.2 * b.size;
      const f = Math.abs(Math.sin(time * b.flap + b.phase));
      ctx.fillStyle = `rgba(${b.c},0.9)`;
      ctx.beginPath();
      ctx.ellipse(x - sz * 0.5 * f, y - sz * 0.2, sz * 0.6 * f + 0.4, sz * 0.75, -0.4, 0, TAU);
      ctx.ellipse(x + sz * 0.5 * f, y - sz * 0.2, sz * 0.6 * f + 0.4, sz * 0.75, 0.4, 0, TAU);
      ctx.ellipse(x - sz * 0.35 * f, y + sz * 0.35, sz * 0.4 * f + 0.3, sz * 0.45, 0.5, 0, TAU);
      ctx.ellipse(x + sz * 0.35 * f, y + sz * 0.35, sz * 0.4 * f + 0.3, sz * 0.45, -0.5, 0, TAU);
      ctx.fill();
      ctx.fillStyle = 'rgba(40,30,20,0.9)';
      ctx.fillRect(x - 0.6, y - sz * 0.5, 1.2, sz * 1.1);
    }
  }

  /** Espace : débris qui flottent en apesanteur, tournent et dérivent lentement. */
  _drawFloaters(ctx, cam, w, h, time) {
    const W = w * 1.4;
    for (const f of this.floaters) {
      const x = wrap(f.u * W - cam.x * f.par * cam.scale + time * f.drift, W) - w * 0.2;
      const y = f.v * h + Math.sin(time * f.bob + f.phase) * f.bobA + cam.y * f.par * cam.scale * 0.3;
      const r = f.r;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(time * f.spin + f.phase);
      ctx.fillStyle = f.c;
      ctx.beginPath();
      for (let i = 0; i < f.pts.length; i++) {
        const a = (i / f.pts.length) * TAU;
        ctx.lineTo(Math.cos(a) * r * f.pts[i], Math.sin(a) * r * f.pts[i]);
      }
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(200,185,255,0.55)';
      ctx.lineWidth = 1.2;
      ctx.stroke();
      // Face éclairée par la nébuleuse
      ctx.fillStyle = 'rgba(190,160,255,0.22)';
      ctx.beginPath();
      ctx.arc(-r * 0.25, -r * 0.25, r * 0.45, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
  }

  /** Ville : deux projecteurs qui balaient lentement le ciel. */
  _drawSearchlights(ctx, w, h, time) {
    ctx.globalCompositeOperation = 'lighter';
    for (const sl of this.searchlights) {
      const a = -Math.PI / 2 + Math.sin(time * sl.speed + sl.phase) * 0.55;
      const x0 = sl.x * w;
      const y0 = h * 1.05;
      const len = h * 1.3;
      const spread = 0.05;
      const grad = ctx.createLinearGradient(x0, y0, x0 + Math.cos(a) * len, y0 + Math.sin(a) * len);
      grad.addColorStop(0, 'rgba(180,200,255,0.1)');
      grad.addColorStop(1, 'rgba(180,200,255,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(x0 - 6, y0);
      ctx.lineTo(x0 + Math.cos(a - spread) * len, y0 + Math.sin(a - spread) * len);
      ctx.lineTo(x0 + Math.cos(a + spread) * len, y0 + Math.sin(a + spread) * len);
      ctx.lineTo(x0 + 6, y0);
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  /** Neige : rafales discrètes, de fines traînées blanches qui traversent l'écran de temps en temps. */
  _drawGusts(ctx, w, h, time) {
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.2;
    ctx.lineCap = 'round';
    for (const g of this.gusts) {
      const u = wrap(time / g.period + g.phase, 1);
      if (u > 0.35) continue;
      const k = u / 0.35;
      const x = -w * 0.3 + k * w * 1.6;
      const y = g.y * h + Math.sin(k * 6) * 6;
      const len = g.len * w;
      ctx.globalAlpha = 0.22 * Math.sin(k * Math.PI);
      ctx.beginPath();
      ctx.moveTo(x - len, y + 4);
      ctx.bezierCurveTo(x - len * 0.6, y - 6, x - len * 0.3, y + 8, x, y);
      ctx.moveTo(x - len * 0.8, y + 16);
      ctx.bezierCurveTo(x - len * 0.5, y + 8, x - len * 0.2, y + 20, x + len * 0.1, y + 14);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  /** Volcan : panaches de fumée légère qui montent lentement. */
  _drawSmoke(ctx, w, h, time, cam) {
    for (const sm of this.smoke) {
      const u = wrap(time / sm.period + sm.phase, 1);
      const x = wrap(sm.x * w - cam.x * 0.06 * cam.scale + u * w * 0.15, w * 1.3) - w * 0.15;
      const y = h * (0.85 - u * 0.9);
      const r = sm.r * h * (0.6 + u * 1.2);
      ctx.globalAlpha = 0.16 * Math.sin(u * Math.PI);
      ctx.drawImage(this._sprite('70,45,45', 0.5), x - r, y - r, r * 2, r * 2);
    }
    ctx.globalAlpha = 1;
  }

  /** Forêt : oiseaux lointains qui traversent le ciel en battant des ailes. */
  _drawBirds(ctx, w, h, time, cam) {
    ctx.strokeStyle = 'rgba(30,50,40,0.55)';
    ctx.lineWidth = 1.3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    for (const b of this.birds) {
      const x = wrap((b.phase + time * b.speed) * w - cam.x * 0.05 * cam.scale, w * 1.4) - w * 0.2;
      const y = b.y * h + Math.sin(time * 0.7 + b.phase * 9) * 6;
      const sz = b.size * 7;
      const f = Math.sin(time * b.flap + b.phase * 20);
      ctx.moveTo(x - sz, y - f * sz * 0.6);
      ctx.quadraticCurveTo(x - sz * 0.4, y - sz * 0.25, x, y);
      ctx.quadraticCurveTo(x + sz * 0.4, y - sz * 0.25, x + sz, y - f * sz * 0.6);
    }
    ctx.stroke();
  }

  /** Espace : une étoile filante de temps en temps. */
  _drawShootingStar(ctx, w, h, time) {
    const period = 5.5;
    const n = Math.floor(time / period);
    const u = time / period - n;
    if (u > 0.18) return;
    const k = u / 0.18;
    const x0 = (0.1 + hash(n) * 0.7) * w;
    const y0 = (0.05 + hash(n + 7) * 0.3) * h;
    const dx = w * 0.35;
    const dy = h * 0.18;
    const x = x0 + dx * k;
    const y = y0 + dy * k;
    const grad = ctx.createLinearGradient(x - dx * 0.25, y - dy * 0.25, x, y);
    grad.addColorStop(0, 'rgba(255,255,255,0)');
    grad.addColorStop(1, `rgba(255,255,255,${0.9 * Math.sin(k * Math.PI)})`);
    ctx.strokeStyle = grad;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(x - dx * 0.25, y - dy * 0.25);
    ctx.lineTo(x, y);
    ctx.stroke();
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

  _drawParticles(ctx, cam, w, h, time, front) {
    const s = cam.scale;
    const list = this.particles;
    const kind = this.theme.particles.kind;
    const W = w + 80;
    const H = h + 80;
    const additive = kind !== 'snow';
    if (additive) ctx.globalCompositeOperation = 'lighter';
    else ctx.fillStyle = '#ffffff';
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
        ctx.beginPath();
        ctx.arc(px, py, p.r, 0, TAU);
        ctx.fill();
      } else {
        const r = p.r * 3;
        ctx.drawImage(this._sprite(p.c, kind === 'embers' ? 0.25 : 0.4), px - r, py - r, r * 2, r * 2);
      }
    }
    if (additive) ctx.globalCompositeOperation = 'source-over';
    if (front === 0) {
      for (const p of this.ash) {
        const px = wrap(p.u * W + p.su * time * 60 - cam.x * p.par * s, W) - 40;
        const py = wrap(p.v * H + p.sv * time * 60 + cam.y * p.par * s, H) - 40;
        ctx.globalAlpha = p.a;
        ctx.fillStyle = `rgb(${p.c})`;
        ctx.fillRect(px, py, p.r * 1.6, p.r * 1.6);
      }
    }
    // Feuilles qui tombent doucement en tournoyant (forêt) : devant et derrière
    for (const p of this.leaves) {
      if (p.front !== front) continue;
      const px = wrap(p.u * W + p.su * time * 60 - cam.x * p.par * s + Math.sin(time * p.wf + p.ph) * p.wa, W) - 40;
      const py = wrap(p.v * H + p.sv * time * 60 + cam.y * p.par * s, H) - 40;
      ctx.globalAlpha = p.a;
      ctx.fillStyle = `rgb(${p.c})`;
      ctx.beginPath();
      ctx.ellipse(px, py, p.r * 2.2, p.r * Math.abs(Math.sin(time * p.blink + p.ph)) + 0.4, Math.sin(time * 0.9 + p.ph), 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}

// ─── Effets d'identité ──────────────────────────────────────────────────────

/** Enseignes au néon de la ville, dessinées une fois avec leur halo. */
function makeNeonSigns(rng, minX, span) {
  const designs = [
    { text: 'HOOPS', c: '255,70,190' },
    { text: 'OPEN 24H', c: '80,220,255' },
    { text: 'DINER', c: '255,180,60' },
    { ring: true, c: '255,110,60' },
    { text: 'ARCADE', c: '150,110,255' },
  ];
  const sprites = designs.map((d) => neonSprite(d));
  const out = [];
  const par = 0.26;
  let x = minX * par - 6 + rng() * 4;
  const end = minX * par + span * par + 20;
  let i = (rng() * designs.length) | 0;
  while (x < end) {
    const sp = sprites[i % sprites.length];
    out.push({ x: x / par, y: 1.9 + rng() * 1.5, w: designs[i % designs.length].ring ? 1.4 : 2.4, sprite: sp, phase: rng() });
    x += 7 + rng() * 6;
    i++;
  }
  return out;
}

function neonSprite(d) {
  const W = d.ring ? 160 : 320;
  const H = d.ring ? 160 : 110;
  const c = makeCanvas(W, H);
  const g = c.getContext('2d');
  g.lineJoin = 'round';
  g.lineCap = 'round';
  const pass = (blur, width, alpha, color) => {
    g.shadowColor = `rgba(${d.c},${alpha})`;
    g.shadowBlur = blur;
    g.strokeStyle = color;
    g.lineWidth = width;
    if (d.ring) {
      g.beginPath();
      g.arc(W / 2, H / 2, 46, 0, TAU);
      g.moveTo(W / 2 - 46, H / 2);
      g.lineTo(W / 2 + 46, H / 2);
      g.moveTo(W / 2, H / 2 - 46);
      g.lineTo(W / 2, H / 2 + 46);
      g.stroke();
    } else {
      g.font = '800 64px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.strokeText(d.text, W / 2, H / 2 + 2);
    }
  };
  pass(26, 9, 0.9, `rgba(${d.c},0.35)`);
  pass(10, 5, 1, `rgba(${d.c},0.95)`);
  pass(0, 2, 0, 'rgba(255,255,255,0.9)');
  return c;
}

function makeFloater(rng) {
  const n = 7 + ((rng() * 4) | 0);
  return {
    u: rng(), v: 0.12 + rng() * 0.4, r: 7 + rng() * 15,
    pts: Array.from({ length: n }, () => 0.7 + rng() * 0.3),
    par: 0.2 + rng() * 0.25, drift: (rng() - 0.5) * 6,
    bob: 0.3 + rng() * 0.4, bobA: 4 + rng() * 8, spin: (rng() - 0.5) * 0.5, phase: rng() * TAU,
    c: ['#4a3a8c', '#5a4a9e', '#3d3078'][(rng() * 3) | 0],
  };
}

// ─── Particules ─────────────────────────────────────────────────────────────

function makeParticle(kind, colors, rng) {
  const front = rng() < 0.25 ? 1 : 0;
  const near = front ? 1 : 0.4 + rng() * 0.6;
  const p = {
    u: rng(), v: rng(), su: 0, sv: 0,
    par: 0.15 + near * 0.5,
    wf: 0.3 + rng() * 0.8, wa: 0, ph: rng() * TAU,
    blink: 0.8 + rng() * 2, r: 1, a: 0.6,
    c: colors[(rng() * colors.length) | 0],
    front,
  };
  switch (kind) {
    case 'snow': // petits flocons qui tombent doucement (pas une tempête)
      p.sv = (0.12 + rng() * 0.22) * near;
      p.su = -0.03 * near;
      p.wa = 8 + rng() * 10;
      p.r = (front ? 1.3 : 0.6) + rng() * 0.9 * near;
      p.a = front ? 0.85 : 0.45 + rng() * 0.35;
      break;
    case 'embers': // braises qui volent lentement
      p.sv = -(0.08 + rng() * 0.18) * near;
      p.su = 0.03 + rng() * 0.06;
      p.wa = 10 + rng() * 14;
      p.r = 0.7 + rng() * 1.1 * near;
      p.a = 0.55 + rng() * 0.4;
      break;
    case 'ash':
      p.sv = 0.05 + rng() * 0.08;
      p.su = 0.04;
      p.r = 0.8 + rng() * 1.2;
      p.a = 0.15 + rng() * 0.2;
      p.front = 0;
      break;
    case 'fireflies':
      p.su = (rng() - 0.5) * 0.06;
      p.sv = (rng() - 0.5) * 0.04;
      p.wa = 18 + rng() * 26;
      p.r = 1 + rng() * 1;
      p.a = 0.6 + rng() * 0.3;
      p.v = 0.4 + rng() * 0.6;
      break;
    case 'leaf':
      p.sv = 0.1 + rng() * 0.12;
      p.su = 0.05;
      p.wa = 24 + rng() * 24;
      p.r = (front ? 2.2 : 1.4) + rng() * 1.2;
      p.a = front ? 0.9 : 0.6;
      break;
    case 'stardust': // poussières spatiales
      p.su = -0.02 - rng() * 0.04;
      p.sv = -(0.006 + rng() * 0.02); // remontent lentement : on sent l'apesanteur
      p.r = 0.6 + rng() * 1;
      p.a = 0.5 + rng() * 0.4;
      break;
    default: // motes : poussières lumineuses de la ville
      p.su = 0.03 + rng() * 0.05;
      p.sv = -0.02 - rng() * 0.03;
      p.wa = 10 + rng() * 12;
      p.r = 0.7 + rng() * 1;
      p.a = 0.3 + rng() * 0.3;
  }
  return p;
}

// ─── Formes des plans ───────────────────────────────────────────────────────

let windowId = 1;

function windowGrid(rng, w, h, cell, rowH, prob, top = 0.5) {
  const out = [];
  const cols = Math.max(1, Math.floor((w - 0.25) / cell));
  const rows = Math.max(1, Math.floor((h - top - 0.3) / rowH));
  const margin = (w - cols * cell) / 2;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) if (rng() < prob) out.push([margin + c * cell + cell * 0.2, top + r * rowH, windowId++]);
  }
  return out;
}

function makeShapes(def, rng, x0, x1) {
  const out = [];
  if (def.kind === 'highway') {
    const L = x1 - x0;
    const cars = Array.from({ length: Math.max(6, Math.round(L / 7)) }, (_, i) => ({
      phase: rng(),
      dir: i % 2 ? 1 : -1,
      speed: 2.2 + rng() * 1.6,
      len: 0.8 + rng() * 0.4,
      body: ['#1a2040', '#20183a', '#151a30'][(rng() * 3) | 0],
    }));
    return [{ x: x0, L, cars }];
  }
  if (def.kind === 'station') return [{ x: x0 + 28, y: 7.4 }];
  if (def.kind === 'lavaRiver') return [{ x: x0, L: x1 - x0 }];
  let x = x0;
  while (x < x1) {
    const w = def.minW + rng() * (def.maxW - def.minW);
    const h = def.minH + rng() * (def.maxH - def.minH);
    const sh = { x, w, h, seed: rng() };
    switch (def.kind) {
      case 'skyscrapers':
        sh.spire = rng() < 0.3 ? 0.8 + rng() * 1.4 : 0;
        sh.crown = (rng() * 3) | 0;
        sh.windows = windowGrid(rng, w, h, 0.32, 0.42, 0.3);
        sh.beacon = def.beacons && rng() < 0.6;
        x += w + rng() * (def.gap ?? 0.5);
        break;
      case 'buildings':
        sh.round = rng() < 0.12 ? 0.4 : 0.06;
        sh.step = rng() < 0.35 ? 0.25 + rng() * 0.35 : 0;
        sh.antenna = rng() < 0.3;
        sh.windows = windowGrid(rng, w, h, 0.42, 0.55, 0.42, sh.step ? 0.5 + sh.step : 0.5);
        if (def.tanks && rng() < 0.25) sh.tank = 0.2 + rng() * 0.5;
        if (def.neon && rng() < 0.4) {
          const hues = ['255,70,150', '70,220,255', '255,190,60', '160,110,255', '80,255,170'];
          sh.neon = { c: hues[(rng() * hues.length) | 0], u: 0.15 + rng() * 0.4, v: 0.35 + rng() * 0.3, w: 0.5 + rng() * 0.6, vert: rng() < 0.4, phase: rng() * TAU };
        }
        if (def.shops && rng() < 0.7) sh.shop = { c: ['255,200,130', '140,220,255', '255,140,180'][(rng() * 3) | 0] };
        if (def.graffiti && rng() < 0.3) {
          const hues = ['255,95,140', '80,220,255', '255,210,80', '160,120,255', '90,240,170'];
          sh.tag = { c1: hues[(rng() * hues.length) | 0], c2: hues[(rng() * hues.length) | 0], u: 0.12 + rng() * 0.2 };
        }
        x += w + rng() * (def.gap ?? 0.5);
        break;
      case 'mountains':
        sh.peak = 0.35 + rng() * 0.3;
        x += w * (0.45 + rng() * 0.3);
        break;
      case 'firs':
        x += w * (0.55 + rng() * 0.7);
        break;
      case 'volcanoes':
        sh.crater = 0.1 + rng() * 0.06;
        sh.phase = rng() * 10;
        x += w * (1.1 + rng() * 0.8) + (def.gap ?? 0);
        break;
      case 'rocks': {
        sh.pts = [];
        const n = 4 + ((rng() * 3) | 0);
        for (let i = 0; i <= n; i++) sh.pts.push([i / n, i === 0 || i === n ? 0 : 0.55 + rng() * 0.45]);
        x += w * (0.7 + rng() * 0.4);
        break;
      }
      case 'hills':
        sh.bumps = Array.from({ length: 6 }, () => 0.25 + rng() * 0.5);
        x += w * (0.6 + rng() * 0.3);
        break;
      case 'trees':
        sh.blobs = Array.from({ length: 4 + ((rng() * 3) | 0) }, () => [rng() * 2 - 1, rng() * 0.55, 0.85 + rng() * 1.0]);
        sh.lean = (rng() - 0.5) * 0.15;
        sh.mush = def.mushrooms && rng() < 0.4 ? 0.3 + rng() * 0.4 : 0;
        x += w + 0.4 + rng() * 2.2;
        break;
      case 'asteroidsBg':
        sh.y = 4 + rng() * 6;
        sh.speed = 0.05 + rng() * 0.12;
        x += w * (1 + rng());
        break;
      case 'craters':
        sh.holes = Array.from({ length: 1 + ((rng() * 2) | 0) }, () => [0.2 + rng() * 0.6, 0.3 + rng() * 0.3]);
        sh.lights = def.lights && rng() < 0.5 ? Array.from({ length: 3 }, () => [rng(), rng() * TAU]) : null;
        x += w * (0.6 + rng() * 0.4);
        break;
      default:
        x += w;
    }
    out.push(sh);
  }
  return out;
}

// ─── Dessin des plans ───────────────────────────────────────────────────────

/** Un plan de décor : formes regroupées en quelques chemins, puis les détails animés. */
function drawLayer(ctx, layer, ox, baseY, s, w, h, time, bg) {
  const kind = layer.kind;
  if (kind === 'highway') return drawHighway(ctx, layer, ox, baseY, s, w, time, bg);
  if (kind === 'station') return drawStation(ctx, layer, ox, baseY, s, w, time, bg);
  if (kind === 'lavaRiver') return drawLavaRiver(ctx, layer, baseY, s, w, h, time, bg);
  const body = new Path2D();
  const shade = new Path2D();
  const detail = new Path2D();
  const detail2 = new Path2D();
  const extras = [];
  for (const sh of layer.shapes) {
    const x = ox + sh.x * s;
    const ww = sh.w * s;
    const margin = kind === 'trees' ? ww * 2.2 : kind === 'mountains' || kind === 'volcanoes' || kind === 'hills' ? ww : 0;
    if (x + ww + margin < 0 || x - margin > w) continue;
    const top = baseY - sh.h * s;
    switch (kind) {
      case 'skyscrapers': {
        body.rect(x, top, ww, baseY - top + 1);
        if (sh.crown === 1) {
          body.moveTo(x, top);
          body.lineTo(x + ww * 0.5, top - ww * 0.35);
          body.lineTo(x + ww, top);
        } else if (sh.crown === 2) body.rect(x + ww * 0.2, top - s * 0.4, ww * 0.6, s * 0.4);
        if (sh.spire) body.rect(x + ww * 0.48, top - sh.spire * s - (sh.crown === 2 ? s * 0.4 : 0), Math.max(1, s * 0.04), sh.spire * s);
        shade.rect(x + ww * 0.62, top, ww * 0.38, baseY - top + 1);
        windowsInto(sh, x, top, s, 0.1, 0.16, time, detail, detail2);
        if (sh.beacon) extras.push(['beacon', sh, x, ww, top]);
        break;
      }
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
        if (sh.antenna) body.rect(x + ww * 0.3, top - s * 0.7, Math.max(1, s * 0.05), s * 0.7);
        shade.rect(x + ww * 0.7, top + (sh.step ? sh.step * s : 0), ww * 0.3, baseY - top);
        windowsInto(sh, x, top, s, 0.16, 0.22, time, detail, detail2);
        if (sh.tank || sh.neon || sh.shop || sh.tag || sh.antenna) extras.push(['building', sh, x, ww, top]);
        break;
      }
      case 'mountains': {
        const px = x + ww * sh.peak;
        const left = x - ww * 0.6;
        const right = x + ww * 1.6;
        body.moveTo(left, baseY + 1);
        body.lineTo(px, top);
        body.lineTo(right, baseY + 1);
        body.closePath();
        // Face à l'ombre (la lumière vient de la gauche)
        shade.moveTo(px, top);
        shade.lineTo(right, baseY + 1);
        shade.lineTo(px + ww * 0.15, baseY + 1);
        shade.closePath();
        const k = 0.3;
        const capL = [px - (px - left) * k, top + sh.h * s * k];
        const capR = [px + (right - px) * k, top + sh.h * s * k];
        detail.moveTo(px, top);
        detail.lineTo(capR[0], capR[1]);
        detail.lineTo(px + ww * 0.14, top + sh.h * s * k * 0.75);
        detail.lineTo(px + ww * 0.02, top + sh.h * s * k * 1.1);
        detail.lineTo(px - ww * 0.12, top + sh.h * s * k * 0.8);
        detail.lineTo(capL[0], capL[1]);
        detail.closePath();
        detail2.moveTo(px, top);
        detail2.lineTo(capR[0], capR[1]);
        detail2.lineTo(px + ww * 0.14, top + sh.h * s * k * 0.75);
        detail2.lineTo(px + ww * 0.03, top + sh.h * s * k * 0.95);
        detail2.closePath();
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
          shade.moveTo(cx, ty);
          shade.lineTo(cx + tw, ty + th);
          shade.lineTo(cx + tw * 0.1, ty + th);
          shade.closePath();
          detail.moveTo(cx, ty);
          detail.lineTo(cx + tw * 0.42, ty + th * 0.42);
          detail.lineTo(cx + tw * 0.1, ty + th * 0.36);
          detail.lineTo(cx - tw * 0.2, ty + th * 0.46);
          detail.lineTo(cx - tw * 0.42, ty + th * 0.42);
          detail.closePath();
        }
        body.rect(cx - ww * 0.07, baseY - sh.h * s * 0.12, ww * 0.14, sh.h * s * 0.12 + 1);
        break;
      }
      case 'rocks':
        body.moveTo(x, baseY + 1);
        for (const [u, v] of sh.pts) body.lineTo(x + u * ww, baseY - v * sh.h * s);
        body.lineTo(x + ww, baseY + 1);
        body.closePath();
        // Arête éclairée par la lave (reflets rouges)
        sh.pts.forEach(([u, v], i) => {
          const px = x + u * ww;
          const py = baseY - v * sh.h * s;
          if (i === 0) detail.moveTo(px, py);
          else detail.lineTo(px, py);
        });
        break;
      case 'hills': {
        body.moveTo(x - ww * 0.2, baseY + 1);
        const n = sh.bumps.length;
        for (let i = 0; i < n; i++) {
          const ux = x - ww * 0.2 + ((i + 0.5) / n) * ww * 1.4;
          const uy = baseY - sh.h * s * (0.6 + sh.bumps[i] * 0.6) * Math.sin(((i + 0.5) / n) * Math.PI);
          body.lineTo(ux, uy);
          detail.moveTo(ux + s * 0.5, uy);
          detail.arc(ux, uy, s * (0.35 + sh.bumps[i] * 0.3), 0, TAU);
        }
        body.lineTo(x + ww * 1.2, baseY + 1);
        body.closePath();
        break;
      }
      case 'trees': {
        const cx = x + ww / 2;
        const sway = Math.sin(time * 0.5 + sh.seed * 6) * s * 0.07;
        const lean = sh.lean * sh.h * s;
        // Tronc légèrement évasé à la base
        body.moveTo(cx - ww * 0.26, baseY + 1);
        body.lineTo(cx - ww * 0.14 + lean, top + sh.h * s * 0.3);
        body.lineTo(cx + ww * 0.14 + lean, top + sh.h * s * 0.3);
        body.lineTo(cx + ww * 0.26, baseY + 1);
        body.closePath();
        shade.rect(cx + lean * 0.5, top + sh.h * s * 0.35, ww * 0.12, sh.h * s * 0.65);
        for (const [bx, by, br] of sh.blobs) {
          const r = br * ww * 0.9;
          const fx = cx + lean + bx * ww + sway;
          const fy = top + by * sh.h * s * 0.38;
          detail.moveTo(fx + r, fy);
          detail.arc(fx, fy, r, 0, TAU);
          // Reflet de lumière sur le feuillage (en haut à gauche)
          detail2.moveTo(fx - r * 0.2 + r * 0.55, fy - r * 0.25);
          detail2.arc(fx - r * 0.2, fy - r * 0.25, r * 0.55, 0, TAU);
        }
        if (sh.mush) extras.push(['mush', sh, x, ww, top]);
        break;
      }
      case 'asteroidsBg': {
        const ay = baseY - sh.y * s + Math.sin(time * 0.3 + sh.seed * 9) * s * 0.3;
        const r = sh.h * s;
        const ax = x + Math.sin(time * sh.speed) * s;
        body.moveTo(ax + r * 1.2, ay);
        body.ellipse(ax, ay, r * 1.2, r, sh.seed * 3, 0, TAU);
        shade.moveTo(ax + r * 0.9, ay + r * 0.2);
        shade.ellipse(ax + r * 0.25, ay + r * 0.2, r * 0.8, r * 0.7, sh.seed * 3, 0, TAU);
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
        if (sh.lights) extras.push(['lights', sh, x, ww, top]);
        break;
      default:
        extras.push(['default', sh, x, ww, top]);
    }
  }

  ctx.fillStyle = layer.color;
  ctx.fill(body);
  switch (kind) {
    case 'skyscrapers':
    case 'buildings':
      ctx.fillStyle = 'rgba(0,0,10,0.28)';
      ctx.fill(shade);
      ctx.fillStyle = layer.windows[0];
      ctx.fill(detail);
      ctx.fillStyle = layer.windows[1];
      ctx.fill(detail2);
      break;
    case 'mountains':
      ctx.fillStyle = layer.shade;
      ctx.fill(shade);
      ctx.fillStyle = layer.snowCap;
      ctx.fill(detail);
      ctx.fillStyle = layer.snowShade;
      ctx.fill(detail2);
      break;
    case 'firs':
      ctx.fillStyle = layer.shade;
      ctx.fill(shade);
      ctx.fillStyle = layer.snowCap;
      ctx.fill(detail);
      break;
    case 'rocks':
      ctx.strokeStyle = layer.rim;
      ctx.lineWidth = Math.max(1, s * 0.05);
      ctx.globalAlpha = 0.7 + 0.3 * Math.sin(time * 1.3);
      ctx.stroke(detail);
      ctx.globalAlpha = 1;
      break;
    case 'hills':
      ctx.fillStyle = layer.canopy;
      ctx.fill(detail);
      break;
    case 'trees':
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      ctx.fill(shade);
      ctx.fillStyle = layer.canopy;
      ctx.fill(detail);
      ctx.fillStyle = layer.light;
      ctx.globalAlpha = 0.55;
      ctx.fill(detail2);
      ctx.globalAlpha = 1;
      if (layer.grass) drawGrass(ctx, layer.grass, baseY, s, w, time);
      break;
    case 'asteroidsBg':
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fill(shade);
      break;
    case 'craters':
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fill(detail);
      break;
    default:
  }

  for (const [type, sh, x, ww, top] of extras) {
    if (type === 'building') drawBuildingExtras(ctx, layer, sh, x, ww, top, baseY, s, time, bg);
    else if (type === 'beacon') {
      const on = Math.sin(time * 2.4 + sh.seed * 20) > 0.3;
      if (on) {
        const by = top - (sh.spire ? sh.spire * s + (sh.crown === 2 ? s * 0.4 : 0) : s * 0.1);
        ctx.globalCompositeOperation = 'lighter';
        ctx.drawImage(bg._sprite('255,60,60', 0.3), x + ww * 0.48 - 7, by - 7, 14, 14);
        ctx.globalCompositeOperation = 'source-over';
      }
    } else if (type === 'mush') {
      const mx = x + ww * 1.5;
      const mr = s * sh.mush;
      ctx.fillStyle = 'rgba(235,225,205,0.6)';
      ctx.fillRect(mx - mr * 0.18, baseY - mr, mr * 0.36, mr);
      ctx.fillStyle = 'rgba(220,80,70,0.75)';
      ctx.beginPath();
      ctx.ellipse(mx, baseY - mr, mr * 0.8, mr * 0.5, 0, Math.PI, TAU);
      ctx.fill();
    } else if (type === 'lights') {
      ctx.globalCompositeOperation = 'lighter';
      for (const [u, ph] of sh.lights) {
        const a = 0.5 + 0.5 * Math.sin(time * 1.7 + ph);
        ctx.globalAlpha = a;
        ctx.drawImage(bg._sprite('120,230,255', 0.3), x + u * ww - 5, baseY - s * 0.25 - 5, 10, 10);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    } else if (layer.kind === 'volcanoes') {
      ctx.fillStyle = layer.color;
      drawVolcano(ctx, layer, sh, x, ww, top, baseY, s, time, bg);
    }
  }
}

/** Fenêtres d'un immeuble : grille, deux couleurs, quelques-unes s'allument et s'éteignent. */
function windowsInto(sh, x, top, s, ws, wh, time, pathA, pathB) {
  const sw = s * ws;
  const shh = s * wh;
  for (const [u, v, id] of sh.windows) {
    // Chaque fenêtre change d'état de temps en temps (toutes les ~10 à 20 s)
    const slot = Math.floor(time / (10 + (id % 7) * 1.5) + (id % 13) * 0.37);
    if (hash(id * 7.31 + slot) < 0.14) continue;
    (id % 3 === 0 ? pathB : pathA).rect(x + u * s, top + v * s, sw, shh);
  }
}

function drawBuildingExtras(ctx, layer, sh, x, ww, top, baseY, s, time, bg) {
  if (sh.tank) {
    // Château d'eau sur le toit
    const tx = x + ww * sh.tank;
    const ty = top + (sh.step && sh.tank > 0.55 ? sh.step * s : 0);
    ctx.fillStyle = layer.color;
    ctx.fillRect(tx - s * 0.02, ty - s * 0.3, s * 0.04, s * 0.3);
    ctx.fillRect(tx + s * 0.38, ty - s * 0.3, s * 0.04, s * 0.3);
    ctx.fillRect(tx - s * 0.06, ty - s * 0.75, s * 0.52, s * 0.45);
    ctx.beginPath();
    ctx.moveTo(tx - s * 0.08, ty - s * 0.75);
    ctx.lineTo(tx + s * 0.2, ty - s * 0.95);
    ctx.lineTo(tx + s * 0.48, ty - s * 0.75);
    ctx.fill();
  }
  if (sh.antenna && Math.sin(time * 2 + sh.seed * 30) > 0.4) {
    ctx.globalCompositeOperation = 'lighter';
    ctx.drawImage(bg._sprite('255,70,70', 0.3), x + ww * 0.3 - 6, top - s * 0.7 - 6, 12, 12);
    ctx.globalCompositeOperation = 'source-over';
  }
  if (sh.neon) {
    // Enseigne lumineuse qui pulse doucement (et grésille parfois)
    const n = sh.neon;
    const flick = Math.sin(time * 0.9 + n.phase) > -0.92 ? 1 : 0.25;
    const a = (0.7 + 0.3 * Math.sin(time * 2.1 + n.phase)) * flick;
    const nw = (n.vert ? 0.22 : n.w) * s;
    const nh = (n.vert ? n.w * 1.6 : 0.24) * s;
    const nx = x + ww * n.u;
    const ny = baseY - (baseY - top) * n.v;
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.45 * a;
    const gr = Math.max(nw, nh) * 1.4;
    ctx.drawImage(bg._sprite(n.c, 0.35), nx + nw / 2 - gr, ny + nh / 2 - gr, gr * 2, gr * 2);
    ctx.globalAlpha = a;
    ctx.fillStyle = `rgb(${n.c})`;
    ctx.fillRect(nx, ny, nw, nh);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }
  if (sh.shop) {
    // Vitrine éclairée au pied de l'immeuble
    ctx.fillStyle = `rgba(${sh.shop.c},0.32)`;
    ctx.fillRect(x + ww * 0.12, baseY - s * 0.55, ww * 0.76, s * 0.4);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(x + ww * 0.12, baseY - s * 0.62, ww * 0.76, s * 0.07);
  }
  if (sh.tag) {
    const gx = x + ww * sh.tag.u;
    const gy = baseY - s * 1.1;
    const gw = Math.min(ww * 0.7, s * 1.8);
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = `rgb(${sh.tag.c1})`;
    ctx.beginPath();
    ctx.ellipse(gx + gw * 0.3, gy, gw * 0.3, s * 0.22, -0.2, 0, TAU);
    ctx.ellipse(gx + gw * 0.7, gy - s * 0.04, gw * 0.24, s * 0.2, 0.25, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = `rgb(${sh.tag.c2})`;
    ctx.lineWidth = Math.max(1.5, s * 0.06);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(gx + gw * 0.08, gy + s * 0.1);
    ctx.quadraticCurveTo(gx + gw * 0.35, gy - s * 0.35, gx + gw * 0.55, gy + s * 0.05);
    ctx.quadraticCurveTo(gx + gw * 0.75, gy + s * 0.3, gx + gw * 0.95, gy - s * 0.16);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

/** Ville : voie rapide surélevée, piliers, lampadaires et voitures qui passent au loin. */
function drawHighway(ctx, layer, ox, baseY, s, w, time, bg) {
  const sh = layer.shapes[0];
  const deckY = baseY - layer.deck * s;
  const deckH = s * 0.26;
  ctx.fillStyle = layer.color;
  // Piliers
  const step = 5 * s;
  const start = ox + sh.x * s;
  const first = start + Math.ceil((0 - start) / step) * step;
  for (let px = first - step; px < w + step; px += step) ctx.fillRect(px - s * 0.12, deckY, s * 0.24, baseY - deckY + 1);
  // Tablier et glissière
  ctx.fillRect(0, deckY, w, deckH);
  ctx.fillStyle = 'rgba(120,140,200,0.25)';
  ctx.fillRect(0, deckY - s * 0.08, w, s * 0.03);
  // Voitures (phares blancs à l'avant, feux rouges à l'arrière)
  ctx.globalCompositeOperation = 'lighter';
  for (const car of sh.cars) {
    const x = start + wrap(car.phase * sh.L + car.dir * car.speed * time, sh.L) * s;
    if (x < -2 * s || x > w + 2 * s) continue;
    const len = car.len * s;
    const front = car.dir > 0 ? x + len / 2 : x - len / 2;
    const back = car.dir > 0 ? x - len / 2 : x + len / 2;
    const cy = deckY - s * 0.12;
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = car.body;
    ctx.fillRect(x - len / 2, deckY - s * 0.24, len, s * 0.2);
    ctx.fillRect(x - len * 0.28, deckY - s * 0.36, len * 0.56, s * 0.14);
    ctx.globalCompositeOperation = 'lighter';
    ctx.drawImage(bg._sprite('255,245,215', 0.3), front - 6, cy - 6, 12, 12);
    ctx.globalAlpha = 0.25;
    ctx.drawImage(bg._sprite('255,245,215', 0.5), front + car.dir * s * 0.3 - s * 0.6, cy - s * 0.3, s * 1.2, s * 0.6);
    ctx.globalAlpha = 1;
    ctx.drawImage(bg._sprite('255,50,60', 0.3), back - 4, cy - 4, 8, 8);
  }
  // Lampadaires de la voie
  const lstep = 7 * s;
  const lfirst = start + Math.ceil((0 - start) / lstep) * lstep;
  for (let lx = lfirst - lstep; lx < w + lstep; lx += lstep) {
    ctx.globalAlpha = 0.85;
    ctx.drawImage(bg._sprite('255,210,150', 0.3), lx - 9, deckY - s * 0.9 - 9, 18, 18);
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = layer.color;
  for (let lx = lfirst - lstep; lx < w + lstep; lx += lstep) ctx.fillRect(lx - 1, deckY - s * 0.9, 2, s * 0.9);
}

/** Espace : station spatiale lointaine, anneau qui tourne, feux clignotants. */
function drawStation(ctx, layer, ox, baseY, s, w, time, bg) {
  const sh = layer.shapes[0];
  const x = ox + sh.x * s;
  const y = baseY - sh.y * s;
  const R = s * 1.6;
  if (x < -R * 2 || x > w + R * 2) return;
  ctx.strokeStyle = '#3a3170';
  ctx.lineWidth = Math.max(2, s * 0.14);
  ctx.beginPath();
  ctx.ellipse(x, y, R, R * 0.35, 0, 0, TAU);
  ctx.stroke();
  ctx.fillStyle = '#2d2660';
  ctx.fillRect(x - s * 0.1, y - R * 0.5, s * 0.2, R);
  ctx.fillRect(x - R * 1.3, y - s * 0.12, R * 2.6, s * 0.24);
  ctx.fillStyle = '#4a3f8c';
  ctx.beginPath();
  ctx.arc(x, y, s * 0.35, 0, TAU);
  ctx.fill();
  // Panneaux solaires
  ctx.fillStyle = 'rgba(80,140,255,0.55)';
  ctx.fillRect(x - R * 1.3, y - s * 0.45, s * 0.7, s * 0.9);
  ctx.fillRect(x + R * 1.3 - s * 0.7, y - s * 0.45, s * 0.7, s * 0.9);
  // Fenêtres de l'anneau (qui tournent) et feux clignotants
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 8; i++) {
    const a = time * 0.25 + (i / 8) * TAU;
    const wx = x + Math.cos(a) * R;
    const wy = y + Math.sin(a) * R * 0.35;
    if (Math.sin(a) < 0) continue;
    ctx.drawImage(bg._sprite('255,230,170', 0.3), wx - 4, wy - 4, 8, 8);
  }
  if (Math.sin(time * 3) > 0.5) ctx.drawImage(bg._sprite('255,60,80', 0.3), x - R * 1.3 - 6, y - 6, 12, 12);
  if (Math.sin(time * 3 + 2) > 0.5) ctx.drawImage(bg._sprite('80,255,140', 0.3), x + R * 1.3 - 6, y - 6, 12, 12);
  ctx.globalCompositeOperation = 'source-over';
}

/** Volcan : rivière de lave au pied des roches, qui ondule et rougeoie. */
function drawLavaRiver(ctx, layer, baseY, s, w, h, time, bg) {
  const hh = s * 0.45;
  if (baseY - s * 2 > h) return;
  ctx.globalCompositeOperation = 'lighter';
  const glow = ctx.createLinearGradient(0, baseY - s * 2.2, 0, baseY);
  glow.addColorStop(0, 'rgba(255,90,30,0)');
  glow.addColorStop(1, `rgba(255,100,30,${0.28 + 0.06 * Math.sin(time * 1.5)})`);
  ctx.fillStyle = glow;
  ctx.fillRect(0, baseY - s * 2.2, w, s * 2.2);
  ctx.globalCompositeOperation = 'source-over';
  const grad = ctx.createLinearGradient(0, baseY - hh, 0, baseY + hh);
  grad.addColorStop(0, '#ffcf5a');
  grad.addColorStop(0.4, '#ff7a1f');
  grad.addColorStop(1, '#8a1a0c');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(0, baseY + hh);
  for (let x = 0; x <= w + 20; x += 20) ctx.lineTo(x, baseY - hh * 0.6 + Math.sin(x * 0.03 + time * 1.2) * hh * 0.15);
  ctx.lineTo(w, baseY + hh);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(255,240,170,0.7)';
  for (let i = 0; i < 10; i++) {
    const x = wrap(i * 137 + time * 14, w + 60) - 30;
    ctx.fillRect(x, baseY - hh * 0.35 + ((i * 7) % 5) * hh * 0.12, 18 + (i % 3) * 10, 1.4);
  }
  ctx.fillStyle = layer.color;
}

/** Forêt : herbe vivante au pied des arbres les plus proches. */
function drawGrass(ctx, color, baseY, s, w, time) {
  ctx.fillStyle = color;
  ctx.beginPath();
  const step = 6;
  for (let x = -step; x < w + step; x += step) {
    const hh = s * (0.18 + 0.16 * hash(x * 0.37));
    const sway = Math.sin(time * 1.6 + x * 0.05) * s * 0.05;
    ctx.moveTo(x - 3, baseY + 1);
    ctx.lineTo(x + sway, baseY - hh);
    ctx.lineTo(x + 3, baseY + 1);
  }
  ctx.fill();
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
  // Face à l'ombre
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.moveTo(cx + cw, top);
  ctx.lineTo(x + ww * 1.3, baseY + 1);
  ctx.lineTo(cx + ww * 0.1, baseY + 1);
  ctx.closePath();
  ctx.fill();
  // Coulées de lave incandescentes sur le flanc
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = `rgba(255,110,30,${0.45 + 0.15 * Math.sin(time * 1.2 + sh.phase)})`;
  ctx.lineWidth = Math.max(1, s * 0.07);
  ctx.beginPath();
  ctx.moveTo(cx - cw * 0.3, top);
  ctx.quadraticCurveTo(cx - ww * 0.08, top + sh.h * s * 0.35, cx - ww * 0.18, top + sh.h * s * 0.7);
  ctx.moveTo(cx + cw * 0.4, top);
  ctx.quadraticCurveTo(cx + ww * 0.1, top + sh.h * s * 0.25, cx + ww * 0.12, top + sh.h * s * 0.5);
  ctx.stroke();
  // Cratère qui rougeoie, éruptions de temps en temps
  const cycle = (time * 0.18 + sh.phase) % 1;
  const burst = cycle < 0.25 ? Math.sin((cycle / 0.25) * Math.PI) : 0;
  const gr = ww * (0.32 + burst * 0.3);
  ctx.globalAlpha = 0.4 + burst * 0.5;
  ctx.drawImage(bg._sprite('255,110,40', 0.35), cx - gr, top - gr * 0.7, gr * 2, gr * 1.6);
  if (burst > 0) {
    ctx.fillStyle = 'rgba(255,170,80,0.9)';
    for (let i = 0; i < 9; i++) {
      const a = -Math.PI / 2 + (i - 4) * 0.16;
      const t = cycle / 0.25;
      const v = s * (2.2 + (i % 3) * 0.6);
      ctx.globalAlpha = 1 - t;
      ctx.fillRect(cx + Math.cos(a) * v * t - 1.5, top + Math.sin(a) * v * t + s * 3 * t * t - 1.5, 3, 3);
    }
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  // Panache de fumée légère
  for (let i = 0; i < 4; i++) {
    const u = (time * 0.06 + i / 4 + sh.phase) % 1;
    const r = ww * (0.08 + u * 0.22);
    ctx.globalAlpha = 0.22 * (1 - u);
    ctx.drawImage(bg._sprite('90,60,60', 0.5), cx - r + u * ww * 0.3, top - u * s * 3.2 - r, r * 2, r * 2);
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = layer.color;
}
