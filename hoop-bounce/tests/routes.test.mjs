// Le niveau doit rester faisable : on rejoue une solution enregistrée pour chaque passage.
// Si un réglage (physique, contrôles, géométrie) casse un passage, ce test échoue.
// Après un changement voulu : node tools/route-check.mjs 600 --save
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ROUTES, play } from '../tools/route-check.mjs';

const solutions = JSON.parse(readFileSync(new URL('./fixtures/routes.json', import.meta.url)));

ROUTES.forEach(([name, start, goal], i) => {
  test(`passage faisable : ${name}`, () => {
    const sol = solutions[i];
    assert.ok(sol?.script, `aucune solution enregistrée pour « ${name} »`);
    const r = play(start, goal, sol.wait, sol.script);
    assert.ok(r.ok, `la solution enregistrée ne passe plus${r.death ? ' (mort)' : ''}`);
  });
});
