// Progression du joueur, enregistrée sur l'appareil : niveaux débloqués, étoiles et records.

const KEY = 'hoopbounce.progress';

export class Progress {
  constructor(levelCount, storage = safeLocalStorage()) {
    this.levelCount = levelCount;
    this.storage = storage;
    this.data = this._read();
  }

  /** Numéro (0-based) du niveau où reprendre : le premier non terminé. */
  get resumeIndex() {
    return Math.min(this.data.unlocked, this.levelCount - 1);
  }

  isUnlocked(index) {
    return index <= this.data.unlocked;
  }

  starsFor(levelId) {
    return this.data.stars[levelId] ?? 0;
  }

  bestTimeFor(levelId) {
    return this.data.best[levelId] ?? null;
  }

  /** Enregistre un niveau terminé. Renvoie { newRecord, newStars }. */
  complete(index, levelId, stars, time) {
    const d = this.data;
    const prevStars = d.stars[levelId] ?? 0;
    const prevBest = d.best[levelId];
    d.stars[levelId] = Math.max(prevStars, stars);
    const newRecord = prevBest !== undefined && time < prevBest;
    if (prevBest === undefined || time < prevBest) d.best[levelId] = time;
    d.unlocked = Math.max(d.unlocked, Math.min(index + 1, this.levelCount));
    this._write();
    return { newRecord, newStars: stars > prevStars };
  }

  _read() {
    const empty = { unlocked: 0, stars: {}, best: {} };
    try {
      const raw = JSON.parse(this.storage?.getItem(KEY) ?? 'null');
      if (!raw || typeof raw !== 'object') return empty;
      return {
        unlocked: Number.isInteger(raw.unlocked) ? Math.max(0, raw.unlocked) : 0,
        stars: raw.stars && typeof raw.stars === 'object' ? raw.stars : {},
        best: raw.best && typeof raw.best === 'object' ? raw.best : {},
      };
    } catch {
      return empty;
    }
  }

  _write() {
    try {
      this.storage?.setItem(KEY, JSON.stringify(this.data));
    } catch {
      /* stockage indisponible : la progression vaut pour cette session */
    }
  }
}

function safeLocalStorage() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}
