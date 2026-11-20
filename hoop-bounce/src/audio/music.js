// Musique et ambiance des mondes, synthétisées en temps réel (Web Audio) : aucun fichier.
//
// Chaque monde a son morceau (tempo, accords, basse, instrument principal, batterie) et son
// ambiance sonore en boucle (circulation lointaine, vent, grondement, oiseaux et rivière, bourdon
// spatial). Le séquenceur programme les notes un peu à l'avance (ordonnancement précis de Web Audio)
// à chaque image : aucun minuteur, et rien ne joue quand le jeu est en arrière-plan.
//
// Partage le contexte audio des effets sonores (une seule AudioContext pour tout le jeu).
//
// Étape 18 :
//  - forme en 8 mesures : A (thème) puis B (variation de la mélodie, percussions en plus) et un
//    petit roulement de batterie à la fin de chaque cycle — la boucle ne lasse plus ;
//  - **intensité dynamique** : une couche de percussions et de contre-chant qui monte quand on
//    joue vite et fort (puissance, vitesse) et redescend au calme ou en pause ;
//  - réverbération propre à chaque monde (la musique respire, elle n'est plus « sèche ») ;
//  - **jingles** de victoire, de panier parfait et d'échec, joués dans l'instrument et la tonalité
//    du monde, sur le motif du rebond (identité sonore du jeu, voir ui-voice.js) ;
//  - ambiances enrichies (terrain de basket et train au loin en ville, sifflement du vent à la
//    montagne, lave qui glougloute et grondements au volcan, grillons et grenouilles en forêt,
//    pulsars et scintillements dans l'espace). Les grondements sont signalés au jeu (`onAmbient`)
//    pour que l'image tremble avec eux.

import { BOUNCE_MOTIF, makeImpulse } from './ui-voice.js';

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
    leadB: { steps: [0, 3, 6, 8, 10, 14], pattern: [3, 2, 3, 1, 2, 0] },
    layer: { hat: [1, 3, 5, 7, 9, 11, 13, 15], shaker: [2, 6, 10, 14], counter: { inst: 'pluck', steps: [3, 11], octave: 12 } },
    key: { root: 72, scale: 'major', inst: 'epiano' },
    verb: { len: 1.8, decay: 3, send: 0.22 },
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
    leadB: { steps: [0, 2, 4, 8, 10, 12], pattern: [3, 2, 1, 3, 2, 0] },
    layer: { shaker: [2, 6, 10, 14], kick: [0, 8], counter: { inst: 'bell', steps: [6, 14], octave: 24 } },
    key: { root: 72, scale: 'major', inst: 'bell' },
    verb: { len: 3.2, decay: 2.6, send: 0.38 },
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
    leadB: { steps: [0, 6, 10, 12], pattern: [3, 2, 1, 3] },
    layer: { hat: [2, 6, 10, 14], tom: [5, 13], snare: [12] },
    key: { root: 64, scale: 'minor', inst: 'brass' },
    verb: { len: 2.6, decay: 2.4, send: 0.26 },
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
    leadB: { steps: [0, 4, 8, 12], pattern: [3, 2, 1, 2] },
    layer: { hat: [0, 4, 8, 12], snare: [4, 12], counter: { inst: 'marimba', steps: [1, 5, 9, 13], octave: 12 } },
    key: { root: 74, scale: 'major', inst: 'marimba' },
    verb: { len: 1.6, decay: 3.2, send: 0.2 },
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
    lead: { inst: 'bell', steps: [0, 6], pattern: [3, 2], octave: 12 },
    leadB: { steps: [0, 4, 6, 10], pattern: [3, 1, 2, 3] },
    layer: { kick: [8], hat: [2, 6, 10, 14], shaker: [4, 12] },
    key: { root: 72, scale: 'minor', inst: 'arp' },
    verb: { len: 4.5, decay: 1.8, send: 0.42 },
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
    this.intensity = 0;
    /** Appelé lors des grondements d'ambiance (le jeu fait trembler l'image). */
    this.onAmbient = null;
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
    // Couche d'intensité (percussions et contre-chant en plus quand l'action monte)
    this.layerBus = c.createGain();
    this.layerBus.gain.value = 0;
    this.layerBus.connect(this.bus);
    // Réverbération de la musique (une par monde)
    this.verb = c.createConvolver();
    this.verbSend = c.createGain();
    this.verbSend.gain.value = 0.2;
    this.tone.connect(this.verbSend).connect(this.verb).connect(this.out);
    // Jingles : à part, pour ne pas être baissés avec la musique pendant la victoire
    this.stingBus = c.createGain();
    this.stingBus.gain.value = this._stingGain();
    const sverb = c.createGain();
    sverb.gain.value = 0.3;
    this.stingBus.connect(comp);
    this.stingBus.connect(sverb).connect(this.verb);
    return true;
  }

  _stingGain() {
    return 0.9 * this.volume * this.volume;
  }

  /**
   * Intensité de la partie (0 calme … 1 action) : la couche de percussions et de contre-chant suit,
   * doucement (plusieurs secondes), pour ne jamais faire « sauter » la musique.
   */
  setIntensity(k) {
    this.intensity = Math.max(0, Math.min(1, k));
    if (this.layerBus) this.layerBus.gain.setTargetAtTime(this.intensity, this.ctx.currentTime, 1.4);
  }

  _targetGain() {
    return 0.9 * this.volume * this.volume * this.duck;
  }

  /** Volume « musique » des paramètres (0..1). */
  setVolume(v) {
    this.volume = v;
    if (this.out) this.out.gain.setTargetAtTime(this._targetGain(), this.ctx.currentTime, 0.1);
    if (this.stingBus) this.stingBus.gain.setTargetAtTime(this._stingGain(), this.ctx.currentTime, 0.1);
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
    const v = this.song.verb ?? { len: 2, decay: 3, send: 0.2 };
    this.verb.buffer = makeImpulse(c, v.len, v.decay, { tone: 0.4 });
    this.verbSend.gain.setValueAtTime(v.send, now);
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
      this._step = (this._step + 1) % 128;
    }
    this._updateAmbience();
  }

  _playStep(step, t, stepDur) {
    const S = this.song;
    const bar = (step / 16) | 0;
    const s = step % 16;
    const chord = S.chords[bar % S.chords.length];
    const root = chord[0];
    const partB = bar >= 4; // mesures 5 à 8 : variation
    const fill = bar === 7 && s >= 12; // fin du cycle : petit roulement

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
    const LS = partB && S.leadB ? { ...S.lead, ...S.leadB } : S.lead;
    if (LS && LS.steps.includes(s)) {
      const idx = LS.steps.indexOf(s);
      const n = chord[LS.pattern[idx % LS.pattern.length]] + (LS.octave ?? 0) + 12 + (partB && bar === 6 && idx === 0 ? 12 : 0);
      this._inst(LS.inst, mtof(n), t, stepDur * (LS.long ? 6 : 2));
    }
    // Couche d'intensité (passe par layerBus, dont le volume suit l'action)
    const Y = S.layer;
    if (Y && this.intensity > 0.02) {
      const dest = this.layerBus;
      if (Y.hat?.includes(s)) this._hat(t, 0.025, dest);
      if (Y.shaker?.includes(s)) this._shaker(t, dest);
      if (Y.kick?.includes(s)) this._kick(t, dest);
      if (Y.snare?.includes(s)) this._snare(t, dest);
      if (Y.tom?.includes(s)) this._tom(t, 0.5, dest);
      if (Y.counter?.steps.includes(s)) {
        const idx = Y.counter.steps.indexOf(s);
        this._inst(Y.counter.inst, mtof(chord[(idx + bar) % chord.length] + (Y.counter.octave ?? 0)), t, stepDur * 2, dest);
      }
    }
    if (fill) {
      if (S.drums?.tom || S.drums?.snare) this._tom(t, 0.35 + (s - 12) * 0.12);
      else this._shaker(t);
      if (s === 15) this._noise(t + stepDur * 0.9, 0.9, 0.025, 'highpass', 6000, 1, 0.01); // cymbale douce
      return;
    }
    const D = S.drums ?? {};
    if (D.kick?.includes(s)) this._kick(t);
    if (D.snare?.includes(s)) this._snare(t);
    if (D.hat?.includes(s)) this._hat(t, s % 4 === 0 ? 0.05 : 0.03);
    if (partB && D.kick && s === 14 && !D.kick.includes(14)) this._kick(t);
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

  _inst(name, f, t, dur, dest = this.bus) {
    switch (name) {
      case 'epiano':
        this._osc('sine', f, t, dur * 1.4, 0.05, 0.008, dest);
        this._osc('triangle', f * 2, t, dur * 0.5, 0.012, 0.004, dest);
        break;
      case 'pluck':
        this._osc('triangle', f, t, dur * 0.7, 0.045, 0.003, dest);
        break;
      case 'bell':
        this._osc('sine', f, t, dur * 3.5, 0.05, 0.002, dest);
        this._osc('sine', f * 2.76, t, dur * 1.2, 0.014, 0.002, dest);
        break;
      case 'brass': {
        const c = this.ctx;
        const f2 = c.createBiquadFilter();
        f2.type = 'lowpass';
        f2.frequency.setValueAtTime(400, t);
        f2.frequency.linearRampToValueAtTime(1400, t + 0.15);
        f2.connect(dest);
        this._osc('sawtooth', f, t, dur * 2.5, 0.035, 0.06, f2);
        this._osc('sawtooth', f, t, dur * 2.5, 0.025, 0.06, f2, 9);
        break;
      }
      case 'marimba':
        this._osc('sine', f, t, dur * 0.8, 0.06, 0.002, dest);
        this._osc('sine', f * 4, t, dur * 0.15, 0.012, 0.001, dest);
        break;
      case 'flute': {
        const o = this._osc('sine', f, t, dur, 0.035, 0.12, dest);
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
        this._osc('square', f, t, dur * 0.6, 0.012, 0.004, dest);
        this._osc('sine', f * 2, t, dur * 0.9, 0.012, 0.004, dest);
        break;
      default:
        this._osc('sine', f, t, dur, 0.04, 0.01, dest);
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

  _kick(t, dest = this.bus) {
    const c = this.ctx;
    const o = c.createOscillator();
    const g = c.createGain();
    o.frequency.setValueAtTime(130, t);
    o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
    this._env(g, t, 0.003, 0.2, 0.22);
    o.connect(g).connect(dest);
    o.start(t);
    o.stop(t + 0.3);
  }

  _tom(t, v, dest = this.bus) {
    const c = this.ctx;
    const o = c.createOscillator();
    const g = c.createGain();
    o.frequency.setValueAtTime(110, t);
    o.frequency.exponentialRampToValueAtTime(60, t + 0.25);
    this._env(g, t, 0.004, 0.16 * v, 0.35);
    o.connect(g).connect(dest);
    o.start(t);
    o.stop(t + 0.4);
    this._noise(t, 0.05, 0.04 * v, 'lowpass', 600, 1, 0.002, dest);
  }

  _snare(t, dest = this.bus) {
    this._noise(t, 0.16, 0.07, 'bandpass', 1800, 0.8, 0.002, dest);
    this._osc('triangle', 190, t, 0.08, 0.04, 0.002, dest);
  }

  _hat(t, v, dest = this.bus) {
    this._noise(t, 0.04, v, 'highpass', 7000, 1, 0.002, dest);
  }

  _shaker(t, dest = this.bus) {
    this._noise(t, 0.08, 0.025, 'highpass', 5000, 1, 0.03, dest);
  }

  // ─── Jingles (victoire, panier parfait, échec) ────────────────────────────

  /**
   * Jingle dans l'instrument et la tonalité du monde, sur le motif du rebond.
   * @param {'win'|'perfect'|'fail'} kind
   */
  stinger(kind, theme = this.theme) {
    if (!this._ensureBus() || this.ctx.state !== 'running' || this.volume <= 0) return;
    const S = SONGS[theme] ?? SONGS.city;
    const key = S.key ?? { root: 72, scale: 'major', inst: 'bell' };
    const minor = key.scale === 'minor';
    const c = this.ctx;
    const t0 = c.currentTime + 0.05;
    const dest = this.stingBus;
    if (kind === 'fail') {
      // Trois notes qui descendent, douces (jamais punitives)
      [7, 3, 0].forEach((o, i) => this._inst(key.inst, mtof(key.root - 12 + (minor ? o : [7, 4, 0][i])), t0 + i * 0.22, 0.5, dest));
      this._osc('sine', mtof(key.root - 36), t0 + 0.44, 1.2, 0.08, 0.02, dest);
      return;
    }
    // Victoire : motif du rebond (do mi sol do mi, ou mineur), accord final, cymbale
    const steps = minor ? [0, 3, 7, 12, 15] : [0, 4, 7, 12, 16];
    const span = kind === 'perfect' ? 1 : 1.15;
    BOUNCE_MOTIF.times.forEach((dt, i) => {
      const t = t0 + dt * span;
      this._inst(key.inst, mtof(key.root - 12 + steps[i]), t, i === 4 ? 1.2 : 0.4, dest);
      if (kind === 'perfect') this._inst('bell', mtof(key.root + steps[i]), t, i === 4 ? 1.4 : 0.4, dest);
    });
    const tEnd = t0 + BOUNCE_MOTIF.times[4] * span + 0.18;
    for (const o of minor ? [0, 3, 7, 12] : [0, 4, 7, 12]) this._osc('triangle', mtof(key.root - 12 + o), tEnd, 1.6, 0.03, 0.05, dest);
    this._osc('sine', mtof(key.root - 36), tEnd, 1.8, 0.12, 0.01, dest);
    this._kick(tEnd, dest);
    this._noise(tEnd, 1.4, 0.04, 'highpass', 6500, 1, 0.005, dest);
    if (kind === 'perfect') for (let i = 0; i < 8; i++) this._osc('sine', mtof(key.root + 12 + steps[i % 5]), tEnd + 0.1 + i * 0.07, 0.4, 0.012, 0.003, dest);
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
    const c = this.ctx;
    switch (theme) {
      case 'city':
        // Rumeur de la ville (circulation lointaine) + bourdonnement électrique des néons
        nodes.push(...this._loop(t, 'lowpass', 260, 0.6, 0.05, 0.07, 80));
        nodes.push(...this._loop(t, 'bandpass', 900, 0.7, 0.008, 0.05, 200));
        nodes.push(...this._hum(t, 120, 0.006, 'sawtooth', 380));
        break;
      case 'snow':
        // Vent froid en deux couches, qui souffle par vagues
        nodes.push(...this._loop(t, 'bandpass', 520, 1.4, 0.06, 0.11, 260));
        nodes.push(...this._loop(t, 'bandpass', 1400, 3, 0.015, 0.17, 500));
        break;
      case 'volcano':
        // Grondement profond + souffle de la chaleur
        nodes.push(...this._loop(t, 'lowpass', 110, 0.8, 0.14, 0.05, 40));
        nodes.push(...this._loop(t, 'bandpass', 380, 0.6, 0.02, 0.09, 120));
        break;
      case 'forest':
        // Feuillage + ruisseau qui murmure
        nodes.push(...this._loop(t, 'bandpass', 2400, 0.5, 0.018, 0.2, 400));
        nodes.push(...this._loop(t, 'bandpass', 900, 1.2, 0.022, 0.6, 260));
        break;
      case 'space':
        // Bourdon spatial, qui respire lentement, et harmoniques aiguës qui scintillent
        for (const [f, gain] of [[55, 0.05], [82.5, 0.03], [110.3, 0.018]]) {
          const o = c.createOscillator();
          const g = c.createGain();
          o.frequency.value = f;
          g.gain.value = gain;
          o.connect(g).connect(this.ambBus);
          o.start(t);
          nodes.push(o);
        }
        nodes.push(...this._hum(t, 1320, 0.004, 'sine', 4000, 0.13));
        break;
      default:
    }
    this._ambience = { theme, nodes, timers: {} };
    this._ambTimer = 0;
  }

  /** Son tenu discret (néons, harmoniques), dont le volume ondule lentement. */
  _hum(t, freq, gain, type, cutoff, wobble = 0.3) {
    const c = this.ctx;
    const o = c.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    const f = c.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = cutoff;
    const g = c.createGain();
    g.gain.value = gain;
    const lfo = c.createOscillator();
    const lg = c.createGain();
    lfo.frequency.value = wobble;
    lg.gain.value = gain * 0.6;
    lfo.connect(lg).connect(g.gain);
    o.connect(f).connect(g).connect(this.ambBus);
    o.start(t);
    lfo.start(t);
    return [o, lfo];
  }

  /** Bruit filtré qui passe (voiture, rafale, souffle) : fréquence, volume et position stéréo glissent. */
  _sweep(t, dur, peak, f0, f1, pan0 = 0, pan1 = 0, q = 1.2, type = 'bandpass') {
    const c = this.ctx;
    const src = c.createBufferSource();
    src.buffer = this.sfx._noise;
    src.loop = true;
    const f = c.createBiquadFilter();
    f.type = type;
    f.Q.value = q;
    f.frequency.setValueAtTime(f0, t);
    f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + dur * 0.5);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let node = src.connect(f).connect(g);
    if (c.createStereoPanner) {
      const p = c.createStereoPanner();
      p.pan.setValueAtTime(pan0, t);
      p.pan.linearRampToValueAtTime(pan1, t + dur);
      node = node.connect(p);
    }
    node.connect(this.ambBus);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.05);
  }

  /** Glissando de hauteur (sirène, oiseau, bulle de lave). */
  _glide(type, f0, f1, t, dur, peak, dest = this.ambBus) {
    const c = this.ctx;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    this._env(g, t, Math.min(0.03, dur * 0.3), peak, dur);
    o.connect(g).connect(dest);
    o.start(t);
    o.stop(t + dur + 0.1);
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

  /**
   * Petits sons ponctuels d'ambiance, chacun avec son propre rythme aléatoire : on reconnaît le
   * monde les yeux fermés (voitures, klaxons et sirène en ville ; rafales et craquements de glace
   * à la montagne ; éruptions, bulles et crépitements au volcan ; oiseaux, coucou et pic-vert en
   * forêt ; bips radio et souffles dans l'espace).
   */
  _updateAmbience() {
    const a = this._ambience;
    if (!a) return;
    const c = this.ctx;
    const now = c.currentTime;
    const events = AMBIENT_EVENTS[a.theme];
    if (!events) return;
    for (const [name, min, max, play] of events) {
      const due = a.timers[name] ?? now + min * Math.random();
      if (a.timers[name] === undefined) {
        a.timers[name] = due;
        continue;
      }
      if (now < due) continue;
      play.call(this, now + 0.05, c);
      a.timers[name] = now + min + Math.random() * (max - min);
    }
  }
}

const rnd = (a, b) => a + Math.random() * (b - a);

// [nom, intervalle min (s), intervalle max (s), son]
const AMBIENT_EVENTS = {
  city: [
    // Voiture qui passe d'un côté à l'autre (effet Doppler)
    ['car', 3, 8, function (t) {
      const dir = Math.random() < 0.5 ? -1 : 1;
      const d = rnd(1.6, 2.6);
      this._sweep(t, d, rnd(0.02, 0.035), rnd(500, 700), rnd(260, 360), -0.9 * dir, 0.9 * dir, 1.6);
    }],
    ['horn', 9, 20, function (t) {
      const f = rnd(320, 400);
      this._osc('sawtooth', f, t, 0.3, 0.005, 0.04, this.ambBus);
      if (Math.random() < 0.5) this._osc('sawtooth', f, t + 0.42, 0.18, 0.004, 0.03, this.ambBus);
    }],
    ['siren', 28, 50, function (t) {
      for (let i = 0; i < 4; i++) {
        this._glide('triangle', 700, 980, t + i * 0.9, 0.45, 0.004);
        this._glide('triangle', 980, 700, t + i * 0.9 + 0.45, 0.45, 0.004);
      }
    }],
    // Terrain de basket au loin : quelques dribbles qui résonnent entre les immeubles, un crissement de basket
    ['court', 12, 26, function (t) {
      const n = 3 + ((Math.random() * 4) | 0);
      let tt = t;
      for (let i = 0; i < n; i++) {
        this._glide('sine', 150, 70, tt, 0.12, 0.022);
        this._noise(tt, 0.03, 0.008, 'bandpass', 1800, 1, 0.001, this.ambBus);
        tt += rnd(0.38, 0.5);
      }
      if (Math.random() < 0.6) this._glide('sine', rnd(2400, 3000), rnd(3200, 3800), tt + 0.1, 0.08, 0.004);
    }],
    // Train qui passe au loin : grondement et cliquetis des rails
    ['train', 35, 70, function (t) {
      this._sweep(t, 6, 0.03, 160, 220, -0.7, 0.7, 0.7, 'lowpass');
      for (let i = 0; i < 14; i++) this._noise(t + 1.2 + i * 0.26 + (i % 2) * 0.08, 0.03, 0.006, 'bandpass', 900, 3, 0.002, this.ambBus);
    }],
    // Grésillement d'un néon
    ['neon', 4, 10, function (t) {
      for (let i = 0; i < 3; i++) this._noise(t + i * 0.05, 0.03, 0.006, 'bandpass', 3200, 4, 0.001, this.ambBus);
    }],
  ],
  snow: [
    ['gust', 4, 9, function (t) {
      this._sweep(t, rnd(2, 3.4), rnd(0.03, 0.05), rnd(700, 1000), rnd(1600, 2400), rnd(-0.6, 0), rnd(0, 0.6), 4);
    }],
    ['chime', 1.5, 4.5, function (t) {
      this._osc('sine', rnd(2600, 4100), t, 0.5, 0.006, 0.003, this.ambBus);
    }],
    // Le vent siffle sur les crêtes
    ['whistle', 7, 15, function (t) {
      const f = rnd(900, 1300);
      this._glide('sine', f, f * rnd(1.15, 1.4), t, rnd(1.2, 2), 0.006);
      this._sweep(t, 2, 0.012, f * 2, f * 2.6, rnd(-0.5, 0.5), rnd(-0.5, 0.5), 8);
    }],
    // Avalanche très lointaine
    ['avalanche', 45, 80, function (t) {
      this._sweep(t, 4, 0.04, 140, 90, -0.3, 0.3, 0.7, 'lowpass');
      this.onAmbient?.('rumble', 0.25);
    }],
    // Craquement lointain de la glace
    ['creak', 12, 24, function (t) {
      this._glide('sawtooth', rnd(90, 120), rnd(60, 80), t, 0.5, 0.006);
      this._noise(t, 0.4, 0.012, 'lowpass', 300, 2, 0.02, this.ambBus);
    }],
  ],
  volcano: [
    ['crackle', 0.15, 1, function (t) {
      this._noise(t, 0.03, 0.03, 'highpass', 3000, 1, 0.001, this.ambBus);
    }],
    // Bulle de lave qui éclate
    ['bubble', 1.5, 4, function (t) {
      this._glide('sine', rnd(180, 260), rnd(60, 90), t, 0.18, 0.03);
    }],
    // Lave épaisse qui glougloute
    ['gloop', 2, 5, function (t) {
      const n = 1 + ((Math.random() * 3) | 0);
      for (let i = 0; i < n; i++) this._glide('sine', rnd(90, 140), rnd(45, 60), t + i * rnd(0.12, 0.2), 0.22, 0.04);
      this._noise(t, 0.2, 0.012, 'lowpass', 400, 2, 0.01, this.ambBus);
    }],
    // Éruption lointaine : boum sourd (l'image tremble un peu, des cendres tombent)
    ['boom', 14, 26, function (t) {
      this._glide('sine', 70, 32, t, 1.6, 0.09);
      this._noise(t, 1.4, 0.05, 'lowpass', 180, 1, 0.05, this.ambBus);
      this.onAmbient?.('rumble', 0.5);
    }],
  ],
  forest: [
    ['bird', 2, 5, function (t, c) {
      const base = rnd(2200, 3800);
      const n = 2 + ((Math.random() * 3) | 0);
      for (let i = 0; i < n; i++) this._glide('sine', base, base * 1.35, t + i * 0.11, 0.07, 0.018);
    }],
    ['cuckoo', 16, 30, function (t) {
      this._osc('sine', 660, t, 0.3, 0.02, 0.02, this.ambBus);
      this._osc('sine', 528, t + 0.38, 0.4, 0.02, 0.02, this.ambBus);
    }],
    ['woodpecker', 18, 34, function (t) {
      for (let i = 0; i < 9; i++) this._noise(t + i * 0.055, 0.02, 0.018, 'bandpass', 1500, 6, 0.001, this.ambBus);
    }],
    ['breeze', 6, 12, function (t) {
      this._sweep(t, rnd(2.5, 4), 0.012, 1800, 3200, -0.5, 0.5, 0.8);
    }],
    // Grillons : petites trilles aiguës
    ['crickets', 1.2, 3, function (t) {
      const f = rnd(4200, 4800);
      for (let i = 0; i < 4; i++) this._osc('sine', f, t + i * 0.045, 0.025, 0.0035, 0.004, this.ambBus);
    }],
    // Grenouille près de la rivière
    ['frog', 10, 22, function (t) {
      for (let i = 0; i < 2; i++) this._glide('triangle', rnd(150, 180), rnd(110, 130), t + i * 0.28, 0.16, 0.012);
    }],
  ],
  space: [
    ['beep', 2.5, 6.5, function (t) {
      this._osc('sine', rnd(1200, 3000), t, 1.6, 0.005, 0.4, this.ambBus);
    }],
    // Message radio : courte suite de bips carrés
    ['radio', 10, 20, function (t) {
      const n = 3 + ((Math.random() * 4) | 0);
      for (let i = 0; i < n; i++) this._osc('square', Math.random() < 0.5 ? 1760 : 2350, t + i * 0.09, 0.04, 0.003, 0.002, this.ambBus);
    }],
    ['whoosh', 8, 16, function (t) {
      this._sweep(t, rnd(3, 5), 0.02, 200, 1200, rnd(-0.8, 0.8), rnd(-0.8, 0.8), 2, 'lowpass');
    }],
    // Pulsar : battements réguliers qui s'éloignent
    ['pulsar', 16, 28, function (t) {
      const f = rnd(300, 500);
      for (let i = 0; i < 6; i++) this._osc('sine', f, t + i * 0.42, 0.25, 0.012 * (1 - i / 7), 0.02, this.ambBus);
    }],
    // Scintillement cosmique : accord de cristal très haut
    ['shimmer', 7, 14, function (t) {
      for (const [k, m] of [[0, 1], [0.12, 1.5], [0.24, 2]]) this._osc('sine', 1046.5 * m, t + k, 1.4, 0.004, 0.3, this.ambBus);
    }],
  ],
};
