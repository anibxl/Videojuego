// Porte-monnaie et inventaire du joueur, enregistrés sur l'appareil.
//
//  - pièces (clé `hoopbounce.coins`, déjà affichée par le menu) ;
//  - inventaire (clé `hoopbounce.inventory`) : articles possédés, articles équipés, étoiles déjà
//    récompensées par niveau (une étoile ne rapporte qu'une fois).

import { CATALOG, DEFAULTS, REWARDS, itemById } from './catalog.js';

const COINS_KEY = 'hoopbounce.coins';
const INV_KEY = 'hoopbounce.inventory';

export class Wallet {
  constructor(storage = safeLocalStorage()) {
    this.storage = storage;
    this.coins = this._readCoins();
    this.inv = this._readInventory();
  }

  // ─── Pièces ───────────────────────────────────────────────────────────────

  /**
   * Récompense d'une victoire. `worldIndex` 0..4, `stars` 0..3 obtenues cette fois.
   * @returns {{ total:number, lines:Array<[string, number]> }} détail des gains
   */
  reward(levelId, worldIndex, stars, swish = false) {
    const prev = this.inv.rewarded[levelId];
    const lines = [];
    if (!prev) lines.push(['first', REWARDS.firstClear + REWARDS.perWorld * worldIndex]);
    else lines.push(['replay', REWARDS.replay]);
    const before = prev?.stars ?? 0;
    const fresh = Math.max(0, stars - before);
    if (fresh) lines.push(['stars', fresh * REWARDS.newStar]);
    if (stars >= 3 && before < 3) lines.push(['perfect', REWARDS.perfect]);
    if (swish) lines.push(['swish', REWARDS.swish]);
    this.inv.rewarded[levelId] = { stars: Math.max(before, stars) };
    const total = lines.reduce((sum, [, v]) => sum + v, 0);
    this.coins += total;
    this._save();
    return { total, lines };
  }

  // ─── Boutique ─────────────────────────────────────────────────────────────

  owns(id) {
    return this.inv.owned.includes(id) || itemById(id)?.price === 0;
  }

  equipped(category) {
    const id = this.inv.equipped[category];
    return id && this.owns(id) ? id : DEFAULTS[category];
  }

  /** @returns {'ok'|'owned'|'coins'|'unknown'} */
  buy(id) {
    const item = itemById(id);
    if (!item) return 'unknown';
    if (this.owns(id)) return 'owned';
    if (this.coins < item.price) return 'coins';
    this.coins -= item.price;
    this.inv.owned.push(id);
    this._save();
    return 'ok';
  }

  equip(id) {
    const item = itemById(id);
    if (!item || !this.owns(id)) return false;
    this.inv.equipped[item.category] = id;
    this._save();
    return true;
  }

  /** Progression de la collection : articles possédés / total. */
  progress(category = null) {
    const items = category ? CATALOG.filter((i) => i.category === category) : CATALOG;
    const owned = items.filter((i) => this.owns(i.id)).length;
    return { owned, total: items.length, percent: Math.round((100 * owned) / items.length) };
  }

  // ─── Stockage ─────────────────────────────────────────────────────────────

  _readCoins() {
    try {
      return Math.max(0, parseInt(this.storage?.getItem(COINS_KEY) ?? '0', 10) || 0);
    } catch {
      return 0;
    }
  }

  _readInventory() {
    const empty = { owned: [], equipped: { ...DEFAULTS }, rewarded: {} };
    try {
      const raw = JSON.parse(this.storage?.getItem(INV_KEY) ?? 'null');
      if (!raw || typeof raw !== 'object') return empty;
      return {
        owned: Array.isArray(raw.owned) ? raw.owned.filter((id) => itemById(id)) : [],
        equipped: { ...DEFAULTS, ...(raw.equipped && typeof raw.equipped === 'object' ? raw.equipped : {}) },
        rewarded: raw.rewarded && typeof raw.rewarded === 'object' && !Array.isArray(raw.rewarded) ? raw.rewarded : {},
      };
    } catch {
      return empty;
    }
  }

  _save() {
    try {
      this.storage?.setItem(COINS_KEY, String(this.coins));
      this.storage?.setItem(INV_KEY, JSON.stringify(this.inv));
    } catch {
      /* stockage indisponible : vaut pour cette session */
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
