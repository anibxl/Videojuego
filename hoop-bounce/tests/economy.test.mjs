// ÉCONOMIE (phase 4) : équilibrage vérifié sur des joueurs simulés pendant 30 jours avec le vrai code
// (tools/economy-sim.mjs), probabilités des coffres et de la roulette, sources de gemmes, publicités.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { simulate } from '../tools/economy-sim.mjs';
import { CHESTS, chestOdds, pickRarity } from '../src/shared/rewards.js';
import { WHEEL, wheelOdds } from '../src/shared/bonus.js';
import { DAILY_CALENDAR, dailyRewardFor } from '../src/shared/daily.js';
import { ADS_CONFIG } from '../src/shared/ads-config.js';
import { generateMissions } from '../src/shared/missions.js';
import { ACHIEVEMENTS } from '../src/shared/achievements.js';
import { BILLING, premiumOffer, purchasePremium } from '../src/shared/billing.js';
import christmas from '../src/shared/seasons/christmas.js';

const SEEDS = [7, 31, 62, 93];
const runs = (opts) => SEEDS.map((seed) => simulate({ days: 30, seed, ...opts }));
const avg = (list, f) => list.reduce((s, r) => s + f(r), 0) / list.length;

test('joueur actif (sans publicité) : progresse régulièrement, sans tout débloquer', () => {
  for (const r of runs({ profile: 'active' })) {
    assert.ok(r.firstPurchase !== null && r.firstPurchase <= 5, `premier achat au jour ${r.firstPurchase}`);
    assert.ok(r.premiumDay >= 8 && r.premiumDay <= 24, `Premium du Pass au jour ${r.premiumDay}`);
    assert.ok(r.final.passLevel >= 38, `Pass niveau ${r.final.passLevel} au bout de 30 jours`);
    assert.ok(r.passMaxDay === null || r.passMaxDay >= 25, 'le Pass ne se termine pas en quelques jours');
    // Toujours un objectif : la collection n'est pas finie, les légendaires restent très rares
    assert.ok(r.final.owned >= 15 && r.final.owned <= r.final.collection - 8, `${r.final.owned}/${r.final.collection} objets`);
    assert.ok((r.final.byRarity.legendary ?? 0) <= 2, `${r.final.byRarity.legendary} légendaire(s)`);
    // Gemmes rares
    assert.ok(r.totals.gemsEarned >= 300 && r.totals.gemsEarned <= 800, `${r.totals.gemsEarned} gemmes gagnées`);
    // Chaque semaine, des objets nouveaux (pas de longue période sans rien)
    for (let d = 7; d < 30; d += 7) assert.ok(r.days[d].owned > r.days[d - 7].owned, `jours ${d - 6}–${d + 1} : au moins un objet`);
  }
});

test('joueur occasionnel : récompenses sans frustration', () => {
  for (const r of runs({ profile: 'casual' })) {
    assert.ok(r.firstPurchase !== null && r.firstPurchase <= 10, `premier achat au jour ${r.firstPurchase}`);
    assert.ok(r.premiumDay !== null && r.premiumDay <= 30, `Premium au jour ${r.premiumDay}`);
    assert.ok(r.final.passLevel >= 20, `Pass niveau ${r.final.passLevel}`);
    assert.ok(r.final.owned >= 8, `${r.final.owned} objets`);
  }
});

test('publicités : elles accélèrent (sans être nécessaires) et restent peu nombreuses', () => {
  const placements = ADS_CONFIG.placements;
  assert.deepEqual(Object.keys(placements).sort(), ['checkpoint', 'doubleCoins', 'wheelSpin']);
  assert.equal(placements.wheelSpin.dailyCap, 3);
  assert.ok(Object.values(placements).reduce((s, p) => s + p.dailyCap, 0) <= 18, 'au plus 18 annonces par jour');
  for (const profile of ['active', 'casual']) {
    const ratio = avg(runs({ profile, ads: true }), (r) => r.totals.coinsEarned) / avg(runs({ profile }), (r) => r.totals.coinsEarned);
    assert.ok(ratio >= 1.1 && ratio <= 1.6, `${profile} : ×${ratio.toFixed(2)} pièces avec les publicités`);
    const gems = avg(runs({ profile, ads: true }), (r) => r.totals.gemsEarned) / avg(runs({ profile }), (r) => r.totals.gemsEarned);
    assert.ok(gems <= 1.15, `${profile} : les publicités ne donnent presque pas de gemmes (×${gems.toFixed(2)})`);
  }
});

test('coffres : commun très fréquent, rare fréquent, épique rare, légendaire très rare', () => {
  for (const kind of ['common', 'rare', 'epic']) {
    const o = chestOdds(kind);
    const at = (r) => o[r] ?? 0;
    assert.ok(at('legendary') <= 0.031, `${kind} : légendaire ${at('legendary')}`);
    assert.ok(at('epic') > at('legendary') || at('legendary') === 0, kind);
  }
  const common = chestOdds('common');
  assert.ok(common.common > common.rare && common.rare > (common.epic ?? 0) && !common.legendary);
  const rare = chestOdds('rare');
  assert.ok(rare.rare > rare.common && rare.common > rare.epic && rare.epic > rare.legendary);
  // Plus le coffre est précieux, plus il donne de pièces et d'objets
  const order = ['common', 'rare', 'epic', 'premium', 'legendary'];
  for (let i = 1; i < order.length; i++) {
    assert.ok(CHESTS[order[i]].coins[0] > CHESTS[order[i - 1]].coins[0], order[i]);
    assert.ok(CHESTS[order[i]].itemChance >= CHESTS[order[i - 1]].itemChance, order[i]);
  }
  // Tirage : fidèle aux poids (20 000 tirages)
  let seed = 3;
  const rng = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const n = { common: 0, rare: 0, epic: 0, legendary: 0 };
  for (let i = 0; i < 20000; i++) n[pickRarity(CHESTS.rare.odds, rng)]++;
  assert.ok(Math.abs(n.rare / 20000 - 0.59) < 0.02 && n.legendary / 20000 < 0.02, JSON.stringify(n));
  // Seuls les coffres premium et légendaires donnent des gemmes
  for (const k of ['common', 'rare', 'epic']) assert.equal(CHESTS[k].gems, undefined, k);
});

test('gemmes : seulement Pass, calendrier, grands succès et jackpot de la roulette — jamais après une partie', () => {
  // Calendrier : 45 gemmes par semaine
  for (const cycle of [0, 1, 5]) assert.equal(DAILY_CALENDAR.reduce((s, _, d) => s + (dailyRewardFor(d, cycle).gems ?? 0), 0), 45);
  // Roulette : une seule case de gemmes, rare
  const gemSegs = WHEEL.filter((w) => w.reward.gems);
  assert.equal(gemSegs.length, 1);
  assert.ok(wheelOdds()[gemSegs[0].id] <= 0.05);
  // Missions : jamais de gemmes
  for (const day of ['2026-11-25', '2026-12-01', '2026-12-24']) for (const m of generateMissions(day, ['city', 'snow'])) assert.equal(m.reward.gems, undefined);
  // Succès : seulement quelques grands succès (paliers Expert et Légende)
  const withGems = ACHIEVEMENTS.filter((a) => a.reward.gems);
  assert.ok(withGems.length >= 4 && withGems.length <= 10);
  assert.ok(withGems.every((a) => a.tier === 'expert' || a.tier === 'legend'));
  // Hoop Pass : la ligne Premium ne « rembourse » pas son prix en gemmes
  const premiumGems = christmas.levels.reduce((s, l) => s + (l.premium.gems ?? 0), 0);
  assert.ok(premiumGems < christmas.premium.gems, `${premiumGems} gemmes sur la ligne Premium`);
});

test('Hoop Pass : Premium en gemmes (test), architecture prête pour l’achat intégré', () => {
  assert.equal(BILLING.mode, 'gems');
  assert.deepEqual(premiumOffer(christmas), { kind: 'gems', gems: 250 });
  assert.deepEqual(premiumOffer(christmas, 'store'), { kind: 'store', productId: 'hoop_pass_christmas_1' });
  const calls = [];
  const pass = { unlockPremium: (w) => (calls.push(w), 'ok') };
  assert.equal(purchasePremium(pass, 'wallet'), 'ok');
  assert.deepEqual(calls, ['wallet']);
  assert.equal(purchasePremium(pass, 'wallet', 'store'), 'unavailable', 'aucun paiement réel branché');
});
