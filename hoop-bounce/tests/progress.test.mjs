// Progression (niveaux débloqués, étoiles, records) et textes de l'écran de jeu.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { Progress } from '../src/game/progress.js';
import { GAME_STRINGS } from '../src/game/i18n.js';
import { LEVELS } from '../src/game/levels/index.js';

const memory = () => {
  const m = new Map();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) };
};

test('terminer un niveau débloque le suivant et garde le meilleur résultat', () => {
  const store = memory();
  const p = new Progress(6, store);
  assert.equal(p.resumeIndex, 0);
  p.complete(0, 'a', 2, 14.2);
  assert.equal(p.resumeIndex, 1);
  const r = p.complete(0, 'a', 1, 11.0); // moins d'étoiles mais plus rapide
  assert.equal(r.newRecord, true);
  assert.equal(p.starsFor('a'), 2, 'on garde le meilleur nombre d\'étoiles');
  assert.equal(p.bestTimeFor('a'), 11.0);
  const again = new Progress(6, store);
  assert.equal(again.resumeIndex, 1, 'relu depuis le stockage');
});

test('après le dernier niveau, on reprend au dernier niveau', () => {
  const p = new Progress(2, memory());
  p.complete(0, 'a', 3, 5);
  p.complete(1, 'b', 3, 5);
  assert.equal(p.resumeIndex, 1);
});

test('progression abîmée ou stockage bloqué : on repart proprement', () => {
  const bad = { getItem: () => '{"unlocked":"beaucoup"}', setItem() { throw new Error('bloqué'); } };
  const p = new Progress(6, bad);
  assert.equal(p.resumeIndex, 0);
  p.complete(0, 'a', 1, 3); // ne plante pas
  assert.equal(p.resumeIndex, 1);
});

test('chaque texte de jeu existe dans les trois langues, y compris noms et aides des niveaux', () => {
  const ref = Object.keys(GAME_STRINGS.fr).sort();
  for (const lang of Object.keys(GAME_STRINGS)) assert.deepEqual(Object.keys(GAME_STRINGS[lang]).sort(), ref, lang);
  for (const l of LEVELS) {
    assert.ok(GAME_STRINGS.fr[l.nameKey], `nom manquant : ${l.nameKey}`);
    for (const h of l.hints ?? []) assert.ok(GAME_STRINGS.fr[h.key], `aide manquante : ${h.key}`);
    assert.equal(l.stars.length, 3, `${l.id} : 3 étoiles par niveau`);
  }
});
