// Tests du système publicitaire (publicités récompensées uniquement) : configuration, gestionnaire,
// coffre bonus quotidien, roue de la chance.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { ADS_CONFIG, resolveAdIds } from '../src/shared/ads-config.js';
import { AdManager } from '../src/shared/ads.js';
import { Bonus, WHEEL, pickWheel } from '../src/shared/bonus.js';
import { Wallet } from '../src/shared/wallet.js';
import { Stats } from '../src/shared/stats.js';

const memory = () => {
  const m = new Map();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)) };
};
const fixed = (v) => () => v;

/** Faux fournisseur : charge (ou échoue), puis « regarde » l'annonce jusqu'au bout ou la ferme. */
function fakeProvider({ loadOk = true, watch = true } = {}) {
  return {
    loads: 0,
    shows: 0,
    async init() {},
    async load() {
      this.loads++;
      if (!loadOk) throw { noFill: true };
    },
    async show() {
      this.shows++;
      return { rewarded: watch };
    },
  };
}

test('configuration : identifiants de TEST officiels pendant le développement, production seulement si complète', () => {
  assert.equal(ADS_CONFIG.useTestAds, true, 'le dépôt reste en mode test');
  const t = resolveAdIds();
  assert.equal(t.testing, true);
  assert.equal(t.appId, 'ca-app-pub-3940256099942544~3347511713');
  assert.equal(t.unit('doubleCoins'), 'ca-app-pub-3940256099942544/5224354917');
  // Production demandée mais identifiants encore factices : on reste en test (sécurité)
  const incomplete = resolveAdIds({ ...ADS_CONFIG, useTestAds: false });
  assert.equal(incomplete.testing, true);
  assert.equal(incomplete.incomplete, true);
  // Production complète : les vrais identifiants, un par emplacement
  const real = {
    ...ADS_CONFIG,
    useTestAds: false,
    appId: { android: { ...ADS_CONFIG.appId.android, prod: 'ca-app-pub-1234567890123456~1111111111' } },
    rewarded: { android: { test: ADS_CONFIG.rewarded.android.test, prod: { doubleCoins: 'ca-app-pub-1234567890123456/1', checkpoint: 'ca-app-pub-1234567890123456/2', wheelSpin: 'ca-app-pub-1234567890123456/4' } } },
  };
  const p = resolveAdIds(real);
  assert.equal(p.testing, false);
  assert.equal(p.unit('wheelSpin'), 'ca-app-pub-1234567890123456/4');
});

test('gestionnaire : récompense seulement après l\'annonce regardée jusqu\'au bout', async () => {
  const ok = new AdManager({ provider: fakeProvider(), storage: memory() });
  await ok.prepare('doubleCoins');
  assert.equal(ok.status('doubleCoins'), 'ready');
  assert.equal((await ok.showRewarded('doubleCoins')).status, 'rewarded');
  ok.dispose();
  const quit = new AdManager({ provider: fakeProvider({ watch: false }), storage: memory() });
  assert.equal((await quit.showRewarded('doubleCoins')).status, 'dismissed', 'fermée avant la fin : rien');
  quit.dispose();
});

test('gestionnaire : moments interdits, absence d\'annonce, limite du jour (enregistrée)', async () => {
  const store = memory();
  const ads = new AdManager({ provider: fakeProvider(), storage: store });
  ads.block('playing');
  assert.equal((await ads.showRewarded('checkpoint')).status, 'blocked', 'jamais pendant un niveau');
  assert.equal(ads.status('checkpoint'), 'blocked');
  ads.unblock('playing');
  for (let i = 0; i < 3; i++) assert.equal((await ads.showRewarded('wheelSpin')).status, 'rewarded');
  assert.equal(ads.remaining('wheelSpin'), 0);
  assert.equal((await ads.showRewarded('wheelSpin')).status, 'capped');
  assert.equal(new AdManager({ provider: fakeProvider(), storage: store }).remaining('wheelSpin'), 0, 'limite mémorisée');
  ads.dispose();
  const none = new AdManager({ provider: fakeProvider({ loadOk: false }), storage: memory() });
  await none.prepare('wheelSpin');
  assert.equal(none.status('wheelSpin'), 'unavailable');
  assert.equal((await none.showRewarded('wheelSpin')).status, 'unavailable');
  none.dispose();
});

test('coffre bonus quotidien supprimé (phase 4) : plus d’emplacement publicitaire, ancienne sauvegarde ignorée', () => {
  assert.equal(ADS_CONFIG.placements.bonusChest, undefined);
  assert.equal(ADS_CONFIG.rewarded.android.prod.bonusChest, undefined);
  const store = memory();
  store.setItem('hoopbounce.bonus', JSON.stringify({ v: 1, date: '2026-11-20', chest: 'super', freeSpin: true, adSpins: 1, spins: 4, chests: 7, last: 'coins250' }));
  const b = new Bonus(store, () => new Date('2026-11-20T10:00:00'));
  assert.equal(typeof b.openChest, 'undefined', 'plus de coffre bonus');
  assert.equal(b.freeSpinAvailable(), false, 'le lancer gratuit déjà utilisé est conservé');
  assert.equal(b.adSpinsToday(), 1);
  assert.equal(b.data.chests, 7, 'historique conservé');
});

test('roulette quotidienne : 1 lancer gratuit, puis 3 avec publicité au maximum, remise à zéro chaque jour', () => {
  const store = memory();
  const w = new Wallet(store);
  const stats = new Stats(store);
  const c = { t: new Date('2026-11-20T10:00:00') };
  const b = new Bonus(store, () => c.t);
  assert.equal(WHEEL.length, 8);
  assert.equal(WHEEL.reduce((s, x) => s + x.weight, 0), 100);
  assert.equal(pickWheel(fixed(0)), 0);
  assert.equal(pickWheel(fixed(0.9999)), WHEEL.length - 1);
  assert.equal(b.status(), 'free');
  assert.equal(b.spin(w, stats, true), null, 'pas de lancer « publicité » avant le lancer gratuit');
  const s1 = b.spin(w, stats, false, fixed(0));
  assert.equal(s1.segment.id, 'coins120');
  assert.equal(w.coins, 120);
  assert.equal(b.spin(w, stats), null, 'plus de lancer gratuit');
  assert.equal(b.status(), 'ads');
  for (let i = 0; i < 3; i++) assert.ok(b.spin(w, stats, true, fixed(0.5)), `lancer avec publicité n°${i + 1}`);
  assert.equal(b.adSpinsLeft(), 0);
  assert.equal(b.spin(w, stats, true, fixed(0.5)), null, 'pas de 4e lancer avec publicité');
  assert.equal(b.status(), 'done');
  // Mémorisé après relance, puis remis à zéro le lendemain
  assert.equal(new Bonus(store, () => c.t).status(), 'done');
  c.t = new Date('2026-11-21T00:01:00');
  const next = new Bonus(store, () => c.t);
  assert.equal(next.status(), 'free');
  assert.equal(next.adSpinsLeft(), 3);
  // Les gros lots sont rares
  const counts = new Array(WHEEL.length).fill(0);
  let seed = 1;
  const rng = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 20000; i++) counts[pickWheel(rng)]++;
  const at = (id) => counts[WHEEL.findIndex((x) => x.id === id)];
  assert.ok(at('skin') < at('coins120') / 8, 'le skin est très rare');
  assert.ok(at('gems') < at('coins120') / 4, 'les gemmes sont rares');
  assert.ok(at('coins1200') < at('coins250') / 4, 'le jackpot est rare');
});

