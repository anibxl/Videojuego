// Carte des mondes : les 5 mondes à faire défiler, leur illustration animée, cadenas et animation
// de déblocage, progression (barre, étoiles, pourcentage) et choix du niveau.
//
// ?unlock=all : mode test, tous les mondes et niveaux ouverts (rien n'est enregistré en plus).

import { WORLDS } from '../game/worlds.js';
import { Progress } from '../game/progress.js';
import { gt } from '../game/i18n.js';
import { Settings } from '../shared/settings.js';
import { Sfx } from '../audio/sfx.js';
import { WorldArt } from './art.js';

const $ = (id) => document.getElementById(id);
const settings = new Settings();
const lang = settings.get('lang');
const params = new URLSearchParams(location.search);
const progress = new Progress(WORLDS);
progress.unlockAll = params.get('unlock') === 'all';
const sfx = new Sfx();
sfx.setVolume(settings.get('sfx'));
const vibrate = (p) => {
  if (!settings.get('vibration') || navigator.userActivation?.hasBeenActive === false) return;
  try {
    navigator.vibrate?.(p);
  } catch {
    /* ignoré */
  }
};

const track = $('track');
const dots = $('dots');
const sheet = $('sheet');
const hexToRgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(', ');

// ─── Textes ─────────────────────────────────────────────────────────────────

document.documentElement.lang = lang;
for (const el of document.querySelectorAll('[data-t]')) el.textContent = gt(lang, el.dataset.t);
for (const el of document.querySelectorAll('[data-t-html]')) el.innerHTML = gt(lang, el.dataset.tHtml);
for (const el of document.querySelectorAll('[data-label]')) {
  el.setAttribute('aria-label', gt(lang, el.dataset.label));
  el.title = gt(lang, el.dataset.label);
}

// ─── Cartes ─────────────────────────────────────────────────────────────────

const pending = new Set(progress.pendingUnlocks());
const cards = [];

const trail = document.createElement('div');
trail.className = 'trail';
trail.innerHTML = '<i></i>';
track.appendChild(trail);

WORLDS.forEach((w, i) => {
  const card = document.createElement('article');
  card.className = 'world-card';
  card.tabIndex = 0;
  card.dataset.index = i;
  card.style.setProperty('--accent-rgb', hexToRgb(w.accent));
  card.setAttribute('aria-label', `${gt(lang, 'world.label', { n: w.number })} — ${gt(lang, w.nameKey)}`);
  const sparks = Array.from({ length: 10 }, (_, k) => {
    const a = (k / 10) * Math.PI * 2;
    return `<span class="spark" style="--dx:${Math.round(Math.cos(a) * 90)}px;--dy:${Math.round(Math.sin(a) * 70)}px"></span>`;
  }).join('');
  card.innerHTML = `
    <div class="art">
      <canvas></canvas>
      <span class="badge-num">${w.number}</span>
      <span class="badge-done" hidden>${gt(lang, 'map.done')}</span>
      <div class="lock"><span class="shackle"></span><span class="body"></span></div>
      <span class="burst"></span><span class="burst b2"></span>${sparks}
      <span class="unlocked-flag">${gt(lang, 'map.unlocked')}</span>
    </div>
    <div class="info">
      <h2 class="w-name">${gt(lang, w.nameKey)}</h2>
      <p class="w-tagline">${gt(lang, w.taglineKey)}</p>
      <div class="w-progress"><div class="bar"><i></i></div><span class="w-pct">0 %</span></div>
      <div class="w-meta">
        <span class="total-stars"><span class="mini-star"></span><b class="w-stars"></b></span>
        <span class="w-levels"></span>
      </div>
      <p class="lock-note">${gt(lang, 'map.locked', { n: w.number - 1 })}</p>
    </div>`;
  track.appendChild(card);
  const dot = document.createElement('span');
  dots.appendChild(dot);
  const art = new WorldArt(card.querySelector('canvas'), w.theme);
  cards.push({ card, dot, art, world: w, index: i, drawn: false });
});

function refreshCards() {
  for (const c of cards) {
    const i = c.index;
    const s = progress.worldStats(i);
    const unlocked = progress.isWorldUnlocked(i) && !pending.has(i);
    c.card.classList.toggle('locked', !unlocked);
    c.dot.classList.toggle('locked', !unlocked);
    c.card.querySelector('.w-progress i').style.width = `${s.percent}%`;
    c.card.querySelector('.w-pct').textContent = `${s.percent} %`;
    c.card.querySelector('.w-stars').textContent = `${s.stars}/${s.maxStars}`;
    c.card.querySelector('.w-levels').textContent = s.total < s.planned
      ? `${gt(lang, 'map.levels', { done: s.done, total: s.total })} · ${gt(lang, 'map.planned', { n: s.planned })}`
      : gt(lang, 'map.levels', { done: s.done, total: s.total });
    c.card.querySelector('.badge-done').hidden = !(unlocked && s.done === s.total && s.total > 0);
  }
  const t = progress.totals();
  $('total-stars').textContent = t.stars;
  $('total-max').textContent = `/ ${t.maxStars}`;
  $('total-pct').textContent = `${t.percent} %`;
  requestAnimationFrame(() => ($('total-bar').style.width = `${t.percent}%`));
}

// ─── Mise en page, défilement, monde au centre ─────────────────────────────

let focusIndex = -1;
const DPR = Math.min(window.devicePixelRatio || 1, 1.5);

function layout() {
  for (const c of cards) {
    const box = c.card.querySelector('.art');
    c.art.resize(box.clientWidth, box.clientHeight, DPR);
    c.drawn = false;
  }
  // Chemin : du centre de la 1re carte au centre de la dernière ; partie parcourue en couleur
  const first = cards[0].card;
  const last = cards[cards.length - 1].card;
  const x0 = first.offsetLeft + first.offsetWidth / 2;
  const x1 = last.offsetLeft + last.offsetWidth / 2;
  trail.style.left = `${x0}px`;
  trail.style.width = `${x1 - x0}px`;
  let reached = 0;
  for (let i = 1; i < cards.length; i++) if (progress.isWorldUnlocked(i) && !pending.has(i)) reached = i;
  const xr = cards[reached].card.offsetLeft + cards[reached].card.offsetWidth / 2;
  trail.querySelector('i').style.width = `${xr - x0}px`;
}

function updateFocus() {
  const mid = track.scrollLeft + track.clientWidth / 2;
  let best = 0;
  let bestD = Infinity;
  for (const c of cards) {
    const d = Math.abs(c.card.offsetLeft + c.card.offsetWidth / 2 - mid);
    if (d < bestD) {
      bestD = d;
      best = c.index;
    }
  }
  if (best === focusIndex) return;
  focusIndex = best;
  cards.forEach((c) => {
    c.card.classList.toggle('focus', c.index === best);
    c.dot.classList.toggle('on', c.index === best);
  });
  document.documentElement.style.setProperty('--focus-rgb', hexToRgb(WORLDS[best].accent));
}

track.addEventListener('scroll', updateFocus, { passive: true });
window.addEventListener('resize', () => {
  layout();
  updateFocus();
});

function scrollToCard(i, smooth = true) {
  const c = cards[i].card;
  track.scrollTo({ left: c.offsetLeft + c.offsetWidth / 2 - track.clientWidth / 2, behavior: smooth ? 'smooth' : 'auto' });
}

// Molette (ordinateur) : défilement horizontal
track.addEventListener('wheel', (e) => {
  if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
    track.scrollLeft += e.deltaY;
    e.preventDefault();
  }
}, { passive: false });

// ─── Animation des illustrations (seul le monde au centre est animé) ───────

let last = performance.now();
let time = 0;
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  time += dt;
  for (const c of cards) {
    if (c.index === focusIndex || !c.drawn) {
      c.art.draw(time + c.index * 3.1);
      c.drawn = true;
    }
  }
  requestAnimationFrame(frame);
}

// ─── Déblocage ──────────────────────────────────────────────────────────────

function playUnlock(i) {
  return new Promise((resolve) => {
    scrollToCard(i);
    setTimeout(() => {
      const c = cards[i];
      c.card.classList.add('unlocking');
      sfx.unlock();
      setTimeout(() => {
        c.card.classList.remove('locked');
        c.dot.classList.remove('locked');
        sfx.unlockWorld();
        vibrate([20, 40, 30]);
      }, 750);
      setTimeout(() => {
        pending.delete(i);
        progress.markSeen(i);
        c.card.classList.remove('unlocking');
        refreshCards();
        layout();
        resolve();
      }, 2900);
    }, 650);
  });
}

// ─── Choix du niveau ────────────────────────────────────────────────────────

let sheetWorld = -1;

function openSheet(i) {
  const w = WORLDS[i];
  const s = progress.worldStats(i);
  sheetWorld = i;
  const panel = sheet.querySelector('.sheet-panel');
  panel.style.setProperty('--accent-rgb', hexToRgb(w.accent));
  $('sheet-world').textContent = gt(lang, 'world.label', { n: w.number });
  $('sheet-name').textContent = gt(lang, w.nameKey);
  $('sheet-stars').textContent = `${s.stars}/${s.maxStars}`;
  $('sheet-pct').textContent = `${s.percent} %`;
  const levels = $('levels');
  levels.innerHTML = '';
  let nextMarked = false;
  for (let k = 0; k < s.planned; k++) {
    const def = w.levels[k];
    const el = document.createElement('button');
    el.className = 'level';
    if (!def) {
      el.classList.add('soon');
      el.innerHTML = `<b>${k + 1}</b><small>${gt(lang, 'map.soon')}</small>`;
      el.disabled = true;
    } else {
      const open = progress.isLevelUnlocked(i, k);
      const done = progress.isDone(def.id);
      const stars = progress.starsFor(def.id);
      el.innerHTML = `<i class="lv-diff ${def.difficulty ?? 'medium'}"></i><b>${def.number}</b><span class="lv-stars">${[0, 1, 2].map((n) => `<span class="${n < stars ? 'on' : ''}"></span>`).join('')}</span>`;
      el.title = `${gt(lang, def.nameKey)} · ${gt(lang, `diff.${def.difficulty ?? 'medium'}`)}`;
      el.setAttribute('aria-label', `${w.number}-${def.number} ${gt(lang, def.nameKey)}`);
      if (!open) {
        el.classList.add('locked');
        el.disabled = true;
      } else {
        if (done) el.classList.add('done');
        else if (!nextMarked) {
          el.classList.add('next');
          nextMarked = true;
        }
        el.addEventListener('click', () => go(`play.html?world=${w.id}&level=${def.number}&intro=1`, w.accent));
      }
    }
    levels.appendChild(el);
  }
  sheet.classList.remove('hidden');
  sfx.unlock();
  (levels.querySelector('.next') ?? levels.querySelector('.done'))?.focus({ preventScroll: true });
}

function closeSheet() {
  sheet.classList.add('hidden');
  sheetWorld = -1;
}

$('sheet-close').addEventListener('click', closeSheet);
sheet.addEventListener('click', (e) => {
  if (e.target === sheet) closeSheet();
});

let toastTimer = 0;
function toast(text) {
  const t = $('toast');
  t.textContent = text;
  t.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('on'), 2000);
}

track.addEventListener('click', (e) => {
  const card = e.target.closest('.world-card');
  if (!card) return;
  const i = +card.dataset.index;
  if (i !== focusIndex) return scrollToCard(i);
  if (card.classList.contains('locked')) {
    card.classList.remove('shake');
    void card.offsetWidth;
    card.classList.add('shake');
    vibrate([10, 40, 10]);
    return toast(gt(lang, 'map.locked', { n: WORLDS[i].number - 1 }));
  }
  if (card.classList.contains('unlocking')) return;
  openSheet(i);
});

track.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.target.classList.contains('world-card')) e.target.click();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (sheetWorld >= 0) closeSheet();
    else go('index.html');
  } else if (sheetWorld < 0 && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
    scrollToCard(Math.max(0, Math.min(WORLDS.length - 1, focusIndex + (e.key === 'ArrowRight' ? 1 : -1))));
  }
});

// ─── Navigation ─────────────────────────────────────────────────────────────

function go(url, accent = null) {
  const wipe = $('wipe');
  if (accent) {
    wipe.style.setProperty('--wipe-rgb', hexToRgb(accent));
    wipe.classList.add('run');
  }
  setTimeout(() => $('fade').classList.remove('out'), accent ? 380 : 0);
  setTimeout(() => (location.href = url), accent ? 700 : 320);
}

try {
  $('coin-n').textContent = String(Math.max(0, parseInt(localStorage.getItem('hoopbounce.coins') ?? '0', 10) || 0));
} catch {
  /* stockage indisponible */
}
$('btn-shop').addEventListener('click', (e) => {
  e.preventDefault();
  go('shop.html?from=worlds');
});

$('btn-back').addEventListener('click', (e) => {
  e.preventDefault();
  go('index.html');
});

// Retour depuis la partie (cache de page du navigateur) : progression à jour
window.addEventListener('pageshow', (e) => {
  if (!e.persisted) return;
  $('wipe').classList.remove('run');
  $('fade').classList.add('out');
  progress.data = progress._read();
  refreshCards();
  layout();
});

// ─── Démarrage ──────────────────────────────────────────────────────────────

refreshCards();
layout();
// On commence sur le monde à jouer (le dernier ouvert) ou sur celui demandé (?world=)
const asked = WORLDS.findIndex((w) => w.id === params.get('world'));
const resumeWorld = progress.resume().worldIndex;
const startAt = asked >= 0 ? asked : pending.size ? Math.min(...pending) - 1 : resumeWorld;
scrollToCard(Math.max(0, startAt), false);
updateFocus();
requestAnimationFrame(frame);
requestAnimationFrame(() => $('fade').classList.add('out'));

(async () => {
  for (const i of [...pending].sort()) await playUnlock(i);
})();

window.__worlds = { progress, cards, openSheet, playUnlock, scrollToCard };
