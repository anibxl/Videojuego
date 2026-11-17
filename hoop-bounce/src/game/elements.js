// Éléments de gameplay qui ne sont pas de simples blocs : portes, ventilateurs, téléporteurs.

import { updateBounds } from '../physics/colliders.js';
import { clamp } from '../core/math.js';

const smoothstep = (t) => t * t * (3 - 2 * t);
const dSmoothstep = (t) => 6 * t * (1 - t);

/**
 * Porte coulissante : bloc solide qui glisse vers sa position ouverte quand on l'active.
 * Sa vitesse est connue exactement à chaque instant (collisions et entraînement corrects).
 */
export class Door {
  constructor(def, colliders) {
    this.id = def.id;
    this.def = def;
    this.colliders = colliders;
    this.base = colliders.map((c) => ({ ax: c.ax, ay: c.ay, bx: c.bx, by: c.by }));
    this.duration = def.duration ?? 0.7;
    this.reset();
  }

  reset() {
    this.opening = false;
    this.progress = 0;
    this.offsetX = 0;
    this.offsetY = 0;
    this._apply(0, 0, 0, 0);
  }

  open() {
    if (this.opening) return false;
    this.opening = true;
    return true;
  }

  get isOpen() {
    return this.progress >= 1;
  }

  update(dt) {
    if (!this.opening || this.progress >= 1) {
      for (const c of this.colliders) c.vx = c.vy = 0;
      return;
    }
    this.progress = Math.min(1, this.progress + dt / this.duration);
    const k = smoothstep(this.progress);
    const dk = this.progress >= 1 ? 0 : dSmoothstep(this.progress) / this.duration;
    const { dx, dy } = this.def.open;
    this._apply(dx * k, dy * k, dx * dk, dy * dk);
  }

  _apply(ox, oy, vx, vy) {
    this.offsetX = ox;
    this.offsetY = oy;
    for (let i = 0; i < this.colliders.length; i++) {
      const c = this.colliders[i];
      const b = this.base[i];
      c.ax = b.ax + ox;
      c.ay = b.ay + oy;
      c.bx = b.bx + ox;
      c.by = b.by + oy;
      c.vx = vx;
      c.vy = vy;
      updateBounds(c);
    }
  }
}

/**
 * Ventilateur : souffle vers le haut dans une colonne. La poussée est maximale à la sortie
 * du ventilateur et s'annule en haut de la colonne : la balle finit par flotter à une hauteur
 * d'équilibre, qu'on peut dépasser avec de l'élan.
 */
export class Fan {
  constructor(def) {
    this.def = def;
    this.x = def.x;
    this.y = def.y;
    this.w = def.w;
    this.h = def.h;
    this.strength = def.strength;
    this.on = def.on ?? true;
    this.spin = 0;
  }

  /** Accélération verticale subie par une balle en (x, y) de rayon r (0 hors du souffle). */
  accelAt(x, y, r) {
    if (!this.on) return 0;
    if (x + r * 0.5 < this.x || x - r * 0.5 > this.x + this.w) return 0;
    const t = (y - this.y) / this.h;
    if (t < -0.2 || t > 1) return 0;
    return this.strength * (1 - clamp(t, 0, 1));
  }

  contains(x, y, r) {
    return this.accelAt(x, y, r) > 0;
  }
}

/**
 * Téléporteur à sens unique : entrer dans le portail A fait ressortir par le portail B,
 * avec la même vitesse. B est neutralisé tant que la balle n'en est pas sortie.
 */
export class Teleporter {
  constructor(def) {
    this.def = def;
    this.a = { x: def.a.x, y: def.a.y };
    this.b = { x: def.b.x, y: def.b.y };
    this.r = def.r ?? 0.75;
    this.cooldown = 0;
    this.lastUse = -Infinity;
  }

  /** La balle (centre) est-elle entrée dans le portail A ? */
  entered(x, y) {
    if (this.cooldown > 0) return false;
    const dx = x - this.a.x;
    const dy = y - this.a.y;
    return dx * dx + dy * dy < (this.r * 0.75) ** 2;
  }
}
