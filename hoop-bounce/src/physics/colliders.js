// Formes de collision.
//
// Une seule primitive : la « capsule » (segment épaissi d'un rayon r).
//  - segment fin  : r = 0         (côtés des plateformes)
//  - cercle       : a = b         (cercle du panier)
//  - barre arrondie : a ≠ b, r > 0
// Options :
//  - oneWay : plateforme traversable par en dessous (on ne la heurte qu'en tombant dessus)
//  - vx, vy : vitesse de la surface (plateformes mobiles) — le ballon est entraîné par frottement

let nextId = 1;

/**
 * @typedef {{restitution:number, friction:number}} Material
 * @typedef {{
 *   id:number, ax:number, ay:number, bx:number, by:number, r:number,
 *   nx:number, ny:number, material:Material, tag:string, oneWay:boolean, vx:number, vy:number,
 *   minX:number, minY:number, maxX:number, maxY:number
 * }} Capsule
 */

/** @returns {Capsule} */
export function createCapsule(ax, ay, bx, by, r, material, tag = 'solid', nx = 0, ny = 1) {
  const c = {
    id: nextId++,
    ax, ay, bx, by, r,
    nx, ny, // normale de secours si le centre du ballon tombe exactement sur la forme
    material,
    tag,
    oneWay: false,
    vx: 0,
    vy: 0,
    minX: 0, minY: 0, maxX: 0, maxY: 0,
  };
  updateBounds(c);
  return c;
}

export function updateBounds(c) {
  c.minX = Math.min(c.ax, c.bx) - c.r;
  c.minY = Math.min(c.ay, c.by) - c.r;
  c.maxX = Math.max(c.ax, c.bx) + c.r;
  c.maxY = Math.max(c.ay, c.by) + c.r;
}

export function createCircle(x, y, r, material, tag = 'solid') {
  return createCapsule(x, y, x, y, r, material, tag, 0, 1);
}

/** Plateforme traversable : un seul segment horizontal, heurté uniquement par le dessus. */
export function createOneWay(x1, x2, y, material, tag = 'plank') {
  const c = createCapsule(x1, y, x2, y, 0, material, tag, 0, 1);
  c.oneWay = true;
  return c;
}

/**
 * Polygone fermé → une capsule fine par côté.
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
