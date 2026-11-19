// Page « À propos » : contenu facile à compléter, textes dans les trois langues, liens reliables à de vraies URL.

import test from 'node:test';
import assert from 'node:assert/strict';
import { ABOUT, CREDITS, LINKS, copyrightYears, pick } from '../src/shared/about.js';
import { APP_VERSION } from '../src/shared/version.js';
import { aboutPage } from '../src/menu/about-page.js';
import { ICONS } from '../src/menu/icons.js';

test('informations : nom, version actuelle, créateur, copyright', () => {
  assert.equal(ABOUT.game, 'Hoop Bounce');
  assert.equal(ABOUT.version, APP_VERSION);
  assert.equal(APP_VERSION, '1.0.0');
  assert.equal(ABOUT.creator, 'EchoSpeed');
  assert.equal(copyrightYears(new Date(2026, 5, 1)), '2026');
  assert.equal(copyrightYears(new Date(2028, 0, 1)), '2026–2028');
});

test('crédits : rôles demandés présents, traduits, icônes existantes, identifiants uniques', () => {
  const ids = CREDITS.map((c) => c.id);
  for (const id of ['development', 'design', 'music', 'sfx', 'graphics']) assert.ok(ids.includes(id), id);
  assert.equal(new Set(ids).size, ids.length);
  for (const c of CREDITS) {
    assert.ok(ICONS[c.icon], `icône ${c.icon}`);
    assert.ok(c.names.length > 0);
    for (const l of ['fr', 'en', 'es']) {
      assert.ok(pick(c.role, l), `${c.id} rôle ${l}`);
      if (c.note) assert.ok(pick(c.note, l), `${c.id} note ${l}`);
    }
  }
});

test('liens : sans adresse → page intégrée / « Bientôt » ; avec adresse → vrai lien externe', () => {
  const html = aboutPage('fr');
  assert.match(html, /id="about-privacy"[^>]*data-sheet="privacy"/);
  assert.match(html, /id="about-terms"[^>]*data-soon/);
  for (const c of CREDITS) assert.ok(html.includes(`data-credit="${c.id}"`));
  assert.ok(html.includes('1.0.0') && html.includes('EchoSpeed') && html.includes('©'));
  const saved = { ...LINKS };
  LINKS.privacy = 'https://example.org/confidentialite';
  LINKS.terms = 'https://example.org/conditions';
  try {
    const linked = aboutPage('en');
    assert.match(linked, /<a [^>]*id="about-privacy"[^>]*href="https:\/\/example\.org\/confidentialite"[^>]*target="_blank"/);
    assert.match(linked, /<a [^>]*id="about-terms"[^>]*href="https:\/\/example\.org\/conditions"/);
  } finally {
    Object.assign(LINKS, saved);
  }
});
