// SUCCÈS (phase 5) — clé de sauvegarde `hoopbounce.achievements`.
//
// Les succès sont rangés par CATÉGORIES (Progression, Maîtrise, Trickshot, Fantôme, Collection, Fidélité,
// Défis). Chaque succès a aussi un PALIER (Débutant bronze, Intermédiaire argent, Expert or, Légende violet)
// qui donne la couleur de sa médaille et l'XP du Hoop Pass qu'il rapporte.
//
// États : `locked` (rien de fait) → `progress` (en cours) → `ready` (débloqué, récompense à récupérer) →
// `claimed` (récupéré : la récompense n'est donnée qu'une fois). Les DÉFIS CACHÉS (`hidden`) restent
// `secret` (invisibles) tant qu'ils ne sont pas réussis.
//
// La plupart des objectifs sont MESURÉS sur la sauvegarde (progression, statistiques à vie, porte-monnaie,
// Trickshot) : un succès ajouté plus tard se débloque donc tout seul si le joueur l'a déjà mérité. Les défis
// cachés sont des EXPLOITS repérés pendant la partie (`recordChallenge`), mémorisés ici.
//
// Sauvegarde v2 : { v: 2, claimed: [], notified: [], unlocked: { id: horodatage }, challenges: { id: horodatage },
// emblem: 'rookie' }. La v1 ({ claimed, notified }) est relue telle quelle. Chaque écriture fusionne avec ce
// qui est déjà enregistré (union) : deux pages ne peuvent pas s'effacer l'une l'autre.
//
// Les EMBLÈMES (icônes de profil) se gagnent avec certains succès : ils se déduisent des succès récupérés
// (aucune donnée à migrer) ; seul l'emblème choisi est enregistré.

import { CATALOG } from './catalog.js';
import { safeLocalStorage } from './stats.js';
import { grant } from './rewards.js';
import { awardPassXp } from './pass.js';
import { TrickshotProgress } from '../trickshot/progress.js';
import { TS_LEVELS } from '../trickshot/levels.js';

const KEY = 'hoopbounce.achievements';

/** Paliers : couleur de la médaille (rgb) et XP du Hoop Pass rapportée. */
export const TIERS = {
  beginner: { order: 0, rgb: '205,140,90', xp: 50 },       // bronze
  intermediate: { order: 1, rgb: '190,205,225', xp: 75 }, // argent
  expert: { order: 2, rgb: '255,201,77', xp: 100 },        // or
  legend: { order: 3, rgb: '180,107,255', xp: 150 },       // légende (violet)
};

/** Catégories, dans l'ordre des onglets : icône (src/menu/icons.js) et couleur d'accent. */
export const CATEGORIES = {
  progression: { icon: 'flag', rgb: '255,150,70' },
  mastery: { icon: 'hoop', rgb: '96,180,255' },
  trickshot: { icon: 'trickshot', rgb: '70,225,215' },
  ghost: { icon: 'ghost', rgb: '190,225,255' },
  collection: { icon: 'collection', rgb: '255,201,77' },
  loyalty: { icon: 'daily', rgb: '255,120,160' },
  challenges: { icon: 'mystery', rgb: '180,107,255' },
};

/** Emblèmes (icônes de profil) : icône, couleur, succès qui le donne (null = offert). */
export const EMBLEMS = {
  rookie: { icon: 'ball', rgb: '255,150,70' },
  ghost: { icon: 'ghost', rgb: '190,225,255' },
  lab: { icon: 'trickshot', rgb: '70,225,215' },
  collector: { icon: 'collection', rgb: '255,201,77' },
  loyal: { icon: 'daily', rgb: '255,120,160' },
  impossible: { icon: 'sparkle', rgb: '255,90,160' },
  legend: { icon: 'trophy', rgb: '255,214,90' },
  mystery: { icon: 'mystery', rgb: '180,107,255' },
};

const purchasable = () => CATALOG.filter((i) => typeof i.price === 'number' && i.price > 0 && !i.exclusive);
const VERY_HARD = TS_LEVELS.filter((l) => l.diff === 'very' || l.diff === 'impossible').map((l) => l.n);

/** Valeurs mesurées pour les succès, à partir de la sauvegarde. */
export function measure({ stats, progress, wallet, trickshot = null, challenges = {} }) {
  const tot = progress.totals();
  const levels = progress.worlds.flatMap((w) => w.levels);
  let perfect = 0;
  progress.worlds.forEach((_, i) => {
    const s = progress.worldStats(i);
    if (s.total && s.stars === s.maxStars) perfect++;
  });
  let ts = trickshot;
  if (!ts) {
    try {
      ts = new TrickshotProgress({ total: TS_LEVELS.length, storage: stats.storage ?? null });
    } catch {
      ts = null;
    }
  }
  const tsDone = ts ? TS_LEVELS.filter((l) => ts.isDone(l.n)).length : 0;
  return {
    levels: tot.done,
    stars: tot.stars,
    bought: wallet.boughtCount(),
    collection: purchasable().filter((i) => wallet.owns(i.id)).length,
    collectionTotal: purchasable().length,
    // « skins » possédés : tous les objets sauf les 4 offerts au départ (achetés, gagnés, exclusifs)
    owned: CATALOG.filter((i) => i.price !== 0 && wallet.owns(i.id)).length,
    perfect,
    level: (n) => (levels[n - 1] && progress.isDone(levels[n - 1].id) ? 1 : 0),
    world: (i) => (progress.isWorldComplete(i) ? 1 : 0),
    life: (k) => stats.life(k),
    // Trickshots réussis (rejouer compris) ; au moins le nombre de cartes déjà réussies (anciennes sauvegardes)
    trickshots: Math.max(stats.life('trickshots'), tsDone),
    tsImpossible: ts ? VERY_HARD.filter((n) => ts.level(n).stars >= 3).length : 0,
    ch: (id) => (challenges[id] ? 1 : 0),
  };
}

const L = (k) => (m) => m.life(k);
const N = (n) => (m) => m.level(n);
const CH = (id) => (m) => m.ch(id);

/**
 * Définition des succès : { id, cat, tier, icon, target, value(m), reward, hidden? }.
 * Récompense : { coins, gems, chest, item, cosmetic } (src/shared/rewards.js) + { emblem } ; l'XP du Hoop Pass
 * vient du palier. Textes : src/shared/live-i18n.js (`ach.<id>`, `ach.<id>.d`).
 * Les identifiants des succès d'avant la phase 5 ne changent jamais (sauvegardes).
 */
export const ACHIEVEMENTS = [
  // ── 🏀 Progression ──
  { id: 'first-level', cat: 'progression', tier: 'beginner', icon: 'flag', target: 1, value: (m) => m.levels, reward: { coins: 100 } },
  { id: 'world-city', cat: 'progression', tier: 'beginner', icon: 'city', target: 1, value: N(10), reward: { chest: 'common' } },
  { id: 'levels-10', cat: 'progression', tier: 'intermediate', icon: 'flag', target: 10, value: (m) => m.levels, reward: { coins: 300 } },
  { id: 'world-snow', cat: 'progression', tier: 'intermediate', icon: 'snow', target: 1, value: N(20), reward: { chest: 'rare' } },
  { id: 'levels-25', cat: 'progression', tier: 'expert', icon: 'flag', target: 25, value: (m) => m.levels, reward: { chest: 'epic', gems: 15 } },
  { id: 'world-volcano', cat: 'progression', tier: 'expert', icon: 'volcano', target: 1, value: N(30), reward: { coins: 600, gems: 10 } },
  { id: 'world-forest', cat: 'progression', tier: 'expert', icon: 'forest', target: 1, value: N(40), reward: { coins: 700, gems: 15 } },
  { id: 'world-space', cat: 'progression', tier: 'legend', icon: 'space', target: 1, value: N(50), reward: { chest: 'epic', gems: 20 } },
  { id: 'levels-50', cat: 'progression', tier: 'legend', icon: 'trophy', target: 50, value: (m) => m.levels, reward: { item: 'ball-legend', gems: 40, emblem: 'legend' } },
  { id: 'stars-10', cat: 'progression', tier: 'beginner', icon: 'star', target: 10, value: (m) => m.stars, reward: { coins: 150 } },
  { id: 'stars-50', cat: 'progression', tier: 'intermediate', icon: 'star', target: 50, value: (m) => m.stars, reward: { chest: 'rare' } },
  { id: 'stars-100', cat: 'progression', tier: 'expert', icon: 'star', target: 100, value: (m) => m.stars, reward: { coins: 800 } },
  { id: 'perfect-world', cat: 'progression', tier: 'expert', icon: 'crown', target: 1, value: (m) => m.perfect, reward: { item: 'trail-aurora' } },
  { id: 'stars-150', cat: 'progression', tier: 'legend', icon: 'star', target: 150, value: (m) => m.stars, reward: { item: 'goal-constellation', gems: 30 } },

  // ── 🎯 Maîtrise ──
  { id: 'bounces-100', cat: 'mastery', tier: 'beginner', icon: 'ball', target: 100, value: L('bounces'), reward: { coins: 100 } },
  { id: 'no-death-1', cat: 'mastery', tier: 'beginner', icon: 'shield', target: 1, value: L('noDeath'), reward: { coins: 150 } },
  { id: 'games-10', cat: 'mastery', tier: 'beginner', icon: 'play', target: 10, value: L('games'), reward: { coins: 100 } },
  { id: 'bounces-1000', cat: 'mastery', tier: 'intermediate', icon: 'ball', target: 1000, value: L('bounces'), reward: { coins: 300 } },
  { id: 'goals-100', cat: 'mastery', tier: 'intermediate', icon: 'hoop', target: 100, value: L('goals'), reward: { coins: 300 } },
  { id: 'swish-25', cat: 'mastery', tier: 'intermediate', icon: 'swish', target: 25, value: L('swishes'), reward: { cosmetic: 'rare' } },
  { id: 'deaths-100', cat: 'mastery', tier: 'intermediate', icon: 'skull', target: 100, value: L('deaths'), reward: { coins: 200 } },
  { id: 'time-30', cat: 'mastery', tier: 'intermediate', icon: 'clock', target: 1800, value: L('playTime'), reward: { coins: 300 } },
  { id: 'goals-500', cat: 'mastery', tier: 'expert', icon: 'hoop', target: 500, value: L('goals'), reward: { coins: 800 } },
  { id: 'bounces-5000', cat: 'mastery', tier: 'expert', icon: 'ball', target: 5000, value: L('bounces'), reward: { coins: 800 } },
  { id: 'no-death-20', cat: 'mastery', tier: 'expert', icon: 'shield', target: 20, value: L('noDeath'), reward: { coins: 800 } },
  { id: 'swish-100', cat: 'mastery', tier: 'legend', icon: 'swish', target: 100, value: L('swishes'), reward: { item: 'bounce-crown' } },
  { id: 'time-180', cat: 'mastery', tier: 'legend', icon: 'clock', target: 10800, value: L('playTime'), reward: { coins: 2000 } },

  // ── 🎯 Trickshot ──
  { id: 'ts-1', cat: 'trickshot', tier: 'beginner', icon: 'trickshot', target: 1, value: (m) => m.trickshots, reward: { coins: 150 } },
  { id: 'ts-10', cat: 'trickshot', tier: 'intermediate', icon: 'trickshot', target: 10, value: (m) => m.trickshots, reward: { coins: 400 } },
  { id: 'ts-25', cat: 'trickshot', tier: 'expert', icon: 'trickshot', target: 25, value: (m) => m.trickshots, reward: { chest: 'rare', emblem: 'lab' } },
  { id: 'ts-50', cat: 'trickshot', tier: 'legend', icon: 'trickshot', target: 50, value: (m) => m.trickshots, reward: { item: 'bounce-lab' } },
  { id: 'ts-impossible', cat: 'trickshot', tier: 'legend', icon: 'sparkle', target: 1, value: (m) => m.tsImpossible, reward: { gems: 20, emblem: 'impossible' } },

  // ── 👻 Fantôme ──
  { id: 'ghost-1', cat: 'ghost', tier: 'beginner', icon: 'ghost', target: 1, value: L('ghostBeaten'), reward: { coins: 150 } },
  { id: 'ghost-5', cat: 'ghost', tier: 'intermediate', icon: 'ghost', target: 5, value: L('ghostBeaten'), reward: { coins: 400, emblem: 'ghost' } },
  { id: 'ghost-20', cat: 'ghost', tier: 'expert', icon: 'ghost', target: 20, value: L('ghostBeaten'), reward: { chest: 'rare' } },
  { id: 'ghost-50', cat: 'ghost', tier: 'legend', icon: 'ghost', target: 50, value: L('ghostBeaten'), reward: { item: 'trail-spectre', gems: 15 } },

  // ── 💰 Collection ──
  { id: 'buy-1', cat: 'collection', tier: 'beginner', icon: 'bag', target: 1, value: (m) => m.bought, reward: { chest: 'common' } },
  { id: 'chests-5', cat: 'collection', tier: 'beginner', icon: 'chest', target: 5, value: L('chests'), reward: { coins: 300 } },
  { id: 'coins-1000', cat: 'collection', tier: 'beginner', icon: 'coin', target: 1000, value: L('coins'), reward: { coins: 150 } },
  { id: 'chests-10', cat: 'collection', tier: 'intermediate', icon: 'chest', target: 10, value: L('chests'), reward: { coins: 400 } },
  { id: 'buy-5', cat: 'collection', tier: 'intermediate', icon: 'bag', target: 5, value: (m) => m.bought, reward: { coins: 400 } },
  { id: 'own-10', cat: 'collection', tier: 'intermediate', icon: 'gem', target: 10, value: (m) => m.owned, reward: { coins: 500, emblem: 'collector' } },
  { id: 'coins-5000', cat: 'collection', tier: 'intermediate', icon: 'coin', target: 5000, value: L('coins'), reward: { coins: 500 } },
  { id: 'chests-50', cat: 'collection', tier: 'expert', icon: 'chest', target: 50, value: L('chests'), reward: { coins: 1000 } },
  { id: 'buy-10', cat: 'collection', tier: 'expert', icon: 'bag', target: 10, value: (m) => m.bought, reward: { chest: 'epic' } },
  { id: 'coins-20000', cat: 'collection', tier: 'expert', icon: 'coin', target: 20000, value: L('coins'), reward: { coins: 1000 } },
  { id: 'collection', cat: 'collection', tier: 'legend', icon: 'gem', target: purchasable().length, value: (m) => m.collection, reward: { coins: 3000 } },

  // ── 📅 Fidélité ──
  { id: 'daily-1', cat: 'loyalty', tier: 'beginner', icon: 'gift', target: 1, value: L('dailyClaims'), reward: { coins: 100 } },
  { id: 'mission-1', cat: 'loyalty', tier: 'beginner', icon: 'target', target: 1, value: L('missions'), reward: { coins: 100 } },
  { id: 'missions-15', cat: 'loyalty', tier: 'expert', icon: 'target', target: 15, value: L('missions'), reward: { chest: 'rare' } },
  { id: 'daily-7', cat: 'loyalty', tier: 'legend', icon: 'gift', target: 7, value: L('dailyClaims'), reward: { chest: 'epic', gems: 10 } },
  { id: 'daily-30', cat: 'loyalty', tier: 'expert', icon: 'gift', target: 30, value: L('dailyClaims'), reward: { chest: 'rare', emblem: 'loyal' } },
  { id: 'missions-30', cat: 'loyalty', tier: 'legend', icon: 'target', target: 30, value: L('missions'), reward: { coins: 1500, gems: 15 } },

  // ── ⭐ Défis (cachés jusqu'à leur découverte) ──
  { id: 'ch-chain', cat: 'challenges', tier: 'expert', icon: 'ball', target: 1, hidden: true, value: CH('ch-chain'), reward: { coins: 400 } },
  { id: 'ch-teleport', cat: 'challenges', tier: 'expert', icon: 'space', target: 1, hidden: true, value: CH('ch-teleport'), reward: { coins: 400 } },
  { id: 'ch-nowall', cat: 'challenges', tier: 'expert', icon: 'shield', target: 1, hidden: true, value: CH('ch-nowall'), reward: { coins: 500 } },
  { id: 'ch-perfect', cat: 'challenges', tier: 'expert', icon: 'crown', target: 1, hidden: true, value: CH('ch-perfect'), reward: { chest: 'rare' } },
  { id: 'ch-photo', cat: 'challenges', tier: 'expert', icon: 'ghost', target: 1, hidden: true, value: CH('ch-photo'), reward: { chest: 'rare' } },
  { id: 'ch-lastshot', cat: 'challenges', tier: 'expert', icon: 'trickshot', target: 1, hidden: true, value: CH('ch-lastshot'), reward: { coins: 400 } },
  { id: 'ch-firsttry', cat: 'challenges', tier: 'expert', icon: 'target', target: 1, hidden: true, value: CH('ch-firsttry'), reward: { chest: 'rare' } },
  { id: 'ch-billiard', cat: 'challenges', tier: 'expert', icon: 'burst', target: 1, hidden: true, value: CH('ch-billiard'), reward: { coins: 400 } },
];

/** Défis cachés (exploits repérés pendant la partie). */
export const CHALLENGES = ACHIEVEMENTS.filter((a) => a.hidden).map((a) => a.id);

// Méta-succès visible : découvrir tous les défis cachés
ACHIEVEMENTS.push({ id: 'ch-all', cat: 'challenges', tier: 'legend', icon: 'mystery', target: CHALLENGES.length, value: (m) => CHALLENGES.filter((id) => m.ch(id)).length, reward: { item: 'goal-mystery', emblem: 'mystery' } });

const BY_ID = new Map(ACHIEVEMENTS.map((a) => [a.id, a]));

/** XP du Hoop Pass rapportée par un succès (selon son palier). */
export const achievementXp = (a) => TIERS[a.tier]?.xp ?? 100;

export class Achievements {
  constructor(storage = safeLocalStorage(), now = () => Date.now()) {
    this.storage = storage;
    this.now = now;
    this.data = this._read();
  }

  /**
   * Tous les succès avec leur progression et leur état :
   * 'locked' | 'progress' | 'ready' | 'claimed' — ou 'secret' pour un défi caché pas encore réussi.
   */
  view(ctx) {
    const m = measure({ ...ctx, challenges: this.data.challenges });
    return ACHIEVEMENTS.map((a) => {
      const value = Math.min(a.target, Math.max(0, Math.floor(a.value(m))));
      const reached = value >= a.target;
      const state = this.data.claimed.includes(a.id) ? 'claimed' : reached ? 'ready' : a.hidden ? 'secret' : value > 0 ? 'progress' : 'locked';
      return { ...a, value, state, xp: achievementXp(a), unlockedAt: this.data.unlocked[a.id] ?? null };
    });
  }

  claimable(ctx) {
    return this.view(ctx).filter((a) => a.state === 'ready').length;
  }

  /** Récupère la récompense d'un succès débloqué (une seule fois). */
  claim(id, ctx, rng = Math.random) {
    const a = this.view(ctx).find((x) => x.id === id);
    if (!a || a.state !== 'ready') return null;
    const res = grant(a.reward, ctx.wallet, ctx.stats, rng);
    this.data.claimed.push(id);
    if (!this.data.notified.includes(id)) this.data.notified.push(id);
    this.data.unlocked[id] ??= this.now();
    this._save();
    if (a.reward.emblem) res.emblem = a.reward.emblem;
    res.passXp = awardPassXp(achievementXp(a), {}, this.storage); // Hoop Pass : XP selon le palier
    return res;
  }

  /** Succès qui viennent d'être atteints (annoncés une seule fois : animation de déblocage). */
  newlyUnlocked(ctx) {
    const fresh = this.view(ctx).filter((a) => a.state === 'ready' && !this.data.notified.includes(a.id));
    const t = this.now();
    for (const a of fresh) {
      this.data.notified.push(a.id);
      this.data.unlocked[a.id] ??= t;
    }
    if (fresh.length) this._save();
    return fresh;
  }

  /** Un défi caché vient d'être réussi pendant la partie. @returns {boolean} true si c'est une découverte */
  recordChallenge(id) {
    if (!CHALLENGES.includes(id) || this.data.challenges[id]) return false;
    this.data.challenges[id] = this.now();
    this._save();
    return true;
  }

  hasChallenge(id) {
    return !!this.data.challenges[id];
  }

  // ─── Emblèmes ────────────────────────────────────────────────────────────

  /** Emblèmes obtenus : l'emblème de départ + ceux des succès récupérés. */
  emblems() {
    const out = ['rookie'];
    for (const id of this.data.claimed) {
      const e = BY_ID.get(id)?.reward.emblem;
      if (e && EMBLEMS[e] && !out.includes(e)) out.push(e);
    }
    return out;
  }

  emblem() {
    const owned = this.emblems();
    return owned.includes(this.data.emblem) ? this.data.emblem : owned[owned.length - 1];
  }

  setEmblem(id) {
    if (!this.emblems().includes(id)) return false;
    this.data.emblem = id;
    this._save();
    return true;
  }

  // ─── Sauvegarde ──────────────────────────────────────────────────────────

  _parse(raw) {
    const list = (x) => (Array.isArray(x) ? x.filter((v) => typeof v === 'string') : []);
    const stamps = (x) => {
      const out = {};
      if (x && typeof x === 'object' && !Array.isArray(x)) for (const [k, v] of Object.entries(x)) if (typeof v === 'number' && isFinite(v)) out[k] = v;
      return out;
    };
    return {
      v: 2,
      claimed: list(raw?.claimed),
      notified: list(raw?.notified),
      unlocked: stamps(raw?.unlocked),
      challenges: stamps(raw?.challenges),
      emblem: typeof raw?.emblem === 'string' ? raw.emblem : null,
    };
  }

  _read() {
    try {
      const raw = JSON.parse(this.storage?.getItem(KEY) ?? 'null');
      if (raw && typeof raw === 'object') return this._parse(raw);
    } catch {
      /* sauvegarde abîmée */
    }
    return this._parse(null);
  }

  _save() {
    try {
      // Fusion avec la sauvegarde actuelle : rien de ce qu'une autre page a enregistré n'est perdu
      const disk = this._read();
      const d = this.data;
      const union = (a, b) => [...new Set([...a, ...b])];
      d.claimed = union(disk.claimed, d.claimed);
      d.notified = union(disk.notified, d.notified);
      d.unlocked = { ...d.unlocked, ...disk.unlocked };
      d.challenges = { ...d.challenges, ...disk.challenges };
      this.storage?.setItem(KEY, JSON.stringify(d));
    } catch {
      /* stockage indisponible */
    }
  }
}
