// Corps physique du ballon : un disque rigide avec rotation.
//
// Intégration : Euler semi-implicite, pas fixe découpé en sous-pas adaptatifs
// (le ballon ne parcourt jamais plus de 20 % de son rayon par sous-pas : aucune traversée possible).
// Contacts : correction de position + impulsions normale (rebond) et tangentielle (frottement de Coulomb).
// Le frottement couple translation et rotation : le ballon roule, prend de l'effet,
// et un tir avec effet arrière « mord » le cercle ou la planche comme en vrai.

import { clamp, closestPointOnSegment } from '../core/math.js';

const MAX_CONTACTS = 8;

export class BallBody {
  /**
   * @param {object} opts
   * @param {number} opts.radius
   * @param {number} opts.inertiaFactor  I = inertiaFactor · m · r²
   * @param {object} opts.physics        CONFIG.physics
   */
  constructor({ radius, inertiaFactor, physics }) {
    this.radius = radius;
    this.inertiaFactor = inertiaFactor;
    this.cfg = physics;

    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.angle = 0;
    this.angularVelocity = 0; // rad/s, positif = sens trigonométrique

    /** Multiplicateur de rebond appliqué aux contacts « sol » (utilisé pendant la charge). */
    this.groundBounceScale = 1;

    // État de contact du dernier pas
    this.grounded = false;
    this.groundNx = 0;
    this.groundNy = 1;
    this.timeSinceGrounded = Infinity;

    /** Contacts du dernier pas (un par forme, impact max). Objets réutilisés. */
    this.contacts = [];
    this.contactCount = 0;
    for (let i = 0; i < MAX_CONTACTS; i++) {
      this.contacts.push({ collider: null, nx: 0, ny: 0, px: 0, py: 0, impactSpeed: 0, slipSpeed: 0 });
    }

    this._tmp = { x: 0, y: 0, t: 0 };
    this._groundThisStep = false;
  }

  reset(x, y) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.angle = 0;
    this.angularVelocity = 0;
    this.grounded = false;
    this.timeSinceGrounded = Infinity;
    this.contactCount = 0;
  }

  copyFrom(o) {
    this.x = o.x;
    this.y = o.y;
    this.vx = o.vx;
    this.vy = o.vy;
    this.angle = o.angle;
    this.angularVelocity = o.angularVelocity;
    this.groundBounceScale = o.groundBounceScale;
    this.grounded = o.grounded;
    this.groundNx = o.groundNx;
    this.groundNy = o.groundNy;
    this.timeSinceGrounded = o.timeSinceGrounded;
    this.contactCount = 0;
  }

  get speed() {
    return Math.hypot(this.vx, this.vy);
  }

  /** Avance la simulation de `dt` secondes. */
  step(world, dt) {
    this.contactCount = 0;
    this._groundThisStep = false;

    const travel = this.speed * dt;
    const maxTravel = this.radius * this.cfg.maxSubstepTravel;
    const n = clamp(Math.ceil(travel / maxTravel), 1, this.cfg.maxSubsteps);
    const h = dt / n;
    for (let i = 0; i < n; i++) this._substep(world, h);

    this.grounded = this._groundThisStep;
    this.timeSinceGrounded = this.grounded ? 0 : this.timeSinceGrounded + dt;
  }

  _substep(world, h) {
    const cfg = this.cfg;

    // Forces : gravité + légers frottements de l'air
    this.vy -= world.gravity * h;
    const drag = 1 - cfg.airDrag * h;
    this.vx *= drag;
    this.vy *= drag;
    this.angularVelocity *= 1 - cfg.angularDrag * h;

    // Intégration
    this.x += this.vx * h;
    this.y += this.vy * h;
    this.angle += this.angularVelocity * h;

    // Contacts
    let groundedNow = false;
    for (let iter = 0; iter < cfg.solverIterations; iter++) {
      let any = false;
      for (const c of world.colliders) {
        const res = this._resolve(c);
        if (res) {
          any = true;
          if (res === 2) groundedNow = true;
        }
      }
      if (!any) break;
    }

    if (groundedNow) {
      this._groundThisStep = true;
      // Résistance au roulement : le ballon finit par s'arrêter.
      const k = 1 - cfg.rollingResistance * h;
      const tx = -this.groundNy;
      const ty = this.groundNx;
      const vt = this.vx * tx + this.vy * ty;
      this.vx -= tx * vt * (1 - k);
      this.vy -= ty * vt * (1 - k);
      this.angularVelocity *= k;
    }
  }

  /**
   * Résout le contact avec une capsule.
   * @returns {0|1|2} 0 = pas de contact, 1 = contact, 2 = contact « sol »
   */
  _resolve(c) {
    const R = this.radius;
    // Élimination rapide par boîte englobante
    if (this.x + R < c.minX || this.x - R > c.maxX || this.y + R < c.minY || this.y - R > c.maxY) return 0;

    const q = closestPointOnSegment(this.x, this.y, c.ax, c.ay, c.bx, c.by, this._tmp);
    let dx = this.x - q.x;
    let dy = this.y - q.y;
    const minDist = R + c.r;
    const d2 = dx * dx + dy * dy;
    if (d2 >= minDist * minDist) return 0;

    let nx;
    let ny;
    const d = Math.sqrt(d2);
    if (d > 1e-9) {
      nx = dx / d;
      ny = dy / d;
    } else {
      nx = c.nx;
      ny = c.ny;
    }

    // 1) Correction de position : on sort le ballon de la forme.
    const pen = minDist - d;
    this.x += nx * pen;
    this.y += ny * pen;

    const isGround = ny >= this.cfg.groundNormalMinY;
    if (isGround) {
      this.groundNx = nx;
      this.groundNy = ny;
    }

    // 2) Vitesse du point de contact : v + ω × r, avec r = -n·R
    const rx = -nx * R;
    const ry = -ny * R;
    const w = this.angularVelocity;
    const vcx = this.vx - w * ry;
    const vcy = this.vy + w * rx;
    const vn = vcx * nx + vcy * ny;

    const tx = -ny;
    const ty = nx;
    const vt = vcx * tx + vcy * ty;

    if (vn < 0) {
      // Rebond (impulsion par unité de masse)
      const mat = c.material;
      let e = -vn > this.cfg.restVelocity ? mat.restitution : 0;
      if (isGround) e *= this.groundBounceScale;
      const jn = -(1 + e) * vn;

      // Frottement : impulsion qui annulerait le glissement, bornée par μ·jn (Coulomb).
      // Masse effective tangentielle d'un disque : 1 / (1/m + R²/I) = m / (1 + 1/k)
      const k = this.inertiaFactor;
      const maxJt = mat.friction * jn;
      const jt = clamp(-vt / (1 + 1 / k), -maxJt, maxJt);

      this.vx += jn * nx + jt * tx;
      this.vy += jn * ny + jt * ty;
      // Couple : r × (jt·t) / I
      this.angularVelocity += (rx * (jt * ty) - ry * (jt * tx)) / (k * R * R);

      this._recordContact(c, nx, ny, q.x, q.y, -vn, Math.abs(vt));
    }

    return isGround ? 2 : 1;
  }

  _recordContact(c, nx, ny, px, py, impactSpeed, slipSpeed) {
    for (let i = 0; i < this.contactCount; i++) {
      const k = this.contacts[i];
      if (k.collider === c) {
        if (impactSpeed > k.impactSpeed) {
          k.impactSpeed = impactSpeed;
          k.nx = nx;
          k.ny = ny;
          k.px = px;
          k.py = py;
        }
        if (slipSpeed > k.slipSpeed) k.slipSpeed = slipSpeed;
        return;
      }
    }
    if (this.contactCount >= MAX_CONTACTS) return;
    const k = this.contacts[this.contactCount++];
    k.collider = c;
    k.nx = nx;
    k.ny = ny;
    k.px = px;
    k.py = py;
    k.impactSpeed = impactSpeed;
    k.slipSpeed = slipSpeed;
  }
}
