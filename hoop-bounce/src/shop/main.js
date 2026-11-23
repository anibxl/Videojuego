// Boutique (étape 24) : UNIQUEMENT les objets que l'on peut acheter — ballons, visages, effets de rebond,
// traînées et animations de panier pas encore possédés (les objets exclusifs se gagnent en jouant et
// n'y figurent pas). Chaque carte montre l'aperçu, le prix et un bouton « Acheter » ; la vitrine montre
// l'objet choisi en grand. Un objet acheté ne peut jamais être acheté deux fois : il affiche un badge
// « Possédé », puis quitte la boutique (il est équipé aussitôt et se retrouve dans la Collection).
// Aucun achat avec de l'argent réel : uniquement les pièces gagnées en jouant.

import { CATALOG, RARITIES, itemById } from '../shared/catalog.js';
import { Wallet } from '../shared/wallet.js';
import { Settings } from '../shared/settings.js';
import { Sfx } from '../audio/sfx.js';
import { Preview, drawThumb } from './preview.js';
import { st } from './i18n.js';
import { vibratePattern } from '../platform/vibrate.js';
import { watchSafeWidth } from '../shared/safe-width.js';

const $ = (id) => document.getElementById(id);
const settings = new Settings();
const lang = settings.get('lang');
const wallet = new Wallet();
watchSafeWidth(); // encoche des iPhone : en-tête compact selon la largeur utilisable
const sfx = new Sfx();
sfx.setVolume(settings.get('sfx'));
// iPhone (WebKit) : le son ne peut démarrer que sur un geste « terminé » (doigt levé, clic, touche)
for (const ev of ['touchend', 'pointerup', 'keydown']) document.addEventListener(ev, () => sfx.unlock(), { passive: true, capture: true });
const params = new URLSearchParams(location.search);
const vibrate = (p) => {
  if (!settings.get('vibration') || navigator.userActivation?.hasBeenActive === false) return;
  vibratePattern(p); // Android : navigator.vibrate ; iPhone : retour haptique natif
};
const name = (item) => item.name[lang] ?? item.name.fr;
// Prix : complets dans la vitrine (« 25 000 »), abrégés sur les cartes au-delà de 100 000 (« 650 k », « 1 M »)
const LOCALE = lang === 'en' ? 'en-US' : lang === 'es' ? 'es-ES' : 'fr-FR';
// (espace insécable classique : l'espace fine n'existe pas dans les polices du jeu)
const fmt = (n) => n.toLocaleString(LOCALE).replace(/ /g, ' ');
const short = (n) => (n >= 100000 ? new Intl.NumberFormat(LOCALE, { notation: 'compact', maximumFractionDigits: 1 }).format(n).replace(/ /g, ' ') : fmt(n));

/** En vente : un objet payant, non exclusif, pas encore possédé (règle commune : Wallet.isForSale). */
const forSale = (it, w) => w.isForSale(it.id);

/** Onglets : les ballons « amusants » (avec un visage) ont leur propre onglet, mais s'équipent comme des ballons. */
const TABS = [
  { id: 'all', has: () => true },
  { id: 'ball', has: (it) => it.category === 'ball' && it.group !== 'fun' },
  { id: 'fun', has: (it) => it.category === 'ball' && it.group === 'fun' },
  { id: 'bounce', has: (it) => it.category === 'bounce' },
  { id: 'trail', has: (it) => it.category === 'trail' },
  { id: 'goal', has: (it) => it.category === 'goal' },
];
const tabOf = (id) => TABS.find((t) => t.id === id) ?? TABS[0];
const DPR = Math.min(window.devicePixelRatio || 1, 2);

// ─── Textes ─────────────────────────────────────────────────────────────────

document.documentElement.lang = lang;
for (const el of document.querySelectorAll('[data-t]')) el.textContent = st(lang, el.dataset.t);
for (const el of document.querySelectorAll('[data-t-html]')) el.innerHTML = st(lang, el.dataset.tHtml);
for (const el of document.querySelectorAll('[data-label]')) el.setAttribute('aria-label', st(lang, el.dataset.label));

// ─── État ───────────────────────────────────────────────────────────────────

let tab = tabOf(params.get('tab')).id;
/** Objets achetés pendant cette visite : leur carte reste un instant avec le badge « Possédé ». */
const justBought = new Set();
let selected = null;
const wanted = itemById(params.get('item'));
if (wanted && forSale(wanted, wallet)) selected = wanted.id;

/** Objets de l'onglet affichés : en vente (et ceux qu'on vient d'acheter), du moins cher au plus cher par rareté. */
function shelf(tabId = tab) {
  const t = tabOf(tabId);
  return CATALOG.filter((it) => t.has(it) && (forSale(it, wallet) || justBought.has(it.id))).sort(
    (a, b) => RARITIES[a.rarity].order - RARITIES[b.rarity].order || a.price - b.price,
  );
}
const forSaleCount = (tabId) => CATALOG.filter((it) => tabOf(tabId).has(it) && forSale(it, wallet)).length;

/** Article montré en vitrine : celui choisi s'il est toujours affiché, sinon le moins cher qu'on peut s'offrir. */
function pickSelection() {
  const items = shelf();
  if (selected && items.some((it) => it.id === selected)) return selected;
  const affordable = items.filter((it) => forSale(it, wallet) && it.price <= wallet.coins);
  const pick = affordable.length ? affordable[affordable.length - 1] : items.find((it) => forSale(it, wallet));
  return pick?.id ?? null;
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
    const n = forSaleCount(t.id);
    return `<button role="tab" data-tab="${t.id}" aria-selected="${t.id === tab}" class="${n ? '' : 'empty'}">${st(lang, `tab.${t.id}`)}<small>${n}</small></button>`;
  }).join('');
}

$('tabs').addEventListener('click', (e) => {
  const b = e.target.closest('[data-tab]');
  if (!b || b.dataset.tab === tab) return;
  tab = b.dataset.tab;
  selected = null;
  justBought.clear();
  sfx.unlock();
  sfx.tab([...$('tabs').querySelectorAll('[data-tab]')].indexOf(b));
  render();
});

// ─── Rayon (grille) ─────────────────────────────────────────────────────────

function renderGrid() {
  const items = shelf();
  const grid = $('grid');
  const n = forSaleCount(tab);
  const exclusives = CATALOG.filter((it) => tabOf(tab).has(it) && it.exclusive && !wallet.owns(it.id)).length;
  $('shelf-info').innerHTML = n
    ? `<b>${st(lang, 'forSale', { n })}</b>${exclusives ? `<span>${st(lang, 'exclusiveNote', { n: exclusives })}</span>` : ''}`
    : '';
  grid.innerHTML = items
    .map((it, i) => {
      const owned = wallet.owns(it.id);
      const ok = !owned && wallet.coins >= it.price;
      const foot = owned
        ? `<span class="owned-badge">✓ ${st(lang, 'owned')}</span>`
        : `<span class="tag ${ok ? 'ok' : 'poor'}"><span class="coin-ico"></span>${short(it.price)}</span>
           <button class="buy-mini ${ok ? '' : 'poor'}" data-buy="${it.id}" aria-label="${st(lang, 'buy')} ${name(it)} · ${fmt(it.price)}">${st(lang, 'buy')}</button>`;
      return `<article class="item ${it.rarity} ${owned ? 'is-owned' : ''} ${ok ? 'can' : ''} ${it.id === selected ? 'selected' : ''}" data-id="${it.id}" style="--r:${RARITIES[it.rarity].rgb};animation-delay:${Math.min(i, 14) * 0.035}s" tabindex="0" aria-label="${name(it)} · ${st(lang, `rarity.${it.rarity}`)} · ${owned ? st(lang, 'owned') : fmt(it.price)}">
        <span class="rar-ribbon">${st(lang, `rarity.${it.rarity}`)}</span>
        ${ok ? `<span class="can-dot" title="${st(lang, 'affordable')}"></span>` : ''}
        <canvas></canvas>
        <span class="name">${name(it)}</span>
        <span class="foot">${foot}</span>
      </article>`;
    })
    .join('');
  requestAnimationFrame(() => {
    for (const el of grid.querySelectorAll('.item')) drawThumb(el.querySelector('canvas'), itemById(el.dataset.id), DPR);
  });
}

$('grid').addEventListener('click', (e) => {
  const buy = e.target.closest('[data-buy]');
  if (buy) {
    selected = buy.dataset.buy;
    markSelected();
    renderDetail();
    buyItem(buy.dataset.buy);
    return;
  }
  const el = e.target.closest('.item');
  if (!el) return;
  selected = el.dataset.id;
  sfx.unlock();
  sfx.select([...$('grid').children].indexOf(el));
  markSelected();
  renderDetail();
});
$('grid').addEventListener('keydown', (e) => {
  if ((e.key === 'Enter' || e.key === ' ') && e.target.classList?.contains('item')) {
    e.preventDefault();
    e.target.click();
  }
});

function markSelected() {
  for (const c of $('grid').querySelectorAll('.item')) c.classList.toggle('selected', c.dataset.id === selected);
}

// ─── Vitrine ────────────────────────────────────────────────────────────────

function renderDetail() {
  const it = itemById(selected);
  $('stage').hidden = !it;
  $('sold-out').hidden = !!it;
  if (!it) {
    preview.set(look(), 'ball', '255,190,80');
    return;
  }
  const rar = RARITIES[it.rarity];
  document.documentElement.style.setProperty('--sel-rgb', rar.rgb);
  $('d-name').textContent = name(it);
  $('d-desc').textContent = it.desc[lang] ?? it.desc.fr;
  $('d-rarity').textContent = st(lang, `rarity.${it.rarity}`);
  const owned = wallet.owns(it.id);
  $('d-price').hidden = owned;
  $('d-price').innerHTML = `<span class="coin-ico"></span>${fmt(it.price)}`;
  $('d-owned').hidden = !owned;
  $('d-owned').textContent = `✓ ${st(lang, 'owned')}`;
  const btn = $('d-action');
  btn.className = 'action';
  // Objectif d'épargne : barre de progression vers le prix d'un article pas encore possédé
  const goal = $('d-goal');
  goal.hidden = owned;
  if (!goal.hidden) {
    const k = Math.min(1, wallet.coins / it.price);
    $('d-goal-fill').style.width = `${(k * 100).toFixed(1)}%`;
    $('d-goal-text').textContent = `${fmt(Math.min(wallet.coins, it.price))} / ${fmt(it.price)}`;
  }
  if (owned) {
    // Jamais deux fois : l'objet est à toi, il t'attend dans la Collection
    btn.classList.add('equipped');
    btn.innerHTML = `✓ ${st(lang, 'boughtNote')}`;
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
  if (selected && !wallet.owns(selected)) buyItem(selected);
});

/** Achat d'un objet (vitrine ou bouton de la carte). */
function buyItem(id) {
  const it = itemById(id);
  sfx.unlock();
  if (!it || wallet.owns(id)) return; // déjà possédé : jamais deux fois
  const res = wallet.buy(id);
  if (res === 'coins') {
    $('coins').classList.remove('shake');
    void $('coins').offsetWidth;
    $('coins').classList.add('shake');
    const card = $('grid').querySelector(`[data-id="${id}"]`);
    card?.classList.remove('shake');
    void card?.offsetWidth;
    card?.classList.add('shake');
    sfx.denied();
    vibrate([10, 40, 10]);
    return;
  }
  if (res !== 'ok') return;
  // Achat : les pièces défilent, l'objet se débloque avec l'animation de sa rareté et il est équipé.
  // Épique : rayons violets. Légendaire : rayons dorés, éclats, son et vibration plus forts.
  wallet.equip(id);
  justBought.add(id);
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
  // La carte garde un instant son badge « Possédé », puis quitte la boutique
  setTimeout(() => {
    const card = $('grid').querySelector(`[data-id="${id}"]`);
    card?.classList.add('leaving');
    setTimeout(() => {
      justBought.delete(id);
      if (selected === id) selected = null;
      render(false);
    }, 450);
  }, 1900);
}

// ─── Pièces ─────────────────────────────────────────────────────────────────

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

function render(coins = true) {
  if (coins) $('coin-n').textContent = fmt(wallet.coins);
  selected = pickSelection();
  renderTabs();
  renderGrid();
  renderDetail();
  layout();
}

// ─── Mise en page et animation ──────────────────────────────────────────────

function layout() {
  const box = $('preview-box');
  if (box.clientWidth) preview.resize(box.clientWidth, box.clientHeight, DPR);
}
window.addEventListener('resize', layout);

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (!$('stage').hidden) preview.draw(dt);
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
for (const a of document.querySelectorAll('a[href="index.html#collection"]')) {
  a.addEventListener('click', (e) => {
    e.preventDefault();
    sfx.unlock();
    sfx.click();
    go('index.html#collection');
  });
}
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') go(backUrl());
});
window.addEventListener('pageshow', (e) => {
  if (e.persisted) $('fade').classList.add('out');
});

render();
requestAnimationFrame(frame);
requestAnimationFrame(() => $('fade').classList.add('out'));

window.__shop = { wallet, render, forSale: (id) => forSale(itemById(id), wallet) };
