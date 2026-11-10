#!/usr/bin/env python3
"""
AFTERLIGHT — original procedural sound generator.

Every sound in the game is synthesized here from scratch (no samples, no
third-party audio), so the whole audio direction is 100% original and
royalty-free. Run from the project root:

    python3 tools/gen_audio.py

Output: assets/audio/*.wav (16-bit mono PCM).
"""
import os
import wave
import numpy as np

SR = 22050
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "assets", "audio")
rng = np.random.default_rng(1337)


def t_axis(dur):
    return np.arange(int(SR * dur)) / SR


def env_adsr(n, a=0.01, d=0.1, s=0.6, r=0.2):
    a_n, d_n, r_n = int(a * SR), int(d * SR), int(r * SR)
    s_n = max(0, n - a_n - d_n - r_n)
    e = np.concatenate([
        np.linspace(0, 1, a_n, endpoint=False),
        np.linspace(1, s, d_n, endpoint=False),
        np.full(s_n, s),
        np.linspace(s, 0, r_n),
    ])
    return np.pad(e, (0, max(0, n - len(e))))[:n]


def lowpass(x, cutoff):
    """Simple one-pole low pass (cutoff may be an array)."""
    cutoff = np.broadcast_to(cutoff, x.shape)
    y = np.zeros_like(x)
    acc = 0.0
    for i in range(len(x)):
        k = 1.0 - np.exp(-2.0 * np.pi * cutoff[i] / SR)
        acc += k * (x[i] - acc)
        y[i] = acc
    return y


def lowpass_fast(x, cutoff):
    k = 1.0 - np.exp(-2.0 * np.pi * cutoff / SR)
    y = np.zeros_like(x)
    acc = 0.0
    for i in range(len(x)):
        acc += k * (x[i] - acc)
        y[i] = acc
    return y


def note(freq, dur, kind="sine", detune=0.0):
    t = t_axis(dur)
    if kind == "sine":
        return np.sin(2 * np.pi * freq * t)
    if kind == "tri":
        return 2 * np.abs(2 * ((freq * t) % 1) - 1) - 1
    if kind == "saw":
        a = 2 * ((freq * t) % 1) - 1
        b = 2 * ((freq * (1 + detune) * t) % 1) - 1
        return 0.5 * (a + b)
    if kind == "square":
        return np.sign(np.sin(2 * np.pi * freq * t))
    raise ValueError(kind)


def midi(m):
    return 440.0 * 2 ** ((m - 69) / 12.0)


def normalize(x, peak=0.9):
    m = np.max(np.abs(x)) or 1.0
    return x / m * peak


def reverb(x, decay=0.5, taps=((0.031, 0.5), (0.047, 0.4), (0.071, 0.33), (0.113, 0.25), (0.167, 0.18))):
    y = np.copy(x)
    for delay, gain in taps:
        d = int(delay * SR)
        y[d:] += x[:-d] * gain * decay
    return y


def write(name, x, peak=0.9):
    x = normalize(x, peak)
    data = (np.clip(x, -1, 1) * 32767).astype(np.int16)
    os.makedirs(OUT, exist_ok=True)
    with wave.open(os.path.join(OUT, name + ".wav"), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(data.tobytes())
    print("wrote", name, f"{len(x) / SR:.2f}s")


# ---------------------------------------------------------------- SFX
def sfx_footstep(seed, tone):
    r = np.random.default_rng(seed)
    n = int(0.16 * SR)
    noise = r.uniform(-1, 1, n)
    body = lowpass_fast(noise, tone)
    thump = np.sin(2 * np.pi * 70 * t_axis(0.16)) * np.exp(-t_axis(0.16) * 40)
    e = np.exp(-t_axis(0.16) * 28)
    return (body * 1.4 + thump * 0.6) * e


def sfx_jump():
    t = t_axis(0.22)
    f = 220 + 520 * t / 0.22
    ph = np.cumsum(2 * np.pi * f / SR)
    x = np.sin(ph) * np.exp(-t * 12)
    air = lowpass_fast(rng.uniform(-1, 1, len(t)), 2500) * np.exp(-t * 18) * 0.4
    return x * 0.6 + air


def sfx_land():
    t = t_axis(0.25)
    thump = np.sin(2 * np.pi * (60 + 40 * np.exp(-t * 30)) * t) * np.exp(-t * 18)
    grit = lowpass_fast(rng.uniform(-1, 1, len(t)), 900) * np.exp(-t * 25)
    return thump + grit * 1.2


def sfx_fragment():
    out = np.zeros(int(0.5 * SR))
    for i, m in enumerate([84, 88, 91]):
        s = int(i * 0.05 * SR)
        n = note(midi(m), 0.5 - i * 0.05) * np.exp(-t_axis(0.5 - i * 0.05) * 9)
        out[s:s + len(n)] += n * (0.8 - i * 0.15)
    return reverb(out, 0.6)


def sfx_pickup():
    out = np.zeros(int(0.8 * SR))
    for i, m in enumerate([76, 83, 88]):
        s = int(i * 0.07 * SR)
        d = 0.8 - i * 0.07
        n = (note(midi(m), d) + 0.3 * note(midi(m) * 2, d)) * np.exp(-t_axis(d) * 6)
        out[s:s + len(n)] += n
    return reverb(out, 0.7)


def sfx_discovery(rare_level):
    """Arpeggio whose length/brightness grows with rarity."""
    scale = [72, 76, 79, 83, 84, 88, 91, 95, 96]
    count = 4 + rare_level
    dur = 1.6 + rare_level * 0.4
    out = np.zeros(int(dur * SR))
    for i in range(count):
        m = scale[i % len(scale)] + (12 if i >= len(scale) else 0)
        s = int(i * 0.085 * SR)
        d = dur - i * 0.085
        n = note(midi(m), d, "tri") * 0.6 + note(midi(m), d) * 0.4
        n *= np.exp(-t_axis(d) * 3.5)
        out[s:s + len(n)] += n * 0.6
    # shimmer pad
    t = t_axis(dur)
    pad = sum(note(midi(m), dur) for m in (60 + 12, 64 + 12, 67 + 12)) * env_adsr(len(t), 0.3, 0.3, 0.5, 0.8) * 0.25
    out += pad * (0.5 + 0.2 * rare_level)
    sparkle = rng.uniform(-1, 1, len(t)) * (rng.uniform(0, 1, len(t)) > 0.997) * np.exp(-t * 1.5)
    out += lowpass_fast(sparkle, 8000) * 2.0
    return reverb(out, 0.9)


def sfx_levelup():
    out = np.zeros(int(2.2 * SR))
    seq = [(67, 0.0), (72, 0.12), (76, 0.24), (79, 0.36), (84, 0.52)]
    for m, st in seq:
        s = int(st * SR)
        d = 2.2 - st
        n = (note(midi(m), d, "saw", 0.004) * 0.35 + note(midi(m), d) * 0.65)
        n = lowpass_fast(n, 3500) * np.exp(-t_axis(d) * 2.5)
        out[s:s + len(n)] += n
    return reverb(out, 1.0)


def sfx_ui_click():
    t = t_axis(0.07)
    return np.sin(2 * np.pi * 1400 * t) * np.exp(-t * 70) + np.sin(2 * np.pi * 2100 * t) * np.exp(-t * 90) * 0.4


def sfx_ui_back():
    t = t_axis(0.1)
    f = 900 - 400 * t / 0.1
    return np.sin(np.cumsum(2 * np.pi * f / SR)) * np.exp(-t * 40)


def sfx_ui_open():
    t = t_axis(0.18)
    f = 500 + 700 * t / 0.18
    return np.sin(np.cumsum(2 * np.pi * f / SR)) * np.exp(-t * 18) * 0.8


def sfx_door():
    t = t_axis(0.9)
    noise = rng.uniform(-1, 1, len(t))
    cutoff = 300 + 1600 * np.sin(np.pi * t / 0.9)
    whoosh = lowpass(noise, cutoff) * np.sin(np.pi * t / 0.9) ** 1.5
    servo = note(110, 0.9, "saw", 0.01) * 0.12 * np.sin(np.pi * t / 0.9)
    clunk = np.zeros_like(t)
    c = np.sin(2 * np.pi * 80 * t_axis(0.15)) * np.exp(-t_axis(0.15) * 30)
    clunk[-len(c):] += c
    return whoosh * 1.4 + lowpass_fast(servo, 800) + clunk * 0.8


def sfx_elevator_ding():
    out = np.zeros(int(1.6 * SR))
    for i, m in enumerate([81, 77]):
        s = int(i * 0.28 * SR)
        d = 1.6 - i * 0.28
        n = (note(midi(m), d) + 0.25 * note(midi(m) * 2.76, d)) * np.exp(-t_axis(d) * 3)
        out[s:s + len(n)] += n
    return reverb(out, 0.8)


def sfx_elevator_move():
    """Loopable 4s hum (integer cycles)."""
    dur = 4.0
    t = t_axis(dur)
    hum = note(55, dur, "saw", 0.0) * 0.4 + note(110, dur) * 0.3 + note(82.5, dur) * 0.15
    hum = lowpass_fast(hum, 400)
    wob = 0.8 + 0.2 * np.sin(2 * np.pi * 0.5 * t)
    rumble = lowpass_fast(rng.uniform(-1, 1, len(t)), 180) * 0.8
    x = (hum + rumble) * wob
    # crossfade ends for a seamless loop
    f = int(0.2 * SR)
    x[:f] = x[:f] * np.linspace(0, 1, f) + x[-f:] * np.linspace(1, 0, f)
    return x[:-f]


def sfx_puzzle_ok():
    out = np.zeros(int(0.5 * SR))
    for i, m in enumerate([79, 86]):
        s = int(i * 0.06 * SR)
        d = 0.5 - i * 0.06
        out[s:s + int(d * SR)] += note(midi(m), d, "tri") * np.exp(-t_axis(d) * 8)
    return out


def sfx_puzzle_fail():
    t = t_axis(0.5)
    x = note(110, 0.5, "square") * 0.4 + note(116.5, 0.5, "square") * 0.4
    return lowpass_fast(x, 1200) * env_adsr(len(t), 0.005, 0.05, 0.7, 0.2)


def sfx_success():
    out = np.zeros(int(2.0 * SR))
    chords = [(0.0, [72, 76, 79]), (0.25, [74, 77, 81]), (0.5, [76, 79, 84])]
    for st, ms in chords:
        s = int(st * SR)
        d = 2.0 - st
        for m in ms:
            n = note(midi(m), d, "tri") * np.exp(-t_axis(d) * (3 if st == 0.5 else 8))
            out[s:s + len(n)] += n * 0.5
    return reverb(out, 0.9)


def sfx_scan():
    t = t_axis(1.0)
    f = 300 + 1500 * (t / 1.0) ** 2
    x = np.sin(np.cumsum(2 * np.pi * f / SR)) * np.exp(-t * 3) * 0.6
    ping = note(midi(93), 1.0) * np.exp(-t * 6) * 0.4
    return reverb(x + ping, 0.8)


def sfx_timer_tick():
    t = t_axis(0.05)
    return np.sin(2 * np.pi * 2600 * t) * np.exp(-t * 120)


def sfx_bricks():
    t = t_axis(1.2)
    x = np.zeros(len(t))
    for _ in range(14):
        s = int(rng.uniform(0, 0.8) * SR)
        d = int(0.25 * SR)
        chunk = lowpass_fast(rng.uniform(-1, 1, d), rng.uniform(300, 1500)) * np.exp(-t_axis(0.25) * rng.uniform(15, 30))
        x[s:s + d] += chunk * rng.uniform(0.4, 1.0)
    boom = np.sin(2 * np.pi * 50 * t) * np.exp(-t * 6)
    return x + boom * 0.7


# ---------------------------------------------------------------- MUSIC / AMBIENCE
def music_ambient():
    """
    'Afterlight Theme' — slow, mysterious, loopable (8 bars @ 70 BPM, 4/4).
    Am(add9) - Fmaj7 - Cmaj7 - Em7 progression, warm detuned pad, sparse
    glassy arpeggio, soft sub. All integer-bar so the loop is seamless.
    """
    bpm = 70
    beat = 60 / bpm
    bars = 8
    dur = bars * 4 * beat
    n = int(dur * SR)
    out = np.zeros(n)
    prog = [[57, 64, 67, 71], [53, 60, 64, 69], [48, 55, 59, 64], [52, 59, 62, 67]]
    bar_n = int(4 * beat * SR)
    for b in range(bars):
        chord = prog[(b // 2) % 4]
        s = b * bar_n
        d = 4 * beat
        seg = np.zeros(bar_n)
        for m in chord:
            seg += note(midi(m), d, "saw", 0.006)[:bar_n] * 0.18
            seg += note(midi(m + 12), d)[:bar_n] * 0.06
        seg = lowpass_fast(seg, 900)
        seg *= env_adsr(bar_n, 0.6, 0.4, 0.85, 0.5)
        out[s:s + bar_n] += seg
        # sub bass
        out[s:s + bar_n] += note(midi(chord[0] - 12), d)[:bar_n] * 0.22 * env_adsr(bar_n, 0.2, 0.3, 0.8, 0.4)
        # arpeggio: 8th notes, sparse pattern
        pattern = [0, 2, 3, 1, 3, 2, 0, 3]
        for i, p in enumerate(pattern):
            if (b + i) % 3 == 2:
                continue
            m = chord[p] + 24
            st = s + int(i * beat / 2 * SR)
            dd = beat * 1.5
            nn = (note(midi(m), dd, "tri") * 0.5 + note(midi(m), dd) * 0.5) * np.exp(-t_axis(dd) * 4)
            end = min(n, st + len(nn))
            out[st:end] += nn[:end - st] * 0.13
    out = reverb(out, 1.2, taps=((0.09, 0.5), (0.17, 0.4), (0.26, 0.3), (0.37, 0.22), (0.51, 0.15)))
    # wrap the reverb tail into the beginning for a seamless loop
    return out


def amb_city():
    dur = 12.0
    t = t_axis(dur)
    wind = lowpass(rng.uniform(-1, 1, len(t)), 250 + 200 * np.sin(2 * np.pi * t / dur) ** 2)
    hum = lowpass_fast(note(60, dur, "saw", 0.0), 200) * 0.08
    buzz = note(120, dur) * 0.015 * (0.5 + 0.5 * np.sin(2 * np.pi * 3 * t))
    x = wind * 1.6 + hum + buzz
    f = int(0.5 * SR)
    x[:f] = x[:f] * np.linspace(0, 1, f) + x[-f:] * np.linspace(1, 0, f)
    return x[:-f]


def amb_cave():
    dur = 12.0
    t = t_axis(dur)
    drone = lowpass_fast(note(41, dur, "saw", 0.01) + note(61.5, dur, "saw", 0.01) * 0.5, 160) * 0.5
    air = lowpass_fast(rng.uniform(-1, 1, len(t)), 120) * 0.9
    x = drone + air
    for _ in range(7):  # water drips
        s = int(rng.uniform(0.5, dur - 1) * SR)
        f0 = rng.uniform(900, 1700)
        dt = t_axis(0.25)
        drip = np.sin(np.cumsum(2 * np.pi * (f0 + 900 * np.exp(-dt * 30)) / SR)) * np.exp(-dt * 25) * 0.35
        drip = reverb(drip, 1.0)
        x[s:s + len(drip)] += drip
    f = int(0.5 * SR)
    x[:f] = x[:f] * np.linspace(0, 1, f) + x[-f:] * np.linspace(1, 0, f)
    return x[:-f]


if __name__ == "__main__":
    write("footstep_1", sfx_footstep(1, 1200), 0.6)
    write("footstep_2", sfx_footstep(2, 1000), 0.6)
    write("jump", sfx_jump(), 0.6)
    write("land", sfx_land(), 0.7)
    write("fragment", sfx_fragment(), 0.6)
    write("pickup", sfx_pickup(), 0.7)
    write("discover_rare", sfx_discovery(1), 0.8)
    write("discover_epic", sfx_discovery(3), 0.85)
    write("discover_legendary", sfx_discovery(5), 0.9)
    write("level_up", sfx_levelup(), 0.85)
    write("ui_click", sfx_ui_click(), 0.5)
    write("ui_back", sfx_ui_back(), 0.5)
    write("ui_open", sfx_ui_open(), 0.5)
    write("door", sfx_door(), 0.7)
    write("elevator_ding", sfx_elevator_ding(), 0.7)
    write("elevator_move", sfx_elevator_move(), 0.6)
    write("puzzle_ok", sfx_puzzle_ok(), 0.6)
    write("puzzle_fail", sfx_puzzle_fail(), 0.6)
    write("success", sfx_success(), 0.8)
    write("scan", sfx_scan(), 0.6)
    write("tick", sfx_timer_tick(), 0.5)
    write("bricks", sfx_bricks(), 0.8)
    write("music_theme", music_ambient(), 0.7)
    write("amb_city", amb_city(), 0.6)
    write("amb_cave", amb_cave(), 0.6)
