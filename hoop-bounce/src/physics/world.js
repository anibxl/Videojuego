// Monde physique : la liste des formes statiques et quelques requêtes utiles.

import { closestPointOnSegment } from '../core/math.js';

export class PhysicsWorld {
  /** @param {{gravity:number}} options */
  constructor({ gravity }) {
    this.gravity = gravity;
    /** @type {import('./colliders.js').Capsule[]} */
    this.colliders = [];
  }

  add(...colliders) {
    for (const c of colliders.flat()) this.colliders.push(c);
  }

  /**
   * Hauteur de la première surface sous le point (x, y), ou -Infinity.
   * Sert à placer l'ombre du ballon.
   */
  surfaceBelow(x, y) {
    let best = -Infinity;
    const tmp = { x: 0, y: 0, t: 0 };
    for (const c of this.colliders) {
      if (x < c.minX || x > c.maxX || c.minY > y) continue;
      let top;
      if (c.ax === c.bx && c.ay === c.by) {
        const dx = x - c.ax;
        if (Math.abs(dx) > c.r) continue;
        top = c.ay + Math.sqrt(c.r * c.r - dx * dx);
      } else if (c.ax !== c.bx) {
        const t = (x - c.ax) / (c.bx - c.ax);
        if (t < 0 || t > 1) {
          closestPointOnSegment(x, y, c.ax, c.ay, c.bx, c.by, tmp);
          const dx = x - tmp.x;
          if (Math.abs(dx) > c.r) continue;
          top = tmp.y + Math.sqrt(c.r * c.r - dx * dx);
        } else {
          top = c.ay + (c.by - c.ay) * t + c.r;
        }
      } else {
        continue; // segment vertical : n'a pas de « dessus »
      }
      if (top <= y + 1e-6 && top > best) best = top;
    }
    return best;
  }
}
