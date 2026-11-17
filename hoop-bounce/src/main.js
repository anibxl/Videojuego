// Écran de jeu : assemble la logique (Game) et la présentation (rendu, caméra, son, vibrations,
// interface). Gère aussi l'enchaînement des niveaux, la pause et la progression.

import { CONFIG } from './config.js';
import { clamp, damp, lerp } from './core/math.js';
import { FixedLoop } from './core/loop.js';
import { Game } from './game/game.js';
import { LEVELS } from './game/levels/index.js';
import { Progress } from './game/progress.js';
import { gt } from './game/i18n.js';
import { Input } from './input/input.js';
import { Camera } from './render/camera.js';
import { BallVisual } from './render/ball-visual.js';
import { Particles } from './render/particles.js';
import { Renderer } from './render/renderer.js';
import { Sfx } from './audio/sfx.js';
import { Haptics } from './platform/haptics.js';
import { Settings } from './shared/settings.js';

const R = CONFIG.ball.radius;
const DT = CONFIG.physics.fixedDt;
const MAX_LEVEL = CONFIG.controls.bounceHeights.length;
const TUTO_KEY = 'hoopbounce.tutorialDone';

const $ = (id) => document.getElementById(id);
const canvas = $('game');
const ui = {
  levelNum: $('level-num'),
  levelName: $('level-name'),
  stars: [...document.querySelectorAll('#stars .star')],
  restart: $('btn-restart'),
  pauseBtn: $('btn-pause'),
  padLeft: $('pad-left'),
  padRight: $('pad-right'),
  padBounce: $('pad-bounce'),
  ring: $('power-ring'),
  tutoMove: $('tuto-move'),
  tutoBounce: $('tuto-bounce'),
  pause: $('pause'),
  resume: $('btn-resume'),
  pauseRestart: $('btn-pause-restart'),
  win: $('win'),
  winLevel: $('win-level'),
  winTitle: $('win-title'),
  winStars: [...document.querySelectorAll('#win-stars .star')],
  winBody: $('win-body'),
  winTime: $('win-time'),
  winRecord: $('win-record'),
  next: $('btn-next'),
  replay: $('btn-replay'),
  fade: $('fade'),
};

const settings = new Settings();
const lang = settings.get('lang');
const progress = new Progress(LEVELS.length);
const params = new URLSearchParams(location.search);
const requested = parseInt(params.get('level') ?? '', 10);
let levelIndex = Number.isInteger(requested) && requested >= 1 && requested <= LEVELS.length ? requested - 1 : progress.resumeIndex;

const game = new Game(CONFIG, localizedLevel(levelIndex));
const renderer = new Renderer(canvas, game.level);
const camera = new Camera(CONFIG.camera);
const visual = new BallVisual(CONFIG.feel);
const particles = new Particles();
const sfx = new Sfx();
const haptics = new Haptics();
sfx.setVolume(settings.get('sfx'));
haptics.enabled = settings.get('vibration');

const state = {
  debug: params.has('debug'),
  time: 0,
  flash: 0,
  paused: false,
  overlay: null,         // 'pause' | 'win' | null
  sinceRespawn: 10,
  sinceTeleport: 10,
  sinceBounce: 10,
  lastRimTime: -10,
  gaugeAlpha: 0,
  ringKey: '',
  groundY: 0,
  tutorial: false,
  tutoMoved: false,
  tutoBounces: 0,
  ball: { x: 0, y: 0, angle: 0, r: R, scale: 1 },
};

/** Copie du niveau avec ses textes d'aide traduits. */
function localizedLevel(i) {
  const def = LEVELS[i];
  return { ...def, hints: (def.hints ?? []).map((h) => ({ ...h, text: gt(lang, h.key) })) };
}

// ─── Textes statiques ───────────────────────────────────────────────────────

document.documentElement.lang = lang;
for (const el of document.querySelectorAll('[data-t]')) el.textContent = gt(lang, el.dataset.t);
for (const el of document.querySelectorAll('[data-t-html]')) el.innerHTML = gt(lang, el.dataset.tHtml);
for (const el of document.querySelectorAll('[data-label]')) {
  el.setAttribute('aria-label', gt(lang, el.dataset.label));
  el.title = gt(lang, el.dataset.label);
}

function updateLevelLabels() {
  const def = LEVELS[levelIndex];
  ui.levelNum.textContent = gt(lang, 'hud.level', { n: def.number });
  ui.levelName.textContent = gt(lang, def.nameKey);
  ui.stars.forEach((s) => s.classList.remove('on'));
}

// ─── Anneau de puissance autour du bouton REBOND ───────────────────────────

(function buildRing() {
  const n = MAX_LEVEL;
  const gap = 0.16;
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

// ─── Écran ──────────────────────────────────────────────────────────────────

function resize() {
  renderer.resize(window.innerWidth, window.innerHeight);
  camera.setViewport(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', resize);
window.visualViewport?.addEventListener('resize', resize);
resize();

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
  if (e.level >= MAX_LEVEL) camera.addTrauma(0.16);
  state.tutoBounces++;
  updateTutorial();
});

game.events.on('slam', () => {
  sfx.slam();
  visual.onSlam();
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
    particles.text(e.x, e.y + 1.6, gt(lang, 'popup.door'), '#ffe0a3', 0.6);
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
  ui.stars[e.count - 1]?.classList.add('on');
});

game.events.on('death', (e) => {
  particles.burst(e.x, e.y, e.vx, e.vy);
  sfx.death();
  haptics.impact(1);
  camera.addTrauma(e.cause === 'fall' ? 0.3 : 0.7);
  state.flash = 1;
  ui.stars.forEach((s) => s.classList.remove('on'));
});

game.events.on('respawn', (e) => {
  visual.reset();
  state.sinceRespawn = 0;
  state.groundY = e.y - R;
  ui.stars.forEach((s) => s.classList.remove('on'));
});

game.events.on('win', (e) => {
  const swish = game.time - state.lastRimTime > 0.8;
  const h = game.level.hoop;
  particles.confetti(e.x, e.y - 0.4, 80);
  particles.text(e.x - 1.2, e.y + 2.2, gt(lang, swish ? 'popup.swish' : 'popup.score'), swish ? '#ffd65a' : '#ffffff', 1.15);
  sfx.win(swish);
  haptics.success();
  // Effet de caméra : ralenti, léger zoom sur le panier, secousse
  camera.addTrauma(0.35);
  camera.focus = { x: h.centerX - 1, y: h.rimY - 0.5 };
  camera.zoomTarget = 1.14;
  loop.timeScale = CONFIG.feel.winSlowMo;
  setTimeout(() => (loop.timeScale = 1), 900);
  setTimeout(() => showWin(e), 1500);
});

// ─── Victoire ──────────────────────────────────────────────────────────────

const formatTime = (t) => {
  const m = Math.floor(t / 60);
  const s = t - m * 60;
  return `${m}:${s.toFixed(1).padStart(4, '0')}`;
};

function showWin(r) {
  const def = LEVELS[levelIndex];
  const { newRecord } = progress.complete(levelIndex, def.id, r.stars, r.time);
  const last = levelIndex >= LEVELS.length - 1;
  ui.winLevel.textContent = `${gt(lang, 'hud.level', { n: def.number })} · ${gt(lang, def.nameKey)}`;
  ui.winTitle.textContent = gt(lang, last ? 'win.done.title' : 'win.title');
  ui.winBody.hidden = !last;
  ui.winBody.textContent = gt(lang, 'win.done.body');
  ui.winTime.textContent = formatTime(r.time);
  ui.winRecord.hidden = !newRecord;
  ui.winRecord.textContent = gt(lang, 'win.record');
  ui.next.hidden = last;
  ui.winStars.forEach((s, i) => {
    s.classList.remove('on');
    if (i < r.stars) setTimeout(() => {
      s.classList.add('on');
      sfx.star(i + 1);
      haptics.light();
    }, 380 + i * 260);
  });
  openOverlay('win');
  (last ? ui.replay : ui.next).focus({ preventScroll: true });
}

// ─── Pause, overlays, enchaînement des niveaux ─────────────────────────────

function openOverlay(name) {
  state.overlay = name;
  document.body.classList.add('overlay-open');
  (name === 'pause' ? ui.pause : ui.win).classList.remove('hidden');
  input.enabled = false;
  input.releaseAll();
  sfx.wind(false);
}

function closeOverlays() {
  state.overlay = null;
  document.body.classList.remove('overlay-open');
  ui.pause.classList.add('hidden');
  ui.win.classList.add('hidden');
  input.enabled = true;
}

function pause() {
  if (state.paused || game.state === 'won') return;
  state.paused = true;
  loop.stop();
  openOverlay('pause');
  ui.resume.focus({ preventScroll: true });
}

function resume() {
  if (!state.paused) return;
  state.paused = false;
  closeOverlays();
  loop.start();
}

function startLevel(index) {
  levelIndex = index;
  game.load(localizedLevel(index));
  renderer.setLevel(game.level);
  camera.resetEffects();
  camera.snap(game.body.x, game.body.y, game.level.bounds);
  loop.timeScale = 1;
  particles.items.forEach((p) => (p.alive = false));
  particles.texts.forEach((t) => (t.alive = false));
  updateLevelLabels();
  history.replaceState(null, '', `?level=${index + 1}`);
  setupTutorial();
}

function restart() {
  closeOverlays();
  sfx.wind(false);
  state.paused = false;
  startLevel(levelIndex);
  loop.start();
}

function nextLevel() {
  closeOverlays();
  ui.fade.classList.remove('out');
  setTimeout(() => {
    startLevel(Math.min(levelIndex + 1, LEVELS.length - 1));
    ui.fade.classList.add('out');
  }, 280);
}

ui.restart.addEventListener('click', restart);
ui.pauseBtn.addEventListener('click', pause);
ui.resume.addEventListener('click', resume);
ui.pauseRestart.addEventListener('click', restart);
ui.replay.addEventListener('click', restart);
ui.next.addEventListener('click', nextLevel);

// ─── Tutoriel (premier lancement) ───────────────────────────────────────────

function tutorialDone() {
  try {
    return localStorage.getItem(TUTO_KEY) === '1';
  } catch {
    return false;
  }
}

function setupTutorial() {
  state.tutorial = levelIndex === 0 && !tutorialDone();
  state.tutoMoved = false;
  state.tutoBounces = 0;
  document.body.classList.toggle('tutorial', state.tutorial);
  ui.tutoMove.classList.remove('done');
  ui.tutoBounce.classList.remove('done');
}

function updateTutorial() {
  if (!state.tutorial) return;
  ui.tutoMove.classList.toggle('done', state.tutoMoved);
  ui.tutoBounce.classList.toggle('done', state.tutoBounces >= 3);
  if (state.tutoMoved && state.tutoBounces >= 3) {
    state.tutorial = false;
    try {
      localStorage.setItem(TUTO_KEY, '1');
    } catch {
      /* ignoré */
    }
    setTimeout(() => document.body.classList.remove('tutorial'), 600);
  }
}

// ─── Entrées ───────────────────────────────────────────────────────────────

const input = new Input(canvas, { left: ui.padLeft, right: ui.padRight, bounce: ui.padBounce }, {
  onDirection(left, right) {
    game.controller.left = left;
    game.controller.right = right;
    if ((left || right) && !state.tutoMoved) {
      state.tutoMoved = true;
      updateTutorial();
    }
  },
  onBounce() {
    if (game.playing) game.controller.pressBounce();
  },
  onFirstInput() {
    sfx.unlock();
  },
  onShortcut(code) {
    if (code === 'Escape' || code === 'KeyP') (state.paused ? resume : pause)();
    else if (code === 'KeyR') restart();
    else if (code === 'Enter' && state.overlay === 'win') (ui.next.hidden ? restart : nextLevel)();
    else if (code === 'Backquote' || code === 'F3') state.debug = !state.debug;
  },
});

// Les boutons des fenêtres doivent rester utilisables même quand le jeu ignore les touchers
for (const el of document.querySelectorAll('.overlay')) el.addEventListener('pointerdown', () => sfx.unlock());

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
  const pop = clamp(Math.min(state.sinceRespawn, state.sinceTeleport) / 0.28, 0, 1);
  state.ball.scale = game.state === 'dying' ? 0 : pop >= 1 ? 1 : easeOutBack(pop);

  if (b.grounded && game.state !== 'dying') state.groundY = b.y - R;
  const fastFollow = state.sinceRespawn < 0.6 || state.sinceTeleport < 0.8;
  camera.update(frameDt, { x: state.ball.x, y: state.ball.y, vx: b.vx, groundY: state.groundY }, game.level.bounds, fastFollow ? 0.35 : 1);
  visual.update(frameDt, b);
  particles.update(frameDt * loop.timeScale);

  // Jauge : visible dès qu'elle a monté, discrète au repos ; le dernier cran clignote avant de baisser
  const warn = ctrl.level > 1 && ctrl.decayIn < 0.35;
  const showGauge = game.state === 'playing' && (ctrl.level > 1 || state.sinceBounce < 1.2);
  state.gaugeAlpha = damp(state.gaugeAlpha, showGauge ? 1 : 0, showGauge ? 14 : 4, frameDt);
  updateRing(ctrl.level, warn);

  state.flash = Math.max(0, state.flash - frameDt * 2.5);

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

// L'application passe en arrière-plan : on met en pause (le joueur reprend quand il veut)
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    input.releaseAll();
    sfx.wind(false);
    sfx.suspend();
    if (state.overlay !== 'win') pause();
    else loop.stop();
  } else if (state.overlay === 'win') {
    loop.start();
  }
});

// ─── Démarrage ──────────────────────────────────────────────────────────────

startLevel(levelIndex);
loop.start();
requestAnimationFrame(() => ui.fade.classList.add('out'));

// Accès depuis la console pour régler / déboguer / tests automatisés
window.__game = { game, camera, loop, input, renderer, CONFIG, LEVELS, startLevel, progress };
