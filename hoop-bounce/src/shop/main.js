// Boutique (étape 24) : UNIQUEMENT les objets que l'on peut acheter — ballons, visages, effets de rebond,
// traînées et animations de panier pas encore possédés (les objets exclusifs se gagnent en jouant et
// n'y figurent pas). Chaque carte montre l'aperçu, le prix et un bouton « Acheter » ; la vitrine montre
// l'objet choisi en grand. Un objet acheté ne peut jamais être acheté deux fois : il affiche un badge
// « Possédé », puis quitte la boutique (il est équipé aussitôt et se retrouve dans la Collection).
// Onglet « Gemmes » (Hoop Pass) : skins très rares et cosmétiques exclusifs vendus en 💎 gemmes, coffres
// premium et légendaires, offre spéciale de la saison (src/shared/gem-offers.js).
// Aucun achat avec de l'argent réel : uniquement les pièces et les gemmes gagnées en jouant.

import { CATALOG, RARITIES, itemById } from '../shared/catalog.js';
import { Wallet } from '../shared/wallet.js';
import { Settings } from '../shared/settings.js';
import { Sfx } from '../audio/sfx.js';
import { Preview, drawThumb } from './preview.js';
import { st } from './i18n.js';
import { vibratePattern } from '../platform/vibrate.js';
import { watchSafeWidth } from '../shared/safe-width.js';
import { GEM_OFFERS, offerAvailable, buyGemOffer, packValue } from '../shared/gem-offers.js';
import { activeSeason } from '../shared/season.js';
import { seasonConfig } from '../shared/seasons/index.js';
import { Stats } from '../shared/stats.js';
import { RewardFx, chestHtml } from '../menu/rewards-fx.js';
import { ICONS } from '../menu/icons.js';
import { lt } from '../shared/live-i18n.js';

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
/** Soldes de l'en-tête : abrégés dès 10 000 (« 125 k ») pour que les deux soldes tiennent sur téléphone. */
const chipFmt = (n) => (n >= 10000 ? new Intl.NumberFormat(LOCALE, { notation: 'compact', maximumFractionDigits: 1 }).format(n).replace(/ /g, ' ') : fmt(n));

/** Objet vendu en gemmes (onglet Gemmes). */
const isGemItem = (it) => it.exclusive === 'gems' && it.gems > 0;
/** En vente : un objet payant (pièces, ou gemmes dans l'onglet Gemmes), pas encore possédé. */
const forSale = (it, w) => w.isForSale(it.id) || (isGemItem(it) && !w.owns(it.id));
/** Prix d'un objet : en pièces ou en gemmes. */
const costOf = (it) => (isGemItem(it) ? { gems: true, n: it.gems } : { gems: false, n: it.price });
const canAfford = (it) => (isGemItem(it) ? wallet.gems >= it.gems : wallet.coins >= it.price);
const GEM = `<span class="gem-ico" aria-hidden="true">${ICONS.gem}</span>`;
const priceHtml = (it, n = costOf(it).n, s = fmt) => `${costOf(it).gems ? GEM : '<span class="coin-ico"></span>'}${s(n)}`;
// Hoop Pass en cours : l'offre spéciale de la saison n'est proposée que pendant celle-ci
const passId = seasonConfig(activeSeason()?.id)?.passId ?? null;
const offers = () => GEM_OFFERS.filter((o) => offerAvailable(o, wallet, passId));

/** Onglets : les ballons « amusants » (avec un visage) ont leur propre onglet, mais s'équipent comme des ballons. */
const TABS = [
  { id: 'all', has: (it) => !isGemItem(it) },
  { id: 'gems', has: (it) => isGemItem(it) },
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
for (const el of document.querySelectorAll('.top .gem-ico')) el.innerHTML = ICONS.gem;
for (const el of document.querySelectorAll('[data-ico]')) el.innerHTML = ICONS[el.dataset.ico] ?? '';

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
    (a, b) => RARITIES[a.rarity].order - RARITIES[b.rarity].order || costOf(a).n - costOf(b).n,
  );
}
const forSaleCount = (tabId) => CATALOG.filter((it) => tabOf(tabId).has(it) && forSale(it, wallet)).length + (tabId === 'gems' ? offers().length : 0);

/** Article montré en vitrine : celui choisi s'il est toujours affiché, sinon le moins cher qu'on peut s'offrir. */
function pickSelection() {
  const items = shelf();
  if (selected && items.some((it) => it.id === selected)) return selected;
  const affordable = items.filter((it) => forSale(it, wallet) && canAfford(it));
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
    return `<button role="tab" data-tab="${t.id}" aria-selected="${t.id === tab}" class="${n ? '' : 'empty'}${t.id === 'gems' ? ' gems-tab' : ''}">${t.id === 'gems' ? GEM : ''}${st(lang, `tab.${t.id}`)}<small>${n}</small></button>`;
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
  // Objets exclusifs gagnés en jouant (quotidien, succès, Hoop Pass) : pas les objets vendus en gemmes
  const exclusives = CATALOG.filter((it) => tabOf(tab).has(it) && it.exclusive && !isGemItem(it) && !wallet.owns(it.id)).length;
  const gems = tab === 'gems';
  $('shelf-info').innerHTML = gems
    ? `<b>${GEM}${st(lang, 'gems.title')}</b><span>${st(lang, 'gems.note')}</span>`
    : n
      ? `<b>${st(lang, 'forSale', { n })}</b>${exclusives ? `<span>${st(lang, 'exclusiveNote', { n: exclusives })}</span>` : ''}`
      : '';
  grid.classList.toggle('gems-grid', gems);
  grid.innerHTML = (gems ? offers().map((o, i) => offerHtml(o, i)).join('') : '') + items
    .map((it, i) => {
      const owned = wallet.owns(it.id);
      const ok = !owned && canAfford(it);
      const c = costOf(it);
      const foot = owned
        ? `<span class="owned-badge">✓ ${st(lang, 'owned')}</span>`
        : `<span class="tag ${ok ? 'ok' : 'poor'}${c.gems ? ' gem' : ''}">${priceHtml(it, c.n, short)}</span>
           <button class="buy-mini ${ok ? '' : 'poor'}" data-buy="${it.id}" aria-label="${st(lang, 'buy')} ${name(it)} · ${fmt(c.n)}">${st(lang, 'buy')}</button>`;
      return `<article class="item ${it.rarity} ${owned ? 'is-owned' : ''} ${ok ? 'can' : ''} ${it.id === selected ? 'selected' : ''}" data-id="${it.id}" style="--r:${RARITIES[it.rarity].rgb};animation-delay:${Math.min(i, 14) * 0.035}s" tabindex="0" aria-label="${name(it)} · ${st(lang, `rarity.${it.rarity}`)} · ${owned ? st(lang, 'owned') : fmt(c.n)}">
        <span class="rar-ribbon">${st(lang, `rarity.${it.rarity}`)}</span>
        ${ok ? `<span class="can-dot" title="${st(lang, 'affordable')}"></span>` : ''}
        <canvas></canvas>
        <span class="name">${name(it)}</span>
        <span class="foot">${foot}</span>
      </article>`;
    })
    .join('');
  requestAnimationFrame(() => {
    for (const el of grid.querySelectorAll('.item[data-id]')) drawThumb(el.querySelector('canvas'), itemById(el.dataset.id), DPR);
    for (const cv of grid.querySelectorAll('.offer canvas[data-item]')) drawThumb(cv, itemById(cv.dataset.item), DPR);
  });
}

/** Carte d'une offre en gemmes : coffre (premium, légendaire) ou pack de saison. */
function offerHtml(o, i) {
  const ok = wallet.gems >= o.gems;
  const isPack = o.kind === 'pack';
  const art = isPack
    ? `<span class="offer-pack">${o.items.map((id) => `<canvas data-item="${id}"></canvas>`).join('')}</span>`
    : `<span class="offer-chest">${chestHtml(o.chest, 'idle')}</span>`;
  const title = isPack ? st(lang, `offer.${o.id}`) : lt(lang, `chest.${o.chest}`);
  const sub = isPack ? `<s>${GEM}${fmt(packValue(o))}</s> ${st(lang, 'offer.limited')}` : st(lang, `offer.${o.id}.sub`);
  return `<article class="item offer ${isPack ? 'pack' : `chest-${o.chest}`} ${ok ? 'can' : ''}" data-offer="${o.id}" style="animation-delay:${Math.min(i, 14) * 0.035}s">
    <span class="rar-ribbon">${st(lang, isPack ? 'offer.special' : 'offer.chest')}</span>
    ${art}
    <span class="name">${title}</span>
    <span class="offer-sub">${sub}</span>
    <span class="foot"><span class="tag gem ${ok ? 'ok' : 'poor'}">${GEM}${fmt(o.gems)}</span>
      <button class="buy-mini ${ok ? '' : 'poor'}" data-offer-buy="${o.id}" aria-label="${st(lang, isPack ? 'buy' : 'open')} ${title} · ${o.gems}">${st(lang, isPack ? 'buy' : 'open')}</button></span>
  </article>`;
}

$('grid').addEventListener('click', (e) => {
  const ob = e.target.closest('[data-offer-buy], [data-offer]');
  if (ob) {
    buyOffer(ob.dataset.offerBuy ?? ob.dataset.offer, ob.closest('.offer'));
    return;
  }
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
  const c = costOf(it);
  const have = c.gems ? wallet.gems : wallet.coins;
  $('d-price').hidden = owned;
  $('d-price').classList.toggle('gem', c.gems);
  $('d-price').innerHTML = priceHtml(it);
  $('d-owned').hidden = !owned;
  $('d-owned').textContent = `✓ ${st(lang, 'owned')}`;
  const btn = $('d-action');
  btn.className = 'action';
  // Objectif d'épargne : barre de progression vers le prix d'un article pas encore possédé
  const goal = $('d-goal');
  goal.hidden = owned;
  if (!goal.hidden) {
    const k = Math.min(1, have / c.n);
    goal.classList.toggle('gem', c.gems);
    $('d-goal-fill').style.width = `${(k * 100).toFixed(1)}%`;
    $('d-goal-text').textContent = `${fmt(Math.min(have, c.n))} / ${fmt(c.n)}`;
  }
  if (owned) {
    // Jamais deux fois : l'objet est à toi, il t'attend dans la Collection
    btn.classList.add('equipped');
    btn.innerHTML = `✓ ${st(lang, 'boughtNote')}`;
  } else if (have >= c.n) {
    btn.classList.add('buy');
    if (c.gems) btn.classList.add('gem');
    btn.innerHTML = `${st(lang, 'buy')} · ${priceHtml(it)}`;
  } else {
    btn.classList.add('poor');
    btn.innerHTML = `${c.gems ? GEM : '<span class="coin-ico"></span>'}${st(lang, 'missing', { n: fmt(c.n - have) })}`;
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
  const gemItem = isGemItem(it);
  const res = gemItem ? wallet.buyWithGems(id) : wallet.buy(id);
  if (res === 'coins' || res === 'gems') {
    const chip = $(res === 'gems' ? 'gems' : 'coins');
    chip.classList.remove('shake');
    void chip.offsetWidth;
    chip.classList.add('shake');
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
  if (gemItem) rollGems(wallet.gems + it.gems, wallet.gems);
  else rollCoins(wallet.coins + it.price, wallet.coins);
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

// ─── Offres en gemmes (coffres, pack de saison) ─────────────────────────────

const fx = new RewardFx({
  lang: () => lang,
  vibrate,
  sound: { chest: () => sfx.ui?.chest(), reward: () => sfx.ui?.reward(), coins: () => sfx.ui?.coins(), tick: (v) => sfx.ui?.tick(v) },
});

async function buyOffer(id, card) {
  sfx.unlock();
  const before = wallet.gems;
  const res = buyGemOffer(id, wallet, { passId, stats: new Stats() });
  if (res.status === 'gems') {
    for (const el of [$('gems'), card]) {
      el?.classList.remove('shake');
      void el?.offsetWidth;
      el?.classList.add('shake');
    }
    sfx.denied();
    vibrate([10, 40, 10]);
    return;
  }
  if (res.status !== 'ok') return;
  rollGems(before, wallet.gems);
  const r = res.reward;
  const offer = GEM_OFFERS.find((o) => o.id === id);
  await fx.reveal({ title: offer.kind === 'pack' ? st(lang, `offer.${id}`) : st(lang, 'offer.opened'), coins: r.coins, gems: r.gems, item: r.item, items: r.items ?? undefined, chest: r.chest }, $('coins'));
  $('coin-n').textContent = chipFmt(wallet.coins);
  $('gem-n').textContent = chipFmt(wallet.gems);
  render(false);
}

function rollGems(from, to) {
  const el = $('gem-n');
  const t0 = performance.now();
  const step = (now) => {
    const k = Math.min(1, (now - t0) / 650);
    el.textContent = chipFmt(Math.round(from + (to - from) * (1 - Math.pow(1 - k, 3))));
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
  $('gems').classList.remove('bump');
  void $('gems').offsetWidth;
  $('gems').classList.add('bump');
}

// ─── Pièces ─────────────────────────────────────────────────────────────────

function rollCoins(from, to) {
  const el = $('coin-n');
  const t0 = performance.now();
  const step = (now) => {
    const k = Math.min(1, (now - t0) / 650);
    el.textContent = chipFmt(Math.round(from + (to - from) * (1 - Math.pow(1 - k, 3))));
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
  $('coins').classList.remove('bump');
  void $('coins').offsetWidth;
  $('coins').classList.add('bump');
}

function render(coins = true) {
  if (coins) {
    $('coin-n').textContent = chipFmt(wallet.coins);
    $('gem-n').textContent = chipFmt(wallet.gems);
  }
  selected = pickSelection();
  document.body.classList.toggle('tab-gems', tab === 'gems');
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
