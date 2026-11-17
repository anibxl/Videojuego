// Tests de contact avec les pièges. Les zones mortelles sont un peu plus petites que
// leur dessin (`forgiveness`) : un frôlement ne tue jamais, le joueur trouve ça juste.

import { clamp } from '../core/math.js';

/** Distance entre un point et un rectangle (0 si dedans). */
function distToRect(px, py, x0, y0, x1, y1) {
  const dx = px - clamp(px, x0, x1);
  const dy = py - clamp(py, y0, y1);
  return Math.hypot(dx, dy);
}

/** Le ballon (x, y, r) touche-t-il une rangée de piques ? */
export function touchesSpikes(x, y, r, s, forgiveness) {
  const f = forgiveness;
  const x0 = s.x + f;
  const x1 = s.x + s.w - f;
  // Les pointes occupent surtout la moitié basse de la hauteur : on retire plus côté pointes
  const tipCut = f * 1.5;
  let y0;
  let y1;
  if (s.dir === 'down') {
    y0 = s.y - s.h + tipCut;
    y1 = s.y;
  } else {
    y0 = s.y;
    y1 = s.y + s.h - tipCut;
  }
  return distToRect(x, y, x0, y0, x1, y1) < r;
}

export function touchesSaw(x, y, r, saw, forgiveness) {
  const d = Math.hypot(x - saw.cx, y - saw.cy);
  return d < r + saw.r - forgiveness;
}
