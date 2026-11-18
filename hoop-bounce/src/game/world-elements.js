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

// ─── Pièges de l'étape 9 (tous les mondes) ───────────────────────────────────

/**
 * Plateforme qui tombe : elle tremble quand on se pose dessus, puis chute (en emportant le ballon s'il
 * reste dessus) et réapparaît à sa place quelques secondes plus tard.
 */
export class Faller {
  constructor(def, colliders, cfg) {
    this.def = def;
    this.x = def.x;
    this.y = def.y;
    this.w = def.w;
    this.h = def.h ?? 0.4;
    this.colliders = colliders;
    this.cfg = cfg;
    this.base = colliders.map((c) => ({ ax: c.ax, ay: c.ay, bx: c.bx, by: c.by }));
    this.reset();
  }

  reset() {
    this.state = 'idle';           // idle → shake → fall → gone → idle
    this.timer = 0;
    this.offset = 0;
    this.vy = 0;
    this.appear = 1;
    this._apply(true);
  }

  touch() {
    if (this.state !== 'idle') return false;
    this.state = 'shake';
    this.timer = this.def.delay ?? this.cfg.delay;
    return true;
  }

  /** @returns {'fall'|'back'|null} */
  update(dt, ball, gravity) {
    switch (this.state) {
      case 'idle':
        this.appear = Math.min(1, this.appear + dt * 4);
        return null;
      case 'shake':
        this.timer -= dt;
        if (this.timer <= 0) {
          this.state = 'fall';
          this.vy = 0;
          return 'fall';
        }
        return null;
      case 'fall':
        this.vy = Math.max(this.vy - gravity * 0.75 * dt, -22);
        this.offset += this.vy * dt;
        if (this.offset < -14) {
          this.state = 'gone';
          this.timer = this.def.respawn ?? this.cfg.respawn;
          this._apply(false);
          return null;
        }
        this._apply(true);
        return null;
      case 'gone': {
        this.timer -= dt;
        if (this.timer > 0) return null;
        const r = ball.radius + 0.05;
        const inside = ball.x > this.x - r && ball.x < this.x + this.w + r && ball.y > this.y - r && ball.y < this.y + this.h + r;
        if (inside) return null;
        this.state = 'idle';
        this.offset = 0;
        this.vy = 0;
        this.appear = 0;
        this._apply(true);
        return 'back';
      }
      default:
        return null;
    }
  }

  _apply(solid) {
    for (let i = 0; i < this.colliders.length; i++) {
      const c = this.colliders[i];
      const b = this.base[i];
      c.ay = b.ay + this.offset;
      c.by = b.by + this.offset;
      c.vy = this.state === 'fall' ? this.vy : 0;
      c.disabled = !solid;
      updateBounds(c);
    }
  }
}

/**
 * Bloc temporisé : plateforme (ou mur) qui apparaît puis disparaît selon un cycle régulier.
 * Il clignote avant de disparaître. S'il doit réapparaître alors que le ballon est à sa place,
 * il attend que la place soit libre.
 */
export class Blinker {
  constructor(def, colliders, cfg) {
    this.def = def;
    this.x = def.x;
    this.y = def.y;
    this.w = def.w;
    this.h = def.h ?? 0.45;
    this.period = def.period ?? cfg.period;
    this.onTime = def.on ?? cfg.onTime;
    this.phase = def.phase ?? 0;
    this.warn = cfg.warnTime;
    this.colliders = colliders;
    this.solid = true;
  }

  reset() {
    this.solid = true;
    for (const c of this.colliders) c.disabled = false;
  }

  /** Phase du cycle : { on, k } (k = 0..1 dans la phase en cours). */
  phaseAt(t) {
    const u = cycleTime(t, this.period, this.phase);
    return u < this.onTime ? { on: true, left: this.onTime - u } : { on: false, left: this.period - u };
  }

  /** @returns {'on'|'off'|null} */
  update(t, ball) {
    const p = this.phaseAt(t);
    if (p.on === this.solid) return null;
    if (p.on) {
      const r = ball.radius + 0.05;
      const inside = ball.x > this.x - r && ball.x < this.x + this.w + r && ball.y > this.y - r && ball.y < this.y + this.h + r;
      if (inside) return null;
    }
    this.solid = p.on;
    for (const c of this.colliders) c.disabled = !p.on;
    return p.on ? 'on' : 'off';
  }

  /** Clignotement d'avertissement avant de disparaître (0..1). */
  warning(t) {
    const p = this.phaseAt(t);
    return p.on && p.left < this.warn ? 1 - p.left / this.warn : 0;
  }
}

/** Boulet qui se balance au bout d'une chaîne (pendule régulier). Mortel au contact. */
export class Mace {
  constructor(def) {
    this.def = def;
    this.x = def.x;
    this.y = def.y;
    this.len = def.len ?? 3;
    this.r = def.r ?? 0.55;
    this.amp = def.amp ?? 1.0;
    this.period = def.period ?? 2.8;
    this.phase = def.phase ?? 0;
  }

  angle(t) {
    return this.amp * Math.sin(((t / this.period + this.phase) % 1) * Math.PI * 2);
  }

  pos(t, out = { x: 0, y: 0 }) {
    const a = this.angle(t);
    out.x = this.x + Math.sin(a) * this.len;
    out.y = this.y - Math.cos(a) * this.len;
    return out;
  }

  touches(x, y, r, t, forgiveness) {
    const p = this.pos(t, this._p ?? (this._p = { x: 0, y: 0 }));
    return Math.hypot(x - p.x, y - p.y) < r + this.r - forgiveness;
  }
}

/**
 * Laser temporisé entre deux émetteurs : il grésille (avertissement) puis s'allume quelques instants.
 * Mortel seulement quand il est allumé.
 */
export class Laser {
  constructor(def, cfg) {
    this.def = def;
    this.x1 = def.x1;
    this.y1 = def.y1;
    this.x2 = def.x2;
    this.y2 = def.y2;
    this.period = def.period ?? cfg.period;
    this.onTime = def.on ?? cfg.onTime;
    this.phase = def.phase ?? 0;
    this.warnTime = cfg.warnTime;
  }

  /** { on, warn (0..1) } à l'instant t. */
  state(t, out = { on: false, warn: 0 }) {
    const u = cycleTime(t, this.period, this.phase);
    const start = this.period - this.onTime;
    out.on = u >= start;
    out.warn = !out.on && u >= start - this.warnTime ? (u - (start - this.warnTime)) / this.warnTime : 0;
    return out;
  }

  touches(x, y, r, t, forgiveness) {
    if (!this.state(t, this._s ?? (this._s = { on: false, warn: 0 })).on) return false;
    return distToSegment(x, y, this.x1, this.y1, this.x2, this.y2) < r + 0.1 - forgiveness;
  }
}

/** Aimant : attire (strength > 0) ou repousse (strength < 0) le ballon dans un rayon donné. */
export class Magnet {
  constructor(def) {
    this.def = def;
    this.x = def.x;
    this.y = def.y;
    this.radius = def.radius ?? 3.5;
    this.strength = def.strength ?? 30;
    // Trou noir (espace) : un cœur mortel au centre du champ
    this.core = def.core ?? 0;
  }

  touches(x, y, r) {
    return this.core > 0 && Math.hypot(x - this.x, y - this.y) < this.core + r * 0.5;
  }

  /** Accélération (ax, ay) subie par le ballon en (x, y). */
  accelAt(x, y, out) {
    const dx = this.x - x;
    const dy = this.y - y;
    const d = Math.hypot(dx, dy);
    if (d > this.radius || d < 0.05) {
      out.x = 0;
      out.y = 0;
      return false;
    }
    // Force sensible dès l'entrée dans le champ, plus forte près de l'aimant
    const k = (this.strength * (0.35 + 0.65 * (1 - d / this.radius))) / d;
    out.x = dx * k;
    out.y = dy * k;
    return true;
  }
}

/**
 * Canon : tire un projectile à intervalles réguliers, en ligne droite, jusqu'au premier obstacle.
 * Il se charge (lueur) juste avant de tirer. Les projectiles sont des fonctions du temps : prévisibles.
 */
export class Cannon {
  constructor(def, range, cfg) {
    this.def = def;
    this.x = def.x;
    this.y = def.y;
    const a = def.angle ?? (def.dir === -1 ? Math.PI : 0);
    this.dx = Math.cos(a);
    this.dy = Math.sin(a);
    this.speed = def.speed ?? cfg.speed;
    this.period = def.period ?? cfg.period;
    this.phase = def.phase ?? 0;
    this.size = def.size ?? 0.3;
    this.range = range;
    this.warnTime = cfg.warnTime;
  }

  /** Projectiles en vol à l'instant t : liste de distances parcourues depuis la bouche. */
  shots(t, out = []) {
    out.length = 0;
    const u = cycleTime(t, this.period, this.phase);
    const life = this.range / this.speed;
    for (let k = 0; u + k * this.period < life; k++) {
      if (t - (u + k * this.period) < 0) break; // pas de tir avant le début du niveau
      out.push((u + k * this.period) * this.speed);
    }
    return out;
  }

  /** Charge avant le tir (0..1). */
  charge(t) {
    const u = cycleTime(t, this.period, this.phase);
    const left = this.period - u;
    return left < this.warnTime ? 1 - left / this.warnTime : 0;
  }

  touches(x, y, r, t, forgiveness) {
    const list = this.shots(t, this._list ?? (this._list = []));
    for (const d of list) {
      const px = this.x + this.dx * (0.6 + d);
      const py = this.y + this.dy * (0.6 + d);
      if (Math.hypot(x - px, y - py) < r + this.size - forgiveness) return true;
    }
    return false;
  }
}

// ─── Pièges de l'étape 10 ────────────────────────────────────────────────────

function circleHitsRect(x, y, r, x0, y0, x1, y1) {
  const cx = clamp(x, x0, x1);
  const cy = clamp(y, y0, y1);
  return (x - cx) * (x - cx) + (y - cy) * (y - cy) < r * r;
}

/**
 * Pilon (presse hydraulique, bloc de glace, broyeur de pierre, tronc-marteau, piston) : un bloc
 * lourd qui attend en haut, tremble, s'écrase d'un coup jusqu'au sol, y reste un instant puis
 * remonte lentement. Mortel au contact. Fonction pure du temps : on apprend son rythme.
 *   def { x, w, top, bottom, h, period, phase }  top/bottom = hauteur de sa face inférieure
 */
export class Crusher {
  constructor(def, cfg) {
    this.def = def;
    this.x = def.x;
    this.w = def.w ?? 1.6;
    this.h = def.h ?? 1.4;
    this.top = def.top;
    this.bottom = def.bottom ?? 0;
    this.period = def.period ?? cfg.period;
    this.phase = def.phase ?? 0;
    this.warnTime = cfg.warnTime;
    this.slamTime = cfg.slamTime;
    this.holdTime = cfg.holdTime;
    this.riseTime = def.rise ?? cfg.riseTime;
  }

  /** { y : face inférieure, shake : 0..1 avant la chute, slam : vient de toucher le sol } */
  state(t, out = { y: 0, shake: 0, down: false }) {
    const u = cycleTime(t, this.period, this.phase);
    const wait = this.period - this.slamTime - this.holdTime - this.riseTime;
    out.shake = 0;
    out.down = false;
    if (u < wait) {
      out.y = this.top;
      if (u > wait - this.warnTime) out.shake = (u - (wait - this.warnTime)) / this.warnTime;
    } else if (u < wait + this.slamTime) {
      const k = (u - wait) / this.slamTime;
      out.y = this.top + (this.bottom - this.top) * k * k;
    } else if (u < wait + this.slamTime + this.holdTime) {
      out.y = this.bottom;
      out.down = true;
    } else {
      const k = (u - wait - this.slamTime - this.holdTime) / this.riseTime;
      out.y = this.bottom + (this.top - this.bottom) * (k * k * (3 - 2 * k));
    }
    return out;
  }

  touches(x, y, r, t, forgiveness) {
    const s = this.state(t, this._s ?? (this._s = { y: 0, shake: 0, down: false }));
    const f = forgiveness;
    return circleHitsRect(x, y, r - f, this.x + f, s.y, this.x + this.w - f, s.y + this.h);
  }
}

/**
 * Rocher qui dévale (boule de neige, rocher de lave, rondin) : à chaque cycle, il part d'un bout
 * de sa piste et roule jusqu'à l'autre à vitesse constante, puis disparaît. Un grondement
 * l'annonce juste avant son départ. Mortel au contact ; on le saute ou on se met à l'abri.
 *   def { x1, x2, y : sol de la piste, r, dir (+1 vers la droite, -1 vers la gauche), speed, period, phase }
 */
export class Boulder {
  constructor(def, cfg) {
    this.def = def;
    this.x1 = def.x1;
    this.x2 = def.x2;
    this.r = def.r ?? 0.55;
    this.y = def.y + this.r;
    this.dir = def.dir ?? -1;
    this.speed = def.speed ?? cfg.speed;
    this.period = def.period ?? cfg.period;
    this.phase = def.phase ?? 0;
    this.warnTime = cfg.warnTime;
    this.duration = (this.x2 - this.x1) / this.speed;
  }

  /** { active, x, angle, warn : 0..1 avant le départ } */
  state(t, out = { active: false, x: 0, angle: 0, warn: 0 }) {
    const u = cycleTime(t, this.period, this.phase);
    out.active = u < this.duration && t >= u; // pas de rocher avant le début du niveau
    const d = u * this.speed;
    out.x = this.dir > 0 ? this.x1 + d : this.x2 - d;
    out.angle = (-this.dir * d) / this.r;
    const left = this.period - u;
    out.warn = left < this.warnTime ? 1 - left / this.warnTime : 0;
    return out;
  }

  touches(x, y, r, t, forgiveness) {
    const s = this.state(t, this._s ?? (this._s = { active: false, x: 0, angle: 0, warn: 0 }));
    if (!s.active) return false;
    return Math.hypot(x - s.x, y - this.y) < r + this.r - forgiveness * 2;
  }
}
