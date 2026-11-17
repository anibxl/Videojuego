// Logique de jeu : relie le niveau, le ballon, le contrôleur et les paniers.
// Aucune dépendance au navigateur : tout ce fichier peut tourner dans Node (tests, outils).

import { EventBus } from '../core/events.js';
import { BallBody } from '../physics/ball-body.js';
import { BallController } from './ball-controller.js';
import { buildLevel } from './level.js';

const IMPACT_EVENT_MIN_SPEED = 0.6; // u/s : en dessous, c'est du roulement, pas un choc

export class Game {
  /** @param {typeof import('../config.js').CONFIG} config */
  constructor(config, levelDef) {
    this.cfg = config;
    this.events = new EventBus();
    this.level = buildLevel(levelDef, config);

    const makeBody = () =>
      new BallBody({ radius: config.ball.radius, inertiaFactor: config.ball.inertiaFactor, physics: config.physics });
    this.body = makeBody();
    this._previewBody = makeBody();
    this.controller = new BallController(this.body, config.controls, config.physics.gravity, this.events);

    /** État au pas précédent, pour l'interpolation du rendu. */
    this.prev = { x: 0, y: 0, angle: 0 };
    this.time = 0;
    this.score = 0;
    this.streak = 0;
    this.shot = { active: false, touchedRim: false, touchedBoard: false };

    this.events.on('launch', () => {
      this.shot.active = true;
      this.shot.touchedRim = false;
      this.shot.touchedBoard = false;
    });

    this.respawn();
  }

  respawn() {
    const { x, y } = this.level.spawn;
    this.body.reset(x, y);
    this.controller.reset();
    this.prev.x = x;
    this.prev.y = y;
    this.prev.angle = 0;
    this.shot.active = false;
    this.events.emit('respawn', { x, y });
  }

  fixedUpdate(dt) {
    const b = this.body;
    this.prev.x = b.x;
    this.prev.y = b.y;
    this.prev.angle = b.angle;

    this.controller.fixedUpdate(dt);
    b.step(this.level.world, dt);

    for (let i = 0; i < b.contactCount; i++) {
      const c = b.contacts[i];
      const tag = c.collider.tag;
      if (tag === 'rim') this.shot.touchedRim = true;
      else if (tag === 'backboard') this.shot.touchedBoard = true;
      else if (this.shot.active && c.ny >= this.cfg.physics.groundNormalMinY) {
        // Le tir retombe ailleurs que dans le panier : la série s'arrête
        this.shot.active = false;
        this.streak = 0;
      }
      if (c.impactSpeed >= IMPACT_EVENT_MIN_SPEED) {
        this.events.emit('impact', {
          speed: c.impactSpeed,
          slip: c.slipSpeed,
          nx: c.nx,
          ny: c.ny,
          x: c.px,
          y: c.py,
          tag,
        });
      }
    }

    for (const hoop of this.level.hoops) {
      hoop.step(dt, b);
      if (hoop.checkScore(this.prev.x, this.prev.y, b.x, b.y)) {
        const swish = this.shot.active && !this.shot.touchedRim && !this.shot.touchedBoard;
        this.score++;
        this.streak++;
        hoop.lastScoreTime = this.time;
        this.events.emit('score', { hoop, swish, score: this.score, streak: this.streak, x: hoop.centerX, y: hoop.rimY });
        this.shot.active = false;
      }
    }

    if (b.y < this.cfg.world.fallLimit) this.respawn();
    this.time += dt;
  }

  /**
   * Trajectoire prévue si le joueur relâchait maintenant.
   * Simule une copie du ballon avec exactement la même physique.
   * @param {number} maxTime
   * @param {Float64Array} out  [x0, y0, x1, y1, …]
   * @returns {{count:number, hit:boolean}}
   */
  predictTrajectory(maxTime, out) {
    const p = this._previewBody;
    const dt = this.cfg.physics.fixedDt;
    p.copyFrom(this.body);
    p.groundBounceScale = 1;
    const v = this.controller.launchVelocity(this.controller.charge, this.controller.direction);
    p.vx = v.vx;
    p.vy = v.vy;
    p.angularVelocity = v.w;

    const maxPoints = out.length >> 1;
    const steps = Math.ceil(maxTime / dt);
    let count = 0;
    let hit = false;
    out[count * 2] = p.x;
    out[count * 2 + 1] = p.y;
    count++;
    for (let i = 0; i < steps && count < maxPoints; i++) {
      p.step(this.level.world, dt);
      out[count * 2] = p.x;
      out[count * 2 + 1] = p.y;
      count++;
      if (i > 2 && p.contactCount > 0) {
        hit = true;
        break;
      }
    }
    return { count, hit };
  }
}
