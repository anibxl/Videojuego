#!/usr/bin/env python3
"""Generates all original CLEAN RUSH vector icons, map illustrations, the logo,
app icons and splash screen. Usage: python3 tools/gen_icons.py"""
import os
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
A = os.path.join(ROOT, "assets", "icons")
BLUE, BLUE2, TURQ, GREEN, ORANGE, GOLD, WHITE, INK = "#0b2e66", "#1550b8", "#1fc8c8", "#5bd66b", "#ff8c2a", "#ffc93c", "#ffffff", "#0a1e3c"


def svg(body, w=128, h=128):
    return f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}">{body}</svg>'


def write(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w") as f:
        f.write(content)


SHADOW = '<ellipse cx="64" cy="116" rx="40" ry="7" fill="#000" opacity="0.18"/>'

# ------------------------------------------------------------------ UI ---
ui = {
    "coin": '<circle cx="64" cy="64" r="56" fill="#e0a21c"/><circle cx="64" cy="60" r="52" fill="#ffc93c"/><circle cx="64" cy="60" r="38" fill="none" stroke="#e0a21c" stroke-width="6"/><path d="M52 44 h20 a12 12 0 0 1 0 24 h-14 v16 h-8z M60 52 v8 h12 a4 4 0 0 0 0-8z" fill="#c4850f"/>',
    "star": '<path d="M64 8 L80 46 L120 48 L89 73 L100 114 L64 91 L28 114 L39 73 L8 48 L48 46Z" fill="#ffc93c" stroke="#e08f0c" stroke-width="6" stroke-linejoin="round"/><path d="M64 26 L74 50 L52 50Z" fill="#fff" opacity="0.5"/>',
    "star_empty": '<path d="M64 8 L80 46 L120 48 L89 73 L100 114 L64 91 L28 114 L39 73 L8 48 L48 46Z" fill="#000" fill-opacity="0.3" stroke="#ffffff" stroke-opacity="0.5" stroke-width="6" stroke-linejoin="round"/>',
    "sparkle": '<path d="M64 6 C70 46 82 58 122 64 C82 70 70 82 64 122 C58 82 46 70 6 64 C46 58 58 46 64 6Z" fill="#1fc8c8"/><circle cx="100" cy="26" r="10" fill="#fff"/>',
    "pause": '<rect x="34" y="26" width="22" height="76" rx="8" fill="#fff"/><rect x="72" y="26" width="22" height="76" rx="8" fill="#fff"/>',
    "back": '<path d="M78 22 L36 64 L78 106" fill="none" stroke="#fff" stroke-width="18" stroke-linecap="round" stroke-linejoin="round"/>',
    "lock": '<rect x="26" y="56" width="76" height="60" rx="12" fill="#ff8c2a"/><path d="M42 56 V40 a22 22 0 0 1 44 0 V56" fill="none" stroke="#ff8c2a" stroke-width="12"/><circle cx="64" cy="84" r="9" fill="#0a1e3c"/><rect x="60" y="86" width="8" height="18" rx="3" fill="#0a1e3c"/>',
    "drop": '<path d="M64 10 C64 10 22 60 22 82 a42 42 0 0 0 84 0 C106 60 64 10 64 10Z" fill="#1fc8c8"/><ellipse cx="48" cy="80" rx="8" ry="14" fill="#fff" opacity="0.6"/>',
    "drop_empty": '<path d="M64 10 C64 10 22 60 22 82 a42 42 0 0 0 84 0 C106 60 64 10 64 10Z" fill="#fff" fill-opacity="0.15" stroke="#fff" stroke-opacity="0.4" stroke-width="6"/>',
    "bubble": '<circle cx="64" cy="64" r="58" fill="#bff6ff" fill-opacity="0.25" stroke="#ffffff" stroke-width="5" stroke-opacity="0.8"/><path d="M34 46 a34 34 0 0 1 26-20" fill="none" stroke="#fff" stroke-width="8" stroke-linecap="round"/>',
    "trophy": '<path d="M36 14 h56 v34 a28 28 0 0 1 -56 0z" fill="#ffc93c"/><path d="M36 22 h-16 a16 18 0 0 0 20 26 M92 22 h16 a16 18 0 0 1 -20 26" fill="none" stroke="#ffc93c" stroke-width="8"/><rect x="56" y="74" width="16" height="20" fill="#e0a21c"/><rect x="36" y="94" width="56" height="18" rx="5" fill="#1550b8"/><path d="M50 26 v20" stroke="#fff" stroke-width="7" stroke-linecap="round" opacity="0.6"/>',
    "calendar": '<rect x="16" y="24" width="96" height="88" rx="14" fill="#fff"/><rect x="16" y="24" width="96" height="26" rx="12" fill="#ff8c2a"/><rect x="36" y="12" width="10" height="22" rx="5" fill="#0b2e66"/><rect x="82" y="12" width="10" height="22" rx="5" fill="#0b2e66"/><path d="M42 80 l14 14 l30 -32" fill="none" stroke="#5bd66b" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>',
    "gear_shoes": '<path d="M14 84 C14 60 30 52 44 48 L60 44 C66 60 84 66 112 72 C118 74 118 92 112 96 H22 C16 96 14 92 14 84Z" fill="#ff8c2a"/><rect x="14" y="94" width="102" height="12" rx="6" fill="#fff"/><path d="M50 56 l14 -4 M54 66 l14 -4" stroke="#fff" stroke-width="5" stroke-linecap="round"/><path d="M4 60 h18 M8 74 h14" stroke="#1fc8c8" stroke-width="6" stroke-linecap="round"/>',
    "gear_magnet": '<path d="M30 20 v44 a34 34 0 0 0 68 0 v-44 h-22 v44 a12 12 0 0 1 -24 0 v-44z" fill="#ff5a5a"/><rect x="30" y="20" width="22" height="18" fill="#ddd"/><rect x="76" y="20" width="22" height="18" fill="#ddd"/><circle cx="104" cy="104" r="12" fill="#ffc93c"/>',
    "gear_bags": '<path d="M28 44 h72 l-8 70 h-56z" fill="#5bd66b"/><path d="M46 44 c0 -28 36 -28 36 0" fill="none" stroke="#2f8f40" stroke-width="8"/><path d="M50 74 l10 10 l20 -20" fill="none" stroke="#fff" stroke-width="8" stroke-linecap="round"/>',
}
for name, body in ui.items():
    write(os.path.join(A, "ui", name + ".svg"), svg(body))

# Logo
logo = svg(f'''
<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3ee6e6"/><stop offset="1" stop-color="#14a3b8"/></linearGradient></defs>
<g transform="translate(18,24)">
  <path d="M60 4 C60 4 18 56 18 80 a42 42 0 0 0 84 0 C102 56 60 4 60 4Z" fill="url(#g)" stroke="#fff" stroke-width="6"/>
  <ellipse cx="44" cy="78" rx="9" ry="16" fill="#fff" opacity="0.7"/>
  <path d="M86 20 l6 14 l14 6 l-14 6 l-6 14 l-6 -14 l-14 -6 l14 -6z" fill="#ffc93c"/>
</g>
<text x="140" y="96" font-family="Arial Black, Arial, sans-serif" font-weight="900" font-size="78" fill="#ffffff" stroke="#0b2e66" stroke-width="10" paint-order="stroke" letter-spacing="2">CLEAN</text>
<text x="146" y="178" font-family="Arial Black, Arial, sans-serif" font-weight="900" font-size="78" fill="#ff8c2a" stroke="#0b2e66" stroke-width="10" paint-order="stroke" letter-spacing="2">RUSH</text>
<path d="M150 194 h290" stroke="#1fc8c8" stroke-width="8" stroke-linecap="round"/>
''', 460, 210)
write(os.path.join(A, "ui", "logo.svg"), logo)

# ---------------------------------------------------------------- tools ---
def tool(body, bg):
    return svg(f'<circle cx="64" cy="64" r="60" fill="{bg}"/><circle cx="64" cy="64" r="60" fill="none" stroke="#fff" stroke-opacity="0.35" stroke-width="4"/>' + body)

tools = {
    "rake": ('<rect x="60" y="14" width="8" height="70" rx="4" fill="#c89058" transform="rotate(20 64 64)"/><g transform="rotate(20 64 64)"><rect x="34" y="82" width="60" height="10" rx="4" fill="#ff8c2a"/>' + "".join(f'<rect x="{36+i*9}" y="90" width="4" height="18" fill="#0a1e3c"/>' for i in range(7)) + '</g>', "#2f7d4a"),
    "broom": ('<g transform="rotate(-20 64 64)"><rect x="60" y="10" width="8" height="68" rx="4" fill="#c89058"/><path d="M42 76 h44 l8 36 h-60z" fill="#e8c46a"/><rect x="42" y="74" width="44" height="10" rx="3" fill="#ff8c2a"/></g>', "#1550b8"),
    "sponge": ('<rect x="28" y="40" width="72" height="40" rx="10" fill="#ffd54a"/><rect x="28" y="72" width="72" height="16" rx="6" fill="#5bd66b"/><circle cx="46" cy="54" r="4" fill="#e0a21c"/><circle cx="70" cy="50" r="5" fill="#e0a21c"/><circle cx="86" cy="60" r="3" fill="#e0a21c"/><circle cx="96" cy="30" r="8" fill="#fff" opacity="0.8"/><circle cx="104" cy="44" r="5" fill="#fff" opacity="0.6"/>', "#1fa3c8"),
    "leaf_blower": ('<rect x="20" y="44" width="40" height="36" rx="10" fill="#1fc8c8"/><rect x="56" y="54" width="44" height="14" rx="6" fill="#0a1e3c"/><path d="M100 50 l16 -10 M102 61 h18 M100 72 l16 10" stroke="#fff" stroke-width="5" stroke-linecap="round"/><path d="M106 26 c6 4 4 10 -2 10" fill="#ff8c2a"/><rect x="30" y="34" width="10" height="14" rx="4" fill="#0a1e3c"/>', "#0b2e66"),
    "trash_picker": ('<rect x="58" y="14" width="10" height="72" rx="4" fill="#9aa4b0" transform="rotate(15 64 64)"/><path d="M74 88 l-8 20 M84 88 l4 20" stroke="#5bd66b" stroke-width="7" stroke-linecap="round"/><rect x="22" y="70" width="34" height="40" rx="6" fill="#1a1a1e"/><path d="M28 70 c0 -10 22 -10 22 0" fill="none" stroke="#1a1a1e" stroke-width="5"/>', "#2f7d4a"),
    "pressure_washer": ('<rect x="24" y="60" width="18" height="34" rx="6" fill="#0a1e3c"/><rect x="24" y="48" width="44" height="18" rx="6" fill="#1550b8"/><rect x="66" y="53" width="44" height="7" rx="3" fill="#cfd6dd"/><path d="M110 56 l14 -12 M110 56 l14 0 M110 56 l14 12" stroke="#bff6ff" stroke-width="5" stroke-linecap="round"/>', "#1fa3c8"),
    "pool_net": ('<rect x="24" y="60" width="62" height="7" rx="3" fill="#cfd6dd" transform="rotate(-30 64 64)"/><ellipse cx="86" cy="44" rx="24" ry="20" fill="#e8fbff" fill-opacity="0.6" stroke="#1fc8c8" stroke-width="7"/><path d="M70 40 h32 M74 50 h26 M86 26 v36" stroke="#1fc8c8" stroke-width="2"/>', "#1550b8"),
    "leaf_vacuum": ('<rect x="20" y="40" width="44" height="40" rx="12" fill="#ff8c2a"/><rect x="58" y="54" width="48" height="16" rx="6" fill="#0a1e3c"/><circle cx="30" cy="96" r="16" fill="#3a4450"/><path d="M118 50 l-10 8 M118 74 l-10 -8" stroke="#ffc93c" stroke-width="5" stroke-linecap="round"/><path d="M112 62 c6 -6 10 4 4 6" fill="#ff8c2a"/>', "#0b2e66"),
    "foam_sprayer": ('<rect x="24" y="64" width="16" height="32" rx="5" fill="#0a1e3c"/><rect x="24" y="52" width="46" height="16" rx="6" fill="#e8eef5"/><rect x="40" y="28" width="22" height="26" rx="8" fill="#fff" stroke="#b9c6d4" stroke-width="3"/><rect x="68" y="56" width="26" height="7" rx="3" fill="#cfd6dd"/><circle cx="104" cy="52" r="10" fill="#fff"/><circle cx="114" cy="68" r="8" fill="#fff"/><circle cx="102" cy="76" r="6" fill="#fff"/>', "#1fa3c8"),
    "scrubber": ('<rect x="28" y="44" width="40" height="28" rx="8" fill="#8a4be0"/><rect x="64" y="54" width="22" height="10" fill="#0a1e3c"/><circle cx="96" cy="60" r="22" fill="#5a3a2a"/>' + "".join(f'<line x1="96" y1="60" x2="{96+20*__import__("math").cos(i*0.785)}" y2="{60+20*__import__("math").sin(i*0.785)}" stroke="#c9a27a" stroke-width="3"/>' for i in range(8)), "#1550b8"),
    "pool_vacuum": ('<rect x="20" y="70" width="80" height="7" rx="3" fill="#cfd6dd" transform="rotate(-35 64 64)"/><rect x="62" y="94" width="50" height="12" rx="5" fill="#1fc8c8"/><circle cx="40" cy="34" r="6" fill="#bff6ff"/><circle cx="54" cy="24" r="4" fill="#bff6ff"/><circle cx="100" cy="84" r="5" fill="#bff6ff"/>', "#0b5e8a"),
    "turbo_nozzle": ('<rect x="24" y="60" width="18" height="34" rx="6" fill="#0a1e3c"/><rect x="24" y="48" width="44" height="18" rx="6" fill="#ff5a5a"/><rect x="66" y="53" width="34" height="7" rx="3" fill="#cfd6dd"/><rect x="98" y="48" width="14" height="17" rx="4" fill="#ff5a5a"/><path d="M114 56 l12 0" stroke="#fff" stroke-width="7" stroke-linecap="round"/><path d="M40 30 l8 -12 l2 10 l8 -10" fill="none" stroke="#ffc93c" stroke-width="5" stroke-linejoin="round"/>', "#0b2e66"),
    "polisher": ('<rect x="30" y="40" width="40" height="26" rx="8" fill="#ffc93c"/><rect x="66" y="48" width="18" height="10" fill="#0a1e3c"/><ellipse cx="96" cy="80" rx="26" ry="12" fill="#fff"/><ellipse cx="96" cy="76" rx="26" ry="12" fill="#f0f0f0" stroke="#cfd6dd" stroke-width="3"/><path d="M30 92 l6 12 l12 6 l-12 6 l-6 12" fill="#fff"/><path d="M104 22 l4 10 l10 4 l-10 4 l-4 10 l-4 -10 l-10 -4 l10 -4z" fill="#fff"/>', "#1fa3c8"),
}
for name, (body, bg) in tools.items():
    write(os.path.join(A, "tools", name + ".svg"), tool(body, bg))

# ---------------------------------------------------------------- items ---
items = {
    "coin": ui["coin"],
    "gnome": SHADOW + '<path d="M44 112 L50 70 H78 L84 112Z" fill="#2f6fe0"/><circle cx="64" cy="62" r="16" fill="#ffd0a8"/><path d="M48 58 L64 10 L80 58Z" fill="#ff4a4a"/><path d="M50 66 q14 30 28 0 q-14 14 -28 0z" fill="#fff"/>',
    "ball": SHADOW + '<circle cx="64" cy="64" r="48" fill="#fff" stroke="#0a1e3c" stroke-width="4"/><path d="M64 40 l20 14 l-8 24 h-24 l-8 -24z" fill="#0a1e3c"/>',
    "duck": SHADOW + '<ellipse cx="60" cy="84" rx="40" ry="26" fill="#ffd21f"/><circle cx="80" cy="50" r="22" fill="#ffd21f"/><path d="M98 50 l18 4 l-18 6z" fill="#ff8c2a"/><circle cx="84" cy="44" r="4" fill="#0a1e3c"/>',
    "ring": '<circle cx="64" cy="76" r="34" fill="none" stroke="#ffc93c" stroke-width="12"/><path d="M50 40 l14 -22 l14 22 l-14 12z" fill="#bff6ff" stroke="#1fc8c8" stroke-width="4"/>',
    "key": '<circle cx="36" cy="64" r="22" fill="none" stroke="#ffc93c" stroke-width="12"/><rect x="54" y="58" width="60" height="12" rx="4" fill="#ffc93c"/><rect x="92" y="66" width="10" height="20" fill="#ffc93c"/><rect x="106" y="66" width="8" height="14" fill="#ffc93c"/>',
    "boat": '<path d="M16 84 h96 l-14 22 h-68z" fill="#a8683a"/><rect x="60" y="20" width="5" height="64" fill="#7a4a2a"/><path d="M66 24 l38 50 h-38z" fill="#fff"/><path d="M58 34 l-30 40 h30z" fill="#1fc8c8"/>',
    "toy": SHADOW + '<rect x="40" y="52" width="48" height="50" rx="6" fill="#b9c2cc"/><rect x="46" y="20" width="36" height="30" rx="6" fill="#b9c2cc"/><circle cx="56" cy="34" r="5" fill="#ff5a5a"/><circle cx="72" cy="34" r="5" fill="#ff5a5a"/><rect x="62" y="8" width="4" height="12" fill="#666"/><rect x="26" y="58" width="14" height="30" rx="6" fill="#9aa4b0"/><rect x="88" y="58" width="14" height="30" rx="6" fill="#9aa4b0"/>',
    "badge": '<circle cx="64" cy="64" r="52" fill="#1fc8c8" stroke="#fff" stroke-width="6"/><circle cx="64" cy="64" r="36" fill="#ffc93c"/><path d="M64 36 C64 36 44 62 44 74 a20 20 0 0 0 40 0 C84 62 64 36 64 36Z" fill="#1550b8"/>',
    "note": '<rect x="24" y="16" width="80" height="96" rx="6" fill="#fff4cf" transform="rotate(-6 64 64)"/><g transform="rotate(-6 64 64)" stroke="#5a4ab0" stroke-width="5" stroke-linecap="round"><path d="M38 40 h52 M38 56 h44 M38 72 h50 M38 88 h30"/></g><path d="M80 92 c6 -8 16 -2 10 6 c-6 8 -14 8 -10 -6z" fill="#ff5a7a"/>',
    "tree": '<rect x="60" y="96" width="8" height="20" fill="#7a4a2a"/><path d="M64 10 L100 60 H80 L106 98 H22 L48 60 H28Z" fill="#3fbf5a"/><circle cx="64" cy="8" r="6" fill="#ffc93c"/>',
    "bird": '<ellipse cx="60" cy="66" rx="34" ry="20" fill="#3ee6c8" fill-opacity="0.85"/><circle cx="90" cy="50" r="14" fill="#3ee6c8"/><path d="M102 50 l22 -4 l-22 6z" fill="#333"/><path d="M50 56 c-10 -30 30 -40 34 -10z" fill="#9ff5e6"/><circle cx="94" cy="47" r="3" fill="#0a1e3c"/><rect x="44" y="96" width="30" height="12" rx="4" fill="#8a6a4a"/>',
}
for name, body in items.items():
    write(os.path.join(A, "items", name + ".svg"), svg(body))

# ----------------------------------------------------------------- maps ---
def scene(sky1, sky2, body):
    return svg(f'<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{sky1}"/><stop offset="1" stop-color="{sky2}"/></linearGradient></defs><rect width="320" height="180" fill="url(#s)"/>' + body, 320, 180)

def leaves(n, x0, x1, y0, y1, seed):
    import random
    r = random.Random(seed)
    cols = ["#f07a14", "#f8b81e", "#d2381a", "#e89a1c"]
    return "".join(f'<ellipse cx="{r.uniform(x0,x1):.0f}" cy="{r.uniform(y0,y1):.0f}" rx="5" ry="3" fill="{r.choice(cols)}" transform="rotate({r.randint(0,180)} {0} {0})"/>' for _ in range(n))

maps = {
    "autumn_garden": scene("#5aa6f0", "#ffe2b0",
        '<rect y="110" width="320" height="70" fill="#6cb43f"/><rect x="40" y="40" width="150" height="72" fill="#f8eedc"/><path d="M30 44 L115 6 L200 44Z" fill="#c2452e"/><rect x="100" y="76" width="22" height="36" fill="#e0602a"/><rect x="56" y="56" width="26" height="22" fill="#8fd0f0"/><rect x="146" y="56" width="26" height="22" fill="#8fd0f0"/><path d="M100 180 L122 112 H130 L152 180Z" fill="#d8cfbd"/><circle cx="250" cy="70" r="34" fill="#f07a14"/><circle cx="272" cy="90" r="26" fill="#f8b81e"/><rect x="248" y="96" width="10" height="30" fill="#7a4a2a"/>' + leaves(70, 0, 320, 115, 178, 1)),
    "power_wash_patio": scene("#4f97f0", "#d8ecff",
        '<rect y="100" width="320" height="80" fill="#cfc4b0"/><path d="M0 120 H320 M0 145 H320 M60 100 V180 M140 100 V180 M220 100 V180" stroke="#a89c86" stroke-width="3"/><rect x="0" y="100" width="160" height="80" fill="#5a4a2a" opacity="0.55"/><path d="M160 100 V180" stroke="#fff" stroke-width="4"/><rect x="20" y="60" width="280" height="40" fill="#e4d6be"/><rect x="20" y="60" width="140" height="40" fill="#4b6a2a" opacity="0.5"/><path d="M200 120 l40 40" stroke="#bff6ff" stroke-width="8" stroke-linecap="round"/><circle cx="244" cy="164" r="12" fill="#fff" opacity="0.8"/><rect x="186" y="104" width="22" height="16" rx="4" fill="#1550b8"/>'),
    "pool_rescue": scene("#3a8ff0", "#cff2ff",
        '<rect y="90" width="320" height="90" fill="#c99a6a"/><rect x="40" y="105" width="240" height="60" rx="6" fill="#f2f0ea"/><rect x="50" y="112" width="220" height="46" rx="4" fill="#5d7a2a"/><rect x="160" y="112" width="110" height="46" fill="#29c0d8"/><path d="M160 112 V158" stroke="#fff" stroke-width="4"/>' + leaves(25, 55, 155, 115, 155, 3) + '<path d="M270 40 q-30 -10 -50 10 M270 40 q20 -20 40 -6 M270 40 q-10 -26 -36 -26" stroke="#2f9a4a" stroke-width="8" fill="none"/><rect x="266" y="40" width="8" height="60" fill="#8a5a3a"/>'),
    "city_cleanup": scene("#5a9ae6", "#f2e2d0",
        '<rect x="0" y="30" width="90" height="100" fill="#c0603e"/><rect x="90" y="50" width="80" height="80" fill="#f0dcb0"/><rect x="170" y="20" width="80" height="110" fill="#7aa0b8"/><rect x="250" y="44" width="70" height="86" fill="#e8946a"/><rect y="130" width="320" height="16" fill="#cfcfcb"/><rect y="146" width="320" height="34" fill="#4a4c52"/><path d="M20 163 h30 M80 163 h30 M140 163 h30 M200 163 h30 M260 163 h30" stroke="#fff" stroke-width="4"/><path d="M10 90 q20 -24 40 0 t30 -4" stroke="#ff3a8a" stroke-width="8" fill="none"/><path d="M180 96 q16 -20 30 4 q10 -16 26 -2" stroke="#3a8aff" stroke-width="8" fill="none"/><rect x="120" y="134" width="8" height="10" fill="#d22"/><rect x="200" y="136" width="10" height="7" fill="#eee"/><circle cx="240" cy="140" r="5" fill="#222"/>'),
    "car_detailing": scene("#4a90e8", "#e6eef8",
        '<rect y="120" width="320" height="60" fill="#bfc6cc"/><rect x="0" y="40" width="320" height="16" fill="#1fc8c8"/><path d="M60 118 l20 -30 h110 l30 30 h40 q10 0 10 14 v12 h-230 v-14 q0 -12 20 -12z" fill="#1466d8"/><path d="M60 118 l20 -30 h50 v30z" fill="#6a4a2a" opacity="0.7"/><path d="M96 92 h40 l-8 22 h-40z" fill="#bfe6f6"/><circle cx="100" cy="146" r="18" fill="#222"/><circle cx="100" cy="146" r="9" fill="#ccc"/><circle cx="230" cy="146" r="18" fill="#222"/><circle cx="230" cy="146" r="9" fill="#ccc"/><circle cx="240" cy="100" r="10" fill="#fff"/><circle cx="256" cy="108" r="8" fill="#fff"/><path d="M200 70 l6 12 l12 4 l-12 4 l-6 12 l-6 -12 l-12 -4 l12 -4z" fill="#fff"/>'),
    "abandoned_greenhouse": scene("#6aa6e0", "#fff0d6",
        '<rect y="130" width="320" height="50" fill="#5aa43a"/><path d="M50 130 V70 L160 24 L270 70 V130Z" fill="#c8eef0" fill-opacity="0.55" stroke="#1d5a48" stroke-width="5"/><path d="M105 130 V47 M160 130 V24 M215 130 V47 M50 100 H270" stroke="#1d5a48" stroke-width="4"/><rect x="50" y="70" width="110" height="60" fill="#4b6a2a" opacity="0.45"/><rect x="146" y="100" width="28" height="30" fill="#d8cfbd"/><circle cx="210" cy="118" r="10" fill="#ff5a8a"/><circle cx="230" cy="114" r="8" fill="#ffc93c"/><circle cx="196" cy="112" r="7" fill="#fff"/>' + leaves(30, 55, 150, 115, 130, 6)),
}
for name, body in maps.items():
    write(os.path.join(A, "maps", name + ".svg"), body)

# App icon SVG (used by Godot) + PNG raster versions for Android.
app_icon = svg('<rect width="128" height="128" rx="28" fill="#0b2e66"/><path d="M64 14 C64 14 26 62 26 84 a38 38 0 0 0 76 0 C102 62 64 14 64 14Z" fill="#1fc8c8" stroke="#fff" stroke-width="5"/><ellipse cx="50" cy="82" rx="8" ry="14" fill="#fff" opacity="0.75"/><path d="M92 18 l5 12 l12 5 l-12 5 l-5 12 l-5 -12 l-12 -5 l12 -5z" fill="#ff8c2a"/>')
write(os.path.join(ROOT, "icon.svg"), app_icon)


def raster_icon(size, bg=True, fg=True):
    """Supersampled raster version of the app icon (water drop + sparkle)."""
    import math
    ss = 4
    S = size * ss
    s = S / 128.0
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    if bg:
        d.rounded_rectangle([0, 0, S - 1, S - 1], radius=int(28 * s), fill=(11, 46, 102, 255))
    if fg:
        cx, cy, r = 64 * s, 84 * s, 36 * s
        # Drop = circle + tangent triangle to the tip.
        tip = (cx, 14 * s)
        alpha = math.acos(r / (cy - tip[1]))
        pts = [tip]
        a0 = -math.pi / 2 + alpha
        a1 = 3 * math.pi / 2 - alpha
        for k in range(0, 181):
            a = a0 + (a1 - a0) * k / 180.0
            pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
        outline = [(x, y) for x, y in pts]
        d.polygon(outline, fill=(255, 255, 255, 255))
        inner = []
        for x, y in outline:
            inner.append((cx + (x - cx) * 0.86, cy + (y - cy) * 0.86 + (2 * s if y < cy else 0)))
        d.polygon(inner, fill=(31, 200, 200, 255))
        d.ellipse([46 * s, 70 * s, 58 * s, 96 * s], fill=(255, 255, 255, 200))
        st = [(92, 14), (97, 27), (110, 32), (97, 37), (92, 50), (87, 37), (74, 32), (87, 27)]
        d.polygon([(x * s, y * s) for x, y in st], fill=(255, 140, 42, 255))
    return img.resize((size, size), Image.LANCZOS)


os.makedirs(os.path.join(ROOT, "android"), exist_ok=True)
raster_icon(192).save(os.path.join(ROOT, "android", "icon_192.png"))
fg = Image.new("RGBA", (432, 432), (0, 0, 0, 0))
fg.paste(raster_icon(260, bg=False), (86, 86), raster_icon(260, bg=False))
fg.save(os.path.join(ROOT, "android", "icon_foreground_432.png"))
Image.new("RGBA", (432, 432), (11, 46, 102, 255)).save(os.path.join(ROOT, "android", "icon_background_432.png"))
# Splash: logo-like composition.
sp = Image.new("RGBA", (640, 360), (0, 0, 0, 0))
ic = raster_icon(160)
sp.paste(ic, (240, 40), ic)
d = ImageDraw.Draw(sp)
try:
    font = ImageFont.truetype("DejaVuSans-Bold.ttf", 54)
except OSError:
    font = ImageFont.load_default()
d.text((320, 270), "CLEAN RUSH", fill=(255, 255, 255, 255), font=font, anchor="mm", stroke_width=4, stroke_fill=(11, 46, 102, 255))
sp.save(os.path.join(A, "ui", "splash.png"))
print("icons generated")

# Logo as PNG (SVG <text> is not supported by Godot's importer).
def make_logo():
    W, H = 920, 420
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ic = raster_icon(300, bg=False)
    img.paste(ic, (0, 50), ic)
    d = ImageDraw.Draw(img)
    f = ImageFont.truetype("DejaVuSans-Bold.ttf", 150)
    d.text((300, 40), "CLEAN", font=f, fill=(255, 255, 255, 255), stroke_width=14, stroke_fill=(11, 46, 102, 255))
    d.text((312, 210), "RUSH", font=f, fill=(255, 140, 42, 255), stroke_width=14, stroke_fill=(11, 46, 102, 255))
    d.rounded_rectangle([316, 388, 880, 404], radius=8, fill=(31, 200, 200, 255))
    img.save(os.path.join(A, "ui", "logo.png"))


make_logo()
os.remove(os.path.join(A, "ui", "logo.svg")) if os.path.exists(os.path.join(A, "ui", "logo.svg")) else None
print("logo generated")
