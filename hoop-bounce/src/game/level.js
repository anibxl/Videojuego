// Construit un niveau jouable (monde physique, éléments, pièges, bonus, panier) à partir de ses données.

import { PhysicsWorld } from '../physics/world.js';
import { createPolygonEdges, createOneWay, createCircle, boxPoints } from '../physics/colliders.js';
import { Mover } from '../physics/mover.js';
import { Hoop } from './hoop.js';
import { Door, Fan, Teleporter } from './elements.js';
import { Crate, WindZone, Icicle, Lava, Crumble, Geyser, RockFall, Vine, GravityZone, Faller, Blinker, Mace, Laser, Magnet, Cannon } from './world-elements.js';

/** Matériau par défaut selon le style d'un bloc. */
const STYLE_MATERIAL = { ground: 'ground', wall: 'wall', ice: 'ice', snow: 'snow', rock: 'rock', wood: 'wood' };

export const SPIKE_HEIGHT = 0.45;
// Les éléments posés au sol restent bas : la balle doit pouvoir rouler dessus sans buter.
export const TRAMPOLINE_HEIGHT = 0.04;
export const SWITCH_HEIGHT = 0.14;

/**
 * @param {object} def     données du niveau (voir levels/level-01.js)
 * @param {object} config  CONFIG
 */
export function buildLevel(def, config) {
  const M = config.materials;
  // Gravité du niveau (monde Espace : gravité réduite)
  const gravity = config.physics.gravity * (def.gravityScale ?? 1);
  const world = new PhysicsWorld({ gravity });
  const mat = (name, fallback) => {
    const m = M[name ?? fallback];
    if (!m) throw new Error(`Matériau inconnu : ${name}`);
    return m;
  };

  const solids = (def.solids ?? []).map((s) => {
    const points = s.points ?? boxPoints(s.x, s.y, s.w, s.h);
    world.add(createPolygonEdges(points, mat(s.material, STYLE_MATERIAL[s.style] ?? 'platform'), s.style));
    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);
    return { ...s, points, box: !s.points, x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
  });

  // Plateformes traversables (planches de bois…) : on les traverse par en dessous
  const planks = (def.planks ?? []).map((p) => {
    world.add(createOneWay(p.x1, p.x2, p.y, mat(p.material, p.style === 'wood' ? 'wood' : 'plank'), 'plank'));
    return { ...p };
  });

  // Plateformes mobiles. style : platform (défaut), stone (ascenseur de pierre), float (plateforme flottante)
  const movers = (def.movers ?? []).map((m) => {
    const material = mat(m.material, m.style === 'stone' ? 'rock' : 'platform');
    const mover = new Mover(createPolygonEdges(boxPoints(m.x, m.y, m.w, m.h), material, 'mover'), m.path);
    world.addMover(mover);
    return { ...m, mover };
  });

  // Branches qui bougent : planches traversables mobiles
  const branches = (def.branches ?? []).map((br) => {
    const mover = new Mover([createOneWay(br.x1, br.x2, br.y, M.wood, 'branch')], br.path);
    world.addMover(mover);
    return { ...br, mover };
  });

  // Corps ronds mobiles : troncs qui roulent (forêt), astéroïdes (espace)
  const rollers = [
    ...(def.logs ?? []).map((l) => ({ ...l, kind: 'log' })),
    ...(def.asteroids ?? []).map((a) => ({ ...a, kind: 'asteroid' })),
  ].map((r) => {
    const mover = new Mover([createCircle(r.x, r.y, r.r, M[r.kind], r.kind)], r.path ?? { dx: 0, dy: 0, period: 1 });
    world.addMover(mover);
    return { ...r, mover };
  });

  // Trampoline : toile affleurante, sans bords (la balle roule dessus sans buter)
  const trampolines = (def.trampolines ?? []).map((t) => {
    world.add(createOneWay(t.x, t.x + t.w, t.y + TRAMPOLINE_HEIGHT, M.trampoline, 'trampoline'));
    return { ...t, h: TRAMPOLINE_HEIGHT, flex: 0 };
  });

  // Champignons rebondissants : comme un trampoline, avec une hauteur propre (en u)
  const mushrooms = (def.mushrooms ?? []).map((m, index) => {
    const c = createOneWay(m.x, m.x + m.w, m.y, M.mushroom, 'mushroom');
    c.mushroomIndex = index;
    world.add(c);
    const height = m.height ?? 6;
    return { ...m, index, flex: 0, velocity: Math.sqrt(2 * gravity * height) };
  });

  const switches = (def.switches ?? []).map((s, index) => {
    const edges = createPolygonEdges(boxPoints(s.x, s.y, s.w, SWITCH_HEIGHT), M.platform, 'switch');
    for (const e of edges) e.switchIndex = index;
    world.add(edges);
    return { ...s, index, h: SWITCH_HEIGHT, pressed: false, press: 0 };
  });

  const doors = (def.doors ?? []).map((d) => {
    const door = new Door(d, createPolygonEdges(boxPoints(d.x, d.y, d.w, d.h), M.door, 'door'));
    world.add(door.colliders);
    return door;
  });

  // Le ventilateur est encastré dans le sol (une grille) : la balle roule dessus
  const fans = (def.fans ?? []).map((f) => new Fan(f));

  const teleporters = (def.teleporters ?? []).map((t) => new Teleporter(t));
  const spikes = (def.spikes ?? []).map((s) => ({ ...s, h: SPIKE_HEIGHT }));
  const stars = (def.stars ?? []).map((s, index) => ({ ...s, index, collected: false, collectedAt: 0 }));
  const checkpoints = (def.checkpoints ?? []).map((c, index) => ({ ...c, index, active: false, activatedAt: 0 }));

  // Plateformes qui s'effondrent
  const crumbles = (def.crumbles ?? []).map((cr, index) => {
    const edges = createPolygonEdges(boxPoints(cr.x, cr.y, cr.w, cr.h ?? 0.45), M.rock, 'crumble');
    for (const e of edges) e.crumbleIndex = index;
    world.add(edges);
    return new Crumble(cr, edges, config.crumble);
  });

  // Plateformes qui tombent
  const fallers = (def.fallers ?? []).map((f, index) => {
    const edges = createPolygonEdges(boxPoints(f.x, f.y, f.w, f.h ?? 0.4), M.platform, 'faller');
    for (const e of edges) e.fallerIndex = index;
    world.add(edges);
    return new Faller(f, edges, config.faller);
  });

  // Blocs temporisés (plateformes et murs qui apparaissent puis disparaissent)
  const blinkers = (def.blinkers ?? []).map((b) => {
    const edges = createPolygonEdges(boxPoints(b.x, b.y, b.w, b.h ?? 0.45), b.h > 1.5 ? M.wall : M.platform, 'blinker');
    world.add(edges);
    return new Blinker(b, edges, config.blinker);
  });

  const hoop = new Hoop({ floorY: 0, ...def.hoop }, config.hoop, config.ball.radius, M);
  world.add(hoop.colliders);

  // Caisses : elles butent contre les blocs rectangulaires du niveau
  const boxes = solids.filter((s) => s.box).map((s) => ({ x0: s.x0, x1: s.x1, y0: s.y0, y1: s.y1 }));
  const crates = (def.crates ?? []).map((c) => {
    const w = c.w ?? 1.2;
    const h = c.h ?? 1.2;
    const crate = new Crate({ ...c, w, h }, createPolygonEdges(boxPoints(c.x, c.y, w, h), M.crate, 'crate'), boxes, config.crate);
    world.add(crate.colliders);
    return crate;
  });

  // Éléments qui ont besoin de connaître le sol sous eux : à construire après les formes fixes
  const floorBelow = (x, y) => {
    const f = world.surfaceBelow(x, y);
    return Number.isFinite(f) ? f : (def.bounds?.minY ?? -4);
  };
  const icicles = (def.icicles ?? []).map((i) => new Icicle(i, floorBelow(i.x, i.y - (i.len ?? 1.3) - 0.01), config.icicle));
  const rockfalls = (def.rockfalls ?? []).map((r) => new RockFall(r, floorBelow(r.x, r.y - 0.01), config.rockfall));
  const winds = (def.winds ?? []).map((w) => new WindZone(w));
  // Liquides mortels : lave (volcan), eau de la rivière (forêt)
  const lavas = [
    ...(def.lava ?? []).map((l) => new Lava({ kind: 'lava', ...l })),
    ...(def.water ?? []).map((l) => new Lava({ kind: 'water', ...l })),
  ];
  const geysers = (def.geysers ?? []).map((g) => new Geyser(g, config.geyser));
  const vines = (def.vines ?? []).map((v) => new Vine(v, config.vine));
  const gravityZones = (def.gravityZones ?? []).map((z) => new GravityZone(z));
  const saws = (def.saws ?? []).map((sw) => ({ ...sw, r: sw.r ?? 0.6, cx: sw.x, cy: sw.y }));
  const maces = (def.maces ?? []).map((m) => new Mace(m));
  const lasers = (def.lasers ?? []).map((l) => new Laser(l, config.laser));
  const magnets = (def.magnets ?? []).map((m) => new Magnet(m));
  // Canons : portée = distance jusqu'au premier bloc dans l'axe du tir
  const inBox = (x, y) => boxes.some((b) => x > b.x0 && x < b.x1 && y > b.y0 && y < b.y1);
  const cannons = (def.cannons ?? []).map((c) => {
    const a = c.angle ?? (c.dir === -1 ? Math.PI : 0);
    let d = 0;
    while (d < 40 && !inBox(c.x + Math.cos(a) * (0.6 + d), c.y + Math.sin(a) * (0.6 + d))) d += 0.1;
    return new Cannon(c, d, config.cannon);
  });

  return {
    def,
    world,
    gravity,
    gravityScale: def.gravityScale ?? 1,
    jumpScale: def.jumpScale ?? 1,
    theme: def.theme ?? 'city',
    solids,
    planks,
    movers,
    branches,
    rollers,
    mushrooms,
    crumbles,
    crates,
    icicles,
    rockfalls,
    winds,
    lavas,
    geysers,
    vines,
    gravityZones,
    saws,
    fallers,
    blinkers,
    maces,
    lasers,
    magnets,
    cannons,
    trampolines,
    switches,
    doors,
    fans,
    teleporters,
    spikes,
    stars,
    checkpoints,
    hoop,
    hints: def.hints ?? [],
    bounds: def.bounds,
    spawn: def.spawn,
  };
}
