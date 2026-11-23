// Succès (clé `hoopbounce.achievements`) : 4 paliers (Débutant, Intermédiaire, Expert, Légende).
//
// Chaque succès a un objectif mesuré sur la sauvegarde (progression des niveaux, statistiques à vie,
// porte-monnaie) et une récompense à récupérer : pièces, coffre, article ou effet exclusif.

import { CATALOG } from './catalog.js';
import { safeLocalStorage } from './stats.js';
import { grant } from './rewards.js';
import { awardPassXp } from './pass.js';

const KEY = 'hoopbounce.achievements';

export const TIERS = {
  beginner: { order: 0, rgb: '205,140,90' },      // bronze
  intermediate: { order: 1, rgb: '190,205,225' }, // argent
  expert: { order: 2, rgb: '255,201,77' },        // or
  legend: { order: 3, rgb: '180,107,255' },       // légende (violet)
};

/** Valeurs mesurées pour les succès, à partir de la sauvegarde. */
export function measure({ stats, progress, wallet }) {
  const tot = progress.totals();
  const purchasable = CATALOG.filter((i) => typeof i.price === 'number' && i.price > 0 && !i.exclusive);
  let perfect = 0;
  progress.worlds.forEach((_, i) => {
    const s = progress.worldStats(i);
    if (s.total && s.stars === s.maxStars) perfect++;
  });
  return {
    levels: tot.done,
    stars: tot.stars,
    bought: wallet.boughtCount(),
    collection: purchasable.filter((i) => wallet.owns(i.id)).length,
    collectionTotal: purchasable.length,
    perfect,
    world: (i) => (progress.isWorldComplete(i) ? 1 : 0),
    life: (k) => stats.life(k),
  };
}

const L = (k) => (m) => m.life(k);
const W = (i) => (m) => m.world(i);

/** Définition des succès : { id, tier, icon, target, value(m), reward } (textes : i18n du menu). */
export const ACHIEVEMENTS = [
  // ── Débutant ──
  { id: 'first-level', tier: 'beginner', icon: 'flag', target: 1, value: (m) => m.levels, reward: { coins: 100 } },
  { id: 'bounces-100', tier: 'beginner', icon: 'ball', target: 100, value: L('bounces'), reward: { coins: 100 } },
  { id: 'stars-10', tier: 'beginner', icon: 'star', target: 10, value: (m) => m.stars, reward: { coins: 150 } },
  { id: 'no-death-1', tier: 'beginner', icon: 'shield', target: 1, value: L('noDeath'), reward: { coins: 150 } },
  { id: 'buy-1', tier: 'beginner', icon: 'bag', target: 1, value: (m) => m.bought, reward: { chest: 'common' } },
  { id: 'games-10', tier: 'beginner', icon: 'play', target: 10, value: L('games'), reward: { coins: 100 } },
  { id: 'world-city', tier: 'beginner', icon: 'city', target: 1, value: W(0), reward: { chest: 'common' } },
  { id: 'coins-1000', tier: 'beginner', icon: 'coin', target: 1000, value: L('coins'), reward: { coins: 150 } },
  { id: 'daily-1', tier: 'beginner', icon: 'gift', target: 1, value: L('dailyClaims'), reward: { coins: 100 } },
  { id: 'mission-1', tier: 'beginner', icon: 'target', target: 1, value: L('missions'), reward: { coins: 100 } },
  // ── Intermédiaire ──
  { id: 'levels-10', tier: 'intermediate', icon: 'flag', target: 10, value: (m) => m.levels, reward: { coins: 300 } },
  { id: 'stars-50', tier: 'intermediate', icon: 'star', target: 50, value: (m) => m.stars, reward: { chest: 'rare' } },
  { id: 'bounces-1000', tier: 'intermediate', icon: 'ball', target: 1000, value: L('bounces'), reward: { coins: 300 } },
  { id: 'goals-100', tier: 'intermediate', icon: 'hoop', target: 100, value: L('goals'), reward: { coins: 300 } },
  { id: 'swish-25', tier: 'intermediate', icon: 'swish', target: 25, value: L('swishes'), reward: { cosmetic: 'rare' } },
  { id: 'buy-5', tier: 'intermediate', icon: 'bag', target: 5, value: (m) => m.bought, reward: { coins: 400 } },
  { id: 'world-snow', tier: 'intermediate', icon: 'snow', target: 1, value: W(1), reward: { chest: 'rare' } },
  { id: 'deaths-100', tier: 'intermediate', icon: 'skull', target: 100, value: L('deaths'), reward: { coins: 200 } },
  { id: 'time-30', tier: 'intermediate', icon: 'clock', target: 1800, value: L('playTime'), reward: { coins: 300 } },
  { id: 'coins-5000', tier: 'intermediate', icon: 'coin', target: 5000, value: L('coins'), reward: { coins: 500 } },
  { id: 'chests-5', tier: 'intermediate', icon: 'chest', target: 5, value: L('chests'), reward: { coins: 300 } },
  // ── Expert ──
  { id: 'levels-25', tier: 'expert', icon: 'flag', target: 25, value: (m) => m.levels, reward: { chest: 'epic' } },
  { id: 'world-volcano', tier: 'expert', icon: 'volcano', target: 1, value: W(2), reward: { coins: 600 } },
  { id: 'world-forest', tier: 'expert', icon: 'forest', target: 1, value: W(3), reward: { coins: 700 } },
  { id: 'perfect-world', tier: 'expert', icon: 'crown', target: 1, value: (m) => m.perfect, reward: { item: 'trail-aurora' } },
  { id: 'goals-500', tier: 'expert', icon: 'hoop', target: 500, value: L('goals'), reward: { coins: 800 } },
  { id: 'buy-10', tier: 'expert', icon: 'bag', target: 10, value: (m) => m.bought, reward: { chest: 'epic' } },
  { id: 'bounces-5000', tier: 'expert', icon: 'ball', target: 5000, value: L('bounces'), reward: { coins: 800 } },
  { id: 'no-death-20', tier: 'expert', icon: 'shield', target: 20, value: L('noDeath'), reward: { coins: 800 } },
  { id: 'coins-20000', tier: 'expert', icon: 'coin', target: 20000, value: L('coins'), reward: { coins: 1000 } },
  { id: 'stars-100', tier: 'expert', icon: 'star', target: 100, value: (m) => m.stars, reward: { coins: 800 } },
  { id: 'missions-15', tier: 'expert', icon: 'target', target: 15, value: L('missions'), reward: { chest: 'rare' } },
  // ── Légende ──
  { id: 'levels-50', tier: 'legend', icon: 'trophy', target: 50, value: (m) => m.levels, reward: { item: 'ball-legend' } },
  { id: 'stars-150', tier: 'legend', icon: 'star', target: 150, value: (m) => m.stars, reward: { item: 'goal-constellation' } },
  { id: 'swish-100', tier: 'legend', icon: 'swish', target: 100, value: L('swishes'), reward: { item: 'bounce-crown' } },
  { id: 'world-space', tier: 'legend', icon: 'space', target: 1, value: W(4), reward: { chest: 'epic' } },
  { id: 'daily-7', tier: 'legend', icon: 'gift', target: 7, value: L('dailyClaims'), reward: { chest: 'epic' } },
  { id: 'missions-30', tier: 'legend', icon: 'target', target: 30, value: L('missions'), reward: { coins: 1500 } },
  { id: 'time-180', tier: 'legend', icon: 'clock', target: 10800, value: L('playTime'), reward: { coins: 2000 } },
  { id: 'collection', tier: 'legend', icon: 'gem', target: CATALOG.filter((i) => typeof i.price === 'number' && i.price > 0 && !i.exclusive).length, value: (m) => m.collection, reward: { coins: 3000 } },
];

export class Achievements {
  constructor(storage = safeLocalStorage()) {
    this.storage = storage;
    this.data = this._read();
  }

  /** Tous les succès avec leur progression et leur état : 'claimed' | 'ready' | 'progress'. */
  view(ctx) {
    const m = measure(ctx);
    return ACHIEVEMENTS.map((a) => {
      const value = Math.min(a.target, Math.max(0, Math.floor(a.value(m))));
      const state = this.data.claimed.includes(a.id) ? 'claimed' : value >= a.target ? 'ready' : 'progress';
      return { ...a, value, state };
    });
  }

  claimable(ctx) {
    return this.view(ctx).filter((a) => a.state === 'ready').length;
  }

  claim(id, ctx, rng = Math.random) {
    const a = this.view(ctx).find((x) => x.id === id);
    if (!a || a.state !== 'ready') return null;
    const res = grant(a.reward, ctx.wallet, ctx.stats, rng);
    this.data.claimed.push(id);
    if (!this.data.notified.includes(id)) this.data.notified.push(id);
    this._save();
    res.passXp = awardPassXp('achievement', {}, this.storage); // Hoop Pass : XP d'un succès débloqué
    return res;
  }

  /** Succès qui viennent d'être atteints (annoncés une seule fois pendant la partie). */
  newlyUnlocked(ctx) {
    const fresh = this.view(ctx).filter((a) => a.state === 'ready' && !this.data.notified.includes(a.id));
    for (const a of fresh) this.data.notified.push(a.id);
    if (fresh.length) this._save();
    return fresh;
  }

  _read() {
    try {
      const raw = JSON.parse(this.storage?.getItem(KEY) ?? 'null');
      if (raw && typeof raw === 'object') {
        return {
          v: 1,
          claimed: Array.isArray(raw.claimed) ? raw.claimed.filter((x) => typeof x === 'string') : [],
          notified: Array.isArray(raw.notified) ? raw.notified.filter((x) => typeof x === 'string') : [],
        };
      }
    } catch {
      /* sauvegarde abîmée */
    }
    return { v: 1, claimed: [], notified: [] };
  }

  _save() {
    try {
      this.storage?.setItem(KEY, JSON.stringify(this.data));
    } catch {
      /* stockage indisponible */
    }
  }
}
