// Déformations visuelles du ballon (« squash & stretch »).
// Purement cosmétique : la physique reste celle d'un disque rigide.
//
// La déformation est une matrice 2×2 symétrique (somme d'un écrasement le long de la normale
// d'impact et d'un étirement le long de la vitesse). Pas de changement d'axe brutal, pas de saut.

import { clamp, damp } from '../core/math.js';

export class BallVisual {
  /** @param {object} feel CONFIG.feel */
  constructor(feel) {
    this.cfg = feel;
    this.squash = 0; // > 0 : écrasé ; < 0 : étiré (rebond du ressort)
    this.squashVel = 0;
    this.nx = 0;
    this.ny = 1;
    this.stretch = 0;
    this.vAngle = 0;
    /** Matrice finale [a, b, c, d] et décalage pour garder le contact avec le sol. */
    this.m = [1, 0, 0, 1];
    this.offsetX = 0;
    this.offsetY = 0;
  }

  reset() {
    this.squash = this.squashVel = this.stretch = 0;
  }

  onImpact(speed, nx, ny) {
    const amount = clamp(speed * this.cfg.squashPerSpeed, 0, this.cfg.squashMax);
    if (amount <= this.squash) return;
    this.squash = amount;
    this.squashVel = 0;
    this.nx = nx;
    this.ny = ny;
  }

  onLaunch() {
    // Détente : le ballon passe d'écrasé à étiré
    this.squashVel = -14;
  }

  /**
   * @param {number} dt
   * @param {{vx:number, vy:number, grounded:boolean, groundNx:number, groundNy:number}} body
   * @param {number} chargeSquash  écrasement cible dû à la charge (0..1 × chargeSquash)
   */
  update(dt, body, chargeSquash) {
    const c = this.cfg;

    // Ressort amorti vers la cible (0, ou écrasement de charge si l'on presse le ballon au sol)
    let target = 0;
    if (chargeSquash > 0 && body.grounded) {
      target = chargeSquash;
      this.nx = body.groundNx;
      this.ny = body.groundNy;
    }
    const steps = Math.max(1, Math.ceil(dt / (1 / 240)));
    const h = dt / steps;
    for (let i = 0; i < steps; i++) {
      const acc = -c.squashStiffness * (this.squash - target) - c.squashDamping * this.squashVel;
      this.squashVel += acc * h;
      this.squash += this.squashVel * h;
    }
    this.squash = clamp(this.squash, -0.25, c.squashMax);

    // Étirement en vol, le long de la vitesse
    const speed = Math.hypot(body.vx, body.vy);
    const stretchTarget = body.grounded ? 0 : clamp(speed * c.stretchPerSpeed, 0, c.stretchMax);
    this.stretch = damp(this.stretch, stretchTarget, 18, dt);
    if (speed > 0.5) this.vAngle = Math.atan2(body.vy, body.vx);

    // Matrice = I + s·(-n nᵀ + ½ t tᵀ) + e·(v vᵀ - ½ w wᵀ)
    const s = this.squash;
    const nx = this.nx;
    const ny = this.ny;
    const vx = Math.cos(this.vAngle);
    const vy = Math.sin(this.vAngle);
    const e = this.stretch;
    // n nᵀ et t tᵀ (t ⟂ n) : t tᵀ = I - n nᵀ
    const a = 1 + s * (-nx * nx + 0.5 * (1 - nx * nx)) + e * (vx * vx - 0.5 * (1 - vx * vx));
    const d = 1 + s * (-ny * ny + 0.5 * (1 - ny * ny)) + e * (vy * vy - 0.5 * (1 - vy * vy));
    const b = s * (-nx * ny - 0.5 * nx * ny) + e * (vx * vy + 0.5 * vx * vy);
    this.m[0] = a;
    this.m[1] = b;
    this.m[2] = b;
    this.m[3] = d;

    // Quand il est écrasé, le ballon reste collé à la surface au lieu de rétrécir vers son centre
    const push = s > 0 ? s : 0;
    this.offsetX = -nx * push;
    this.offsetY = -ny * push;
  }
}
