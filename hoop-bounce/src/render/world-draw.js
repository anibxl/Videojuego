// Dessin des surfaces selon le monde et des éléments propres aux mondes.
// Repère monde (y vers le haut). Chaque fonction reçoit le Renderer (ctx, halos lumineux).

import { clamp } from '../core/math.js';
import { pathState } from '../physics/mover.js';
import { isCounterClockwise } from '../physics/colliders.js';

const TAU = Math.PI * 2;

export function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.max(0, Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

// Petit bruit déterministe (aucun Math.random dans le rendu : l'image ne « grésille » pas)
const hash = (n) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

// ─── Surfaces ───────────────────────────────────────────────────────────────

const ICE = { top: 'rgba(205,240,255,0.95)', bottom: 'rgba(90,160,215,0.9)', edge: '#ffffff', streak: 'rgba(255,255,255,0.35)' };
const WOOD = { top: '#8a5a33', bottom: '#5a3720', line: 'rgba(40,22,10,0.45)', cap: '#b98552', moss: '#7fcf5f' };

// ─── Matériaux des surfaces, selon le monde ─────────────────────────────────
//
//  Ville  : trottoir et asphalte (sol), béton, briques, métal (blocs), briques (murs)
//  Neige  : neige, glace, bois enneigé (blocs), roche gelée (murs)
//  Volcan : basalte (sol), pierre fissurée (blocs), orgues basaltiques (murs), lave
//  Forêt  : herbe et terre (sol), pierre moussue (blocs, murs), bois
//  Espace : pont métallique (sol), coque (blocs), plateformes lumineuses, cloisons (murs)
//
// Seule l'apparence change : la physique de chaque surface est celle de son rôle (sol, mur, bloc).

const MATERIALS = {
  city: { ground: 'sidewalk', wall: 'brickWall', block: 'concrete', snow: 'snow', ice: 'ice', rock: 'concrete', wood: 'wood' },
  snow: { ground: 'snow', wall: 'iceRock', block: 'snowWood', snow: 'snow', ice: 'ice', rock: 'iceRock', wood: 'snowWood' },
  volcano: { ground: 'basalt', wall: 'basaltColumns', block: 'crackedStone', snow: 'basalt', ice: 'ice', rock: 'basalt', wood: 'wood' },
  forest: { ground: 'grass', wall: 'mossStone', block: 'mossStone', snow: 'grass', ice: 'ice', rock: 'mossStone', wood: 'wood' },
  space: { ground: 'deck', wall: 'bulkhead', block: 'hull', snow: 'deck', ice: 'ice', rock: 'hull', wood: 'hull' },
};
const SKINS = { brick: 'brick', metal: 'metal', concrete: 'concrete', glow: 'glow', stone: 'crackedStone', moss: 'mossStone', wood: 'wood' };

/** Matériau d'un bloc : son rôle (style), éventuellement un habillage (skin), et le monde. */
export function materialOf(themeId, style, skin) {
  if (skin && SKINS[skin]) return SKINS[skin];
  return (MATERIALS[themeId] ?? MATERIALS.city)[style] ?? 'concrete';
}

/** Partie visible d'un bloc (les détails ne sont dessinés qu'à l'écran). */
function visibleRange(r, x0, x1) {
  const v = r.view;
  return v ? [Math.max(x0, v.left), Math.min(x1, v.right)] : [x0, x1];
}

/** Dessine un bloc fixe (rectangle ou polygone) dans le matériau de son monde. */
export function drawSolid(r, s, theme, time) {
  if (!s.box) return drawPolygonSolid(r, s, theme, time);
  const mat = materialOf(r.themeId, s.style, s.skin);
  const x = s.x0;
  const y = s.y0;
  const w = s.x1 - s.x0;
  const h = s.y1 - s.y0;
  const fn = MATERIAL_DRAW[mat] ?? MATERIAL_DRAW.concrete;
  fn(r, x, y, w, h, time);
}

function gradientBox(ctx, x, y, w, h, top, bottom, depth = 4, radius = 0) {
  const t = y + h;
  const g = ctx.createLinearGradient(0, t, 0, Math.max(y, t - depth));
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  ctx.fillStyle = g;
  if (radius) {
    roundRect(ctx, x, y, w, h, radius);
    ctx.fill();
  } else ctx.fillRect(x, y, w, h);
}

function dropShadow(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(3,6,16,0.3)';
  ctx.fillRect(x + 0.1, y - 0.12, w, h);
}

const MATERIAL_DRAW = {
  // ── Ville ──
  sidewalk(r, x, y, w, h) {
    const ctx = r.ctx;
    const top = y + h;
    gradientBox(ctx, x, y, w, h, '#2a2f42', '#0d1020', 3.5);
    // Dalle de trottoir et bordure
    ctx.fillStyle = '#5d6478';
    ctx.fillRect(x, top - 0.42, w, 0.42);
    ctx.fillStyle = '#8a91a6';
    ctx.fillRect(x, top - 0.12, w, 0.12);
    ctx.fillStyle = '#c4cad9';
    ctx.fillRect(x, top - 0.04, w, 0.04);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(x, top - 0.5, w, 0.08);
    const [a, b] = visibleRange(r, x, x + w);
    ctx.fillStyle = 'rgba(20,24,40,0.55)';
    for (let xx = Math.ceil(a / 1.6) * 1.6; xx < b; xx += 1.6) ctx.fillRect(xx, top - 0.42, 0.04, 0.38);
    // Asphalte : marquage et grain discret
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    for (let xx = Math.ceil(a / 3) * 3; xx < b; xx += 3) ctx.fillRect(xx, top - 1.4, 1.4, 0.06);
  },
  concrete(r, x, y, w, h) {
    const ctx = r.ctx;
    const top = y + h;
    dropShadow(ctx, x, y, w, h);
    gradientBox(ctx, x, y, w, h, '#646d85', '#3a4258', Math.min(h, 4), 0.06);
    const [a, b] = visibleRange(r, x, x + w);
    ctx.fillStyle = 'rgba(10,14,30,0.3)';
    for (let yy = top - 1.2, row = 0; yy > y + 0.1; yy -= 1.2, row++) {
      ctx.fillRect(x, yy, w, 0.04);
      for (let xx = x + (row % 2 ? 1 : 2); xx < x + w; xx += 2) if (xx > a - 0.1 && xx < b) ctx.fillRect(xx, yy, 0.04, Math.min(1.2, top - yy));
    }
    ctx.fillStyle = '#a6aec2';
    ctx.fillRect(x, top - 0.1, w, 0.1);
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(x, top - 0.035, w, 0.035);
  },
  brick(r, x, y, w, h) {
    brickWall(r, x, y, w, h, '#8a4234', '#5e2a24', true);
  },
  brickWall(r, x, y, w, h) {
    brickWall(r, x, y, w, h, '#5e2c2a', '#3b1c1e', false);
  },
  metal(r, x, y, w, h) {
    const ctx = r.ctx;
    const top = y + h;
    dropShadow(ctx, x, y, w, h);
    gradientBox(ctx, x, y, w, h, '#5a6a86', '#2b3448', Math.min(h, 3), 0.05);
    const [a, b] = visibleRange(r, x, x + w);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    for (let xx = x + 1.5; xx < x + w; xx += 1.5) if (xx > a && xx < b) ctx.fillRect(xx, y, 0.05, h - 0.2);
    // Rivets
    ctx.fillStyle = 'rgba(200,215,240,0.55)';
    ctx.beginPath();
    for (let xx = Math.max(x + 0.2, Math.ceil(a / 0.6) * 0.6); xx < Math.min(b, x + w - 0.1); xx += 0.6) {
      ctx.moveTo(xx + 0.05, top - 0.35);
      ctx.arc(xx, top - 0.35, 0.05, 0, TAU);
    }
    ctx.fill();
    hazardStripe(ctx, x, top - 0.18, w, 0.18, a, b);
  },
  // ── Neige ──
  snow(r, x, y, w, h, time) {
    const ctx = r.ctx;
    const top = y + h;
    gradientBox(ctx, x, y, w, h, '#e3eefa', '#7f9cc3', 3.5);
    const [a, b] = visibleRange(r, x, x + w);
    ctx.fillStyle = 'rgba(120,150,195,0.25)';
    for (let yy = top - 0.9; yy > y; yy -= 0.9) ctx.fillRect(x, yy, w, 0.05);
    snowCap(ctx, x, top, w, a, b);
    sparkles(ctx, a, b, top - 0.12, time, 2.6);
  },
  ice(r, x, y, w, h, time) {
    drawIceBox(r, x, y, w, h, time);
  },
  snowWood(r, x, y, w, h, time) {
    const ctx = r.ctx;
    const top = y + h;
    dropShadow(ctx, x, y, w, h);
    gradientBox(ctx, x, y, w, h, '#8f6038', '#55351f', Math.min(h, 3));
    const [a, b] = visibleRange(r, x, x + w);
    ctx.fillStyle = 'rgba(35,18,8,0.5)';
    for (let yy = top - 0.45; yy > y; yy -= 0.45) ctx.fillRect(x, yy, w, 0.05);
    ctx.fillStyle = 'rgba(255,220,170,0.12)';
    for (let yy = top - 0.25; yy > y; yy -= 0.45) ctx.fillRect(x, yy, w, 0.04);
    // Clous
    ctx.fillStyle = 'rgba(40,30,25,0.8)';
    for (let yy = top - 0.22; yy > y + 0.1; yy -= 0.45) {
      ctx.fillRect(x + 0.18, yy, 0.06, 0.06);
      ctx.fillRect(x + w - 0.24, yy, 0.06, 0.06);
    }
    // Neige sur le dessus et petites stalactites décoratives
    snowCap(ctx, x, top, w, a, b);
    ctx.fillStyle = 'rgba(220,240,255,0.9)';
    ctx.beginPath();
    for (let xx = Math.max(x + 0.2, Math.ceil(a / 0.55) * 0.55); xx < Math.min(b, x + w - 0.2); xx += 0.55) {
      const len = 0.12 + 0.18 * hash(xx * 3.3);
      ctx.moveTo(xx - 0.05, top - 0.28);
      ctx.lineTo(xx + 0.05, top - 0.28);
      ctx.lineTo(xx, top - 0.28 - len);
    }
    ctx.fill();
    sparkles(ctx, a, b, top - 0.1, time, 3);
  },
  iceRock(r, x, y, w, h, time) {
    const ctx = r.ctx;
    const top = y + h;
    const g = ctx.createLinearGradient(x, 0, x + w, 0);
    g.addColorStop(0, '#6a82a6');
    g.addColorStop(1, '#3d4e6e');
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = 'rgba(220,240,255,0.35)';
    ctx.lineWidth = 0.05;
    ctx.beginPath();
    for (let yy = y + 0.8; yy < top; yy += 1.3 + hash(yy) * 0.8) {
      ctx.moveTo(x, yy);
      ctx.lineTo(x + w * 0.5, yy + 0.25 * (hash(yy + 1) - 0.5));
      ctx.lineTo(x + w, yy + 0.2 * (hash(yy + 2) - 0.5));
    }
    ctx.stroke();
    ctx.fillStyle = 'rgba(235,248,255,0.7)';
    ctx.fillRect(x, y, 0.06, h);
    snowCap(ctx, x, top, w, x, x + w);
    void time;
  },
  // ── Volcan ──
  basalt(r, x, y, w, h, time) {
    const ctx = r.ctx;
    const top = y + h;
    gradientBox(ctx, x, y, w, h, '#33231f', '#120a09', 3.5);
    const [a, b] = visibleRange(r, x, x + w);
    // Roche poreuse
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    for (let xx = Math.ceil(a / 0.7) * 0.7; xx < b; xx += 0.7) {
      const yy = top - 0.4 - hash(xx * 1.7) * 2.4;
      if (yy < y) continue;
      const rr = 0.04 + hash(xx * 2.9) * 0.07;
      ctx.moveTo(xx + rr, yy);
      ctx.arc(xx, yy, rr, 0, TAU);
    }
    ctx.fill();
    // Liseré du dessus éclairé de rouge par la lave
    ctx.fillStyle = '#4a2c25';
    ctx.fillRect(x, top - 0.16, w, 0.16);
    ctx.fillStyle = `rgba(255,110,60,${0.45 + 0.12 * Math.sin(time * 1.4 + x)})`;
    ctx.fillRect(x, top - 0.05, w, 0.05);
    emberCracks(ctx, a, b, top - 0.16, time, 1);
  },
  crackedStone(r, x, y, w, h, time) {
    const ctx = r.ctx;
    const top = y + h;
    dropShadow(ctx, x, y, w, h);
    gradientBox(ctx, x, y, w, h, '#5e4b44', '#2f2421', Math.min(h, 3.5), 0.08);
    const [a, b] = visibleRange(r, x, x + w);
    // Gros blocs de pierre
    ctx.fillStyle = 'rgba(15,8,6,0.45)';
    for (let yy = top - 1.1, row = 0; yy > y + 0.1; yy -= 1.1, row++) {
      ctx.fillRect(x, yy, w, 0.05);
      for (let xx = x + (row % 2 ? 0.9 : 1.8); xx < x + w; xx += 1.8) if (xx > a - 0.1 && xx < b) ctx.fillRect(xx, yy, 0.05, Math.min(1.1, top - yy));
    }
    // Fissures dont certaines rougeoient
    ctx.lineWidth = 0.04;
    ctx.strokeStyle = 'rgba(15,8,6,0.6)';
    ctx.beginPath();
    for (let xx = Math.ceil(a / 1.3) * 1.3 + 0.4; xx < Math.min(b, x + w - 0.2); xx += 1.3) {
      const yy = top - 0.3 - hash(xx) * Math.min(h - 0.4, 1.6);
      ctx.moveTo(xx, yy);
      ctx.lineTo(xx + 0.2, yy - 0.25);
      ctx.lineTo(xx + 0.05, yy - 0.5);
    }
    ctx.stroke();
    emberCracks(ctx, a, b, top - 0.12, time, 0.7);
    ctx.fillStyle = '#7a5f55';
    ctx.fillRect(x, top - 0.1, w, 0.1);
    ctx.fillStyle = `rgba(255,120,60,${0.35 + 0.1 * Math.sin(time * 1.3 + x)})`;
    ctx.fillRect(x, top - 0.04, w, 0.04);
  },
  basaltColumns(r, x, y, w, h, time) {
    const ctx = r.ctx;
    const g = ctx.createLinearGradient(x, 0, x + w, 0);
    g.addColorStop(0, '#3a2724');
    g.addColorStop(1, '#1c1110');
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    for (let xx = x + 0.45; xx < x + w; xx += 0.45) ctx.fillRect(xx, y, 0.05, h);
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    for (let yy = y + 0.9; yy < y + h; yy += 1.7) ctx.fillRect(x, yy, w, 0.04);
    ctx.fillStyle = `rgba(255,110,50,${0.35 + 0.1 * Math.sin(time * 1.2)})`;
    ctx.fillRect(x, y, 0.05, h);
    ctx.fillRect(x + w - 0.05, y, 0.05, h);
  },
  // ── Forêt ──
  grass(r, x, y, w, h, time) {
    const ctx = r.ctx;
    const top = y + h;
    gradientBox(ctx, x, y, w, h, '#5b4029', '#24170e', 3.5);
    const [a, b] = visibleRange(r, x, x + w);
    // Cailloux et racines dans la terre
    ctx.fillStyle = 'rgba(140,125,105,0.45)';
    ctx.beginPath();
    for (let xx = Math.ceil(a / 1.9) * 1.9; xx < b; xx += 1.9) {
      const yy = top - 0.7 - hash(xx * 1.3) * 2.2;
      if (yy < y) continue;
      ctx.moveTo(xx + 0.2, yy);
      ctx.ellipse(xx, yy, 0.14 + hash(xx) * 0.12, 0.09, 0, 0, TAU);
    }
    ctx.fill();
    ctx.strokeStyle = 'rgba(30,18,8,0.55)';
    ctx.lineWidth = 0.05;
    ctx.beginPath();
    for (let xx = Math.ceil(a / 3.1) * 3.1; xx < b; xx += 3.1) {
      ctx.moveTo(xx, top - 0.25);
      ctx.quadraticCurveTo(xx + 0.4, top - 0.7, xx + 0.15, top - 1.2);
    }
    ctx.stroke();
    grassCap(ctx, x, top, w, a, b, time);
  },
  mossStone(r, x, y, w, h, time) {
    const ctx = r.ctx;
    const top = y + h;
    dropShadow(ctx, x, y, w, h);
    gradientBox(ctx, x, y, w, h, '#787c6c', '#454a3f', Math.min(h, 3.5), 0.1);
    const [a, b] = visibleRange(r, x, x + w);
    ctx.fillStyle = 'rgba(20,24,16,0.4)';
    for (let yy = top - 0.65, row = 0; yy > y + 0.1; yy -= 0.65, row++) {
      ctx.fillRect(x, yy, w, 0.045);
      for (let xx = x + (row % 2 ? 0.6 : 1.2); xx < x + w; xx += 1.2) if (xx > a - 0.1 && xx < b) ctx.fillRect(xx, yy, 0.045, Math.min(0.65, top - yy));
    }
    // Mousse sur le dessus, qui coule un peu sur les côtés
    ctx.fillStyle = '#5f9c45';
    ctx.fillRect(x, top - 0.16, w, 0.16);
    ctx.beginPath();
    for (let xx = Math.max(x, Math.ceil(a / 0.5) * 0.5); xx < Math.min(b, x + w); xx += 0.5) {
      const d = 0.1 + 0.25 * hash(xx * 2.1);
      ctx.moveTo(xx + 0.24, top - 0.1);
      ctx.ellipse(xx, top - 0.1 - d * 0.5, 0.24, d * 0.6, 0, 0, TAU);
    }
    ctx.fill();
    ctx.fillStyle = '#86c45d';
    ctx.fillRect(x, top - 0.05, w, 0.05);
    void time;
  },
  wood(r, x, y, w, h, time) {
    const ctx = r.ctx;
    const top = y + h;
    gradientBox(ctx, x, y, w, h, WOOD.top, WOOD.bottom, Math.min(h, 4));
    const [a, b] = visibleRange(r, x, x + w);
    ctx.fillStyle = WOOD.line;
    for (let yy = top - 0.5; yy > y; yy -= 0.5) ctx.fillRect(x, yy, w, 0.04);
    for (let yy = top - 0.5, row = 0; yy > y; yy -= 0.5, row++) {
      for (let xx = x + (row % 2 ? 0.7 : 1.4); xx < x + w; xx += 2.1) if (xx > a && xx < b) ctx.fillRect(xx, yy, 0.04, 0.5);
    }
    // Veines du bois
    ctx.strokeStyle = 'rgba(255,220,170,0.12)';
    ctx.lineWidth = 0.03;
    ctx.beginPath();
    for (let yy = top - 0.25; yy > y; yy -= 0.5) {
      for (let xx = Math.ceil(a / 1.7) * 1.7; xx < b; xx += 1.7) {
        ctx.moveTo(xx, yy);
        ctx.quadraticCurveTo(xx + 0.4, yy + 0.06, xx + 0.8, yy);
      }
    }
    ctx.stroke();
    ctx.fillStyle = WOOD.cap;
    ctx.fillRect(x - 0.08, top - 0.18, w + 0.16, 0.18);
    if (r.themeId === 'forest') {
      ctx.fillStyle = WOOD.moss;
      for (let xx = Math.max(x, Math.ceil(a / 0.9) * 0.9); xx < Math.min(b, x + w); xx += 0.9) {
        ctx.beginPath();
        ctx.ellipse(xx + 0.45 * hash(xx), top, 0.3 + 0.2 * hash(xx + 3), 0.07, 0, 0, TAU);
        ctx.fill();
      }
    }
    void time;
  },
  // ── Espace ──
  deck(r, x, y, w, h, time) {
    const ctx = r.ctx;
    const top = y + h;
    gradientBox(ctx, x, y, w, h, '#2e3352', '#11132a', 3.5);
    const [a, b] = visibleRange(r, x, x + w);
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    for (let xx = Math.ceil(a / 1.6) * 1.6; xx < b; xx += 1.6) ctx.fillRect(xx, top - 2.4, 0.05, 2.3);
    ctx.fillRect(x, top - 0.75, w, 0.05);
    ctx.fillStyle = 'rgba(160,190,255,0.12)';
    ctx.fillRect(x, top - 0.7, w, 0.03);
    // Bande lumineuse et petits voyants aux jointures
    ctx.fillStyle = '#3d4370';
    ctx.fillRect(x, top - 0.14, w, 0.14);
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = 'rgba(110,220,255,0.28)';
    ctx.lineWidth = 0.26;
    ctx.beginPath();
    ctx.moveTo(x, top - 0.04);
    ctx.lineTo(x + w, top - 0.04);
    ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#a8ecff';
    ctx.fillRect(x, top - 0.06, w, 0.05);
    for (let xx = Math.ceil(a / 1.6) * 1.6; xx < b; xx += 1.6) {
      const on = Math.sin(time * 2 + xx * 1.3) > 0.2;
      ctx.fillStyle = on ? 'rgba(120,255,200,0.9)' : 'rgba(60,90,110,0.8)';
      ctx.fillRect(xx - 0.06, top - 0.45, 0.12, 0.08);
    }
  },
  hull(r, x, y, w, h) {
    const ctx = r.ctx;
    const top = y + h;
    dropShadow(ctx, x, y, w, h);
    gradientBox(ctx, x, y, w, h, '#454c7a', '#23284a', Math.min(h, 3), 0.1);
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 0.05;
    ctx.strokeRect(x + 0.15, y + 0.15, w - 0.3, h - 0.3);
    ctx.fillStyle = 'rgba(190,210,255,0.5)';
    for (const [px, py] of [[x + 0.25, top - 0.25], [x + w - 0.25, top - 0.25], [x + 0.25, y + 0.25], [x + w - 0.25, y + 0.25]]) ctx.fillRect(px - 0.04, py - 0.04, 0.08, 0.08);
    ctx.fillStyle = '#9fe7ff';
    ctx.fillRect(x, top - 0.06, w, 0.06);
  },
  glow(r, x, y, w, h, time) {
    const ctx = r.ctx;
    const top = y + h;
    const pulse = 0.75 + 0.25 * Math.sin(time * 2 + x);
    r._drawGlow('140,110,255', x + w / 2, top - h / 2, Math.max(w, 1.5) * 0.8, 0.35 * pulse);
    ctx.fillStyle = 'rgba(70,50,170,0.55)';
    roundRect(ctx, x, y, w, h, 0.1);
    ctx.fill();
    ctx.strokeStyle = `rgba(150,230,255,${0.25 * pulse})`;
    ctx.lineWidth = 0.03;
    ctx.beginPath();
    for (let xx = x + 0.5; xx < x + w; xx += 0.5) {
      ctx.moveTo(xx, y + 0.05);
      ctx.lineTo(xx, top - 0.05);
    }
    for (let yy = y + 0.5; yy < top; yy += 0.5) {
      ctx.moveTo(x + 0.05, yy);
      ctx.lineTo(x + w - 0.05, yy);
    }
    ctx.stroke();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = `rgba(140,240,255,${0.8 * pulse})`;
    ctx.lineWidth = 0.06;
    roundRect(ctx, x, y, w, h, 0.1);
    ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#d8f8ff';
    ctx.fillRect(x + 0.05, top - 0.06, w - 0.1, 0.05);
  },
  bulkhead(r, x, y, w, h, time) {
    const ctx = r.ctx;
    const g = ctx.createLinearGradient(x, 0, x + w, 0);
    g.addColorStop(0, '#383e66');
    g.addColorStop(1, '#1d2142');
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    for (let yy = y + 1.2; yy < y + h; yy += 1.2) ctx.fillRect(x, yy, w, 0.05);
    const k = 0.6 + 0.4 * Math.sin(time * 1.5 + x);
    ctx.fillStyle = `rgba(110,220,255,${0.75 * k})`;
    ctx.fillRect(x + w * 0.5 - 0.04, y, 0.08, h);
    ctx.fillStyle = 'rgba(170,230,255,0.5)';
    ctx.fillRect(x, y, 0.05, h);
    ctx.fillRect(x + w - 0.05, y, 0.05, h);
  },
};

function brickWall(r, x, y, w, h, light, dark, coping) {
  const ctx = r.ctx;
  const top = y + h;
  if (coping) dropShadow(ctx, x, y, w, h);
  const g = ctx.createLinearGradient(0, top, 0, Math.max(y, top - 4));
  g.addColorStop(0, light);
  g.addColorStop(1, dark);
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  const [a, b] = visibleRange(r, x, x + w);
  ctx.fillStyle = 'rgba(25,12,12,0.55)';
  const bh = 0.3;
  const bw = 0.62;
  const rows = Math.ceil(h / bh);
  for (let i = 1; i < rows; i++) ctx.fillRect(x, top - i * bh, w, 0.035);
  ctx.beginPath();
  for (let i = 0; i < rows; i++) {
    const yy = top - (i + 1) * bh;
    const off = i % 2 ? bw / 2 : 0;
    for (let xx = x + off + Math.max(0, Math.ceil((a - x - off) / bw)) * bw; xx < Math.min(b, x + w); xx += bw) ctx.rect(xx, Math.max(y, yy), 0.035, Math.min(bh, top - yy));
  }
  ctx.fill();
  // Quelques briques plus claires ou plus sombres
  ctx.fillStyle = 'rgba(255,200,170,0.07)';
  for (let i = 0; i < rows; i += 2) {
    const yy = top - (i + 1) * bh;
    for (let xx = x + Math.ceil((a - x) / (bw * 3)) * bw * 3; xx < Math.min(b, x + w - bw); xx += bw * 3) if (hash(xx + i) < 0.5) ctx.fillRect(xx + 0.04, Math.max(y, yy + 0.04), bw - 0.08, bh - 0.08);
  }
  if (coping) {
    ctx.fillStyle = '#9aa1b5';
    ctx.fillRect(x - 0.05, top - 0.14, w + 0.1, 0.14);
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.fillRect(x - 0.05, top - 0.04, w + 0.1, 0.04);
  } else {
    ctx.fillStyle = 'rgba(255,190,150,0.25)';
    ctx.fillRect(x, y, 0.05, h);
    ctx.fillRect(x + w - 0.05, y, 0.05, h);
  }
}

function hazardStripe(ctx, x, y, w, h, a, b) {
  ctx.fillStyle = '#e8b830';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#1b1d24';
  ctx.beginPath();
  for (let xx = Math.max(x, Math.floor((a - x) / 0.5) * 0.5 + x); xx < Math.min(b, x + w); xx += 0.5) {
    ctx.moveTo(xx, y);
    ctx.lineTo(Math.min(x + w, xx + 0.25), y);
    ctx.lineTo(Math.min(x + w, xx + 0.25 + h), y + h);
    ctx.lineTo(Math.min(x + w, xx + h), y + h);
  }
  ctx.fill();
}

function snowCap(ctx, x, top, w, a, b) {
  ctx.fillStyle = '#c9d9ee';
  roundRect(ctx, x - 0.05, top - 0.32, w + 0.1, 0.32, 0.12);
  ctx.fill();
  ctx.beginPath();
  for (let xx = Math.max(x + 0.15, Math.ceil(a / 0.42) * 0.42); xx < Math.min(b, x + w); xx += 0.42) {
    const rr = 0.09 + 0.07 * hash(xx);
    ctx.moveTo(xx + rr, top - 0.32);
    ctx.arc(xx, top - 0.32, rr, 0, TAU);
  }
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  roundRect(ctx, x - 0.05, top - 0.22, w + 0.1, 0.27, 0.13);
  ctx.fill();
}

/** Scintillements de la neige et de la glace (petites étoiles qui apparaissent puis s'éteignent). */
function sparkles(ctx, a, b, y, time, spacing) {
  ctx.fillStyle = '#ffffff';
  for (let xx = Math.ceil(a / spacing) * spacing; xx < b; xx += spacing) {
    const k = Math.sin(time * 1.7 + xx * 3.1);
    if (k < 0.75) continue;
    const s = (k - 0.75) * 4 * 0.18;
    const px = xx + hash(xx) * spacing * 0.8;
    ctx.globalAlpha = (k - 0.75) * 4;
    ctx.fillRect(px - s, y - 0.02, s * 2, 0.04);
    ctx.fillRect(px - 0.02, y - s, 0.04, s * 2);
  }
  ctx.globalAlpha = 1;
}

function emberCracks(ctx, a, b, y, time, density) {
  const k = 0.45 + 0.25 * Math.sin(time * 1.7);
  ctx.strokeStyle = `rgba(255,120,40,${k})`;
  ctx.lineWidth = 0.035;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  const step = 2.2 / density;
  for (let xx = Math.ceil(a / step) * step + 0.5; xx < b - 0.3; xx += step) {
    let px = xx;
    let py = y;
    ctx.moveTo(px, py);
    for (let i = 0; i < 3; i++) {
      px += (hash(xx * 1.7 + i) - 0.5) * 0.5;
      py -= 0.15 + hash(xx + i * 2.3) * 0.3;
      ctx.lineTo(px, py);
    }
  }
  ctx.stroke();
}

function grassCap(ctx, x, top, w, a, b, time) {
  ctx.fillStyle = '#3f7a33';
  ctx.fillRect(x, top - 0.24, w, 0.24);
  ctx.fillStyle = '#6dbb4c';
  ctx.fillRect(x, top - 0.12, w, 0.12);
  // Brins d'herbe qui ondulent (deux tons)
  ctx.fillStyle = '#4f9a3b';
  ctx.beginPath();
  for (let xx = Math.max(x + 0.05, Math.ceil(a / 0.13) * 0.13); xx < Math.min(b, x + w - 0.05); xx += 0.13) {
    const hh = 0.12 + 0.16 * hash(xx * 3.1);
    const sway = Math.sin(time * 1.8 + xx * 0.9) * 0.05;
    ctx.moveTo(xx - 0.05, top - 0.02);
    ctx.lineTo(xx + sway, top + hh);
    ctx.lineTo(xx + 0.05, top - 0.02);
  }
  ctx.fill();
  ctx.fillStyle = '#8fdc5f';
  ctx.beginPath();
  for (let xx = Math.max(x + 0.1, Math.ceil(a / 0.29) * 0.29 + 0.06); xx < Math.min(b, x + w - 0.05); xx += 0.29) {
    const hh = 0.08 + 0.12 * hash(xx * 1.9);
    const sway = Math.sin(time * 2.1 + xx * 1.3) * 0.04;
    ctx.moveTo(xx - 0.04, top - 0.02);
    ctx.lineTo(xx + sway, top + hh);
    ctx.lineTo(xx + 0.04, top - 0.02);
  }
  ctx.fill();
  // Petites fleurs
  for (let xx = Math.ceil(a / 2.3) * 2.3 + 0.7; xx < Math.min(b, x + w - 0.1); xx += 2.3) {
    ctx.fillStyle = ['#ffe36e', '#ff9ac0', '#ffffff'][(hash(xx) * 3) | 0];
    ctx.beginPath();
    ctx.arc(xx, top + 0.1, 0.05, 0, TAU);
    ctx.fill();
  }
}

/** Liseré du dessus d'une surface (utilisé par les plateformes et les éléments). */
export function drawCap(r, S, x, top, w) {
  const ctx = r.ctx;
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.fillRect(x, top - 0.06, w, 0.06);
  void S;
}

function drawIceBox(r, x, y, w, h, time) {
  const ctx = r.ctx;
  const top = y + h;
  const g = ctx.createLinearGradient(0, top, 0, Math.max(y, top - 3));
  g.addColorStop(0, ICE.top);
  g.addColorStop(1, ICE.bottom);
  ctx.fillStyle = g;
  roundRect(ctx, x, y, w, h, Math.min(0.1, h / 2));
  ctx.fill();
  // Reflets obliques
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, Math.max(y, top - 3), w, Math.min(h, 3));
  ctx.clip();
  ctx.strokeStyle = ICE.streak;
  ctx.lineWidth = 0.08;
  ctx.beginPath();
  for (let xx = x + 0.4; xx < x + w + 2; xx += 1.7 + hash(xx) * 1.4) {
    ctx.moveTo(xx, top - 0.15);
    ctx.lineTo(xx - 0.9, top - 1.4);
  }
  ctx.stroke();
  // Reflet brillant qui glisse lentement sur la glace
  const sweep = x + ((time * 1.6) % (w + 4)) - 2;
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.beginPath();
  ctx.moveTo(sweep, top);
  ctx.lineTo(sweep + 0.5, top);
  ctx.lineTo(sweep - 0.5, top - 2);
  ctx.lineTo(sweep - 1, top - 2);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = ICE.edge;
  ctx.fillRect(x, top - 0.07, w, 0.07);
  sparkles(ctx, x, x + w, top - 0.1, time, 1.2);
}

function drawPolygonSolid(r, s, theme, time) {
  const ctx = r.ctx;
  const pts = isCounterClockwise(s.points) ? s.points : [...s.points].reverse();
  const ice = s.style === 'ice';
  const mat = materialOf(r.themeId, s.style, s.skin);
  const cols = ice ? [ICE.top, ICE.bottom] : mat === 'wood' || mat === 'snowWood' ? [WOOD.top, WOOD.bottom] : ['#6a7088', '#3b4158'];
  const g = ctx.createLinearGradient(0, s.y1, 0, s.y0);
  g.addColorStop(0, cols[0]);
  g.addColorStop(1, cols[1]);
  ctx.fillStyle = g;
  ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
  ctx.fill();
  // Liseré sur les côtés tournés vers le haut
  ctx.strokeStyle = ice ? ICE.edge : 'rgba(255,255,255,0.7)';
  ctx.lineWidth = ice ? 0.09 : 0.12;
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const ny = -(b.x - a.x) / len;
    if (ny > 0.3) {
      ctx.moveTo(a.x, a.y - 0.04);
      ctx.lineTo(b.x, b.y - 0.04);
    }
  }
  ctx.stroke();
  if (ice) {
    ctx.strokeStyle = ICE.streak;
    ctx.lineWidth = 0.06;
    ctx.beginPath();
    const cx = (s.x0 + s.x1) / 2;
    ctx.moveTo(cx - 0.6, s.y0 + 0.4);
    ctx.lineTo(cx + 0.2, s.y0 + (s.y1 - s.y0) * 0.45);
    ctx.stroke();
    sparkles(ctx, s.x0, s.x1, s.y0 + 0.3, time, 1.4);
  }
  void theme;
}

// ─── Pièges : pics à l'image du monde (toujours une pointe rouge ou brûlante : danger lisible) ──

const SPIKE_LOOK = {
  city: { base: '#2b3040', light: '#c6cede', dark: '#6f7890', tip: '#ff4d5e' },
  snow: { base: '#5a7aa6', light: '#e8f6ff', dark: '#8fc0e8', tip: '#ff5a6e' },
  volcano: { base: '#1a0e10', light: '#3b2a34', dark: '#120a0e', tip: '#ff8a2a' },
  forest: { base: '#2a3a1c', light: '#5c7a32', dark: '#2f4a1f', tip: '#ff5a5a' },
  space: { base: '#2a1d55', light: '#ff7ad8', dark: '#9b3dff', tip: '#ffffff' },
};

export function drawSpikes(r, s, time) {
  const ctx = r.ctx;
  const L = SPIKE_LOOK[r.themeId] ?? SPIKE_LOOK.city;
  const dir = s.dir === 'down' ? -1 : 1;
  const n = Math.max(1, Math.round(s.w / 0.32));
  const tw = s.w / n;
  const tipY = s.y + dir * s.h;
  if (r.themeId === 'space' || r.themeId === 'volcano') r._drawGlow(r.themeId === 'space' ? '255,90,220' : '255,120,40', s.x + s.w / 2, s.y + dir * s.h * 0.5, Math.max(s.w * 0.6, 0.8), 0.35 + 0.15 * Math.sin(time * 3));
  // Moitié éclairée / moitié sombre de chaque pointe
  ctx.fillStyle = L.light;
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const x0 = s.x + i * tw;
    ctx.moveTo(x0 + 0.02, s.y);
    ctx.lineTo(x0 + tw / 2, tipY);
    ctx.lineTo(x0 + tw / 2, s.y);
  }
  ctx.fill();
  ctx.fillStyle = L.dark;
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const x0 = s.x + i * tw;
    ctx.moveTo(x0 + tw / 2, s.y);
    ctx.lineTo(x0 + tw / 2, tipY);
    ctx.lineTo(x0 + tw - 0.02, s.y);
  }
  ctx.fill();
  // Pointes rouges / brûlantes
  ctx.fillStyle = L.tip;
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const cx = s.x + i * tw + tw / 2;
    ctx.moveTo(cx - tw * 0.14, tipY - dir * s.h * 0.3);
    ctx.lineTo(cx, tipY);
    ctx.lineTo(cx + tw * 0.14, tipY - dir * s.h * 0.3);
  }
  ctx.fill();
  ctx.fillStyle = L.base;
  ctx.fillRect(s.x, dir > 0 ? s.y : s.y - 0.07, s.w, 0.07);
}

/** Planche traversable (bois). */
export function drawPlank(r, p) {
  const ctx = r.ctx;
  ctx.fillStyle = 'rgba(3,8,20,0.3)';
  roundRect(ctx, p.x1 + 0.05, p.y - 0.3, p.x2 - p.x1, 0.22, 0.08);
  ctx.fill();
  ctx.fillStyle = WOOD.top;
  roundRect(ctx, p.x1, p.y - 0.24, p.x2 - p.x1, 0.24, 0.08);
  ctx.fill();
  ctx.fillStyle = WOOD.cap;
  ctx.fillRect(p.x1 + 0.06, p.y - 0.07, p.x2 - p.x1 - 0.12, 0.07);
}

// ─── Plateformes mobiles thématiques ────────────────────────────────────────

const DEFAULT_MOVER = { city: 'girder', snow: 'plank', volcano: 'stone', forest: 'plank', space: 'float' };

export function drawThemedMover(r, m, t, theme) {
  const ctx = r.ctx;
  const p = pathState(m.path, t);
  const x = m.x + p.x;
  const y = m.y + p.y;
  const style = m.style ?? DEFAULT_MOVER[r.themeId];
  if (style === 'girder') {
    // Nacelle de chantier : poutre d'acier, bandes jaunes et noires, câbles
    ctx.strokeStyle = 'rgba(160,170,190,0.5)';
    ctx.lineWidth = 0.04;
    ctx.beginPath();
    ctx.moveTo(x + 0.3, y + m.h);
    ctx.lineTo(x + m.w / 2, y + m.h + 2.2);
    ctx.lineTo(x + m.w - 0.3, y + m.h);
    ctx.stroke();
    ctx.fillStyle = 'rgba(3,6,16,0.3)';
    ctx.fillRect(x + 0.06, y - 0.1, m.w, m.h);
    const g = ctx.createLinearGradient(0, y + m.h, 0, y);
    g.addColorStop(0, '#6d7a94');
    g.addColorStop(1, '#3a4459');
    ctx.fillStyle = g;
    ctx.fillRect(x, y, m.w, m.h);
    hazardStripe(ctx, x, y + m.h - 0.14, m.w, 0.14, x, x + m.w);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    for (let xx = x + 0.4; xx < x + m.w - 0.2; xx += 0.4) ctx.fillRect(xx, y + 0.05, 0.04, m.h - 0.22);
    return true;
  }
  if (style === 'plank') {
    // Planche de bois (enneigée dans la Neige, moussue dans la Forêt)
    ctx.fillStyle = 'rgba(3,6,16,0.3)';
    roundRect(ctx, x + 0.06, y - 0.1, m.w, m.h, 0.1);
    ctx.fill();
    const g = ctx.createLinearGradient(0, y + m.h, 0, y);
    g.addColorStop(0, WOOD.top);
    g.addColorStop(1, WOOD.bottom);
    ctx.fillStyle = g;
    roundRect(ctx, x, y, m.w, m.h, 0.1);
    ctx.fill();
    ctx.fillStyle = WOOD.line;
    for (let xx = x + 0.8; xx < x + m.w - 0.2; xx += 0.8) ctx.fillRect(xx, y, 0.04, m.h);
    if (r.themeId === 'snow') snowCap(ctx, x, y + m.h + 0.08, m.w, x, x + m.w);
    else {
      ctx.fillStyle = r.themeId === 'forest' ? '#6dbb4c' : WOOD.cap;
      ctx.fillRect(x, y + m.h - 0.08, m.w, 0.08);
    }
    return true;
  }
  if (style === 'stone') {
    // Ascenseur de pierre : dalle massive, runes incandescentes, chaînes
    ctx.strokeStyle = 'rgba(40,25,20,0.8)';
    ctx.lineWidth = 0.06;
    ctx.beginPath();
    ctx.moveTo(x + 0.25, y + m.h);
    ctx.lineTo(x + 0.25, y + m.h + 14);
    ctx.moveTo(x + m.w - 0.25, y + m.h);
    ctx.lineTo(x + m.w - 0.25, y + m.h + 14);
    ctx.stroke();
    const g = ctx.createLinearGradient(0, y + m.h, 0, y - 0.3);
    g.addColorStop(0, '#6d5a52');
    g.addColorStop(1, '#3a2c27');
    ctx.fillStyle = g;
    roundRect(ctx, x, y - 0.3, m.w, m.h + 0.3, 0.08);
    ctx.fill();
    ctx.fillStyle = '#8a7468';
    ctx.fillRect(x, y + m.h - 0.08, m.w, 0.08);
    const a = 0.6 + 0.4 * Math.sin(t * 3);
    ctx.fillStyle = `rgba(255,130,50,${a})`;
    for (let i = 0; i < 3; i++) ctx.fillRect(x + m.w * (0.25 + i * 0.25) - 0.06, y - 0.15, 0.12, 0.22);
    r._drawGlow('255,120,40', x + m.w / 2, y, m.w * 0.7, 0.3 * a);
    return true;
  }
  if (style === 'float') {
    // Plateforme flottante : coque métallique, réacteurs bleus en dessous
    r._drawGlow('120,190,255', x + m.w / 2, y - 0.2, m.w * 0.8, 0.45 + 0.15 * Math.sin(t * 5));
    const g = ctx.createLinearGradient(0, y + m.h, 0, y);
    g.addColorStop(0, '#6a62a8');
    g.addColorStop(1, '#2d2760');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x, y + m.h);
    ctx.lineTo(x + m.w, y + m.h);
    ctx.lineTo(x + m.w - 0.3, y - 0.05);
    ctx.lineTo(x + 0.3, y - 0.05);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = theme.surface.cap;
    ctx.fillRect(x, y + m.h - 0.06, m.w, 0.06);
    ctx.fillStyle = 'rgba(160,220,255,0.9)';
    for (const u of [0.3, 0.7]) {
      const flame = 0.18 + 0.08 * Math.sin(t * 22 + u * 9);
      ctx.beginPath();
      ctx.moveTo(x + m.w * u - 0.08, y - 0.05);
      ctx.lineTo(x + m.w * u + 0.08, y - 0.05);
      ctx.lineTo(x + m.w * u, y - 0.05 - flame);
      ctx.closePath();
      ctx.fill();
    }
    return true;
  }
  return false;
}

// ─── VILLE : caisse ─────────────────────────────────────────────────────────

export function drawCrate(r, c) {
  const ctx = r.ctx;
  const { x, y, w, h } = c;
  ctx.fillStyle = 'rgba(3,8,20,0.32)';
  ctx.fillRect(x + 0.08, y - 0.06, w, h * 0.3);
  const g = ctx.createLinearGradient(0, y + h, 0, y);
  g.addColorStop(0, '#c98a4a');
  g.addColorStop(1, '#8a5528');
  ctx.fillStyle = g;
  roundRect(ctx, x, y, w, h, 0.06);
  ctx.fill();
  const b = 0.16;
  ctx.fillStyle = '#6e3f1c';
  ctx.fillRect(x, y, w, b);
  ctx.fillRect(x, y + h - b, w, b);
  ctx.fillRect(x, y, b, h);
  ctx.fillRect(x + w - b, y, b, h);
  ctx.strokeStyle = '#6e3f1c';
  ctx.lineWidth = 0.14;
  ctx.beginPath();
  ctx.moveTo(x + b, y + b);
  ctx.lineTo(x + w - b, y + h - b);
  ctx.moveTo(x + w - b, y + b);
  ctx.lineTo(x + b, y + h - b);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,230,190,0.35)';
  ctx.fillRect(x, y + h - 0.05, w, 0.05);
  // Pochoir
  ctx.fillStyle = 'rgba(255,138,76,0.85)';
  ctx.beginPath();
  ctx.arc(x + w / 2, y + h / 2, Math.min(w, h) * 0.13, 0, TAU);
  ctx.fill();
}

// ─── NEIGE ──────────────────────────────────────────────────────────────────

export function drawWindZone(r, wz, time) {
  const ctx = r.ctx;
  const dir = Math.sign(wz.force);
  const k = wz.strength(time);
  ctx.save();
  ctx.beginPath();
  ctx.rect(wz.x, wz.y, wz.w, wz.h);
  ctx.clip();
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(235,245,255,0.6)';
  ctx.lineWidth = 0.045;
  for (let i = 0; i < 16; i++) {
    const yy = wz.y + ((i * 0.618) % 1) * wz.h;
    const speed = 7 + (i % 4) * 2;
    const len = 0.6 + (i % 3) * 0.35;
    const u = (((time * speed * 0.1 + i * 0.37) % 1) + 1) % 1;
    const xx = dir > 0 ? wz.x + u * (wz.w + 2) - 1 : wz.x + wz.w - u * (wz.w + 2) + 1;
    ctx.globalAlpha = k * 0.75 * Math.sin(u * Math.PI);
    ctx.beginPath();
    ctx.moveTo(xx, yy);
    ctx.quadraticCurveTo(xx - dir * len * 0.5, yy + 0.08, xx - dir * len, yy);
    ctx.stroke();
  }
  // Flocons emportés
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 22; i++) {
    const yy = wz.y + ((i * 0.381 + 0.1) % 1) * wz.h + Math.sin(time * 2 + i) * 0.2;
    const u = (((time * (0.5 + (i % 3) * 0.15) + i * 0.29) % 1) + 1) % 1;
    const xx = dir > 0 ? wz.x + u * wz.w : wz.x + wz.w - u * wz.w;
    ctx.globalAlpha = 0.85 * Math.sin(u * Math.PI);
    ctx.fillRect(xx, yy, 0.07, 0.07);
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

export function drawIcicle(r, ic, time) {
  const ctx = r.ctx;
  let x = ic.x;
  if (ic.state === 'shake') x += Math.sin(time * 70) * 0.05;
  if (ic.state === 'broken') {
    // Éclats au sol qui s'effacent
    const k = clamp(ic.timer / ic.cfg.regrowDelay, 0, 1);
    ctx.globalAlpha = Math.min(1, k * 2.5);
    ctx.fillStyle = ICE.top;
    for (let i = 0; i < 5; i++) {
      const dx = (i - 2) * 0.22 * (1.6 - k);
      ctx.beginPath();
      ctx.moveTo(ic.x + dx - 0.07, ic.floorY);
      ctx.lineTo(ic.x + dx + 0.07, ic.floorY);
      ctx.lineTo(ic.x + dx, ic.floorY + 0.14 + 0.05 * (i % 2));
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    return;
  }
  const len = ic.len * (ic.state === 'grow' ? ic.grow : 1);
  const top = ic.topY - ic.offset;
  const w = 0.22;
  const g = ctx.createLinearGradient(0, top, 0, top - len);
  g.addColorStop(0, 'rgba(230,248,255,0.95)');
  g.addColorStop(1, 'rgba(140,200,240,0.85)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x - w, top);
  ctx.lineTo(x + w, top);
  ctx.lineTo(x + 0.04, top - len);
  ctx.closePath();
  ctx.fill();
  // Petites stalactites voisines (décor)
  ctx.beginPath();
  ctx.moveTo(x - w - 0.2, top);
  ctx.lineTo(x - w + 0.02, top);
  ctx.lineTo(x - w - 0.1, top - len * 0.4);
  ctx.moveTo(x + w - 0.02, top);
  ctx.lineTo(x + w + 0.16, top);
  ctx.lineTo(x + w + 0.06, top - len * 0.3);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.fillRect(x - w * 0.45, top - len * 0.55, 0.04, len * 0.5);
  if (ic.state === 'shake') r._drawGlow('200,235,255', x, top - len * 0.5, 0.8, 0.5);
}

// ─── VOLCAN ─────────────────────────────────────────────────────────────────

export function drawLiquid(r, l, time, minY) {
  const ctx = r.ctx;
  const water = l.kind === 'water';
  const x0 = l.x;
  const x1 = l.x + l.w;
  const surf = (x) => l.y + Math.sin(x * 2.2 + time * (water ? 1.6 : 2.4)) * 0.05 + Math.sin(x * 5.1 - time * 1.3) * 0.025;
  if (!water) {
    // Lueur au-dessus de la lave
    ctx.globalCompositeOperation = 'lighter';
    const glow = ctx.createLinearGradient(0, l.y + 1.6, 0, l.y);
    glow.addColorStop(0, 'rgba(255,90,20,0)');
    glow.addColorStop(1, `rgba(255,110,30,${0.22 + 0.06 * Math.sin(time * 2)})`);
    ctx.fillStyle = glow;
    ctx.fillRect(x0, l.y, l.w, 1.6);
    ctx.globalCompositeOperation = 'source-over';
  }
  const g = ctx.createLinearGradient(0, l.y, 0, l.y - 1.6);
  if (water) {
    g.addColorStop(0, 'rgba(110,200,210,0.92)');
    g.addColorStop(1, 'rgba(25,80,100,0.96)');
  } else {
    g.addColorStop(0, '#ffcf5a');
    g.addColorStop(0.25, '#ff7a1f');
    g.addColorStop(1, '#8a1a0c');
  }
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x0, minY);
  for (let x = x0; x <= x1 + 0.001; x += 0.25) ctx.lineTo(Math.min(x, x1), surf(Math.min(x, x1)));
  ctx.lineTo(x1, minY);
  ctx.closePath();
  ctx.fill();
  if (water) {
    ctx.strokeStyle = 'rgba(230,255,250,0.55)';
    ctx.lineWidth = 0.04;
    for (let i = 0; i < Math.ceil(l.w / 1.6); i++) {
      const u = (((time * 0.25 + i * 0.37) % 1) + 1) % 1;
      const x = x0 + ((i * 1.6 + time * 0.8) % l.w);
      ctx.globalAlpha = Math.sin(u * Math.PI);
      ctx.beginPath();
      ctx.moveTo(x, surf(x) - 0.12);
      ctx.lineTo(Math.min(x1, x + 0.6), surf(x) - 0.12);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  } else {
    // Bulles qui éclatent
    for (let i = 0; i < Math.ceil(l.w / 1.2); i++) {
      const period = 1.6 + hash(i + l.x) * 1.4;
      const u = ((time + hash(i * 3 + l.x) * period) % period) / period;
      const bx = x0 + 0.3 + hash(i * 7 + l.x) * (l.w - 0.6);
      const by = surf(bx) - 0.05;
      const br = 0.06 + u * 0.14;
      ctx.globalAlpha = u < 0.85 ? 0.9 : (1 - u) / 0.15;
      ctx.fillStyle = '#ffe08a';
      ctx.beginPath();
      ctx.arc(bx, by, br, 0, Math.PI);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.strokeStyle = 'rgba(255,240,180,0.85)';
    ctx.lineWidth = 0.05;
    ctx.beginPath();
    for (let x = x0; x <= x1 + 0.001; x += 0.25) {
      const xx = Math.min(x, x1);
      if (x === x0) ctx.moveTo(xx, surf(xx));
      else ctx.lineTo(xx, surf(xx));
    }
    ctx.stroke();
  }
}

export function drawCrumble(r, cr, time) {
  const ctx = r.ctx;
  if (cr.state === 'gone') {
    // Contour fantôme : la plateforme reviendra ici
    ctx.strokeStyle = 'rgba(255,170,110,0.25)';
    ctx.lineWidth = 0.04;
    ctx.setLineDash([0.12, 0.12]);
    ctx.strokeRect(cr.x, cr.y, cr.w, cr.h);
    ctx.setLineDash([]);
    return;
  }
  const shake = cr.state === 'shake' ? Math.sin(time * 60) * 0.04 : 0;
  const x = cr.x + shake;
  const a = cr.appear;
  ctx.globalAlpha = a;
  const g = ctx.createLinearGradient(0, cr.y + cr.h, 0, cr.y);
  g.addColorStop(0, '#6b4a3f');
  g.addColorStop(1, '#3a2520');
  ctx.fillStyle = g;
  roundRect(ctx, x, cr.y, cr.w, cr.h, 0.08);
  ctx.fill();
  ctx.fillStyle = '#8a6455';
  ctx.fillRect(x, cr.y + cr.h - 0.08, cr.w, 0.08);
  // Fissures, plus marquées quand elle va céder
  const k = cr.state === 'shake' ? 1 - clamp(cr.timer / (cr.def.delay ?? cr.cfg.delay), 0, 1) : 0;
  ctx.strokeStyle = `rgba(255,140,60,${0.35 + 0.6 * k})`;
  ctx.lineWidth = 0.04 + 0.03 * k;
  ctx.beginPath();
  for (let i = 1; i < 4; i++) {
    const cx = x + (cr.w * i) / 4 + (hash(i + cr.x) - 0.5) * 0.2;
    ctx.moveTo(cx, cr.y + cr.h);
    ctx.lineTo(cx + 0.08, cr.y + cr.h * 0.5);
    ctx.lineTo(cx - 0.05, cr.y);
  }
  ctx.stroke();
  ctx.globalAlpha = 1;
}

export function drawGeyser(r, gy, time) {
  const ctx = r.ctx;
  const s = gy.state(time);
  // Bouche du geyser
  ctx.fillStyle = '#2a1a16';
  ctx.beginPath();
  ctx.ellipse(gy.x, gy.y, gy.w * 0.75, 0.22, 0, 0, Math.PI);
  ctx.fill();
  ctx.fillStyle = `rgba(255,120,40,${0.5 + 0.5 * Math.max(s.warn, s.erupting ? 1 : 0)})`;
  ctx.beginPath();
  ctx.ellipse(gy.x, gy.y + 0.02, gy.w * 0.35, 0.07, 0, 0, TAU);
  ctx.fill();
  r._drawGlow('255,110,40', gy.x, gy.y, 0.8 + s.warn, 0.35 + s.warn * 0.5);
  // Avertissement : fumée qui monte
  if (s.warn > 0) {
    for (let i = 0; i < 5; i++) {
      const u = ((time * 1.2 + i / 5) % 1);
      ctx.globalAlpha = s.warn * 0.5 * Math.sin(u * Math.PI);
      ctx.fillStyle = '#6b5a55';
      ctx.beginPath();
      ctx.arc(gy.x + Math.sin(i * 2 + time * 2) * 0.15, gy.y + u * 1.6, 0.12 + u * 0.18, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  if (s.height > 0.05) {
    const h = s.height;
    ctx.globalCompositeOperation = 'lighter';
    r._drawGlow('255,120,40', gy.x, gy.y + h * 0.5, h * 0.7, 0.55);
    for (const [wf, col] of [[1, 'rgba(255,70,20,0.75)'], [0.62, 'rgba(255,160,40,0.85)'], [0.3, 'rgba(255,240,170,0.95)']]) {
      const w = gy.w * 0.5 * wf;
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(gy.x - w, gy.y);
      for (let k = 0; k <= 6; k++) {
        const yy = gy.y + (h * k) / 6;
        const ww = w * (1 - k / 7) * (1 + 0.15 * Math.sin(time * 30 + k * 2));
        ctx.lineTo(gy.x - ww, yy);
      }
      ctx.lineTo(gy.x, gy.y + h + 0.3 * wf);
      for (let k = 6; k >= 0; k--) {
        const yy = gy.y + (h * k) / 6;
        const ww = w * (1 - k / 7) * (1 + 0.15 * Math.sin(time * 27 + k * 3));
        ctx.lineTo(gy.x + ww, yy);
      }
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
  }
}

export function drawRockfall(r, rf, time) {
  const ctx = r.ctx;
  const s = rf.state(time);
  if (s.phase === 'warn' || s.phase === 'fall') {
    // Ombre au sol qui grandit
    const k = s.phase === 'warn' ? s.k * 0.5 : 0.5 + s.k * 0.5;
    ctx.fillStyle = `rgba(0,0,0,${0.15 + 0.3 * k})`;
    ctx.beginPath();
    ctx.ellipse(rf.x, rf.floorY + 0.02, rf.size * (0.6 + k * 0.6), 0.08, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = `rgba(255,120,50,${0.25 + 0.35 * k * (0.5 + 0.5 * Math.sin(time * 20))})`;
    ctx.beginPath();
    ctx.ellipse(rf.x, rf.floorY + 0.03, rf.size * 0.25, 0.04, 0, 0, TAU);
    ctx.fill();
  }
  if (s.phase === 'warn') {
    // Graviers qui tombent du haut
    ctx.fillStyle = 'rgba(150,120,110,0.8)';
    for (let i = 0; i < 4; i++) {
      const u = (s.k * 2 + i * 0.25) % 1;
      ctx.fillRect(rf.x + (i - 1.5) * 0.18, rf.top - u * 3, 0.06, 0.06);
    }
  }
  if (s.phase === 'fall') {
    ctx.fillStyle = 'rgba(255,140,60,0.25)';
    ctx.fillRect(rf.x - rf.size * 0.5, s.y + rf.size * 0.6, rf.size, 1.2);
    drawRock(ctx, rf.x, s.y, rf.size, time * 6, '#5a4038', '#2e1f1a');
    ctx.fillStyle = 'rgba(255,120,40,0.7)';
    ctx.fillRect(rf.x - 0.06, s.y - 0.1, 0.12, 0.04);
  }
  if (s.phase === 'rubble') {
    ctx.globalAlpha = 1 - s.k;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI;
      const d = s.k * 0.9;
      drawRock(ctx, rf.x + Math.cos(a) * d, rf.floorY + 0.12 + Math.sin(a) * d * 0.5, rf.size * 0.25, i, '#5a4038', '#2e1f1a');
    }
    ctx.globalAlpha = 1;
  }
}

function drawRock(ctx, x, y, size, rot, light, dark) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  const g = ctx.createLinearGradient(0, size, 0, -size);
  g.addColorStop(0, light);
  g.addColorStop(1, dark);
  ctx.fillStyle = g;
  ctx.beginPath();
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * TAU;
    const rr = size * (0.8 + 0.25 * hash(i * 3.3));
    if (i) ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    else ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// ─── FORÊT ──────────────────────────────────────────────────────────────────

export function drawVine(r, v, ball, time) {
  const ctx = r.ctx;
  let ex;
  let ey;
  if (v.attached) {
    ex = ball.x;
    ey = ball.y;
  } else {
    const a = v.angle + v.sway;
    ex = v.x + Math.sin(a) * v.len;
    ey = v.y - Math.cos(a) * v.len;
  }
  // Branche d'accroche
  ctx.fillStyle = '#4a321e';
  roundRect(ctx, v.x - 0.9, v.y - 0.12, 1.8, 0.28, 0.12);
  ctx.fill();
  ctx.fillStyle = '#3e7a3c';
  ctx.beginPath();
  ctx.ellipse(v.x - 0.5, v.y + 0.18, 0.5, 0.22, 0.2, 0, TAU);
  ctx.ellipse(v.x + 0.6, v.y + 0.14, 0.45, 0.2, -0.2, 0, TAU);
  ctx.fill();
  // La liane, légèrement courbée
  const mx = (v.x + ex) / 2 + (v.attached ? 0 : Math.sin(time * 1.1 + v.x) * 0.12);
  const my = (v.y + ey) / 2 - 0.1;
  ctx.strokeStyle = '#3b6b2a';
  ctx.lineWidth = 0.1;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(v.x, v.y);
  ctx.quadraticCurveTo(mx, my, ex, ey);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(160,220,110,0.5)';
  ctx.lineWidth = 0.03;
  ctx.stroke();
  // Feuilles le long de la liane
  ctx.fillStyle = '#5fae48';
  for (let i = 1; i < 7; i++) {
    const t = i / 7;
    const px = (1 - t) * (1 - t) * v.x + 2 * (1 - t) * t * mx + t * t * ex;
    const py = (1 - t) * (1 - t) * v.y + 2 * (1 - t) * t * my + t * t * ey;
    const side = i % 2 ? 1 : -1;
    ctx.beginPath();
    ctx.ellipse(px + side * 0.12, py, 0.14, 0.06, side * 0.6, 0, TAU);
    ctx.fill();
  }
  if (!v.attached) {
    // Bout de la liane : petite boucle pour l'attraper
    ctx.strokeStyle = '#3b6b2a';
    ctx.lineWidth = 0.08;
    ctx.beginPath();
    ctx.arc(ex, ey - 0.12, 0.13, 0, TAU);
    ctx.stroke();
    r._drawGlow('200,255,150', ex, ey, 0.5, 0.25 + 0.15 * Math.sin(time * 3));
  }
}

export function drawMushroom(r, m) {
  const ctx = r.ctx;
  const base = m.base ?? 0;
  const cx = m.x + m.w / 2;
  const squash = Math.sin(m.flex * Math.PI) * 0.18 * (m.flex > 0 ? 1 : 0);
  const capH = 0.55 * (1 - squash);
  const capW = m.w / 2 + 0.15 + squash * 0.3;
  // Pied
  ctx.fillStyle = '#efe2c8';
  roundRect(ctx, cx - 0.22, base, 0.44, m.y - base, 0.16);
  ctx.fill();
  ctx.fillStyle = 'rgba(160,130,100,0.35)';
  ctx.fillRect(cx + 0.08, base, 0.1, m.y - base);
  // Chapeau
  const g = ctx.createLinearGradient(0, m.y + capH, 0, m.y - 0.1);
  g.addColorStop(0, '#ff6b5a');
  g.addColorStop(1, '#b8283c');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(cx - capW, m.y - 0.08);
  ctx.quadraticCurveTo(cx - capW, m.y + capH, cx, m.y + capH);
  ctx.quadraticCurveTo(cx + capW, m.y + capH, cx + capW, m.y - 0.08);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(255,245,230,0.92)';
  for (const [u, v, rr] of [[-0.5, 0.45, 0.11], [0.05, 0.7, 0.13], [0.55, 0.4, 0.1], [-0.15, 0.25, 0.07]]) {
    ctx.beginPath();
    ctx.ellipse(cx + u * capW, m.y + v * capH, rr * 1.2, rr, 0, 0, TAU);
    ctx.fill();
  }
  r._drawGlow('255,120,110', cx, m.y + 0.2, m.w * 0.8, 0.2 + m.flex * 0.4);
}

export function drawRoller(r, ro, t) {
  const ctx = r.ctx;
  const p = pathState(ro.mover.path, t);
  const x = ro.x + p.x;
  const y = ro.y + p.y;
  const R = ro.r;
  if (ro.kind === 'log') {
    const rot = -(p.x / R);
    ctx.fillStyle = 'rgba(3,8,20,0.3)';
    ctx.beginPath();
    ctx.ellipse(x, y - R + 0.03, R * 0.9, 0.08, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#6b4426';
    ctx.beginPath();
    ctx.arc(x, y, R, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#c99a62';
    ctx.beginPath();
    ctx.arc(x, y, R * 0.8, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(110,70,35,0.7)';
    ctx.lineWidth = 0.035;
    for (const k of [0.6, 0.4, 0.2]) {
      ctx.beginPath();
      ctx.arc(x, y, R * k, 0, TAU);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(90,55,25,0.9)';
    ctx.lineWidth = 0.05;
    ctx.beginPath();
    for (let i = 0; i < 3; i++) {
      const a = rot + (i * TAU) / 3;
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(a) * R * 0.75, y + Math.sin(a) * R * 0.75);
    }
    ctx.stroke();
    return;
  }
  // Astéroïde
  r._drawGlow('160,120,255', x, y, R * 2.2, 0.25);
  drawRock(ctx, x, y, R, t * (ro.spin ?? 0.4), '#8a7fa8', '#3c3458');
  ctx.fillStyle = 'rgba(20,10,40,0.35)';
  for (const [u, v, rr] of [[-0.3, 0.2, 0.22], [0.35, -0.1, 0.16], [0, -0.45, 0.12]]) {
    ctx.beginPath();
    ctx.arc(x + u * R, y + v * R, rr * R, 0, TAU);
    ctx.fill();
  }
}

export function drawBranch(r, br, t) {
  const ctx = r.ctx;
  const p = pathState(br.mover.path, t);
  const x1 = br.x1 + p.x;
  const x2 = br.x2 + p.x;
  const y = br.y + p.y;
  ctx.fillStyle = '#5a3a22';
  ctx.beginPath();
  ctx.moveTo(x1 - 0.2, y - 0.05);
  ctx.quadraticCurveTo((x1 + x2) / 2, y + 0.06, x2 + 0.15, y - 0.02);
  ctx.lineTo(x2 + 0.1, y - 0.24);
  ctx.quadraticCurveTo((x1 + x2) / 2, y - 0.3, x1 - 0.2, y - 0.26);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#7a5434';
  ctx.fillRect(x1, y - 0.07, x2 - x1, 0.06);
  ctx.fillStyle = '#4f9a3e';
  for (const [u, s] of [[0.15, 1], [0.5, -1], [0.85, 1]]) {
    ctx.beginPath();
    ctx.ellipse(x1 + (x2 - x1) * u, y + 0.1 * s - 0.05, 0.28, 0.12, s * 0.4, 0, TAU);
    ctx.fill();
  }
}

// ─── ESPACE ─────────────────────────────────────────────────────────────────

export function drawGravityZone(r, z, time, active) {
  const ctx = r.ctx;
  const g = ctx.createLinearGradient(0, z.y, 0, z.y + z.h);
  g.addColorStop(0, `rgba(180,120,255,${active ? 0.1 : 0.05})`);
  g.addColorStop(1, `rgba(180,120,255,${active ? 0.22 : 0.14})`);
  ctx.fillStyle = g;
  ctx.fillRect(z.x, z.y, z.w, z.h);
  ctx.strokeStyle = 'rgba(200,160,255,0.55)';
  ctx.lineWidth = 0.05;
  ctx.setLineDash([0.25, 0.18]);
  ctx.beginPath();
  ctx.moveTo(z.x, z.y);
  ctx.lineTo(z.x, z.y + z.h);
  ctx.moveTo(z.x + z.w, z.y);
  ctx.lineTo(z.x + z.w, z.y + z.h);
  ctx.stroke();
  ctx.setLineDash([]);
  // Chevrons qui montent : la gravité tire vers le haut
  ctx.strokeStyle = 'rgba(220,190,255,0.7)';
  ctx.lineWidth = 0.06;
  ctx.lineCap = 'round';
  const cols = Math.max(1, Math.round(z.w / 1.6));
  for (let c = 0; c < cols; c++) {
    const cx = z.x + ((c + 0.5) * z.w) / cols;
    for (let i = 0; i < 3; i++) {
      const u = (((time * 0.45 + i / 3 + c * 0.17) % 1) + 1) % 1;
      const cy = z.y + u * z.h;
      ctx.globalAlpha = Math.sin(u * Math.PI) * 0.9;
      ctx.beginPath();
      ctx.moveTo(cx - 0.3, cy - 0.2);
      ctx.lineTo(cx, cy + 0.08);
      ctx.lineTo(cx + 0.3, cy - 0.2);
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
}

// ─── Pièges de l'étape 9 ────────────────────────────────────────────────────

const FALLER_LOOK = {
  city: ['#7a8299', '#454c62', 'grate'],
  snow: ['#cfe9fb', '#7fb2d9', 'ice'],
  volcano: ['#6b4a3f', '#3a2520', 'stone'],
  forest: ['#8a5a33', '#55351f', 'wood'],
  space: ['#5b5f96', '#2c2f5c', 'panel'],
};

export function drawFaller(r, f, time) {
  if (f.state === 'gone') {
    const ctx = r.ctx;
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 0.04;
    ctx.setLineDash([0.12, 0.12]);
    ctx.strokeRect(f.x, f.y, f.w, f.h);
    ctx.setLineDash([]);
    return;
  }
  const ctx = r.ctx;
  const [light, dark, kind] = FALLER_LOOK[r.themeId] ?? FALLER_LOOK.city;
  const shake = f.state === 'shake' ? Math.sin(time * 70) * 0.05 : 0;
  const x = f.x + shake;
  const y = f.y + f.offset;
  ctx.globalAlpha = f.appear;
  const g = ctx.createLinearGradient(0, y + f.h, 0, y);
  g.addColorStop(0, light);
  g.addColorStop(1, dark);
  ctx.fillStyle = g;
  roundRect(ctx, x, y, f.w, f.h, 0.06);
  ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  if (kind === 'grate') for (let xx = x + 0.2; xx < x + f.w - 0.1; xx += 0.25) ctx.fillRect(xx, y + 0.06, 0.06, f.h - 0.14);
  else if (kind === 'wood') for (let xx = x + 0.6; xx < x + f.w - 0.1; xx += 0.6) ctx.fillRect(xx, y, 0.04, f.h);
  else if (kind === 'panel') {
    ctx.fillStyle = 'rgba(130,230,255,0.7)';
    ctx.fillRect(x + 0.1, y + f.h * 0.4, f.w - 0.2, 0.05);
  }
  // Boulons qui lâchent : fissures et avertissement orange quand elle tremble
  const warn = f.state === 'shake' || f.state === 'fall';
  ctx.strokeStyle = warn ? 'rgba(255,150,60,0.95)' : 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 0.035;
  ctx.beginPath();
  ctx.moveTo(x + f.w * 0.35, y + f.h);
  ctx.lineTo(x + f.w * 0.42, y + f.h * 0.45);
  ctx.lineTo(x + f.w * 0.36, y);
  ctx.moveTo(x + f.w * 0.7, y + f.h);
  ctx.lineTo(x + f.w * 0.64, y + f.h * 0.3);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.fillRect(x, y + f.h - 0.05, f.w, 0.05);
  // Supports d'accroche (qui restent en place)
  ctx.globalAlpha = 1;
  ctx.fillStyle = 'rgba(20,20,30,0.55)';
  ctx.fillRect(f.x + 0.1, f.y + f.h, 0.1, 0.08);
  ctx.fillRect(f.x + f.w - 0.2, f.y + f.h, 0.1, 0.08);
}

export function drawBlinker(r, bl, time) {
  const ctx = r.ctx;
  const warn = bl.warning(time);
  const space = r.themeId === 'space';
  const col = space ? '140,200,255' : r.themeId === 'volcano' ? '255,140,70' : r.themeId === 'forest' ? '160,230,120' : r.themeId === 'snow' ? '170,220,255' : '255,200,90';
  if (!bl.solid) {
    // Silhouette en pointillés : il reviendra ici
    ctx.strokeStyle = `rgba(${col},0.35)`;
    ctx.lineWidth = 0.04;
    ctx.setLineDash([0.15, 0.12]);
    ctx.strokeRect(bl.x, bl.y, bl.w, bl.h);
    ctx.setLineDash([]);
    return;
  }
  const blink = warn > 0 ? (Math.sin(time * (14 + warn * 20)) > 0 ? 1 : 0.35) : 1;
  ctx.globalAlpha = blink;
  r._drawGlow(col, bl.x + bl.w / 2, bl.y + bl.h / 2, Math.max(bl.w, bl.h) * 0.8, 0.25);
  ctx.fillStyle = `rgba(${col},0.22)`;
  roundRect(ctx, bl.x, bl.y, bl.w, bl.h, 0.06);
  ctx.fill();
  ctx.strokeStyle = `rgba(${col},0.9)`;
  ctx.lineWidth = 0.06;
  roundRect(ctx, bl.x, bl.y, bl.w, bl.h, 0.06);
  ctx.stroke();
  // Hachures d'énergie
  ctx.save();
  ctx.beginPath();
  ctx.rect(bl.x, bl.y, bl.w, bl.h);
  ctx.clip();
  ctx.strokeStyle = `rgba(${col},0.35)`;
  ctx.lineWidth = 0.05;
  ctx.beginPath();
  const off = (time * 0.6) % 0.5;
  for (let d = -bl.h; d < bl.w + bl.h; d += 0.5) {
    ctx.moveTo(bl.x + d + off, bl.y);
    ctx.lineTo(bl.x + d + off - bl.h, bl.y + bl.h);
  }
  ctx.stroke();
  ctx.restore();
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(bl.x, bl.y + bl.h - 0.05, bl.w, 0.05);
  ctx.globalAlpha = 1;
}

export function drawSaw(r, sw, time) {
  const ctx = r.ctx;
  // Rail du trajet
  if (sw.path) {
    ctx.strokeStyle = 'rgba(20,20,30,0.5)';
    ctx.lineWidth = 0.12;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(sw.x, sw.y);
    ctx.lineTo(sw.x + sw.path.dx, sw.y + sw.path.dy);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 0.03;
    ctx.stroke();
  }
  const R = sw.r;
  ctx.save();
  ctx.translate(sw.cx, sw.cy);
  ctx.rotate(-time * 12);
  ctx.fillStyle = '#c9d0dc';
  ctx.beginPath();
  const n = 12;
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * TAU;
    const a1 = ((i + 0.6) / n) * TAU;
    ctx.lineTo(Math.cos(a0) * R * 0.78, Math.sin(a0) * R * 0.78);
    ctx.lineTo(Math.cos(a1) * R, Math.sin(a1) * R);
  }
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#8e97a8';
  ctx.beginPath();
  ctx.arc(0, 0, R * 0.62, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#ff4d5e';
  ctx.beginPath();
  ctx.arc(0, 0, R * 0.22, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 0.03;
  ctx.beginPath();
  ctx.arc(0, 0, R * 0.45, 0.3, 1.6);
  ctx.stroke();
  ctx.restore();
}

const MACE_LOOK = {
  city: ['#5a6378', '#2b3142', '#ff4d5e'],
  snow: ['#b9dcf5', '#6a9ccc', '#ff5a6e'],
  volcano: ['#3b2a2a', '#1a1010', '#ff8a2a'],
  forest: ['#6b5a40', '#3a2e1e', '#ff5a5a'],
  space: ['#6a5fb0', '#2f2766', '#ff7ad8'],
};

export function drawMace(r, m, time) {
  const ctx = r.ctx;
  const p = m.pos(time);
  const [light, dark, tip] = MACE_LOOK[r.themeId] ?? MACE_LOOK.city;
  // Ancrage et chaîne
  ctx.fillStyle = '#2a2e3a';
  ctx.beginPath();
  ctx.arc(m.x, m.y, 0.16, 0, TAU);
  ctx.fill();
  const links = Math.max(4, Math.round(m.len / 0.3));
  ctx.strokeStyle = '#8d93a3';
  ctx.lineWidth = 0.05;
  for (let i = 0; i < links; i++) {
    const t0 = i / links;
    const lx = m.x + (p.x - m.x) * t0;
    const ly = m.y + (p.y - m.y) * t0;
    ctx.beginPath();
    ctx.ellipse(lx, ly, 0.07, 0.11, Math.atan2(p.x - m.x, m.y - p.y), 0, TAU);
    ctx.stroke();
  }
  if (r.themeId === 'volcano') r._drawGlow('255,110,40', p.x, p.y, m.r * 2.4, 0.4);
  // Boule hérissée
  ctx.fillStyle = tip;
  ctx.beginPath();
  const spikes = 10;
  const rot = m.angle(time) * 1.5;
  for (let i = 0; i < spikes; i++) {
    const a = rot + (i / spikes) * TAU;
    ctx.moveTo(p.x + Math.cos(a - 0.18) * m.r * 0.85, p.y + Math.sin(a - 0.18) * m.r * 0.85);
    ctx.lineTo(p.x + Math.cos(a) * m.r * 1.32, p.y + Math.sin(a) * m.r * 1.32);
    ctx.lineTo(p.x + Math.cos(a + 0.18) * m.r * 0.85, p.y + Math.sin(a + 0.18) * m.r * 0.85);
  }
  ctx.fill();
  const g = ctx.createRadialGradient(p.x - m.r * 0.3, p.y + m.r * 0.3, m.r * 0.1, p.x, p.y, m.r);
  g.addColorStop(0, light);
  g.addColorStop(1, dark);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(p.x, p.y, m.r, 0, TAU);
  ctx.fill();
}

export function drawLaser(r, l, time) {
  const ctx = r.ctx;
  const s = l.state(time);
  const col = r.themeId === 'space' ? '255,80,200' : '255,60,80';
  // Faisceau
  if (s.on) {
    const flick = 0.85 + 0.15 * Math.sin(time * 60);
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = `rgba(${col},${0.35 * flick})`;
    ctx.lineWidth = 0.42;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(l.x1, l.y1);
    ctx.lineTo(l.x2, l.y2);
    ctx.stroke();
    ctx.strokeStyle = `rgba(255,230,240,${0.95 * flick})`;
    ctx.lineWidth = 0.09;
    ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
  } else if (s.warn > 0) {
    // Avertissement : un trait pointillé qui grésille, de plus en plus marqué
    ctx.strokeStyle = `rgba(${col},${0.2 + 0.6 * s.warn * (Math.sin(time * 40) > 0 ? 1 : 0.4)})`;
    ctx.lineWidth = 0.04;
    ctx.setLineDash([0.12, 0.14]);
    ctx.beginPath();
    ctx.moveTo(l.x1, l.y1);
    ctx.lineTo(l.x2, l.y2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  // Émetteurs
  const a = Math.atan2(l.y2 - l.y1, l.x2 - l.x1);
  for (const [x, y, dir] of [[l.x1, l.y1, a], [l.x2, l.y2, a + Math.PI]]) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(dir);
    ctx.fillStyle = '#2a2e3e';
    roundRect(ctx, -0.32, -0.26, 0.42, 0.52, 0.08);
    ctx.fill();
    ctx.fillStyle = s.on ? '#ffd0e0' : s.warn > 0 ? `rgba(${col},0.9)` : 'rgba(120,40,60,0.9)';
    ctx.fillRect(0.02, -0.1, 0.1, 0.2);
    ctx.restore();
    if (s.on || s.warn > 0) r._drawGlow(col, x, y, 0.6, s.on ? 0.8 : s.warn * 0.6);
  }
}

export function drawMagnet(r, m, time) {
  const ctx = r.ctx;
  const attract = m.strength > 0;
  const col = attract ? '255,90,110' : '110,170,255';
  // Ondes du champ : vers l'aimant (attire) ou vers l'extérieur (repousse)
  ctx.strokeStyle = `rgba(${col},0.5)`;
  ctx.lineWidth = 0.04;
  for (let i = 0; i < 3; i++) {
    let u = ((time * 0.6 + i / 3) % 1);
    if (attract) u = 1 - u;
    ctx.globalAlpha = Math.sin(u * Math.PI) * 0.8;
    ctx.beginPath();
    ctx.arc(m.x, m.y, 0.6 + u * (m.radius - 0.6), 0, TAU);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.strokeStyle = `rgba(${col},0.15)`;
  ctx.setLineDash([0.2, 0.2]);
  ctx.beginPath();
  ctx.arc(m.x, m.y, m.radius, 0, TAU);
  ctx.stroke();
  ctx.setLineDash([]);
  r._drawGlow(col, m.x, m.y, 1.3, 0.45);
  // Aimant en fer à cheval
  ctx.lineWidth = 0.28;
  ctx.lineCap = 'butt';
  ctx.strokeStyle = attract ? '#e8394f' : '#3f7fe8';
  ctx.beginPath();
  ctx.arc(m.x, m.y + 0.05, 0.36, Math.PI, 0, true);
  ctx.stroke();
  ctx.fillStyle = '#d8dde8';
  ctx.fillRect(m.x - 0.5, m.y - 0.02, 0.28, 0.2);
  ctx.fillRect(m.x + 0.22, m.y - 0.02, 0.28, 0.2);
}

const SHOT_COLOR = { city: '40,44,58', snow: '235,245,255', volcano: '255,120,40', forest: '120,80,40', space: '200,120,255' };

export function drawCannon(r, c, time) {
  const ctx = r.ctx;
  const col = SHOT_COLOR[r.themeId] ?? SHOT_COLOR.city;
  const glowing = r.themeId === 'volcano' || r.themeId === 'space';
  // Projectiles (avec une traînée)
  for (const d of c.shots(time)) {
    const px = c.x + c.dx * (0.6 + d);
    const py = c.y + c.dy * (0.6 + d);
    ctx.strokeStyle = `rgba(${col},0.35)`;
    ctx.lineWidth = c.size * 1.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(px - c.dx * 0.8, py - c.dy * 0.8);
    ctx.lineTo(px, py);
    ctx.stroke();
    if (glowing) r._drawGlow(col, px, py, c.size * 3, 0.6);
    ctx.fillStyle = `rgb(${col})`;
    ctx.beginPath();
    ctx.arc(px, py, c.size, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.beginPath();
    ctx.arc(px - c.size * 0.3, py + c.size * 0.3, c.size * 0.35, 0, TAU);
    ctx.fill();
  }
  // Canon (affût + fût orienté), qui rougeoit en se chargeant
  const charge = c.charge(time);
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.rotate(Math.atan2(c.dy, c.dx));
  ctx.fillStyle = '#3a3f52';
  roundRect(ctx, -0.2, -0.24, 0.85, 0.48, 0.12);
  ctx.fill();
  ctx.fillStyle = '#23263a';
  ctx.fillRect(0.55, -0.28, 0.14, 0.56);
  ctx.restore();
  ctx.fillStyle = '#2a2e3e';
  ctx.beginPath();
  ctx.arc(c.x, c.y, 0.34, 0, TAU);
  ctx.fill();
  if (charge > 0) r._drawGlow('255,150,60', c.x + c.dx * 0.62, c.y + c.dy * 0.62, 0.4 + charge * 0.5, charge);
}
