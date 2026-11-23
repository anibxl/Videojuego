// Rendu du mode TRICKSHOT : « le Laboratoire ». Une identité propre, sans rien de commun avec les 5 mondes
// du jeu principal : un laboratoire de trickshots futuriste. Mur du fond en panneaux de métal rivetés,
// tuyaux, câbles, grand engrenage, écrans de contrôle, néons dans la couleur du chapitre, gyrophares ;
// au premier plan, plateformes d'acier à liseré lumineux (suspendues par des câbles ou fixées aux murs),
// murs techniques, rampes inclinées, cages de verre, ascenseurs, panier néon à planche de verre.
//
// Le décor est sombre et peu contrasté ; tout ce qui sert au jeu est clair, net et lumineux (lisibilité).
// Le fond est précalculé (la caméra ne bouge presque pas) : seuls quelques éléments animés sont redessinés.
//
// Hérite du rendu du jeu (ballon et skins, filet simulé, particules, éléments des mondes) sans le modifier.

import { Renderer } from '../render/renderer.js';
import {
  drawGravityZone, drawLiquid, drawCrumble, drawMagnet, drawBlinker, drawSaw, drawLaser, drawCannon, drawBoulder, drawSpikes,
} from '../render/world-draw.js';
import { drawTrail } from '../render/cosmetics.js';
import { clamp } from '../core/math.js';

const TAU = Math.PI * 2;
const makeCanvas = (w, h) => {
  const c = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(w, h) : document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
};

/** Thème du Laboratoire (mêmes champs que les thèmes des mondes, utilisés par le rendu commun). */
export function arenaTheme(accent) {
  return {
    light: '0,4,16',
    grade: [
      { x: 0.5, y: -0.1, r: 0.9, color: accent, alpha: 0.08 },
      { x: 0.1, y: 1.05, r: 0.6, color: '120,160,255', alpha: 0.05 },
    ],
    ballLight: [{ color: accent, angle: 0.7, alpha: 0.4 }, { color: '255,255,255', angle: 2.5, alpha: 0.25 }],
    surface: { dust: 'rgba(200,220,255,0.5)' },
    hint: 'rgba(235,242,255,0.6)',
    music: 'arena',
  };
}

/** Engrenage (silhouette) centré en 0,0. */
function gearPath(g, r, teeth, depth) {
  g.beginPath();
  for (let i = 0; i < teeth * 2; i++) {
    const a0 = (i / (teeth * 2)) * TAU;
    const a1 = ((i + 1) / (teeth * 2)) * TAU;
    const rr = i % 2 ? r - depth : r;
    g.lineTo(Math.cos(a0) * rr, Math.sin(a0) * rr);
    g.lineTo(Math.cos(a1) * rr, Math.sin(a1) * rr);
  }
  g.closePath();
}

/** Fond du Laboratoire : précalculé à la taille de l'écran. */
class LabBackground {
  constructor(level, accent, number) {
    this.accent = accent;
    this.number = number;
    this.bounds = level.bounds;
    // Placement du décor qui change d'un niveau à l'autre (aucune salle identique)
    const seed = (number * 9301 + 49297) % 233280;
    this.rand = (k) => ((seed * (k + 1) * 7919) % 233280) / 233280;
    this.gear = { x: 3 + this.rand(1) * 18, y: 3 + this.rand(2) * 6, r: 1.6 + this.rand(3) * 1.2 };
    this.screens = [
      { x: 1.4 + this.rand(4) * 7, y: 7.2 + this.rand(5) * 3.2, w: 2.6, h: 1.5 },
      { x: 13 + this.rand(6) * 7, y: 6.6 + this.rand(7) * 3.6, w: 2.2, h: 1.3 },
    ];
  }

  _bake(w, h, dpr, cam) {
    const W = Math.max(16, Math.round(w * dpr));
    const H = Math.max(16, Math.round(h * dpr));
    const c = makeCanvas(W, H);
    const g = c.getContext('2d');
    const A = this.accent;
    const S = cam.scale * dpr;
    const ox = W / 2 - cam.x * S;
    const oy = H / 2 + cam.y * S;
    const X = (x) => ox + x * S;
    const Y = (y) => oy - y * S;
    const B = this.bounds;
    const px = Math.max(1, dpr);

    // Hors de la salle (marges de l'écran) : métal sombre
    g.fillStyle = '#05070d';
    g.fillRect(0, 0, W, H);
    // Mur du fond : dégradé bleu acier
    const lin = g.createLinearGradient(0, Y(B.maxY), 0, Y(B.minY));
    lin.addColorStop(0, '#0b1120');
    lin.addColorStop(0.6, '#0e1528');
    lin.addColorStop(1, '#121a31');
    g.fillStyle = lin;
    g.fillRect(X(B.minX), Y(B.maxY), (B.maxX - B.minX) * S, (B.maxY - B.minY) * S);

    // Panneaux rivetés (3 × 2,25 u) : biseau clair en haut à gauche, ombre en bas à droite
    const pw = 3;
    const ph = 2.25;
    for (let x = B.minX; x < B.maxX; x += pw) {
      for (let y = B.minY; y < B.maxY; y += ph) {
        const x0 = X(x) + 1.5 * dpr;
        const y0 = Y(y + ph) + 1.5 * dpr;
        const ww = pw * S - 3 * dpr;
        const hh = ph * S - 3 * dpr;
        const shade = 0.018 + this.rand(Math.round(x * 7 + y * 3)) * 0.02;
        g.fillStyle = `rgba(150,175,230,${shade})`;
        g.fillRect(x0, y0, ww, hh);
        g.fillStyle = 'rgba(255,255,255,0.035)';
        g.fillRect(x0, y0, ww, px);
        g.fillRect(x0, y0, px, hh);
        g.fillStyle = 'rgba(0,0,0,0.35)';
        g.fillRect(x0, y0 + hh - px, ww, px);
        g.fillRect(x0 + ww - px, y0, px, hh);
        g.fillStyle = 'rgba(160,180,220,0.12)';
        const rv = Math.max(1, 0.05 * S);
        for (const [rx, ry] of [[0.18, 0.18], [pw - 0.18, 0.18], [0.18, ph - 0.18], [pw - 0.18, ph - 0.18]]) {
          g.beginPath();
          g.arc(X(x + rx), Y(y + ry), rv, 0, TAU);
          g.fill();
        }
        // Quelques panneaux techniques : grilles d'aération
        if (this.rand(Math.round(x * 13 + y * 5)) > 0.82) {
          g.fillStyle = 'rgba(0,0,0,0.4)';
          for (let k = 0; k < 6; k++) g.fillRect(x0 + ww * 0.2, y0 + hh * (0.25 + k * 0.09), ww * 0.6, Math.max(1, 0.05 * S));
        }
      }
    }

    // Tuyaux horizontaux et verticaux (en retrait, peu contrastés)
    const pipe = (x0, y0, x1, y1, r) => {
      const horiz = y0 === y1;
      const gr = horiz ? g.createLinearGradient(0, Y(y0 + r), 0, Y(y0 - r)) : g.createLinearGradient(X(x0 - r), 0, X(x0 + r), 0);
      gr.addColorStop(0, '#1d2740');
      gr.addColorStop(0.35, '#33415f');
      gr.addColorStop(1, '#10162a');
      g.fillStyle = gr;
      if (horiz) g.fillRect(X(x0), Y(y0 + r), (x1 - x0) * S, 2 * r * S);
      else g.fillRect(X(x0 - r), Y(y1), 2 * r * S, (y1 - y0) * S);
      g.fillStyle = '#3a4868';
      if (horiz) for (let x = x0 + 1.5; x < x1; x += 4) g.fillRect(X(x), Y(y0 + r * 1.35), 0.22 * S, 2.7 * r * S);
      else for (let y = y0 + 1.5; y < y1; y += 4) g.fillRect(X(x0 - r * 1.35), Y(y + 0.22), 2.7 * r * S, 0.22 * S);
    };
    pipe(B.minX, 12.2, B.maxX, 12.2, 0.2);
    pipe(B.minX, 11.6, B.maxX, 11.6, 0.11);
    const vx1 = B.minX + 4.5 + this.rand(8) * 4;
    const vx2 = B.maxX - 3.5 - this.rand(9) * 5;
    pipe(vx1, B.minY, vx1, 11.4, 0.16);
    pipe(vx2, B.minY, vx2, 11.4, 0.12);
    // Câbles qui pendent
    g.strokeStyle = 'rgba(10,14,26,0.9)';
    g.lineWidth = Math.max(1, 0.07 * S);
    for (let i = 0; i < 3; i++) {
      const xa = B.minX + 2 + this.rand(10 + i) * (B.maxX - 6);
      const xb = xa + 2.5 + this.rand(20 + i) * 3;
      g.beginPath();
      g.moveTo(X(xa), Y(11.9));
      g.quadraticCurveTo(X((xa + xb) / 2), Y(10.6 - this.rand(30 + i) * 1.4), X(xb), Y(11.9));
      g.stroke();
    }

    // Bande de danger au pied du mur
    g.save();
    g.beginPath();
    g.rect(X(B.minX), Y(0.5), (B.maxX - B.minX) * S, 0.5 * S);
    g.clip();
    g.fillStyle = 'rgba(255,190,40,0.07)';
    g.fillRect(X(B.minX), Y(0.5), (B.maxX - B.minX) * S, 0.5 * S);
    g.fillStyle = 'rgba(0,0,0,0.25)';
    for (let x = B.minX - 1; x < B.maxX + 1; x += 0.8) {
      g.beginPath();
      g.moveTo(X(x), Y(0));
      g.lineTo(X(x + 0.4), Y(0));
      g.lineTo(X(x + 0.9), Y(0.5));
      g.lineTo(X(x + 0.5), Y(0.5));
      g.closePath();
      g.fill();
    }
    g.restore();

    // Rampe de néon en haut du mur (couleur du chapitre) et sa lueur
    const ny = Y(B.maxY - 0.35);
    const neon = g.createLinearGradient(0, ny - 0.9 * S, 0, ny + 2.4 * S);
    neon.addColorStop(0, `rgba(${A},0)`);
    neon.addColorStop(0.3, `rgba(${A},0.12)`);
    neon.addColorStop(1, `rgba(${A},0)`);
    g.fillStyle = neon;
    g.fillRect(X(B.minX), ny - 0.9 * S, (B.maxX - B.minX) * S, 3.3 * S);
    g.fillStyle = `rgba(${A},0.55)`;
    g.fillRect(X(B.minX + 0.6), ny - 0.03 * S, (B.maxX - B.minX - 1.2) * S, 0.06 * S);

    // Lampes du plafond et cônes de lumière
    for (const fx of [0.22, 0.5, 0.78]) {
      const lx = X(B.minX + (B.maxX - B.minX) * fx);
      const top = Y(B.maxY - 0.05);
      const beam = g.createLinearGradient(0, top, 0, Y(B.minY));
      beam.addColorStop(0, 'rgba(220,235,255,0.07)');
      beam.addColorStop(1, 'rgba(220,235,255,0)');
      g.fillStyle = beam;
      g.beginPath();
      g.moveTo(lx - 0.5 * S, top);
      g.lineTo(lx + 0.5 * S, top);
      g.lineTo(lx + 3.4 * S, Y(B.minY));
      g.lineTo(lx - 3.4 * S, Y(B.minY));
      g.closePath();
      g.fill();
      g.fillStyle = '#2a3552';
      g.fillRect(lx - 0.6 * S, top, 1.2 * S, 0.18 * S);
      g.fillStyle = 'rgba(230,240,255,0.7)';
      g.fillRect(lx - 0.45 * S, top + 0.16 * S, 0.9 * S, 0.04 * S);
    }

    // Numéro du test, discret, sous le premier écran
    g.save();
    g.font = `800 ${Math.round(0.45 * S)}px Outfit, system-ui, sans-serif`;
    g.textAlign = 'left';
    g.textBaseline = 'middle';
    const sx = this.screens[0];
    g.fillStyle = `rgba(${A},0.3)`;
    g.fillText(`TEST ${String(this.number).padStart(2, '0')}`, X(sx.x), Y(sx.y - 0.45));
    g.restore();

    this._canvas = c;
  }

  draw(ctx, cam, w, h) {
    const dpr = ctx.getTransform().a || 1;
    const coarse = `${w}|${h}|${dpr}|${cam.scale.toFixed(2)}`;
    if (coarse !== this._coarse || !this._canvas) {
      this._bake(w, h, dpr, cam);
      this._coarse = coarse;
      this._cam = { x: cam.x, y: cam.y };
    }
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    // Secousses : on décale simplement l'image précalculée
    const S = cam.scale * dpr;
    ctx.drawImage(this._canvas, (this._cam.x - cam.x) * S, (cam.y - this._cam.y) * S);
    ctx.restore();
  }

  /** Éléments animés du décor (dessinés dans l'espace du monde). */
  drawLive(r, time) {
    const ctx = r.ctx;
    const A = this.accent;
    // Grand engrenage qui tourne lentement
    const gr = this.gear;
    ctx.save();
    ctx.translate(gr.x, gr.y);
    ctx.rotate(time * 0.12);
    ctx.fillStyle = 'rgba(40,52,82,0.5)';
    gearPath(ctx, gr.r, 14, 0.22);
    ctx.fill();
    ctx.fillStyle = 'rgba(8,12,22,0.8)';
    ctx.beginPath();
    ctx.arc(0, 0, gr.r * 0.32, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(120,140,190,0.16)';
    ctx.lineWidth = 0.05;
    for (let i = 0; i < 4; i++) {
      ctx.rotate(Math.PI / 4);
      ctx.beginPath();
      ctx.moveTo(-gr.r * 0.7, 0);
      ctx.lineTo(gr.r * 0.7, 0);
      ctx.stroke();
    }
    ctx.restore();
    // Écrans de contrôle : courbe qui défile, grille
    for (const [i, sc] of this.screens.entries()) {
      ctx.fillStyle = '#060a14';
      ctx.fillRect(sc.x - 0.08, sc.y - 0.08, sc.w + 0.16, sc.h + 0.16);
      ctx.fillStyle = `rgba(${A},0.07)`;
      ctx.fillRect(sc.x, sc.y, sc.w, sc.h);
      ctx.strokeStyle = `rgba(${A},0.1)`;
      ctx.lineWidth = 0.02;
      ctx.beginPath();
      for (let gx = sc.x + 0.4; gx < sc.x + sc.w; gx += 0.4) {
        ctx.moveTo(gx, sc.y);
        ctx.lineTo(gx, sc.y + sc.h);
      }
      ctx.stroke();
      ctx.strokeStyle = `rgba(${A},0.5)`;
      ctx.lineWidth = 0.04;
      ctx.beginPath();
      for (let k = 0; k <= 30; k++) {
        const u = k / 30;
        const ph = time * (1.6 + i) + u * 9;
        const v = i ? 0.5 + 0.32 * Math.sin(ph) * Math.cos(ph * 0.37) : 0.5 + ((k + Math.floor(time * 8)) % 10 === 0 ? 0.38 : 0.05 * Math.sin(ph * 3));
        ctx.lineTo(sc.x + u * sc.w, sc.y + v * sc.h);
      }
      ctx.stroke();
    }
    // Gyrophares aux coins du plafond
    const B = this.bounds;
    for (const bx of [B.minX + 0.9, B.maxX - 0.9]) {
      const k = 0.5 + 0.5 * Math.sin(time * 4 + bx);
      r._drawGlow('255,170,60', bx, B.maxY - 0.6, 0.9, 0.15 + 0.25 * k);
      ctx.fillStyle = `rgba(255,${150 + 60 * k},60,${0.6 + 0.4 * k})`;
      ctx.beginPath();
      ctx.arc(bx, B.maxY - 0.6, 0.13, 0, TAU);
      ctx.fill();
    }
  }

  drawFront() {}
}

export class ArenaRenderer extends Renderer {
  constructor(canvas, level, { accent = '63,224,255', number = 1 } = {}) {
    // setLevel est appelé par le constructeur parent : on mémorise d'abord la couleur et le numéro
    ArenaRenderer._pending = { accent, number };
    super(canvas, level);
    this.bumpFlash = new Map();
    this.netGlow = 0;
  }

  setLevel(level) {
    const opts = ArenaRenderer._pending ?? { accent: this.accent, number: this.number };
    this.accent = opts.accent;
    this.number = opts.number;
    ArenaRenderer._pending = null;
    this.themeId = 'arena';
    this.theme = arenaTheme(this.accent);
    this.background = new LabBackground(level, this.accent, this.number);
    this.rimSprites = [];
    this.ceilingY = level.bounds.maxY;
    this.netGlow = 0;
    if (this.w > 1) this._bakeVignette();
  }

  /** Éclat d'un bumper touché (appelé à l'impact). */
  flashBumper(x, y) {
    this.bumpFlash.set(`${Math.round(x * 2)}|${Math.round(y * 2)}`, { x, y, t: 1 });
  }

  /** Le filet s'illumine (panier). */
  flashNet(k = 1) {
    this.netGlow = Math.max(this.netGlow, k);
  }

  draw(s) {
    const { ctx, dpr } = this;
    const cam = s.camera;
    const L = s.level;
    if (s.frameDt > 0) this.fps += (1 / s.frameDt - this.fps) * 0.05;
    for (const [k, f] of this.bumpFlash) if ((f.t -= s.frameDt * 3) <= 0) this.bumpFlash.delete(k);
    this.netGlow = Math.max(0, this.netGlow - s.frameDt * 1.2);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.background.draw(ctx, cam, this.w, this.h);

    const k = cam.scale * dpr;
    ctx.setTransform(k, 0, 0, -k, dpr * (this.w / 2 - cam.x * cam.scale), dpr * (this.h / 2 + cam.y * cam.scale));
    this.view = { left: cam.x - cam.halfWidth - 1, right: cam.x + cam.halfWidth + 1 };
    const t = s.renderTime;
    const time = s.time;

    this.background.drawLive(this, time);
    this._drawPit(L, time);
    for (const f of L.fans) this._drawWind(f, time);
    for (const z of L.gravityZones) drawGravityZone(this, z, time, s.body.gravitySign < 0 && z.contains(s.body.x, s.body.y));
    for (const m of L.magnets) drawMagnet(this, m, time);
    for (const solid of L.solids) if (solid.hang) this._drawCables(solid);
    if (L.hoop.def?.hang) this._drawHoopCables(L.hoop);
    for (const m of L.movers) this._drawRail(m);
    for (const d of L.doors) this._drawArenaDoor(d, time);
    for (const solid of L.solids) this._drawArenaSolid(solid, time);
    for (const l of L.lavas) drawLiquid(this, l, time, L.bounds.minY - 2);
    for (const f of L.fans) this._drawArenaFan(f, time);
    for (const cr of L.crumbles) drawCrumble(this, cr, time);
    for (const m of L.movers) this._drawArenaMover(m);
    for (const b of L.breakables ?? []) this._drawBreakable(b, time);
    for (const tr of L.trampolines) this._drawTrampoline(tr);
    for (const sw of L.switches) this._drawSwitch(sw, time);
    for (const sp of L.spikes) drawSpikes(this, sp, time);
    for (const bl of L.blinkers) drawBlinker(this, bl, t);
    for (const sw of L.saws) drawSaw(this, sw, time);
    for (const l of L.lasers) drawLaser(this, l, t);
    for (const c of L.cannons) this._withLook(c.def.style, () => drawCannon(this, c, t));
    for (const b of L.boulders) this._withLook(b.def.style, () => drawBoulder(this, b, t));
    for (const tp of L.teleporters) this._drawTeleporter(tp, t, () => true);
    if (s.goal) this._drawGoalBurst(s.goal, s.time);
    this._drawHoopBack(L.hoop, s.goal, s.time);
    this._drawPad(s.tee, time, s.aiming);
    if (s.aim) this._drawAim(s.aim, time);

    if (s.ballVisible) {
      if (s.trail) drawTrail(ctx, s.trail.id, s.trail.pts, s.time, s.ball.r);
      this._drawShadow(s);
      this._drawBall(s);
    }
    this._drawHoopFront(L.hoop, time);
    this._drawParticles(s.particles);
    s.fx?.draw(ctx);
    if (s.aim?.touch) this._drawTouch(s.aim);

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(this._vignette, 0, 0);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (s.flash > 0) {
      ctx.fillStyle = `rgba(255,70,90,${0.22 * s.flash})`;
      ctx.fillRect(0, 0, this.w, this.h);
    }
    if (s.goalFlash > 0) {
      ctx.fillStyle = `rgba(255,248,230,${0.22 * s.goalFlash * s.goalFlash})`;
      ctx.fillRect(0, 0, this.w, this.h);
    }
    if (s.glow && s.glow.k > 0.01) this._drawScreenGlow(s.glow);
    this._drawTexts(s);
  }

  _withLook(style, fn) {
    const look = style === 'fire' ? 'volcano' : style === 'snow' ? 'snow' : null;
    if (!look) return fn();
    const prev = this.themeId;
    this.themeId = look;
    try {
      fn();
    } finally {
      this.themeId = prev;
    }
  }

  // ─── Structure du laboratoire ───────────────────────────────────────────

  _path(s) {
    const ctx = this.ctx;
    ctx.beginPath();
    s.points.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.closePath();
  }

  /** Vide en bas de la salle : champ d'énergie, le ballon qui y tombe est perdu. */
  _drawPit(L, time) {
    const ctx = this.ctx;
    const B = L.bounds;
    const g = ctx.createLinearGradient(0, B.minY - 0.6, 0, B.minY + 1.4);
    g.addColorStop(0, 'rgba(255,60,110,0.3)');
    g.addColorStop(1, 'rgba(255,60,110,0)');
    ctx.fillStyle = g;
    ctx.fillRect(B.minX, B.minY - 0.6, B.maxX - B.minX, 2);
    ctx.strokeStyle = `rgba(255,90,140,${0.35 + 0.15 * Math.sin(time * 3)})`;
    ctx.lineWidth = 0.04;
    ctx.beginPath();
    for (let x = B.minX; x <= B.maxX; x += 0.25) ctx.lineTo(x, B.minY - 0.15 + 0.06 * Math.sin(x * 3 + time * 5));
    ctx.stroke();
  }

  /** Câbles d'une plateforme suspendue (jusqu'au plafond). */
  _drawCables(s) {
    const ctx = this.ctx;
    const top = this.ceilingY;
    ctx.strokeStyle = '#3c4866';
    ctx.lineWidth = 0.05;
    ctx.beginPath();
    for (const cx of [s.x0 + 0.3, s.x1 - 0.3]) {
      ctx.moveTo(cx, s.y1);
      ctx.lineTo(cx, top);
    }
    ctx.stroke();
    ctx.fillStyle = '#56648a';
    for (const cx of [s.x0 + 0.3, s.x1 - 0.3]) ctx.fillRect(cx - 0.08, s.y1, 0.16, 0.12);
  }

  _drawArenaSolid(s, time) {
    const style = s.style;
    if (style === 'bumper') return this._drawBumper(s, time);
    if (style === 'glass') return this._drawGlass(s, time);
    if (!s.box) return this._drawRamp(s, time);
    const ctx = this.ctx;
    const A = this.accent;
    const x = s.x0;
    const y = s.y0;
    const w = s.x1 - s.x0;
    const h = s.y1 - s.y0;
    const thin = h <= 0.8 && w > h;
    if (style === 'ice') {
      const grad = ctx.createLinearGradient(0, y + h, 0, y);
      grad.addColorStop(0, '#d6f6ff');
      grad.addColorStop(0.1, '#7fd0f2');
      grad.addColorStop(1, '#2a6c9c');
      ctx.fillStyle = grad;
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      for (let xx = x + 0.6; xx < x + w - 0.3; xx += 1.7) ctx.fillRect(xx, y + h - 0.3, 0.5, 0.05);
      ctx.fillStyle = 'rgba(230,252,255,0.95)';
      ctx.fillRect(x, y + h - 0.05, w, 0.05);
      return;
    }
    // Corps en acier brossé (plus sombre pour les murs)
    const wallish = style === 'wall' || style === 'ground';
    const grad = ctx.createLinearGradient(0, y + h, 0, y);
    grad.addColorStop(0, wallish ? '#2a3450' : '#3d4a6c');
    grad.addColorStop(Math.min(0.5, 0.25 / Math.max(0.3, h)), wallish ? '#1c2438' : '#28324c');
    grad.addColorStop(1, wallish ? '#0f1424' : '#151c30');
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, w, h);
    // Panneaux, rainures, rivets
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    if (wallish) {
      const step = 1.5;
      for (let yy = y + h - step; yy > y + 0.2; yy -= step) ctx.fillRect(x, yy, w, 0.035);
      if (w > 1.2) for (let xx = x + step; xx < x + w - 0.2; xx += step) ctx.fillRect(xx, y, 0.035, h);
    } else if (!thin && h > 1.2) {
      for (let yy = y + h - 1.1; yy > y + 0.3; yy -= 1.1) ctx.fillRect(x + 0.1, yy, w - 0.2, 0.03);
    }
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fillRect(x, y, 0.05, h);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(x + w - 0.05, y, 0.05, h);
    ctx.fillRect(x, y, w, 0.05);
    if (w > 0.9 && h > 0.35) {
      ctx.fillStyle = 'rgba(170,190,230,0.35)';
      const ry = y + h - 0.2;
      for (const rx of [x + 0.22, x + w - 0.22]) {
        ctx.beginPath();
        ctx.arc(rx, ry, 0.05, 0, TAU);
        ctx.fill();
      }
    }
    // Bandes de danger aux extrémités des plateformes fines
    if (thin && w > 1.6 && style !== 'ground') {
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, y + 0.06, w, Math.max(0.05, h - 0.18));
      ctx.clip();
      ctx.fillStyle = 'rgba(255,190,40,0.5)';
      for (const ex of [x, x + w - 0.5]) {
        for (let k = -1; k < 3; k++) {
          ctx.beginPath();
          ctx.moveTo(ex + k * 0.25, y);
          ctx.lineTo(ex + k * 0.25 + 0.12, y);
          ctx.lineTo(ex + k * 0.25 + 0.12 + h, y + h);
          ctx.lineTo(ex + k * 0.25 + h, y + h);
          ctx.closePath();
          ctx.fill();
        }
      }
      ctx.restore();
    }
    // Liseré lumineux sur la face supérieure : la surface de rebond se lit d'un coup d'œil
    if (y + h < this.ceilingY - 0.05) {
      const lit = wallish ? 0.55 : 0.9;
      ctx.fillStyle = '#9aa8c8';
      ctx.fillRect(x, y + h - 0.07, w, 0.07);
      ctx.fillStyle = `rgba(${A},${lit})`;
      ctx.fillRect(x + 0.02, y + h - 0.035, w - 0.04, 0.035);
      ctx.globalAlpha = 0.16;
      ctx.fillRect(x, y + h - 0.1, w, 0.2);
      ctx.globalAlpha = 1;
    }
    ctx.strokeStyle = `rgba(${A},0.18)`;
    ctx.lineWidth = 0.03;
    ctx.strokeRect(x + 0.015, y + 0.015, w - 0.03, h - 0.03);
  }

  /** Mur incliné (polygone) : acier, néon sur l'arête de rebond (la plus longue des arêtes obliques). */
  _drawRamp(s, time) {
    const ctx = this.ctx;
    const A = this.accent;
    const grad = ctx.createLinearGradient(s.x0, s.y1, s.x1, s.y0);
    grad.addColorStop(0, '#36425f');
    grad.addColorStop(1, '#161d31');
    ctx.fillStyle = grad;
    this._path(s);
    ctx.fill();
    const P = s.points;
    let best = 0;
    let bi = 0;
    for (let i = 0; i < P.length; i++) {
      const a = P[i];
      const b = P[(i + 1) % P.length];
      const l = Math.hypot(b.x - a.x, b.y - a.y);
      const axis = Math.abs(b.x - a.x) < 0.01 || Math.abs(b.y - a.y) < 0.01;
      if (!axis && l > best) {
        best = l;
        bi = i;
      }
    }
    const a = P[bi];
    const b = P[(bi + 1) % P.length];
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#9aa8c8';
    ctx.lineWidth = 0.08;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.strokeStyle = `rgba(${A},${0.8 + 0.15 * Math.sin(time * 2)})`;
    ctx.lineWidth = 0.04;
    ctx.stroke();
    ctx.globalAlpha = 0.15;
    ctx.lineWidth = 0.24;
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = `rgba(${A},0.18)`;
    ctx.lineWidth = 0.03;
    this._path(s);
    ctx.stroke();
  }

  /** Verre blindé (cages) : translucide, reflets ; solide comme un mur. */
  _drawGlass(s, time) {
    const ctx = this.ctx;
    const x = s.x0;
    const y = s.y0;
    const w = s.x1 - s.x0;
    const h = s.y1 - s.y0;
    ctx.fillStyle = 'rgba(150,220,255,0.13)';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = 'rgba(190,240,255,0.8)';
    ctx.lineWidth = 0.04;
    ctx.strokeRect(x + 0.02, y + 0.02, w - 0.04, h - 0.04);
    ctx.strokeStyle = `rgba(255,255,255,${0.2 + 0.08 * Math.sin(time * 1.5 + x)})`;
    ctx.lineWidth = 0.05;
    ctx.beginPath();
    const d = Math.min(w, h);
    if (h > w) {
      ctx.moveTo(x + w * 0.5, y + h * 0.75);
      ctx.lineTo(x + w * 0.5, y + h * 0.9);
    } else {
      ctx.moveTo(x + w * 0.1, y + h * 0.5);
      ctx.lineTo(x + w * 0.1 + Math.max(d, 0.6), y + h * 0.5);
    }
    ctx.stroke();
    ctx.fillStyle = '#56648a';
    if (h > w) {
      ctx.fillRect(x - 0.03, y, w + 0.06, 0.12);
      ctx.fillRect(x - 0.03, y + h - 0.12, w + 0.06, 0.12);
    } else {
      ctx.fillRect(x, y - 0.03, 0.12, h + 0.06);
      ctx.fillRect(x + w - 0.12, y - 0.03, 0.12, h + 0.06);
    }
  }

  _drawBumper(s, time) {
    const ctx = this.ctx;
    const x = s.x0;
    const y = s.y0;
    const w = s.x1 - s.x0;
    const h = s.y1 - s.y0;
    const r = Math.min(w, h) * 0.3;
    let flash = 0;
    for (const f of this.bumpFlash.values()) if (f.x > x - 0.6 && f.x < x + w + 0.6 && f.y > y - 0.6 && f.y < y + h + 0.6) flash = Math.max(flash, f.t);
    this._drawGlow('255,80,180', x + w / 2, y + h / 2, Math.max(w, h) * (0.7 + flash * 0.6), 0.3 + flash * 0.6 + 0.1 * Math.sin(time * 4));
    const grad = ctx.createLinearGradient(0, y + h, 0, y);
    grad.addColorStop(0, flash > 0 ? '#ffd6ee' : '#ff7ac4');
    grad.addColorStop(1, '#b8186e');
    ctx.fillStyle = grad;
    if (!s.box) {
      this._path(s);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.lineWidth = 0.08;
      ctx.lineJoin = 'round';
      ctx.stroke();
      return;
    }
    rrect(ctx, x, y, w, h, r);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 0.07;
    rrect(ctx, x + 0.08, y + 0.08, w - 0.16, h - 0.16, Math.max(0.02, r - 0.08));
    ctx.stroke();
  }

  // ─── Mécanismes ─────────────────────────────────────────────────────────

  /** Porte : volet d'acier à bandes de danger et voyant (rouge fermée, vert ouverte) ; passage secret : un mur. */
  _drawArenaDoor(d, time) {
    const ctx = this.ctx;
    const x = d.def.x + d.offsetX;
    const y = d.def.y + d.offsetY;
    const w = d.def.w;
    const h = d.def.h;
    if (d.def.style === 'wall') {
      this._drawArenaSolid({ x0: x, y0: y, x1: x + w, y1: y + h, box: true, style: 'wall' }, time);
      ctx.strokeStyle = `rgba(${this.accent},${0.12 + 0.08 * Math.sin(time * 2)})`;
      ctx.lineWidth = 0.03;
      ctx.strokeRect(x + 0.04, y + 0.04, w - 0.08, h - 0.08);
      return;
    }
    const moved = Math.hypot(d.offsetX, d.offsetY) > 0.05;
    ctx.strokeStyle = 'rgba(255,190,60,0.25)';
    ctx.lineWidth = 0.03;
    ctx.setLineDash([0.15, 0.12]);
    ctx.strokeRect(d.def.x, d.def.y, w, h);
    ctx.setLineDash([]);
    const grad = ctx.createLinearGradient(x, 0, x + w, 0);
    grad.addColorStop(0, '#4a3c22');
    grad.addColorStop(0.5, '#7a6234');
    grad.addColorStop(1, '#3a2e18');
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, w, h);
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    ctx.fillStyle = 'rgba(255,200,40,0.7)';
    const L = Math.max(w, h);
    for (let k = -L; k < L * 2; k += 0.5) {
      ctx.beginPath();
      ctx.moveTo(x + k, y);
      ctx.lineTo(x + k + 0.22, y);
      ctx.lineTo(x + k + 0.22 + h, y + h);
      ctx.lineTo(x + k + h, y + h);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    ctx.strokeStyle = 'rgba(20,14,4,0.8)';
    ctx.lineWidth = 0.05;
    ctx.strokeRect(x + 0.025, y + 0.025, w - 0.05, h - 0.05);
    const lit = moved ? '90,255,150' : '255,70,80';
    const lx = d.def.x + w / 2;
    const ly = d.def.y + h + 0.25;
    this._drawGlow(lit, lx, ly, 0.5, 0.6 + 0.2 * Math.sin(time * 6));
    ctx.fillStyle = `rgb(${lit})`;
    ctx.beginPath();
    ctx.arc(lx, ly, 0.08, 0, TAU);
    ctx.fill();
  }

  _drawArenaFan(f, time) {
    this._drawFanGrate(f);
    if (f.def.target && !f.on) this._drawGlow('255,80,90', f.x + f.w / 2, f.y + 0.05, 0.5, 0.5 + 0.2 * Math.sin(time * 5));
  }

  /** Rail d'un ascenseur ou d'une plateforme mobile : glissières et trajet en pointillés. */
  _drawRail(m) {
    const ctx = this.ctx;
    const x0 = m.x + Math.min(0, m.path.dx);
    const y0 = m.y + Math.min(0, m.path.dy);
    const w = m.w + Math.abs(m.path.dx);
    const h = m.h + Math.abs(m.path.dy);
    ctx.fillStyle = 'rgba(10,14,26,0.55)';
    if (Math.abs(m.path.dy) >= Math.abs(m.path.dx)) {
      ctx.fillRect(x0 + 0.12, y0, 0.1, h);
      ctx.fillRect(x0 + w - 0.22, y0, 0.1, h);
    } else {
      ctx.fillRect(x0, y0 + h / 2 - 0.05, w, 0.1);
    }
    ctx.strokeStyle = 'rgba(255,181,71,0.25)';
    ctx.lineWidth = 0.03;
    ctx.setLineDash([0.18, 0.14]);
    ctx.strokeRect(x0, y0, w, h);
    ctx.setLineDash([]);
  }

  _drawArenaMover(m) {
    const ctx = this.ctx;
    const xs = m.mover.colliders.flatMap((c) => [c.ax, c.bx]);
    const ys = m.mover.colliders.flatMap((c) => [c.ay, c.by]);
    const x0 = Math.min(...xs);
    const y0 = Math.min(...ys);
    const w = Math.max(...xs) - x0;
    const h = Math.max(...ys) - y0;
    const grad = ctx.createLinearGradient(0, y0 + h, 0, y0);
    grad.addColorStop(0, '#4a587c');
    grad.addColorStop(1, '#1e263e');
    ctx.fillStyle = grad;
    ctx.fillRect(x0, y0, w, h);
    ctx.save();
    ctx.beginPath();
    ctx.rect(x0, y0, w, h);
    ctx.clip();
    ctx.fillStyle = 'rgba(255,196,50,0.85)';
    for (let k = -1; k < w + 1; k += 0.4) {
      ctx.beginPath();
      ctx.moveTo(x0 + k, y0);
      ctx.lineTo(x0 + k + 0.2, y0);
      ctx.lineTo(x0 + k + 0.2 + h, y0 + h);
      ctx.lineTo(x0 + k + h, y0 + h);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    ctx.fillStyle = '#ffe9a8';
    ctx.fillRect(x0, y0 + h - 0.05, w, 0.05);
    this._drawGlow('255,196,50', x0 + w / 2, y0 + h, w * 0.5, 0.25);
  }

  _drawBreakable(b, time) {
    if (b.broken) return;
    const ctx = this.ctx;
    const { x, y, w, h } = b;
    // Caisse de laboratoire : cadre d'acier, panneaux orange, fêlures qui scintillent (« cassable »)
    ctx.fillStyle = '#2b3550';
    ctx.fillRect(x, y, w, h);
    const grad = ctx.createLinearGradient(0, y + h, 0, y);
    grad.addColorStop(0, '#ffa64a');
    grad.addColorStop(1, '#b8571a');
    ctx.fillStyle = grad;
    ctx.fillRect(x + 0.1, y + 0.1, w - 0.2, h - 0.2);
    ctx.strokeStyle = '#1a2034';
    ctx.lineWidth = 0.07;
    ctx.beginPath();
    ctx.moveTo(x + 0.1, y + 0.1);
    ctx.lineTo(x + w - 0.1, y + h - 0.1);
    ctx.moveTo(x + w - 0.1, y + 0.1);
    ctx.lineTo(x + 0.1, y + h - 0.1);
    ctx.stroke();
    ctx.strokeStyle = `rgba(255,240,200,${0.35 + 0.3 * Math.sin(time * 3 + x)})`;
    ctx.lineWidth = 0.03;
    ctx.beginPath();
    ctx.moveTo(x + w * 0.5, y + h * 0.82);
    ctx.lineTo(x + w * 0.64, y + h * 0.6);
    ctx.lineTo(x + w * 0.42, y + h * 0.42);
    ctx.lineTo(x + w * 0.55, y + h * 0.2);
    ctx.stroke();
  }

  // ─── Panier néon ────────────────────────────────────────────────────────

  /** Panier suspendu : câbles de la planche au plafond. */
  _drawHoopCables(h) {
    const ctx = this.ctx;
    const b = h.board;
    ctx.strokeStyle = '#3c4866';
    ctx.lineWidth = 0.05;
    ctx.beginPath();
    for (const cx of [b.x + 0.02, b.x + b.w - 0.02]) {
      ctx.moveTo(cx, b.y + b.h);
      ctx.lineTo(cx, this.ceilingY);
    }
    ctx.stroke();
  }

  _drawHoopBack(h, goal, time) {
    const ctx = this.ctx;
    const hot = goal && time - goal.t0 < 1.2 ? 1 - (time - goal.t0) / 1.2 : 0;
    this._drawGlow('255,120,50', h.centerX, h.rimY, 1.2 + hot * 1.2, 0.2 + 0.06 * Math.sin(time * 3) + hot * 0.8);
    if (h.pole) {
      const g = ctx.createLinearGradient(h.pole.x, 0, h.pole.x + h.pole.w, 0);
      g.addColorStop(0, '#56648a');
      g.addColorStop(1, '#232c46');
      ctx.fillStyle = g;
      ctx.fillRect(h.pole.x, h.pole.y, h.pole.w, h.pole.h);
      ctx.strokeStyle = '#3c4866';
      ctx.lineWidth = 0.14;
      ctx.beginPath();
      ctx.moveTo(h.arm.x1, h.arm.y);
      ctx.lineTo(h.arm.x2, h.arm.y);
      ctx.stroke();
    }
    // Planche de verre au cadre néon
    const b = h.board;
    const bx = b.x - 0.02;
    ctx.fillStyle = 'rgba(160,220,255,0.16)';
    ctx.fillRect(bx, b.y, b.w + 0.04, b.h);
    ctx.strokeStyle = `rgba(${this.accent},0.95)`;
    ctx.lineWidth = 0.05;
    ctx.strokeRect(bx, b.y, b.w + 0.04, b.h);
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    const faceX = h.facing === -1 ? b.x : b.x + b.w - 0.035;
    ctx.fillRect(faceX, h.rimY + 0.05, 0.035, 0.5);
    ctx.strokeStyle = '#8a97b8';
    ctx.lineWidth = h.rimRadius * 1.6;
    ctx.beginPath();
    ctx.moveTo(h.backX, h.rimY);
    ctx.lineTo(h.facing === -1 ? b.x : b.x + b.w, h.rimY);
    ctx.stroke();
    ctx.strokeStyle = '#c2461c';
    ctx.lineWidth = h.rimRadius * 2;
    ctx.beginPath();
    ctx.ellipse(h.centerX, h.rimY, (h.rightX - h.leftX) / 2, 0.13, 0, 0, Math.PI);
    ctx.stroke();
  }

  _drawHoopFront(h, time = 0) {
    const ctx = this.ctx;
    const net = h.net;
    const L = net.drawLinks;
    const glow = this.netGlow;
    ctx.lineCap = 'round';
    const links = () => {
      ctx.beginPath();
      for (let i = 0; i < L.length; i += 2) {
        ctx.moveTo(net.x[L[i]], net.y[L[i]]);
        ctx.lineTo(net.x[L[i + 1]], net.y[L[i + 1]]);
      }
      ctx.stroke();
    };
    // Filet : fils blancs ; halo doré quand il vient de servir
    if (glow > 0.02) {
      ctx.strokeStyle = `rgba(255,214,120,${0.45 * glow})`;
      ctx.lineWidth = 0.1;
      links();
    }
    ctx.strokeStyle = glow > 0.02 ? `rgb(255,${Math.round(235 + 20 * glow)},${Math.round(230 - 70 * glow)})` : 'rgba(240,246,255,0.92)';
    ctx.lineWidth = 0.034;
    links();
    // Moitié avant du cercle : néon orange (lueur, cœur, filament clair)
    const rx = (h.rightX - h.leftX) / 2;
    ctx.strokeStyle = 'rgba(255,120,40,0.32)';
    ctx.lineWidth = h.rimRadius * 4.5;
    ctx.beginPath();
    ctx.ellipse(h.centerX, h.rimY, rx, 0.13, 0, Math.PI, TAU);
    ctx.stroke();
    ctx.strokeStyle = '#ff6a1f';
    ctx.lineWidth = h.rimRadius * 2;
    ctx.stroke();
    ctx.strokeStyle = `rgba(255,${Math.round(210 + 30 * Math.sin(time * 4))},150,0.95)`;
    ctx.lineWidth = h.rimRadius * 0.7;
    ctx.stroke();
  }

  // ─── Pas de tir et visée ────────────────────────────────────────────────

  /** Pas de tir : socle mécanique, anneau lumineux, invitation à toucher le ballon pendant la visée. */
  _drawPad(tee, time, active) {
    if (!tee) return;
    const ctx = this.ctx;
    const A = this.accent;
    const y = tee.y - 0.42;
    const pulse = 0.5 + 0.5 * Math.sin(time * (active ? 4 : 2));
    ctx.fillStyle = '#3a4566';
    ctx.fillRect(tee.x - 0.55, y - 0.02, 1.1, 0.08);
    ctx.fillStyle = '#9aa8c8';
    ctx.fillRect(tee.x - 0.55, y + 0.05, 1.1, 0.02);
    this._drawGlow(A, tee.x, y, 1.0, 0.2 + 0.25 * pulse);
    ctx.strokeStyle = `rgba(${A},${0.5 + 0.4 * pulse})`;
    ctx.lineWidth = 0.045;
    ctx.beginPath();
    ctx.ellipse(tee.x, y + 0.07, 0.5 + pulse * 0.18, 0.11 + pulse * 0.04, 0, 0, TAU);
    ctx.stroke();
    if (active) {
      ctx.globalAlpha = 0.22 + 0.25 * pulse;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 0.035;
      ctx.beginPath();
      ctx.arc(tee.x, tee.y, 0.62 + 0.12 * pulse, 0, TAU);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  /** Visée : élastique, ballon tiré vers l'arrière, pointillés du DÉBUT de la trajectoire. */
  _drawAim(aim, time) {
    const ctx = this.ctx;
    const { from, pull, pts, power } = aim;
    const hot = power > 0.85 ? '255,90,90' : power > 0.55 ? '255,181,71' : '255,255,255';
    ctx.strokeStyle = `rgba(${this.accent},0.85)`;
    ctx.lineWidth = 0.07;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(from.x - 0.5, from.y - 0.25);
    ctx.lineTo(pull.x, pull.y);
    ctx.lineTo(from.x + 0.5, from.y - 0.25);
    ctx.stroke();
    // De plus en plus petits et transparents : on devine la suite, sans la voir
    const n = pts.length;
    for (let i = 0; i < n; i += 2) {
      const p = pts[i];
      const k = 1 - i / Math.max(1, n);
      const r = 0.045 + 0.075 * k;
      ctx.fillStyle = `rgba(${hot},${0.12 + 0.78 * k * k})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r * (1 + 0.12 * Math.sin(time * 10 - i * 0.5)), 0, TAU);
      ctx.fill();
    }
  }

  /** Repère du geste, là où se trouve le doigt : cercle de pleine puissance, trait du geste, jauge. */
  _drawTouch(aim) {
    const ctx = this.ctx;
    const { start, finger, radius } = aim.touch;
    const hot = aim.power > 0.85 ? '255,90,90' : aim.power > 0.55 ? '255,181,71' : '255,255,255';
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 0.035;
    ctx.setLineDash([0.12, 0.12]);
    ctx.beginPath();
    ctx.arc(start.x, start.y, radius, 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);
    const dx = finger.x - start.x;
    const dy = finger.y - start.y;
    const len = Math.hypot(dx, dy);
    const k = len > radius ? radius / len : 1;
    const ex = start.x + dx * k;
    const ey = start.y + dy * k;
    ctx.strokeStyle = `rgba(${hot},0.6)`;
    ctx.lineWidth = 0.06;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    ctx.fillStyle = `rgba(${hot},0.85)`;
    ctx.beginPath();
    ctx.arc(ex, ey, 0.14, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = `rgba(${hot},0.9)`;
    ctx.lineWidth = 0.09;
    ctx.beginPath();
    ctx.arc(start.x, start.y, 0.42, Math.PI / 2, Math.PI / 2 - aim.power * TAU, true);
    ctx.stroke();
  }
}

function rrect(ctx, x, y, w, h, r) {
  const rr = clamp(r, 0, Math.min(w, h) / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  ctx.lineTo(x + rr, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
  ctx.lineTo(x, y + rr);
  ctx.quadraticCurveTo(x, y, x + rr, y);
  ctx.closePath();
}
