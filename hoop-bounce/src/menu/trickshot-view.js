// Menu du mode TRICKSHOT : deux pages.
//  - « trickshot » : présentation du mode (illustration animée, description, niveaux terminés, étoiles,
//    progression, bouton Jouer) ;
//  - « trickshot-niveaux » : les 50 niveaux, par chapitre (numéro, étoiles, meilleur score, difficulté
//    dans le coin supérieur gauche, cadenas si verrouillé). Le niveau suivant se débloque en terminant
//    le précédent.
// La progression est celle du mode (src/trickshot/progress.js), indépendante du mode principal.

import { ICONS } from './icons.js';
import { t as mt } from './i18n.js';
import { TS_LEVELS } from '../trickshot/levels.js';
import { CHAPTERS, DIFFICULTIES } from '../trickshot/config.js';
import { TrickshotProgress } from '../trickshot/progress.js';
import { tt, pick } from '../trickshot/i18n.js';

const STAR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z"/></svg>';

/** Illustration du mode : l'arène, le lance-pierre, l'arc pointillé, le rebond sur le mur, le panier. */
export const TRICKSHOT_ART = () => `<svg viewBox="0 0 320 160" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
  <defs>
    <linearGradient id="tsa-bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#04050d"/><stop offset="1" stop-color="#121640"/></linearGradient>
    <radialGradient id="tsa-glow" cx="50%" cy="70%" r="60%"><stop offset="0" stop-color="rgb(63,224,255)" stop-opacity=".22"/><stop offset="1" stop-color="rgb(63,224,255)" stop-opacity="0"/></radialGradient>
    <pattern id="tsa-grid" width="16" height="16" patternUnits="userSpaceOnUse"><path d="M16 0H0V16" fill="none" stroke="rgba(63,224,255,.08)"/></pattern>
    <radialGradient id="tsa-ball" cx="35%" cy="30%" r="75%"><stop offset="0" stop-color="#ffb26b"/><stop offset=".5" stop-color="#ff7a2f"/><stop offset="1" stop-color="#c8430f"/></radialGradient>
  </defs>
  <rect width="320" height="160" fill="url(#tsa-bg)"/><rect width="320" height="160" fill="url(#tsa-grid)"/><rect width="320" height="160" fill="url(#tsa-glow)"/>
  <text x="300" y="132" text-anchor="end" class="tsa-num">50</text>
  <rect x="0" y="136" width="320" height="24" fill="#141a36"/><rect x="0" y="136" width="320" height="2" fill="rgba(63,224,255,.8)"/>
  <rect x="150" y="62" width="14" height="74" rx="2" fill="#1d2448" stroke="rgba(63,224,255,.7)" stroke-width="1.5"/>
  <path class="tsa-arc" d="M52 118 Q 120 10 158 60 Q 196 22 252 74" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-dasharray="1 9"/>
  <g transform="translate(250 66)"><rect x="18" y="-22" width="4" height="92" fill="#8a93ad"/><rect x="10" y="-28" width="22" height="26" rx="2" fill="rgba(255,255,255,.9)" stroke="#ff6c78" stroke-width="1.5"/><ellipse cx="2" cy="8" rx="11" ry="2.8" fill="none" stroke="#ff7a2f" stroke-width="2.6"/><path d="M-8 9 L-4 24 L8 24 L12 9" fill="none" stroke="rgba(255,255,255,.7)" stroke-width="1"/></g>
  <g class="tsa-pad"><ellipse cx="52" cy="134" rx="16" ry="4" fill="none" stroke="rgb(63,224,255)" stroke-width="2"/></g>
  <path d="M38 132 L44 122 M66 132 L60 122" stroke="rgb(63,224,255)" stroke-width="2.5" stroke-linecap="round"/>
  <g class="tsa-ball"><circle cx="52" cy="122" r="9" fill="url(#tsa-ball)"/><path d="M43 122h18M52 113v18" stroke="#2a1206" stroke-width="1.2" opacity=".7"/></g>
  <g class="tsa-spark" fill="#ffd65a"><circle cx="252" cy="70" r="2.5"/><circle cx="262" cy="62" r="1.8"/><circle cx="244" cy="60" r="1.6"/></g>
</svg>`;

export class TrickshotView {
  /**
   * @param {HTMLElement} hub     page « trickshot »
   * @param {HTMLElement} levels  page « trickshot-niveaux »
   * @param {object} env          { lang, sound, vibrate, toast, launch }
   */
  constructor(hub, levels, env) {
    this.hub = hub;
    this.levelsEl = levels;
    this.env = env;
    this.active = false;
    hub.addEventListener('click', (e) => this._onHubClick(e));
    levels.addEventListener('click', (e) => this._onLevelClick(e));
  }

  get lang() {
    return this.env.lang();
  }

  _progress() {
    return new TrickshotProgress({ total: TS_LEVELS.length });
  }

  render() {
    this.renderHub();
    this.renderLevels();
  }

  renderHub() {
    const l = this.lang;
    const P = this._progress();
    const s = P.summary();
    const next = P.next();
    const t = (k, v) => tt(l, k, v);
    const chapters = CHAPTERS.map((c, i) => {
      let done = 0;
      for (let n = c.from; n <= c.to; n++) if (P.isDone(n)) done++;
      return `<li class="tsh-ch reveal" style="--i:${i + 4};--a:${c.accent};--p:${done / 10}"><span class="tsh-ch-n">${i + 1}</span><b>${t(`chapter.${c.id}`)}</b><span class="tsh-ch-bar"><i></i></span><em>${done}/10</em></li>`;
    }).join('');
    this.hub.innerHTML = `
      <header class="page-head">
        <button class="icon-btn pressable" data-back aria-label="${mt(l, 'back')}">${ICONS.back}</button>
        <h1 id="title-trickshot">${t('mode')}</h1>
        <span class="spacer"></span>
      </header>
      <div class="page-body tsh">
        <section class="tsh-hero reveal" style="--i:0">
          <span class="tsh-art">${TRICKSHOT_ART()}</span>
          <span class="tsh-hero-txt">
            <span class="tsh-tag">🎯 ${t('tagline')}</span>
            <span class="tsh-desc">${t('desc')}</span>
            <button class="tsh-play pressable" data-ts-play>
              <span class="tsh-play-ico">${ICONS.play ?? '▶'}</span>
              <span class="tsh-play-txt"><b>${t('play')}</b><small>${s.done === s.total ? t('allDone') : t('continue', { n: next })}</small></span>
            </button>
          </span>
        </section>
        <section class="tsh-stats">
          <div class="tsh-stat reveal" style="--i:1"><b>${s.done}<small>/${s.total}</small></b><span>${t('done')}</span></div>
          <div class="tsh-stat reveal" style="--i:2"><b><span class="tsh-star">${STAR}</span>${s.stars}<small>/${s.maxStars}</small></b><span>${t('stars')}</span></div>
          <div class="tsh-stat reveal" style="--i:3"><b>${s.percent}<small>%</small></b><span>${t('progress')}</span><span class="tsh-bar"><i style="--w:${s.percent}%"></i></span></div>
        </section>
        <ul class="tsh-chapters">${chapters}</ul>
      </div>`;
  }

  renderLevels() {
    const l = this.lang;
    const P = this._progress();
    const s = P.summary();
    const next = P.next();
    const t = (k, v) => tt(l, k, v);
    let i = 0;
    const groups = CHAPTERS.map((c, ci) => {
      const tiles = TS_LEVELS.filter((d) => d.n >= c.from && d.n <= c.to).map((d) => {
        const lv = P.level(d.n);
        const open = P.isUnlocked(d.n);
        const cls = [open ? '' : 'locked', lv.stars ? 'done' : '', open && d.n === next && !lv.stars ? 'next' : ''].join(' ');
        const stars = [0, 1, 2].map((k) => `<span class="${k < lv.stars ? 'on' : ''}">${STAR}</span>`).join('');
        const label = `${t('level', { n: d.n })} · ${pick(d.name, l)} · ${t(`diff.${d.diff}`)}`;
        return `<button class="tsl pressable ${cls}" data-ts-level="${d.n}" style="--i:${i++ % 10};--d:${DIFFICULTIES[d.diff].color}" aria-label="${open ? label : `${label} — ${t('locked', { n: d.n - 1 })}`}" title="${pick(d.name, l)}">
          <span class="tsl-diff d-${d.diff}" title="${t(`diff.${d.diff}`)}"><i></i>${t(`diff.${d.diff}`)}</span>
          <span class="tsl-num">${d.n}</span>
          ${open ? `<span class="tsl-stars">${stars}</span><span class="tsl-best">${lv.best ? `${t('best')} ${lv.best.toLocaleString(l)}` : '—'}</span>` : `<span class="tsl-lock">${ICONS.lock}</span>`}
        </button>`;
      }).join('');
      return `<section class="tsl-group reveal" style="--i:${ci + 1};--a:${c.accent}">
        <h2><span class="tsl-ch-n">${ci + 1}</span>${t(`chapter.${c.id}`)}<em>${c.from}–${c.to}</em></h2>
        <div class="tsl-grid">${tiles}</div>
      </section>`;
    }).join('');
    this.levelsEl.innerHTML = `
      <header class="page-head">
        <button class="icon-btn pressable" data-back aria-label="${mt(l, 'back')}">${ICONS.back}</button>
        <h1 id="title-trickshot-niveaux">${t('mode')} · ${t('levels')}</h1>
        <span class="spacer"></span>
        <span class="tsl-summary"><span class="tsh-star">${STAR}</span>${s.stars}/${s.maxStars} · ${s.done}/${s.total}</span>
      </header>
      <div class="page-body tsl-body">
        <p class="tsl-legend reveal" style="--i:0">${['easy', 'hard', 'very', 'impossible'].map((d) => `<span class="d-${d}" style="--d:${DIFFICULTIES[d].color}"><i></i>${t(`diff.${d}`)}</span>`).join('')}</p>
        ${groups}
      </div>`;
  }

  onShow(page) {
    this.active = true;
    this.render();
    if (page === 'trickshot-niveaux') {
      // Fait défiler jusqu'au niveau à jouer
      requestAnimationFrame(() => this.levelsEl.querySelector('.tsl.next, .tsl.done:last-of-type')?.scrollIntoView({ block: 'center', behavior: 'auto' }));
    }
  }

  onHide() {
    this.active = false;
  }

  _onHubClick(e) {
    if (e.target.closest('[data-ts-play]')) {
      this.env.sound.open();
      this.env.showPage('trickshot-niveaux');
    }
  }

  _onLevelClick(e) {
    const tile = e.target.closest('[data-ts-level]');
    if (!tile) return;
    const n = +tile.dataset.tsLevel;
    if (tile.classList.contains('locked')) {
      this.env.sound.locked();
      this.env.vibrate([10, 40, 10]);
      tile.classList.remove('shake');
      void tile.offsetWidth;
      tile.classList.add('shake');
      this.env.toast(tt(this.lang, 'locked', { n: n - 1 }));
      return;
    }
    this.env.launch(e, `trickshot.html?level=${n}`);
  }
}
