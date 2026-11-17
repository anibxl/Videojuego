// Caméra 2D pour un niveau vertical.
//  - toute la largeur du niveau est visible : on ne perd jamais un mur de vue
//  - suit le ballon verticalement avec un lissage critique (aucun à-coup, aucun dépassement)
//  - anticipe vers le haut quand on monte : on voit la prochaine plateforme
//  - zone morte : les petits rebonds au sol ne secouent pas l'image
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
    this.width = 1;
    this.height = 1;
  }

  setViewport(width, height) {
    this.width = width;
    this.height = height;
    this.scale = Math.min(width / this.cfg.viewWidth, height / this.cfg.minViewHeight);
  }

  get halfWidth() {
    return this.width / 2 / this.scale;
  }

  get halfHeight() {
    return this.height / 2 / this.scale;
  }

  snap(x, y, bounds) {
    this.focusY = y + this.cfg.focusOffsetY;
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
   * @param {{x:number, y:number, vy:number}} target
   * @param {{minX:number,maxX:number,minY:number,maxY:number}} bounds
   * @param {number} [smoothScale]  < 1 : suit plus vite (réapparition)
   */
  update(dt, target, bounds, smoothScale = 1) {
    const c = this.cfg;
    this.time += dt;

    const lookTarget = clamp(target.vy * c.lookAheadUp, -c.lookAheadMaxDown, c.lookAheadMaxUp);
    this.look = damp(this.look, lookTarget, 1 / c.lookAheadSmooth, dt);

    const ty = target.y + c.focusOffsetY + this.look;
    if (ty > this.focusY + c.verticalDeadZone) this.focusY = ty - c.verticalDeadZone;
    else if (ty < this.focusY - c.verticalDeadZone) this.focusY = ty + c.verticalDeadZone;

    const t = this._clamp(target.x, this.focusY, bounds);
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

  /** Limites visibles en unités du monde. */
  get top() {
    return this.y + this.halfHeight;
  }

  get bottom() {
    return this.y - this.halfHeight;
  }
}
