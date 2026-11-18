// Musique et ambiance des mondes, synthétisées en temps réel (Web Audio) : aucun fichier.
//
// Chaque monde a son morceau (tempo, accords, basse, instrument principal, batterie) et son
// ambiance sonore en boucle (circulation lointaine, vent, grondement, oiseaux et rivière, bourdon
// spatial). Le séquenceur programme les notes un peu à l'avance (ordonnancement précis de Web Audio)
// à chaque image : aucun minuteur, et rien ne joue quand le jeu est en arrière-plan.
//
// Partage le contexte audio des effets sonores (une seule AudioContext pour tout le jeu).

const LOOKAHEAD = 0.3; // s programmées à l'avance
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

// Accords en notes MIDI (4 voix). Une mesure par accord, boucle de 4 mesures.
export const SONGS = {
  // Ville : lo-fi hip-hop du coucher de soleil — piano électrique feutré, beat souple
  city: {
    bpm: 84,
    swing: 0.14,
    chords: [[53, 57, 60, 64], [52, 55, 59, 62], [50, 53, 57, 60], [48, 52, 55, 59]],
    bass: [0, null, null, 0, null, null, 7, null, 0, null, null, null, 5, null, 7, null],
    keys: { inst: 'epiano', steps: [0, 7, 10] },
    lead: { inst: 'pluck', steps: [2, 6, 11, 14], pattern: [3, 2, 1, 2] },
    drums: { kick: [0, 7, 10], snare: [4, 12], hat: [0, 2, 4, 6, 8, 10, 12, 14] },
    gain: 0.5,
  },
  // Neige : boîte à musique et nappes froides, lent et cristallin
  snow: {
    bpm: 70,
    swing: 0,
    chords: [[57, 60, 64, 69], [53, 57, 60, 65], [48, 52, 55, 60], [55, 59, 62, 67]],
    bass: [0, null, null, null, null, null, null, null, 7, null, null, null, null, null, null, null],
    pad: true,
    lead: { inst: 'bell', steps: [0, 3, 6, 8, 11, 14], pattern: [0, 2, 3, 1, 2, 3], octave: 12 },
    drums: { shaker: [4, 12] },
    gain: 0.45,
  },
  // Volcan : tambours graves et basse menaçante, mode phrygien
  volcano: {
    bpm: 100,
    swing: 0,
    chords: [[52, 55, 59, 64], [53, 57, 60, 65], [52, 55, 59, 64], [50, 53, 57, 62]],
    bass: [0, 0, null, 0, null, 1, null, 0, 0, null, 0, null, 1, null, 0, null],
    bassInst: 'growl',
    lead: { inst: 'brass', steps: [0, 10], pattern: [3, 2], octave: -12 },
    drums: { tom: [0, 3, 6, 8, 11, 14], kick: [0, 8], hat: [4, 12] },
    gain: 0.5,
  },
  // Forêt : marimba, flûte douce, pentatonique et léger shaker — reposant
  forest: {
    bpm: 92,
    swing: 0.1,
    chords: [[50, 54, 57, 62], [55, 59, 62, 67], [47, 50, 54, 59], [57, 61, 64, 69]],
    bass: [0, null, null, null, 7, null, null, null, 0, null, null, null, 5, null, null, null],
    keys: { inst: 'marimba', steps: [0, 3, 6, 8, 10, 13], arp: true },
    lead: { inst: 'flute', steps: [0, 8], pattern: [3, 1], octave: 12, long: true },
    drums: { shaker: [2, 6, 10, 14], kick: [0, 8] },
    gain: 0.45,
  },
  // Espace : nappes de synthé qui respirent, arpège lumineux, sous-basse
  space: {
    bpm: 72,
    swing: 0,
    chords: [[48, 51, 55, 60], [44, 48, 51, 56], [51, 55, 58, 63], [46, 50, 53, 58]],
    bass: [0, null, null, null, null, null, null, null, 0, null, null, null, null, null, null, null],
    bassInst: 'sub',
    pad: true,
    keys: { inst: 'arp', steps: [0, 2, 4, 6, 8, 10, 12, 14], arp: true, octave: 12 },
    drums: { kick: [0], hat: [8] },
    gain: 0.45,
  },
};

export class Music {
  /** @param {import('./sfx.js').Sfx} sfx  fournit le contexte audio et le bruit blanc */
  constructor(sfx) {
    this.sfx = sfx;
    this.volume = 0.5;
    this.theme = null;
    this.song = null;
    this.bus = null;
    this.duck = 1;
    this._nextTime = 0;
    this._step = 0;
    this._ambience = null;
    this._ambTimer = 0;
  }

  get ctx() {
    return this.sfx.ctx;
  }

  _ensureBus() {
    if (this.bus || !this.ctx) return !!this.bus;
    const c = this.ctx;
    this.out = c.createGain();
    this.out.gain.value = this._targetGain();
    const comp = c.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.ratio.value = 3;
    this.out.connect(comp).connect(c.destination);
    this.bus = c.createGain();
    this.bus.gain.value = 0;
    // Filtre doux commun : la musique reste derrière les effets
    this.tone = c.createBiquadFilter();
    this.tone.type = 'lowpass';
    this.tone.frequency.value = 5200;
    this.bus.connect(this.tone).connect(this.out);
    this.ambBus = c.createGain();
    this.ambBus.gain.value = 0;
    this.ambBus.connect(this.out);
    return true;
  }

  _targetGain() {
    return 0.9 * this.volume * this.volume * this.duck;
  }

  /** Volume « musique » des paramètres (0..1). */
  setVolume(v) {
    this.volume = v;
    if (this.out) this.out.gain.setTargetAtTime(this._targetGain(), this.ctx.currentTime, 0.1);
  }

  /** Baisse la musique (pause, victoire) : k = 1 normal, 0.35 en pause. */
  setDuck(k) {
    this.duck = k;
    if (this.out) this.out.gain.setTargetAtTime(this._targetGain(), this.ctx.currentTime, 0.25);
  }

  /** Change de monde : fondu enchaîné vers son morceau et son ambiance. */
  play(theme) {
    if (this.theme === theme && this.song) return;
    this.theme = theme;
    if (!this._ensureBus()) return; // pas encore de contexte : on démarrera au déverrouillage
    const c = this.ctx;
    const now = c.currentTime;
    this.bus.gain.cancelScheduledValues(now);
    this.bus.gain.setValueAtTime(this.bus.gain.value, now);
    this.bus.gain.linearRampToValueAtTime(0, now + 0.6);
    this.ambBus.gain.cancelScheduledValues(now);
    this.ambBus.gain.setValueAtTime(this.ambBus.gain.value, now);
    this.ambBus.gain.linearRampToValueAtTime(0, now + 0.6);
    this._stopAmbience(now + 0.65);
    this.song = SONGS[theme] ?? SONGS.city;
    this._nextTime = now + 0.7;
    this._step = 0;
    this.bus.gain.linearRampToValueAtTime(this.song.gain, now + 1.6);
    this.ambBus.gain.linearRampToValueAtTime(1, now + 1.6);
    this._startAmbience(theme, now + 0.7);
  }

  /** À appeler à chaque image : programme les notes à venir. */
  update() {
    if (!this.ctx || this.ctx.state !== 'running') return;
    if (!this.bus && this.theme) {
      const t = this.theme;
      this.theme = null;
      this.play(t);
    }
    if (!this.song || this.volume <= 0) return;
    const c = this.ctx;
    // Retour d'arrière-plan : on ne rattrape pas les notes manquées
    if (this._nextTime < c.currentTime - 0.2) this._nextTime = c.currentTime + 0.05;
    const stepDur = 60 / this.song.bpm / 4;
    while (this._nextTime < c.currentTime + LOOKAHEAD) {
      const swing = this._step % 2 === 1 ? this.song.swing * stepDur : 0;
      this._playStep(this._step, this._nextTime + swing, stepDur);
      this._nextTime += stepDur;
      this._step = (this._step + 1) % 64;
    }
    this._updateAmbience();
  }

  _playStep(step, t, stepDur) {
    const S = this.song;
    const bar = (step / 16) | 0;
    const s = step % 16;
    const chord = S.chords[bar % S.chords.length];
    const root = chord[0];

    if (S.pad && s === 0) for (const n of chord) this._pad(mtof(n), t, stepDur * 16);
    if (S.bass && S.bass[s] !== null && S.bass[s] !== undefined) {
      const n = root - 24 + S.bass[s];
      if (S.bassInst === 'sub') this._sub(mtof(n), t, stepDur * 7);
      else if (S.bassInst === 'growl') this._growl(mtof(n), t, stepDur * 1.6);
      else this._bass(mtof(n), t, stepDur * 2.5);
    }
    if (S.keys && S.keys.steps.includes(s)) {
      const k = S.keys;
      const oct = k.octave ?? 0;
      if (k.arp) {
        const idx = k.steps.indexOf(s);
        const n = chord[idx % chord.length] + oct + (idx >= chord.length ? 12 : 0);
        this._inst(k.inst, mtof(n), t, stepDur * 2);
      } else {
        for (const n of chord) this._inst(k.inst, mtof(n + oct), t, stepDur * 3);
      }
    }
    if (S.lead && S.lead.steps.includes(s)) {
      const L = S.lead;
      const idx = L.steps.indexOf(s);
      const n = chord[L.pattern[idx % L.pattern.length]] + (L.octave ?? 0) + 12;
      this._inst(L.inst, mtof(n), t, stepDur * (L.long ? 6 : 2));
    }
    const D = S.drums ?? {};
    if (D.kick?.includes(s)) this._kick(t);
    if (D.snare?.includes(s)) this._snare(t);
    if (D.hat?.includes(s)) this._hat(t, s % 4 === 0 ? 0.05 : 0.03);
    if (D.tom?.includes(s)) this._tom(t, s === 0 ? 1 : 0.6);
    if (D.shaker?.includes(s)) this._shaker(t);
  }

  // ─── Instruments ──────────────────────────────────────────────────────────

  _env(g, t, a, peak, d) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  }

  _osc(type, f, t, dur, peak, attack = 0.01, dest = this.bus, detune = 0) {
    const c = this.ctx;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.value = f;
    o.detune.value = detune;
    this._env(g, t, attack, peak, dur);
    o.connect(g).connect(dest);
    o.start(t);
    o.stop(t + attack + dur + 0.05);
    return o;
  }

  _inst(name, f, t, dur) {
    switch (name) {
      case 'epiano':
        this._osc('sine', f, t, dur * 1.4, 0.05, 0.008);
        this._osc('triangle', f * 2, t, dur * 0.5, 0.012, 0.004);
        break;
      case 'pluck':
        this._osc('triangle', f, t, dur * 0.7, 0.045, 0.003);
        break;
      case 'bell':
        this._osc('sine', f, t, dur * 3.5, 0.05, 0.002);
        this._osc('sine', f * 2.76, t, dur * 1.2, 0.014, 0.002);
        break;
      case 'brass': {
        const c = this.ctx;
        const f2 = c.createBiquadFilter();
        f2.type = 'lowpass';
        f2.frequency.setValueAtTime(400, t);
        f2.frequency.linearRampToValueAtTime(1400, t + 0.15);
        f2.connect(this.bus);
        this._osc('sawtooth', f, t, dur * 2.5, 0.035, 0.06, f2);
        this._osc('sawtooth', f, t, dur * 2.5, 0.025, 0.06, f2, 9);
        break;
      }
      case 'marimba':
        this._osc('sine', f, t, dur * 0.8, 0.06, 0.002);
        this._osc('sine', f * 4, t, dur * 0.15, 0.012, 0.001);
        break;
      case 'flute': {
        const o = this._osc('sine', f, t, dur, 0.035, 0.12);
        const lfo = this.ctx.createOscillator();
        const lg = this.ctx.createGain();
        lfo.frequency.value = 5;
        lg.gain.value = f * 0.008;
        lfo.connect(lg).connect(o.frequency);
        lfo.start(t);
        lfo.stop(t + dur + 0.2);
        break;
      }
      case 'arp':
        this._osc('square', f, t, dur * 0.6, 0.012, 0.004);
        this._osc('sine', f * 2, t, dur * 0.9, 0.012, 0.004);
        break;
      default:
        this._osc('sine', f, t, dur, 0.04);
    }
  }

  _pad(f, t, dur) {
    const c = this.ctx;
    const filt = c.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.setValueAtTime(500, t);
    filt.frequency.linearRampToValueAtTime(1300, t + dur * 0.5);
    filt.frequency.linearRampToValueAtTime(600, t + dur);
    filt.connect(this.bus);
    for (const d of [-7, 7]) {
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = 'sawtooth';
      o.frequency.value = f;
      o.detune.value = d;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.012, t + dur * 0.3);
      g.gain.linearRampToValueAtTime(0.0001, t + dur * 1.05);
      o.connect(g).connect(filt);
      o.start(t);
      o.stop(t + dur * 1.1);
    }
  }

  _bass(f, t, dur) {
    this._osc('sine', f, t, dur, 0.12, 0.01);
    this._osc('triangle', f * 2, t, dur * 0.3, 0.02, 0.005);
  }

  _sub(f, t, dur) {
    this._osc('sine', f, t, dur, 0.1, 0.2);
  }

  _growl(f, t, dur) {
    const c = this.ctx;
    const filt = c.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.setValueAtTime(700, t);
    filt.frequency.exponentialRampToValueAtTime(180, t + dur);
    filt.connect(this.bus);
    this._osc('sawtooth', f, t, dur, 0.06, 0.005, filt);
    this._osc('sine', f, t, dur, 0.08, 0.005);
  }

  _kick(t) {
    const c = this.ctx;
    const o = c.createOscillator();
    const g = c.createGain();
    o.frequency.setValueAtTime(130, t);
    o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
    this._env(g, t, 0.003, 0.2, 0.22);
    o.connect(g).connect(this.bus);
    o.start(t);
    o.stop(t + 0.3);
  }

  _tom(t, v) {
    const c = this.ctx;
    const o = c.createOscillator();
    const g = c.createGain();
    o.frequency.setValueAtTime(110, t);
    o.frequency.exponentialRampToValueAtTime(60, t + 0.25);
    this._env(g, t, 0.004, 0.16 * v, 0.35);
    o.connect(g).connect(this.bus);
    o.start(t);
    o.stop(t + 0.4);
    this._noise(t, 0.05, 0.04 * v, 'lowpass', 600);
  }

  _snare(t) {
    this._noise(t, 0.16, 0.07, 'bandpass', 1800, 0.8);
    this._osc('triangle', 190, t, 0.08, 0.04, 0.002);
  }

  _hat(t, v) {
    this._noise(t, 0.04, v, 'highpass', 7000);
  }

  _shaker(t) {
    this._noise(t, 0.08, 0.025, 'highpass', 5000, 1, 0.03);
  }

  _noise(t, dur, peak, type, freq, q = 1, attack = 0.002, dest = this.bus) {
    const c = this.ctx;
    const src = c.createBufferSource();
    src.buffer = this.sfx._noise;
    const f = c.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = c.createGain();
    this._env(g, t, attack, peak, dur);
    src.connect(f).connect(g).connect(dest);
    src.start(t, Math.random() * 0.5);
    src.stop(t + attack + dur + 0.05);
  }

  // ─── Ambiances ────────────────────────────────────────────────────────────

  /** Boucle de bruit filtré (vent, circulation, grondement, rivière), avec une lente variation. */
  _loop(t, type, freq, q, gain, lfoRate, lfoDepth) {
    const c = this.ctx;
    const src = c.createBufferSource();
    src.buffer = this.sfx._noise;
    src.loop = true;
    const f = c.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = c.createGain();
    g.gain.value = gain;
    const lfo = c.createOscillator();
    const lg = c.createGain();
    lfo.frequency.value = lfoRate;
    lg.gain.value = lfoDepth;
    lfo.connect(lg).connect(f.frequency);
    src.connect(f).connect(g).connect(this.ambBus);
    src.start(t);
    lfo.start(t);
    return [src, lfo];
  }

  _startAmbience(theme, t) {
    const nodes = [];
    switch (theme) {
      case 'city':
        nodes.push(...this._loop(t, 'lowpass', 260, 0.6, 0.05, 0.07, 80));
        break;
      case 'snow':
        nodes.push(...this._loop(t, 'bandpass', 520, 1.4, 0.06, 0.11, 260));
        nodes.push(...this._loop(t, 'bandpass', 1400, 3, 0.015, 0.17, 500));
        break;
      case 'volcano':
        nodes.push(...this._loop(t, 'lowpass', 110, 0.8, 0.14, 0.05, 40));
        break;
      case 'forest':
        nodes.push(...this._loop(t, 'bandpass', 2400, 0.5, 0.018, 0.2, 400));
        break;
      case 'space': {
        const c = this.ctx;
        for (const [f, gain] of [[55, 0.05], [82.5, 0.03], [110.3, 0.018]]) {
          const o = c.createOscillator();
          const g = c.createGain();
          o.frequency.value = f;
          g.gain.value = gain;
          o.connect(g).connect(this.ambBus);
          o.start(t);
          nodes.push(o);
        }
        break;
      }
      default:
    }
    this._ambience = { theme, nodes };
    this._ambTimer = 0;
  }

  _stopAmbience(t) {
    if (!this._ambience) return;
    for (const n of this._ambience.nodes) {
      try {
        n.stop(t);
      } catch {
        /* déjà arrêté */
      }
    }
    this._ambience = null;
  }

  /** Petits sons ponctuels d'ambiance : oiseaux (forêt), crépitements (volcan), klaxons lointains (ville). */
  _updateAmbience() {
    const a = this._ambience;
    if (!a) return;
    const c = this.ctx;
    if (c.currentTime < this._ambTimer) return;
    const t = c.currentTime + 0.05;
    switch (a.theme) {
      case 'forest': {
        const base = 2200 + Math.random() * 1600;
        const n = 2 + ((Math.random() * 3) | 0);
        for (let i = 0; i < n; i++) {
          const o = c.createOscillator();
          const g = c.createGain();
          const tt = t + i * 0.11;
          o.frequency.setValueAtTime(base, tt);
          o.frequency.exponentialRampToValueAtTime(base * 1.35, tt + 0.06);
          this._env(g, tt, 0.01, 0.018, 0.08);
          o.connect(g).connect(this.ambBus);
          o.start(tt);
          o.stop(tt + 0.12);
        }
        this._ambTimer = c.currentTime + 2 + Math.random() * 4;
        break;
      }
      case 'volcano':
        this._noise(t, 0.03, 0.03, 'highpass', 3000, 1, 0.001, this.ambBus);
        this._ambTimer = c.currentTime + 0.15 + Math.random() * 0.9;
        break;
      case 'city': {
        const f = 330 + Math.random() * 60;
        this._osc('sawtooth', f, t, 0.35, 0.006, 0.05, this.ambBus);
        this._ambTimer = c.currentTime + 7 + Math.random() * 9;
        break;
      }
      case 'snow':
        this._osc('sine', 2600 + Math.random() * 1500, t, 0.5, 0.006, 0.003, this.ambBus);
        this._ambTimer = c.currentTime + 1.5 + Math.random() * 3;
        break;
      case 'space':
        this._osc('sine', 1200 + Math.random() * 1800, t, 1.6, 0.005, 0.4, this.ambBus);
        this._ambTimer = c.currentTime + 2.5 + Math.random() * 4;
        break;
      default:
        this._ambTimer = c.currentTime + 5;
    }
  }
}
