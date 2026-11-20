// Caméra 2D pour un niveau horizontal.
//  - suit la balle avec un lissage critique (aucun à-coup, aucun dépassement)
//  - anticipe dans le sens de la course : on voit ce qui arrive
//  - zone morte verticale : les rebonds ne secouent pas l'image
//  - reste dans les limites du niveau
//  - secousses sur les gros impacts
//  - petits zooms : recul quand la balle monte haut (on voit où elle va retomber), « coup de zoom »
//    bref sur les moments forts (rebond à pleine puissance, étoile, panier, éclatement)
//  - étape 18 :
//    · **impulsions directionnelles** amorties (ressort) : l'image « encaisse » un gros atterrissage
//      en s'enfonçant légèrement vers le bas, puis revient — on sent le poids du ballon ;
//    · **regard vers le bas** pendant une grande chute : on voit plus tôt où l'on va atterrir ;
//    · anticipation qui suit aussi la direction demandée (◀ ▶), pas seulement la vitesse ;
//    · **plan d'ouverture** : au début d'un niveau, l'image part un peu plus large et se resserre
//      en douceur sur le ballon ;
//    · secousses plus rondes (mélange de sinus lents) et réduites de 60 % quand le système demande
//      moins d'animations (`prefers-reduced-motion`).

import { clamp, damp, smoothDamp } from '../core/math.js';

export class Camera {
  /** @param {object} cfg CONFIG.camera */
  constructor(cfg) {
    this.cfg = cfg;
    this.sx = { value: 0, velocity: 0 };
    this.sy = { value: 0, velocity: 0 };
    this.focusY = 0;
    this.look = 0;
    this.trauma = 0;
    this.time = 0;
    this.x = 0;
    this.y = 0;
    this.scale = 40; // pixels CSS par unité
    this.baseScale = 40;
    this.zoom = 1;
    this.zoomTarget = 1;
    this.heightZoom = 1;
    this.kickZoom = 0;
    this.kickVel = 0;
    this.focus = null; // point à cadrer à la place du ballon (ex. : le panier au moment du panier)
    this.width = 1;
    this.height = 1;
    // Impulsion directionnelle (ressort 2D, en unités du monde)
    this.offX = 0;
    this.offY = 0;
    this.offVX = 0;
    this.offVY = 0;
    this.lookY = 0;
    /** 1 = normal ; < 1 quand le joueur préfère moins d'animations. */
    this.motionScale = 1;
  }

  setViewport(width, height) {
    this.width = width;
    this.height = height;
    this.baseScale = Math.min(height / this.cfg.viewHeight, width / this.cfg.minViewWidth);
    this.scale = this.baseScale * this.zoom;
  }

  get halfWidth() {
    return this.width / 2 / this.scale;
  }

  get halfHeight() {
    return this.height / 2 / this.scale;
  }

  /** Revient au cadrage normal (nouvelle partie). */
  resetEffects() {
    this.zoom = this.zoomTarget = 1;
    this.heightZoom = 1;
    this.kickZoom = this.kickVel = 0;
    this.focus = null;
    this.trauma = 0;
    this.offX = this.offY = this.offVX = this.offVY = 0;
    this.lookY = 0;
    this.scale = this.baseScale;
  }

  /** Plan d'ouverture : l'image part plus large et se resserre doucement sur le ballon. */
  establish(fromZoom = 0.9) {
    this.zoom = 1 - (1 - fromZoom) * this.motionScale;
    this.zoomTarget = 1;
  }

  /** Impulsion directionnelle (u/s) : l'image est poussée puis revient (ressort amorti). */
  impulse(vx, vy) {
    this.offVX += vx * this.motionScale;
    this.offVY += vy * this.motionScale;
  }

  snap(x, y, bounds) {
    this.focusY = y + this.cfg.focusOffsetY - 0.4;
    this.look = 0;
    const t = this._clamp(x, this.focusY, bounds);
    this.sx.value = this.x = t.x;
    this.sy.value = this.y = t.y;
    this.sx.velocity = this.sy.velocity = 0;
  }

  /** Coup de zoom bref (positif : on s'approche), amorti comme un ressort. */
  kick(amount) {
    this.kickVel += amount * 9 * this.motionScale;
  }

  addTrauma(amount) {
    this.trauma = Math.min(1, this.trauma + amount * this.motionScale);
  }

  /**
   * @param {number} dt
   * @param {{x:number, y:number, vx:number, vy?:number, dir?:number, grounded?:boolean, groundY:number}} target
   *   groundY = dernière surface touchée ; dir = direction demandée (−1, 0, 1)
   * @param {object} bounds
   * @param {number} [smoothScale]  < 1 : suit plus vite (réapparition, téléportation)
   */
  update(dt, target, bounds, smoothScale = 1) {
    const c = this.cfg;
    this.time += dt;
    this.zoom = damp(this.zoom, this.zoomTarget, 3.2, dt);
    // Recul doux quand la balle s'élève loin de sa dernière surface (jusqu'à −9 %)
    const lift = this.focus ? 0 : target.y - target.groundY;
    const hz = 1 - clamp((lift - 2.6) / 5.5, 0, 1) * 0.09;
    this.heightZoom = damp(this.heightZoom, hz, hz < this.heightZoom ? 2.2 : 1.4, dt);
    // Coup de zoom : ressort amorti (pas de saut d'image)
    const steps = Math.max(1, Math.ceil(dt * 240));
    const h = dt / steps;
    for (let i = 0; i < steps; i++) {
      this.kickVel += (-160 * this.kickZoom - 16 * this.kickVel) * h;
      this.kickZoom += this.kickVel * h;
      // Impulsion : ressort un peu plus souple (on voit l'image encaisser puis revenir)
      this.offVX += (-120 * this.offX - 15 * this.offVX) * h;
      this.offVY += (-120 * this.offY - 15 * this.offVY) * h;
      this.offX += this.offVX * h;
      this.offY += this.offVY * h;
    }
    this.scale = this.baseScale * this.zoom * this.heightZoom * (1 + clamp(this.kickZoom, -0.08, 0.1));

    // Anticipation : vitesse + direction demandée (le cadre part dès qu'on appuie)
    const lookTarget = clamp(target.vx * c.lookAhead + (target.dir ?? 0) * 0.5, -c.maxLookAhead, c.maxLookAhead);
    this.look = damp(this.look, lookTarget, 1 / c.lookAheadSmooth, dt);
    // Grande chute : on regarde un peu vers le bas (jusqu'à 1,1 u), pour voir où l'on va atterrir
    const vy = target.vy ?? 0;
    const fallLook = !this.focus && !target.grounded && vy < -9 ? clamp((vy + 9) * 0.07, -1.1, 0) : 0;
    this.lookY = damp(this.lookY, fallLook, fallLook < this.lookY ? 3 : 2, dt);

    // Cadrage vertical façon jeu de plateforme : on garde la surface où l'on se trouve bien
    // visible (au-dessus des commandes), et l'on ne suit la balle que si elle monte haut.
    const ty = Math.max(target.groundY + c.groundLift, target.y - c.followAbove);
    if (ty > this.focusY + c.verticalDeadZone) this.focusY = ty - c.verticalDeadZone;
    else if (ty < this.focusY - c.verticalDeadZone) this.focusY = ty + c.verticalDeadZone;

    const t = this.focus
      ? this._clamp(this.focus.x, this.focus.y, bounds)
      : this._clamp(target.x + this.look, this.focusY + this.lookY, bounds);
    smoothDamp(this.sx, t.x, c.smoothTimeX * smoothScale, dt);
    smoothDamp(this.sy, t.y, c.smoothTimeY * smoothScale, dt);

    this.trauma = Math.max(0, this.trauma - c.shakeDecay * dt);
    const k = this.trauma * this.trauma * c.shakeMax;
    const tt = this.time * 30;
    // Secousse : trois sinus de fréquences sans rapport simple → mouvement organique, jamais mécanique
    const nx = Math.sin(tt * 1.13) * 0.5 + Math.sin(tt * 2.71 + 1.7) * 0.32 + Math.sin(tt * 4.3 + 0.4) * 0.18;
    const ny = Math.sin(tt * 1.37 + 0.5) * 0.5 + Math.sin(tt * 3.11 + 2.3) * 0.32 + Math.sin(tt * 4.9 + 1.1) * 0.18;
    this.x = this.sx.value + k * nx + this.offX;
    this.y = this.sy.value + k * ny + this.offY;
  }

  _clamp(x, y, b) {
    const hw = this.halfWidth;
    const hh = this.halfHeight;
    const cx = b.maxX - b.minX <= hw * 2 ? (b.minX + b.maxX) / 2 : clamp(x, b.minX + hw, b.maxX - hw);
    const cy = b.maxY - b.minY <= hh * 2 ? b.minY + hh : clamp(y, b.minY + hh, b.maxY - hh);
    return { x: cx, y: cy };
  }

  worldToScreenX(x) {
    return (x - this.x) * this.scale + this.width / 2;
  }

  worldToScreenY(y) {
    return this.height / 2 - (y - this.y) * this.scale;
  }
}
