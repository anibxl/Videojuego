#!/usr/bin/env python3
"""Generates every CLEAN RUSH sound effect and the music loop procedurally.

All audio is original (pure synthesis, no samples), so it is free to ship.
Usage:  python3 tools/gen_audio.py   (writes assets/audio/*.wav)
"""
import os
import wave
import numpy as np

SR = 22050
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "assets", "audio")
rng = np.random.default_rng(1234)


def t_axis(dur):
    return np.arange(int(SR * dur)) / SR


def lowpass(x, cutoff):
    """One-pole low-pass (cutoff may be an array for sweeps)."""
    cutoff = np.broadcast_to(np.asarray(cutoff, dtype=float), x.shape)
    a = np.exp(-2 * np.pi * cutoff / SR)
    y = np.zeros_like(x)
    acc = 0.0
    for i in range(len(x)):
        acc = (1 - a[i]) * x[i] + a[i] * acc
        y[i] = acc
    return y


def highpass(x, cutoff):
    return x - lowpass(x, cutoff)


def bandpass(x, lo, hi):
    return lowpass(highpass(x, lo), hi)


def env(n, attack=0.01, release=0.1, dur=None):
    total = n / SR
    t = np.arange(n) / SR
    e = np.ones(n)
    a = max(attack, 1e-4)
    e = np.minimum(e, t / a)
    r = max(release, 1e-4)
    e = np.minimum(e, (total - t) / r)
    return np.clip(e, 0, 1)


def exp_decay(n, tau):
    return np.exp(-np.arange(n) / SR / tau)


def make_loop(x, fade=0.15):
    """Crossfade the tail into the head so the sound loops seamlessly."""
    f = int(SR * fade)
    head = x[:f].copy()
    tail = x[-f:].copy()
    ramp = np.linspace(0, 1, f)
    out = x[:-f].copy()
    out[:f] = head * ramp + tail * (1 - ramp)
    return out


def norm(x, peak=0.8):
    m = np.max(np.abs(x)) + 1e-9
    return x / m * peak


def save(name, x, peak=0.8):
    os.makedirs(OUT, exist_ok=True)
    x = norm(x, peak)
    data = (np.clip(x, -1, 1) * 32767).astype(np.int16)
    with wave.open(os.path.join(OUT, name + ".wav"), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(data.tobytes())
    print("wrote", name, f"{len(data) / SR:.2f}s")


def noise(dur):
    return rng.uniform(-1, 1, int(SR * dur))


def tone(freq, dur, kind="sine"):
    t = t_axis(dur)
    ph = 2 * np.pi * np.cumsum(np.broadcast_to(freq, t.shape)) / SR
    if kind == "sine":
        return np.sin(ph)
    if kind == "tri":
        return 2 / np.pi * np.arcsin(np.sin(ph))
    if kind == "saw":
        return 2 * ((ph / (2 * np.pi)) % 1.0) - 1
    if kind == "square":
        return np.sign(np.sin(ph))
    return np.sin(ph)


# ------------------------------------------------------------------ loops ---

def gen_washer():
    d = 2.2
    n = noise(d)
    hiss = bandpass(n, 1800, 7000) * 0.9
    t = t_axis(d)
    motor = (np.sin(2 * np.pi * 95 * t) * 0.25 + np.sin(2 * np.pi * 190 * t) * 0.12) * (1 + 0.15 * np.sin(2 * np.pi * 9 * t))
    flutter = 1 + 0.12 * lowpass(noise(d), 12) * 8
    save("washer", make_loop(hiss * flutter + motor), 0.6)


def gen_blower():
    d = 2.2
    t = t_axis(d)
    whoosh = bandpass(noise(d), 250, 2500)
    buzz = sum(np.sin(2 * np.pi * 118 * k * t) / k for k in range(1, 6)) * 0.22
    wob = 1 + 0.2 * np.sin(2 * np.pi * 3.1 * t)
    save("blower", make_loop(whoosh * wob + buzz), 0.6)


def gen_vacuum():
    d = 2.2
    t = t_axis(d)
    hum = sum(np.sin(2 * np.pi * 160 * k * t) / (k * k) for k in range(1, 6)) * 0.4
    whine = np.sin(2 * np.pi * 1320 * t) * 0.05
    air = bandpass(noise(d), 600, 4000) * 0.6
    save("vacuum", make_loop(hum + whine + air), 0.55)


def gen_foam():
    d = 2.2
    hiss = bandpass(noise(d), 1200, 5000) * 0.5
    bubbles = np.zeros(int(SR * d))
    for _ in range(60):
        start = rng.integers(0, len(bubbles) - 2000)
        f = rng.uniform(500, 1400)
        ln = int(SR * rng.uniform(0.02, 0.06))
        bt = np.arange(ln) / SR
        bubbles[start:start + ln] += np.sin(2 * np.pi * (f + 4000 * bt) * bt) * np.exp(-bt / 0.015) * 0.6
    save("foam", make_loop(hiss + bubbles), 0.55)


def gen_scrubber():
    d = 2.0
    t = t_axis(d)
    brush = bandpass(noise(d), 900, 6000) * (0.55 + 0.45 * np.sin(2 * np.pi * 8 * t) ** 2)
    motor = np.sin(2 * np.pi * 70 * t) * 0.2
    save("scrubber", make_loop(brush + motor), 0.55)


def gen_polisher():
    d = 2.0
    t = t_axis(d)
    whir = (np.sin(2 * np.pi * 210 * t) + 0.5 * np.sin(2 * np.pi * 420 * t)) * (1 + 0.3 * np.sin(2 * np.pi * 6 * t)) * 0.3
    pad = bandpass(noise(d), 300, 1500) * 0.4
    save("polisher", make_loop(whir + pad), 0.55)


# -------------------------------------------------------------- one-shots ---

def gen_scratch(name, lo, hi, dur, strokes):
    x = np.zeros(int(SR * dur))
    for s in range(strokes):
        start = int(len(x) * s / strokes)
        ln = int(len(x) / strokes)
        seg = bandpass(noise(ln / SR), lo, hi) * np.sin(np.linspace(0, np.pi, ln)) ** 2
        x[start:start + ln] += seg[: len(x) - start]
    save(name, x, 0.5)


def gen_sponge():
    d = 0.35
    t = t_axis(d)
    squeak = np.sin(2 * np.pi * (900 + 500 * np.sin(2 * np.pi * 5 * t)) * t) * env(len(t), 0.03, 0.15) * 0.3
    squish = bandpass(noise(d), 400, 3000) * exp_decay(len(t), 0.12)
    save("sponge", squeak + squish, 0.45)


def gen_pop():
    d = 0.12
    t = t_axis(d)
    f = 700 * np.exp(-t * 18) + 300
    save("pop", tone(f, d) * exp_decay(len(t), 0.03), 0.5)


def gen_coin():
    d = 0.45
    t = t_axis(d)
    a = np.sin(2 * np.pi * 1318 * t) * (t < 0.08)
    b = np.sin(2 * np.pi * 1760 * t) * (t >= 0.08)
    shimmer = np.sin(2 * np.pi * 3520 * t) * 0.2
    save("coin", (a + b + shimmer) * exp_decay(len(t), 0.15) * env(len(t), 0.002, 0.05), 0.55)


def gen_click():
    d = 0.06
    t = t_axis(d)
    save("ui_click", tone(1100 - 4000 * t, d, "tri") * exp_decay(len(t), 0.015), 0.45)
    d = 0.09
    t = t_axis(d)
    save("ui_back", tone(700 - 2500 * t, d, "tri") * exp_decay(len(t), 0.025), 0.45)


def note_hz(semitone_from_a4):
    return 440.0 * 2 ** (semitone_from_a4 / 12)


def pluck(freq, dur, bright=1.0):
    t = t_axis(dur)
    x = np.sin(2 * np.pi * freq * t) + 0.35 * bright * np.sin(4 * np.pi * freq * t) + 0.12 * bright * np.sin(6 * np.pi * freq * t)
    return x * exp_decay(len(t), dur * 0.35) * env(len(t), 0.004, 0.05)


def seq(notes, step, tail=0.5, bright=1.0):
    total = step * len(notes) + tail
    x = np.zeros(int(SR * total))
    for i, n in enumerate(notes):
        if n is None:
            continue
        p = pluck(note_hz(n), step + tail, bright)
        s = int(SR * step * i)
        x[s:s + len(p)] += p[: len(x) - s]
    return x


def mix(*parts):
    n = max(len(p) for p in parts)
    out = np.zeros(n)
    for p in parts:
        out[: len(p)] += p
    return out


def gen_jingles():
    save("complete", mix(seq([3, 7, 10, 15, 19, 22, 27], 0.09, 0.9), 0.6 * seq([None] * 4 + [3, 10, 15], 0.09, 1.0, 0.5)), 0.6)
    save("star", seq([15, 22, 27], 0.07, 0.5), 0.5)
    save("discovery", seq([10, 14, 17, 22, 26, 29], 0.05, 0.6, 1.4), 0.5)
    save("achievement", seq([5, 9, 12, 17, 12, 17, 21], 0.08, 0.8), 0.55)
    save("level_up", seq([0, 4, 7, 12, 16, 19, 24], 0.06, 0.9), 0.55)
    save("surface_done", seq([19, 26], 0.06, 0.5, 1.6), 0.45)
    save("purchase", mix(seq([12, 19, 24], 0.06, 0.4), 0.5 * bandpass(noise(0.6), 3000, 8000) * exp_decay(int(SR * 0.6), 0.05)), 0.55)
    d = 0.25
    t = t_axis(d)
    save("error", (tone(140, d, "square") * 0.4 + tone(147, d, "square") * 0.4) * env(len(t), 0.005, 0.08), 0.35)


def gen_misc():
    d = 0.5
    rustle = bandpass(noise(d), 800, 5000) * env(int(SR * d), 0.02, 0.3)
    thump = tone(90 * np.exp(-t_axis(d) * 6) + 40, d) * exp_decay(int(SR * d), 0.08)
    save("empty_bag", rustle * 0.6 + thump, 0.55)
    d = 0.4
    splash = bandpass(noise(d), 500, 6000) * exp_decay(int(SR * d), 0.08)
    save("splash", splash, 0.45)
    d = 0.3
    save("footstep", bandpass(noise(d), 200, 1500) * exp_decay(int(SR * d), 0.03), 0.3)


# ------------------------------------------------------------------ music ---

def gen_music():
    bpm = 92
    beat = 60 / bpm
    bars = 8
    total = beat * 4 * bars
    n = int(SR * total)
    out = np.zeros(n)
    # Chords as semitones from A4 (C major-ish, relaxing): Cmaj7, Am7, Fmaj7, G6
    chords = [[-9, -5, -2, 2], [-12, -9, -5, -2], [-16, -12, -9, -5], [-14, -10, -7, -5]]
    for bar in range(bars):
        ch = chords[bar % 4]
        start = int(SR * bar * 4 * beat)
        dur = 4 * beat
        t = t_axis(dur)
        pad = np.zeros(len(t))
        for s in ch:
            f = note_hz(s)
            pad += np.sin(2 * np.pi * f * t) + 0.3 * np.sin(2 * np.pi * f * 1.003 * t) + 0.15 * np.sin(4 * np.pi * f * t)
        pad *= env(len(t), 0.4, 0.6) * 0.09
        out[start:start + len(pad)] += pad[: n - start]
        # bass
        bass_f = note_hz(ch[0] - 12)
        for b in [0, 2.5]:
            bs = start + int(SR * b * beat)
            bl = int(SR * beat * 1.4)
            bt = np.arange(bl) / SR
            bnote = np.sin(2 * np.pi * bass_f * bt) * exp_decay(bl, 0.5) * env(bl, 0.01, 0.1) * 0.22
            out[bs:bs + bl] += bnote[: max(0, min(bl, n - bs))]
    # melody: pentatonic plucks, seeded
    scale = [3, 5, 7, 10, 12, 15, 17, 19]
    mrng = np.random.default_rng(7)
    step = beat / 2
    idx = 3
    for i in range(int(total / step)):
        if mrng.random() < 0.42:
            idx = int(np.clip(idx + mrng.integers(-2, 3), 0, len(scale) - 1))
            p = pluck(note_hz(scale[idx]), 1.0, 0.7) * 0.16
            s = int(SR * i * step)
            ln = min(len(p), n - s)
            out[s:s + ln] += p[:ln]
            if s + len(p) > n:  # wrap tail for seamless loop
                out[: s + len(p) - n] += p[ln:]
    # soft percussion: shaker on off-beats, kick on 1 and 3
    for i in range(int(total / beat)):
        s = int(SR * i * beat)
        kl = int(SR * 0.25)
        kt = np.arange(kl) / SR
        kick = np.sin(2 * np.pi * (50 + 80 * np.exp(-kt * 30)) * kt) * exp_decay(kl, 0.08) * 0.25
        if i % 2 == 0:
            out[s:s + kl] += kick[: n - s]
        hs = s + int(SR * beat / 2)
        hl = int(SR * 0.06)
        if hs + hl < n:
            out[hs:hs + hl] += highpass(noise(0.06), 5000) * exp_decay(hl, 0.015) * 0.08
    save("music_garden", out, 0.5)


if __name__ == "__main__":
    gen_washer()
    gen_blower()
    gen_vacuum()
    gen_foam()
    gen_scrubber()
    gen_polisher()
    gen_scratch("rake", 1200, 6000, 0.5, 2)
    gen_scratch("broom", 600, 4000, 0.45, 1)
    gen_scratch("net", 300, 2500, 0.45, 1)
    gen_scratch("picker", 1500, 7000, 0.18, 1)
    gen_sponge()
    gen_pop()
    gen_coin()
    gen_click()
    gen_jingles()
    gen_misc()
    gen_music()
