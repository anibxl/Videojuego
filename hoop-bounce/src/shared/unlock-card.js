// ANIMATION DE DÉBLOCAGE D'UN SUCCÈS (phase 5) — partagée par le jeu, le Trickshot, le menu et la boutique.
//
// Une carte glisse du haut de l'écran : médaille hexagonale à la couleur du palier (elle éclot et tourne),
// icône, « Succès débloqué ! » (ou « Défi caché découvert ! »), nom, récompense ; reflet qui la balaie, gerbe
// de petites particules autour de la médaille, son et vibration légère. Les cartes passent l'une après
// l'autre ; au-delà de 3 d'un coup, la dernière annonce « + N autres succès ».
//
// Éléments DOM animés uniquement par transform / opacity (fluide sur téléphone) ; la carte ne bloque jamais
// le toucher (pointer-events: none). Styles : css/unlock.css. Mouvement réduit : apparition simple.

import { TIERS, CATEGORIES } from './achievements.js';
import { itemById } from './catalog.js';
import { lt } from './live-i18n.js';
import { ICONS } from '../menu/icons.js';

/** Icône (src/menu/icons.js) de chaque type de succès. */
export const ACH_ICON = { flag: 'flag', ball: 'burst', star: 'star', shield: 'shield', bag: 'shop', play: 'modes', city: 'city', coin: 'coinline', gift: 'gift', target: 'target', hoop: 'hoop', swish: 'sparkle', snow: 'snow', skull: 'skull', clock: 'clock', chest: 'chest', volcano: 'volcano', forest: 'forest', crown: 'crown', trophy: 'trophy', space: 'space', gem: 'gemline', trickshot: 'trickshot', sparkle: 'sparkle', ghost: 'ghost', mystery: 'mystery', burst: 'burst' };
export const achIcon = (icon) => ICONS[ACH_ICON[icon] ?? icon] ?? ICONS.trophy;

const MAX_CARDS = 3;
const SHOW_MS = 3300;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

/** Puces de récompense (pièces, gemmes, coffre, objet, emblème, XP du Hoop Pass). */
export function rewardBits(lang, reward, xp = 0) {
  const out = [];
  if (reward.coins) out.push(`<span class="au-chip coins"><span class="hb-coin" aria-hidden="true"></span>${reward.coins}</span>`);
  if (reward.gems) out.push(`<span class="au-chip gems"><span class="hb-gem" aria-hidden="true"></span>${reward.gems}</span>`);
  if (reward.chest) out.push(`<span class="au-chip box">${esc(lt(lang, `chest.${reward.chest}`))}</span>`);
  if (reward.item) {
    const it = itemById(reward.item);
    out.push(`<span class="au-chip item">★ ${esc(it?.name?.[lang] ?? it?.name?.fr ?? reward.item)}</span>`);
  }
  if (reward.cosmetic) out.push(`<span class="au-chip item">✦ ${esc(lt(lang, `reward.cosmetic.${reward.cosmetic}`))}</span>`);
  if (reward.emblem) out.push(`<span class="au-chip emblem">${ICONS[EMBLEM_ICON(reward.emblem)] ?? ''}${esc(lt(lang, `emblem.${reward.emblem}`))}</span>`);
  if (xp) out.push(`<span class="au-chip xp">+${esc(lt(lang, 'reward.xp', { n: xp }))}</span>`);
  return out.join('');
}

let emblemIcons = null;
function EMBLEM_ICON(id) {
  return (emblemIcons ??= { rookie: 'ball', ghost: 'ghost', lab: 'trickshot', collector: 'collection', loyal: 'daily', impossible: 'sparkle', legend: 'trophy', mystery: 'mystery' })[id];
}

export class UnlockCards {
  /**
   * @param {{ lang: () => string, sound?: (hidden:boolean) => void, vibrate?: () => void, parent?: HTMLElement }} env
   */
  constructor(env) {
    this.env = env;
    this.queue = [];
    this.busy = null;
    this.root = document.createElement('div');
    this.root.className = 'ach-unlocks';
    this.root.setAttribute('role', 'status');
    this.root.setAttribute('aria-live', 'polite');
    (env.parent ?? document.body).appendChild(this.root);
  }

  /** Annonce des succès débloqués (vue de src/shared/achievements.js). @returns {Promise<void>} fin de l'annonce */
  show(list) {
    if (!list?.length) return this.busy ?? Promise.resolve();
    const shown = list.slice(0, MAX_CARDS);
    const more = list.length - shown.length;
    shown.forEach((a, i) => this.queue.push({ a, more: i === shown.length - 1 ? more : 0 }));
    if (!this.busy) this.busy = this._run();
    return this.busy;
  }

  async _run() {
    while (this.queue.length) {
      const { a, more } = this.queue.shift();
      await this._card(a, more);
    }
    this.busy = null;
  }

  _card(a, more) {
    const l = this.env.lang();
    const tier = TIERS[a.tier] ?? TIERS.beginner;
    const el = document.createElement('div');
    el.className = 'au';
    el.dataset.tier = a.tier;
    if (a.hidden) el.dataset.hidden = '';
    el.style.setProperty('--t', tier.rgb);
    el.style.setProperty('--c', CATEGORIES[a.cat]?.rgb ?? tier.rgb);
    let sparks = '';
    for (let i = 0; i < 14; i++) {
      const ang = (i / 14) * Math.PI * 2 + Math.random() * 0.3;
      const d = 34 + Math.random() * 30;
      sparks += `<i style="--x:${(Math.cos(ang) * d).toFixed(1)}px;--y:${(Math.sin(ang) * d).toFixed(1)}px;--s:${(0.6 + Math.random() * 0.8).toFixed(2)};--dl:${(Math.random() * 0.12).toFixed(2)}s"></i>`;
    }
    const eyebrow = a.hidden ? lt(l, 'live.hidden') : lt(l, 'live.achievement');
    el.innerHTML = `
      <div class="au-card">
        <span class="au-glow" aria-hidden="true"></span>
        <span class="au-medal" aria-hidden="true"><span>${achIcon(a.icon)}</span></span>
        <span class="au-sparks" aria-hidden="true">${sparks}</span>
        <div class="au-text">
          <p class="au-eyebrow">${esc(eyebrow)}<span class="au-tier"> · ${esc(lt(l, `tier.${a.tier}`))}</span></p>
          <h3 class="au-name">${esc(lt(l, `ach.${a.id}`))}</h3>
          <div class="au-rewards">${rewardBits(l, a.reward, a.xp ?? tier.xp)}</div>
        </div>
        <span class="au-sheen" aria-hidden="true"></span>
      </div>
      ${more ? `<p class="au-more">${esc(lt(l, 'live.more', { n: more }))}</p>` : ''}`;
    this.root.appendChild(el);
    void el.offsetWidth;
    el.classList.add('in');
    try {
      this.env.sound?.(!!a.hidden);
    } catch {
      /* son indisponible */
    }
    try {
      this.env.vibrate?.();
    } catch {
      /* pas de vibreur */
    }
    return new Promise((resolve) => {
      setTimeout(() => {
        el.classList.remove('in');
        el.classList.add('out');
        setTimeout(() => {
          el.remove();
          resolve();
        }, 420);
      }, SHOW_MS);
    });
  }
}
