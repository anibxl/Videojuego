// Construit un niveau jouable (monde physique, pièges, bonus, panier) à partir de ses données.

import { PhysicsWorld } from '../physics/world.js';
import { createPolygonEdges, createOneWay, boxPoints } from '../physics/colliders.js';
import { Mover } from '../physics/mover.js';
import { Hoop } from './hoop.js';

export const SPIKE_HEIGHT = 0.45;
export const PAD_HEIGHT = 0.15;

/**
 * @param {object} def     données du niveau (voir levels/demo.js)
 * @param {object} config  CONFIG
 */
export function buildLevel(def, config) {
  const M = config.materials;
  const world = new PhysicsWorld({ gravity: config.physics.gravity });

  const solids = def.solids.map((s) => {
    const material = M[s.material ?? 'platform'];
    if (!material) throw new Error(`Matériau inconnu : ${s.material}`);
    const points = boxPoints(s.x, s.y, s.w, s.h);
    world.add(createPolygonEdges(points, material, s.style));
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

  const pads = (def.pads ?? []).map((p) => {
    world.add(createPolygonEdges(boxPoints(p.x, p.y, p.w, PAD_HEIGHT), M.pad, 'pad'));
    return { ...p, h: PAD_HEIGHT, squash: 0 };
  });

  const spikes = (def.spikes ?? []).map((s) => ({ ...s, h: SPIKE_HEIGHT }));
  const saws = (def.saws ?? []).map((s) => ({ ...s, cx: s.x, cy: s.y }));
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
    pads,
    spikes,
    saws,
    stars,
    checkpoints,
    hoop,
    hints: def.hints ?? [],
    bounds: def.bounds,
    spawn: def.spawn,
  };
}
