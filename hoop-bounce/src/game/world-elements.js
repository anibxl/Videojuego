// Éléments propres aux mondes (étape 7). Aucune dépendance au navigateur.
//
//  VILLE   caisse à pousser
//  NEIGE   vent de neige, stalactites qui tombent (glace et rampes = matériaux, voir level.js)
//  VOLCAN  lave, plateformes qui s'effondrent, geysers de feu, chutes de pierres
//  FORÊT   lianes (champignons, troncs et branches = trampolines / éléments mobiles, voir level.js)
//  ESPACE  zones de gravité inversée (gravité réduite = réglage du niveau, portails = téléporteurs)
//
// Les éléments périodiques (geysers, chutes de pierres) sont de pures fonctions du temps du niveau :
// ils sont parfaitement prévisibles, donc maîtrisables, et rejouables à l'identique dans les tests.

import { updateBounds } from '../physics/colliders.js';
import { clamp } from '../core/math.js';

const EPS = 1e-6;

/** Position dans un cycle périodique (0..period), décalée de `phase` (fraction de période). */
export function cycleTime(time, period, phase = 0) {
  const u = (time / period + phase) % 1;
  return (u < 0 ? u + 1 : u) * period;
}

function distToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const l2 = dx * dx + dy * dy;
  const t = l2 > 0 ? clamp(((px - ax) * dx + (py - ay) * dy) / l2, 0, 1) : 0;
  return Math.hypot(px - (ax + dx * t), py - (ay + dy * t));
}

// ─── VILLE : caisse à pousser ────────────────────────────────────────────────

/**
 * Caisse : un bloc lourd soumis à la gravité, qui glisse quand le ballon la pousse.
 * Elle entre en collision avec les blocs rectangulaires du niveau (sol, murs, plateformes) ;
 * le ballon peut monter dessus (elle sert de marche) et elle l'entraîne quand elle glisse.
 */
export class Crate {
  constructor(def, colliders, boxes, cfg) {
    this.def = def;
    this.w = def.w ?? 1.2;
    this.h = def.h ?? 1.2;
    this.colliders = colliders;
    for (const c of colliders) c.crate = this;
    this.boxes = boxes;
    this.cfg = cfg;
    this.base = colliders.map((c) => ({ ax: c.ax - def.x, ay: c.ay - def.y, bx: c.bx - def.x, by: c.by - def.y }));
    this.reset();
  }

  reset() {
    this.x = this.def.x;
    this.y = this.def.y;
    this.vx = 0;
    this.vy = 0;
    this.grounded = false;
    this.pushDir = 0;
    this.sliding = 0;
    this._apply();
  }

  /** Le ballon pousse la caisse (dir = ±1) pendant ce pas. */
  push(dir) {
    this.pushDir = dir;
  }

  /** Choc du ballon sur le côté : un peu d'élan transmis (la caisse est bien plus lourde). */
  hit(dir, speed) {
    const c = this.cfg;
    this.vx = clamp(this.vx + dir * speed * c.impactTransfer, -c.pushSpeed * 1.5, c.pushSpeed * 1.5);
  }

  step(dt, gravity, fallLimit) {
    const c = this.cfg;
    if (this.pushDir !== 0) {
      const target = this.pushDir * c.pushSpeed;
      if ((target - this.vx) * this.pushDir > 0) this.vx += clamp(target - this.vx, -c.pushAccel * dt, c.pushAccel * dt);
    } else if (this.grounded) {
      const d = c.friction * dt;
      this.vx = Math.abs(this.vx) <= d ? 0 : this.vx - Math.sign(this.vx) * d;
    }
    this.pushDir = 0;
    this.vy = Math.max(this.vy - gravity * dt, -c.maxFall);

    // Déplacement horizontal puis vertical, séparés : on sait de quel côté on bute
    this.x += this.vx * dt;
    for (const b of this.boxes) {
      if (!this._overlaps(b)) continue;
      if (this.vx > 0) this.x = b.x0 - this.w;
      else if (this.vx < 0) this.x = b.x1;
      this.vx = 0;
    }
    this.y += this.vy * dt;
    this.grounded = false;
    for (const b of this.boxes) {
      if (!this._overlaps(b)) continue;
      if (this.vy <= 0) {
        this.y = b.y1;
        this.grounded = true;
      } else {
        this.y = b.y0 - this.h;
      }
      this.vy = 0;
    }
    if (this.y < fallLimit) this.reset();
    this.sliding = this.grounded ? Math.abs(this.vx) : 0;
    this._apply();
  }

  _overlaps(b) {
    return this.x < b.x1 - EPS && this.x + this.w > b.x0 + EPS && this.y < b.y1 - EPS && this.y + this.h > b.y0 + EPS;
  }

  _apply() {
    for (let i = 0; i < this.colliders.length; i++) {
      const c = this.colliders[i];
      const b = this.base[i];
      c.ax = this.x + b.ax;
      c.ay = this.y + b.ay;
      c.bx = this.x + b.bx;
      c.by = this.y + b.by;
      c.vx = this.vx;
      c.vy = this.vy;
      updateBounds(c);
    }
  }
}

// ─── NEIGE ───────────────────────────────────────────────────────────────────

/**
 * Vent (horizontal) : pousse le ballon dans une zone, en rafales régulières.
 * `force` en u/s² (signe = sens), `gust` = période des rafales (s).
 */
export class WindZone {
  constructor(def) {
    this.def = def;
    this.x = def.x;
    this.y = def.y;
    this.w = def.w;
    this.h = def.h;
    this.force = def.force;
    this.gust = def.gust ?? 2.4;
  }

  /** Intensité (0..1) à l'instant t : souffle de fond + rafale. */
  strength(t) {
    return 0.62 + 0.38 * Math.sin((t / this.gust) * Math.PI * 2);
  }

  accelAt(x, y, t) {
    if (x < this.x || x > this.x + this.w || y < this.y || y > this.y + this.h) return 0;
    return this.force * this.strength(t);
  }
}

/**
 * Stalactite : pend au plafond, tremble quand le ballon passe dessous, puis tombe.
 * Elle se brise au sol et repousse quelques secondes plus tard.
 */
export class Icicle {
  constructor(def, floorY, cfg) {
    this.def = def;
    this.x = def.x;
    this.topY = def.y;              // point d'accroche
    this.len = def.len ?? 1.3;
    this.floorY = floorY;
    this.cfg = cfg;
    this.reset();
  }

  reset() {
    this.state = 'hang';            // hang → shake → fall → broken → grow → hang
    this.timer = 0;
    this.offset = 0;                // descente depuis l'accroche
    this.vy = 0;
    this.grow = 1;
  }

  get tipY() {
    return this.topY - this.offset - this.len;
  }

  /** @returns {'shake'|'shatter'|null} événement à signaler */
  update(dt, ball, gravity) {
    const c = this.cfg;
    switch (this.state) {
      case 'hang':
        if (Math.abs(ball.x - this.x) < (this.def.trigger ?? c.trigger) && ball.y < this.topY) {
          this.state = 'shake';
          this.timer = c.shakeTime;
          return 'shake';
        }
        return null;
      case 'shake':
        this.timer -= dt;
        if (this.timer <= 0) this.state = 'fall';
        return null;
      case 'fall':
        this.vy -= gravity * dt;
        this.offset -= this.vy * dt;
        if (this.tipY <= this.floorY) {
          this.offset = this.topY - this.len - this.floorY;
          this.state = 'broken';
          this.timer = c.regrowDelay;
          return 'shatter';
        }
        return null;
      case 'broken':
        this.timer -= dt;
        if (this.timer <= 0) {
          this.state = 'grow';
          this.offset = 0;
          this.vy = 0;
          this.grow = 0;
        }
        return null;
      case 'grow':
        this.grow = Math.min(1, this.grow + dt / c.growTime);
        if (this.grow >= 1) this.state = 'hang';
        return null;
      default:
        return null;
    }
  }

  /** La stalactite qui tombe touche-t-elle le ballon ? (la pointe est mortelle) */
  hits(x, y, r, forgiveness) {
    if (this.state !== 'fall') return false;
    const top = this.topY - this.offset;
    return distToSegment(x, y, this.x, this.tipY + 0.1, this.x, top - 0.1) < r + 0.16 - forgiveness;
  }
}

// ─── VOLCAN ──────────────────────────────────────────────────────────────────

/** Bassin de lave (ou d'eau, `kind: 'water'`) : mortel dès que le ballon y trempe. `y` = surface. */
export class Lava {
  constructor(def) {
    this.def = def;
    this.kind = def.kind ?? 'lava';
    this.x = def.x;
    this.y = def.y;
    this.w = def.w;
  }

  touches(x, y, r) {
    return x > this.x - r * 0.3 && x < this.x + this.w + r * 0.3 && y - r < this.y - 0.06;
  }
}

/**
 * Plateforme qui s'effondre : elle tremble quand on se pose dessus, disparaît,
 * puis réapparaît (seulement si le ballon n'est pas à sa place).
 */
export class Crumble {
  constructor(def, colliders, cfg) {
    this.def = def;
    this.x = def.x;
    this.y = def.y;
    this.w = def.w;
    this.h = def.h ?? 0.45;
    this.colliders = colliders;
    this.cfg = cfg;
    this.reset();
  }

  reset() {
    this.state = 'solid';           // solid → shake → gone → solid
    this.timer = 0;
    this.appear = 1;
    this._setSolid(true);
  }

  touch() {
    if (this.state !== 'solid') return false;
    this.state = 'shake';
    this.timer = this.def.delay ?? this.cfg.delay;
    return true;
  }

  /** @returns {'break'|'back'|null} */
  update(dt, ball) {
    if (this.state === 'solid') {
      this.appear = Math.min(1, this.appear + dt * 4);
      return null;
    }
    this.timer -= dt;
    if (this.state === 'shake' && this.timer <= 0) {
      this.state = 'gone';
      this.timer = this.def.respawn ?? this.cfg.respawn;
      this._setSolid(false);
      return 'break';
    }
    if (this.state === 'gone' && this.timer <= 0) {
      const r = ball.radius + 0.05;
      const inside = ball.x > this.x - r && ball.x < this.x + this.w + r && ball.y > this.y - r && ball.y < this.y + this.h + r;
      if (!inside) {
        this.state = 'solid';
        this.appear = 0;
        this._setSolid(true);
        return 'back';
      }
    }
    return null;
  }

  _setSolid(on) {
    for (const c of this.colliders) c.disabled = !on;
  }
}

/**
 * Geyser de feu : jaillit à intervalles réguliers. Il fume juste avant (avertissement).
 * Mortel pendant l'éruption.
 */
export class Geyser {
  constructor(def, cfg) {
    this.def = def;
    this.x = def.x;
    this.y = def.y;
    this.w = def.w ?? 0.9;
    this.h = def.h ?? 4.5;
    this.period = def.period ?? cfg.period;
    this.onTime = def.on ?? cfg.onTime;
    this.warnTime = cfg.warnTime;
    this.phase = def.phase ?? 0;
  }

  /** { warn: 0..1, height: hauteur actuelle du jet } à l'instant t. */
  state(t, out = { warn: 0, height: 0, erupting: false }) {
    const u = cycleTime(t, this.period, this.phase);
    const start = this.period - this.onTime;
    out.warn = 0;
    out.height = 0;
    out.erupting = false;
    if (u >= start) {
      const k = u - start;
      const grow = clamp(k / 0.16, 0, 1);
      const shrink = clamp((this.onTime - k) / 0.22, 0, 1);
      out.height = this.h * Math.min(grow, shrink);
      out.erupting = true;
    } else if (u >= start - this.warnTime) {
      out.warn = (u - (start - this.warnTime)) / this.warnTime;
    }
    return out;
  }

  touches(x, y, r, t, forgiveness) {
    const s = this.state(t, this._s ?? (this._s = { warn: 0, height: 0, erupting: false }));
    if (s.height < 0.3) return false;
    const half = this.w / 2 - forgiveness;
    return Math.abs(x - this.x) < half + r * 0.6 && y - r < this.y + s.height - forgiveness && y + r > this.y;
  }
}

/**
 * Chute de pierres : un rocher tombe du plafond à intervalles réguliers, toujours au même endroit.
 * Une ombre au sol et de la poussière au plafond préviennent juste avant.
 */
export class RockFall {
  constructor(def, floorY, cfg) {
    this.def = def;
    this.x = def.x;
    this.top = def.y;
    this.size = def.size ?? 0.5;
    this.period = def.period ?? cfg.period;
    this.phase = def.phase ?? 0;
    this.warnTime = cfg.warnTime;
    this.gravity = cfg.gravity;
    this.floorY = floorY;
    this.fallTime = Math.sqrt((2 * Math.max(0.1, this.top - this.size - floorY)) / this.gravity);
  }

  /** { phase: 'idle'|'warn'|'fall'|'rubble', y, k } à l'instant t. */
  state(t, out = { phase: 'idle', y: 0, k: 0 }) {
    const u = cycleTime(t, this.period, this.phase);
    out.y = this.top;
    out.k = 0;
    if (u < this.warnTime) {
      out.phase = 'warn';
      out.k = u / this.warnTime;
    } else if (u < this.warnTime + this.fallTime) {
      const f = u - this.warnTime;
      out.phase = 'fall';
      out.y = this.top - 0.5 * this.gravity * f * f;
      out.k = f / this.fallTime;
    } else if (u < this.warnTime + this.fallTime + 0.5) {
      out.phase = 'rubble';
      out.y = this.floorY + this.size;
      out.k = (u - this.warnTime - this.fallTime) / 0.5;
    } else {
      out.phase = 'idle';
    }
    return out;
  }

  touches(x, y, r, t, forgiveness) {
    const s = this.state(t, this._s ?? (this._s = { phase: 'idle', y: 0, k: 0 }));
    if (s.phase !== 'fall') return false;
    return Math.hypot(x - this.x, y - s.y) < r + this.size - forgiveness;
  }
}

// ─── FORÊT : lianes ──────────────────────────────────────────────────────────

/**
 * Liane : le ballon s'y accroche en la touchant en l'air, se balance (◀ ▶ donnent de l'élan),
 * et lâche prise avec REBOND, en gardant l'élan du balancement (plus un petit saut).
 * Physiquement, c'est une corde : une contrainte de distance maximale autour de l'accroche.
 */
export class Vine {
  constructor(def, cfg) {
    this.def = def;
    this.x = def.x;
    this.y = def.y;
    this.len = def.len ?? 3.5;
    this.cfg = cfg;
    this.reset();
  }

  reset() {
    this.attached = false;
    this.rope = this.len;
    this.angle = 0;                 // angle avec la verticale (rad, positif = vers la droite)
    this.omega = 0;
    this.cooldown = 0;
    this.sway = 0;
  }

  get tipX() {
    return this.x + Math.sin(this.angle) * this.len;
  }

  get tipY() {
    return this.y - Math.cos(this.angle) * this.len;
  }

  /** Le ballon (en l'air) peut-il attraper la liane ? */
  canGrab(b) {
    if (this.attached || this.cooldown > 0) return false;
    const d = distToSegment(b.x, b.y, this.x, this.y, this.tipX, this.tipY);
    if (d > b.radius + this.cfg.grabReach) return false;
    return Math.hypot(b.x - this.x, b.y - this.y) > this.cfg.minRope;
  }

  grab(b) {
    this.attached = true;
    this.rope = clamp(Math.hypot(b.x - this.x, b.y - this.y), this.cfg.minRope, this.len);
  }

  release(b) {
    this.attached = false;
    this.cooldown = this.cfg.regrabDelay;
    b.vy = Math.max(b.vy, 0) + this.cfg.releaseBoost;
    b.vx *= this.cfg.releaseCarry;
  }

  /** Après le pas du ballon : la corde l'empêche de s'éloigner de l'accroche. */
  constrain(b) {
    const dx = b.x - this.x;
    const dy = b.y - this.y;
    const d = Math.hypot(dx, dy);
    if (d > this.rope && d > EPS) {
      const nx = dx / d;
      const ny = dy / d;
      b.x = this.x + nx * this.rope;
      b.y = this.y + ny * this.rope;
      const vr = b.vx * nx + b.vy * ny;
      if (vr > 0) {
        b.vx -= vr * nx;
        b.vy -= vr * ny;
      }
    }
    this.angle = Math.atan2(dx, -dy);
    // vitesse angulaire « visuelle », reprise par la liane quand on la lâche
    this.omega = (b.vx * Math.cos(this.angle) + b.vy * Math.sin(this.angle)) / Math.max(this.rope, EPS);
  }

  /** Liane libre : pendule amorti (elle revient doucement à la verticale). */
  update(dt, gravity, time) {
    if (this.cooldown > 0) this.cooldown -= dt;
    if (this.attached) return;
    this.omega += (-(gravity / this.len) * Math.sin(this.angle) - this.omega * 1.2) * dt;
    this.angle += this.omega * dt;
    this.sway = Math.sin(time * 1.3 + this.x) * 0.03;
  }
}

// ─── ESPACE : zones de gravité inversée ──────────────────────────────────────

export class GravityZone {
  constructor(def) {
    this.def = def;
    this.x = def.x;
    this.y = def.y;
    this.w = def.w;
    this.h = def.h;
  }

  contains(x, y) {
    return x >= this.x && x <= this.x + this.w && y >= this.y && y <= this.y + this.h;
  }
}
