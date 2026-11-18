// Progression du joueur, enregistrée sur l'appareil : niveaux terminés, étoiles, records,
// mondes débloqués.
//
// Règles :
//  - le 1er monde est ouvert dès le départ ; dans un monde, chaque niveau terminé ouvre le suivant ;
//  - un monde s'ouvre automatiquement quand TOUS les niveaux disponibles du monde précédent sont
//    terminés ;
//  - la carte joue une animation de déblocage la première fois qu'elle montre un monde ouvert
//    (`seen`).
//
// Format enregistré (v2) : { v: 2, done: {id: true}, stars: {id: n}, best: {id: s}, seen: {worldId: true} }
// L'ancien format (v1, étape 5 : { unlocked, stars, best }) est converti automatiquement.

const KEY = 'hoopbounce.progress';

export class Progress {
  /**
   * @param {Array<{id:string, levels:Array<{id:string}>, planned:number}>} worlds
   * @param {Storage|null} storage
   */
  constructor(worlds, storage = safeLocalStorage()) {
    this.worlds = worlds;
    this.storage = storage;
    /** Mode test (carte ?unlock=all) : tout est ouvert, rien n'est enregistré en plus. */
    this.unlockAll = false;
    this.data = this._read();
  }

  // ─── Niveaux ──────────────────────────────────────────────────────────────

  isDone(levelId) {
    return this.data.done[levelId] === true;
  }

  starsFor(levelId) {
    return this.data.stars[levelId] ?? 0;
  }

  bestTimeFor(levelId) {
    return this.data.best[levelId] ?? null;
  }

  isLevelUnlocked(worldIndex, levelIndex) {
    if (!this.isWorldUnlocked(worldIndex)) return false;
    if (this.unlockAll || levelIndex === 0) return true;
    const prev = this.worlds[worldIndex].levels[levelIndex - 1];
    return !!prev && this.isDone(prev.id);
  }

  // ─── Mondes ───────────────────────────────────────────────────────────────

  isWorldComplete(worldIndex) {
    const w = this.worlds[worldIndex];
    return !!w && w.levels.length > 0 && w.levels.every((l) => this.isDone(l.id));
  }

  isWorldUnlocked(worldIndex) {
    if (worldIndex <= 0) return worldIndex === 0;
    if (worldIndex >= this.worlds.length) return false;
    return this.unlockAll || this.isWorldComplete(worldIndex - 1);
  }

  /** Statistiques d'un monde pour la carte. */
  worldStats(worldIndex) {
    const w = this.worlds[worldIndex];
    let done = 0;
    let stars = 0;
    for (const l of w.levels) {
      if (this.isDone(l.id)) done++;
      stars += this.starsFor(l.id);
    }
    const total = w.levels.length;
    return {
      done,
      total,
      planned: Math.max(w.planned ?? total, total),
      stars,
      maxStars: total * 3,
      percent: total ? Math.round((100 * done) / total) : 0,
    };
  }

  /** Totaux, tous mondes confondus. */
  totals() {
    let done = 0;
    let total = 0;
    let stars = 0;
    let maxStars = 0;
    this.worlds.forEach((_, i) => {
      const s = this.worldStats(i);
      done += s.done;
      total += s.total;
      stars += s.stars;
      maxStars += s.maxStars;
    });
    return { done, total, stars, maxStars, percent: total ? Math.round((100 * done) / total) : 0 };
  }

  /** Mondes ouverts dont la carte n'a pas encore montré le déblocage. */
  pendingUnlocks() {
    const out = [];
    for (let i = 1; i < this.worlds.length; i++) {
      if (this.isWorldUnlocked(i) && !this.data.seen[this.worlds[i].id]) out.push(i);
    }
    return this.unlockAll ? [] : out;
  }

  markSeen(worldIndex) {
    const w = this.worlds[worldIndex];
    if (!w || this.data.seen[w.id]) return;
    this.data.seen[w.id] = true;
    this._write();
  }

  /** Où reprendre (JOUER) : { worldIndex, levelIndex } du premier niveau ouvert non terminé. */
  resume() {
    for (let wi = 0; wi < this.worlds.length; wi++) {
      if (!this.isWorldUnlocked(wi)) break;
      const levels = this.worlds[wi].levels;
      for (let li = 0; li < levels.length; li++) {
        if (!this.isDone(levels[li].id)) return { worldIndex: wi, levelIndex: li };
      }
    }
    // Tout est terminé : on reprend au dernier niveau du dernier monde ouvert
    let wi = this.worlds.length - 1;
    while (wi > 0 && !this.isWorldUnlocked(wi)) wi--;
    return { worldIndex: wi, levelIndex: Math.max(0, this.worlds[wi].levels.length - 1) };
  }

  /**
   * Enregistre un niveau terminé.
   * @returns {{ newRecord:boolean, newStars:boolean, firstClear:boolean, worldCompleted:boolean, unlockedWorld:number|null }}
   */
  complete(levelId, stars, time) {
    const d = this.data;
    const wi = this.worlds.findIndex((w) => w.levels.some((l) => l.id === levelId));
    const wasComplete = wi >= 0 && this.isWorldComplete(wi);
    const nextWasOpen = wi >= 0 && this.isWorldUnlocked(wi + 1);
    const firstClear = !d.done[levelId];
    const prevStars = d.stars[levelId] ?? 0;
    const prevBest = d.best[levelId];
    d.done[levelId] = true;
    d.stars[levelId] = Math.max(prevStars, stars);
    const newRecord = prevBest !== undefined && time < prevBest;
    if (prevBest === undefined || time < prevBest) d.best[levelId] = time;
    this._write();
    const worldCompleted = wi >= 0 && !wasComplete && this.isWorldComplete(wi);
    const unlockedWorld = wi >= 0 && !nextWasOpen && this.isWorldUnlocked(wi + 1) ? wi + 1 : null;
    return { newRecord, newStars: stars > prevStars, firstClear, worldCompleted, unlockedWorld };
  }

  // ─── Stockage ─────────────────────────────────────────────────────────────

  _read() {
    const empty = () => ({ v: 2, done: {}, stars: {}, best: {}, seen: {} });
    const obj = (o) => (o && typeof o === 'object' && !Array.isArray(o) ? o : {});
    try {
      const raw = JSON.parse(this.storage?.getItem(KEY) ?? 'null');
      if (!raw || typeof raw !== 'object') return empty();
      const data = { v: 2, done: { ...obj(raw.done) }, stars: { ...obj(raw.stars) }, best: { ...obj(raw.best) }, seen: { ...obj(raw.seen) } };
      if (raw.v !== 2) {
        // Ancien format : un niveau qui a un record est terminé ; `unlocked` = nombre de niveaux
        // terminés à la suite dans le 1er monde.
        for (const id of Object.keys(data.best)) data.done[id] = true;
        const n = Number.isInteger(raw.unlocked) ? Math.max(0, raw.unlocked) : 0;
        this.worlds[0]?.levels.slice(0, n).forEach((l) => (data.done[l.id] = true));
      }
      return data;
    } catch {
      return empty();
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
