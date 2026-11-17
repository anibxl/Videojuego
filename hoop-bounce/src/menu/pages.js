// Contenu des pages du menu. Chaque fonction renvoie le HTML de sa page dans la langue demandée ;
// le menu les régénère quand la langue change.

import { ICONS } from './icons.js';
import { LANGUAGE_NAMES, t } from './i18n.js';
import { BALL_COLLECTION, SHOP_CATALOG } from './shop-data.js';
import { APP_VERSION } from '../shared/version.js';

let emblemId = 0;

/** Ballon vectoriel (logo, bannière) : dégradé orange + coutures. */
export function ballEmblem() {
  const id = `bg${emblemId++}`;
  return `<svg viewBox="0 0 100 100" aria-hidden="true">
    <defs>
      <radialGradient id="${id}" cx="36%" cy="30%" r="75%">
        <stop offset="0" stop-color="#ffb26b"/><stop offset=".45" stop-color="#ff7a2f"/><stop offset="1" stop-color="#c8430f"/>
      </radialGradient>
    </defs>
    <circle cx="50" cy="50" r="46" fill="url(#${id})"/>
    <g fill="none" stroke="#2a1206" stroke-width="3.4" stroke-linecap="round" opacity=".85">
      <path d="M50 4v92M4 50h92"/>
      <path d="M17 17c11 9 15 20 15 33s-4 24-15 33"/>
      <path d="M83 17c-11 9-15 20-15 33s4 24 15 33"/>
    </g>
    <ellipse cx="34" cy="27" rx="15" ry="9" fill="#fff" opacity=".18" transform="rotate(-25 34 27)"/>
  </svg>`;
}

const head = (id, lang, titleKey, right = '') => `
  <header class="page-head">
    <button class="icon-btn pressable" data-back aria-label="${t(lang, 'back')}">${ICONS.back}</button>
    <h1 id="title-${id}">${t(lang, titleKey)}</h1>
    <span class="spacer"></span>
    ${right}
  </header>`;

const coinChip = (coins) => `
  <span class="chip coins"><span class="chip-icon">${ICONS.coin}</span><span class="chip-value">${coins}</span></span>`;

// ─── Mondes ─────────────────────────────────────────────────────────────────

export function worldsPage(lang) {
  return `${head('mondes', lang, 'worlds.title')}
  <div class="page-body">
    <div class="world-path reveal" style="--i:0">
      <svg viewBox="0 0 560 100" preserveAspectRatio="none" aria-hidden="true">
        <path d="M40 70 C 140 10, 200 10, 280 50 S 420 95, 520 30" fill="none" stroke="rgba(255,255,255,.14)" stroke-width="2.5" stroke-dasharray="2 10" stroke-linecap="round"/>
      </svg>
      <span class="world-node first" style="left:7%;top:70%">${ICONS.collection}</span>
      <span class="world-node" style="left:50%;top:50%">${ICONS.lock}</span>
      <span class="world-node" style="left:93%;top:30%">${ICONS.lock}</span>
    </div>
    <div class="empty reveal" style="--i:1">
      <h2>${t(lang, 'worlds.empty.title')}</h2>
      <p>${t(lang, 'worlds.empty.body')}</p>
    </div>
  </div>`;
}

// ─── Modes ──────────────────────────────────────────────────────────────────

const MODES = [
  { id: 'trickshot', icon: 'trickshot', accent: '255,122,47' },
  { id: 'endless', icon: 'endless', accent: '96,190,255' },
  { id: 'daily', icon: 'daily', accent: '255,201,77' },
  { id: 'multi', icon: 'multi', accent: '167,139,255' },
];

export function modesPage(lang) {
  const cards = MODES.map(
    (m, i) => `
    <button class="card mode-card pressable reveal" data-locked="${m.id}" style="--accent:${m.accent};--i:${i + 1}" aria-label="${t(lang, `mode.${m.id}`)} — ${t(lang, 'soon')}">
      <span class="lock-badge">${ICONS.lock}</span>
      <span class="mode-art">${ICONS[m.icon]}</span>
      <h2>${t(lang, `mode.${m.id}`)}</h2>
      <span class="soon-chip">${t(lang, 'soon')}</span>
    </button>`,
  ).join('');
  return `${head('modes', lang, 'modes.title')}
  <div class="page-body">
    <p class="subtitle reveal" style="--i:0">${t(lang, 'modes.subtitle')}</p>
    <div class="modes-grid">${cards}</div>
  </div>`;
}

// ─── Magasin ────────────────────────────────────────────────────────────────

function productCard(lang, item, i) {
  if (!item) {
    // Emplacement en attente d'article (même mise en page qu'un vrai article)
    return `
    <div class="card product reveal" style="--i:${i}">
      <span class="product-preview"></span>
      <span class="skeleton-line"></span>
      <span class="price"><span class="chip-icon">${ICONS.coin}</span>—</span>
      <button class="buy" disabled>${t(lang, 'shop.item.soon')}</button>
    </div>`;
  }
  const [c1, c2] = item.colors ?? ['#ff9b52', '#c8430f'];
  return `
    <div class="card product reveal" style="--i:${i}">
      <span class="product-preview" style="background: radial-gradient(circle at 35% 30%, ${c1}, ${c2})"></span>
      <span class="row-label">${item.name?.[lang] ?? item.name?.fr ?? item.id}</span>
      <span class="price"><span class="chip-icon">${ICONS.coin}</span>${item.price}</span>
      <button class="buy pressable" data-buy="${item.id}">${item.price}</button>
    </div>`;
}

function productGrid(lang, items, offset = 0, count = SHOP_CATALOG.placeholderCount) {
  const list = items?.length ? items : Array.from({ length: count }, () => null);
  return `<div class="product-grid">${list.map((it, i) => productCard(lang, it, offset + i)).join('')}</div>`;
}

export function shopPage(lang, coins, activeTab = 'featured') {
  const tabs = SHOP_CATALOG.tabs
    .map(
      (tab) =>
        `<button role="tab" data-tab="${tab.id}" aria-selected="${tab.id === activeTab}">${t(lang, tab.labelKey)}</button>`,
    )
    .join('');
  const panels = SHOP_CATALOG.tabs
    .map((tab) => {
      const inner =
        tab.id === 'featured'
          ? `<div class="shop-featured">
              <div class="card banner reveal" style="--i:1">
                <span class="banner-art">${ballEmblem()}</span>
                <div class="banner-text">
                  <span class="label">${t(lang, 'shop.featured.label')}</span>
                  <h2>${t(lang, 'shop.featured.title')}</h2>
                  <p>${t(lang, 'shop.featured.body')}</p>
                </div>
              </div>
              ${productGrid(lang, null, 2, 2)}
            </div>`
          : productGrid(lang, tab.items, 1);
      return `<div class="shop-panel ${tab.id === activeTab ? 'active' : ''}" role="tabpanel" data-panel="${tab.id}">${inner}</div>`;
    })
    .join('');
  return `${head('magasin', lang, 'shop.title', coinChip(coins))}
  <div class="page-body">
    <div class="segmented shop-tabs reveal" role="tablist" style="--i:0"><span class="seg-indicator"></span>${tabs}</div>
    ${panels}
  </div>`;
}

// ─── Collection ─────────────────────────────────────────────────────────────

export function collectionPage(lang) {
  const n = BALL_COLLECTION.length;
  const filters = ['all', 'classic', 'rare', 'legendary']
    .map((f, i) => `<button class="filter" aria-pressed="${i === 0}" disabled>${t(lang, `collection.filter.${f}`)}</button>`)
    .join('');
  return `${head('collection', lang, 'collection.title', `<span class="count-chip">${t(lang, 'collection.count', { n })}</span>`)}
  <div class="page-body">
    <div class="collection-head reveal" style="--i:0"><div class="filters">${filters}</div></div>
    <div class="collection-stage reveal" style="--i:1">
      <div class="slots" aria-hidden="true">${'<span class="slot"></span>'.repeat(16)}</div>
      <div class="empty">
        <span class="empty-icon">${ICONS.collection}</span>
        <h2>${t(lang, 'collection.empty.title')}</h2>
        <p>${t(lang, 'collection.empty.body')}</p>
      </div>
    </div>
  </div>`;
}

// ─── Paramètres ─────────────────────────────────────────────────────────────

const segmented = (name, options, current, label) => `
  <div class="segmented" role="radiogroup" aria-label="${label}" data-segmented="${name}">
    <span class="seg-indicator"></span>
    ${options.map(([value, text]) => `<button role="radio" data-value="${value}" aria-checked="${value === current}">${text}</button>`).join('')}
  </div>`;

export function settingsPage(lang, s) {
  const pct = (v) => Math.round(v * 100);
  return `${head('parametres', lang, 'settings.title')}
  <div class="page-body">
    <div class="settings-grid">
      <div class="settings-col">
        <section class="card group reveal" style="--i:0">
          <h2 class="group-title">${t(lang, 'settings.audio')}</h2>
          <div class="row slider-row">
            <span class="row-icon">${ICONS.music}</span>
            <label class="row-text" for="set-music"><span class="row-label">${t(lang, 'settings.music')}</span></label>
            <span class="row-value" data-value-for="music">${pct(s.music)}</span>
            <input class="slider" id="set-music" type="range" min="0" max="100" step="1" value="${pct(s.music)}" style="--fill:${pct(s.music)}%" data-setting="music">
          </div>
          <div class="row slider-row">
            <span class="row-icon">${ICONS.sound}</span>
            <label class="row-text" for="set-sfx"><span class="row-label">${t(lang, 'settings.sfx')}</span></label>
            <span class="row-value" data-value-for="sfx">${pct(s.sfx)}</span>
            <input class="slider" id="set-sfx" type="range" min="0" max="100" step="1" value="${pct(s.sfx)}" style="--fill:${pct(s.sfx)}%" data-setting="sfx">
          </div>
        </section>
        <section class="card group reveal" style="--i:2">
          <h2 class="group-title">${t(lang, 'settings.language')}</h2>
          <div class="row stack">
            <span class="row-icon">${ICONS.language}</span>
            <span class="row-text"><span class="row-label">${LANGUAGE_NAMES[lang]}</span></span>
            ${segmented('lang', Object.entries(LANGUAGE_NAMES), lang, t(lang, 'settings.language'))}
          </div>
        </section>
      </div>
      <div class="settings-col">
        <section class="card group reveal" style="--i:1">
          <h2 class="group-title">${t(lang, 'settings.game')}</h2>
          <div class="row">
            <span class="row-icon">${ICONS.vibration}</span>
            <span class="row-text"><span class="row-label" id="lbl-vib">${t(lang, 'settings.vibration')}</span><span class="row-hint">${t(lang, 'settings.vibration.hint')}</span></span>
            <button class="switch" id="set-vibration" role="switch" aria-checked="${s.vibration}" aria-labelledby="lbl-vib"></button>
          </div>
          <div class="row stack">
            <span class="row-icon">${ICONS.quality}</span>
            <span class="row-text"><span class="row-label">${t(lang, 'settings.quality')}</span><span class="row-hint">${t(lang, 'settings.quality.hint')}</span></span>
            ${segmented('quality', [['low', t(lang, 'settings.quality.low')], ['medium', t(lang, 'settings.quality.medium')], ['high', t(lang, 'settings.quality.high')]], s.quality, t(lang, 'settings.quality'))}
          </div>
        </section>
        <section class="card group reveal" style="--i:3">
          <h2 class="group-title">${t(lang, 'settings.about')}</h2>
          <button class="row link pressable" data-sheet="privacy">
            <span class="row-icon">${ICONS.shield}</span>
            <span class="row-text"><span class="row-label">${t(lang, 'settings.privacy')}</span></span>
            <span class="chev">${ICONS.chevron}</span>
          </button>
          <button class="row link pressable" data-sheet="credits">
            <span class="row-icon">${ICONS.heart}</span>
            <span class="row-text"><span class="row-label">${t(lang, 'settings.credits')}</span></span>
            <span class="chev">${ICONS.chevron}</span>
          </button>
          <p class="version">Hoop Bounce · ${t(lang, 'settings.version', { v: APP_VERSION })}</p>
        </section>
      </div>
    </div>
  </div>`;
}
