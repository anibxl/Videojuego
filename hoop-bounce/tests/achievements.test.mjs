// SUCCÈS (phase 5) : catégories, états, défis cachés, détection des exploits, récompenses (une seule fois),
// emblèmes, XP du Hoop Pass, sauvegarde (ancienne version, fusion entre pages, mises à jour), performances.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Achievements, ACHIEVEMENTS, CATEGORIES, CHALLENGES, EMBLEMS, TIERS, achievementXp } from '../src/shared/achievements.js';
import { ChallengeTracker, trickshotChallenges, CHAIN_TARGET } from '../src/game/challenge-tracker.js';
import { Stats } from '../src/shared/stats.js';
import { Wallet } from '../src/shared/wallet.js';
import { Progress } from '../src/game/progress.js';
import { WORLDS, LEVELS } from '../src/game/worlds.js';
import { CATALOG, itemById } from '../src/shared/catalog.js';
import { TrickshotProgress } from '../src/trickshot/progress.js';
import { TS_LEVELS } from '../src/trickshot/levels.js';
import { LIVE_STRINGS } from '../src/shared/live-i18n.js';
import { HoopPass } from '../src/shared/pass.js';

function memory(init = {}) {
  const m = new Map(Object.entries(init));
  return {
    get length() {
      return m.size;
    },
    key: (i) => [...m.keys()][i] ?? null,
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
    dump: () => Object.fromEntries(m),
  };
}

function setup(store = memory()) {
  const stats = new Stats(store);
  const wallet = new Wallet(store);
  const progress = new Progress(WORLDS, store);
  const ach = new Achievements(store);
  return { store, stats, wallet, progress, ach, ctx: { stats, wallet, progress } };
}

const find = (ach, ctx, id) => ach.view(ctx).find((a) => a.id === id);

test('catalogue : catégories demandées, identifiants uniques, textes et récompenses valides', () => {
  assert.deepEqual(Object.keys(CATEGORIES), ['progression', 'mastery', 'trickshot', 'ghost', 'collection', 'loyalty', 'challenges']);
  assert.equal(new Set(ACHIEVEMENTS.map((a) => a.id)).size, ACHIEVEMENTS.length);
  for (const a of ACHIEVEMENTS) {
    assert.ok(CATEGORIES[a.cat], `${a.id} : catégorie`);
    assert.ok(TIERS[a.tier], `${a.id} : palier`);
    assert.ok(a.target >= 1 && typeof a.value === 'function', a.id);
    for (const l of ['fr', 'en', 'es']) assert.ok(LIVE_STRINGS[l][`ach.${a.id}`] && LIVE_STRINGS[l][`ach.${a.id}.d`], `${a.id} (${l})`);
    const r = a.reward;
    assert.ok(r.coins || r.gems || r.chest || r.item || r.cosmetic || r.emblem, `${a.id} : une récompense`);
    if (r.item) assert.equal(itemById(r.item)?.exclusive, 'achievement', `${a.id} : objet exclusif aux succès`);
    if (r.emblem) assert.ok(EMBLEMS[r.emblem], `${a.id} : emblème connu`);
  }
  for (const k of Object.keys(CATEGORIES)) for (const l of ['fr', 'en', 'es']) assert.ok(LIVE_STRINGS[l][`cat.${k}`], k);
  for (const k of Object.keys(EMBLEMS)) for (const l of ['fr', 'en', 'es']) assert.ok(LIVE_STRINGS[l][`emblem.${k}`], k);
  // Les succès demandés existent, dans la bonne catégorie et avec le bon objectif
  const want = {
    progression: ['world-city:1', 'world-snow:1', 'world-volcano:1', 'world-forest:1', 'world-space:1'],
    trickshot: ['ts-10:10', 'ts-25:25', 'ts-50:50', 'ts-impossible:1'],
    ghost: ['ghost-5:5', 'ghost-20:20', 'ghost-50:50'],
    collection: ['chests-10:10', 'chests-50:50', 'buy-1:1', 'own-10:10', 'collection:' + CATALOG.filter((i) => i.price > 0 && !i.exclusive).length],
  };
  for (const [cat, list] of Object.entries(want)) {
    for (const s of list) {
      const [id, target] = s.split(':');
      const a = ACHIEVEMENTS.find((x) => x.id === id);
      assert.ok(a, id);
      assert.equal(a.cat, cat, id);
      assert.equal(a.target, Number(target), id);
    }
  }
  assert.ok(CHALLENGES.length >= 5, 'au moins 5 défis cachés');
  assert.ok(ACHIEVEMENTS.filter((a) => a.hidden).every((a) => a.cat === 'challenges'));
});

test('les anciens succès gardent leur identifiant (sauvegardes) et leurs récompenses déjà connues', () => {
  const old = ['first-level', 'bounces-100', 'stars-10', 'no-death-1', 'buy-1', 'games-10', 'world-city', 'coins-1000', 'daily-1', 'mission-1', 'levels-10', 'stars-50', 'bounces-1000', 'goals-100', 'swish-25', 'buy-5', 'world-snow', 'deaths-100', 'time-30', 'coins-5000', 'chests-5', 'levels-25', 'world-volcano', 'world-forest', 'perfect-world', 'goals-500', 'buy-10', 'bounces-5000', 'no-death-20', 'coins-20000', 'stars-100', 'missions-15', 'levels-50', 'stars-150', 'swish-100', 'world-space', 'daily-7', 'missions-30', 'time-180', 'collection'];
  for (const id of old) assert.ok(ACHIEVEMENTS.some((a) => a.id === id), id);
  assert.deepEqual(ACHIEVEMENTS.find((a) => a.id === 'levels-50').reward.item, 'ball-legend');
  assert.deepEqual(ACHIEVEMENTS.find((a) => a.id === 'swish-100').reward, { item: 'bounce-crown' });
});

test('états : verrouillé → en cours → débloqué → obtenu ; « Terminer le niveau 10 »', () => {
  const { ach, ctx, progress, stats } = setup();
  assert.equal(find(ach, ctx, 'bounces-100').state, 'locked');
  stats.add('bounces', 27);
  const b = find(ach, ctx, 'bounces-100');
  assert.equal(b.state, 'progress');
  assert.equal(b.value, 27);
  assert.equal(b.target, 100);
  stats.add('bounces', 200);
  assert.equal(find(ach, ctx, 'bounces-100').value, 100, 'la valeur ne dépasse pas l’objectif');
  assert.equal(find(ach, ctx, 'bounces-100').state, 'ready');
  // Niveau 10 = dernier niveau de la Ville
  assert.equal(find(ach, ctx, 'world-city').state, 'locked');
  for (const l of LEVELS.slice(0, 9)) progress.complete(l.id, 1, 30);
  assert.equal(find(ach, ctx, 'world-city').state, 'locked');
  progress.complete(LEVELS[9].id, 2, 30);
  assert.equal(find(ach, ctx, 'world-city').state, 'ready');
});

test('déblocage automatique : annoncé une seule fois, date enregistrée, récompense récupérée une seule fois', () => {
  const { ach, ctx, stats, wallet, store } = setup();
  stats.add('chests', 10);
  const fresh = ach.newlyUnlocked(ctx).map((a) => a.id);
  assert.ok(fresh.includes('chests-5') && fresh.includes('chests-10'));
  assert.deepEqual(ach.newlyUnlocked(ctx), [], 'pas d’annonce en double');
  assert.ok(find(ach, ctx, 'chests-10').unlockedAt > 0);
  const before = wallet.coins;
  const res = ach.claim('chests-10', ctx);
  assert.ok(res);
  assert.equal(wallet.coins, before + 400);
  assert.equal(ach.claim('chests-10', ctx), null, 'une seule fois');
  // Après une « fermeture du jeu » : toujours obtenu, toujours pas récupérable
  const again = new Achievements(store);
  assert.equal(find(again, ctx, 'chests-10').state, 'claimed');
  assert.equal(again.claim('chests-10', ctx), null);
});

test('récompenses : XP du Hoop Pass selon le palier, gemmes, coffres, objets exclusifs, emblèmes', () => {
  const { ach, ctx, stats, wallet, store } = setup();
  const pass = new HoopPass({ storage: store, now: () => new Date('2026-12-01T10:00:00') });
  const xp0 = pass.data.xp;
  stats.add('dailyClaims', 30);
  const r = ach.claim('daily-30', ctx); // Expert : coffre rare + emblème Fidèle
  assert.ok(r.chest === 'rare' && r.emblem === 'loyal');
  // XP du Pass : seulement pendant une saison (le Pass de Noël suit l'horloge de l'appareil)
  if (r.passXp) {
    assert.equal(r.passXp.gained, TIERS.expert.xp);
    assert.ok(new HoopPass({ storage: store, now: () => new Date('2026-12-01T10:00:00') }).data.xp >= xp0 + TIERS.expert.xp);
  }
  assert.ok(ach.emblems().includes('loyal'));
  assert.equal(achievementXp({ tier: 'legend' }), TIERS.legend.xp);
  assert.ok(TIERS.beginner.xp < TIERS.intermediate.xp && TIERS.intermediate.xp < TIERS.expert.xp && TIERS.expert.xp < TIERS.legend.xp);
  // Objet exclusif : Chasseur de fantômes → traînée Spectre + 15 gemmes
  stats.add('ghostBeaten', 50);
  const g0 = wallet.gems;
  const g = ach.claim('ghost-50', ctx);
  assert.equal(g.item?.id, 'trail-spectre');
  assert.ok(wallet.owns('trail-spectre'));
  assert.equal(wallet.gems, g0 + 15);
});

test('défis cachés : invisibles avant leur découverte, puis débloqués, et méta-succès « tous les défis »', () => {
  const { ach, ctx } = setup();
  for (const id of CHALLENGES) assert.equal(find(ach, ctx, id).state, 'secret', id);
  assert.equal(find(ach, ctx, 'ch-all').state, 'locked', 'le méta-succès est visible, sans dévoiler les défis');
  assert.equal(ach.recordChallenge('ch-nowall'), true);
  assert.equal(ach.recordChallenge('ch-nowall'), false, 'déjà découvert');
  assert.equal(ach.recordChallenge('not-a-challenge'), false);
  assert.equal(find(ach, ctx, 'ch-nowall').state, 'ready');
  assert.deepEqual(ach.newlyUnlocked(ctx).map((a) => a.id), ['ch-nowall']);
  assert.equal(find(ach, ctx, 'ch-all').value, 1);
  for (const id of CHALLENGES) ach.recordChallenge(id);
  assert.equal(find(ach, ctx, 'ch-all').state, 'ready');
});

test('détection en partie : série de rebonds, téléporteur, mur, perfection, photo finish', () => {
  const t = new ChallengeTracker();
  const win = (o = {}) => t.onWin({ time: 40, stars: 2, totalStars: 3, deaths: 0, swish: false, ...o });
  // Rien de spécial… sauf aucun mur touché
  assert.deepEqual(win(), ['ch-nowall']);
  // Mur : un contact latéral avec le décor fixe ; pas une caisse ni un sol
  t.scanContacts({ contactCount: 1, contacts: [{ nx: 0.05, ny: 1, collider: { tag: 'ground' } }] });
  t.scanContacts({ contactCount: 1, contacts: [{ nx: -1, ny: 0, collider: { tag: 'crate' } }] });
  assert.ok(win().includes('ch-nowall'));
  t.scanContacts({ contactCount: 1, contacts: [{ nx: -0.98, ny: 0.1, collider: { tag: 'rock' } }] });
  assert.ok(!win().includes('ch-nowall'));
  // Série de rebonds : remise à zéro quand le ballon se repose ou tombe
  for (let i = 0; i < CHAIN_TARGET - 1; i++) t.onBounce();
  t.onRest();
  t.onBounce();
  assert.ok(!win().includes('ch-chain'));
  for (let i = 0; i < CHAIN_TARGET; i++) t.onBounce();
  assert.ok(win().includes('ch-chain'));
  t.onDeath();
  assert.ok(!win().includes('ch-chain'));
  // Téléporteur : moins de 15 s avant le panier
  t.onTeleport(20);
  assert.ok(!win({ time: 36 }).includes('ch-teleport'));
  assert.ok(win({ time: 34 }).includes('ch-teleport'));
  // Perfection : 3 étoiles, swish, aucune chute
  assert.ok(win({ stars: 3, swish: true }).includes('ch-perfect'));
  assert.ok(!win({ stars: 3, swish: true, deaths: 1 }).includes('ch-perfect'));
  assert.ok(!win({ stars: 3, swish: false }).includes('ch-perfect'));
  // Photo finish : fantôme battu de moins de 0,1 s
  assert.ok(win({ ghostBefore: 30.05, ghostAfter: 30 }).includes('ch-photo'));
  assert.ok(!win({ ghostBefore: 30.5, ghostAfter: 30 }).includes('ch-photo'));
  assert.ok(!win({ ghostBefore: null, ghostAfter: 30 }).includes('ch-photo'));
  // Nouveau niveau : tout repart de zéro
  t.reset();
  assert.ok(win().includes('ch-nowall'));
  assert.ok(!win().includes('ch-teleport'));
});

test('détection Trickshot : dernier tir, premier coup, billard', () => {
  assert.deepEqual(trickshotChallenges({ shots: 3, bounces: 0 }, { maxShots: 3, playsBefore: 2, wasDone: true }), ['ch-lastshot']);
  assert.deepEqual(trickshotChallenges({ shots: 1, bounces: 1 }, { maxShots: 3, playsBefore: 0, wasDone: false }), ['ch-firsttry']);
  assert.deepEqual(trickshotChallenges({ shots: 1, bounces: 1 }, { maxShots: 3, playsBefore: 1, wasDone: false }), [], 'déjà tenté');
  assert.deepEqual(trickshotChallenges({ shots: 2, bounces: 6 }, { maxShots: 3, playsBefore: 0, wasDone: false }), ['ch-billiard']);
});

test('Trickshot et Fantôme : compteurs, anciennes sauvegardes Trickshot prises en compte, carte impossible', () => {
  const { ach, ctx, stats, store } = setup();
  assert.equal(find(ach, ctx, 'ts-1').state, 'locked');
  // Sauvegarde Trickshot d'avant la phase 5 : 3 cartes réussies → au moins 3 Trickshots
  const ts = new TrickshotProgress({ total: TS_LEVELS.length, storage: store });
  for (const n of [1, 2, 3]) ts.record(n, { stars: 2, score: 2000 });
  assert.equal(find(ach, ctx, 'ts-10').value, 3);
  stats.add('trickshots', 12);
  assert.equal(find(ach, ctx, 'ts-10').state, 'ready');
  // « Impossible » : une carte Très difficile réussie du premier tir (3 étoiles)
  const very = TS_LEVELS.find((l) => l.diff === 'very');
  ts.record(very.n, { stars: 2, score: 3000 });
  assert.equal(find(ach, ctx, 'ts-impossible').state, 'locked');
  ts.record(very.n, { stars: 3, score: 5000 });
  assert.equal(find(ach, ctx, 'ts-impossible').state, 'ready');
  stats.add('ghostBeaten', 6);
  assert.equal(find(ach, ctx, 'ghost-5').state, 'ready');
  assert.equal(find(ach, ctx, 'ghost-20').state, 'progress');
});

test('emblèmes : déduits des succès récupérés, choix enregistré', () => {
  const { ach, ctx, stats, store } = setup();
  assert.deepEqual(ach.emblems(), ['rookie']);
  assert.equal(ach.emblem(), 'rookie');
  assert.equal(ach.setEmblem('ghost'), false, 'pas encore gagné');
  stats.add('ghostBeaten', 5);
  ach.claim('ghost-5', ctx);
  assert.ok(ach.setEmblem('ghost'));
  assert.equal(new Achievements(store).emblem(), 'ghost');
});

test('sauvegarde : ancienne version relue, fusion entre pages, aucune perte, données abîmées ignorées', () => {
  // Sauvegarde v1 (avant la phase 5)
  const store = memory({ 'hoopbounce.achievements': JSON.stringify({ v: 1, claimed: ['first-level', 'world-city'], notified: ['first-level', 'world-city', 'bounces-100'] }) });
  const { ach, ctx, progress } = setup(store);
  for (const l of LEVELS.slice(0, 10)) progress.complete(l.id, 3, 20);
  assert.equal(find(ach, ctx, 'first-level').state, 'claimed');
  assert.equal(find(ach, ctx, 'world-city').state, 'claimed', 'déjà récupéré : pas une deuxième fois');
  assert.ok(!ach.newlyUnlocked(ctx).some((a) => a.id === 'world-city' || a.id === 'first-level'));
  // Deux pages ouvertes : chacune enregistre sans effacer l'autre
  const a1 = new Achievements(store);
  const a2 = new Achievements(store);
  a1.recordChallenge('ch-chain');
  a2.recordChallenge('ch-photo');
  const after = new Achievements(store);
  assert.ok(after.hasChallenge('ch-chain') && after.hasChallenge('ch-photo'));
  assert.ok(after.data.claimed.includes('world-city'));
  // Sauvegarde abîmée
  for (const bad of ['{oops', '[]', '"x"', JSON.stringify({ claimed: 'x', challenges: [1], unlocked: { a: 'b' } })]) {
    const s = memory({ 'hoopbounce.achievements': bad });
    const x = new Achievements(s);
    assert.deepEqual(x.data.claimed, []);
    assert.deepEqual(x.data.challenges, {});
  }
});

test('performances : la liste complète se calcule vite (page Succès, vérification après chaque niveau)', () => {
  const { ach, ctx, stats } = setup();
  stats.add('bounces', 3000);
  const t0 = performance.now();
  for (let i = 0; i < 50; i++) ach.view(ctx);
  const per = (performance.now() - t0) / 50;
  assert.ok(per < 15, `${per.toFixed(2)} ms par calcul`);
  // Le traqueur : un balayage de contacts ne crée aucun objet
  const t = new ChallengeTracker();
  const body = { contactCount: 3, contacts: [{ nx: 0, collider: { tag: 'ground' } }, { nx: 0.2, collider: { tag: 'rock' } }, { nx: 0, collider: { tag: 'crate' } }] };
  const t1 = performance.now();
  for (let i = 0; i < 100000; i++) t.scanContacts(body);
  assert.ok(performance.now() - t1 < 100);
});
