// HOOP PASS — le passe de saison de Hoop Bounce (le système ; le contenu est dans ./seasons/).
//
// Le joueur gagne de l'XP de Pass en jouant :
//   terminer un niveau (60 XP la première fois, 15 ensuite), terminer un Trickshot (80 / 20),
//   récupérer une mission quotidienne (100), récupérer un succès (150) — barème dans la saison.
// L'XP fait monter le niveau du Pass (1 → 50). Chaque niveau débloque une récompense sur la ligne
// GRATUITE et une sur la ligne PREMIUM. Le Premium se débloque avec des 💎 gemmes (version de test) ;
// il donne aussi les récompenses Premium des niveaux déjà atteints.
//
// Sauvegarde par saison (clé `hoopbounce.pass.<passId>`) : une nouvelle saison repart de zéro, l'ancienne
// est gardée. À la fin de la saison, plus d'XP ni de récompenses : les objets exclusifs (dont le
// mythique) ne s'obtiennent plus. Les objets déjà obtenus restent au joueur.
//
// Aucune dépendance au navigateur (testable sous Node).

import { safeLocalStorage } from './stats.js';
import { grant } from './rewards.js';
import { SEASON, activeSeason } from './season.js';
import { seasonConfig } from './seasons/index.js';

const DAY = 86400000;

export class HoopPass {
  /**
   * @param {{ season?: object|null, storage?: Storage|null, now?: () => Date }} [o]
   */
  constructor({ season = defaultSeason(), storage = safeLocalStorage(), now = () => new Date() } = {}) {
    this.season = season;
    this.storage = storage;
    this.now = now;
    this.data = this._read();
  }

  get key() {
    return `hoopbounce.pass.${this.season?.passId ?? 'none'}`;
  }

  // ─── Temps ────────────────────────────────────────────────────────────────

  get startsAt() {
    return this.season ? new Date(this.season.start).getTime() : 0;
  }

  get endsAt() {
    return this.season ? new Date(this.season.end).getTime() : 0;
  }

  /** La saison est en cours (XP et récompenses possibles). */
  get active() {
    const t = this.now().getTime();
    return !!this.season && t >= this.startsAt && t < this.endsAt;
  }

  get over() {
    return !!this.season && this.now().getTime() >= this.endsAt;
  }

  /** Temps restant (ms, 0 si terminée). */
  timeLeft() {
    return Math.max(0, this.endsAt - this.now().getTime());
  }

  /** Temps restant découpé (jours, heures, minutes). */
  timeLeftParts() {
    const ms = this.timeLeft();
    return { days: Math.floor(ms / DAY), hours: Math.floor((ms % DAY) / 3600000), minutes: Math.floor((ms % 3600000) / 60000) };
  }

  // ─── Niveaux et XP ────────────────────────────────────────────────────────

  get maxLevel() {
    return this.season?.maxLevel ?? 0;
  }

  /** XP cumulée nécessaire pour atteindre le niveau n (niveau 1 = 0 XP). */
  xpToReach(n) {
    let total = 0;
    for (let k = 2; k <= n; k++) total += this.season.levelXp(k);
    return total;
  }

  /** Niveau actuel (1…max) et avancement vers le suivant. */
  progress(xp = this.data.xp) {
    if (!this.season) return { level: 0, xpIn: 0, xpNeed: 1, ratio: 0, max: true, xp: 0, total: 0 };
    let level = 1;
    while (level < this.maxLevel && xp >= this.xpToReach(level + 1)) level++;
    const max = level >= this.maxLevel;
    const base = this.xpToReach(level);
    const need = max ? 1 : this.season.levelXp(level + 1);
    const xpIn = max ? 1 : xp - base;
    return { level, xpIn, xpNeed: need, ratio: max ? 1 : xpIn / need, max, xp, total: this.xpToReach(this.maxLevel) };
  }

  get level() {
    return this.progress().level;
  }

  /**
   * Ajoute l'XP d'une action. source : 'level' | 'trickshot' | 'mission' | 'achievement'.
   * first : première réussite (niveau, Trickshot) → barème plein, sinon barème « rejouer ».
   * @returns {{ gained:number, from:number, to:number }|null} null hors saison
   */
  addXp(source, { first = true } = {}) {
    if (!this.active) return null;
    const X = this.season.xp;
    const gained = source === 'level' ? (first ? X.level : X.levelReplay)
      : source === 'trickshot' ? (first ? X.trickshot : X.trickshotReplay)
        : source === 'mission' ? X.mission
          : source === 'achievement' ? X.achievement
            : typeof source === 'number' ? source : 0;
    if (!gained) return null;
    const from = this.level;
    const cap = this.xpToReach(this.maxLevel);
    this.data.xp = Math.min(cap, this.data.xp + gained);
    this.data.log = [...(this.data.log ?? []).slice(-19), { s: typeof source === 'number' ? 'bonus' : source, xp: gained, t: this.now().getTime() }];
    this._save();
    return { gained, from, to: this.level };
  }

  /** Montées de niveau pas encore vues dans la page du Pass (pour les animer à l'ouverture). */
  unseen() {
    return { fromXp: this.data.seenXp ?? 0, toXp: this.data.xp, fromLevel: this.progress(this.data.seenXp ?? 0).level, toLevel: this.level };
  }

  markSeen() {
    this.data.seenXp = this.data.xp;
    this._save();
  }

  // ─── Récompenses ──────────────────────────────────────────────────────────

  rewardAt(level, track) {
    return this.season?.levels[level - 1]?.[track] ?? null;
  }

  /** 'claimed' | 'ready' | 'locked' (niveau pas atteint) | 'premium' (ligne Premium non débloquée) | 'none' | 'over' */
  state(level, track) {
    const r = this.rewardAt(level, track);
    if (!r) return 'none';
    if (this.data.claimed[track].includes(level)) return 'claimed';
    if (level > this.level) return 'locked';
    if (track === 'premium' && !this.data.premium) return 'premium';
    if (!this.active) return 'over';
    return 'ready';
  }

  /** Nombre de récompenses à récupérer. */
  claimable() {
    let n = 0;
    for (let l = 1; l <= this.maxLevel; l++) for (const tr of ['free', 'premium']) if (this.state(l, tr) === 'ready') n++;
    return n;
  }

  /**
   * Récupère une récompense.
   * @returns {object|null} ce qui a été gagné (voir rewards.grant), ou null si impossible
   */
  claim(level, track, wallet, stats = null, rng = Math.random) {
    if (this.state(level, track) !== 'ready') return null;
    const res = grant(this.rewardAt(level, track), wallet, stats, rng);
    this.data.claimed[track].push(level);
    this._save();
    return { ...res, level, track };
  }

  /** Récupère tout ce qui est disponible. */
  claimAll(wallet, stats = null, rng = Math.random) {
    const out = [];
    for (let l = 1; l <= this.maxLevel; l++) for (const tr of ['free', 'premium']) {
      const r = this.claim(l, tr, wallet, stats, rng);
      if (r) out.push(r);
    }
    return out;
  }

  get premium() {
    return !!this.data.premium;
  }

  /** Débloque la ligne Premium avec des gemmes. @returns {'ok'|'owned'|'gems'|'over'} */
  unlockPremium(wallet) {
    if (this.data.premium) return 'owned';
    if (!this.active) return 'over';
    if (!wallet.spendGems(this.season.premium.gems)) return 'gems';
    this.data.premium = true;
    this._save();
    return 'ok';
  }

  /** Cadeau de bienvenue (une fois par saison) : des gemmes pour découvrir le Pass. */
  welcome(wallet) {
    if (this.data.welcomed || !this.active || !this.season.welcomeGift) return null;
    this.data.welcomed = true;
    this._save();
    return grant(this.season.welcomeGift, wallet);
  }

  // ─── Stockage ─────────────────────────────────────────────────────────────

  _read() {
    const empty = { v: 1, xp: 0, seenXp: 0, premium: false, claimed: { free: [], premium: [] }, welcomed: false, log: [] };
    try {
      const raw = JSON.parse(this.storage?.getItem(this.key) ?? 'null');
      if (!raw || typeof raw !== 'object') return empty;
      const list = (a) => (Array.isArray(a) ? a.filter((n) => Number.isInteger(n)) : []);
      return {
        ...empty,
        xp: Math.max(0, Number(raw.xp) || 0),
        seenXp: Math.max(0, Number(raw.seenXp) || 0),
        premium: !!raw.premium,
        claimed: { free: list(raw.claimed?.free), premium: list(raw.claimed?.premium) },
        welcomed: !!raw.welcomed,
        log: Array.isArray(raw.log) ? raw.log.slice(-20) : [],
      };
    } catch {
      return empty;
    }
  }

  _save() {
    if (!this.season) return;
    try {
      this.storage?.setItem(this.key, JSON.stringify(this.data));
    } catch {
      /* stockage indisponible */
    }
  }
}

/** Configuration de la saison en cours (null : pas de saison, donc pas de Pass). */
export function defaultSeason() {
  return seasonConfig(activeSeason()?.id ?? SEASON);
}

/**
 * Ajoute l'XP de Pass d'une action, sans rien casser hors saison (appelé par le jeu, le Trickshot, les
 * missions et les succès). @returns {{gained, from, to}|null}
 */
export function awardPassXp(source, opts = {}, storage = safeLocalStorage()) {
  try {
    const season = defaultSeason();
    if (!season) return null;
    return new HoopPass({ season, storage }).addXp(source, opts);
  } catch {
    return null;
  }
}
