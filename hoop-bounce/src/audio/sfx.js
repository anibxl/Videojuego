// Effets sonores synthétisés en temps réel (Web Audio) : aucun fichier à charger,
// et chaque son varie selon la force de l'impact.

import { clamp } from '../core/math.js';

export class Sfx {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.enabled = true;
    this.volume = 0.8;
    this._noise = null;
    this._lastByTag = new Map();
    /** Monde en cours : colore le son du sol (neige feutrée, écho dans l'espace…). */
    this.flavor = 'city';
  }

  /** À appeler lors d'un geste utilisateur (exigence des navigateurs mobiles). */
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC({ latencyHint: 'interactive' });
      this.master = this.ctx.createGain();
      this.master.gain.value = this.enabled ? this.volume : 0;
      // Compresseur léger : plusieurs sons simultanés ne saturent jamais
      const comp = this.ctx.createDynamicsCompressor();
      comp.threshold.value = -14;
      comp.ratio.value = 4;
      this.master.connect(comp).connect(this.ctx.destination);
      this._noise = this._makeNoise();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  suspend() {
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
    return this.enabled && this.ctx && this.ctx.state === 'running';
  }

  _makeNoise() {
    const len = this.ctx.sampleRate;
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
    osc.connect(g).connect(this.master);
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
    src.connect(f).connect(g).connect(this.master);
    src.start(t, Math.random() * 0.5);
    src.stop(t + duration + 0.02);
  }

  impact(speed, tag) {
    if (!this.ready) return;
    const v = clamp(speed / 20, 0, 1);
    if (v < 0.04) return;
    const vol = Math.pow(v, 1.1);
    const vary = 0.94 + Math.random() * 0.12;

    switch (tag) {
      case 'rim':
        if (!this._throttle('rim', 0.05)) return;
        // Métal : partiels inharmoniques qui résonnent
        this._tone(612 * vary, 600 * vary, 0.55, 0.22 * vol, 'sine');
        this._tone(1490 * vary, 1470 * vary, 0.35, 0.12 * vol, 'sine');
        this._tone(2410 * vary, 2390 * vary, 0.22, 0.07 * vol, 'sine');
        this._noiseBurst(0.04, 0.25 * vol, 'highpass', 3000);
        break;
      case 'backboard':
        if (!this._throttle('board', 0.05)) return;
        this._tone(170 * vary, 90, 0.12, 0.55 * vol, 'sine');
        this._noiseBurst(0.09, 0.35 * vol, 'bandpass', 900, 1.2);
        break;
      case 'ice':
        if (!this._throttle('ground', 0.045)) return;
        // Glace : plus dur et plus clair, petit tintement
        this._tone(180 * vary, 80, 0.14, 0.65 * vol, 'sine');
        this._tone(2200 * vary, 2100 * vary, 0.12, 0.05 * vol, 'sine');
        this._noiseBurst(0.03, 0.35 * vol, 'highpass', 4200);
        break;
      case 'snow':
        if (!this._throttle('ground', 0.045)) return;
        // Neige : choc feutré
        this._tone(120 * vary, 60, 0.12, 0.55 * vol, 'sine');
        this._noiseBurst(0.07, 0.3 * vol, 'lowpass', 900, 0.7);
        break;
      case 'wood':
      case 'branch':
      case 'log':
      case 'crate':
        if (!this._throttle('wood', 0.05)) return;
        // Bois : « toc » creux
        this._tone(140 * vary, 70, 0.14, 0.7 * vol, 'sine');
        this._tone(420 * vary, 300, 0.06, 0.2 * vol, 'triangle');
        this._noiseBurst(0.05, 0.3 * vol, 'bandpass', 1100, 1.5);
        break;
      case 'mushroom':
        break; // son dédié (champignon)
      case 'asteroid':
        if (!this._throttle('rock', 0.05)) return;
        this._tone(160 * vary, 70, 0.3, 0.6 * vol, 'sine');
        this._tone(900 * vary, 860 * vary, 0.5, 0.05 * vol, 'sine');
        this._noiseBurst(0.05, 0.25 * vol, 'bandpass', 1600, 1);
        break;
      default: {
        if (!this._throttle('ground', 0.045)) return;
        // Ballon de basket sur parquet : « bong » grave + claquement du cuir
        this._tone(150 * vary, 62, 0.16, 0.8 * vol, 'sine');
        this._tone(310 * vary, 180, 0.05, 0.18 * vol, 'triangle');
        this._noiseBurst(0.035, 0.4 * vol, 'bandpass', 2200, 0.8);
        if (this.flavor === 'space') this._tone(150 * vary, 62, 0.2, 0.22 * vol, 'sine', 0.13); // écho
        if (this.flavor === 'volcano') this._noiseBurst(0.06, 0.12 * vol, 'lowpass', 500); // roche
      }
    }
  }

  // ─── Mécaniques des mondes ────────────────────────────────────────────────

  icicleShake() {
    if (!this.ready) return;
    for (let i = 0; i < 4; i++) this._tone(2600 + i * 310, 2500 + i * 300, 0.08, 0.03, 'sine', i * 0.07);
  }

  icicleShatter() {
    if (!this.ready) return;
    this._noiseBurst(0.35, 0.3, 'highpass', 3500, 1, 6000);
    [3100, 3900, 4700, 5600].forEach((f, i) => this._tone(f, f * 0.97, 0.2, 0.04, 'sine', i * 0.025));
  }

  crumbleShake() {
    if (!this.ready) return;
    this._noiseBurst(0.4, 0.18, 'lowpass', 400, 1, 250);
  }

  crumble() {
    if (!this.ready) return;
    this._noiseBurst(0.5, 0.4, 'lowpass', 900, 0.8, 200);
    this._tone(90, 45, 0.4, 0.3, 'sine');
  }

  geyser(volume = 1) {
    if (!this.ready || volume <= 0.02) return;
    this._noiseBurst(1.0, 0.35 * volume, 'bandpass', 500, 0.6, 1800);
    this._tone(70, 110, 0.8, 0.18 * volume, 'sawtooth');
  }

  rockImpact(volume = 1) {
    if (!this.ready || volume <= 0.02) return;
    this._tone(110, 40, 0.35, 0.6 * volume, 'sine');
    this._noiseBurst(0.3, 0.4 * volume, 'lowpass', 1200, 0.8, 300);
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
    o.connect(g).connect(this.master);
    o.start(t);
    lfo.start(t);
    o.stop(t + 0.42);
    lfo.stop(t + 0.42);
  }

  gravityFlip(up) {
    if (!this.ready) return;
    this._tone(up ? 220 : 880, up ? 880 : 220, 0.35, 0.12, 'sine');
    this._tone(up ? 330 : 1320, up ? 1320 : 330, 0.35, 0.05, 'triangle', 0.04);
  }

  crateHit() {
    if (!this.ready || !this._throttle('crate', 0.12)) return;
    this._tone(95, 60, 0.18, 0.4, 'sine');
    this._noiseBurst(0.12, 0.2, 'lowpass', 700);
  }

  /** Rebond du joueur : « pop » élastique, plus aigu et plus ample à chaque niveau de puissance. */
  bounce(level) {
    if (!this.ready) return;
    const pitch = Math.pow(1.122, level - 1); // un ton de plus par niveau
    this._tone(200 * pitch, 470 * pitch, 0.1 + level * 0.012, 0.3, 'sine');
    this._tone(110, 58, 0.13, 0.5, 'sine');
    this._noiseBurst(0.05, 0.18, 'bandpass', 1700 * pitch, 1.2);
    if (level >= 5) this._tone(1320, 1320, 0.18, 0.05, 'triangle', 0.03);
  }

  /** Dribble en l'air : le ballon est renvoyé vers le sol (souffle descendant bref). */
  slam() {
    if (!this.ready || !this._throttle('slam', 0.05)) return;
    this._noiseBurst(0.12, 0.16, 'bandpass', 2600, 1.4, 700);
    this._tone(320, 150, 0.09, 0.12, 'sine');
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
  }

  teleport() {
    if (!this.ready) return;
    this._tone(300, 1500, 0.22, 0.12, 'sine');
    this._tone(1500, 600, 0.3, 0.08, 'triangle', 0.18);
    this._noiseBurst(0.35, 0.1, 'bandpass', 2000, 4, 5000);
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

  star(count) {
    if (!this.ready) return;
    const base = [880, 1047, 1319][Math.min(2, count - 1)] ?? 880;
    this._tone(base, base, 0.18, 0.12, 'triangle');
    this._tone(base * 1.5, base * 1.5, 0.3, 0.1, 'triangle', 0.07);
    this._tone(base * 2, base * 2, 0.4, 0.05, 'sine', 0.12);
  }

  checkpoint() {
    if (!this.ready) return;
    this._tone(523, 523, 0.15, 0.09, 'triangle');
    this._tone(784, 784, 0.3, 0.09, 'triangle', 0.09);
  }



  death(cause) {
    if (!this.ready) return;
    if (cause === 'lava' || cause === 'fire') {
      // Grésillement
      this._noiseBurst(0.6, 0.45, 'highpass', 2500, 0.7, 6000);
      this._tone(260, 60, 0.4, 0.3, 'sawtooth');
      return;
    }
    if (cause === 'laser') {
      this._tone(1400, 200, 0.3, 0.15, 'sawtooth');
      this._noiseBurst(0.25, 0.3, 'highpass', 3000);
      return;
    }
    if (cause === 'void') {
      this._tone(600, 40, 0.8, 0.25, 'sine');
      this._noiseBurst(0.7, 0.25, 'lowpass', 1200, 0.8, 80);
      return;
    }
    if (cause === 'crusher') {
      this._tone(110, 40, 0.3, 0.5, 'square');
      this._noiseBurst(0.3, 0.55, 'lowpass', 1500, 0.8, 200);
      return;
    }
    if (cause === 'water') {
      this._noiseBurst(0.45, 0.45, 'lowpass', 2400, 0.8, 400);
      this._tone(400, 120, 0.25, 0.2, 'sine');
      return;
    }
    this._noiseBurst(0.3, 0.5, 'lowpass', 1800, 0.8, 300);
    this._tone(320, 70, 0.35, 0.4, 'sawtooth');
  }

  win(swish) {
    if (!this.ready) return;
    this._noiseBurst(swish ? 0.4 : 0.25, 0.3, 'bandpass', 5000, 0.9, 2500);
    const notes = [523, 659, 784, 1047];
    notes.forEach((n, i) => this._tone(n, n, 0.35, 0.11, 'triangle', 0.08 + i * 0.09));
    this._tone(1568, 1568, 0.8, 0.05, 'sine', 0.45);
  }

  // ─── Pièges de l'étape 9 ──────────────────────────────────────────────────

  cannon(volume = 1) {
    if (!this.ready || volume <= 0.03) return;
    this._tone(120, 45, 0.25, 0.45 * volume, 'sine');
    this._noiseBurst(0.22, 0.35 * volume, 'lowpass', 1400, 0.8, 200);
  }

  laserOn(volume = 1) {
    if (!this.ready || volume <= 0.03) return;
    this._tone(1800, 600, 0.18, 0.06 * volume, 'sawtooth');
    this._tone(220, 220, 0.5, 0.05 * volume, 'square');
  }

  /** Mission terminée / succès débloqué : petit arpège lumineux qui monte. */
  mission() {
    if (!this.ready) return;
    [784, 988, 1175, 1568].forEach((f, i) => this._tone(f, f, 0.22, 0.09, 'triangle', i * 0.07));
    this._tone(2350, 2350, 0.35, 0.03, 'sine', 0.3);
  }

  /** Clic d'interface (boutons des fenêtres, de la boutique) : « pop » rond et bref. */
  click() {
    if (!this.ready || !this._throttle('click', 0.04)) return;
    this._tone(540, 820, 0.07, 0.12, 'sine');
    this._tone(1640, 1640, 0.03, 0.02, 'triangle');
  }

  /** Pilon qui s'écrase : choc sourd et métallique. */
  crusherSlam(volume = 1) {
    if (!this.ready || volume <= 0.03) return;
    this._tone(90, 40, 0.3, 0.5 * volume, 'sine');
    this._noiseBurst(0.18, 0.4 * volume, 'lowpass', 900, 0.8, 150);
    this._tone(this.flavor === 'city' || this.flavor === 'space' ? 520 : 220, 180, 0.12, 0.06 * volume, 'square');
  }

  /** Rocher (ou boule de neige) qui part : grondement qui roule. */
  boulderStart(volume = 1) {
    if (!this.ready || volume <= 0.03) return;
    this._noiseBurst(0.9, 0.22 * volume, 'lowpass', 300, 1, 120);
    this._tone(70, 55, 0.8, 0.12 * volume, 'triangle');
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

  blinker(on, volume = 1) {
    if (!this.ready || volume <= 0.03) return;
    this._tone(on ? 520 : 780, on ? 780 : 520, 0.12, 0.05 * volume, 'sine');
  }

  /** Monde débloqué : fanfare cristalline. */
  unlockWorld() {
    if (!this.ready) return;
    [523, 659, 784, 1047, 1319].forEach((n, i) => this._tone(n, n, 0.5, 0.09, 'triangle', i * 0.08));
    this._noiseBurst(0.6, 0.12, 'highpass', 5000, 1, 9000, 0.3);
  }
}
