// Tests des systèmes quotidiens : statistiques, coffres, récompense quotidienne, missions, succès.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { Stats, dayKey } from '../src/shared/stats.js';
import { grant, CHESTS } from '../src/shared/rewards.js';
import { DailyReward, DAILY_CALENDAR } from '../src/shared/daily.js';
import { Missions, generateMissions, MISSION_TEMPLATES } from '../src/shared/missions.js';
import { Achievements, ACHIEVEMENTS, TIERS } from '../src/shared/achievements.js';
import { Wallet } from '../src/shared/wallet.js';
import { Progress } from '../src/game/progress.js';
import { WORLDS } from '../src/game/worlds.js';
import { itemById } from '../src/shared/catalog.js';

const memory = () => {
  const m = new Map();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)) };
};
const clock = (iso) => {
  const c = { t: new Date(iso) };
  c.now = () => c.t;
  c.next = (days = 1) => (c.t = new Date(c.t.getTime() + days * 86400000));
  return c;
};
const fixed = (v) => () => v;

test('statistiques : compteurs à vie et du jour, remis à zéro à minuit, enregistrés', () => {
  const store = memory();
  const c = clock('2026-11-19T10:00:00');
  const s = new Stats(store, c.now);
  s.add('bounces', 5);
  s.add('world.snow');
  s.markLevel('snow-1');
  s.markLevel('snow-1');
  assert.equal(s.today('bounces'), 5);
  assert.equal(s.today('world.snow'), 1);
  assert.equal(s.today('levels'), 1);
  s.save();
  c.next();
  const s2 = new Stats(store, c.now);
  assert.equal(s2.life('bounces'), 5, 'à vie : conservé');
  assert.equal(s2.today('bounces'), 0, 'nouveau jour : remis à zéro');
  assert.equal(s2.today('levels'), 0);
  assert.equal(dayKey(new Date('2026-01-05T23:59:00')), '2026-01-05');
});

test('coffres et récompenses : pièces, articles non possédés, doublons convertis en pièces', () => {
  const store = memory();
  const w = new Wallet(store);
  const s = new Stats(store);
  const r1 = grant({ coins: 120 }, w, s);
  assert.equal(r1.coins, 120);
  assert.equal(w.coins, 120);
  const r2 = grant({ chest: 'epic' }, w, s, fixed(0));
  assert.ok(r2.coins >= CHESTS.epic.coins[0]);
  assert.ok(r2.item && ['rare', 'epic', 'legendary'].includes(r2.item.rarity), 'coffre épique : un article rare, épique ou légendaire');
  assert.ok(w.owns(r2.item.id));
  const r3 = grant({ item: 'trail-hoop' }, w, s);
  assert.equal(r3.item.id, 'trail-hoop');
  const r4 = grant({ item: 'trail-hoop' }, w, s);
  assert.equal(r4.item, null);
  assert.ok(r4.duplicate && r4.coins > 0, 'déjà possédé : des pièces à la place');
  assert.equal(s.life('chests'), 1);
  assert.ok(s.life('coins') >= 120 + r2.coins);
  assert.equal(w.buy('ball-hoop'), 'exclusive', 'les exclusifs ne sont pas en vente');
});

test('récompense quotidienne : une seule par jour, 7 jours, mémorisée, puis nouveau cycle', () => {
  const store = memory();
  const c = clock('2026-11-19T08:00:00');
  const w = new Wallet(store);
  let d = new DailyReward(store, c.now);
  assert.equal(d.canClaim(), true);
  assert.deepEqual(d.states().slice(0, 2), ['today', 'locked']);
  const r = d.claim(w, null, fixed(0.5));
  assert.equal(r.day, 0);
  assert.equal(w.coins, 150);
  assert.equal(d.claim(w), null, 'pas deux fois le même jour');
  assert.deepEqual(d.states().slice(0, 2), ['claimed', 'next']);
  d = new DailyReward(store, c.now);
  assert.equal(d.canClaim(), false, 'mémorisé après relance');
  // Jours 2 à 7
  let gems = 0;
  for (let k = 1; k < 7; k++) {
    c.next();
    const res = new DailyReward(store, c.now).claim(w, null, fixed(0.5));
    assert.equal(res.day, k);
    gems += res.gems;
  }
  assert.equal(gems, 10 + 10 + 25, 'semaine 1 : 45 gemmes (jours 3, 5 et 7)');
  assert.equal(w.gems, 45);
  assert.ok(w.owns('ball-hoop'), 'jour 7 de la 1re semaine : skin exclusif Hoop Bounce');
  assert.equal(DAILY_CALENDAR.length, 7);
  // Un jour manqué ne fait rien perdre, et le cycle recommence au jour 1
  c.next(3);
  d = new DailyReward(store, c.now);
  assert.equal(d.nextIndex, 0);
  assert.equal(d.cycle, 1);
  assert.equal(d.week()[6].item, 'trail-hoop', '2e semaine : la traînée exclusive au 7e jour');
  for (let k = 0; k < 7; k++) {
    new DailyReward(store, c.now).claim(w, null, fixed(0.5));
    c.next();
  }
  assert.ok(w.owns('trail-hoop'));
  d = new DailyReward(store, c.now);
  assert.equal(d.cycle, 2);
  assert.deepEqual(d.week()[6], { chest: 'epic', gems: 25 }, 'ensuite : coffre épique et gemmes, chaque semaine');
});

test('missions : 3 par jour, même tirage pour une date, renouvelées le lendemain, récompense une fois', () => {
  const a = generateMissions('2026-11-19', ['city', 'snow']);
  const b = generateMissions('2026-11-19', ['city', 'snow']);
  assert.deepEqual(a, b);
  assert.equal(a.length, 3);
  assert.equal(new Set(a.map((m) => m.tpl)).size, 3, 'trois missions différentes');
  assert.ok(a[2].reward.coins > a[0].reward.coins, 'la difficile rapporte plus que la facile');
  // Sur un mois, la mission difficile donne un coffre environ un jour sur trois (jamais de gemmes)
  const month = Array.from({ length: 30 }, (_, d) => generateMissions(`2026-12-${String(d + 1).padStart(2, '0')}`, ['city'])[2]);
  const chests = month.filter((m) => m.reward.chest).length;
  assert.ok(chests >= 4 && chests <= 16, `${chests} coffres en 30 jours`);
  assert.ok(month.every((m) => !m.reward.gems));
  for (const m of a) assert.ok(MISSION_TEMPLATES.some((t) => t.id === m.tpl));
  const store = memory();
  const c = clock('2026-11-19T09:00:00');
  const stats = new Stats(store, c.now);
  const w = new Wallet(store);
  const ms = new Missions(store, c.now);
  const first = ms.ensure(['city']);
  const m0 = first[0];
  assert.equal(ms.claim(0, w, stats), null, 'pas encore terminée');
  stats.add(m0.stat, m0.target);
  if (m0.stat === 'levels') for (let i = 0; i < m0.target; i++) stats.markLevel(`x${i}`);
  assert.equal(ms.newlyCompleted(stats).length >= 1, true);
  assert.equal(ms.newlyCompleted(stats).length, 0, 'annoncée une seule fois');
  const before = w.coins;
  assert.ok(ms.claim(0, w, stats));
  assert.ok(w.coins > before);
  assert.equal(ms.claim(0, w, stats), null, 'une seule fois');
  assert.equal(stats.life('missions'), 1);
  c.next();
  const ms2 = new Missions(store, c.now);
  ms2.ensure(['city']);
  assert.notEqual(ms2.data.date, '2026-11-19');
  assert.ok(ms2.data.list.every((m) => !m.claimed), 'nouvelles missions');
});

test('succès : nombreux, 4 paliers, progression, récompense récupérable une fois', () => {
  assert.ok(ACHIEVEMENTS.length >= 35);
  assert.equal(new Set(ACHIEVEMENTS.map((a) => a.id)).size, ACHIEVEMENTS.length);
  for (const t of Object.keys(TIERS)) assert.ok(ACHIEVEMENTS.filter((a) => a.tier === t).length >= 8, t);
  for (const a of ACHIEVEMENTS) if (a.reward.item) assert.ok(itemById(a.reward.item)?.exclusive, `${a.id} : article exclusif`);
  const store = memory();
  const stats = new Stats(store);
  const wallet = new Wallet(store);
  const progress = new Progress(WORLDS, store);
  const ach = new Achievements(store);
  const ctx = { stats, progress, wallet };
  let first = ach.view(ctx).find((a) => a.id === 'first-level');
  assert.equal(first.state, 'locked', 'rien de fait : verrouillé');
  progress.complete('first-shot', 2, 12);
  stats.add('bounces', 150);
  first = ach.view(ctx).find((a) => a.id === 'first-level');
  assert.equal(first.state, 'ready');
  assert.deepEqual(ach.newlyUnlocked(ctx).map((a) => a.id).sort(), ['bounces-100', 'first-level']);
  assert.ok(ach.claim('first-level', ctx));
  assert.equal(wallet.coins, 100);
  assert.equal(ach.claim('first-level', ctx), null);
  assert.equal(new Achievements(store).view(ctx).find((a) => a.id === 'first-level').state, 'claimed', 'enregistré');
});

test('textes des missions et des succès dans les trois langues', async () => {
  const { LIVE_STRINGS, lt } = await import('../src/shared/live-i18n.js');
  const ref = Object.keys(LIVE_STRINGS.fr).sort();
  for (const l of ['en', 'es']) assert.deepEqual(Object.keys(LIVE_STRINGS[l]).sort(), ref, l);
  for (const a of ACHIEVEMENTS) {
    assert.ok(LIVE_STRINGS.fr[`ach.${a.id}`] && LIVE_STRINGS.fr[`ach.${a.id}.d`], a.id);
  }
  for (const t of MISSION_TEMPLATES) assert.ok(LIVE_STRINGS.fr[`mission.${t.id}`], t.id);
  for (const k of Object.keys(TIERS)) assert.ok(LIVE_STRINGS.fr[`tier.${k}`], k);
  assert.equal(lt('fr', 'mission.noDeath', { n: 2 }), 'Finir 2 niveaux sans mourir');
});
