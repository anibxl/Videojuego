// Point d'entrée : assemble la logique (Game) et la présentation (rendu, caméra, son,
// vibrations, interface). C'est le seul fichier qui connaît tout le monde.

import { CONFIG } from './config.js';
import { clamp, damp, lerp } from './core/math.js';
import { FixedLoop } from './core/loop.js';
import { Game } from './game/game.js';
import { DEMO_LEVEL } from './game/levels/demo.js';
import { Input } from './input/input.js';
import { Camera } from './render/camera.js';
import { BallVisual } from './render/ball-visual.js';
import { Particles } from './render/particles.js';
import { Renderer } from './render/renderer.js';
import { Sfx } from './audio/sfx.js';
import { Haptics } from './platform/haptics.js';

const R = CONFIG.ball.radius;
const DT = CONFIG.physics.fixedDt;
const STORAGE_KEY = `hoopbounce.${DEMO_LEVEL.id}.best`;

const $ = (id) => document.getElementById(id);
const canvas = $('game');
const ui = {
  stars: [...$('stars').querySelectorAll('.star')],
  timer: $('timer'),
  restart: $('btn-restart'),
  sound: $('btn-sound'),
  tutorial: $('tutorial'),
  results: $('results'),
  resultStars: [...$('result-stars').querySelectorAll('.star')],
  resTime: $('res-time'),
  resDeaths: $('res-deaths'),
  resBest: $('res-best'),
  resRecord: $('res-record'),
  replay: $('btn-replay'),
};

const game = new Game(CONFIG, DEMO_LEVEL);
const renderer = new Renderer(canvas, game.level);
const camera = new Camera(CONFIG.camera);
const visual = new BallVisual(CONFIG.feel);
const particles = new Particles();
const sfx = new Sfx();
const haptics = new Haptics();

const state = {
  debug: new URLSearchParams(location.search).has('debug'),
  time: 0,
  flash: 0,
  denied: 0,
  gaugeAlpha: 1,
  fullFor: 0,
  sinceRespawn: 10,
  lastRimTime: -10,
  movedOnce: false,
  bounces: 0,
  tutorialHidden: false,
  ball: { x: 0, y: 0, angle: 0, r: R, scale: 1 },
  touch: { x: 0, y: 0, axis: 0, range: CONFIG.input.dragFullPx, alpha: 0 },
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

// ─── Records ───────────────────────────────────────────────────────────────

function loadBest() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? null;
  } catch {
    return null;
  }
}

function saveBest(best) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(best));
  } catch {
    /* stockage indisponible : le record n'est simplement pas gardé */
  }
}

const formatTime = (t, tenths = false) => {
  const m = Math.floor(t / 60);
  const s = t - m * 60;
  return tenths ? `${m}:${s.toFixed(1).padStart(4, '0')}` : `${m}:${String(Math.floor(s)).padStart(2, '0')}`;
};

// ─── Réactions aux événements de jeu ───────────────────────────────────────

const DUST = {
  floor: 'rgba(255,214,170,0.55)',
  block: 'rgba(255,200,160,0.45)',
  plank: 'rgba(255,220,190,0.45)',
  mover: 'rgba(160,255,240,0.5)',
};

game.events.on('impact', (e) => {
  const strength = clamp(e.speed / 18, 0, 1);
  visual.onImpact(e.speed, e.nx, e.ny);
  sfx.impact(e.speed, e.tag);
  haptics.impact(strength);
  if (e.tag === 'rim' || e.tag === 'backboard') state.lastRimTime = game.time;
  if (e.speed > 5 && DUST[e.tag]) particles.dust(e.x, e.y, e.nx, e.ny, strength, DUST[e.tag]);
  if (e.speed > CONFIG.feel.impactShakeSpeed) camera.addTrauma((e.speed - CONFIG.feel.impactShakeSpeed) / 25);
});

game.events.on('bounce', (e) => {
  visual.onBounce();
  sfx.bounce(e.air, e.index);
  haptics.light();
  if (e.air) particles.ring(e.x, e.y - R * 0.9, 0.55, 'rgba(255,255,255,0.85)');
  else particles.dust(e.x, e.y - R, 0, 1, 0.35);
  state.bounces++;
  maybeHideTutorial();
});

game.events.on('bounceDenied', () => {
  state.denied = 1;
  sfx.denied();
  haptics.impact(0.3);
});

game.events.on('gaugeSegment', (e) => sfx.gaugeTick(e.full));

game.events.on('pad', (e) => {
  sfx.pad();
  haptics.impact(0.6);
  particles.ring(e.x, e.y, 0.9, 'rgba(157,255,240,0.95)', 0.45);
  visual.onImpact(14, 0, 1);
});

game.events.on('star', (e) => {
  sfx.star(e.count);
  haptics.success();
  particles.sparkle(e.x, e.y, 18);
  particles.ring(e.x, e.y, 0.8, 'rgba(255,211,77,0.9)', 0.4);
  particles.text(e.x, e.y + 0.9, '★', '#ffd34d', 1.1);
  const el = ui.stars[e.index];
  if (el) el.classList.add('on');
});

game.events.on('checkpoint', (e) => {
  sfx.checkpoint();
  haptics.light();
  particles.sparkle(e.x + 0.3, e.y + 1.1, 12, '#9dfff0', 2.5);
});

game.events.on('death', (e) => {
  particles.burst(e.x, e.y, e.vx, e.vy);
  sfx.death();
  haptics.impact(1);
  camera.addTrauma(0.7);
  state.flash = 1;
});

game.events.on('respawn', (e) => {
  visual.reset();
  state.sinceRespawn = 0;
  if (game.time < 0.05) camera.snap(e.x, e.y, game.level.bounds);
});

game.events.on('win', (e) => {
  const swish = game.time - state.lastRimTime > 0.8;
  particles.confetti(e.x, e.y - 0.3, 70);
  particles.text(e.x + 1.6, e.y + 1.6, swish ? 'SWISH !' : 'PANIER !', swish ? '#ffd34d' : '#ffffff', 1.15);
  sfx.win(swish);
  haptics.success();
  camera.addTrauma(0.4);
  // Ralenti : on savoure le panier
  loop.timeScale = CONFIG.feel.winSlowMo;
  setTimeout(() => (loop.timeScale = 1), 900);
  setTimeout(() => showResults(e), 1400);
});

// ─── Interface ─────────────────────────────────────────────────────────────

function maybeHideTutorial() {
  if (state.tutorialHidden) return;
  if ((state.movedOnce && state.bounces >= 2) || game.body.y > 7) {
    state.tutorialHidden = true;
    ui.tutorial.classList.add('hidden');
  }
}

function showResults(r) {
  const best = loadBest();
  const isRecord = !best || r.stars > best.stars || (r.stars === best.stars && r.time < best.time);
  const newBest = isRecord ? { time: r.time, stars: r.stars } : best;
  if (isRecord) saveBest(newBest);
  ui.resTime.textContent = formatTime(r.time, true);
  ui.resDeaths.textContent = String(r.deaths);
  ui.resBest.textContent = formatTime(newBest.time, true);
  ui.resRecord.classList.toggle('hidden', !isRecord || !best);
  ui.resultStars.forEach((s, i) => {
    s.classList.remove('on');
    if (i < r.stars) setTimeout(() => s.classList.add('on'), 250 + i * 220);
  });
  ui.results.classList.remove('hidden');
  input.enabled = false;
}

function restart() {
  ui.results.classList.add('hidden');
  ui.stars.forEach((s) => s.classList.remove('on'));
  input.enabled = true;
  input.releaseAll();
  game.restart();
  camera.snap(game.body.x, game.body.y, game.level.bounds);
  loop.timeScale = 1;
}

function toggleSound() {
  sfx.setEnabled(!sfx.enabled);
  haptics.enabled = sfx.enabled;
  ui.sound.classList.toggle('muted', !sfx.enabled);
}

ui.restart.addEventListener('click', restart);
ui.replay.addEventListener('click', restart);
ui.sound.addEventListener('click', () => {
  sfx.unlock();
  toggleSound();
});

// ─── Entrées ───────────────────────────────────────────────────────────────

const input = new Input(canvas, CONFIG.input, {
  onBounce() {
    if (game.playing) game.controller.requestBounce();
  },
  onAxis(axis) {
    game.controller.setAxis(axis);
    if (Math.abs(axis) > 0.5) {
      state.movedOnce = true;
      maybeHideTutorial();
    }
  },
  onFirstInput() {
    sfx.unlock();
  },
  onShortcut(code) {
    if (code === 'Enter' && game.state === 'won') restart();
    else if (code === 'KeyR') restart();
    else if (code === 'KeyM') toggleSound();
    else if (code === 'Backquote' || code === 'F3') state.debug = !state.debug;
  },
});

// ─── Boucle ────────────────────────────────────────────────────────────────

function render(frameDt, alpha) {
  state.time += frameDt;
  state.sinceRespawn += frameDt;
  const b = game.body;
  const p = game.prev;
  const ctrl = game.controller;

  state.ball.x = lerp(p.x, b.x, alpha);
  state.ball.y = lerp(p.y, b.y, alpha);
  state.ball.angle = lerp(p.angle, b.angle, alpha);
  // Apparition : petit « pop »
  const k = clamp(state.sinceRespawn / 0.28, 0, 1);
  state.ball.scale = game.state === 'dying' ? 0 : k >= 1 ? 1 : easeOutBack(k);

  camera.update(frameDt, { x: state.ball.x, y: state.ball.y, vy: b.vy }, game.level.bounds, state.sinceRespawn < 0.6 ? 0.55 : 1);
  visual.update(frameDt, b);
  particles.update(frameDt * loop.timeScale);

  // Jauge : bien visible dès qu'elle sert, discrète quand elle est pleine et qu'on est posé
  state.denied = Math.max(0, state.denied - frameDt * 3);
  const full = ctrl.gauge >= 1 && b.grounded;
  state.fullFor = full ? state.fullFor + frameDt : 0;
  state.gaugeAlpha = damp(state.gaugeAlpha, state.fullFor > 0.9 && game.state === 'playing' ? 0.4 : game.state === 'won' ? 0 : 1, 6, frameDt);

  // Repère du pouce (au-dessus du doigt pour rester visible)
  const s = input.steer;
  state.touch.alpha = damp(state.touch.alpha, input.touching ? 1 : 0, input.touching ? 30 : 10, frameDt);
  if (input.touching) {
    state.touch.x = s.originX;
    state.touch.y = s.originY - 70;
  }
  state.touch.axis = damp(state.touch.axis, s.axis, 40, frameDt);

  state.flash = Math.max(0, state.flash - frameDt * 2.5);
  if (game.playing) ui.timer.textContent = formatTime(game.runTime);

  renderer.draw({
    frameDt,
    time: state.time,
    renderTime: game.time - (1 - alpha) * DT,
    camera,
    level: game.level,
    state: game.state,
    body: b,
    ball: state.ball,
    ballVisible: game.state !== 'dying',
    visual,
    particles,
    gauge: { value: ctrl.gauge, segments: CONFIG.controls.gaugeSegments, alpha: state.gaugeAlpha, denied: state.denied },
    touch: state.touch,
    flash: state.flash,
    debug: state.debug,
  });
}

function easeOutBack(t) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

const loop = new FixedLoop({ dt: DT, update: (dt) => game.fixedUpdate(dt), render });
loop.start();

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    loop.stop();
    input.releaseAll();
    sfx.suspend();
  } else {
    loop.start();
  }
});

// Accès depuis la console pour régler / déboguer / tests automatisés
window.__game = { game, camera, loop, input, CONFIG };
