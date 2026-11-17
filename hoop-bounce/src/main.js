// Point d'entrée : assemble la logique (Game) et la présentation (rendu, caméra, son,
// vibrations, interface). C'est le seul fichier qui connaît tout le monde.

import { CONFIG } from './config.js';
import { clamp, damp, lerp } from './core/math.js';
import { FixedLoop } from './core/loop.js';
import { Game } from './game/game.js';
import { LEVEL_01 } from './game/levels/level-01.js';
import { Input } from './input/input.js';
import { Camera } from './render/camera.js';
import { BallVisual } from './render/ball-visual.js';
import { Particles } from './render/particles.js';
import { Renderer } from './render/renderer.js';
import { Sfx } from './audio/sfx.js';
import { Haptics } from './platform/haptics.js';
import { Settings } from './shared/settings.js';

const LEVEL = LEVEL_01;
const R = CONFIG.ball.radius;
const DT = CONFIG.physics.fixedDt;
const MAX_LEVEL = CONFIG.controls.bounceHeights.length;
const STORAGE_KEY = `hoopbounce.${LEVEL.id}.best`;

const $ = (id) => document.getElementById(id);
const canvas = $('game');
const ui = {
  stars: [...$('stars').querySelectorAll('.star')],
  levelName: $('level-name'),
  timer: $('timer'),
  restart: $('btn-restart'),
  sound: $('btn-sound'),
  padLeft: $('pad-left'),
  padRight: $('pad-right'),
  padBounce: $('pad-bounce'),
  ring: $('power-ring'),
  results: $('results'),
  resLevel: $('res-level'),
  resultStars: [...$('result-stars').querySelectorAll('.star')],
  resTime: $('res-time'),
  resDeaths: $('res-deaths'),
  resBest: $('res-best'),
  resRecord: $('res-record'),
  replay: $('btn-replay'),
};

const game = new Game(CONFIG, LEVEL);
const renderer = new Renderer(canvas, game.level);
const camera = new Camera(CONFIG.camera);
const visual = new BallVisual(CONFIG.feel);
const particles = new Particles();
const sfx = new Sfx();
const haptics = new Haptics();
// Réglages choisis dans le menu (volume des effets, vibrations)
const settings = new Settings();
sfx.setVolume(settings.get('sfx'));
haptics.enabled = settings.get('vibration');

const state = {
  debug: new URLSearchParams(location.search).has('debug'),
  time: 0,
  flash: 0,
  sinceRespawn: 10,
  sinceTeleport: 10,
  sinceBounce: 10,
  groundY: 0,
  lastRimTime: -10,
  gaugeAlpha: 0,
  ringKey: '',
  ball: { x: 0, y: 0, angle: 0, r: R, scale: 1 },
};

ui.levelName.textContent = `Niveau 1 · ${LEVEL.name}`;
ui.resLevel.textContent = `Niveau 1 · ${LEVEL.name}`;

// ─── Anneau de puissance autour du bouton REBOND ───────────────────────────

(function buildRing() {
  const n = MAX_LEVEL;
  const gap = 0.16; // radians entre deux segments
  const r = 47;
  let html = '';
  for (let i = 0; i < n; i++) {
    const a0 = -Math.PI / 2 + (i * 2 * Math.PI) / n + gap / 2;
    const a1 = -Math.PI / 2 + ((i + 1) * 2 * Math.PI) / n - gap / 2;
    const p = (a) => `${(50 + r * Math.cos(a)).toFixed(2)} ${(50 + r * Math.sin(a)).toFixed(2)}`;
    html += `<path d="M ${p(a0)} A ${r} ${r} 0 0 1 ${p(a1)}"/>`;
  }
  ui.ring.innerHTML = html;
})();
const ringSegments = [...ui.ring.querySelectorAll('path')];

function updateRing(level, warn) {
  const key = `${level}${warn ? 'w' : ''}`;
  if (key === state.ringKey) return;
  state.ringKey = key;
  ringSegments.forEach((p, i) => {
    p.classList.toggle('on', i < level);
    p.classList.toggle('warn', warn && i === level - 1);
  });
  ui.ring.classList.toggle('l4', level === 4);
  ui.ring.classList.toggle('l5', level >= 5);
}

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

const DUST = { ground: 'rgba(239,229,213,0.55)', block: 'rgba(239,229,213,0.5)', mover: 'rgba(239,229,213,0.5)' };

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
  sfx.bounce(e.level);
  haptics.light();
  state.sinceBounce = 0;
  const color = e.level >= MAX_LEVEL ? 'rgba(255,214,90,0.95)' : e.level >= 4 ? 'rgba(255,181,71,0.9)' : 'rgba(255,255,255,0.8)';
  particles.ring(e.x, e.y - R * 0.95, 0.35 + e.level * 0.1, color, 0.3 + e.level * 0.03);
  particles.dust(e.x, e.y - R, 0, 1, 0.15 + e.level * 0.1);
  if (e.level >= MAX_LEVEL) camera.addTrauma(0.18);
});

game.events.on('powerDown', () => sfx.powerDown());

game.events.on('trampoline', (e) => {
  sfx.trampoline();
  haptics.impact(0.6);
  particles.ring(e.x, e.y, 1.0, 'rgba(166,255,230,0.95)', 0.45);
  visual.onImpact(14, 0, 1);
});

game.events.on('switch', (e) => {
  sfx.switchOn();
  haptics.success();
  particles.sparkle(e.x, e.y + 0.3, 14, '#ffe0a3', 2.8);
  if (e.doors.length) {
    setTimeout(() => sfx.door(), 120);
    particles.text(e.x, e.y + 1.6, 'La porte s’ouvre !', '#ffe0a3', 0.6);
  }
});

game.events.on('teleport', (e) => {
  sfx.teleport();
  haptics.impact(0.5);
  particles.sparkle(e.from.x, e.from.y, 14, '#d6c8ff', 3.5);
  particles.ring(e.to.x, e.to.y, 1.1, 'rgba(200,180,255,0.95)', 0.45);
  particles.sparkle(e.to.x, e.to.y, 14, '#d6c8ff', 3.5);
  state.sinceTeleport = 0;
  state.groundY = Math.min(state.groundY, e.to.y - R);
});

game.events.on('fanEnter', () => sfx.wind(true));
game.events.on('fanExit', () => sfx.wind(false));

game.events.on('star', (e) => {
  sfx.star(e.count);
  haptics.success();
  particles.sparkle(e.x, e.y, 18);
  particles.ring(e.x, e.y, 0.8, 'rgba(255,214,90,0.9)', 0.4);
  ui.stars[e.index]?.classList.add('on');
});

game.events.on('checkpoint', (e) => {
  sfx.checkpoint();
  haptics.light();
  particles.sparkle(e.x + 0.3, e.y + 1.1, 12, '#a6ffe6', 2.5);
});

game.events.on('death', (e) => {
  particles.burst(e.x, e.y, e.vx, e.vy);
  sfx.death();
  haptics.impact(1);
  camera.addTrauma(e.cause === 'fall' ? 0.3 : 0.7);
  state.flash = 1;
});

game.events.on('respawn', (e) => {
  visual.reset();
  state.sinceRespawn = 0;
  state.groundY = e.y - R;
  if (game.time < 0.05) camera.snap(e.x, e.y, game.level.bounds);
});

game.events.on('win', (e) => {
  const swish = game.time - state.lastRimTime > 0.8;
  particles.confetti(e.x, e.y - 0.3, 70);
  particles.text(e.x - 1.5, e.y + 2.2, swish ? 'SWISH !' : 'PANIER !', swish ? '#ffd65a' : '#ffffff', 1.15);
  sfx.win(swish);
  haptics.success();
  camera.addTrauma(0.4);
  loop.timeScale = CONFIG.feel.winSlowMo; // ralenti : on savoure le panier
  setTimeout(() => (loop.timeScale = 1), 900);
  setTimeout(() => showResults(e), 1400);
});

// ─── Interface ─────────────────────────────────────────────────────────────

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
  input.releaseAll();
}

function restart() {
  ui.results.classList.add('hidden');
  ui.stars.forEach((s) => s.classList.remove('on'));
  input.enabled = true;
  input.releaseAll();
  sfx.wind(false);
  game.restart();
  camera.snap(game.body.x, game.body.y, game.level.bounds);
  loop.timeScale = 1;
}

function toggleSound() {
  sfx.setEnabled(!sfx.enabled);
  haptics.enabled = sfx.enabled && settings.get('vibration');
  ui.sound.classList.toggle('muted', !sfx.enabled);
  if (!sfx.enabled) sfx.wind(false);
}

ui.restart.addEventListener('click', restart);
ui.replay.addEventListener('click', restart);
ui.sound.addEventListener('click', () => {
  sfx.unlock();
  toggleSound();
});

// ─── Entrées ───────────────────────────────────────────────────────────────

const input = new Input(canvas, { left: ui.padLeft, right: ui.padRight, bounce: ui.padBounce }, {
  onDirection(left, right) {
    game.controller.left = left;
    game.controller.right = right;
  },
  onBounce() {
    if (game.playing) game.controller.pressBounce();
  },
  onFirstInput() {
    sfx.unlock();
  },
  onShortcut(code) {
    if (code === 'Enter' && game.state === 'won') restart();
    else if (code === 'KeyR') restart();
    else if (code === 'KeyM') toggleSound();
    else if (code === 'Escape') location.href = 'index.html';
    else if (code === 'Backquote' || code === 'F3') state.debug = !state.debug;
  },
});

// ─── Boucle ────────────────────────────────────────────────────────────────

function render(frameDt, alpha) {
  state.time += frameDt;
  state.sinceRespawn += frameDt;
  state.sinceTeleport += frameDt;
  state.sinceBounce += frameDt;
  const b = game.body;
  const p = game.prev;
  const ctrl = game.controller;

  state.ball.x = lerp(p.x, b.x, alpha);
  state.ball.y = lerp(p.y, b.y, alpha);
  state.ball.angle = lerp(p.angle, b.angle, alpha);
  // Apparition (réapparition, sortie de téléporteur) : petit « pop »
  const pop = clamp(Math.min(state.sinceRespawn, state.sinceTeleport) / 0.28, 0, 1);
  state.ball.scale = game.state === 'dying' ? 0 : pop >= 1 ? 1 : easeOutBack(pop);

  if (b.grounded && game.state !== 'dying') state.groundY = b.y - R;
  const fastFollow = state.sinceRespawn < 0.6 || state.sinceTeleport < 0.8;
  camera.update(frameDt, { x: state.ball.x, y: state.ball.y, vx: b.vx, groundY: state.groundY }, game.level.bounds, fastFollow ? 0.35 : 1);
  visual.update(frameDt, b);
  particles.update(frameDt * loop.timeScale);

  // Jauge de puissance : visible dès qu'elle a monté, discrète au repos
  const warn = ctrl.level > 1 && ctrl.decayIn < 0.5;
  const showGauge = game.state === 'playing' && (ctrl.level > 1 || state.sinceBounce < 1.2);
  state.gaugeAlpha = damp(state.gaugeAlpha, showGauge ? 1 : 0, showGauge ? 14 : 4, frameDt);
  updateRing(ctrl.level, warn);

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
    power: { level: ctrl.level, max: MAX_LEVEL, alpha: state.gaugeAlpha, warn },
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
    sfx.wind(false);
    sfx.suspend();
  } else {
    loop.start();
  }
});

// Accès depuis la console pour régler / déboguer / tests automatisés
window.__game = { game, camera, loop, input, renderer, CONFIG };
