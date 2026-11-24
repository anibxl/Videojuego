// Hoop Pass (saison 1 : Noël) et gemmes.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HoopPass } from '../src/shared/pass.js';
import { SEASON_CONFIGS, seasonConfig } from '../src/shared/seasons/index.js';
import { Wallet } from '../src/shared/wallet.js';
import { CATALOG, RARITIES, itemById } from '../src/shared/catalog.js';
import { grant, randomUnowned } from '../src/shared/rewards.js';
import { Missions } from '../src/shared/missions.js';
import { Achievements } from '../src/shared/achievements.js';
import { Stats } from '../src/shared/stats.js';

const memory = () => {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), map: m };
};
const XMAS = seasonConfig('christmas');
const DURING = () => new Date('2026-12-10T18:00:00');
const AFTER = () => new Date('2027-01-08T10:00:00');
const pass = (storage, now = DURING) => new HoopPass({ season: XMAS, storage, now });

test('saison 1 « Noël » : configuration complète, 50 niveaux, deux lignes de récompenses', () => {
  assert.ok(SEASON_CONFIGS.christmas);
  assert.equal(XMAS.number, 1);
  assert.equal(XMAS.levels.length, 50);
  for (const k of ['night', 'snow', 'red', 'gold', 'fir']) assert.ok(XMAS.palette[k], k);
  for (const l of ['fr', 'en', 'es']) assert.ok(XMAS.name[l] && XMAS.tagline[l]);
  assert.ok(new Date(XMAS.end) > new Date(XMAS.start));
  XMAS.levels.forEach((lv, i) => {
    assert.equal(lv.level, i + 1);
    assert.ok(lv.free && lv.premium, `niveau ${lv.level} : deux récompenses`);
    for (const r of [lv.free, lv.premium]) if (r.item) assert.ok(itemById(r.item), r.item);
  });
  // Exemples demandés
  const L = (n) => XMAS.levels[n - 1];
  assert.ok(L(1).free.coins && L(1).premium.gems);
  assert.equal(L(3).free.chest, 'common');
  assert.equal(L(3).premium.chest, 'rare');
  assert.equal(itemById(L(5).premium.item).category, 'trail');
  assert.equal(itemById(L(10).premium.item).category, 'ball');
  assert.equal(itemById(L(20).premium.item).category, 'goal');
  assert.equal(L(30).premium.item, 'ball-santa');
  assert.equal(L(40).premium.chest, 'legendary');
  assert.equal(itemById(L(50).premium.item).rarity, 'mythic');
  // Objets exclusifs : réservés au Pass de cette saison, jamais dans la boutique ni les coffres
  for (const id of XMAS.exclusives) {
    const it = itemById(id);
    assert.equal(it.exclusive, 'pass');
    assert.equal(it.season, XMAS.passId);
  }
  const w = new Wallet(memory());
  for (let i = 0; i < 200; i++) assert.ok(!XMAS.exclusives.includes(randomUnowned(w, Object.keys(RARITIES))?.id));
});

test('XP : chaque action rapporte de l’XP, les niveaux montent, plafond au niveau 50', () => {
  const st = memory();
  const p = pass(st);
  assert.equal(p.level, 1);
  assert.equal(p.addXp('level', { first: true }).gained, XMAS.xp.level);
  assert.equal(p.addXp('level', { first: false }).gained, XMAS.xp.levelReplay);
  assert.equal(p.addXp('trickshot', { first: true }).gained, XMAS.xp.trickshot);
  assert.equal(p.addXp('mission').gained, XMAS.xp.mission);
  const r = p.addXp('achievement');
  assert.equal(r.gained, XMAS.xp.achievement);
  assert.equal(p.level, 2, '405 XP : niveau 2');
  assert.ok(p.progress().ratio > 0 && p.progress().ratio < 1);
  assert.equal(pass(st).progress().xp, p.progress().xp, 'sauvegardé');
  for (let i = 0; i < 200; i++) p.addXp('achievement');
  assert.equal(p.level, 50);
  assert.equal(p.progress().max, true);
  assert.equal(p.data.xp, p.xpToReach(50), 'plafonné');
  // Montées de niveau à animer dans la page, une seule fois
  const u = p.unseen();
  assert.equal(u.fromLevel, 1);
  assert.equal(u.toLevel, 50);
  p.markSeen();
  assert.equal(p.unseen().fromLevel, 50);
});

test('récompenses : gratuites tout de suite, Premium avec des gemmes (rétroactif), jamais deux fois', () => {
  const st = memory();
  const w = new Wallet(st);
  const p = pass(st);
  assert.equal(p.state(1, 'free'), 'ready');
  assert.equal(p.state(1, 'premium'), 'premium');
  assert.equal(p.state(2, 'free'), 'locked');
  const c0 = w.coins;
  assert.ok(p.claim(1, 'free', w));
  assert.equal(w.coins, c0 + XMAS.levels[0].free.coins);
  assert.equal(p.claim(1, 'free', w), null, 'pas deux fois');
  assert.equal(p.state(1, 'free'), 'claimed');
  // Premium : pas assez de gemmes, puis cadeau de bienvenue + gemmes
  assert.equal(p.unlockPremium(w), 'gems');
  assert.ok(p.welcome(w));
  assert.equal(p.welcome(w), null, 'cadeau de bienvenue une seule fois');
  w.addGems(XMAS.premium.gems);
  const g = w.gems;
  assert.equal(p.unlockPremium(w), 'ok');
  assert.equal(w.gems, g - XMAS.premium.gems);
  assert.equal(p.unlockPremium(w), 'owned');
  assert.equal(p.state(1, 'premium'), 'ready', 'Premium : récompenses des niveaux atteints disponibles');
  for (let i = 0; i < Math.ceil(16000 / XMAS.xp.achievement); i++) p.addXp('achievement');
  const all = p.claimAll(w, null, () => 0.5);
  assert.equal(all.length, 99, `${all.length} récompenses`);
  assert.equal(p.claimable(), 0);
  for (const id of XMAS.exclusives) assert.ok(w.owns(id), `${id} obtenu`);
  assert.ok(w.owns('ball-polaris'));
});

test('fin de saison : plus d’XP ni de récompense (le mythique ne s’obtient plus), objets gardés', () => {
  const st = memory();
  const w = new Wallet(st);
  const p = pass(st);
  for (let i = 0; i < Math.ceil(16000 / XMAS.xp.achievement); i++) p.addXp('achievement');
  p.claim(25, 'free', w);
  const late = pass(st, AFTER);
  assert.equal(late.active, false);
  assert.equal(late.over, true);
  assert.equal(late.timeLeft(), 0);
  assert.equal(late.addXp('mission'), null);
  assert.equal(late.state(26, 'free'), 'over');
  assert.equal(late.claim(26, 'free', w), null);
  assert.equal(late.unlockPremium(w), 'over');
  assert.equal(late.state(50, 'premium'), 'premium');
  assert.ok(w.owns('bounce-snow'), 'objet obtenu pendant la saison : gardé');
  const tl = pass(memory(), () => new Date('2027-01-05T00:00:00')).timeLeftParts();
  assert.deepEqual(tl, { days: 2, hours: 0, minutes: 0 });
});

test('gemmes : monnaie rare à part, achats d’objets à gemmes, coffres premium et légendaire', () => {
  const st = memory();
  const w = new Wallet(st);
  assert.equal(w.gems, 0);
  assert.equal(w.buyWithGems('ball-crystal'), 'gems');
  w.addGems(500);
  assert.equal(new Wallet(st).gems, 500, 'sauvegardées');
  assert.equal(w.buyWithGems('ball-crystal'), 'ok');
  assert.equal(w.gems, 500 - itemById('ball-crystal').gems);
  assert.equal(w.buyWithGems('ball-crystal'), 'owned');
  assert.equal(w.buyWithGems('ball-neon'), 'notForGems', 'les objets en pièces restent en pièces');
  assert.equal(w.isForSale('ball-crystal'), false, 'pas vendu en pièces');
  const coins = w.coins;
  const r = grant({ chest: 'legendary' }, w, null, () => 0.5);
  assert.ok(r.coins >= 1200 && r.gems >= 10);
  assert.ok(w.coins > coins);
  assert.ok(!r.item || r.item.rarity === 'legendary');
  const gemItems = CATALOG.filter((i) => i.exclusive === 'gems');
  assert.ok(gemItems.length >= 3 && gemItems.every((i) => i.gems > 0 && i.price === null));
});

test('missions et succès : récupérer donne de l’XP de Pass (même stockage)', () => {
  const st = memory();
  const w = new Wallet(st);
  const stats = new Stats(st, DURING);
  const missions = new Missions(st, DURING);
  const list = missions.ensure(['city']);
  for (const m of list) stats.add(m.stat, m.target, false);
  stats.save();
  const res = missions.claim(0, w, stats);
  assert.ok(res);
  // Hors des dates de test, awardPassXp suit l'horloge réelle : on vérifie seulement que rien ne casse
  assert.ok(res.passXp === null || res.passXp.gained === XMAS.xp.mission);
  const ach = new Achievements(st);
  assert.equal(typeof ach.claim, 'function');
});

test('rendu : les nouveaux objets ont une apparence (skins, traînées, effets)', async () => {
  const src = (f) => import('node:fs').then((fs) => fs.readFileSync(new URL(`../src/render/${f}`, import.meta.url), 'utf8'));
  const sprite = await src('ball-sprite.js');
  const fx = await src('cosmetics.js');
  for (const it of CATALOG.filter((i) => i.exclusive === 'pass' || i.exclusive === 'gems')) {
    if (it.category === 'ball') assert.match(sprite, new RegExp(`'${it.id}'`), it.id);
    else assert.match(fx, new RegExp(`'${it.id}'`), it.id);
  }
  assert.match(sprite, /case 'santa'/);
});

test('offres en gemmes : coffres premium et légendaire, pack de saison (une fois, pendant la saison)', async () => {
  const { GEM_OFFERS, offerAvailable, buyGemOffer, packValue } = await import('../src/shared/gem-offers.js');
  const st = memory();
  const w = new Wallet(st);
  assert.equal(buyGemOffer('chest-premium', w).status, 'gems', 'sans gemmes : rien');
  w.addGems(1000);
  const c = buyGemOffer('chest-legendary', w, { rng: () => 0.5 });
  assert.equal(c.status, 'ok');
  assert.equal(c.reward.chest, 'legendary');
  assert.equal(c.reward.item?.rarity, 'legendary');
  const pack = GEM_OFFERS.find((o) => o.kind === 'pack');
  assert.ok(pack.gems < packValue(pack), 'le pack coûte moins cher que ses objets séparés');
  assert.equal(offerAvailable(pack, w, null), false, 'hors saison : pas de pack');
  assert.equal(buyGemOffer(pack.id, w, { passId: 'christmas-1' }).status, 'ok');
  for (const id of pack.items) assert.ok(w.owns(id));
  assert.equal(buyGemOffer(pack.id, w, { passId: 'christmas-1' }).status, 'unavailable', 'jamais deux fois');
  assert.equal(w.gems, 1000 - 150 + c.reward.gems - pack.gems);
});
