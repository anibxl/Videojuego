// Roulette quotidienne (clé `hoopbounce.bonus`) — la récompense quotidienne principale (phase 4).
//
//  - 1 lancer GRATUIT par jour. Une fois utilisé, un compte à rebours mène au lendemain (minuit, heure
//    de l'appareil).
//  - Jusqu'à 3 lancers SUPPLÉMENTAIRES par jour, uniquement en regardant une publicité récompensée
//    (toujours facultatif). Après ces 3 lancers : plus de roulette jusqu'au lendemain.
//  - 8 cases pondérées : beaucoup de petites pièces, des coffres, et de rares gros lots (jackpot de pièces,
//    quelques gemmes, un skin) pour garder l'excitation.
//
// L'ancien « coffre bonus » quotidien (étape 13) est supprimé : il faisait doublon avec la roulette.
// Une ancienne sauvegarde qui le mentionne est simplement ignorée.
//
// La publicité elle-même est gérée par shared/ads.js : ce module ne fait que tenir les comptes et
// donner les récompenses (via rewards.js), après validation complète de l'annonce.

import { dayKey, safeLocalStorage } from './stats.js';
import { grant } from './rewards.js';

const KEY = 'hoopbounce.bonus';

/** Lancers supplémentaires (avec publicité) par jour. */
export const AD_SPINS_PER_DAY = 3;

/** Cases de la roue, dans l'ordre (sens des aiguilles d'une montre depuis le haut). `weight` : chances relatives (total 100). */
export const WHEEL = [
  { id: 'coins120', reward: { coins: 120 }, weight: 28, icon: 'coin', color: '#2d3f6b' },
  { id: 'chestCommon', reward: { chest: 'common' }, weight: 18, icon: 'chest', color: '#3a2a52' },
  { id: 'coins250', reward: { coins: 250 }, weight: 22, icon: 'coin', color: '#2d3f6b' },
  { id: 'gems', reward: { gems: 10 }, weight: 5, icon: 'gem', color: '#16465c' },
  { id: 'coins500', reward: { coins: 500 }, weight: 12, icon: 'coin', color: '#2d3f6b' },
  { id: 'chestRare', reward: { chest: 'rare' }, weight: 9, icon: 'chest', color: '#3a2a52' },
  { id: 'coins1200', reward: { coins: 1200 }, weight: 4, icon: 'coin', color: '#5a3d10' },
  { id: 'skin', reward: { cosmetic: ['epic', 'legendary'], category: 'ball' }, weight: 2, icon: 'skin', color: '#5a1f4a' },
];

/** Tirage pondéré d'une case. */
export function pickWheel(rng = Math.random) {
  const total = WHEEL.reduce((s, w) => s + w.weight, 0);
  let r = rng() * total;
  for (let i = 0; i < WHEEL.length; i++) {
    r -= WHEEL[i].weight;
    if (r < 0) return i;
  }
  return WHEEL.length - 1;
}

/** Chance (0..1) de chaque case. */
export function wheelOdds() {
  const total = WHEEL.reduce((s, w) => s + w.weight, 0);
  return Object.fromEntries(WHEEL.map((w) => [w.id, w.weight / total]));
}

export class Bonus {
  constructor(storage = safeLocalStorage(), now = () => new Date()) {
    this.storage = storage;
    this.now = now;
    this.data = this._read();
  }

  _today() {
    const today = dayKey(this.now());
    if (this.data.date !== today) {
      this.data = { ...this.data, date: today, freeSpin: false, adSpins: 0 };
    }
    return this.data;
  }

  /** Le lancer gratuit du jour est-il encore disponible ? */
  freeSpinAvailable() {
    return !this._today().freeSpin;
  }

  /** Lancers obtenus avec une publicité aujourd'hui. */
  adSpinsToday() {
    return this._today().adSpins;
  }

  /** Lancers avec publicité encore possibles aujourd'hui (0..3). */
  adSpinsLeft() {
    return Math.max(0, AD_SPINS_PER_DAY - this._today().adSpins);
  }

  /** 'free' (lancer gratuit dispo) · 'ads' (gratuit utilisé, lancers avec publicité possibles) · 'done' (plus rien aujourd'hui). */
  status() {
    if (this.freeSpinAvailable()) return 'free';
    return this.adSpinsLeft() > 0 ? 'ads' : 'done';
  }

  /**
   * Lance la roue. `withAd` : lancer supplémentaire obtenu avec une publicité (déjà validée).
   * @returns {{ index:number, segment:object, result:object } | null}
   */
  spin(wallet, stats = null, withAd = false, rng = Math.random) {
    const d = this._today();
    if (!withAd && d.freeSpin) return null;
    if (withAd && (!d.freeSpin || d.adSpins >= AD_SPINS_PER_DAY)) return null;
    const index = pickWheel(rng);
    const result = grant(WHEEL[index].reward, wallet, stats, rng);
    if (withAd) d.adSpins += 1;
    else d.freeSpin = true;
    d.spins = (d.spins ?? 0) + 1;
    d.last = WHEEL[index].id;
    this._save();
    return { index, segment: WHEEL[index], result };
  }

  _read() {
    try {
      const raw = JSON.parse(this.storage?.getItem(KEY) ?? 'null');
      if (raw && typeof raw === 'object') {
        return {
          v: 2,
          date: typeof raw.date === 'string' ? raw.date : null,
          freeSpin: !!raw.freeSpin,
          adSpins: Number.isInteger(raw.adSpins) ? Math.max(0, raw.adSpins) : 0,
          spins: Number.isInteger(raw.spins) ? raw.spins : 0,
          last: typeof raw.last === 'string' ? raw.last : null,
          // conservé pour l'historique (ancien coffre bonus)
          chests: Number.isInteger(raw.chests) ? raw.chests : 0,
        };
      }
    } catch {
      /* sauvegarde abîmée */
    }
    return { v: 2, date: null, freeSpin: false, adSpins: 0, spins: 0, last: null, chests: 0 };
  }

  _save() {
    try {
      this.storage?.setItem(KEY, JSON.stringify(this.data));
    } catch {
      /* stockage indisponible */
    }
  }
}
