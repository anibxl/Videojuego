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
        case 'gift':
          // Petit cadeau : boîte colorée et ruban doré en croix
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.fillStyle = `rgb(${p.color})`;
          ctx.fillRect(-s, -s, s * 2, s * 2);
          ctx.fillStyle = '#ffd36b';
          ctx.fillRect(-s * 0.18, -s, s * 0.36, s * 2);
          ctx.fillRect(-s, -s * 0.18, s * 2, s * 0.36);
          ctx.restore();
          break;
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
        case 'smoke':
          // Bouffée de fumée : disque doux qui grossit et pâlit
          ctx.fillStyle = `rgba(${p.color},${0.35 * (1 - u)})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, s, 0, TAU);
          ctx.fill();
          ctx.fillStyle = `rgba(${p.color},${0.25 * (1 - u)})`;
          ctx.beginPath();
          ctx.arc(p.x + s * 0.35, p.y + s * 0.2, s * 0.7, 0, TAU);
          ctx.fill();
          break;
        case 'glow': {
          // Halo lumineux (nébuleuse, éclat légendaire)
          const gr = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, s);
          gr.addColorStop(0, `rgba(${p.color},0.7)`);
          gr.addColorStop(1, `rgba(${p.color},0)`);
          ctx.fillStyle = gr;
          ctx.beginPath();
          ctx.arc(p.x, p.y, s, 0, TAU);
          ctx.fill();
          break;
        }
        case 'hex': {
          // Hexagone lumineux (laboratoire du Trickshot, sceau des défis)
          ctx.strokeStyle = `rgb(${p.color})`;
          ctx.lineWidth = p.width ?? 0.06;
          ctx.beginPath();
          for (let k = 0; k <= 6; k++) {
            const a = p.rot + (k * TAU) / 6;
            if (k) ctx.lineTo(p.x + Math.cos(a) * s, p.y + Math.sin(a) * s);
            else ctx.moveTo(p.x + Math.cos(a) * s, p.y + Math.sin(a) * s);
          }
          ctx.stroke();
          break;
        }
        case 'flame':
          // Flamme : goutte qui monte, du jaune au rouge
          ctx.fillStyle = `rgb(${u < 0.35 ? '255,230,120' : u < 0.7 ? '255,150,40' : '220,60,20'})`;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y + s * 1.8);
          ctx.quadraticCurveTo(p.x + s, p.y, p.x, p.y - s);
          ctx.quadraticCurveTo(p.x - s, p.y, p.x, p.y + s * 1.8);
          ctx.fill();
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
    case 'bounce-snow':
      // Flocons : une gerbe de petits flocons et un anneau de givre
      fx.spawn({ kind: 'ring', x, y, vx: 0, vy: 0, life: 0.35, size: 0.12, grow: 4, color: '220,240,255', width: 0.04 });
      for (let i = 0; i < 7 + level; i++) {
        const a = rand(0.2, Math.PI - 0.2);
        const v = rand(1.5, 3.5) * k;
        fx.spawn({ kind: 'star', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 3, drag: 1.6, vr: rand(-4, 4), life: rand(0.5, 0.9), size: rand(0.07, 0.13), color: i % 3 ? '235,248,255' : '170,215,255' });
      }
      return false;
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
    case 'bounce-crown': {
      // Couronne d'or : cinq pointes d'étoiles qui jaillissent en éventail + anneau doré
      fx.spawn({ kind: 'ring', x, y, vx: 0, vy: 0, life: 0.4, size: 0.2, grow: 3 + level * 0.5, color: '255,210,90', width: 0.07 });
      for (let i = 0; i < 5; i++) {
        const a = Math.PI * (0.25 + i * 0.125);
        const v = (3.2 + (i % 2 ? 0 : 1.2)) * k;
        fx.spawn({ kind: 'star', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 4, drag: 2, vr: 0, life: 0.55, size: 0.16, color: i === 2 ? '255,255,255' : '255,214,90' });
      }
      for (let i = 0; i < 6; i++) fx.spawn({ kind: 'spark', x: x + rand(-0.4, 0.4), y, vx: rand(-1, 1), vy: rand(1, 3), g: 3, life: 0.4, size: 0.05, color: '255,240,180' });
      return true;
    }
    case 'bounce-smoke':
      for (let i = 0; i < 6 + level; i++) {
        const sx = rand(-1, 1);
        fx.spawn({ kind: 'smoke', x: x + sx * 0.3, y: y + 0.05, vx: sx * rand(0.8, 1.8) * k, vy: rand(0.3, 1.1), drag: 2.2, life: rand(0.6, 1), size: rand(0.14, 0.24), grow: 1.6, color: i % 2 ? '200,200,210' : '160,160,175' });
      }
      return true;
    case 'bounce-flames':
      for (let i = 0; i < 10 + level * 2; i++) {
        fx.spawn({ kind: 'flame', x: x + rand(-0.45, 0.45), y: y + 0.02, vx: rand(-0.5, 0.5), vy: rand(1.5, 3.5) * k, g: -1, drag: 1.5, life: rand(0.3, 0.55), size: rand(0.07, 0.13), grow: -0.5 });
      }
      fx.spawn({ kind: 'glow', x, y: y + 0.1, vx: 0, vy: 0, life: 0.3, size: 0.9, grow: 0.5, color: '255,140,40' });
      return true;
    case 'bounce-cosmic': {
      // Légendaire : une petite galaxie naît — nébuleuse, spirale d'étoiles, double anneau
      fx.spawn({ kind: 'glow', x, y: y + 0.2, vx: 0, vy: 0, life: 0.6, size: 1.1, grow: 0.8, color: '160,90,255' });
      fx.spawn({ kind: 'glow', x: x + 0.3, y: y + 0.3, vx: 0, vy: 0, life: 0.5, size: 0.7, grow: 0.8, color: '80,180,255' });
      fx.spawn({ kind: 'ring', x, y, vx: 0, vy: 0, life: 0.45, size: 0.2, grow: 4 + level * 0.5, color: '200,160,255', width: 0.05 });
      fx.spawn({ kind: 'ring', x, y, vx: 0, vy: 0, life: 0.6, size: 0.2, grow: 6 + level * 0.6, color: '120,200,255', width: 0.03 });
      for (let i = 0; i < 14 + level * 2; i++) {
        const a = (i / (14 + level * 2)) * TAU;
        const v = rand(2, 4) * k;
        fx.spawn({ kind: i % 3 ? 'dot' : 'star', x, y: y + 0.15, vx: Math.cos(a) * v - Math.sin(a) * 1.5, vy: Math.sin(a) * v * 0.7 + Math.cos(a) * 1.5 + 0.8, drag: 2, vr: 6, life: rand(0.5, 0.9), size: i % 3 ? 0.045 : 0.1, color: ['230,210,255', '150,210,255', '255,255,255'][i % 3] });
      }
      return true;
    }
    case 'bounce-lab': {
      // Labo (succès Trickshot) : deux hexagones électriques qui s'ouvrent, arcs et étincelles cyan
      fx.spawn({ kind: 'hex', x, y: y + 0.1, vx: 0, vy: 0, rot: 0, vr: 2.5, life: 0.45, size: 0.25, grow: 3 + level * 0.4, color: '70,235,225', width: 0.06 });
      fx.spawn({ kind: 'hex', x, y: y + 0.1, vx: 0, vy: 0, rot: Math.PI / 6, vr: -3, life: 0.55, size: 0.2, grow: 4.5 + level * 0.5, color: '255,90,200', width: 0.035 });
      fx.spawn({ kind: 'glow', x, y: y + 0.15, vx: 0, vy: 0, life: 0.3, size: 0.8, grow: 0.4, color: '70,235,225' });
      for (let i = 0; i < 2 + Math.ceil(level / 2); i++) fx.spawn({ kind: 'bolt', x, y, vx: 0, vy: 0, rot: rand(0.3, Math.PI - 0.3), len: rand(0.5, 0.9) * k, life: 0.16, color: i % 2 ? '200,255,250' : '70,235,225' });
      for (let i = 0; i < 6 + level; i++) {
        const a = rand(0.2, Math.PI - 0.2);
        const v = rand(2.5, 5) * k;
        fx.spawn({ kind: 'spark', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 10, life: rand(0.25, 0.4), size: 0.055, color: i % 3 ? '120,245,235' : '255,255,255' });
      }
      return true;
    }
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
    case 'trail-xmas':
      // Sucre d'orge : ruban rouge et blanc qui alternent, fil doré au centre
      for (let i = 1; i < n; i++) seg(i, r * 1.7 * (i / n), (i + Math.floor(time * 8)) % 2 ? `rgba(226,38,58,${0.85 * (i / n)})` : `rgba(250,252,255,${0.85 * (i / n)})`);
      for (let i = 1; i < n; i++) seg(i, r * 0.22 * (i / n), `rgba(255,211,107,${0.8 * (i / n)})`);
      break;
    case 'trail-snow':
      // Tempête de neige : voile blanc et bleuté
      for (let i = 1; i < n; i++) seg(i, r * 2 * (i / n), `rgba(225,240,255,${0.32 * (i / n)})`);
      for (let i = 1; i < n; i++) seg(i, r * 0.8 * (i / n), `rgba(255,255,255,${0.5 * (i / n)})`);
      break;
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
    case 'trail-hoop':
      // Ruban orange et bleu nuit qui alternent
      for (let i = 1; i < n; i++) seg(i, r * 1.8 * (i / n), i % 2 ? `rgba(255,130,50,${0.75 * (i / n)})` : `rgba(30,50,110,${0.75 * (i / n)})`);
      for (let i = 1; i < n; i++) seg(i, r * 0.35 * (i / n), `rgba(255,230,200,${0.6 * (i / n)})`);
      break;
    case 'trail-aurora': {
      // Aurore boréale : voiles verts, turquoise et violets qui ondulent
      ctx.globalCompositeOperation = 'lighter';
      const cols = ['80,255,170', '60,220,255', '170,110,255'];
      for (let band = 0; band < 3; band++) {
        for (let i = 1; i < n; i++) {
          const off = Math.sin(time * 4 + i * 0.6 + band * 2) * r * 0.5;
          ctx.strokeStyle = `rgba(${cols[band]},${0.32 * (i / n)})`;
          ctx.lineWidth = r * (1.2 + band * 0.3) * (i / n);
          ctx.beginPath();
          ctx.moveTo(pts[i - 1].x, pts[i - 1].y + off);
          ctx.lineTo(pts[i].x, pts[i].y + off);
          ctx.stroke();
        }
      }
      ctx.globalCompositeOperation = 'source-over';
      break;
    }
    case 'trail-spectre': {
      // Spectre (succès Fantôme) : voile pâle et échos translucides du ballon, comme le fantôme du jeu
      for (let i = 1; i < n; i++) seg(i, r * 1.5 * (i / n), `rgba(190,225,255,${0.16 * (i / n)})`);
      ctx.lineWidth = r * 0.12;
      for (let i = n - 4; i > 0; i -= 4) {
        const a = (i / n) * 0.55;
        ctx.strokeStyle = `rgba(214,236,255,${a.toFixed(3)})`;
        ctx.fillStyle = `rgba(190,225,255,${(a * 0.35).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(pts[i].x, pts[i].y + Math.sin(time * 5 + i) * r * 0.08, r * (0.55 + 0.4 * (i / n)), 0, TAU);
        ctx.fill();
        ctx.stroke();
      }
      break;
    }
    case 'trail-energy': {
      // Courant électrique : halo vert-cyan, cœur blanc qui ondule
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 1; i < n; i++) seg(i, r * 1.8 * (i / n), `rgba(60,255,200,${0.28 * (i / n)})`);
      for (let i = 1; i < n; i++) {
        const o1 = Math.sin(time * 30 + i * 1.7) * r * 0.25 * (i / n);
        const o0 = Math.sin(time * 30 + (i - 1) * 1.7) * r * 0.25 * ((i - 1) / n);
        ctx.strokeStyle = `rgba(220,255,250,${0.85 * (i / n)})`;
        ctx.lineWidth = r * 0.22 * (i / n);
        ctx.beginPath();
        ctx.moveTo(pts[i - 1].x, pts[i - 1].y + o0);
        ctx.lineTo(pts[i].x, pts[i].y + o1);
        ctx.stroke();
      }
      ctx.globalCompositeOperation = 'source-over';
      break;
    }
    case 'trail-galaxy': {
      // Ruban de nébuleuse (violet → bleu) semé d'étoiles fixes
      for (let i = 1; i < n; i++) seg(i, r * 2.1 * (i / n), `rgba(${i % 2 ? '120,60,220' : '60,90,220'},${0.55 * (i / n)})`);
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 1; i < n; i++) seg(i, r * 0.9 * (i / n), `rgba(255,120,220,${0.22 * (i / n)})`);
      ctx.globalCompositeOperation = 'source-over';
      for (let i = 2; i < n; i += 2) {
        const a = i * 2.4 + time * 0.5;
        const d = Math.sin(i * 7.3) * r * 0.7 * (i / n);
        ctx.fillStyle = `rgba(255,255,255,${0.9 * (i / n)})`;
        ctx.beginPath();
        ctx.arc(pts[i].x + Math.cos(a) * d * 0.4, pts[i].y + d, 0.035 + 0.02 * ((i * 13) % 3), 0, TAU);
        ctx.fill();
      }
      break;
    }
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
  const rate = id === 'trail-xmas' ? 10 : id === 'trail-snow' ? 30 : id === 'trail-flame' ? 40 : id === 'trail-frost' ? 22 : id === 'trail-plasma' ? 26 : id === 'trail-hoop' ? 10 : id === 'trail-aurora' ? 18 : id === 'trail-energy' ? 24 : id === 'trail-galaxy' ? 14 : id === 'trail-spectre' ? 12 : 0;
  if (!rate || Math.random() > rate * dt) return;
  if (id === 'trail-xmas') fx.spawn({ kind: 'star', x: x + rand(-0.15, 0.15), y: y + rand(-0.15, 0.15), vx: 0, vy: -0.3, vr: 3, life: rand(0.4, 0.7), size: rand(0.05, 0.08), color: Math.random() < 0.5 ? '255,255,255' : '255,211,107' });
  else if (id === 'trail-snow') fx.spawn({ kind: 'star', x: x + rand(-0.3, 0.3), y: y + rand(-0.3, 0.3), vx: rand(-0.4, 0.4), vy: rand(-0.8, -0.2), vr: rand(-3, 3), life: rand(0.6, 1.1), size: rand(0.05, 0.1), color: Math.random() < 0.7 ? '255,255,255' : '190,225,255' });
  else if (id === 'trail-flame') fx.spawn({ x: x + rand(-0.15, 0.15), y: y + rand(-0.15, 0.15), vx: rand(-0.4, 0.4), vy: rand(0.6, 1.6), life: rand(0.25, 0.45), size: rand(0.06, 0.12), grow: -0.5, color: Math.random() < 0.5 ? '255,160,50' : '255,230,120' });
  else if (id === 'trail-frost') fx.spawn({ kind: 'star', x: x + rand(-0.2, 0.2), y: y + rand(-0.2, 0.2), vx: 0, vy: -0.4, vr: 3, life: rand(0.4, 0.7), size: rand(0.05, 0.09), color: '235,250,255' });
  else if (id === 'trail-hoop') fx.spawn({ kind: 'coin', x, y, vx: rand(-0.6, 0.6), vy: rand(0.2, 1), g: 2, vr: rand(3, 8), life: 0.6, size: 0.1, color: '255,140,60' });
  else if (id === 'trail-aurora') fx.spawn({ kind: 'star', x: x + rand(-0.2, 0.2), y: y + rand(-0.2, 0.2), vx: 0, vy: 0.3, vr: 2, life: rand(0.4, 0.8), size: rand(0.04, 0.08), color: Math.random() < 0.5 ? '120,255,200' : '200,160,255' });
  else if (id === 'trail-plasma') fx.spawn({ kind: 'spark', x, y, vx: rand(-3, 3), vy: rand(-3, 3), life: 0.2, size: 0.05, color: '220,180,255' });
  else if (id === 'trail-energy') fx.spawn({ kind: 'bolt', x, y, vx: 0, vy: 0, rot: rand(0, TAU), len: rand(0.25, 0.5), life: 0.1, color: '150,255,230' });
  else if (id === 'trail-galaxy') fx.spawn({ kind: 'star', x: x + rand(-0.25, 0.25), y: y + rand(-0.25, 0.25), vx: rand(-0.3, 0.3), vy: rand(-0.3, 0.3), vr: 2, life: rand(0.5, 0.9), size: rand(0.04, 0.08), color: Math.random() < 0.5 ? '255,255,255' : '200,170,255' });
  else if (id === 'trail-spectre') fx.spawn({ kind: 'ring', x: x + rand(-0.1, 0.1), y: y + rand(-0.1, 0.1), vx: 0, vy: 0.2, life: rand(0.5, 0.8), size: 0.12, grow: 1.2, color: '200,230,255', width: 0.025 });
}

// ─── Animations de panier ───────────────────────────────────────────────────

/** @returns {boolean} true si l'animation remplace les confettis d'origine */
export function goalEffect(fx, id, x, y) {
  switch (id) {
    case 'goal-xmas': {
      // Pluie de cadeaux : des cadeaux jaillissent, la neige tombe, guirlandes rouges, vertes et dorées
      const COL = ['226,38,58', '47,138,72', '255,211,107', '250,252,255'];
      fx.spawn({ kind: 'ring', x, y, vx: 0, vy: 0, life: 0.5, size: 0.2, grow: 7, color: '255,230,170', width: 0.06 });
      for (let i = 0; i < 12; i++) {
        const a = rand(0.4, Math.PI - 0.4);
        const v = rand(5, 9);
        fx.spawn({ kind: 'gift', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 12, vr: rand(-6, 6), life: rand(1.3, 1.8), size: rand(0.13, 0.2), color: COL[i % 3], fade: false });
      }
      for (let i = 0; i < 24; i++) {
        const a = rand(0.3, Math.PI - 0.3);
        const v = rand(4, 9);
        fx.spawn({ kind: 'streamer', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 9, drag: 1.4, vr: rand(-10, 10), life: rand(1.2, 1.8), size: 0.11, color: COL[i % COL.length], fade: false });
      }
      for (let i = 0; i < 30; i++) {
        fx.spawn({ kind: 'star', x: x + rand(-3.5, 3.5), y: y + rand(2.5, 5), vx: rand(-0.3, 0.3), vy: rand(-1.6, -0.8), vr: rand(-2, 2), life: rand(1.6, 2.4), size: rand(0.06, 0.11), color: '245,250,255' });
      }
      return true;
    }
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
    case 'goal-constellation': {
      // Des étoiles s'allument en arc au-dessus du panier, reliées par des fils de lumière
      const pts = [];
      for (let i = 0; i < 7; i++) {
        const a = Math.PI * (0.15 + (i / 6) * 0.7);
        pts.push([x + Math.cos(a) * 2.6, y + 1 + Math.sin(a) * 2.2]);
      }
      pts.forEach(([px, py], i) => {
        fx.spawn({ kind: 'star', x: px, y: py, vx: 0, vy: 0, vr: 1.5, life: 1.6 + i * 0.05, size: 0.2, color: i % 2 ? '200,220,255' : '255,255,255', fade: true });
        fx.spawn({ kind: 'ring', x: px, y: py, vx: 0, vy: 0, life: 0.6, size: 0.1, grow: 2, color: '170,200,255', width: 0.03 });
        if (i) {
          const [qx, qy] = pts[i - 1];
          for (let k = 1; k < 5; k++) fx.spawn({ kind: 'dot', x: qx + ((px - qx) * k) / 5, y: qy + ((py - qy) * k) / 5, vx: 0, vy: 0, life: 1.4, size: 0.035, color: '190,210,255' });
        }
      });
      fx.spawn({ kind: 'ring', x, y, vx: 0, vy: 0, life: 0.8, size: 0.3, grow: 9, color: '170,200,255', width: 0.06 });
      return true;
    }
    case 'goal-mystery': {
      // Énigme (tous les défis cachés) : un sceau violet et or s'ouvre — deux hexagones qui tournent en sens
      // contraire, un anneau, puis des étoiles et des éclats dorés en spirale
      fx.spawn({ kind: 'glow', x, y: y + 1, vx: 0, vy: 0, life: 1.2, size: 2.4, grow: 0.4, color: '150,80,255' });
      fx.spawn({ kind: 'hex', x, y: y + 1, vx: 0, vy: 0, rot: 0, vr: 1.6, life: 1.4, size: 0.4, grow: 3.4, color: '200,150,255', width: 0.07 });
      fx.spawn({ kind: 'hex', x, y: y + 1, vx: 0, vy: 0, rot: Math.PI / 6, vr: -2.2, life: 1.2, size: 0.3, grow: 4.5, color: '255,214,90', width: 0.05 });
      fx.spawn({ kind: 'ring', x, y, vx: 0, vy: 0, life: 0.8, size: 0.3, grow: 8, color: '220,190,255', width: 0.06 });
      for (let i = 0; i < 18; i++) {
        const a = (i / 18) * TAU;
        const v = rand(3, 5.5);
        fx.spawn({ kind: i % 3 ? 'spark' : 'star', x, y: y + 1, vx: Math.cos(a) * v - Math.sin(a) * 2, vy: Math.sin(a) * v + Math.cos(a) * 2, drag: 1.4, g: 2, vr: 5, life: rand(0.9, 1.4), size: i % 3 ? 0.06 : 0.17, color: i % 2 ? '255,214,90' : '210,170,255' });
      }
      return true;
    }
    case 'goal-burst':
      // Explosion de confettis : deux salves, beaucoup plus de confettis qu'à l'origine
      fx.spawn({ kind: 'ring', x, y, vx: 0, vy: 0, life: 0.4, size: 0.2, grow: 7, color: '255,255,255', width: 0.06 });
      for (let i = 0; i < 70; i++) {
        const a = rand(0.15, Math.PI - 0.15);
        const v = rand(5, 12);
        fx.spawn({ kind: i % 3 ? 'streamer' : 'dot', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 10, drag: 1.3, vr: rand(-12, 12), life: rand(1.3, 2), size: i % 3 ? 0.1 : 0.07, color: RAINBOW[i % RAINBOW.length], fade: false });
      }
      return true;
    case 'goal-electric':
      // Éclairs qui jaillissent du cercle, anneaux électriques, étincelles
      for (let i = 0; i < 9; i++) {
        fx.spawn({ kind: 'bolt', x, y, vx: 0, vy: 0, rot: (i / 9) * TAU, len: rand(1.2, 2.2), life: rand(0.18, 0.3), color: i % 2 ? '150,220,255' : '255,255,255' });
      }
      fx.spawn({ kind: 'ring', x, y, vx: 0, vy: 0, life: 0.35, size: 0.3, grow: 6, color: '120,200,255', width: 0.06 });
      fx.spawn({ kind: 'ring', x, y, vx: 0, vy: 0, life: 0.55, size: 0.3, grow: 9, color: '200,240,255', width: 0.03 });
      fx.spawn({ kind: 'glow', x, y, vx: 0, vy: 0, life: 0.35, size: 2.2, grow: 0.3, color: '120,190,255' });
      for (let i = 0; i < 24; i++) {
        const a = rand(0, TAU);
        const v = rand(3, 7);
        fx.spawn({ kind: 'spark', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 6, life: rand(0.3, 0.6), size: 0.06, color: '200,240,255' });
      }
      return true;
    case 'goal-space': {
      // Effet spatial : nébuleuse, planète à anneau, étoiles filantes
      fx.spawn({ kind: 'glow', x, y: y + 1, vx: 0, vy: 0, life: 1.4, size: 2.4, grow: 0.4, color: '140,80,255' });
      fx.spawn({ kind: 'glow', x: x - 1, y: y + 1.6, vx: 0, vy: 0, life: 1.2, size: 1.6, grow: 0.4, color: '60,170,255' });
      fx.spawn({ kind: 'dot', x: x + 1.4, y: y + 2.2, vx: 0, vy: 0.3, life: 1.6, size: 0.32, color: '255,170,110' });
      fx.spawn({ kind: 'ring', x: x + 1.4, y: y + 2.2, vx: 0, vy: 0.3, life: 1.6, size: 0.5, grow: 0, color: '255,220,180', width: 0.05 });
      for (let i = 0; i < 6; i++) {
        const sx = x - 3 + i * 0.9;
        fx.spawn({ kind: 'spark', x: sx, y: y + 3.5 + rand(0, 1), vx: rand(5, 8), vy: rand(-4, -2), life: rand(0.5, 0.8), size: 0.08, color: '255,255,255' });
      }
      for (let i = 0; i < 26; i++) {
        const a = (i / 26) * TAU;
        const v = rand(2, 5);
        fx.spawn({ kind: 'star', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, drag: 1.6, vr: 4, life: rand(0.8, 1.3), size: rand(0.08, 0.16), color: ['210,180,255', '150,210,255', '255,255,255'][i % 3] });
      }
      return true;
    }
    case 'goal-legend': {
      // Effet légendaire : halo d'or, trois ondes de lumière, couronne d'étoiles, pluie d'or et serpentins dorés
      fx.spawn({ kind: 'glow', x, y, vx: 0, vy: 0, life: 1.2, size: 3.2, grow: 0.5, color: '255,200,80' });
      for (let k = 0; k < 3; k++) fx.spawn({ kind: 'ring', x, y, vx: 0, vy: 0, life: 0.7 + k * 0.25, size: 0.3, grow: 10 + k * 4, color: k === 1 ? '255,255,255' : '255,210,90', width: 0.1 - k * 0.025 });
      for (let i = 0; i < 9; i++) {
        const a = Math.PI * (0.1 + (i / 8) * 0.8);
        fx.spawn({ kind: 'star', x: x + Math.cos(a) * 2.2, y: y + 0.6 + Math.sin(a) * 1.8, vx: Math.cos(a) * 0.6, vy: Math.sin(a) * 0.6, vr: 2, life: 1.5, size: i === 4 ? 0.34 : 0.22, color: i % 2 ? '255,240,180' : '255,205,80' });
      }
      for (let i = 0; i < 30; i++) {
        const a = rand(0.3, Math.PI - 0.3);
        const v = rand(5, 10);
        fx.spawn({ kind: 'coin', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 12, vr: rand(6, 14), life: rand(1.3, 1.9), size: 0.15, fade: false });
      }
      for (let i = 0; i < 30; i++) {
        const a = rand(0.2, Math.PI - 0.2);
        const v = rand(4, 9);
        fx.spawn({ kind: 'streamer', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 8, drag: 1.3, vr: rand(-10, 10), life: rand(1.4, 2), size: 0.11, color: i % 2 ? '255,214,90' : '255,250,220', fade: false });
      }
      return true;
    }
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
