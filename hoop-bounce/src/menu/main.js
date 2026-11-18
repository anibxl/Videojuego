// Menu principal : assemble le décor, l'interface, la navigation, les sons et les réglages.

import { MenuScene } from './scene.js';
import { MenuSound } from './sound.js';
import { ICONS } from './icons.js';
import { STRINGS, t } from './i18n.js';
import { ballEmblem, collectionPage, modesPage, settingsPage, shopPage, worldsPage } from './pages.js';
import { Settings } from '../shared/settings.js';

const PAGES = ['mondes', 'modes', 'magasin', 'collection', 'parametres'];

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const app = $('#app');
const settings = new Settings();
const sound = new MenuSound();
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const scene = new MenuScene($('#scene'), { quality: settings.get('quality'), reducedMotion });

const state = {
  page: 'home',
  shopTab: 'featured',
  coins: readCoins(),
  pushed: false, // la page actuelle a-t-elle ajouté une entrée d'historique ?
};

function readCoins() {
  try {
    return Math.max(0, parseInt(localStorage.getItem('hoopbounce.coins') ?? '0', 10) || 0);
  } catch {
    return 0;
  }
}

const lang = () => settings.get('lang');

// ─── Vibrations ─────────────────────────────────────────────────────────────

function vibrate(ms) {
  if (!settings.get('vibration') || typeof navigator.vibrate !== 'function') return;
  if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return;
  try {
    navigator.vibrate(ms);
  } catch {
    /* ignoré */
  }
}

// ─── Textes et icônes ───────────────────────────────────────────────────────

function injectIcons(root = document) {
  for (const el of $$('[data-icon]', root)) {
    if (!el.dataset.iconDone) {
      el.innerHTML = ICONS[el.dataset.icon] ?? '';
      el.dataset.iconDone = '1';
    }
  }
}

function applyStaticTexts() {
  const l = lang();
  document.documentElement.lang = l;
  for (const el of $$('[data-i18n]')) el.textContent = t(l, el.dataset.i18n);
  for (const el of $$('[data-i18n-html]')) el.innerHTML = t(l, el.dataset.i18nHtml);
  $('#sheet-close').setAttribute('aria-label', t(l, 'close'));
}

function renderPages() {
  const l = lang();
  $('#page-mondes').innerHTML = worldsPage(l);
  $('#page-modes').innerHTML = modesPage(l);
  $('#page-magasin').innerHTML = shopPage(l, state.coins, state.shopTab);
  $('#page-collection').innerHTML = collectionPage(l);
  $('#page-parametres').innerHTML = settingsPage(l, settings.values);
  requestAnimationFrame(() => $$('.segmented').forEach(positionIndicator));
}

function positionIndicator(seg) {
  const ind = $('.seg-indicator', seg);
  const active = $('button[aria-checked="true"], button[aria-selected="true"]', seg);
  if (!ind || !active) return;
  ind.style.width = `${active.offsetWidth}px`;
  ind.style.transform = `translateX(${active.offsetLeft - 4}px)`;
}

// ─── Navigation (avec le bouton retour d'Android) ───────────────────────────

function showPage(page, { fromHistory = false } = {}) {
  if (page === state.page) return;
  const opening = page !== 'home';
  state.page = page;
  app.dataset.page = page;
  for (const p of PAGES) $(`#page-${p}`).classList.toggle('active', p === page);
  scene.dimTarget = opening ? 1 : 0;
  if (opening) {
    const el = $(`#page-${page}`);
    // Relance les animations d'apparition à chaque ouverture
    for (const r of $$('.reveal', el)) {
      r.style.animation = 'none';
      void r.offsetWidth;
      r.style.animation = '';
    }
    $('.page-body', el)?.scrollTo(0, 0);
    requestAnimationFrame(() => $$('.segmented', el).forEach(positionIndicator));
    setTimeout(() => $('[data-back]', el)?.focus({ preventScroll: true }), 450);
    if (!fromHistory) {
      history.pushState({ page }, '', `#${page}`);
      state.pushed = true;
    }
  }
}

function goBack() {
  if (!$('#sheet').hidden) return closeSheet();
  if (state.page === 'home') return;
  sound.back();
  if (state.pushed) history.back();
  else {
    history.replaceState(null, '', location.pathname + location.search);
    showPage('home', { fromHistory: true });
  }
}

window.addEventListener('popstate', () => {
  if (!$('#sheet').hidden) closeSheet(true);
  const page = pageFromHash();
  state.pushed = page !== 'home' && state.pushed;
  showPage(page, { fromHistory: true });
});

function pageFromHash() {
  const h = location.hash.replace('#', '');
  return PAGES.includes(h) ? h : 'home';
}

// ─── Fenêtres (confidentialité, crédits) ────────────────────────────────────

let sheetReturnFocus = null;

function openSheet(kind) {
  const l = lang();
  $('#sheet-title').textContent = t(l, `${kind}.title`);
  $('#sheet-body').innerHTML = t(l, `${kind}.body`);
  const sheet = $('#sheet');
  sheetReturnFocus = document.activeElement;
  sheet.hidden = false;
  requestAnimationFrame(() => sheet.classList.add('open'));
  setTimeout(() => $('#sheet-close').focus({ preventScroll: true }), 300);
  sound.open();
}

function closeSheet(silent = false) {
  const sheet = $('#sheet');
  if (sheet.hidden) return;
  sheet.classList.remove('open');
  if (!silent) sound.back();
  setTimeout(() => {
    sheet.hidden = true;
    sheetReturnFocus?.focus?.({ preventScroll: true });
  }, 300);
}

// ─── Toast ──────────────────────────────────────────────────────────────────

let toastTimer = 0;
function toast(text) {
  const el = $('#toast');
  el.textContent = text;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

// ─── Effet de pression (tous les boutons) ───────────────────────────────────

document.addEventListener('pointerdown', (e) => {
  sound.unlock();
  const el = e.target.closest('.pressable');
  if (!el || el.disabled) return;
  el.classList.remove('is-released');
  el.classList.add('is-pressed');
  vibrate(6);
  // Éclat lumineux à l'endroit touché
  const r = el.getBoundingClientRect();
  const size = Math.max(r.width, r.height) * 2.2;
  const ripple = document.createElement('span');
  ripple.className = 'ripple';
  ripple.style.width = ripple.style.height = `${size}px`;
  ripple.style.left = `${e.clientX - r.left}px`;
  ripple.style.top = `${e.clientY - r.top}px`;
  // L'éclat est dessiné dans la zone découpée du bouton (sa lueur extérieure reste visible)
  const host = el.querySelector('.tile-icon, .play-clip') ?? el;
  if (host !== el) {
    const hr = host.getBoundingClientRect();
    ripple.style.left = `${e.clientX - hr.left}px`;
    ripple.style.top = `${e.clientY - hr.top}px`;
  }
  const cs = getComputedStyle(host);
  if (cs.position === 'static') host.style.position = 'relative';
  if (cs.overflow !== 'hidden') host.style.overflow = 'hidden';
  host.appendChild(ripple);
  ripple.addEventListener('animationend', () => ripple.remove());
});

function release(e) {
  for (const el of $$('.pressable.is-pressed')) {
    el.classList.remove('is-pressed');
    if (e.type === 'pointerup') {
      el.classList.add('is-released');
      el.addEventListener('animationend', () => el.classList.remove('is-released'), { once: true });
    }
  }
}
document.addEventListener('pointerup', release);
document.addEventListener('pointercancel', release);

// ─── Clics ──────────────────────────────────────────────────────────────────

document.addEventListener('click', (e) => {
  const nav = e.target.closest('[data-nav]');
  // Magasin : la boutique est une page à part (étape 9)
  if (nav?.dataset.nav === 'magasin') return launchGame(e, 'shop.html');
  if (nav) {
    sound.open();
    showPage(nav.dataset.nav);
    return;
  }
  if (e.target.closest('[data-back]')) return goBack();

  const locked = e.target.closest('[data-locked]');
  if (locked) {
    sound.locked();
    vibrate([10, 40, 10]);
    locked.classList.remove('shake');
    void locked.offsetWidth;
    locked.classList.add('shake');
    toast(t(lang(), 'locked.toast'));
    return;
  }

  const sheetBtn = e.target.closest('[data-sheet]');
  if (sheetBtn) return openSheet(sheetBtn.dataset.sheet);
  if (e.target.closest('#sheet-close') || e.target === $('#sheet')) return closeSheet();

  const tab = e.target.closest('[data-tab]');
  if (tab) {
    state.shopTab = tab.dataset.tab;
    const page = $('#page-magasin');
    for (const b of $$('[data-tab]', page)) b.setAttribute('aria-selected', String(b === tab));
    for (const p of $$('.shop-panel', page)) {
      const on = p.dataset.panel === state.shopTab;
      p.classList.toggle('active', on);
      if (on) for (const r of $$('.reveal', p)) { r.style.animation = 'none'; void r.offsetWidth; r.style.animation = ''; }
    }
    positionIndicator(tab.closest('.segmented'));
    sound.tab();
    return;
  }

  const option = e.target.closest('[data-segmented] [data-value]');
  if (option) {
    const group = option.closest('[data-segmented]');
    const key = group.dataset.segmented;
    for (const b of $$('[data-value]', group)) b.setAttribute('aria-checked', String(b === option));
    positionIndicator(group);
    sound.tab();
    settings.set(key, option.dataset.value);
    return;
  }

  const sw = e.target.closest('.switch');
  if (sw) {
    const on = sw.getAttribute('aria-checked') !== 'true';
    sw.setAttribute('aria-checked', String(on));
    settings.set('vibration', on);
    sound.toggle(on);
    if (on) vibrate(20);
    return;
  }

  if (e.target.closest('#btn-play')) return launchGame(e);
});

// Curseurs de volume : mise à jour en direct (on entend le nouveau volume immédiatement)
document.addEventListener('input', (e) => {
  const slider = e.target.closest('.slider');
  if (!slider) return;
  const v = Number(slider.value) / 100;
  slider.style.setProperty('--fill', `${slider.value}%`);
  const key = slider.dataset.setting;
  const label = $(`[data-value-for="${key}"]`);
  if (label) label.textContent = slider.value;
  settings.set(key, v);
  sound.tick(v);
});

// ─── Réglages appliqués en direct ───────────────────────────────────────────

function applyAudio() {
  sound.setVolumes(settings.get('music'), settings.get('sfx'));
}

settings.onChange((key) => {
  if (key === 'music' || key === 'sfx') applyAudio();
  if (key === 'quality') {
    scene.setQuality(settings.get('quality'));
  }
  if (key === 'lang') {
    applyStaticTexts();
    renderPages();
    // Changement de langue depuis une page ouverte : on la réaffiche sans rejouer son animation d'entrée
    if (state.page !== 'home') {
      for (const r of $$(`#page-${state.page} .reveal`)) r.style.animation = 'none';
    }
  }
});

// ─── JOUER ──────────────────────────────────────────────────────────────────

let launching = false;
function launchGame(e, url = 'play.html') {
  if (launching) return;
  launching = true;
  sound.play();
  vibrate(18);
  scene.pulse();
  app.classList.add('launching');
  const curtain = $('#curtain');
  curtain.style.setProperty('--cx', `${e.clientX}px`);
  curtain.style.setProperty('--cy', `${e.clientY}px`);
  setTimeout(() => curtain.classList.add('on'), 220);
  setTimeout(() => {
    location.href = url;
  }, 820);
}

// Retour depuis la partie (cache de page du navigateur) : on remet le menu en état
window.addEventListener('pageshow', (e) => {
  if (e.persisted) {
    launching = false;
    app.classList.remove('launching');
    $('#curtain').classList.remove('on');
  }
});

// ─── Clavier (ordinateur) ───────────────────────────────────────────────────

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' || e.key === 'Backspace') {
    if (e.target.closest('input')) return;
    e.preventDefault();
    goBack();
  }
});

// ─── Décor ──────────────────────────────────────────────────────────────────

function resize() {
  scene.resize(window.innerWidth, window.innerHeight);
  $$('.segmented').forEach(positionIndicator);
}
window.addEventListener('resize', resize);

window.addEventListener('pointermove', (e) => {
  scene.setPointer((e.clientX / window.innerWidth) * 2 - 1, (e.clientY / window.innerHeight) * 2 - 1);
});

let last = performance.now();
let raf = 0;
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  scene.frame(dt);
  raf = requestAnimationFrame(loop);
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    cancelAnimationFrame(raf);
    sound.suspend();
  } else {
    last = performance.now();
    raf = requestAnimationFrame(loop);
    sound.resume();
  }
});

// ─── Démarrage ──────────────────────────────────────────────────────────────

$('.logo-ball').innerHTML = ballEmblem();
$('.rotate-icon').innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 2h-9A1.5 1.5 0 0 0 6 3.5v17A1.5 1.5 0 0 0 7.5 22h9a1.5 1.5 0 0 0 1.5-1.5v-17A1.5 1.5 0 0 0 16.5 2zM12 20.5a1 1 0 1 1 0-2 1 1 0 0 1 0 2zM16 17H8V4h8z"/></svg>`;
$('#coin-count').textContent = String(state.coins);
injectIcons();
applyStaticTexts();
renderPages();
applyAudio();
resize();
raf = requestAnimationFrame(loop);

// Entrée animée une fois les polices prêtes (pas de saut de mise en page)
const fontsReady = document.fonts?.ready ?? Promise.resolve();
Promise.race([fontsReady, new Promise((r) => setTimeout(r, 700))]).then(() => {
  app.classList.add('intro');
  setTimeout(() => app.classList.remove('intro'), 1800);
  $$('.segmented').forEach(positionIndicator);
});

// Lien direct vers une page (#modes…) : on l'ouvre, le retour mène à l'accueil
const initial = pageFromHash();
if (initial !== 'home') showPage(initial, { fromHistory: true });

// Accès pour les tests automatisés
window.__menu = { scene, settings, sound, showPage, STRINGS };
