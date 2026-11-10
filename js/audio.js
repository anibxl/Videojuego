/* =========================================================
   Sonido sintetizado con Web Audio (sin archivos externos)
   ========================================================= */
(function () {
  'use strict';

  let ctx = null;
  let master = null;
  let enabled = true;
  let scratchGain = null;
  let scratchFilter = null;

  function ensure() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = enabled ? 0.6 : 0;
    master.connect(ctx.destination);
    setupScratch();
    return ctx;
  }

  function setupScratch() {
    // Ruido blanco en bucle -> paso banda -> ganancia controlada por la velocidad del dedo.
    const len = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (0.6 + 0.4 * Math.random());
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    scratchFilter = ctx.createBiquadFilter();
    scratchFilter.type = 'bandpass';
    scratchFilter.frequency.value = 3200;
    scratchFilter.Q.value = 0.9;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 900;
    scratchGain = ctx.createGain();
    scratchGain.gain.value = 0;
    src.connect(scratchFilter).connect(hp).connect(scratchGain).connect(master);
    src.start();
  }

  function tone(freq, start, dur, type, vol, slideTo) {
    if (!ensure()) return;
    const t0 = ctx.currentTime + (start || 0);
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol || 0.2, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(master);
    o.start(t0);
    o.stop(t0 + dur + 0.05);
  }

  const N = (semi) => 440 * Math.pow(2, semi / 12); // semitonos respecto a La4

  const Sound = {
    unlock: ensure,
    setEnabled(v) {
      enabled = v;
      if (master) master.gain.value = v ? 0.6 : 0;
    },
    isEnabled: () => enabled,

    click() { tone(880, 0, 0.06, 'triangle', 0.12); },
    error() { tone(220, 0, 0.12, 'square', 0.08); tone(180, 0.1, 0.18, 'square', 0.08); },

    buy() {
      tone(N(19), 0, 0.08, 'square', 0.08);
      tone(N(24), 0.07, 0.25, 'square', 0.08);
      tone(N(31), 0.07, 0.25, 'triangle', 0.06);
    },

    scratch(speed) {
      if (!ensure() || !scratchGain) return;
      const now = ctx.currentTime;
      const v = Math.min(0.35, 0.05 + speed * 0.012);
      scratchGain.gain.cancelScheduledValues(now);
      scratchGain.gain.setTargetAtTime(v, now, 0.015);
      scratchFilter.frequency.setTargetAtTime(2400 + Math.min(speed, 60) * 40, now, 0.03);
    },
    scratchStop() {
      if (!ctx || !scratchGain) return;
      scratchGain.gain.cancelScheduledValues(ctx.currentTime);
      scratchGain.gain.setTargetAtTime(0, ctx.currentTime, 0.04);
    },

    reveal(i) { tone(N(12 + (i % 12)), 0, 0.09, 'triangle', 0.09); },

    match() { tone(N(24), 0, 0.12, 'sine', 0.15); tone(N(28), 0.08, 0.12, 'sine', 0.15); tone(N(31), 0.16, 0.25, 'sine', 0.15); },

    lose() { tone(N(7), 0, 0.18, 'triangle', 0.1); tone(N(2), 0.16, 0.32, 'triangle', 0.1); },

    win() {
      [0, 4, 7, 12].forEach((s, i) => tone(N(12 + s), i * 0.08, 0.22, 'square', 0.07));
      coinShower(6, 0.35);
    },

    bigWin() {
      const seq = [0, 4, 7, 12, 7, 12, 16, 19];
      seq.forEach((s, i) => tone(N(12 + s), i * 0.1, 0.3, 'square', 0.07));
      seq.forEach((s, i) => tone(N(s), i * 0.1, 0.3, 'triangle', 0.06));
      coinShower(18, 0.8);
    },

    jackpot() {
      const seq = [0, 4, 7, 12, 16, 19, 24, 19, 24, 28, 31, 36];
      seq.forEach((s, i) => tone(N(7 + s), i * 0.11, 0.35, 'sawtooth', 0.05));
      seq.forEach((s, i) => tone(N(s - 5), i * 0.11, 0.35, 'triangle', 0.07));
      tone(N(-12), 0, 1.6, 'sine', 0.2, N(0));
      coinShower(40, 1.4);
    },

    levelUp() {
      [0, 5, 9, 12, 17, 21, 24].forEach((s, i) => tone(N(12 + s), i * 0.07, 0.3, 'triangle', 0.1));
    },

    /** Sonido propio de cada acontecimiento raro (nivel 0-3). */
    rare(level) {
      if (!ensure()) return;
      if (level === 0) { // estrella fugaz: destellos brillantes
        [24, 28, 31, 36, 40, 43, 48].forEach((s, i) => tone(N(s), i * 0.07, 0.4, 'sine', 0.09));
        tone(N(19), 0, 1.2, 'triangle', 0.05, N(43));
      } else if (level === 1) { // lluvia de oro: cascada de monedas y fanfarria
        coinShower(50, 0.1);
        [0, 4, 7, 12, 16, 19, 24].forEach((s, i) => tone(N(12 + s), 0.3 + i * 0.12, 0.4, 'square', 0.06));
      } else if (level === 2) { // supernova: silencio, estallido grave y acorde
        noise(0.9, 1.2, 0.35);
        tone(N(-24), 0.85, 2.2, 'sine', 0.35, N(-36));
        [0, 4, 7, 11, 14].forEach((s, i) => tone(N(s), 1.2 + i * 0.05, 2.5, 'sawtooth', 0.04));
        [12, 16, 19, 24].forEach((s, i) => tone(N(s), 1.6 + i * 0.18, 0.6, 'triangle', 0.08));
      } else { // big bang: subida larga, explosión y fanfarria extendida
        tone(N(-24), 0, 4.2, 'sawtooth', 0.06, N(24));
        tone(N(-12), 0, 4.2, 'sine', 0.08, N(36));
        noise(4.2, 2.0, 0.5);
        tone(N(-36), 4.2, 3, 'sine', 0.4, N(-48));
        const seq = [0, 4, 7, 12, 16, 19, 24, 28, 31, 36];
        seq.forEach((s, i) => tone(N(s), 4.6 + i * 0.14, 0.9, 'square', 0.05));
        seq.forEach((s, i) => tone(N(s - 12), 4.6 + i * 0.14, 0.9, 'triangle', 0.07));
        coinShower(60, 5);
      }
    },

    achievement() {
      tone(N(24), 0, 0.15, 'sine', 0.12);
      tone(N(31), 0.12, 0.15, 'sine', 0.12);
      tone(N(36), 0.24, 0.4, 'sine', 0.12);
    },
  };

  /** Ráfaga de ruido que se apaga (explosiones). */
  function noise(start, dur, vol) {
    if (!ensure()) return;
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 1200;
    const g = ctx.createGain();
    g.gain.value = vol;
    src.connect(f).connect(g).connect(master);
    src.start(ctx.currentTime + start);
  }

  function coinShower(n, start) {
    for (let i = 0; i < n; i++) {
      const f = 1800 + Math.random() * 1600;
      tone(f, start + i * 0.06 + Math.random() * 0.04, 0.12, 'square', 0.03, f * 1.2);
    }
  }

  window.Sound = Sound;
})();
