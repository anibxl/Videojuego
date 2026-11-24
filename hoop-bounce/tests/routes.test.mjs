// Les 50 niveaux doivent rester faisables (refonte de la phase 2).
//
// 1. Chaque niveau est joué EN ENTIER par le « pilote » (tools/level-run.mjs) : tous les passages à la suite,
//    dans une seule partie, du départ jusqu'au panier. C'est la preuve qu'aucun niveau ne bloque la
//    progression (portes, caisses, interrupteurs, pièges chronométrés : tout est dans l'état réel du jeu).
//    La durée estimée pour un joueur doit rester dans la fourchette visée pour son monde.
// 2. La difficulté progresse : chaque monde dure en moyenne plus longtemps que le précédent.
// 3. Pour chaque passage, la solution « aléatoire » enregistrée (tests/fixtures/routes.json), quand il y en
//    a une, est rejouée depuis le début du passage.
//
// Si un réglage (physique, commandes, géométrie) casse un niveau, ce test échoue.
// Après une modification voulue d'un niveau : node tools/route-check.mjs 400 --save
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ROUTES, play } from '../tools/route-check.mjs';
import { runLevel, TARGETS, PLAYER_FACTOR } from '../tools/level-run.mjs';
import { LEVELS, WORLDS } from '../src/game/worlds.js';

const solutions = JSON.parse(readFileSync(new URL('./fixtures/routes.json', import.meta.url)));

/** Marge tolérée autour des durées visées (secondes, estimation joueur). */
const SLACK_LOW = 3;
const SLACK_HIGH = 4;

const timeByLevel = new Map();

LEVELS.forEach((level, li) => {
  test(`niveau ${li + 1} (${level.id}) — joué en entier, du départ au panier`, () => {
    const r = runLevel(li);
    assert.ok(r.ok, `bloqué à « ${r.name} »`);
    const player = r.time * PLAYER_FACTOR;
    timeByLevel.set(level.id, player);
    const [lo, hi] = TARGETS[level.world];
    assert.ok(player >= lo - SLACK_LOW && player <= hi + SLACK_HIGH, `durée joueur ~${player.toFixed(0)} s, visé ${lo}–${hi} s`);
  });
});

test('la difficulté progresse : chaque monde dure en moyenne plus longtemps que le précédent', () => {
  const means = WORLDS.map((w) => {
    const times = w.levels.map((l) => timeByLevel.get(l.id) ?? runLevel(LEVELS.findIndex((x) => x.id === l.id)).time * PLAYER_FACTOR);
    return times.reduce((a, b) => a + b, 0) / times.length;
  });
  for (let i = 1; i < means.length; i++) assert.ok(means[i] > means[i - 1], `${WORLDS[i].id} (${means[i].toFixed(0)} s) après ${WORLDS[i - 1].id} (${means[i - 1].toFixed(0)} s)`);
});

ROUTES.forEach((routes, li) => {
  routes.forEach(([name, start, goal, prep], ri) => {
    const sol = solutions[li]?.[ri];
    if (!sol?.script) return;
    test(`niveau ${li + 1} — solution enregistrée : ${name}`, () => {
      const r = play(li, start, goal, sol.wait, sol.script, prep);
      assert.ok(r.ok, `la solution enregistrée ne passe plus${r.death ? ' (mort)' : ''}`);
    });
  });
});
