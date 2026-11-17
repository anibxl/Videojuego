// Point d'entrée : assemble la logique (Game) et la présentation (rendu, caméra, son,
// vibrations, interface). C'est le seul fichier qui connaît tout le monde.

import { CONFIG } from './config.js';
import { clamp, damp, lerp } from './core/math.js';
import { FixedLoop } from './core/loop.js';
import { Game } from './game/game.js';
import { TEST_COURT } from './game/levels/test-court.js';
import { Input } from './input/input.js';
import { Camera } from './render/camera.js';
import { BallVisual } from './render/ball-visual.js';
import { Particles } from './render/particles.js';
import { Renderer } from './render/renderer.js';
import { Sfx } from './audio/sfx.js';
import { Haptics } from './platform/haptics.js';

const R = CONFIG.ball.radius;
const DIRECTION_HYSTERESIS_PX = 14;

const $ = (id) => document.getElementById(id);
const canvas = $('game');
const ui = {
  score: $('score'),
  scoreValue: $('score-value'),
  streak: $('streak'),
  hint: $('hint'),
  reset: $('btn-reset'),
  sound: $('btn-sound'),
  fullscreen: $('btn-fullscreen'),
  debug: $('btn-debug'),
};

const game = new Game(CONFIG, TEST_COURT);
const renderer = new Renderer(canvas);
const camera = new Camera(CONFIG.camera);
const visual = new BallVisual(CONFIG.feel);
const particles = new Particles();
const sfx = new Sfx();
const haptics = new Haptics();

const params = new URLSearchParams(location.search);
const state = {
  debug: params.has('debug'),
  time: 0,
  launches: 0,
  previewAlpha: 0,
  chargeAlpha: 0,
  preview: { points: new Float64Array(2 * 400), count: 0, hit: false, alpha: 0 },
  ball: { x: 0, y: 0, angle: 0, r: R },
  charge: { visible: false, value: 0, alpha: 0, direction: 1 },
};

// ─── Taille de l'écran ──────────────────────────────────────────────────────

function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.resize(w, h);
  camera.setViewport(w, h);
}
window.addEventListener('resize', resize);
window.visualViewport?.addEventListener('resize', resize);
resize();
camera.snap(game.body.x, game.body.y, game.level.bounds);

// ─── Réactions aux événements de jeu ───────────────────────────────────────

const DUST_COLORS = {
  floor: 'rgba(255,226,190,0.55)',
  block: 'rgba(170,200,255,0.45)',
  platform: 'rgba(170,200,255,0.45)',
};

game.events.on('impact', (e) => {
  const strength = clamp(e.speed / 18, 0, 1);
  visual.onImpact(e.speed, e.nx, e.ny);
  sfx.impact(e.speed, e.tag);
  haptics.impact(strength);
  if (e.speed > 6 && DUST_COLORS[e.tag]) particles.dust(e.x, e.y, e.nx, e.ny, strength, DUST_COLORS[e.tag]);
  if (e.speed > CONFIG.feel.impactShakeSpeed) camera.addTrauma((e.speed - CONFIG.feel.impactShakeSpeed) / 25);
});

game.events.on('launch', (e) => {
  visual.onLaunch();
  sfx.launch(e.charge);
  haptics.light();
  particles.dust(e.x, e.y - R, 0, 1, 0.15 + 0.35 * e.charge);
  state.launches++;
  if (state.launches === 2) ui.hint.classList.add('hidden');
});

game.events.on('chargeMax', () => {
  sfx.chargeMax();
  haptics.light();
});

game.events.on('score', (e) => {
  particles.confetti(e.x, e.y - 0.3, e.swish ? 60 : 40);
  particles.text(e.x, e.y + 1.4, e.swish ? 'SWISH !' : 'PANIER !', e.swish ? '#ffd25e' : '#ffffff', e.swish ? 1.15 : 1);
  if (e.streak >= 2) particles.text(e.x, e.y + 2.5, `SÉRIE ×${e.streak}`, '#ff8a4c', 0.7);
  sfx.score(e.swish);
  haptics.success();
  camera.addTrauma(0.35);
  ui.scoreValue.textContent = String(e.score);
  ui.score.classList.remove('bump');
  void ui.score.offsetWidth; // relance l'animation CSS
  ui.score.classList.add('bump');
  setTimeout(() => ui.score.classList.remove('bump'), 220);
});

game.events.on('respawn', (e) => {
  visual.reset();
  camera.snap(e.x, e.y, game.level.bounds);
});

// ─── Entrées ───────────────────────────────────────────────────────────────

function directionFromScreenX(x, current) {
  const ballX = camera.worldToScreenX(state.ball.x);
  const dx = x - ballX;
  if (current !== 0 && Math.abs(dx) < DIRECTION_HYSTERESIS_PX) return current; // pas de clignotement près du ballon
  return dx >= 0 ? 1 : -1;
}

const input = new Input(canvas, {
  onPress(x) {
    sfx.unlock();
    game.controller.press(directionFromScreenX(x, 0));
  },
  onMove(x) {
    if (game.controller.charging) game.controller.setDirection(directionFromScreenX(x, game.controller.direction));
  },
  onRelease() {
    game.controller.release();
  },
  onCancel() {
    game.controller.cancel();
  },
  onKeyPress(dir) {
    sfx.unlock();
    game.controller.press(dir || game.controller.direction);
  },
  onShortcut(code) {
    if (code === 'KeyR') game.respawn();
    else if (code === 'Backquote' || code === 'F3') toggleDebug();
    else if (code === 'KeyM') toggleSound();
  },
});

// ─── Boutons ───────────────────────────────────────────────────────────────

function toggleDebug() {
  state.debug = !state.debug;
  ui.debug.setAttribute('aria-pressed', String(state.debug));
}

function toggleSound() {
  sfx.setEnabled(!sfx.enabled);
  haptics.enabled = sfx.enabled;
  ui.sound.classList.toggle('muted', !sfx.enabled);
}

ui.debug.setAttribute('aria-pressed', String(state.debug));
ui.reset.addEventListener('click', () => game.respawn());
ui.debug.addEventListener('click', toggleDebug);
ui.sound.addEventListener('click', () => {
  sfx.unlock();
  toggleSound();
});
if (!document.fullscreenEnabled) ui.fullscreen.hidden = true;
ui.fullscreen.addEventListener('click', async () => {
  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
      try {
        await screen.orientation?.lock?.('landscape');
      } catch {
        /* verrouillage non pris en charge */
      }
    }
  } catch {
    /* refusé par le navigateur : sans importance */
  }
});

// ─── Boucle ────────────────────────────────────────────────────────────────

function render(frameDt, alpha) {
  state.time += frameDt;
  const b = game.body;
  const p = game.prev;
  const ctrl = game.controller;

  // Position interpolée entre les deux derniers pas de simulation
  state.ball.x = lerp(p.x, b.x, alpha);
  state.ball.y = lerp(p.y, b.y, alpha);
  state.ball.angle = lerp(p.angle, b.angle, alpha);

  const charge = ctrl.charging ? ctrl.charge : 0;
  camera.update(frameDt, { x: state.ball.x, y: state.ball.y, vx: b.vx }, game.level.bounds, charge);
  visual.update(frameDt, b, charge * CONFIG.feel.chargeSquash);
  particles.update(frameDt);

  // Prévisualisation de la trajectoire : visible quand le ballon est posé et qu'on charge
  const showPreview = ctrl.charging && b.timeSinceGrounded < 0.06;
  state.previewAlpha = damp(state.previewAlpha, showPreview ? 1 : 0, showPreview ? 12 : 20, frameDt);
  if (ctrl.charging && state.previewAlpha > 0.01) {
    const res = game.predictTrajectory(state.debug ? CONFIG.feel.previewTimeDebug : CONFIG.feel.previewTime, state.preview.points);
    state.preview.count = res.count;
    state.preview.hit = res.hit;
  }
  state.preview.alpha = state.previewAlpha * 0.9;

  state.chargeAlpha = damp(state.chargeAlpha, ctrl.charging ? 1 : 0, ctrl.charging ? 25 : 10, frameDt);
  state.charge.visible = state.chargeAlpha > 0.02;
  state.charge.alpha = state.chargeAlpha;
  if (ctrl.charging) state.charge.value = charge;
  state.charge.direction = ctrl.direction;

  ui.streak.textContent = game.streak >= 2 ? `×${game.streak}` : '';

  renderer.draw({
    frameDt,
    time: state.time,
    camera,
    level: game.level,
    body: b,
    ball: state.ball,
    visual,
    particles,
    preview: state.preview,
    charge: state.charge,
    pending: ctrl.hasPendingLaunch,
    debug: state.debug,
    debugContacts: b.contacts.slice(0, b.contactCount),
  });
}

const loop = new FixedLoop({ dt: CONFIG.physics.fixedDt, update: (dt) => game.fixedUpdate(dt), render });
loop.start();

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    loop.stop();
    input.cancelAll();
    sfx.suspend();
  } else {
    loop.start();
  }
});

// Accès depuis la console pour régler / déboguer
window.__game = { game, camera, loop, CONFIG };
