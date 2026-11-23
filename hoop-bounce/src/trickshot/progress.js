// Progression du mode TRICKSHOT, indépendante du mode principal (clé de sauvegarde à part).
//   { v: 2, levels: { "1": { stars: 3, best: 4350, plays: 4 }, … }, carry: 0 }
// Un niveau est débloqué quand le précédent est terminé (au moins une étoile).
//
// v1 → v2 (étape 23) : les cartes ont été entièrement refaites (moins nombreuses, nouvelles). Les étoiles
// des anciennes cartes ne correspondent à rien dans les nouvelles ; on garde donc la progression sous
// forme de déblocages : avoir réussi N anciennes cartes ouvre d'office les N+1 premières nouvelles
// (`carry`). L'ancienne sauvegarde est conservée telle quelle dans `legacy`.

export const TS_KEY = 'hoopbounce.trickshot';

function safeStorage() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

export class TrickshotProgress {
  constructor({ total = 20, storage = safeStorage() } = {}) {
    this.total = total;
    this.storage = storage;
    this.data = this._load();
  }

  _load() {
    try {
      const d = JSON.parse(this.storage?.getItem(TS_KEY) ?? 'null');
      if (d && d.v === 2 && d.levels && typeof d.levels === 'object') return d;
      if (d && d.v === 1 && d.levels && typeof d.levels === 'object') {
        const done = Object.values(d.levels).filter((l) => l && l.stars > 0).length;
        const migrated = { v: 2, levels: {}, carry: Math.min(done, this.total - 1), legacy: d.levels };
        this.data = migrated;
        this.save();
        return migrated;
      }
    } catch {
      /* sauvegarde abîmée : on repart de zéro */
    }
    return { v: 2, levels: {}, carry: 0 };
  }

  save() {
    try {
      this.storage?.setItem(TS_KEY, JSON.stringify(this.data));
    } catch {
      /* stockage plein ou indisponible */
    }
  }

  level(n) {
    return this.data.levels[n] ?? { stars: 0, best: 0, plays: 0 };
  }

  isDone(n) {
    return this.level(n).stars > 0;
  }

  isUnlocked(n) {
    return n === 1 || this.isDone(n - 1) || n <= (this.data.carry ?? 0) + 1;
  }

  /** Enregistre une partie terminée. @returns {{newBest:boolean, newStars:boolean, unlocked:number|null}} */
  record(n, { stars, score }) {
    const prev = this.level(n);
    const wasDone = prev.stars > 0;
    const next = { stars: Math.max(prev.stars, stars), best: Math.max(prev.best, score), plays: prev.plays + 1 };
    this.data.levels[n] = next;
    this.save();
    return {
      newBest: score > prev.best,
      newStars: stars > prev.stars,
      unlocked: !wasDone && stars > 0 && n < this.total ? n + 1 : null,
    };
  }

  /** Un essai raté ou abandonné compte comme une partie jouée. */
  played(n) {
    const prev = this.level(n);
    this.data.levels[n] = { ...prev, plays: prev.plays + 1 };
    this.save();
  }

  /** Premier niveau débloqué non terminé (ou le dernier). */
  next() {
    for (let n = 1; n <= this.total; n++) if (!this.isDone(n)) return n;
    return this.total;
  }

  summary() {
    let done = 0;
    let stars = 0;
    for (let n = 1; n <= this.total; n++) {
      const l = this.level(n);
      if (l.stars > 0) done++;
      stars += l.stars;
    }
    return { done, total: this.total, stars, maxStars: this.total * 3, percent: Math.round((stars / (this.total * 3)) * 100) };
  }
}
