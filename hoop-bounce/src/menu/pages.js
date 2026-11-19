// Contenu des pages statiques du menu (Modes, Paramètres) ; Mondes et Collection sont des vues
// vivantes (worlds-view.js, collection-view.js).
// Chaque fonction renvoie le HTML de sa page dans la langue demandée ;
// le menu les régénère quand la langue change.

import { ICONS } from './icons.js';
import { LANGUAGE_NAMES, t } from './i18n.js';
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
          <button class="row link pressable" data-nav="apropos" id="set-about">
            <span class="row-icon">${ICONS.info}</span>
            <span class="row-text"><span class="row-label">${t(lang, 'settings.aboutGame')}</span><span class="row-hint">${t(lang, 'about.credits')} · ${t(lang, 'about.links')}</span></span>
            <span class="chev">${ICONS.chevron}</span>
          </button>
          <p class="version">Hoop Bounce · ${t(lang, 'settings.version', { v: APP_VERSION })}</p>
        </section>
      </div>
    </div>
  </div>`;
}
