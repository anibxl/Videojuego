// Logique du mode TRICKSHOT : le ballon est posé sur un pas de tir, le joueur le lance à la manière d'un
// lance-pierre (angle + puissance), en 3 essais au plus.
//
// Réutilise le moteur du jeu (physique anti-traversée, panier validé entièrement, tous les éléments
// des mondes) par héritage de Game, sans rien modifier au mode principal. Ajoute :
//  - les états du tir : 'aiming' (visée, ballon immobile) → 'playing' (en vol) → fin du tir
//    → 'aiming' (essai suivant) … → 'won' ou 'failed' (3 essais utilisés) ;
//  - la persistance du décor entre les essais : une porte ouverte le reste, une caisse cassée aussi
//    (on peut préparer le terrain au premier tir, puis marquer) ;
//  - des éléments interactifs propres au mode : caisses cassables, ventilateurs qu'un bouton allume ;
//  - le score d'un panier : étoiles (essais) + style (rebonds, swish, planche, portails, propulsions).
//
// Aucune dépendance au navigateur (tests, outil de vérification des niveaux).

import { Game } from '../game/game.js';
import { boxPoints, createPolygonEdges } from '../physics/colliders.js';
import { clamp } from '../core/math.js';
import { TS_CONFIG, TRICKSHOT } from './config.js';

const FAR = { x: -1000, y: -1000, radius: 0.4 };
export const DT = TS_CONFIG.physics.fixedDt;

/** Convertit un niveau Trickshot en niveau du moteur (pas de tir, limites, thème de l'arène). */
export function toEngineLevel(def) {
  const R = TS_CONFIG.ball.radius;
  const w = def.w ?? 24;
  const h = def.h ?? 13.5;
  return {
    ...def,
    theme: 'arena',
    bounds: { minX: 0, maxX: w, minY: 0, maxY: h },
    spawn: { x: def.start.x, y: def.start.y - R - 0.01 },
    // Ventilateurs reliés à un bouton : éteints au départ
    fans: (def.fans ?? []).map((f) => (f.target ? { ...f, on: false } : f)),
    hints: [],
  };
}

export class TrickshotGame extends Game {
  constructor(def) {
    super(TS_CONFIG, toEngineLevel(def));
    this.ts = def;
    this.events.on('impact', (e) => this._onImpact(e));
    this.events.on('teleport', () => this.shot && this.shot.portals++);
    this.events.on('trampoline', () => this.shot && this.shot.boosts++);
    this.events.on('mushroom', () => this.shot && this.shot.boosts++);
  }

  get width() {
    return this.level.bounds.maxX;
  }

  get height() {
    return this.level.bounds.maxY;
  }

  get shotsLeft() {
    return TRICKSHOT.shots - (this.shotsUsed ?? 0);
  }

  /** Position du pas de tir (centre du ballon posé). */
  get tee() {
    return { x: this.ts?.start.x ?? this.level.spawn.x, y: this.ts?.start.y ?? this.level.spawn.y };
  }

  restart() {
    super.restart(); // remet le décor à zéro et pose le ballon (→ _respawn)
    this._buildExtras();
    for (const b of this.level.breakables) this._setBroken(b, false);
    for (const f of this.level.fans) if (f.def.target) f.on = false;
    this.shotsUsed = 0;
    this.shot = null;
    this.result = null;
    this.state = 'aiming';
  }

  /** Éléments propres au Trickshot, construits une fois par niveau. */
  _buildExtras() {
    const L = this.level;
    if (L.breakables) return;
    L.breakables = (L.def.breakables ?? []).map((b, index) => {
      const edges = createPolygonEdges(boxPoints(b.x, b.y, b.w, b.h), this.cfg.materials.crate, 'breakable');
      for (const e of edges) e.breakIndex = index;
      L.world.add(edges);
      return { ...b, index, edges, broken: false, brokenAt: 0, strength: b.strength ?? 5 };
    });
  }

  _setBroken(b, broken) {
    b.broken = broken;
    for (const e of b.edges) e.disabled = broken;
  }

  /** Le ballon revient sur le pas de tir (début de niveau, essai suivant). Le décor ne bouge pas. */
  _respawn() {
    super._respawn();
    this.state = 'aiming';
    this.shotTime = 0;
    this._rest = 0;
  }

  /**
   * Lance le ballon. angle en radians (0 = vers la droite, π/2 = vers le haut), power de 0 à 1.
   * @returns {boolean} false si le tir n'est pas possible (pas en visée, puissance trop faible)
   */
  launch(angle, power) {
    if (this.state !== 'aiming') return false;
    const p = clamp(power, 0, 1);
    if (p < TRICKSHOT.minPower) return false;
    const b = this.body;
    // Gravité réduite : la vitesse suit la racine de la gravité → même portée, vol plus lent et flottant
    const v = TRICKSHOT.maxSpeed * p * Math.sqrt(this.level.gravityScale ?? 1);
    b.vx = Math.cos(angle) * v;
    b.vy = Math.sin(angle) * v;
    b.angularVelocity = (-b.vx / b.radius) * 0.25; // un peu d'effet, comme un vrai lancer
    b.timeSinceGrounded = Infinity;
    b.grounded = false;
    this.shotsUsed++;
    this.shot = { index: this.shotsUsed, angle, power: p, bounces: 0, rim: false, board: false, portals: 0, boosts: 0, t0: this.time };
    this.state = 'playing';
    this.shotTime = 0;
    this._rest = 0;
    this.events.emit('launch', { x: b.x, y: b.y, vx: b.vx, vy: b.vy, power: p, shot: this.shotsUsed });
    return true;
  }

  _onImpact(e) {
    const s = this.shot;
    if (!s || this.state !== 'playing') return;
    if (e.tag === 'rim') s.rim = true;
    else if (e.tag === 'backboard') s.board = true;
    else if (e.speed > 2.5 && e.tag !== 'breakable') s.bounces++;
  }

  fixedUpdate(dt) {
    const L = this.level;
    const b = this.body;
    if (this.state === 'aiming') {
      // Le décor vit (plateformes, lasers, scies…) pendant que le joueur vise ; le ballon attend
      this.time += dt;
      this._updateMoving(dt);
      this._updateWorldElements(dt);
      L.hoop.step(dt, FAR);
      this.prev.x = b.x;
      this.prev.y = b.y;
      this.prev.angle = b.angle;
      return;
    }
    if (this.state === 'dying') {
      this.time += dt;
      this._updateMoving(dt);
      L.hoop.step(dt, FAR);
      this._stateTimer -= dt;
      if (this._stateTimer <= 0) this._endShot('death');
      return;
    }
    super.fixedUpdate(dt);
    if (this.state !== 'playing') return;

    // Caisses cassables : un choc assez fort les brise
    for (let i = 0; i < b.contactCount; i++) {
      const c = b.contacts[i];
      if (c.collider.tag !== 'breakable') continue;
      const box = L.breakables[c.collider.breakIndex];
      if (box && !box.broken && c.impactSpeed >= box.strength) {
        this._setBroken(box, true);
        box.brokenAt = this.time;
        // La caisse éclate : le ballon passe au travers. On annule le rebond que la physique vient de
        // calculer (vitesse d'avant le choc) et on retire 30 % de l'élan, absorbé par la caisse.
        const e = this.cfg.materials.crate.restitution;
        b.vx = (b.vx - c.nx * c.impactSpeed * (1 + e)) * 0.7;
        b.vy = (b.vy - c.ny * c.impactSpeed * (1 + e)) * 0.7;
        this.events.emit('break', { x: box.x + box.w / 2, y: box.y + box.h / 2, w: box.w, h: box.h });
      }
    }

    // Fin du tir : ballon arrêté, sorti de l'arène, ou trop long
    this.shotTime += dt;
    const speed = Math.hypot(b.vx, b.vy);
    const resting = speed < TRICKSHOT.restSpeed && b.timeSinceGrounded < 0.1;
    this._rest = resting ? this._rest + dt : 0;
    const m = TRICKSHOT.outMargin;
    const out = b.x < -m || b.x > this.width + m || b.y > this.height + m * 3;
    if (this._rest > TRICKSHOT.restTime) this._endShot('rest');
    else if (out) this._endShot('out');
    else if (this.shotTime > TRICKSHOT.maxShotTime) this._endShot('timeout');
  }

  /** Un bouton ouvre aussi les ventilateurs qui lui sont reliés (en plus des portes). */
  _pressSwitch(s) {
    if (!s || s.pressed) return;
    super._pressSwitch(s);
    for (const f of this.level.fans) if (f.def.target && f.def.target === s.target) f.on = true;
  }

  _endShot(reason) {
    if (this.state === 'won') return;
    if (this.shotsUsed >= TRICKSHOT.shots) {
      this.state = 'failed';
      this.events.emit('failed', { reason, shots: this.shotsUsed });
      return;
    }
    this.events.emit('shotEnd', { reason, shotsLeft: this.shotsLeft });
    this._respawn();
  }

  _win() {
    const L = this.level;
    const s = this.shot ?? { bounces: 0, rim: false, board: false, portals: 0, boosts: 0 };
    const stars = Math.max(1, TRICKSHOT.shots + 1 - this.shotsUsed);
    const bonus = {
      bounces: Math.min(8, s.bounces) * 100,
      swish: s.rim ? 0 : 500,
      bank: s.board ? 250 : 0,
      portals: Math.min(3, s.portals) * 200,
      boosts: Math.min(3, s.boosts) * 100,
    };
    const score = stars * 1000 + Object.values(bonus).reduce((a, v) => a + v, 0);
    this.state = 'won';
    this.controller.enabled = false;
    this.result = { stars, shots: this.shotsUsed, score, bonus, swish: !s.rim, bounces: s.bounces, time: this.time };
    this.events.emit('win', { ...this.result, x: L.hoop.centerX, y: L.hoop.rimY });
  }
}

/**
 * Simule un tir sans affichage (outil de vérification, tests).
 * @param {object} def    niveau Trickshot
 * @param {{angle:number, power:number, release?:number}} shot   release : instant du tir (s depuis le début)
 * @returns {{won:boolean, reason:string, game:TrickshotGame}}
 */
export function simulateShot(def, { angle, power, release = 0 }, game = null) {
  const g = game ?? new TrickshotGame(def);
  while (g.time + 1e-9 < release && g.state === 'aiming') g.fixedUpdate(DT);
  let reason = 'none';
  g.events.on('shotEnd', (e) => (reason = e.reason));
  g.events.on('failed', (e) => (reason = e.reason));
  if (!g.launch(angle, power)) return { won: false, reason: 'invalid', game: g };
  const limit = g.time + TRICKSHOT.maxShotTime + 2;
  while ((g.state === 'playing' || g.state === 'dying') && g.time < limit) g.fixedUpdate(DT);
  return { won: g.state === 'won', reason: g.state === 'won' ? 'goal' : reason, game: g };
}
