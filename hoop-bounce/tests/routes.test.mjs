// Le niveau doit rester faisable : pour chaque passage, on rejoue une solution enregistrée
// (et, quand elle existe, la solution « experte » scriptée).
// Si un réglage (physique, contrôles, géométrie) casse un passage, ce test échoue.
// Après un changement voulu du niveau : node tools/route-check.mjs 500 --save
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ROUTES, play, setup } from '../tools/route-check.mjs';

const solutions = JSON.parse(readFileSync(new URL('./fixtures/routes.json', import.meta.url)));

ROUTES.forEach(([name, start, goal, prep, expert], i) => {
  test(`passage faisable : ${name}`, () => {
    const sol = solutions[i];
    assert.ok(sol?.script || expert, `aucune solution pour « ${name} »`);
    if (sol?.script) {
      const r = play(start, goal, sol.wait, sol.script, prep);
      assert.ok(r.ok, `la solution enregistrée ne passe plus${r.death ? ' (mort)' : ''}`);
    }
    if (expert) assert.ok(expert(setup(start, 36, prep)), 'la solution experte ne passe plus');
  });
});
