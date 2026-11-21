// Visée du lance-pierre : passage du geste (tirer vers l'arrière) au tir, et trajectoire pointillée.
//
// Le joueur tire le ballon vers l'arrière : le tir part dans la direction opposée, avec une puissance
// proportionnelle à la distance de tirage. La trajectoire affichée est l'arc balistique au départ du
// tir, arrêté au premier obstacle et limité dans le temps : elle aide à viser sans dévoiler les rebonds
// (simple à comprendre, difficile à maîtriser).

import { clamp } from '../core/math.js';
import { TRICKSHOT } from './config.js';

/** Geste → tir. dx, dy : tirage (doigt − ballon), en unités du monde. */
export function aimFromDrag(dx, dy) {
  const len = Math.hypot(dx, dy);
  const power = clamp(len / TRICKSHOT.maxDrag, 0, 1);
  const angle = Math.atan2(-dy, -dx);
  return { angle, power, valid: power >= TRICKSHOT.minPower };
}

const inside = (x, y, b) => x > b.x0 && x < b.x1 && y > b.y0 && y < b.y1;

/** Point dans un polygone (rampes) : test du rayon horizontal. */
function inPoly(x, y, pts) {
  let c = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const a = pts[i];
    const b = pts[j];
    if (a.y > y !== b.y > y && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) c = !c;
  }
  return c;
}

/**
 * Points de la trajectoire prévue.
 * @param {object} level   niveau construit (game.level)
 * @param {{x:number,y:number}} from
 * @param {number} angle
 * @param {number} power
 * @param {{maxTime?:number, step?:number, gravitySign?:number}} [o]
 * @returns {{x:number,y:number}[]}
 */
export function trajectory(level, from, angle, power, { maxTime = 0.75, step = 1 / 30, gravitySign = 1 } = {}) {
  const v = TRICKSHOT.maxSpeed * power * Math.sqrt(level.gravityScale ?? 1);
  const vx = Math.cos(angle) * v;
  const vy = Math.sin(angle) * v;
  const g = level.gravity * gravitySign;
  const pts = [];
  const boxes = level.solids.filter((s) => s.box);
  const polys = level.solids.filter((s) => !s.box && s.points);
  const B = level.bounds;
  for (let t = step; t <= maxTime + 1e-9; t += step) {
    const x = from.x + vx * t;
    const y = from.y + vy * t - 0.5 * g * t * t;
    if (x < B.minX - 1 || x > B.maxX + 1 || y < B.minY - 1) break;
    if (boxes.some((b) => inside(x, y, b))) break;
    if (polys.some((p) => inside(x, y, p) && inPoly(x, y, p.points))) break;
    pts.push({ x, y });
  }
  return pts;
}
