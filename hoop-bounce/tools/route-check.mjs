// Outil de level design : vérifie que chaque passage du niveau est faisable et estime sa difficulté.
// Pour chaque passage, on essaie des centaines de séquences de commandes aléatoires
// (◀ ▶ + appuis sur REBOND) et on mesure le taux de réussite.
//   Taux élevé = passage facile.  Taux faible = exigeant.  0 % = impossible (à corriger !).
// Ces taux mesurent un joueur qui appuie au hasard : seul l'ordre de grandeur compte.
//
// Usage : node tools/route-check.mjs [essais par passage] [numéro de passage] [--save]
//   --save : enregistre une solution par passage dans tests/fixtures/routes.json
//            (rejouée par tests/routes.test.mjs : le niveau doit rester faisable)

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { CONFIG } from '../src/config.js';
import { Game } from '../src/game/game.js';
import { LEVEL_01 } from '../src/game/levels/level-01.js';
import { createRng } from '../src/core/math.js';

const DT = CONFIG.physics.fixedDt;
const R = CONFIG.ball.radius;
const LEVEL = LEVEL_01;

const on = (x1, x2, y) => (g) => g.body.grounded && Math.abs(g.body.y - (y + R)) < 0.06 && g.body.x > x1 && g.body.x < x2;
const openDoors = (g) => g.level.doors.forEach((d) => d.open());

// Solutions « expertes » pour les passages qui demandent une vraie technique (un joueur qui appuie
// au hasard n'y arrive presque jamais). Chacune pilote la partie et renvoie true si elle réussit.
function expertPlatform(g) {
  const m = g.level.movers[0].mover;
  let dead = false;
  g.events.on('death', () => (dead = true));
  const step = (n = 1) => { for (let i = 0; i < n && !dead; i++) g.fixedUpdate(DT); };
  for (let i = 0; i < 2000 && !(m.offsetX < 0.1 && m.colliders[0].vx < 0); i++) step();
  g.controller.right = true;
  while (g.body.x < 43 && !dead) step();
  g.controller.right = false;
  g.controller.left = true;
  step(30);
  g.controller.left = false;
  for (let i = 0; i < 900 && m.offsetX < 7.3 && !dead; i++) step();
  g.controller.right = true;
  step(240);
  return !dead && g.body.x > 54.3;
}

function expertHoop(g) {
  const h = g.level.hoop;
  let won = false;
  g.events.on('win', () => (won = true));
  let n = 0;
  let was = true;
  g.controller.right = true;
  for (let i = 0; i < 120 * 7 && !won; i++) {
    if (n >= 4 && !g.body.grounded) {
      const target = h.centerX - g.body.vx * 0.15; // on vise le cercle pendant la descente
      g.controller.right = g.body.x < target - 0.25;
      g.controller.left = g.body.x > target + 0.25;
    } else if (g.body.x > 101) g.controller.right = false;
    if (n < 4 && (n === 0 || (g.body.grounded && !was))) {
      g.controller.pressBounce();
      n++;
    }
    was = g.body.grounded;
    g.fixedUpdate(DT);
  }
  return won;
}

/** [nom, départ [x, surface], objectif, préparation éventuelle, solution experte éventuelle] */
export const ROUTES = [
  ['Départ → sur la marche', [2.5, 0], on(8, 11, 1.0)],
  ['Marche → au-delà du mur (enchaîner)', [9.5, 1.0], on(21.2, 26.8, 0)],
  ['Trampoline → au-delà des pics', [24, 0], on(35.2, 42, 0)],
  ['Plateforme mobile → autre rive', [39.8, 0], on(54.3, 57, 0), null, expertPlatform],
  ['Ventilateur → corniche', [55.6, 0], on(61, 72, 3.8)],
  ['Corniche → interrupteur', [62.5, 3.8], (g) => g.level.switches[0].pressed],
  ['Interrupteur → bas de la porte', [67.3, 6.29], on(72.5, 79, 0)],
  ['Retour sur la corniche (oubli de l\'interrupteur)', [75, 0], on(61, 72, 3.8)],
  ['Porte ouverte → téléporteur', [74.5, 0], (g) => g.body.x > 92, openDoors],
  ['Terrain → PANIER', [96.5, 0], (g) => g.state === 'won', null, expertHoop],
];

export function setup(start, wait, prep) {
  const game = new Game(CONFIG, { ...LEVEL, spawn: { x: start[0], y: start[1] } });
  prep?.(game);
  for (let i = 0; i < wait; i++) game.fixedUpdate(DT);
  return game;
}

function randomScript(rng) {
  const segs = [];
  let t = 0;
  const n = 1 + Math.floor(rng() * 3);
  for (let i = 0; i < n; i++) {
    const d = 0.1 + rng() * 1.6;
    segs.push({ until: (t += d), axis: [-1, 0, 1, 1][Math.floor(rng() * 4)] });
  }
  // 60 % des essais : on dribble en rythme (appui à chaque retombée), comme un joueur à l'aise
  const rhythm = rng() < 0.6;
  const presses = [];
  const k = 1 + Math.floor(rng() * 5);
  for (let i = 0; i < k; i++) presses.push(rng() * 3);
  presses.sort((a, b) => a - b);
  return { segs, presses, rhythm, rhythmStart: rng() * 1.5, rhythmCount: 1 + Math.floor(rng() * 6) };
}

/** Joue un script ; renvoie { ok, death }. */
export function play(start, goal, wait, s, prep) {
  const g = setup(start, wait, prep);
  let pi = 0;
  let deaths = 0;
  let rhythmDone = 0;
  let wasGrounded = true;
  g.events.on('death', () => deaths++);
  const steps = Math.round(4.5 / DT);
  for (let i = 0; i < steps; i++) {
    const t = i * DT;
    const seg = s.segs.find((x) => t < x.until);
    const axis = seg ? seg.axis : 0;
    g.controller.left = axis < 0;
    g.controller.right = axis > 0;
    if (s.rhythm) {
      const landed = g.body.grounded && !wasGrounded;
      if (t >= s.rhythmStart && rhythmDone < s.rhythmCount && (rhythmDone === 0 || landed)) {
        g.controller.pressBounce();
        rhythmDone++;
      }
    } else {
      while (pi < s.presses.length && s.presses[pi] <= t) {
        g.controller.pressBounce();
        pi++;
      }
    }
    wasGrounded = g.body.grounded;
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
  const TRIES = Number(args[0] ?? 500);
  const ONLY = args[1] !== undefined ? Number(args[1]) : null;
  const solutions = [];
  console.log(`${TRIES} essais aléatoires par passage\n`);
  ROUTES.forEach(([name, start, goal, prep, expert], idx) => {
    if (ONLY !== null && idx !== ONLY) return;
    const rng = createRng(1000 + idx);
    let ok = 0;
    let deaths = 0;
    let example = null;
    for (let i = 0; i < TRIES; i++) {
      const wait = 36 + Math.floor(rng() * 300); // phase aléatoire des éléments mobiles
      const script = randomScript(rng);
      const r = play(start, goal, wait, script, prep);
      if (r.ok) {
        ok++;
        example ??= { wait, script };
      }
      if (r.death) deaths++;
    }
    const pct = (100 * ok) / TRIES;
    const bar = '█'.repeat(Math.round(pct / 4)).padEnd(25, '·');
    const expertOk = expert ? expert(setup(start, 36, prep)) : null;
    const flag = expertOk === true ? '  (solution experte ✓)' : expertOk === false ? '  ⚠ solution experte en échec' : ok === 0 ? '  ⚠ IMPOSSIBLE ?' : '';
    console.log(`${String(idx).padStart(2)} ${name.padEnd(46)} ${bar} ${pct.toFixed(1).padStart(5)} %  (morts ${((100 * deaths) / TRIES).toFixed(0)} %)${flag}`);
    solutions[idx] = example;
  });
  if (SAVE) {
    const out = new URL('../tests/fixtures/routes.json', import.meta.url);
    writeFileSync(out, JSON.stringify(ROUTES.map(([name], i) => ({ name, ...solutions[i] })), null, 1));
    console.log('\nSolutions enregistrées dans tests/fixtures/routes.json');
  }
}
