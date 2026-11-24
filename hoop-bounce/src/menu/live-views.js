// Pages qui donnent envie de revenir chaque jour : Récompense quotidienne, Missions, Succès.
// Même style que le reste du menu (verre sombre, accent orange, animations à ressort).
// Tout est lu dans la sauvegarde (shared/daily.js, missions.js, achievements.js, stats.js, wallet.js)
// et y est écrit dès qu'une récompense est récupérée.

import { WORLDS } from '../game/worlds.js';
import { Progress } from '../game/progress.js';
import { gt } from '../game/i18n.js';
import { itemById } from '../shared/catalog.js';
import { Wallet } from '../shared/wallet.js';
import { Stats, dayKey, secondsToMidnight } from '../shared/stats.js';
import { DailyReward } from '../shared/daily.js';
import { Missions } from '../shared/missions.js';
import { Achievements, TIERS } from '../shared/achievements.js';
import { Bonus } from '../shared/bonus.js';
import { lt } from '../shared/live-i18n.js';
import { drawThumb } from '../shop/preview.js';
import { ICONS } from './icons.js';
import { t } from './i18n.js';
import { chestHtml, rewardChips } from './rewards-fx.js';

const CHECK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.5 16.2 5.3 12l-1.4 1.4 5.6 5.6L20.1 8.4 18.7 7z"/></svg>';
/** Icône (src/menu/icons.js) de chaque type de mission et de succès : un seul style graphique, pas d'émoji. */
const MISSION_ICON = { flag: 'flag', hoop: 'hoop', star: 'star', shield: 'shield', clock: 'clock', ball: 'burst', world: 'worlds', play: 'modes', swish: 'sparkle' };
const ACH_ICON = { flag: 'flag', ball: 'burst', star: 'star', shield: 'shield', bag: 'shop', play: 'modes', city: 'city', coin: 'coinline', gift: 'gift', target: 'target', hoop: 'hoop', swish: 'sparkle', snow: 'snow', skull: 'skull', clock: 'clock', chest: 'chest', volcano: 'volcano', forest: 'forest', crown: 'crown', trophy: 'trophy', space: 'space', gem: 'gemline' };
const DPR = () => Math.min(window.devicePixelRatio || 1, 2);

/** Contexte de sauvegarde, relu à chaque fois (le jeu ou la boutique ont pu le modifier). */
export function liveContext() {
  const stats = new Stats();
  const wallet = new Wallet();
  const progress = new Progress(WORLDS);
  const worlds = WORLDS.filter((_, i) => progress.isWorldUnlocked(i)).map((w) => w.id);
  return { stats, wallet, progress, worlds, daily: new DailyReward(), missions: new Missions(), achievements: new Achievements() };
}

/** Nombre de choses à récupérer (pastilles de l'accueil). */
export function liveBadges() {
  const c = liveContext();
  return {
    daily: c.daily.canClaim() ? 1 : 0,
    missions: c.missions.claimable(c.stats, c.worlds),
    achievements: c.achievements.claimable(c),
    bonus: new Bonus().freeSpinAvailable() ? 1 : 0, // lancer gratuit de la roulette
  };
}

export function duration(lang, sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.max(1, Math.ceil((sec % 3600) / 60));
  return h ? t(lang, 'time.hm', { h, m: m === 60 ? 59 : m }) : t(lang, 'time.m', { m });
}

const fmt = (lang, n) => n.toLocaleString(lang === 'en' ? 'en-US' : lang === 'es' ? 'es-ES' : 'fr-FR');

export function header(lang, id, titleKey, right = '') {
  return `
    <header class="page-head">
      <button class="icon-btn pressable" data-back aria-label="${t(lang, 'back')}">${ICONS.back}</button>
      <h1 id="title-${id}">${t(lang, titleKey)}</h1>
      <span class="spacer"></span>
      ${right}
      <span class="chip coins lv-coins reveal" style="--i:1"><span class="chip-icon">${ICONS.coin}</span><span class="chip-value"></span></span>
    </header>`;
}

/** Base commune : rafraîchissement, compte à rebours, compteur de pièces. */
export class LiveView {
  constructor(root, env) {
    this.root = root;
    this.env = env;
    this.active = false;
    this.timer = 0;
    root.addEventListener('click', (e) => this.onClick(e));
  }

  get lang() {
    return this.env.lang();
  }

  onShow() {
    this.active = true;
    this.render();
    clearInterval(this.timer);
    this.timer = setInterval(() => this.tick(), 1000);
    this.afterShow?.();
  }

  onHide() {
    this.active = false;
    clearInterval(this.timer);
  }

  tick() {}

  setCoins(ctx) {
    const v = this.root.querySelector('.lv-coins .chip-value');
    if (v) v.textContent = String(ctx.wallet.coins);
  }

  coinChip() {
    return this.root.querySelector('.lv-coins');
  }

  /** Après une récompense : animation, puis page et accueil mis à jour. */
  async celebrate(result, title) {
    await this.env.fx.reveal({ ...result, title }, this.coinChip());
    this.render(true);
    this.env.refreshHome();
  }
}

// ─── Récompense quotidienne ─────────────────────────────────────────────────

export class DailyView extends LiveView {
  render(quiet = false) {
    const l = this.lang;
    const c = (this.ctx = liveContext());
    const states = c.daily.states();
    const cards = c.daily.week().map((rw, k) => {
      let art = '';
      let name = '';
      const gemTag = (n) => `<span class="dday-gems"><span class="hb-gem" aria-hidden="true"></span>${n}</span>`;
      if (rw.item) {
        // 7e jour : objet exclusif, avec des pièces et des gemmes
        art = `<canvas data-item="${rw.item}"></canvas>`;
        name = `${t(l, rw.item === 'ball-hoop' ? 'daily.skin' : 'daily.trail')}`;
      } else if (rw.chest) {
        art = chestHtml(rw.chest, 'idle');
        name = t(l, `daily.chest.${rw.chest}`);
      } else if (rw.coins) {
        const n = rw.coins >= 350 ? 3 : rw.coins >= 200 ? 2 : 1;
        art = `<span class="coin-stack s${n}">${`<span class="coin">${ICONS.coin}</span>`.repeat(n)}</span>`;
        name = t(l, 'daily.coins', { n: rw.coins });
      } else if (rw.gems) {
        art = `<span class="dday-gem-art"><span class="hb-gem" aria-hidden="true"></span></span>`;
        name = t(l, 'daily.gems', { n: rw.gems });
      }
      // gemmes en plus (jour 5, jour 7) : petite pastille
      if (rw.gems && (rw.coins || rw.chest || rw.item)) name += ` ${gemTag(rw.gems)}`;
      if (rw.item && rw.coins) name += ` <span class="dday-plus">+${rw.coins}</span>`;
      const st = states[k];
      const tag = st === 'today' ? t(l, 'daily.today') : st === 'next' ? t(l, 'daily.tomorrow') : '';
      return `
        <div class="dday reveal ${k === 6 ? 'big' : ''}" data-state="${st}" data-day="${k}" style="--i:${k + 2}">
          <span class="dday-label">${t(l, 'daily.day', { n: k + 1 })}</span>
          <span class="dday-art">${art}</span>
          <span class="dday-name">${name}</span>
          ${tag ? `<span class="dday-tag">${tag}</span>` : ''}
          <span class="dday-check">${CHECK}</span>
          ${k === 6 ? '<span class="dday-shine"></span>' : ''}
        </div>`;
    }).join('');
    const can = c.daily.canClaim();
    this.root.innerHTML = `
      ${header(l, 'quotidien', 'daily.title', `<span class="chip lv-chip reveal" style="--i:0">${t(l, 'daily.week', { n: c.daily.cycle + 1 })} · ${t(l, 'daily.day', { n: Math.min(7, c.daily.nextIndex + (can ? 1 : 0)) })}/7</span>`)}
      <div class="lv-body dv-body">
        <p class="lv-sub reveal" style="--i:1">${t(l, 'daily.subtitle')}</p>
        <div class="dv-row">${cards}</div>
        <div class="dv-foot reveal" style="--i:10">
          ${can ? `<button class="dv-claim pressable" data-claim>${ICONS.gift}<span>${t(l, 'daily.claim')}</span></button>` : `<p class="dv-timer"><span class="dv-clock"></span>${t(l, 'daily.comeback')} · <b data-countdown></b></p>`}
        </div>
      </div>`;
    if (quiet) for (const r of this.root.querySelectorAll('.reveal')) r.style.animation = 'none';
    this.setCoins(c);
    this.tick();
    requestAnimationFrame(() => {
      for (const cv of this.root.querySelectorAll('canvas[data-item]')) drawThumb(cv, itemById(cv.dataset.item), DPR());
    });
  }

  tick() {
    const el = this.root.querySelector('[data-countdown]');
    if (el) el.textContent = t(this.lang, 'daily.next', { t: duration(this.lang, secondsToMidnight()) });
    // Minuit passé pendant que la page est ouverte : une nouvelle récompense est disponible
    if (el && this.ctx && new DailyReward().canClaim()) this.render(true);
  }

  async onClick(e) {
    if (!e.target.closest('[data-claim]')) return;
    const c = liveContext();
    if (!c.daily.canClaim()) return;
    const day = c.daily.nextIndex;
    const card = this.root.querySelector(`.dday[data-day="${day}"]`);
    card?.classList.add('claiming');
    this.root.querySelector('[data-claim]').disabled = true;
    this.env.sound.open();
    await new Promise((r) => setTimeout(r, 550));
    const res = c.daily.claim(c.wallet, c.stats);
    if (res) await this.celebrate(res, t(this.lang, 'daily.got', { n: day + 1 }));
  }
}

// ─── Missions ───────────────────────────────────────────────────────────────

export class MissionsView extends LiveView {
  render(quiet = false) {
    const l = this.lang;
    const c = (this.ctx = liveContext());
    const list = c.missions.view(c.stats, c.worlds);
    const done = list.filter((m) => m.done).length;
    const cards = list.map((m, i) => {
      const n = m.tpl === 'time' ? Math.round(m.target / 60) : m.target;
      const text = lt(l, `mission.${m.tpl}`, { n, world: m.world ? gt(l, `world.${m.world}`) : '' });
      const val = m.tpl === 'time' ? `${Math.floor(m.value / 60)}/${n} min` : `${m.value}/${m.target}`;
      const state = m.claimed ? 'claimed' : m.done ? 'done' : 'progress';
      const action = m.claimed
        ? `<span class="m-state">${CHECK}${t(l, 'missions.claimed')}</span>`
        : m.done
          ? `<button class="m-claim pressable" data-mission="${i}">${t(l, 'missions.claim')}</button>`
          : `<span class="m-pct">${Math.floor((100 * m.value) / m.target)} %</span>`;
      return `
        <article class="mcard reveal" data-tier="${i}" data-state="${state}" style="--i:${i + 2};--p:${(m.value / m.target).toFixed(3)}">
          <span class="m-icon" aria-hidden="true">${ICONS[MISSION_ICON[m.icon] ?? 'target']}</span>
          <div class="m-main">
            <span class="m-tier">${t(l, `missions.tier${i}`)}${m.done && !m.claimed ? ` · <b>${t(l, 'missions.done')}</b>` : ''}</span>
            <h2 class="m-title">${text}</h2>
            <div class="m-progress"><span class="m-bar"><i></i></span><span class="m-val">${val}</span></div>
          </div>
          <div class="m-reward">${rewardChips(l, m.reward)}</div>
          <div class="m-action">${action}</div>
        </article>`;
    }).join('');
    this.root.innerHTML = `
      ${header(l, 'missions', 'missions.title', `<span class="chip lv-chip reveal" style="--i:0">${t(l, 'missions.count', { n: done })}</span><span class="chip lv-chip timer reveal" style="--i:0"><span class="dv-clock"></span><b data-countdown></b></span>`)}
      <div class="lv-body mv-body"><div class="mv-list">${cards}</div></div>`;
    if (quiet) for (const r of this.root.querySelectorAll('.reveal')) r.style.animation = 'none';
    this.setCoins(c);
    this.tick();
  }

  afterShow() {
    // Missions terminées depuis la dernière visite : petite fête (son de validation, éclat lumineux)
    const fresh = this.ctx.missions.newlyCompleted(this.ctx.stats, this.ctx.worlds);
    const ready = this.root.querySelectorAll('.mcard[data-state="done"]');
    if (fresh.length || ready.length) {
      setTimeout(() => {
        for (const el of ready) el.classList.add('celebrate');
        this.env.sound.equip();
        this.env.vibrate(12);
      }, 900);
    }
  }

  tick() {
    const el = this.root.querySelector('[data-countdown]');
    if (el) el.textContent = t(this.lang, 'missions.renew', { t: duration(this.lang, secondsToMidnight()) });
    // Minuit passé pendant que la page est ouverte : nouvelles missions
    if (this.ctx && this.ctx.missions.data.date !== dayKey()) this.render(true);
  }

  async onClick(e) {
    const b = e.target.closest('[data-mission]');
    if (!b) return;
    b.disabled = true;
    const c = liveContext();
    const card = b.closest('.mcard');
    card.classList.add('claiming');
    this.env.sound.open();
    await new Promise((r) => setTimeout(r, 400));
    const res = c.missions.claim(+b.dataset.mission, c.wallet, c.stats);
    if (res) await this.celebrate(res, t(this.lang, 'missions.got'));
  }
}

// ─── Succès ─────────────────────────────────────────────────────────────────

export class AchievementsView extends LiveView {
  constructor(root, env) {
    super(root, env);
    this.tier = 'all';
  }

  render(quiet = false) {
    const l = this.lang;
    const c = (this.ctx = liveContext());
    const all = c.achievements.view(c);
    const got = all.filter((a) => a.state === 'claimed').length;
    const ready = all.filter((a) => a.state === 'ready').length;
    const order = { ready: 0, progress: 1, claimed: 2 };
    const list = all
      .filter((a) => this.tier === 'all' || a.tier === this.tier)
      .sort((a, b) => order[a.state] - order[b.state] || (a.state === 'progress' ? b.value / b.target - a.value / a.target : 0) || TIERS[a.tier].order - TIERS[b.tier].order);
    const tabs = ['all', ...Object.keys(TIERS)].map((k) => {
      const items = k === 'all' ? all : all.filter((a) => a.tier === k);
      const n = items.filter((a) => a.state === 'claimed').length;
      const r = items.filter((a) => a.state === 'ready').length;
      return `<button role="tab" data-tier="${k}" aria-selected="${k === this.tier}" style="${k !== 'all' ? `--t:${TIERS[k].rgb}` : ''}">${k === 'all' ? t(l, 'ach.all') : lt(l, `tier.${k}`)}<small>${n}/${items.length}</small>${r ? '<i class="dot"></i>' : ''}</button>`;
    }).join('');
    const cards = list.map((a, i) => {
      const val = a.icon === 'clock' ? `${Math.floor(a.value / 60)}/${Math.round(a.target / 60)} min` : `${fmt(l, a.value)}/${fmt(l, a.target)}`;
      const action = a.state === 'claimed'
        ? `<span class="a-done">${CHECK}${t(l, 'ach.claimed')}</span>`
        : a.state === 'ready'
          ? `<button class="a-claim pressable" data-ach="${a.id}">${t(l, 'ach.claim')}</button>`
          : `<span class="a-val">${val}</span>`;
      return `
        <article class="acard" data-tier="${a.tier}" data-state="${a.state}" style="--t:${TIERS[a.tier].rgb};--i:${Math.min(i, 14)};--p:${(a.value / a.target).toFixed(3)}">
          <span class="a-medal" aria-hidden="true"><span>${ICONS[ACH_ICON[a.icon] ?? 'trophy']}</span></span>
          <div class="a-main">
            <span class="a-tier">${lt(l, `tier.${a.tier}`)}</span>
            <h2 class="a-name">${lt(l, `ach.${a.id}`)}</h2>
            <p class="a-desc">${lt(l, `ach.${a.id}.d`)}</p>
            <span class="a-bar"><i></i></span>
          </div>
          <div class="a-side">
            <div class="a-reward">${rewardChips(l, a.reward)}</div>
            ${action}
          </div>
        </article>`;
    }).join('');
    const pct = Math.round((100 * got) / all.length);
    this.root.innerHTML = `
      ${header(l, 'succes', 'ach.title', `
        <div class="cv-count reveal" style="--i:0"><span class="cv-count-bar"><i style="width:${pct}%"></i></span><b>${t(l, 'ach.count', { n: got, total: all.length })}</b></div>
        ${ready ? `<span class="chip lv-chip ready reveal" style="--i:0">${t(l, 'ach.ready', { n: ready })}</span>` : ''}`)}
      <div class="lv-body av-body">
        <nav class="cv-tabs av-tabs reveal" role="tablist" style="--i:1">${tabs}</nav>
        <div class="av-grid">${cards}</div>
      </div>`;
    if (quiet) for (const r of this.root.querySelectorAll('.reveal')) r.style.animation = 'none';
    this.setCoins(c);
  }

  async onClick(e) {
    const tab = e.target.closest('[data-tier]');
    if (tab && tab.closest('.av-tabs')) {
      this.tier = tab.dataset.tier;
      this.env.sound.tab();
      this.render(true);
      return;
    }
    const b = e.target.closest('[data-ach]');
    if (!b) return;
    b.disabled = true;
    b.closest('.acard').classList.add('claiming');
    this.env.sound.open();
    await new Promise((r) => setTimeout(r, 400));
    const c = liveContext();
    const res = c.achievements.claim(b.dataset.ach, c);
    if (res) await this.celebrate(res, t(this.lang, 'ach.got'));
  }
}
