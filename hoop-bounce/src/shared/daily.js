// Récompense quotidienne : un calendrier de 7 jours (clé `hoopbounce.daily`).
//
//  - la première connexion de chaque jour permet de récupérer UNE récompense : celle du jour suivant
//    dans le calendrier ;
//  - on avance d'un jour à chaque récupération (manquer un jour ne fait rien perdre : on reprend où
//    on en était) ; après le 7e jour, un nouveau cycle commence, automatiquement, chaque semaine ;
//  - progression (phase 4) : pièces, pièces, gemmes, coffre, pièces + gemmes, coffre rare, puis la
//    GRANDE récompense du 7e jour : le ballon exclusif Hoop Bounce la 1re semaine, la traînée exclusive
//    la 2e, puis un coffre épique ; toujours avec des gemmes et des pièces. Un article exclusif déjà
//    possédé est remplacé par des pièces.

import { dayKey, safeLocalStorage } from './stats.js';
import { grant } from './rewards.js';

const KEY = 'hoopbounce.daily';

export const DAILY_CALENDAR = [
  { coins: 150 },
  { coins: 250 },
  { gems: 10 },
  { chest: 'common' },
  { coins: 400, gems: 10 },
  { chest: 'rare' },
  { item: 'ball-hoop', coins: 500, gems: 25 },
];

/** Grande récompense du 7e jour selon la semaine (0 = première semaine). */
export function bigReward(cycle) {
  if (cycle === 0) return { item: 'ball-hoop', coins: 500, gems: 25 };
  if (cycle === 1) return { item: 'trail-hoop', coins: 500, gems: 25 };
  return { chest: 'epic', gems: 25 };
}

/** Récompense d'un jour (0..6) pour une semaine donnée. */
export function dailyRewardFor(day, cycle = 0) {
  return day === DAILY_CALENDAR.length - 1 ? bigReward(cycle) : DAILY_CALENDAR[day];
}

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

  /** Les 7 récompenses de la semaine en cours (le 7e jour change d'une semaine à l'autre). */
  week() {
    return DAILY_CALENDAR.map((_, k) => dailyRewardFor(k, this.cycle));
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
    const res = grant(dailyRewardFor(day, this.cycle), wallet, stats, rng);
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
