// Kit de construction des niveaux (refonte de la phase 2).
//
// Un niveau se construit de gauche à droite, SECTION par SECTION. Chaque section est écrite dans ses
// propres coordonnées (x = 0 au début de la section) ; le kit décale tout automatiquement : éléments,
// étoiles, indices peints, points de contrôle, et même les solutions expertes (`passages`).
//
//   const L = level({ id, number, nameKey, difficulty, idea }, (c) => {
//     c.section(18, (s) => {
//       s.ground(0, 18);
//       s.add('solids', { x: 8, y: 0, w: 2, h: 2, style: 'block' });
//       s.star(9, 3);
//       s.pass('Le mur', [1, 0], ['on', 10.5, 17, 0], [['goTo', 6], ['hop', 3, 12]]);
//     });
//     c.section(14, (s) => { … s.hoop(9, 3.4); s.pass('Panier', [2, 0], ['win'], 'shot'); });
//   });
//
// Les solutions expertes sont des plans de manœuvres (voir tools/route-check.mjs) ; le niveau entier est
// vérifié par tools/level-run.mjs (tous les passages joués à la suite, du départ au panier).

const R = 0.4;

/** Champs « position x » de chaque groupe d'éléments (décalés avec la section). */
const X_FIELDS = {
  lasers: ['x1', 'x2'],
  boulders: ['x1', 'x2'],
  planks: ['x1', 'x2'],
  branches: ['x1', 'x2'],
};
/** Arguments « position x » de chaque manœuvre des plans (index dans la liste des arguments). */
const PLAN_X = {
  goTo: [0], hop: [1], jump: [1], hold: [1], run: [1, 2], jumpAt: [1, 2], fly: [0], vines: [0],
  dribbleRun: [2, 3], jumpBoulder: [2], dodgeBoulders: [0, 2], float: [0],
};
const GOAL_X = { on: [1, 2], x: [1], crate: [2] };

const shiftNum = (v, dx) => (typeof v === 'number' ? v + dx : v);

function shiftElement(group, el, dx) {
  const e = { ...el };
  if (e.points) e.points = e.points.map((p) => ({ ...p, x: p.x + dx }));
  for (const k of X_FIELDS[group] ?? ['x']) if (typeof e[k] === 'number') e[k] += dx;
  if (e.a) e.a = { ...e.a, x: e.a.x + dx };
  if (e.b) e.b = { ...e.b, x: e.b.x + dx };
  // Pièges déclenchés : la zone de déclenchement suit la section
  if (e.trigger) e.trigger = { ...e.trigger, x1: e.trigger.x1 + dx, x2: e.trigger.x2 + dx };
  return e;
}

function shiftPlan(plan, dx) {
  if (plan === 'shot') return plan;
  return plan.map(([name, ...args]) => {
    const idx = PLAN_X[name] ?? [];
    return [name, ...args.map((a, i) => (idx.includes(i) ? shiftNum(a, dx) : a))];
  });
}

function shiftGoal(goal, dx) {
  const idx = GOAL_X[goal[0]] ?? [];
  return goal.map((a, i) => (idx.includes(i) ? shiftNum(a, dx) : a));
}

/**
 * Construit un niveau.
 * @param {object} meta  id, number, nameKey, difficulty, idea (l'idée du niveau, pour la doc), maxY…
 * @param {(c: object) => void} build
 */
export function level(meta, build) {
  const L = { ...meta, solids: [], stars: [], hints: [], checkpoints: [], passages: [] };
  let cursor = 0;
  const add = (group, ...items) => {
    L[group] ??= [];
    const first = L[group].length;
    L[group].push(...items);
    return first;
  };
  const c = {
    /** Ajoute une section de longueur `len`. */
    section(len, fn) {
      const dx = cursor;
      const s = {
        x0: dx,
        len,
        /** Ajoute un ou plusieurs éléments (coordonnées locales) ; renvoie l'index du premier dans le niveau. */
        add: (group, ...items) => add(group, ...items.map((e) => shiftElement(group, e, dx))),
        /** Sol plein de x0 à x1, dessus à `top`. */
        ground: (x0, x1, top = 0, style = 'ground') => add('solids', shiftElement('solids', { x: x0, y: -6, w: x1 - x0, h: top + 6, style }, dx)),
        /** Bloc posé (marche, mur, estrade). */
        block: (x, y, w, h, style = 'block', extra = {}) => add('solids', shiftElement('solids', { x, y, w, h, style, ...extra }, dx)),
        star: (x, y) => L.stars.push({ x: x + dx, y }),
        hint: (x, y, key, size) => L.hints.push({ x: x + dx, y, key, ...(size ? { size } : {}) }),
        checkpoint: (x, y = 0) => L.checkpoints.push({ x: x + dx, y }),
        spawn: (x, y = 0) => (L.spawn = { x: x + dx, y }),
        hoop: (x, rim = 3.4, floorY = 0, extra = {}) => (L.hoop = { x: x + dx, y: floorY + rim, facing: -1, mount: 'pole', floorY, ...extra }),
        /** Passage vérifié : départ [x, surface], objectif, plan expert (coordonnées locales). */
        pass: (name, start, goal, plan) => L.passages.push({ name, start: [start[0] + dx, start[1]], goal: shiftGoal(goal, dx), plan: shiftPlan(plan, dx) }),
      };
      fn(s);
      cursor += len;
      return s;
    },
    get x() {
      return cursor;
    },
  };
  build(c);
  const end = cursor;
  // Toujours 3 étoiles par niveau : quand les étapes en proposent plus, on garde la première, celle du milieu et
  // la dernière (réparties sur tout le niveau, de plus en plus difficiles à atteindre)
  if (L.stars.length > 3) {
    const st = [...L.stars].sort((a, b) => a.x - b.x);
    L.stars = [st[0], st[Math.floor((st.length - 1) / 2)], st[st.length - 1]];
  }
  // Murs aux deux bouts, limites de la caméra
  L.solids.push({ x: -4, y: -6, w: 4, h: 22, style: 'wall' }, { x: end, y: -6, w: 4, h: 22, style: 'wall' });
  L.bounds = { minX: -1.5, maxX: end + 1.5, minY: -4, maxY: meta.maxY ?? 10.5 };
  delete L.maxY;
  if (!L.checkpoints.length) delete L.checkpoints;
  if (!L.hints.length) delete L.hints;
  return L;
}

/** Hauteur d'un rebond (centre du ballon) par puissance, et hauteur franchissable d'un obstacle. */
export const BOUNCE = [1.4, 2.2, 3.1, 4.1, 5.2];
export const clearHeight = (power) => BOUNCE[power - 1] + R - 0.25;
