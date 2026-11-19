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
  w.coins = 500;
  assert.equal(w.buy('ball-neon'), 'ok');
  assert.equal(w.coins, 50);
  assert.equal(w.buy('ball-neon'), 'owned');
  assert.equal(w.equipped('ball'), 'ball-classic');
  assert.ok(w.equip('ball-neon'));
  assert.equal(w.equip('ball-gold'), false, 'on n\'équipe pas un article non possédé');
  const again = new Wallet(store);
  assert.equal(again.coins, 50);
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
  w.coins = 5000;
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
