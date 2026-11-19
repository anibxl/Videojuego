// Coffre bonus quotidien et roue de la chance (clé `hoopbounce.bonus`).
//
//  - Coffre bonus : un par jour. Le joueur l'ouvre gratuitement (coffre commun) OU regarde une
//    publicité pour l'ouvrir en coffre amélioré (plus de pièces, presque toujours un article, rares
//    compris). Une fois ouvert, le suivant arrive le lendemain.
//  - Roue de la chance : 1 lancer gratuit par jour ; des lancers supplémentaires en regardant une
//    publicité (limite du jour dans ads-config.js). 8 cases pondérées.
//
// La publicité elle-même est gérée par shared/ads.js : ce module ne fait que tenir les comptes et
// donner les récompenses (via rewards.js), après validation complète de l'annonce.

import { dayKey, safeLocalStorage } from './stats.js';
import { grant } from './rewards.js';

const KEY = 'hoopbounce.bonus';

/** Cases de la roue, dans l'ordre (sens des aiguilles d'une montre depuis le haut). `weight` : chances relatives. */
export const WHEEL = [
  { id: 'coins100', reward: { coins: 100 }, weight: 24, icon: 'coin', color: '#2d3f6b' },
  { id: 'chestCommon', reward: { chest: 'common' }, weight: 15, icon: 'chest', color: '#3a2a52' },
  { id: 'coins250', reward: { coins: 250 }, weight: 20, icon: 'coin', color: '#2d3f6b' },
  { id: 'effect', reward: { cosmetic: ['rare', 'epic'], category: 'bounce' }, weight: 9, icon: 'effect', color: '#3a2a52' },
  { id: 'coins500', reward: { coins: 500 }, weight: 12, icon: 'coin', color: '#2d3f6b' },
  { id: 'chestRare', reward: { chest: 'rare' }, weight: 9, icon: 'chest', color: '#3a2a52' },
  { id: 'coins1000', reward: { coins: 1000 }, weight: 7, icon: 'coin', color: '#5a3d10' },
  { id: 'skin', reward: { cosmetic: ['epic', 'legendary'], category: 'ball' }, weight: 4, icon: 'skin', color: '#5a1f4a' },
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

export class Bonus {
  constructor(storage = safeLocalStorage(), now = () => new Date()) {
    this.storage = storage;
    this.now = now;
    this.data = this._read();
  }

  _today() {
    const today = dayKey(this.now());
    if (this.data.date !== today) {
      this.data = { ...this.data, date: today, chest: null, freeSpin: false, adSpins: 0 };
    }
    return this.data;
  }

  // ─── Coffre bonus ─────────────────────────────────────────────────────────

  /** Le coffre du jour est-il encore fermé ? */
  chestAvailable() {
    return this._today().chest === null;
  }

  /** Ouvre le coffre du jour : `upgraded` = publicité regardée et validée. */
  openChest(wallet, stats = null, upgraded = false, rng = Math.random) {
    if (!this.chestAvailable()) return null;
    const kind = upgraded ? 'super' : 'common';
    const res = grant({ chest: kind }, wallet, stats, rng);
    this.data.chest = kind;
    this.data.chests = (this.data.chests ?? 0) + 1;
    this._save();
    return res;
  }

  // ─── Roue de la chance ────────────────────────────────────────────────────

  freeSpinAvailable() {
    return !this._today().freeSpin;
  }

  /**
   * Lance la roue. `withAd` : lancer supplémentaire obtenu avec une publicité (déjà validée).
   * @returns {{ index:number, segment:object, result:object } | null}
   */
  spin(wallet, stats = null, withAd = false, rng = Math.random) {
    const d = this._today();
    if (!withAd && d.freeSpin) return null;
    const index = pickWheel(rng);
    const result = grant(WHEEL[index].reward, wallet, stats, rng);
    if (withAd) d.adSpins += 1;
    else d.freeSpin = true;
    d.spins = (d.spins ?? 0) + 1;
    d.last = WHEEL[index].id;
    this._save();
    return { index, segment: WHEEL[index], result };
  }

  /** Lancers obtenus avec une publicité aujourd'hui. */
  adSpinsToday() {
    return this._today().adSpins;
  }

  _read() {
    try {
      const raw = JSON.parse(this.storage?.getItem(KEY) ?? 'null');
      if (raw && typeof raw === 'object') {
        return {
          v: 1,
          date: typeof raw.date === 'string' ? raw.date : null,
          chest: raw.chest === 'common' || raw.chest === 'super' ? raw.chest : null,
          freeSpin: !!raw.freeSpin,
          adSpins: Number.isInteger(raw.adSpins) ? raw.adSpins : 0,
          spins: Number.isInteger(raw.spins) ? raw.spins : 0,
          chests: Number.isInteger(raw.chests) ? raw.chests : 0,
          last: typeof raw.last === 'string' ? raw.last : null,
        };
      }
    } catch {
      /* sauvegarde abîmée */
    }
    return { v: 1, date: null, chest: null, freeSpin: false, adSpins: 0, spins: 0, chests: 0, last: null };
  }

  _save() {
    try {
      this.storage?.setItem(KEY, JSON.stringify(this.data));
    } catch {
      /* stockage indisponible */
    }
  }
}
