// Outil de level design : vérifie que chaque passage de chaque niveau est faisable et estime sa
// difficulté. Pour chaque passage, on essaie des centaines de séquences de commandes aléatoires
// (◀ ▶ + REBOND) jouées comme le ferait un joueur : rebonds en rythme, dribble rapide pour charger
// la puissance, visée du cercle pendant la descente.
//   Taux élevé = passage facile.  Taux faible = exigeant.  0 % = impossible (à corriger !).
// Les passages qui demandent une vraie technique ont aussi une solution « experte » scriptée.
//
// Usage : node tools/route-check.mjs [essais] [niveau 1..N, dans l'ordre de tous les mondes] [--save]
//   --save : enregistre une solution par passage dans tests/fixtures/routes.json
//            (rejouée par tests/routes.test.mjs : les niveaux doivent rester faisables)

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { CONFIG } from '../src/config.js';
import { Game } from '../src/game/game.js';
import { LEVELS } from '../src/game/worlds.js';
import { createRng } from '../src/core/math.js';

const DT = CONFIG.physics.fixedDt;
const R = CONFIG.ball.radius;

const on = (x1, x2, y) => (g) => g.body.grounded && Math.abs(g.body.y - (y + R)) < 0.08 && g.body.x > x1 && g.body.x < x2;
const win = (g) => g.state === 'won';
const openDoors = (g) => g.level.doors.forEach((d) => d.open());
/** Préparation : caisse déjà poussée à la position x. */
const crateAt = (x) => (g) => {
  const c = g.level.crates[0];
  c.def = { ...c.def, x };
  c.reset();
};

// ─── Solutions expertes ─────────────────────────────────────────────────────

// Chaque solution experte reçoit `make()`, qui crée une partie neuve au départ du passage.

/** Rouler vers le panier, charger la puissance en dribblant, puis viser le cercle en descendant. */
function expertShot(make) {
  for (const standOff of [5.5, 4.5, 6.5, 3.5, 7.5]) {
    for (const taps of [4, 5]) {
      const g = make();
      let won = false;
      g.events.on('win', () => (won = true));
      if (shotAttempt(g, g.level.hoop, standOff, taps, () => won)) return true;
    }
  }
  return false;
}

function shotAttempt(g, h, standOff, taps, isWon) {
  const targetX = h.centerX - standOff;
  let n = 0;
  let was = true;
  let t = 0;
  for (let i = 0; i < 120 * 9 && !isWon(); i++) {
    t += DT;
    const b = g.body;
    if (n < taps) {
      // Approche puis dribble sur place pour charger
      const dx = targetX - b.x;
      g.controller.right = dx > 0.3;
      g.controller.left = dx < -0.3;
      if (Math.abs(dx) < 1.2 && (n === 0 || (b.grounded && !was))) {
        g.controller.pressBounce();
        n++;
      }
    } else if (!b.grounded) {
      const aim = h.centerX - b.vx * 0.12;
      g.controller.right = b.x < aim - 0.2;
      g.controller.left = b.x > aim + 0.2;
    } else {
      g.controller.left = g.controller.right = false;
    }
    was = b.grounded;
    g.fixedUpdate(DT);
    if (g.state === 'dying') return false;
  }
  return isWon();
}

function expertPlatform(goal) {
  return (make) => {
    const g = make();
    const m = g.level.movers[0].mover;
    const dx = g.level.movers[0].path.dx;
    let dead = false;
    g.events.on('death', () => (dead = true));
    const step = (n = 1) => { for (let i = 0; i < n && !dead; i++) g.fixedUpdate(DT); };
    for (let i = 0; i < 2000 && !(m.offsetX < 0.1 && m.colliders[0].vx < 0); i++) step();
    g.controller.right = true;
    const def = g.level.movers[0];
    while (g.body.x < def.x + 1.0 && !dead) step();
    g.controller.right = false;
    g.controller.left = true;
    step(26);
    g.controller.left = false;
    for (let i = 0; i < 900 && m.offsetX < dx - 0.3 && !dead; i++) step();
    g.controller.right = true;
    step(70);
    g.controller.right = false;
    step(150);
    return !dead && goal(g);
  };
}

// ─── Pilote : petites manœuvres pour écrire les solutions expertes des mondes ──

export class Pilot {
  constructor(g) {
    this.g = g;
    this.dead = false;
    this.won = false;
    g.events.on('death', () => (this.dead = true));
    g.events.on('win', () => (this.won = true));
  }

  get b() {
    return this.g.body;
  }

  get c() {
    return this.g.controller;
  }

  hold(dir) {
    this.c.left = dir < 0;
    this.c.right = dir > 0;
  }

  /** Avance tant que `cond` est faux (renvoie false si mort ou délai dépassé). */
  until(cond, maxSec = 8, each = null) {
    const n = Math.round(maxSec / DT);
    for (let i = 0; i < n; i++) {
      if (this.won || cond(this.g)) return !this.dead;
      each?.(this.g);
      this.g.fixedUpdate(DT);
      if (this.dead) return false;
    }
    return false;
  }

  wait(sec) {
    return this.until(() => false, sec) || (!this.dead && true);
  }

  /** Rouler jusqu'à x et s'y arrêter. */
  goTo(x, tol = 0.3, maxSec = 8) {
    const ok = this.until(
      (g) => Math.abs(g.body.x - x) < tol && Math.abs(g.body.vx - g.body.groundVx) < 0.6 && g.body.grounded,
      maxSec,
      (g) => {
        const dx = x - g.body.x;
        const v = g.body.vx - g.body.groundVx;
        const stopDist = (v * v) / (2 * 6);
        if (Math.abs(dx) < tol) this.hold(-Math.sign(v) * (Math.abs(v) > 0.6 ? 1 : 0));
        else if (Math.sign(v) === Math.sign(dx) && stopDist > Math.abs(dx)) this.hold(-Math.sign(dx));
        else this.hold(Math.sign(dx));
      },
    );
    this.hold(0);
    return ok;
  }

  /** Dribble sur place jusqu'à ce que le PROCHAIN rebond ait la puissance `level`, et se pose. */
  charge(level) {
    this.hold(0);
    if (!this.until((g) => g.controller.canBounce, 3)) return false;
    while (this.c.level < level) {
      this.c.pressBounce();
      if (!this.until(() => false, 0.13)) {
        if (this.dead) return false;
      }
    }
    return this.until((g) => g.controller.canBounce, 3);
  }

  /** Rebondir (puissance actuelle) en tenant la direction `dir` ; `steer(g)` peut corriger en l'air. */
  jump(dir, steer = null, maxSec = 3) {
    this.c.pressBounce();
    this.hold(dir);
    let air = 0;
    return this.until((g) => air > 0.12 && g.body.grounded, maxSec, (g) => {
      air = g.body.grounded ? 0 : air + DT;
      if (steer) steer(g, this);
    });
  }

  /** En l'air : viser x (freine et revient si besoin). */
  aim(x) {
    return (g) => {
      const t = x - g.body.vx * 0.12;
      this.hold(g.body.x < t - 0.15 ? 1 : g.body.x > t + 0.15 ? -1 : 0);
    };
  }
}

/** Solution experte écrite avec le pilote : `fn(p)` renvoie true si le passage est réussi. */
const piloted = (fn, goal) => (make) => {
  const g = make();
  const p = new Pilot(g);
  const ok = fn(p, g);
  return !!ok && !p.dead && p.until(goal, 2);
};

// ─── Passages ───────────────────────────────────────────────────────────────

/** Par niveau : [nom, départ [x, surface], objectif, préparation, solution experte] */
export const ROUTES = [
  // 1
  [['Départ → panier', [3, 0], win, null, expertShot]],
  // 2
  [
    ['Départ → au-delà du mur', [3, 0], on(12.3, 22, 0)],
    ['Après le mur → panier', [15, 0], win, null, expertShot],
  ],
  // 3
  [
    ['Trampoline → au-delà des pics', [3, 0], on(19.6, 28, 0)],
    ['Sol → estrade', [22, 0], on(28, 38, 2.0)],
    ['Estrade → panier', [29.2, 2.0], win, null, expertShot],
  ],
  // 4
  [
    ['Plateforme mobile → autre rive', [8, 0], on(22.2, 30, 0), null, expertPlatform(on(22.2, 30, 0))],
    ['Rive → panier', [24, 0], win, null, expertShot],
  ],
  // 5
  [
    ['Ventilateur → terrasse', [6, 0], on(12.4, 38, 5.2)],
    ['Terrasse → panier', [14, 5.2], win, null, expertShot],
  ],
  // 6
  [
    ['Départ → interrupteur', [3, 0], (g) => g.level.switches[0].pressed],
    ['Porte ouverte → téléporteur', [12, 0], (g) => g.body.x > 27.5, openDoors],
    ['Après le mur → panier', [31, 0], win, null, expertShot],
  ],
  // ── MONDE 1 — VILLE ──
  // 7 — La caisse
  [
    ['Pousser la caisse contre la terrasse', [3, 0], (g) => g.level.crates[0].x > 15.2, null, piloted((p) => {
      p.hold(1);
      return p.until((g) => g.level.crates[0].x > 15.2, 8);
    }, (g) => g.level.crates[0].x > 15.2)],
    ['Caisse → terrasse', [16.2, 1.6], on(17, 46, 5.6), crateAt(15.4), piloted((p) => p.wait(0.3) && p.charge(5) && p.jump(1), on(17, 46, 5.6))],
    ['Terrasse → panier', [19, 5.6], win, null, expertShot],
  ],
  // ── MONDE 2 — NEIGE ──
  [
    ['Départ → butte enneigée', [3, 0], on(9, 13, 2.6), null, piloted((p) => p.goTo(7.4) && p.charge(4) && p.jump(1, p.aim(11)), on(9, 13, 2.6))],
    ['Rampe de glace → au-delà de la crevasse', [11, 2.6], on(34, 47, 0), null, piloted((p) => {
      p.hold(1);
      if (!p.until((g) => g.body.x > 28.4 && g.body.grounded, 5)) return false;
      p.c.pressBounce();
      return p.until(on(34, 47, 0), 4);
    }, on(34, 47, 0))],
    ['Vent → panier', [36, 0], win, null, expertShot],
  ],
  // ── MONDE 3 — VOLCAN ──
  [
    ['Départ → au-delà de la lave', [3, 0], on(13, 26, 0), null, piloted((p) => p.goTo(7.3) && p.charge(2) && p.jump(1, p.aim(10.5)) && p.jump(1) && p.until(on(13, 26, 0), 3), on(13, 26, 0))],
    ['Geysers → ascenseur → falaise', [14, 0], on(28.6, 50, 5), null, piloted((p, g) => {
      const cyc = (t) => ((t % 3.2) + 3.2) % 3.2;
      const m = g.level.movers[0].mover;
      if (!p.until((gg) => Math.abs(cyc(gg.time) - 1.3) < 0.01, 5)) return false;
      if (!p.goTo(24.5)) return false;
      if (!p.until(() => m.offsetY < 0.03, 8)) return false;
      if (!p.jump(1, p.aim(27.2))) return false;
      if (!p.until(() => m.offsetY > 4.95, 8)) return false;
      p.hold(1);
      return p.until(on(28.6, 50, 5), 3);
    }, on(28.6, 50, 5))],
    ['Chute de pierres → après les pierres', [29.5, 5], (g) => on(37, 50, 5)(g)],
    ['Falaise → panier', [37.5, 5], win, null, expertShot],
  ],
  // ── MONDE 4 — FORÊT ──
  [
    ['Rivière : les lianes', [3, 0], on(23, 40, 0), null, piloted((p) => {
      if (!(p.goTo(10.2) && p.charge(4))) return false;
      p.c.pressBounce();
      return p.until(on(23, 40, 0), 12, (g) => {
        const b = g.body;
        if (g.vine) {
          p.hold(b.vx >= 0 ? 1 : -1);
          if (b.vx > 0 && g.vine.angle > 0.55) g.controller.pressBounce();
        } else p.hold(1);
      });
    }, on(23, 40, 0))],
    ['Tronc → branches → cabane', [24, 0], on(40, 54, 5.6), null, piloted((p, g) => {
      const log = g.level.rollers[0].mover;
      const br2 = g.level.branches[1].mover;
      if (!p.until(() => log.offsetX > 4.3, 6) || !p.until(() => log.offsetX < 1.6, 6)) return false;
      return p.charge(3) && p.jump(1, p.aim(31)) && p.goTo(34.7) && p.charge(4) && p.jump(0)
        && p.charge(2) && p.jump(1, (gg) => p.aim(38.3 + br2.offsetX)(gg)) && p.charge(2) && p.jump(1, p.aim(42));
    }, on(40, 54, 5.6))],
    ['Cabane → panier', [42, 5.6], win, null, expertShot],
  ],
  // ── MONDE 5 — ESPACE ──
  [
    ['Plateformes flottantes', [3, 0], on(26, 33, 0), null, piloted((p) => p.goTo(9.4)
      && p.charge(2) && p.jump(1, p.aim(13.3)) && p.charge(2) && p.jump(1, p.aim(18.1))
      && p.charge(1) && p.jump(1, p.aim(22.9)) && p.charge(2) && p.jump(1, p.aim(28)), on(26, 33, 0))],
    ['Portails', [27, 0], (g) => g.body.x > 34.5],
    ['Gravité inversée', [36, 0], on(48, 60, 0)],
    ['Zone inversée → panier', [50, 0], win, null, expertShot],
  ],
];

export function setup(levelIndex, start, wait, prep) {
  const game = new Game(CONFIG, { ...LEVELS[levelIndex], spawn: { x: start[0], y: start[1] } });
  prep?.(game);
  for (let i = 0; i < wait; i++) game.fixedUpdate(DT);
  return game;
}

function randomScript(rng) {
  const segs = [];
  let t = 0;
  const n = 1 + Math.floor(rng() * 4);
  for (let i = 0; i < n; i++) {
    const d = 0.1 + rng() * 1.5;
    segs.push({ until: (t += d), axis: [-1, 0, 1, 1, 1][Math.floor(rng() * 5)] });
  }
  const mode = ['rhythm', 'rapid', 'random'][Math.floor(rng() * 3)];
  const presses = [];
  const k = 1 + Math.floor(rng() * 6);
  for (let i = 0; i < k; i++) presses.push(rng() * 3.5);
  presses.sort((a, b) => a - b);
  return {
    segs,
    mode,
    presses,
    start: rng() * 1.6,
    count: 1 + Math.floor(rng() * 6),
    interval: 0.1 + rng() * 0.18,
    aim: rng() < 0.6,
  };
}

/** Joue un script ; renvoie { ok, death }. */
export function play(levelIndex, start, goal, wait, s, prep) {
  const g = setup(levelIndex, start, wait, prep);
  const h = g.level.hoop;
  let pi = 0;
  let done = 0;
  let nextAt = s.start;
  let deaths = 0;
  let wasGrounded = true;
  g.events.on('death', () => deaths++);
  const steps = Math.round(5 / DT);
  for (let i = 0; i < steps; i++) {
    const t = i * DT;
    const b = g.body;
    const seg = s.segs.find((x) => t < x.until);
    let axis = seg ? seg.axis : 0;
    const pressing = s.mode === 'random' ? pi < s.presses.length : done < s.count;
    // Visée : une fois les appuis terminés, on dirige vers le cercle pendant la descente
    if (s.aim && !pressing && !b.grounded && b.vy < 0 && Math.abs(b.x - h.centerX) < 5) {
      const aim = h.centerX - b.vx * 0.12;
      axis = b.x < aim - 0.2 ? 1 : b.x > aim + 0.2 ? -1 : 0;
    }
    g.controller.left = axis < 0;
    g.controller.right = axis > 0;
    if (s.mode === 'random') {
      while (pi < s.presses.length && s.presses[pi] <= t) {
        g.controller.pressBounce();
        pi++;
      }
    } else if (done < s.count && t >= nextAt) {
      const landed = b.grounded && !wasGrounded;
      if (s.mode === 'rapid' || done === 0 || landed) {
        g.controller.pressBounce();
        done++;
        nextAt = t + (s.mode === 'rapid' ? s.interval : 0);
      }
    }
    wasGrounded = b.grounded;
    g.fixedUpdate(DT);
    if (deaths) return { ok: false, death: true };
    if (i > 12 && goal(g)) return { ok: true };
  }
  return { ok: false };
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  const SAVE = process.argv.includes('--save');
  const TRIES = Number(args[0] ?? 400);
  const ONLY = args[1] !== undefined ? Number(args[1]) - 1 : null;
  const solutions = ROUTES.map((r) => r.map(() => null));
  console.log(`${TRIES} essais aléatoires par passage\n`);
  ROUTES.forEach((routes, li) => {
    if (ONLY !== null && li !== ONLY) return;
    console.log(`Niveau ${li + 1}`);
    routes.forEach(([name, start, goal, prep, expert], ri) => {
      const rng = createRng(1000 + li * 50 + ri);
      let ok = 0;
      let deaths = 0;
      let example = null;
      for (let i = 0; i < TRIES; i++) {
        const wait = 36 + Math.floor(rng() * 300);
        const script = randomScript(rng);
        const r = play(li, start, goal, wait, script, prep);
        if (r.ok) {
          ok++;
          example ??= { wait, script };
        }
        if (r.death) deaths++;
      }
      const pct = (100 * ok) / TRIES;
      const bar = '█'.repeat(Math.round(pct / 4)).padEnd(25, '·');
      const expertOk = expert ? expert(() => setup(li, start, 36, prep)) : null;
      const flag = expertOk === true ? '  (solution experte ✓)' : expertOk === false ? '  ⚠ solution experte en échec' : ok === 0 ? '  ⚠ IMPOSSIBLE ?' : '';
      console.log(`  ${name.padEnd(38)} ${bar} ${pct.toFixed(1).padStart(5)} %  (morts ${((100 * deaths) / TRIES).toFixed(0)} %)${flag}`);
      solutions[li][ri] = example;
    });
  });
  if (SAVE) {
    const out = new URL('../tests/fixtures/routes.json', import.meta.url);
    writeFileSync(out, JSON.stringify(ROUTES.map((routes, li) => routes.map(([name], ri) => ({ name, ...solutions[li][ri] }))), null, 1));
    console.log('\nSolutions enregistrées dans tests/fixtures/routes.json');
  }
}
