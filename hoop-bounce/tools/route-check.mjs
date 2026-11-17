// Outil de level design : vérifie que chaque passage de chaque niveau est faisable et estime sa
// difficulté. Pour chaque passage, on essaie des centaines de séquences de commandes aléatoires
// (◀ ▶ + REBOND) jouées comme le ferait un joueur : rebonds en rythme, dribble rapide pour charger
// la puissance, visée du cercle pendant la descente.
//   Taux élevé = passage facile.  Taux faible = exigeant.  0 % = impossible (à corriger !).
// Les passages qui demandent une vraie technique ont aussi une solution « experte » scriptée.
//
// Usage : node tools/route-check.mjs [essais] [niveau 1..6] [--save]
//   --save : enregistre une solution par passage dans tests/fixtures/routes.json
//            (rejouée par tests/routes.test.mjs : les niveaux doivent rester faisables)

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { CONFIG } from '../src/config.js';
import { Game } from '../src/game/game.js';
import { LEVELS } from '../src/game/levels/index.js';
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
