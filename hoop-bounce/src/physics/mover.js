// Éléments animés sur un trajet aller-retour (plateformes mobiles, scies).
// Le mouvement est une sinusoïde : départ et arrivée en douceur, vitesse connue exactement
// à chaque instant (indispensable pour que le ballon soit entraîné sans glisser).

import { updateBounds } from './colliders.js';

/**
 * Décalage et vitesse sur un trajet { dx, dy, period, phase } à l'instant t.
 * Le décalage va de (0, 0) à (dx, dy) puis revient. `phase` est en fraction de période (0..1).
 */
export function pathState(path, t, out = { x: 0, y: 0, vx: 0, vy: 0 }) {
  const w = (Math.PI * 2) / path.period;
  const a = w * t + (path.phase ?? 0) * Math.PI * 2;
  const k = (1 - Math.cos(a)) / 2;
  const dk = (Math.sin(a) * w) / 2;
  out.x = path.dx * k;
  out.y = path.dy * k;
  out.vx = path.dx * dk;
  out.vy = path.dy * dk;
  return out;
}

/** Groupe de capsules qui se déplace d'un bloc (plateforme mobile). */
export class Mover {
  /** @param {import('./colliders.js').Capsule[]} colliders @param {object} path */
  constructor(colliders, path) {
    this.colliders = colliders;
    this.path = path;
    this.base = colliders.map((c) => ({ ax: c.ax, ay: c.ay, bx: c.bx, by: c.by }));
    this.offsetX = 0;
    this.offsetY = 0;
    this._s = { x: 0, y: 0, vx: 0, vy: 0 };
  }

  update(t) {
    const s = pathState(this.path, t, this._s);
    this.offsetX = s.x;
    this.offsetY = s.y;
    for (let i = 0; i < this.colliders.length; i++) {
      const c = this.colliders[i];
      const b = this.base[i];
      c.ax = b.ax + s.x;
      c.ay = b.ay + s.y;
      c.bx = b.bx + s.x;
      c.by = b.by + s.y;
      c.vx = s.vx;
      c.vy = s.vy;
      updateBounds(c);
    }
  }
}
