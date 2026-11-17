// Construit un niveau jouable (monde physique + paniers + données de rendu) à partir de ses données.

import { PhysicsWorld } from '../physics/world.js';
import { createCircle, createPolygonEdges, boxPoints } from '../physics/colliders.js';
import { Hoop } from './hoop.js';

/**
 * @param {object} def     données du niveau (voir levels/test-court.js)
 * @param {object} config  CONFIG
 */
export function buildLevel(def, config) {
  const world = new PhysicsWorld({ gravity: config.physics.gravity });
  const solids = [];

  for (const s of def.solids) {
    const material = config.materials[s.material];
    if (!material) throw new Error(`Matériau inconnu : ${s.material}`);
    if (s.type === 'circle') {
      world.add(createCircle(s.x, s.y, s.r, material, s.style));
      solids.push({ kind: 'circle', x: s.x, y: s.y, r: s.r, style: s.style });
    } else {
      const points = s.type === 'box' ? boxPoints(s.x, s.y, s.w, s.h) : s.points;
      world.add(createPolygonEdges(points, material, s.style));
      solids.push({ kind: 'poly', points, style: s.style });
    }
  }

  const floorY = 0;
  const hoops = def.hoops.map(
    (h) => new Hoop({ floorY, ...h }, config.hoop, config.ball.radius, config.materials),
  );
  for (const h of hoops) world.add(h.colliders);

  return { def, world, solids, hoops, spawn: def.spawn, bounds: def.bounds };
}
