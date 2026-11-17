// Rendu Canvas 2D. Ne contient aucune logique de jeu : il dessine l'état qu'on lui donne.
//
// Ordre des calques (pour que le ballon passe « dans » le panier) :
//   fond → décor → poteau, planche, arrière du cercle → ombre → prévisualisation
//   → BALLON → filet → avant du cercle → particules → interface

import { lerp } from '../core/math.js';
import { createBallTextures } from './ball-sprite.js';

const COLORS = {
  bgTop: '#0d1424',
  bgBottom: '#1f2d4a',
  floorTop: '#d8975a',
  floorBand: '#c27f45',
  floorBody: '#5a361d',
  floorEdge: '#f2c08a',
  block: '#26344f',
  blockEdge: '#3a4d72',
  blockTop: '#7fa2e0',
  wall: '#141c2e',
  wallEdge: '#26324b',
  bumper: '#e4434f',
  bumperRing: '#ff9aa1',
  rimFront: '#ff5a1f',
  rimBack: '#a8391a',
  board: 'rgba(225,240,255,0.92)',
  boardEdge: '#8fa9cc',
  pole: '#36425c',
  poleEdge: '#55658a',
  net: 'rgba(255,255,255,0.88)',
};

export class Renderer {
  /** @param {HTMLCanvasElement} canvas */
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.tex = createBallTextures();
    this.dpr = 1;
    this.w = 1;
    this.h = 1;
    this._bg = null;
    this._vignette = null;
    this.fps = 60;
  }

  resize(cssWidth, cssHeight) {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = cssWidth;
    this.h = cssHeight;
    this.canvas.width = Math.round(cssWidth * this.dpr);
    this.canvas.height = Math.round(cssHeight * this.dpr);
    const ctx = this.ctx;
    this._bg = ctx.createLinearGradient(0, 0, 0, cssHeight);
    this._bg.addColorStop(0, COLORS.bgTop);
    this._bg.addColorStop(1, COLORS.bgBottom);
    const r = Math.hypot(cssWidth, cssHeight) / 2;
    this._vignette = ctx.createRadialGradient(cssWidth / 2, cssHeight / 2, r * 0.55, cssWidth / 2, cssHeight / 2, r * 1.05);
    this._vignette.addColorStop(0, 'rgba(0,0,0,0)');
    this._vignette.addColorStop(1, 'rgba(0,0,0,0.38)');
  }

  /**
   * @param {object} s  état à dessiner (voir main.js)
   */
  draw(s) {
    const { ctx, dpr } = this;
    const cam = s.camera;
    if (s.frameDt > 0) this.fps = lerp(this.fps, 1 / s.frameDt, 0.05);

    // Fond (espace écran)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = this._bg;
    ctx.fillRect(0, 0, this.w, this.h);
    this._drawParallax(cam);

    // Monde (y vers le haut)
    const k = cam.scale * dpr;
    ctx.setTransform(k, 0, 0, -k, dpr * (this.w / 2 - cam.x * cam.scale), dpr * (this.h / 2 + cam.y * cam.scale));
    const px = 1 / cam.scale; // un pixel CSS en unités du monde

    for (const solid of s.level.solids) this._drawSolid(solid, px);
    for (const hoop of s.level.hoops) this._drawHoopBack(hoop);
    this._drawShadow(s);
    this._drawPreview(s);
    this._drawBall(s);
    for (const hoop of s.level.hoops) this._drawHoopFront(hoop);
    this._drawParticles(s.particles);
    this._drawChargeIndicator(s, px);
    if (s.debug) this._drawDebugWorld(s, px);

    // Interface (espace écran)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = this._vignette;
    ctx.fillRect(0, 0, this.w, this.h);
    this._drawTexts(s);
    if (s.debug) this._drawDebugText(s);
  }

  // ─── Décor ──────────────────────────────────────────────────────────────

  _drawParallax(cam) {
    const ctx = this.ctx;
    const p = 0.35; // le fond défile 3× moins vite que le premier plan
    const s = cam.scale;
    const spacing = 4.5;
    const left = cam.x * p - this.w / 2 / s;
    const first = Math.floor(left / spacing) - 1;
    const count = Math.ceil(this.w / s / spacing) + 3;
    ctx.fillStyle = 'rgba(120,160,255,0.035)';
    for (let i = first; i < first + count; i++) {
      const x = (i * spacing - cam.x * p) * s + this.w / 2;
      const top = this.h / 2 - (12 - cam.y * p) * s;
      ctx.fillRect(x, top, spacing * 0.42 * s, this.h * 2);
    }
    // Lignes de tribunes lointaines
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    const standY = this.h / 2 - (2.2 - cam.y * p) * s;
    ctx.fillRect(0, standY, this.w, this.h);
  }

  _drawSolid(solid, px) {
    const ctx = this.ctx;
    if (solid.kind === 'circle') {
      const g = ctx.createRadialGradient(solid.x - solid.r * 0.3, solid.y + solid.r * 0.3, solid.r * 0.1, solid.x, solid.y, solid.r);
      g.addColorStop(0, '#ff7a83');
      g.addColorStop(1, COLORS.bumper);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(solid.x, solid.y, solid.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = COLORS.bumperRing;
      ctx.lineWidth = 0.06;
      ctx.beginPath();
      ctx.arc(solid.x, solid.y, solid.r * 0.62, 0, Math.PI * 2);
      ctx.stroke();
      return;
    }

    const pts = solid.points;
    tracePolygon(ctx, pts);
    if (solid.style === 'floor') {
      ctx.fillStyle = COLORS.floorBody;
      ctx.fill();
      this._drawFloorSurface(pts);
      return;
    }

    ctx.fillStyle = solid.style === 'wall' ? COLORS.wall : COLORS.block;
    ctx.fill();
    ctx.strokeStyle = solid.style === 'wall' ? COLORS.wallEdge : COLORS.blockEdge;
    ctx.lineWidth = 2 * px;
    ctx.stroke();

    if (solid.style !== 'wall') {
      // Les bords « praticables » (normale vers le haut) sont soulignés : on lit le niveau d'un coup d'œil
      ctx.strokeStyle = COLORS.blockTop;
      ctx.lineWidth = 0.07;
      ctx.lineCap = 'round';
      forEachTopEdge(pts, (a, b) => {
        ctx.beginPath();
        ctx.moveTo(a.x, a.y - 0.035);
        ctx.lineTo(b.x, b.y - 0.035);
        ctx.stroke();
      });
    }
  }

  _drawFloorSurface(pts) {
    const ctx = this.ctx;
    let minX = Infinity;
    let maxX = -Infinity;
    let top = -Infinity;
    for (const p of pts) {
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      top = Math.max(top, p.y);
    }
    const band = 0.45;
    const g = ctx.createLinearGradient(0, top, 0, top - band);
    g.addColorStop(0, COLORS.floorTop);
    g.addColorStop(1, COLORS.floorBand);
    ctx.fillStyle = g;
    ctx.fillRect(minX, top - band, maxX - minX, band);
    // Lames de parquet (en perspective)
    ctx.strokeStyle = 'rgba(80,40,10,0.25)';
    ctx.lineWidth = 0.025;
    ctx.beginPath();
    for (let x = Math.ceil(minX / 1.3) * 1.3; x < maxX; x += 1.3) {
      ctx.moveTo(x, top);
      ctx.lineTo(x - 0.25, top - band);
    }
    ctx.stroke();
    ctx.strokeStyle = COLORS.floorEdge;
    ctx.lineWidth = 0.05;
    ctx.beginPath();
    ctx.moveTo(minX, top - 0.025);
    ctx.lineTo(maxX, top - 0.025);
    ctx.stroke();
  }

  // ─── Panier ─────────────────────────────────────────────────────────────

  _drawHoopBack(h) {
    const ctx = this.ctx;
    // Poteau et bras
    ctx.fillStyle = COLORS.pole;
    ctx.fillRect(h.pole.x, h.pole.y, h.pole.w, h.pole.h);
    ctx.fillStyle = COLORS.poleEdge;
    ctx.fillRect(h.pole.x, h.pole.y, h.pole.w * 0.25, h.pole.h);
    ctx.strokeStyle = COLORS.pole;
    ctx.lineWidth = 0.14;
    ctx.beginPath();
    ctx.moveTo(h.arm.x1, h.arm.y);
    ctx.lineTo(h.arm.x2, h.arm.y);
    ctx.stroke();

    // Planche (vue de profil)
    const b = h.board;
    ctx.fillStyle = COLORS.board;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.strokeStyle = COLORS.boardEdge;
    ctx.lineWidth = 0.03;
    ctx.strokeRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = '#ff5a1f';
    const faceX = h.facing === -1 ? b.x : b.x + b.w - 0.035;
    ctx.fillRect(faceX, h.rimY, 0.035, 0.55);

    // Fixation du cercle
    ctx.strokeStyle = COLORS.rimBack;
    ctx.lineWidth = h.rimRadius * 1.6;
    ctx.beginPath();
    ctx.moveTo(h.backX, h.rimY);
    ctx.lineTo(h.facing === -1 ? b.x : b.x + b.w, h.rimY);
    ctx.stroke();

    // Moitié arrière du cercle (derrière le ballon)
    ctx.strokeStyle = COLORS.rimBack;
    ctx.lineWidth = h.rimRadius * 2;
    ctx.beginPath();
    ctx.ellipse(h.centerX, h.rimY, (h.rightX - h.leftX) / 2, 0.13, 0, 0, Math.PI);
    ctx.stroke();
  }

  _drawHoopFront(h) {
    const ctx = this.ctx;
    // Filet
    const net = h.net;
    ctx.strokeStyle = COLORS.net;
    ctx.lineWidth = 0.028;
    ctx.lineCap = 'round';
    ctx.beginPath();
    const L = net.drawLinks;
    for (let i = 0; i < L.length; i += 2) {
      ctx.moveTo(net.x[L[i]], net.y[L[i]]);
      ctx.lineTo(net.x[L[i + 1]], net.y[L[i + 1]]);
    }
    ctx.stroke();

    // Moitié avant du cercle (devant le ballon)
    ctx.strokeStyle = COLORS.rimFront;
    ctx.lineWidth = h.rimRadius * 2;
    ctx.beginPath();
    ctx.ellipse(h.centerX, h.rimY, (h.rightX - h.leftX) / 2, 0.13, 0, Math.PI, Math.PI * 2);
    ctx.stroke();
  }

  // ─── Ballon ─────────────────────────────────────────────────────────────

  _drawShadow(s) {
    const { ball } = s;
    const surface = s.level.world.surfaceBelow(ball.x, ball.y);
    if (surface === -Infinity) return;
    const height = ball.y - ball.r - surface;
    if (height > 9) return;
    const t = Math.max(0, height) / 9;
    const ctx = this.ctx;
    ctx.fillStyle = `rgba(0,0,0,${0.32 * (1 - t)})`;
    ctx.beginPath();
    ctx.ellipse(ball.x, surface + 0.01, ball.r * (1.05 - 0.45 * t), ball.r * 0.16 * (1 - 0.5 * t), 0, 0, Math.PI * 2);
    ctx.fill();
  }

  _drawPreview(s) {
    const p = s.preview;
    if (!p || p.alpha <= 0.01 || p.count < 2) return;
    const ctx = this.ctx;
    const every = 3;
    const n = p.count;
    for (let i = every; i < n; i += every) {
      const t = i / n;
      const a = p.alpha * (1 - t * 0.75);
      ctx.fillStyle = `rgba(255,255,255,${a})`;
      ctx.beginPath();
      ctx.arc(p.points[i * 2], p.points[i * 2 + 1], lerp(0.075, 0.035, t), 0, Math.PI * 2);
      ctx.fill();
    }
    if (p.hit) {
      ctx.strokeStyle = `rgba(255,255,255,${p.alpha * 0.35})`;
      ctx.lineWidth = 0.035;
      ctx.beginPath();
      ctx.arc(p.points[(n - 1) * 2], p.points[(n - 1) * 2 + 1], s.ball.r, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  _drawBall(s) {
    const ctx = this.ctx;
    const { ball, visual } = s;
    const r = ball.r;
    const m = visual.m;
    ctx.save();
    ctx.translate(ball.x + visual.offsetX * r, ball.y + visual.offsetY * r);
    ctx.transform(m[0], m[1], m[2], m[3], 0, 0);
    ctx.save();
    ctx.rotate(ball.angle);
    ctx.scale(1, -1);
    ctx.drawImage(this.tex.surface, -r, -r, r * 2, r * 2);
    ctx.restore();
    ctx.scale(1, -1);
    ctx.drawImage(this.tex.shading, -r, -r, r * 2, r * 2);
    ctx.restore();
  }

  _drawChargeIndicator(s, px) {
    const c = s.charge;
    if (!c.visible) return;
    const ctx = this.ctx;
    const { ball } = s;
    const r = ball.r + 0.2;
    const a = c.alpha;

    ctx.lineCap = 'round';
    ctx.lineWidth = 0.07;
    ctx.strokeStyle = `rgba(255,255,255,${0.16 * a})`;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, r, 0, Math.PI * 2);
    ctx.stroke();

    const full = c.value >= 0.999;
    const pulse = full ? 0.5 + 0.5 * Math.sin(s.time * 18) : 0;
    ctx.strokeStyle = full ? `rgba(255,${Math.round(90 + 60 * pulse)},50,${a})` : chargeColor(c.value, a);
    ctx.lineWidth = 0.07 + pulse * 0.03;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, r, Math.PI / 2, Math.PI / 2 - Math.max(0.02, c.value) * Math.PI * 2, true);
    ctx.stroke();

    // Chevron de direction
    const d = c.direction;
    const cx = ball.x + d * (r + 0.22);
    ctx.fillStyle = `rgba(255,255,255,${0.85 * a})`;
    ctx.beginPath();
    ctx.moveTo(cx + d * 0.14, ball.y);
    ctx.lineTo(cx - d * 0.06, ball.y + 0.14);
    ctx.lineTo(cx - d * 0.06, ball.y - 0.14);
    ctx.closePath();
    ctx.fill();
    void px;
  }

  // ─── Effets ─────────────────────────────────────────────────────────────

  _drawParticles(particles) {
    const ctx = this.ctx;
    for (const p of particles.items) {
      if (!p.alive) continue;
      const t = p.life / p.maxLife;
      ctx.globalAlpha = Math.min(1, t * 2);
      ctx.fillStyle = p.color;
      if (p.kind === 0) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (1.6 - t * 0.6), 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.scale(1, Math.cos(p.rot * 1.7)); // papier qui tourne sur lui-même
        ctx.fillRect(-p.size, -p.size * 0.5, p.size * 2, p.size);
        ctx.restore();
      }
    }
    ctx.globalAlpha = 1;
  }

  _drawTexts(s) {
    const ctx = this.ctx;
    const cam = s.camera;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const t of s.particles.texts) {
      if (!t.alive) continue;
      const age = t.maxLife - t.life;
      const pop = age < 0.25 ? easeOutBack(age / 0.25) : 1;
      const alpha = Math.min(1, t.life / 0.35);
      const size = Math.round(cam.scale * 0.9 * t.size * pop);
      if (size < 2) continue;
      const x = cam.worldToScreenX(t.x);
      const y = cam.worldToScreenY(t.y);
      ctx.globalAlpha = alpha;
      ctx.font = `900 ${size}px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;
      ctx.lineWidth = Math.max(2, size * 0.14);
      ctx.strokeStyle = 'rgba(10,15,30,0.85)';
      ctx.lineJoin = 'round';
      ctx.strokeText(t.text, x, y);
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, x, y);
    }
    ctx.globalAlpha = 1;
  }

  // ─── Débogage ───────────────────────────────────────────────────────────

  _drawDebugWorld(s, px) {
    const ctx = this.ctx;
    ctx.lineWidth = 1.5 * px;
    ctx.strokeStyle = 'rgba(0,255,170,0.8)';
    ctx.lineCap = 'round';
    for (const c of s.level.world.colliders) {
      ctx.beginPath();
      if (c.ax === c.bx && c.ay === c.by) {
        ctx.arc(c.ax, c.ay, Math.max(c.r, 2 * px), 0, Math.PI * 2);
      } else {
        ctx.moveTo(c.ax, c.ay);
        ctx.lineTo(c.bx, c.by);
      }
      ctx.stroke();
    }
    // Contour physique exact du ballon
    ctx.strokeStyle = 'rgba(0,255,170,0.9)';
    ctx.beginPath();
    ctx.arc(s.body.x, s.body.y, s.ball.r, 0, Math.PI * 2);
    ctx.moveTo(s.body.x, s.body.y);
    ctx.lineTo(s.body.x + Math.cos(s.body.angle) * s.ball.r, s.body.y + Math.sin(s.body.angle) * s.ball.r);
    ctx.stroke();
    // Normales de contact
    ctx.strokeStyle = '#ff3b6b';
    for (const c of s.debugContacts) {
      ctx.beginPath();
      ctx.moveTo(c.px, c.py);
      ctx.lineTo(c.px + c.nx * 0.6, c.py + c.ny * 0.6);
      ctx.stroke();
    }
    // Ligne de détection du panier
    ctx.strokeStyle = 'rgba(255,220,0,0.8)';
    for (const h of s.level.hoops) {
      ctx.beginPath();
      ctx.moveTo(h.innerLeft, h.rimY);
      ctx.lineTo(h.innerRight, h.rimY);
      ctx.stroke();
    }
  }

  _drawDebugText(s) {
    const ctx = this.ctx;
    const b = s.body;
    const lines = [
      `${this.fps.toFixed(0)} fps · dpr ${this.dpr}`,
      `pos  ${b.x.toFixed(2)}, ${b.y.toFixed(2)}`,
      `vit  ${b.vx.toFixed(2)}, ${b.vy.toFixed(2)}  |v| ${b.speed.toFixed(2)}`,
      `rot  ${b.angularVelocity.toFixed(2)} rad/s`,
      `sol  ${b.grounded ? 'oui' : 'non'}  (${Number.isFinite(b.timeSinceGrounded) ? b.timeSinceGrounded.toFixed(2) : '∞'} s)`,
      `charge ${(s.charge.value * 100).toFixed(0)} %${s.pending ? '  (saut en attente)' : ''}`,
    ];
    ctx.font = '12px ui-monospace, Menlo, Consolas, monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    const x = 12;
    const y = this.h - lines.length * 16 - 14;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(x - 6, y - 6, 270, lines.length * 16 + 10);
    ctx.fillStyle = '#9dffd9';
    lines.forEach((l, i) => ctx.fillText(l, x, y + i * 16));
  }
}

function tracePolygon(ctx, pts) {
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
}

/** Appelle fn(a, b) pour chaque côté dont la normale extérieure pointe vers le haut. */
function forEachTopEdge(pts, fn) {
  let area = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    area += a.x * b.y - b.x * a.y;
  }
  const ccw = area > 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    const ny = (ccw ? -dx : dx) / len;
    if (ny > 0.5) fn(a, b);
  }
}

function chargeColor(t, a) {
  // blanc → jaune → orange
  const r = 255;
  const g = Math.round(lerp(255, 150, t));
  const b = Math.round(lerp(255, 40, t));
  return `rgba(${r},${g},${b},${a})`;
}

function easeOutBack(t) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}
