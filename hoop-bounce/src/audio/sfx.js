// Effets sonores du jeu, synthétisés en temps réel (Web Audio) : aucun fichier à charger.
//
// Étape 18 (game feel) :
//  - chaque **surface** a sa voix (parquet de rue, métal, neige, glace, roche, herbe, bois,
//    plateforme spatiale, astéroïde, cercle, planche) ;
//  - **roulement** et **souffle** en continu : le son suit la vitesse du ballon et la surface ;
//  - **espace sonore** : réverbération propre à chaque monde (rue, montagne, caverne, sous-bois,
//    vide spatial) et **position stéréo** des sons selon leur place à l'écran ;
//  - rebond en couches (choc, cuir, « pop » qui monte d'une note par niveau de puissance, souffle,
//    sous-basse et carillon à la puissance maximale) ;
//  - panier : filet (« swish »), panier parfait avec un son spécial ; échec, étoiles, pièces ;
//  - les sons d'interface (boutons, achat, équipement) viennent de la voix partagée
//    (`ui-voice.js`) : la même identité dans le menu, la boutique et le jeu.

import { clamp } from '../core/math.js';
import { UiVoice, PENTA, makeImpulse } from './ui-voice.js';

/** Réverbération de chaque monde : durée (s), décroissance, douceur, part envoyée par défaut. */
const SPACES = {
  city: { len: 1.3, decay: 4, tone: 0.55, send: 0.16 },     // rue : réflexions courtes sur les façades
  snow: { len: 2.2, decay: 3, tone: 0.3, send: 0.14 },      // montagne : air froid, ouvert, feutré
  volcano: { len: 2.8, decay: 2.4, tone: 0.45, send: 0.24 },// caverne de roche : grande et sombre
  forest: { len: 1.5, decay: 3.4, tone: 0.32, send: 0.12 }, // sous-bois : doux, absorbé par les feuilles
  space: { len: 4.2, decay: 1.8, tone: 0.6, send: 0.3 },    // vide spatial : longue traîne irréelle
  arena: { len: 2.4, decay: 2.8, tone: 0.5, send: 0.22 },   // mode Trickshot : grande salle de sport
};

/**
 * Voix de surface d'un contact, selon le collisionneur touché et le monde.
 * Partagé avec les effets visuels (particules de roulement, matière soulevée).
 */
export function surfaceOf(tag, flavor = 'city') {
  switch (tag) {
    case 'rim':
    case 'backboard':
    case 'ice':
    case 'snow':
    case 'rock':
    case 'asteroid':
    case 'mushroom':
    case 'trampoline':
      return tag;
    case 'wood':
    case 'branch':
    case 'log':
    case 'crate':
      return 'wood';
    case 'pole':
      return 'metal';
    case 'crumble':
      return 'rock';
    case 'plank':
    case 'mover':
    case 'door':
    case 'blinker':
    case 'faller':
    case 'switch':
      return flavor === 'forest' ? 'wood' : flavor === 'volcano' ? 'rock' : flavor === 'space' ? 'tech' : 'metal';
    default:
      return { city: 'court', snow: 'snow', volcano: 'rock', forest: 'grass', space: 'tech' }[flavor] ?? 'court';
  }
}

/** Son de roulement par surface : filtre, fréquence (Hz), Q, volume, grain (irrégularité 0..1). */
const ROLL = {
  court: { type: 'lowpass', f: 420, q: 0.8, g: 0.09, grain: 0.15 },
  metal: { type: 'bandpass', f: 1300, q: 2.2, g: 0.05, grain: 0.35 },
  snow: { type: 'bandpass', f: 1700, q: 0.6, g: 0.07, grain: 0.75 },
  ice: { type: 'highpass', f: 3800, q: 0.7, g: 0.035, grain: 0.05 },
  rock: { type: 'bandpass', f: 650, q: 0.7, g: 0.09, grain: 0.6 },
  grass: { type: 'bandpass', f: 2900, q: 0.5, g: 0.045, grain: 0.7 },
  wood: { type: 'bandpass', f: 520, q: 1.1, g: 0.08, grain: 0.3 },
  tech: { type: 'bandpass', f: 900, q: 5, g: 0.05, grain: 0.05 },
  asteroid: { type: 'bandpass', f: 600, q: 0.9, g: 0.08, grain: 0.5 },
};

export class Sfx {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.enabled = true;
    this.volume = 0.8;
    this._noise = null;
    this._lastByTag = new Map();
    /** Monde en cours : colore le son du sol, choisit la réverbération. */
    this.flavor = 'city';
    // Position d'écoute (centre de l'écran) : place les sons à gauche ou à droite
    this.listenX = 0;
    this.listenHalf = 8;
    this._p = 0; // panoramique du son en cours de création
    this._s = 0.15; // part envoyée dans la réverbération
    this.ui = null;
  }

  /** À appeler lors d'un geste utilisateur (exigence des navigateurs mobiles). */
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      const c = new AC({ latencyHint: 'interactive' });
      this.ctx = c;
      this.master = c.createGain();
      this.master.gain.value = this.enabled ? this.volume : 0;
      // Compresseur léger : plusieurs sons simultanés ne saturent jamais
      const comp = c.createDynamicsCompressor();
      comp.threshold.value = -14;
      comp.ratio.value = 4;
      comp.attack.value = 0.003;
      comp.release.value = 0.18;
      this.master.connect(comp).connect(c.destination);
      this._noise = this._makeNoise();
      // Réverbération du monde (entrée commune, retour dans le bus principal)
      this.verbIn = c.createGain();
      this.verb = c.createConvolver();
      this.verbIn.connect(this.verb).connect(this.master);
      this.setSpace(this.flavor, true);
      this.ui = new UiVoice(c, this.master, this._noise);
      this._makeMotion();
    }
    if (this.ctx.state !== 'running') this.ctx.resume().catch(() => {}); // « suspended », ou « interrupted » sur iOS (appel, Siri)
  }

  suspend() {
    this.motion(0, 0);
    this.ctx?.suspend();
  }

  /** Volume réglé dans les paramètres du menu (0..1). */
  setVolume(v) {
    this.volume = 0.8 * v * v;
    if (this.master) this.master.gain.value = this.enabled ? this.volume : 0;
  }

  setEnabled(on) {
    this.enabled = on;
    if (this.master) this.master.gain.value = on ? this.volume : 0;
  }

  get ready() {
    return this.enabled && this.ctx && this.ctx.state === 'running' && this.volume > 0;
  }

  /** Change l'espace sonore (réverbération) selon le monde. */
  setSpace(flavor, force = false) {
    if (!force && flavor === this._space) return;
    this.flavor = flavor;
    if (!this.ctx) return;
    this._space = flavor;
    const s = SPACES[flavor] ?? SPACES.city;
    this.verb.buffer = makeImpulse(this.ctx, s.len, s.decay, { tone: s.tone });
    this._s = s.send;
  }

  /** Centre de l'écran (u) et demi-largeur visible : sert au placement stéréo. */
  listen(x, halfWidth) {
    this.listenX = x;
    this.listenHalf = Math.max(2, halfWidth);
  }

  /** Panoramique (−1..1) d'un son placé en x. Doux : jamais complètement d'un seul côté. */
  panAt(x) {
    return clamp((x - this.listenX) / (this.listenHalf * 1.4), -1, 1) * 0.6;
  }

  /** Crée les sons suivants à la position x (stéréo) avec une part de réverbération. */
  _at(x, send = SPACES[this.flavor]?.send ?? 0.15) {
    this._p = x === null ? 0 : this.panAt(x);
    this._s = send;
  }

  _makeNoise() {
    const len = this.ctx.sampleRate * 2;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  /** Limite la fréquence d'un même son (roulements, micro-contacts). */
  _throttle(tag, minInterval) {
    const now = this.ctx.currentTime;
    const last = this._lastByTag.get(tag) ?? -1;
    if (now - last < minInterval) return false;
    this._lastByTag.set(tag, now);
    return true;
  }

  /** Branche un son : panoramique, sortie principale et envoi vers la réverbération. */
  _route(node) {
    const c = this.ctx;
    let out = node;
    if (this._p && c.createStereoPanner) {
      const p = c.createStereoPanner();
      p.pan.value = this._p;
      node.connect(p);
      out = p;
    }
    out.connect(this.master);
    if (this._s > 0.01) {
      const s = c.createGain();
      s.gain.value = this._s;
      out.connect(s).connect(this.verbIn);
    }
  }

  _tone(freq, endFreq, duration, gain, type = 'sine', delay = 0) {
    const c = this.ctx;
    const t = c.currentTime + delay;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (endFreq !== freq) osc.frequency.exponentialRampToValueAtTime(endFreq, t + duration);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    osc.connect(g);
    this._route(g);
    osc.start(t);
    osc.stop(t + duration + 0.02);
  }

  _noiseBurst(duration, gain, filterType, freq, q = 1, endFreq = freq, delay = 0) {
    const c = this.ctx;
    const t = c.currentTime + delay;
    const src = c.createBufferSource();
    src.buffer = this._noise;
    src.playbackRate.value = 0.9 + Math.random() * 0.2;
    const f = c.createBiquadFilter();
    f.type = filterType;
    f.frequency.setValueAtTime(freq, t);
    if (endFreq !== freq) f.frequency.exponentialRampToValueAtTime(endFreq, t + duration);
    f.Q.value = q;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    src.connect(f).connect(g);
    this._route(g);
    src.start(t, Math.random() * 1.5);
    src.stop(t + duration + 0.02);
  }

  /** Souffle qui enfle puis retombe (contrairement à _noiseBurst, attaque lente). */
  _swell(duration, gain, filterType, f0, f1, q = 1, delay = 0) {
    const c = this.ctx;
    const t = c.currentTime + delay;
    const src = c.createBufferSource();
    src.buffer = this._noise;
    const f = c.createBiquadFilter();
    f.type = filterType;
    f.Q.value = q;
    f.frequency.setValueAtTime(f0, t);
    f.frequency.exponentialRampToValueAtTime(f1, t + duration);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + duration * 0.55);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    src.connect(f).connect(g);
    this._route(g);
    src.start(t, Math.random() * 1.5);
    src.stop(t + duration + 0.02);
  }

  // ─── Roulement et souffle (sons continus) ──────────────────────────────────

  _makeMotion() {
    const c = this.ctx;
    const loop = (type, f, q) => {
      const src = c.createBufferSource();
      src.buffer = this._noise;
      src.loop = true;
      const filt = c.createBiquadFilter();
      filt.type = type;
      filt.frequency.value = f;
      filt.Q.value = q;
      const g = c.createGain();
      g.gain.value = 0;
      src.connect(filt).connect(g).connect(this.master);
      src.start();
      return { filt, g };
    };
    this._roll = loop('lowpass', 400, 0.8);
    this._rollSurface = 'court';
    this._air = loop('bandpass', 900, 0.9);
  }

  /**
   * À chaque image : roulement (au sol) et souffle (vitesse en l'air).
   * @param {number} rollSpeed  vitesse de roulement (u/s), 0 en l'air
   * @param {number} airSpeed   vitesse en l'air (u/s), 0 au sol
   * @param {string} [surface]  voix de surface (surfaceOf)
   */
  motion(rollSpeed, airSpeed, surface = this._rollSurface) {
    if (!this._roll || !this.ctx) return;
    const c = this.ctx;
    const now = c.currentTime;
    const on = this.ready;
    // Roulement
    const R = ROLL[surface] ?? ROLL.court;
    if (surface !== this._rollSurface) {
      this._rollSurface = surface;
      this._roll.filt.type = R.type;
      this._roll.filt.Q.setValueAtTime(R.q, now);
    }
    const k = on ? clamp((rollSpeed - 0.6) / 7, 0, 1) : 0;
    const grain = 1 - R.grain * Math.random();
    this._roll.g.gain.setTargetAtTime(R.g * Math.pow(k, 1.2) * grain, now, 0.05);
    this._roll.filt.frequency.setTargetAtTime(R.f * (0.75 + 0.5 * k), now, 0.08);
    // Souffle de l'air quand le ballon file (gros rebonds, chutes)
    const a = on ? clamp((airSpeed - 8) / 14, 0, 1) : 0;
    this._air.g.gain.setTargetAtTime(0.11 * a * a, now, 0.08);
    this._air.filt.frequency.setTargetAtTime(700 + a * 1900, now, 0.1);
  }

  // ─── Contacts ──────────────────────────────────────────────────────────────

  /**
   * Choc contre une surface. `x` place le son en stéréo ; la voix dépend de la surface et du monde.
   * Au-delà d'une certaine vitesse, une couche grave (« poids ») s'ajoute.
   */
  impact(speed, tag, x = null) {
    if (!this.ready) return;
    const v = clamp(speed / 20, 0, 1);
    if (v < 0.04) return;
    const vol = Math.pow(v, 1.1);
    const vary = 0.94 + Math.random() * 0.12;
    const surface = surfaceOf(tag, this.flavor);
    this._at(x);
    switch (surface) {
      case 'rim':
        if (!this._throttle('rim', 0.05)) return;
        // Métal : partiels inharmoniques qui résonnent longtemps
        this._s = 0.35;
        this._tone(612 * vary, 600 * vary, 0.7, 0.22 * vol, 'sine');
        this._tone(1490 * vary, 1470 * vary, 0.45, 0.12 * vol, 'sine');
        this._tone(2410 * vary, 2390 * vary, 0.28, 0.07 * vol, 'sine');
        this._tone(3570 * vary, 3550 * vary, 0.15, 0.03 * vol, 'sine');
        this._noiseBurst(0.04, 0.25 * vol, 'highpass', 3000);
        break;
      case 'backboard':
        if (!this._throttle('board', 0.05)) return;
        // Plexiglas : claque sèche + vibration du support
        this._tone(170 * vary, 90, 0.12, 0.55 * vol, 'sine');
        this._tone(410 * vary, 395 * vary, 0.2, 0.06 * vol, 'triangle');
        this._noiseBurst(0.09, 0.35 * vol, 'bandpass', 900, 1.2);
        this._noiseBurst(0.03, 0.2 * vol, 'highpass', 4000);
        break;
      case 'ice':
        if (!this._throttle('ground', 0.045)) return;
        // Glace : dur et clair, avec un tintement cristallin
        this._tone(180 * vary, 80, 0.14, 0.65 * vol, 'sine');
        this._tone(2200 * vary, 2100 * vary, 0.16, 0.05 * vol, 'sine');
        this._tone(3300 * vary, 3250 * vary, 0.1, 0.025 * vol, 'sine', 0.01);
        this._noiseBurst(0.03, 0.35 * vol, 'highpass', 4200);
        break;
      case 'snow':
        if (!this._throttle('ground', 0.045)) return;
        // Neige : choc feutré et crissement granuleux
        this._tone(120 * vary, 60, 0.12, 0.55 * vol, 'sine');
        this._noiseBurst(0.07, 0.3 * vol, 'lowpass', 900, 0.7);
        for (let i = 0; i < 3; i++) this._noiseBurst(0.02, 0.12 * vol, 'bandpass', 1500 + i * 500, 0.8, 1500 + i * 500, i * 0.018);
        break;
      case 'wood':
        if (!this._throttle('wood', 0.05)) return;
        // Bois : « toc » creux
        this._tone(140 * vary, 70, 0.14, 0.7 * vol, 'sine');
        this._tone(420 * vary, 300, 0.06, 0.2 * vol, 'triangle');
        this._noiseBurst(0.05, 0.3 * vol, 'bandpass', 1100, 1.5);
        break;
      case 'mushroom':
      case 'trampoline':
        break; // sons dédiés
      case 'asteroid':
        if (!this._throttle('rock', 0.05)) return;
        this._s = 0.4;
        this._tone(160 * vary, 70, 0.3, 0.6 * vol, 'sine');
        this._tone(900 * vary, 860 * vary, 0.5, 0.05 * vol, 'sine');
        this._noiseBurst(0.05, 0.25 * vol, 'bandpass', 1600, 1);
        break;
      case 'metal':
        if (!this._throttle('ground', 0.045)) return;
        // Tôle et grilles de la ville : choc + petit « clang » qui vibre
        this._tone(150 * vary, 62, 0.14, 0.7 * vol, 'sine');
        this._tone(380 * vary, 372 * vary, 0.22, 0.07 * vol, 'triangle');
        this._tone(915 * vary, 900 * vary, 0.16, 0.04 * vol, 'sine');
        this._tone(1660 * vary, 1640 * vary, 0.1, 0.025 * vol, 'sine');
        this._noiseBurst(0.04, 0.3 * vol, 'highpass', 2500);
        break;
      case 'rock':
        if (!this._throttle('ground', 0.045)) return;
        // Roche volcanique : choc sourd et graviers qui crissent
        this._tone(130 * vary, 52, 0.18, 0.8 * vol, 'sine');
        this._noiseBurst(0.09, 0.32 * vol, 'lowpass', 1100, 0.8, 400);
        for (let i = 0; i < 3; i++) this._noiseBurst(0.015, 0.1 * vol, 'bandpass', 2400 + i * 700, 2, 2400 + i * 700, 0.02 + i * 0.03 * Math.random());
        break;
      case 'grass':
        if (!this._throttle('ground', 0.045)) return;
        // Terre et herbe : choc doux + froissement des brins
        this._tone(125 * vary, 55, 0.15, 0.7 * vol, 'sine');
        this._noiseBurst(0.06, 0.18 * vol, 'lowpass', 700, 0.7);
        this._noiseBurst(0.08, 0.1 * vol, 'bandpass', 3200, 0.6, 2200, 0.01);
        break;
      case 'tech':
        if (!this._throttle('ground', 0.045)) return;
        // Plateforme spatiale : choc + résonance synthétique et écho
        this._s = 0.4;
        this._tone(150 * vary, 62, 0.16, 0.7 * vol, 'sine');
        this._tone(330 * vary, 660 * vary, 0.18, 0.05 * vol, 'triangle');
        this._noiseBurst(0.1, 0.12 * vol, 'bandpass', 1800, 6, 900);
        this._tone(150 * vary, 62, 0.2, 0.2 * vol, 'sine', 0.13);
        break;
      default: {
        if (!this._throttle('ground', 0.045)) return;
        // Ballon de basket sur le bitume du terrain : « bong » grave, claquement du cuir, résonance du ballon
        this._tone(150 * vary, 62, 0.16, 0.8 * vol, 'sine');
        this._tone(310 * vary, 180, 0.05, 0.18 * vol, 'triangle');
        this._tone(520 * vary, 505 * vary, 0.12, 0.035 * vol, 'sine');
        this._noiseBurst(0.035, 0.4 * vol, 'bandpass', 2200, 0.8);
      }
    }
    // Gros choc : couche de poids (sous-basse) pour sentir la masse du ballon
    if (v > 0.55 && surface !== 'rim' && surface !== 'mushroom' && surface !== 'trampoline') {
      this._tone(78, 38, 0.26, 0.4 * (v - 0.45), 'sine');
      this._noiseBurst(0.12, 0.14 * (v - 0.45), 'lowpass', 400, 0.7, 120);
    }
    this._at(null);
  }

  // ─── Mécaniques des mondes ────────────────────────────────────────────────

  icicleShake(x = null) {
    if (!this.ready) return;
    this._at(x);
    for (let i = 0; i < 4; i++) this._tone(2600 + i * 310, 2500 + i * 300, 0.08, 0.03, 'sine', i * 0.07);
    this._at(null);
  }

  icicleShatter(x = null) {
    if (!this.ready) return;
    this._at(x, 0.3);
    this._noiseBurst(0.35, 0.3, 'highpass', 3500, 1, 6000);
    [3100, 3900, 4700, 5600].forEach((f, i) => this._tone(f, f * 0.97, 0.25, 0.04, 'sine', i * 0.025));
    this._at(null);
  }

  crumbleShake(x = null) {
    if (!this.ready) return;
    this._at(x);
    this._noiseBurst(0.4, 0.18, 'lowpass', 400, 1, 250);
    this._at(null);
  }

  crumble(x = null) {
    if (!this.ready) return;
    this._at(x, 0.3);
    this._noiseBurst(0.5, 0.4, 'lowpass', 900, 0.8, 200);
    this._tone(90, 45, 0.4, 0.3, 'sine');
    this._at(null);
  }

  geyser(volume = 1, x = null) {
    if (!this.ready || volume <= 0.02) return;
    this._at(x, 0.3);
    this._noiseBurst(1.0, 0.35 * volume, 'bandpass', 500, 0.6, 1800);
    this._tone(70, 110, 0.8, 0.18 * volume, 'sawtooth');
    this._at(null);
  }

  rockImpact(volume = 1, x = null) {
    if (!this.ready || volume <= 0.02) return;
    this._at(x, 0.3);
    this._tone(110, 40, 0.35, 0.6 * volume, 'sine');
    this._noiseBurst(0.3, 0.4 * volume, 'lowpass', 1200, 0.8, 300);
    this._at(null);
  }

  vineGrab() {
    if (!this.ready) return;
    this._noiseBurst(0.15, 0.18, 'bandpass', 1400, 1.2, 800);
    this._tone(180, 140, 0.18, 0.12, 'triangle');
  }

  vineRelease() {
    if (!this.ready) return;
    this._noiseBurst(0.2, 0.14, 'bandpass', 900, 1.5, 2800);
  }

  mushroom() {
    if (!this.ready) return;
    // « Boing » qui ondule
    const c = this.ctx;
    const t = c.currentTime;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(140, t);
    o.frequency.exponentialRampToValueAtTime(520, t + 0.28);
    const lfo = c.createOscillator();
    const lg = c.createGain();
    lfo.frequency.value = 22;
    lg.gain.value = 40;
    lfo.connect(lg).connect(o.frequency);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.35, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
    o.connect(g);
    this._route(g);
    o.start(t);
    lfo.start(t);
    o.stop(t + 0.42);
    lfo.stop(t + 0.42);
    this._noiseBurst(0.1, 0.1, 'lowpass', 600, 0.7);
  }

  gravityFlip(up) {
    if (!this.ready) return;
    this._tone(up ? 220 : 880, up ? 880 : 220, 0.35, 0.12, 'sine');
    this._tone(up ? 330 : 1320, up ? 1320 : 330, 0.35, 0.05, 'triangle', 0.04);
    this._swell(0.4, 0.05, 'bandpass', up ? 500 : 3000, up ? 3000 : 500, 2);
  }

  crateHit() {
    if (!this.ready || !this._throttle('crate', 0.12)) return;
    this._tone(95, 60, 0.18, 0.4, 'sine');
    this._noiseBurst(0.12, 0.2, 'lowpass', 700);
  }

  /**
   * Rebond du joueur, en couches :
   *  - choc grave (le ballon frappe le sol) et claquement du cuir ;
   *  - « pop » élastique qui monte d'une note de la gamme à chaque niveau de puissance ;
   *  - souffle qui monte à partir de la puissance 3 ;
   *  - puissance 4-5 : coup de sous-basse ; puissance 5 : carillon et grand souffle.
   */
  bounce(level, x = null) {
    if (!this.ready) return;
    this._at(x, (SPACES[this.flavor]?.send ?? 0.15) * (0.6 + level * 0.15));
    const note = PENTA[[5, 6, 7, 8, 10][Math.min(4, level - 1)]];
    this._tone(115 + level * 6, 55, 0.15, 0.5, 'sine');
    this._noiseBurst(0.04, 0.2, 'bandpass', 1900, 1);
    this._tone(note * 0.62, note, 0.05, 0.16, 'sine');
    this._tone(note, note * 1.01, 0.1 + level * 0.02, 0.1, 'sine', 0.045);
    this._tone(note * 2, note * 2, 0.06, 0.02, 'triangle', 0.045);
    if (level >= 3) this._swell(0.2 + level * 0.05, 0.03 + level * 0.012, 'bandpass', 600, 2400 + level * 300, 1.1);
    if (level >= 4) this._tone(80, 38, 0.3, 0.32, 'sine');
    if (level >= 5) {
      this._tone(PENTA[12], PENTA[12], 0.4, 0.045, 'triangle', 0.05);
      this._tone(PENTA[14], PENTA[14], 0.5, 0.03, 'sine', 0.1);
      this._noiseBurst(0.3, 0.07, 'highpass', 5000, 1, 9000, 0.04);
      this._tone(55, 30, 0.5, 0.25, 'sine', 0.02);
    }
    this._at(null);
  }

  /** Mode Trickshot : l'élastique claque et le ballon part (plus aigu et plus ample avec la puissance). */
  launch(power = 0.5, x = null) {
    if (!this.ready) return;
    this._at(x, 0.2);
    const p = Math.max(0, Math.min(1, power));
    this._tone(180 + p * 260, 90, 0.12, 0.35, 'triangle');
    this._noiseBurst(0.05, 0.25, 'bandpass', 2200, 1.2);
    this._swell(0.22 + p * 0.2, 0.05 + p * 0.07, 'bandpass', 500, 2600 + p * 2000, 1);
    this._tone(PENTA[5 + Math.round(p * 5)], PENTA[5 + Math.round(p * 5)] * 1.02, 0.12, 0.06, 'sine', 0.02);
    this._at(null);
  }

  /** Mode Trickshot : la foule de l'arène s'enthousiasme (clameur + applaudissements). */
  crowd() {
    if (!this.ready) return;
    this._s = 0.45;
    this._swell(1.6, 0.09, 'bandpass', 500, 900, 0.8);
    this._swell(1.2, 0.05, 'bandpass', 900, 1600, 1.2, 0.1);
    for (let i = 0; i < 46; i++) this._noiseBurst(0.03, 0.05 + Math.random() * 0.05, 'bandpass', 1400 + Math.random() * 1600, 1.4, 1400 + Math.random() * 1600, 0.15 + Math.random() * 1.5);
    this._at(null);
  }

  /** Mode Trickshot (laboratoire) : décharge électrique d'un bumper. */
  labZap(x = null) {
    if (!this.ready || !this._throttle('labZap', 0.06)) return;
    this._at(x, 0.25);
    this._tone(1900, 320, 0.09, 0.12, 'sawtooth');
    this._tone(2600, 900, 0.06, 0.05, 'square', 0.01);
    this._noiseBurst(0.07, 0.12, 'highpass', 4500, 0.9);
    this._at(null);
  }

  /** Mode Trickshot : pleine puissance atteinte pendant la visée (petite charge électrique qui monte). */
  labCharge() {
    if (!this.ready || !this._throttle('labCharge', 0.3)) return;
    this._tone(PENTA[8], PENTA[13], 0.14, 0.05, 'triangle');
    this._tone(PENTA[13], PENTA[13], 0.12, 0.03, 'sine', 0.12);
  }

  /** Mode Trickshot : le ballon arrive vers le panier sur un beau tir (aspiration qui monte, suspense). */
  labTrick(level = 1) {
    if (!this.ready) return;
    this._s = 0.35;
    this._swell(0.55, 0.05 + 0.04 * level, 'bandpass', 300, 3800, 1.1);
    this._tone(PENTA[3], PENTA[10], 0.5, 0.035 * level, 'sine', 0.02);
    this._at(null);
  }

  /** Mode Trickshot : panier dans le laboratoire (accord de synthé, sous-basse, filet). spectacular : plus ample. */
  labGoal(spectacular = false) {
    if (!this.ready) return;
    this._s = spectacular ? 0.5 : 0.35;
    this.net(spectacular ? 1.3 : 1);
    this._tone(110, 40, 0.5, 0.45, 'sine', 0.01);
    const arp = spectacular ? [5, 8, 10, 12, 13, 14] : [5, 8, 10, 12];
    arp.forEach((n, i) => this._tone(PENTA[n], PENTA[n] * 1.002, 0.35, 0.07, 'sawtooth', 0.04 + i * 0.06));
    this._tone(PENTA[12], PENTA[12], 1.2, 0.05, 'triangle', 0.3);
    if (spectacular) {
      this._swell(0.9, 0.08, 'bandpass', 600, 6000, 0.8, 0.05);
      for (let i = 0; i < 8; i++) this._tone(PENTA[10 + (i % 5)] * 2, PENTA[10 + (i % 5)] * 2, 0.25, 0.02, 'sine', 0.45 + i * 0.06);
    }
    this._at(null);
  }

  /** Dribble en l'air : le ballon est renvoyé vers le sol (souffle descendant bref). */
  slam(x = null) {
    if (!this.ready || !this._throttle('slam', 0.05)) return;
    this._at(x);
    this._noiseBurst(0.12, 0.16, 'bandpass', 2600, 1.4, 700);
    this._tone(320, 150, 0.09, 0.12, 'sine');
    this._at(null);
  }

  /** La puissance redescend d'un cran. */
  powerDown() {
    if (!this.ready) return;
    this._tone(620, 520, 0.07, 0.03, 'sine');
  }

  trampoline() {
    if (!this.ready) return;
    this._tone(160, 640, 0.24, 0.35, 'triangle');
    this._tone(90, 60, 0.15, 0.4, 'sine');
    this._noiseBurst(0.16, 0.12, 'bandpass', 700, 1.5, 2600);
    this._swell(0.35, 0.05, 'bandpass', 600, 3000, 1);
  }

  teleport() {
    if (!this.ready) return;
    this._s = 0.4;
    this._tone(300, 1500, 0.22, 0.12, 'sine');
    this._tone(1500, 600, 0.3, 0.08, 'triangle', 0.18);
    this._noiseBurst(0.35, 0.1, 'bandpass', 2000, 4, 5000);
    this._at(null);
  }

  switchOn() {
    if (!this.ready) return;
    this._tone(900, 900, 0.05, 0.12, 'square');
    this._tone(1350, 1350, 0.12, 0.08, 'triangle', 0.06);
  }

  door() {
    if (!this.ready) return;
    this._noiseBurst(0.8, 0.14, 'lowpass', 300, 1, 900, 0.15);
    this._tone(70, 95, 0.7, 0.2, 'sawtooth', 0.15);
  }

  /** Souffle continu du ventilateur (ou du vent de neige, plus grave), tant que la balle est dedans. */
  wind(on, howl = false) {
    if (!this.ctx) return;
    if (on && !this._wind && this.ready) {
      const src = this.ctx.createBufferSource();
      src.buffer = this._noise;
      src.loop = true;
      const f = this.ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = howl ? 480 : 900;
      f.Q.value = howl ? 1.6 : 0.7;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.0001, this.ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.12, this.ctx.currentTime + 0.25);
      src.connect(f).connect(g).connect(this.master);
      src.start();
      this._wind = { src, g };
    } else if (!on && this._wind) {
      const { src, g } = this._wind;
      g.gain.cancelScheduledValues(this.ctx.currentTime);
      g.gain.setValueAtTime(Math.max(0.0001, g.gain.value), this.ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.3);
      src.stop(this.ctx.currentTime + 0.32);
      this._wind = null;
    }
  }

  /** Étoile ramassée : note qui monte avec le nombre d'étoiles, scintillement, réverbération. */
  star(count, x = null) {
    if (!this.ready) return;
    this._at(x, 0.35);
    const base = PENTA[[8, 10, 12][Math.min(2, Math.max(1, count) - 1)]];
    this._tone(base, base, 0.2, 0.12, 'triangle');
    this._tone(base * 1.5, base * 1.5, 0.35, 0.1, 'triangle', 0.07);
    this._tone(base * 2, base * 2, 0.5, 0.05, 'sine', 0.12);
    this._noiseBurst(0.25, 0.05, 'highpass', 6000, 1, 9000, 0.05);
    if (count >= 3) [0, 1, 2].forEach((i) => this._tone(PENTA[12 + i], PENTA[12 + i], 0.3, 0.03, 'sine', 0.2 + i * 0.06));
    this._at(null);
  }

  checkpoint() {
    if (!this.ready) return;
    this._s = 0.3;
    this._tone(PENTA[5], PENTA[5], 0.15, 0.09, 'triangle');
    this._tone(PENTA[8], PENTA[8], 0.3, 0.09, 'triangle', 0.09);
    this._tone(PENTA[10], PENTA[10], 0.4, 0.04, 'sine', 0.16);
    this._at(null);
  }

  /** Le ballon apparaît (début de niveau, réapparition) : « bloop » qui monte et éclat léger. */
  spawn() {
    if (!this.ready) return;
    this._s = 0.25;
    this._tone(PENTA[5] * 0.5, PENTA[8], 0.16, 0.12, 'sine');
    this._tone(PENTA[10], PENTA[10], 0.2, 0.03, 'triangle', 0.08);
    this._noiseBurst(0.12, 0.04, 'highpass', 5000, 1, 8000, 0.05);
    this._at(null);
  }

  death(cause) {
    if (!this.ready) return;
    this._s = 0.25;
    if (cause === 'lava' || cause === 'fire') {
      // Grésillement
      this._noiseBurst(0.6, 0.45, 'highpass', 2500, 0.7, 6000);
      this._tone(260, 60, 0.4, 0.3, 'sawtooth');
    } else if (cause === 'laser') {
      this._tone(1400, 200, 0.3, 0.15, 'sawtooth');
      this._noiseBurst(0.25, 0.3, 'highpass', 3000);
    } else if (cause === 'void') {
      this._tone(600, 40, 0.8, 0.25, 'sine');
      this._noiseBurst(0.7, 0.25, 'lowpass', 1200, 0.8, 80);
    } else if (cause === 'crusher') {
      this._tone(110, 40, 0.3, 0.5, 'square');
      this._noiseBurst(0.3, 0.55, 'lowpass', 1500, 0.8, 200);
    } else if (cause === 'water') {
      this._noiseBurst(0.45, 0.45, 'lowpass', 2400, 0.8, 400);
      this._tone(400, 120, 0.25, 0.2, 'sine');
    } else {
      this._noiseBurst(0.3, 0.5, 'lowpass', 1800, 0.8, 300);
      this._tone(320, 70, 0.35, 0.4, 'sawtooth');
    }
    // Éclatement du ballon : « pop » sec commun à toutes les chutes
    this._noiseBurst(0.05, 0.3, 'bandpass', 1500, 0.7);
    this._at(null);
  }

  /** Le filet : « swish » de mailles (bruit qui glisse de l'aigu vers le médium). */
  net(strength = 1) {
    if (!this.ready) return;
    this._noiseBurst(0.32, 0.26 * strength, 'bandpass', 6500, 1.1, 2200);
    this._noiseBurst(0.18, 0.12 * strength, 'highpass', 7000, 0.8, 4000, 0.05);
    this._swell(0.25, 0.06 * strength, 'bandpass', 1200, 500, 1.5, 0.04);
  }

  /**
   * Panier. `perfect` (swish, sans toucher le cercle) : son spécial — souffle qui aspire,
   * coup de sous-basse, accord brillant et pluie de cloches.
   */
  win(perfect) {
    if (!this.ready) return;
    this._s = 0.3;
    this.net(perfect ? 1.2 : 1);
    this._tone(98, 45, 0.4, 0.4, 'sine', 0.02);
    const notes = [5, 7, 8, 10];
    notes.forEach((n, i) => this._tone(PENTA[n], PENTA[n], 0.4, 0.1, 'triangle', 0.08 + i * 0.08));
    this._tone(PENTA[12], PENTA[12], 0.8, 0.05, 'sine', 0.42);
    if (perfect) {
      this._s = 0.5;
      this._swell(0.5, 0.09, 'bandpass', 400, 5000, 0.9);
      this._tone(55, 28, 0.9, 0.35, 'sine', 0.05);
      for (const n of [10, 12, 13, 14]) this._tone(PENTA[n], PENTA[n] * 1.003, 1.4, 0.035, 'sawtooth', 0.45);
      for (let i = 0; i < 10; i++) this._tone(PENTA[8 + (i % 7)] * 2, PENTA[8 + (i % 7)] * 2, 0.3, 0.025, 'sine', 0.5 + i * 0.07);
    }
    this._at(null);
  }

  /** Niveau échoué : trois notes qui descendent doucement (jamais punitif). */
  fail() {
    if (!this.ready) return;
    this._s = 0.4;
    [[392, 0], [329.63, 0.16], [261.63, 0.32]].forEach(([f, d]) => this._tone(f, f * 0.985, 0.45, 0.08, 'triangle', d));
    this._tone(130.81, 110, 0.7, 0.14, 'sine', 0.32);
    this._at(null);
  }

  // ─── Pièges de l'étape 9 ──────────────────────────────────────────────────

  cannon(volume = 1, x = null) {
    if (!this.ready || volume <= 0.03) return;
    this._at(x, 0.25);
    this._tone(120, 45, 0.25, 0.45 * volume, 'sine');
    this._noiseBurst(0.22, 0.35 * volume, 'lowpass', 1400, 0.8, 200);
    this._at(null);
  }

  laserOn(volume = 1, x = null) {
    if (!this.ready || volume <= 0.03) return;
    this._at(x);
    this._tone(1800, 600, 0.18, 0.06 * volume, 'sawtooth');
    this._tone(220, 220, 0.5, 0.05 * volume, 'square');
    this._at(null);
  }

  /** Pilon qui s'écrase : choc sourd et métallique. */
  crusherSlam(volume = 1, x = null) {
    if (!this.ready || volume <= 0.03) return;
    this._at(x, 0.25);
    this._tone(90, 40, 0.3, 0.5 * volume, 'sine');
    this._noiseBurst(0.18, 0.4 * volume, 'lowpass', 900, 0.8, 150);
    this._tone(this.flavor === 'city' || this.flavor === 'space' ? 520 : 220, 180, 0.12, 0.06 * volume, 'square');
    this._at(null);
  }

  /** Rocher (ou boule de neige) qui part : grondement qui roule. */
  boulderStart(volume = 1, x = null) {
    if (!this.ready || volume <= 0.03) return;
    this._at(x);
    this._noiseBurst(0.9, 0.22 * volume, 'lowpass', 300, 1, 120);
    this._tone(70, 55, 0.8, 0.12 * volume, 'triangle');
    this._at(null);
  }

  fallerShake() {
    if (!this.ready) return;
    this._noiseBurst(0.3, 0.14, 'bandpass', 900, 2, 500);
    this._tone(300, 260, 0.2, 0.05, 'square');
  }

  fallerFall() {
    if (!this.ready) return;
    this._tone(400, 90, 0.5, 0.12, 'triangle');
  }

  /** Piège surprise — avertissement : double bip d'alarme (on l'entend avant de le voir bouger). */
  trapWarn(volume = 1, x = null) {
    if (!this.ready || volume <= 0.03) return;
    this._at(x);
    this._tone(980, 980, 0.07, 0.05 * volume, 'square');
    this._tone(980, 980, 0.07, 0.05 * volume, 'square', 0.13);
    this._noiseBurst(0.25, 0.06 * volume, 'bandpass', 700, 2, 300);
    this._at(null);
  }

  /** Piège surprise — le bloc glisse et claque en place. */
  trapMove(volume = 1, x = null) {
    if (!this.ready || volume <= 0.03) return;
    this._at(x, 0.2);
    this._noiseBurst(0.22, 0.16 * volume, 'lowpass', 1200, 0.8, 200);
    this._tone(140, 70, 0.22, 0.22 * volume, 'triangle', 0.12);
    this._at(null);
  }

  /** Coup de vent soudain : sifflement qui monte (avertissement), puis souffle. */
  gust(warn = false) {
    if (!this.ready) return;
    if (warn) {
      this._tone(500, 1400, 0.6, 0.035, 'sine');
      this._noiseBurst(0.6, 0.06, 'bandpass', 1600, 3, 2600);
    } else {
      this._noiseBurst(1.1, 0.2, 'bandpass', 900, 1.2, 500);
    }
  }

  /** Ressort surpuissant : « boïng » plus grave et plus long que le trampoline. */
  springBoost() {
    if (!this.ready) return;
    this._tone(120, 620, 0.35, 0.14, 'triangle');
    this._tone(240, 1240, 0.3, 0.05, 'sine', 0.02);
  }

  blinker(on, volume = 1, x = null) {
    if (!this.ready || volume <= 0.03) return;
    this._at(x);
    this._tone(on ? 520 : 780, on ? 780 : 520, 0.12, 0.05 * volume, 'sine');
    this._at(null);
  }

  // ─── Interface (voix partagée avec le menu et la boutique) ─────────────────

  /** Clic d'interface (boutons des fenêtres, de la boutique). */
  click() {
    if (this.ready) this.ui.tap();
  }

  /** Changement de sélection (article, onglet). */
  select(i = 0) {
    if (this.ready) this.ui.select(i);
  }

  tab(i = 0) {
    if (this.ready) this.ui.tab(i);
  }

  equip() {
    if (this.ready) this.ui.equip();
  }

  /** Achat dans la boutique, selon la rareté. */
  buy(rarity) {
    if (this.ready) this.ui.buy(rarity);
  }

  /** Pas assez de pièces. */
  denied() {
    if (this.ready) this.ui.denied();
  }

  /** Une pièce comptée (compteur qui défile). */
  coin(i = 0) {
    if (this.ready) this.ui.coin(i);
  }

  /** Bonus de publicité (pièces doublées, reprise). */
  bonus() {
    if (this.ready) this.ui.bonus();
  }

  /** Mission terminée / succès débloqué. */
  mission() {
    if (this.ready) this.ui.mission();
  }

  achievement(hidden = false) {
    if (this.ready) this.ui.achievement(hidden);
  }

  /** Monde débloqué : motif du rebond en entier. */
  unlockWorld() {
    if (this.ready) this.ui.unlockWorld();
  }
}
