// Effets sonores synthétisés en temps réel (Web Audio) : aucun fichier à charger,
// et chaque son varie selon la force de l'impact.

import { clamp } from '../core/math.js';

export class Sfx {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.enabled = true;
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
      this.master.gain.value = 0.8;
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

  setEnabled(on) {
    this.enabled = on;
    if (this.master) this.master.gain.value = on ? 0.8 : 0;
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
      case 'bumper':
        if (!this._throttle('bumper', 0.06)) return;
        this._tone(260 * vary, 520 * vary, 0.18, 0.35 * vol, 'triangle');
        this._tone(150, 70, 0.1, 0.5 * vol, 'sine');
        break;
      default:
        if (!this._throttle('ground', 0.045)) return;
        // Ballon de basket sur parquet : « bong » grave + claquement du cuir
        this._tone(150 * vary, 62, 0.16, 0.8 * vol, 'sine');
        this._tone(310 * vary, 180, 0.05, 0.18 * vol, 'triangle');
        this._noiseBurst(0.035, 0.4 * vol, 'bandpass', 2200, 0.8);
    }
  }

  launch(charge) {
    if (!this.ready) return;
    this._noiseBurst(0.12 + charge * 0.12, 0.12 + 0.2 * charge, 'bandpass', 500, 1.5, 1600 + 1200 * charge);
  }

  chargeMax() {
    if (!this.ready) return;
    this._tone(1180, 1180, 0.08, 0.06, 'sine');
  }

  score(swish) {
    if (!this.ready) return;
    if (swish) this._noiseBurst(0.35, 0.3, 'bandpass', 5000, 0.9, 2500);
    else this._noiseBurst(0.22, 0.18, 'bandpass', 3500, 0.9, 2200);
    const base = swish ? 784 : 659;
    this._tone(base, base, 0.25, 0.1, 'triangle', 0.05);
    this._tone(base * 1.5, base * 1.5, 0.35, 0.09, 'triangle', 0.13);
    if (swish) this._tone(base * 2, base * 2, 0.45, 0.07, 'triangle', 0.21);
  }
}
