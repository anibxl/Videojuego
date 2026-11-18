// Progression (niveaux débloqués, étoiles, records) et textes de l'écran de jeu.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { Progress } from '../src/game/progress.js';
import { GAME_STRINGS } from '../src/game/i18n.js';
import { LEVELS, WORLDS } from '../src/game/worlds.js';

const memory = () => {
  const m = new Map();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) };
};

const W = [
  { id: 'w1', planned: 10, levels: [{ id: 'a' }, { id: 'b' }] },
  { id: 'w2', planned: 10, levels: [{ id: 'c' }, { id: 'd' }] },
  { id: 'w3', planned: 10, levels: [{ id: 'e' }] },
];

test('terminer un niveau ouvre le suivant et garde le meilleur résultat', () => {
  const store = memory();
  const p = new Progress(W, store);
  assert.deepEqual(p.resume(), { worldIndex: 0, levelIndex: 0 });
  assert.equal(p.isLevelUnlocked(0, 1), false);
  p.complete('a', 2, 14.2);
  assert.equal(p.isLevelUnlocked(0, 1), true);
  assert.deepEqual(p.resume(), { worldIndex: 0, levelIndex: 1 });
  const r = p.complete('a', 1, 11.0); // moins d'étoiles mais plus rapide
  assert.equal(r.newRecord, true);
  assert.equal(r.firstClear, false);
  assert.equal(p.starsFor('a'), 2, 'on garde le meilleur nombre d\'étoiles');
  assert.equal(p.bestTimeFor('a'), 11.0);
  const again = new Progress(W, store);
  assert.deepEqual(again.resume(), { worldIndex: 0, levelIndex: 1 }, 'relu depuis le stockage');
});

test('un monde s\'ouvre automatiquement quand tous les niveaux du précédent sont terminés', () => {
  const p = new Progress(W, memory());
  assert.equal(p.isWorldUnlocked(0), true);
  assert.equal(p.isWorldUnlocked(1), false);
  assert.equal(p.isLevelUnlocked(1, 0), false, 'monde fermé : niveaux fermés');
  assert.equal(p.complete('a', 3, 5).unlockedWorld, null);
  const r = p.complete('b', 1, 5);
  assert.equal(r.worldCompleted, true);
  assert.equal(r.unlockedWorld, 1);
  assert.equal(p.isWorldUnlocked(1), true);
  assert.equal(p.isLevelUnlocked(1, 0), true);
  assert.deepEqual(p.resume(), { worldIndex: 1, levelIndex: 0 });
  assert.equal(p.complete('b', 3, 4).unlockedWorld, null, 'rejouer ne redébloque pas');
  assert.equal(p.isWorldUnlocked(2), false);
});

test('statistiques des mondes : étoiles, pourcentage, niveaux prévus', () => {
  const p = new Progress(W, memory());
  p.complete('a', 3, 5);
  p.complete('b', 1, 5);
  assert.deepEqual(p.worldStats(0), { done: 2, total: 2, planned: 10, stars: 4, maxStars: 6, percent: 100 });
  assert.deepEqual(p.worldStats(1), { done: 0, total: 2, planned: 10, stars: 0, maxStars: 6, percent: 0 });
  const t = p.totals();
  assert.equal(t.stars, 4);
  assert.equal(t.maxStars, 15);
  assert.equal(t.percent, 40);
});

test('animation de déblocage : chaque monde ouvert n\'est annoncé qu\'une fois', () => {
  const store = memory();
  const p = new Progress(W, store);
  assert.deepEqual(p.pendingUnlocks(), []);
  p.complete('a', 3, 5);
  p.complete('b', 3, 5);
  assert.deepEqual(p.pendingUnlocks(), [1]);
  p.markSeen(1);
  assert.deepEqual(new Progress(W, store).pendingUnlocks(), []);
});

test('ancienne progression (étape 5) convertie : niveaux terminés et étoiles conservés', () => {
  const store = memory();
  store.setItem('hoopbounce.progress', JSON.stringify({ unlocked: 2, stars: { a: 3, b: 2 }, best: { a: 9.5, b: 12 } }));
  const p = new Progress(W, store);
  assert.equal(p.isDone('a'), true);
  assert.equal(p.isDone('b'), true);
  assert.equal(p.starsFor('a'), 3);
  assert.equal(p.isWorldUnlocked(1), true);
});

test('tout terminé : on reprend au dernier niveau du dernier monde', () => {
  const p = new Progress(W, memory());
  for (const id of ['a', 'b', 'c', 'd', 'e']) p.complete(id, 3, 5);
  assert.deepEqual(p.resume(), { worldIndex: 2, levelIndex: 0 });
});

test('progression abîmée ou stockage bloqué : on repart proprement', () => {
  const bad = { getItem: () => '{"done":"beaucoup","stars":[1,2]}', setItem() { throw new Error('bloqué'); } };
  const p = new Progress(W, bad);
  assert.deepEqual(p.resume(), { worldIndex: 0, levelIndex: 0 });
  p.complete('a', 1, 3); // ne plante pas
  assert.deepEqual(p.resume(), { worldIndex: 0, levelIndex: 1 });
});

test('mode test ?unlock=all : tout est ouvert', () => {
  const p = new Progress(W, memory());
  p.unlockAll = true;
  assert.equal(p.isWorldUnlocked(2), true);
  assert.equal(p.isLevelUnlocked(1, 1), true);
});

test('chaque texte de jeu existe dans les trois langues, y compris noms et aides des niveaux', () => {
  const ref = Object.keys(GAME_STRINGS.fr).sort();
  for (const lang of Object.keys(GAME_STRINGS)) assert.deepEqual(Object.keys(GAME_STRINGS[lang]).sort(), ref, lang);
  for (const l of LEVELS) {
    assert.ok(GAME_STRINGS.fr[l.nameKey], `nom manquant : ${l.nameKey}`);
    for (const h of l.hints ?? []) assert.ok(GAME_STRINGS.fr[h.key], `aide manquante : ${h.key}`);
    assert.equal(l.stars.length, 3, `${l.id} : 3 étoiles par niveau`);
    assert.ok(['easy', 'medium', 'hard', 'expert', 'extreme'].includes(l.difficulty), `${l.id} : difficulté`);
  }
  for (const w of WORLDS) {
    for (const k of [w.nameKey, w.taglineKey, ...w.mechanics.map((m) => `mech.${m}`)]) assert.ok(GAME_STRINGS.fr[k], `texte manquant : ${k}`);
  }
});

test('les mondes : 5 mondes, 10 niveaux prévus chacun, identifiants de niveaux uniques', () => {
  assert.deepEqual(WORLDS.map((w) => w.id), ['city', 'snow', 'volcano', 'forest', 'space']);
  for (const w of WORLDS) {
    assert.equal(w.planned, 10);
    assert.ok(w.levels.length >= 1 && w.levels.length <= w.planned, w.id);
  }
  const ids = LEVELS.map((l) => l.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(LEVELS.filter((l) => l.world === 'space').every((l) => l.gravityScale < 1), 'gravité réduite dans l\'espace');
});
