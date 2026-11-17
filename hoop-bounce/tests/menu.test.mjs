// Tests du menu : traductions complètes, réglages robustes, contenu des pages.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { STRINGS, t } from '../src/menu/i18n.js';
import { Settings, defaultSettings, sanitize } from '../src/shared/settings.js';

test('chaque texte existe dans les trois langues', () => {
  const ref = Object.keys(STRINGS.fr).sort();
  for (const lang of Object.keys(STRINGS)) {
    const keys = Object.keys(STRINGS[lang]).sort();
    assert.deepEqual(keys, ref, `clés différentes pour « ${lang} »`);
    for (const k of keys) assert.ok(STRINGS[lang][k].trim().length > 0, `texte vide : ${lang}.${k}`);
  }
});

test('toutes les clés utilisées dans index.html sont traduites', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const used = [...html.matchAll(/data-i18n(?:-html)?="([^"]+)"/g)].map((m) => m[1]);
  assert.ok(used.length > 5);
  for (const k of used) assert.ok(STRINGS.fr[k], `clé manquante : ${k}`);
});

test('pluriels et variables', () => {
  assert.equal(t('fr', 'collection.count', { n: 0 }), '0 ballon débloqué');
  assert.equal(t('fr', 'collection.count', { n: 3 }), '3 ballons débloqués');
  assert.equal(t('en', 'collection.count', { n: 1 }), '1 ball unlocked');
  assert.equal(t('en', 'collection.count', { n: 0 }), '0 balls unlocked');
  assert.equal(t('es', 'settings.version', { v: '1.2' }), 'Versión 1.2');
});

test('la langue par défaut suit celle de l\'appareil', () => {
  assert.equal(defaultSettings('es-ES').lang, 'es');
  assert.equal(defaultSettings('en-GB').lang, 'en');
  assert.equal(defaultSettings('de-DE').lang, 'fr');
});

test('des réglages abîmés sont corrigés', () => {
  const d = defaultSettings('fr');
  const s = sanitize({ music: 7, sfx: 'fort', vibration: 'oui', lang: 'xx', quality: 'ultra' }, d);
  assert.deepEqual(s, { music: 1, sfx: d.sfx, vibration: d.vibration, lang: 'fr', quality: 'high' });
  assert.deepEqual(sanitize(null, d), d);
});

test('les réglages sont enregistrés et relus', () => {
  const mem = new Map();
  const storage = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v) };
  const a = new Settings(storage, 'fr-FR');
  let changed = null;
  a.onChange((k, v) => (changed = [k, v]));
  a.set('music', 0.25);
  a.set('quality', 'low');
  assert.deepEqual(changed, ['quality', 'low']);
  const b = new Settings(storage, 'fr-FR');
  assert.equal(b.get('music'), 0.25);
  assert.equal(b.get('quality'), 'low');
});

test('sans stockage disponible, les réglages fonctionnent quand même', () => {
  const broken = { getItem() { throw new Error('bloqué'); }, setItem() { throw new Error('bloqué'); } };
  const s = new Settings(broken, 'fr');
  s.set('sfx', 0.3);
  assert.equal(s.get('sfx'), 0.3);
});
