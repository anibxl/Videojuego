// Récompenses communes aux récompenses quotidiennes, aux missions et aux succès.
//
// Une récompense est décrite par un petit objet :
//   { coins: 200 }                 des pièces
//   { chest: 'common' }            un coffre (commun, rare, épique) : des pièces et parfois un article
//   { item: 'trail-hoop' }         un article précis (exclusif) ; s'il est déjà possédé → des pièces
//   { cosmetic: 'rare' }           un article au hasard, de cette rareté, pas encore possédé
//   { gems: 20 }                   des 💎 gemmes (Hoop Pass)
//
// `grant()` l'applique au porte-monnaie et renvoie ce qui a été réellement gagné (pour l'animation).

import { CATALOG, itemById } from './catalog.js';

export const CHESTS = {
  common: { coins: [120, 250], itemChance: 0.35, rarities: ['common', 'rare'] },
  rare: { coins: [300, 500], itemChance: 0.6, rarities: ['rare', 'epic'] },
  epic: { coins: [600, 900], itemChance: 1, rarities: ['epic', 'legendary'] },
  // Coffre bonus amélioré (publicité regardée) : plus de pièces, presque toujours un article, rares compris
  super: { coins: [450, 750], itemChance: 0.85, rarities: ['rare', 'epic', 'legendary'] },
  // Hoop Pass et boutique de gemmes
  legendary: { coins: [1200, 2000], itemChance: 1, rarities: ['legendary'], gems: [10, 20] },
  premium: { coins: [900, 1500], itemChance: 1, rarities: ['epic', 'legendary'], gems: [5, 15] },
};

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
      const it = randomUnowned(wallet, c.rarities, rng);
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
