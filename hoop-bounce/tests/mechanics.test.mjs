// Tests des mécaniques propres aux mondes (étape 7). Chaque test construit un petit terrain dédié.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { CONFIG } from '../src/config.js';
import { Game } from '../src/game/game.js';
import { cycleTime } from '../src/game/world-elements.js';

const DT = CONFIG.physics.fixedDt;
const R = CONFIG.ball.radius;
const H = CONFIG.controls.bounceHeights;

/** Terrain plat de 0 à 40 avec murs, plus les éléments donnés. */
function yard(extra = {}, spawnX = 3, spawnY = 0) {
  return new Game(CONFIG, {
    id: 'yard',
    bounds: { minX: -2, maxX: 42, minY: -4, maxY: 12 },
    spawn: { x: spawnX, y: spawnY },
    hoop: { x: 36, y: 3.4, facing: -1, mount: 'pole' },
    ...extra,
    solids: [
      { x: -4, y: -6, w: 48, h: 6, style: extra.groundStyle ?? 'ground' },
      { x: -4, y: 0, w: 4, h: 16, style: 'wall' },
      { x: 40, y: 0, w: 4, h: 16, style: 'wall' },
      ...(extra.solids ?? []),
    ],
  });
}

function run(game, seconds, onStep) {
  const n = Math.round(seconds / DT);
  for (let i = 0; i < n; i++) {
    game.fixedUpdate(DT);
    onStep?.(game);
  }
}

function apexAfterBounce(g) {
  g.controller.pressBounce();
  g.fixedUpdate(DT);
  let top = g.body.y;
  for (let i = 0; i < 1000 && g.body.vy > 0; i++) {
    g.fixedUpdate(DT);
    top = Math.max(top, g.body.y);
  }
  return top;
}

// ─── VILLE : caisse ─────────────────────────────────────────────────────────

test('caisse : le ballon la pousse, elle s\'arrête quand on ne pousse plus, et sert de marche', () => {
  const g = yard({ crates: [{ x: 8, y: 0, w: 1.2, h: 1.2 }] });
  const crate = g.level.crates[0];
  run(g, 0.3);
  g.controller.right = true;
  run(g, 2.5);
  assert.ok(crate.x > 10, `la caisse a avancé (${crate.x.toFixed(2)})`);
  assert.ok(crate.grounded, 'elle reste posée au sol');
  g.controller.right = false;
  run(g, 1.2);
  const stopped = crate.x;
  run(g, 0.5);
  assert.ok(Math.abs(crate.x - stopped) < 0.01, 'elle ne glisse pas toute seule');
  assert.equal(crate.vx, 0);
  // Monter dessus : un rebond de niveau 2 suffit (la caisse fait 1,2 u de haut)
  const g2 = yard({ crates: [{ x: 8, y: 0 }] }, 6);
  run(g2, 0.3);
  g2.controller.pressBounce();
  run(g2, 0.12);
  g2.controller.pressBounce(); // dribble : le 2e rebond part au niveau 2
  run(g2, 0.05);
  g2.controller.right = true;
  let landedOnTop = false;
  run(g2, 2, (gg) => {
    if (gg.body.x > 8.5) gg.controller.right = false;
    if (gg.body.grounded && Math.abs(gg.body.y - (1.2 + R)) < 0.05) landedOnTop = true;
  });
  assert.ok(landedOnTop, 'le ballon peut se poser sur la caisse');
});

test('caisse : elle bute contre un mur et ne le traverse pas', () => {
  const g = yard({ crates: [{ x: 8, y: 0 }], solids: [{ x: 12, y: 0, w: 1, h: 3, style: 'block' }] });
  const crate = g.level.crates[0];
  g.controller.right = true;
  run(g, 5);
  assert.ok(crate.x + crate.w <= 12 + 1e-6, 'contre le mur');
  assert.ok(crate.x + crate.w > 11.9, 'poussée jusqu\'au mur');
});

test('caisse : elle tombe dans un trou et sert de pont', () => {
  const g = new Game(CONFIG, {
    id: 'pit',
    bounds: { minX: -2, maxX: 30, minY: -4, maxY: 10 },
    spawn: { x: 3, y: 0 },
    solids: [
      { x: -4, y: -6, w: 14, h: 6, style: 'ground' },
      { x: 10, y: -6, w: 1.3, h: 4.8, style: 'ground' },     // fond du trou à -1,2
      { x: 11.3, y: -6, w: 20, h: 6, style: 'ground' },
      { x: -4, y: 0, w: 4, h: 16, style: 'wall' },
    ],
    crates: [{ x: 7, y: 0, w: 1.2, h: 1.2 }],
    hoop: { x: 25, y: 3.4, facing: -1, mount: 'pole' },
  });
  const crate = g.level.crates[0];
  g.controller.right = true;
  run(g, 3);
  assert.ok(Math.abs(crate.y - -1.2) < 1e-6, `au fond du trou (${crate.y})`);
  assert.ok(Math.abs(crate.x - 10) < 0.11, 'calée dans le trou');
  assert.ok(g.body.x > 11.5 && g.playing, 'le ballon a traversé sur la caisse');
});

// ─── NEIGE ──────────────────────────────────────────────────────────────────

test('glace : le ballon met plus longtemps à accélérer et glisse loin sans appui', () => {
  const speedAfter = (style, t) => {
    const g = yard({ groundStyle: style });
    run(g, 0.3);
    g.controller.right = true;
    run(g, t);
    return g;
  };
  const normal = speedAfter('ground', 0.25).body.vx;
  const ice = speedAfter('ice', 0.25).body.vx;
  assert.ok(ice < normal * 0.5, `accélération réduite sur la glace (${ice.toFixed(2)} vs ${normal.toFixed(2)})`);
  const speedLeft = (style) => {
    const g = speedAfter(style, 2.5);
    g.controller.right = false;
    run(g, 1.5);
    return g.body.vx;
  };
  assert.ok(speedLeft('ice') > 4, 'sur la glace, le ballon glisse encore');
  assert.ok(speedLeft('ground') < 2, 'au sol normal, il a presque fini de rouler');
});

test('glace : les rebonds gardent exactement leur hauteur (seule l\'adhérence change)', () => {
  const g = yard({ groundStyle: 'ice' });
  run(g, 0.3);
  const y0 = g.body.y;
  assert.ok(Math.abs(apexAfterBounce(g) - y0 - H[0]) < 0.08);
});

test('rampe de glace (polygone) : le ballon y roule et descend la pente', () => {
  const g = yard({ solids: [{ points: [{ x: 6, y: 0 }, { x: 12, y: 0 }, { x: 6, y: 3 }], style: 'ice' }] }, 6.6, 2.8);
  run(g, 2);
  assert.ok(g.body.x > 12.5, `le ballon a dévalé la rampe (${g.body.x.toFixed(2)})`);
  assert.ok(g.body.vx > 2, 'avec de l\'élan');
});

test('vent : pousse le ballon dans son sens, en rafales', () => {
  const g = yard({ winds: [{ x: 5, y: 0, w: 20, h: 6, force: 9, gust: 2 }] }, 10);
  const events = [];
  g.events.on('windEnter', () => events.push('in'));
  run(g, 1.5);
  assert.ok(g.body.x > 11, `poussé vers la droite (${g.body.x.toFixed(2)})`);
  assert.deepEqual(events, ['in']);
  const w = g.level.winds[0];
  assert.ok(w.strength(0.5) > w.strength(1.5), 'l\'intensité varie (rafales)');
});

test('stalactite : tremble quand le ballon passe dessous, tombe, tue, puis repousse', () => {
  const g = yard({ solids: [{ x: 4, y: 7, w: 12, h: 1, style: 'ice' }], icicles: [{ x: 10, y: 7, len: 1.3 }] }, 9.6);
  const ic = g.level.icicles[0];
  assert.equal(ic.floorY, 0, 'connaît le sol sous elle');
  const seen = [];
  for (const e of ['icicleShake', 'icicleShatter', 'death']) g.events.on(e, () => seen.push(e));
  run(g, 3); // le ballon reste sous la stalactite
  assert.equal(seen[0], 'icicleShake');
  assert.ok(seen.includes('death'), 'la stalactite touche le ballon arrêté dessous');
  // Passer vite dessous : on l'évite
  const g2 = yard({ solids: [{ x: 4, y: 7, w: 12, h: 1, style: 'ice' }], icicles: [{ x: 10, y: 7, len: 1.3 }] }, 3);
  let died = false;
  g2.events.on('death', () => (died = true));
  run(g2, 0.3);
  g2.controller.right = true;
  run(g2, 3);
  assert.equal(died, false, 'en passant à pleine vitesse, on l\'évite');
  const ic2 = g2.level.icicles[0];
  assert.ok(['broken', 'grow', 'hang'].includes(ic2.state));
  run(g2, 4);
  assert.equal(ic2.state, 'hang', 'elle a repoussé');
});

// ─── VOLCAN ─────────────────────────────────────────────────────────────────

test('lave : mortelle', () => {
  const g = new Game(CONFIG, {
    id: 'lava',
    bounds: { minX: -2, maxX: 30, minY: -4, maxY: 10 },
    spawn: { x: 3, y: 0 },
    solids: [
      { x: -4, y: -6, w: 12, h: 6, style: 'rock' },
      { x: 8, y: -6, w: 30, h: 5, style: 'rock' },
      { x: -4, y: 0, w: 4, h: 16, style: 'wall' },
    ],
    lava: [{ x: 8, y: -0.4, w: 6 }],
    hoop: { x: 25, y: 3.4, facing: -1, mount: 'pole' },
  });
  let cause = null;
  g.events.on('death', (e) => (cause = e.cause));
  g.controller.right = true;
  run(g, 2);
  assert.equal(cause, 'lava');
});

test('plateforme qui s\'effondre : tremble, disparaît, réapparaît', () => {
  const g = yard({ crumbles: [{ x: 6, y: 2, w: 3, h: 0.45 }] }, 7.5, 2.45);
  const cr = g.level.crumbles[0];
  const seen = [];
  for (const e of ['crumbleShake', 'crumble']) g.events.on(e, () => seen.push(e));
  run(g, 0.2);
  assert.equal(cr.state, 'shake');
  run(g, 0.6);
  assert.deepEqual(seen, ['crumbleShake', 'crumble']);
  assert.equal(cr.state, 'gone');
  run(g, 0.5);
  assert.ok(g.body.y < 1, 'le ballon est tombé au travers');
  g.controller.right = true;
  run(g, 3);
  assert.equal(cr.state, 'solid', 'la plateforme est revenue');
});

test('geyser : avertit, jaillit à intervalles réguliers, mortel seulement pendant le jet', () => {
  const g = yard({ geysers: [{ x: 10, y: 0, period: 3, on: 1, phase: 0 }] });
  const gy = g.level.geysers[0];
  assert.ok(gy.state(1.6).warn > 0 && !gy.state(1.6).erupting, 'fume avant de jaillir');
  assert.ok(gy.state(2.5).erupting && gy.state(2.5).height > 4);
  assert.equal(gy.state(0.5).height, 0);
  assert.equal(gy.touches(10, R, 0.5, 0.5, 0.12), false, 'éteint : inoffensif');
  assert.equal(gy.touches(10, R, 0.5, 2.5, 0.12), true, 'en éruption : mortel');
  assert.equal(gy.touches(11.5, R, 0.5, 2.5, 0.12), false, 'à côté du jet : sans danger');
});

test('chute de pierres : prévisible, mortelle en tombant, inoffensive au sol', () => {
  const g = yard({ rockfalls: [{ x: 12, y: 9, period: 3, phase: 0 }] });
  const r = g.level.rockfalls[0];
  assert.equal(r.floorY, 0);
  const s = r.state(0.2);
  assert.equal(s.phase, 'warn');
  let hitTime = null;
  for (let t = 0; t < 3; t += 0.01) {
    const st = r.state(t);
    if (st.phase === 'rubble') {
      hitTime = t;
      break;
    }
  }
  assert.ok(hitTime > 0.85 && hitTime < 2, `touche le sol à ${hitTime}`);
  const mid = r.warnTime + r.fallTime / 2;
  assert.equal(r.touches(12, r.state(mid).y, R, mid, 0.12), true);
  assert.equal(r.touches(12, R, R, hitTime + 0.1, 0.12), false);
  assert.ok(Math.abs(cycleTime(3.5, 3, 0) - cycleTime(0.5, 3, 0)) < 1e-9, 'cycle périodique');
});

test('ascenseur de pierre (plateforme verticale) : porte le ballon vers le haut', () => {
  const g = yard({ movers: [{ x: 8, y: 0, w: 2.4, h: 0.5, style: 'stone', path: { dx: 0, dy: 5, period: 6, phase: 0 } }] }, 9.2, 0.5);
  let maxY = 0;
  run(g, 3, (gg) => (maxY = Math.max(maxY, gg.body.y)));
  assert.ok(maxY > 5.5, `monté avec l'ascenseur (${maxY.toFixed(2)})`);
});

// ─── FORÊT ──────────────────────────────────────────────────────────────────

test('liane : on l\'attrape en l\'air, on se balance, REBOND lâche prise avec l\'élan', () => {
  const g = yard({ vines: [{ x: 10, y: 8, len: 5 }] }, 7);
  const seen = [];
  for (const e of ['vineGrab', 'vineRelease']) g.events.on(e, () => seen.push(e));
  run(g, 0.3);
  // Charger la puissance puis sauter vers la liane
  for (let i = 0; i < 4; i++) {
    g.controller.pressBounce();
    run(g, 0.18);
  }
  g.controller.right = true;
  run(g, 1.5, (gg) => {
    if (gg.vine) gg.controller.right = true;
  });
  assert.equal(seen[0], 'vineGrab', 'liane attrapée');
  assert.ok(g.vine, 'toujours accroché');
  const d = Math.hypot(g.body.x - 10, g.body.y - 8);
  assert.ok(d <= g.vine.rope + 1e-6, 'la corde retient le ballon');
  // Balancement : ◀ ▶ en rythme donnent de l'élan
  let maxX = 0;
  run(g, 3, (gg) => {
    gg.controller.right = gg.body.vx > 0;
    gg.controller.left = gg.body.vx < 0;
    maxX = Math.max(maxX, gg.body.x);
  });
  assert.ok(maxX > 12, `grand balancement (${maxX.toFixed(2)})`);
  // Lâcher au moment où l'on va vers la droite
  run(g, 4, (gg) => {
    gg.controller.right = gg.body.vx > 0;
    gg.controller.left = gg.body.vx < 0;
    if (gg.vine && gg.body.vx > 4 && gg.body.x > 10) gg.controller.pressBounce();
  });
  assert.ok(seen.includes('vineRelease'), 'lâché');
  assert.equal(g.vine, null);
});

test('champignon : propulse à sa hauteur, sans toucher à la puissance', () => {
  const g = yard({ mushrooms: [{ x: 9, y: 1.2, w: 1.6, height: 5 }], solids: [] }, 9.8, 4);
  let launched = null;
  g.events.on('mushroom', () => (launched = g.body.y));
  let top = 0;
  run(g, 2, (gg) => {
    if (launched !== null) top = Math.max(top, gg.body.y);
  });
  assert.ok(launched !== null);
  assert.ok(Math.abs(top - launched - 5) < 0.4, `≈ 5 u au-dessus du chapeau (${(top - launched).toFixed(2)})`);
  assert.equal(g.controller.level, 1);
});

test('tronc qui roule : un corps rond mobile sur lequel on peut tenir', () => {
  const g = yard({ logs: [{ x: 10, y: 0.7, r: 0.7, path: { dx: 6, dy: 0, period: 6, phase: 0 } }] }, 10, 1.4);
  run(g, 1.5);
  assert.ok(g.body.y > 1.6 && g.body.grounded, 'posé sur le tronc');
  assert.ok(g.body.x > 11, 'emporté par le tronc');
});

test('branche mobile : traversable par en dessous, porte le ballon', () => {
  const g = yard({ branches: [{ x1: 6, x2: 9.5, y: 2, path: { dx: 0.5, dy: 0, period: 5, phase: 0 } }] }, 7.5);
  run(g, 0.3);
  for (let i = 0; i < 3; i++) {
    g.controller.pressBounce();
    run(g, 0.25);
  }
  let onBranch = false;
  run(g, 2.5, (gg) => {
    if (gg.body.grounded && Math.abs(gg.body.y - (2 + R)) < 0.06) onBranch = true;
  });
  assert.ok(onBranch, 'le ballon s\'est posé sur la branche par en dessous');
});

// ─── ESPACE ─────────────────────────────────────────────────────────────────

test('gravité réduite : chute plus lente, rebonds plus hauts dans le même rapport', () => {
  const g = yard({ gravityScale: 0.6, jumpScale: 1.3 });
  assert.equal(g.level.world.gravity, CONFIG.physics.gravity * 0.6);
  run(g, 0.4);
  const y0 = g.body.y;
  const h1 = apexAfterBounce(g) - y0;
  assert.ok(Math.abs(h1 - H[0] * 1.3) < 0.1, `rebond ×1,3 (${h1.toFixed(2)})`);
});

test('portails à double sens : A → B et B → A', () => {
  const g = yard({ teleporters: [{ a: { x: 8, y: 0.9 }, b: { x: 20, y: 0.9 }, r: 0.8, twoWay: true }] }, 5);
  const tps = [];
  g.events.on('teleport', (e) => tps.push(Math.round(e.to.x)));
  g.controller.right = true;
  run(g, 1.2);
  assert.deepEqual(tps, [20]);
  g.controller.right = false;
  run(g, 0.6);
  g.controller.left = true;
  run(g, 2.5);
  assert.deepEqual(tps.slice(0, 2), [20, 8], 'retour par B');
});

test('astéroïde mobile : obstacle rond, solide', () => {
  const g = yard({ asteroids: [{ x: 10, y: 0.9, r: 0.9 }] }, 5);
  g.controller.right = true;
  run(g, 2);
  assert.ok(g.body.x < 10, 'le ballon bute contre l\'astéroïde');
});

test('zone de gravité inversée : le ballon tombe vers le plafond, rebondit vers le bas, puis revient', () => {
  const g = yard({ solids: [{ x: 8, y: 6, w: 10, h: 1, style: 'block' }], gravityZones: [{ x: 8, y: 0, w: 10, h: 6 }] }, 4);
  const flips = [];
  g.events.on('gravityFlip', (e) => flips.push(e.sign));
  run(g, 0.3);
  g.controller.right = true;
  let onCeiling = false;
  run(g, 4, (gg) => {
    if (gg.body.x > 11) gg.controller.right = false;
    if (gg.body.grounded && gg.body.gravitySign < 0 && Math.abs(gg.body.y - (6 - R)) < 0.06) onCeiling = true;
  });
  for (let i = 0; i < 600 && !g.controller.canBounce; i++) g.fixedUpdate(DT);
  assert.equal(flips[0], -1);
  assert.ok(onCeiling, 'posé au plafond');
  // Un appui fait rebondir le ballon « vers le bas » (loin du plafond), à la hauteur du niveau 1
  g.controller.pressBounce();
  g.fixedUpdate(DT);
  assert.ok(g.body.vy < 0, 'le rebond part vers le bas');
  let low = g.body.y;
  for (let i = 0; i < 200 && g.body.vy < 0; i++) {
    g.fixedUpdate(DT);
    low = Math.min(low, g.body.y);
  }
  assert.ok(Math.abs(6 - R - low - H[0]) < 0.1, `même hauteur de rebond, inversée (${(6 - R - low).toFixed(2)})`);
  g.controller.right = true;
  run(g, 3);
  assert.equal(g.body.gravitySign, 1, 'sorti de la zone : gravité normale');
  assert.ok(flips.includes(1));
  assert.ok(g.playing);
});

// ─── Pièges de l'étape 9 ────────────────────────────────────────────────────

test('plateforme qui tombe : tremble, chute en emportant le ballon, puis revient', () => {
  const g = yard({ fallers: [{ x: 6, y: 3, w: 3, h: 0.4 }] }, 7.5, 3.4);
  const f = g.level.fallers[0];
  const seen = [];
  for (const e of ['fallerShake', 'fallerFall']) g.events.on(e, () => seen.push(e));
  run(g, 0.2);
  assert.equal(f.state, 'shake');
  run(g, 0.5);
  assert.deepEqual(seen, ['fallerShake', 'fallerFall']);
  run(g, 0.3);
  assert.ok(f.offset < -0.3, 'elle descend');
  assert.ok(g.body.y < 3.2, 'le ballon descend avec elle');
  run(g, 5);
  assert.equal(f.state, 'idle', 'revenue à sa place');
  assert.equal(f.offset, 0);
});

test('bloc temporisé : solide, clignote, disparaît, réapparaît (jamais sur le ballon)', () => {
  const g = yard({ blinkers: [{ x: 10, y: 0, w: 1, h: 3, period: 3, on: 1.8, phase: 0 }] }, 5);
  const bl = g.level.blinkers[0];
  assert.equal(bl.phaseAt(0.5).on, true);
  assert.ok(bl.warning(1.5) > 0, 'clignote avant de disparaître');
  assert.equal(bl.phaseAt(2).on, false);
  // Mur fermé : le ballon bute ; ouvert : il passe
  g.controller.right = true;
  run(g, 1.2);
  assert.ok(g.body.x < 9.7, 'bloqué par le mur');
  run(g, 1.5);
  assert.ok(g.body.x > 11, 'passé quand le mur a disparu');
});

test('scie mobile, boulet, laser, canon : mortels au bon moment seulement', () => {
  const g = yard({
    saws: [{ x: 12, y: 0.6, r: 0.6, path: { dx: 0, dy: 3, period: 2, phase: 0 } }],
    maces: [{ x: 20, y: 5, len: 4, amp: 1, period: 2, phase: 0 }],
    lasers: [{ x1: 26, y1: 0, x2: 26, y2: 6, period: 3, on: 1, phase: 0 }],
    cannons: [{ x: 38, y: 0.9, dir: -1, speed: 7, period: 2.6, phase: 0 }],
  });
  const L = g.level;
  // Boulet : en bas au milieu du cycle (angle 0) → au point le plus bas
  const m = L.maces[0];
  assert.ok(m.touches(20, 1, 0.4, 0, 0.12), 'boulet au point bas');
  assert.equal(m.touches(20, 1, 0.4, 0.5, 0.12), false, 'boulet sur le côté');
  // Laser : éteint puis allumé
  const l = L.lasers[0];
  assert.equal(l.touches(26, 1, 0.4, 0.5, 0.12), false);
  assert.ok(l.state(1.6).warn > 0, 'grésille avant de s\'allumer');
  assert.equal(l.touches(26, 1, 0.4, 2.5, 0.12), true);
  // Canon : portée jusqu'au mur de gauche ; le projectile avance à vitesse constante
  const c = L.cannons[0];
  assert.ok(c.range > 35 && c.range < 38, `portée ${c.range.toFixed(1)}`);
  const shots = c.shots(3.0);
  assert.ok(shots.length >= 1 && Math.abs(shots[0] - (3.0 - 2.6) * 7) < 1e-6);
  assert.equal(c.touches(38 - 0.6 - shots[0], 0.9, 0.4, 3.0, 0.12), true);
  assert.ok(c.charge(2.4) > 0, 'se charge avant de tirer');
  // Scie : le ballon posé dessous meurt quand elle descend
  let cause = null;
  const g2 = yard({ saws: [{ x: 8, y: 3.4, r: 0.6, path: { dx: 0, dy: -3, period: 2, phase: 0 } }] }, 8);
  g2.events.on('death', (e) => (cause = e.cause));
  run(g2, 2);
  assert.equal(cause, 'saw');
});

test('aimant : attire le ballon vers lui (ou le repousse)', () => {
  const g = yard({ magnets: [{ x: 12, y: 4, radius: 5, strength: 40 }] }, 9);
  const seen = [];
  g.events.on('magnetEnter', () => seen.push('in'));
  run(g, 1.2);
  assert.ok(g.body.x > 10 || g.body.y > 1.5, `attiré (${g.body.x.toFixed(2)}, ${g.body.y.toFixed(2)})`);
  assert.equal(seen[0], 'in');
  const g2 = yard({ magnets: [{ x: 12, y: 0.4, radius: 5, strength: -40 }] }, 10);
  run(g2, 1);
  assert.ok(g2.body.x < 9.5, 'repoussé');
});

test('point de contrôle : après une chute, on réapparaît au drapeau en gardant ses étoiles', () => {
  const g = yard({ checkpoints: [{ x: 8, y: 0 }], stars: [{ x: 6, y: 0.6 }, { x: 30, y: 9 }, { x: 31, y: 9 }], spikes: [{ x: 14, y: 0, w: 2, dir: 'up' }] }, 3);
  g.controller.right = true;
  let deaths = 0;
  g.events.on('death', () => deaths++);
  run(g, 1.6);
  assert.equal(deaths, 1);
  g.controller.right = false;
  run(g, 1.2);
  assert.ok(Math.abs(g.body.x - 8) < 0.5, `réapparu au drapeau (${g.body.x.toFixed(2)})`);
  assert.equal(g.starsCollected, 1, 'étoile conservée');
});
