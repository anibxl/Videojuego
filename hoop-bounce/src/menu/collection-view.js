// Page « Collection » du menu : TOUS les articles (ballons, visages, effets de rebond, traînées, animations
// de panier), comme un album à compléter : les articles possédés s'équipent ; les autres restent visibles,
// grisés avec un cadenas, leur prix et leur aperçu animé (étape 17). Compteurs par rareté, badge
// « Nouveau ! » sur les articles débloqués depuis la dernière visite.
//
// Les articles viennent du porte-monnaie partagé avec la boutique et le jeu (`shared/wallet.js`,
// clé `hoopbounce.inventory`) : ce qu'on achète dans la boutique apparaît ici dès le retour au menu,
// et l'article équipé est enregistré tout de suite (il reste équipé au prochain lancement).

import { CATALOG, CATEGORIES, DEFAULTS, RARITIES, itemById } from '../shared/catalog.js';
import { Wallet } from '../shared/wallet.js';
import { Preview, drawThumb } from '../shop/preview.js';
import { ICONS } from './icons.js';
import { t } from './i18n.js';

const CHECK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.5 16.2 5.3 12l-1.4 1.4 5.6 5.6L20.1 8.4 18.7 7z"/></svg>';
const LOCK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10.5V8a5 5 0 0 1 10 0v2.5h.5A1.5 1.5 0 0 1 19 12v7.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 19.5V12a1.5 1.5 0 0 1 1.5-1.5zm2 0h6V8a3 3 0 0 0-6 0z"/></svg>';
const isDefault = (item) => DEFAULTS[item.category] === item.id;
const SEEN_KEY = 'hoopbounce.collectionSeen';
/** Onglets : les ballons avec un visage ont le leur. */
const TAB_FILTER = {
  all: () => true,
  ball: (it) => it.category === 'ball' && it.group !== 'fun',
  fun: (it) => it.category === 'ball' && it.group === 'fun',
  bounce: (it) => it.category === 'bounce',
  trail: (it) => it.category === 'trail',
  goal: (it) => it.category === 'goal',
};
const TAB_IDS = Object.keys(TAB_FILTER);

/** Articles déjà vus dans la Collection (pour le badge « Nouveau ! »). */
function readSeen(wallet) {
  try {
    const raw = JSON.parse(localStorage.getItem(SEEN_KEY) ?? 'null');
    if (Array.isArray(raw)) return new Set(raw);
  } catch {
    /* sauvegarde abîmée */
  }
  // Première fois : tout ce qui est déjà possédé compte comme vu (pas de pluie de badges)
  const s = new Set(CATALOG.filter((it) => wallet.owns(it.id)).map((it) => it.id));
  writeSeen(s);
  return s;
}
function writeSeen(set) {
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify([...set]));
  } catch {
    /* stockage indisponible */
  }
}

export class CollectionView {
  /**
   * @param {HTMLElement} root  la section #page-collection
   * @param {{ lang: () => string, sound: object, vibrate: Function, toast: Function, launch: Function }} env
   */
  constructor(root, env) {
    this.root = root;
    this.env = env;
    this.wallet = new Wallet();
    this.tab = 'all';
    this.selected = null;
    this.active = false;
    this.preview = null;
    root.addEventListener('click', (e) => this._onClick(e));
  }

  get lang() {
    return this.env.lang();
  }

  /** Tous les articles de l'onglet (possédés et verrouillés), par catégorie, visages après les ballons, puis rareté. */
  items() {
    const f = TAB_FILTER[this.tab] ?? TAB_FILTER.all;
    const rank = (it) => CATEGORIES.indexOf(it.category) * 2 + (it.group === 'fun' ? 1 : 0);
    return CATALOG.filter(f).sort((a, b) => rank(a) - rank(b) || RARITIES[a.rarity].order - RARITIES[b.rarity].order || (a.price ?? 1e9) - (b.price ?? 1e9));
  }

  render() {
    const l = this.lang;
    this.wallet = new Wallet(); // relu à chaque fois : la boutique a pu changer l'inventaire
    const p = this.wallet.progress();
    const tabs = TAB_IDS
      .map((c) => `<button role="tab" data-ctab="${c}" aria-selected="${c === this.tab}">${t(l, `collection.tab.${c}`)}</button>`)
      .join('');
    this.root.innerHTML = `
      <header class="page-head">
        <button class="icon-btn pressable" data-back aria-label="${t(l, 'back')}">${ICONS.back}</button>
        <h1 id="title-collection">${t(l, 'collection.title')}</h1>
        <span class="spacer"></span>
        <div class="cv-count reveal" style="--i:0">
          <span class="cv-count-bar"><i style="width:${p.percent}%"></i></span>
          <b>${t(l, 'collection.owned', { n: p.owned, total: p.total })}</b>
        </div>
        <button class="cv-shop pressable reveal" style="--i:1" data-shop><span class="chip-icon">${ICONS.coin}</span>${t(l, 'collection.shop')}</button>
      </header>
      <div class="cv-body">
        <section class="cv-stage card reveal" style="--i:1">
          <div class="cv-preview"><canvas></canvas><span class="cv-rarity"></span><span class="cv-equipped">${CHECK}${t(l, 'collection.equipped')}</span></div>
          <div class="cv-detail">
            <h2 class="cv-name"></h2>
            <p class="cv-desc"></p>
            <div class="cv-actions"></div>
          </div>
        </section>
        <section class="cv-list">
          <nav class="cv-tabs reveal" role="tablist" style="--i:2">${tabs}</nav>
          <div class="cv-grid" role="tabpanel"></div>
          <p class="cv-more reveal" style="--i:4"></p>
        </section>
      </div>`;
    this.preview = new Preview(this.root.querySelector('.cv-preview canvas'));
    if (!this.selected || !itemById(this.selected)) this.selected = this.wallet.equipped('ball');
    this.seen = readSeen(this.wallet);
    this._renderGrid();
    this._renderDetail();
    requestAnimationFrame(() => this.layout());
  }

  _renderGrid() {
    const l = this.lang;
    const list = this.items();
    const grid = this.root.querySelector('.cv-grid');
    const fmt = (n) => n.toLocaleString(l === 'en' ? 'en-US' : l === 'es' ? 'es-ES' : 'fr-FR', { notation: n >= 100000 ? 'compact' : 'standard', maximumFractionDigits: 1 }).replace(/\u202f/g, '\u00a0');
    grid.innerHTML = list
      .map((it, i) => {
        const owned = this.wallet.owns(it.id);
        const on = owned && this.wallet.equipped(it.category) === it.id;
        const fresh = owned && !this.seen.has(it.id);
        const tag = owned ? '' : it.exclusive ? `<span class="citem-price ex">★ ${t(l, 'collection.exclusive')}</span>` : `<span class="citem-price"><span class="chip-icon">${ICONS.coin}</span>${fmt(it.price)}</span>`;
        return `
        <button class="citem pressable ${it.rarity} ${it.id === this.selected ? 'selected' : ''} ${on ? 'on' : ''} ${owned ? '' : 'locked'} ${fresh ? 'fresh' : ''}" data-item="${it.id}"
          style="--r:${RARITIES[it.rarity].rgb};--i:${Math.min(i, 12)}" aria-label="${it.name[l] ?? it.name.fr} · ${t(l, `rarity.${it.rarity}`)}${on ? ` · ${t(l, 'collection.equipped')}` : ''}${owned ? '' : ` · ${t(l, 'collection.locked')}`}">
          <canvas></canvas>
          ${on ? `<span class="citem-badge">${CHECK}${t(l, 'collection.equipped')}</span>` : ''}
          ${fresh ? `<span class="citem-new">${t(l, 'collection.new')}</span>` : ''}
          ${owned ? '' : `<span class="citem-lock">${LOCK}</span>`}
          <span class="citem-name">${it.name[l] ?? it.name.fr}</span>
          <span class="citem-rar">${t(l, `rarity.${it.rarity}`)}</span>
          ${tag}
        </button>`;
      })
      .join('');
    // Les nouveautés ne sont « nouvelles » qu'une fois
    for (const it of list) if (this.wallet.owns(it.id)) this.seen.add(it.id);
    writeSeen(this.seen);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    requestAnimationFrame(() => {
      for (const el of grid.querySelectorAll('.citem')) drawThumb(el.querySelector('canvas'), itemById(el.dataset.item), dpr);
    });
    // Album : progression par rareté (« Légendaire 1/8 »…), ou « Collection complète ! »
    const all = CATALOG.filter((it) => !isDefault(it));
    const done = all.every((it) => this.wallet.owns(it.id));
    const chips = Object.keys(RARITIES).map((r) => {
      const items = all.filter((it) => it.rarity === r);
      const n = items.filter((it) => this.wallet.owns(it.id)).length;
      return `<span class="cv-rchip ${n === items.length ? 'full' : ''}" style="--r:${RARITIES[r].rgb}"><i></i>${t(l, `rarity.${r}`)} <b>${n}/${items.length}</b></span>`;
    }).join('');
    this.root.querySelector('.cv-more').innerHTML = done ? `<span class="cv-complete">${t(l, 'collection.allOwned')}</span>` : chips;
  }

  _renderDetail() {
    const l = this.lang;
    const it = itemById(this.selected);
    if (!it) return;
    const rar = RARITIES[it.rarity];
    const owned = this.wallet.owns(it.id);
    const on = owned && this.wallet.equipped(it.category) === it.id;
    const stage = this.root.querySelector('.cv-stage');
    stage.style.setProperty('--r', rar.rgb);
    stage.classList.toggle('is-on', on);
    stage.classList.toggle('is-locked', !owned);
    this.root.querySelector('.cv-name').textContent = it.name[l] ?? it.name.fr;
    this.root.querySelector('.cv-desc').textContent = isDefault(it) ? t(l, 'collection.defaultHint') : (it.desc[l] ?? it.desc.fr);
    this.root.querySelector('.cv-rarity').textContent = isDefault(it) ? t(l, 'collection.default') : t(l, `rarity.${it.rarity}`);
    const actions = this.root.querySelector('.cv-actions');
    const LOC = l === 'en' ? 'en-US' : l === 'es' ? 'es-ES' : 'fr-FR';
    if (!owned && it.exclusive) actions.innerHTML = `<span class="cv-state locked">${LOCK}${t(l, `collection.exclusive.${it.exclusive}`)}</span>`;
    else if (!owned) actions.innerHTML = `<button class="cv-btn pressable" data-buy>${LOCK}${t(l, 'collection.unlock', { n: it.price.toLocaleString(LOC).replace(/\u202f/g, '\u00a0') })}</button>`;
    else if (on && isDefault(it)) actions.innerHTML = `<span class="cv-state">${CHECK}${t(l, 'collection.equipped')}</span>`;
    else if (on) actions.innerHTML = `<span class="cv-state">${CHECK}${t(l, 'collection.equipped')}</span><button class="cv-btn ghost pressable" data-unequip>${t(l, 'collection.unequip')}</button>`;
    else actions.innerHTML = `<button class="cv-btn pressable" data-equip>${t(l, 'collection.equip')}</button>`;
    // Aperçu : l'article choisi, avec le reste de la tenue actuellement équipée
    const look = { ball: this.wallet.equipped('ball'), bounce: this.wallet.equipped('bounce'), trail: this.wallet.equipped('trail'), goal: this.wallet.equipped('goal') };
    look[it.category] = it.id;
    this.preview.set(look, it.category, rar.rgb);
  }

  layout() {
    const box = this.root.querySelector('.cv-preview');
    if (box?.clientWidth) this.preview.resize(box.clientWidth, box.clientHeight, Math.min(window.devicePixelRatio || 1, 2));
  }

  frame(dt) {
    if (this.active && this.preview?.w) this.preview.draw(dt);
  }

  onShow() {
    this.active = true;
    this.render();
  }

  onHide() {
    this.active = false;
  }

  _bump(el) {
    el.classList.remove('pop');
    void el.offsetWidth;
    el.classList.add('pop');
  }

  _onClick(e) {
    const l = this.lang;
    const tab = e.target.closest('[data-ctab]');
    if (tab) {
      this.tab = tab.dataset.ctab;
      const tabs = [...this.root.querySelectorAll('[data-ctab]')];
      for (const b of tabs) b.setAttribute('aria-selected', String(b === tab));
      this.env.sound.tab(tabs.indexOf(tab));
      this._renderGrid();
      return;
    }
    const item = e.target.closest('.citem');
    if (item) {
      this.selected = item.dataset.item;
      const items = [...this.root.querySelectorAll('.citem')];
      for (const c of items) c.classList.toggle('selected', c === item);
      this.env.sound.select(items.indexOf(item));
      this._renderDetail();
      this._bump(this.root.querySelector('.cv-stage'));
      return;
    }
    const it = itemById(this.selected);
    if (e.target.closest('[data-equip]') && it) {
      this.wallet.equip(it.id);
      this.env.sound.equip();
      this.env.vibrate(14);
      this.env.toast(t(l, 'collection.toast.equip', { name: it.name[l] ?? it.name.fr }));
      this._renderGrid();
      this._renderDetail();
      this._bump(this.root.querySelector('.cv-stage'));
      return;
    }
    if (e.target.closest('[data-unequip]') && it) {
      this.wallet.unequip(it.category);
      this.env.sound.toggle(false);
      this.env.vibrate(8);
      this.env.toast(t(l, 'collection.toast.unequip', { name: it.name[l] ?? it.name.fr }));
      this._renderGrid();
      this._renderDetail();
      return;
    }
    if (e.target.closest('[data-buy]') && it) return this.env.launch(e, `shop.html?from=collection&item=${encodeURIComponent(it.id)}`);
    if (e.target.closest('[data-shop]')) this.env.launch(e, 'shop.html?from=collection');
  }
}
