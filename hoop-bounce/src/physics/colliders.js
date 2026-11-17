// Formes de collision statiques.
//
// Une seule primitive : la « capsule » (segment épaissi d'un rayon r).
//  - segment fin  : r = 0         (côtés des plateformes)
//  - cercle       : a = b         (cercle du panier, bumpers)
//  - barre arrondie : a ≠ b, r > 0
// Un seul chemin de code = des collisions précises et faciles à maintenir.

let nextId = 1;

/**
 * @typedef {{restitution:number, friction:number}} Material
 * @typedef {{
 *   id:number, ax:number, ay:number, bx:number, by:number, r:number,
 *   nx:number, ny:number, material:Material, tag:string,
 *   minX:number, minY:number, maxX:number, maxY:number
 * }} Capsule
 */

/** @returns {Capsule} */
export function createCapsule(ax, ay, bx, by, r, material, tag = 'solid', nx = 0, ny = 1) {
  return {
    id: nextId++,
    ax, ay, bx, by, r,
    nx, ny, // normale de secours si le centre du ballon tombe exactement sur la forme
    material,
    tag,
    minX: Math.min(ax, bx) - r,
    minY: Math.min(ay, by) - r,
    maxX: Math.max(ax, bx) + r,
    maxY: Math.max(ay, by) + r,
  };
}

export function createCircle(x, y, r, material, tag = 'solid') {
  return createCapsule(x, y, x, y, r, material, tag, 0, 1);
}

/**
 * Polygone convexe ou concave fermé → une capsule fine par côté.
 * Les points peuvent être dans n'importe quel sens : on les remet en sens trigonométrique
 * pour que les normales de secours pointent vers l'extérieur.
 */
export function createPolygonEdges(points, material, tag = 'solid') {
  const pts = isCounterClockwise(points) ? points : [...points].reverse();
  const edges = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    edges.push(createCapsule(a.x, a.y, b.x, b.y, 0, material, tag, dy / len, -dx / len));
  }
  return edges;
}

export function boxPoints(x, y, w, h) {
  return [
    { x, y },
    { x: x + w, y },
    { x: x + w, y: y + h },
    { x, y: y + h },
  ];
}

export function isCounterClockwise(points) {
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    area += a.x * b.y - b.x * a.y;
  }
  return area > 0;
}
