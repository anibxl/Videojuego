// Transforme les commandes du joueur en mouvement de la balle.
//
// Trois commandes : ◀, ▶ et REBOND.
//
// Déplacement : la balle a de l'inertie. ◀ / ▶ l'accélèrent progressivement ; relâchée, elle
// continue de rouler et ralentit doucement. En l'air, le contrôle est réduit et l'élan conservé.
//
// Rebond : une balle ne rebondit que contre une surface.
//  - Appui quand la balle touche le sol (ou vient de le quitter) → rebond immédiat.
//  - Appui en l'air → mémorisé, le rebond part au prochain contact. On peut donc jouer en rythme.
//  - Chaque rebond enchaîné augmente la puissance d'un niveau (5 niveaux). Sans rebondir pendant
//    ~1,6 s, la puissance redescend progressivement vers le niveau 1.
//  - Même niveau = même hauteur : c'est prévisible et apprenable.
//
// Toute la logique tourne dans le pas fixe de la simulation : elle est déterministe.

import { clamp } from '../core/math.js';

export class BallController {
  /**
   * @param {import('../physics/ball-body.js').BallBody} body
   * @param {object} controls  CONFIG.controls
   * @param {number} gravity
   * @param {import('../core/events.js').EventBus} [events]
   */
  constructor(body, controls, gravity, events = null) {
    this.body = body;
    this.cfg = controls;
    this.events = events;
    this.maxLevel = controls.bounceHeights.length;
    this.velocities = controls.bounceHeights.map((h) => Math.sqrt(2 * gravity * h));
    this.reset();
  }

  reset() {
    this.left = false;
    this.right = false;
    this.level = 1;           // puissance du PROCHAIN rebond (1..maxLevel)
    this.time = 0;
    this.lastBounceTime = -Infinity;
    this._decayAcc = 0;
    this._pendingTtl = 0;
    this._cooldown = 0;
    this.enabled = true;
  }

  get axis() {
    return (this.right ? 1 : 0) - (this.left ? 1 : 0);
  }

  /** Appui sur REBOND. */
  pressBounce() {
    this._pendingTtl = this.cfg.bufferTime;
  }

  get hasPendingBounce() {
    return this._pendingTtl > 0;
  }

  get onGround() {
    return this.body.timeSinceGrounded <= this.cfg.groundGrace;
  }

  get canBounce() {
    return this._cooldown <= 0 && this.body.timeSinceGrounded <= this.cfg.coyoteTime;
  }

  /** Temps restant avant que la puissance commence à redescendre (0 = déjà en train). */
  get decayIn() {
    if (this.level <= 1) return 0;
    return Math.max(0, this.cfg.comboDecayDelay - (this.time - this.lastBounceTime));
  }

  /** À appeler à chaque pas fixe, AVANT body.step(). */
  fixedUpdate(dt) {
    const b = this.body;
    const c = this.cfg;
    this.time += dt;
    if (this._cooldown > 0) this._cooldown -= dt;
    if (!this.enabled) {
      this._pendingTtl = 0;
      return;
    }

    // ── Déplacement horizontal (relatif à la surface si l'on est sur une plateforme mobile)
    const grounded = this.onGround;
    const axis = this.axis;
    const baseVx = grounded ? b.groundVx : 0;
    const rel = b.vx - baseVx;
    let accel;
    let target;
    if (axis !== 0) {
      target = axis * c.maxSpeed;
      accel = grounded ? c.groundAccel : c.airAccel;
      if (rel * axis < 0) accel *= c.turnBoost;
      // Au-delà de la vitesse max (trampoline, pente…), on ne freine pas : on n'accélère juste plus
      if (rel * axis > c.maxSpeed) accel = 0;
    } else {
      target = 0;
      accel = grounded ? c.groundBrake : c.airBrake;
    }
    const maxDelta = accel * dt;
    const newRel = rel + clamp(target - rel, -maxDelta, maxDelta);
    b.vx = baseVx + newRel;
    if (b.grounded) b.angularVelocity = -newRel / b.radius; // roule sans glisser

    // ── La puissance redescend si l'on n'enchaîne plus
    if (this.level > 1 && this.time - this.lastBounceTime > c.comboDecayDelay) {
      this._decayAcc += dt;
      if (this._decayAcc >= c.comboDecayStep) {
        this._decayAcc -= c.comboDecayStep;
        this.level--;
        this.events?.emit('powerDown', { level: this.level });
      }
    } else {
      this._decayAcc = 0;
    }

    // ── Rebond
    if (this._pendingTtl > 0) {
      if (this.canBounce) this._bounce();
      else this._pendingTtl -= dt;
    }
  }

  _bounce() {
    const b = this.body;
    const level = this.level;
    const baseVy = this.onGround ? b.groundVy : 0;
    b.vy = baseVy + this.velocities[level - 1];
    b.timeSinceGrounded = Infinity; // décollage : pas de double rebond
    this._pendingTtl = 0;
    this._cooldown = this.cfg.bounceCooldown;
    this.lastBounceTime = this.time;
    this._decayAcc = 0;
    this.level = Math.min(this.maxLevel, level + 1);
    this.events?.emit('bounce', { level, next: this.level, x: b.x, y: b.y });
  }

  /** Trampoline : propulsion vers le haut, sans toucher à la puissance. */
  launch(velocity) {
    const b = this.body;
    b.vy = Math.max(b.vy, velocity);
    b.timeSinceGrounded = Infinity;
    this._cooldown = this.cfg.bounceCooldown;
  }
}
