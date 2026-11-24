// MODE FANTÔME (phase 3) — le meilleur essai de chaque niveau, rejoué à côté du joueur.
//
// Le fantôme est une AIDE VISUELLE : il ne touche jamais à la simulation (aucune collision, aucune
// physique, aucun score). Ce module n'a aucune dépendance au navigateur : il est testé en Node.
//
//  - GhostRecorder : pendant la partie, relève la position, la rotation et les rebonds du ballon sur la
//    même horloge que le chronomètre du niveau (`game.runTime`, qui ne tourne que pendant le jeu).
//    Un échantillon tous les 2 pas de simulation : 60 par seconde de course (pas = 1/120 s).
//  - encodeGhost / decodeGhost : format compact. Chaque échantillon est stocké en ÉCART avec le précédent
//    (3 octets : x, y, rotation, au centième), avec un code d'échappement pour les sauts (téléporteur,
//    retour au drapeau). Une minute de course ≈ 11 Ko, ≈ 14 Ko une fois en texte (base64).
//  - GhostPlayer : rejoue l'essai au temps demandé, avec interpolation entre deux échantillons (au plus
//    1/120 s d'écart avec la vraie trajectoire : invisible), sans interpolation à travers un saut.
//  - GhostStore : une entrée par niveau dans le stockage de l'appareil (`hoopbounce.ghost.<id>`), qui ne
//    garde que le meilleur essai. Nouvelle clé : les sauvegardes existantes ne sont jamais modifiées.

export const GHOST_VERSION = 1;
/** Échantillons par seconde de course. */
export const GHOST_HZ = 60;
/** Quantification : positions et rotation au centième (0,01 u, 0,01 rad). */
const Q = 100;
const ESC = -128;
const TAU = Math.PI * 2;
/** Au-delà de cet écart entre deux échantillons (u), c'est un saut : pas d'interpolation. */
const JUMP = 1.5;
/** Vitesse d'impact minimale pour qu'un contact compte comme un rebond (u/s). */
const BOUNCE_MIN = 2.5;

/** Un tour complet, en centièmes de radian (entier : le repliement des rotations est exact). */
const TURN = Math.round(TAU * Q);
const fold = (a) => ((a % TURN) + TURN) % TURN;

// ─── Enregistrement ──────────────────────────────────────────────────────────

export class GhostRecorder {
  /** @param {number} dt pas de simulation (s) */
  constructor(dt) {
    this.dt = dt;
    this.stepsPerSample = Math.max(1, Math.round(1 / (GHOST_HZ * dt)));
    this.cap = 4096;
    this.buf = new Int32Array(this.cap * 3);
    this.bounces = [];
    this.reset();
  }

  reset() {
    this.n = 0;
    this.lastRun = -1;
    this.bounces.length = 0;
    this.angle = 0;
  }

  /** À brancher sur l'événement `impact` du jeu : un rebond à l'instant de course `runTime`. */
  bounce(runTime, speed) {
    if (speed < BOUNCE_MIN || this.n === 0) return;
    const i = Math.round(runTime * GHOST_HZ);
    if (this.bounces.length && this.bounces[this.bounces.length - 1] >= i) return;
    this.bounces.push(i);
  }

  /**
   * À appeler au départ (temps de course 0) puis après chaque pas de simulation : relève la position
   * exactement sur chaque cran de la grille (n / 60 s de course). Pendant une mort, le chronomètre est
   * arrêté : rien n'est relevé.
   */
  step(game) {
    const run = game.runTime;
    if (run < this.lastRun - 1e-9) this.reset(); // le niveau a recommencé
    this.lastRun = run;
    const steps = Math.round(run / this.dt);
    if (steps < this.n * this.stepsPerSample) return;
    const b = game.body;
    // (si des crans ont été sautés, ils reçoivent la position actuelle)
    while (this.n * this.stepsPerSample <= steps) {
      if (this.n >= this.cap) this._grow();
      const k = this.n * 3;
      this.buf[k] = Math.round(b.x * Q);
      this.buf[k + 1] = Math.round(b.y * Q);
      this.buf[k + 2] = Math.round(b.angle * Q);
      this.n++;
    }
  }

  _grow() {
    const next = new Int32Array(this.cap * 2 * 3);
    next.set(this.buf);
    this.buf = next;
    this.cap *= 2;
  }

  /** Essai terminé : données prêtes à enregistrer. */
  finish({ time, stars = 0, deaths = 0 } = {}) {
    return {
      v: GHOST_VERSION,
      hz: GHOST_HZ,
      t: time,
      n: this.n,
      d: encodeSamples(this.buf, this.n),
      b: this.bounces.slice(),
      s: stars,
      k: deaths,
      at: Date.now(),
    };
  }
}

// ─── Encodage compact ────────────────────────────────────────────────────────

/** Échantillons entiers (x, y, rotation continue, au centième) → texte base64. */
export function encodeSamples(buf, n) {
  const out = new Uint8Array(n * 7);
  const dv = new DataView(out.buffer);
  let o = 0;
  let px = 0;
  let py = 0;
  let pa = 0;
  for (let i = 0; i < n; i++) {
    const x = buf[i * 3];
    const y = buf[i * 3 + 1];
    const a = buf[i * 3 + 2];
    const dx = x - px;
    const dy = y - py;
    const da = a - pa;
    const small = (v) => v > ESC && v <= 127;
    if (i > 0 && small(dx) && small(dy) && small(da)) {
      out[o++] = dx & 0xff;
      out[o++] = dy & 0xff;
      out[o++] = da & 0xff;
    } else {
      out[o++] = ESC & 0xff;
      dv.setInt16(o, clamp16(x), true);
      dv.setInt16(o + 2, clamp16(y), true);
      dv.setInt16(o + 4, fold(a), true); // rotation repliée sur un tour (exact : entiers)
      o += 6;
    }
    px = x;
    py = y;
    pa = a;
  }
  return toBase64(out.subarray(0, o));
}

const clamp16 = (v) => Math.max(-32767, Math.min(32767, v));

/** Texte base64 → positions et rotation (rotation continue, en radians). */
export function decodeSamples(text, n) {
  const bytes = fromBase64(text);
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const xs = new Float32Array(n);
  const ys = new Float32Array(n);
  const as = new Float32Array(n);
  let o = 0;
  let x = 0;
  let y = 0;
  let acc = 0;
  for (let i = 0; i < n && o < bytes.length; i++) {
    const head = dv.getInt8(o);
    if (head === ESC) {
      x = dv.getInt16(o + 1, true);
      y = dv.getInt16(o + 3, true);
      const na = dv.getInt16(o + 5, true);
      // rotation repliée : la rotation continue reprend au plus court depuis la précédente
      acc = i === 0 ? na : acc + shortestTurn(na, fold(acc));
      o += 7;
    } else {
      x += head;
      y += dv.getInt8(o + 1);
      acc += dv.getInt8(o + 2);
      o += 3;
    }
    xs[i] = x / Q;
    ys[i] = y / Q;
    as[i] = acc / Q;
  }
  return { xs, ys, as };
}

/** Plus court écart entre deux rotations repliées (entiers au centième). */
function shortestTurn(to, from) {
  let d = (to - from) % TURN;
  if (d > TURN / 2) d -= TURN;
  else if (d < -TURN / 2) d += TURN;
  return d;
}

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function toBase64(bytes) {
  let s = '';
  let i = 0;
  for (; i + 2 < bytes.length; i += 3) {
    const v = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
    s += B64[v >> 18] + B64[(v >> 12) & 63] + B64[(v >> 6) & 63] + B64[v & 63];
  }
  const rest = bytes.length - i;
  if (rest === 1) {
    const v = bytes[i] << 16;
    s += `${B64[v >> 18]}${B64[(v >> 12) & 63]}==`;
  } else if (rest === 2) {
    const v = (bytes[i] << 16) | (bytes[i + 1] << 8);
    s += `${B64[v >> 18]}${B64[(v >> 12) & 63]}${B64[(v >> 6) & 63]}=`;
  }
  return s;
}

const B64_INDEX = (() => {
  const t = new Int16Array(128).fill(-1);
  for (let i = 0; i < 64; i++) t[B64.charCodeAt(i)] = i;
  return t;
})();

function fromBase64(s) {
  const clean = s.replace(/=+$/, '');
  const out = new Uint8Array(Math.floor((clean.length * 3) / 4));
  let o = 0;
  let v = 0;
  let bits = 0;
  for (let i = 0; i < clean.length; i++) {
    const c = B64_INDEX[clean.charCodeAt(i)] ?? -1;
    if (c < 0) continue;
    v = (v << 6) | c;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out[o++] = (v >> bits) & 0xff;
    }
  }
  return out.subarray(0, o);
}

// ─── Relecture ───────────────────────────────────────────────────────────────

export class GhostPlayer {
  /** @param {ReturnType<GhostRecorder['finish']>} data */
  constructor(data) {
    this.data = data;
    this.hz = data.hz ?? GHOST_HZ;
    this.time = data.t;
    const { xs, ys, as } = decodeSamples(data.d, data.n);
    this.xs = xs;
    this.ys = ys;
    this.as = as;
    this.n = data.n;
    this.bounces = Array.isArray(data.b) ? data.b : [];
    this.duration = (this.n - 1) / this.hz;
    this._bi = 0;
  }

  /**
   * Position du fantôme au temps de course `t`.
   * @returns {{ x, y, angle, done, sinceBounce, jumped }}
   */
  at(t, out = { x: 0, y: 0, angle: 0, done: false, sinceBounce: 9, jumped: false }) {
    const n = this.n;
    out.done = t >= this.duration;
    const f = Math.min(Math.max(t * this.hz, 0), n - 1);
    const i = Math.min(Math.floor(f), n - 1);
    const j = Math.min(i + 1, n - 1);
    const k = f - i;
    const jump = Math.abs(this.xs[j] - this.xs[i]) > JUMP || Math.abs(this.ys[j] - this.ys[i]) > JUMP;
    out.jumped = jump;
    if (jump || j === i) {
      const s = jump && k >= 0.5 ? j : i;
      out.x = this.xs[s];
      out.y = this.ys[s];
      out.angle = this.as[s];
    } else {
      out.x = this.xs[i] + (this.xs[j] - this.xs[i]) * k;
      out.y = this.ys[i] + (this.ys[j] - this.ys[i]) * k;
      out.angle = this.as[i] + (this.as[j] - this.as[i]) * k;
    }
    // Dernier rebond déjà passé (pointeur qui avance ; on repart du début si le temps recule)
    const b = this.bounces;
    if (this._bi > 0 && (this._bi > b.length || b[this._bi - 1] > f)) this._bi = 0;
    while (this._bi < b.length && b[this._bi] <= f) this._bi++;
    out.sinceBounce = this._bi > 0 ? (f - b[this._bi - 1]) / this.hz : 9;
    return out;
  }

  /** Points de la traînée : positions passées, tous les `step` échantillons, les plus récentes en dernier. */
  trail(t, count, step, out) {
    out.length = 0;
    const f = Math.min(Math.max(t * this.hz, 0), this.n - 1);
    const last = Math.floor(f);
    // du plus récent au plus ancien ; la traînée s'arrête à un saut (téléporteur, retour au drapeau)
    let used = 0;
    for (let c = 0; c < count; c++) {
      const i = last - c * step;
      if (i < 0) break;
      if (c > 0) {
        const pi = i + step;
        if (Math.abs(this.xs[pi] - this.xs[i]) > JUMP || Math.abs(this.ys[pi] - this.ys[i]) > JUMP) break;
      }
      out.push(this.xs[i], this.ys[i]);
      used++;
    }
    // remise dans l'ordre : les plus anciens d'abord
    for (let a = 0, b = used - 1; a < b; a++, b--) {
      const ax = out[a * 2];
      const ay = out[a * 2 + 1];
      out[a * 2] = out[b * 2];
      out[a * 2 + 1] = out[b * 2 + 1];
      out[b * 2] = ax;
      out[b * 2 + 1] = ay;
    }
    return out;
  }
}

// ─── Stockage ────────────────────────────────────────────────────────────────

const PREFIX = 'hoopbounce.ghost.';

/** Une donnée de fantôme lue est-elle utilisable ? */
export function isValidGhost(g) {
  return !!g && g.v === GHOST_VERSION && typeof g.t === 'number' && g.t > 0 && Number.isInteger(g.n) && g.n > 1 && typeof g.d === 'string' && g.d.length > 0;
}

export class GhostStore {
  /** @param {Storage|null} storage */
  constructor(storage = safeLocalStorage()) {
    this.storage = storage;
    this.cache = new Map();
  }

  /** Meilleur essai enregistré pour ce niveau (ou null). */
  get(levelId) {
    if (this.cache.has(levelId)) return this.cache.get(levelId);
    let g = null;
    try {
      const raw = this.storage?.getItem(PREFIX + levelId);
      g = raw ? JSON.parse(raw) : null;
    } catch {
      g = null;
    }
    if (!isValidGhost(g)) g = null;
    this.cache.set(levelId, g);
    return g;
  }

  has(levelId) {
    return !!this.get(levelId);
  }

  /** Temps du meilleur essai (ou null). */
  bestTime(levelId) {
    return this.get(levelId)?.t ?? null;
  }

  /**
   * Propose un essai terminé : il remplace l'ancien seulement s'il est plus rapide.
   * @returns {'first'|'record'|'slower'|'error'}
   */
  offer(levelId, ghost) {
    if (!isValidGhost(ghost)) return 'error';
    const prev = this.get(levelId);
    if (prev && !(ghost.t < prev.t - 1e-6)) return 'slower';
    const text = JSON.stringify(ghost);
    if (!this._write(PREFIX + levelId, text, levelId)) return 'error';
    this.cache.set(levelId, ghost);
    return prev ? 'record' : 'first';
  }

  /** Écrit ; si le stockage est plein, libère les fantômes les plus anciens (jamais celui du niveau en cours). */
  _write(key, text, keepId) {
    for (let attempt = 0; attempt < 8; attempt++) {
      try {
        this.storage?.setItem(key, text);
        return !!this.storage;
      } catch {
        if (!this._evictOldest(keepId)) return false;
      }
    }
    return false;
  }

  _evictOldest(keepId) {
    const s = this.storage;
    if (!s) return false;
    let oldest = null;
    let oldestAt = Infinity;
    for (let i = 0; i < s.length; i++) {
      const k = s.key(i);
      if (!k || !k.startsWith(PREFIX) || k === PREFIX + keepId) continue;
      let at = 0;
      try {
        at = JSON.parse(s.getItem(k))?.at ?? 0;
      } catch {
        at = 0;
      }
      if (at < oldestAt) {
        oldestAt = at;
        oldest = k;
      }
    }
    if (!oldest) return false;
    s.removeItem(oldest);
    this.cache.delete(oldest.slice(PREFIX.length));
    return true;
  }
}

function safeLocalStorage() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}
