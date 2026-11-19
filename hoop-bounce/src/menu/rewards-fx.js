// Grande révélation d'une récompense (récompense quotidienne, mission, succès) :
//  - fond sombre et rayons de lumière qui tournent ;
//  - un coffre qui tombe, tremble, s'ouvre dans un éclair ; ou un article / des pièces qui surgissent ;
//  - pluie de pièces, puis les pièces filent vers le compteur ;
//  - son, vibration légère.
// Uniquement des éléments DOM animés par transform / opacity (fluide sur téléphone).

import { RARITIES } from '../shared/catalog.js';
import { drawThumb } from '../shop/preview.js';
import { ICONS } from './icons.js';
import { t } from './i18n.js';
import { lt } from '../shared/live-i18n.js';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/** Coffre dessiné en CSS (corps, couvercle, ferrures, serrure) — couleur selon le type. */
export function chestHtml(kind = 'common', extra = '') {
  return `<span class="chest ${kind} ${extra}"><span class="chest-glow"></span><span class="chest-lid"><i></i></span><span class="chest-body"><i></i><b></b></span></span>`;
}

export class RewardFx {
  /** @param {{ lang: () => string, sound: object, vibrate: Function }} env */
  constructor(env) {
    this.env = env;
    this.el = document.createElement('div');
    this.el.className = 'rfx';
    this.el.hidden = true;
    this.el.setAttribute('role', 'dialog');
    this.el.setAttribute('aria-modal', 'true');
    this.el.innerHTML = `
      <div class="rfx-back"></div>
      <div class="rfx-rays"></div>
      <div class="rfx-stage">
        <p class="rfx-eyebrow"></p>
        <div class="rfx-center"></div>
        <div class="rfx-loot"></div>
        <button class="rfx-ok pressable"></button>
      </div>
      <div class="rfx-rain" aria-hidden="true"></div>`;
    document.body.appendChild(this.el);
    this.busy = false;
  }

  /**
   * @param {{ title:string, coins:number, item:object|null, chest:string|null }} r
   * @param {HTMLElement|null} coinTarget  élément vers lequel les pièces s'envolent (compteur)
   */
  async reveal(r, coinTarget = null) {
    if (this.busy) return;
    this.busy = true;
    const l = this.env.lang();
    const el = this.el;
    const center = el.querySelector('.rfx-center');
    const loot = el.querySelector('.rfx-loot');
    const ok = el.querySelector('.rfx-ok');
    el.querySelector('.rfx-eyebrow').textContent = r.title ?? '';
    ok.textContent = t(l, 'reward.ok');
    loot.innerHTML = '';
    el.dataset.rarity = r.item?.rarity ?? (r.chest === 'epic' || r.chest === 'super' ? 'epic' : r.chest === 'rare' ? 'rare' : 'gold');
    el.style.setProperty('--glow', r.item ? RARITIES[r.item.rarity].rgb : r.chest === 'super' ? '255,150,70' : r.chest === 'epic' ? '180,107,255' : r.chest === 'rare' ? '77,163,255' : '255,201,77');
    el.classList.remove('open', 'is-burst', 'done');
    el.hidden = false;
    void el.offsetWidth;
    el.classList.add('open');
    this.env.vibrate(15);

    if (r.chest) {
      center.innerHTML = `${chestHtml(r.chest, 'drop')}<span class="rfx-chest-name">${lt(l, `chest.${r.chest}`)}</span>`;
      this.env.sound.chest?.();
      await wait(1100); // le coffre tombe puis tremble
      el.classList.add('is-burst');
      this.env.sound.reward?.();
      this.env.vibrate([20, 40, 30]);
      await wait(350);
    } else {
      center.innerHTML = r.item ? '' : `<span class="rfx-bigcoin">${ICONS.coin}</span>`;
      el.classList.add('is-burst');
      this.env.sound.reward?.();
      this.env.vibrate([20, 40, 30]);
    }

    // Le butin surgit
    const parts = [];
    if (r.coins) parts.push(`<span class="loot coins"><span class="coin">${ICONS.coin}</span><b>+${r.coins}</b></span>`);
    if (r.item) {
      parts.push(`<span class="loot item" style="--r:${RARITIES[r.item.rarity].rgb}"><canvas></canvas><b>${r.item.name[l] ?? r.item.name.fr}</b><i>${t(l, `rarity.${r.item.rarity}`)}${r.item.exclusive ? ` · ${t(l, 'reward.exclusive')}` : ''}</i></span>`);
    }
    loot.innerHTML = parts.join('');
    const cv = loot.querySelector('canvas');
    if (cv) requestAnimationFrame(() => drawThumb(cv, r.item, Math.min(window.devicePixelRatio || 1, 2)));
    if (r.coins) this.coinRain(Math.min(40, 12 + Math.round(r.coins / 25)));
    await wait(450);
    el.classList.add('done');
    ok.focus({ preventScroll: true });

    await new Promise((resolve) => {
      const close = () => {
        ok.removeEventListener('click', close);
        el.querySelector('.rfx-back').removeEventListener('click', close);
        resolve();
      };
      ok.addEventListener('click', close);
      el.querySelector('.rfx-back').addEventListener('click', close);
    });
    if (r.coins && coinTarget) this.flyCoins(coinTarget, 10);
    el.classList.remove('open');
    await wait(380);
    el.hidden = true;
    this.busy = false;
  }

  /** Pluie de pièces qui tombent en tournoyant sur tout l'écran. */
  coinRain(n = 24) {
    const rain = this.el.querySelector('.rfx-rain');
    rain.innerHTML = '';
    for (let i = 0; i < n; i++) {
      const c = document.createElement('span');
      c.className = 'rain-coin';
      c.innerHTML = ICONS.coin;
      const size = 18 + Math.random() * 18;
      c.style.cssText = `left:${Math.random() * 100}%;width:${size}px;height:${size}px;animation-delay:${(Math.random() * 0.7).toFixed(2)}s;animation-duration:${(1.4 + Math.random() * 0.9).toFixed(2)}s;--rot:${Math.round(360 + Math.random() * 720)}deg;--drift:${Math.round((Math.random() - 0.5) * 120)}px`;
      rain.appendChild(c);
    }
    this.env.sound.coins?.();
    setTimeout(() => (rain.innerHTML = ''), 2600);
  }

  /** Quelques pièces partent du centre de l'écran et filent vers le compteur, qui rebondit. */
  flyCoins(target, n = 10) {
    const r = target.getBoundingClientRect();
    const tx = r.left + r.width / 2;
    const ty = r.top + r.height / 2;
    for (let i = 0; i < n; i++) {
      const c = document.createElement('span');
      c.className = 'fly-coin';
      c.innerHTML = ICONS.coin;
      const sx = window.innerWidth / 2 + (Math.random() - 0.5) * 120;
      const sy = window.innerHeight / 2 + (Math.random() - 0.5) * 60;
      c.style.left = `${sx}px`;
      c.style.top = `${sy}px`;
      c.style.setProperty('--dx', `${tx - sx}px`);
      c.style.setProperty('--dy', `${ty - sy}px`);
      c.style.animationDelay = `${i * 0.05}s`;
      document.body.appendChild(c);
      c.addEventListener('animationend', () => c.remove(), { once: true });
    }
    setTimeout(() => {
      target.classList.remove('bump');
      void target.offsetWidth;
      target.classList.add('bump');
      this.env.sound.tick?.(0.9);
    }, 650);
  }
}

/** Petites pastilles qui décrivent une récompense (pièces, coffre, article). */
export function rewardChips(lang, reward) {
  const out = [];
  if (reward.coins) out.push(`<span class="rchip coins"><span class="coin">${ICONS.coin}</span>${reward.coins}</span>`);
  if (reward.chest) out.push(`<span class="rchip chest-chip ${reward.chest}">${chestHtml(reward.chest, 'mini')}${lt(lang, `chest.${reward.chest}`)}</span>`);
  if (reward.item) out.push(`<span class="rchip item-chip">★ ${t(lang, 'reward.exclusiveItem')}</span>`);
  if (reward.cosmetic) out.push(`<span class="rchip item-chip">✦ ${lt(lang, `reward.cosmetic.${reward.cosmetic}`)}</span>`);
  return out.join('');
}
