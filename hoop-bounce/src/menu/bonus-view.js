// Page « Bonus » : la ROULETTE QUOTIDIENNE, récompense quotidienne principale (phase 4).
//
//  - 1 lancer gratuit par jour ; une fois utilisé, un compte à rebours jusqu'au lendemain.
//  - Puis jusqu'à 3 lancers supplémentaires, uniquement avec une publicité récompensée (facultative).
//  - Après ces 3 lancers : plus de roulette jusqu'au lendemain.
// L'ancien coffre bonus quotidien (étape 13) a été supprimé : il faisait doublon avec la roulette.
//
// Les publicités sont TOUJOURS lancées par le joueur ; la récompense n'est donnée qu'après la
// validation complète de l'annonce (shared/ads.js). Si aucune annonce n'est disponible, l'option
// gratuite reste là : le joueur n'est jamais bloqué. Aucune annonce n'est chargée avant l'ouverture
// de cette page (rien au lancement du jeu).

import { Bonus, WHEEL, AD_SPINS_PER_DAY } from '../shared/bonus.js';
import { getAds } from '../shared/ads.js';
import { secondsToMidnight } from '../shared/stats.js';
import { ICONS } from './icons.js';
import { t } from './i18n.js';
import { chestHtml } from './rewards-fx.js';
import { LiveView, liveContext, header, duration } from './live-views.js';

const SEG = 360 / WHEEL.length;
const CHECK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.5 16.2 5.3 12l-1.4 1.4 5.6 5.6L20.1 8.4 18.7 7z"/></svg>';
const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Libellé d'une case de la roue. */
function segmentArt(lang, seg) {
  if (seg.icon === 'coin') return `<span class="coin">${ICONS.coin}</span><b>${seg.reward.coins}</b>`;
  if (seg.icon === 'chest') return `${chestHtml(seg.reward.chest, 'mini')}<b>${t(lang, `wheel.${seg.id}`)}</b>`;
  if (seg.icon === 'gem') return `<span class="hb-gem wseg-gem" aria-hidden="true"></span><b>${seg.reward.gems}</b>`;
  if (seg.icon === 'effect') return `<span class="wseg-emoji ico">${ICONS.sparkle}</span><b>${t(lang, 'wheel.effect')}</b>`;
  return `<span class="wseg-emoji ico">${ICONS.ball}</span><b>${t(lang, 'wheel.skin')}</b>`;
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
    const status = bonus.status(); // 'free' · 'ads' · 'done'
    const used = bonus.adSpinsToday();
    const pips = Array.from({ length: AD_SPINS_PER_DAY }, (_, i) => `<i class="${i < used ? 'used' : ''}"></i>`).join('');

    const segs = WHEEL.map((s, i) => `<span class="wseg" data-seg="${i}" style="--a:${i * SEG + SEG / 2}deg"><span class="wseg-in">${segmentArt(l, s)}</span></span>`).join('');

    let actions = '';
    if (status === 'free') {
      actions = `<button class="bv-spin pressable" data-spin="free"><span class="bv-emoji ico">${ICONS.wheel}</span><span>${t(l, 'bonus.wheel.spin')}</span></button>`;
    } else {
      actions = `<p class="bv-done small">${CHECK}<span>${t(l, 'bonus.wheel.used')}</span></p>
              <p class="bv-renew"><span class="dv-clock"></span><span data-countdown></span></p>`;
      if (status === 'ads') actions += `<button class="ad-btn pressable" data-spin="ad"><span class="ad-ico ico">${ICONS.tv}</span><span class="ad-txt"><b>${t(l, 'bonus.watch')}</b><small data-sub></small></span></button>`;
      else actions += `<p class="bv-limit">${t(l, 'bonus.wheel.done')}</p>`;
    }

    this.root.innerHTML = `
      ${header(l, 'bonus', 'bonus.title', `<span class="chip lv-chip timer reveal" style="--i:0"><span class="dv-clock"></span><b data-clock></b></span>`)}
      <div class="lv-body bv-body">
        <div class="bv-grid bv-single">
          <section class="bv-panel bv-wheel reveal" style="--i:2" data-status="${status}">
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
              <p class="bv-sub">${t(l, 'bonus.wheel.sub', { n: AD_SPINS_PER_DAY })}</p>
              ${actions}
              <p class="bv-pips" aria-label="${t(l, 'bonus.wheel.left', { n: bonus.adSpinsLeft() })}"><span>${t(l, 'bonus.wheel.extraToday')}</span>${pips}</p>
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
    // On prépare une annonce seulement maintenant (jamais au lancement), et seulement si elle peut servir
    if (this.bonus.status() === 'ads' && this.ads.remaining('wheelSpin')) this.ads.prepare('wheelSpin');
  }

  /** État des boutons « Regarder une publicité » (prête, chargement, indisponible, limite). */
  updateAdButtons() {
    const l = this.lang;
    const label = (placement, readyText) => {
      const st = this.ads.status(placement);
      return { st, text: st === 'ready' || st === 'blocked' ? readyText : t(l, st === 'capped' ? 'ad.capped' : st === 'loading' ? 'ad.loading' : 'ad.unavailable') };
    };
    const spinBtn = this.root.querySelector('[data-spin="ad"]');
    if (spinBtn) {
      const left = Math.min(this.ads.remaining('wheelSpin'), this.bonus?.adSpinsLeft() ?? AD_SPINS_PER_DAY);
      const { st, text } = label('wheelSpin', `→ ${t(l, 'bonus.wheel.extra')} · ${t(l, 'bonus.wheel.left', { n: left })}`);
      spinBtn.dataset.state = st;
      spinBtn.disabled = this.busy || (st !== 'ready' && st !== 'loading');
      spinBtn.querySelector('[data-sub]').textContent = text;
    }
    for (const b of this.root.querySelectorAll('[data-spin="free"]')) b.disabled = this.busy;
  }

  tick() {
    const l = this.lang;
    const left = t(l, 'bonus.wheel.freeIn', { t: duration(l, secondsToMidnight()) });
    const clock = this.root.querySelector('[data-clock]');
    if (clock) clock.textContent = duration(l, secondsToMidnight());
    const cd = this.root.querySelector('[data-countdown]');
    if (cd) cd.textContent = left;
    // Minuit passé pendant que la page est ouverte : nouveau lancer gratuit, compteur remis à zéro
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
    const spin = e.target.closest('[data-spin]');
    if (spin && !spin.disabled) return this.spin(spin.dataset.spin === 'ad');
  }

  // ─── Roue de la chance ────────────────────────────────────────────────────

  async spin(withAd) {
    const now = new Bonus();
    if (withAd ? now.status() !== 'ads' : !now.freeSpinAvailable()) return this.render(true);
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
