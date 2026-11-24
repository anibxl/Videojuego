// Progression du mode TRICKSHOT, indépendante du mode principal (clé de sauvegarde à part).
//   { v: 3, levels: { "1": { stars: 3, best: 4350, plays: 4 }, … }, carry: 0 }
// Un niveau est débloqué quand le précédent est terminé (au moins une étoile).
//
// v1 → v2 (étape 23) : les cartes ont été entièrement refaites (moins nombreuses, nouvelles). Les étoiles
// des anciennes cartes ne correspondent à rien dans les nouvelles ; on garde donc la progression sous
// forme de déblocages : avoir réussi N anciennes cartes ouvre d'office les N+1 premières nouvelles
// (`carry`). L'ancienne sauvegarde est conservée telle quelle dans `legacy`.
//
// v2 → v3 (refonte de la campagne) : le Trickshot devient un mode expert de 50 cartes, rangées par
// difficulté mesurée ; les numéros des cartes ont changé. La progression repart de zéro (tous les
// joueurs découvrent le nouveau parcours depuis la carte 1), sans rien effacer : l'ancienne sauvegarde
// est gardée dans `legacy`. Pièces, gemmes, succès, Hoop Pass… vivent dans d'autres clés et ne bougent pas.

export const TS_KEY = 'hoopbounce.trickshot';

function safeStorage() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

export class TrickshotProgress {
  constructor({ total = 50, storage = safeStorage() } = {}) {
    this.total = total;
    this.storage = storage;
    this.data = this._load();
  }

  _load() {
    try {
      const d = JSON.parse(this.storage?.getItem(TS_KEY) ?? 'null');
      if (d && d.v === 3 && d.levels && typeof d.levels === 'object') return d;
      if (d && (d.v === 1 || d.v === 2) && d.levels && typeof d.levels === 'object') {
        const fresh = { v: 3, levels: {}, carry: 0, legacy: d };
        this.data = fresh;
        this.save();
        return fresh;
      }
    } catch {
      /* sauvegarde abîmée : on repart de zéro */
    }
    return { v: 3, levels: {}, carry: 0 };
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

  // Tentative entamée (au moins un tir) et pas encore terminée (ni victoire, ni 3 essais ratés). Si le joueur
  // quitte la carte au milieu, la tentative reste ouverte : en revenant, le défi « Premier essai » est perdu.
  // Champ `open` ajouté à la sauvegarde v3 (absent des anciennes : rien n'est ouvert).
  attemptOpen(n) {
    return !!this.data.open?.[n];
  }

  openAttempt(n) {
    if (this.attemptOpen(n)) return;
    this.data.open = { ...(this.data.open ?? {}), [n]: true };
    this.save();
  }

  closeAttempt(n) {
    if (!this.attemptOpen(n)) return;
    delete this.data.open[n];
    this.save();
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
