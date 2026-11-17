// Logique de jeu : relie le niveau, le ballon, le contrôleur, les pièges, les bonus et le panier.
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
    this.controller = new BallController(this.body, config.controls, this.events);

    /** État au pas précédent, pour l'interpolation du rendu. */
    this.prev = { x: 0, y: 0, angle: 0 };
    this._path = { x: 0, y: 0, vx: 0, vy: 0 };
    this.restart();
  }

  /** Recommence le niveau depuis le début. */
  restart() {
    this.time = 0;       // temps du monde (éléments mobiles)
    this.runTime = 0;    // chrono du joueur
    this.deaths = 0;
    this.state = 'playing';
    this._stateTimer = 0;
    this.starsCollected = 0;
    this.checkpoint = { x: this.level.spawn.x, y: this.level.spawn.y };
    for (const s of this.level.stars) s.collected = false;
    for (const c of this.level.checkpoints) c.active = false;
    this.result = null;
    this._updateMoving();
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

  _updateMoving() {
    this.level.world.update(this.time);
    for (const s of this.level.saws) {
      const p = pathState(s.path, this.time, this._path);
      s.cx = s.x + p.x;
      s.cy = s.y + p.y;
    }
  }

  fixedUpdate(dt) {
    const b = this.body;
    const L = this.level;
    this.time += dt;
    this._updateMoving();
    for (const p of L.pads) p.squash = Math.max(0, p.squash - dt * 4);

    if (this.state === 'dying') {
      this._stateTimer -= dt;
      if (this._stateTimer <= 0) this._respawn();
      L.hoop.step(dt, { x: -100, y: -100, radius: b.radius });
      return;
    }

    this.prev.x = b.x;
    this.prev.y = b.y;
    this.prev.angle = b.angle;

    if (this.state === 'playing') {
      this.runTime += dt;
      this.controller.fixedUpdate(dt);
    } else if (this.state === 'won') {
      this._stateTimer += dt;
    }
    b.step(L.world, dt);

    // Contacts : sons, effets, tremplins
    for (let i = 0; i < b.contactCount; i++) {
      const c = b.contacts[i];
      const tag = c.collider.tag;
      if (tag === 'pad' && c.ny > 0.5 && this.state === 'playing') {
        this.controller.launchFromPad(this.cfg.controls.padVelocity);
        const pad = L.pads.find((p) => c.px >= p.x - 0.05 && c.px <= p.x + p.w + 0.05);
        if (pad) pad.squash = 1;
        this.events.emit('pad', { x: b.x, y: b.y - b.radius });
        continue;
      }
      if (c.impactSpeed >= IMPACT_EVENT_MIN_SPEED) {
        this.events.emit('impact', { speed: c.impactSpeed, slip: c.slipSpeed, nx: c.nx, ny: c.ny, x: c.px, y: c.py, tag });
      }
    }

    L.hoop.step(dt, b);
    if (this.state !== 'playing') return;

    this._checkPickups();
    this._checkHazards();
    if (this.state === 'playing' && L.hoop.checkScore(this.prev.x, this.prev.y, b.x, b.y)) this._win();
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
      if (Math.abs(dx) < P.checkpointRadius && dy > -0.3 && dy < 1.6) {
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
    for (const s of this.level.saws) {
      if (touchesSaw(b.x, b.y, b.radius, s, f)) return this._die('saw');
    }
  }

  _die(cause) {
    this.state = 'dying';
    this._stateTimer = this.cfg.feel.deathDelay;
    this.deaths++;
    this.events.emit('death', { x: this.body.x, y: this.body.y, vx: this.body.vx, vy: this.body.vy, cause });
  }

  _win() {
    const L = this.level;
    this.state = 'won';
    this._stateTimer = 0;
    this.controller.enabled = false;
    this.controller.axis = 0;
    this.result = {
      time: this.runTime,
      stars: this.starsCollected,
      totalStars: L.stars.length,
      deaths: this.deaths,
    };
    this.events.emit('win', { ...this.result, x: L.hoop.centerX, y: L.hoop.rimY });
  }
}
