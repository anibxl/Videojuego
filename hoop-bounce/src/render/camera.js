// Caméra 2D pour un niveau horizontal.
//  - suit la balle avec un lissage critique (aucun à-coup, aucun dépassement)
//  - anticipe dans le sens de la course : on voit ce qui arrive
//  - zone morte verticale : les rebonds ne secouent pas l'image
//  - reste dans les limites du niveau
//  - secousses sur les gros impacts

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
    this.focus = null; // point à cadrer à la place du ballon (ex. : le panier au moment du panier)
    this.width = 1;
    this.height = 1;
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
    this.focus = null;
    this.trauma = 0;
    this.scale = this.baseScale;
  }

  snap(x, y, bounds) {
    this.focusY = y + this.cfg.focusOffsetY - 0.4;
    this.look = 0;
    const t = this._clamp(x, this.focusY, bounds);
    this.sx.value = this.x = t.x;
    this.sy.value = this.y = t.y;
    this.sx.velocity = this.sy.velocity = 0;
  }

  addTrauma(amount) {
    this.trauma = Math.min(1, this.trauma + amount);
  }

  /**
   * @param {number} dt
   * @param {{x:number, y:number, vx:number, groundY:number}} target  groundY = dernière surface touchée
   * @param {object} bounds
   * @param {number} [smoothScale]  < 1 : suit plus vite (réapparition, téléportation)
   */
  update(dt, target, bounds, smoothScale = 1) {
    const c = this.cfg;
    this.time += dt;
    this.zoom = damp(this.zoom, this.zoomTarget, 3.2, dt);
    this.scale = this.baseScale * this.zoom;

    const lookTarget = clamp(target.vx * c.lookAhead, -c.maxLookAhead, c.maxLookAhead);
    this.look = damp(this.look, lookTarget, 1 / c.lookAheadSmooth, dt);

    // Cadrage vertical façon jeu de plateforme : on garde la surface où l'on se trouve bien
    // visible (au-dessus des commandes), et l'on ne suit la balle que si elle monte haut.
    const ty = Math.max(target.groundY + c.groundLift, target.y - c.followAbove);
    if (ty > this.focusY + c.verticalDeadZone) this.focusY = ty - c.verticalDeadZone;
    else if (ty < this.focusY - c.verticalDeadZone) this.focusY = ty + c.verticalDeadZone;

    const t = this.focus
      ? this._clamp(this.focus.x, this.focus.y, bounds)
      : this._clamp(target.x + this.look, this.focusY, bounds);
    smoothDamp(this.sx, t.x, c.smoothTimeX * smoothScale, dt);
    smoothDamp(this.sy, t.y, c.smoothTimeY * smoothScale, dt);

    this.trauma = Math.max(0, this.trauma - c.shakeDecay * dt);
    const k = this.trauma * this.trauma * c.shakeMax;
    const tt = this.time * 38;
    this.x = this.sx.value + k * (Math.sin(tt * 1.13) + Math.sin(tt * 2.71 + 1.7)) * 0.5;
    this.y = this.sy.value + k * (Math.sin(tt * 1.37 + 0.5) + Math.sin(tt * 3.11 + 2.3)) * 0.5;
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
