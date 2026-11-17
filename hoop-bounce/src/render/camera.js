// Caméra 2D : suit le ballon en douceur.
//  - lissage critique (aucun à-coup, aucun dépassement)
//  - anticipation dans le sens du mouvement : on voit où l'on va
//  - zone morte verticale : les petits rebonds ne secouent pas l'image
//  - reste dans les limites du niveau
//  - léger zoom pendant la charge et secousses sur les gros impacts

import { clamp, damp, smoothDamp } from '../core/math.js';

export class Camera {
  /** @param {object} cfg CONFIG.camera */
  constructor(cfg) {
    this.cfg = cfg;
    this.sx = { value: 0, velocity: 0 };
    this.sy = { value: 0, velocity: 0 };
    this.focusY = 0;
    this.lookX = 0;
    this.zoom = 1;
    this.trauma = 0;
    this.time = 0;

    // Résultat utilisé pour le rendu
    this.x = 0;
    this.y = 0;
    this.scale = 50; // pixels CSS par unité
    this.width = 1;
    this.height = 1;
  }

  setViewport(width, height) {
    this.width = width;
    this.height = height;
    this._updateScale();
  }

  _updateScale() {
    this.scale = (Math.min(this.width, this.height) / this.cfg.viewMin) * this.zoom;
  }

  get halfWidth() {
    return this.width / 2 / this.scale;
  }

  get halfHeight() {
    return this.height / 2 / this.scale;
  }

  /** Place la caméra instantanément (début de partie, réapparition). */
  snap(x, y, bounds) {
    this.focusY = y + this.cfg.focusOffsetY;
    this.lookX = 0;
    const t = this._clampToBounds(x, this.focusY, bounds);
    this.sx.value = t.x;
    this.sy.value = t.y;
    this.sx.velocity = this.sy.velocity = 0;
    this.x = t.x;
    this.y = t.y;
  }

  addTrauma(amount) {
    this.trauma = Math.min(1, this.trauma + amount);
  }

  /**
   * @param {number} dt
   * @param {{x:number, y:number, vx:number}} target
   * @param {{minX:number,maxX:number,minY:number,maxY:number}} bounds
   * @param {number} charge  0..1 (0 si pas de charge)
   */
  update(dt, target, bounds, charge) {
    const c = this.cfg;
    this.time += dt;

    this.zoom = damp(this.zoom, 1 + c.chargeZoom * charge, 6, dt);
    this._updateScale();

    const lookTarget = clamp(target.vx * c.lookAhead, -c.maxLookAhead, c.maxLookAhead);
    this.lookX = damp(this.lookX, lookTarget, 1 / c.lookAheadSmooth, dt);

    const ty = target.y + c.focusOffsetY;
    if (ty > this.focusY + c.verticalDeadZone) this.focusY = ty - c.verticalDeadZone;
    else if (ty < this.focusY - c.verticalDeadZone) this.focusY = ty + c.verticalDeadZone;

    const t = this._clampToBounds(target.x + this.lookX, this.focusY, bounds);
    smoothDamp(this.sx, t.x, c.smoothTimeX, dt);
    smoothDamp(this.sy, t.y, c.smoothTimeY, dt);

    // Secousses : bruit lisse, amplitude ∝ trauma²
    this.trauma = Math.max(0, this.trauma - c.shakeDecay * dt);
    const k = this.trauma * this.trauma * c.shakeMax;
    const tt = this.time * 38;
    const shakeX = k * (Math.sin(tt * 1.13) + Math.sin(tt * 2.71 + 1.7)) * 0.5;
    const shakeY = k * (Math.sin(tt * 1.37 + 0.5) + Math.sin(tt * 3.11 + 2.3)) * 0.5;

    this.x = this.sx.value + shakeX;
    this.y = this.sy.value + shakeY;
  }

  _clampToBounds(x, y, b) {
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
