// Décor du menu pour la SAISON DE NOËL (saison 1, étape 1) : un soir d'hiver dans la montagne.
//
// Plans (du plus lointain au plus proche, chacun avec sa propre parallaxe) :
//   ciel du soir (bleu nuit → lueur rose et pêche à l'horizon), aurore boréale très douce qui ondule,
//   étoiles qui scintillent, lune
//   → montagnes enneigées (trois chaînes en perspective atmosphérique : la plus lointaine floue et bleutée,
//     crêtes éclairées par la lueur du couchant) → bancs de brume qui dérivent à deux vitesses
//   → collines et forêt de sapins, lumières chaudes d'un village lointain
//   → chalet aux fenêtres chaudes, guirlande sur le toit, fumée de cheminée
//   → champ de neige en relief (congères éclairées par le haut, ombres bleues), reflets des guirlandes
//   → grands sapins décorés (boules, guirlandes qui scintillent, étoile), poussières lumineuses chaudes
//   → le panier enneigé et la balle qui rebondit dans la neige (l'identité du jeu reste là)
//   → neige qui tombe en permanence (src/menu/snowfall.js : flocons lointains derrière les sapins,
//     cristaux qui tournent, grands flocons flous au premier plan).
//
// Même interface que la salle de basket (MenuScene) : seuls le décor et ses animations changent.
// Le côté gauche (logo, JOUER, tuiles) reste calme et voilé : la lecture des boutons n'est jamais gênée.

import { MenuScene } from './scene.js';
import { createRng, clamp } from '../core/math.js';
import { Snowfall } from './snowfall.js';

const BULBS = ['255,92,92', '255,206,84', '120,220,140', '110,180,255', '255,150,220'];

function makeCanvas(w, h) {
  const c = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(Math.max(1, w), Math.max(1, h)) : document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

/** Ampoule ronde (cœur blanc, verre coloré, bord doux), précalculée par couleur. */
function bulbSprite(rgb) {
  const c = makeCanvas(24, 24);
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(10, 9, 0, 12, 12, 11);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.3, `rgba(${rgb},1)`);
  grad.addColorStop(0.75, `rgba(${rgb},0.85)`);
  grad.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = grad;
  g.beginPath();
  g.arc(12, 12, 11, 0, Math.PI * 2);
  g.fill();
  return c;
}

/** Sapin (silhouette à étages) de pied (x, y), hauteur h. snow : neige sur les branches. */
function drawFir(g, x, y, h, color, snow = 0.6) {
  const tiers = 4;
  const w = h * 0.42;
  g.fillStyle = '#3a2a22';
  g.fillRect(x - h * 0.025, y - h * 0.08, h * 0.05, h * 0.08);
  for (let i = 0; i < tiers; i++) {
    const k = i / tiers;
    const top = y - h * (0.08 + 0.92 * (k + 1 / tiers)) - h * 0.04;
    const base = y - h * (0.08 + 0.92 * k) + h * 0.02;
    const half = (w / 2) * (1 - k * 0.62);
    g.fillStyle = color;
    g.beginPath();
    g.moveTo(x, top);
    g.lineTo(x + half, base);
    g.quadraticCurveTo(x, base - h * 0.05, x - half, base);
    g.closePath();
    g.fill();
    if (snow > 0) {
      g.fillStyle = `rgba(240,246,255,${snow})`;
      g.beginPath();
      g.moveTo(x, top);
      g.lineTo(x + half * 0.42, top + (base - top) * 0.42);
      g.quadraticCurveTo(x, top + (base - top) * 0.32, x - half * 0.42, top + (base - top) * 0.42);
      g.closePath();
      g.fill();
      g.fillRect(x - half * 0.9, base - h * 0.012, half * 1.8, h * 0.012);
    }
  }
}

export class ChristmasScene extends MenuScene {
  setQuality(q) {
    super.setQuality(q);
    // La neige ne reflète pas comme un parquet verni
    this.q = { ...this.q, reflections: false };
    const rng = createRng(25);
    this.bulbs ??= Object.fromEntries(BULBS.map((c) => [c, bulbSprite(c)]));
    if (!this.snow) this.snow = new Snowfall(this.qualityName, rng);
    else this.snow.setQuality(this.qualityName);
    this.puffs = [];
    this.smoke = [];
    if (this.w > 1) this.resize(this.w, this.h);
  }

  // ─── Précalcul des plans fixes ──────────────────────────────────────────

  _bake() {
    const { w, h } = this;
    const k = this.dpr;
    const rng = createRng(7);
    this.horizon = h * 0.66;

    // 1. Ciel du soir + étoiles + lune (fixe)
    const sky = makeCanvas(w * k, h * k);
    const s = sky.getContext('2d');
    s.scale(k, k);
    const sg = s.createLinearGradient(0, 0, 0, this.horizon);
    sg.addColorStop(0, '#070d24');
    sg.addColorStop(0.45, '#17204a');
    sg.addColorStop(0.78, '#3a3468');
    sg.addColorStop(0.93, '#8a5c78');
    sg.addColorStop(1, '#d88f74');
    s.fillStyle = sg;
    s.fillRect(0, 0, w, h);
    this.stars = Array.from({ length: Math.round(70 * (this.q.particles ? 1 : 0.5)) }, () => ({
      x: rng() * w,
      y: rng() * this.horizon * 0.62,
      r: 0.4 + rng() * 1.1,
      ph: rng() * Math.PI * 2,
    }));
    const moon = { x: w * 0.6, y: h * 0.17, r: h * 0.045 };
    const mg = s.createRadialGradient(moon.x, moon.y, 0, moon.x, moon.y, moon.r * 6);
    mg.addColorStop(0, 'rgba(255,244,220,0.35)');
    mg.addColorStop(1, 'rgba(255,244,220,0)');
    s.fillStyle = mg;
    s.fillRect(moon.x - moon.r * 6, moon.y - moon.r * 6, moon.r * 12, moon.r * 12);
    s.fillStyle = '#fff6df';
    s.beginPath();
    s.arc(moon.x, moon.y, moon.r, 0, Math.PI * 2);
    s.fill();
    s.fillStyle = 'rgba(200,190,170,0.35)';
    for (const [dx, dy, rr] of [[-0.3, -0.2, 0.22], [0.25, 0.15, 0.16], [0.05, 0.35, 0.12]]) {
      s.beginPath();
      s.arc(moon.x + dx * moon.r, moon.y + dy * moon.r, rr * moon.r, 0, Math.PI * 2);
      s.fill();
    }

    // 1 bis. Aurore boréale : deux voiles précalculés (dégradés vert d'eau → violet), animés par simple
    // déplacement et respiration de l'opacité (aucun calcul par pixel à chaque image)
    this.auroras = [0, 1].map((i) => {
      const aw = Math.round(w * 1.15);
      const ah = Math.round(this.horizon * 0.5);
      const c = makeCanvas(aw, ah);
      const a = c.getContext('2d');
      const r4 = createRng(60 + i);
      for (let j = 0; j < 7; j++) {
        const x0 = (j / 6) * aw;
        const y0 = ah * (0.35 + Math.sin(j * 1.3 + i * 2) * 0.18);
        const gr = a.createLinearGradient(0, y0 - ah * 0.35, 0, y0 + ah * 0.25);
        gr.addColorStop(0, 'rgba(120,255,210,0)');
        gr.addColorStop(0.55, i ? 'rgba(150,120,255,0.28)' : 'rgba(110,255,200,0.3)');
        gr.addColorStop(0.8, i ? 'rgba(255,140,220,0.12)' : 'rgba(120,200,255,0.14)');
        gr.addColorStop(1, 'rgba(120,255,210,0)');
        a.fillStyle = gr;
        a.beginPath();
        a.ellipse(x0, y0, aw * (0.12 + r4() * 0.08), ah * 0.42, 0.1 * Math.sin(j), 0, Math.PI * 2);
        a.fill();
      }
      return { c, w: aw, h: ah, y: this.horizon * (0.06 + i * 0.1), speed: 3 + i * 2, ph: i * 2.1 };
    });

    // 2. Montagnes enneigées (trois chaînes), un peu plus larges que l'écran pour la parallaxe
    const bgW = w * 1.12;
    this.bgW = bgW;
    const mt = makeCanvas(bgW * k, this.horizon * k);
    const m = mt.getContext('2d');
    m.scale(k, k);
    // Le ciel (et la lune) sont peints sous les montagnes, dans le même calque : une copie de moins par image
    m.drawImage(sky, 0, 0, sky.width, (this.horizon * k), (bgW - w) / 2, 0, w, this.horizon);
    m.drawImage(sky, 0, 0, 2, this.horizon * k, 0, 0, (bgW - w) / 2 + 1, this.horizon);
    m.drawImage(sky, sky.width - 2, 0, 2, this.horizon * k, (bgW + w) / 2 - 1, 0, (bgW - w) / 2 + 1, this.horizon);
    const ridge = (base, amp, seed, body, snowTop, blur = 0, rim = 0) => {
      const r2 = createRng(seed);
      m.save();
      if (blur && 'filter' in m) m.filter = `blur(${blur}px)`;
      const pts = [];
      let x = -20;
      while (x < bgW + 40) {
        pts.push([x, base - amp * (0.35 + r2() * 0.65)]);
        x += bgW * (0.06 + r2() * 0.08);
      }
      // Versant : neige en haut (dégradé), roche bleutée en bas
      const grad = m.createLinearGradient(0, base - amp, 0, base + amp * 0.2);
      grad.addColorStop(0, snowTop);
      grad.addColorStop(0.42, snowTop);
      grad.addColorStop(0.62, body);
      grad.addColorStop(1, body);
      m.fillStyle = grad;
      m.beginPath();
      m.moveTo(-20, this.horizon);
      for (const [px, py] of pts) m.lineTo(px, py);
      m.lineTo(bgW + 40, this.horizon);
      m.closePath();
      m.fill();
      // Ombre des versants (côté droit des sommets) : donne du relief aux montagnes
      m.fillStyle = 'rgba(40,50,95,0.28)';
      for (let i = 1; i < pts.length - 1; i++) {
        const [px, py] = pts[i];
        const [nx, ny] = pts[i + 1];
        if (py > pts[i - 1][1] || py > ny) continue; // seulement les sommets
        m.beginPath();
        m.moveTo(px, py);
        m.lineTo(nx, ny);
        m.lineTo(px + (nx - px) * 0.25, base + amp * 0.1);
        m.closePath();
        m.fill();
      }
      // Lueur du couchant sur les crêtes (côté gauche des sommets) : un liseré chaud très fin
      if (rim > 0) {
        m.strokeStyle = `rgba(255,196,160,${rim})`;
        m.lineWidth = 1.2;
        m.beginPath();
        for (let i = 1; i < pts.length - 1; i++) {
          const [px, py] = pts[i];
          const [lx, ly] = pts[i - 1];
          if (py > ly) continue;
          m.moveTo(px + (lx - px) * 0.45, py + (ly - py) * 0.45);
          m.lineTo(px, py);
        }
        m.stroke();
      }
      // Pied des montagnes noyé dans la brume (perspective atmosphérique)
      const haze = m.createLinearGradient(0, base - amp * 0.2, 0, this.horizon);
      haze.addColorStop(0, 'rgba(150,140,190,0)');
      haze.addColorStop(1, 'rgba(170,150,190,0.45)');
      m.fillStyle = haze;
      m.fillRect(-20, base - amp * 0.2, bgW + 60, this.horizon - base + amp * 0.2);
      m.restore();
    };
    ridge(this.horizon * 0.8, this.horizon * 0.5, 17, '#7a7fae', 'rgba(214,218,246,0.7)', 2.2, 0.25);
    ridge(this.horizon * 0.88, this.horizon * 0.4, 3, '#4a5585', 'rgba(232,236,255,0.85)', 0.8, 0.45);
    ridge(this.horizon * 0.96, this.horizon * 0.28, 9, '#2e3a68', 'rgba(244,247,255,0.92)', 0, 0.55);
    this.bgLayer = mt;

    // 3. Collines enneigées et forêt de sapins (plan moyen) + chalet
    const midW = w * 1.08;
    this.midW = midW;
    const midH = h * 0.42;
    this.midTop = this.horizon - midH * 0.55;
    const md = makeCanvas(midW * k, midH * k);
    const d = md.getContext('2d');
    d.scale(k, k);
    const hill = (yBase, amp, freq, color, ph) => {
      d.fillStyle = color;
      d.beginPath();
      d.moveTo(0, midH);
      for (let x = 0; x <= midW; x += 8) d.lineTo(x, yBase + Math.sin(x * freq + ph) * amp);
      d.lineTo(midW, midH);
      d.closePath();
      d.fill();
    };
    hill(midH * 0.5, midH * 0.06, 0.006, '#c9d4ee', 1.1);
    // Forêt lointaine
    for (let i = 0; i < 46; i++) {
      const x = rng() * midW;
      const y = midH * 0.5 + Math.sin(x * 0.006 + 1.1) * midH * 0.06 + 4;
      drawFir(d, x, y, midH * (0.12 + rng() * 0.1), '#1d3a46', 0.55);
    }
    this.village = [];
    for (let i = 0; i < 14; i++) {
      const x = midW * (0.08 + rng() * 0.84);
      const y = midH * 0.5 + Math.sin(x * 0.006 + 1.1) * midH * 0.06 + 1 - rng() * midH * 0.03;
      // Petite maison : toit enneigé, une fenêtre (allumée en direct)
      d.fillStyle = '#2a2f4a';
      d.fillRect(x - 3, y - 4, 6, 4);
      d.fillStyle = '#eef3ff';
      d.beginPath();
      d.moveTo(x - 4, y - 4);
      d.lineTo(x, y - 7);
      d.lineTo(x + 4, y - 4);
      d.closePath();
      d.fill();
      this.village.push({ x, y: y - 2, ph: rng() * Math.PI * 2 });
    }
    hill(midH * 0.66, midH * 0.05, 0.009, '#dfe7f8', 2.4);
    for (let i = 0; i < 26; i++) {
      const x = rng() * midW;
      if (x > midW * 0.44 && x < midW * 0.62) continue; // place du chalet
      const y = midH * 0.66 + Math.sin(x * 0.009 + 2.4) * midH * 0.05 + 4;
      drawFir(d, x, y, midH * (0.18 + rng() * 0.12), '#16323c', 0.6);
    }
    // Chalet (fenêtres chaudes, dessinées « éteintes » ici : la lueur est animée)
    const cx = midW * 0.53;
    const cy = midH * 0.66 + Math.sin(cx * 0.009 + 2.4) * midH * 0.05 + 2;
    const cw = midH * 0.32;
    const chh = midH * 0.17;
    this.cabin = { x: cx, y: cy, w: cw, h: chh };
    d.fillStyle = '#4b2f24';
    d.fillRect(cx - cw / 2, cy - chh, cw, chh);
    d.fillStyle = 'rgba(0,0,0,0.25)';
    for (let yy = cy - chh + 4; yy < cy; yy += 5) d.fillRect(cx - cw / 2, yy, cw, 1);
    d.fillStyle = '#3b2620';
    d.fillRect(cx + cw * 0.22, cy - chh - cw * 0.42, cw * 0.1, cw * 0.3); // cheminée
    d.fillStyle = '#2a1c18';
    d.beginPath();
    d.moveTo(cx - cw * 0.62, cy - chh + 2);
    d.lineTo(cx, cy - chh - cw * 0.42);
    d.lineTo(cx + cw * 0.62, cy - chh + 2);
    d.closePath();
    d.fill();
    d.fillStyle = '#f4f7ff'; // neige sur le toit
    d.beginPath();
    d.moveTo(cx - cw * 0.64, cy - chh + 2);
    d.lineTo(cx, cy - chh - cw * 0.46);
    d.lineTo(cx + cw * 0.64, cy - chh + 2);
    d.lineTo(cx + cw * 0.5, cy - chh - 1);
    d.lineTo(cx, cy - chh - cw * 0.34);
    d.lineTo(cx - cw * 0.5, cy - chh - 1);
    d.closePath();
    d.fill();
    d.fillStyle = '#2a1712';
    d.fillRect(cx - cw * 0.08, cy - chh * 0.62, cw * 0.16, chh * 0.62); // porte
    this.windows = [[cx - cw * 0.32, cy - chh * 0.62], [cx + cw * 0.2, cy - chh * 0.62]].map(([x, y]) => ({ x, y, w: cw * 0.14, h: chh * 0.34 }));
    for (const win of this.windows) {
      d.fillStyle = '#ffb35a';
      d.fillRect(win.x, win.y, win.w, win.h);
      d.fillStyle = '#4b2f24';
      d.fillRect(win.x + win.w / 2 - 0.6, win.y, 1.2, win.h);
      d.fillRect(win.x, win.y + win.h / 2 - 0.6, win.w, 1.2);
    }
    this.chimney = { x: cx + cw * 0.27, y: cy - chh - cw * 0.42 };
    this.midH = midH;
    this.midLayer = md;

    // 4. Champ de neige (premier plan)
    const floorW = w * 1.1;
    this.floorW = floorW;
    const fh = h - this.horizon + h * 0.04;
    const fl = makeCanvas(floorW * k, fh * k);
    const f = fl.getContext('2d');
    f.scale(k, k);
    const fg = f.createLinearGradient(0, 0, 0, fh);
    fg.addColorStop(0, '#e6eefb');
    fg.addColorStop(0.5, '#cfdcf2');
    fg.addColorStop(1, '#a9bbdc');
    f.fillStyle = fg;
    f.beginPath();
    f.moveTo(0, fh);
    for (let x = 0; x <= floorW; x += 10) f.lineTo(x, 6 + Math.sin(x * 0.011) * 5 + Math.sin(x * 0.031) * 2);
    f.lineTo(floorW, fh);
    f.closePath();
    f.fill();
    // Congères en relief : bosses éclairées par le haut (lune), ombre bleutée en dessous
    for (let i = 0; i < 6; i++) {
      const cx2 = rng() * floorW;
      const cy2 = fh * (0.25 + rng() * 0.55);
      const rw = fh * (0.6 + rng() * 0.7);
      const rh = rw * 0.16;
      const sh = f.createLinearGradient(0, cy2 - rh, 0, cy2 + rh * 1.6);
      sh.addColorStop(0, 'rgba(255,255,255,0.55)');
      sh.addColorStop(0.45, 'rgba(240,246,255,0.1)');
      sh.addColorStop(0.75, 'rgba(110,135,195,0.22)');
      sh.addColorStop(1, 'rgba(110,135,195,0)');
      f.fillStyle = sh;
      f.beginPath();
      f.ellipse(cx2, cy2, rw, rh * 1.6, 0, Math.PI, 0);
      f.lineTo(cx2 + rw, cy2 + rh * 0.8);
      f.ellipse(cx2, cy2 + rh * 0.8, rw, rh * 0.8, 0, 0, Math.PI);
      f.closePath();
      f.fill();
    }
    // Ombres douces des congères
    for (let i = 0; i < 9; i++) {
      const x = rng() * floorW;
      const y = fh * (0.3 + rng() * 0.6);
      const sg2 = f.createRadialGradient(x, y, 0, x, y, fh * 0.5);
      sg2.addColorStop(0, 'rgba(110,135,190,0.18)');
      sg2.addColorStop(1, 'rgba(110,135,190,0)');
      f.fillStyle = sg2;
      f.fillRect(x - fh * 0.5, y - fh * 0.5, fh, fh);
    }
    // Paillettes de givre (fixes ; certaines scintillent en direct)
    this.glints = Array.from({ length: 26 }, () => ({ x: rng() * floorW, y: 10 + rng() * (fh - 14), ph: rng() * Math.PI * 2 }));
    this.floorLayer = fl;
    this.floorH = fh;

    // 5. Grands sapins décorés (premier plan, côté droit) : silhouettes précalculées, lumières animées
    this.trees = [
      { x: w * 0.93, h: h * 0.62 },
      { x: w * 0.7, h: h * 0.36 },
    ];
    // Calque recadré sur les sapins (côté droit) : bien moins de pixels à copier à chaque image
    const box = { x: w * 0.6, y: h * 0.12, w: w * 0.4 + 2, h: h * 0.88 };
    this.treeBox = box;
    const tr = makeCanvas(box.w * k, box.h * k);
    const tg = tr.getContext('2d');
    tg.scale(k, k);
    tg.translate(-box.x, -box.y);
    this.treeLights = [];
    for (const [i, t] of this.trees.entries()) {
      const baseY = this.horizon + h * (i ? 0.07 : 0.2);
      t.y = baseY;
      drawFir(tg, t.x, baseY, t.h, i ? '#173b33' : '#12352d', 0.7);
      // Boules (fixes) et ampoules (animées) le long de guirlandes en diagonale
      const r3 = createRng(40 + i);
      for (let j = 0; j < 9; j++) {
        const yk = 0.25 + r3() * 0.65;
        const half = t.h * 0.21 * (1 - (1 - yk) * 0.62) * (0.4 + r3() * 0.5);
        const bx = t.x + (r3() < 0.5 ? -1 : 1) * half;
        const by = baseY - t.h * (1.02 - yk * 0.92);
        const col = BULBS[j % BULBS.length];
        tg.fillStyle = `rgb(${col})`;
        tg.beginPath();
        tg.arc(bx, by, t.h * 0.018, 0, Math.PI * 2);
        tg.fill();
        tg.fillStyle = 'rgba(255,255,255,0.7)';
        tg.beginPath();
        tg.arc(bx - t.h * 0.006, by - t.h * 0.006, t.h * 0.006, 0, Math.PI * 2);
        tg.fill();
      }
      for (let j = 0; j < 22; j++) {
        const yk = 0.12 + (j / 22) * 0.86;
        const half = t.h * 0.21 * (1 - (1 - yk) * 0.62);
        const swing = Math.sin(j * 1.7) * half * 0.85;
        this.treeLights.push({ x: t.x + swing, y: baseY - t.h * (1.02 - yk * 0.92), r: t.h * 0.009, c: BULBS[j % BULBS.length], ph: j * 0.9 + i });
      }
      t.star = { x: t.x, y: baseY - t.h * 1.06 - t.h * 0.02 };
    }
    this.treeLayer = tr;

    // Halo doux réutilisable
    const gl = makeCanvas(128, 128);
    const gg = gl.getContext('2d');
    const rad = gg.createRadialGradient(64, 64, 0, 64, 64, 64);
    rad.addColorStop(0, 'rgba(255,255,255,1)');
    rad.addColorStop(0.35, 'rgba(255,255,255,0.35)');
    rad.addColorStop(1, 'rgba(255,255,255,0)');
    gg.fillStyle = rad;
    gg.fillRect(0, 0, 128, 128);
    this.glow = gl;

    // Banc de brume : bande horizontale faite de nappes douces, répétable (dérive sans couture)
    const fw = Math.round(w * 1.2);
    const fhh = Math.round(h * 0.18);
    const fogC = makeCanvas(fw, fhh);
    const fgc = fogC.getContext('2d');
    const r5 = createRng(77);
    for (let i = 0; i < 18; i++) {
      const x = r5() * fw;
      const y = fhh * (0.35 + r5() * 0.35);
      const rx = fw * (0.08 + r5() * 0.1);
      for (const ox of [x - fw, x, x + fw]) {
        const gr = fgc.createRadialGradient(ox, y, 0, ox, y, rx);
        gr.addColorStop(0, 'rgba(225,232,255,0.5)');
        gr.addColorStop(1, 'rgba(225,232,255,0)');
        fgc.fillStyle = gr;
        fgc.save();
        fgc.translate(ox, y);
        fgc.scale(1, 0.32);
        fgc.translate(-ox, -y);
        fgc.fillRect(ox - rx, y - rx, rx * 2, rx * 2);
        fgc.restore();
      }
    }
    this.fog = { c: fogC, w: fw, h: fhh };

    // Poussières lumineuses chaudes qui montent doucement près des sapins (« lucioles d'hiver »)
    this.motes = Array.from({ length: this.q.particles ? 14 : 5 }, () => ({
      x: w * (0.5 + rng() * 0.5),
      y: h * (0.35 + rng() * 0.55),
      v: 4 + rng() * 6,
      r: 0.8 + rng() * 1.4,
      ph: rng() * Math.PI * 2,
    }));

    // Voile de lisibilité (côté gauche, derrière le logo et JOUER) + vignette, en basse résolution
    const vw = Math.round(w / 3);
    const vh = Math.round(h / 3);
    const vg = makeCanvas(vw, vh);
    const v = vg.getContext('2d');
    const left = v.createLinearGradient(0, 0, vw * 0.7, 0);
    left.addColorStop(0, 'rgba(6,10,26,0.72)');
    left.addColorStop(0.55, 'rgba(6,10,26,0.3)');
    left.addColorStop(1, 'rgba(6,10,26,0)');
    v.fillStyle = left;
    v.fillRect(0, 0, vw, vh);
    const bottom = v.createLinearGradient(0, vh * 0.7, 0, vh);
    bottom.addColorStop(0, 'rgba(6,10,26,0)');
    bottom.addColorStop(1, 'rgba(6,10,26,0.35)'); // les tuiles restent lisibles sur la neige claire
    v.fillStyle = bottom;
    v.fillRect(0, 0, vw, vh);
    const r = Math.hypot(vw, vh) / 2;
    const vig = v.createRadialGradient(vw * 0.55, vh * 0.5, r * 0.45, vw * 0.55, vh * 0.5, r * 1.1);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(0,0,0,0.5)');
    v.fillStyle = vig;
    v.fillRect(0, 0, vw, vh);
    this.veil = vg;
  }

  // ─── Image par image ────────────────────────────────────────────────────

  frame(dt) {
    const { ctx, w, h, dpr } = this;
    const motion = this.reducedMotion ? 0.25 : 1;
    this.time += dt * motion;
    const t = this.time;
    this.dim += (this.dimTarget - this.dim) * Math.min(1, dt * 7);
    this.flash = Math.max(0, this.flash - dt * 1.6);
    this.pointer.x += (this.pointer.tx - this.pointer.x) * Math.min(1, dt * 3);
    this.pointer.y += (this.pointer.ty - this.pointer.y) * Math.min(1, dt * 3);
    const camX = Math.sin(t * 0.11) * w * 0.012 + this.pointer.x * w * 0.01;
    const camY = Math.sin(t * 0.083) * h * 0.006 + this.pointer.y * h * 0.006;
    const zoom = 1 + this.dim * 0.035;
    ctx.setTransform(dpr * zoom, 0, 0, dpr * zoom, (dpr * w * (1 - zoom)) / 2, (dpr * h * (1 - zoom)) / 2);

    // 1. Ciel, étoiles qui scintillent
    const bgX = -(this.bgW - w) / 2 - camX * 0.2;
    ctx.drawImage(this.bgLayer, bgX, -camY * 0.2, this.bgW, this.horizon);
    ctx.fillStyle = '#ffffff';
    for (const s of this.stars) {
      ctx.globalAlpha = 0.35 + 0.45 * (0.5 + 0.5 * Math.sin(t * 1.6 + s.ph));
      ctx.fillRect(s.x - camX * 0.2, s.y - camY * 0.2, s.r, s.r);
    }
    ctx.globalAlpha = 1;
    // Aurore boréale : ondule lentement, respire (très discrète : le ciel reste un ciel du soir)
    ctx.globalCompositeOperation = 'lighter';
    // Un seul dessin par voile : il se balance lentement (aller-retour), sans copie pour boucler
    for (const a of this.auroras) {
      const ax = -w * 0.075 + Math.sin(t * 0.02 * a.speed + a.ph) * w * 0.07 - camX * 0.15;
      ctx.globalAlpha = 0.38 + 0.22 * Math.sin(t * 0.21 + a.ph);
      ctx.drawImage(a.c, ax, a.y - camY * 0.15 + Math.sin(t * 0.13 + a.ph) * 4, a.w, a.h);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';

    // 2. Montagnes : dans le même calque que le ciel

    // 3. Bancs de brume au pied des montagnes : deux nappes, deux vitesses (profondeur)
    const fog = this.fog;
    // Un seul dessin par nappe (la bande dépasse l'écran de 20 %) : dérive en aller-retour très lent
    const fogLayers = this.q.particles ? 2 : 1;
    for (let i = 0; i < fogLayers; i++) {
      const fx = -(fog.w - w) / 2 + Math.sin(t * (0.045 + i * 0.03) + i * 2) * (fog.w - w) * 0.45 - camX * (0.3 + i * 0.1);
      const fy = this.horizon * (0.72 + i * 0.1) - camY * 0.3;
      ctx.globalAlpha = i ? 0.55 : 0.4;
      ctx.drawImage(fog.c, fx, fy, fog.w, fog.h);
    }
    ctx.globalAlpha = 1;

    // 4. Collines, forêt, chalet
    const midX = -(this.midW - w) / 2 - camX * 0.45;
    const midY = this.midTop - camY * 0.4;
    ctx.drawImage(this.midLayer, midX, midY, this.midW, this.midH);
    // Fenêtres qui rayonnent, guirlande du toit, fumée de cheminée
    const c = this.cabin;
    ctx.globalCompositeOperation = 'lighter';
    // Village lointain : fenêtres chaudes qui vacillent à peine
    for (const v of this.village) {
      const on = 0.75 + 0.25 * Math.sin(t * 1.3 + v.ph);
      ctx.globalAlpha = 0.9 * on;
      ctx.fillStyle = '#ffc06a';
      ctx.fillRect(midX + v.x - 0.8, midY + v.y - 0.8, 1.6, 1.6);
      ctx.globalAlpha = 0.22 * on;
      ctx.drawImage(this.glow, midX + v.x - 6, midY + v.y - 6, 12, 12);
    }
    for (const win of this.windows) {
      ctx.globalAlpha = 0.32 + 0.06 * Math.sin(t * 2.3 + win.x);
      ctx.drawImage(this.glow, midX + win.x - win.w * 2, midY + win.y - win.h * 2, win.w * 5, win.h * 5);
    }
    for (let i = 0; i <= 8; i++) {
      const u = i / 8;
      const x = midX + c.x - c.w * 0.6 + u * c.w * 1.2;
      const y = midY + c.y - c.h - (u < 0.5 ? u : 1 - u) * c.w * 0.8 + 1;
      const col = BULBS[i % BULBS.length];
      const on = 0.5 + 0.5 * Math.sin(t * 2.2 + i * 1.3);
      ctx.globalAlpha = 0.25 + 0.6 * on;
      ctx.fillStyle = `rgb(${col})`;
      ctx.fillRect(x - 1, y - 1, 2, 2);
      ctx.globalAlpha = 0.18 * on;
      ctx.drawImage(this.glow, x - 5, y - 5, 10, 10);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    if (Math.random() < dt * 2.2 * motion) this.smoke.push({ x: c.x + c.w * 0.27, y: c.y - c.h - c.w * 0.42, age: 0 });
    for (const p of this.smoke) {
      p.age += dt * motion;
      p.y -= dt * 10 * motion;
      p.x += dt * (4 + p.age * 3) * motion;
    }
    this.smoke = this.smoke.filter((p) => p.age < 4);
    for (const p of this.smoke) {
      ctx.globalAlpha = 0.16 * (1 - p.age / 4);
      const rr = 3 + p.age * 5;
      ctx.drawImage(this.glow, midX + p.x - rr, midY + p.y - rr, rr * 2, rr * 2);
    }
    ctx.globalAlpha = 1;

    // Neige lointaine : derrière le champ et les grands sapins (profondeur)
    this.snow.update(dt, motion);
    this.snow.draw(ctx, 'far', { w, h, camX, camY });

    // 5. Champ de neige et paillettes de givre
    const floorX = -(this.floorW - w) / 2 - camX * 0.6;
    const floorY = this.horizon - camY * 0.5;
    ctx.drawImage(this.floorLayer, floorX, floorY, this.floorW, this.floorH);
    ctx.fillStyle = '#ffffff';
    for (const g of this.glints) {
      const k2 = Math.max(0, Math.sin(t * 1.8 + g.ph));
      if (k2 < 0.85) continue;
      ctx.globalAlpha = (k2 - 0.85) * 5;
      ctx.fillRect(floorX + g.x - 1, floorY + g.y - 0.3, 2, 0.6);
      ctx.fillRect(floorX + g.x - 0.3, floorY + g.y - 1, 0.6, 2);
    }
    ctx.globalAlpha = 1;

    // 6. Panier enneigé au loin (identité du jeu) : neige sur la planche et sur le cercle
    const hx = w * 0.8 - camX * 0.5;
    const hu = h * 0.0102;
    const hfy = floorY + h * 0.08;
    this._drawHoop(hx, hfy, hu, t);
    ctx.fillStyle = 'rgba(248,251,255,0.95)';
    const by = hfy - hu * 36;
    ctx.beginPath();
    ctx.ellipse(hx - hu * 6.2, by - hu * 0.8, hu * 1.6, hu * 0.7, -0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(hx, hfy - hu * 30 - hu * 0.6, hu * 1.3, hu * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Reflets des guirlandes sur la neige gelée, sous les grands sapins (traînées verticales très douces)
    ctx.globalCompositeOperation = 'lighter';
    for (const [i, L] of this.treeLights.entries()) {
      if (i % 3) continue;
      const on = 0.5 + 0.5 * Math.sin(t * 2.6 + L.ph);
      const tr2 = this.trees[L.x > w * 0.82 ? 0 : 1];
      const x = L.x - camX * 0.7;
      const y = tr2.y + (tr2.y - L.y) * 0.08 - camY * 0.55;
      ctx.globalAlpha = 0.07 * on;
      ctx.drawImage(this.bulbs[L.c] ?? this.glow, x - L.r * 2, y, L.r * 4, L.r * 10);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';

    // 7. Grands sapins décorés : ampoules qui scintillent, étoile qui brille
    ctx.drawImage(this.treeLayer, this.treeBox.x - camX * 0.7, this.treeBox.y - camY * 0.55, this.treeBox.w, this.treeBox.h);
    ctx.globalCompositeOperation = 'lighter';
    for (const [i, L] of this.treeLights.entries()) {
      const on = 0.5 + 0.5 * Math.sin(t * 2.6 + L.ph);
      const x = L.x - camX * 0.7;
      const y = L.y - camY * 0.55;
      ctx.globalAlpha = 0.35 + 0.65 * on;
      const b = this.bulbs[L.c];
      if (b) ctx.drawImage(b, x - L.r * 1.5, y - L.r * 1.5, L.r * 3, L.r * 3);
      if (i % 2) continue; // un halo sur deux : même effet, moitié moins de calcul
      ctx.globalAlpha = 0.3 * on;
      ctx.drawImage(this.glow, x - L.r * 7, y - L.r * 7, L.r * 14, L.r * 14);
    }
    for (const tr of this.trees) {
      const x = tr.star.x - camX * 0.7;
      const y = tr.star.y - camY * 0.55;
      const s = tr.h * 0.05;
      ctx.globalAlpha = 0.5 + 0.2 * Math.sin(t * 2);
      ctx.drawImage(this.glow, x - s * 4, y - s * 4, s * 8, s * 8);
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#ffd96b';
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        const rr = i % 2 ? s * 0.45 : s;
        ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
      }
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';

    // 8. La balle rebondit dans la neige (petites gerbes de poudreuse au contact)
    const bx = w * 0.6 + Math.sin(t * 0.18) * w * 0.025 - camX * 0.8;
    const bfy = h * 0.9 - camY * 0.6;
    const r = h * 0.056;
    const u = (t % 1.55) / 1.55;
    if (this._lastU > 0.9 && u < 0.1) for (let i = 0; i < 8; i++) this.puffs.push({ x: bx, y: bfy, vx: (Math.random() - 0.5) * r * 3, vy: -Math.random() * r * 2.4, age: 0 });
    this._lastU = u;
    this._drawBall(bx, bfy, r, t);
    for (const p of this.puffs) {
      p.age += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += r * 6 * dt;
    }
    this.puffs = this.puffs.filter((p) => p.age < 0.7);
    ctx.fillStyle = '#ffffff';
    for (const p of this.puffs) {
      ctx.globalAlpha = 0.7 * (1 - p.age / 0.7);
      ctx.beginPath();
      ctx.arc(p.x, p.y, r * 0.09, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Poussières lumineuses chaudes : montent lentement en ondulant, s'éteignent et renaissent
    ctx.globalCompositeOperation = 'lighter';
    for (const m2 of this.motes) {
      m2.y -= m2.v * dt * motion;
      if (m2.y < h * 0.2) {
        m2.y = h * (0.85 + Math.random() * 0.15);
        m2.x = w * (0.5 + Math.random() * 0.5);
      }
      const life = clamp((m2.y - h * 0.2) / (h * 0.2), 0, 1);
      const x = m2.x + Math.sin(t * 0.7 + m2.ph) * 10 - camX * 0.9;
      ctx.globalAlpha = (0.35 + 0.35 * Math.sin(t * 2 + m2.ph)) * life;
      ctx.drawImage(this.bulbs['255,206,84'], x - m2.r * 2, m2.y - m2.r * 2 - camY * 0.6, m2.r * 4, m2.r * 4);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';

    // 9. Cristaux de neige qui tournent lentement, devant le décor
    this.snow.draw(ctx, 'mid', { w, h, camX, camY });

    // 10. Voile de lisibilité et vignette
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.drawImage(this.veil, 0, 0, w, h);
    if (this.dim > 0.002) {
      ctx.fillStyle = `rgba(3,6,14,${0.8 * this.dim})`;
      ctx.fillRect(0, 0, w, h);
    }
    // Grands flocons flous au premier plan (restent visibles, atténués, quand une page est ouverte)
    this.snow.draw(ctx, 'near', { w, h, camX, camY, alpha: 1 - 0.5 * this.dim });
    if (this.flash > 0) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = this.flash * 0.5;
      ctx.drawImage(this.glow, w * 0.15 - w * 0.6, h * 0.5 - h, w * 1.2, h * 2);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }
  }
}
