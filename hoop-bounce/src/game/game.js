// Logique de jeu : relie le niveau, la balle, le contrôleur, les éléments, les pièges et le panier.
// Aucune dépendance au navigateur : tout ce fichier peut tourner dans Node (tests, outils).
//
// États : 'playing' → ('dying' → 'playing')* → 'won'

import { EventBus } from '../core/events.js';
import { BallBody } from '../physics/ball-body.js';
import { pathState } from '../physics/mover.js';
import { BallController } from './ball-controller.js';
import { buildLevel } from './level.js';
import { touchesSaw, touchesSpikes } from './hazards.js';

const IMPACT_EVENT_MIN_SPEED = 0.8; // u/s : en dessous, c'est du roulement, pas un choc

export class Game {
  /** @param {typeof import('../config.js').CONFIG} config */
  constructor(config, levelDef) {
    this.cfg = config;
    this.levelDef = levelDef;
    this.events = new EventBus();
    this.level = buildLevel(levelDef, config);

    this.body = new BallBody({ radius: config.ball.radius, inertiaFactor: config.ball.inertiaFactor, physics: config.physics });
    this.controller = new BallController(this.body, config.controls, config.physics.gravity, this.events);
    this.controller.setGravity(this.level.gravity, this.level.jumpScale);

    /** État au pas précédent, pour l'interpolation du rendu. */
    this.prev = { x: 0, y: 0, angle: 0 };
    this._path = { x: 0, y: 0, vx: 0, vy: 0 };
    this.inFan = false;
    this.inWind = false;
    this.vine = null;
    this.restart();
  }

  /** Charge un autre niveau (et le démarre). */
  load(levelDef) {
    this.levelDef = levelDef;
    this.level = buildLevel(levelDef, this.cfg);
    this.controller.setGravity(this.level.gravity, this.level.jumpScale);
    this.inFan = false;
    this.inWind = false;
    this.restart();
  }

  /** Recommence le niveau depuis le début. */
  restart() {
    const L = this.level;
    this.time = 0;
    this.runTime = 0;
    this.deaths = 0;
    this.state = 'playing';
    this._stateTimer = 0;
    this.starsCollected = 0;
    this.checkpoint = { x: L.spawn.x, y: L.spawn.y };
    for (const s of L.stars) s.collected = false;
    for (const c of L.checkpoints) c.active = false;
    for (const s of L.switches) {
      s.pressed = false;
      s.press = 0;
    }
    for (const d of L.doors) d.reset();
    for (const t of L.teleporters) t.cooldown = 0;
    for (const c of L.crates) c.reset();
    for (const c of L.crumbles) c.reset();
    for (const i of L.icicles) i.reset();
    for (const v of L.vines) v.reset();
    for (const m of L.mushrooms) m.flex = 0;
    this.vine = null;
    this._geyserOn = L.geysers.map(() => false);
    this._rockPhase = L.rockfalls.map(() => 'idle');
    L.hoop.reset();
    this.result = null;
    this._updateMoving(0);
    this._respawn();
    this.events.emit('restart', {});
  }

  get playing() {
    return this.state === 'playing';
  }

  _respawn() {
    const R = this.body.radius;
    const x = this.checkpoint.x;
    const y = this.checkpoint.y + R + 0.01;
    this.body.reset(x, y);
    this.controller.reset();
    this.prev.x = x;
    this.prev.y = y;
    this.prev.angle = 0;
    this.state = 'playing';
    this.events.emit('respawn', { x, y });
  }

  _updateMoving(dt) {
    const L = this.level;
    L.world.update(this.time);
    for (const d of L.doors) d.update(dt);
    for (const s of L.saws ?? []) {
      const p = pathState(s.path, this.time, this._path);
      s.cx = s.x + p.x;
      s.cy = s.y + p.y;
    }
    for (const t of L.trampolines) t.flex = Math.max(0, t.flex - dt * 3.5);
    for (const m of L.mushrooms) m.flex = Math.max(0, m.flex - dt * 3);
    for (const v of L.vines) v.update(dt, L.gravity, this.time);
    for (const s of L.switches) s.press += ((s.pressed ? 1 : 0) - s.press) * Math.min(1, dt * 18);
    for (const f of L.fans) if (f.on) f.spin += dt * 22;
  }

  fixedUpdate(dt) {
    const b = this.body;
    const L = this.level;
    this.time += dt;
    this._updateMoving(dt);

    if (this.state === 'dying') {
      this._stateTimer -= dt;
      if (this._stateTimer <= 0) {
        // Niveaux courts : une chute fait recommencer le niveau (étoiles comprises)
        const deaths = this.deaths;
        this.restart();
        this.deaths = deaths;
      }
      L.hoop.step(dt, { x: -1000, y: -1000, radius: b.radius });
      return;
    }

    this.prev.x = b.x;
    this.prev.y = b.y;
    this.prev.angle = b.angle;

    if (this.state === 'playing') {
      this.runTime += dt;
      // Accroché à une liane : REBOND sert à lâcher prise (au lieu de dribbler)
      if (this.vine && this.controller.takePress()) this._releaseVine();
      this.controller.fixedUpdate(dt);
    }

    // Zones de gravité inversée (monde Espace)
    if (L.gravityZones.length) {
      let sign = 1;
      for (const z of L.gravityZones) if (z.contains(b.x, b.y)) sign = -1;
      if (sign !== b.gravitySign) {
        b.gravitySign = sign;
        b.timeSinceGrounded = Infinity;
        this.events.emit('gravityFlip', { x: b.x, y: b.y, sign });
      }
    }

    // Vent de neige : poussée horizontale en rafales
    if (L.winds.length) {
      let windAccel = 0;
      for (const w of L.winds) windAccel += w.accelAt(b.x, b.y, this.time);
      b.vx += windAccel * dt;
      const wasInWind = this.inWind;
      this.inWind = windAccel !== 0;
      if (this.inWind !== wasInWind) this.events.emit(this.inWind ? 'windEnter' : 'windExit', {});
    }

    for (const c of L.crates) c.step(dt, L.gravity, this.cfg.world.fallLimit);

    // Ventilateurs : poussée vers le haut + amortissement (la balle flotte)
    let fanAccel = 0;
    for (const f of L.fans) fanAccel += f.accelAt(b.x, b.y, b.radius);
    const wasInFan = this.inFan;
    this.inFan = fanAccel > 0;
    if (this.inFan) {
      b.vy += fanAccel * dt;
      b.vy *= 1 - this.cfg.fans.verticalDrag * dt;
      b.vx *= 1 - this.cfg.fans.horizontalDrag * dt;
    }
    if (this.inFan !== wasInFan) this.events.emit(this.inFan ? 'fanEnter' : 'fanExit', {});

    b.step(L.world, dt);

    // Lianes : la corde retient le ballon ; on en attrape une en la touchant en l'air
    if (this.state === 'playing') {
      if (this.vine) this.vine.constrain(b);
      else if (b.timeSinceGrounded > 0.1) {
        for (const v of L.vines) {
          if (v.canGrab(b)) {
            this._grabVine(v);
            break;
          }
        }
      }
    }

    // Contacts : sons, effets, trampolines, interrupteurs
    for (let i = 0; i < b.contactCount; i++) {
      const c = b.contacts[i];
      const tag = c.collider.tag;
      if (this.state === 'playing') {
        if (tag === 'mushroom' && c.ny > 0.5) {
          const m = L.mushrooms[c.collider.mushroomIndex];
          this.controller.launch(m.velocity);
          m.flex = 1;
          this.events.emit('mushroom', { x: b.x, y: b.y - b.radius });
          continue;
        }
        if (tag === 'crumble' && c.ny * b.gravitySign > 0.5) {
          const cr = L.crumbles[c.collider.crumbleIndex];
          if (cr.touch()) this.events.emit('crumbleShake', { x: cr.x + cr.w / 2, y: cr.y + cr.h });
        }
        if (tag === 'crate' && Math.abs(c.nx) > 0.6) {
          const dir = -Math.sign(c.nx);
          const crate = c.collider.crate;
          if (this.controller.axis === dir) crate.push(dir);
          if (c.impactSpeed > 3) crate.hit(dir, c.impactSpeed);
        }
        if (tag === 'trampoline' && c.ny > 0.5) {
          this.controller.launch(this.cfg.controls.trampolineVelocity * Math.sqrt(L.gravityScale));
          const t = L.trampolines.find((tt) => c.px >= tt.x - 0.05 && c.px <= tt.x + tt.w + 0.05);
          if (t) t.flex = 1;
          this.events.emit('trampoline', { x: b.x, y: b.y - b.radius });
          continue;
        }
        if (tag === 'switch' && c.ny > 0.5) this._pressSwitch(L.switches[c.collider.switchIndex]);
      }
      if (c.impactSpeed >= IMPACT_EVENT_MIN_SPEED) {
        this.events.emit('impact', { speed: c.impactSpeed, nx: c.nx, ny: c.ny, x: c.px, y: c.py, tag });
      }
    }

    L.hoop.step(dt, b);
    if (this.state !== 'playing') return;

    this._updateWorldElements(dt);
    this._checkTeleporters(dt);
    this._checkPickups();
    this._checkHazards();
    if (this.state === 'playing' && L.hoop.checkScore(this.prev.x, this.prev.y, b.x, b.y)) this._win();
  }

  _grabVine(v) {
    v.grab(this.body);
    this.vine = v;
    this.controller.cancelSlam();
    this.events.emit('vineGrab', { x: this.body.x, y: this.body.y });
  }

  _releaseVine() {
    const v = this.vine;
    this.vine = null;
    v.release(this.body);
    this.events.emit('vineRelease', { x: this.body.x, y: this.body.y });
  }

  /** Éléments des mondes qui évoluent avec le ballon ou le temps (événements pour le son et l'image). */
  _updateWorldElements(dt) {
    const L = this.level;
    const b = this.body;
    for (const cr of L.crumbles) {
      const e = cr.update(dt, b);
      if (e === 'break') this.events.emit('crumble', { x: cr.x + cr.w / 2, y: cr.y + cr.h / 2, w: cr.w });
    }
    for (const ic of L.icicles) {
      const e = ic.update(dt, b, L.gravity);
      if (e === 'shake') this.events.emit('icicleShake', { x: ic.x, y: ic.topY });
      else if (e === 'shatter') this.events.emit('icicleShatter', { x: ic.x, y: ic.floorY });
    }
    L.geysers.forEach((g, i) => {
      const on = g.state(this.time).erupting;
      if (on && !this._geyserOn[i]) this.events.emit('geyser', { x: g.x, y: g.y });
      this._geyserOn[i] = on;
    });
    L.rockfalls.forEach((r, i) => {
      const phase = r.state(this.time).phase;
      if (phase === 'rubble' && this._rockPhase[i] === 'fall') this.events.emit('rockImpact', { x: r.x, y: r.floorY });
      this._rockPhase[i] = phase;
    });
  }

  _pressSwitch(s) {
    if (!s || s.pressed) return;
    s.pressed = true;
    const opened = this.level.doors.filter((d) => d.id === s.target && d.open());
    this.events.emit('switch', { x: s.x + s.w / 2, y: s.y, target: s.target, doors: opened });
  }

  _checkTeleporters(dt) {
    const b = this.body;
    for (const t of this.level.teleporters) {
      if (t.cooldown > 0) {
        // Le portail de sortie se réarme quand la balle s'en est éloignée
        const dx = b.x - t.exit.x;
        const dy = b.y - t.exit.y;
        if (dx * dx + dy * dy > (t.r * 1.6) ** 2) t.cooldown = Math.max(0, t.cooldown - dt);
        continue;
      }
      const dest = t.destination(b.x, b.y);
      if (dest) {
        const from = { x: b.x, y: b.y };
        t.exit = dest;
        b.x = dest.x;
        b.y = dest.y;
        // Pas d'interpolation entre les deux portails (la balle ne « traverse » pas l'écran)
        this.prev.x = b.x;
        this.prev.y = b.y;
        t.cooldown = 0.3;
        t.lastUse = this.time;
        this.events.emit('teleport', { from, to: { x: b.x, y: b.y }, vx: b.vx, vy: b.vy });
      }
    }
  }

  _checkPickups() {
    const b = this.body;
    const P = this.cfg.pickups;
    const reach = b.radius + P.starRadius;
    for (const s of this.level.stars) {
      if (s.collected) continue;
      const dx = b.x - s.x;
      const dy = b.y - s.y;
      if (dx * dx + dy * dy < reach * reach) {
        s.collected = true;
        s.collectedAt = this.time;
        this.starsCollected++;
        this.events.emit('star', { x: s.x, y: s.y, index: s.index, count: this.starsCollected, total: this.level.stars.length });
      }
    }
    for (const c of this.level.checkpoints) {
      if (c.active) continue;
      const dx = b.x - c.x;
      const dy = b.y - b.radius - c.y;
      if (Math.abs(dx) < P.checkpointRadius && dy > -0.3 && dy < 3) {
        for (const o of this.level.checkpoints) if (o.index < c.index) o.active = true;
        c.active = true;
        c.activatedAt = this.time;
        this.checkpoint = { x: c.x, y: c.y };
        this.events.emit('checkpoint', { x: c.x, y: c.y, index: c.index });
      }
    }
  }

  _checkHazards() {
    const b = this.body;
    const f = this.cfg.pickups.hazardForgiveness;
    for (const s of this.level.spikes) {
      if (touchesSpikes(b.x, b.y, b.radius, s, f)) return this._die('spikes');
    }
    for (const s of this.level.saws ?? []) {
      if (touchesSaw(b.x, b.y, b.radius, s, f)) return this._die('saw');
    }
    const t = this.time;
    const L = this.level;
    for (const l of L.lavas) if (l.touches(b.x, b.y, b.radius)) return this._die(l.kind);
    for (const g of L.geysers) if (g.touches(b.x, b.y, b.radius, t, f)) return this._die('fire');
    for (const r of L.rockfalls) if (r.touches(b.x, b.y, b.radius, t, f)) return this._die('rock');
    for (const i of L.icicles) if (i.hits(b.x, b.y, b.radius, f)) return this._die('icicle');
    if (b.y < this.cfg.world.fallLimit) this._die('fall');
    // Gravité inversée : le ballon ne doit pas s'envoler hors du niveau par le haut
    if (b.gravitySign < 0 && L.bounds && b.y > L.bounds.maxY + 4) this._die('fall');
  }

  _die(cause) {
    this.state = 'dying';
    this._stateTimer = this.cfg.feel.deathDelay;
    this.deaths++;
    if (this.vine) {
      this.vine.attached = false;
      this.vine = null;
    }
    if (this.inFan) {
      this.inFan = false;
      this.events.emit('fanExit', {});
    }
    if (this.inWind) {
      this.inWind = false;
      this.events.emit('windExit', {});
    }
    this.events.emit('death', { x: this.body.x, y: this.body.y, vx: this.body.vx, vy: this.body.vy, cause });
  }

  _win() {
    const L = this.level;
    this.state = 'won';
    this.controller.enabled = false;
    this.controller.left = this.controller.right = false;
    this.result = {
      time: this.runTime,
      stars: this.starsCollected,
      totalStars: L.stars.length,
      deaths: this.deaths,
    };
    this.events.emit('win', { ...this.result, x: L.hoop.centerX, y: L.hoop.rimY });
  }
}
