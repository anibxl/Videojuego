// Page HOOP PASS du menu : le passe de saison (système : src/shared/pass.js, contenu : src/shared/seasons/).
//
//  - en-tête : « Hoop Pass », numéro et thème de la saison, temps restant, gemmes et pièces ;
//  - panneau de gauche, toujours visible : niveau du Pass (anneau), barre d'XP animée, carte Premium,
//    « Tout récupérer », comment gagner de l'XP ;
//  - à droite, une piste qui défile à l'horizontale : 50 colonnes, Premium en haut, frise des niveaux au
//    milieu (remplie jusqu'au niveau actuel), Gratuit en bas. Récompenses récupérées cochées, disponibles
//    en surbrillance, verrouillées atténuées ; bouton « Mon niveau » dès que le niveau actuel sort de l'écran ;
//  - à l'ouverture : les niveaux gagnés depuis la dernière visite défilent (barre qui se remplit, anneau qui
//    éclate, étincelles, son), puis un bandeau annonce le nouveau niveau ;
//  - récupérer : grande révélation (src/menu/rewards-fx.js), comme les autres récompenses du jeu.
// Couleurs prises dans la palette de la saison (variables CSS --hp-*) : une nouvelle saison change de
// couleurs sans toucher à cette page. Styles : css/pass.css.

import { HoopPass } from '../shared/pass.js';
import { Wallet } from '../shared/wallet.js';
import { Stats } from '../shared/stats.js';
import { itemById, RARITIES } from '../shared/catalog.js';
import { lt } from '../shared/live-i18n.js';
import { drawThumb } from '../shop/preview.js';
import { ICONS } from './icons.js';
import { t } from './i18n.js';
import { chestHtml } from './rewards-fx.js';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const DPR = () => Math.min(window.devicePixelRatio || 1, 2);
const CHECK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.5 16.2 5.3 12l-1.4 1.4 5.6 5.6L20.1 8.4 18.7 7z" fill="currentColor"/></svg>';
const CROWN = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 8.2l4.6 3.6L12 5l4.4 6.8L21 8.2 19.3 18H4.7z" fill="currentColor"/><rect x="4.7" y="19" width="14.6" height="2" rx="1" fill="currentColor"/></svg>';
const CLOCK = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="13" r="8"/><path d="M12 9v4.2l2.6 1.6M9.5 2.8h5"/></svg>';
const LOCK = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10.5" width="14" height="10" rx="2.6" fill="currentColor"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" fill="none" stroke="currentColor" stroke-width="2.2"/></svg>';
const SOURCES = [
  { key: 'level', icon: 'ball', replay: 'levelReplay' },
  { key: 'trickshot', icon: 'target', replay: 'trickshotReplay' },
  { key: 'mission', icon: 'daily' },
  { key: 'achievement', icon: 'trophy' },
];
/** Couleur (r,g,b) d'un coffre, pour l'accent de sa carte. */
const CHEST_RGB = { common: '214,160,90', rare: '77,163,255', epic: '180,107,255', super: '255,150,70', premium: '120,210,255', legendary: '255,170,60' };

const fmt = (lang, n) => n.toLocaleString(lang === 'en' ? 'en-US' : lang === 'es' ? 'es-ES' : 'fr-FR');

export class PassView {
  /**
   * @param {HTMLElement} root  section #page-pass
   * @param {object} env  lang, sound, vibrate, toast, fx, refreshHome
   * @param {object|null} season  configuration de la saison (src/shared/seasons/)
   */
  constructor(root, env, season) {
    this.root = root;
    this.env = env;
    this.season = season;
    this.active = false;
    this.busy = false;
    this.parts = [];
    this.confirmTimer = 0;
    this.clock = 0;
    root.addEventListener('click', (e) => this.onClick(e));
  }

  get lang() {
    return this.env.lang();
  }

  /** Relu à chaque fois : le jeu, le Trickshot, les missions ont pu donner de l'XP. */
  load() {
    this.pass = new HoopPass({ season: this.season });
    this.wallet = new Wallet();
  }

  // ─── Construction ─────────────────────────────────────────────────────────

  render() {
    const l = this.lang;
    const s = this.season;
    if (!s) {
      this.root.innerHTML = `
        <header class="page-head"><button class="icon-btn pressable" data-back aria-label="${t(l, 'back')}">${ICONS.back}</button><h1 id="title-pass">${t(l, 'pass.title')}</h1></header>
        <div class="page-body"><div class="empty"><p>${t(l, 'pass.soon')}</p></div></div>`;
      return;
    }
    this.load();
    const p = s.palette;
    this.root.style.cssText = `--hp-night:${p.night};--hp-night2:${p.night2};--hp-snow:${p.snow};--hp-red:${p.red};--hp-red2:${p.red2};--hp-gold:${p.gold};--hp-fir:${p.fir};--hp-fir2:${p.fir2}`;
    this.root.dataset.season = s.id;
    const cols = s.levels.map((lv) => this.colHtml(lv)).join('');
    this.root.innerHTML = `
      <div class="hp-bg" aria-hidden="true"><i class="hp-glow g1"></i><i class="hp-glow g2"></i><i class="hp-glow g3"></i></div>
      <header class="page-head hp-head">
        <button class="icon-btn pressable" data-back aria-label="${t(l, 'back')}">${ICONS.back}</button>
        <div class="hp-title reveal" style="--i:0">
          <h1 id="title-pass"><span>HOOP</span> <span>PASS</span></h1>
          <p class="hp-theme"><b>${t(l, 'pass.season', { n: s.number })}</b><span class="hp-dot"></span><span class="hp-flake">❄</span>${s.name[l] ?? s.name.fr}<span class="hp-flake">❄</span></p>
        </div>
        <span class="spacer"></span>
        <span class="chip hp-time reveal" style="--i:1"><span class="chip-icon">${CLOCK}</span><span class="chip-value"></span></span>
        <span class="chip hp-gems reveal" style="--i:2"><span class="chip-icon">${ICONS.gem}</span><span class="chip-value"></span></span>
        <span class="chip coins hp-coins reveal" style="--i:3"><span class="chip-icon">${ICONS.coin}</span><span class="chip-value"></span></span>
      </header>
      <div class="hp-body">
        <aside class="hp-side">
          <div class="hp-levelcard reveal" style="--i:1">
            <div class="hp-ring" role="img">
              <svg viewBox="0 0 64 64" aria-hidden="true"><circle class="hp-ring-bg" cx="32" cy="32" r="27"/><circle class="hp-ring-fill" cx="32" cy="32" r="27" pathLength="100"/></svg>
              <span class="hp-ring-in"><small>${t(l, 'pass.level')}</small><b class="hp-lvnum">1</b></span>
              <span class="hp-ring-flash"></span>
            </div>
            <div class="hp-xp">
              <p class="hp-xp-text"><b class="hp-next"></b><span class="hp-xpval"></span></p>
              <div class="hp-bar"><i class="hp-bar-fill"></i><s class="hp-bar-shine"></s></div>
              <button class="hp-how pressable" data-howto>${ICONS.info}<span>${t(l, 'pass.howto')}</span></button>
            </div>
          </div>
          <div class="hp-premium reveal" style="--i:2">
            <span class="hp-premium-sheen" aria-hidden="true"></span>
            <p class="hp-premium-head"><span class="hp-crown">${CROWN}</span><b class="hp-premium-title"></b></p>
            <p class="hp-premium-desc"></p>
            <button class="hp-unlock pressable" data-unlock><span class="hp-unlock-label"></span><span class="hp-price">${ICONS.gem}<b>${s.premium.gems}</b></span></button>
          </div>
          <button class="hp-claimall pressable reveal" style="--i:3" data-claimall><span>${t(l, 'pass.claimAll')}</span><b class="hp-claimall-n"></b></button>
        </aside>
        <div class="hp-trackwrap reveal" style="--i:2">
          <div class="hp-rows" aria-hidden="true">
            <span class="hp-rowlab premium">${CROWN}<b>${t(l, 'pass.premium')}</b></span>
            <span class="hp-rowlab free"><b>${t(l, 'pass.free')}</b></span>
          </div>
          <div class="hp-scroller" tabindex="0" aria-label="${t(l, 'pass.title')}">
            <div class="hp-track" style="--n:${s.levels.length}">
              <div class="hp-line" aria-hidden="true"><i class="hp-line-fill"></i></div>
              ${cols}
              <div class="hp-end" aria-hidden="true"><span>✦</span></div>
            </div>
          </div>
          <span class="hp-fade l" aria-hidden="true"></span><span class="hp-fade r" aria-hidden="true"></span>
          <button class="hp-mine pressable" data-mine hidden><span class="hp-mine-arrow">${ICONS.back}</span><span class="hp-mine-label"></span></button>
        </div>
      </div>
      <div class="hp-howto" hidden>
        <div class="hp-howto-card" role="dialog" aria-modal="true" aria-label="${t(l, 'pass.howto')}">
          <p class="hp-howto-title">${t(l, 'pass.howto')}</p>
          <ul>${SOURCES.map((src) => `<li><span class="hp-howto-ic ico">${ICONS[src.icon]}</span><span>${t(l, `pass.how.${src.key}`)}${src.replay ? `<small>${t(l, 'pass.how.replay', { n: s.xp[src.replay] })}</small>` : ''}</span><b>+${s.xp[src.key]} XP</b></li>`).join('')}</ul>
          <button class="hp-howto-ok pressable" data-howto-close>${t(l, 'reward.ok')}</button>
        </div>
      </div>
      <div class="hp-banner" aria-live="polite"><span class="hp-banner-rays"></span><p class="hp-banner-eyebrow">${t(l, 'pass.title')}</p><p class="hp-banner-title"></p><div class="hp-banner-loot"></div></div>
      <canvas class="hp-fx" aria-hidden="true"></canvas>`;
    this.cacheEls();
    this.drawThumbs();
    this.bindScroller();
    this.update();
  }

  /** Une colonne : récompense Premium, nœud du niveau, récompense gratuite. */
  colHtml(lv) {
    const hl = lv.highlight ? ' hl' : '';
    return `<div class="hp-col${hl}" data-level="${lv.level}">
      ${this.cardHtml(lv.level, 'premium', lv.premium, lv.highlight)}
      <span class="hp-node"><b>${lv.level}</b></span>
      ${this.cardHtml(lv.level, 'free', lv.free, false)}
    </div>`;
  }

  cardHtml(level, track, r, highlight) {
    const l = this.lang;
    const v = rewardVisual(l, r);
    const mythic = v.rarity === 'mythic';
    return `<button class="hp-card ${track}${highlight ? ' hl' : ''}${mythic ? ' mythic' : ''} kind-${v.kind}" data-l="${level}" data-t="${track}" style="--r:${v.rgb};--k:${level + (track === 'free' ? 0.5 : 0)}" aria-label="${t(l, `pass.${track}`)} · ${t(l, 'pass.lv', { n: level })} · ${v.label}">
      <span class="hp-card-glow" aria-hidden="true"></span>
      ${highlight ? `<span class="hp-ribbon">${mythic ? '✦ ' : ''}${t(l, 'pass.exclusive')}</span>` : ''}
      <span class="hp-vis">${v.html}</span>
      <span class="hp-lab">${v.label}</span>
      ${v.sub ? `<span class="hp-sub">${v.sub}</span>` : ''}
      <span class="hp-state"></span>
    </button>`;
  }

  cacheEls() {
    const $ = (s) => this.root.querySelector(s);
    this.el = {
      time: $('.hp-time .chip-value'), gems: $('.hp-gems .chip-value'), coins: $('.hp-coins .chip-value'), coinChip: $('.hp-coins'), gemChip: $('.hp-gems'),
      ring: $('.hp-ring'), ringFill: $('.hp-ring-fill'), lvnum: $('.hp-lvnum'), next: $('.hp-next'), xpval: $('.hp-xpval'), bar: $('.hp-bar-fill'),
      premium: $('.hp-premium'), premTitle: $('.hp-premium-title'), premDesc: $('.hp-premium-desc'), unlock: $('.hp-unlock'), unlockLabel: $('.hp-unlock-label'),
      claimAll: $('.hp-claimall'), claimAllN: $('.hp-claimall-n'),
      scroller: $('.hp-scroller'), track: $('.hp-track'), lineFill: $('.hp-line-fill'), mine: $('.hp-mine'), mineLabel: $('.hp-mine-label'),
      howto: $('.hp-howto'), banner: $('.hp-banner'), bannerTitle: $('.hp-banner-title'), bannerLoot: $('.hp-banner-loot'), fx: $('.hp-fx'),
    };
    this.cols = [...this.root.querySelectorAll('.hp-col')];
  }

  drawThumbs() {
    for (const cv of this.root.querySelectorAll('.hp-vis canvas[data-item]')) {
      const it = itemById(cv.dataset.item);
      if (it) requestAnimationFrame(() => drawThumb(cv, it, DPR()));
    }
  }

  // ─── Mise à jour (sans reconstruire : le défilement et les aperçus restent) ─

  update({ xp = null } = {}) {
    if (!this.season || !this.el) return;
    const l = this.lang;
    const pass = this.pass;
    const pr = pass.progress(xp === null ? pass.data.xp : Math.floor(xp));
    this.shown = pr;
    // Temps restant
    this.updateClock();
    this.el.gems.textContent = fmt(l, this.wallet.gems);
    this.el.coins.textContent = fmt(l, this.wallet.coins);
    // Niveau et XP
    this.el.lvnum.textContent = String(pr.level);
    this.el.ring.setAttribute('aria-label', `${t(l, 'pass.level')} ${pr.level}`);
    this.el.ringFill.style.strokeDashoffset = String(100 - pr.ratio * 100);
    this.el.bar.style.transform = `scaleX(${pr.ratio})`;
    this.el.next.textContent = pr.max ? t(l, 'pass.max') : t(l, 'pass.toNext', { n: pr.level + 1 });
    this.el.xpval.textContent = pr.max ? `${fmt(l, pr.xp)} XP` : t(l, 'pass.xp', { a: fmt(l, pr.xpIn), b: fmt(l, pr.xpNeed) });
    // Premium
    const on = pass.premium;
    this.root.classList.toggle('is-premium', on);
    this.root.classList.toggle('is-over', pass.over);
    this.el.premTitle.textContent = t(l, on ? 'pass.premium.on' : 'pass.premium.title');
    this.el.premDesc.textContent = t(l, on ? 'pass.premium.onDesc' : 'pass.premium.desc');
    this.el.unlock.hidden = on;
    this.el.unlock.disabled = !pass.active;
    if (!this.confirming) this.el.unlockLabel.textContent = t(l, 'pass.unlock');
    // Frise : remplie jusqu'au niveau affiché (+ avancement vers le suivant)
    this.updateLine(pr);
    if (xp === null) this.updateCards(pr.level);
    const n = pass.claimable();
    this.el.claimAll.hidden = !n;
    this.el.claimAllN.textContent = String(n);
    this.el.mineLabel.textContent = t(l, 'pass.lv', { n: pr.level });
    this.updateMine();
  }

  updateClock() {
    const l = this.lang;
    const pass = this.pass;
    if (!this.el) return;
    if (pass.over) this.el.time.textContent = t(l, 'pass.over');
    else {
      const tl = pass.timeLeftParts();
      this.el.time.textContent = tl.days > 0 ? t(l, 'pass.left', { d: tl.days, h: tl.hours }) : t(l, 'pass.leftH', { h: tl.hours, m: tl.minutes });
    }
  }

  /** États des cartes et des nœuds jusqu'au niveau `upTo` (le niveau affiché pendant l'animation). */
  updateCards(upTo = this.pass.level) {
    const l = this.lang;
    for (const col of this.cols) {
      const n = Number(col.dataset.level);
      col.classList.toggle('reached', n <= upTo);
      col.classList.toggle('current', n === upTo);
      for (const card of col.querySelectorAll('.hp-card')) {
        let st = this.pass.state(n, card.dataset.t);
        if (n > upTo && st !== 'claimed') st = 'locked';
        if (card.dataset.s === st) continue;
        card.dataset.s = st;
        card.className = card.className.replace(/\bs-\w+/g, '').trim() + ` s-${st}`;
        card.querySelector('.hp-state').innerHTML = st === 'claimed' ? `<span class="hp-check">${CHECK}</span>`
          : st === 'ready' ? `<span class="hp-go">${t(l, 'pass.claim')}</span>`
            : st === 'premium' ? `<span class="hp-lock gold">${LOCK}</span>`
              : st === 'locked' ? `<span class="hp-lock">${LOCK}</span>` : '';
      }
    }
  }

  /** Position (px) du centre de la colonne d'un niveau dans la piste. */
  colCenter(level) {
    const col = this.cols[Math.max(0, Math.min(this.cols.length - 1, level - 1))];
    return col ? col.offsetLeft + col.offsetWidth / 2 : 0;
  }

  updateLine(pr) {
    const a = this.colCenter(pr.level);
    const b = pr.max ? a : this.colCenter(pr.level + 1);
    const x = a + (b - a) * (pr.max ? 0 : pr.ratio);
    this.el.lineFill.style.transform = `translateX(${Math.round(x - this.el.lineFill.parentElement.offsetWidth)}px)`;
  }

  // ─── Défilement ───────────────────────────────────────────────────────────

  bindScroller() {
    const sc = this.el.scroller;
    sc.addEventListener('scroll', () => this.updateMine(), { passive: true });
    // Molette (ordinateur) : défilement horizontal
    sc.addEventListener('wheel', (e) => {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      sc.scrollLeft += e.deltaY;
      e.preventDefault();
    }, { passive: false });
    // Glisser à la souris (au doigt, le défilement natif suffit)
    let drag = null;
    sc.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      drag = { x: e.clientX, left: sc.scrollLeft, moved: false };
    });
    window.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const dx = e.clientX - drag.x;
      if (Math.abs(dx) > 6) drag.moved = true;
      if (drag.moved) sc.scrollLeft = drag.left - dx;
    });
    window.addEventListener('pointerup', () => {
      if (drag?.moved) {
        // Un glissé n'est pas un clic sur une carte
        const stop = (ev) => { ev.stopPropagation(); ev.preventDefault(); };
        sc.addEventListener('click', stop, { capture: true, once: true });
        setTimeout(() => sc.removeEventListener('click', stop, { capture: true }), 0);
      }
      drag = null;
    });
  }

  /** Centre la piste sur un niveau. */
  scrollToLevel(level, smooth = true) {
    const sc = this.el.scroller;
    const x = this.colCenter(level) - sc.clientWidth / 2;
    sc.scrollTo({ left: Math.max(0, x), behavior: smooth ? 'smooth' : 'auto' });
  }

  /** « Mon niveau » apparaît quand la colonne du niveau actuel sort de l'écran. */
  updateMine() {
    if (!this.el || !this.shown) return;
    const sc = this.el.scroller;
    const x = this.colCenter(this.shown.level) - sc.scrollLeft;
    const out = x < 30 || x > sc.clientWidth - 30;
    this.el.mine.hidden = !out;
    this.el.mine.classList.toggle('right', x > sc.clientWidth - 30);
  }

  // ─── Ouverture / fermeture ────────────────────────────────────────────────

  async onShow() {
    this.active = true;
    if (!this.season) return;
    this.load();
    const u = this.pass.unseen();
    const animate = this.pass.active && u.toXp > u.fromXp;
    this.update(animate ? { xp: u.fromXp } : {});
    if (animate) this.updateCards(u.fromLevel);
    this.sizeFx();
    requestAnimationFrame(() => this.scrollToLevel(animate ? u.fromLevel : this.pass.level, false));
    clearInterval(this.clock);
    this.clock = setInterval(() => this.updateClock(), 30000);
    await wait(650); // entrée de la page
    if (!this.active) return;
    if (animate) await this.playLevelUps(u);
    if (!this.active) return;
    // Première visite de la saison : cadeau de bienvenue (des gemmes pour découvrir le Premium)
    const gift = this.pass.welcome(this.wallet);
    if (gift) {
      await this.env.fx.reveal({ title: t(this.lang, 'pass.welcome.title'), coins: gift.coins, gems: gift.gems, item: gift.item, chest: null }, this.el.coinChip);
      this.load();
      this.update();
      this.bump(this.el.gemChip);
    }
  }

  onHide() {
    this.active = false;
    clearInterval(this.clock);
    this.el?.howto && (this.el.howto.hidden = true);
    this.el?.banner?.classList.remove('show');
  }

  /** Les niveaux gagnés depuis la dernière visite : la barre se remplit, chaque niveau éclate. */
  async playLevelUps(u) {
    this.busy = true;
    const levels = u.toLevel - u.fromLevel;
    const dur = Math.min(3200, 900 + levels * 420);
    if (levels > 0) this.scrollToLevel(u.toLevel);
    let shownLevel = u.fromLevel;
    let lastTick = 0;
    const t0 = performance.now();
    await new Promise((resolve) => {
      const step = (now) => {
        if (!this.active) return resolve();
        const k = Math.min(1, (now - t0) / dur);
        const e = 1 - Math.pow(1 - k, 2.2);
        const xp = u.fromXp + (u.toXp - u.fromXp) * e;
        this.update({ xp });
        if (now - lastTick > 70 && k < 1) {
          lastTick = now;
          this.env.sound.passFill?.(this.shown.ratio);
        }
        if (this.shown.level > shownLevel) {
          shownLevel = this.shown.level;
          this.levelBurst(shownLevel);
        }
        if (k < 1) requestAnimationFrame(step);
        else resolve();
      };
      requestAnimationFrame(step);
    });
    this.pass.markSeen();
    this.update();
    this.busy = false;
    if (levels > 0 && this.active) await this.banner(u.toLevel, u.fromLevel);
  }

  /** Un niveau gagné : l'anneau éclate, des étincelles et des flocons jaillissent, la colonne s'allume. */
  levelBurst(level) {
    const ring = this.el.ring;
    ring.classList.remove('pop');
    void ring.offsetWidth;
    ring.classList.add('pop');
    this.env.sound.passLevel?.(level);
    this.env.vibrate([12, 30, 18]);
    const r = ring.getBoundingClientRect();
    const host = this.root.getBoundingClientRect();
    this.burst(r.left + r.width / 2 - host.left, r.top + r.height / 2 - host.top, 34);
    this.updateCards(level);
    const col = this.cols[level - 1];
    if (col) {
      col.classList.remove('lit');
      void col.offsetWidth;
      col.classList.add('lit');
      const c = col.querySelector('.hp-node').getBoundingClientRect();
      if (c.left > host.left && c.right < host.right) this.burst(c.left + c.width / 2 - host.left, c.top + c.height / 2 - host.top, 18);
    }
  }

  /** Bandeau « Niveau N atteint ! » avec les récompenses débloquées. */
  async banner(level, from) {
    const l = this.lang;
    const b = this.el.banner;
    this.el.bannerTitle.textContent = t(l, 'pass.levelUp', { n: level });
    const news = [];
    for (let n = from + 1; n <= level; n++) {
      news.push(this.season.levels[n - 1].free);
      if (this.pass.premium) news.push(this.season.levels[n - 1].premium);
    }
    this.el.bannerLoot.innerHTML = news.slice(0, 6).map((r) => {
      const v = rewardVisual(l, r);
      return `<span class="hp-bl" style="--r:${v.rgb}"><span class="hp-vis">${v.kind === 'item' ? `<span class="hp-bl-star">★</span>` : v.html}</span><b>${v.label}</b></span>`;
    }).join('') + (news.length > 6 ? `<span class="hp-bl more"><b>+${news.length - 6}</b></span>` : '');
    b.classList.remove('show');
    void b.offsetWidth;
    b.classList.add('show');
    await wait(2600);
    b.classList.remove('show');
  }

  // ─── Actions ──────────────────────────────────────────────────────────────

  onClick(e) {
    if (!this.season) return;
    const l = this.lang;
    if (e.target.closest('[data-howto]')) {
      this.el.howto.hidden = false;
      this.env.sound.open?.();
      return;
    }
    if (e.target.closest('[data-howto-close]') || e.target === this.el.howto) {
      this.el.howto.hidden = true;
      this.env.sound.back?.();
      return;
    }
    if (e.target.closest('[data-mine]')) {
      this.env.sound.tab?.(1);
      this.scrollToLevel(this.pass.level);
      return;
    }
    if (e.target.closest('[data-unlock]')) return this.unlock();
    if (e.target.closest('[data-claimall]')) return this.claimAll();
    const card = e.target.closest('.hp-card');
    if (!card || this.busy) return;
    const n = Number(card.dataset.l);
    const tr = card.dataset.t;
    const st = this.pass.state(n, tr);
    if (st === 'ready') return this.claim(n, tr, card);
    if (st === 'claimed') return;
    this.env.sound.locked?.();
    this.env.vibrate([10, 40, 10]);
    this.shake(card);
    if (st === 'premium') {
      this.env.toast(t(l, 'pass.premiumToast'));
      this.shake(this.el.premium);
    } else if (st === 'over') this.env.toast(t(l, 'pass.overToast'));
    else this.env.toast(t(l, 'pass.lockedToast', { n }));
  }

  async claim(level, track, card) {
    this.busy = true;
    const res = this.pass.claim(level, track, this.wallet, new Stats());
    if (!res) {
      this.busy = false;
      return;
    }
    card.classList.add('claiming');
    const r = card.getBoundingClientRect();
    const host = this.root.getBoundingClientRect();
    this.burst(r.left + r.width / 2 - host.left, r.top + r.height / 2 - host.top, 22);
    await this.env.fx.reveal({ title: t(this.lang, 'pass.reward.title', { n: level }), coins: res.coins, gems: res.gems, item: res.item, chest: res.chest }, this.el.coinChip);
    card.classList.remove('claiming');
    this.afterGain(res);
    card.classList.add('just-claimed');
    setTimeout(() => card.classList.remove('just-claimed'), 900);
    this.busy = false;
  }

  async claimAll() {
    if (this.busy) return;
    this.busy = true;
    const list = this.pass.claimAll(this.wallet, new Stats());
    if (!list.length) {
      this.busy = false;
      return;
    }
    const sum = { coins: 0, gems: 0, items: [] };
    for (const r of list) {
      sum.coins += r.coins;
      sum.gems += r.gems;
      if (r.item) sum.items.push(r.item);
    }
    this.updateCards();
    for (const c of this.root.querySelectorAll('.hp-card.s-claimed')) c.classList.add('claiming');
    await this.env.fx.reveal({ title: t(this.lang, 'pass.all.title', { n: list.length }), coins: sum.coins, gems: sum.gems, items: sum.items, chest: null }, this.el.coinChip);
    const done = [...this.root.querySelectorAll('.hp-card.claiming')];
    for (const c of done) c.classList.remove('claiming');
    this.afterGain(sum);
    for (const c of done) c.classList.add('just-claimed');
    setTimeout(() => done.forEach((c) => c.classList.remove('just-claimed')), 900);
    this.busy = false;
  }

  afterGain(res) {
    this.load();
    this.update();
    if (res.gems) this.bump(this.el.gemChip);
    if (res.coins) this.bump(this.el.coinChip);
    this.env.refreshHome?.();
  }

  /** Débloquer le Premium : un premier toucher demande confirmation (on dépense des gemmes rares). */
  unlock() {
    const l = this.lang;
    const price = this.season.premium.gems;
    if (!this.pass.active) return this.env.toast(t(l, 'pass.overToast'));
    if (this.wallet.gems < price) {
      this.env.sound.locked?.();
      this.env.vibrate([10, 40, 10]);
      this.shake(this.el.unlock);
      this.env.toast(t(l, 'pass.noGems', { n: price - this.wallet.gems }));
      return;
    }
    if (!this.confirming) {
      this.confirming = true;
      this.el.unlock.classList.add('confirm');
      this.el.unlockLabel.textContent = t(l, 'pass.confirm');
      this.env.sound.select?.(2);
      clearTimeout(this.confirmTimer);
      this.confirmTimer = setTimeout(() => this.resetConfirm(), 3200);
      return;
    }
    this.resetConfirm();
    if (this.pass.unlockPremium(this.wallet) !== 'ok') return;
    this.env.sound.passPremium?.();
    this.env.vibrate([20, 50, 30, 50, 40]);
    this.root.classList.add('premium-unlocking');
    setTimeout(() => this.root.classList.remove('premium-unlocking'), 1800);
    const r = this.el.premium.getBoundingClientRect();
    const host = this.root.getBoundingClientRect();
    this.burst(r.left + r.width / 2 - host.left, r.top + r.height / 2 - host.top, 60, true);
    this.env.toast(t(l, 'pass.premium.ok'));
    this.load();
    this.update();
    this.bump(this.el.gemChip);
    this.env.refreshHome?.();
  }

  resetConfirm() {
    clearTimeout(this.confirmTimer);
    this.confirming = false;
    this.el.unlock.classList.remove('confirm');
    this.el.unlockLabel.textContent = t(this.lang, 'pass.unlock');
  }

  shake(el) {
    el.classList.remove('shake');
    void el.offsetWidth;
    el.classList.add('shake');
  }

  bump(el) {
    el.classList.remove('bump');
    void el.offsetWidth;
    el.classList.add('bump');
  }

  // ─── Étincelles (canevas par-dessus la page, actif seulement pendant un effet) ─

  sizeFx() {
    const cv = this.el.fx;
    const r = this.root.getBoundingClientRect();
    const d = DPR();
    cv.width = Math.max(1, Math.round(r.width * d));
    cv.height = Math.max(1, Math.round(r.height * d));
    this.fxScale = d;
  }

  burst(x, y, n = 24, gold = false) {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const colors = gold ? ['#ffd36b', '#fff1c2', '#ffb347', '#ffffff'] : ['#ffd36b', '#ffffff', '#cfe6ff', '#ff6b7d', '#7fe0a0'];
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 90 + Math.random() * 260;
      this.parts.push({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60, life: 0, max: 0.7 + Math.random() * 0.7,
        size: 1.6 + Math.random() * 2.8, color: colors[i % colors.length], flake: Math.random() < 0.25, rot: Math.random() * 6,
      });
    }
    if (!this.fxRaf) {
      this.fxLast = performance.now();
      this.fxRaf = requestAnimationFrame((now) => this.fxFrame(now));
    }
  }

  fxFrame(now) {
    const dt = Math.min(0.05, (now - this.fxLast) / 1000);
    this.fxLast = now;
    const cv = this.el.fx;
    const ctx = cv.getContext('2d');
    const d = this.fxScale ?? 1;
    ctx.setTransform(d, 0, 0, d, 0, 0);
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.globalCompositeOperation = 'lighter';
    this.parts = this.parts.filter((p) => (p.life += dt) < p.max);
    for (const p of this.parts) {
      p.vy += 260 * dt;
      p.vx *= 1 - 1.6 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += dt * 3;
      const a = 1 - p.life / p.max;
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      if (p.flake) {
        p.color = '#e6f2ff';
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        for (let k = 0; k < 3; k++) {
          const ang = (k * Math.PI) / 3;
          ctx.moveTo(-Math.cos(ang) * p.size * 1.8, -Math.sin(ang) * p.size * 1.8);
          ctx.lineTo(Math.cos(ang) * p.size * 1.8, Math.sin(ang) * p.size * 1.8);
        }
        ctx.stroke();
        ctx.restore();
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (0.6 + a * 0.4), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    if (this.parts.length) this.fxRaf = requestAnimationFrame((n) => this.fxFrame(n));
    else {
      ctx.clearRect(0, 0, cv.width, cv.height);
      this.fxRaf = 0;
    }
  }

  layout() {
    if (!this.el || !this.active) return;
    this.sizeFx();
    this.update();
  }
}

/** Apparence d'une récompense sur une carte : visuel, libellé, couleur d'accent. */
export function rewardVisual(lang, r) {
  if (r.item) {
    const it = itemById(r.item);
    return { kind: 'item', html: `<canvas data-item="${it.id}"></canvas>`, label: it.name[lang] ?? it.name.fr, sub: t(lang, `rarity.${it.rarity}`), rarity: it.rarity, rgb: RARITIES[it.rarity].rgb };
  }
  if (r.chest) return { kind: 'chest', html: chestHtml(r.chest), label: lt(lang, `chest.${r.chest}`), rarity: r.chest, rgb: CHEST_RGB[r.chest] ?? CHEST_RGB.common };
  if (r.gems) return { kind: 'gems', html: `<span class="hp-ic gem">${ICONS.gem}</span>`, label: `${r.gems}`, sub: t(lang, 'pass.gems'), rarity: 'gem', rgb: '95,212,255' };
  return { kind: 'coins', html: `<span class="hp-ic coin">${ICONS.coin}</span>`, label: fmt(lang, r.coins ?? 0), sub: t(lang, 'pass.coins'), rarity: 'coin', rgb: '255,201,77' };
}

/** Pastille du bouton Hoop Pass de l'accueil : niveau, avancement, récompenses à récupérer. */
export function passHomeState(season) {
  if (!season) return null;
  const pass = new HoopPass({ season });
  const pr = pass.progress();
  return { level: pr.level, ratio: pr.ratio, claimable: pass.claimable(), over: pass.over, active: pass.active, premium: pass.premium };
}
