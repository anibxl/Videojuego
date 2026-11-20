// Sons du menu, synthétisés en temps réel (Web Audio) : aucun fichier à charger.
//  - sons d'interface : courts, doux, jamais agressifs
//  - musique d'ambiance : nappes d'accords lentes + notes pincées, dans une réverbération
// La « voix » de l'interface (timbre, gamme, motif du rebond) est partagée avec la boutique et le jeu.
// Les navigateurs mobiles exigent un geste du joueur avant tout son : `unlock()` au premier toucher.

import { UiVoice, PENTA, BOUNCE_MOTIF } from '../audio/ui-voice.js';

export class MenuSound {
  constructor() {
    this.ctx = null;
    this.musicVolume = 0.5;
    this.sfxVolume = 0.8;
    this._musicTimer = null;
    this._chord = 0;
    this._lastTick = 0;
  }

  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      const c = new AC({ latencyHint: 'interactive' });
      this.ctx = c;
      const comp = c.createDynamicsCompressor();
      comp.threshold.value = -16;
      comp.ratio.value = 3;
      comp.connect(c.destination);

      this.sfxBus = c.createGain();
      this.sfxBus.connect(comp);
      this.musicBus = c.createGain();
      this.musicBus.gain.value = 0;
      this.musicBus.connect(comp);

      // Réverbération synthétique (bruit qui décroît) pour donner de l'espace à la musique
      this.reverb = c.createConvolver();
      this.reverb.buffer = this._impulse(3.2, 2.6);
      const wet = c.createGain();
      wet.gain.value = 0.55;
      this.reverb.connect(wet).connect(this.musicBus);
      this.musicDry = c.createGain();
      this.musicDry.gain.value = 0.6;
      this.musicDry.connect(this.musicBus);

      this._noise = this._noiseBuffer();
      this.voice = new UiVoice(c, this.sfxBus, this._noise);
      this._applyVolumes();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    if (!this._musicTimer) this._startMusic();
  }

  /** Application en arrière-plan : on coupe tout (et on arrête de programmer la musique). */
  suspend() {
    clearInterval(this._musicTimer);
    this._musicTimer = null;
    this.ctx?.suspend();
  }

  resume() {
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    if (!this._musicTimer) this._startMusic();
  }

  setVolumes(music, sfx) {
    this.musicVolume = music;
    this.sfxVolume = sfx;
    this._applyVolumes();
  }

  _applyVolumes() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    // Courbe perceptive : le curseur paraît linéaire à l'oreille
    this.sfxBus.gain.setTargetAtTime(this.sfxVolume ** 2 * 0.9, now, 0.03);
    this.musicBus.gain.setTargetAtTime(this.musicVolume ** 2 * 0.55, now, 0.4);
  }

  get _ok() {
    return this.ctx && this.ctx.state === 'running' && this.sfxVolume > 0;
  }

  _noiseBuffer() {
    const len = this.ctx.sampleRate;
    const b = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return b;
  }

  _impulse(seconds, decay) {
    const rate = this.ctx.sampleRate;
    const len = Math.floor(rate * seconds);
    const b = this.ctx.createBuffer(2, len, rate);
    for (let ch = 0; ch < 2; ch++) {
      const d = b.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return b;
  }

  // ─── Sons d'interface (voix partagée : src/audio/ui-voice.js) ──────────

  tap() { if (this._ok) this.voice.tap(); }
  open() { if (this._ok) this.voice.open(); }
  back() { if (this._ok) this.voice.back(); }
  toggle(on) { if (this._ok) this.voice.toggle(on); }
  tick(value) { if (this._ok) this.voice.tick(value); }
  tab(i = 0) { if (this._ok) this.voice.tab(i); }
  /** Changement de sélection (article, niveau, option). */
  select(i = 0) { if (this._ok) this.voice.select(i); }
  locked() { if (this._ok) this.voice.locked(); }
  equip() { if (this._ok) this.voice.equip(); }
  unlockWorld() { if (this._ok) this.voice.unlockWorld(); }
  chest() { if (this._ok) this.voice.chest(); }
  reward() { if (this._ok) this.voice.reward(); }
  spin() { if (this._ok) this.voice.spin(); }
  wheelTick(speed = 1) { if (this._ok) this.voice.wheelTick(speed); }
  surprise() { if (this._ok) this.voice.surprise(); }
  coins() { if (this._ok) this.voice.coins(); }
  coin(i = 0) { if (this._ok) this.voice.coin(i); }
  mission() { if (this._ok) this.voice.mission(); }
  play() { if (this._ok) this.voice.play(); }

  // ─── Musique d'ambiance ─────────────────────────────────────────────────

  _startMusic() {
    // Am9 · Fmaj7 · Cmaj7 · G6 — progression calme, légèrement mélancolique
    this._progression = [
      [57, 64, 67, 71, 72],
      [53, 60, 64, 69, 72],
      [48, 55, 59, 64, 67],
      [55, 59, 62, 64, 69],
    ];
    const barSeconds = 4.8;
    const play = () => {
      if (!this.ctx) return;
      const chord = this._progression[this._chord % this._progression.length];
      this._pad(chord, barSeconds + 1.6);
      // Quelques notes pincées, sur la gamme pentatonique de l'accord
      for (let i = 0; i < 3; i++) {
        if (Math.random() < 0.7) {
          const note = chord[1 + Math.floor(Math.random() * (chord.length - 1))] + 12;
          this._pluck(note, 0.6 + i * 1.5 + Math.random() * 0.4);
        }
      }
      // Signature : toutes les 4 mesures, le motif du rebond, très doux, sur l'accord de do
      if (this._chord % 4 === 2) {
        BOUNCE_MOTIF.times.forEach((dt, i) => this._pluckHz(PENTA[BOUNCE_MOTIF.notes[i]], 1.2 + dt * 1.6, i === 4 ? 2.6 : 1.4));
      }
      this._chord++;
    };
    play();
    this._musicTimer = setInterval(play, barSeconds * 1000);
  }

  _pad(notes, dur) {
    const c = this.ctx;
    const t = c.currentTime;
    const filter = c.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(700, t);
    filter.frequency.linearRampToValueAtTime(1300, t + dur * 0.5);
    filter.frequency.linearRampToValueAtTime(700, t + dur);
    filter.Q.value = 0.4;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.05, t + 1.6);
    g.gain.setValueAtTime(0.05, t + dur - 2);
    g.gain.linearRampToValueAtTime(0.0001, t + dur);
    filter.connect(g);
    g.connect(this.musicDry);
    g.connect(this.reverb);
    for (const n of notes) {
      const f = 440 * Math.pow(2, (n - 69) / 12);
      for (const detune of [-7, 6]) {
        const o = c.createOscillator();
        o.type = 'sawtooth';
        o.frequency.value = f;
        o.detune.value = detune;
        const og = c.createGain();
        og.gain.value = 0.12;
        o.connect(og).connect(filter);
        o.start(t);
        o.stop(t + dur + 0.05);
      }
    }
    // Basse douce
    const bass = c.createOscillator();
    bass.type = 'sine';
    bass.frequency.value = 440 * Math.pow(2, (notes[0] - 12 - 69) / 12);
    const bg = c.createGain();
    bg.gain.setValueAtTime(0.0001, t);
    bg.gain.linearRampToValueAtTime(0.09, t + 1.2);
    bg.gain.linearRampToValueAtTime(0.0001, t + dur);
    bass.connect(bg).connect(this.musicDry);
    bass.start(t);
    bass.stop(t + dur + 0.05);
  }

  /** Note pincée à une fréquence donnée (motif du rebond). */
  _pluckHz(f, delay, len = 1.8) {
    const c = this.ctx;
    const t = c.currentTime + delay;
    const o = c.createOscillator();
    o.type = 'sine';
    o.frequency.value = f;
    const o2 = c.createOscillator();
    o2.type = 'triangle';
    o2.frequency.value = f * 2;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.04, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    const g2 = c.createGain();
    g2.gain.value = 0.15;
    o.connect(g);
    o2.connect(g2).connect(g);
    g.connect(this.reverb);
    g.connect(this.musicDry);
    o.start(t);
    o2.start(t);
    o.stop(t + len + 0.05);
    o2.stop(t + len + 0.05);
  }

  _pluck(note, delay) {
    const c = this.ctx;
    const t = c.currentTime + delay;
    const f = 440 * Math.pow(2, (note - 69) / 12);
    const o = c.createOscillator();
    o.type = 'triangle';
    o.frequency.value = f;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.045, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.8);
    o.connect(g);
    g.connect(this.reverb);
    g.connect(this.musicDry);
    o.start(t);
    o.stop(t + 1.9);
  }
}
