// Outil de level design : pour chaque position de départ, liste les charges qui marquent.
// Usage : node tools/shot-finder.mjs [xMin] [xMax] [pas]
import { CONFIG } from '../src/config.js';
import { Game } from '../src/game/game.js';
import { TEST_COURT } from '../src/game/levels/test-court.js';

const [xMin = 8, xMax = 25, xStep = 0.5] = process.argv.slice(2).map(Number);
const DT = CONFIG.physics.fixedDt;

function tryShot(startX, charge) {
  const level = { ...TEST_COURT, spawn: { x: startX, y: 9 } };
  const game = new Game(CONFIG, level);
  let scored = null;
  game.events.on('score', (e) => (scored ??= e));
  // Laisser le ballon se poser
  game.controller.press(1);
  for (let i = 0; i < 240; i++) game.fixedUpdate(DT);
  if (!game.body.grounded) return { skip: true };
  const startY = game.body.y;
  // Charger pendant la bonne durée puis relâcher
  game.controller.chargeTime = 0;
  const c = Math.min(charge, 0.9999);
  const t = (1 - Math.pow(1 - c, 1 / CONFIG.controls.chargeCurve)) * CONFIG.controls.chargeTime;
  game.controller.chargeTime = t;
  game.controller.release();
  for (let i = 0; i < 120 * 4 && !scored; i++) game.fixedUpdate(DT);
  return { scored, startY };
}

for (let x = xMin; x <= xMax + 1e-9; x += xStep) {
  const hits = [];
  let startY = 0;
  for (let c = 0; c <= 1.0001; c += 0.01) {
    const r = tryShot(x, c);
    if (r.skip) break;
    startY = r.startY;
    if (r.scored) hits.push(`${(c * 100).toFixed(0)}%${r.scored.swish ? '★' : ''}`);
  }
  console.log(`x=${x.toFixed(1).padStart(5)} y=${startY.toFixed(2)}  ${hits.length ? hits.join(' ') : '—'}`);
}
