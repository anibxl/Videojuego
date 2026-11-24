// Outil de level design : vérifie que chaque passage de chaque niveau est faisable et estime sa
// difficulté. Pour chaque passage, on essaie des centaines de séquences de commandes aléatoires
// (◀ ▶ + REBOND) jouées comme le ferait un joueur : rebonds en rythme, dribble rapide pour charger
// la puissance, visée du cercle pendant la descente.
//   Taux élevé = passage facile.  Taux faible = exigeant.  0 % = impossible (à corriger !).
// Chaque passage a aussi une solution « experte » : un plan de manœuvres décrit dans les données du
// niveau (`passages`, voir src/game/levels/README.md), joué par le « pilote » ci-dessous.
//
// Usage : node tools/route-check.mjs [essais] [niveau 1..N | id | plage a-b] [--save] [--part=fichier.json]
//   --save : enregistre une solution par passage dans tests/fixtures/routes.json
//            (rejouée par tests/routes.test.mjs : les niveaux doivent rester faisables)
//   --part : n'écrit que les solutions des niveaux traités dans un fichier partiel ; on fusionne ensuite
//            avec  node tools/route-merge.mjs parts/*.json  (calcul réparti sur plusieurs processus)
// La vérification de référence d'un niveau entier (passages enchaînés) est tools/level-run.mjs : un plan
// expert peut échouer ici quand on le joue SEUL (porte encore fermée, caisse pas encore poussée…).

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

export function shotAttempt(g, h, standOff, taps, isWon, quick = false) {
  const targetX = h.centerX - standOff;
  let n = 0;
  let was = true;
  let t = 0;
  let flew = 0;
  for (let i = 0; i < 120 * 9 && !isWon(); i++) {
    t += DT;
    const b = g.body;
    // Tir manqué (mode rapide) : on s'arrête dès que le ballon retombe après le tir
    if (quick && n >= taps) {
      if (!b.grounded) flew += DT;
      else if (flew > 0.4) return false;
    }
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

  /** Dribble sur place jusqu'à ce que le PROCHAIN rebond ait la puissance `level`, et se pose.
   *  Comme un joueur, on corrige la dérive (vent, glace) en revenant vers le point de départ. */
  charge(level) {
    this.hold(0);
    const x0 = this.b.x;
    const keep = (g) => {
      const d = g.body.x - x0;
      this.hold(Math.abs(d) > 0.12 ? -Math.sign(d) : 0);
    };
    if (!this.until((g) => g.controller.canBounce, 3, keep)) return false;
    while (this.c.level < level) {
      this.c.pressBounce();
      if (!this.until(() => false, 0.13, keep)) {
        if (this.dead) return false;
      }
    }
    const ok = this.until((g) => g.controller.canBounce, 3, keep);
    this.hold(0);
    return ok;
  }

  /** Rebondir (puissance actuelle) en tenant la direction `dir` ; `steer(g)` peut corriger en l'air. */
  jump(dir, steer = null, maxSec = 3) {
    this.c.pressBounce();
    this.hold(dir);
    let air = 0;
    const ok = this.until((g) => air > 0.12 && g.body.grounded, maxSec, (g) => {
      air = g.body.grounded ? 0 : air + DT;
      if (steer) steer(g, this);
    });
    if (steer) this.hold(0);
    return ok;
  }

  /** Après un atterrissage visé : freiner (comme un joueur) jusqu'à être presque immobile. */
  settle() {
    this.until((g) => Math.abs(g.body.vx - g.body.groundVx) < 0.4 && g.body.grounded, 0.8, (g) => {
      const v = g.body.vx - g.body.groundVx;
      this.hold(-Math.sign(v));
    });
    this.hold(0);
    return !this.dead;
  }

  /**
   * En l'air : viser x. On vise la vitesse qui amène au-dessus de x à l'atterrissage (temps de vol
   * restant estimé jusqu'à la hauteur de départ), comme un joueur qui ajuste sa course.
   */
  aim(x, landY = null) {
    const y0 = landY != null ? landY + R : this.b.y;
    return (g) => {
      const b = g.body;
      const grav = g.level.gravity * b.gravitySign;
      const up = b.vy * b.gravitySign;
      const drop = Math.max(0, (b.y - y0) * b.gravitySign);
      const T = Math.max(0.12, (up + Math.sqrt(up * up + 2 * Math.abs(grav) * drop)) / Math.abs(grav));
      const want = Math.max(-7.5, Math.min(7.5, (x - b.x) / T));
      const d = want - b.vx;
      this.hold(Math.abs(d) < 0.35 ? 0 : Math.sign(d));
    };
  }

}

// ─── Plans : solutions expertes décrites comme des données dans les niveaux ──
//
// Manœuvres disponibles (coordonnées du niveau) :
//   ['goTo', x]                      rouler jusqu'à x et s'y arrêter
//   ['charge', n]                    dribbler sur place jusqu'à la puissance n
//   ['jump', dir, aimX?]             rebondir en tenant dir (−1/0/1), viser aimX en l'air
//   ['hop', n, aimX, y?]             charger n puis sauter vers aimX (surface d'arrivée à la hauteur y)
//   ['hold', dir, x]                 rouler dans le sens dir jusqu'à dépasser x
//   ['run', dir, x1, x2, y]          rouler (et se laisser porter) jusqu'à être posé entre x1 et x2 à la hauteur y
//   ['jumpAt', dir, x, aimX?]        rouler et rebondir en passant x (saut lancé)
//   ['wait', s]                      attendre
//   ['settle']                       freiner jusqu'à l'arrêt après un atterrissage (glace)
//   ['waitCycle', période, a, b, phase?]  attendre que (temps + phase·période) mod période soit dans [a, b[
//   ['waitMover', groupe, i, 'x'|'y', '<'|'>', v]  attendre la position d'un élément mobile (décalage)
//   ['ride', i]                      traverser sur la plateforme mobile n° i (aller simple)
//   ['jumpOver', groupe, i, d?]      rattraper un élément mobile en roulant et sauter par-dessus
//   ['vines', x, press?]             (rebondir puis) se balancer de liane en liane jusqu'à se poser au-delà de x
//   ['fly', aimX]                    en l'air (champignon, trampoline…) : viser aimX jusqu'à se poser
//   ['hopTo', n, groupe, i, dx]      charger n puis sauter vers un élément mobile (sa position + dx)
//   ['stayOn', groupe, i, 'x'|'y', '<'|'>', v]  rester au-dessus d'un élément mobile jusqu'à la condition
//   ['dribbleRun', dir, n, x, aimX?] dribbler en roulant jusqu'à la puissance n, rebondir en passant x
//   ['jumpBoulder', i, d?, aimX?]    rouler et sauter par-dessus le rocher n° i quand il arrive à d devant
//   ['dodgeBoulders', x, d?, hopAt?] rouler vers x en sautant chaque rocher qui arrive à d devant
//                                    (et rebondir en passant hopAt : marche au bout de la piste)
//   ['float', x, s]                  flotter dans un souffle en restant au-dessus de x pendant s secondes
//   ['shot']                         tir au panier (solution « experte » de tir)

const GOALS = {
  on: (x1, x2, y) => on(x1, x2, y),
  win: () => win,
  x: (v) => (g) => g.body.x > v && g.playing,
  crate: (i, x) => (g) => g.level.crates[i].x > x,
  // posé sur la plateforme mobile n° i
  onMover: (i) => (g) => {
    const m = g.level.movers[i];
    const x0 = m.x + m.mover.offsetX;
    const top = m.y + m.h + m.mover.offsetY;
    const b = g.body;
    return b.grounded && b.x > x0 && b.x < x0 + m.w && Math.abs(b.y - R - top) < 0.12;
  },
  switch: (i) => (g) => g.level.switches[i].pressed,
};

const PREPS = {
  openDoors: () => openDoors,
  crateAt: (i, x) => (g) => {
    const c = g.level.crates[i];
    c.def = { ...c.def, x };
    c.reset();
  },
};

function moverOf(g, group, i) {
  const m = g.level[group][i];
  return m.mover ?? m;
}

const STEPS = {
  goTo: (p, x) => p.goTo(x),
  charge: (p, n) => p.charge(n),
  jump: (p, dir, aim, landY) => p.jump(dir, aim != null ? p.aim(aim, landY) : null),
  hop: (p, n, aim, landY) => p.charge(n) && p.jump(Math.sign(aim - p.b.x) || 0, p.aim(aim, landY)),
  hold: (p, dir, x) => {
    p.hold(dir);
    const ok = p.until((g) => (dir > 0 ? g.body.x >= x : g.body.x <= x), 10);
    p.hold(0);
    return ok;
  },
  run: (p, dir, x1, x2, y) => {
    p.hold(dir);
    const ok = p.until(on(x1, x2, y), 10, (g) => {
      // on freine en arrivant sur la zone visée
      const b = g.body;
      if (b.grounded && Math.abs(b.y - (y + R)) < 0.1 && b.x > x1 + 0.3 && b.x < x2 - 0.3) p.hold(0);
      else p.hold(dir);
    });
    p.hold(0);
    return ok;
  },
  jumpAt: (p, dir, x, aim) => {
    p.hold(dir);
    if (!p.until((g) => (dir > 0 ? g.body.x >= x : g.body.x <= x) && g.controller.canBounce, 8)) return false;
    return p.jump(dir, aim != null ? p.aim(aim) : null);
  },
  wait: (p, sec) => p.wait(sec),
  settle: (p) => p.settle(),
  waitCycle: (p, period, a, b, phase = 0) => p.until((g) => {
    const u = (((g.time / period + phase) % 1) + 1) % 1 * period;
    return u >= a && u < b;
  }, period * 3 + 1),
  waitMover: (p, group, i, axis, op, v) => p.until((g) => {
    const m = moverOf(g, group, i);
    const val = axis === 'x' ? m.offsetX : m.offsetY;
    return op === '<' ? val < v : val > v;
  }, 15),
  fly: (p, aim) => {
    let air = 0;
    const steer = p.aim(aim);
    return p.until((g) => air > 0.12 && g.body.grounded, 5, (g) => {
      air = g.body.grounded ? 0 : air + DT;
      steer(g);
    }) && (p.hold(0), true);
  },
  hopTo: (p, n, group, i, dx) => {
    if (!p.charge(n)) return false;
    const m = p.g.level[group][i];
    const baseX = (m.x1 ?? m.x) + 0;
    const target = () => baseX + moverOf(p.g, group, i).offsetX + dx;
    p.c.pressBounce();
    p.hold(Math.sign(target() - p.b.x));
    const top = () => (m.y ?? 0) + (m.h ?? 0) + moverOf(p.g, group, i).offsetY;
    let air = 0;
    return p.until((g) => air > 0.12 && g.body.grounded, 4, (g) => {
      air = g.body.grounded ? 0 : air + DT;
      p.aim(target(), group === 'movers' ? top() : null)(g);
    }) && (p.hold(0), true);
  },
  stayOn: (p, group, i, axis, op, v) => {
    const m = p.g.level[group][i];
    const baseX = m.x1 !== undefined ? (m.x1 + m.x2) / 2 : m.w !== undefined ? m.x + m.w / 2 : m.x;
    const ok = p.until((g) => {
      const mm = moverOf(g, group, i);
      const val = axis === 'x' ? mm.offsetX : mm.offsetY;
      return op === '<' ? val < v : val > v;
    }, 15, (g) => {
      const tx = baseX + moverOf(g, group, i).offsetX;
      const rel = g.body.x - tx;
      const vr = g.body.vx - g.body.groundVx;
      p.hold(Math.abs(rel) < 0.15 && Math.abs(vr) < 0.4 ? 0 : -Math.sign(rel + vr * 0.25));
    });
    p.hold(0);
    return ok;
  },
  dribbleRun: (p, dir, n, x, aim) => {
    p.hold(dir);
    let last = -1;
    if (!p.until((g) => g.controller.level >= n && (dir > 0 ? g.body.x >= x : g.body.x <= x) && g.controller.canBounce, 8, (g) => {
      if (g.controller.level < n && g.time - last > 0.13) {
        g.controller.pressBounce();
        last = g.time;
      }
    })) return false;
    return p.jump(dir, aim != null ? p.aim(aim) : null);
  },
  jumpBoulder: (p, i, d = 2.2, aim = null) => {
    const bo = p.g.level.boulders[i];
    p.hold(1);
    let skip = false;
    if (!p.until((g) => {
      if (g.body.x > bo.x2 + bo.r + 0.5) return (skip = true);
      const st = bo.state(g.time);
      const ahead = bo.dir < 0 ? st.x - g.body.x : g.body.x - st.x;
      return st.active && ahead > 0 && Math.abs(st.x - g.body.x) < d && g.controller.canBounce;
    }, 10)) return false;
    if (skip) return true;
    return p.jump(1, aim != null ? p.aim(aim) : null);
  },
  dodgeBoulders: (p, x, d = 3, hopAt = null) => {
    const list = p.g.level.boulders;
    let air = 0;
    return p.until((g) => g.body.grounded && g.body.x > x, 12, (g) => {
      air = g.body.grounded ? 0 : air + DT;
      p.hold(1);
      if (!g.controller.canBounce) return;
      // Saut final (marche au bout de la piste)
      if (hopAt != null && g.body.x > hopAt && g.body.x < x) {
        g.controller.pressBounce();
        return;
      }
      for (const bo of list) {
        const st = bo.state(g.time);
        const ahead = bo.dir < 0 ? st.x - g.body.x : g.body.x - st.x;
        if (st.active && ahead > 0 && ahead < d) {
          g.controller.pressBounce();
          break;
        }
      }
    });
  },
  jumpOver: (p, group, i, land = 2.4) => {
    // Rattraper un élément mobile (tronc) en roulant et sauter par-dessus au bon moment
    const m = p.g.level[group][i];
    const cx = () => m.x + moverOf(p.g, group, i).offsetX;
    p.hold(1);
    if (!p.until((g) => cx() - g.body.x < 1.9 && g.controller.canBounce, 10)) return false;
    const target = cx() + land;
    return p.jump(1, p.aim(target));
  },
  ride: (p, i, holdSteps = 70) => {
    // Attendre que la plateforme revienne, monter dessus en restant au milieu, descendre à l'autre bout
    const def = p.g.level.movers[i];
    const m = def.mover;
    const dx = def.path.dx;
    if (!p.until(() => m.offsetX < 0.4 && m.colliders[0].vx < 0, 15)) return false;
    if (!STEPS.stayOn(p, 'movers', i, 'x', '>', dx - 0.25)) return false;
    p.hold(1);
    p.wait(holdSteps * DT);
    p.hold(0);
    // On attend d'être posé sur la rive (plus sur la plateforme)
    p.until((g) => g.body.grounded && g.body.groundVx === 0 && Math.abs(g.body.vx) < 3, 2.5);
    return !p.dead;
  },
  vines: (p, x, press = true) => {
    if (press) p.c.pressBounce();
    return p.until((g) => g.body.grounded && g.body.x > x && !g.vine, 14, (g) => {
      const b = g.body;
      if (g.vine) {
        p.hold(b.vx >= 0 ? 1 : -1);
        if (b.vx > 0 && g.vine.angle > 0.55) g.controller.pressBounce();
      } else p.hold(1);
    });
  },
};

// Flotter dans un souffle (ventilateur…) en restant au-dessus de x pendant `sec` secondes
STEPS.float = (p, x, sec) => {
  const t0 = p.g.time;
  const ok = p.until((g) => g.time - t0 >= sec, sec + 1, (g) => {
    const d = x - (g.body.x + g.body.vx * 0.35);
    p.hold(Math.abs(d) < 0.15 ? 0 : Math.sign(d));
  });
  p.hold(0);
  return ok || !p.dead;
};

// Tir au panier dans une partie en cours (vérification d'un niveau entier : tools/level-run.mjs)
STEPS.shot = (p) => {
  for (const [standOff, taps] of [[3.5, 4], [4.5, 5], [3, 4], [5, 5], [5.5, 4], [6.5, 5], [4, 5], [2.5, 3]]) {
    {
      // Comme un joueur : s'arrêter au point de tir avant de dribbler
      const h = p.g.level.hoop;
      if (!p.goTo(h.centerX - standOff, 0.3, 4) && p.dead) return false;
      if (shotAttempt(p.g, h, standOff, taps, () => p.won, true)) return true;
      if (p.dead) return false;
    }
  }
  return p.won;
};

/** Objectif d'un passage, à partir de sa description (['on', x1, x2, y], ['win']…). */
export const GOAL_OF = (goal) => GOALS[goal[0]](...goal.slice(1));

export function runPlan(p, plan) {
  for (const [name, ...args] of plan) {
    const fn = STEPS[name];
    if (!fn) throw new Error(`Manœuvre inconnue : ${name}`);
    if (!fn(p, ...args) || p.dead) return false;
  }
  return true;
}

/** Solution experte d'un passage décrit dans les données du niveau. */
function expertFor(passage, goal) {
  const plan = passage.plan;
  if (!plan) return null;
  if (plan === 'shot' || (plan.length === 1 && plan[0][0] === 'shot')) return expertShot;
  return (make) => {
    const g = make();
    const p = new Pilot(g);
    const ok = runPlan(p, plan);
    return !!ok && !p.dead && p.until(goal, 3);
  };
}

/** Par niveau : [nom, départ [x, surface], objectif, préparation, solution experte] */
export const ROUTES = LEVELS.map((level) =>
  (level.passages ?? []).map((ps) => {
    const goal = GOALS[ps.goal[0]](...ps.goal.slice(1));
    const prep = ps.prep ? PREPS[ps.prep[0]](...ps.prep.slice(1)) : null;
    return [ps.name, ps.start, goal, prep, expertFor(ps, goal)];
  }),
);

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
  // Niveau : numéro (1..50), identifiant (ex. snow-3) ou plage (ex. 21-30)
  const only = args[1];
  const range = /^(\d+)-(\d+)$/.exec(only ?? '');
  const ONLY = only === undefined || range ? null : /^\d+$/.test(only) ? Number(only) - 1 : LEVELS.findIndex((l) => l.id === only);
  const inRange = (li) => (range ? li >= Number(range[1]) - 1 && li <= Number(range[2]) - 1 : ONLY === null || li === ONLY);
  const PART = process.argv.find((a) => a.startsWith('--part='))?.slice(7);
  const solutions = ROUTES.map((r) => r.map(() => null));
  console.log(`${TRIES} essais aléatoires par passage\n`);
  ROUTES.forEach((routes, li) => {
    if (!inRange(li)) return;
    console.log(`Niveau ${li + 1} — ${LEVELS[li].id}`);
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
      const pct = TRIES ? (100 * ok) / TRIES : 0;
      const bar = '█'.repeat(Math.round(pct / 4)).padEnd(25, '·');
      const expertOk = expert ? expert(() => setup(li, start, 36, prep)) : null;
      const flag = expertOk === true ? '  (solution experte ✓)' : expertOk === false ? '  ⚠ solution experte en échec' : ok === 0 ? '  ⚠ IMPOSSIBLE ?' : '';
      if (TRIES) console.log(`  ${name.padEnd(38)} ${bar} ${pct.toFixed(1).padStart(5)} %  (morts ${((100 * deaths) / TRIES).toFixed(0)} %)${flag}`);
      else console.log(`  ${name.padEnd(38)} ${expertOk === true ? 'expert ✓' : expertOk === false ? '⚠ EXPERT EN ÉCHEC' : '— (pas de plan)'}`);
      solutions[li][ri] = example;
    });
  });
  if (PART) {
    const part = {};
    ROUTES.forEach((routes, li) => {
      if (inRange(li)) part[li] = routes.map(([name], ri) => ({ name, ...solutions[li][ri] }));
    });
    writeFileSync(PART, JSON.stringify(part));
    console.log(`\nSolutions partielles enregistrées dans ${PART}`);
  } else if (SAVE) {
    const out = new URL('../tests/fixtures/routes.json', import.meta.url);
    writeFileSync(out, JSON.stringify(ROUTES.map((routes, li) => routes.map(([name], ri) => ({ name, ...solutions[li][ri] }))), null, 1));
    console.log('\nSolutions enregistrées dans tests/fixtures/routes.json');
  }
}
