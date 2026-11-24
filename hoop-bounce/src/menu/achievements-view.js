// PAGE « SUCCÈS » (phase 5) — index.html#succes.
//
// Même langage que le Hoop Pass : à gauche un panneau (emblème du joueur, progression totale, compteurs,
// « Tout récupérer ») ; à droite les onglets des catégories et les cartes des succès.
// Chaque carte : médaille hexagonale à la couleur du palier (icône), nom, description, barre de progression
// animée (« 27 / 50 »), récompense, état (Verrouillé · En cours · Débloqué → Récupérer · Obtenu).
// Les défis cachés n'apparaissent qu'une fois découverts ; avant, seul leur nombre est affiché.
// Tout est lu dans la sauvegarde (src/shared/achievements.js) et y est écrit dès qu'une récompense est récupérée.

import { CATEGORIES, EMBLEMS, ACHIEVEMENTS, TIERS } from '../shared/achievements.js';
import { lt } from '../shared/live-i18n.js';
import { achIcon, rewardBits } from '../shared/unlock-card.js';
import { ICONS } from './icons.js';
import { t } from './i18n.js';
import { LiveView, liveContext, header } from './live-views.js';

const CHECK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.5 16.2 5.3 12l-1.4 1.4 5.6 5.6L20.1 8.4 18.7 7z" fill="currentColor"/></svg>';
const fmt = (lang, n) => n.toLocaleString(lang === 'en' ? 'en-US' : lang === 'es' ? 'es-ES' : 'fr-FR');
const ORDER = { ready: 0, progress: 1, locked: 2, claimed: 3 };
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

/** Succès qui donne chaque emblème (pour « Gagné avec : … »). */
const EMBLEM_SOURCE = Object.fromEntries(ACHIEVEMENTS.filter((a) => a.reward.emblem).map((a) => [a.reward.emblem, a.id]));

export class AchievementsView extends LiveView {
  constructor(root, env) {
    super(root, env);
    this.cat = 'progression';
    this.picker = false;
    this.seen = new Set(); // barres déjà animées (pas de nouvelle animation à chaque rafraîchissement)
  }

  onShow(...args) {
    this.seen.clear();
    super.onShow(...args);
  }

  /** Valeur affichée : « 27 / 50 », « 12 / 30 min ». */
  valueText(l, a) {
    if (a.icon === 'clock') return `${fmt(l, Math.floor(a.value / 60))} / ${fmt(l, Math.round(a.target / 60))} min`;
    return `${fmt(l, a.value)} / ${fmt(l, a.target)}`;
  }

  card(l, a, i) {
    const tier = TIERS[a.tier];
    const p = a.value / a.target;
    const animate = !this.seen.has(a.id);
    this.seen.add(a.id);
    const showBar = a.target > 1 || a.state === 'progress';
    const stateLabel = `<span class="ac-state s-${a.state}">${a.state === 'claimed' ? CHECK : a.state === 'locked' ? ICONS.lock : ''}${lt(l, `ach.state.${a.state}`)}</span>`;
    const action = a.state === 'ready' ? `<button class="ac-claim pressable" data-ach="${a.id}">${t(l, 'ach.claim')}</button>` : stateLabel;
    return `
      <article class="ac-card${animate ? ' anim' : ''}" data-state="${a.state}" data-tier="${a.tier}"${a.hidden ? ' data-hidden' : ''} style="--t:${tier.rgb};--i:${Math.min(i, 12)};--p:${p.toFixed(3)}">
        <span class="ac-medal" aria-hidden="true"><span>${achIcon(a.icon)}</span>${a.state === 'locked' ? `<i class="ac-lock">${ICONS.lock}</i>` : ''}</span>
        <div class="ac-main">
          <p class="ac-tier">${lt(l, `tier.${a.tier}`)}${a.hidden ? ` · ${lt(l, 'cat.challenges')}` : ''}</p>
          <h2 class="ac-name">${esc(lt(l, `ach.${a.id}`))}</h2>
          <p class="ac-desc">${esc(lt(l, `ach.${a.id}.d`))}</p>
          ${showBar ? `<div class="ac-progress"><span class="ac-bar"><i></i></span><b>${this.valueText(l, a)}</b></div>` : ''}
          <div class="ac-foot"><div class="ac-reward">${rewardBits(l, a.reward, a.xp)}</div>${action}</div>
        </div>
      </article>`;
  }

  render(quiet = false) {
    const l = this.lang;
    const c = (this.ctx = liveContext());
    const all = c.achievements.view(c);
    const visible = all.filter((a) => a.state !== 'secret');
    const total = all.length;
    const got = all.filter((a) => a.state === 'claimed').length;
    const ready = all.filter((a) => a.state === 'ready').length;
    const unlocked = all.filter((a) => a.state === 'ready' || a.state === 'claimed').length;
    const inProgress = all.filter((a) => a.state === 'progress').length;
    const secretLeft = all.filter((a) => a.state === 'secret').length;
    const pct = Math.round((100 * unlocked) / total);

    // Onglets des catégories
    const tabs = Object.entries(CATEGORIES).map(([k, cat]) => {
      const items = all.filter((a) => a.cat === k);
      const done = items.filter((a) => a.state === 'ready' || a.state === 'claimed').length;
      const r = items.filter((a) => a.state === 'ready').length;
      return `<button role="tab" class="pressable" data-cat="${k}" aria-selected="${k === this.cat}" style="--c:${cat.rgb}"><span class="ac-tab-ic">${ICONS[cat.icon] ?? ''}</span>${lt(l, `cat.${k}`)}<small>${done}/${items.length}</small>${r ? '<i class="dot"></i>' : ''}</button>`;
    }).join('');

    // Cartes de la catégorie : à récupérer d'abord, puis en cours (les plus avancés), verrouillés, obtenus
    const list = visible
      .filter((a) => a.cat === this.cat)
      .sort((a, b) => ORDER[a.state] - ORDER[b.state] || (a.state === 'progress' ? b.value / b.target - a.value / a.target : 0) || TIERS[a.tier].order - TIERS[b.tier].order);
    let cards = list.map((a, i) => this.card(l, a, i)).join('');
    if (this.cat === 'challenges') {
      cards += `
        <article class="ac-mystery" style="--i:${Math.min(list.length, 12)}">
          <span class="ac-mystery-ic" aria-hidden="true">${ICONS.mystery}</span>
          <div>
            <h2>${secretLeft ? lt(l, 'ach.hidden.left', { n: secretLeft }) : lt(l, 'ach.hidden.all')}</h2>
            <p>${secretLeft ? lt(l, 'ach.hidden.hint') : ''}</p>
          </div>
        </article>`;
    }

    // Panneau de gauche : emblème, progression, compteurs
    const emblem = c.achievements.emblem();
    const owned = c.achievements.emblems();
    const em = EMBLEMS[emblem];
    const side = `
      <aside class="ac-side-panel reveal" style="--i:1">
        <button class="ac-emblem pressable" data-emblem-open aria-label="${lt(l, 'ach.emblem.pick')}" style="--e:${em.rgb}">
          <span class="ac-emblem-medal" aria-hidden="true"><span>${ICONS[em.icon]}</span></span>
          <span class="ac-emblem-text"><small>${lt(l, 'ach.emblem')}</small><b>${lt(l, `emblem.${emblem}`)}</b><em>${lt(l, 'ach.emblem.count', { n: owned.length, total: Object.keys(EMBLEMS).length })}</em></span>
        </button>
        <div class="ac-total">
          <div class="ac-total-row"><b>${unlocked}<small> / ${total}</small></b><span>${pct} %</span></div>
          <span class="ac-total-bar"><i style="--p:${(unlocked / total).toFixed(3)}"></i></span>
          <p class="ac-counts"><span class="u">${lt(l, 'ach.unlocked', { n: unlocked })}</span> · <span>${lt(l, 'ach.inprogress', { n: inProgress })}</span></p>
        </div>
        ${ready > 1 ? `<button class="ac-claim-all pressable" data-claim-all>${t(l, 'ach.claimAll')}<span>${ready}</span></button>` : ready ? `<p class="ac-ready-chip">${t(l, 'ach.ready', { n: ready })}</p>` : ''}
      </aside>`;

    // Choix de l'emblème
    const picker = this.picker ? `
      <div class="ac-picker" role="dialog" aria-modal="true" aria-label="${lt(l, 'ach.emblem.pick')}">
        <div class="ac-picker-back" data-emblem-close></div>
        <div class="ac-picker-sheet">
          <header><h2>${lt(l, 'ach.emblem.pick')}</h2><button class="icon-btn pressable" data-emblem-close aria-label="${t(l, 'close')}">${ICONS.close}</button></header>
          <div class="ac-picker-grid">${Object.entries(EMBLEMS).map(([id, e]) => {
            const has = owned.includes(id);
            const src = EMBLEM_SOURCE[id];
            return `<button class="ac-em pressable${id === emblem ? ' on' : ''}" ${has ? `data-emblem="${id}"` : 'disabled'} style="--e:${e.rgb}">
              <span class="ac-emblem-medal" aria-hidden="true"><span>${ICONS[e.icon]}</span></span>
              <b>${lt(l, `emblem.${id}`)}</b>
              <small>${has ? (id === emblem ? CHECK : '') : `${ICONS.lock}${src ? esc(lt(l, 'ach.emblem.how', { name: lt(l, `ach.${src}`) })) : ''}`}</small>
            </button>`;
          }).join('')}</div>
        </div>
      </div>` : '';

    const scroll = this.root.querySelector('.ac-grid')?.scrollTop ?? 0;
    this.root.innerHTML = `
      ${header(l, 'succes', 'ach.title', `<div class="cv-count reveal" style="--i:0"><span class="cv-count-bar"><i style="width:${Math.round((100 * got) / total)}%"></i></span><b>${t(l, 'ach.count', { n: got, total })}</b></div>`)}
      <div class="lv-body ac-body">
        ${side}
        <div class="ac-content">
          <nav class="ac-tabs reveal" role="tablist" style="--i:1">${tabs}</nav>
          <div class="ac-grid" data-cat="${this.cat}">${cards}</div>
        </div>
      </div>
      ${picker}`;
    if (quiet) {
      for (const r of this.root.querySelectorAll('.reveal')) r.style.animation = 'none';
      const g = this.root.querySelector('.ac-grid');
      if (g) g.scrollTop = scroll;
    }
    this.root.querySelector('.ac-tabs [aria-selected="true"]')?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
    this.setCoins(c);
  }

  async onClick(e) {
    const tab = e.target.closest('[data-cat]');
    if (tab && tab.closest('.ac-tabs')) {
      if (this.cat === tab.dataset.cat) return;
      this.cat = tab.dataset.cat;
      this.env.sound.tab?.();
      this.render(true);
      this.root.querySelector('.ac-grid')?.scrollTo?.(0, 0);
      return;
    }
    if (e.target.closest('[data-emblem-open]')) {
      this.picker = true;
      this.env.sound.open?.();
      this.render(true);
      return;
    }
    if (e.target.closest('[data-emblem-close]')) {
      this.picker = false;
      this.render(true);
      return;
    }
    const em = e.target.closest('[data-emblem]');
    if (em) {
      const c = liveContext();
      if (c.achievements.setEmblem(em.dataset.emblem)) {
        this.env.sound.select?.();
        this.env.vibrate?.(12);
      }
      this.picker = false;
      this.render(true);
      return;
    }
    if (e.target.closest('[data-claim-all]')) {
      await this.claimAll(e.target.closest('[data-claim-all]'));
      return;
    }
    const b = e.target.closest('[data-ach]');
    if (!b) return;
    b.disabled = true;
    b.closest('.ac-card')?.classList.add('claiming');
    this.env.sound.open?.();
    await new Promise((r) => setTimeout(r, 400));
    const c = liveContext();
    const res = c.achievements.claim(b.dataset.ach, c);
    if (res) await this.celebrateAch([res]);
    else this.render(true);
  }

  /** Récupère tous les succès débloqués d'un coup (une seule révélation). */
  async claimAll(btn) {
    btn.disabled = true;
    for (const card of this.root.querySelectorAll('.ac-card[data-state="ready"]')) card.classList.add('claiming');
    this.env.sound.open?.();
    await new Promise((r) => setTimeout(r, 400));
    const c = liveContext();
    const out = [];
    for (const a of c.achievements.view(c).filter((x) => x.state === 'ready')) {
      const r = c.achievements.claim(a.id, c);
      if (r) out.push(r);
    }
    if (out.length) await this.celebrateAch(out);
    else this.render(true);
  }

  async celebrateAch(results) {
    const sum = { coins: 0, gems: 0, items: [], chest: null };
    const emblems = [];
    for (const r of results) {
      sum.coins += r.coins ?? 0;
      sum.gems += r.gems ?? 0;
      if (r.item) sum.items.push(r.item);
      if (r.chest) sum.chest = r.chest;
      if (r.emblem) emblems.push(r.emblem);
    }
    await this.celebrate({ coins: sum.coins, gems: sum.gems, items: sum.items.length ? sum.items : undefined, item: sum.items[0] ?? null, chest: sum.chest }, t(this.lang, 'ach.got'));
    if (emblems.length) this.env.toast?.(`${lt(this.lang, 'reward.emblem')} : ${emblems.map((x) => lt(this.lang, `emblem.${x}`)).join(', ')}`);
  }
}
