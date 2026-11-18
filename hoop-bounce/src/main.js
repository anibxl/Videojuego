// Écran de jeu : assemble la logique (Game) et la présentation (rendu, caméra, son, musique,
// vibrations, interface). Gère aussi l'enchaînement des niveaux et des mondes (introduction,
// transition), la pause et la progression.
//
// Adresse : play.html?world=snow&level=1 (ou ?level=N, numéro dans la liste de tous les niveaux).
// &intro=1 affiche l'introduction du monde.

import { CONFIG } from './config.js';
import { clamp, damp, lerp } from './core/math.js';
import { FixedLoop } from './core/loop.js';
import { Game } from './game/game.js';
import { LEVELS, WORLDS, levelIndexOf } from './game/worlds.js';
import { Progress } from './game/progress.js';
import { gt } from './game/i18n.js';
import { Input } from './input/input.js';
import { Camera } from './render/camera.js';
import { BallVisual } from './render/ball-visual.js';
import { Particles } from './render/particles.js';
import { Renderer } from './render/renderer.js';
import { Sfx } from './audio/sfx.js';
import { Music } from './audio/music.js';
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
  intro: $('intro'),
  introWorld: $('intro-world'),
  introName: $('intro-name'),
  introTagline: $('intro-tagline'),
  introMechs: $('intro-mechs'),
  introLevel: $('intro-level'),
  wipe: $('wipe'),
};

const settings = new Settings();
const lang = settings.get('lang');
const progress = new Progress(WORLDS);
const params = new URLSearchParams(location.search);
let levelIndex = initialLevelIndex();

/** Niveau demandé dans l'adresse, sinon le premier niveau ouvert non terminé. */
function initialLevelIndex() {
  const n = parseInt(params.get('level') ?? '', 10);
  const world = params.get('world');
  if (world && Number.isInteger(n)) {
    const i = levelIndexOf(world, n);
    if (i >= 0) return i;
  }
  if (!world && Number.isInteger(n) && n >= 1 && n <= LEVELS.length) return n - 1;
  const r = progress.resume();
  const i = levelIndexOf(WORLDS[r.worldIndex].id, WORLDS[r.worldIndex].levels[r.levelIndex].number);
  return Math.max(0, i);
}

const QUALITY_PARTICLES = { low: 0.4, medium: 0.7, high: 1 };

const game = new Game(CONFIG, localizedLevel(levelIndex));
const renderer = new Renderer(canvas, game.level);
renderer.particleDensity = QUALITY_PARTICLES[settings.get('quality')] ?? 1;
renderer.setLevel(game.level);
const camera = new Camera(CONFIG.camera);
const visual = new BallVisual(CONFIG.feel);
const particles = new Particles();
const sfx = new Sfx();
const music = new Music(sfx);
const haptics = new Haptics();
sfx.setVolume(settings.get('sfx'));
music.setVolume(settings.get('music'));
haptics.enabled = settings.get('vibration');

const state = {
  debug: params.has('debug'),
  time: 0,
  flash: 0,
  paused: false,
  overlay: null,         // 'pause' | 'win' | null
  intro: false,          // introduction du monde affichée (la partie attend)
  introTimer: 0,
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

const worldOf = (index) => WORLDS[LEVELS[index].worldIndex];
const levelLabel = (def) => gt(lang, 'hud.worldLevel', { w: WORLDS[def.worldIndex].number, n: def.number });

function updateLevelLabels() {
  const def = LEVELS[levelIndex];
  ui.levelNum.textContent = levelLabel(def);
  ui.levelName.textContent = gt(lang, def.nameKey);
  ui.stars.forEach((s) => s.classList.remove('on'));
}

/** Couleur et sons du monde en cours. */
function applyWorld(world) {
  const hex = world.accent;
  const rgb = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(', ');
  document.body.style.setProperty('--accent', hex);
  document.body.style.setProperty('--accent-rgb', rgb);
  document.body.dataset.world = world.id;
  sfx.flavor = world.theme;
  music.play(world.theme);
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

const DUST_TAGS = new Set(['ground', 'block', 'mover', 'snow', 'ice', 'rock', 'wood', 'crumble', 'crate', 'branch', 'log']);

game.events.on('impact', (e) => {
  const strength = clamp(e.speed / 18, 0, 1);
  visual.onImpact(e.speed, e.nx, e.ny);
  sfx.impact(e.speed, e.tag);
  haptics.impact(strength);
  if (e.tag === 'rim' || e.tag === 'backboard') state.lastRimTime = game.time;
  if (e.speed > 5 && DUST_TAGS.has(e.tag)) particles.dust(e.x, e.y, e.nx, e.ny, strength, e.tag === 'snow' || e.tag === 'ice' ? 'rgba(255,255,255,0.85)' : renderer.theme.surface.dust);
  if (e.tag === 'crate' && e.speed > 3) sfx.crateHit();
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

// ── Mécaniques des mondes ──
/** Volume d'un son selon la distance au ballon (les éléments loin de l'écran restent discrets). */
const nearVolume = (x) => clamp(1 - Math.abs(x - game.body.x) / 14, 0, 1);

game.events.on('windEnter', () => sfx.wind(true, true));
game.events.on('windExit', () => sfx.wind(false));
game.events.on('mushroom', (e) => {
  sfx.mushroom();
  haptics.impact(0.5);
  particles.ring(e.x, e.y, 1.0, 'rgba(255,150,140,0.95)', 0.45);
  visual.onImpact(14, 0, 1);
});
game.events.on('crumbleShake', (e) => {
  sfx.crumbleShake();
  particles.dust(e.x, e.y, 0, 1, 0.4, renderer.theme.surface.dust);
});
game.events.on('crumble', (e) => {
  sfx.crumble();
  particles.dust(e.x, e.y, 0, -1, 0.9, 'rgba(160,110,90,0.9)');
  particles.sparkle(e.x, e.y, 10, '#ff9a5c', 2.5);
});
game.events.on('icicleShake', () => sfx.icicleShake());
game.events.on('icicleShatter', (e) => {
  sfx.icicleShatter();
  particles.sparkle(e.x, e.y + 0.2, 16, '#dff4ff', 3.5);
  if (nearVolume(e.x) > 0.6) camera.addTrauma(0.12);
});
game.events.on('geyser', (e) => {
  const v = nearVolume(e.x);
  sfx.geyser(v);
  if (v > 0.5) particles.sparkle(e.x, e.y + 0.4, 12, '#ffb35c', 4);
});
game.events.on('rockImpact', (e) => {
  const v = nearVolume(e.x);
  sfx.rockImpact(v);
  particles.dust(e.x, e.y, 0, 1, 0.9 * v, 'rgba(150,120,110,0.9)');
  if (v > 0.5) camera.addTrauma(0.18 * v);
});
game.events.on('vineGrab', () => {
  sfx.vineGrab();
  haptics.light();
});
game.events.on('vineRelease', () => sfx.vineRelease());
game.events.on('gravityFlip', (e) => {
  sfx.gravityFlip(e.sign < 0);
  haptics.light();
  particles.ring(e.x, e.y, 0.9, 'rgba(210,180,255,0.9)', 0.4);
});

game.events.on('star', (e) => {
  sfx.star(e.count);
  haptics.success();
  particles.sparkle(e.x, e.y, 18);
  particles.ring(e.x, e.y, 0.8, 'rgba(255,214,90,0.9)', 0.4);
  ui.stars[e.count - 1]?.classList.add('on');
});

game.events.on('death', (e) => {
  particles.burst(e.x, e.y, e.vx, e.vy);
  if (e.cause === 'lava' || e.cause === 'fire') particles.sparkle(e.x, e.y, 22, '#ffb35c', 4);
  if (e.cause === 'water') particles.sparkle(e.x, e.y + 0.3, 18, '#bff3ff', 3.5);
  sfx.death(e.cause);
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
  music.setDuck(0.45);
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
  const world = WORLDS[def.worldIndex];
  const res = progress.complete(def.id, r.stars, r.time);
  const lastOverall = levelIndex >= LEVELS.length - 1;
  const lastInWorld = def.indexInWorld === world.levels.length - 1;
  ui.winLevel.textContent = `${levelLabel(def)} · ${gt(lang, def.nameKey)}`;
  let title = 'win.title';
  let body = '';
  if (lastOverall) {
    title = 'win.done.title';
    body = gt(lang, 'win.done.body');
  } else if (lastInWorld) {
    title = 'win.world.title';
    const next = WORLDS[def.worldIndex + 1];
    body = res.unlockedWorld !== null ? gt(lang, 'win.world.body', { name: gt(lang, next.nameKey) }) : '';
    if (res.unlockedWorld !== null) setTimeout(() => sfx.unlockWorld(), 900);
  }
  ui.winTitle.textContent = gt(lang, title);
  ui.winBody.hidden = !body;
  ui.winBody.textContent = body;
  ui.winTime.textContent = formatTime(r.time);
  ui.winRecord.hidden = !res.newRecord;
  ui.winRecord.textContent = gt(lang, 'win.record');
  ui.next.hidden = lastOverall;
  ui.next.querySelector('span').textContent = gt(lang, lastInWorld ? 'win.world.next' : 'win.next');
  ui.winStars.forEach((s, i) => {
    s.classList.remove('on');
    if (i < r.stars) setTimeout(() => {
      s.classList.add('on');
      sfx.star(i + 1);
      haptics.light();
    }, 380 + i * 260);
  });
  openOverlay('win');
  (lastOverall ? ui.replay : ui.next).focus({ preventScroll: true });
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
  if (state.paused || game.state === 'won' || state.intro) return;
  state.paused = true;
  loop.stop();
  music.setDuck(0.35);
  openOverlay('pause');
  ui.resume.focus({ preventScroll: true });
}

function resume() {
  if (!state.paused) return;
  state.paused = false;
  music.setDuck(1);
  closeOverlays();
  loop.start();
}

function startLevel(index) {
  levelIndex = index;
  applyWorld(worldOf(index));
  music.setDuck(1);
  game.load(localizedLevel(index));
  renderer.setLevel(game.level);
  camera.resetEffects();
  camera.snap(game.body.x, game.body.y, game.level.bounds);
  loop.timeScale = 1;
  particles.items.forEach((p) => (p.alive = false));
  particles.texts.forEach((t) => (t.alive = false));
  updateLevelLabels();
  const def = LEVELS[index];
  history.replaceState(null, '', `?world=${def.world}&level=${def.number}`);
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
  const next = Math.min(levelIndex + 1, LEVELS.length - 1);
  closeOverlays();
  if (LEVELS[next].worldIndex !== LEVELS[levelIndex].worldIndex) return worldTransition(next);
  ui.fade.classList.remove('out');
  setTimeout(() => {
    startLevel(next);
    ui.fade.classList.add('out');
  }, 280);
}

// ─── Mondes : transition et introduction ───────────────────────────────────

/** Passage à un autre monde : un pan de sa couleur balaie l'écran, puis son introduction. */
function worldTransition(index) {
  const world = worldOf(index);
  const rgb = [1, 3, 5].map((i) => parseInt(world.accent.slice(i, i + 2), 16)).join(', ');
  ui.wipe.style.setProperty('--wipe-rgb', rgb);
  ui.wipe.classList.remove('run');
  void ui.wipe.offsetWidth; // relance l'animation
  ui.wipe.classList.add('run');
  input.enabled = false;
  input.releaseAll();
  sfx.wind(false);
  setTimeout(() => {
    startLevel(index);
    showIntro();
  }, 620);
  setTimeout(() => ui.wipe.classList.remove('run'), 1400);
}

/** Écran d'introduction du monde en cours (le décor du monde reste visible derrière). */
function showIntro() {
  const def = LEVELS[levelIndex];
  const world = WORLDS[def.worldIndex];
  ui.introWorld.textContent = gt(lang, 'world.label', { n: world.number });
  ui.introName.textContent = gt(lang, world.nameKey);
  ui.introTagline.textContent = gt(lang, world.taglineKey);
  ui.introMechs.innerHTML = '';
  world.mechanics.forEach((m, i) => {
    const li = document.createElement('li');
    li.textContent = gt(lang, `mech.${m}`);
    li.style.animationDelay = `${0.75 + i * 0.08}s`;
    ui.introMechs.appendChild(li);
  });
  ui.introLevel.textContent = `${levelLabel(def)} · ${gt(lang, def.nameKey)}`;
  state.intro = true;
  state.introTimer = 0;
  document.body.classList.add('intro-open');
  ui.intro.classList.remove('hidden');
  input.enabled = false;
  input.releaseAll();
}

function hideIntro() {
  if (!state.intro || state.introTimer < 0.6) return;
  state.intro = false;
  document.body.classList.remove('intro-open');
  ui.intro.classList.add('hidden');
  input.enabled = true;
  sfx.unlock();
}

ui.intro.addEventListener('pointerdown', () => {
  sfx.unlock();
  hideIntro();
});

ui.restart.addEventListener('click', restart);
ui.pauseBtn.addEventListener('click', pause);
ui.resume.addEventListener('click', resume);
ui.pauseRestart.addEventListener('click', restart);
ui.replay.addEventListener('click', restart);
ui.next.addEventListener('click', nextLevel);
for (const a of document.querySelectorAll('a[href]')) {
  // Quitter vers la carte ou le menu : fondu de sortie
  a.addEventListener('click', (e) => {
    e.preventDefault();
    ui.fade.classList.remove('out');
    setTimeout(() => (location.href = a.getAttribute('href')), 300);
  });
}

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
    if (state.intro) {
      if (code === 'Enter' || code === 'Space' || code === 'Escape') hideIntro();
      return;
    }
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
  music.update();
  if (state.intro) {
    state.introTimer += frameDt;
    if (state.introTimer > 4.2) hideIntro();
  }
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

// Pendant l'introduction d'un monde, la partie attend (le décor reste animé)
const loop = new FixedLoop({ dt: DT, update: (dt) => !state.intro && game.fixedUpdate(dt), render });

// L'application passe en arrière-plan : on met en pause (le joueur reprend quand il veut)
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    input.releaseAll();
    sfx.wind(false);
    sfx.suspend();
    if (state.intro) loop.stop();
    else if (state.overlay !== 'win') pause();
    else loop.stop();
  } else if (state.overlay === 'win' || state.intro) {
    loop.start();
  }
});

// ─── Démarrage ──────────────────────────────────────────────────────────────

startLevel(levelIndex);
// Introduction du monde : demandée par la carte, ou au premier niveau d'un monde
if (params.has('intro') || (!params.has('level') && LEVELS[levelIndex].indexInWorld === 0)) showIntro();
loop.start();
requestAnimationFrame(() => ui.fade.classList.add('out'));

// Accès depuis la console pour régler / déboguer / tests automatisés
window.__game = { game, camera, loop, input, renderer, CONFIG, LEVELS, WORLDS, startLevel, progress, music, sfx, showIntro, hideIntro, worldTransition, state };
