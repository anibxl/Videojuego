// Rendu Canvas 2D. Ne contient aucune logique de jeu : il dessine l'état qu'on lui donne.
//
// Ordre des calques (le ballon passe « dans » le panier) :
//   ciel → textes d'aide → décor → pièges et bonus → arrière du panier → ombre
//   → BALLON → filet et avant du cercle → particules → jauge → interface

import { clamp, lerp } from '../core/math.js';
import { pathState } from '../physics/mover.js';
import { createBallTextures } from './ball-sprite.js';
import { Background } from './background.js';

const C = {
  block: '#251d48',
  blockEdge: '#3a2f66',
  blockTop: '#ffb877',
  wall: '#150f2b',
  wallEdge: '#2e2556',
  floorTop: '#e08a4f',
  floorBody: '#2a2048',
  plank: '#4b3c7c',
  plankTop: '#ffd2a0',
  plankUnder: '#30275a',
  teal: '#3ce0c5',
  tealDark: '#1d8f86',
  tealLight: '#9dfff0',
  spikeLight: '#eef0f7',
  spikeDark: '#9097ad',
  danger: '#ff4d5e',
  saw: '#d3d8e2',
  sawDark: '#8a91a3',
  gold: '#ffd34d',
  rimFront: '#ff5a1f',
  rimBack: '#a8391a',
  board: 'rgba(230,242,255,0.92)',
  boardEdge: '#9fb3d6',
  net: 'rgba(255,255,255,0.9)',
  hint: 'rgba(255,255,255,0.6)',
};

const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

export class Renderer {
  /** @param {HTMLCanvasElement} canvas */
  constructor(canvas, level) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.tex = createBallTextures();
    this.starSprite = makeStarSprite();
    this.background = new Background(level.bounds.maxY);
    this.dpr = 1;
    this.w = 1;
    this.h = 1;
    this.fps = 60;
  }

  resize(cssWidth, cssHeight) {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    this.w = cssWidth;
    this.h = cssHeight;
    this.canvas.width = Math.round(cssWidth * this.dpr);
    this.canvas.height = Math.round(cssHeight * this.dpr);
    const r = Math.hypot(cssWidth, cssHeight) / 2;
    this._vignette = this.ctx.createRadialGradient(cssWidth / 2, cssHeight / 2, r * 0.6, cssWidth / 2, cssHeight / 2, r * 1.1);
    this._vignette.addColorStop(0, 'rgba(0,0,0,0)');
    this._vignette.addColorStop(1, 'rgba(5,0,20,0.4)');
  }

  draw(s) {
    const { ctx, dpr } = this;
    const cam = s.camera;
    const L = s.level;
    if (s.frameDt > 0) this.fps = lerp(this.fps, 1 / s.frameDt, 0.05);

    // ── Fond (écran)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.background.draw(ctx, cam, this.w, this.h, s.time);
    this._drawHints(L.hints, cam);

    // ── Monde (y vers le haut)
    const k = cam.scale * dpr;
    ctx.setTransform(k, 0, 0, -k, dpr * (this.w / 2 - cam.x * cam.scale), dpr * (this.h / 2 + cam.y * cam.scale));
    const px = 1 / cam.scale;
    const view = { bottom: cam.bottom - 1, top: cam.top + 1 };
    const visible = (y0, y1) => y1 >= view.bottom && y0 <= view.top;

    for (const solid of L.solids) if (visible(solid.y, solid.y + solid.h)) this._drawSolid(solid, px);
    for (const m of L.movers) this._drawRail(m.x + m.w / 2, m.y + m.h / 2, m.path);
    for (const saw of L.saws) this._drawRail(saw.x, saw.y, saw.path);
    for (const p of L.planks) if (visible(p.y - 0.35, p.y)) this._drawPlank(p);
    for (const m of L.movers) this._drawMover(m, s.renderTime);
    for (const p of L.pads) if (visible(p.y, p.y + 0.5)) this._drawPad(p);
    for (const sp of L.spikes) if (visible(sp.y - sp.h, sp.y + sp.h)) this._drawSpikes(sp);
    for (const c of L.checkpoints) if (visible(c.y, c.y + 1.5)) this._drawCheckpoint(c, s.renderTime);
    for (const st of L.stars) if (!st.collected && visible(st.y - 1, st.y + 1)) this._drawStar(st, s.time);
    this._drawHoopBack(L.hoop);
    for (const saw of L.saws) this._drawSaw(saw, s.renderTime);

    if (s.ballVisible) {
      this._drawShadow(s);
      this._drawBall(s);
    }
    this._drawHoopFront(L.hoop);
    this._drawParticles(s.particles);
    if (s.ballVisible) this._drawGauge(s);
    if (s.debug) this._drawDebugWorld(s, px);

    // ── Interface (écran)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = this._vignette;
    ctx.fillRect(0, 0, this.w, this.h);
    if (s.flash > 0) {
      ctx.fillStyle = `rgba(255,60,80,${0.28 * s.flash})`;
      ctx.fillRect(0, 0, this.w, this.h);
    }
    this._drawTexts(s);
    this._drawTouch(s.touch);
    if (s.debug) this._drawDebugText(s);
  }

  // ─── Décor ──────────────────────────────────────────────────────────────

  _drawHints(hints, cam) {
    const ctx = this.ctx;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = C.hint;
    for (const h of hints) {
      const y = cam.worldToScreenY(h.y);
      if (y < -40 || y > this.h + 40) continue;
      const size = Math.round(cam.scale * 0.4 * (h.size ?? 1));
      ctx.font = `800 ${size}px ${FONT}`;
      ctx.fillText(h.text, cam.worldToScreenX(h.x), y);
    }
  }

  _drawSolid(s, px) {
    const ctx = this.ctx;
    if (s.style === 'floor') {
      ctx.fillStyle = C.floorBody;
      ctx.fillRect(s.x, s.y, s.w, s.h);
      const top = s.y + s.h;
      ctx.fillStyle = C.floorTop;
      ctx.fillRect(s.x, top - 0.28, s.w, 0.28);
      // Ligne peinte du terrain
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.fillRect(s.x, top - 0.36, s.w, 0.05);
      return;
    }
    if (s.style === 'wall') {
      ctx.fillStyle = C.wall;
      ctx.fillRect(s.x, s.y, s.w, s.h);
      ctx.strokeStyle = C.wallEdge;
      ctx.lineWidth = 2 * px;
      ctx.strokeRect(s.x, s.y, s.w, s.h);
      return;
    }
    const g = this.ctx.createLinearGradient(0, s.y + s.h, 0, s.y);
    g.addColorStop(0, '#2d2457');
    g.addColorStop(1, C.block);
    ctx.fillStyle = g;
    ctx.fillRect(s.x, s.y, s.w, s.h);
    ctx.strokeStyle = C.blockEdge;
    ctx.lineWidth = 2 * px;
    ctx.strokeRect(s.x, s.y, s.w, s.h);
    // Dessus praticable souligné : on lit le niveau d'un coup d'œil
    ctx.fillStyle = C.blockTop;
    ctx.fillRect(s.x, s.y + s.h - 0.07, s.w, 0.07);
  }

  _drawPlank(p) {
    const ctx = this.ctx;
    const w = p.x2 - p.x1;
    ctx.fillStyle = C.plankUnder;
    ctx.fillRect(p.x1, p.y - 0.3, w, 0.3);
    ctx.fillStyle = C.plank;
    ctx.fillRect(p.x1, p.y - 0.22, w, 0.22);
    ctx.fillStyle = C.plankTop;
    ctx.fillRect(p.x1, p.y - 0.07, w, 0.07);
    // Rivets : indiquent qu'on peut passer au travers (planche fine)
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    for (let x = p.x1 + 0.35; x < p.x2 - 0.2; x += 0.7) ctx.fillRect(x, p.y - 0.19, 0.06, 0.06);
  }

  _drawRail(x, y, path) {
    const ctx = this.ctx;
    ctx.strokeStyle = 'rgba(255,255,255,0.16)';
    ctx.lineWidth = 0.05;
    ctx.setLineDash([0.16, 0.16]);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + path.dx, y + path.dy);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    for (const [cx, cy] of [[x, y], [x + path.dx, y + path.dy]]) {
      ctx.beginPath();
      ctx.arc(cx, cy, 0.08, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  _drawMover(m, t) {
    const ctx = this.ctx;
    const p = pathState(m.path, t);
    const x = m.x + p.x;
    const y = m.y + p.y;
    const g = ctx.createLinearGradient(0, y + m.h, 0, y);
    g.addColorStop(0, C.teal);
    g.addColorStop(1, C.tealDark);
    ctx.fillStyle = g;
    ctx.fillRect(x, y, m.w, m.h);
    ctx.fillStyle = C.tealLight;
    ctx.fillRect(x, y + m.h - 0.06, m.w, 0.06);
    // Flèches ⟷
    ctx.fillStyle = 'rgba(10,40,40,0.45)';
    const cy = y + m.h * 0.45;
    for (const d of [-1, 1]) {
      const cx = x + m.w / 2 + d * 0.35;
      ctx.beginPath();
      ctx.moveTo(cx + d * 0.14, cy);
      ctx.lineTo(cx, cy + 0.09);
      ctx.lineTo(cx, cy - 0.09);
      ctx.fill();
    }
  }

  _drawPad(p) {
    const ctx = this.ctx;
    const sq = easeOutCubic(p.squash);
    const h = p.h * (1 - 0.55 * sq);
    // Ressort
    ctx.strokeStyle = C.tealDark;
    ctx.lineWidth = 0.05;
    ctx.beginPath();
    const n = 4;
    for (let i = 0; i <= n; i++) {
      const xx = p.x + 0.2 + ((p.w - 0.4) * i) / n;
      ctx.moveTo(xx, p.y);
      ctx.lineTo(xx + 0.1, p.y + h);
    }
    ctx.stroke();
    // Plateau
    const top = p.y + h;
    ctx.fillStyle = C.teal;
    ctx.fillRect(p.x, top - 0.1, p.w, 0.12);
    ctx.fillStyle = C.tealLight;
    ctx.fillRect(p.x, top, p.w, 0.04);
    // Chevrons vers le haut
    ctx.strokeStyle = `rgba(157,255,240,${0.35 + 0.35 * sq})`;
    ctx.lineWidth = 0.06;
    ctx.lineCap = 'round';
    const cx = p.x + p.w / 2;
    for (let i = 0; i < 2; i++) {
      const yy = top + 0.25 + i * 0.22 + sq * 0.2;
      ctx.beginPath();
      ctx.moveTo(cx - 0.18, yy);
      ctx.lineTo(cx, yy + 0.14);
      ctx.lineTo(cx + 0.18, yy);
      ctx.stroke();
    }
  }

  _drawSpikes(s) {
    const ctx = this.ctx;
    const dir = s.dir === 'down' ? -1 : 1;
    const n = Math.max(1, Math.round(s.w / 0.3));
    const tw = s.w / n;
    const g = ctx.createLinearGradient(0, s.y, 0, s.y + dir * s.h);
    g.addColorStop(0, C.spikeDark);
    g.addColorStop(1, C.spikeLight);
    ctx.fillStyle = g;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const x0 = s.x + i * tw;
      ctx.moveTo(x0, s.y);
      ctx.lineTo(x0 + tw / 2, s.y + dir * s.h);
      ctx.lineTo(x0 + tw, s.y);
    }
    ctx.fill();
    ctx.fillStyle = C.danger;
    ctx.fillRect(s.x, dir > 0 ? s.y : s.y - 0.07, s.w, 0.07);
  }

  _drawSaw(saw, t) {
    const ctx = this.ctx;
    const p = pathState(saw.path, t);
    const x = saw.x + p.x;
    const y = saw.y + p.y;
    const r = saw.r;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-t * 9);
    const teeth = 14;
    ctx.fillStyle = C.saw;
    ctx.beginPath();
    for (let i = 0; i < teeth; i++) {
      const a0 = (i / teeth) * Math.PI * 2;
      const a1 = ((i + 0.6) / teeth) * Math.PI * 2;
      ctx.lineTo(Math.cos(a0) * r * 0.8, Math.sin(a0) * r * 0.8);
      ctx.lineTo(Math.cos(a1) * r, Math.sin(a1) * r);
    }
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = C.sawDark;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.58, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = C.danger;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.22, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  _drawCheckpoint(c, time) {
    const ctx = this.ctx;
    const poleH = 1.25;
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(c.x - 0.18, c.y, 0.36, 0.06);
    ctx.fillStyle = c.active ? '#d9fff8' : '#8a85ad';
    ctx.fillRect(c.x - 0.025, c.y, 0.05, poleH);
    const top = c.y + poleH;
    ctx.fillStyle = c.active ? C.teal : '#6c6890';
    ctx.beginPath();
    ctx.moveTo(c.x + 0.025, top);
    if (c.active) {
      const age = Math.min(1, (time - c.activatedAt) * 3);
      const len = 0.62 * (0.4 + 0.6 * age);
      for (let i = 0; i <= 6; i++) {
        const u = i / 6;
        ctx.lineTo(c.x + 0.025 + u * len, top - 0.02 + Math.sin(time * 6 - u * 4) * 0.05 * u);
      }
      ctx.lineTo(c.x + 0.025 + len * 0.8, top - 0.2);
      for (let i = 6; i >= 0; i--) {
        const u = i / 6;
        ctx.lineTo(c.x + 0.025 + u * len, top - 0.4 + Math.sin(time * 6 - u * 4) * 0.05 * u);
      }
    } else {
      ctx.lineTo(c.x + 0.2, top - 0.08);
      ctx.lineTo(c.x + 0.025, top - 0.42);
    }
    ctx.closePath();
    ctx.fill();
  }

  _drawStar(st, time) {
    const ctx = this.ctx;
    const bob = Math.sin(time * 2.6 + st.index * 1.7) * 0.09;
    const size = 0.95;
    ctx.save();
    ctx.translate(st.x, st.y + bob);
    ctx.rotate(Math.sin(time * 1.8 + st.index) * 0.18);
    ctx.scale(1, -1);
    ctx.drawImage(this.starSprite, -size, -size, size * 2, size * 2);
    ctx.restore();
  }

  // ─── Panier ─────────────────────────────────────────────────────────────

  _drawHoopBack(h) {
    const ctx = this.ctx;
    if (h.pole) {
      ctx.fillStyle = '#36425c';
      ctx.fillRect(h.pole.x, h.pole.y, h.pole.w, h.pole.h);
    }
    const b = h.board;
    ctx.fillStyle = C.board;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.strokeStyle = C.boardEdge;
    ctx.lineWidth = 0.03;
    ctx.strokeRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = C.rimFront;
    const faceX = h.facing === -1 ? b.x : b.x + b.w - 0.035;
    ctx.fillRect(faceX, h.rimY, 0.035, 0.55);
    // Fixation
    ctx.strokeStyle = C.rimBack;
    ctx.lineWidth = h.rimRadius * 1.6;
    ctx.beginPath();
    ctx.moveTo(h.backX, h.rimY);
    ctx.lineTo(h.facing === -1 ? b.x : b.x + b.w, h.rimY);
    ctx.stroke();
    // Moitié arrière du cercle (derrière le ballon)
    ctx.lineWidth = h.rimRadius * 2;
    ctx.beginPath();
    ctx.ellipse(h.centerX, h.rimY, (h.rightX - h.leftX) / 2, 0.13, 0, 0, Math.PI);
    ctx.stroke();
  }

  _drawHoopFront(h) {
    const ctx = this.ctx;
    const net = h.net;
    ctx.strokeStyle = C.net;
    ctx.lineWidth = 0.028;
    ctx.lineCap = 'round';
    ctx.beginPath();
    const L = net.drawLinks;
    for (let i = 0; i < L.length; i += 2) {
      ctx.moveTo(net.x[L[i]], net.y[L[i]]);
      ctx.lineTo(net.x[L[i + 1]], net.y[L[i + 1]]);
    }
    ctx.stroke();
    ctx.strokeStyle = C.rimFront;
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
    if (height > 7) return;
    const t = Math.max(0, height) / 7;
    const ctx = this.ctx;
    ctx.fillStyle = `rgba(10,0,30,${0.35 * (1 - t) * ball.scale})`;
    ctx.beginPath();
    ctx.ellipse(ball.x, surface + 0.01, ball.r * (1.05 - 0.45 * t) * ball.scale, ball.r * 0.16 * (1 - 0.5 * t), 0, 0, Math.PI * 2);
    ctx.fill();
  }

  _drawBall(s) {
    const ctx = this.ctx;
    const { ball, visual } = s;
    const r = ball.r * ball.scale;
    if (r <= 0.001) return;
    const m = visual.m;
    ctx.save();
    ctx.translate(ball.x + visual.offsetX * ball.r, ball.y + visual.offsetY * ball.r);
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

  _drawGauge(s) {
    const g = s.gauge;
    if (g.alpha <= 0.01) return;
    const ctx = this.ctx;
    const n = g.segments;
    const pw = 0.3;
    const ph = 0.11;
    const gap = 0.07;
    const total = n * pw + (n - 1) * gap;
    const shake = g.denied > 0 ? Math.sin(s.time * 70) * 0.06 * g.denied : 0;
    const x0 = s.ball.x - total / 2 + shake;
    const y0 = s.ball.y + s.ball.r + 0.34;
    ctx.globalAlpha = g.alpha;
    // Fond
    ctx.fillStyle = 'rgba(15,10,35,0.55)';
    roundRect(ctx, x0 - 0.07, y0 - 0.07, total + 0.14, ph + 0.14, 0.12);
    ctx.fill();
    for (let i = 0; i < n; i++) {
      const x = x0 + i * (pw + gap);
      const fill = clamp(g.value * n - i, 0, 1);
      ctx.fillStyle = g.denied > 0 ? `rgba(255,77,94,${0.35 + 0.5 * g.denied})` : 'rgba(255,255,255,0.16)';
      roundRect(ctx, x, y0, pw, ph, ph / 2);
      ctx.fill();
      if (fill > 0) {
        ctx.fillStyle = fill >= 1 ? '#ffffff' : 'rgba(255,214,168,0.85)';
        roundRect(ctx, x, y0, pw * fill, ph, Math.min(ph / 2, (pw * fill) / 2));
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  // ─── Effets ─────────────────────────────────────────────────────────────

  _drawParticles(particles) {
    const ctx = this.ctx;
    for (const p of particles.items) {
      if (!p.alive) continue;
      const t = p.life / p.maxLife;
      if (p.kind === 2) {
        const k = 1 - t;
        ctx.globalAlpha = t;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 0.08 * t + 0.01;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, p.size * (0.4 + 1.1 * easeOutCubic(k)), p.size * 0.35 * (0.4 + 1.1 * easeOutCubic(k)), 0, 0, Math.PI * 2);
        ctx.stroke();
        continue;
      }
      ctx.globalAlpha = Math.min(1, t * 2);
      ctx.fillStyle = p.color;
      if (p.kind === 0) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (1.6 - t * 0.6), 0, Math.PI * 2);
        ctx.fill();
      } else if (p.kind === 3) {
        const sz = p.size * (0.5 + t);
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillRect(-sz, -sz * 0.18, sz * 2, sz * 0.36);
        ctx.fillRect(-sz * 0.18, -sz, sz * 0.36, sz * 2);
        ctx.restore();
      } else {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.scale(1, Math.cos(p.rot * 1.7));
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
      const size = Math.round(cam.scale * 0.75 * t.size * pop);
      if (size < 2) continue;
      const x = clamp(cam.worldToScreenX(t.x), size * 2.5, this.w - size * 2.5);
      const y = cam.worldToScreenY(t.y);
      ctx.globalAlpha = alpha;
      ctx.font = `900 ${size}px ${FONT}`;
      ctx.lineWidth = Math.max(2, size * 0.16);
      ctx.strokeStyle = 'rgba(15,8,35,0.9)';
      ctx.lineJoin = 'round';
      ctx.strokeText(t.text, x, y);
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, x, y);
    }
    ctx.globalAlpha = 1;
  }

  /** Repère du pouce : où l'on a posé le doigt et dans quel sens on dirige. */
  _drawTouch(t) {
    if (!t || t.alpha <= 0.01) return;
    const ctx = this.ctx;
    ctx.globalAlpha = t.alpha;
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(t.x - t.range, t.y);
    ctx.lineTo(t.x + t.range, t.y);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.beginPath();
    ctx.arc(t.x, t.y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.beginPath();
    ctx.arc(t.x + t.axis * t.range, t.y, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // ─── Débogage ───────────────────────────────────────────────────────────

  _drawDebugWorld(s, px) {
    const ctx = this.ctx;
    ctx.lineWidth = 1.5 * px;
    ctx.lineCap = 'round';
    for (const c of s.level.world.colliders) {
      ctx.strokeStyle = c.oneWay ? 'rgba(255,220,0,0.9)' : 'rgba(0,255,170,0.8)';
      ctx.beginPath();
      if (c.ax === c.bx && c.ay === c.by) ctx.arc(c.ax, c.ay, Math.max(c.r, 2 * px), 0, Math.PI * 2);
      else {
        ctx.moveTo(c.ax, c.ay);
        ctx.lineTo(c.bx, c.by);
      }
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(255,60,90,0.9)';
    for (const sp of s.level.spikes) {
      const y0 = sp.dir === 'down' ? sp.y - sp.h : sp.y;
      ctx.strokeRect(sp.x, y0, sp.w, sp.h);
    }
    for (const saw of s.level.saws) {
      ctx.beginPath();
      ctx.arc(saw.cx, saw.cy, saw.r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(0,255,170,0.9)';
    ctx.beginPath();
    ctx.arc(s.body.x, s.body.y, s.ball.r, 0, Math.PI * 2);
    ctx.stroke();
  }

  _drawDebugText(s) {
    const ctx = this.ctx;
    const b = s.body;
    const lines = [
      `${this.fps.toFixed(0)} fps · dpr ${this.dpr}`,
      `pos ${b.x.toFixed(2)}, ${b.y.toFixed(2)}`,
      `vit ${b.vx.toFixed(2)}, ${b.vy.toFixed(2)}`,
      `sol ${b.grounded ? 'oui' : 'non'} · jauge ${(s.gauge.value * 100).toFixed(0)} %`,
      `axe ${s.touch ? s.touch.axis.toFixed(2) : '0'} · état ${s.state}`,
    ];
    ctx.font = `12px ui-monospace, Menlo, Consolas, monospace`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    const x = 12;
    const y = this.h - lines.length * 16 - 24;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(x - 6, y - 6, 230, lines.length * 16 + 10);
    ctx.fillStyle = '#9dffd9';
    lines.forEach((l, i) => ctx.fillText(l, x, y + i * 16));
  }
}

function makeStarSprite() {
  const size = 128;
  const c = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(size, size) : document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const r = size / 2;
  const glow = g.createRadialGradient(r, r, 0, r, r, r);
  glow.addColorStop(0, 'rgba(255,220,90,0.55)');
  glow.addColorStop(0.45, 'rgba(255,200,70,0.18)');
  glow.addColorStop(1, 'rgba(255,200,70,0)');
  g.fillStyle = glow;
  g.fillRect(0, 0, size, size);
  g.translate(r, r);
  const outer = r * 0.5;
  const inner = outer * 0.47;
  g.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 === 0 ? outer : inner;
    g.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
  }
  g.closePath();
  const fill = g.createLinearGradient(0, -outer, 0, outer);
  fill.addColorStop(0, '#fff3a8');
  fill.addColorStop(1, '#ffb32e');
  g.fillStyle = fill;
  g.fill();
  g.lineWidth = size * 0.03;
  g.strokeStyle = '#c47a12';
  g.lineJoin = 'round';
  g.stroke();
  return c;
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

function easeOutCubic(t) {
  return 1 - Math.pow(1 - clamp(t, 0, 1), 3);
}

function easeOutBack(t) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}
