// Page « Collection » du menu : tous les articles possédés (ballons, effets de rebond, traînées,
// animations de panier), avec un aperçu animé, et les boutons Équiper / Déséquiper.
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
const isDefault = (item) => DEFAULTS[item.category] === item.id;

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

  /** Articles possédés (les articles de base comptent), triés par catégorie puis rareté. */
  owned() {
    return CATALOG.filter((it) => this.wallet.owns(it.id) && (this.tab === 'all' || it.category === this.tab)).sort(
      (a, b) => CATEGORIES.indexOf(a.category) - CATEGORIES.indexOf(b.category) || RARITIES[a.rarity].order - RARITIES[b.rarity].order || a.price - b.price,
    );
  }

  render() {
    const l = this.lang;
    this.wallet = new Wallet(); // relu à chaque fois : la boutique a pu changer l'inventaire
    const p = this.wallet.progress();
    const tabs = ['all', ...CATEGORIES]
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
    if (!this.selected || !this.wallet.owns(this.selected)) this.selected = this.wallet.equipped('ball');
    this._renderGrid();
    this._renderDetail();
    requestAnimationFrame(() => this.layout());
  }

  _renderGrid() {
    const l = this.lang;
    const list = this.owned();
    const grid = this.root.querySelector('.cv-grid');
    grid.innerHTML = list
      .map((it, i) => {
        const on = this.wallet.equipped(it.category) === it.id;
        return `
        <button class="citem pressable ${it.rarity} ${it.id === this.selected ? 'selected' : ''} ${on ? 'on' : ''}" data-item="${it.id}"
          style="--r:${RARITIES[it.rarity].rgb};--i:${Math.min(i, 12)}" aria-label="${it.name[l] ?? it.name.fr} · ${t(l, `rarity.${it.rarity}`)}${on ? ` · ${t(l, 'collection.equipped')}` : ''}">
          <canvas></canvas>
          ${on ? `<span class="citem-badge">${CHECK}${t(l, 'collection.equipped')}</span>` : ''}
          <span class="citem-name">${it.name[l] ?? it.name.fr}</span>
          <span class="citem-rar">${t(l, `rarity.${it.rarity}`)}</span>
        </button>`;
      })
      .join('');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    requestAnimationFrame(() => {
      for (const el of grid.querySelectorAll('.citem')) drawThumb(el.querySelector('canvas'), itemById(el.dataset.item), dpr);
    });
    const p = this.wallet.progress();
    const missing = p.total - p.owned;
    this.root.querySelector('.cv-more').textContent = missing ? t(l, 'collection.more', { n: missing }) : t(l, 'collection.allOwned');
  }

  _renderDetail() {
    const l = this.lang;
    const it = itemById(this.selected);
    if (!it) return;
    const rar = RARITIES[it.rarity];
    const on = this.wallet.equipped(it.category) === it.id;
    const stage = this.root.querySelector('.cv-stage');
    stage.style.setProperty('--r', rar.rgb);
    stage.classList.toggle('is-on', on);
    this.root.querySelector('.cv-name').textContent = it.name[l] ?? it.name.fr;
    this.root.querySelector('.cv-desc').textContent = isDefault(it) ? t(l, 'collection.defaultHint') : (it.desc[l] ?? it.desc.fr);
    this.root.querySelector('.cv-rarity').textContent = isDefault(it) ? t(l, 'collection.default') : t(l, `rarity.${it.rarity}`);
    const actions = this.root.querySelector('.cv-actions');
    if (on && isDefault(it)) actions.innerHTML = `<span class="cv-state">${CHECK}${t(l, 'collection.equipped')}</span>`;
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
      for (const b of this.root.querySelectorAll('[data-ctab]')) b.setAttribute('aria-selected', String(b === tab));
      this.env.sound.tab();
      this._renderGrid();
      return;
    }
    const item = e.target.closest('.citem');
    if (item) {
      this.selected = item.dataset.item;
      for (const c of this.root.querySelectorAll('.citem')) c.classList.toggle('selected', c === item);
      this.env.sound.tab();
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
    if (e.target.closest('[data-shop]')) this.env.launch(e, 'shop.html?from=collection');
  }
}
