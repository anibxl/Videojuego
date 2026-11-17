// Construit un niveau jouable (monde physique, éléments, pièges, bonus, panier) à partir de ses données.

import { PhysicsWorld } from '../physics/world.js';
import { createPolygonEdges, createOneWay, boxPoints } from '../physics/colliders.js';
import { Mover } from '../physics/mover.js';
import { Hoop } from './hoop.js';
import { Door, Fan, Teleporter } from './elements.js';

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
  const world = new PhysicsWorld({ gravity: config.physics.gravity });
  const mat = (name, fallback) => {
    const m = M[name ?? fallback];
    if (!m) throw new Error(`Matériau inconnu : ${name}`);
    return m;
  };

  const solids = (def.solids ?? []).map((s) => {
    const points = s.points ?? boxPoints(s.x, s.y, s.w, s.h);
    world.add(createPolygonEdges(points, mat(s.material, s.style === 'ground' ? 'ground' : s.style === 'wall' ? 'wall' : 'platform'), s.style));
    return { ...s, points };
  });

  const planks = (def.planks ?? []).map((p) => {
    world.add(createOneWay(p.x1, p.x2, p.y, M.plank, 'plank'));
    return { ...p };
  });

  const movers = (def.movers ?? []).map((m) => {
    const mover = new Mover(createPolygonEdges(boxPoints(m.x, m.y, m.w, m.h), M.platform, 'mover'), m.path);
    world.addMover(mover);
    return { ...m, mover };
  });

  // Trampoline : toile affleurante, sans bords (la balle roule dessus sans buter)
  const trampolines = (def.trampolines ?? []).map((t) => {
    world.add(createOneWay(t.x, t.x + t.w, t.y + TRAMPOLINE_HEIGHT, M.trampoline, 'trampoline'));
    return { ...t, h: TRAMPOLINE_HEIGHT, flex: 0 };
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

  const hoop = new Hoop({ floorY: 0, ...def.hoop }, config.hoop, config.ball.radius, M);
  world.add(hoop.colliders);

  return {
    def,
    world,
    solids,
    planks,
    movers,
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
