// Particules (poussière, confettis) et textes flottants. Pools pré-alloués : aucune allocation
// pendant le jeu, donc pas d'à-coups dus au ramasse-miettes.

import { createRng } from '../core/math.js';

const MAX_PARTICLES = 384; // étape 18 : effets de roulement et de décor en plus
const MAX_TEXTS = 8;

export class Particles {
  constructor() {
    this.rng = createRng(1234);
    this.items = Array.from({ length: MAX_PARTICLES }, () => ({
      alive: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1,
      size: 0.1, color: '#fff', gravity: 0, drag: 0, rot: 0, vrot: 0, kind: 0,
    }));
    this.texts = Array.from({ length: MAX_TEXTS }, () => ({
      alive: false, x: 0, y: 0, text: '', life: 0, maxLife: 1, color: '#fff', size: 1,
    }));
    this._cursor = 0;
  }

  _spawn() {
    for (let k = 0; k < MAX_PARTICLES; k++) {
      const i = (this._cursor + k) % MAX_PARTICLES;
      if (!this.items[i].alive) {
        this._cursor = (i + 1) % MAX_PARTICLES;
        return this.items[i];
      }
    }
    // Pool plein : on recycle la plus ancienne
    const p = this.items[this._cursor];
    this._cursor = (this._cursor + 1) % MAX_PARTICLES;
    return p;
  }

  /** Petit nuage de poussière à l'impact, le long de la surface. */
  dust(x, y, nx, ny, strength, color = 'rgba(255,240,220,0.5)') {
    const r = this.rng;
    const count = Math.round(2 + strength * 8);
    const tx = -ny;
    const ty = nx;
    for (let i = 0; i < count; i++) {
      const p = this._spawn();
      const side = r() < 0.5 ? -1 : 1;
      const sp = (0.8 + r() * 2.2) * (0.5 + strength);
      p.alive = true;
      p.kind = 0;
      p.x = x + tx * side * r() * 0.2;
      p.y = y + ty * side * r() * 0.2 + ny * 0.05;
      p.vx = tx * side * sp + nx * r() * 1.2;
      p.vy = ty * side * sp + ny * r() * 1.2;
      p.life = p.maxLife = 0.35 + r() * 0.35;
      p.size = 0.03 + r() * 0.06 * (0.4 + strength);
      p.color = color;
      p.gravity = -1.5;
      p.drag = 4;
    }
  }

  /** Explosion de confettis (panier marqué). */
  confetti(x, y, count = 40) {
    const r = this.rng;
    const colors = ['#ffcf3f', '#ff6b3d', '#4fd1ff', '#7cff8a', '#ffffff', '#ff5fa2'];
    for (let i = 0; i < count; i++) {
      const p = this._spawn();
      const a = Math.PI * (0.15 + 0.7 * r());
      const sp = 4 + r() * 7;
      p.alive = true;
      p.kind = 1;
      p.x = x + (r() - 0.5) * 0.6;
      p.y = y + (r() - 0.5) * 0.3;
      p.vx = Math.cos(a) * sp;
      p.vy = Math.sin(a) * sp;
      p.life = p.maxLife = 1.1 + r() * 0.8;
      p.size = 0.08 + r() * 0.08;
      p.color = colors[(r() * colors.length) | 0];
      p.gravity = 9;
      p.drag = 1.8;
      p.rot = r() * Math.PI * 2;
      p.vrot = (r() - 0.5) * 18;
    }
  }

  /** Onde de choc circulaire (rebond en l'air, tremplin). */
  ring(x, y, radius, color = 'rgba(255,255,255,0.9)', life = 0.35) {
    const p = this._spawn();
    p.alive = true;
    p.kind = 2;
    p.x = x;
    p.y = y;
    p.vx = p.vy = 0;
    p.size = radius;
    p.color = color;
    p.life = p.maxLife = life;
    p.gravity = 0;
    p.drag = 0;
    p.rot = 0;
    p.vrot = 0;
  }

  /** Scintillements (étoile ramassée, point de contrôle). */
  sparkle(x, y, count, color = '#ffe27a', speed = 3.5) {
    const r = this.rng;
    for (let i = 0; i < count; i++) {
      const p = this._spawn();
      const a = r() * Math.PI * 2;
      const sp = speed * (0.4 + r() * 0.8);
      p.alive = true;
      p.kind = 3;
      p.x = x;
      p.y = y;
      p.vx = Math.cos(a) * sp;
      p.vy = Math.sin(a) * sp;
      p.life = p.maxLife = 0.45 + r() * 0.4;
      p.size = 0.07 + r() * 0.07;
      p.color = color;
      p.gravity = 2;
      p.drag = 3;
      p.rot = r() * Math.PI;
      p.vrot = (r() - 0.5) * 8;
    }
  }

  /** Le ballon éclate (piège). */
  burst(x, y, vx, vy) {
    const r = this.rng;
    const colors = ['#f47a2a', '#de5f17', '#2b1206', '#ffb070'];
    for (let i = 0; i < 26; i++) {
      const p = this._spawn();
      const a = r() * Math.PI * 2;
      const sp = 3 + r() * 6;
      p.alive = true;
      p.kind = 1;
      p.x = x + Math.cos(a) * 0.2;
      p.y = y + Math.sin(a) * 0.2;
      p.vx = Math.cos(a) * sp + vx * 0.2;
      p.vy = Math.sin(a) * sp + vy * 0.2 + 2;
      p.life = p.maxLife = 0.6 + r() * 0.5;
      p.size = 0.06 + r() * 0.09;
      p.color = colors[(r() * colors.length) | 0];
      p.gravity = 22;
      p.drag = 1.2;
      p.rot = r() * Math.PI * 2;
      p.vrot = (r() - 0.5) * 20;
    }
  }

  /** Traits de vitesse qui jaillissent du point d'impact, le long de la surface (gros rebonds). */
  streaks(x, y, nx, ny, count, speed, color = 'rgba(255,255,255,0.9)') {
    const r = this.rng;
    const tx = -ny;
    const ty = nx;
    for (let i = 0; i < count; i++) {
      const p = this._spawn();
      const side = i % 2 ? 1 : -1;
      // Éventail : surtout le long de la surface, un peu vers le haut
      const a = (0.15 + r() * 0.6) * (Math.PI / 2);
      const dx = tx * side * Math.cos(a) + nx * Math.sin(a);
      const dy = ty * side * Math.cos(a) + ny * Math.sin(a);
      const sp = speed * (0.7 + r() * 0.6);
      p.alive = true;
      p.kind = 4;
      p.x = x + dx * 0.25;
      p.y = y + dy * 0.25;
      p.vx = dx * sp;
      p.vy = dy * sp;
      p.life = p.maxLife = 0.16 + r() * 0.1;
      p.size = 0.035 + r() * 0.02;
      p.color = color;
      p.gravity = 0;
      p.drag = 7;
      p.rot = 0;
      p.vrot = 0;
    }
  }

  /** Halo lumineux bref (éclair d'impact, panier) ; rgb = « r,g,b ». */
  flash(x, y, size, rgb, life = 0.18) {
    const p = this._spawn();
    p.alive = true;
    p.kind = 5;
    p.x = x;
    p.y = y;
    p.vx = p.vy = 0;
    p.size = size;
    p.color = rgb;
    p.life = p.maxLife = life;
    p.gravity = 0;
    p.drag = 0;
    p.rot = 0;
    p.vrot = 0;
  }

  /** Petits nuages doux (neige soulevée, vapeur, fumée) ; rgb = « r,g,b ». */
  puff(x, y, count, rgb, size = 0.3, spread = 1.4, rise = 0.6) {
    const r = this.rng;
    for (let i = 0; i < count; i++) {
      const p = this._spawn();
      p.alive = true;
      p.kind = 5;
      p.x = x + (r() - 0.5) * 0.5;
      p.y = y + r() * 0.15;
      p.vx = (r() - 0.5) * 2 * spread;
      p.vy = rise * (0.4 + r());
      p.size = size * (0.6 + r() * 0.8);
      p.color = rgb;
      p.life = p.maxLife = 0.5 + r() * 0.45;
      p.gravity = -0.3;
      p.drag = 2.6;
      p.rot = 1; // marque : le halo grossit en vieillissant
      p.vrot = 0;
    }
  }

  /** Braises, étincelles ou feuilles projetées (impacts selon le monde). */
  bits(x, y, count, colors, { speed = 3, up = 2.5, gravity = 6, life = 0.7, size = 0.05, kind = 0, drag = 1.5 } = {}) {
    const r = this.rng;
    for (let i = 0; i < count; i++) {
      const p = this._spawn();
      p.alive = true;
      p.kind = kind;
      p.x = x + (r() - 0.5) * 0.4;
      p.y = y + r() * 0.1;
      p.vx = (r() - 0.5) * 2 * speed;
      p.vy = up * (0.5 + r());
      p.life = p.maxLife = life * (0.6 + r() * 0.8);
      p.size = size * (0.6 + r() * 0.9);
      p.color = colors[(r() * colors.length) | 0];
      p.gravity = gravity;
      p.drag = drag;
      p.rot = r() * Math.PI * 2;
      p.vrot = (r() - 0.5) * 10;
    }
  }

  /** Petites lueurs qui flottent (lucioles, poussière d'énergie) ; rgb = « r,g,b ». */
  glow(x, y, count, rgb, { size = 0.2, life = 1.2, speed = 0.8, up = 0.6 } = {}) {
    const r = this.rng;
    for (let i = 0; i < count; i++) {
      const p = this._spawn();
      p.alive = true;
      p.kind = 5;
      p.x = x + (r() - 0.5) * 0.6;
      p.y = y + r() * 0.3;
      p.vx = (r() - 0.5) * 2 * speed;
      p.vy = up * (0.5 + r());
      p.size = size * (0.6 + r() * 0.7);
      p.color = rgb;
      p.life = p.maxLife = life * (0.6 + r() * 0.8);
      p.gravity = -0.2;
      p.drag = 1.2;
      p.rot = 2; // lueur qui scintille (ni nuage, ni éclair)
      p.vrot = 0;
    }
  }

  text(x, y, text, color = '#fff', size = 1) {
    let t = this.texts.find((tt) => !tt.alive) ?? this.texts[0];
    t.alive = true;
    t.x = x;
    t.y = y;
    t.text = text;
    t.color = color;
    t.size = size;
    t.life = t.maxLife = 1.4;
  }

  update(dt) {
    for (const p of this.items) {
      if (!p.alive) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.alive = false;
        continue;
      }
      const k = Math.exp(-p.drag * dt);
      p.vx *= k;
      p.vy = p.vy * k - p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vrot * dt;
    }
    for (const t of this.texts) {
      if (!t.alive) continue;
      t.life -= dt;
      t.y += dt * 0.9;
      if (t.life <= 0) t.alive = false;
    }
  }
}
