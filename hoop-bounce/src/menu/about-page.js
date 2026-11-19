// Page « À propos » (Paramètres › À propos de Hoop Bounce) : identité du jeu, version, créateur, copyright,
// crédits et liens. Le contenu vient de src/shared/about.js (facile à compléter) ; cette page ne fait que
// l'afficher dans le style du menu (verre sombre, accent orange, apparitions en cascade).

import { ABOUT, CREDITS, LINKS, copyrightYears, pick } from '../shared/about.js';
import { ICONS } from './icons.js';
import { t } from './i18n.js';
import { ballEmblem } from './pages.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

/** Un bouton de lien : vraie URL → lien externe ; sinon repli (page intégrée, ou « Bientôt »). */
function linkButton(lang, { key, icon, url, fallbackSheet = null, i }) {
  const label = t(lang, `about.${key}`);
  const inner = (hint, tail) => `
      <span class="row-icon">${ICONS[icon]}</span>
      <span class="row-text"><span class="row-label">${label}</span><span class="row-hint">${hint}</span></span>
      ${tail}`;
  if (url) {
    return `<a class="about-link pressable reveal" style="--i:${i}" id="about-${key}" href="${esc(url)}" target="_blank" rel="noopener noreferrer" data-about-link="${key}">
      ${inner(t(lang, 'about.online'), `<span class="chev">${ICONS.external}</span>`)}</a>`;
  }
  if (fallbackSheet) {
    return `<button class="about-link pressable reveal" style="--i:${i}" id="about-${key}" type="button" data-sheet="${fallbackSheet}" data-about-link="${key}">
      ${inner(t(lang, 'about.inGame'), `<span class="chev">${ICONS.chevron}</span>`)}</button>`;
  }
  return `<button class="about-link soon pressable reveal" style="--i:${i}" id="about-${key}" type="button" data-soon data-about-link="${key}" aria-disabled="true">
      ${inner('&nbsp;', `<span class="about-soon">${t(lang, 'about.soon')}</span>`)}</button>`;
}

export function aboutPage(lang) {
  const credits = CREDITS.map((c, k) => `
        <li class="credit reveal" style="--i:${k + 3}" data-credit="${esc(c.id)}">
          <span class="row-icon">${ICONS[c.icon] ?? ICONS.heart}</span>
          <div class="credit-text">
            <span class="credit-role">${esc(pick(c.role, lang))}</span>
            <span class="credit-names">${c.names.map((n) => `<span>${esc(n)}</span>`).join('')}</span>
            ${c.note ? `<span class="credit-note">${esc(pick(c.note, lang))}</span>` : ''}
          </div>
        </li>`).join('');

  return `
  <header class="page-head">
    <button class="icon-btn pressable" data-back aria-label="${t(lang, 'back')}">${ICONS.back}</button>
    <h1 id="title-apropos">${t(lang, 'about.title')}</h1>
  </header>
  <div class="page-body">
    <div class="about-grid">
      <div class="about-side">
        <section class="card about-id reveal" style="--i:0">
          <span class="about-glow" aria-hidden="true"></span>
          <div class="about-logo" role="img" aria-label="${esc(ABOUT.game)}">
            <span class="about-ball" aria-hidden="true">${ballEmblem()}</span>
            <span class="wordmark" aria-hidden="true"><span class="w1">HOOP</span><span class="w2">BOUNCE</span></span>
          </div>
          <p class="about-tagline">${t(lang, 'about.tagline')}</p>
          <dl class="about-facts">
            <div><dt>${t(lang, 'about.version')}</dt><dd id="about-version">${esc(ABOUT.version)}</dd></div>
            <div><dt>${t(lang, 'about.creator')}</dt><dd id="about-creator">${esc(ABOUT.creator)}</dd></div>
          </dl>
          <p class="about-copy">${t(lang, 'about.copyright', { y: copyrightYears(), c: esc(ABOUT.creator) })}</p>
        </section>
        <section class="card group about-links reveal" style="--i:1" aria-labelledby="about-links-title">
          <h2 class="group-title" id="about-links-title">${t(lang, 'about.links')}</h2>
          ${linkButton(lang, { key: 'privacy', icon: 'shield', url: LINKS.privacy, fallbackSheet: 'privacy', i: 2 })}
          ${linkButton(lang, { key: 'terms', icon: 'doc', url: LINKS.terms, i: 3 })}
        </section>
      </div>
      <section class="card group about-credits reveal" style="--i:2" aria-labelledby="about-credits-title">
        <h2 class="group-title" id="about-credits-title">${t(lang, 'about.credits')}</h2>
        <ul class="credit-list">${credits}</ul>
        <p class="about-thanks reveal" style="--i:${CREDITS.length + 3}">${ICONS.heart}<span>${t(lang, 'about.thanks')}</span></p>
      </section>
    </div>
  </div>`;
}
