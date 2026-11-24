// Simulateur de l'économie (phase 4) : des joueurs types jouent N jours avec le VRAI code du jeu
// (porte-monnaie, coffres, calendrier, roulette, missions, succès, Hoop Pass, boutique) et une horloge
// simulée. Sert à vérifier l'équilibrage : progression régulière, récompenses sans frustration, toujours
// un objectif à atteindre, gemmes rares, publicités qui accélèrent sans être nécessaires.
//
// Usage : node tools/economy-sim.mjs [jours = 30]
//
// Profils :
//   actif        ≈ 25 min par jour : 4 nouveaux niveaux + 6 parties rejouées, 3 missions, calendrier, roulette
//   occasionnel  ≈ 10 min par jour : 2 nouveaux niveaux + 2 rejouées, 1 mission, calendrier, roulette
// Chaque profil est simulé sans publicité, puis avec toutes les publicités facultatives (3 lancers de roulette
// et 5 « doubler les pièces » par jour).

import { fileURLToPath } from 'node:url';
import { LEVELS, WORLDS } from '../src/game/worlds.js';
import { Progress } from '../src/game/progress.js';
import { Wallet } from '../src/shared/wallet.js';
import { Stats } from '../src/shared/stats.js';
import { DailyReward } from '../src/shared/daily.js';
import { Bonus, AD_SPINS_PER_DAY } from '../src/shared/bonus.js';
import { generateMissions } from '../src/shared/missions.js';
import { Achievements } from '../src/shared/achievements.js';
import { HoopPass, awardPassXp } from '../src/shared/pass.js';
import { CATALOG } from '../src/shared/catalog.js';
import { ADS_CONFIG } from '../src/shared/ads-config.js';
import { grant } from '../src/shared/rewards.js';

export const PROFILES = {
  active: { firstClears: 4, replays: 6, missions: 3, minutes: 25 },
  casual: { firstClears: 2, replays: 2, missions: 1, minutes: 10 },
};

function memory() {
  const m = new Map();
  return {
    get length() {
      return m.size;
    },
    key: (i) => [...m.keys()][i] ?? null,
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
  };
}

function seeded(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 1000000) / 1000000;
  };
}

const purchasable = CATALOG.filter((i) => typeof i.price === 'number' && i.price > 0 && !i.exclusive);

/**
 * Simule un joueur.
 * @returns {{ days: object[], firstPurchase, premiumDay, passMaxDay, final: object }}
 */
export function simulate({ days = 30, profile = 'active', ads = false, seed = 7, start = '2026-11-25T09:00:00' } = {}) {
  const P = PROFILES[profile];
  const rng = seeded(seed);
  const store = memory();
  const clock = { t: new Date(start) };
  const now = () => new Date(clock.t);
  const wallet = new Wallet(store);
  const stats = new Stats(store, now);
  const progress = new Progress(WORLDS, store);
  const daily = new DailyReward(store, now);
  const bonus = new Bonus(store, now);
  const achievements = new Achievements(store);
  const passNow = () => new Date(clock.t);
  const pass = () => new HoopPass({ storage: store, now: passNow });
  let nextLevel = 0;
  let firstPurchase = null;
  let premiumDay = null;
  let passMaxDay = null;
  const out = [];
  const totals = { coinsEarned: 0, gemsEarned: 0, chests: 0, ads: 0 };
  const track = (res) => {
    if (!res) return;
    totals.coinsEarned += res.coins ?? 0;
    totals.gemsEarned += res.gems ?? 0;
  };
  const ctx = { stats, progress, wallet };

  for (let day = 1; day <= days; day++) {
    // Calendrier quotidien et roulette (lancer gratuit, puis 3 lancers avec publicité si le joueur le veut)
    track(daily.claim(wallet, stats, rng));
    track(bonus.spin(wallet, stats, false, rng)?.result);
    if (ads) for (let i = 0; i < AD_SPINS_PER_DAY; i++) {
      const r = bonus.spin(wallet, stats, true, rng);
      if (r) {
        track(r.result);
        totals.ads++;
      }
    }
    // Parties : nouveaux niveaux, puis niveaux rejoués
    let doubles = ads ? ADS_CONFIG.placements.doubleCoins.dailyCap : 0;
    const play = (L, first) => {
      const stars = first ? (rng() < 0.3 ? 3 : 2) : Math.min(3, progress.starsFor(L.id) + (rng() < 0.4 ? 1 : 0));
      const swish = rng() < 0.15;
      const earned = wallet.reward(L.id, L.worldIndex, stars, swish, L.difficulty);
      progress.complete(L.id, stars, 30 + rng() * 30);
      let coins = earned.total;
      if (doubles > 0 && first) {
        wallet.addCoins(earned.total);
        coins *= 2;
        doubles--;
        totals.ads++;
      }
      totals.coinsEarned += coins;
      stats.add('coins', coins, false);
      for (const [k, v] of [['goals', 1], ['clears', 1], ['games', 1], ['stars', stars], ['bounces', 60], ['playTime', 45], [`world.${L.world}`, 1]]) stats.add(k, v, false);
      if (swish) stats.add('swishes', 1, false);
      if (rng() < 0.4) stats.add('noDeath', 1, false);
      stats.markLevel(L.id);
      awardPassXp('level', { first }, store);
    };
    for (let i = 0; i < P.firstClears && nextLevel < LEVELS.length; i++) play(LEVELS[nextLevel++], true);
    const replays = P.replays + (nextLevel >= LEVELS.length ? P.firstClears : 0);
    for (let i = 0; i < replays && nextLevel > 0; i++) play(LEVELS[Math.floor(rng() * nextLevel)], false);
    stats.save();
    // Missions du jour (le joueur réussit les plus simples d'abord)
    const worlds = WORLDS.filter((_, i) => progress.isWorldUnlocked(i)).map((w) => w.id);
    const missions = generateMissions(now().toISOString().slice(0, 10), worlds);
    for (const m of missions.slice(0, P.missions)) {
      track(grant(m.reward, wallet, stats, rng));
      stats.add('missions', 1);
      awardPassXp('mission', {}, store);
    }
    // Succès atteints
    for (const a of achievements.view(ctx).filter((x) => x.state === 'ready')) track(achievements.claim(a.id, ctx, rng));
    // Hoop Pass : Premium dès que les gemmes suffisent, puis toutes les récompenses disponibles
    const hp = pass();
    if (day === 1) track(hp.welcome(wallet));
    if (!hp.premium && wallet.gems >= hp.season.premium.gems && hp.unlockPremium(wallet) === 'ok') premiumDay = day;
    for (const r of hp.claimAll(wallet, stats, rng)) track(r);
    if (passMaxDay === null && hp.level >= hp.maxLevel) passMaxDay = day;
    // Boutique : le joueur achète l'objet le moins cher qu'il peut s'offrir
    for (;;) {
      const cheapest = purchasable.filter((i) => !wallet.owns(i.id)).sort((a, b) => a.price - b.price)[0];
      if (!cheapest || wallet.coins < cheapest.price) break;
      wallet.buy(cheapest.id);
      if (firstPurchase === null) firstPurchase = day;
    }
    out.push({ day, coins: wallet.coins, gems: wallet.gems, levels: progress.totals().done, passLevel: pass().level, premium: pass().premium, owned: purchasable.filter((i) => wallet.owns(i.id)).length, chests: stats.life('chests') });
    clock.t = new Date(clock.t.getTime() + 86400000);
  }
  const last = out[out.length - 1];
  const byRarity = {};
  for (const it of purchasable) if (wallet.owns(it.id)) byRarity[it.rarity] = (byRarity[it.rarity] ?? 0) + 1;
  return { days: out, firstPurchase, premiumDay, passMaxDay, totals, final: { ...last, collection: purchasable.length, byRarity } };
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  const days = Number(process.argv[2] ?? 30);
  for (const profile of Object.keys(PROFILES)) {
    for (const ads of [false, true]) {
      const r = simulate({ days, profile, ads });
      console.log(`\n${profile}${ads ? ' + publicités' : ''} — ${days} jours`);
      console.log(' jour  pièces  gemmes  niveaux  Pass  objets  coffres');
      for (const d of r.days.filter((d) => d.day === 1 || d.day % 5 === 0)) console.log(`  ${String(d.day).padStart(3)} ${String(d.coins).padStart(7)} ${String(d.gems).padStart(7)} ${String(d.levels).padStart(8)} ${String(d.passLevel).padStart(5)}${d.premium ? '★' : ' '} ${String(d.owned).padStart(6)} ${String(d.chests).padStart(8)}`);
      console.log(`  gagné : ${r.totals.coinsEarned} pièces, ${r.totals.gemsEarned} gemmes, ${r.totals.ads} publicités · 1er achat : jour ${r.firstPurchase ?? '—'} · Premium : jour ${r.premiumDay ?? '—'} · Pass terminé : jour ${r.passMaxDay ?? '—'} · collection ${r.final.owned}/${r.final.collection} ${JSON.stringify(r.final.byRarity)}`);
    }
  }
}
