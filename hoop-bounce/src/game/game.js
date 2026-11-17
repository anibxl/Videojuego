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

    /** État au pas précédent, pour l'interpolation du rendu. */
    this.prev = { x: 0, y: 0, angle: 0 };
    this._path = { x: 0, y: 0, vx: 0, vy: 0 };
    this.inFan = false;
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
      if (this._stateTimer <= 0) this._respawn();
      L.hoop.step(dt, { x: -1000, y: -1000, radius: b.radius });
      return;
    }

    this.prev.x = b.x;
    this.prev.y = b.y;
    this.prev.angle = b.angle;

    if (this.state === 'playing') {
      this.runTime += dt;
      this.controller.fixedUpdate(dt);
    }

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

    // Contacts : sons, effets, trampolines, interrupteurs
    for (let i = 0; i < b.contactCount; i++) {
      const c = b.contacts[i];
      const tag = c.collider.tag;
      if (this.state === 'playing') {
        if (tag === 'trampoline' && c.ny > 0.5) {
          this.controller.launch(this.cfg.controls.trampolineVelocity);
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

    this._checkTeleporters(dt);
    this._checkPickups();
    this._checkHazards();
    if (this.state === 'playing' && L.hoop.checkScore(this.prev.x, this.prev.y, b.x, b.y)) this._win();
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
        const dx = b.x - t.b.x;
        const dy = b.y - t.b.y;
        if (dx * dx + dy * dy > (t.r * 1.6) ** 2) t.cooldown = Math.max(0, t.cooldown - dt);
        continue;
      }
      if (t.entered(b.x, b.y)) {
        const from = { x: b.x, y: b.y };
        b.x = t.b.x;
        b.y = t.b.y;
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
    if (b.y < this.cfg.world.fallLimit) this._die('fall');
  }

  _die(cause) {
    this.state = 'dying';
    this._stateTimer = this.cfg.feel.deathDelay;
    this.deaths++;
    if (this.inFan) {
      this.inFan = false;
      this.events.emit('fanExit', {});
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
