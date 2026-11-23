// Boutique : catalogue, pièces gagnées en jouant, achats, équipement.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { CATALOG, CATEGORIES, DEFAULTS, RARITIES, REWARDS } from '../src/shared/catalog.js';
import { Wallet } from '../src/shared/wallet.js';
import { SHOP_STRINGS } from '../src/shop/i18n.js';

const memory = () => {
  const m = new Map();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)) };
};

test('catalogue : 4 catégories, 4 raretés, un article offert par catégorie, identifiants uniques', () => {
  assert.equal(new Set(CATALOG.map((i) => i.id)).size, CATALOG.length);
  for (const c of CATEGORIES) {
    const items = CATALOG.filter((i) => i.category === c);
    assert.ok(items.length >= 5, c);
    assert.equal(items.filter((i) => i.price === 0).length, 1, `${c} : un article offert`);
    assert.equal(DEFAULTS[c], items.find((i) => i.price === 0).id);
  }
  for (const r of Object.keys(RARITIES)) assert.ok(CATALOG.some((i) => i.rarity === r && i.price > 0), r);
  for (const i of CATALOG) for (const l of ['fr', 'en', 'es']) assert.ok(i.name[l] && i.desc[l], `${i.id} ${l}`);
  // Plus c'est rare, plus c'est cher
  const maxOf = (r) => Math.max(...CATALOG.filter((i) => i.rarity === r).map((i) => i.price));
  const minOf = (r) => Math.min(...CATALOG.filter((i) => i.rarity === r && i.price > 0).map((i) => i.price));
  assert.ok(maxOf('common') < minOf('rare') && maxOf('rare') < minOf('epic') && maxOf('epic') < minOf('legendary'));
});

test('pièces : première victoire, nouvelles étoiles, 3 étoiles, rejouer — une étoile ne rapporte qu\'une fois', () => {
  const w = new Wallet(memory());
  const r1 = w.reward('snow-3', 1, 2);
  assert.equal(r1.total, REWARDS.firstClear + REWARDS.perWorld + 2 * REWARDS.newStar);
  const r2 = w.reward('snow-3', 1, 3, true);
  assert.equal(r2.total, REWARDS.replay + REWARDS.newStar + REWARDS.perfect + REWARDS.swish);
  const r3 = w.reward('snow-3', 1, 3);
  assert.equal(r3.total, REWARDS.replay, 'plus rien pour les étoiles déjà obtenues');
  assert.equal(w.coins, r1.total + r2.total + r3.total);
});

test('achat et équipement : pièces suffisantes, article possédé, sauvegardé', () => {
  const store = memory();
  const w = new Wallet(store);
  assert.equal(w.buy('ball-neon'), 'coins');
  w.coins = 25500;
  assert.equal(w.buy('ball-neon'), 'ok');
  assert.equal(w.coins, 500);
  assert.equal(w.buy('ball-neon'), 'owned');
  assert.equal(w.equipped('ball'), 'ball-classic');
  assert.ok(w.equip('ball-neon'));
  assert.equal(w.equip('ball-gold'), false, 'on n\'équipe pas un article non possédé');
  const again = new Wallet(store);
  assert.equal(again.coins, 500);
  assert.equal(again.equipped('ball'), 'ball-neon');
  assert.ok(again.progress().owned >= 5);
});

test('inventaire abîmé : on repart proprement', () => {
  const store = memory();
  store.setItem('hoopbounce.inventory', '{"owned":"tout","equipped":{"ball":"ball-gold"}}');
  const w = new Wallet(store);
  assert.deepEqual(w.inv.owned, []);
  assert.equal(w.equipped('ball'), 'ball-classic', 'article non possédé : ballon par défaut');
});

test('textes de la boutique dans les trois langues', () => {
  const ref = Object.keys(SHOP_STRINGS.fr).sort();
  for (const l of Object.keys(SHOP_STRINGS)) assert.deepEqual(Object.keys(SHOP_STRINGS[l]).sort(), ref, l);
});

test('collection : équiper puis déséquiper un article, retour à l\'article de base, choix enregistré', () => {
  const store = memory();
  const w = new Wallet(store);
  w.coins = 30000;
  assert.equal(w.buy('ball-neon'), 'ok');
  assert.equal(w.equip('ball-neon'), true);
  assert.equal(new Wallet(store).equipped('ball'), 'ball-neon', 'gardé au prochain lancement');
  assert.equal(w.unequip('ball'), true);
  assert.equal(w.equipped('ball'), 'ball-classic');
  assert.equal(new Wallet(store).equipped('ball'), 'ball-classic', 'retrait enregistré');
  assert.ok(new Wallet(store).owns('ball-neon'), 'toujours possédé');
  assert.equal(w.unequip('nope'), false);
});

test('page Mondes du menu : plus d\'écran « bientôt », l\'ancienne carte renvoie vers le menu', () => {
  const html = readFileSync(new URL('../worlds.html', import.meta.url), 'utf8');
  assert.match(html, /src\/worlds\/redirect\.js/);
  const redirect = readFileSync(new URL('../src/worlds/redirect.js', import.meta.url), 'utf8');
  assert.match(redirect, /index\.html.*#mondes/);
});

test('économie (étape 17) : fourchettes de prix par rareté, prix progressifs, gains inchangés', () => {
  const RANGES = { common: [6000, 10000], rare: [15000, 50000], epic: [75000, 250000], legendary: [500000, 1000000] };
  for (const it of CATALOG) {
    if (!it.price) continue; // offerts et exclusifs
    const [lo, hi] = RANGES[it.rarity];
    assert.ok(it.price >= lo && it.price <= hi, `${it.id} : ${it.price} hors de ${lo}–${hi}`);
  }
  // Les gains du jeu ne bougent pas
  assert.deepEqual(REWARDS, { firstClear: 40, perWorld: 10, newStar: 25, perfect: 20, replay: 10, swish: 5 });
  // Aucun objet n'est achetable dès le départ ; le premier achat reste accessible (moins que les gains d'une première partie complète)
  const cheapest = Math.min(...CATALOG.filter((i) => i.price > 0).map((i) => i.price));
  assert.ok(cheapest >= 6000 && cheapest < 7750);
});

test('nouveaux objets : présents, traduits, visages équipés comme des ballons, sauvegardés après « fermeture »', () => {
  const NEW = ['ball-diamond', 'ball-plasma', 'ball-shadow', 'ball-rainbow', 'ball-smile', 'ball-robot', 'ball-alien', 'ball-ghost', 'ball-pirate', 'ball-ninja', 'ball-googly',
    'bounce-flames', 'bounce-smoke', 'bounce-cosmic', 'trail-galaxy', 'trail-energy', 'goal-burst', 'goal-electric', 'goal-space', 'goal-legend'];
  for (const id of NEW) assert.ok(CATALOG.some((i) => i.id === id), id);
  assert.equal(CATALOG.filter((i) => i.group === 'fun').length, 7);
  assert.ok(CATALOG.filter((i) => i.group === 'fun').every((i) => i.category === 'ball'));
  const store = memory();
  const w = new Wallet(store);
  w.coins = 3000000;
  for (const id of ['ball-alien', 'bounce-cosmic', 'trail-galaxy', 'goal-legend']) {
    assert.equal(w.buy(id), 'ok', id);
    assert.ok(w.equip(id));
  }
  // Relance du jeu : un nouveau porte-monnaie relit la sauvegarde
  const again = new Wallet(store);
  for (const id of ['ball-alien', 'bounce-cosmic', 'trail-galaxy', 'goal-legend']) assert.ok(again.owns(id), id);
  assert.equal(again.equipped('ball'), 'ball-alien');
  assert.equal(again.equipped('bounce'), 'bounce-cosmic');
  assert.equal(again.equipped('trail'), 'trail-galaxy');
  assert.equal(again.equipped('goal'), 'goal-legend');
  assert.equal(again.coins, 3000000 - 550000 - 800000 - 230000 - 1000000);
});

test('rendu : chaque ballon a son apparence (visage, aura des légendaires), chaque effet est dessiné', async () => {
  const { skinInfo } = await import('../src/render/ball-sprite.js');
  for (const id of ['ball-smile', 'ball-robot', 'ball-alien', 'ball-ghost', 'ball-pirate', 'ball-ninja', 'ball-googly']) assert.ok(skinInfo(id).face, id);
  for (const id of ['ball-gold', 'ball-diamond', 'ball-alien']) assert.ok(skinInfo(id).aura, id);
  const { Fx, bounceEffect, goalEffect } = await import('../src/render/cosmetics.js');
  const fx = new Fx(400);
  for (const id of ['bounce-smoke', 'bounce-flames', 'bounce-cosmic']) {
    fx.clear();
    bounceEffect(fx, id, 0, 0, 3);
    assert.ok(fx.items.some((p) => p.alive), id);
  }
  for (const id of ['goal-burst', 'goal-electric', 'goal-space', 'goal-legend']) {
    fx.clear();
    assert.equal(goalEffect(fx, id, 0, 0), true, id);
    assert.ok(fx.items.filter((p) => p.alive).length > 10, id);
  }
});

// ─── Étape 24 : la Boutique ne montre que ce qui s'achète, la Collection que ce qui est possédé ───

test('boutique : seuls les objets achetables sont en vente ; jamais deux fois le même', async () => {
  const store = memory();
  const w = new Wallet(store);
  w.coins = 100000;
  for (const it of CATALOG) {
    const expect = !it.exclusive && it.price > 0;
    assert.equal(w.isForSale(it.id), expect, `${it.id} : ${expect ? 'en vente' : 'pas en vente'}`);
  }
  assert.equal(w.isForSale('ball-classic'), false, 'objet de base : déjà possédé');
  assert.equal(w.isForSale('ball-hoop'), false, 'exclusif : se gagne en jouant');
  assert.equal(w.buy('ball-neon'), 'ok');
  assert.equal(w.isForSale('ball-neon'), false, 'acheté : quitte la boutique');
  const coins = w.coins;
  assert.equal(w.buy('ball-neon'), 'owned', 'second achat refusé');
  assert.equal(w.coins, coins, 'aucune pièce retirée');
  assert.equal(new Wallet(store).isForSale('ball-neon'), false, 'toujours possédé au prochain lancement');
  // La page n'affiche plus de cadenas ni d'articles verrouillés : elle filtre avec isForSale
  const src = readFileSync(new URL('../src/shop/main.js', import.meta.url), 'utf8');
  assert.match(src, /isForSale/);
  assert.doesNotMatch(src, /class="lock"/);
  for (const k of ['tab.all', 'forSale', 'soldOut', 'soldOut.sub', 'toCollection', 'boughtNote', 'exclusiveNote', 'affordable']) {
    for (const l of ['fr', 'en', 'es']) assert.ok(SHOP_STRINGS[l][k], `${k} (${l})`);
  }
});

test('collection : uniquement les objets possédés, résumé Skins / Traînées / Effets', async () => {
  const { ownedOn, SHELVES } = await import('../src/menu/collection-view.js');
  const store = memory();
  const w = new Wallet(store);
  // Nouveau joueur : les objets de base seulement
  let sum = Object.fromEntries(w.collectionSummary().map((g) => [g.id, g]));
  assert.deepEqual(Object.keys(sum), ['skins', 'trails', 'effects']);
  assert.equal(sum.skins.total, CATALOG.filter((i) => i.category === 'ball').length);
  assert.equal(sum.trails.total, CATALOG.filter((i) => i.category === 'trail').length);
  assert.equal(sum.effects.total, CATALOG.filter((i) => i.category === 'bounce' || i.category === 'goal').length);
  assert.equal(sum.skins.owned, 1);
  assert.equal(sum.effects.owned, 2, 'onde + confettis');
  w.coins = 100000;
  w.buy('ball-neon');
  assert.equal(w.buy('trail-streak'), 'ok');
  w.grant('ball-hoop');
  sum = Object.fromEntries(w.collectionSummary().map((g) => [g.id, g]));
  assert.equal(sum.skins.owned, 3);
  assert.equal(sum.trails.owned, 2);
  // Étagères : rien de verrouillé
  const shown = SHELVES.flatMap((s) => ownedOn(w, s.id));
  assert.ok(shown.length > 0);
  for (const it of shown) assert.ok(w.owns(it.id), `${it.id} affiché sans être possédé`);
  assert.equal(shown.length, CATALOG.filter((i) => w.owns(i.id)).length, 'tous les objets possédés sont rangés');
  assert.deepEqual(ownedOn(w, 'ball', 'trails'), [], 'filtre par famille');
  // Aucun prix, aucun bouton d'achat dans la page
  const src = readFileSync(new URL('../src/menu/collection-view.js', import.meta.url), 'utf8');
  assert.doesNotMatch(src, /data-buy|citem-price|collection\.unlock|ICONS\.coin|LOCK/);
});
