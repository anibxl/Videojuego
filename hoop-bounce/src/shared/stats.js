// Statistiques du joueur, enregistrées sur l'appareil (clé `hoopbounce.stats`) :
//  - `life` : compteurs depuis le premier lancement (succès) ;
//  - `day`  : compteurs du jour (missions quotidiennes), remis à zéro au premier événement d'un
//             nouveau jour (minuit, heure locale).
//
// Compteurs : bounces (rebonds du joueur), goals (paniers marqués), swishes (sans toucher le cercle),
// clears (niveaux terminés, rejouer compris), noDeath (niveaux terminés sans mourir), stars (étoiles
// ramassées dans des niveaux réussis), deaths, games (parties lancées), playTime (secondes de jeu),
// coins (pièces gagnées), chests (coffres ouverts), dailyClaims, missions (missions accomplies),
// world.<id> (niveaux terminés dans un monde), levels (identifiants des niveaux terminés aujourd'hui).

const KEY = 'hoopbounce.stats';

/** Date locale du jour au format AAAA-MM-JJ (les journées changent à minuit, heure locale). */
export function dayKey(date = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}

/** Secondes avant le prochain minuit local. */
export function secondsToMidnight(date = new Date()) {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
  return Math.max(0, Math.round((next - date) / 1000));
}

const emptyCounters = () => ({ world: {} });

export class Stats {
  /** @param {Storage|null} storage  @param {() => Date} now */
  constructor(storage = safeLocalStorage(), now = () => new Date()) {
    this.storage = storage;
    this.now = now;
    this.data = this._read();
    this._rollDay();
  }

  /** Compteur à vie. */
  life(key) {
    return this._get(this.data.life, key);
  }

  /** Compteur du jour. */
  today(key) {
    this._rollDay();
    if (key === 'levels') return (this.data.day.levels ?? []).length;
    return this._get(this.data.day.c, key);
  }

  /** Ajoute `n` au compteur (à vie et du jour). `save=false` : enregistrement différé (temps de jeu). */
  add(key, n = 1, save = true) {
    this._rollDay();
    this._inc(this.data.life, key, n);
    this._inc(this.data.day.c, key, n);
    if (save) this.save();
  }

  /** Un niveau terminé aujourd'hui (pour « terminer N niveaux différents »). */
  markLevel(id) {
    this._rollDay();
    const list = (this.data.day.levels ??= []);
    if (!list.includes(id)) list.push(id);
  }

  save() {
    try {
      this.storage?.setItem(KEY, JSON.stringify(this.data));
    } catch {
      /* stockage indisponible */
    }
  }

  /** Relit la sauvegarde (une autre page a pu la modifier). */
  reload() {
    this.data = this._read();
    this._rollDay();
  }

  // ─── Interne ──────────────────────────────────────────────────────────────

  _get(obj, key) {
    if (key.startsWith('world.')) return obj.world?.[key.slice(6)] ?? 0;
    return obj[key] ?? 0;
  }

  _inc(obj, key, n) {
    if (key.startsWith('world.')) {
      obj.world ??= {};
      const k = key.slice(6);
      obj.world[k] = (obj.world[k] ?? 0) + n;
    } else obj[key] = (obj[key] ?? 0) + n;
  }

  _rollDay() {
    const today = dayKey(this.now());
    if (this.data.day?.date !== today) this.data.day = { date: today, c: emptyCounters(), levels: [] };
  }

  _read() {
    const fresh = { v: 1, life: emptyCounters(), day: null };
    try {
      const raw = JSON.parse(this.storage?.getItem(KEY) ?? 'null');
      if (!raw || typeof raw !== 'object') return fresh;
      const obj = (o) => (o && typeof o === 'object' && !Array.isArray(o) ? o : null);
      const life = obj(raw.life) ?? emptyCounters();
      const day = obj(raw.day);
      return {
        v: 1,
        life: { ...life, world: obj(life.world) ?? {} },
        day: day && typeof day.date === 'string' ? { date: day.date, c: { ...(obj(day.c) ?? {}), world: obj(day.c?.world) ?? {} }, levels: Array.isArray(day.levels) ? day.levels : [] } : null,
      };
    } catch {
      return fresh;
    }
  }
}

export function safeLocalStorage() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}
