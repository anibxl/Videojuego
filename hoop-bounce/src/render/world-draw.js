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

/** Dessine un bloc fixe (rectangle ou polygone) dans le style de son monde. */
export function drawSolid(r, s, theme, time) {
  const ctx = r.ctx;
  const S = theme.surface;
  if (!s.box) return drawPolygonSolid(r, s, S, time);
  const x = s.x0;
  const y = s.y0;
  const w = s.x1 - s.x0;
  const h = s.y1 - s.y0;
  const top = s.y1;
  const style = s.style;

  if (style === 'wall') {
    ctx.fillStyle = 'rgba(3,8,20,0.3)';
    ctx.fillRect(x + 0.1, y, w, h);
    const g = ctx.createLinearGradient(x, 0, x + w, 0);
    g.addColorStop(0, S.wall);
    g.addColorStop(1, S.wallDark);
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    for (let yy = y + 0.6; yy < y + h; yy += 0.9) ctx.fillRect(x, yy, w, 0.05);
    ctx.fillStyle = S.wallEdge;
    ctx.fillRect(x, y, 0.05, h);
    ctx.fillRect(x + w - 0.05, y, 0.05, h);
    return;
  }

  if (style === 'ice') {
    drawIceBox(r, x, y, w, h, time);
    return;
  }

  if (style === 'wood') {
    const g = ctx.createLinearGradient(0, top, 0, y);
    g.addColorStop(0, WOOD.top);
    g.addColorStop(1, WOOD.bottom);
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = WOOD.line;
    for (let yy = top - 0.5; yy > y; yy -= 0.5) ctx.fillRect(x, yy, w, 0.04);
    for (let yy = top - 0.5, row = 0; yy > y; yy -= 0.5, row++) {
      for (let xx = x + (row % 2 ? 0.7 : 1.4); xx < x + w; xx += 2.1) ctx.fillRect(xx, yy, 0.04, 0.5);
    }
    ctx.fillStyle = WOOD.cap;
    ctx.fillRect(x - 0.08, top - 0.18, w + 0.16, 0.18);
    ctx.fillStyle = WOOD.moss;
    for (let xx = x; xx < x + w; xx += 0.9) {
      ctx.beginPath();
      ctx.ellipse(xx + 0.45 * hash(xx), top, 0.3 + 0.2 * hash(xx + 3), 0.07, 0, 0, TAU);
      ctx.fill();
    }
    return;
  }

  const isGround = style === 'ground' || style === 'snow' || style === 'rock';
  if (isGround) {
    const g = ctx.createLinearGradient(0, top, 0, top - 4);
    g.addColorStop(0, S.groundTop);
    g.addColorStop(1, S.groundBottom);
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
  } else {
    ctx.fillStyle = 'rgba(3,8,20,0.3)';
    roundRect(ctx, x + 0.08, y - 0.14, w, h, 0.14);
    ctx.fill();
    const g = ctx.createLinearGradient(0, top, 0, y);
    g.addColorStop(0, S.blockTop);
    g.addColorStop(1, S.blockBottom);
    ctx.fillStyle = g;
    roundRect(ctx, x, y, w, h, 0.14);
    ctx.fill();
  }
  drawCap(r, S, x, top, w, isGround ? 0 : 0.14, time, isGround);
}

/** Liseré du dessus d'une surface praticable, selon le monde. */
export function drawCap(r, S, x, top, w, radius, time, isGround) {
  const ctx = r.ctx;
  switch (S.capStyle) {
    case 'snow': {
      // Couche de neige épaisse, bord inférieur festonné
      ctx.fillStyle = S.capShade;
      roundRect(ctx, x - 0.04, top - 0.3, w + 0.08, 0.3, 0.12);
      ctx.fill();
      ctx.beginPath();
      for (let xx = x + 0.15; xx < x + w; xx += 0.42) ctx.arc(xx, top - 0.3, 0.1 + 0.06 * hash(xx), 0, TAU);
      ctx.fill();
      ctx.fillStyle = S.cap;
      roundRect(ctx, x - 0.04, top - 0.2, w + 0.08, 0.24, 0.12);
      ctx.fill();
      return;
    }
    case 'grass': {
      ctx.fillStyle = S.capShade;
      ctx.fillRect(x, top - 0.2, w, 0.2);
      ctx.fillStyle = S.cap;
      ctx.fillRect(x, top - 0.12, w, 0.12);
      ctx.beginPath();
      for (let xx = x + 0.05; xx < x + w - 0.05; xx += 0.17) {
        const hh = 0.1 + 0.12 * hash(xx * 3.1);
        const sway = Math.sin(time * 1.6 + xx) * 0.03;
        ctx.moveTo(xx - 0.05, top - 0.01);
        ctx.lineTo(xx + sway, top + hh);
        ctx.lineTo(xx + 0.05, top - 0.01);
      }
      ctx.fill();
      return;
    }
    case 'ember': {
      ctx.fillStyle = S.capShade;
      ctx.fillRect(x, top - 0.16, w, 0.16);
      ctx.fillStyle = S.cap;
      ctx.fillRect(x, top - 0.1, w, 0.1);
      // Fissures incandescentes sous la surface (irrégulières)
      const a = 0.4 + 0.25 * Math.sin(time * 1.7 + x);
      ctx.strokeStyle = `rgba(255,120,40,${a})`;
      ctx.lineWidth = 0.035;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      for (let xx = x + 0.6; xx < x + w - 0.6; xx += 1.8 + hash(xx) * 2.2) {
        let px = xx;
        let py = top - 0.16;
        ctx.moveTo(px, py);
        for (let k = 0; k < 3; k++) {
          px += (hash(xx * 1.7 + k) - 0.5) * 0.5;
          py -= 0.15 + hash(xx + k * 2.3) * 0.3;
          ctx.lineTo(px, py);
        }
      }
      ctx.stroke();
      return;
    }
    case 'neon': {
      ctx.fillStyle = S.capShade;
      ctx.fillRect(x, top - 0.12, w, 0.12);
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = 'rgba(120,220,255,0.25)';
      ctx.lineWidth = 0.28;
      ctx.beginPath();
      ctx.moveTo(x, top - 0.04);
      ctx.lineTo(x + w, top - 0.04);
      ctx.stroke();
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = S.cap;
      ctx.fillRect(x, top - 0.07, w, 0.06);
      return;
    }
    case 'court':
    default: {
      ctx.fillStyle = S.capShade;
      roundRect(ctx, x, top - 0.16, w, 0.16, radius ? Math.min(radius, 0.08) : 0);
      ctx.fill();
      ctx.fillStyle = S.cap;
      roundRect(ctx, x, top - 0.11, w, 0.11, radius ? Math.min(radius, 0.06) : 0);
      ctx.fill();
      if (isGround && S.capStyle === 'court') {
        // Ligne du terrain peinte au sol
        ctx.fillStyle = 'rgba(255,240,220,0.18)';
        ctx.fillRect(x, top - 0.42, w, 0.06);
      }
    }
  }
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
  ctx.restore();
  ctx.fillStyle = ICE.edge;
  ctx.fillRect(x, top - 0.07, w, 0.07);
  // Scintillement
  const k = (time * 0.6) % 1;
  const sx = x + ((hash(Math.floor(time * 0.6) + x) * w) | 0) + 0.3;
  ctx.globalAlpha = Math.sin(k * Math.PI);
  ctx.fillRect(Math.min(sx, x + w - 0.1), top - 0.2, 0.05, 0.3);
  ctx.fillRect(Math.min(sx, x + w - 0.1) - 0.12, top - 0.07, 0.29, 0.05);
  ctx.globalAlpha = 1;
}

function drawPolygonSolid(r, s, S, time) {
  const ctx = r.ctx;
  const pts = isCounterClockwise(s.points) ? s.points : [...s.points].reverse();
  const ice = s.style === 'ice';
  const g = ctx.createLinearGradient(0, s.y1, 0, s.y0);
  g.addColorStop(0, ice ? ICE.top : s.style === 'wood' ? WOOD.top : S.blockTop);
  g.addColorStop(1, ice ? ICE.bottom : s.style === 'wood' ? WOOD.bottom : S.blockBottom);
  ctx.fillStyle = g;
  ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
  ctx.fill();
  // Liseré sur les côtés tournés vers le haut
  ctx.strokeStyle = ice ? ICE.edge : S.cap;
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
  }
  void time;
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

export function drawThemedMover(r, m, t, theme) {
  const ctx = r.ctx;
  const p = pathState(m.path, t);
  const x = m.x + p.x;
  const y = m.y + p.y;
  if (m.style === 'stone') {
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
  if (m.style === 'float') {
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
