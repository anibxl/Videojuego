// Les niveaux doivent rester faisables : pour chaque passage, on rejoue une solution enregistrée
// et, quand elle existe, la solution « experte » scriptée.
// Si un réglage (physique, commandes, géométrie) casse un passage, ce test échoue.
// Après une modification voulue d'un niveau : node tools/route-check.mjs 400 --save
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ROUTES, play, setup } from '../tools/route-check.mjs';

const solutions = JSON.parse(readFileSync(new URL('./fixtures/routes.json', import.meta.url)));

ROUTES.forEach((routes, li) => {
  routes.forEach(([name, start, goal, prep, expert], ri) => {
    test(`niveau ${li + 1} — passage faisable : ${name}`, () => {
      const sol = solutions[li]?.[ri];
      assert.ok(sol?.script || expert, `aucune solution pour « ${name} »`);
      if (sol?.script) {
        const r = play(li, start, goal, sol.wait, sol.script, prep);
        assert.ok(r.ok, `la solution enregistrée ne passe plus${r.death ? ' (mort)' : ''}`);
      }
      if (expert) assert.ok(expert(() => setup(li, start, 36, prep)), 'la solution experte ne passe plus');
    });
  });
});
