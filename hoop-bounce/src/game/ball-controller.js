// Transforme les commandes du joueur en mouvement du ballon.
//
// Trois commandes : ◀, ▶ et REBOND.
//
// Déplacement : de l'inertie, mais une réponse vive. En l'air, contrôle réduit et élan conservé.
//
// REBOND — le principe du dribble. Chaque pression a un effet immédiat :
//  - ballon au sol (ou qui vient de le quitter) → il rebondit tout de suite ;
//  - ballon en l'air → il est renvoyé vers le sol d'un coup sec (comme une main qui dribble)
//    et rebondit dès qu'il le touche.
// Chaque rebond déclenché par le joueur monte la puissance d'un niveau (5 niveaux) : en tapant
// vite, on enchaîne de petits dribbles qui chargent la puissance, puis on laisse partir le grand
// rebond. Quand le ballon reste au sol quelques instants, la puissance redescend progressivement.
// Même niveau = même hauteur : c'est prévisible, donc maîtrisable.
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
    this.setGravity(gravity);
    this.reset();
  }

  /**
   * Gravité du niveau (monde Espace : gravité réduite). `heightScale` agrandit les rebonds
   * en proportion : les 5 niveaux de puissance gardent le même rapport entre eux.
   */
  setGravity(gravity, heightScale = 1) {
    this.gravity = gravity;
    this.velocities = this.cfg.bounceHeights.map((h) => Math.sqrt(2 * gravity * h * heightScale));
  }

  /** Annule un dribble en cours (le ballon vient d'attraper une liane). */
  cancelSlam() {
    this._pending = false;
  }

  /** Consomme un appui en attente (une liane l'utilise pour lâcher prise au lieu de dribbler). */
  takePress() {
    const had = this._pressQueued;
    this._pressQueued = false;
    return had;
  }

  reset() {
    this.left = false;
    this.right = false;
    this.level = 1;           // puissance du PROCHAIN rebond (1..maxLevel)
    this.time = 0;
    this.restTime = 0;        // temps passé posé au sol sans rebondir
    this._decayAcc = 0;
    this._pressQueued = false;
    this._pending = false;    // rebond à déclencher au prochain contact
    this._cooldown = 0;
    this.enabled = true;
  }

  get axis() {
    return (this.right ? 1 : 0) - (this.left ? 1 : 0);
  }

  /** Appui sur REBOND (traité au pas de simulation suivant). */
  pressBounce() {
    this._pressQueued = true;
  }

  get hasPendingBounce() {
    return this._pending;
  }

  get onGround() {
    return this.body.timeSinceGrounded <= this.cfg.groundGrace;
  }

  get canBounce() {
    return this._cooldown <= 0 && this.body.timeSinceGrounded <= this.cfg.coyoteTime;
  }

  /** Temps restant avant que la puissance commence à redescendre (Infinity si en l'air). */
  get decayIn() {
    if (this.level <= 1 || this.restTime <= 0) return Infinity;
    return Math.max(0, this.cfg.restDelay - this.restTime);
  }

  /** À appeler à chaque pas fixe, AVANT body.step(). */
  fixedUpdate(dt) {
    const b = this.body;
    const c = this.cfg;
    this.time += dt;
    if (this._cooldown > 0) this._cooldown -= dt;
    if (!this.enabled) {
      this._pressQueued = false;
      this._pending = false;
      return;
    }

    // ── Déplacement horizontal (relatif à la surface si l'on est sur une plateforme mobile)
    const grounded = this.onGround;
    const axis = this.axis;
    // Adhérence de la surface (glace < 1) : on accélère et on freine moins vite
    const grip = grounded ? (b.groundMaterial?.grip ?? 1) : 1;
    const baseVx = grounded ? b.groundVx : 0;
    const rel = b.vx - baseVx;
    let accel;
    let target;
    if (axis !== 0) {
      target = axis * c.maxSpeed;
      accel = grounded ? c.groundAccel * grip : c.airAccel;
      if (rel * axis < 0) accel *= c.turnBoost;
      // Au-delà de la vitesse max (trampoline, pente…), on ne freine pas : on n'accélère juste plus
      if (rel * axis > c.maxSpeed) accel = 0;
    } else {
      target = 0;
      accel = grounded ? c.groundBrake * grip : c.airBrake;
    }
    const maxDelta = accel * dt;
    const newRel = rel + clamp(target - rel, -maxDelta, maxDelta);
    b.vx = baseVx + newRel;
    if (b.grounded) b.angularVelocity = (-newRel / b.radius) * b.gravitySign; // roule sans glisser

    // ── Appui sur REBOND
    if (this._pressQueued) {
      this._pressQueued = false;
      if (this.canBounce) {
        this._bounce();
      } else if (!this._pending) {
        // En l'air : on renvoie le ballon vers le sol, il rebondira au contact
        this._pending = true;
        const sign = b.gravitySign;
        if (b.vy * sign > -c.slamSpeed) b.vy = -c.slamSpeed * sign;
        this.events?.emit('slam', { x: b.x, y: b.y, level: this.level });
      }
    }
    if (this._pending && this.canBounce) this._bounce();

    // ── La puissance redescend si le ballon reste au sol
    if (b.timeSinceGrounded <= c.restHopGrace && !this._pending) this.restTime += dt;
    else this.restTime = 0;
    if (this.level > 1 && this.restTime > c.restDelay) {
      this._decayAcc += dt;
      if (this._decayAcc >= c.restStep) {
        this._decayAcc -= c.restStep;
        this.level--;
        this.events?.emit('powerDown', { level: this.level });
      }
    } else {
      this._decayAcc = 0;
    }
  }

  _bounce() {
    const b = this.body;
    const level = this.level;
    const baseVy = this.onGround ? b.groundVy : 0;
    b.vy = baseVy + this.velocities[level - 1] * b.gravitySign;
    b.timeSinceGrounded = Infinity; // décollage : pas de double rebond
    this._pending = false;
    this._cooldown = this.cfg.bounceCooldown;
    this.restTime = 0;
    this._decayAcc = 0;
    this.level = Math.min(this.maxLevel, level + 1);
    this.events?.emit('bounce', { level, next: this.level, x: b.x, y: b.y });
  }

  /** Trampoline : propulsion vers le haut, sans toucher à la puissance. */
  launch(velocity) {
    const b = this.body;
    if (b.gravitySign < 0) b.vy = Math.min(b.vy, -velocity);
    else b.vy = Math.max(b.vy, velocity);
    b.timeSinceGrounded = Infinity;
    this._pending = false;
    this._cooldown = this.cfg.bounceCooldown;
  }
}
