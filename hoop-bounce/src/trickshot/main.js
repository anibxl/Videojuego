// Mode TRICKSHOT — écran de jeu : trickshot.html?level=N
//
// Le ballon est posé sur le pas de tir. Le joueur touche le ballon, puis tire vers l'arrière en continuant
// son geste N'IMPORTE OÙ sur l'écran (le doigt ne cache plus le ballon, la place ne manque jamais) :
// direction opposée = angle, longueur du geste = puissance. Relâcher : le ballon part. 3 essais pour marquer.
// Près du panier : léger ralenti, zoom, filet, particules, son. Réussite : étoiles, score, confettis.
//
// Réutilise le moteur et les systèmes du jeu (physique, rendu du ballon et des skins, particules,
// sons, musique, vibrations, réglages, objets équipés) ; la progression est propre au mode.

import { CONFIG } from '../config.js';
import { clamp, lerp } from '../core/math.js';
import { FixedLoop } from '../core/loop.js';
import { TimeFx } from '../core/time-fx.js';
import { Camera } from '../render/camera.js';
import { BallVisual } from '../render/ball-visual.js';
import { Particles } from '../render/particles.js';
import { WorldFx } from '../render/world-fx.js';
import { Confetti } from '../render/confetti.js';
import { Fx, goalEffect, bounceEffect, emitTrail } from '../render/cosmetics.js';
import { Sfx, surfaceOf } from '../audio/sfx.js';
import { Music } from '../audio/music.js';
import { Haptics } from '../platform/haptics.js';
import { Settings } from '../shared/settings.js';
import { Wallet } from '../shared/wallet.js';
import { TS_LEVELS } from './levels.js';
import { TrickshotGame, DT } from './game.js';
import { TRICKSHOT, DIFFICULTIES, chapterOf } from './config.js';
import { aimFromDrag, trajectory } from './aim.js';
import { TrickshotProgress } from './progress.js';
import { ArenaRenderer } from './render.js';
import { tt, pick } from './i18n.js';
import { awardPassXp } from '../shared/pass.js';
import { Stats } from '../shared/stats.js';
import { Achievements } from '../shared/achievements.js';
import { UnlockCards } from '../shared/unlock-card.js';
import { Progress } from '../game/progress.js';
import { WORLDS } from '../game/worlds.js';
import { trickshotChallenges } from '../game/challenge-tracker.js';

const $ = (id) => document.getElementById(id);
const settings = new Settings();
const lang = settings.get('lang');
const t = (k, v) => tt(lang, k, v);
const progress = new TrickshotProgress({ total: TS_LEVELS.length });
const params = new URLSearchParams(location.search);

// Niveau demandé (s'il est débloqué), sinon le prochain à jouer
let n = parseInt(params.get('level') ?? '', 10);
if (!Number.isInteger(n) || n < 1 || n > TS_LEVELS.length || (!progress.isUnlocked(n) && !params.has('unlock'))) n = progress.next();

// ─── Textes statiques ───────────────────────────────────────────────────────
document.documentElement.lang = lang;
for (const el of document.querySelectorAll('[data-t]')) el.textContent = t(el.dataset.t);
for (const el of document.querySelectorAll('[data-t-html]')) el.innerHTML = t(el.dataset.tHtml);
for (const el of document.querySelectorAll('[data-label]')) {
  el.setAttribute('aria-label', t(el.dataset.label));
  el.title = t(el.dataset.label);
}

// ─── Systèmes ───────────────────────────────────────────────────────────────
const canvas = $('game');
let def = TS_LEVELS[n - 1];
let game = new TrickshotGame(def);
const wallet = new Wallet();
// Succès (phase 5) : Trickshots réussis, défis cachés, animation de déblocage
const stats = new Stats();
const achievements = new Achievements();
const tsLaunches = new Map(); // tirs lancés sur chaque carte depuis l'ouverture de la page
let unlockCards = null;
function announceAchievements() {
  try {
    const fresh = achievements.newlyUnlocked({ stats, wallet: new Wallet(), progress: new Progress(WORLDS), trickshot: progress });
    if (!fresh.length) return;
    unlockCards ??= new UnlockCards({ lang: () => lang, sound: (hidden) => sfx.achievement?.(hidden), vibrate: () => haptics.success?.() });
    unlockCards.show(fresh);
  } catch {
    /* sauvegarde indisponible */
  }
}
const look = { ball: wallet.equipped('ball'), bounce: wallet.equipped('bounce'), trail: wallet.equipped('trail'), goal: wallet.equipped('goal') };
const renderer = new ArenaRenderer(canvas, game.level, { accent: chapterOf(n).accent, number: n });
renderer.setBallSkin(look.ball);
renderer.particleDensity = { low: 0.4, medium: 0.7, high: 1 }[settings.get('quality')] ?? 1;
const camera = new Camera({ ...CONFIG.camera, smoothTimeX: 0.3, smoothTimeY: 0.3, lookAhead: 0, maxLookAhead: 0, verticalDeadZone: 0, shakeMax: 0.14 });
const visual = new BallVisual(CONFIG.feel);
const particles = new Particles();
const worldFx = new WorldFx(particles);
const fx = new Fx();
const timeFx = new TimeFx();
const confetti = new Confetti($('confetti'));
const sfx = new Sfx();
const music = new Music(sfx);
const haptics = new Haptics();
sfx.setVolume(settings.get('sfx'));
music.setVolume(settings.get('music'));
haptics.enabled = settings.get('vibration');
const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)');
camera.motionScale = reduced?.matches ? 0.4 : 1;

const state = {
  time: 0,
  aim: null,          // visée en cours { pointerId, angle, power, valid }
  goal: null,
  goalFlash: 0,
  flash: 0,
  glow: null,
  nearGoal: false,
  overlay: null,
  paused: false,
  trail: { id: look.trail, pts: [] },
  lastTick: -1,
};

// ─── Cadrage : toute l'arène à l'écran (avec une marge pour l'interface) ─────
function frameArena() {
  const W = game.width;
  const H = game.height;
  camera.cfg = { ...camera.cfg, viewHeight: H + 1.4, minViewWidth: W + 0.8 };
  camera.setViewport(window.innerWidth, window.innerHeight);
  camera.focus = { x: W / 2, y: H / 2 - 0.2 };
}

function resize() {
  renderer.resize(window.innerWidth, window.innerHeight);
  frameArena();
}
window.addEventListener('resize', resize);
window.visualViewport?.addEventListener('resize', resize);

// ─── Interface ──────────────────────────────────────────────────────────────
function applyLevelUI() {
  const ch = chapterOf(n);
  const d = DIFFICULTIES[def.diff];
  document.body.style.setProperty('--accent', ch.accent);
  document.body.style.setProperty('--diff', d.color);
  document.body.dataset.diff = def.diff;
  $('diff-label').textContent = t(`diff.${def.diff}`);
  $('level-label').textContent = `${t('level', { n })} · ${pick(def.name, lang)}`;
  const chip = $('diff-chip');
  chip.style.animation = 'none';
  void chip.offsetWidth;
  chip.style.animation = '';
  // Carte d'introduction : numéro, nom, nouveauté et astuce
  $('intro-num').textContent = `${t(`chapter.${ch.id}`)} · ${t('level', { n })}`;
  $('intro-name').textContent = pick(def.name, lang);
  const intro = (def.intro ?? []).filter((m) => m !== 'aim');
  $('intro-new').hidden = !intro.length;
  $('intro-new').textContent = intro.length ? `${t('new')} : ${intro.map((m) => t(`mech.${m}`)).join(' · ')}` : '';
  $('intro-hint').hidden = !def.hint;
  $('intro-hint').textContent = pick(def.hint, lang);
  const card = $('intro-card');
  card.classList.remove('show');
  void card.offsetWidth;
  card.classList.add('show');
  for (const id of ['win-level', 'fail-level']) $(id).textContent = `${t('level', { n })} · ${pick(def.name, lang)} · ${t(`diff.${def.diff}`)}`;
  history.replaceState(null, '', `?level=${n}`);
  updateShots();
}

function updateShots() {
  const used = game.shotsUsed;
  const balls = [...$('shots').children];
  balls.forEach((b, i) => {
    b.classList.toggle('used', i < used);
    b.classList.toggle('current', i === used && game.state === 'aiming');
  });
  $('shots').classList.toggle('last', game.shotsLeft === 1);
}

let toastTimer = 0;
function toast(text, warn = false) {
  const el = $('toast');
  el.textContent = text;
  el.classList.toggle('warn', warn);
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 1600);
}

// ─── Visée (lance-pierre) ───────────────────────────────────────────────────
function screenToWorld(p) {
  return { x: camera.x + (p.x - camera.width / 2) / camera.scale, y: camera.y - (p.y - camera.height / 2) / camera.scale };
}

function toWorld(e) {
  const r = canvas.getBoundingClientRect();
  const sx = e.clientX - r.left;
  const sy = e.clientY - r.top;
  return { x: camera.x + (sx - camera.width / 2) / camera.scale, y: camera.y - (sy - camera.height / 2) / camera.scale };
}

const screenPoint = (e) => {
  const r = canvas.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
};
/** Longueur du geste (px) qui donne la pleine puissance : une part fixe de l'écran. */
const pullPx = () => TRICKSHOT.pullScreen * Math.min(camera.width, camera.height);

canvas.addEventListener('pointerdown', (e) => {
  sfx.unlock();
  if (state.overlay || state.paused || game.state !== 'aiming' || state.aim) return;
  const p = toWorld(e);
  const tee = game.tee;
  // Saisir le ballon (zone généreuse autour de lui)
  const reach = Math.max(TRICKSHOT.grabRadius, TRICKSHOT.grabRadiusPx / camera.scale);
  if (Math.hypot(p.x - tee.x, p.y - tee.y) > reach) {
    toast(t('aim.grab'));
    return;
  }
  e.preventDefault();
  try {
    canvas.setPointerCapture(e.pointerId);
  } catch {
    /* sans importance */
  }
  // Le geste part de l'endroit touché : seul le déplacement du doigt compte ensuite
  state.aim = { pointerId: e.pointerId, start: screenPoint(e), finger: screenPoint(e), dx: 0, dy: 0, angle: 0, power: 0, valid: false };
  sfx.ui?.select(0);
  haptics.tap();
});

canvas.addEventListener('pointermove', (e) => {
  const a = state.aim;
  if (!a || e.pointerId !== a.pointerId) return;
  // Déplacement du doigt depuis le point de départ (écran, y vers le bas) → tirage en unités de référence
  const f = screenPoint(e);
  a.finger = f;
  const k = TRICKSHOT.maxDrag / pullPx();
  const dx = (f.x - a.start.x) * k;
  const dy = -(f.y - a.start.y) * k;
  Object.assign(a, { dx, dy }, aimFromDrag(dx, dy));
  // Tension de l'élastique : un « tic » par palier de 10 % de puissance
  const step = Math.floor(a.power * 10);
  if (step !== state.lastTick) {
    state.lastTick = step;
    if (step > 0) sfx.ui?.tick(a.power);
    if (step >= 9) haptics.tap();
    if (step >= 10) sfx.labCharge?.();
  }
});

function release(e) {
  const a = state.aim;
  if (!a || (e && e.pointerId !== a.pointerId)) return;
  state.aim = null;
  state.lastTick = -1;
  if (!a.valid || game.state !== 'aiming') {
    if (a.power > 0.02) toast(t('aim.cancel'));
    return;
  }
  game.launch(a.angle, a.power);
}
canvas.addEventListener('pointerup', release);
canvas.addEventListener('pointercancel', () => {
  state.aim = null;
});

// Clavier (ordinateur, pour tester) : ← → angle, ↑ ↓ puissance, Espace tirer, R recommencer, Échap pause
const keyAim = { angle: Math.PI / 4, power: 0.6 };
window.addEventListener('keydown', (e) => {
  sfx.unlock();
  if (e.code === 'Escape' || e.code === 'KeyP') return state.overlay === 'pause' ? resume() : pause();
  if (e.code === 'KeyR') return restartLevel();
  if (state.overlay === 'win' && e.code === 'Enter') return nextLevel();
  if (state.overlay || game.state !== 'aiming') return;
  const step = e.shiftKey ? 0.2 : 1;
  if (e.code === 'ArrowLeft') keyAim.angle += (Math.PI / 180) * step;
  else if (e.code === 'ArrowRight') keyAim.angle -= (Math.PI / 180) * step;
  else if (e.code === 'ArrowUp') keyAim.power = clamp(keyAim.power + 0.01 * step, 0.1, 1);
  else if (e.code === 'ArrowDown') keyAim.power = clamp(keyAim.power - 0.01 * step, 0.1, 1);
  else if (e.code === 'Space') {
    e.preventDefault();
    game.launch(keyAim.angle, keyAim.power);
    state.keyAim = false;
    return;
  } else return;
  e.preventDefault();
  state.keyAim = true;
});

// ─── Événements de la partie ────────────────────────────────────────────────
function bindGame() {
  const ev = game.events;
  ev.on('launch', (e) => {
    tsLaunches.set(n, (tsLaunches.get(n) ?? 0) + 1);
    sfx.launch?.(e.power);
    haptics.bounce(e.power > 0.8 ? 5 : 3);
    visual.onBounce();
    particles.ring(e.x, e.y - 0.3, 0.6 + e.power, `rgba(${chapterOf(n).accent},0.8)`, 0.35);
    particles.streaks(e.x, e.y, -e.vx / 30, -e.vy / 30, 6, 4 + e.power * 4, 'rgba(255,255,255,0.7)');
    state.nearGoal = false;
    state.trail.pts.length = 0;
    updateShots();
  });
  ev.on('impact', (e) => {
    const strength = clamp(e.speed / 18, 0, 1);
    visual.onImpact(e.speed, e.nx, e.ny);
    sfx.impact(e.speed, e.tag, e.x);
    haptics.impact(strength);
    if (e.tag !== 'rim' && e.tag !== 'backboard' && e.speed > 4) {
      particles.dust(e.x, e.y, e.nx, e.ny, strength * 0.8, 'rgba(200,220,255,0.6)');
      if (e.ny > 0.5) worldFx.impact('city', surfaceOf(e.tag, 'city'), e.x, e.y, strength * 0.7);
    }
    if (e.speed > 6) bounceEffect(fx, look.bounce, e.x, e.y, Math.min(5, 1 + Math.floor(e.speed / 5)));
    // Bumper : éclat et petit coup de caméra
    const solid = game.level.solids.find((s) => s.style === 'bumper' && e.x > s.x0 - 0.5 && e.x < s.x1 + 0.5 && e.y > s.y0 - 0.5 && e.y < s.y1 + 0.5);
    if (solid) {
      renderer.flashBumper(e.x, e.y);
      sfx.labZap?.(e.x);
      particles.sparkle(e.x, e.y, 10, '#ff8ad0', 3);
      camera.addTrauma(0.08);
    }
  });
  ev.on('trampoline', (e) => {
    sfx.trampoline();
    haptics.impact(0.6);
    particles.ring(e.x, e.y, 1.0, 'rgba(166,255,230,0.95)', 0.45);
    visual.onImpact(14, 0, 1);
  });
  ev.on('switch', (e) => {
    sfx.switchOn();
    haptics.success();
    particles.sparkle(e.x, e.y + 0.3, 14, '#ffe0a3', 2.8);
    if (e.doors.length) setTimeout(() => sfx.door(), 120);
    camera.addTrauma(0.06);
  });
  ev.on('break', (e) => {
    sfx.crumble();
    sfx.crateHit();
    haptics.impact(0.8);
    camera.addTrauma(0.18);
    camera.kick(0.03);
    particles.bits(e.x, e.y, 22, ['#d9a25a', '#8a5a26', '#f0c58a'], { speed: 4, up: 3, gravity: 18, life: 0.9, size: 0.12, kind: 1 });
    particles.puff(e.x, e.y, 4, '200,170,130', 0.5, 1.6, 0.6);
  });
  ev.on('teleport', (e) => {
    sfx.teleport();
    haptics.impact(0.5);
    particles.sparkle(e.from.x, e.from.y, 14, '#d6c8ff', 3.5);
    particles.ring(e.to.x, e.to.y, 1.1, 'rgba(200,180,255,0.95)', 0.45);
    particles.sparkle(e.to.x, e.to.y, 14, '#d6c8ff', 3.5);
    state.trail.pts.length = 0;
  });
  ev.on('crumble', (e) => {
    sfx.crumble(e.x);
    particles.dust(e.x, e.y, 0, -1, 0.9, 'rgba(200,170,140,0.9)');
  });
  ev.on('fanEnter', () => sfx.wind(true));
  ev.on('fanExit', () => sfx.wind(false));
  ev.on('gravityFlip', (e) => {
    sfx.gravityFlip(e.sign < 0);
    particles.ring(e.x, e.y, 0.9, 'rgba(210,180,255,0.9)', 0.4);
  });
  ev.on('death', (e) => {
    particles.burst(e.x, e.y, e.vx, e.vy);
    if (e.cause === 'lava' || e.cause === 'fire' || e.cause === 'cannon') particles.sparkle(e.x, e.y, 22, '#ffb35c', 4);
    sfx.death(e.cause);
    sfx.wind(false);
    haptics.impact(1);
    camera.addTrauma(0.4);
    state.flash = 1;
  });
  ev.on('shotEnd', (e) => {
    sfx.spawn();
    particles.ring(game.tee.x, game.tee.y, 0.9, 'rgba(255,255,255,0.7)', 0.4);
    state.nearGoal = false;
    camera.focus = { x: game.width / 2, y: game.height / 2 - 0.2 };
    camera.zoomTarget = 1;
    updateShots();
    if (e.shotsLeft === 1) toast(t('shot.last'), true);
    else toast(t('shot.left', { n: e.shotsLeft }));
  });
  ev.on('failed', () => {
    sfx.fail();
    music.stinger('fail', 'arena');
    progress.played(n);
    setTimeout(() => openOverlay('fail'), 700);
    updateShots();
  });
  ev.on('win', (e) => onWin(e));
}

// ─── Moments forts ──────────────────────────────────────────────────────────
function nearGoalCheck() {
  if (state.nearGoal || game.state !== 'playing') return;
  const b = game.body;
  const h = game.level.hoop;
  const dx = b.x - h.centerX;
  const dy = b.y - h.rimY;
  // Le ballon arrive au-dessus du cercle en descendant : ralenti et zoom sur le panier, d'autant plus
  // marqués que le tir est spectaculaire (rebonds, portails, boutons, caisses enchaînés)
  if (Math.abs(dx) < 2.2 && dy > -0.2 && dy < 2.6 && b.vy * b.gravitySign < 0) {
    state.nearGoal = true;
    const sp = game.spectacle();
    camera.focus = goalFocus(h, 0.4);
    if (sp >= 3) {
      timeFx.slowmo(0.22, 0.4, 0.7, 0.06);
      camera.zoomTarget = 1.5;
      camera.addTrauma(0.05);
      sfx.labTrick?.(2);
    } else if (sp >= 1) {
      timeFx.slowmo(0.4, 0.3, 0.5, 0.08);
      camera.zoomTarget = 1.3;
      sfx.labTrick?.(1);
    } else {
      timeFx.slowmo(0.6, 0.2, 0.35, 0.08);
      camera.zoomTarget = 1.12;
      sfx.ui?.select(3);
    }
  }
}

/** Cadrage du zoom sur le panier, sans faire sortir le haut ou le bas de la salle de l'écran. */
function goalFocus(h, dy) {
  const half = (game.height + 1.4) / 2 / 1.5;
  return { x: h.centerX, y: clamp(h.rimY + dy, half - 0.6, game.height - half + 0.6) };
}

function onWin(e) {
  const r = game.result;
  const perfect = r.stars === 3;
  const spectacular = r.spectacle >= 3;
  const h = game.level.hoop;
  renderer.flashNet?.(1);
  state.goal = { x: h.centerX, y: h.rimY - 0.2, t0: state.time, swish: r.swish };
  state.goalFlash = 1;
  state.glow = { rgb: perfect ? '255,200,80' : chapterOf(n).accent, t0: state.time, dur: perfect ? 1.6 : 1, k: perfect ? 1 : 0.6 };
  if (!goalEffect(fx, look.goal, e.x, e.y - 0.4)) particles.confetti(e.x, e.y - 0.4, 80);
  particles.ring(h.centerX, h.rimY, 1.4, 'rgba(255,214,90,0.95)', 0.5);
  particles.ring(h.centerX, h.rimY, 2.6, 'rgba(255,214,90,0.5)', 0.7);
  particles.sparkle(h.centerX, h.rimY, perfect ? 30 : 16, '#ffe27a', 5);
  // Laboratoire : onde de choc à la couleur du chapitre, étincelles électriques
  particles.ring(h.centerX, h.rimY, 3.6, `rgba(${chapterOf(n).accent},0.55)`, 0.8);
  particles.sparkle(h.centerX, h.rimY - 0.3, spectacular ? 26 : 12, `rgb(${chapterOf(n).accent})`, 6);
  if (spectacular) particles.streaks(h.centerX, h.rimY, 0, 1, 14, 9, 'rgba(255,240,200,0.85)');
  const high = h.rimY > game.height - 4.2; // panier près du plafond : le texte s'affiche dessous
  particles.text(h.centerX - 1.2, high ? h.rimY - 2.2 : h.rimY + 2.2, spectacular || perfect ? 'TRICKSHOT!' : r.swish ? 'SWISH!' : 'NICE!', spectacular || perfect ? '#ffd65a' : '#ffffff', 1.1);
  if (sfx.labGoal) sfx.labGoal(spectacular || perfect);
  else sfx.win(perfect || r.swish);
  if (perfect) sfx.crowd?.();
  music.setDuck(0.45);
  haptics.goal(perfect);
  camera.addTrauma(perfect ? 0.45 : 0.32);
  camera.kick(perfect ? 0.08 : 0.05);
  camera.focus = goalFocus(h, 0.3);
  camera.zoomTarget = perfect ? 1.4 : 1.25;
  timeFx.clear();
  timeFx.slowmo(perfect || spectacular ? 0.18 : 0.3, perfect || spectacular ? 0.5 : 0.3, 0.8, 0.06);
  const firstWin = !progress.isDone(n);
  const before = progress.level(n);
  const rec = progress.record(n, { stars: r.stars, score: r.score });
  // Succès : un Trickshot de plus, défis cachés (dernier tir, premier coup, billard)
  try {
    stats.add('trickshots');
    const playsBefore = before.plays + Math.max(0, (tsLaunches.get(n) ?? 1) - r.shots);
    for (const id of trickshotChallenges(r, { maxShots: TRICKSHOT.shots, playsBefore, wasDone: before.stars > 0 })) achievements.recordChallenge(id);
  } catch {
    /* sauvegarde indisponible */
  }
  setTimeout(announceAchievements, 2600);
  rec.passXp = awardPassXp('trickshot', { first: firstWin }); // Hoop Pass : XP d'un Trickshot réussi
  setTimeout(() => showWin(r, rec), 1500);
}

function showWin(r, rec) {
  const card = document.querySelector('.win-card');
  card.classList.toggle('perfect', r.stars === 3);
  $('win-title').textContent = t(`win.${r.stars}`);
  $('win-sub').textContent = t(`win.sub.${r.stars}`);
  const stars = [...$('win-stars').children];
  stars.forEach((s) => s.classList.remove('on'));
  stars.forEach((s, i) => {
    if (i < r.stars) setTimeout(() => {
      s.classList.add('on');
      sfx.star(i + 1);
      haptics.light();
      // Trois étoiles : accord final et vibration un peu plus franche, juste après la dernière étoile
      if (i === 2) setTimeout(() => {
        sfx.threeStars?.();
        haptics.success?.();
      }, 220);
      const b = s.getBoundingClientRect();
      confetti.pop(b.left + b.width / 2, b.top + b.height / 2, 14, ['#ffd65a', '#fff3c4', '#ffb547']);
    }, 380 + i * 260);
  });
  // Score qui défile + bonus de style
  const list = $('win-bonus');
  list.innerHTML = '';
  const items = [['★'.repeat(r.stars), r.stars * 1000, true]];
  for (const [k, v] of Object.entries(r.bonus)) if (v > 0) items.push([t(`bonus.${k}`), v, k === 'swish']);
  items.forEach(([label, v, gold], i) => {
    const li = document.createElement('li');
    li.textContent = `${label} +${v.toLocaleString(lang)}`;
    if (gold) li.className = 'gold';
    li.style.animationDelay = `${0.9 + i * 0.12}s`;
    list.appendChild(li);
  });
  countUp($('win-score'), r.score, 800);
  $('win-record').hidden = !rec.newBest || progress.level(n).plays <= 1;
  $('win-record').textContent = t('record');
  const last = n >= TS_LEVELS.length;
  $('win-unlocked').hidden = !rec.unlocked && !last;
  $('win-unlocked').textContent = last ? t('allDone') : t('unlocked', { n: rec.unlocked });
  $('btn-next').hidden = last;
  // Hoop Pass : XP gagnée par ce Trickshot
  let px = document.getElementById('win-pass-xp');
  if (!px) {
    px = document.createElement('p');
    px.id = 'win-pass-xp';
    px.className = 'pass-xp';
    $('win-unlocked').insertAdjacentElement('afterend', px);
  }
  px.hidden = !rec.passXp;
  if (rec.passXp) px.textContent = `+${rec.passXp.gained} XP · Hoop Pass${rec.passXp.to > rec.passXp.from ? ` · ${t('passLevel', { n: rec.passXp.to })}` : ''}`;
  music.stinger(r.stars === 3 ? 'perfect' : 'win', 'arena');
  confetti.celebrate(r.stars === 3 ? 1 : 0.6);
  openOverlay('win');
  $('btn-next').focus({ preventScroll: true });
}

function countUp(el, total, delay) {
  el.textContent = '0';
  setTimeout(() => {
    const t0 = performance.now();
    let last = 0;
    let i = 0;
    const tick = (now) => {
      const k = Math.min(1, (now - t0) / 900);
      el.textContent = Math.round(total * (1 - Math.pow(1 - k, 3))).toLocaleString(lang);
      if (now - last > 60 && k < 1) {
        sfx.coin(++i);
        last = now;
      }
      if (k < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, delay);
}

// ─── Fenêtres, pause, enchaînement ──────────────────────────────────────────
function openOverlay(name) {
  state.overlay = name;
  document.body.classList.add('overlay-open');
  for (const id of ['pause', 'win', 'fail']) $(id).classList.toggle('hidden', id !== name);
  sfx.wind(false);
  sfx.motion(0, 0);
}

function closeOverlays() {
  state.overlay = null;
  document.body.classList.remove('overlay-open');
  for (const id of ['pause', 'win', 'fail']) $(id).classList.add('hidden');
}

function pause() {
  if (state.overlay) return;
  state.paused = true;
  loop.stop();
  music.setDuck(0.35);
  openOverlay('pause');
}

function resume() {
  if (state.overlay !== 'pause') return;
  state.paused = false;
  closeOverlays();
  music.setDuck(1);
  loop.start();
}

function loadLevel(index) {
  n = index;
  def = TS_LEVELS[n - 1];
  game = new TrickshotGame(def);
  bindGame();
  renderer.accent = chapterOf(n).accent;
  renderer.number = n;
  ArenaRenderer._pending = { accent: chapterOf(n).accent, number: n };
  renderer.setLevel(game.level);
  frameArena();
  camera.resetEffects();
  camera.snap(game.width / 2, game.height / 2, game.level.bounds);
  camera.establish(0.92);
  camera.focus = { x: game.width / 2, y: game.height / 2 - 0.2 };
  timeFx.clear();
  particles.items.forEach((p) => (p.alive = false));
  particles.texts.forEach((p) => (p.alive = false));
  fx.clear();
  confetti.clear();
  state.goal = null;
  state.glow = null;
  state.aim = null;
  state.nearGoal = false;
  state.trail.pts.length = 0;
  closeOverlays();
  state.paused = false;
  music.setDuck(1);
  applyLevelUI();
  loop.start();
}

function restartLevel() {
  if (game.state === 'won' && state.overlay !== 'win') return;
  loadLevel(n);
  sfx.ui?.back();
}

function nextLevel() {
  if (n >= TS_LEVELS.length) return;
  $('fade').classList.remove('out');
  setTimeout(() => {
    loadLevel(n + 1);
    $('fade').classList.add('out');
  }, 260);
}

$('btn-pause').addEventListener('click', pause);
$('btn-resume').addEventListener('click', resume);
$('btn-restart').addEventListener('click', restartLevel);
$('btn-pause-restart').addEventListener('click', restartLevel);
$('btn-replay').addEventListener('click', restartLevel);
$('btn-retry').addEventListener('click', restartLevel);
$('btn-next').addEventListener('click', nextLevel);
for (const b of document.querySelectorAll('button')) b.addEventListener('pointerdown', () => sfx.click());
for (const a of document.querySelectorAll('a[href]')) {
  a.addEventListener('click', (e) => {
    e.preventDefault();
    $('fade').classList.remove('out');
    music.fadeOut?.(0.28);
    setTimeout(() => (location.href = a.getAttribute('href')), 300);
  });
}
// iPhone (WebKit) : le son ne démarre que sur un geste « terminé »
for (const ev of ['touchend', 'pointerup', 'click', 'keydown']) window.addEventListener(ev, () => sfx.unlock(), { passive: true, capture: true });

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    sfx.wind(false);
    sfx.suspend();
    if (!state.overlay) pause();
  }
});

// ─── Boucle ────────────────────────────────────────────────────────────────
const ball = { x: 0, y: 0, angle: 0, r: CONFIG.ball.radius, scale: 1 };

function render(frameDt, alpha) {
  state.time += frameDt;
  music.update();
  loop.timeScale = timeFx.update(frameDt);
  const b = game.body;
  const p = game.prev;
  ball.x = lerp(p.x, b.x, alpha);
  ball.y = lerp(p.y, b.y, alpha);
  ball.angle = lerp(p.angle, b.angle, alpha);
  ball.scale = game.state === 'dying' ? 0 : 1;

  // Visée : le ballon suit l'élastique, les pointillés montrent le début de la trajectoire
  let aim = null;
  const a = state.aim ?? (state.keyAim && game.state === 'aiming' ? { ...keyAim, valid: true, dx: -Math.cos(keyAim.angle) * keyAim.power * TRICKSHOT.maxDrag, dy: -Math.sin(keyAim.angle) * keyAim.power * TRICKSHOT.maxDrag } : null);
  if (a && game.state === 'aiming' && a.power > 0) {
    const tee = game.tee;
    const len = Math.hypot(a.dx, a.dy) || 1;
    const pullLen = Math.min(len, TRICKSHOT.maxDrag) * 0.3;
    // Le ballon suit l'élastique, sans jamais s'enfoncer dans le sol sous le socle
    const pull = { x: tee.x + (a.dx / len) * pullLen, y: Math.max(tee.y - 0.25, tee.y + (a.dy / len) * pullLen) };
    ball.x = pull.x;
    ball.y = pull.y;
    const slow = 1 / Math.sqrt(game.level.gravityScale ?? 1); // gravité réduite : vol plus lent
    // Pointillés : seulement le début de l'arc (longueur fixe), jamais les rebonds → une aide, pas une garantie
    const pts = a.valid ? trajectory(game.level, tee, a.angle, a.power, { maxTime: 2 * slow, step: slow / 40, maxLength: TRICKSHOT.previewLength }) : [];
    // Repère du geste à l'écran (là où est le doigt, loin du ballon) : point de départ et doigt
    const touch = a.start ? { start: screenToWorld(a.start), finger: screenToWorld(a.finger), radius: pullPx() / camera.scale } : null;
    aim = { from: tee, pull, power: a.power, angle: a.angle, valid: a.valid, pts, touch };
  }

  nearGoalCheck();
  camera.update(frameDt, { x: ball.x, y: ball.y, vx: 0, vy: 0, grounded: true, groundY: ball.y }, game.level.bounds, 1);
  visual.update(frameDt, b);
  particles.update(frameDt * loop.timeScale);
  fx.update(frameDt * loop.timeScale);
  // Traînée équipée (boutique)
  if (game.state === 'playing' && state.trail.id !== 'trail-none') {
    state.trail.pts.push({ x: ball.x, y: ball.y });
    if (state.trail.pts.length > 16) state.trail.pts.shift();
    emitTrail(fx, state.trail.id, ball.x, ball.y, Math.hypot(b.vx, b.vy), frameDt);
  } else if (game.state !== 'won') state.trail.pts.length = 0;
  // Son de roulement et de souffle, comme dans le jeu
  sfx.listen(camera.x, camera.halfWidth);
  const flying = game.state === 'playing';
  sfx.motion(flying && b.grounded ? Math.abs(b.vx) : 0, flying && !b.grounded ? Math.hypot(b.vx, b.vy) : 0, 'court');

  state.flash = Math.max(0, state.flash - frameDt * 2.5);
  state.goalFlash = Math.max(0, state.goalFlash - frameDt * 4);
  let glow = null;
  if (state.glow) {
    const age = state.time - state.glow.t0;
    if (age < state.glow.dur) glow = { rgb: state.glow.rgb, k: (age < 0.1 ? age / 0.1 : 1 - (age - 0.1) / (state.glow.dur - 0.1)) * state.glow.k };
  }

  renderer.draw({
    frameDt,
    time: state.time,
    renderTime: game.time - (1 - alpha) * DT,
    camera,
    level: game.level,
    state: game.state === 'aiming' ? 'playing' : game.state,
    body: b,
    ball,
    ballVisible: game.state !== 'dying',
    visual,
    particles,
    fx,
    trail: state.trail.id !== 'trail-none' && state.trail.pts.length > 2 ? state.trail : null,
    goal: state.goal,
    goalFlash: state.goalFlash,
    glow,
    flash: state.flash,
    tee: game.tee,
    aiming: game.state === 'aiming',
    aim,
  });
}

const loop = new FixedLoop({ dt: DT, update: (dt) => game.fixedUpdate(dt), render });

// ─── Démarrage ──────────────────────────────────────────────────────────────
bindGame();
resize();
camera.snap(game.width / 2, game.height / 2, game.level.bounds);
camera.establish(0.92);
sfx.flavor = 'arena';
music.play('arena');
applyLevelUI();
loop.start();
requestAnimationFrame(() => $('fade').classList.add('out'));

// Accès pour les tests automatisés et le réglage
window.__ts = { get game() { return game; }, camera, loop, renderer, progress, loadLevel, TS_LEVELS, sfx, music, state };
