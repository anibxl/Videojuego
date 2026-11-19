// Page « Bonus du jour » (étape 13) : coffre bonus et roue de la chance.
//
//  - Coffre bonus : un par jour. « Coffre gratuit », OU « Regarder une publicité → Coffre amélioré ».
//  - Roue de la chance : 1 lancer gratuit par jour, puis « Regarder une publicité → lancer
//    supplémentaire » (limite du jour dans shared/ads-config.js).
//
// Les publicités sont TOUJOURS lancées par le joueur ; la récompense n'est donnée qu'après la
// validation complète de l'annonce (shared/ads.js). Si aucune annonce n'est disponible, l'option
// gratuite reste là : le joueur n'est jamais bloqué. Aucune annonce n'est chargée avant l'ouverture
// de cette page (rien au lancement du jeu).

import { Bonus, WHEEL } from '../shared/bonus.js';
import { getAds } from '../shared/ads.js';
import { secondsToMidnight } from '../shared/stats.js';
import { ICONS } from './icons.js';
import { t } from './i18n.js';
import { chestHtml } from './rewards-fx.js';
import { LiveView, liveContext, header, duration } from './live-views.js';

const SEG = 360 / WHEEL.length;
const CHECK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.5 16.2 5.3 12l-1.4 1.4 5.6 5.6L20.1 8.4 18.7 7z"/></svg>';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Libellé d'une case de la roue. */
function segmentArt(lang, seg) {
  if (seg.icon === 'coin') return `<span class="coin">${ICONS.coin}</span><b>${seg.reward.coins}</b>`;
  if (seg.icon === 'chest') return `${chestHtml(seg.reward.chest, 'mini')}<b>${t(lang, `wheel.${seg.id}`)}</b>`;
  if (seg.icon === 'effect') return `<span class="wseg-emoji">✨</span><b>${t(lang, 'wheel.effect')}</b>`;
  return `<span class="wseg-emoji">🏀</span><b>${t(lang, 'wheel.skin')}</b>`;
}

/** Fond de la roue : un dégradé conique, une couleur par case, fins séparateurs dorés. */
function wheelGradient() {
  const stops = WHEEL.map((s, i) => {
    const a = i * SEG;
    return `rgba(255,214,120,0.85) ${a}deg ${a + 0.8}deg, ${s.color} ${a + 0.8}deg ${a + SEG}deg`;
  });
  return `conic-gradient(${stops.join(', ')})`;
}

export class BonusView extends LiveView {
  constructor(root, env) {
    super(root, env);
    this.ads = getAds();
    this.rot = 0; // rotation cumulée de la roue (degrés)
    this.busy = false;
    this.ads.onChange(() => this.active && this.updateAdButtons());
  }

  render(quiet = false) {
    if (this.busy) return;
    const l = this.lang;
    const c = (this.ctx = liveContext());
    const bonus = (this.bonus = new Bonus());
    const chestOpen = bonus.chestAvailable();
    const free = bonus.freeSpinAvailable();

    const chestActions = chestOpen
      ? `
        <div class="bv-actions">
          <button class="bv-free pressable" data-chest="free"><span class="bv-emoji">🎁</span><span>${t(l, 'bonus.chest.free')}</span></button>
          <span class="bv-or">${t(l, 'bonus.or')}</span>
          <button class="ad-btn pressable" data-chest="ad"><span class="ad-ico">📺</span><span class="ad-txt"><b>${t(l, 'bonus.watch')}</b><small data-sub>→ ${t(l, 'bonus.chest.upgrade')}</small></span></button>
        </div>
        <p class="bv-perks"><span>✦</span> ${t(l, 'bonus.chest.perks')}</p>`
      : `<p class="bv-done">${CHECK}<span>${t(l, 'bonus.chest.opened')}</span></p><p class="bv-renew" data-countdown></p>`;

    const segs = WHEEL.map((s, i) => `<span class="wseg" data-seg="${i}" style="--a:${i * SEG + SEG / 2}deg"><span class="wseg-in">${segmentArt(l, s)}</span></span>`).join('');

    this.root.innerHTML = `
      ${header(l, 'bonus', 'bonus.title', `<span class="chip lv-chip timer reveal" style="--i:0"><span class="dv-clock"></span><b data-clock></b></span>`)}
      <div class="lv-body bv-body">
        <div class="bv-grid">
          <section class="bv-panel bv-chest reveal" style="--i:2" data-open="${chestOpen ? 1 : 0}">
            <h2 class="bv-title">${t(l, 'bonus.chest.title')}</h2>
            <p class="bv-sub">${t(l, 'bonus.chest.sub')}</p>
            <div class="bv-stage">${chestHtml(chestOpen ? 'common' : (bonus.data.chest ?? 'common'), chestOpen ? 'idle' : 'opened')}<span class="bv-sparkles" aria-hidden="true"><i></i><i></i><i></i><i></i></span></div>
            ${chestActions}
          </section>
          <section class="bv-panel bv-wheel reveal" style="--i:3">
            <div class="wheel-wrap">
              <span class="wheel-pointer" aria-hidden="true"></span>
              <div class="wheel">
                <div class="wheel-disc" style="background:${wheelGradient()};transform:rotate(${this.rot}deg)">${segs}</div>
                <span class="wheel-rim" aria-hidden="true"></span>
                <span class="wheel-hub" aria-hidden="true"></span>
              </div>
            </div>
            <div class="wheel-side">
              <h2 class="bv-title">${t(l, 'bonus.wheel.title')}</h2>
              ${free
                ? `<button class="bv-spin pressable" data-spin="free"><span class="bv-emoji">🎡</span><span>${t(l, 'bonus.wheel.spin')}</span></button>`
                : `<p class="bv-done small">${CHECK}<span>${t(l, 'bonus.wheel.used')}</span></p>`}
              <button class="ad-btn pressable" data-spin="ad"><span class="ad-ico">📺</span><span class="ad-txt"><b>${t(l, 'bonus.watch')}</b><small data-sub></small></span></button>
            </div>
          </section>
        </div>
        <p class="bv-note reveal" style="--i:5">${t(l, 'bonus.optional')}</p>
      </div>`;
    if (quiet) for (const r of this.root.querySelectorAll('.reveal')) r.style.animation = 'none';
    this.setCoins(c);
    this.tick();
    this.updateAdButtons();
  }

  afterShow() {
    // On prépare une annonce seulement maintenant (jamais au lancement), pour l'option la plus utile
    if (this.bonus.chestAvailable() && this.ads.remaining('bonusChest')) this.ads.prepare('bonusChest');
    else if (this.ads.remaining('wheelSpin')) this.ads.prepare('wheelSpin');
  }

  /** État des boutons « Regarder une publicité » (prête, chargement, indisponible, limite). */
  updateAdButtons() {
    const l = this.lang;
    const label = (placement, readyText) => {
      const st = this.ads.status(placement);
      return { st, text: st === 'ready' || st === 'blocked' ? readyText : t(l, st === 'capped' ? 'ad.capped' : st === 'loading' ? 'ad.loading' : 'ad.unavailable') };
    };
    const chestBtn = this.root.querySelector('[data-chest="ad"]');
    if (chestBtn) {
      const { st, text } = label('bonusChest', `→ ${t(l, 'bonus.chest.upgrade')}`);
      chestBtn.dataset.state = st;
      chestBtn.disabled = this.busy || (st !== 'ready' && st !== 'loading');
      chestBtn.querySelector('[data-sub]').textContent = text;
    }
    const spinBtn = this.root.querySelector('[data-spin="ad"]');
    if (spinBtn) {
      const left = this.ads.remaining('wheelSpin');
      const { st, text } = label('wheelSpin', `→ ${t(l, 'bonus.wheel.extra')} · ${t(l, 'bonus.wheel.left', { n: left })}`);
      spinBtn.dataset.state = st;
      spinBtn.disabled = this.busy || (st !== 'ready' && st !== 'loading');
      spinBtn.querySelector('[data-sub]').textContent = text;
    }
    for (const b of this.root.querySelectorAll('[data-chest="free"], [data-spin="free"]')) b.disabled = this.busy;
  }

  tick() {
    const l = this.lang;
    const left = t(l, 'bonus.renew', { t: duration(l, secondsToMidnight()) });
    const clock = this.root.querySelector('[data-clock]');
    if (clock) clock.textContent = duration(l, secondsToMidnight());
    const cd = this.root.querySelector('[data-countdown]');
    if (cd) cd.textContent = left;
    // Minuit passé pendant que la page est ouverte : nouveau coffre, nouveau lancer gratuit
    if (!this.busy && this.bonus && this.bonus.data.date && this.bonus.data.date !== new Bonus()._today().date) this.render(true);
  }

  /** Le menu se tait pendant une publicité. */
  async watch(placement) {
    this.env.adMute?.(true);
    const res = await this.ads.showRewarded(placement);
    this.env.adMute?.(false);
    return res;
  }

  adFailed(res) {
    const key = res.status === 'dismissed' ? 'ad.dismissed' : res.status === 'capped' ? 'ad.capped' : res.status === 'error' ? 'ad.error' : 'ad.unavailable';
    this.env.toast(t(this.lang, key));
    this.env.sound.locked?.();
  }

  async onClick(e) {
    if (this.busy) return;
    const chest = e.target.closest('[data-chest]');
    const spin = e.target.closest('[data-spin]');
    if (chest && !chest.disabled) return this.openChest(chest.dataset.chest === 'ad');
    if (spin && !spin.disabled) return this.spin(spin.dataset.spin === 'ad');
  }

  // ─── Coffre bonus ─────────────────────────────────────────────────────────

  async openChest(withAd) {
    if (!new Bonus().chestAvailable()) return this.render(true);
    this.busy = true;
    this.updateAdButtons();
    if (withAd) {
      const res = await this.watch('bonusChest');
      if (res.status !== 'rewarded') {
        this.busy = false;
        this.updateAdButtons();
        return this.adFailed(res);
      }
    }
    // Le coffre de la page tremble (et se transforme en coffre amélioré), puis la grande révélation
    const stage = this.root.querySelector('.bv-stage');
    const el = stage?.querySelector('.chest');
    if (el) {
      if (withAd) {
        el.classList.remove('common');
        el.classList.add('super');
        stage.classList.add('upgrade');
        this.env.sound.surprise?.();
        this.env.vibrate([10, 30, 10]);
        await wait(reducedMotion() ? 200 : 900);
      }
      el.classList.remove('idle');
      el.classList.add('shake');
      this.env.sound.open();
      await wait(reducedMotion() ? 100 : 520);
    }
    const c = liveContext();
    const res = new Bonus().openChest(c.wallet, c.stats, withAd);
    this.busy = false;
    if (res) await this.celebrate(res, t(this.lang, withAd ? 'bonus.got.super' : 'bonus.got.chest'));
    else this.render(true);
  }

  // ─── Roue de la chance ────────────────────────────────────────────────────

  async spin(withAd) {
    if (!withAd && !new Bonus().freeSpinAvailable()) return this.render(true);
    this.busy = true;
    this.updateAdButtons();
    if (withAd) {
      const res = await this.watch('wheelSpin');
      if (res.status !== 'rewarded') {
        this.busy = false;
        this.updateAdButtons();
        return this.adFailed(res);
      }
    }
    // Le tirage est fait (et sauvegardé) tout de suite : quitter pendant l'animation ne fait rien perdre
    const c = liveContext();
    const out = new Bonus().spin(c.wallet, c.stats, withAd);
    if (!out) {
      this.busy = false;
      return this.render(true);
    }
    for (const b of this.root.querySelectorAll('[data-spin]')) b.disabled = true;
    await this.animateWheel(out.index);
    this.busy = false;
    await this.celebrate(out.result, t(this.lang, 'bonus.got.wheel'));
  }

  /** Rotation fluide, ralentissement progressif, clics sur chaque case, pointeur qui sautille. */
  animateWheel(index) {
    const disc = this.root.querySelector('.wheel-disc');
    const pointer = this.root.querySelector('.wheel-pointer');
    const wheel = this.root.querySelector('.wheel');
    if (!disc) return Promise.resolve();
    // Arrivée : le centre de la case sous le pointeur (en haut), avec un léger décalage pour le suspense
    const center = index * SEG + SEG / 2;
    const jitter = (Math.random() - 0.5) * SEG * 0.7;
    const start = this.rot;
    const want = (((-(center + jitter)) % 360) + 360) % 360;
    const turns = reducedMotion() ? 1 : 6;
    const end = start - (((start % 360) + 360) % 360) + turns * 360 + want;
    const dur = reducedMotion() ? 1200 : 5600;
    const ease = (k) => 1 - Math.pow(1 - k, 4); // ralentit longtemps : le suspense des dernières cases
    wheel.classList.add('spinning');
    wheel.querySelector('.win')?.classList.remove('win');
    this.env.sound.spin?.();
    this.env.vibrate(12);
    return new Promise((resolve) => {
      const t0 = performance.now();
      let lastSeg = Math.floor(start / SEG);
      let prevRot = start;
      let prevT = t0;
      const frame = (now) => {
        const k = Math.min(1, (now - t0) / dur);
        const rot = start + (end - start) * ease(k);
        disc.style.transform = `rotate(${rot}deg)`;
        const seg = Math.floor(rot / SEG);
        if (seg !== lastSeg) {
          lastSeg = seg;
          const speed = (rot - prevRot) / Math.max(1, now - prevT); // degrés par ms
          this.env.sound.wheelTick?.(speed / 1.2);
          pointer.animate([{ transform: 'translateX(-50%) rotate(-24deg)' }, { transform: 'translateX(-50%) rotate(0deg)' }], { duration: Math.max(90, Math.min(260, 40 / Math.max(speed, 0.05))), easing: 'ease-out' });
        }
        prevRot = rot;
        prevT = now;
        if (k < 1) requestAnimationFrame(frame);
        else {
          this.rot = end;
          wheel.classList.remove('spinning');
          wheel.querySelector(`.wseg[data-seg="${index}"]`)?.classList.add('win');
          wheel.classList.add('landed');
          this.env.sound.equip?.();
          this.env.vibrate([15, 30, 15]);
          setTimeout(resolve, reducedMotion() ? 200 : 750);
        }
      };
      requestAnimationFrame(frame);
    });
  }
}
