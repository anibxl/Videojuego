// Sons du menu, synthétisés en temps réel (Web Audio) : aucun fichier à charger.
//  - sons d'interface : courts, doux, jamais agressifs
//  - musique d'ambiance : nappes d'accords lentes + notes pincées, dans une réverbération
// Les navigateurs mobiles exigent un geste du joueur avant tout son : `unlock()` au premier toucher.

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

  _tone(freq, endFreq, dur, gain, type = 'sine', delay = 0, bus = this.sfxBus) {
    const c = this.ctx;
    const t = c.currentTime + delay;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (endFreq !== freq) o.frequency.exponentialRampToValueAtTime(endFreq, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(bus);
    o.start(t);
    o.stop(t + dur + 0.03);
  }

  _air(dur, gain, from, to, q = 1.2, delay = 0) {
    const c = this.ctx;
    const t = c.currentTime + delay;
    const s = c.createBufferSource();
    s.buffer = this._noise;
    const f = c.createBiquadFilter();
    f.type = 'bandpass';
    f.Q.value = q;
    f.frequency.setValueAtTime(from, t);
    f.frequency.exponentialRampToValueAtTime(to, t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + dur * 0.35);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(this.sfxBus);
    s.start(t, Math.random() * 0.5);
    s.stop(t + dur + 0.03);
  }

  // ─── Sons d'interface ───────────────────────────────────────────────────

  /** Toucher un bouton : « pop » rond et bref. */
  tap() {
    if (!this._ok) return;
    this._tone(540, 820, 0.07, 0.16, 'sine');
    this._tone(1640, 1640, 0.03, 0.025, 'triangle');
  }

  /** Ouvrir une page : souffle montant + note claire. */
  open() {
    if (!this._ok) return;
    this._air(0.28, 0.06, 500, 2600, 0.9);
    this._tone(660, 660, 0.18, 0.06, 'triangle', 0.05);
    this._tone(990, 990, 0.22, 0.045, 'sine', 0.1);
  }

  /** Revenir : la même chose, en descendant. */
  back() {
    if (!this._ok) return;
    this._air(0.24, 0.05, 2200, 500, 0.9);
    this._tone(740, 520, 0.14, 0.08, 'sine');
  }

  toggle(on) {
    if (!this._ok) return;
    this._tone(on ? 700 : 520, on ? 1050 : 400, 0.06, 0.12, 'sine');
  }

  /** Curseur déplacé : petit tic dont la hauteur suit la valeur. */
  tick(value) {
    if (!this._ok) return;
    const now = this.ctx.currentTime;
    if (now - this._lastTick < 0.045) return;
    this._lastTick = now;
    this._tone(500 + value * 700, 500 + value * 700, 0.03, 0.06, 'triangle');
  }

  tab() {
    if (!this._ok) return;
    this._tone(880, 1100, 0.05, 0.08, 'sine');
  }

  /** Élément verrouillé : son sourd, sans agressivité. */
  locked() {
    if (!this._ok) return;
    this._tone(220, 160, 0.12, 0.14, 'triangle');
    this._tone(330, 240, 0.08, 0.05, 'sine', 0.05);
  }

  /** Article équipé : petit carillon brillant. */
  equip() {
    if (!this._ok) return;
    [880, 1318.5, 1760].forEach((f, i) => this._tone(f, f, 0.22, 0.05, 'triangle', i * 0.05));
    this._air(0.25, 0.03, 2000, 6000, 1.4);
  }

  /** Monde débloqué : fanfare cristalline qui monte. */
  unlockWorld() {
    if (!this._ok) return;
    this._air(0.9, 0.07, 400, 5000, 0.8);
    [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => this._tone(f, f, 0.7 - i * 0.06, 0.06, 'triangle', i * 0.08));
  }

  /** JOUER : accord qui monte et grand souffle. */
  play() {
    if (!this._ok) return;
    this._air(0.7, 0.09, 300, 4000, 0.8);
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => this._tone(f, f, 0.6 - i * 0.05, 0.07, 'triangle', i * 0.06));
    this._tone(130.8, 98, 0.5, 0.18, 'sine');
  }

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
