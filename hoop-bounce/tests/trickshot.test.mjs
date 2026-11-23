// Étapes 22-23 — mode TRICKSHOT (laboratoire) : 20 cartes résolubles en un tir, chaque mécanique indispensable,
// essais, étoiles, score, visée limitée, progression (et migration de l'ancienne sauvegarde).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { TS_LEVELS } from '../src/trickshot/levels.js';
import { TrickshotGame, simulateShot, DT } from '../src/trickshot/game.js';
import { TS_CONFIG, TRICKSHOT, DIFFICULTIES, CHAPTERS, chapterOf } from '../src/trickshot/config.js';
import { TrickshotProgress, TS_KEY } from '../src/trickshot/progress.js';
import { aimFromDrag, trajectory } from '../src/trickshot/aim.js';
import { TS_STRINGS, tt } from '../src/trickshot/i18n.js';
import { CONFIG } from '../src/config.js';
import { classOf } from '../tools/trickshot-check.mjs';

const FIX = JSON.parse(readFileSync(new URL('./fixtures/trickshot.json', import.meta.url), 'utf8'));
const DEG = Math.PI / 180;
const RANK = Object.fromEntries(Object.entries(DIFFICULTIES).map(([k, v]) => [k, v.rank]));

function memStorage() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), map: m };
}

test('20 cartes uniques, 4 par chapitre, textes en 3 langues, difficulté valide', () => {
  assert.equal(TS_LEVELS.length, 20);
  assert.equal(new Set(TS_LEVELS.map((l) => l.id)).size, 20);
  TS_LEVELS.forEach((l, i) => {
    assert.equal(l.n, i + 1);
    assert.ok(l.diff in DIFFICULTIES, `${l.n} : difficulté ${l.diff}`);
    for (const lang of ['fr', 'en', 'es']) assert.ok(l.name[lang], `${l.n} : nom ${lang}`);
    if (l.hint) for (const lang of ['fr', 'en', 'es']) assert.ok(l.hint[lang], `${l.n} : indice ${lang}`);
    for (const m of l.intro ?? []) for (const lang of ['fr', 'en', 'es']) assert.ok(TS_STRINGS[lang][`mech.${m}`], `${l.n} : mécanique ${m} (${lang})`);
  });
  for (const c of CHAPTERS) assert.equal(TS_LEVELS.filter((l) => chapterOf(l.n) === c).length, 4);
  for (const c of CHAPTERS) for (const lang of ['fr', 'en', 'es']) assert.ok(TS_STRINGS[lang][`chapter.${c.id}`], `chapitre ${c.id} (${lang})`);
});

test('la difficulté monte : chapitre 1 surtout facile, chapitre 5 le plus dur', () => {
  const mean = (c) => TS_LEVELS.filter((l) => chapterOf(l.n) === c).reduce((a, l) => a + RANK[l.diff], 0) / 4;
  const means = CHAPTERS.map(mean);
  assert.ok(means[0] < 1, `chapitre 1 : ${means[0]}`);
  assert.ok(means[4] >= 1.5, `chapitre 5 : ${means[4]}`);
  assert.equal(Math.max(...means), means[4], 'le dernier chapitre est le plus difficile');
  assert.equal(TS_LEVELS.slice(0, 4).filter((l) => l.diff === 'impossible' || l.diff === 'very').length, 0);
});

test('cartes du laboratoire : pas de grand sol plat partout, départs et paniers variés', () => {
  const fullFloor = (l) => l.solids.some((s) => s.style === 'ground' && s.x <= -0.5 && s.x + s.w >= 24.5);
  assert.ok(TS_LEVELS.filter(fullFloor).length <= 6, 'la plupart des cartes ont du vide');
  assert.ok(TS_LEVELS.filter((l) => l.start.y > 2.5).length >= 8, 'des départs en hauteur');
  assert.ok(TS_LEVELS.filter((l) => l.hoop.x < 12).length >= 5, 'des paniers à gauche');
  assert.ok(TS_LEVELS.filter((l) => l.hoop.hang).length >= 4, 'des paniers suspendus');
  assert.ok(TS_LEVELS.filter((l) => l.hoop.facing === 1).length >= 5, 'des paniers tournés vers la droite');
});

test('chaque mécanique sert : sans elle, la solution enregistrée ne marque plus', () => {
  const KEYS = ['trampolines', 'fans', 'movers', 'switches', 'teleporters', 'breakables'];
  let checked = 0;
  for (const l of TS_LEVELS) {
    const s = FIX[l.n];
    for (const k of KEYS) {
      if (!l[k]?.length) continue;
      const without = { ...l, [k]: [] };
      const r = simulateShot(without, { angle: s.angle * DEG, power: s.power, release: s.release });
      assert.equal(r.won, false, `niveau ${l.n} (${l.id}) : la solution marque encore sans « ${k} »`);
      checked++;
    }
    // Bumpers et rampes-bumpers : sans eux, la solution ne marche plus
    if (l.solids.some((x) => x.style === 'bumper')) {
      const none = { ...l, solids: l.solids.filter((x) => x.style !== 'bumper') };
      assert.equal(simulateShot(none, { angle: s.angle * DEG, power: s.power, release: s.release }).won, false, `niveau ${l.n} : bumpers inutiles`);
      checked++;
    }
  }
  assert.ok(checked >= 18, `${checked} mécaniques vérifiées`);
});

test('chaque niveau se gagne en un seul tir (3 étoiles possibles) : solution rejouée', () => {
  for (const l of TS_LEVELS) {
    const s = FIX[l.n];
    assert.ok(s, `niveau ${l.n} : pas de solution enregistrée (node tools/trickshot-check.mjs ${l.n} --save)`);
    const r = simulateShot(l, { angle: s.angle * DEG, power: s.power, release: s.release });
    assert.ok(r.won, `niveau ${l.n} (${l.id}) : la solution ne marque plus (${r.reason})`);
    assert.equal(r.game.result.stars, 3);
  }
});

test('la difficulté annoncée correspond à la mesure du solveur (à une classe près)', () => {
  for (const l of TS_LEVELS) {
    const measured = classOf(FIX[l.n]?.frac ?? 0);
    assert.ok(Math.abs(RANK[measured] - RANK[l.diff]) <= 1, `niveau ${l.n} : annoncé ${l.diff}, mesuré ${measured}`);
  }
});

test('3 essais : chaque tir raté renvoie le ballon au pas de tir, le 3e raté termine le niveau', () => {
  const def = TS_LEVELS[0];
  const g = new TrickshotGame(def);
  const events = [];
  g.events.on('shotEnd', (e) => events.push(['shotEnd', e.shotsLeft]));
  g.events.on('failed', () => events.push(['failed']));
  assert.equal(g.state, 'aiming');
  assert.equal(g.shotsLeft, 3);
  for (let i = 0; i < 3; i++) {
    assert.ok(g.launch(180 * DEG, 0.3), `tir ${i + 1}`); // vers la gauche : raté
    let t = 0;
    while (g.state === 'playing' && t < 20) {
      g.fixedUpdate(DT);
      t += DT;
    }
    if (i < 2) {
      assert.equal(g.state, 'aiming');
      assert.ok(Math.hypot(g.body.x - def.start.x, g.body.y - def.start.y) < 0.1, 'ballon replacé');
    }
  }
  assert.equal(g.state, 'failed');
  assert.deepEqual(events, [['shotEnd', 2], ['shotEnd', 1], ['failed']]);
  assert.equal(g.launch(45 * DEG, 0.5), false, 'plus de tir après l’échec');
});

test('étoiles et score : 3 au 1er essai, 2 au 2e, 1 au 3e ; bonus de style', () => {
  const def = TS_LEVELS[0];
  const s = FIX[1];
  for (const misses of [0, 1, 2]) {
    const g = new TrickshotGame(def);
    for (let i = 0; i < misses; i++) {
      g.launch(180 * DEG, 0.3);
      while (g.state === 'playing') g.fixedUpdate(DT);
    }
    const r = simulateShot(def, { angle: s.angle * DEG, power: s.power, release: g.time + 0.01 }, g);
    assert.ok(r.won, `réussite après ${misses} raté(s)`);
    assert.equal(g.result.stars, 3 - misses);
    assert.equal(g.result.shots, misses + 1);
    const bonus = Object.values(g.result.bonus).reduce((a, v) => a + v, 0);
    assert.equal(g.result.score, g.result.stars * 1000 + bonus);
  }
});

test('puissance trop faible : tir refusé ; le décor reste en place entre deux essais', () => {
  const g = new TrickshotGame(TS_LEVELS[0]);
  assert.equal(g.launch(0.5, TRICKSHOT.minPower / 2), false);
  assert.equal(g.shotsUsed, 0);
  // Niveau à caisse : la caisse cassée au 1er tir le reste au 2e
  const crate = TS_LEVELS.find((l) => l.breakables?.length);
  const g2 = new TrickshotGame(crate);
  g2._setBroken(g2.level.breakables[0], true); // comme si le 1er tir l'avait cassée
  g2.launch(180 * DEG, 0.3);
  while (g2.state === 'playing') g2.fixedUpdate(DT);
  assert.equal(g2.state, 'aiming');
  assert.equal(g2.level.breakables[0].broken, true, 'la caisse ne se reconstruit pas entre deux essais');
  g2.restart();
  assert.equal(g2.level.breakables[0].broken, false, 'recommencer remet tout à zéro');
});

test('visée : tirer vers l’arrière lance dans la direction opposée, puissance proportionnelle', () => {
  const a = aimFromDrag(-TRICKSHOT.maxDrag, 0);
  assert.ok(Math.abs(a.angle) < 1e-9);
  assert.equal(a.power, 1);
  const b = aimFromDrag(1, -1);
  assert.ok(Math.abs(b.angle - (135 * DEG)) < 1e-9);
  assert.ok(Math.abs(b.power - Math.SQRT2 / TRICKSHOT.maxDrag) < 1e-9);
  assert.equal(aimFromDrag(0.05, 0).valid, false);
  assert.equal(aimFromDrag(10, 10).power, 1);
  // Aide limitée : les pointillés ne montrent que le début de l'arc (longueur fixe), quel que soit le tir
  const g0 = new TrickshotGame(TS_LEVELS[0]);
  for (const power of [0.3, 0.7, 1]) {
    const pts = trajectory(g0.level, g0.tee, 45 * DEG, power, { maxTime: 3, step: 1 / 60, maxLength: TRICKSHOT.previewLength });
    let len = 0;
    for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    assert.ok(len <= TRICKSHOT.previewLength + 0.01, `pointillés trop longs (${len.toFixed(2)})`);
  }
  assert.ok(TRICKSHOT.previewLength < 8, 'les pointillés ne vont jamais jusqu’au panier d’un bout à l’autre de la salle');
  assert.ok(TRICKSHOT.pullScreen > 0.2 && TRICKSHOT.pullScreen < 0.6, 'geste de pleine puissance : une part raisonnable de l’écran');
  // La trajectoire prévue suit le tir réel au début du vol
  const g = new TrickshotGame(TS_LEVELS[0]);
  const pts = trajectory(g.level, g.tee, 50 * DEG, 0.6, { maxTime: 0.3, step: 0.1 });
  g.launch(50 * DEG, 0.6);
  for (let i = 0; i < Math.round(0.1 / DT); i++) g.fixedUpdate(DT);
  assert.ok(Math.hypot(g.body.x - pts[0].x, g.body.y - pts[0].y) < 0.08);
});

test('progression indépendante : déblocage séquentiel, meilleur score, résumé', () => {
  const st = memStorage();
  const p = new TrickshotProgress({ storage: st });
  assert.equal(p.isUnlocked(1), true);
  assert.equal(p.isUnlocked(2), false);
  let r = p.record(1, { stars: 2, score: 2400 });
  assert.deepEqual(r, { newBest: true, newStars: true, unlocked: 2 });
  assert.equal(p.isUnlocked(2), true);
  r = p.record(1, { stars: 1, score: 1200 });
  assert.deepEqual(r, { newBest: false, newStars: false, unlocked: null });
  assert.deepEqual(p.level(1), { stars: 2, best: 2400, plays: 2 });
  p.played(2);
  assert.equal(p.isUnlocked(3), false, 'un échec ne débloque rien');
  assert.equal(p.next(), 2);
  const s = p.summary();
  assert.equal(s.done, 1);
  assert.equal(s.stars, 2);
  assert.equal(s.maxStars, 60);
  assert.equal(s.percent, 3); // 2 étoiles sur 60
  // Sauvegarde à part, relue telle quelle
  assert.equal(TS_KEY, 'hoopbounce.trickshot');
  assert.deepEqual([...st.map.keys()], [TS_KEY]);
  assert.deepEqual(new TrickshotProgress({ storage: st }).level(1), p.level(1));
  // Ancienne sauvegarde (v1, anciennes cartes) : les déblocages sont conservés, rien ne plante
  const old = memStorage();
  old.setItem(TS_KEY, JSON.stringify({ v: 1, levels: { 1: { stars: 3, best: 4000, plays: 2 }, 2: { stars: 1, best: 1200, plays: 5 }, 3: { stars: 0, best: 0, plays: 3 } } }));
  const m = new TrickshotProgress({ storage: old, total: 20 });
  assert.equal(m.data.v, 2);
  assert.equal(m.isUnlocked(3), true, '2 anciennes cartes réussies → les 3 premières nouvelles ouvertes');
  assert.equal(m.isUnlocked(4), false);
  assert.equal(m.summary().stars, 0, 'pas d’étoiles fantômes sur des cartes jamais jouées');
  assert.equal(JSON.parse(old.getItem(TS_KEY)).legacy[1].best, 4000, 'ancienne sauvegarde conservée');
  // Sauvegarde abîmée : on repart de zéro sans planter
  st.setItem(TS_KEY, '{oops');
  assert.equal(new TrickshotProgress({ storage: st }).summary().done, 0);
});

test('le mode principal n’est pas touché : réglages d’origine intacts', () => {
  assert.equal(CONFIG.materials.bumper, undefined);
  assert.notEqual(TS_CONFIG.controls.groundBrake, undefined);
  assert.equal(TS_CONFIG.physics.gravity, CONFIG.physics.gravity);
  assert.ok(Object.isFrozen(TS_CONFIG));
});

test('textes du mode : clés identiques dans les 3 langues, variables remplacées', () => {
  const keys = Object.keys(TS_STRINGS.fr).sort();
  assert.deepEqual(Object.keys(TS_STRINGS.en).sort(), keys);
  assert.deepEqual(Object.keys(TS_STRINGS.es).sort(), keys);
  for (const d of Object.keys(DIFFICULTIES)) assert.ok(tt('fr', `diff.${d}`));
});
