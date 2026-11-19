// Gestionnaire centralisé des publicités récompensées (Google AdMob).
//
// Une seule porte d'entrée pour tout le jeu :
//   ads.prepare('doubleCoins')               charge une annonce à l'avance (quand le bouton apparaît)
//   await ads.showRewarded('doubleCoins')    affiche l'annonce → { status, reward }
//        status : 'rewarded'    annonce regardée jusqu'au bout : donner la récompense
//                 'dismissed'   fermée avant la fin : pas de récompense
//                 'unavailable' aucune annonce (pas de réseau, pas de stock) : proposer plus tard
//                 'capped'      limite du jour atteinte pour cet emplacement
//                 'blocked'     moment interdit (pendant un niveau, une animation importante…)
//                 'error'       erreur d'affichage
//   ads.status(placement)                    'ready' · 'loading' · 'unavailable' · 'capped' · 'blocked'
//   ads.onChange(fn)                         pour mettre à jour les boutons
//
// Règles (imposées ici, quel que soit l'appelant) : une annonce ne s'affiche QUE sur demande du
// joueur ; jamais pendant un niveau ni pendant une animation importante (`block()`), jamais au
// lancement, jamais automatiquement après une partie.
//
// Deux fournisseurs :
//   - AdMob (application Android, plugin Capacitor @capacitor-community/admob, qui utilise le SDK
//     officiel Google Mobile Ads) ;
//   - « annonce de test » simulée dans le navigateur (développement, version web) — clairement
//     signalée comme test. `?ads=fail` simule une erreur, `?ads=none` l'absence d'annonce.

import { ADS_CONFIG, resolveAdIds } from './ads-config.js';
import { dayKey, safeLocalStorage } from './stats.js';

const KEY = 'hoopbounce.ads';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// ─── Fournisseur AdMob (Android, via Capacitor) ─────────────────────────────

const RATING = { G: 'General', PG: 'ParentalGuidance', T: 'Teen', MA: 'MatureAudience' };

export class AdMobProvider {
  constructor(plugin = globalThis.Capacitor?.Plugins?.AdMob) {
    this.plugin = plugin;
    this.name = 'admob';
    this._rewarded = false;
    this._dismiss = null;
  }

  static available() {
    const C = globalThis.Capacitor;
    return !!(C?.isNativePlatform?.() && C.Plugins?.AdMob);
  }

  async init(ids, config) {
    const A = this.plugin;
    await A.initialize({
      initializeForTesting: ids.testing,
      testingDevices: config.testDeviceIds,
      tagForChildDirectedTreatment: config.childDirected,
      tagForUnderAgeOfConsent: config.underAgeOfConsent,
      maxAdContentRating: RATING[config.maxAdContentRating] ?? 'ParentalGuidance',
    });
    // Consentement (RGPD / UMP) : le formulaire officiel de Google, seulement s'il est requis
    try {
      const info = await A.requestConsentInfo();
      if (info?.isConsentFormAvailable && info.status === 'REQUIRED') await A.showConsentForm();
    } catch {
      /* pas de formulaire disponible : annonces non personnalisées gérées par Google */
    }
    A.addListener('onRewardedVideoAdReward', () => (this._rewarded = true));
    A.addListener('onRewardedVideoAdDismissed', () => this._dismiss?.('dismissed'));
    A.addListener('onRewardedVideoAdFailedToShow', () => this._dismiss?.('error'));
  }

  /** Charge une annonce récompensée ; rejette { noFill } s'il n'y en a pas. */
  async load(unit, testing) {
    try {
      await this.plugin.prepareRewardVideoAd({ adId: unit, isTesting: testing });
    } catch (e) {
      const code = e?.code ?? e?.message ?? '';
      throw { noFill: String(code).includes('3') || /no fill/i.test(String(code)), error: e };
    }
  }

  /** Affiche l'annonce ; résout { rewarded } une fois l'annonce fermée (récompense validée par le SDK). */
  show() {
    this._rewarded = false;
    return new Promise((resolve) => {
      let done = false;
      this._dismiss = (why) => {
        if (done) return;
        done = true;
        this._dismiss = null;
        resolve({ rewarded: this._rewarded, error: why === 'error' && !this._rewarded });
      };
      // La promesse du plugin se résout avec la récompense (quand le SDK la valide) ; la fin de
      // l'annonce arrive par l'événement « Dismissed ». On attend toujours la fermeture.
      this.plugin.showRewardVideoAd().then(
        (item) => {
          if (item && (item.amount !== undefined || item.type !== undefined)) this._rewarded = true;
        },
        () => this._dismiss?.('error'),
      );
    });
  }
}

// ─── Fournisseur de test (navigateur) ───────────────────────────────────────

export class WebTestProvider {
  constructor(mode = new URLSearchParams(globalThis.location?.search ?? '').get('ads')) {
    this.name = 'webtest';
    this.mode = mode; // null · 'fail' · 'none' · 'instant' (tests automatisés)
  }

  async init() {}

  async load() {
    await wait(this.mode === 'instant' ? 10 : 600);
    if (this.mode === 'fail') throw { noFill: false };
    if (this.mode === 'none') throw { noFill: true };
  }

  /** Annonce simulée : 5 s, fermer avant la fin = pas de récompense (comme une vraie annonce). */
  show() {
    const lang = (globalThis.document?.documentElement.lang || 'fr').slice(0, 2);
    const T = {
      fr: ['Annonce de test AdMob', 'Aucune vraie publicité · mode développement', 'Récompense dans {n} s', 'Récompense obtenue', 'Fermer'],
      en: ['AdMob test ad', 'No real advertising · development mode', 'Reward in {n} s', 'Reward earned', 'Close'],
      es: ['Anuncio de prueba AdMob', 'Sin publicidad real · modo desarrollo', 'Recompensa en {n} s', 'Recompensa obtenida', 'Cerrar'],
    }[lang] ?? [];
    const duration = this.mode === 'instant' ? 0.2 : 5;
    return new Promise((resolve) => {
      const el = document.createElement('div');
      el.className = 'adtest';
      el.setAttribute('role', 'dialog');
      el.innerHTML = `
        <div class="adtest-card">
          <span class="adtest-badge">TEST</span>
          <div class="adtest-art"><span></span><span></span><span></span></div>
          <h2>${T[0]}</h2>
          <p>${T[1]}</p>
          <div class="adtest-timer"><i></i><b></b></div>
        </div>
        <button class="adtest-close" aria-label="${T[4]}">✕</button>`;
      document.body.appendChild(el);
      const label = el.querySelector('.adtest-timer b');
      const bar = el.querySelector('.adtest-timer i');
      const t0 = performance.now();
      let rewarded = false;
      const tick = () => {
        const left = Math.max(0, duration - (performance.now() - t0) / 1000);
        bar.style.width = `${100 * (1 - left / duration)}%`;
        if (left <= 0) {
          rewarded = true;
          label.textContent = `✓ ${T[3]}`;
          el.classList.add('done');
          return;
        }
        label.textContent = T[2].replace('{n}', String(Math.ceil(left)));
        el._raf = requestAnimationFrame(tick);
      };
      tick();
      el.querySelector('.adtest-close').addEventListener('click', () => {
        cancelAnimationFrame(el._raf);
        el.remove();
        resolve({ rewarded });
      });
      if (this.mode === 'instant') setTimeout(() => el.querySelector('.adtest-close').click(), 300);
    });
  }
}

// ─── Gestionnaire ───────────────────────────────────────────────────────────

export class AdManager {
  constructor({ config = ADS_CONFIG, provider = null, storage = safeLocalStorage(), now = () => new Date() } = {}) {
    this.config = config;
    this.provider = provider ?? (AdMobProvider.available() ? new AdMobProvider() : new WebTestProvider());
    this.storage = storage;
    this.now = now;
    this.ids = resolveAdIds(config);
    this.blocks = new Set();
    this.loaded = null;     // identifiant du bloc dont une annonce est prête
    this.loading = null;    // promesse de chargement en cours
    this.failed = false;    // dernier chargement en échec (pas de réseau, pas d'annonce)
    this.retryDelay = config.retryDelay;
    this.showing = false;
    this._listeners = new Set();
    this._ready = null;
  }

  /** Initialise le SDK (consentement compris). Appelé au démarrage, sans rien afficher. */
  init() {
    this._ready ??= this.provider.init(this.ids, this.config).catch(() => {
      this.failed = true;
    });
    return this._ready;
  }

  onChange(fn) {
    this._listeners.add(fn);
    return () => this._listeners.delete(fn);
  }

  _emit() {
    for (const fn of this._listeners) fn(this);
  }

  /** Moments interdits : `block('playing')` pendant un niveau, `block('animation')`… */
  block(reason) {
    if (!this.blocks.has(reason)) {
      this.blocks.add(reason);
      this._emit();
    }
  }

  unblock(reason) {
    if (this.blocks.delete(reason)) this._emit();
  }

  /** Nombre d'annonces encore possibles aujourd'hui pour un emplacement. */
  remaining(placement) {
    const cap = this.config.placements[placement]?.dailyCap ?? 0;
    return Math.max(0, cap - (this._counts()[placement] ?? 0));
  }

  status(placement) {
    if (this.blocks.size) return 'blocked';
    if (!this.remaining(placement)) return 'capped';
    if (this.loaded === this.ids.unit(placement)) return 'ready';
    if (this.loading) return 'loading';
    return this.failed ? 'unavailable' : 'loading';
  }

  /** Charge une annonce pour cet emplacement (sans l'afficher). */
  prepare(placement) {
    const unit = this.ids.unit(placement);
    if (this.loaded === unit || this.loading || !this.remaining(placement)) return this.loading ?? Promise.resolve();
    this.loading = (async () => {
      await this.init();
      try {
        await this.provider.load(unit, this.ids.testing);
        this.loaded = unit;
        this.failed = false;
        this.retryDelay = this.config.retryDelay;
      } catch {
        this.loaded = null;
        this.failed = true;
        // Nouvel essai plus tard (délai qui double, plafonné)
        const d = this.retryDelay;
        this.retryDelay = Math.min(this.config.retryMax, d * 2);
        clearTimeout(this._retry);
        this._retry = setTimeout(() => this.prepare(placement), d * 1000);
      } finally {
        this.loading = null;
        this._emit();
      }
    })();
    this._emit();
    return this.loading;
  }

  /** Affiche une annonce récompensée à la demande du joueur. */
  async showRewarded(placement) {
    if (this.showing) return { status: 'blocked' };
    if (this.blocks.size) return { status: 'blocked' };
    if (!this.remaining(placement)) return { status: 'capped' };
    const unit = this.ids.unit(placement);
    if (this.loaded !== unit) {
      // Pas encore prête : on attend un peu (le joueur vient de toucher le bouton)
      await Promise.race([this.prepare(placement), wait(6000)]);
      if (this.loaded !== unit) return { status: 'unavailable' };
    }
    this.showing = true;
    this.loaded = null; // une annonce ne se montre qu'une fois
    this._emit();
    let res;
    try {
      res = await this.provider.show();
    } catch {
      res = { rewarded: false, error: true };
    }
    this.showing = false;
    if (res.rewarded) this._count(placement);
    this._emit();
    // L'annonce suivante se prépare en arrière-plan
    if (this.remaining(placement)) setTimeout(() => this.prepare(placement), 500);
    return { status: res.rewarded ? 'rewarded' : res.error ? 'error' : 'dismissed' };
  }

  /** Arrête les nouveaux essais de chargement programmés (fin de page, tests). */
  dispose() {
    clearTimeout(this._retry);
    this._listeners.clear();
  }

  // ─── Limites du jour (sauvegarde) ─────────────────────────────────────────

  _counts() {
    const today = dayKey(this.now());
    try {
      const raw = JSON.parse(this.storage?.getItem(KEY) ?? 'null');
      if (raw?.date === today && raw.counts && typeof raw.counts === 'object') return raw.counts;
    } catch {
      /* sauvegarde abîmée */
    }
    return {};
  }

  _count(placement) {
    const counts = { ...this._counts() };
    counts[placement] = (counts[placement] ?? 0) + 1;
    try {
      const raw = JSON.parse(this.storage?.getItem(KEY) ?? 'null') ?? {};
      this.storage?.setItem(KEY, JSON.stringify({ date: dayKey(this.now()), counts, total: (raw.total ?? 0) + 1 }));
    } catch {
      /* stockage indisponible */
    }
  }
}

/** Gestionnaire partagé par la page (un seul SDK initialisé). */
let shared = null;
export function getAds() {
  shared ??= new AdManager();
  return shared;
}
