// Transforme les intentions du joueur en mouvement du ballon.
//
// Trois actions seulement :
//  - aller à gauche / à droite : `axis` entre -1 et 1 ;
//  - rebondir : `requestBounce()`.
//
// Règles :
//  - Le déplacement est très réactif : forte accélération, demi-tour encore plus vif.
//    En l'air on garde son élan (freinage faible), au sol on s'arrête vite.
//  - Au sol, le ballon roule sans glisser (sa rotation suit exactement sa vitesse).
//  - Un rebond donne toujours la même poussée verticale : c'est prévisible et apprenable.
//    Si l'on monte déjà, la poussée s'ajoute en partie (taper au sommet du saut rapporte le plus).
//  - Chaque rebond consomme un cran de jauge. La jauge se recharge progressivement
//    quand le ballon est au sol ou sur une plateforme.
//
// Toute la logique tourne dans le pas fixe de la simulation : elle est déterministe.

import { clamp } from '../core/math.js';

export class BallController {
  /**
   * @param {import('../physics/ball-body.js').BallBody} body
   * @param {object} controls  CONFIG.controls
   * @param {import('../core/events.js').EventBus} [events]
   */
  constructor(body, controls, events = null) {
    this.body = body;
    this.cfg = controls;
    this.events = events;
    this.cost = 1 / controls.gaugeSegments;
    this.reset();
  }

  reset() {
    this.axis = 0;
    this.gauge = 1;
    this.airBounces = 0;
    this._bounceQueued = false;
    this.enabled = true;
  }

  setAxis(axis) {
    this.axis = clamp(axis, -1, 1);
  }

  requestBounce() {
    this._bounceQueued = true;
  }

  /** Nombre de rebonds disponibles tout de suite. */
  get bouncesAvailable() {
    return Math.floor(this.gauge / this.cost + 1e-6);
  }

  get onGround() {
    return this.body.timeSinceGrounded <= this.cfg.groundGrace;
  }

  /** À appeler à chaque pas fixe, AVANT body.step(). */
  fixedUpdate(dt) {
    const b = this.body;
    const c = this.cfg;
    if (!this.enabled) {
      this._bounceQueued = false;
      return;
    }
    const grounded = this.onGround;
    if (b.grounded) this.airBounces = 0;

    // ── Déplacement horizontal (relatif à la surface si l'on est sur une plateforme mobile)
    const baseVx = grounded ? b.groundVx : 0;
    const rel = b.vx - baseVx;
    const target = this.axis * c.maxSpeed;
    let accel;
    if (this.axis !== 0) {
      accel = grounded ? c.groundAccel : c.airAccel;
      if (rel * this.axis < 0) accel *= c.turnBoost;
      accel *= Math.abs(this.axis) < 1 ? 0.6 + 0.4 * Math.abs(this.axis) : 1;
    } else {
      accel = grounded ? c.groundBrake : c.airBrake;
    }
    const maxDelta = accel * dt;
    const newRel = rel + clamp(target - rel, -maxDelta, maxDelta);
    b.vx = baseVx + newRel;
    // Au sol : roulement parfait, la rotation suit la vitesse
    if (b.grounded) b.angularVelocity = -newRel / b.radius;

    // ── Recharge de la jauge
    if (b.timeSinceGrounded <= c.rechargeGrace && this.gauge < 1) {
      const before = this.bouncesAvailable;
      this.gauge = Math.min(1, this.gauge + c.rechargeRate * dt);
      if (this.bouncesAvailable > before) this.events?.emit('gaugeSegment', { count: this.bouncesAvailable, full: this.gauge >= 1 });
    }

    // ── Rebond
    if (this._bounceQueued) {
      this._bounceQueued = false;
      if (this.gauge >= this.cost - 1e-6) {
        this.gauge = Math.max(0, this.gauge - this.cost);
        const air = !grounded;
        if (air) this.airBounces++;
        const baseVy = grounded ? b.groundVy : 0;
        const vy = b.vy - baseVy;
        b.vy = baseVy + Math.max(c.bounceVelocity, vy + c.bounceVelocity * c.bounceCarry);
        b.timeSinceGrounded = Infinity; // décollage : plus de recharge ni de contrôle « au sol »
        this.events?.emit('bounce', { air, index: this.airBounces, x: b.x, y: b.y, gauge: this.gauge });
      } else {
        this.events?.emit('bounceDenied', { x: b.x, y: b.y });
      }
    }
  }

  /** Tremplin : propulsion gratuite (ne consomme pas la jauge). */
  launchFromPad(velocity) {
    const b = this.body;
    b.vy = Math.max(b.vy, velocity);
    b.timeSinceGrounded = Infinity;
    this.airBounces = 0;
  }
}
