// Illustration animée d'un monde (cartes de la carte des mondes) : un petit diorama dessiné avec
// le vrai décor du monde (même ciel, mêmes silhouettes, mêmes particules) et ses éléments
// emblématiques, avec le ballon qui rebondit. Aucune image : tout vient du moteur de rendu du jeu.

import { Background } from '../render/background.js';
import { themeOf } from '../render/themes.js';
import { createBallTextures } from '../render/ball-sprite.js';
import { drawSolid, drawCrate, drawLiquid, drawGeyser, drawMushroom, drawVine, drawThemedMover, drawRoller, drawIcicle } from '../render/world-draw.js';
import { Geyser, Vine, Icicle } from '../game/world-elements.js';
import { CONFIG } from '../config.js';

let ballTex = null;

const box = (x0, y0, x1, y1, style) => ({ box: true, x0, y0, x1, y1, style });

/** Scènes : sol, éléments emblématiques et position du ballon, en unités du jeu. */
const SCENES = {
  city: (t) => ({
    solids: [box(-20, -6, 40, 0, 'ground'), box(9.2, 0, 14, 1.6, 'block')],
    props: (r) => {
      drawCrate(r, { x: 5.6, y: 0, w: 1.3, h: 1.3 });
      drawMiniHoop(r.ctx, 8.4, 3.6);
    },
    ball: { x: 2.6 + Math.sin(t * 0.5) * 0.6, base: 0, h: 1.9 },
  }),
  snow: (t) => ({
    solids: [box(-20, -6, 4.2, 0, 'snow'), box(4.2, -6, 9, 0, 'ice'), box(9, -6, 40, 0, 'snow'), box(6, 4.8, 12, 5.6, 'block')],
    props: (r, s) => {
      s.icicle.update(0, { x: 99, y: 99 }, 0);
      drawIcicle(r, s.icicle, t);
    },
    ball: { x: 3 + ((t * 2.2) % 9) - 2, base: 0, h: 1.2 },
  }),
  volcano: (t) => ({
    solids: [box(-20, -6, 4, 0, 'rock'), box(4, -6, 7.4, -1.2, 'rock'), box(7.4, -6, 40, 0, 'rock')],
    props: (r, s) => {
      drawLiquid(r, { kind: 'lava', x: 4, y: -0.4, w: 3.4 }, t, -6);
      drawGeyser(r, s.geyser, t);
    },
    ball: { x: 1.8, base: 0, h: 2.4 },
  }),
  forest: (t) => ({
    solids: [box(-20, -6, 40, 0, 'ground')],
    props: (r, s) => {
      drawMushroom(r, { x: 5.4, y: 0.9, w: 1.7, flex: Math.max(0, Math.sin(t * 1.6)) * 0.4, base: 0 });
      s.vine.update(1 / 60, 30, t);
      drawVine(r, s.vine, null, t);
    },
    ball: { x: 2.2, base: 0, h: 1.6 },
  }),
  space: (t) => ({
    solids: [box(-20, -6, 3.6, 0, 'ground'), box(9.5, -6, 40, 0, 'ground')],
    props: (r, s) => {
      drawThemedMover(r, { style: 'float', x: 4.8, y: 1.6, w: 2.4, h: 0.4, path: { dx: 0, dy: 0.4, period: 3.4, phase: 0 } }, t, s.theme);
      drawRoller(r, { kind: 'asteroid', x: 8.4, y: 3.6, r: 0.55, spin: 0.5, mover: { path: { dx: 0, dy: -0.5, period: 5, phase: 0 } } }, t);
    },
    ball: { x: 1.8, base: 0, h: 3.2, slow: true },
  }),
};

export class WorldArt {
  /** @param {HTMLCanvasElement} canvas @param {string} themeId */
  constructor(canvas, themeId) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.themeId = themeId;
    this.theme = themeOf(themeId);
    this.bg = new Background({ bounds: { minX: -12, maxX: 30 }, theme: themeId }, { particles: 0.55 });
    ballTex ??= createBallTextures();
    this.geyser = new Geyser({ x: 9.2, y: 0, h: 3.6, period: 3.2, on: 1.1 }, CONFIG.geyser);
    this.vine = new Vine({ x: 3.6, y: 6.5, len: 4.2 }, CONFIG.vine);
    this.vine.angle = 0.35;
    this.icicle = new Icicle({ x: 8.6, y: 4.8, len: 1.2 }, 0, CONFIG.icicle);
    this._glows = new Map();
    this.dpr = 1;
    this.w = 1;
    this.h = 1;
  }

  resize(w, h, dpr) {
    this.w = Math.max(1, w);
    this.h = Math.max(1, h);
    this.dpr = dpr;
    this.canvas.width = Math.round(this.w * dpr);
    this.canvas.height = Math.round(this.h * dpr);
  }

  /** Halo lumineux (même usage que dans le jeu). */
  _drawGlow(color, x, y, r, alpha = 1) {
    let g = this._glows.get(color);
    if (!g) {
      g = document.createElement('canvas');
      g.width = g.height = 64;
      const c = g.getContext('2d');
      const grad = c.createRadialGradient(32, 32, 0, 32, 32, 32);
      grad.addColorStop(0, `rgba(${color},0.55)`);
      grad.addColorStop(0.4, `rgba(${color},0.18)`);
      grad.addColorStop(1, `rgba(${color},0)`);
      c.fillStyle = grad;
      c.fillRect(0, 0, 64, 64);
      this._glows.set(color, g);
    }
    this.ctx.globalAlpha = alpha;
    this.ctx.drawImage(g, x - r, y - r, r * 2, r * 2);
    this.ctx.globalAlpha = 1;
  }

  draw(time) {
    const { ctx, dpr, w, h } = this;
    const scale = h / 7.2;
    const cam = { x: 5.6, y: 2.6, scale, halfWidth: w / scale / 2 };
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.bg.draw(ctx, cam, w, h, time);

    const k = scale * dpr;
    ctx.setTransform(k, 0, 0, -k, dpr * (w / 2 - cam.x * scale), dpr * (h / 2 + cam.y * scale));
    const scene = SCENES[this.themeId](time);
    for (const s of scene.solids) drawSolid(this, s, this.theme, time);
    scene.props(this, this);

    // Le ballon qui rebondit
    const b = scene.ball;
    const period = b.slow ? 1.6 : 0.9;
    const u = (time % period) / period;
    const y = b.base + 0.4 + 4 * b.h * u * (1 - u);
    const squash = u < 0.06 || u > 0.94 ? 0.85 : 1;
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(b.x, b.base + 0.02, 0.38 * (1 - (y - 0.4) / (b.h * 3)), 0.07, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.translate(b.x, y - 0.4 * (1 - squash));
    ctx.scale(1 / squash, squash);
    ctx.save();
    ctx.rotate(-time * 2.4);
    ctx.drawImage(ballTex.surface, -0.4, -0.4, 0.8, 0.8);
    ctx.restore();
    ctx.scale(1, -1);
    ctx.drawImage(ballTex.shading, -0.4, -0.4, 0.8, 0.8);
    ctx.restore();

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.bg.drawFront(ctx, cam, w, h, time);
  }
}

function drawMiniHoop(ctx, x, rimY) {
  ctx.fillStyle = '#c9d2e6';
  ctx.fillRect(x + 1.05, 0, 0.12, rimY + 1.2);
  ctx.fillStyle = 'rgba(225,240,255,0.9)';
  ctx.fillRect(x + 0.85, rimY - 0.3, 0.12, 1.9);
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = 0.04;
  ctx.beginPath();
  for (let i = 0; i <= 4; i++) {
    const u = i / 4;
    ctx.moveTo(x - 0.4 + u * 1.2, rimY);
    ctx.lineTo(x - 0.2 + u * 0.8, rimY - 0.8);
  }
  ctx.stroke();
  ctx.strokeStyle = '#ff6a3d';
  ctx.lineWidth = 0.1;
  ctx.beginPath();
  ctx.moveTo(x - 0.45, rimY);
  ctx.lineTo(x + 0.85, rimY);
  ctx.stroke();
}
