// Effets cosmétiques de la boutique : effets de rebond, traînées et animations de panier.
// Partagés par le jeu (renderer, main.js) et par l'aperçu de la boutique. Repère monde (y vers le haut).
//
// Fx : petit système de particules préalloué (aucune allocation pendant le jeu).

const TAU = Math.PI * 2;
const RAINBOW = ['255,90,90', '255,170,60', '255,230,80', '90,230,120', '80,180,255', '170,110,255'];

export class Fx {
  constructor(size = 360) {
    this.items = Array.from({ length: size }, () => ({ alive: false }));
    this._i = 0;
  }

  spawn(p) {
    const it = this.items[this._i];
    this._i = (this._i + 1) % this.items.length;
    Object.assign(it, { alive: true, age: 0, g: 0, drag: 0, rot: 0, vr: 0, size: 0.08, kind: 'dot', grow: 0, ...p });
    return it;
  }

  update(dt) {
    for (const p of this.items) {
      if (!p.alive) continue;
      p.age += dt;
      if (p.age >= p.life) {
        p.alive = false;
        continue;
      }
      p.vy -= p.g * dt;
      const k = 1 - p.drag * dt;
      p.vx *= k;
      p.vy *= k;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
    }
  }

  clear() {
    for (const p of this.items) p.alive = false;
  }

  /** Dessin en coordonnées monde (la transformation y vers le haut est déjà appliquée). */
  draw(ctx) {
    for (const p of this.items) {
      if (!p.alive) continue;
      const u = p.age / p.life;
      const a = p.fade === false ? 1 : 1 - u;
      const s = p.size * (1 + p.grow * u);
      ctx.globalAlpha = Math.max(0, a);
      switch (p.kind) {
        case 'ring':
          ctx.strokeStyle = `rgb(${p.color})`;
          ctx.lineWidth = p.width ?? 0.06;
          ctx.beginPath();
          ctx.arc(p.x, p.y, s, 0, TAU);
          ctx.stroke();
          break;
        case 'star':
          ctx.fillStyle = `rgb(${p.color})`;
          starPath(ctx, p.x, p.y, s, p.rot);
          ctx.fill();
          break;
        case 'bubble':
          ctx.strokeStyle = `rgba(${p.color},0.9)`;
          ctx.lineWidth = 0.025;
          ctx.beginPath();
          ctx.arc(p.x, p.y, s, 0, TAU);
          ctx.stroke();
          ctx.fillStyle = 'rgba(255,255,255,0.6)';
          ctx.beginPath();
          ctx.arc(p.x - s * 0.35, p.y + s * 0.35, s * 0.22, 0, TAU);
          ctx.fill();
          break;
        case 'spark':
          ctx.strokeStyle = `rgb(${p.color})`;
          ctx.lineWidth = s * 0.5;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - p.vx * 0.05, p.y - p.vy * 0.05);
          ctx.stroke();
          break;
        case 'bolt': {
          ctx.strokeStyle = `rgb(${p.color})`;
          ctx.lineWidth = 0.05;
          ctx.lineJoin = 'round';
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          let x = p.x;
          let y = p.y;
          const steps = 4;
          for (let i = 1; i <= steps; i++) {
            x += (Math.cos(p.rot) * p.len) / steps + Math.sin(p.age * 90 + i * 7) * 0.12;
            y += (Math.sin(p.rot) * p.len) / steps + Math.cos(p.age * 80 + i * 5) * 0.12;
            ctx.lineTo(x, y);
          }
          ctx.stroke();
          break;
        }
        case 'coin':
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.scale(Math.abs(Math.cos(p.rot)) * 0.9 + 0.1, 1);
          ctx.fillStyle = '#ffcf4a';
          ctx.beginPath();
          ctx.arc(0, 0, s, 0, TAU);
          ctx.fill();
          ctx.strokeStyle = '#c98a14';
          ctx.lineWidth = s * 0.25;
          ctx.stroke();
          ctx.restore();
          break;
        case 'streamer':
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.fillStyle = `rgb(${p.color})`;
          ctx.fillRect(-s * 1.6, -s * 0.3, s * 3.2, s * 0.6);
          ctx.restore();
          break;
        default:
          ctx.fillStyle = `rgb(${p.color})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, s, 0, TAU);
          ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }
}

function starPath(ctx, x, y, r, rot) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = rot + (i * Math.PI) / 5 - Math.PI / 2;
    const rr = i % 2 ? r * 0.45 : r;
    if (i) ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    else ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
}

const rand = (a, b) => a + Math.random() * (b - a);

// ─── Effets de rebond (sous le ballon, à chaque rebond du joueur) ───────────

/** @returns {boolean} true si l'effet remplace l'onde d'origine */
export function bounceEffect(fx, id, x, y, level) {
  const k = 0.6 + level * 0.15;
  switch (id) {
    case 'bounce-sparks':
      for (let i = 0; i < 8 + level * 2; i++) {
        const a = rand(0.15, Math.PI - 0.15);
        const v = rand(3, 6) * k;
        fx.spawn({ kind: 'spark', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 14, life: rand(0.25, 0.45), size: 0.07, color: i % 2 ? '255,220,90' : '255,160,60' });
      }
      return false;
    case 'bounce-bubbles':
      for (let i = 0; i < 5 + level; i++) {
        fx.spawn({ kind: 'bubble', x: x + rand(-0.4, 0.4), y: y + rand(0, 0.2), vx: rand(-0.6, 0.6), vy: rand(0.8, 2), g: -0.5, drag: 1, life: rand(0.6, 1.1), size: rand(0.08, 0.18) * k, grow: 0.3, color: ['170,230,255', '255,190,240', '200,255,220'][i % 3] });
      }
      return false;
    case 'bounce-stars':
      for (let i = 0; i < 6 + level; i++) {
        const a = rand(0.2, Math.PI - 0.2);
        const v = rand(2, 4.5) * k;
        fx.spawn({ kind: 'star', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 6, drag: 1.5, vr: rand(-6, 6), life: rand(0.4, 0.7), size: rand(0.1, 0.17), color: i % 3 ? '255,220,90' : '255,255,255' });
      }
      return false;
    case 'bounce-lightning':
      for (let i = 0; i < 3 + Math.ceil(level / 2); i++) {
        fx.spawn({ kind: 'bolt', x, y, vx: 0, vy: 0, rot: rand(0.2, Math.PI - 0.2) + Math.PI, len: rand(0.6, 1.1) * k, life: 0.18, color: i % 2 ? '170,220,255' : '255,255,255' });
      }
      fx.spawn({ kind: 'ring', x, y, vx: 0, vy: 0, life: 0.25, size: 0.2, grow: 4, color: '150,210,255', width: 0.04 });
      return true;
    case 'bounce-rainbow':
      RAINBOW.forEach((c, i) => fx.spawn({ kind: 'ring', x, y, vx: 0, vy: 0, life: 0.45 + i * 0.03, size: 0.15 + i * 0.05, grow: 3 + level * 0.4, color: c, width: 0.05 }));
      return true;
    default:
      return false;
  }
}

// ─── Traînées ───────────────────────────────────────────────────────────────

/**
 * Traînée derrière le ballon. `pts` : positions récentes (la plus ancienne en premier) {x, y}.
 * Dessin en coordonnées monde.
 */
export function drawTrail(ctx, id, pts, time, r = 0.4) {
  if (id === 'trail-none' || pts.length < 2) return;
  const n = pts.length;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const seg = (i, width, color) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(pts[i - 1].x, pts[i - 1].y);
    ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke();
  };
  switch (id) {
    case 'trail-streak':
      for (let i = 1; i < n; i++) seg(i, r * 1.4 * (i / n), `rgba(255,255,255,${0.35 * (i / n)})`);
      break;
    case 'trail-frost':
      for (let i = 1; i < n; i++) seg(i, r * 1.6 * (i / n), `rgba(170,225,255,${0.4 * (i / n)})`);
      break;
    case 'trail-flame':
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 1; i < n; i++) seg(i, r * 1.9 * (i / n), `rgba(255,${(90 + 120 * (i / n)) | 0},40,${0.45 * (i / n)})`);
      ctx.globalCompositeOperation = 'source-over';
      break;
    case 'trail-rainbow':
      for (let i = 1; i < n; i++) seg(i, r * 1.7 * (i / n), `rgba(${RAINBOW[(i + Math.floor(time * 10)) % RAINBOW.length]},${0.75 * (i / n)})`);
      break;
    case 'trail-plasma':
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 1; i < n; i++) seg(i, r * 2.1 * (i / n), `rgba(180,90,255,${0.4 * (i / n)})`);
      for (let i = 1; i < n; i++) seg(i, r * 0.6 * (i / n), `rgba(230,200,255,${0.8 * (i / n)})`);
      ctx.globalCompositeOperation = 'source-over';
      break;
    default:
  }
}

/** Particules émises le long de la traînée (appelé à chaque image). */
export function emitTrail(fx, id, x, y, speed, dt) {
  if (speed < 1.5) return;
  const rate = id === 'trail-flame' ? 40 : id === 'trail-frost' ? 22 : id === 'trail-plasma' ? 26 : 0;
  if (!rate || Math.random() > rate * dt) return;
  if (id === 'trail-flame') fx.spawn({ x: x + rand(-0.15, 0.15), y: y + rand(-0.15, 0.15), vx: rand(-0.4, 0.4), vy: rand(0.6, 1.6), life: rand(0.25, 0.45), size: rand(0.06, 0.12), grow: -0.5, color: Math.random() < 0.5 ? '255,160,50' : '255,230,120' });
  else if (id === 'trail-frost') fx.spawn({ kind: 'star', x: x + rand(-0.2, 0.2), y: y + rand(-0.2, 0.2), vx: 0, vy: -0.4, vr: 3, life: rand(0.4, 0.7), size: rand(0.05, 0.09), color: '235,250,255' });
  else if (id === 'trail-plasma') fx.spawn({ kind: 'spark', x, y, vx: rand(-3, 3), vy: rand(-3, 3), life: 0.2, size: 0.05, color: '220,180,255' });
}

// ─── Animations de panier ───────────────────────────────────────────────────

/** @returns {boolean} true si l'animation remplace les confettis d'origine */
export function goalEffect(fx, id, x, y) {
  switch (id) {
    case 'goal-streamers':
      for (let i = 0; i < 26; i++) {
        const a = rand(0.3, Math.PI - 0.3);
        const v = rand(5, 10);
        fx.spawn({ kind: 'streamer', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 9, drag: 1.4, vr: rand(-10, 10), life: rand(1.2, 1.8), size: 0.12, color: RAINBOW[i % RAINBOW.length], fade: false });
      }
      return false;
    case 'goal-fireworks':
      for (let b = 0; b < 3; b++) {
        const cx = x + rand(-2, 2);
        const cy = y + rand(2, 4);
        const col = RAINBOW[(b * 2) % RAINBOW.length];
        for (let i = 0; i < 22; i++) {
          const a = (i / 22) * TAU;
          const v = rand(2.5, 4);
          fx.spawn({ kind: 'spark', x: cx, y: cy, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 3, drag: 1.2, life: rand(0.8, 1.2) + b * 0.15, size: 0.08, color: col });
        }
        fx.spawn({ kind: 'ring', x: cx, y: cy, vx: 0, vy: 0, life: 0.5, size: 0.2, grow: 6, color: col, width: 0.05 });
      }
      return false;
    case 'goal-coins':
      for (let i = 0; i < 34; i++) {
        const a = rand(0.35, Math.PI - 0.35);
        const v = rand(4, 9);
        fx.spawn({ kind: 'coin', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 14, vr: rand(6, 14), life: rand(1.2, 1.8), size: 0.17, fade: false });
      }
      return true;
    case 'goal-supernova':
      fx.spawn({ kind: 'ring', x, y, vx: 0, vy: 0, life: 0.7, size: 0.3, grow: 14, color: '255,240,200', width: 0.12 });
      fx.spawn({ kind: 'ring', x, y, vx: 0, vy: 0, life: 0.9, size: 0.3, grow: 10, color: '200,160,255', width: 0.08 });
      for (let i = 0; i < 40; i++) {
        const a = (i / 40) * TAU;
        const v = rand(4, 8);
        fx.spawn({ kind: 'star', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, drag: 1.8, vr: rand(-8, 8), life: rand(0.8, 1.3), size: rand(0.1, 0.2), color: i % 2 ? '255,230,120' : '210,180,255' });
      }
      return true;
    default:
      return false;
  }
}
