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

// ─── Modes à venir ──────────────────────────────────────────────────────────
//
// Trois modes prévus pour de futures mises à jour (étape 19). Rien n'est jouable : ce ne sont que des
// cartes de présentation, avec une illustration animée (SVG + animations CSS légères, en pause quand la
// page est fermée) et un cadenas « À venir ». Toucher une carte : petit refus animé et message.
// Pour ouvrir un mode le jour venu : retirer `data-locked`, brancher la carte sur sa page.

const BALL_SEAMS = '<path d="M-7 0h14M0-7v14" stroke="#2a1206" stroke-width="1.1" opacity=".7"/><path d="M-4.6-5.2c2 1.6 2 8.8 0 10.4M4.6-5.2c-2 1.6-2 8.8 0 10.4" fill="none" stroke="#2a1206" stroke-width="1" opacity=".7"/>';
const ball = (fill, id) => `<g class="m-ball-body"><circle r="7.2" fill="url(#${id})"/>${BALL_SEAMS}<ellipse cx="-2.4" cy="-3" rx="2.6" ry="1.5" fill="#fff" opacity=".28"/></g>
  <defs><radialGradient id="${id}" cx="35%" cy="30%" r="75%"><stop offset="0" stop-color="${fill[0]}"/><stop offset=".5" stop-color="${fill[1]}"/><stop offset="1" stop-color="${fill[2]}"/></radialGradient></defs>`;
const ORANGE = ['#ffb26b', '#ff7a2f', '#c8430f'];
const CYAN = ['#b5f3ff', '#3fc8ff', '#1474b8'];
const VIOLET = ['#e2ccff', '#a87bff', '#5b33b8'];

/** Endless : course infinie au-dessus des vagues, plateformes qui défilent sans fin. */
const ART_ENDLESS = () => `<svg viewBox="0 0 320 150" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
  <defs>
    <linearGradient id="me-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#071634"/><stop offset=".62" stop-color="#0d3f78"/><stop offset="1" stop-color="#1b7fc0"/></linearGradient>
    <radialGradient id="me-sun" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#bff4ff" stop-opacity=".95"/><stop offset=".35" stop-color="#5fd0ff" stop-opacity=".45"/><stop offset="1" stop-color="#5fd0ff" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="320" height="150" fill="url(#me-sky)"/>
  <g class="m-twinkle" fill="#fff"><circle cx="34" cy="20" r="1"/><circle cx="92" cy="12" r=".8"/><circle cx="150" cy="26" r="1.1"/><circle cx="214" cy="14" r=".8"/><circle cx="268" cy="30" r="1"/><circle cx="300" cy="10" r=".7"/></g>
  <circle cx="232" cy="92" r="58" fill="url(#me-sun)"/>
  <text x="232" y="104" text-anchor="middle" class="m-infinity">∞</text>
  <g class="m-scroll-slow"><path d="M0 104 Q20 96 40 104 T80 104 T120 104 T160 104 T200 104 T240 104 T280 104 T320 104 T360 104 T400 104 T440 104 T480 104 T520 104 T560 104 T600 104 T640 104 V150 H0Z" fill="#1e6fb0" opacity=".55"/></g>
  <g class="m-scroll"><g fill="#cfe9ff">
    <rect x="10" y="88" width="46" height="8" rx="3"/><rect x="76" y="76" width="38" height="8" rx="3"/><rect x="134" y="92" width="44" height="8" rx="3"/><rect x="198" y="72" width="40" height="8" rx="3"/><rect x="258" y="84" width="46" height="8" rx="3"/>
    <rect x="330" y="88" width="46" height="8" rx="3"/><rect x="396" y="76" width="38" height="8" rx="3"/><rect x="454" y="92" width="44" height="8" rx="3"/><rect x="518" y="72" width="40" height="8" rx="3"/><rect x="578" y="84" width="46" height="8" rx="3"/>
  </g><g fill="#ffd65a" class="m-coins"><circle cx="95" cy="62" r="3"/><circle cx="218" cy="58" r="3"/><circle cx="415" cy="62" r="3"/><circle cx="538" cy="58" r="3"/></g></g>
  <g class="m-scroll-fast"><path d="M0 120 Q20 112 40 120 T80 120 T120 120 T160 120 T200 120 T240 120 T280 120 T320 120 T360 120 T400 120 T440 120 T480 120 T520 120 T560 120 T600 120 T640 120 V150 H0Z" fill="#3fb3ff" opacity=".85"/><path d="M0 120 Q20 112 40 120 T80 120 T120 120 T160 120 T200 120 T240 120 T280 120 T320 120 T360 120 T400 120 T440 120 T480 120 T520 120 T560 120 T600 120 T640 120" fill="none" stroke="#e6fbff" stroke-width="1.6" opacity=".8"/></g>
  <g transform="translate(110 0)"><g class="m-trail" stroke="#bff4ff" stroke-linecap="round"><path d="M-30 64h18M-36 72h22M-28 80h14" stroke-width="2" opacity=".6"/></g>
  <g class="m-hop"><g transform="translate(0 70)">${ball(ORANGE, 'me-ball')}</g></g></g>
  <g class="m-hud"><rect x="12" y="10" width="78" height="20" rx="10" fill="rgba(4,10,24,.55)" stroke="rgba(160,220,255,.35)"/><text x="51" y="24" text-anchor="middle">2 480 m</text></g>
</svg>`;

/**
 * Course multijoueur : écran partagé, deux joueurs sur le MÊME niveau (même plateforme, mêmes pics,
 * même panier). J2 part plus vite mais se fait piéger par les pics et repart du début : J1 marque le
 * premier. Une compétition de maîtrise, pas une course de vitesse pure.
 */
const RACE_BAND = (y, id, tint, n, prefix) => `<g transform="translate(0 ${y})">
    <rect width="320" height="73" fill="url(#mr-sky)"/>
    <g fill="#fff" opacity=".5"><circle cx="60" cy="12" r=".9"/><circle cx="140" cy="8" r=".7"/><circle cx="200" cy="16" r=".9"/></g>
    <rect x="0" y="58" width="320" height="15" fill="#2b2140"/><rect x="0" y="58" width="320" height="2.5" fill="#6b5a92"/>
    <rect x="92" y="38" width="40" height="7" rx="2.5" fill="#8f7cc2"/>
    <path d="M150 58l5-9 5 9zM160 58l5-9 5 9zM170 58l5-9 5 9z" fill="#ff5a6a"/>
    <rect x="252" y="12" width="3" height="46" fill="#c8ccd6"/><rect x="244" y="10" width="18" height="16" rx="1.5" fill="rgba(255,255,255,.9)" stroke="#ff6c78" stroke-width="1.2"/>
    <ellipse cx="236" cy="26" rx="8.5" ry="2.2" fill="none" stroke="#ff7a2f" stroke-width="2"/><path d="M228 27 L231 37 L241 37 L244 27" fill="none" stroke="rgba(255,255,255,.65)" stroke-width=".9"/>
    <g class="m-player ${id}"><g class="m-hop"><g transform="translate(0 50)">${ball(tint, `mr-${id}`)}</g></g></g>
    <g class="m-pop ${id}"><circle cx="165" cy="48" r="9" fill="none" stroke="#ff9aa4" stroke-width="2"/></g>
    <rect x="8" y="7" width="26" height="15" rx="7.5" fill="rgba(10,4,20,.65)" stroke="${n === 1 ? '#ff9a52' : '#5fd0ff'}" stroke-width="1.2"/>
    <text x="21" y="18" text-anchor="middle" class="m-tag">${prefix}${n}</text>
  </g>`;
const ART_RACE = (lang) => `<svg viewBox="0 0 320 150" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
  <defs><linearGradient id="mr-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1a0b2e"/><stop offset="1" stop-color="#4a1640"/></linearGradient></defs>
  ${RACE_BAND(0, 'p1', ORANGE, 1, lang === 'en' ? 'P' : 'J')}
  ${RACE_BAND(77, 'p2', CYAN, 2, lang === 'en' ? 'P' : 'J')}
  <rect y="73" width="320" height="4" fill="#0a0414"/>
  <g class="m-goal"><circle cx="236" cy="26" r="14" fill="none" stroke="#ffd65a" stroke-width="2.5"/></g>
  <g class="m-vs" transform="translate(160 75)"><circle r="13" fill="#140822" stroke="#ff6c78" stroke-width="2"/><text y="4" text-anchor="middle">VS</text></g>
</svg>`;

/** Créateur de maps : plan quadrillé, outils, une plateforme posée par le curseur, pics et panier. */
const ART_CREATOR = () => `<svg viewBox="0 0 320 150" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
  <defs>
    <linearGradient id="mc-bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#062a2a"/><stop offset="1" stop-color="#0b3f3a"/></linearGradient>
    <pattern id="mc-grid" width="16" height="16" patternUnits="userSpaceOnUse"><path d="M16 0H0V16" fill="none" stroke="rgba(120,255,220,.13)" stroke-width="1"/></pattern>
  </defs>
  <rect width="320" height="150" fill="url(#mc-bg)"/>
  <rect width="320" height="150" fill="url(#mc-grid)"/>
  <g class="m-tools" transform="translate(10 18)"><rect width="30" height="116" rx="9" fill="rgba(0,20,18,.6)" stroke="rgba(120,255,220,.3)"/>
    <rect class="m-tool t1" x="5" y="6" width="20" height="20" rx="6"/><rect class="m-tool t2" x="5" y="34" width="20" height="20" rx="6"/><rect class="m-tool t3" x="5" y="62" width="20" height="20" rx="6"/><rect class="m-tool t4" x="5" y="90" width="20" height="20" rx="6"/>
    <g fill="none" stroke="#bfffee" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="10" y="13" width="10" height="6" rx="1.5"/><path d="M9 48l3-6 3 6 3-6 3 6"/><ellipse cx="15" cy="70" rx="5" ry="1.8"/><path d="M11 71l1.5 6h5l1.5-6"/><path d="M10 104l5-8 5 3-5 8zM10 104h5"/></g></g>
  <g fill="#3fe0b8"><rect x="56" y="118" width="96" height="14" rx="3"/><rect x="200" y="118" width="110" height="14" rx="3"/></g>
  <g fill="#e8fff8" opacity=".9"><path d="M206 118l5-10 5 10zM216 118l5-10 5 10zM226 118l5-10 5 10z"/></g>
  <g class="m-ghost"><rect x="150" y="86" width="56" height="12" rx="3" fill="none" stroke="#9fffe3" stroke-width="1.5" stroke-dasharray="5 4"/></g>
  <g class="m-place"><rect x="150" y="86" width="56" height="12" rx="3" fill="#3fe0b8"/><rect x="150" y="86" width="56" height="3" rx="1.5" fill="#bfffee" opacity=".7"/></g>
  <g class="m-cursor"><path d="M0 0 L0 16 L4.5 12 L8 19 L11 17.5 L7.6 10.8 L13.5 10.8Z" fill="#fff" stroke="#062a2a" stroke-width="1.2"/></g>
  <g transform="translate(286 60)"><rect x="10" y="-4" width="4" height="62" fill="#9fb0b8"/><rect x="2" y="-12" width="22" height="28" rx="2" fill="rgba(255,255,255,.9)" stroke="#ff7a2f" stroke-width="1.5"/><ellipse cx="-4" cy="12" rx="10" ry="2.6" fill="none" stroke="#ff7a2f" stroke-width="2.4"/><path d="M-13 13 L-9 26 L1 26 L5 13" fill="none" stroke="rgba(255,255,255,.7)" stroke-width="1"/></g>
  <g transform="translate(78 110)"><g class="m-hop slow">${ball(ORANGE, 'mc-ball')}</g></g>
  <g class="m-chip"><rect x="52" y="12" width="74" height="18" rx="9" fill="rgba(0,20,18,.6)" stroke="rgba(120,255,220,.35)"/><path d="M66 21h8M70 17v8" stroke="#bfffee" stroke-width="1.8" stroke-linecap="round"/><rect x="82" y="17" width="30" height="8" rx="2" fill="#3fe0b8"/></g>
</svg>`;

const MODES = [
  { id: 'endless', emoji: '🌊', accent: '96,190,255', art: ART_ENDLESS },
  { id: 'race', emoji: '🏁', accent: '255,108,120', art: ART_RACE },
  { id: 'creator', emoji: '🛠️', accent: '63,224,184', art: ART_CREATOR },
];

export function modesPage(lang) {
  const cards = MODES.map(
    (m, i) => `
    <div class="fmode-wrap reveal" style="--i:${i + 1}">
      <button class="fmode pressable" data-locked="${m.id}" data-mode="${m.id}" style="--accent:${m.accent}" aria-label="${t(lang, `mode.${m.id}`)} — ${t(lang, `mode.${m.id}.desc`)} — ${t(lang, 'soon')}">
        <span class="fmode-art">${m.art(lang)}<span class="fmode-shine"></span><span class="fmode-lock">${ICONS.lock}</span></span>
        <span class="fmode-body">
          <span class="fmode-title"><span class="emoji" aria-hidden="true">${m.emoji}</span>${t(lang, `mode.${m.id}`)}</span>
          <span class="fmode-desc">${t(lang, `mode.${m.id}.desc`)}</span>
          <span class="fmode-soon"><span aria-hidden="true">🔒</span>${t(lang, 'soon')}</span>
        </span>
      </button>
    </div>`,
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
