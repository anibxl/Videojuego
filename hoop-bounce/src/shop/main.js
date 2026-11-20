// Boutique : grille d'articles par catégorie, aperçu animé, achat avec les pièces gagnées en jouant,
// équipement. Aucun achat avec de l'argent réel.

import { CATALOG, RARITIES, itemById } from '../shared/catalog.js';
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
// Prix : complets dans le détail (« 25 000 »), abrégés sur les cartes au-delà de 100 000 (« 650 k », « 1 M »)
const LOCALE = lang === 'en' ? 'en-US' : lang === 'es' ? 'es-ES' : 'fr-FR';
// (espace insécable classique : l'espace fine n'existe pas dans les polices du jeu)
const fmt = (n) => n.toLocaleString(LOCALE).replace(/\u202f/g, '\u00a0');
const short = (n) => (n >= 100000 ? new Intl.NumberFormat(LOCALE, { notation: 'compact', maximumFractionDigits: 1 }).format(n).replace(/\u202f/g, '\u00a0') : fmt(n));
const LOCK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10.5V8a5 5 0 0 1 10 0v2.5h.5A1.5 1.5 0 0 1 19 12v7.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 19.5V12a1.5 1.5 0 0 1 1.5-1.5zm2 0h6V8a3 3 0 0 0-6 0z"/></svg>';

/** Onglets : les ballons « amusants » (avec un visage) ont leur propre onglet, mais s'équipent comme des ballons. */
const TABS = [
  { id: 'ball', cat: 'ball', has: (it) => it.category === 'ball' && it.group !== 'fun' },
  { id: 'fun', cat: 'ball', has: (it) => it.category === 'ball' && it.group === 'fun' },
  { id: 'bounce', cat: 'bounce', has: (it) => it.category === 'bounce' },
  { id: 'trail', cat: 'trail', has: (it) => it.category === 'trail' },
  { id: 'goal', cat: 'goal', has: (it) => it.category === 'goal' },
];
const tabOf = (id) => TABS.find((t) => t.id === id) ?? TABS[0];
const tabForItem = (it) => TABS.find((t) => t.has(it))?.id ?? 'ball';
const DPR = Math.min(window.devicePixelRatio || 1, 2);

// ─── Textes ─────────────────────────────────────────────────────────────────

document.documentElement.lang = lang;
for (const el of document.querySelectorAll('[data-t]')) el.textContent = st(lang, el.dataset.t);
for (const el of document.querySelectorAll('[data-t-html]')) el.innerHTML = st(lang, el.dataset.tHtml);
for (const el of document.querySelectorAll('[data-label]')) el.setAttribute('aria-label', st(lang, el.dataset.label));

// ─── État ───────────────────────────────────────────────────────────────────

let tab = tabOf(params.get('tab')).id;
let selected = defaultSelection(tab);
// Lien direct vers un article (depuis la Collection : « Voir dans la boutique »)
const wanted = itemById(params.get('item'));
if (wanted) {
  tab = tabForItem(wanted);
  selected = wanted.id;
}

/** Article montré à l'ouverture d'un onglet : l'article équipé s'il en fait partie, sinon le premier. */
function defaultSelection(tabId) {
  const t = tabOf(tabId);
  const eq = itemById(wallet.equipped(t.cat));
  return eq && t.has(eq) ? eq.id : CATALOG.find(t.has).id;
}
const preview = new Preview($('preview'));

function look(overrideItem = null) {
  const l = { ball: wallet.equipped('ball'), bounce: wallet.equipped('bounce'), trail: wallet.equipped('trail'), goal: wallet.equipped('goal') };
  if (overrideItem) l[overrideItem.category] = overrideItem.id;
  return l;
}

// ─── Onglets ────────────────────────────────────────────────────────────────

function renderTabs() {
  $('tabs').innerHTML = TABS.map((t) => {
    const items = CATALOG.filter(t.has);
    const owned = items.filter((i) => wallet.owns(i.id)).length;
    return `<button role="tab" data-tab="${t.id}" aria-selected="${t.id === tab}">${st(lang, `tab.${t.id}`)}<small>${owned}/${items.length}</small></button>`;
  }).join('');
}

$('tabs').addEventListener('click', (e) => {
  const b = e.target.closest('[data-tab]');
  if (!b || b.dataset.tab === tab) return;
  tab = b.dataset.tab;
  selected = defaultSelection(tab);
  sfx.unlock();
  sfx.tab([...$('tabs').querySelectorAll('[data-tab]')].indexOf(b));
  render();
});

// ─── Grille ─────────────────────────────────────────────────────────────────

function renderGrid() {
  // Les exclusifs (gagnés en jouant chaque jour ou avec les succès) sont présentés à la fin
  const items = CATALOG.filter(tabOf(tab).has).sort((a, b) => !!a.exclusive - !!b.exclusive || RARITIES[a.rarity].order - RARITIES[b.rarity].order || a.price - b.price);
  const grid = $('grid');
  grid.innerHTML = items
    .map((it, i) => {
      const owned = wallet.owns(it.id);
      const on = wallet.equipped(it.category) === it.id;
      const poor = !owned && wallet.coins < it.price;
      const right = owned
        ? `<span class="state ${on ? 'on' : ''}">${st(lang, on ? 'equipped' : 'owned')}</span>`
        : it.exclusive
          ? `<span class="price exclusive">★ ${st(lang, 'exclusive')}</span>`
          : `<span class="price ${poor ? 'poor' : ''}"><span class="coin-ico"></span>${short(it.price)}</span>`;
      return `<button class="item ${it.rarity} ${owned ? '' : 'locked'} ${it.id === selected ? 'selected' : ''}" data-id="${it.id}" style="--r:${RARITIES[it.rarity].rgb};animation-delay:${i * 0.04}s" aria-label="${name(it)} · ${st(lang, `rarity.${it.rarity}`)}${owned ? '' : ` · ${it.exclusive ? st(lang, 'exclusive') : fmt(it.price)}`}">
        <canvas></canvas>
        ${on ? '<span class="check"></span>' : ''}
        ${owned ? '' : `<span class="lock">${LOCK}</span>`}
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
  sfx.select([...$('grid').children].indexOf(el));
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
  // Objectif d'épargne : barre de progression vers le prix d'un article pas encore possédé
  const goal = $('d-goal');
  goal.hidden = owned || !!it.exclusive || !it.price;
  if (!goal.hidden) {
    const k = Math.min(1, wallet.coins / it.price);
    $('d-goal-fill').style.width = `${(k * 100).toFixed(1)}%`;
    $('d-goal-text').textContent = `${fmt(Math.min(wallet.coins, it.price))} / ${fmt(it.price)}`;
  }
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
    btn.innerHTML = `${st(lang, 'buy')} · <span class="coin-ico"></span>${fmt(it.price)}`;
  } else {
    btn.classList.add('poor');
    btn.innerHTML = `<span class="coin-ico"></span>${st(lang, 'missing', { n: fmt(it.price - wallet.coins) })}`;
  }
  preview.set(look(it), it.category, rar.rgb);
}

$('d-action').addEventListener('click', () => {
  const it = itemById(selected);
  sfx.unlock();
  if (wallet.owns(it.id)) {
    if (wallet.equipped(it.category) === it.id) return;
    wallet.equip(it.id);
    sfx.equip();
    vibrate(12);
    render();
    return;
  }
  const res = wallet.buy(it.id);
  if (res === 'coins') {
    $('coins').classList.remove('shake');
    void $('coins').offsetWidth;
    $('coins').classList.add('shake');
    sfx.denied();
    vibrate([10, 40, 10]);
    return;
  }
  if (res !== 'ok') return;
  // Achat : les pièces défilent, l'article se débloque avec une animation de sa rareté, il est équipé.
  // Épique : rayons violets. Légendaire : rayons dorés, éclats, son et vibration plus forts.
  wallet.equip(it.id);
  rollCoins(wallet.coins + it.price, wallet.coins);
  sfx.buy(it.rarity);
  const big = it.rarity === 'legendary' || it.rarity === 'epic';
  vibrate(it.rarity === 'legendary' ? [30, 50, 30, 50, 60] : [20, 40, 30]);
  const burst = $('burst');
  burst.dataset.rarity = it.rarity;
  $('burst-text').textContent = st(lang, it.rarity === 'legendary' ? 'bought.legendary' : it.rarity === 'epic' ? 'bought.epic' : 'bought');
  const bits = burst.querySelector('.burst-bits');
  bits.innerHTML = '';
  if (big) {
    const n = it.rarity === 'legendary' ? 26 : 14;
    for (let i = 0; i < n; i++) {
      const b = document.createElement('i');
      const a = (i / n) * Math.PI * 2 + Math.random() * 0.3;
      const d = 90 + Math.random() * 110;
      b.style.setProperty('--dx', `${Math.cos(a) * d}px`);
      b.style.setProperty('--dy', `${Math.sin(a) * d}px`);
      b.style.animationDelay = `${0.1 + Math.random() * 0.15}s`;
      bits.appendChild(b);
    }
  }
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
    el.textContent = fmt(Math.round(from + (to - from) * (1 - Math.pow(1 - k, 3))));
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
  $('coins').classList.remove('bump');
  void $('coins').offsetWidth;
  $('coins').classList.add('bump');
}

function renderHeader(coins = true) {
  if (coins) $('coin-n').textContent = fmt(wallet.coins);
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
