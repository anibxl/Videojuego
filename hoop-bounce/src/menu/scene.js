// Décor vivant du menu : une salle de basket la nuit, vue de côté avec une légère perspective.
//
// Plans (du plus lointain au plus proche, chacun avec sa propre parallaxe) :
//   tribunes et lumières floues → bandeau LED → projecteurs → parquet et reflets
//   → panier au loin → balle qui rebondit lentement → poussières dans la lumière
//
// Tout ce qui est fixe est précalculé dans des canvas hors écran (à chaque redimensionnement) :
// chaque image ne fait que quelques plaquages et le dessin des éléments animés.

import { createBallTextures } from '../render/ball-sprite.js';
import { createRng, clamp, damp, lerp } from '../core/math.js';

const QUALITY = {
  low: { dpr: 1, particles: 0, spots: false, reflections: false, crowd: 120 },
  medium: { dpr: 1.5, particles: 18, spots: true, reflections: true, crowd: 220 },
  high: { dpr: 2, particles: 36, spots: true, reflections: true, crowd: 320 },
};

const PALETTE = {
  wallTop: '#04070f',
  wallBottom: '#0c1730',
  floorFar: '#14223d',
  floorNear: '#0a1120',
  line: 'rgba(205,220,255,0.10)',
  orange: '255,122,47',
  cyan: '96,190,255',
};

function makeCanvas(w, h) {
  const c = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(Math.max(1, w), Math.max(1, h)) : document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

export class MenuScene {
  /** @param {HTMLCanvasElement} canvas */
  constructor(canvas, { quality = 'high', reducedMotion = false } = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.reducedMotion = reducedMotion;
    this.ball = createBallTextures();
    this.time = 0;
    this.dim = 0;           // 0 = menu principal, 1 = page ouverte (décor assombri, léger recul)
    this.dimTarget = 0;
    this.flash = 0;         // éclair lumineux au lancement d'une partie
    this.pointer = { x: 0, y: 0, tx: 0, ty: 0 };
    this.w = 1;
    this.h = 1;
    this.setQuality(quality);
  }

  setQuality(q) {
    this.qualityName = QUALITY[q] ? q : 'high';
    this.q = QUALITY[this.qualityName];
    const rng = createRng(11);
    this.motes = Array.from({ length: this.q.particles }, () => ({
      x: rng(),
      y: 0.1 + rng() * 0.75,
      r: 0.6 + rng() * 1.6,
      speed: 0.004 + rng() * 0.01,
      drift: (rng() - 0.5) * 0.006,
      phase: rng() * Math.PI * 2,
    }));
    if (this.w > 1) this.resize(this.w, this.h);
  }

  setPointer(nx, ny) {
    this.pointer.tx = clamp(nx, -1, 1);
    this.pointer.ty = clamp(ny, -1, 1);
  }

  resize(w, h) {
    this.w = w;
    this.h = h;
    this.dpr = Math.min(window.devicePixelRatio || 1, this.q.dpr);
    this.canvas.width = Math.round(w * this.dpr);
    this.canvas.height = Math.round(h * this.dpr);
    this._bake();
  }

  // ─── Précalcul des plans fixes ──────────────────────────────────────────

  _bake() {
    const { w, h } = this;
    const k = this.dpr;
    this.horizon = h * 0.6;

    // Tribunes (plan lointain), un peu plus large que l'écran pour la parallaxe
    const bgW = w * 1.12;
    const bg = makeCanvas(bgW * k, this.horizon * k);
    const g = bg.getContext('2d');
    g.scale(k, k);
    const wall = g.createLinearGradient(0, 0, 0, this.horizon);
    wall.addColorStop(0, PALETTE.wallTop);
    wall.addColorStop(1, PALETTE.wallBottom);
    g.fillStyle = wall;
    g.fillRect(0, 0, bgW, this.horizon);
    // Gradins : rangées de silhouettes sombres
    for (let row = 0; row < 6; row++) {
      const y = this.horizon * (0.5 + row * 0.07);
      g.fillStyle = `rgba(20,34,62,${0.35 + row * 0.08})`;
      g.fillRect(0, y, bgW, this.horizon * 0.045);
    }
    // Public : petites lumières floues (téléphones, maillots éclairés)
    const rng = createRng(3);
    for (let i = 0; i < this.q.crowd; i++) {
      const x = rng() * bgW;
      const y = this.horizon * (0.48 + rng() * 0.44);
      const r = 0.6 + rng() * 1.8;
      const warm = rng() < 0.55;
      g.fillStyle = warm ? `rgba(255,200,150,${0.05 + rng() * 0.15})` : `rgba(150,190,255,${0.04 + rng() * 0.13})`;
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
    }
    // Rampes d'éclairage au plafond
    g.fillStyle = 'rgba(255,240,220,0.5)';
    for (let x = 30; x < bgW; x += bgW / 9) {
      g.beginPath();
      g.arc(x, this.horizon * 0.06, 1.6, 0, Math.PI * 2);
      g.fill();
    }
    this.bgLayer = bg;
    this.bgW = bgW;

    // Parquet en perspective (plan proche)
    const flW = w * 1.25;
    const flH = h - this.horizon;
    const fl = makeCanvas(flW * k, flH * k);
    const f = fl.getContext('2d');
    f.scale(k, k);
    const floor = f.createLinearGradient(0, 0, 0, flH);
    floor.addColorStop(0, PALETTE.floorFar);
    floor.addColorStop(1, PALETTE.floorNear);
    f.fillStyle = floor;
    f.fillRect(0, 0, flW, flH);
    // Lames : lignes qui convergent vers un point de fuite au-dessus de l'horizon
    const vpX = flW * 0.55;
    const vpY = -h * 1.4;
    f.strokeStyle = 'rgba(160,185,235,0.05)';
    f.lineWidth = 1;
    for (let i = -40; i <= 40; i++) {
      const xb = vpX + i * (flW / 22);
      f.beginPath();
      const t0 = (0 - vpY) / (flH - vpY);
      f.moveTo(vpX + (xb - vpX) * t0, 0);
      f.lineTo(xb, flH);
      f.stroke();
    }
    // Lignes du terrain : ligne de fond, raquette et arc à trois points, vers le panier (à droite)
    f.strokeStyle = PALETTE.line;
    f.lineWidth = 1.5;
    f.beginPath();
    f.moveTo(0, flH * 0.08);
    f.lineTo(flW, flH * 0.08);
    f.stroke();
    const hx = flW * 0.74;
    f.beginPath();
    f.ellipse(hx, flH * 0.08, flW * 0.3, flH * 0.62, 0, Math.PI * 0.5, Math.PI * 1.0);
    f.stroke();
    f.beginPath();
    f.moveTo(hx - flW * 0.1, flH * 0.08);
    f.lineTo(hx - flW * 0.13, flH * 0.42);
    f.lineTo(hx + flW * 0.04, flH * 0.42);
    f.stroke();
    f.beginPath();
    f.ellipse(hx - flW * 0.045, flH * 0.42, flW * 0.085, flH * 0.1, 0, Math.PI, Math.PI * 2, true);
    f.stroke();
    // Éclat du vernis près de l'horizon
    const sheen = f.createLinearGradient(0, 0, 0, flH * 0.35);
    sheen.addColorStop(0, 'rgba(140,170,230,0.10)');
    sheen.addColorStop(1, 'rgba(140,170,230,0)');
    f.fillStyle = sheen;
    f.fillRect(0, 0, flW, flH * 0.35);
    this.floorLayer = fl;
    this.floorW = flW;

    // Faisceau de projecteur flouté (une seule fois)
    const sw = 360;
    const sh = 720;
    // Le flou des canvas (ctx.filter) n'existe dans Safari / WebView iOS qu'à partir d'iOS 18 :
    // sinon, on dessine le faisceau 8 fois plus petit puis on l'agrandit avec lissage (flou équivalent).
    const out = makeCanvas(sw, sh);
    const canBlur = 'filter' in out.getContext('2d');
    const ds = canBlur ? 1 : 1 / 8;
    const sp = canBlur ? out : makeCanvas(Math.ceil(sw * ds), Math.ceil(sh * ds));
    const s = sp.getContext('2d');
    if (canBlur) s.filter = 'blur(18px)';
    else s.scale(ds, ds);
    const beam = s.createLinearGradient(0, 0, 0, sh);
    beam.addColorStop(0, 'rgba(255,255,255,0.55)');
    beam.addColorStop(0.6, 'rgba(255,255,255,0.12)');
    beam.addColorStop(1, 'rgba(255,255,255,0)');
    s.fillStyle = beam;
    s.beginPath();
    s.moveTo(sw * 0.44, 20);
    s.lineTo(sw * 0.56, 20);
    s.lineTo(sw * 0.86, sh - 20);
    s.lineTo(sw * 0.14, sh - 20);
    s.closePath();
    s.fill();
    if (!canBlur) {
      const o = out.getContext('2d');
      o.imageSmoothingEnabled = true;
      o.imageSmoothingQuality = 'high';
      o.drawImage(sp, 0, 0, sw, sh);
    }
    this.spot = out;

    // Les faisceaux sont incrustés une fois pour toutes dans le plan des tribunes : de grandes
    // surfaces en lumière additive redessinées à chaque image coûtent cher sur mobile.
    if (this.q.spots) {
      g.globalCompositeOperation = 'lighter';
      [[0.18, 0.1, -0.05], [0.52, 0.14, 0.03], [0.84, 0.12, 0.06]].forEach(([fx, a, ang]) => {
        g.save();
        g.translate(w * fx + (bgW - w) / 2, -h * 0.05);
        g.rotate(ang);
        g.globalAlpha = a;
        g.drawImage(out, -h * 0.42, 0, h * 0.84, h * 1.12);
        g.restore();
      });
      g.globalCompositeOperation = 'source-over';
      g.globalAlpha = 1;
    }

    // Halo doux réutilisable
    const gl = makeCanvas(128, 128);
    const gg = gl.getContext('2d');
    const rad = gg.createRadialGradient(64, 64, 0, 64, 64, 64);
    rad.addColorStop(0, 'rgba(255,255,255,1)');
    rad.addColorStop(0.35, 'rgba(255,255,255,0.35)');
    rad.addColorStop(1, 'rgba(255,255,255,0)');
    gg.fillStyle = rad;
    gg.fillRect(0, 0, 128, 128);
    this.glow = gl;

    // Voile de lisibilité (côté gauche, derrière le logo et JOUER) + vignette, en basse résolution
    const vw = Math.round(w / 3);
    const vh = Math.round(h / 3);
    const vg = makeCanvas(vw, vh);
    const v = vg.getContext('2d');
    const left = v.createLinearGradient(0, 0, vw * 0.7, 0);
    left.addColorStop(0, 'rgba(3,6,14,0.78)');
    left.addColorStop(0.55, 'rgba(3,6,14,0.35)');
    left.addColorStop(1, 'rgba(3,6,14,0)');
    v.fillStyle = left;
    v.fillRect(0, 0, vw, vh);
    const r = Math.hypot(vw, vh) / 2;
    const vig = v.createRadialGradient(vw * 0.55, vh * 0.5, r * 0.45, vw * 0.55, vh * 0.5, r * 1.1);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(0,0,0,0.6)');
    v.fillStyle = vig;
    v.fillRect(0, 0, vw, vh);
    this.veil = vg;
  }

  // ─── Image par image ────────────────────────────────────────────────────

  pulse() {
    this.flash = 1;
  }

  frame(dt) {
    const { ctx, w, h, dpr } = this;
    const motion = this.reducedMotion ? 0.25 : 1;
    this.time += dt * motion;
    const t = this.time;
    this.dim = damp(this.dim, this.dimTarget, 7, dt);
    this.flash = Math.max(0, this.flash - dt * 1.6);
    this.pointer.x = damp(this.pointer.x, this.pointer.tx, 3, dt);
    this.pointer.y = damp(this.pointer.y, this.pointer.ty, 3, dt);

    // Caméra : lente dérive + léger suivi du doigt / de la souris
    const camX = Math.sin(t * 0.11) * w * 0.012 + this.pointer.x * w * 0.01;
    const camY = Math.sin(t * 0.083) * h * 0.006 + this.pointer.y * h * 0.006;
    const zoom = 1 + this.dim * 0.035;

    ctx.setTransform(dpr * zoom, 0, 0, dpr * zoom, (dpr * w * (1 - zoom)) / 2, (dpr * h * (1 - zoom)) / 2);

    // 1. Tribunes
    ctx.drawImage(this.bgLayer, -(this.bgW - w) / 2 - camX * 0.25, -camY * 0.25, this.bgW, this.horizon);

    // 2. Bandeau LED autour du terrain : un reflet de couleur glisse lentement
    const ribbonY = this.horizon * 0.94 - camY * 0.4;
    const ribbonH = Math.max(2, h * 0.008);
    ctx.fillStyle = '#0d1a33';
    ctx.fillRect(-20, ribbonY, w + 40, ribbonH);
    const p = ((t * 0.06) % 1.4) - 0.2;
    const rg = ctx.createLinearGradient(0, 0, w, 0);
    rg.addColorStop(clamp(p - 0.2, 0, 1), `rgba(${PALETTE.cyan},0)`);
    rg.addColorStop(clamp(p, 0, 1), `rgba(${PALETTE.orange},0.85)`);
    rg.addColorStop(clamp(p + 0.2, 0, 1), `rgba(${PALETTE.cyan},0)`);
    ctx.fillStyle = rg;
    ctx.fillRect(-20, ribbonY, w + 40, ribbonH);

    // 3. Projecteurs : incrustés dans le plan des tribunes (voir _bake)

    // 4. Parquet
    const floorX = -(this.floorW - w) / 2 - camX * 0.6;
    const floorY = this.horizon - camY * 0.5;
    ctx.drawImage(this.floorLayer, floorX, floorY, this.floorW, h - this.horizon + h * 0.02);

    // Reflets des projecteurs sur le vernis
    if (this.q.reflections) {
      ctx.globalCompositeOperation = 'lighter';
      for (const [fx, a] of [[0.18, 0.1], [0.52, 0.13], [0.84, 0.11]]) {
        const x = w * fx - camX * 0.6;
        ctx.globalAlpha = a;
        ctx.drawImage(this.glow, x - w * 0.12, floorY + h * 0.04, w * 0.24, h * 0.16);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }

    // 5. Panier au loin
    this._drawHoop(w * 0.83 - camX * 0.45, floorY + h * 0.07, h * 0.0108, t);

    // 6. Balle qui rebondit lentement (plan le plus proche)
    this._drawBall(w * 0.6 + Math.sin(t * 0.18) * w * 0.025 - camX * 0.8, h * 0.88 - camY * 0.6, h * 0.058, t);

    // 7. Poussières dans la lumière
    if (this.motes.length) {
      ctx.globalCompositeOperation = 'lighter';
      for (const m of this.motes) {
        m.y -= m.speed * dt * motion;
        m.x += m.drift * dt * motion;
        if (m.y < 0.05) {
          m.y = 0.85;
          m.x = Math.random();
        }
        const x = ((m.x * 1.1 - 0.05) * w - camX * 0.9 + w) % w;
        const y = m.y * h;
        const tw = 0.45 + 0.55 * Math.sin(t * 1.3 + m.phase);
        ctx.globalAlpha = 0.35 * tw;
        const r = m.r * 2.4;
        ctx.drawImage(this.glow, x - r, y - r, r * 2, r * 2);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }

    // 8. Voile de lisibilité et vignette
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.drawImage(this.veil, 0, 0, w, h);

    // Page ouverte : on assombrit le décor
    if (this.dim > 0.002) {
      ctx.fillStyle = `rgba(3,6,14,${0.8 * this.dim})`;
      ctx.fillRect(0, 0, w, h);
    }
    if (this.flash > 0) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = this.flash * 0.5;
      ctx.drawImage(this.glow, w * 0.15 - w * 0.6, h * 0.5 - h, w * 1.2, h * 2);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }
  }

  _drawHoop(x, floorY, u, t) {
    const ctx = this.ctx;
    // Plan lointain : un peu voilé par la brume de la salle
    ctx.save();
    ctx.globalAlpha = 0.82;
    const poleTop = floorY - u * 30;
    // Socle et poteau
    ctx.fillStyle = '#16243f';
    roundRect(ctx, x - u * 3.5, floorY - u * 3, u * 7, u * 3, u * 1.2);
    ctx.fill();
    const pole = ctx.createLinearGradient(x - u, 0, x + u, 0);
    pole.addColorStop(0, '#2c4268');
    pole.addColorStop(1, '#162540');
    ctx.fillStyle = pole;
    ctx.fillRect(x - u * 0.9, poleTop, u * 1.8, floorY - poleTop - u * 2);
    // Bras
    ctx.strokeStyle = '#22375c';
    ctx.lineWidth = u * 1.3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x, poleTop + u * 2);
    ctx.lineTo(x - u * 6, poleTop + u * 2);
    ctx.stroke();
    // Planche (vue de 3/4 : un parallélogramme vitré)
    const bx = x - u * 7;
    const by = poleTop - u * 6;
    ctx.fillStyle = 'rgba(200,225,255,0.10)';
    ctx.strokeStyle = 'rgba(235,242,255,0.75)';
    ctx.lineWidth = Math.max(1, u * 0.45);
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(bx + u * 1.6, by - u * 1.2);
    ctx.lineTo(bx + u * 1.6, by + u * 10.4);
    ctx.lineTo(bx, by + u * 11.6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = `rgba(${PALETTE.orange},0.9)`;
    ctx.beginPath();
    ctx.moveTo(bx + u * 0.4, by + u * 4.4);
    ctx.lineTo(bx + u * 1.2, by + u * 3.8);
    ctx.lineTo(bx + u * 1.2, by + u * 7.6);
    ctx.lineTo(bx + u * 0.4, by + u * 8.2);
    ctx.closePath();
    ctx.stroke();
    // Cercle et filet (qui ondule doucement)
    const rimY = by + u * 8.6;
    const rimCX = bx - u * 3.4;
    const rimRX = u * 3.4;
    const sway = Math.sin(t * 1.1) * u * 0.25;
    ctx.strokeStyle = 'rgba(255,255,255,0.65)';
    ctx.lineWidth = Math.max(0.8, u * 0.22);
    ctx.beginPath();
    for (let i = 0; i <= 6; i++) {
      const fx = -1 + (i / 6) * 2;
      const topX = rimCX + fx * rimRX;
      const botX = rimCX + fx * rimRX * 0.55 + sway;
      ctx.moveTo(topX, rimY);
      ctx.lineTo(botX, rimY + u * 5.2);
    }
    for (let j = 1; j <= 3; j++) {
      const k = j / 3;
      const yy = rimY + u * 5.2 * k;
      const rx = rimRX * (1 - 0.45 * k);
      ctx.moveTo(rimCX - rx + sway * k, yy);
      ctx.lineTo(rimCX + rx + sway * k, yy);
    }
    ctx.stroke();
    ctx.strokeStyle = `rgb(${PALETTE.orange})`;
    ctx.lineWidth = Math.max(1.2, u * 0.6);
    ctx.beginPath();
    ctx.ellipse(rimCX, rimY, rimRX, u * 0.9, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = Math.max(1, u * 0.45);
    ctx.beginPath();
    ctx.moveTo(rimCX + rimRX, rimY);
    ctx.lineTo(bx, rimY - u * 0.3);
    ctx.stroke();
    ctx.restore();
  }

  _drawBall(x, floorY, r, t) {
    const ctx = this.ctx;
    const period = 1.55; // rebond lent : ambiance, pas action
    const u = (t % period) / period;
    const height = 4 * u * (1 - u);       // parabole : 0 au sol, 1 au sommet
    const apex = this.h * 0.26;
    const y = floorY - r - height * apex;
    // Écrasement au contact du sol, étirement en vol
    const contact = Math.max(0, 1 - Math.min(u, 1 - u) / 0.06);
    const sx = 1 + 0.16 * contact - 0.04 * (1 - contact) * Math.abs(1 - 2 * u);
    const sy = 1 - 0.18 * contact + 0.05 * (1 - contact) * Math.abs(1 - 2 * u);
    const angle = t * 1.4;

    // Ombre portée
    const sh = 1 - height * 0.6;
    ctx.fillStyle = `rgba(0,0,0,${0.45 * sh})`;
    ctx.beginPath();
    ctx.ellipse(x, floorY, r * (1.05 * sh + 0.2), r * 0.18 * sh, 0, 0, Math.PI * 2);
    ctx.fill();

    // Reflet sur le parquet verni
    if (this.q.reflections) {
      ctx.save();
      ctx.globalAlpha = 0.16 * (1 - height * 0.7);
      ctx.translate(x, floorY + (floorY - y));
      ctx.scale(sx, -sy);
      ctx.rotate(angle);
      ctx.drawImage(this.ball.surface, -r, -r, r * 2, r * 2);
      ctx.restore();
    }

    // Balle
    ctx.save();
    ctx.translate(x, y + r * (1 - sy));
    ctx.scale(sx, sy);
    ctx.save();
    ctx.rotate(angle);
    ctx.drawImage(this.ball.surface, -r, -r, r * 2, r * 2);
    ctx.restore();
    ctx.drawImage(this.ball.shading, -r, -r, r * 2, r * 2);
    ctx.restore();

    // Petite lueur chaude sous la balle, comme si un projecteur la suivait
    if (this.q.spots) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.12;
      ctx.drawImage(this.glow, x - r * 4, floorY - r * 1.2, r * 8, r * 2.4);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }
    void lerp;
  }
}

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}
