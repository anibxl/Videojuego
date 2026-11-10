#!/usr/bin/env python3
"""Generates the CLEAN RUSH 2.0 texture set procedurally (all original):
leaf atlas (8 realistic leaf types), foliage / pine cards, grass blade cards,
tileable grass, soil, bark, roof tiles, house siding and rain streaks.
Usage: python3 tools/gen_textures.py   ->  assets/textures/*.png
"""
import math
import os

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
OUT = os.path.join(ROOT, "assets", "textures")
os.makedirs(OUT, exist_ok=True)
rng = np.random.default_rng(2024)


def tile_noise(size, scale, seed):
    """Periodic (tileable) smooth noise in [0,1] via FFT filtering."""
    r = np.random.default_rng(seed)
    n = r.standard_normal((size, size))
    f = np.fft.fft2(n)
    fy = np.fft.fftfreq(size)[:, None]
    fx = np.fft.fftfreq(size)[None, :]
    d = np.sqrt(fx * fx + fy * fy)
    filt = np.exp(-(d * size / scale) ** 2)
    out = np.real(np.fft.ifft2(f * filt))
    out -= out.min()
    out /= out.max() + 1e-9
    return out


def to_img(arr_rgb, alpha=None):
    a = np.clip(arr_rgb * 255, 0, 255).astype(np.uint8)
    if alpha is not None:
        al = np.clip(alpha * 255, 0, 255).astype(np.uint8)
        return Image.fromarray(np.dstack([a, al]), "RGBA")
    return Image.fromarray(a, "RGB")


# ------------------------------------------------------------- leaves ---

def leaf_outline(kind, cx, cy, size):
    pts = []
    if kind in ("maple", "maple_red", "damaged"):
        half = [(0, -0.50), (0.14, -0.58), (0.30, -0.44), (0.62, -0.58), (0.50, -0.30), (0.60, -0.18),
                (0.97, 0.04), (0.72, 0.14), (0.76, 0.34), (0.52, 0.30), (0.50, 0.58), (0.32, 0.46),
                (0.20, 0.70), (0.08, 0.62), (0, 1.0)]
        full = half + [(-x, y) for x, y in reversed(half[:-1])]
        # Subdivide edges and add small serrations.
        for i in range(len(full)):
            ax, ay = full[i]
            bx, by = full[(i + 1) % len(full)]
            for k in range(6):
                t = k / 6
                x, y = ax + (bx - ax) * t, ay + (by - ay) * t
                nx, ny = -(by - ay), (bx - ax)
                ln = math.hypot(nx, ny) + 1e-9
                tooth = 0.025 * (1 if k % 2 == 0 else -0.3)
                pts.append((cx + (x + nx / ln * tooth) * size, cy - (y + ny / ln * tooth) * size))
    elif kind in ("oak", "oak_gold"):
        n = 120
        left, right = [], []
        for k in range(n + 1):
            y = -1 + 2 * k / n
            w = 0.42 * math.sqrt(max(0.0, 1 - y * y)) * (0.62 + 0.38 * abs(math.sin((y + 1) * math.pi * 3.5)))
            right.append((cx + w * size, cy + y * size))
            left.append((cx - w * size * 0.97, cy + y * size))
        pts = right + left[::-1]
    elif kind == "birch":
        for k in range(360):
            t = k / 360 * 2 * math.pi
            r = size * 0.62 * (1 + 0.03 * math.sin(t * 44))
            x = math.cos(t) * 0.72
            y = math.sin(t)
            if y > 0:
                x *= 1 - 0.55 * y ** 2
                y *= 1.25
            pts.append((cx + x * r, cy - y * r))
    else:  # large dry elongated leaf
        for k in range(360):
            t = k / 360 * 2 * math.pi
            x = math.cos(t) * 0.38
            y = math.sin(t)
            if y > 0:
                x *= 1 - 0.5 * y ** 3
            pts.append((cx + x * size * (1 + 0.03 * math.sin(t * 25)), cy - y * size))
    return pts


LEAF_TYPES = [
    ("maple", (0.93, 0.47, 0.10), (0.75, 0.22, 0.06)),
    ("oak", (0.62, 0.38, 0.16), (0.42, 0.24, 0.10)),
    ("birch", (0.96, 0.78, 0.22), (0.78, 0.55, 0.10)),
    ("dry", (0.55, 0.36, 0.18), (0.35, 0.22, 0.12)),
    ("maple_red", (0.80, 0.14, 0.08), (0.52, 0.06, 0.05)),
    ("oak_gold", (0.88, 0.62, 0.18), (0.64, 0.38, 0.10)),
    ("damaged", (0.78, 0.46, 0.14), (0.45, 0.26, 0.10)),
    ("small", (0.95, 0.62, 0.15), (0.80, 0.35, 0.08)),
]


def draw_leaf(kind, base, edge, cell=256, seed=0):
    ss = 3
    S = cell * ss
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    mask = Image.new("L", (S, S), 0)
    md = ImageDraw.Draw(mask)
    shape = "maple" if kind in ("maple", "maple_red", "damaged") else ("oak" if kind.startswith("oak") else ("birch" if kind in ("birch", "small") else "dry"))
    size = S * (0.40 if kind != "small" else 0.30)
    cy = S * 0.46
    pts = leaf_outline(shape, S / 2, cy, size)
    md.polygon(pts, fill=255)
    # Petiole (stem).
    md.line([(S / 2, cy + size * 0.8), (S / 2 + S * 0.02, S * 0.97)], fill=255, width=int(S * 0.018))
    if kind == "damaged":
        r = np.random.default_rng(seed + 7)
        for _ in range(5):
            hx, hy = S / 2 + r.uniform(-0.25, 0.25) * S, cy + r.uniform(-0.25, 0.2) * S
            hr = r.uniform(0.02, 0.05) * S
            md.ellipse([hx - hr, hy - hr, hx + hr, hy + hr], fill=0)
        md.ellipse([S * 0.62, S * 0.12, S * 0.9, S * 0.4], fill=0)  # bite
    mask = mask.filter(ImageFilter.GaussianBlur(ss * 0.6))
    m = np.asarray(mask).astype(np.float32) / 255.0
    # Colour: radial gradient base->edge, noise blotches, veins.
    yy, xx = np.mgrid[0:S, 0:S].astype(np.float32)
    dist = np.sqrt((xx - S / 2) ** 2 + (yy - cy) ** 2) / size
    n1 = tile_noise(S, 10, seed)
    n2 = tile_noise(S, 60, seed + 1)
    g = np.clip(dist * 0.9 + (n1 - 0.5) * 0.6, 0, 1)[..., None]
    col = np.array(base)[None, None, :] * (1 - g) + np.array(edge)[None, None, :] * g
    col *= (0.85 + 0.3 * n2)[..., None]
    # brown spots
    spots = (tile_noise(S, 40, seed + 3) > 0.78).astype(np.float32)[..., None]
    col = col * (1 - spots * 0.45) + np.array([0.3, 0.18, 0.08]) * spots * 0.45
    vimg = Image.new("L", (S, S), 0)
    vd = ImageDraw.Draw(vimg)
    base_pt = (S / 2, cy + size * 0.75)
    if shape == "maple":
        for ang in (90, 30, 150, -10, 190):
            a = math.radians(ang)
            vd.line([base_pt, (S / 2 + math.cos(a) * size * 0.95, cy - math.sin(a) * size * 0.95)], fill=255, width=int(S * 0.008))
    else:
        vd.line([base_pt, (S / 2, cy - size * 0.95)], fill=255, width=int(S * 0.009))
        for k in range(7):
            y = cy + size * 0.6 - k * size * 0.24
            for sgn in (-1, 1):
                vd.line([(S / 2, y), (S / 2 + sgn * size * 0.33, y - size * 0.22)], fill=200, width=int(S * 0.005))
    v = np.asarray(vimg.filter(ImageFilter.GaussianBlur(ss))).astype(np.float32)[..., None] / 255.0
    col = col * (1 - v * 0.25) + np.array(base)[None, None, :] * 1.15 * v * 0.25
    # Darkened rim.
    rim = np.asarray(mask.filter(ImageFilter.GaussianBlur(ss * 6))).astype(np.float32) / 255.0
    col *= (0.7 + 0.3 * np.clip(rim * 1.4, 0, 1))[..., None]
    out = to_img(np.clip(col, 0, 1), m)
    return out.resize((cell, cell), Image.LANCZOS)


def gen_leaf_atlas():
    cell = 256
    atlas = Image.new("RGBA", (cell * 4, cell * 2), (0, 0, 0, 0))
    for i, (kind, base, edge) in enumerate(LEAF_TYPES):
        leaf = draw_leaf(kind, base, edge, cell, seed=i * 11)
        atlas.paste(leaf, ((i % 4) * cell, (i // 4) * cell), leaf)
    atlas.save(os.path.join(OUT, "leaves_atlas.png"))


# ------------------------------------------------------------ foliage ---

def gen_foliage(name, needles=False, count=260, size=256):
    ss = 2
    S = size * ss
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    r = np.random.default_rng(5 if not needles else 9)
    for k in range(count):
        a = r.uniform(0, 2 * math.pi)
        rad = math.sqrt(r.uniform(0, 1)) * S * 0.42
        x, y = S / 2 + math.cos(a) * rad, S / 2 + math.sin(a) * rad
        shade = 0.55 + 0.45 * (1 - rad / (S * 0.42)) * r.uniform(0.6, 1.0)
        c = int(255 * shade)
        col = (c, c, c, 255)
        if needles:
            ang = r.uniform(0, math.pi)
            L = r.uniform(0.04, 0.09) * S
            d.line([(x, y), (x + math.cos(ang) * L, y + math.sin(ang) * L)], fill=col, width=int(S * 0.008))
        else:
            ang = r.uniform(0, 2 * math.pi)
            L = r.uniform(0.035, 0.06) * S
            W = L * 0.5
            pts = []
            for t in np.linspace(0, 2 * math.pi, 14):
                px, py = math.cos(t) * L, math.sin(t) * W * (1 - 0.3 * math.cos(t))
                pts.append((x + px * math.cos(ang) - py * math.sin(ang), y + px * math.sin(ang) + py * math.cos(ang)))
            d.polygon(pts, fill=col)
    img = img.resize((size, size), Image.LANCZOS)
    img.save(os.path.join(OUT, name + ".png"))


def gen_grass_card(size=256):
    ss = 2
    S = size * ss
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    r = np.random.default_rng(3)
    for k in range(38):
        bx = r.uniform(0.08, 0.92) * S
        h = r.uniform(0.45, 0.98) * S
        bend = r.uniform(-0.18, 0.18) * S
        w = r.uniform(0.012, 0.025) * S
        shade = r.uniform(0.6, 1.0)
        pts_l, pts_r = [], []
        for t in np.linspace(0, 1, 12):
            x = bx + bend * t * t
            y = S - t * h
            ww = w * (1 - t) + 0.5
            pts_l.append((x - ww, y))
            pts_r.append((x + ww, y))
        c = (int(150 * shade), int(255 * shade), int(110 * shade), 255)
        d.polygon(pts_l + pts_r[::-1], fill=c)
    img = img.resize((size, size), Image.LANCZOS)
    img.save(os.path.join(OUT, "grass_card.png"))


# ----------------------------------------------------------- tileables ---

def gen_grass_ground(size=512):
    n1 = tile_noise(size, 6, 11)
    n2 = tile_noise(size, 40, 12)
    blades = tile_noise(size, 180, 13)
    streak = np.clip((blades - 0.5) * 3, -1, 1)
    base = np.array([0.30, 0.48, 0.17])
    dark = np.array([0.20, 0.34, 0.11])
    light = np.array([0.45, 0.60, 0.24])
    t = np.clip(n1 * 0.7 + n2 * 0.3, 0, 1)[..., None]
    col = dark * (1 - t) + base * t
    col = col + (light - base) * np.clip(streak, 0, 1)[..., None] * 0.45 - 0.05 * np.clip(-streak, 0, 1)[..., None]
    # little soil specks
    soil = (tile_noise(size, 90, 14) > 0.82)[..., None]
    col = np.where(soil, col * 0.6 + np.array([0.32, 0.24, 0.14]) * 0.4, col)
    to_img(np.clip(col, 0, 1)).save(os.path.join(OUT, "grass_ground.png"))


def gen_soil(size=512):
    n1 = tile_noise(size, 8, 21)
    n2 = tile_noise(size, 70, 22)
    peb = (tile_noise(size, 120, 23) > 0.8)[..., None]
    col = np.array([0.30, 0.21, 0.13])[None, None] * (0.75 + 0.4 * n1[..., None]) * (0.85 + 0.3 * n2[..., None])
    col = np.where(peb, col * 1.5 + 0.05, col)
    to_img(np.clip(col, 0, 1)).save(os.path.join(OUT, "soil.png"))


def gen_bark(w=256, h=512):
    r = np.random.default_rng(31)
    n = r.standard_normal((h, w))
    f = np.fft.fft2(n)
    fy = np.fft.fftfreq(h)[:, None]
    fx = np.fft.fftfreq(w)[None, :]
    filt = np.exp(-((fx * w / 40) ** 2 + (fy * h / 4) ** 2))
    v = np.real(np.fft.ifft2(f * filt))
    v = (v - v.min()) / (v.max() - v.min())
    ridges = np.abs(np.sin(v * 12))
    col = np.array([0.36, 0.26, 0.18])[None, None] * (0.55 + 0.6 * ridges[..., None])
    to_img(np.clip(col, 0, 1)).save(os.path.join(OUT, "bark.png"))
    # birch bark: white with dark marks
    marks = (tile_noise(256, 30, 33) > 0.72)
    col2 = np.ones((256, 256, 3)) * np.array([0.92, 0.9, 0.86])
    col2[marks] = np.array([0.15, 0.13, 0.12])
    to_img(col2).resize((256, 512)).save(os.path.join(OUT, "bark_birch.png"))


def gen_roof(size=512):
    img = np.zeros((size, size, 3))
    n = tile_noise(size, 30, 41)
    rows = 8
    tile_h = size // rows
    for ry in range(rows):
        off = (tile_h // 2) * (ry % 2)
        for y in range(tile_h):
            yy = ry * tile_h + y
            shade = 0.65 + 0.35 * (y / tile_h)
            for c in range(0, size, tile_h):
                pass
            img[yy, :, :] = np.array([0.62, 0.22, 0.15]) * shade
        # vertical joints
        for x in range(0, size, tile_h):
            xx = (x + off) % size
            img[ry * tile_h:(ry + 1) * tile_h, xx:xx + 3] *= 0.5
    img *= (0.8 + 0.35 * n)[..., None]
    to_img(np.clip(img, 0, 1)).save(os.path.join(OUT, "roof_tiles.png"))


def gen_siding(size=512):
    n = tile_noise(size, 20, 51)
    img = np.ones((size, size, 3)) * np.array([0.95, 0.92, 0.86])
    board = size // 10
    for y in range(size):
        t = (y % board) / board
        img[y] *= 0.82 + 0.18 * t
    img *= (0.92 + 0.12 * n)[..., None]
    to_img(np.clip(img, 0, 1)).save(os.path.join(OUT, "siding.png"))


def gen_wood(size=512):
    r = np.random.default_rng(61)
    n = r.standard_normal((size, size))
    f = np.fft.fft2(n)
    fy = np.fft.fftfreq(size)[:, None]
    fx = np.fft.fftfreq(size)[None, :]
    v = np.real(np.fft.ifft2(f * np.exp(-((fx * size / 3) ** 2 + (fy * size / 60) ** 2))))
    v = (v - v.min()) / (v.max() - v.min())
    col = np.array([0.62, 0.43, 0.27])[None, None] * (0.75 + 0.4 * v[..., None])
    for y in range(0, size, size // 6):
        col[y:y + 3] *= 0.55
    to_img(np.clip(col, 0, 1)).save(os.path.join(OUT, "wood.png"))


def gen_rock(size=256):
    n = tile_noise(size, 12, 71) * 0.6 + tile_noise(size, 60, 72) * 0.4
    col = np.array([0.55, 0.53, 0.5])[None, None] * (0.6 + 0.6 * n[..., None])
    lichen = (tile_noise(size, 25, 73) > 0.75)[..., None]
    col = np.where(lichen, col * 0.6 + np.array([0.45, 0.5, 0.25]) * 0.4, col)
    to_img(np.clip(col, 0, 1)).save(os.path.join(OUT, "rock.png"))


if __name__ == "__main__":
    gen_leaf_atlas()
    gen_foliage("foliage_card")
    gen_foliage("pine_card", needles=True, count=420)
    gen_grass_card()
    gen_grass_ground()
    gen_soil()
    gen_bark()
    gen_roof()
    gen_siding()
    gen_wood()
    gen_rock()
    print("textures generated:", sorted(os.listdir(OUT)))
