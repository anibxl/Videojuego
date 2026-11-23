// Saison de Noël (saison 1, étape 1) : décoration et ambiance du menu, rien d'autre.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SEASON, SEASONS, activeSeason } from '../src/shared/season.js';
import { STRINGS } from '../src/menu/i18n.js';

test('saison active : Noël, désactivable (?season=off) sans toucher au code', () => {
  assert.equal(SEASON, 'christmas');
  assert.equal(activeSeason('').id, 'christmas');
  assert.equal(activeSeason('?season=off'), null);
  assert.equal(activeSeason('?season=none'), null);
  assert.equal(activeSeason('?season=christmas').id, 'christmas');
  assert.equal(activeSeason('?season=inconnue').id, 'christmas', 'valeur inconnue : saison par défaut');
  assert.equal(SEASONS.christmas.number, 1);
});

test('menu de Noël : feuille de style, décor, ambiance, texte du ruban en 3 langues', async () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /css\/season-christmas\.css/);
  for (const l of ['fr', 'en', 'es']) assert.ok(STRINGS[l]['season.christmas'], l);
  const { ChristmasScene } = await import('../src/menu/scene-christmas.js');
  const { MenuScene } = await import('../src/menu/scene.js');
  assert.ok(Object.getPrototypeOf(ChristmasScene) === MenuScene, 'même interface que le décor habituel');
  const main = readFileSync(new URL('../src/menu/main.js', import.meta.url), 'utf8');
  assert.match(main, /activeSeason\(\)/);
  const sound = readFileSync(new URL('../src/menu/sound.js', import.meta.url), 'utf8');
  assert.match(sound, /setSeason/);
  // Le jeu lui-même n'est pas touché : aucune page de jeu ne charge la saison
  for (const page of ['play.html', 'trickshot.html', 'shop.html']) {
    assert.doesNotMatch(readFileSync(new URL(`../${page}`, import.meta.url), 'utf8'), /season/, page);
  }
});
