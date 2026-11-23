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
import { Sfx, surfaceOf } from './audio/sfx.js';
import { TimeFx } from './core/time-fx.js';
import { WorldFx } from './render/world-fx.js';
import { Confetti } from './render/confetti.js';
import { Music } from './audio/music.js';
import { Haptics } from './platform/haptics.js';
import { Settings } from './shared/settings.js';
import { Wallet } from './shared/wallet.js';
import { Fx, bounceEffect, goalEffect, emitTrail } from './render/cosmetics.js';
import { Stats } from './shared/stats.js';
import { Missions } from './shared/missions.js';
import { Achievements } from './shared/achievements.js';
import { lt } from './shared/live-i18n.js';
import { getAds } from './shared/ads.js';
import { awardPassXp } from './shared/pass.js';

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
  winCoins: $('win-coins'),
  winCoinsN: $('win-coins-n'),
  winReward: $('win-reward'),
  winX2: $('win-x2'),
  btnDouble: $('btn-double'),
  btnDoubleSub: $('btn-double-sub'),
  fail: $('fail'),
  failLevel: $('fail-level'),
  failBody: $('fail-body'),
  btnFailRestart: $('btn-fail-restart'),
  btnFailContinue: $('btn-fail-continue'),
  btnFailLabel: $('btn-fail-continue-label'),
  btnFailSub: $('btn-fail-continue-sub'),
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
// Systèmes quotidiens (étape 12) : statistiques, missions du jour, succès
const stats = new Stats();
const missions = new Missions();
const achievements = new Achievements();
const unlockedWorlds = () => WORLDS.filter((_, i) => progress.isWorldUnlocked(i)).map((w) => w.id);
// Publicités récompensées (étape 13) : toujours optionnelles, jamais pendant un niveau
const ads = getAds();
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
// Après une chute, si un drapeau a été atteint : écran « Niveau échoué » (recommencer, ou reprendre au
// drapeau en regardant une publicité)
game.holdAtCheckpoint = true;
const renderer = new Renderer(canvas, game.level);
renderer.particleDensity = QUALITY_PARTICLES[settings.get('quality')] ?? 1;
// Boutique : articles équipés (ballon, effet de rebond, traînée, animation de panier)
const wallet = new Wallet();
const look = { ball: wallet.equipped('ball'), bounce: wallet.equipped('bounce'), trail: wallet.equipped('trail'), goal: wallet.equipped('goal') };
renderer.setBallSkin(look.ball);
const fx = new Fx();
const trail = { id: look.trail, pts: [] };
const ghost = []; // dernières positions du ballon (images fantômes quand il file très vite)
const tracks = []; // traces laissées dans la neige { x, y, t, w }
let lastTrackX = -99;
const NO_TRACK = new Set(['ice', 'wood', 'mover', 'plank', 'crate', 'log', 'branch']);
function addTrack(x, y, w) {
  tracks.push({ x, y, t: state.time, w });
  if (tracks.length > 90) tracks.shift();
}
renderer.setLevel(game.level);
const camera = new Camera(CONFIG.camera);
const visual = new BallVisual(CONFIG.feel);
const particles = new Particles();
const sfx = new Sfx();
const music = new Music(sfx);
const haptics = new Haptics();
// Game feel (étape 18) : ralentis progressifs, effets propres à chaque monde, confettis de victoire
const timeFx = new TimeFx();
const worldFx = new WorldFx(particles);
const confetti = new Confetti($('confetti'));
// Moins d'animations demandées par le système : secousses et coups de zoom très atténués
const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)');
camera.motionScale = reducedMotion?.matches ? 0.4 : 1;
reducedMotion?.addEventListener?.('change', (e) => (camera.motionScale = e.matches ? 0.4 : 1));
// Grondements d'ambiance (éruption, avalanche) : l'image tremble un peu, de la matière tombe
music.onAmbient = (kind, k) => {
  if (kind !== 'rumble' || game.state !== 'playing' || state.paused) return;
  camera.addTrauma(0.12 * k);
  worldFx.debris(renderer.themeId, camera, Math.round(6 + k * 10));
};
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
  goal: null,            // gerbe de lumière du panier { x, y, t0, swish }
  runDeaths: 0,          // chutes depuis le début du niveau (mission « sans mourir »)
  playAcc: 0,            // temps de jeu pas encore enregistré
  liveTimer: 0,
};

// ─── Missions et succès annoncés pendant la partie ─────────────────────────

const banner = { queue: [], busy: false };

/** Vérifie les missions terminées et les succès atteints depuis la dernière fois, et les annonce. */
function checkLive() {
  try {
    for (const m of missions.newlyCompleted(stats, unlockedWorlds())) {
      banner.queue.push({ kind: 'mission', title: lt(lang, 'live.mission'), text: missionText(m) });
    }
    for (const a of achievements.newlyUnlocked({ stats, progress, wallet })) {
      banner.queue.push({ kind: 'achievement', title: lt(lang, 'live.achievement'), text: lt(lang, `ach.${a.id}`) });
    }
  } catch {
    /* sauvegarde indisponible : rien à annoncer */
  }
  showNextBanner();
}

function missionText(m) {
  const n = m.tpl === 'time' ? Math.round(m.target / 60) : m.target;
  return lt(lang, `mission.${m.tpl}`, { n, world: m.world ? gt(lang, `world.${m.world}`) : '' });
}

function showNextBanner() {
  if (banner.busy || !banner.queue.length) return;
  const b = banner.queue.shift();
  banner.busy = true;
  const el = $('live-banner');
  el.dataset.kind = b.kind;
  $('live-title').textContent = b.title;
  $('live-text').textContent = b.text;
  el.classList.remove('show');
  void el.offsetWidth;
  el.classList.add('show');
  sfx.mission?.();
  haptics.success();
  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => {
      banner.busy = false;
      showNextBanner();
    }, 450);
  }, 2600);
}

/** Arrêt sur image très bref : donne du poids aux moments forts (éclatement, étoile). */
function hitStop(ms, scale = 0.05) {
  timeFx.hitStop(ms / 1000, scale);
}

/** Matière soulevée à l'impact, selon le monde et la surface (voir src/render/world-fx.js). */
function worldImpact(x, y, strength, tag) {
  worldFx.impact(renderer.themeId, surfaceOf(tag, renderer.themeId), x, y, strength);
}

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
  sfx.impact(e.speed, e.tag, e.x);
  haptics.impact(strength);
  // Gros atterrissage : l'image encaisse le poids du ballon (elle s'enfonce puis revient)
  if (e.ny > 0.5 && e.speed > 11 && game.state === 'playing' && DUST_TAGS.has(e.tag)) {
    const k = clamp((e.speed - 11) / 12, 0, 1);
    camera.impulse(0, -(0.9 + 2.2 * k));
    particles.ring(e.x, e.y + 0.02, 0.7 + k * 0.9, `rgba(${worldFx.tint(renderer.themeId)},${0.45 + 0.4 * k})`, 0.35 + 0.15 * k);
    if (k > 0.55) worldFx.debris(renderer.themeId, camera, Math.round(3 + k * 6));
  }
  if (e.tag === 'rim' || e.tag === 'backboard') state.lastRimTime = game.time;
  if (e.speed > 5 && DUST_TAGS.has(e.tag)) {
    particles.dust(e.x, e.y, e.nx, e.ny, strength, e.tag === 'snow' || e.tag === 'ice' ? 'rgba(255,255,255,0.85)' : renderer.theme.surface.dust);
    if (e.ny > 0.5) worldImpact(e.x, e.y, strength, e.tag);
    if (renderer.themeId === 'snow' && e.ny > 0.7 && !NO_TRACK.has(e.tag)) addTrack(e.x, e.y, 0.3 + strength * 0.25);
  }
  if (e.speed > 9 && e.ny > 0.5) particles.flash(e.x, e.y + 0.05, 0.5 + strength * 0.9, '255,245,225', 0.14);
  if (e.tag === 'crate' && e.speed > 3) sfx.crateHit();
  if (e.speed > CONFIG.feel.impactShakeSpeed) camera.addTrauma((e.speed - CONFIG.feel.impactShakeSpeed) / 25);
});

game.events.on('bounce', (e) => {
  stats.add('bounces', 1, false);
  visual.onBounce();
  sfx.bounce(e.level, e.x);
  haptics.bounce(e.level);
  state.sinceBounce = 0;
  padHit(e.level);
  const color = e.level >= MAX_LEVEL ? 'rgba(255,214,90,0.95)' : e.level >= 4 ? 'rgba(255,181,71,0.9)' : 'rgba(255,255,255,0.8)';
  if (!bounceEffect(fx, look.bounce, e.x, e.y - R * 0.95, e.level)) particles.ring(e.x, e.y - R * 0.95, 0.35 + e.level * 0.1, color, 0.3 + e.level * 0.03);
  particles.dust(e.x, e.y - R, 0, 1, 0.15 + e.level * 0.1);
  // Plus la puissance est haute, plus l'impact se voit : éclair, traits de vitesse, coup de zoom
  if (e.level >= 3) {
    const rgb = e.level >= MAX_LEVEL ? '255,214,90' : e.level >= 4 ? '255,181,71' : '255,255,255';
    particles.flash(e.x, e.y - R * 0.9, 0.6 + e.level * 0.25, rgb, 0.16 + e.level * 0.02);
    particles.streaks(e.x, e.y - R * 0.95, 0, 1, 2 + e.level * 2, 5 + e.level * 1.5, `rgba(${rgb},0.95)`);
  }
  if (e.level === MAX_LEVEL - 1) {
    camera.kick(-0.02);
    camera.addTrauma(0.06);
    camera.impulse(0, -0.8);
  }
  if (e.level >= MAX_LEVEL) {
    // Pleine puissance : onde au sol, matière du monde projetée, secousse, coup de zoom, arrêt bref
    camera.addTrauma(0.2);
    camera.kick(-0.05);
    camera.impulse(0, -1.6);
    particles.ring(e.x, e.y - R * 0.95, 1.6, 'rgba(255,214,90,0.6)', 0.45);
    particles.ring(e.x, e.y - R * 0.95, 2.6, 'rgba(255,214,90,0.28)', 0.6);
    worldFx.burst(renderer.themeId, e.x, e.y - R * 0.95);
    hitStop(35, 0.25);
  }
  state.tutoBounces++;
  updateTutorial();
});

game.events.on('slam', (e) => {
  sfx.slam(e.x);
  visual.onSlam();
  haptics.tap();
  padHit(0);
  particles.streaks(e.x, e.y + R * 0.6, 0, 1, 3, 3.5, 'rgba(255,255,255,0.55)');
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
game.events.on('fallerShake', (e) => {
  sfx.fallerShake();
  particles.dust(e.x, e.y, 0, 1, 0.4, renderer.theme.surface.dust);
});
game.events.on('fallerFall', () => sfx.fallerFall());
game.events.on('blinker', (e) => sfx.blinker(e.on, nearVolume(e.x)));
game.events.on('cannonFire', (e) => {
  const v = nearVolume(e.x);
  sfx.cannon(v);
  if (v > 0.3) particles.dust(e.x + e.dx * 0.7, e.y + e.dy * 0.7, e.dx, e.dy, 0.5 * v, 'rgba(200,200,210,0.8)');
});
game.events.on('laserOn', (e) => sfx.laserOn(nearVolume(e.x)));
game.events.on('crusherSlam', (e) => {
  const v = nearVolume(e.x);
  sfx.crusherSlam(v);
  if (v > 0.3) {
    particles.dust(e.x - 0.6, e.y, 0, 1, 0.8 * v, renderer.theme.surface.dust);
    particles.dust(e.x + 0.6, e.y, 0, 1, 0.8 * v, renderer.theme.surface.dust);
    camera.addTrauma(0.22 * v);
    haptics.impact(0.4 * v);
  }
});
game.events.on('boulderStart', (e) => sfx.boulderStart(nearVolume(e.x)));
game.events.on('checkpoint', (e) => {
  sfx.checkpoint();
  haptics.success();
  particles.sparkle(e.x + 0.3, e.y + 1.2, 14, '#a6ffe6', 3);
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
  sfx.star(e.count, e.x);
  haptics.success();
  particles.sparkle(e.x, e.y, 18);
  particles.streaks(e.x, e.y, 0, 1, 8, 6, 'rgba(255,224,120,0.9)');
  particles.ring(e.x, e.y, 0.8, 'rgba(255,214,90,0.9)', 0.4);
  particles.flash(e.x, e.y, 1.6, '255,214,90', 0.3);
  camera.kick(0.025);
  hitStop(45, 0.2);
  ui.stars[e.count - 1]?.classList.add('on');
});

game.events.on('death', (e) => {
  stats.add('deaths', 1, false);
  state.runDeaths++;
  particles.burst(e.x, e.y, e.vx, e.vy);
  if (e.cause === 'lava' || e.cause === 'fire') particles.sparkle(e.x, e.y, 22, '#ffb35c', 4);
  if (e.cause === 'water') particles.sparkle(e.x, e.y + 0.3, 18, '#bff3ff', 3.5);
  if (e.cause === 'void') particles.sparkle(e.x, e.y, 22, '#c8b6ff', 2);
  sfx.death(e.cause);
  haptics.impact(1);
  camera.addTrauma(e.cause === 'fall' ? 0.3 : 0.7);
  if (e.cause !== 'fall') {
    particles.flash(e.x, e.y, 2.2, e.cause === 'lava' || e.cause === 'fire' ? '255,120,40' : '255,90,100', 0.3);
    camera.kick(0.06);
    hitStop(90);
  }
  state.flash = 1;
  ui.stars.forEach((s) => s.classList.remove('on'));
});

game.events.on('respawn', (e) => {
  visual.reset();
  state.sinceRespawn = 0;
  sfx.spawn();
  particles.ring(e.x, e.y, 0.9, 'rgba(255,255,255,0.7)', 0.4);
  particles.sparkle(e.x, e.y, 8, '#ffffff', 2);
  state.groundY = e.y - R;
  ui.stars.forEach((s) => s.classList.remove('on'));
});

game.events.on('win', (e) => {
  const swish = game.time - state.lastRimTime > 0.8;
  const h = game.level.hoop;
  state.swish = swish;
  if (!goalEffect(fx, look.goal, e.x, e.y - 0.4)) particles.confetti(e.x, e.y - 0.4, 80);
  state.goal = { x: h.centerX, y: h.rimY - 0.2, t0: state.time, swish };
  particles.ring(h.centerX, h.rimY, 1.4, swish ? 'rgba(255,214,90,0.95)' : 'rgba(255,255,255,0.9)', 0.5);
  particles.ring(h.centerX, h.rimY, 2.4, swish ? 'rgba(255,214,90,0.5)' : 'rgba(255,255,255,0.45)', 0.7);
  particles.flash(h.centerX, h.rimY, 3, swish ? '255,214,90' : '255,240,220', 0.4);
  state.goalFlash = 1;
  particles.text(e.x - 1.2, e.y + 2.2, gt(lang, swish ? 'popup.swish' : 'popup.score'), swish ? '#ffd65a' : '#ffffff', 1.15);
  sfx.win(swish);
  music.setDuck(0.45);
  music.setIntensity(0);
  haptics.goal(swish);
  // Effet de caméra : ralenti progressif, zoom sur le panier, secousse.
  // Panier parfait (sans toucher le cercle) : ralenti plus marqué, zoom plus serré, halo doré.
  camera.addTrauma(swish ? 0.4 : 0.32);
  camera.focus = { x: h.centerX - 1, y: h.rimY - 0.5 };
  camera.zoomTarget = swish ? 1.24 : 1.13;
  camera.kick(swish ? 0.07 : 0.05);
  timeFx.clear();
  if (swish) timeFx.slowmo(0.2, 0.45, 0.9, 0.08);
  else timeFx.slowmo(CONFIG.feel.winSlowMo, 0.25, 0.65, 0.06);
  state.glow = { rgb: swish ? '255,200,80' : '255,240,220', t0: state.time, dur: swish ? 1.6 : 0.9, k: swish ? 1 : 0.5 };
  if (swish) {
    particles.sparkle(h.centerX, h.rimY, 26, '#ffe27a', 5);
    particles.streaks(h.centerX, h.rimY, 0, 1, 14, 9, 'rgba(255,214,90,0.95)');
  }
  setTimeout(() => showWin(e), 1500);
});

// ─── Victoire ──────────────────────────────────────────────────────────────

const formatTime = (t) => {
  const m = Math.floor(t / 60);
  const s = t - m * 60;
  return `${m}:${s.toFixed(1).padStart(4, '0')}`;
};

/** Petite pastille « +60 XP · Hoop Pass » sur l'écran de victoire. */
function showPassXp(res) {
  let el = document.getElementById('win-pass-xp');
  if (!res) {
    if (el) el.hidden = true;
    return;
  }
  if (!el) {
    el = document.createElement('p');
    el.id = 'win-pass-xp';
    el.className = 'pass-xp';
    ui.winReward.insertAdjacentElement('afterend', el);
  }
  el.hidden = false;
  el.textContent = `+${res.gained} XP · Hoop Pass${res.to > res.from ? ` · ${lt(lang, 'pass.levelUp', { n: res.to })}` : ''}`;
}

function showWin(r) {
  const def = LEVELS[levelIndex];
  const world = WORLDS[def.worldIndex];
  const res = progress.complete(def.id, r.stars, r.time);
  const earned = wallet.reward(def.id, def.worldIndex, r.stars, !!state.swish);
  // Hoop Pass (saison en cours) : XP pour un niveau terminé, plus la première fois
  showPassXp(awardPassXp('level', { first: earned.lines.some(([k]) => k === 'first') }));
  // Statistiques (missions et succès)
  stats.add('goals', 1, false);
  stats.add('clears', 1, false);
  stats.add(`world.${def.world}`, 1, false);
  stats.add('stars', r.stars, false);
  stats.add('coins', earned.total, false);
  if (state.swish) stats.add('swishes', 1, false);
  if (state.runDeaths === 0) stats.add('noDeath', 1, false);
  stats.markLevel(def.id);
  stats.save();
  setTimeout(checkLive, 1600);
  ui.winReward.hidden = earned.total <= 0;
  ui.winCoinsN.textContent = '+0';
  ui.winCoins.setAttribute('aria-label', `+${earned.total}`);
  ui.winX2.classList.remove('show');
  countUp(ui.winCoinsN, earned.total, 900 + r.stars * 260);
  // Doubler les pièces avec une publicité (proposé, jamais imposé) : le bouton s'active une fois les
  // animations de victoire terminées
  state.winEarned = earned.total;
  state.doubled = false;
  ads.block('animation');
  setTimeout(() => {
    ads.unblock('animation');
    if (state.overlay === 'win' && earned.total > 0) ads.prepare('doubleCoins');
    updateAdButtons();
  }, 1700 + r.stars * 260);
  updateAdButtons();
  const lastOverall = levelIndex >= LEVELS.length - 1;
  const lastInWorld = def.indexInWorld === world.levels.length - 1;
  ui.winLevel.textContent = `${levelLabel(def)} · ${gt(lang, def.nameKey)}`;
  let title = state.swish ? 'win.perfect' : 'win.title';
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
      // Chaque étoile qui se pose lance une petite gerbe de confettis dorés
      const b = s.getBoundingClientRect();
      confetti.pop(b.left + b.width / 2, b.top + b.height / 2, 14, ['#ffd65a', '#fff3c4', '#ffb547']);
    }, 380 + i * 260);
  });
  // Musique de réussite (jingle du monde sur le motif du rebond) et confettis plein écran
  ui.win.classList.toggle('perfect', !!state.swish);
  music.stinger(state.swish ? 'perfect' : 'win', world.theme);
  confetti.celebrate(state.swish ? 1 : 0.7);
  openOverlay('win');
  (lastOverall ? ui.replay : ui.next).focus({ preventScroll: true });
}

/** Compteur de pièces qui défile, avec un petit tintement. */
function countUp(el, total, delay) {
  setTimeout(() => {
    const t0 = performance.now();
    const dur = 700;
    let lastTick = 0;
    let coinI = 0;
    const tick = (now) => {
      const k = Math.min(1, (now - t0) / dur);
      const v = Math.round(total * (1 - Math.pow(1 - k, 3)));
      el.textContent = `+${v}`;
      if (now - lastTick > 60 && k < 1) {
        sfx.coin(++coinI);
        lastTick = now;
      }
      if (k < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, delay);
}

// ─── Publicités récompensées : doubler les pièces, reprendre au drapeau ────

/** Met les boutons de publicité dans le bon état (prête, chargement, indisponible, limite du jour). */
function updateAdButtons() {
  // Victoire : doubler les pièces
  const st = state.doubled ? 'done' : ads.status('doubleCoins');
  const b = ui.btnDouble;
  b.dataset.state = st;
  b.disabled = st !== 'ready';
  ui.btnDoubleSub.textContent = gt(lang, {
    done: 'ad.doubled',
    ready: 'ad.double',
    blocked: 'ad.double',
    loading: 'ad.loading',
    unavailable: 'ad.unavailable',
    capped: 'ad.capped',
  }[st] ?? 'ad.double');
  // Échec : reprendre au drapeau. Sans publicité disponible, c'est offert (on ne punit jamais le joueur)
  const fs = ads.status('checkpoint');
  const free = fs === 'unavailable' || fs === 'capped';
  const c = ui.btnFailContinue;
  c.dataset.state = free ? 'free' : fs;
  c.disabled = !free && fs !== 'ready';
  ui.btnFailLabel.textContent = gt(lang, free ? 'ad.freeContinue' : 'ad.watch');
  ui.btnFailSub.textContent = gt(lang, free ? 'ad.freeNote' : fs === 'loading' ? 'ad.loading' : 'ad.checkpoint');
}
ads.onChange(() => updateAdButtons());

/** Pendant une publicité, le jeu se tait. */
async function watchAd(placement) {
  state.adBusy = true;
  const vol = settings.get('music');
  music.setVolume(0);
  sfx.setVolume(0);
  const res = await ads.showRewarded(placement);
  music.setVolume(vol);
  sfx.setVolume(settings.get('sfx'));
  state.adBusy = false;
  return res;
}

function adNote(card, key) {
  let n = card.querySelector('.ad-note');
  if (!n) {
    n = document.createElement('p');
    n.className = 'ad-note';
    const actions = card.querySelector('.actions');
    if (actions) actions.before(n);
    else card.appendChild(n);
  }
  n.textContent = gt(lang, key);
  n.classList.remove('show');
  void n.offsetWidth;
  n.classList.add('show');
}

async function doubleCoins() {
  if (state.doubled || state.adBusy || !state.winEarned) return;
  const res = await watchAd('doubleCoins');
  if (state.overlay !== 'win') return;
  if (res.status === 'rewarded') {
    // Récompense validée par le SDK : les pièces doublent, avec une petite fête
    const bonus = state.winEarned;
    wallet.addCoins(bonus);
    stats.add('coins', bonus);
    state.doubled = true;
    countFromTo(ui.winCoinsN, bonus, bonus * 2, 900);
    ui.winX2.classList.remove('show');
    void ui.winX2.offsetWidth;
    ui.winX2.classList.add('show');
    coinBurst(ui.winCoins);
    sfx.bonus();
    haptics.success();
  } else adNote(ui.win.querySelector('.card'), res.status === 'dismissed' ? 'ad.dismissed' : res.status === 'error' ? 'ad.error' : 'ad.unavailable');
  updateAdButtons();
}

/** Petites pièces qui jaillissent autour du compteur (bonus doublé). */
function coinBurst(anchor) {
  const r = anchor.getBoundingClientRect();
  for (let i = 0; i < 14; i++) {
    const c = document.createElement('span');
    c.className = 'burst-coin';
    const a = (i / 14) * Math.PI * 2;
    c.style.left = `${r.left + r.width / 2}px`;
    c.style.top = `${r.top + r.height / 2}px`;
    c.style.setProperty('--dx', `${Math.cos(a) * (60 + Math.random() * 50)}px`);
    c.style.setProperty('--dy', `${Math.sin(a) * (40 + Math.random() * 30) - 20}px`);
    document.body.appendChild(c);
    c.addEventListener('animationend', () => c.remove(), { once: true });
  }
}

function countFromTo(el, from, to, dur) {
  const t0 = performance.now();
  let lastTick = 0;
  const tick = (now) => {
    const k = Math.min(1, (now - t0) / dur);
    el.textContent = `+${Math.round(from + (to - from) * (1 - Math.pow(1 - k, 3)))}`;
    if (now - lastTick > 60 && k < 1) {
      sfx.star(2);
      lastTick = now;
    }
    if (k < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

// Échec avec un drapeau atteint
game.events.on('failed', (e) => {
  const def = LEVELS[levelIndex];
  ui.failLevel.textContent = `${levelLabel(def)} · ${gt(lang, def.nameKey)}`;
  ui.failBody.textContent = gt(lang, 'fail.body', { n: e.stars });
  ui.fail.querySelector('.ad-note')?.remove();
  openOverlay('fail');
  music.setDuck(0.45);
  sfx.fail();
  music.stinger('fail');
  ads.prepare('checkpoint');
  updateAdButtons();
  ui.btnFailRestart.focus({ preventScroll: true });
});

async function continueFromCheckpoint() {
  if (state.adBusy || state.overlay !== 'fail') return;
  const st = ads.status('checkpoint');
  const free = st === 'unavailable' || st === 'capped';
  if (!free) {
    const res = await watchAd('checkpoint');
    if (state.overlay !== 'fail') return;
    if (res.status !== 'rewarded') {
      // Plus aucune annonce au moment de la montrer : on ne bloque pas le joueur
      if (res.status === 'unavailable') return continueNow();
      adNote(ui.fail.querySelector('.card'), res.status === 'dismissed' ? 'ad.dismissed' : 'ad.error');
      return updateAdButtons();
    }
    sfx.bonus();
  }
  continueNow();
}

function continueNow() {
  closeOverlays();
  music.setDuck(1);
  if (game.continueFromCheckpoint()) haptics.success();
}

ui.btnDouble.addEventListener('click', doubleCoins);
ui.btnFailRestart.addEventListener('click', restart);
ui.btnFailContinue.addEventListener('click', continueFromCheckpoint);

// ─── Pause, overlays, enchaînement des niveaux ─────────────────────────────

const OVERLAYS = () => ({ pause: ui.pause, win: ui.win, fail: ui.fail });

function openOverlay(name) {
  state.overlay = name;
  document.body.classList.add('overlay-open');
  OVERLAYS()[name].classList.remove('hidden');
  input.enabled = false;
  input.releaseAll();
  sfx.wind(false);
}

function closeOverlays() {
  state.overlay = null;
  document.body.classList.remove('overlay-open');
  for (const el of Object.values(OVERLAYS())) el.classList.add('hidden');
  input.enabled = true;
}

function pause() {
  if (state.paused || game.state === 'won' || game.state === 'failed' || state.overlay || state.intro) return;
  state.paused = true;
  loop.stop();
  sfx.motion(0, 0); // la boucle s'arrête : on coupe aussi le roulement et le souffle
  music.setDuck(0.35);
  music.setIntensity(0);
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
  state.runDeaths = 0;
  stats.add('games');
  applyWorld(worldOf(index));
  music.setDuck(1);
  game.load(localizedLevel(index));
  renderer.setLevel(game.level);
  camera.resetEffects();
  camera.snap(game.body.x, game.body.y, game.level.bounds);
  camera.establish(0.9); // plan d'ouverture : l'image se resserre doucement sur le ballon
  timeFx.clear();
  loop.timeScale = 1;
  confetti.clear();
  state.glow = null;
  state.sinceRespawn = 0;
  state.rollAcc = 0;
  particles.items.forEach((p) => (p.alive = false));
  particles.texts.forEach((t) => (t.alive = false));
  fx.clear();
  trail.pts.length = 0;
  ghost.length = 0;
  tracks.length = 0;
  lastTrackX = -99;
  state.goal = null;
  state.goalFlash = 0;
  updateLevelLabels();
  const def = LEVELS[index];
  history.replaceState(null, '', `?world=${def.world}&level=${def.number}`);
  // « Niveaux » (pause, victoire) : la sélection des mondes du menu, ouverte sur ce monde
  for (const id of ['btn-pause-map', 'btn-win-map']) $(id).href = `index.html?world=${def.world}#mondes`;
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
  ui.introLevel.textContent = `${levelLabel(def)} · ${gt(lang, def.nameKey)} · ${gt(lang, `diff.${def.difficulty ?? 'medium'}`)}`;
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

// iPhone (WebKit) : le son ne peut démarrer que sur un geste « terminé » (doigt levé, clic, touche),
// pas au simple contact du doigt. On (re)déverrouille donc l'audio aussi à ces moments-là.
for (const ev of ['touchend', 'pointerup', 'click', 'keydown']) window.addEventListener(ev, () => sfx.unlock(), { passive: true, capture: true });

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
    if ((code === 'Escape' || code === 'KeyP') && state.overlay !== 'fail' && state.overlay !== 'win') (state.paused ? resume : pause)();
    else if (code === 'KeyR') restart();
    else if (code === 'Enter' && state.overlay === 'win') (ui.next.hidden ? restart : nextLevel)();
    else if ((code === 'Enter' || code === 'Space') && state.overlay === 'fail') restart();
    else if (code === 'Backquote' || code === 'F3') state.debug = !state.debug;
  },
});

// Les boutons des fenêtres doivent rester utilisables même quand le jeu ignore les touchers
for (const el of document.querySelectorAll('.overlay')) {
  el.addEventListener('pointerdown', (e) => {
    sfx.unlock();
    if (e.target.closest('button, a')) sfx.click(); // petit « pop » sur chaque bouton des fenêtres
  });
}
// Boutons du HUD (pause, recommencer) : même petit son
for (const b of [ui.pauseBtn, ui.restart]) b.addEventListener('pointerdown', () => sfx.click());

// ─── Sensations continues (étape 18) ────────────────────────────────────────

/** Surface sous le ballon (dernier contact par en dessous). */
function groundTag(b) {
  for (let i = 0; i < b.contactCount; i++) {
    const c = b.contacts[i];
    if (c.ny * b.gravitySign > 0.5) return c.collider.tag;
  }
  return state.groundTag ?? 'ground';
}

/**
 * À chaque image : son de roulement et de souffle, position d'écoute (stéréo), intensité de la
 * musique, particules de roulement propres au monde.
 */
function feelUpdate(dt, b, ctrl) {
  const playing = game.state === 'playing' && !state.paused && !state.intro && !state.overlay;
  if (b.grounded) state.groundTag = groundTag(b);
  const surface = surfaceOf(state.groundTag ?? 'ground', renderer.themeId);
  const rel = Math.abs(b.vx - (b.grounded ? b.groundVx : 0));
  const speed = Math.hypot(b.vx, b.vy);
  sfx.listen(camera.x, camera.halfWidth);
  sfx.motion(playing && b.grounded ? rel : 0, playing && !b.grounded ? speed : 0, surface);
  // Musique : la couche d'intensité monte avec la puissance et la vitesse
  state.musicAcc = (state.musicAcc ?? 0) + dt;
  if (state.musicAcc > 0.4) {
    state.musicAcc = 0;
    const k = playing ? Math.max(((ctrl.level - 1) / (MAX_LEVEL - 1)) * 0.9, clamp((speed - 3) / 9, 0, 1) * 0.7, 0.2) : 0;
    state.intensity = lerp(state.intensity ?? 0, k, 0.5);
    music.setIntensity(state.intensity);
  }
  // Roulement : poussière, neige, braises, brins d'herbe ou poussière d'étoiles derrière le ballon
  if (playing && b.grounded && rel > 2.2) {
    state.rollAcc = (state.rollAcc ?? 0) + dt * rel;
    while (state.rollAcc > 0.9) {
      state.rollAcc -= 0.9;
      worldFx.roll(renderer.themeId, surface, b.x, b.y - R * b.gravitySign, b.vx, rel);
      // Glace : rayures brillantes laissées par le ballon qui file
      if (surface === 'ice' && rel > 4 && Math.abs(b.x - lastTrackX) > 0.3) {
        tracks.push({ x: b.x, y: b.y - R, t: state.time, w: 0.35, ice: true });
        if (tracks.length > 90) tracks.shift();
        lastTrackX = b.x;
      }
    }
  }
}

/** Halo plein écran des grands moments (doré pour un panier parfait). */
function glowAmount() {
  const g = state.glow;
  if (!g) return null;
  const age = state.time - g.t0;
  if (age > g.dur) return null;
  const k = age < 0.1 ? age / 0.1 : 1 - (age - 0.1) / (g.dur - 0.1);
  return { rgb: g.rgb, k: k * g.k };
}

/** Bouton REBOND : onde lumineuse à chaque appui, couleur selon la puissance. */
function padHit(level) {
  const el = ui.padBounce;
  el.dataset.hit = String(level);
  el.classList.remove('hit');
  void el.offsetWidth;
  el.classList.add('hit');
}

// ─── Boucle ────────────────────────────────────────────────────────────────

function render(frameDt, alpha) {
  state.time += frameDt;
  music.update();
  loop.timeScale = timeFx.update(frameDt);
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
  camera.update(frameDt, { x: state.ball.x, y: state.ball.y, vx: b.vx, vy: b.vy, dir: game.playing ? ctrl.axis : 0, grounded: b.grounded, groundY: state.groundY }, game.level.bounds, fastFollow ? 0.35 : 1);
  feelUpdate(frameDt, b, ctrl);
  visual.update(frameDt, b);
  particles.update(frameDt * loop.timeScale);
  fx.update(frameDt * loop.timeScale);
  // Traînée : positions récentes du ballon (effacée quand il disparaît ou se téléporte)
  if (game.state === 'dying' || state.sinceTeleport < 0.05 || state.sinceRespawn < 0.05) trail.pts.length = 0;
  else if (trail.id !== 'trail-none') {
    trail.pts.push({ x: state.ball.x, y: state.ball.y });
    if (trail.pts.length > 16) trail.pts.shift();
    emitTrail(fx, trail.id, state.ball.x, state.ball.y, Math.hypot(b.vx, b.vy), frameDt);
  }

  // Traces dans la neige quand le ballon roule
  if (renderer.themeId === 'snow' && b.grounded && game.state === 'playing' && !b.groundVx && !b.groundVy && Math.abs(b.vx) > 0.5 && Math.abs(b.x - lastTrackX) > 0.34) {
    const m = b.groundMaterial;
    if (m !== CONFIG.materials.ice && m !== CONFIG.materials.wood && m !== CONFIG.materials.platform) {
      addTrack(b.x, b.y - R, 0.2);
      lastTrackX = b.x;
    }
  }
  if (game.state === 'dying' || state.sinceTeleport < 0.05 || state.sinceRespawn < 0.05) ghost.length = 0;
  else {
    ghost.push({ x: state.ball.x, y: state.ball.y });
    if (ghost.length > 6) ghost.shift();
  }

  // Jauge : visible dès qu'elle a monté, discrète au repos ; le dernier cran clignote avant de baisser
  const warn = ctrl.level > 1 && ctrl.decayIn < 0.35;
  const showGauge = game.state === 'playing' && (ctrl.level > 1 || state.sinceBounce < 1.2);
  state.gaugeAlpha = damp(state.gaugeAlpha, showGauge ? 1 : 0, showGauge ? 14 : 4, frameDt);
  updateRing(ctrl.level, warn);

  state.flash = Math.max(0, state.flash - frameDt * 2.5);
  // Temps de jeu (seulement quand on joue vraiment) et vérification des missions / succès
  if (game.state === 'playing' && !state.paused && !state.intro && !state.overlay) {
    state.playAcc += frameDt;
    if (state.playAcc >= 5) {
      stats.add('playTime', Math.floor(state.playAcc), true);
      state.playAcc -= Math.floor(state.playAcc);
    }
  }
  // Publicités : seulement depuis les écrans de victoire et d'échec, jamais pendant le jeu
  if (state.overlay === 'win' || state.overlay === 'fail') ads.unblock('playing');
  else ads.block('playing');
  state.liveTimer += frameDt;
  if (state.liveTimer > 1.2 && !state.overlay) {
    state.liveTimer = 0;
    checkLive();
  }
  state.goalFlash = Math.max(0, (state.goalFlash ?? 0) - frameDt * 4);

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
    fx,
    trail: trail.id !== 'trail-none' ? trail : null,
    ghost,
    tracks,
    goal: state.goal,
    goalFlash: state.goalFlash,
    glow: glowAmount(),
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
window.addEventListener('pagehide', () => stats.save());
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    stats.save();
    input.releaseAll();
    sfx.wind(false);
    sfx.suspend();
    confetti.clear();
    if (state.intro) loop.stop();
    else if (state.overlay !== 'win' && state.overlay !== 'fail') pause();
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
