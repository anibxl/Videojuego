// Particules (poussière, confettis) et textes flottants. Pools pré-alloués : aucune allocation
// pendant le jeu, donc pas d'à-coups dus au ramasse-miettes.

import { createRng } from '../core/math.js';

const MAX_PARTICLES = 256;
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
