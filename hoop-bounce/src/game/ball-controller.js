// Transforme l'intention du joueur (appuyer / relâcher) en saut du ballon.
//
// Règles :
//  - Appuyer démarre la charge ; plus on maintient, plus le saut sera haut.
//  - Relâcher demande un saut. S'il touche le sol (ou vient de le quitter : « coyote time »),
//    le ballon part immédiatement. Sinon la demande est gardée un court instant et
//    le saut part au prochain contact (« input buffer ») : aucune pression n'est perdue.
//  - Pendant la charge, le ballon est « pressé » contre le sol : ses rebonds sont amortis,
//    il se pose vite et le saut part d'une position stable et prévisible.
//  - Le saut remplace la vitesse du ballon : même charge = même trajectoire. C'est ce qui rend
//    le contrôle précis et apprenable.
//
// Toute la logique tourne dans le pas fixe de la simulation : elle est déterministe.

import { clamp, lerp } from '../core/math.js';

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
    this.gravity = gravity;
    this.events = events;

    this.charging = false;
    this.chargeTime = 0;
    this.direction = 1; // +1 droite, -1 gauche
    this._reachedMax = false;

    this._pendingCharge = -1; // charge en attente de lancement (-1 = aucune)
    this._pendingTtl = 0;
    this._cooldown = 0;

    const a = (controls.launchAngleDeg * Math.PI) / 180;
    this._tanAngle = Math.tan(a);
  }

  reset() {
    this.charging = false;
    this.chargeTime = 0;
    this._pendingCharge = -1;
    this._cooldown = 0;
    this._reachedMax = false;
    this.body.groundBounceScale = 1;
  }

  /** Début d'appui. */
  press(direction) {
    this.charging = true;
    this.chargeTime = 0;
    this._reachedMax = false;
    this._pendingCharge = -1; // un nouvel appui annule une demande en attente
    this.setDirection(direction);
    this.events?.emit('chargeStart', { direction: this.direction });
  }

  setDirection(direction) {
    if (direction === 1 || direction === -1) this.direction = direction;
  }

  /** Fin d'appui : demande de saut avec la charge accumulée. */
  release() {
    if (!this.charging) return;
    this.charging = false;
    this._pendingCharge = this.charge;
    this._pendingTtl = this.cfg.launchBuffer;
  }

  /** Annule l'appui sans sauter (ex. : l'application passe en arrière-plan). */
  cancel() {
    this.charging = false;
    this._pendingCharge = -1;
  }

  /** Charge mise en forme, entre 0 et 1. */
  get charge() {
    const c = clamp(this.chargeTime / this.cfg.chargeTime, 0, 1);
    return 1 - Math.pow(1 - c, this.cfg.chargeCurve);
  }

  get hasPendingLaunch() {
    return this._pendingCharge >= 0;
  }

  get canLaunch() {
    return this._cooldown <= 0 && this.body.timeSinceGrounded <= this.cfg.coyoteTime;
  }

  /** Vitesse de lancement pour une charge (0..1) et une direction. */
  launchVelocity(charge, direction, out = { vx: 0, vy: 0, w: 0 }) {
    const h = lerp(this.cfg.minJumpHeight, this.cfg.maxJumpHeight, clamp(charge, 0, 1));
    const vy = Math.sqrt(2 * this.gravity * h);
    out.vx = (direction * vy) / this._tanAngle;
    out.vy = vy;
    out.w = direction * this.cfg.backspin; // effet arrière
    return out;
  }

  /** À appeler à chaque pas fixe, AVANT body.step(). */
  fixedUpdate(dt) {
    if (this._cooldown > 0) this._cooldown -= dt;

    if (this.charging) {
      this.chargeTime += dt;
      if (!this._reachedMax && this.chargeTime >= this.cfg.chargeTime) {
        this._reachedMax = true;
        this.events?.emit('chargeMax', {});
      }
    }
    this.body.groundBounceScale = this.charging ? this.cfg.chargeBounceScale : 1;

    if (this._pendingCharge >= 0) {
      if (this.canLaunch) {
        this._launch(this._pendingCharge);
      } else {
        this._pendingTtl -= dt;
        if (this._pendingTtl <= 0) this._pendingCharge = -1;
      }
    }
  }

  _launch(charge) {
    const v = this.launchVelocity(charge, this.direction);
    const b = this.body;
    b.vx = v.vx;
    b.vy = v.vy;
    b.angularVelocity = v.w;
    b.timeSinceGrounded = Infinity; // pas de double saut grâce au coyote time
    this._pendingCharge = -1;
    this._cooldown = this.cfg.launchCooldown;
    this.events?.emit('launch', { charge, direction: this.direction, x: b.x, y: b.y });
  }
}
