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
      default:
        if (!this._throttle('ground', 0.045)) return;
        // Ballon de basket sur parquet : « bong » grave + claquement du cuir
        this._tone(150 * vary, 62, 0.16, 0.8 * vol, 'sine');
        this._tone(310 * vary, 180, 0.05, 0.18 * vol, 'triangle');
        this._noiseBurst(0.035, 0.4 * vol, 'bandpass', 2200, 0.8);
    }
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

  /** Souffle continu du ventilateur, tant que la balle est dedans. */
  wind(on) {
    if (!this.ctx) return;
    if (on && !this._wind && this.ready) {
      const src = this.ctx.createBufferSource();
      src.buffer = this._noise;
      src.loop = true;
      const f = this.ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = 900;
      f.Q.value = 0.7;
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



  death() {
    if (!this.ready) return;
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





}
