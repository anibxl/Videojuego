// Récompense quotidienne : un calendrier de 7 jours (clé `hoopbounce.daily`).
//
//  - la première connexion de chaque jour permet de récupérer UNE récompense : celle du jour suivant
//    dans le calendrier ;
//  - on avance d'un jour à chaque récupération (manquer un jour ne fait rien perdre : on reprend où
//    on en était) ; après le 7e jour, un nouveau cycle commence ;
//  - les articles exclusifs (traînée du 5e jour, ballon du 7e jour) ne se gagnent qu'une fois :
//    s'ils sont déjà possédés, ils sont remplacés par des pièces.

import { dayKey, safeLocalStorage } from './stats.js';
import { grant } from './rewards.js';

const KEY = 'hoopbounce.daily';

export const DAILY_CALENDAR = [
  { coins: 100 },
  { coins: 200 },
  { chest: 'common' },
  { coins: 350 },
  { item: 'trail-hoop' },
  { coins: 500 },
  { item: 'ball-hoop' },
];

export class DailyReward {
  constructor(storage = safeLocalStorage(), now = () => new Date()) {
    this.storage = storage;
    this.now = now;
    this.data = this._read();
  }

  /** Jour du calendrier (0..6) de la prochaine récompense à récupérer. */
  get nextIndex() {
    return this.data.streak % DAILY_CALENDAR.length;
  }

  /** Cycle en cours (0 = première semaine). */
  get cycle() {
    return Math.floor(this.data.streak / DAILY_CALENDAR.length);
  }

  /** Peut-on récupérer une récompense aujourd'hui ? */
  canClaim() {
    return this.data.last !== dayKey(this.now());
  }

  /**
   * État de chaque case du calendrier pour l'affichage :
   * 'claimed' (déjà récupérée ce cycle), 'today' (à récupérer), 'next' (demain), 'locked'.
   */
  states() {
    const i = this.nextIndex;
    const can = this.canClaim();
    return DAILY_CALENDAR.map((_, k) => {
      if (k < i) return 'claimed';
      if (k === i) return can ? 'today' : 'next';
      return 'locked';
    });
  }

  /** Récupère la récompense du jour. @returns résultat de grant() + { day } ou null si déjà fait. */
  claim(wallet, stats = null, rng = Math.random) {
    if (!this.canClaim()) return null;
    const day = this.nextIndex;
    const res = grant(DAILY_CALENDAR[day], wallet, stats, rng);
    this.data.streak += 1;
    this.data.last = dayKey(this.now());
    this.data.total += 1;
    this._save();
    stats?.add('dailyClaims', 1);
    return { ...res, day };
  }

  _read() {
    const fresh = { v: 1, streak: 0, last: null, total: 0 };
    try {
      const raw = JSON.parse(this.storage?.getItem(KEY) ?? 'null');
      if (!raw || typeof raw !== 'object') return fresh;
      return {
        v: 1,
        streak: Number.isInteger(raw.streak) && raw.streak >= 0 ? raw.streak : 0,
        last: typeof raw.last === 'string' ? raw.last : null,
        total: Number.isInteger(raw.total) ? raw.total : 0,
      };
    } catch {
      return fresh;
    }
  }

  _save() {
    try {
      this.storage?.setItem(KEY, JSON.stringify(this.data));
    } catch {
      /* stockage indisponible */
    }
  }
}
