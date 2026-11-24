// Missions quotidiennes (clé `hoopbounce.missions`).
//
// Chaque jour, 3 missions sont tirées automatiquement (tirage déterminé par la date : le même jour
// donne les mêmes missions) : une facile, une moyenne, une difficile. Leur progression vient des
// compteurs du jour (stats.js). Récompenses : des pièces ; la mission difficile ajoute un coffre
// (commun, rare, ou épique rarement) ; la moyenne, parfois un coffre commun. Jamais de gemmes.
// Tout se renouvelle à minuit (heure locale).

import { dayKey, safeLocalStorage } from './stats.js';
import { grant } from './rewards.js';
import { awardPassXp } from './pass.js';

const KEY = 'hoopbounce.missions';

/** Modèles : compteur du jour suivi, objectifs (facile → difficile), pièces correspondantes. */
// Phase 4 (économie) : environ 20 % de pièces en moins, des coffres plus rares (voir generateMissions).
export const MISSION_TEMPLATES = [
  { id: 'levels', stat: 'levels', targets: [2, 3, 5], coins: [80, 110, 160], icon: 'flag' },
  { id: 'goals', stat: 'goals', targets: [5, 10, 15], coins: [80, 130, 180], icon: 'hoop' },
  { id: 'stars', stat: 'stars', targets: [4, 7, 10], coins: [90, 130, 180], icon: 'star' },
  { id: 'noDeath', stat: 'noDeath', targets: [1, 2, 3], coins: [100, 150, 210], icon: 'shield' },
  { id: 'time', stat: 'playTime', targets: [300, 600, 900], coins: [70, 120, 170], icon: 'clock' },
  { id: 'bounces', stat: 'bounces', targets: [30, 60, 100], coins: [60, 100, 150], icon: 'ball' },
  { id: 'world', stat: 'world', targets: [1, 1, 2], coins: [90, 120, 180], icon: 'world' },
  { id: 'games', stat: 'games', targets: [3, 4, 6], coins: [60, 80, 120], icon: 'play' },
  { id: 'swish', stat: 'swishes', targets: [1, 2, 3], coins: [90, 130, 170], icon: 'swish' },
];

/** Générateur pseudo-aléatoire reproductible (même graine → même suite). */
function seeded(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 100000) / 100000;
  };
}

const hash = (str) => [...str].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) | 0, 7);

/** Les 3 missions d'un jour. `worlds` : identifiants des mondes ouverts (mission « monde »). */
export function generateMissions(date, worlds = ['city']) {
  const rng = seeded(hash(date));
  const pool = MISSION_TEMPLATES.slice();
  const picked = [];
  while (picked.length < 3) picked.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
  return picked.map((tpl, tier) => {
    const m = { tpl: tpl.id, icon: tpl.icon, stat: tpl.stat, target: tpl.targets[tier], reward: { coins: tpl.coins[tier] }, claimed: false, notified: false };
    if (tpl.id === 'world') {
      m.world = worlds[Math.floor(rng() * worlds.length)] ?? 'city';
      m.stat = `world.${m.world}`;
    }
    if (tier === 2) {
      // La mission difficile : un coffre — commun le plus souvent, rare parfois, épique rarement
      const r = rng();
      if (r < 0.62) m.reward.chest = 'common';
      else if (r < 0.92) m.reward.chest = 'rare';
      else m.reward.chest = 'epic';
    } else if (tier === 1 && rng() < 0.15) m.reward.chest = 'common';
    return m;
  });
}

export class Missions {
  constructor(storage = safeLocalStorage(), now = () => new Date()) {
    this.storage = storage;
    this.now = now;
    this.data = this._read();
  }

  /** Missions du jour (tirées au premier appel de la journée). */
  ensure(worlds = ['city']) {
    const today = dayKey(this.now());
    if (this.data.date !== today || !Array.isArray(this.data.list) || this.data.list.length !== 3) {
      this.data = { v: 1, date: today, list: generateMissions(today, worlds), total: this.data.total ?? 0 };
      this._save();
    }
    return this.data.list;
  }

  /** Missions avec leur progression actuelle. */
  view(stats, worlds) {
    return this.ensure(worlds).map((m, i) => {
      const value = Math.min(m.target, stats.today(m.stat));
      return { ...m, index: i, value, done: value >= m.target };
    });
  }

  claimable(stats, worlds) {
    return this.view(stats, worlds).filter((m) => m.done && !m.claimed).length;
  }

  /** Récupère la récompense d'une mission terminée. */
  claim(i, wallet, stats, rng = Math.random) {
    const m = this.view(stats)[i];
    if (!m || !m.done || m.claimed) return null;
    const res = grant(m.reward, wallet, stats, rng);
    this.data.list[i].claimed = true;
    this.data.list[i].notified = true;
    this.data.total = (this.data.total ?? 0) + 1;
    this._save();
    stats.add('missions', 1);
    res.passXp = awardPassXp('mission', {}, this.storage); // Hoop Pass : XP d'une mission réalisée
    return res;
  }

  /** Missions qui viennent d'être terminées (pour l'annoncer une seule fois pendant la partie). */
  newlyCompleted(stats, worlds) {
    const fresh = this.view(stats, worlds).filter((m) => m.done && !m.notified);
    for (const m of fresh) this.data.list[m.index].notified = true;
    if (fresh.length) this._save();
    return fresh;
  }

  _read() {
    try {
      const raw = JSON.parse(this.storage?.getItem(KEY) ?? 'null');
      if (raw && typeof raw === 'object' && typeof raw.date === 'string' && Array.isArray(raw.list)) return raw;
    } catch {
      /* sauvegarde abîmée : on repart de zéro */
    }
    return { v: 1, date: null, list: [], total: 0 };
  }

  _save() {
    try {
      this.storage?.setItem(KEY, JSON.stringify(this.data));
    } catch {
      /* stockage indisponible */
    }
  }
}
