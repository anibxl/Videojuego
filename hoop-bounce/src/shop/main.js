// Boutique : grille d'articles par catégorie, aperçu animé, achat avec les pièces gagnées en jouant,
// équipement. Aucun achat avec de l'argent réel.

import { CATALOG, CATEGORIES, RARITIES, itemById } from '../shared/catalog.js';
import { Wallet } from '../shared/wallet.js';
import { Settings } from '../shared/settings.js';
import { Sfx } from '../audio/sfx.js';
import { Preview, drawThumb } from './preview.js';
import { st } from './i18n.js';

const $ = (id) => document.getElementById(id);
const settings = new Settings();
const lang = settings.get('lang');
const wallet = new Wallet();
const sfx = new Sfx();
sfx.setVolume(settings.get('sfx'));
const params = new URLSearchParams(location.search);
const vibrate = (p) => {
  if (!settings.get('vibration') || navigator.userActivation?.hasBeenActive === false) return;
  try {
    navigator.vibrate?.(p);
  } catch {
    /* ignoré */
  }
};
const name = (item) => item.name[lang] ?? item.name.fr;
const DPR = Math.min(window.devicePixelRatio || 1, 2);

// ─── Textes ─────────────────────────────────────────────────────────────────

document.documentElement.lang = lang;
for (const el of document.querySelectorAll('[data-t]')) el.textContent = st(lang, el.dataset.t);
for (const el of document.querySelectorAll('[data-t-html]')) el.innerHTML = st(lang, el.dataset.tHtml);
for (const el of document.querySelectorAll('[data-label]')) el.setAttribute('aria-label', st(lang, el.dataset.label));

// ─── État ───────────────────────────────────────────────────────────────────

let tab = CATEGORIES.includes(params.get('tab')) ? params.get('tab') : 'ball';
let selected = wallet.equipped(tab);
const preview = new Preview($('preview'));

function look(overrideItem = null) {
  const l = { ball: wallet.equipped('ball'), bounce: wallet.equipped('bounce'), trail: wallet.equipped('trail'), goal: wallet.equipped('goal') };
  if (overrideItem) l[overrideItem.category] = overrideItem.id;
  return l;
}

// ─── Onglets ────────────────────────────────────────────────────────────────

function renderTabs() {
  $('tabs').innerHTML = CATEGORIES.map((c) => {
    const p = wallet.progress(c);
    return `<button role="tab" data-tab="${c}" aria-selected="${c === tab}">${st(lang, `tab.${c}`)}<small>${p.owned}/${p.total}</small></button>`;
  }).join('');
}

$('tabs').addEventListener('click', (e) => {
  const b = e.target.closest('[data-tab]');
  if (!b || b.dataset.tab === tab) return;
  tab = b.dataset.tab;
  selected = wallet.equipped(tab);
  sfx.unlock();
  sfx.switchOn();
  render();
});

// ─── Grille ─────────────────────────────────────────────────────────────────

function renderGrid() {
  // Les exclusifs (gagnés en jouant chaque jour ou avec les succès) sont présentés à la fin
  const items = CATALOG.filter((i) => i.category === tab).sort((a, b) => !!a.exclusive - !!b.exclusive || RARITIES[a.rarity].order - RARITIES[b.rarity].order || a.price - b.price);
  const grid = $('grid');
  grid.innerHTML = items
    .map((it, i) => {
      const owned = wallet.owns(it.id);
      const on = wallet.equipped(tab) === it.id;
      const poor = !owned && wallet.coins < it.price;
      const right = owned
        ? `<span class="state ${on ? 'on' : ''}">${st(lang, on ? 'equipped' : 'owned')}</span>`
        : it.exclusive
          ? `<span class="price exclusive">★ ${st(lang, 'exclusive')}</span>`
          : `<span class="price ${poor ? 'poor' : ''}"><span class="coin-ico"></span>${it.price}</span>`;
      return `<button class="item ${it.rarity} ${owned ? '' : 'locked'} ${it.id === selected ? 'selected' : ''}" data-id="${it.id}" style="--r:${RARITIES[it.rarity].rgb};animation-delay:${i * 0.04}s" aria-label="${name(it)} · ${st(lang, `rarity.${it.rarity}`)}">
        <canvas></canvas>
        ${on ? '<span class="check"></span>' : ''}
        <span class="name">${name(it)}</span>
        <span class="meta"><span class="rar">${st(lang, `rarity.${it.rarity}`)}</span>${right}</span>
      </button>`;
    })
    .join('');
  requestAnimationFrame(() => {
    for (const el of grid.querySelectorAll('.item')) drawThumb(el.querySelector('canvas'), itemById(el.dataset.id), DPR);
  });
}

$('grid').addEventListener('click', (e) => {
  const el = e.target.closest('.item');
  if (!el) return;
  selected = el.dataset.id;
  sfx.unlock();
  sfx.switchOn();
  for (const c of $('grid').querySelectorAll('.item')) c.classList.toggle('selected', c === el);
  renderDetail();
});

// ─── Détail et aperçu ───────────────────────────────────────────────────────

function renderDetail() {
  const it = itemById(selected);
  const rar = RARITIES[it.rarity];
  document.documentElement.style.setProperty('--sel-rgb', rar.rgb);
  $('d-name').textContent = name(it);
  $('d-desc').textContent = it.desc[lang] ?? it.desc.fr;
  $('d-rarity').textContent = st(lang, `rarity.${it.rarity}`);
  const btn = $('d-action');
  const owned = wallet.owns(it.id);
  const on = wallet.equipped(it.category) === it.id;
  btn.className = 'action';
  if (on) {
    btn.classList.add('equipped');
    btn.innerHTML = `✓ ${st(lang, 'equipped')}`;
  } else if (owned) {
    btn.classList.add('equip');
    btn.textContent = st(lang, 'equip');
  } else if (it.exclusive) {
    btn.classList.add('poor');
    btn.textContent = st(lang, `exclusive.${it.exclusive}`);
  } else if (wallet.coins >= it.price) {
    btn.classList.add('buy');
    btn.innerHTML = `${st(lang, 'buy')} · <span class="coin-ico"></span>${it.price}`;
  } else {
    btn.classList.add('poor');
    btn.innerHTML = `<span class="coin-ico"></span>${it.price} · ${st(lang, 'missing', { n: it.price - wallet.coins })}`;
  }
  preview.set(look(it), it.category, rar.rgb);
}

$('d-action').addEventListener('click', () => {
  const it = itemById(selected);
  sfx.unlock();
  if (wallet.owns(it.id)) {
    if (wallet.equipped(it.category) === it.id) return;
    wallet.equip(it.id);
    sfx.switchOn();
    vibrate(12);
    render();
    return;
  }
  const res = wallet.buy(it.id);
  if (res === 'coins') {
    $('coins').classList.remove('shake');
    void $('coins').offsetWidth;
    $('coins').classList.add('shake');
    sfx.powerDown();
    vibrate([10, 40, 10]);
    return;
  }
  if (res !== 'ok') return;
  // Achat : les pièces défilent, l'article se débloque avec une onde de sa couleur, il est équipé
  wallet.equip(it.id);
  rollCoins(wallet.coins + it.price, wallet.coins);
  sfx.unlockWorld();
  vibrate([20, 40, 30]);
  const burst = $('burst');
  $('burst-text').textContent = st(lang, 'bought');
  burst.classList.remove('run');
  void burst.offsetWidth;
  burst.classList.add('run');
  render(false);
});

// ─── Pièces et collection ───────────────────────────────────────────────────

function rollCoins(from, to) {
  const el = $('coin-n');
  const t0 = performance.now();
  const step = (now) => {
    const k = Math.min(1, (now - t0) / 650);
    el.textContent = String(Math.round(from + (to - from) * (1 - Math.pow(1 - k, 3))));
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
  $('coins').classList.remove('bump');
  void $('coins').offsetWidth;
  $('coins').classList.add('bump');
}

function renderHeader(coins = true) {
  if (coins) $('coin-n').textContent = String(wallet.coins);
  const p = wallet.progress();
  $('col-count').textContent = `${p.owned}/${p.total}`;
  requestAnimationFrame(() => ($('col-bar').style.width = `${p.percent}%`));
}

function render(coins = true) {
  renderHeader(coins);
  renderTabs();
  renderGrid();
  renderDetail();
}

// ─── Mise en page et animation ──────────────────────────────────────────────

function layout() {
  const box = $('preview-box');
  preview.resize(box.clientWidth, box.clientHeight, DPR);
}
window.addEventListener('resize', layout);

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  preview.draw(dt);
  requestAnimationFrame(frame);
}

// ─── Navigation ─────────────────────────────────────────────────────────────

/** Retour vers la page d'où l'on vient (accueil, sélection des mondes, collection). */
function backUrl() {
  const from = params.get('from');
  return from === 'worlds' ? 'index.html#mondes' : from === 'collection' ? 'index.html#collection' : 'index.html';
}

function go(url) {
  $('fade').classList.remove('out');
  setTimeout(() => (location.href = url), 320);
}

$('btn-back').addEventListener('click', (e) => {
  e.preventDefault();
  sfx.unlock();
  sfx.click();
  go(backUrl());
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') go(backUrl());
});
window.addEventListener('pageshow', (e) => {
  if (e.persisted) $('fade').classList.add('out');
});

layout();
render();
requestAnimationFrame(frame);
requestAnimationFrame(() => $('fade').classList.add('out'));

window.__shop = { wallet, render };
