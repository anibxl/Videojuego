// Étape 19 — « Modes à venir » : trois cartes de présentation, verrouillées, rien de jouable.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { modesPage } from '../src/menu/pages.js';
import { STRINGS } from '../src/menu/i18n.js';

const IDS = ['endless', 'race', 'creator'];

test('exactement 3 modes à venir, tous verrouillés, avec illustration, cadenas et « À venir »', () => {
  const html = modesPage('fr');
  const ids = [...html.matchAll(/data-mode="([a-z]+)"/g)].map((m) => m[1]);
  assert.deepEqual(ids, IDS);
  assert.equal((html.match(/data-locked="/g) ?? []).length, 3, 'aucun mode ne peut être lancé');
  assert.equal((html.match(/class="fmode-art"/g) ?? []).length, 3);
  assert.equal((html.match(/class="fmode-lock"/g) ?? []).length, 3);
  assert.equal((html.match(/🔒/g) ?? []).length, 3);
  assert.equal((html.match(/À venir/g) ?? []).length >= 3, true);
  for (const e of ['🌊', '🏁', '🛠️']) assert.ok(html.includes(e), e);
});

test('textes demandés, traduits dans les 3 langues', () => {
  const fr = STRINGS.fr;
  assert.equal(fr['mode.endless'], 'Endless');
  assert.equal(fr['mode.endless.desc'], 'Un défi sans fin. Va le plus loin possible et bats ton meilleur score.');
  assert.equal(fr['mode.race'], 'Course Multijoueur');
  assert.equal(fr['mode.race.desc'], "Affronte tes amis dans des courses folles jusqu'au panier.");
  assert.equal(fr['mode.creator'], 'Créateur de Maps');
  assert.equal(fr['mode.creator.desc'], 'Crée tes propres niveaux et joue avec tes amis.');
  for (const lang of ['en', 'es']) {
    for (const id of IDS) {
      assert.ok(STRINGS[lang][`mode.${id}`], `${lang} mode.${id}`);
      assert.ok(STRINGS[lang][`mode.${id}.desc`], `${lang} mode.${id}.desc`);
    }
    assert.ok(modesPage(lang).includes(STRINGS[lang].soon));
  }
});
