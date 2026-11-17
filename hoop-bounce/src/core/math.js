// Petites fonctions mathématiques partagées.

export const clamp = (v, min, max) => (v < min ? min : v > max ? max : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const invLerp = (a, b, v) => (a === b ? 0 : (v - a) / (b - a));
export const sign = (v) => (v < 0 ? -1 : 1);

/** Interpolation d'angle par le plus court chemin. */
export function lerpAngle(a, b, t) {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

/**
 * Amortissement critique (« SmoothDamp ») : rejoint une cible sans dépassement,
 * de façon indépendante du framerate. `state` = { value, velocity }.
 */
export function smoothDamp(state, target, smoothTime, dt) {
  const omega = 2 / Math.max(0.0001, smoothTime);
  const x = omega * dt;
  const exp = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
  const change = state.value - target;
  const temp = (state.velocity + omega * change) * dt;
  state.velocity = (state.velocity - omega * temp) * exp;
  state.value = target + (change + temp) * exp;
  return state.value;
}

/** Facteur de lissage exponentiel indépendant du framerate. */
export const damp = (current, target, lambda, dt) => lerp(current, target, 1 - Math.exp(-lambda * dt));

/** Point le plus proche de (px, py) sur le segment [a, b]. Écrit dans `out`. */
export function closestPointOnSegment(px, py, ax, ay, bx, by, out) {
  const abx = bx - ax;
  const aby = by - ay;
  const len2 = abx * abx + aby * aby;
  let t = 0;
  if (len2 > 1e-12) t = clamp(((px - ax) * abx + (py - ay) * aby) / len2, 0, 1);
  out.x = ax + abx * t;
  out.y = ay + aby * t;
  out.t = t;
  return out;
}

/** Générateur pseudo-aléatoire déterministe (mulberry32) pour les effets. */
export function createRng(seed = 1) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
