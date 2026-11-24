// Récompenses communes aux récompenses quotidiennes, aux missions et aux succès.
//
// Une récompense est décrite par un petit objet :
//   { coins: 200 }                 des pièces
//   { chest: 'common' }            un coffre (commun, rare, épique, premium, légendaire) : des pièces et
//                                  parfois un article (rareté tirée selon les poids du coffre)
//   { item: 'trail-hoop' }         un article précis (exclusif) ; s'il est déjà possédé → des pièces
//   { cosmetic: 'rare' }           un article au hasard, de cette rareté, pas encore possédé
//   { gems: 20 }                   des 💎 gemmes (rares : Hoop Pass, calendrier, grands succès, jackpot de la roue)
// Plusieurs clés peuvent se combiner : { coins: 300, gems: 10 }.
//
// `grant()` l'applique au porte-monnaie et renvoie ce qui a été réellement gagné (pour l'animation).

import { CATALOG, itemById } from './catalog.js';

// Coffres (phase 4 : économie rééquilibrée). Chaque coffre donne des pièces et, avec une certaine chance,
// un objet pas encore possédé, dont la RARETÉ est tirée selon des poids : commun très fréquent, rare
// fréquent, épique rare, légendaire très rare. Les gemmes ne sortent que des coffres premium et
// légendaires (Hoop Pass, onglet Gemmes de la boutique).
export const CHESTS = {
  common: { coins: [100, 200], itemChance: 0.3, odds: { common: 80, rare: 18, epic: 2 } },
  rare: { coins: [250, 450], itemChance: 0.55, odds: { common: 30, rare: 52, epic: 15, legendary: 3 } },
  epic: { coins: [600, 1000], itemChance: 0.9, odds: { rare: 40, epic: 48, legendary: 12 } },
  // Hoop Pass et boutique de gemmes
  premium: { coins: [900, 1500], itemChance: 1, odds: { rare: 15, epic: 60, legendary: 25 }, gems: [5, 15] },
  legendary: { coins: [1500, 2500], itemChance: 1, odds: { epic: 30, legendary: 70 }, gems: [15, 25] },
};
// Ancien « coffre bonus amélioré » (supprimé à la phase 4) : une sauvegarde ancienne qui le citerait
// reçoit un coffre rare.
CHESTS.super = CHESTS.rare;

/** Chances d'obtenir un objet de chaque rareté en ouvrant ce coffre (affichage, tests). */
export function chestOdds(kind) {
  const c = CHESTS[kind] ?? CHESTS.common;
  const total = Object.values(c.odds).reduce((a, b) => a + b, 0);
  return Object.fromEntries(Object.entries(c.odds).map(([r, w]) => [r, (c.itemChance * w) / total]));
}

/** Tirage d'une rareté selon des poids, parmi celles qui ont encore un objet à gagner. */
export function pickRarity(odds, wallet, rng = Math.random) {
  const open = Object.entries(odds).filter(([r]) => CATALOG.some((it) => purchasable(it) && it.rarity === r && !wallet.owns(it.id)));
  const list = open.length ? open : Object.entries(odds);
  const total = list.reduce((a, [, w]) => a + w, 0);
  let x = rng() * total;
  for (const [r, w] of list) {
    x -= w;
    if (x < 0) return r;
  }
  return list[list.length - 1][0];
}

/** Valeur en pièces d'un article déjà possédé (récompense remplacée). */
const DUPLICATE = { common: 150, rare: 300, epic: 600, legendary: 1000, mythic: 2000 };

const purchasable = (it) => typeof it.price === 'number' && it.price > 0 && !it.exclusive;

/** Un article achetable pas encore possédé, d'une des raretés demandées (au hasard), ou null. */
export function randomUnowned(wallet, rarities, rng = Math.random, category = null) {
  const inCat = (it) => !category || it.category === category;
  let pool = CATALOG.filter((it) => purchasable(it) && inCat(it) && rarities.includes(it.rarity) && !wallet.owns(it.id));
  if (!pool.length) pool = CATALOG.filter((it) => purchasable(it) && inCat(it) && !wallet.owns(it.id));
  if (!pool.length) pool = CATALOG.filter((it) => purchasable(it) && !wallet.owns(it.id));
  return pool.length ? pool[Math.floor(rng() * pool.length)] : null;
}

/**
 * Applique une récompense. `stats` (facultatif) compte les pièces gagnées et les coffres ouverts.
 * @returns {{ coins:number, item:object|null, chest:string|null, duplicate:boolean }}
 */
export function grant(reward, wallet, stats = null, rng = Math.random) {
  const out = { coins: 0, gems: 0, item: null, chest: null, duplicate: false };
  if (!reward) return out;
  if (reward.coins) out.coins += reward.coins;
  if (reward.gems) out.gems += reward.gems;
  if (reward.chest) {
    const c = CHESTS[reward.chest] ?? CHESTS.common;
    out.chest = reward.chest;
    out.coins += Math.round((c.coins[0] + rng() * (c.coins[1] - c.coins[0])) / 10) * 10;
    if (c.gems) out.gems += Math.round(c.gems[0] + rng() * (c.gems[1] - c.gems[0]));
    if (rng() < c.itemChance) {
      const it = randomUnowned(wallet, [pickRarity(c.odds, wallet, rng)], rng);
      if (it) out.item = it;
      else out.coins += 200;
    }
    stats?.add('chests', 1, false);
  }
  if (reward.item) {
    const it = itemById(reward.item);
    if (it && !wallet.owns(it.id)) out.item = it;
    else if (it) {
      out.duplicate = true;
      out.coins += DUPLICATE[it.rarity] ?? 300;
    }
  }
  if (reward.cosmetic) {
    // `cosmetic` : une rareté ou une liste ; `category` (facultatif) : ballon, rebond, traînée, panier
    const rarities = Array.isArray(reward.cosmetic) ? reward.cosmetic : [reward.cosmetic];
    const it = randomUnowned(wallet, rarities, rng, reward.category ?? null);
    if (it) out.item = it;
    else out.coins += DUPLICATE[rarities[rarities.length - 1]] ?? 200;
  }
  if (out.item) wallet.grant(out.item.id);
  if (out.gems) wallet.addGems(out.gems);
  if (out.coins) {
    wallet.addCoins(out.coins);
    stats?.add('coins', out.coins, false);
  }
  stats?.save();
  return out;
}
