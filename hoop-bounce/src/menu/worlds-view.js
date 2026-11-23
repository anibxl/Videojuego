// Page « Mondes » du menu : la sélection des mondes, puis les 10 niveaux du monde choisi.
//
//  - 5 grandes cartes (illustration animée du vrai décor, progression, étoiles, cadenas et condition
//    de déblocage) qu'on fait défiler ; seule la carte au centre est animée ;
//  - toucher un monde ouvert affiche tout de suite ses 10 niveaux (numéro, étoiles, coche, cadenas,
//    difficulté) ; tout niveau débloqué se relance d'un toucher, sans passer par une partie ;
//  - la première fois qu'un monde s'ouvre, sa carte joue l'animation de déblocage.

import { WORLDS } from '../game/worlds.js';
import { Progress } from '../game/progress.js';
import { gt } from '../game/i18n.js';
import { WorldArt } from '../worlds/art.js';
import { ICONS } from './icons.js';
import { t } from './i18n.js';

/** Icône de chaque monde (src/menu/icons.js). */
const WORLD_ICON = { city: 'city', snow: 'snow', volcano: 'volcano', forest: 'forest', space: 'space' };
const hexToRgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(', ');
const CHECK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.5 16.2 5.3 12l-1.4 1.4 5.6 5.6L20.1 8.4 18.7 7z"/></svg>';
const formatTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, '0')}`;

export class WorldsView {
  /**
   * @param {HTMLElement} root  la section #page-mondes
   * @param {{ lang: () => string, sound: object, vibrate: Function, toast: Function, launch: Function }} env
   */
  constructor(root, env) {
    this.root = root;
    this.env = env;
    this.progress = new Progress(WORLDS);
    this.progress.unlockAll = new URLSearchParams(location.search).get('unlock') === 'all';
    this.cards = [];
    this.focus = 0;
    this.openWorld = -1;
    this.time = 0;
    this.active = false;
    this.pending = new Set();
    root.addEventListener('click', (e) => this._onClick(e));
  }

  get lang() {
    return this.env.lang();
  }

  /** (Re)construit la page (au démarrage et quand la langue change). */
  render() {
    const l = this.lang;
    this.progress.data = this.progress._read();
    this.pending = new Set(this.progress.pendingUnlocks());
    const tot = this.progress.totals();
    this.root.innerHTML = `
      <header class="page-head">
        <button class="icon-btn pressable" data-back aria-label="${t(l, 'back')}">${ICONS.back}</button>
        <div class="wv-title">
          <h1 id="title-mondes">${t(l, 'worlds.title')}</h1>
          <p class="wv-crumb" aria-live="polite"></p>
        </div>
        <span class="spacer"></span>
        <div class="wv-total reveal" style="--i:0" title="${t(l, 'worlds.total')}">
          <span class="wv-star"></span><b>${tot.stars}</b><i>/ ${tot.maxStars}</i>
          <span class="wv-total-bar"><i style="width:${tot.percent}%"></i></span>
          <span class="wv-total-pct">${tot.percent} %</span>
        </div>
      </header>
      <div class="wv-stage" data-view="worlds">
        <div class="wv-cards" role="list">${WORLDS.map((w, i) => this._cardHtml(w, i)).join('')}</div>
        <div class="wv-levels" aria-hidden="true"></div>
      </div>`;
    this.stage = this.root.querySelector('.wv-stage');
    this.track = this.root.querySelector('.wv-cards');
    this.levelsEl = this.root.querySelector('.wv-levels');
    this.cards = [...this.track.querySelectorAll('.wcard')].map((el, i) => ({
      el,
      index: i,
      art: new WorldArt(el.querySelector('canvas'), WORLDS[i].theme),
      drawn: false,
    }));
    this.track.addEventListener('scroll', () => this._updateFocus(), { passive: true });
    this.track.addEventListener('wheel', (e) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        this.track.scrollLeft += e.deltaY;
        e.preventDefault();
      }
    }, { passive: false });
    this.openWorld = -1;
    requestAnimationFrame(() => this.layout());
  }

  _cardHtml(w, i) {
    const l = this.lang;
    const p = this.progress;
    const s = p.worldStats(i);
    const unlocked = p.isWorldUnlocked(i) && !this.pending.has(i);
    const complete = unlocked && s.done === s.total;
    const prev = WORLDS[i - 1];
    const sparks = Array.from({ length: 10 }, (_, k) => {
      const a = (k / 10) * Math.PI * 2;
      return `<span class="spark" style="--dx:${Math.round(Math.cos(a) * 110)}px;--dy:${Math.round(Math.sin(a) * 80)}px"></span>`;
    }).join('');
    return `
      <button class="wcard pressable reveal ${unlocked ? '' : 'locked'} ${complete ? 'complete' : ''}" role="listitem" data-world="${i}"
        style="--accent-rgb:${hexToRgb(w.accent)};--i:${i + 1};--float:${(i * 0.7).toFixed(1)}s"
        aria-label="${gt(l, 'world.label', { n: w.number })} — ${gt(l, w.nameKey)}${unlocked ? '' : ` — ${t(l, 'worlds.locked')}`}">
        <span class="wcard-art">
          <canvas></canvas>
          <span class="wcard-shine"></span>
          <span class="wcard-num">${w.number}</span>
          ${complete ? `<span class="wcard-badge done">${CHECK}${t(l, 'worlds.complete')}</span>` : ''}
          <span class="wcard-lock">
            <span class="lock-ico"><span class="shackle"></span><span class="body"></span></span>
            ${prev ? `<span class="lock-hint">${t(l, 'worlds.lockHint', { name: gt(l, prev.nameKey) })}</span>` : ''}
          </span>
          <span class="burst"></span><span class="burst b2"></span>${sparks}
          <span class="unlocked-flag">${t(l, 'worlds.unlocked')}</span>
        </span>
        <span class="wcard-info">
          <span class="wcard-title"><span class="emoji ico" aria-hidden="true">${ICONS[WORLD_ICON[w.id]] ?? ''}</span><b>${gt(l, w.nameKey)}</b><em>${t(l, 'worlds.levels', { n: s.total })}</em></span>
          <span class="wcard-tag">${gt(l, w.taglineKey)}</span>
          <span class="wcard-bar"><i style="--w:${s.percent}%"></i></span>
          <span class="wcard-meta"><span class="wv-star"></span>${s.stars}/${s.maxStars}<span class="dot">·</span>${t(l, 'worlds.progress', { done: s.done, total: s.total })}</span>
        </span>
      </button>`;
  }

  // ─── Mise en page et animation ───────────────────────────────────────────

  layout() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    for (const c of this.cards) {
      const box = c.el.querySelector('.wcard-art');
      if (!box.clientWidth) continue;
      c.art.resize(box.clientWidth, box.clientHeight, dpr);
      c.drawn = false;
    }
    if (this.sideArt) {
      const box = this.levelsEl.querySelector('.wl-art');
      if (box?.clientWidth) this.sideArt.resize(box.clientWidth, box.clientHeight, dpr);
    }
    this._updateFocus();
  }

  _updateFocus() {
    if (!this.track) return;
    const mid = this.track.scrollLeft + this.track.clientWidth / 2;
    let best = 0;
    let bestD = Infinity;
    for (const c of this.cards) {
      const d = Math.abs(c.el.offsetLeft + c.el.offsetWidth / 2 - mid);
      if (d < bestD) {
        bestD = d;
        best = c.index;
      }
    }
    if (best === this.focus && this.cards[best].el.classList.contains('focus')) return;
    // Changement de monde sous le doigt : petit « tic » de sélection (pas pendant le recentrage auto)
    if (best !== this.focus && performance.now() > (this._quietUntil ?? 0)) this.env.sound.select?.(best);
    this.focus = best;
    for (const c of this.cards) c.el.classList.toggle('focus', c.index === best);
  }

  /** Appelé à chaque image par le menu quand la page est ouverte. */
  frame(dt) {
    if (!this.active) return;
    this.time += dt;
    if (this.openWorld >= 0) {
      this.sideArt?.draw(this.time);
      return;
    }
    for (const c of this.cards) {
      if (c.index === this.focus || !c.drawn) {
        c.art.draw(this.time + c.index * 3.1);
        c.drawn = true;
      }
    }
  }

  /** La page s'ouvre : on recentre sur le monde à jouer et on joue les déblocages en attente. */
  async onShow(worldId = null) {
    this._quietUntil = performance.now() + 700;
    this.active = true;
    this.render(); // progression relue : elle a pu changer depuis le dernier affichage
    const asked = WORLDS.findIndex((w) => w.id === worldId);
    const resume = this.progress.resume().worldIndex;
    const target = asked >= 0 ? asked : this.pending.size ? Math.min(...this.pending) : resume;
    requestAnimationFrame(() => {
      this.layout();
      this.scrollTo(target, false);
    });
    if (asked >= 0 && this.progress.isWorldUnlocked(asked) && !this.pending.has(asked)) {
      setTimeout(() => this.showLevels(asked, true), 60);
      return;
    }
    for (const i of [...this.pending].sort()) await this._playUnlock(i);
  }

  onHide() {
    this.active = false;
    if (this.openWorld >= 0) this.closeLevels(true);
  }

  scrollTo(i, smooth = true) {
    const c = this.cards[i]?.el;
    if (!c) return;
    this._quietUntil = performance.now() + 700; // défilement automatique : pas de « tic »
    this.track.scrollTo({ left: c.offsetLeft + c.offsetWidth / 2 - this.track.clientWidth / 2, behavior: smooth ? 'smooth' : 'auto' });
  }

  _playUnlock(i) {
    return new Promise((resolve) => {
      setTimeout(() => {
        this.scrollTo(i);
        const c = this.cards[i];
        setTimeout(() => {
          c.el.classList.add('unlocking');
          this.env.sound.tap();
          setTimeout(() => {
            c.el.classList.remove('locked');
            this.env.sound.unlockWorld();
            this.env.vibrate([20, 40, 30]);
          }, 750);
          setTimeout(() => {
            this.pending.delete(i);
            this.progress.markSeen(i);
            c.el.classList.remove('unlocking');
            resolve();
          }, 2600);
        }, 450);
      }, 500);
    });
  }

  // ─── Niveaux d'un monde ──────────────────────────────────────────────────

  showLevels(i, instant = false) {
    const l = this.lang;
    const w = WORLDS[i];
    const p = this.progress;
    const s = p.worldStats(i);
    this.openWorld = i;
    let nextMarked = false;
    const tiles = w.levels.map((def, k) => {
      const open = p.isLevelUnlocked(i, k);
      const done = p.isDone(def.id);
      const stars = p.starsFor(def.id);
      let cls = open ? (done ? 'done' : '') : 'locked';
      if (open && !done && !nextMarked) {
        cls += ' next';
        nextMarked = true;
      }
      const best = p.bestTimeFor(def.id);
      const label = `${w.number}-${def.number} · ${gt(l, def.nameKey)} · ${gt(l, `diff.${def.difficulty}`)}${best ? ` · ${t(l, 'worlds.best', { t: formatTime(best) })}` : ''}`;
      return `
        <button class="ltile pressable ${cls}" data-level="${k}" style="--i:${k}" title="${label}" aria-label="${open ? label : `${label} — ${t(l, 'worlds.locked')}`}">
          <i class="ldiff ${def.difficulty}"></i>
          <b class="lnum">${def.number}</b>
          <span class="lname">${gt(l, def.nameKey)}</span>
          <span class="lstars">${[0, 1, 2].map((n) => `<s class="${n < stars ? 'on' : ''}"></s>`).join('')}</span>
          <span class="lbadge">${open ? (done ? CHECK : '') : ICONS.lock}</span>
          ${cls.includes('next') ? `<span class="lnext">${t(l, 'worlds.next')}</span>` : ''}
        </button>`;
    }).join('');
    this.levelsEl.style.setProperty('--accent-rgb', hexToRgb(w.accent));
    this.levelsEl.innerHTML = `
      <aside class="wl-side">
        <span class="wl-art"><canvas></canvas></span>
        <h2><span class="emoji ico" aria-hidden="true">${ICONS[WORLD_ICON[w.id]] ?? ''}</span>${gt(l, w.nameKey)}</h2>
        <p class="wl-tag">${gt(l, w.taglineKey)}</p>
        <span class="wcard-bar"><i style="--w:${s.percent}%"></i></span>
        <p class="wl-meta"><span class="wv-star"></span>${t(l, 'worlds.stars', { n: s.stars, max: s.maxStars })}<span class="dot">·</span>${t(l, 'worlds.progress', { done: s.done, total: s.total })}</p>
      </aside>
      <div class="wl-main">
        <p class="wl-choose">${t(l, 'worlds.choose')}</p>
        <div class="wl-grid">${tiles}</div>
      </div>`;
    this.sideArt = new WorldArt(this.levelsEl.querySelector('canvas'), w.theme);
    this.root.querySelector('.wv-crumb').textContent = `${gt(l, 'world.label', { n: w.number })} · ${gt(l, w.nameKey)}`;
    this.stage.classList.toggle('instant', instant);
    this.stage.dataset.view = 'levels';
    this.levelsEl.setAttribute('aria-hidden', 'false');
    this.track.setAttribute('aria-hidden', 'true');
    requestAnimationFrame(() => {
      this.layout();
      this.stage.classList.remove('instant');
      (this.levelsEl.querySelector('.ltile.next') ?? this.levelsEl.querySelector('.ltile.done'))?.focus({ preventScroll: true });
    });
  }

  closeLevels(silent = false) {
    if (this.openWorld < 0) return false;
    const i = this.openWorld;
    this.openWorld = -1;
    this.stage.dataset.view = 'worlds';
    this.levelsEl.setAttribute('aria-hidden', 'true');
    this.track.setAttribute('aria-hidden', 'false');
    this.root.querySelector('.wv-crumb').textContent = '';
    this.sideArt = null;
    if (!silent) this.env.sound.back();
    for (const c of this.cards) c.drawn = false;
    this.cards[i]?.el.focus({ preventScroll: true });
    return true;
  }

  // ─── Touchers ────────────────────────────────────────────────────────────

  _onClick(e) {
    const card = e.target.closest('.wcard');
    if (card && this.openWorld < 0) {
      const i = +card.dataset.world;
      if (card.classList.contains('unlocking')) return;
      if (card.classList.contains('locked')) {
        this.env.sound.locked();
        this.env.vibrate([10, 40, 10]);
        card.classList.remove('shake');
        void card.offsetWidth;
        card.classList.add('shake');
        const prev = WORLDS[i - 1];
        this.env.toast(t(this.lang, 'worlds.lockToast', { name: gt(this.lang, prev.nameKey) }));
        return;
      }
      if (i !== this.focus) this.scrollTo(i);
      this.env.sound.open();
      this.showLevels(i);
      return;
    }
    const tile = e.target.closest('.ltile');
    if (tile && this.openWorld >= 0) {
      const k = +tile.dataset.level;
      const w = WORLDS[this.openWorld];
      if (tile.classList.contains('locked')) {
        this.env.sound.locked();
        this.env.vibrate([10, 40, 10]);
        tile.classList.remove('shake');
        void tile.offsetWidth;
        tile.classList.add('shake');
        this.env.toast(t(this.lang, 'worlds.levelLocked', { n: k }));
        return;
      }
      const def = w.levels[k];
      // L'introduction du monde n'est montrée qu'au tout premier niveau, tant qu'il n'est pas terminé
      const intro = k === 0 && !this.progress.isDone(def.id) ? '&intro=1' : '';
      tile.classList.add('launch');
      this.env.launch(e, `play.html?world=${w.id}&level=${def.number}${intro}`);
    }
  }
}
