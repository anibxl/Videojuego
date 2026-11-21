// Rendu du mode TRICKSHOT : « l'Arène ». Une identité propre, distincte des 5 mondes du jeu principal :
// salle de trickshot nocturne, fond de plan d'architecte (quadrillage), projecteurs, grand numéro du
// niveau, blocs sombres aux arêtes néon dans la couleur du chapitre, bumpers roses de flipper, glace,
// roche. Le pas de tir est un socle holographique ; la visée affiche l'élastique et les pointillés.
//
// Hérite du rendu du jeu (ballon et skins, panier et filet, particules, éléments des mondes) sans le
// modifier : seuls le décor, les blocs et les éléments propres au mode sont redessinés ici.

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

/** Thème de l'Arène (mêmes champs que les thèmes des mondes, utilisés par le rendu commun). */
export function arenaTheme(accent) {
  return {
    light: '0,2,18',
    grade: [
      { x: 0.5, y: -0.15, r: 0.9, color: accent, alpha: 0.1 },
      { x: 0.95, y: 1.05, r: 0.6, color: '255,90,170', alpha: 0.06 },
    ],
    ballLight: [{ color: accent, angle: 0.7, alpha: 0.45 }, { color: '255,255,255', angle: 2.5, alpha: 0.22 }],
    surface: { dust: 'rgba(200,220,255,0.5)' },
    hint: 'rgba(235,242,255,0.6)',
    music: 'arena',
  };
}

/** Fond de l'Arène : précalculé à la taille de l'écran (la caméra ne bouge presque pas). */
class ArenaBackground {
  constructor(level, accent, number) {
    this.accent = accent;
    this.number = number;
    this.bounds = level.bounds;
    this.motes = Array.from({ length: 28 }, (_, i) => ({ u: (i * 0.618) % 1, v: (i * 0.377) % 1, s: 0.6 + ((i * 7) % 5) * 0.25, sp: 0.01 + ((i * 3) % 7) * 0.004, ph: i * 1.7 }));
    this._key = '';
  }

  _bake(w, h, dpr, cam) {
    const W = Math.max(16, Math.round(w * dpr));
    const H = Math.max(16, Math.round(h * dpr));
    const c = makeCanvas(W, H);
    const g = c.getContext('2d');
    const A = this.accent;
    // Dégradé de la salle
    const lin = g.createLinearGradient(0, 0, 0, H);
    lin.addColorStop(0, '#04050d');
    lin.addColorStop(0.55, '#0a0d22');
    lin.addColorStop(1, '#10132e');
    g.fillStyle = lin;
    g.fillRect(0, 0, W, H);
    // Lueur de la couleur du chapitre derrière la zone de jeu
    const glow = g.createRadialGradient(W * 0.5, H * 0.62, 0, W * 0.5, H * 0.62, Math.max(W, H) * 0.65);
    glow.addColorStop(0, `rgba(${A},0.16)`);
    glow.addColorStop(1, `rgba(${A},0)`);
    g.fillStyle = glow;
    g.fillRect(0, 0, W, H);
    // Quadrillage de plan d'architecte, aligné sur les unités du monde
    const S = cam.scale * dpr;
    const ox = W / 2 - cam.x * S;
    const oy = H / 2 + cam.y * S;
    g.lineWidth = Math.max(1, dpr * 0.6);
    for (let k = 0; k < 2; k++) {
      const step = k ? 4 : 1;
      g.strokeStyle = `rgba(${A},${k ? 0.1 : 0.04})`;
      g.beginPath();
      for (let x = Math.floor(-ox / S / step) * step; x * S + ox < W; x += step) {
        g.moveTo(Math.round(x * S + ox) + 0.5, 0);
        g.lineTo(Math.round(x * S + ox) + 0.5, H);
      }
      for (let y = Math.floor((oy - H) / S / step) * step; oy - y * S > 0; y += step) {
        g.moveTo(0, Math.round(oy - y * S) + 0.5);
        g.lineTo(W, Math.round(oy - y * S) + 0.5);
      }
      g.stroke();
    }
    // Grand numéro du niveau, en filigrane
    g.save();
    g.font = `900 ${Math.round(H * 0.62)}px Unbounded, system-ui, sans-serif`;
    g.textAlign = 'right';
    g.textBaseline = 'alphabetic';
    g.lineWidth = Math.max(1, dpr * 1.4);
    g.strokeStyle = `rgba(${A},0.09)`;
    g.fillStyle = 'rgba(255,255,255,0.018)';
    const label = String(this.number).padStart(2, '0');
    g.fillText(label, W * 0.97, H * 0.78);
    g.strokeText(label, W * 0.97, H * 0.78);
    g.restore();
    // Projecteurs (cônes doux, figés dans l'image)
    for (const [fx, ang] of [[0.2, 0.18], [0.8, -0.18]]) {
      g.save();
      g.translate(W * fx, -H * 0.05);
      g.rotate(ang);
      const beam = g.createLinearGradient(0, 0, 0, H * 1.1);
      beam.addColorStop(0, 'rgba(255,255,255,0.09)');
      beam.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = beam;
      g.beginPath();
      g.moveTo(-W * 0.02, 0);
      g.lineTo(W * 0.02, 0);
      g.lineTo(W * 0.16, H * 1.1);
      g.lineTo(-W * 0.16, H * 1.1);
      g.closePath();
      g.fill();
      g.restore();
    }
    this._canvas = c;
  }

  draw(ctx, cam, w, h, time) {
    const dpr = ctx.getTransform().a || 1;
    const key = `${w}|${h}|${dpr}|${cam.scale.toFixed(3)}|${cam.x.toFixed(2)}|${cam.y.toFixed(2)}`;
    if (key !== this._key) {
      // On ne recalcule que si l'écran ou le cadrage changent vraiment (pas pour une secousse)
      const coarse = `${w}|${h}|${dpr}|${Math.round(cam.scale)}`;
      if (coarse !== this._coarse || !this._canvas) {
        this._bake(w, h, dpr, cam);
        this._coarse = coarse;
      }
      this._key = key;
    }
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(this._canvas, 0, 0);
    ctx.restore();
    // Poussières lumineuses qui dérivent dans les faisceaux
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    for (const m of this.motes) {
      const x = ((m.u + time * m.sp) % 1) * w;
      const y = ((m.v + Math.sin(time * 0.3 + m.ph) * 0.02) % 1) * h;
      ctx.globalAlpha = 0.15 + 0.15 * Math.sin(time * 1.3 + m.ph);
      ctx.fillRect(x, y, m.s, m.s);
    }
    ctx.globalAlpha = 1;
  }

  drawFront() {}
}

export class ArenaRenderer extends Renderer {
  constructor(canvas, level, { accent = '63,224,255', number = 1 } = {}) {
    // setLevel est appelé par le constructeur parent : on mémorise d'abord la couleur et le numéro
    ArenaRenderer._pending = { accent, number };
    super(canvas, level);
    this.bumpFlash = new Map();
  }

  setLevel(level) {
    const opts = ArenaRenderer._pending ?? { accent: this.accent, number: this.number };
    this.accent = opts.accent;
    this.number = opts.number;
    ArenaRenderer._pending = null;
    this.themeId = 'arena';
    this.theme = arenaTheme(this.accent);
    this.background = new ArenaBackground(level, this.accent, this.number);
    this.rimSprites = [];
    if (this.w > 1) this._bakeVignette();
  }

  /** Éclat d'un bumper touché (appelé à l'impact). */
  flashBumper(x, y) {
    this.bumpFlash.set(`${Math.round(x * 2)}|${Math.round(y * 2)}`, { x, y, t: 1 });
  }

  draw(s) {
    const { ctx, dpr } = this;
    const cam = s.camera;
    const L = s.level;
    if (s.frameDt > 0) this.fps += (1 / s.frameDt - this.fps) * 0.05;
    for (const [k, f] of this.bumpFlash) if ((f.t -= s.frameDt * 3) <= 0) this.bumpFlash.delete(k);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.background.draw(ctx, cam, this.w, this.h, s.time);

    const k = cam.scale * dpr;
    ctx.setTransform(k, 0, 0, -k, dpr * (this.w / 2 - cam.x * cam.scale), dpr * (this.h / 2 + cam.y * cam.scale));
    this.view = { left: cam.x - cam.halfWidth - 1, right: cam.x + cam.halfWidth + 1 };
    const t = s.renderTime;
    const time = s.time;

    for (const f of L.fans) this._drawWind(f, time);
    for (const z of L.gravityZones) drawGravityZone(this, z, time, s.body.gravitySign < 0 && z.contains(s.body.x, s.body.y));
    for (const m of L.magnets) drawMagnet(this, m, time);
    for (const d of L.doors) this._drawArenaDoor(d, time);
    for (const solid of L.solids) this._drawArenaSolid(solid, time);
    for (const l of L.lavas) drawLiquid(this, l, time, L.bounds.minY - 2);
    for (const f of L.fans) this._drawArenaFan(f, time);
    for (const cr of L.crumbles) drawCrumble(this, cr, time);
    for (const m of L.movers) this._drawArenaMover(m, t);
    for (const b of L.breakables ?? []) this._drawBreakable(b, time);
    for (const tr of L.trampolines) this._drawTrampoline(tr);
    for (const sw of L.switches) this._drawSwitch(sw, time);
    for (const sp of L.spikes) drawSpikes(this, sp, time);
    for (const bl of L.blinkers) drawBlinker(this, bl, t);
    for (const sw of L.saws) drawSaw(this, sw, time);
    for (const l of L.lasers) drawLaser(this, l, t);
    // Boules de feu et boules de neige : l'apparence du volcan ou de la neige, le temps d'un élément
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
    this._drawHoopFront(L.hoop);
    this._drawParticles(s.particles);
    s.fx?.draw(ctx);

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

  // ─── Blocs de l'Arène ────────────────────────────────────────────────────

  _path(s) {
    const ctx = this.ctx;
    ctx.beginPath();
    s.points.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.closePath();
  }

  _drawArenaSolid(s, time) {
    const ctx = this.ctx;
    const A = this.accent;
    const x = s.x0;
    const y = s.y0;
    const w = s.x1 - s.x0;
    const h = s.y1 - s.y0;
    const style = s.style;
    if (style === 'bumper') return this._drawBumper(s, time);
    // Corps
    const grad = ctx.createLinearGradient(0, y + h, 0, y);
    if (style === 'ice') {
      grad.addColorStop(0, '#bfeeff');
      grad.addColorStop(0.08, '#6fc6ee');
      grad.addColorStop(1, '#2a6c9c');
    } else if (style === 'rock') {
      grad.addColorStop(0, '#5a3a30');
      grad.addColorStop(1, '#22140f');
    } else if (style === 'ground') {
      grad.addColorStop(0, '#20264a');
      grad.addColorStop(0.12, '#141a36');
      grad.addColorStop(1, '#090c1e');
    } else {
      grad.addColorStop(0, style === 'wall' ? '#1d2448' : '#252d58');
      grad.addColorStop(1, style === 'wall' ? '#0e1230' : '#151a3c');
    }
    ctx.fillStyle = grad;
    if (s.box) ctx.fillRect(x, y, w, h);
    else {
      this._path(s);
      ctx.fill();
    }
    // Détails
    if (s.box) {
      if (style === 'ice') {
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        for (let xx = x + 0.6; xx < x + w - 0.3; xx += 1.7) ctx.fillRect(xx, y + h - 0.32, 0.5, 0.05);
      } else if (style === 'rock') {
        ctx.fillStyle = 'rgba(255,120,60,0.25)';
        ctx.fillRect(x, y + h - 0.05, w, 0.05);
      } else if (style === 'wall' || style === 'block') {
        // Panneaux : joints réguliers (dans la zone visible)
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        const step = 1.5;
        for (let yy = y + h - step; yy > y + 0.2; yy -= step) ctx.fillRect(x, yy, w, 0.03);
        if (w > 1.2) for (let xx = x + step; xx < x + w - 0.2; xx += step) ctx.fillRect(xx, y, 0.03, h);
      } else if (style === 'ground') {
        // Ligne de terrain et reflet du sol ciré
        ctx.fillStyle = `rgba(${A},0.18)`;
        ctx.fillRect(x, y + h - 0.32, w, 0.03);
      }
    }
    // Arêtes néon (dessus brillant, contour discret)
    ctx.lineJoin = 'round';
    ctx.strokeStyle = style === 'ice' ? 'rgba(220,250,255,0.9)' : style === 'rock' ? 'rgba(255,140,80,0.55)' : `rgba(${A},0.75)`;
    ctx.lineWidth = 0.05;
    if (s.box) {
      ctx.globalAlpha = 0.35;
      ctx.strokeRect(x + 0.025, y + 0.025, w - 0.05, h - 0.05);
      ctx.globalAlpha = 1;
      ctx.lineWidth = 0.07;
      ctx.beginPath();
      ctx.moveTo(x, y + h - 0.035);
      ctx.lineTo(x + w, y + h - 0.035);
      ctx.stroke();
      // Halo de l'arête (deux traits translucides : bien moins coûteux qu'un flou)
      ctx.globalAlpha = 0.18;
      ctx.lineWidth = 0.22;
      ctx.stroke();
      ctx.globalAlpha = 1;
    } else {
      this._path(s);
      ctx.stroke();
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
    this._drawGlow('255,80,180', x + w / 2, y + h / 2, Math.max(w, h) * (0.9 + flash * 0.6), 0.35 + flash * 0.6 + 0.1 * Math.sin(time * 4));
    const grad = ctx.createLinearGradient(0, y + h, 0, y);
    grad.addColorStop(0, flash > 0 ? '#ffd6ee' : '#ff7ac4');
    grad.addColorStop(1, '#b8186e');
    ctx.fillStyle = grad;
    if (!s.box) {
      // Rampe-bumper (polygone) : même matière, liseré blanc sur la face de rebond
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

  /** Porte : un mécanisme ambré ; « passage secret » : se confond avec le mur. */
  _drawArenaDoor(d, time) {
    if (d.def.style !== 'wall') {
      this._drawDoor(d);
      this._drawDoorLight(d);
      return;
    }
    const x = d.def.x + d.offsetX;
    const y = d.def.y + d.offsetY;
    this._drawArenaSolid({ x0: x, y0: y, x1: x + d.def.w, y1: y + d.def.h, box: true, style: 'wall' }, time);
    // Une fissure à peine visible trahit le passage
    const ctx = this.ctx;
    ctx.strokeStyle = `rgba(${this.accent},${0.12 + 0.08 * Math.sin(time * 2)})`;
    ctx.lineWidth = 0.03;
    ctx.strokeRect(x + 0.04, y + 0.04, d.def.w - 0.08, d.def.h - 0.08);
  }

  _drawArenaFan(f, time) {
    this._drawFanGrate(f);
    if (f.def.target && !f.on) {
      // Ventilateur éteint, relié à un bouton : voyant rouge, pales immobiles
      this._drawGlow('255,80,90', f.x + f.w / 2, f.y + 0.05, 0.5, 0.5 + 0.2 * Math.sin(time * 5));
    }
  }

  _drawArenaMover(m, t) {
    // Plateforme mobile : position exacte à l'instant du rendu (interpolée)
    const ctx = this.ctx;
    const col = m.mover.colliders[0];
    const xs = m.mover.colliders.flatMap((c) => [c.ax, c.bx]);
    const ys = m.mover.colliders.flatMap((c) => [c.ay, c.by]);
    const x0 = Math.min(...xs);
    const y0 = Math.min(...ys);
    const w = Math.max(...xs) - x0;
    const h = Math.max(...ys) - y0;
    // Rail : trajet complet en pointillés
    ctx.strokeStyle = 'rgba(255,181,71,0.35)';
    ctx.lineWidth = 0.04;
    ctx.setLineDash([0.18, 0.14]);
    ctx.strokeRect(m.x + Math.min(0, m.path.dx), m.y + Math.min(0, m.path.dy), m.w + Math.abs(m.path.dx), m.h + Math.abs(m.path.dy));
    ctx.setLineDash([]);
    const grad = ctx.createLinearGradient(0, y0 + h, 0, y0);
    grad.addColorStop(0, '#ffcf7a');
    grad.addColorStop(0.15, '#e08a2a');
    grad.addColorStop(1, '#8a4a12');
    ctx.fillStyle = grad;
    rrect(ctx, x0, y0, w, h, 0.08);
    ctx.fill();
    ctx.fillStyle = 'rgba(20,10,0,0.45)';
    for (let xx = x0 + 0.25; xx < x0 + w - 0.2; xx += 0.5) ctx.fillRect(xx, y0 + 0.08, 0.2, Math.max(0.04, h - 0.16));
    void col;
    void t;
  }

  _drawBreakable(b, time) {
    if (b.broken) return;
    const ctx = this.ctx;
    const { x, y, w, h } = b;
    const grad = ctx.createLinearGradient(0, y + h, 0, y);
    grad.addColorStop(0, '#d9a25a');
    grad.addColorStop(1, '#8a5a26');
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#4a2c10';
    ctx.lineWidth = 0.08;
    ctx.strokeRect(x + 0.04, y + 0.04, w - 0.08, h - 0.08);
    // Planches et croisillon
    ctx.lineWidth = 0.06;
    ctx.beginPath();
    for (let yy = y + 0.6; yy < y + h - 0.2; yy += 0.6) {
      ctx.moveTo(x, yy);
      ctx.lineTo(x + w, yy);
    }
    ctx.moveTo(x + 0.1, y + 0.1);
    ctx.lineTo(x + w - 0.1, y + h - 0.1);
    ctx.stroke();
    // Fêlures qui scintillent : « cassable »
    ctx.strokeStyle = `rgba(255,230,180,${0.35 + 0.25 * Math.sin(time * 3 + x)})`;
    ctx.lineWidth = 0.03;
    ctx.beginPath();
    ctx.moveTo(x + w * 0.5, y + h * 0.8);
    ctx.lineTo(x + w * 0.62, y + h * 0.6);
    ctx.lineTo(x + w * 0.45, y + h * 0.45);
    ctx.stroke();
  }

  /** Socle holographique du pas de tir. */
  _drawPad(tee, time, active) {
    if (!tee) return;
    const ctx = this.ctx;
    const A = this.accent;
    const y = tee.y - 0.42;
    const pulse = 0.5 + 0.5 * Math.sin(time * (active ? 4 : 2));
    this._drawGlow(A, tee.x, y, 1.1, 0.25 + 0.25 * pulse);
    ctx.strokeStyle = `rgba(${A},${0.5 + 0.4 * pulse})`;
    ctx.lineWidth = 0.05;
    ctx.beginPath();
    ctx.ellipse(tee.x, y, 0.62, 0.14, 0, 0, TAU);
    ctx.stroke();
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.ellipse(tee.x, y, 0.62 + pulse * 0.25, 0.14 + pulse * 0.06, 0, 0, TAU);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  /** Visée : élastique, ballon tiré vers l'arrière, pointillés de la trajectoire. */
  _drawAim(aim, time) {
    const ctx = this.ctx;
    const { from, pull, pts, power } = aim;
    const hot = power > 0.85 ? '255,90,90' : power > 0.55 ? '255,181,71' : '255,255,255';
    // Élastique : deux brins depuis les côtés du socle jusqu'au ballon tiré
    ctx.strokeStyle = `rgba(${this.accent},0.85)`;
    ctx.lineWidth = 0.07;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(from.x - 0.5, from.y - 0.2);
    ctx.lineTo(pull.x, pull.y);
    ctx.lineTo(from.x + 0.5, from.y - 0.2);
    ctx.stroke();
    // Pointillés : de plus en plus petits et transparents (on devine la suite)
    const n = pts.length;
    for (let i = 0; i < n; i++) {
      const p = pts[i];
      const k = 1 - i / Math.max(1, n);
      const r = 0.05 + 0.08 * k;
      ctx.fillStyle = `rgba(${hot},${0.25 + 0.7 * k})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r * (1 + 0.15 * Math.sin(time * 10 - i * 0.6)), 0, TAU);
      ctx.fill();
    }
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
