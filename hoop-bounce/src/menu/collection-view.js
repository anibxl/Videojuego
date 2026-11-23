// Page « Collection » du menu (étape 24) : UNIQUEMENT les objets que le joueur possède. Aucun objet
// verrouillé, aucun prix, aucun bouton d'achat. Chaque objet : aperçu, Équiper / Déséquiper ; l'objet
// utilisé porte le badge « Équipé ». En haut, le résumé de la collection par famille (Skins, Traînées,
// Effets : possédés / total) donne envie de la compléter ; chaque résumé sert aussi de filtre.
// Les objets sont rangés sur des étagères par catégorie (Ballons, Visages, Rebonds, Traînées, Paniers).
//
// Source unique : le porte-monnaie partagé avec la boutique et le jeu (`shared/wallet.js`, clé
// `hoopbounce.inventory`) : ce qu'on achète dans la boutique apparaît ici dès le retour au menu, et
// l'objet équipé est enregistré tout de suite (il reste équipé au prochain lancement).

import { CATALOG, CATEGORIES, DEFAULTS, RARITIES, itemById } from '../shared/catalog.js';
import { Wallet, COLLECTION_GROUPS } from '../shared/wallet.js';
import { Preview, drawThumb } from '../shop/preview.js';
import { ICONS } from './icons.js';
import { t } from './i18n.js';

const CHECK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.5 16.2 5.3 12l-1.4 1.4 5.6 5.6L20.1 8.4 18.7 7z"/></svg>';
const isDefault = (item) => DEFAULTS[item.category] === item.id;
const SEEN_KEY = 'hoopbounce.collectionSeen';
/** Étagères : les ballons avec un visage ont la leur. */
const SHELVES = [
  { id: 'ball', has: (it) => it.category === 'ball' && it.group !== 'fun' },
  { id: 'fun', has: (it) => it.category === 'ball' && it.group === 'fun' },
  { id: 'bounce', has: (it) => it.category === 'bounce' },
  { id: 'trail', has: (it) => it.category === 'trail' },
  { id: 'goal', has: (it) => it.category === 'goal' },
];

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

/** Objets possédés d'une étagère, par rareté (les objets de base en premier). */
export function ownedOn(wallet, shelfId, group = null) {
  const shelf = SHELVES.find((s) => s.id === shelfId);
  const g = group ? COLLECTION_GROUPS.find((x) => x.id === group) : null;
  return CATALOG.filter((it) => shelf.has(it) && wallet.owns(it.id) && (!g || g.categories.includes(it.category))).sort(
    (a, b) => isDefault(b) - isDefault(a) || RARITIES[a.rarity].order - RARITIES[b.rarity].order || (a.price ?? 1e9) - (b.price ?? 1e9),
  );
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
    this.group = null; // filtre : null (tout), 'skins', 'trails', 'effects'
    this.selected = null;
    this.active = false;
    this.preview = null;
    root.addEventListener('click', (e) => this._onClick(e));
  }

  get lang() {
    return this.env.lang();
  }

  render() {
    const l = this.lang;
    this.wallet = new Wallet(); // relu à chaque fois : la boutique a pu changer l'inventaire
    const p = this.wallet.progress();
    this.root.innerHTML = `
      <header class="page-head">
        <button class="icon-btn pressable" data-back aria-label="${t(l, 'back')}">${ICONS.back}</button>
        <h1 id="title-collection"><span class="cl-title-ico ico" aria-hidden="true">${ICONS.collection}</span>${t(l, 'collection.title')}</h1>
        <span class="spacer"></span>
        <span class="cl-total reveal" style="--i:0"><b>${p.percent}%</b>${t(l, 'collection.owned', { n: p.owned, total: p.total })}</span>
        <button class="cl-shop pressable reveal" style="--i:1" data-shop aria-label="${t(l, 'collection.shop')}"><span class="ico" aria-hidden="true">${ICONS.shop}</span><span>${t(l, 'collection.shop')}</span></button>
      </header>
      <div class="cl-body">
        <div class="cl-summary reveal" style="--i:1" role="tablist"></div>
        <section class="cl-stage card reveal" style="--i:2">
          <div class="cl-preview"><canvas></canvas><span class="cl-rarity"></span><span class="cl-equipped">${CHECK}${t(l, 'collection.equipped')}</span></div>
          <div class="cl-detail">
            <h2 class="cl-name"></h2>
            <p class="cl-desc"></p>
            <div class="cl-actions"></div>
          </div>
        </section>
        <section class="cl-shelves"></section>
      </div>`;
    this.preview = new Preview(this.root.querySelector('.cl-preview canvas'));
    if (!this.selected || !this.wallet.owns(this.selected)) this.selected = this.wallet.equipped('ball');
    this.seen = readSeen(this.wallet);
    this._renderSummary();
    this._renderShelves();
    this._renderDetail();
    requestAnimationFrame(() => this.layout());
  }

  /** Résumé : Skins 8/21, Traînées 3/10, Effets 4/20 — chaque carte filtre les étagères. */
  _renderSummary() {
    const l = this.lang;
    const sums = this.wallet.collectionSummary();
    const left = sums.reduce((a, g) => a + g.total - g.owned, 0);
    this.root.querySelector('.cl-summary').innerHTML = sums
      .map((g) => {
        const k = g.total ? g.owned / g.total : 0;
        const full = g.owned === g.total;
        const sub = g.id === 'trails' ? '' : `<small>${t(l, `collection.sum.${g.id}.sub`)}</small>`;
        return `<button class="cl-sum pressable ${full ? 'full' : ''} ${this.group === g.id ? 'on' : ''}" role="tab" aria-selected="${this.group === g.id}" data-group="${g.id}" style="--k:${k.toFixed(3)}">
          <span class="cl-sum-ico ico" aria-hidden="true">${ICONS[g.icon] ?? ''}</span>
          <span class="cl-sum-txt"><b>${t(l, `collection.sum.${g.id}`)}</b>${sub}</span>
          <span class="cl-sum-n">${full ? `<em>${t(l, 'collection.complete')}</em>` : ''}<b>${g.owned}</b>/${g.total}</span>
          <span class="cl-sum-bar"><i></i></span>
        </button>`;
      })
      .join('') + (left ? `<p class="cl-goal">${t(l, 'collection.goal', { n: left })}</p>` : `<p class="cl-goal done">${t(l, 'collection.allOwned')}</p>`);
  }

  _renderShelves() {
    const l = this.lang;
    const host = this.root.querySelector('.cl-shelves');
    let k = 0;
    host.innerHTML = SHELVES.map((s) => {
      const items = ownedOn(this.wallet, s.id, this.group);
      if (!items.length) return '';
      const total = CATALOG.filter(s.has).length;
      const cards = items
        .map((it) => {
          const on = this.wallet.equipped(it.category) === it.id;
          const fresh = !this.seen.has(it.id);
          return `<button class="cl-item pressable ${it.rarity} ${it.id === this.selected ? 'selected' : ''} ${on ? 'on' : ''} ${fresh ? 'fresh' : ''}" data-item="${it.id}"
            style="--r:${RARITIES[it.rarity].rgb};--i:${Math.min(k++, 14)}" aria-label="${it.name[l] ?? it.name.fr} · ${isDefault(it) ? t(l, 'collection.default') : t(l, `rarity.${it.rarity}`)}${on ? ` · ${t(l, 'collection.equipped')}` : ''}">
            <span class="cl-pedestal"><canvas></canvas></span>
            ${on ? `<span class="cl-badge">${CHECK}${t(l, 'collection.equipped')}</span>` : ''}
            ${fresh ? `<span class="cl-new">${t(l, 'collection.new')}</span>` : ''}
            <span class="cl-item-name">${it.name[l] ?? it.name.fr}</span>
            <span class="cl-item-rar">${isDefault(it) ? t(l, 'collection.default') : t(l, `rarity.${it.rarity}`)}</span>
          </button>`;
        })
        .join('');
      return `<div class="cl-shelf">
        <h3>${t(l, `collection.tab.${s.id}`)}<span>${items.length}</span></h3>
        <div class="cl-grid">${cards}</div>
      </div>`;
    }).join('');
    // Les nouveautés ne sont « nouvelles » qu'une fois
    for (const it of CATALOG) if (this.wallet.owns(it.id)) this.seen.add(it.id);
    writeSeen(this.seen);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    requestAnimationFrame(() => {
      for (const el of host.querySelectorAll('.cl-item')) drawThumb(el.querySelector('canvas'), itemById(el.dataset.item), dpr);
    });
  }

  _renderDetail() {
    const l = this.lang;
    const it = itemById(this.selected);
    if (!it) return;
    const rar = RARITIES[it.rarity];
    const on = this.wallet.equipped(it.category) === it.id;
    const stage = this.root.querySelector('.cl-stage');
    stage.style.setProperty('--r', rar.rgb);
    stage.classList.toggle('is-on', on);
    this.root.querySelector('.cl-name').textContent = it.name[l] ?? it.name.fr;
    this.root.querySelector('.cl-desc').textContent = isDefault(it) ? t(l, 'collection.defaultHint') : (it.desc[l] ?? it.desc.fr);
    this.root.querySelector('.cl-rarity').textContent = isDefault(it) ? t(l, 'collection.default') : t(l, `rarity.${it.rarity}`);
    const actions = this.root.querySelector('.cl-actions');
    if (on && isDefault(it)) actions.innerHTML = `<span class="cl-state">${CHECK}${t(l, 'collection.equipped')}</span>`;
    else if (on) actions.innerHTML = `<span class="cl-state">${CHECK}${t(l, 'collection.equipped')}</span><button class="cl-btn ghost pressable" data-unequip>${t(l, 'collection.unequip')}</button>`;
    else actions.innerHTML = `<button class="cl-btn pressable" data-equip>${t(l, 'collection.equip')}</button>`;
    // Aperçu : l'objet choisi, avec le reste de la tenue actuellement équipée
    const look = { ball: this.wallet.equipped('ball'), bounce: this.wallet.equipped('bounce'), trail: this.wallet.equipped('trail'), goal: this.wallet.equipped('goal') };
    look[it.category] = it.id;
    this.preview.set(look, it.category, rar.rgb);
  }

  layout() {
    const box = this.root.querySelector('.cl-preview');
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
    const sum = e.target.closest('[data-group]');
    if (sum) {
      this.group = this.group === sum.dataset.group ? null : sum.dataset.group;
      const all = [...this.root.querySelectorAll('[data-group]')];
      for (const b of all) {
        b.classList.toggle('on', b.dataset.group === this.group);
        b.setAttribute('aria-selected', String(b.dataset.group === this.group));
      }
      this.env.sound.tab(all.indexOf(sum));
      // L'objet montré suit le filtre : l'objet équipé de la famille choisie
      const g = COLLECTION_GROUPS.find((x) => x.id === this.group);
      if (g && !g.categories.includes(itemById(this.selected)?.category)) this.selected = this.wallet.equipped(g.categories[0]);
      this._renderShelves();
      this._renderDetail();
      return;
    }
    const item = e.target.closest('.cl-item');
    if (item) {
      this.selected = item.dataset.item;
      const items = [...this.root.querySelectorAll('.cl-item')];
      for (const c of items) c.classList.toggle('selected', c === item);
      this.env.sound.select(items.indexOf(item));
      this._renderDetail();
      this._bump(this.root.querySelector('.cl-stage'));
      return;
    }
    const it = itemById(this.selected);
    if (e.target.closest('[data-equip]') && it) {
      this.wallet.equip(it.id);
      this.env.sound.equip();
      this.env.vibrate(14);
      this.env.toast(t(l, 'collection.toast.equip', { name: it.name[l] ?? it.name.fr }));
      this._renderShelves();
      this._renderDetail();
      this._bump(this.root.querySelector('.cl-stage'));
      return;
    }
    if (e.target.closest('[data-unequip]') && it) {
      this.wallet.unequip(it.category);
      this.env.sound.toggle(false);
      this.env.vibrate(8);
      this.env.toast(t(l, 'collection.toast.unequip', { name: it.name[l] ?? it.name.fr }));
      this._renderShelves();
      this._renderDetail();
      return;
    }
    if (e.target.closest('[data-shop]')) this.env.launch(e, 'shop.html?from=collection');
  }
}

export { SHELVES, CATEGORIES };
