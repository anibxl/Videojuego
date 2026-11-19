// Aperçu animé d'un article de la boutique : le ballon équipé rebondit sur un petit terrain avec sa
// traînée et son effet de rebond ; pour les animations de panier, il tombe dans un panier.
// Utilise exactement les mêmes dessins que le jeu (ball-sprite.js, cosmetics.js).

import { createBallTextures, skinInfo, drawFace, drawAura } from '../render/ball-sprite.js';
import { Fx, bounceEffect, drawTrail, emitTrail, goalEffect } from '../render/cosmetics.js';

const TAU = Math.PI * 2;
const texCache = new Map();
export const ballTex = (id) => {
  let t = texCache.get(id);
  if (!t) texCache.set(id, (t = createBallTextures(id)));
  return t;
};

export class Preview {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.fx = new Fx(260);
    this.look = { ball: 'ball-classic', bounce: 'bounce-classic', trail: 'trail-none', goal: 'goal-confetti' };
    this.mode = 'bounce';
    this.tint = '167,180,204';
    this.time = 0;
    this.trail = [];
    this._lastHop = -1;
    this._lastGoal = -1;
  }

  set(look, mode, tint) {
    this.look = { ...look };
    this.mode = mode;
    this.tint = tint;
    this.fx.clear();
    this.trail.length = 0;
    this._lastHop = -1;
    this._lastGoal = -1;
  }

  resize(w, h, dpr) {
    this.w = w;
    this.h = h;
    this.dpr = dpr;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
  }

  /** Position du ballon à l'instant t (unités du jeu). */
  _ball(t) {
    if (this.mode === 'goal') {
      // Tir en cloche vers le panier toutes les 2,6 s
      const u = (t % 2.6) / 2.6;
      if (u < 0.55) {
        const k = u / 0.55;
        return { x: -2.6 + k * 4.75, y: 0.4 + 5.6 * k * (1 - k) * 1.4 + k * 2.2, n: Math.floor(t / 2.6), phase: 'fly' };
      }
      const k = (u - 0.55) / 0.45;
      return { x: 2.15, y: Math.max(0.4, 3.0 - k * 6), n: Math.floor(t / 2.6), phase: 'drop' };
    }
    const period = 0.85;
    const n = Math.floor(t / period);
    const u = (t % period) / period;
    const dir = n % 6 < 3 ? 1 : -1;
    const step = n % 3;
    const x0 = dir > 0 ? -1.8 + step * 1.2 : 1.8 - step * 1.2;
    return { x: x0 + dir * 1.2 * u, y: 0.4 + 2.4 * 4 * u * (1 - u), n, phase: 'hop', u };
  }

  draw(dt) {
    this.time += dt;
    const { ctx, w, h, dpr } = this;
    const t = this.time;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // Fond : halo de la couleur de la rareté
    const bg = ctx.createRadialGradient(w / 2, h * 0.55, 0, w / 2, h * 0.55, Math.max(w, h) * 0.75);
    bg.addColorStop(0, `rgba(${this.tint},0.35)`);
    bg.addColorStop(0.55, 'rgba(14,22,44,1)');
    bg.addColorStop(1, 'rgba(6,10,22,1)');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    // Repère monde : 1 u = h / 6, sol à 22 % du bas
    const s = h / 6;
    ctx.setTransform(s * dpr, 0, 0, -s * dpr, (w / 2) * dpr, h * 0.78 * dpr);
    // Parquet
    const floor = ctx.createLinearGradient(0, 0, 0, -1.6);
    floor.addColorStop(0, '#3a2a1e');
    floor.addColorStop(1, '#1a120c');
    ctx.fillStyle = floor;
    ctx.fillRect(-w / s, -2, (w / s) * 2, 2);
    ctx.fillStyle = 'rgba(255,220,180,0.55)';
    ctx.fillRect(-w / s, -0.06, (w / s) * 2, 0.06);

    const b = this._ball(t);
    if (this.mode === 'goal') this._hoop(ctx, t);
    // Rebond : effet au contact du sol
    if (b.phase === 'hop' && b.n !== this._lastHop) {
      this._lastHop = b.n;
      if (this.mode === 'bounce' || this.mode === 'ball' || this.mode === 'trail') {
        if (!bounceEffect(this.fx, this.look.bounce, b.x, 0.02, 3)) this.fx.spawn({ kind: 'ring', x: b.x, y: 0.05, vx: 0, vy: 0, life: 0.3, size: 0.25, grow: 2.5, color: '255,255,255', width: 0.05 });
      }
    }
    if (this.mode === 'goal' && b.phase === 'drop' && b.n !== this._lastGoal && b.y < 2.4) {
      this._lastGoal = b.n;
      if (!goalEffect(this.fx, this.look.goal, 2.15, 2.6)) {
        for (let i = 0; i < 40; i++) {
          const a = Math.random() * Math.PI;
          const v = 3 + Math.random() * 5;
          this.fx.spawn({ kind: 'streamer', x: 2.15, y: 2.6, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 9, drag: 1.2, vr: 8, life: 1.4, size: 0.07, color: ['255,95,140', '80,220,255', '255,210,80', '120,255,170'][i % 4], fade: false });
        }
      }
    }
    this.fx.update(dt);
    // Traînée
    this.trail.push({ x: b.x, y: b.y });
    if (this.trail.length > 16) this.trail.shift();
    drawTrail(ctx, this.look.trail, this.trail, t, 0.4);
    emitTrail(this.fx, this.look.trail, b.x, b.y, 5, dt);
    // Ombre
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(b.x, 0.02, 0.38 * Math.max(0.3, 1 - (b.y - 0.4) / 4), 0.07, 0, 0, TAU);
    ctx.fill();
    // Ballon (aura des légendaires, visage des ballons amusants)
    const tex = ballTex(this.look.ball);
    const info = skinInfo(this.look.ball);
    const squash = b.phase === 'hop' && (b.u < 0.05 || b.u > 0.95) ? 0.86 : 1;
    const vx = (b.x - (this._px ?? b.x)) / Math.max(dt, 1e-3);
    const vy = (b.y - (this._py ?? b.y)) / Math.max(dt, 1e-3);
    this._px = b.x;
    this._py = b.y;
    ctx.save();
    ctx.translate(b.x, b.y - 0.4 * (1 - squash));
    if (info.aura) {
      ctx.save();
      ctx.scale(1, -1);
      drawAura(ctx, info.aura, 0.4, t);
      ctx.restore();
    }
    ctx.scale(1 / squash, squash);
    ctx.save();
    ctx.rotate(-t * 4);
    ctx.drawImage(tex.surface, -0.4, -0.4, 0.8, 0.8);
    ctx.restore();
    ctx.scale(1, -1);
    ctx.drawImage(tex.shading, -0.4, -0.4, 0.8, 0.8);
    if (info.face) drawFace(ctx, info.face, 0.4, { vx, vy, t });
    ctx.restore();
    if (this.mode === 'goal') this._hoopFront(ctx);
    this.fx.draw(ctx);
  }

  _hoop(ctx) {
    ctx.fillStyle = '#c9d2e6';
    ctx.fillRect(3.25, 0, 0.12, 4.2);
    ctx.fillStyle = 'rgba(225,240,255,0.9)';
    ctx.fillRect(2.95, 2.6, 0.1, 1.8);
  }

  _hoopFront(ctx) {
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 0.035;
    ctx.beginPath();
    for (let i = 0; i <= 4; i++) {
      const u = i / 4;
      ctx.moveTo(1.6 + u * 1.15, 2.6);
      ctx.lineTo(1.8 + u * 0.75, 1.9);
    }
    ctx.stroke();
    ctx.strokeStyle = '#ff6a3d';
    ctx.lineWidth = 0.09;
    ctx.beginPath();
    ctx.moveTo(1.55, 2.6);
    ctx.lineTo(2.95, 2.6);
    ctx.stroke();
  }
}

/** Vignette fixe d'un article (cartes de la grille), dessinée une fois. */
export function drawThumb(canvas, item, dpr) {
  const ctx = canvas.getContext('2d');
  const w = canvas.clientWidth || 96;
  const h = canvas.clientHeight || 72;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  const s = h / 3.2;
  ctx.setTransform(s * dpr, 0, 0, -s * dpr, (w / 2) * dpr, h * 0.62 * dpr);
  const fx = new Fx(120);
  const ball = (x, y, id = 'ball-classic', r = 0.55) => {
    const tex = ballTex(id);
    const info = skinInfo(id);
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1, -1);
    if (info.aura) drawAura(ctx, info.aura, r, 0.6);
    ctx.scale(1, -1);
    ctx.drawImage(tex.surface, -r, -r, r * 2, r * 2);
    ctx.scale(1, -1);
    ctx.drawImage(tex.shading, -r, -r, r * 2, r * 2);
    if (info.face) drawFace(ctx, info.face, r, { vx: 0.5, vy: 0, t: 1 });
    ctx.restore();
  };
  const step = (n) => {
    for (let i = 0; i < n; i++) fx.update(1 / 60);
  };
  if (item.category === 'ball') ball(0, 0.15, item.id, 0.85);
  else if (item.category === 'bounce') {
    const keep = Math.random;
    let seed = 7;
    Math.random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    if (!bounceEffect(fx, item.id, 0, -0.55, 4)) fx.spawn({ kind: 'ring', x: 0, y: -0.55, vx: 0, vy: 0, life: 0.3, size: 0.6, grow: 0, color: '255,255,255', width: 0.07 });
    step(9);
    Math.random = keep;
    ball(0, 0.4);
    fx.draw(ctx);
  } else if (item.category === 'trail') {
    const pts = Array.from({ length: 16 }, (_, i) => ({ x: -1.9 + i * 0.13, y: -0.5 + Math.sin(i / 5) * 0.7 }));
    drawTrail(ctx, item.id, pts, 0, 0.5);
    ball(pts[15].x, pts[15].y, 'ball-classic', 0.5);
  } else {
    const keep = Math.random;
    let seed = 11;
    Math.random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    if (!goalEffect(fx, item.id, 0, 0)) {
      for (let i = 0; i < 24; i++) {
        const a = Math.random() * Math.PI;
        const v = 2 + Math.random() * 3;
        fx.spawn({ kind: 'streamer', x: 0, y: 0, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 3, vr: 8, life: 2, size: 0.09, color: ['255,95,140', '80,220,255', '255,210,80', '120,255,170'][i % 4], fade: false });
      }
    }
    step(14);
    Math.random = keep;
    ctx.strokeStyle = '#ff6a3d';
    ctx.lineWidth = 0.12;
    ctx.beginPath();
    ctx.moveTo(-0.7, -0.3);
    ctx.lineTo(0.7, -0.3);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = 0.04;
    ctx.beginPath();
    for (let i = 0; i <= 4; i++) {
      ctx.moveTo(-0.7 + i * 0.35, -0.3);
      ctx.lineTo(-0.45 + i * 0.22, -1.1);
    }
    ctx.stroke();
    fx.draw(ctx);
  }
}
