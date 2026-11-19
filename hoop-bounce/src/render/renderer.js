// Rendu Canvas 2D. Ne contient aucune logique de jeu : il dessine l'état qu'on lui donne.
//
// Style : nuit bleu profond, formes nettes aux angles adoucis, liseré crème sur tout ce qui se
// marche dessus, et une couleur par fonction :
//   corail = danger · menthe = trampoline · ambre = mécanisme (interrupteur, porte, plateforme mobile)
//   violet = téléporteur · bleu ciel = vent · or = étoile
//
// Ordre des calques (la balle passe « dans » le panier) :
//   fond → textes d'aide → vent → portes → décor → éléments → arrière du panier → ombre
//   → BALLE → filet et avant du cercle → particules → jauge → interface

import { clamp, lerp } from '../core/math.js';
import { pathState } from '../physics/mover.js';
import { createBallTextures, skinInfo, drawFace, drawAura } from './ball-sprite.js';
import { drawTrail } from './cosmetics.js';
import { Background } from './background.js';
import { themeOf } from './themes.js';
import {
  drawSolid, drawSpikes, drawPlank, drawThemedMover, drawCrate, drawWindZone, drawIcicle, drawLiquid, drawCrumble,
  drawGeyser, drawRockfall, drawVine, drawMushroom, drawRoller, drawBranch, drawGravityZone,
  drawFaller, drawBlinker, drawSaw, drawMace, drawLaser, drawMagnet, drawCannon, drawCrusher, drawBoulder,
} from './world-draw.js';

const C = {
  cap: '#efe5d5',
  capShade: '#cbbfae',
  blockTop: '#2c4468',
  blockBottom: '#1d3050',
  groundTop: '#1c2f4c',
  groundBottom: '#0d182b',
  wall: '#22385c',
  wallDark: '#18294a',
  wallEdge: 'rgba(239,229,213,0.55)',
  shadow: 'rgba(3,8,20,0.32)',
  coral: '#ff5f6d',
  coralLight: '#ff9aa1',
  coralDark: '#a32a3a',
  mint: '#3fe0b8',
  mintLight: '#a6ffe6',
  amber: '#ffb547',
  amberLight: '#ffe0a3',
  violet: '#9d7bff',
  sky: '120,200,255',
  gold: '#ffd65a',
  rimFront: '#ff6a3d',
  rimBack: '#a83a1c',
  board: 'rgba(225,240,255,0.88)',
  net: 'rgba(255,255,255,0.92)',
  hint: 'rgba(235,242,255,0.55)',
};

const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

export class Renderer {
  /** @param {HTMLCanvasElement} canvas */
  constructor(canvas, level) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.tex = createBallTextures();
    this.starSprite = makeStarSprite();
    this.shadowSprite = makeShadowSprite();
    this.rimSprites = [];
    this.glowSprites = new Map();
    /** Densité des particules d'ambiance (qualité graphique : 0,4 · 0,7 · 1). */
    this.particleDensity = 1;
    this.dpr = 1;
    this.w = 1;
    this.h = 1;
    this.fps = 60;
    this.setLevel(level);
  }

  /** Ballon équipé (boutique). */
  setBallSkin(id) {
    if (id === this.ballSkin) return;
    this.ballSkin = id;
    this.tex = createBallTextures(id);
    this.skin = skinInfo(id); // visage (ballons amusants), aura (légendaires)
  }

  /** Nouveau niveau : décor et lumière de son monde, adaptés à sa longueur. */
  setLevel(level) {
    const themeId = level.theme ?? 'city';
    const changed = themeId !== this.themeId;
    this.themeId = themeId;
    this.theme = themeOf(themeId);
    this.background = new Background(level, { particles: this.particleDensity });
    if (changed) this.rimSprites = (this.theme.ballLight ?? []).map((l) => ({ ...l, sprite: makeRimSprite(l.color) }));
    if (changed && this.w > 1) this._bakeVignette();
  }

  resize(cssWidth, cssHeight) {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2); // au-delà, aucun gain visible et beaucoup plus de pixels
    this.w = cssWidth;
    this.h = cssHeight;
    this.canvas.width = Math.round(cssWidth * this.dpr);
    this.canvas.height = Math.round(cssHeight * this.dpr);
    this._bakeVignette();
  }

  /**
   * Vignette teintée par la lumière du monde, précalculée à la résolution exacte du canvas :
   * copiée 1:1 à chaque image (une image agrandie coûte bien plus cher à dessiner).
   */
  _bakeVignette() {
    const vw = Math.max(16, this.canvas.width);
    const vh = Math.max(16, this.canvas.height);
    const v = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(vw, vh) : document.createElement('canvas');
    v.width = vw;
    v.height = vh;
    const vg = v.getContext('2d');
    const r = Math.hypot(vw, vh) / 2;
    const grad = vg.createRadialGradient(vw / 2, vh / 2, r * 0.55, vw / 2, vh / 2, r * 1.08);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, `rgba(${this.theme.light},0.5)`);
    vg.fillStyle = grad;
    vg.fillRect(0, 0, vw, vh);
    // Étalonnage : halos de la lumière ambiante du monde (gratuits : cuits dans la même image)
    for (const g of this.theme.grade ?? []) {
      const gr = Math.max(vw, vh) * g.r;
      const rg = vg.createRadialGradient(g.x * vw, g.y * vh, 0, g.x * vw, g.y * vh, gr);
      rg.addColorStop(0, `rgba(${g.color},${g.alpha})`);
      rg.addColorStop(1, `rgba(${g.color},0)`);
      vg.fillStyle = rg;
      vg.fillRect(0, 0, vw, vh);
    }
    this._vignette = v;
  }

  draw(s) {
    const { ctx, dpr } = this;
    const cam = s.camera;
    const L = s.level;
    if (s.frameDt > 0) this.fps = lerp(this.fps, 1 / s.frameDt, 0.05);

    // ── Fond (écran)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.background.draw(ctx, cam, this.w, this.h, s.time);
    this._drawHints(L.hints, cam);

    // ── Monde (y vers le haut)
    const k = cam.scale * dpr;
    ctx.setTransform(k, 0, 0, -k, dpr * (this.w / 2 - cam.x * cam.scale), dpr * (this.h / 2 + cam.y * cam.scale));
    const px = 1 / cam.scale;
    const view = { left: cam.x - cam.halfWidth - 1, right: cam.x + cam.halfWidth + 1 };
    const visible = (x0, x1) => x1 >= view.left && x0 <= view.right;
    const t = s.renderTime;

    const theme = this.theme;
    const time = s.time;
    this.view = view;
    for (const f of L.fans) if (visible(f.x, f.x + f.w)) this._drawWind(f, time);
    for (const z of L.gravityZones) if (visible(z.x, z.x + z.w)) drawGravityZone(this, z, time, s.body.gravitySign < 0 && z.contains(s.body.x, s.body.y));
    for (const wz of L.winds) if (visible(wz.x, wz.x + wz.w)) drawWindZone(this, wz, t);
    for (const d of L.doors) this._drawDoor(d);
    for (const solid of L.solids) if (visible(solid.x0, solid.x1)) drawSolid(this, solid, theme, time);
    if (s.tracks?.length) this._drawTracks(s.tracks, time, visible);
    for (const l of L.lavas) if (visible(l.x, l.x + l.w)) drawLiquid(this, l, time, L.bounds.minY - 2);
    for (const d of L.doors) this._drawDoorLight(d);
    for (const f of L.fans) if (visible(f.x, f.x + f.w)) this._drawFanGrate(f);
    for (const p of L.planks) if (visible(p.x1, p.x2)) drawPlank(this, p);
    for (const cr of L.crumbles) if (visible(cr.x, cr.x + cr.w)) drawCrumble(this, cr, time);
    for (const m of L.movers) if (m.path.dy === 0 && !m.style) this._drawRail(m);
    for (const m of L.movers) if (!drawThemedMover(this, m, t, theme)) this._drawMover(m, t);
    for (const br of L.branches) drawBranch(this, br, t);
    for (const ro of L.rollers) drawRoller(this, ro, t);
    for (const c of L.crates) if (visible(c.x, c.x + c.w)) drawCrate(this, c);
    for (const m of L.mushrooms) if (visible(m.x - 0.5, m.x + m.w + 0.5)) drawMushroom(this, m);
    for (const tr of L.trampolines) if (visible(tr.x, tr.x + tr.w)) this._drawTrampoline(tr);
    for (const sw of L.switches) if (visible(sw.x, sw.x + sw.w)) this._drawSwitch(sw, time);
    for (const sp of L.spikes) if (visible(sp.x, sp.x + sp.w)) drawSpikes(this, sp, time);
    for (const gy of L.geysers) if (visible(gy.x - 1, gy.x + 1)) drawGeyser(this, gy, t);
    for (const ic of L.icicles) if (visible(ic.x - 1, ic.x + 1)) drawIcicle(this, ic, time);
    for (const rf of L.rockfalls) if (visible(rf.x - 1, rf.x + 1)) drawRockfall(this, rf, t);
    for (const mg of L.magnets) if (visible(mg.x - mg.radius, mg.x + mg.radius)) drawMagnet(this, mg, time);
    for (const f of L.fallers) if (visible(f.x, f.x + f.w)) drawFaller(this, f, time);
    for (const bl of L.blinkers) if (visible(bl.x, bl.x + bl.w)) drawBlinker(this, bl, t);
    for (const sw of L.saws) if (visible(sw.cx - 1, sw.cx + 1) || (sw.path && visible(sw.x, sw.x + sw.path.dx))) drawSaw(this, sw, time);
    for (const l of L.lasers) if (visible(Math.min(l.x1, l.x2) - 1, Math.max(l.x1, l.x2) + 1)) drawLaser(this, l, t);
    for (const c of L.cannons) if (visible(Math.min(c.x, c.x + c.dx * c.range) - 1, Math.max(c.x, c.x + c.dx * c.range) + 1)) drawCannon(this, c, t);
    for (const m of L.maces) if (visible(m.x - m.len - 1, m.x + m.len + 1)) drawMace(this, m, t);
    for (const c of L.crushers) if (visible(c.x - 0.5, c.x + c.w + 0.5)) drawCrusher(this, c, t);
    for (const b of L.boulders) if (visible(b.x1 - 1, b.x2 + 1)) drawBoulder(this, b, t);
    for (const tp of L.teleporters) this._drawTeleporter(tp, t, visible);
    for (const v of L.vines) if (visible(v.x - v.len, v.x + v.len)) drawVine(this, v, s.ball, time);
    for (const c of L.checkpoints) if (visible(c.x - 1, c.x + 1)) this._drawCheckpoint(c, t);
    for (const st of L.stars) if (!st.collected && visible(st.x - 1, st.x + 1)) this._drawStar(st, s.time);
    if (s.goal) this._drawGoalBurst(s.goal, s.time);
    if (visible(L.hoop.leftX - 1, L.hoop.board.x + 2)) this._drawHoopBack(L.hoop, s.goal, s.time);

    if (s.ballVisible) {
      if (s.trail) drawTrail(ctx, s.trail.id, s.trail.pts, s.time, s.ball.r);
      else if (s.ghost) this._drawGhosts(s);
      this._drawShadow(s);
      this._drawBall(s);
    }
    if (visible(L.hoop.leftX - 1, L.hoop.board.x + 2)) this._drawHoopFront(L.hoop);
    this._drawParticles(s.particles);
    s.fx?.draw(ctx);
    if (s.ballVisible) this._drawPowerGauge(s);
    if (s.debug) this._drawDebugWorld(s, px);

    // ── Interface (écran)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.background.drawFront(ctx, cam, this.w, this.h, s.time);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(this._vignette, 0, 0);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (s.flash > 0) {
      ctx.fillStyle = `rgba(255,70,90,${0.25 * s.flash})`;
      ctx.fillRect(0, 0, this.w, this.h);
    }
    if (s.goalFlash > 0) {
      ctx.fillStyle = `rgba(255,248,230,${0.22 * s.goalFlash * s.goalFlash})`;
      ctx.fillRect(0, 0, this.w, this.h);
    }
    this._drawTexts(s);
    if (s.debug) this._drawDebugText(s);
  }

  _glow(color) {
    let g = this.glowSprites.get(color);
    if (g) return g;
    const size = 128;
    g = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(size, size) : document.createElement('canvas');
    g.width = g.height = size;
    const c = g.getContext('2d');
    const grad = c.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grad.addColorStop(0, `rgba(${color},0.55)`);
    grad.addColorStop(0.4, `rgba(${color},0.18)`);
    grad.addColorStop(1, `rgba(${color},0)`);
    c.fillStyle = grad;
    c.fillRect(0, 0, size, size);
    this.glowSprites.set(color, g);
    return g;
  }

  _drawGlow(color, x, y, r, alpha = 1) {
    const ctx = this.ctx;
    ctx.globalAlpha = alpha;
    ctx.drawImage(this._glow(color), x - r, y - r, r * 2, r * 2);
    ctx.globalAlpha = 1;
  }

  // ─── Décor ──────────────────────────────────────────────────────────────

  _drawHints(hints, cam) {
    const ctx = this.ctx;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = this.theme.hint ?? C.hint;
    for (const h of hints) {
      const x = cam.worldToScreenX(h.x);
      if (x < -400 || x > this.w + 400) continue;
      const size = Math.round(cam.scale * 0.42 * (h.size ?? 1));
      ctx.font = `750 ${size}px ${FONT}`;
      ctx.fillText(h.text, x, cam.worldToScreenY(h.y));
    }
  }

  /** Liseré crème sur le dessus d'une surface praticable. */
  _cap(x, top, w, radius = 0) {
    const ctx = this.ctx;
    ctx.fillStyle = C.capShade;
    roundRect(ctx, x, top - 0.16, w, 0.16, radius ? Math.min(radius, 0.08) : 0);
    ctx.fill();
    ctx.fillStyle = C.cap;
    roundRect(ctx, x, top - 0.11, w, 0.11, radius ? Math.min(radius, 0.06) : 0);
    ctx.fill();
  }

  _drawRail(m) {
    const ctx = this.ctx;
    const y = m.y + m.h / 2;
    const x0 = m.x + m.w / 2;
    ctx.strokeStyle = 'rgba(255,181,71,0.22)';
    ctx.lineWidth = 0.05;
    ctx.setLineDash([0.18, 0.18]);
    ctx.beginPath();
    ctx.moveTo(x0, y);
    ctx.lineTo(x0 + m.path.dx, y + m.path.dy);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(255,181,71,0.35)';
    for (const [cx, cy] of [[x0, y], [x0 + m.path.dx, y + m.path.dy]]) {
      ctx.beginPath();
      ctx.arc(cx, cy, 0.08, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  _drawMover(m, t) {
    const ctx = this.ctx;
    const p = pathState(m.path, t);
    const x = m.x + p.x;
    const y = m.y + p.y;
    ctx.fillStyle = C.shadow;
    roundRect(ctx, x + 0.06, y - 0.12, m.w, m.h, 0.12);
    ctx.fill();
    const g = ctx.createLinearGradient(0, y + m.h, 0, y);
    g.addColorStop(0, C.blockTop);
    g.addColorStop(1, C.blockBottom);
    ctx.fillStyle = g;
    roundRect(ctx, x, y, m.w, m.h, 0.12);
    ctx.fill();
    this._cap(x, y + m.h, m.w, 0.12);
    ctx.fillStyle = C.amber;
    roundRect(ctx, x + 0.12, y + 0.1, 0.32, 0.12, 0.06);
    ctx.fill();
    roundRect(ctx, x + m.w - 0.44, y + 0.1, 0.32, 0.12, 0.06);
    ctx.fill();
  }

  _drawSpikes(s) {
    const ctx = this.ctx;
    const dir = s.dir === 'down' ? -1 : 1;
    const n = Math.max(1, Math.round(s.w / 0.32));
    const tw = s.w / n;
    const g = ctx.createLinearGradient(0, s.y, 0, s.y + dir * s.h);
    g.addColorStop(0, C.coral);
    g.addColorStop(1, C.coralLight);
    ctx.fillStyle = g;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const x0 = s.x + i * tw;
      ctx.moveTo(x0 + 0.02, s.y);
      ctx.lineTo(x0 + tw / 2, s.y + dir * s.h);
      ctx.lineTo(x0 + tw - 0.02, s.y);
    }
    ctx.fill();
    ctx.fillStyle = C.coralDark;
    ctx.fillRect(s.x, dir > 0 ? s.y : s.y - 0.06, s.w, 0.06);
  }

  _drawTrampoline(tr) {
    const ctx = this.ctx;
    const flex = easeOutCubic(tr.flex);
    const wobble = Math.sin(tr.flex * 18) * tr.flex;
    const top = tr.y + tr.h + 0.14;
    // Cadre
    ctx.fillStyle = C.blockTop;
    roundRect(ctx, tr.x - 0.08, tr.y, 0.16, 0.34, 0.06);
    ctx.fill();
    roundRect(ctx, tr.x + tr.w - 0.08, tr.y, 0.16, 0.34, 0.06);
    ctx.fill();
    // Toile (se creuse à l'impact puis vibre)
    const sag = 0.22 * flex + 0.05 * wobble;
    ctx.strokeStyle = C.mint;
    ctx.lineWidth = 0.1;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(tr.x, top);
    ctx.quadraticCurveTo(tr.x + tr.w / 2, top - sag * 2, tr.x + tr.w, top);
    ctx.stroke();
    this._drawGlow('63,224,184', tr.x + tr.w / 2, top, 1.1, 0.35 + 0.5 * flex);
    // Chevrons
    ctx.strokeStyle = `rgba(166,255,230,${0.3 + 0.5 * flex})`;
    ctx.lineWidth = 0.06;
    const cx = tr.x + tr.w / 2;
    for (let i = 0; i < 2; i++) {
      const yy = top + 0.3 + i * 0.24 + flex * 0.25;
      ctx.beginPath();
      ctx.moveTo(cx - 0.18, yy);
      ctx.lineTo(cx, yy + 0.14);
      ctx.lineTo(cx + 0.18, yy);
      ctx.stroke();
    }
  }

  _drawWind(f, time) {
    const ctx = this.ctx;
    const alpha = f.on ? 1 : 0;
    if (alpha <= 0) return;
    const g = ctx.createLinearGradient(0, f.y, 0, f.y + f.h);
    g.addColorStop(0, `rgba(${C.sky},0.28)`);
    g.addColorStop(0.6, `rgba(${C.sky},0.1)`);
    g.addColorStop(1, `rgba(${C.sky},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(f.x, f.y, f.w, f.h);
    // Filets d'air qui montent
    ctx.strokeStyle = `rgba(${C.sky},0.8)`;
    ctx.lineWidth = 0.05;
    ctx.lineCap = 'round';
    const lines = 11;
    for (let i = 0; i < lines; i++) {
      const u = (i + 0.5) / lines;
      const speed = 5 + (i % 3) * 1.3;
      const phase = (time * speed + i * 2.37) % f.h;
      const y0 = f.y + phase;
      const len = 0.7 + 0.25 * (i % 2);
      const fade = 1 - phase / f.h;
      ctx.globalAlpha = fade * 0.9;
      const x = f.x + u * f.w + Math.sin(time * 3 + i) * 0.06;
      ctx.beginPath();
      ctx.moveTo(x, y0);
      ctx.lineTo(x, Math.min(f.y + f.h, y0 + len));
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  _drawFanGrate(f) {
    const ctx = this.ctx;
    ctx.fillStyle = '#081222';
    roundRect(ctx, f.x, f.y - 0.18, f.w, 0.2, 0.05);
    ctx.fill();
    ctx.strokeStyle = 'rgba(120,200,255,0.6)';
    ctx.lineWidth = 0.035;
    ctx.beginPath();
    for (let x = f.x + 0.15; x < f.x + f.w - 0.1; x += 0.22) {
      ctx.moveTo(x, f.y - 0.15);
      ctx.lineTo(x + 0.08, f.y - 0.01);
    }
    ctx.stroke();
    this._drawGlow(C.sky, f.x + f.w / 2, f.y, f.w * 0.9, 0.6);
  }

  _drawSwitch(sw, time) {
    const ctx = this.ctx;
    const press = sw.press;
    ctx.fillStyle = C.blockTop;
    roundRect(ctx, sw.x - 0.1, sw.y, sw.w + 0.2, 0.06, 0.03);
    ctx.fill();
    const h = 0.14 * (1 - 0.65 * press);
    ctx.fillStyle = sw.pressed ? C.amberLight : C.amber;
    roundRect(ctx, sw.x, sw.y + 0.02, sw.w, h, 0.05);
    ctx.fill();
    const pulse = sw.pressed ? 0.9 : 0.35 + 0.25 * Math.sin(time * 4);
    this._drawGlow('255,181,71', sw.x + sw.w / 2, sw.y + 0.1, 1.0, pulse);
  }

  _drawDoor(d) {
    const ctx = this.ctx;
    const x = d.def.x + d.offsetX;
    const y = d.def.y + d.offsetY;
    const { w, h } = d.def;
    ctx.fillStyle = '#2a3b5a';
    ctx.fillRect(x, y, w, h);
    // Bandes ambre (mécanisme)
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    ctx.strokeStyle = 'rgba(255,181,71,0.75)';
    ctx.lineWidth = 0.12;
    ctx.beginPath();
    for (let yy = y - w; yy < y + h + w; yy += 0.42) {
      ctx.moveTo(x, yy);
      ctx.lineTo(x + w, yy + w);
    }
    ctx.stroke();
    ctx.restore();
  }

  _drawDoorLight(d) {
    const x = d.def.x + d.def.w / 2;
    const y = d.def.y + d.def.h + 0.45;
    const open = d.opening;
    const ctx = this.ctx;
    this._drawGlow(open ? '63,224,184' : '255,95,109', x, y, 0.6, 0.8);
    ctx.fillStyle = open ? C.mint : C.coral;
    ctx.beginPath();
    ctx.arc(x, y, 0.1, 0, Math.PI * 2);
    ctx.fill();
  }

  _drawTeleporter(tp, time, visible) {
    const ctx = this.ctx;
    for (const [end, inward] of [[tp.a, true], [tp.b, tp.twoWay]]) {
      if (!visible(end.x - 1.5, end.x + 1.5)) continue;
      const r = tp.r;
      const recent = clamp(1 - (time - tp.lastUse) / 0.6, 0, 1);
      this._drawGlow('157,123,255', end.x, end.y, r * 2.4, (inward ? 0.85 : 0.6) + 0.4 * recent);
      ctx.lineWidth = 0.07;
      ctx.lineCap = 'round';
      for (let ring = 0; ring < 3; ring++) {
        const rr = r * (1 - ring * 0.22);
        const rot = (inward ? -1 : 1) * time * (1.6 + ring * 0.7) + ring;
        ctx.strokeStyle = `rgba(200,180,255,${0.9 - ring * 0.25})`;
        for (let k = 0; k < 3; k++) {
          const a0 = rot + (k * Math.PI * 2) / 3;
          ctx.beginPath();
          ctx.ellipse(end.x, end.y, rr, rr, 0, a0, a0 + 1.3);
          ctx.stroke();
        }
      }
      // Particules qui spiralent (vers le centre à l'entrée, vers l'extérieur à la sortie)
      ctx.fillStyle = 'rgba(225,215,255,0.9)';
      for (let i = 0; i < 8; i++) {
        let u = (time * 0.9 + i / 8) % 1;
        if (inward) u = 1 - u;
        const a = i * 2.4 + time * 2 * (inward ? 1 : -1);
        const rr = r * (0.2 + 0.9 * u);
        ctx.globalAlpha = Math.sin(u * Math.PI);
        ctx.beginPath();
        ctx.arc(end.x + Math.cos(a) * rr, end.y + Math.sin(a) * rr, 0.045, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
  }

  _drawCheckpoint(c, time) {
    const ctx = this.ctx;
    const poleH = 1.3;
    ctx.fillStyle = 'rgba(239,229,213,0.25)';
    roundRect(ctx, c.x - 0.18, c.y, 0.36, 0.06, 0.03);
    ctx.fill();
    ctx.fillStyle = c.active ? C.cap : 'rgba(239,229,213,0.45)';
    ctx.fillRect(c.x - 0.025, c.y, 0.05, poleH);
    const top = c.y + poleH;
    ctx.fillStyle = c.active ? C.mint : '#3a5076';
    ctx.beginPath();
    ctx.moveTo(c.x + 0.025, top);
    if (c.active) {
      const age = Math.min(1, (time - c.activatedAt) * 3);
      const len = 0.62 * (0.4 + 0.6 * age);
      for (let i = 0; i <= 6; i++) {
        const u = i / 6;
        ctx.lineTo(c.x + 0.025 + u * len, top + Math.sin(time * 6 - u * 4) * 0.05 * u);
      }
      ctx.lineTo(c.x + 0.025 + len * 0.82, top - 0.2);
      for (let i = 6; i >= 0; i--) {
        const u = i / 6;
        ctx.lineTo(c.x + 0.025 + u * len, top - 0.4 + Math.sin(time * 6 - u * 4) * 0.05 * u);
      }
    } else {
      ctx.lineTo(c.x + 0.22, top - 0.08);
      ctx.lineTo(c.x + 0.025, top - 0.42);
    }
    ctx.closePath();
    ctx.fill();
    if (c.active) this._drawGlow('63,224,184', c.x + 0.3, top - 0.2, 0.7, 0.4);
  }

  _drawStar(st, time) {
    const ctx = this.ctx;
    const bob = Math.sin(time * 2.6 + st.index * 1.7) * 0.09;
    const size = 0.95;
    ctx.save();
    ctx.translate(st.x, st.y + bob);
    ctx.rotate(Math.sin(time * 1.8 + st.index) * 0.18);
    ctx.scale(1, -1);
    ctx.drawImage(this.starSprite, -size, -size, size * 2, size * 2);
    ctx.restore();
  }

  // ─── Panier ─────────────────────────────────────────────────────────────

  _drawHoopBack(h, goal, time) {
    const ctx = this.ctx;
    // Le cercle s'illumine au moment du panier
    if (goal && time - goal.t0 < 0.9) this._drawGlow('255,140,70', h.centerX, h.rimY, 1.8, 1 - (time - goal.t0) / 0.9);
    if (h.pole) {
      const g = ctx.createLinearGradient(h.pole.x, 0, h.pole.x + h.pole.w, 0);
      g.addColorStop(0, '#3b5680');
      g.addColorStop(1, '#22365a');
      ctx.fillStyle = g;
      roundRect(ctx, h.pole.x, h.pole.y, h.pole.w, h.pole.h, 0.06);
      ctx.fill();
      ctx.strokeStyle = '#2c4468';
      ctx.lineWidth = 0.14;
      ctx.beginPath();
      ctx.moveTo(h.arm.x1, h.arm.y);
      ctx.lineTo(h.arm.x2, h.arm.y);
      ctx.stroke();
    }
    const b = h.board;
    ctx.fillStyle = C.board;
    roundRect(ctx, b.x, b.y, b.w, b.h, 0.04);
    ctx.fill();
    ctx.fillStyle = C.rimFront;
    const faceX = h.facing === -1 ? b.x : b.x + b.w - 0.035;
    ctx.fillRect(faceX, h.rimY, 0.035, 0.55);
    ctx.strokeStyle = C.rimBack;
    ctx.lineWidth = h.rimRadius * 1.6;
    ctx.beginPath();
    ctx.moveTo(h.backX, h.rimY);
    ctx.lineTo(h.facing === -1 ? b.x : b.x + b.w, h.rimY);
    ctx.stroke();
    ctx.lineWidth = h.rimRadius * 2;
    ctx.beginPath();
    ctx.ellipse(h.centerX, h.rimY, (h.rightX - h.leftX) / 2, 0.13, 0, 0, Math.PI);
    ctx.stroke();
  }

  _drawHoopFront(h) {
    const ctx = this.ctx;
    const net = h.net;
    ctx.strokeStyle = C.net;
    ctx.lineWidth = 0.028;
    ctx.lineCap = 'round';
    ctx.beginPath();
    const L = net.drawLinks;
    for (let i = 0; i < L.length; i += 2) {
      ctx.moveTo(net.x[L[i]], net.y[L[i]]);
      ctx.lineTo(net.x[L[i + 1]], net.y[L[i + 1]]);
    }
    ctx.stroke();
    ctx.strokeStyle = C.rimFront;
    ctx.lineWidth = h.rimRadius * 2;
    ctx.beginPath();
    ctx.ellipse(h.centerX, h.rimY, (h.rightX - h.leftX) / 2, 0.13, 0, Math.PI, Math.PI * 2);
    ctx.stroke();
  }

  // ─── Balle ──────────────────────────────────────────────────────────────

  _drawShadow(s) {
    const { ball } = s;
    const surface = s.level.world.surfaceBelow(ball.x, ball.y);
    if (surface === -Infinity) return;
    const height = ball.y - ball.r - surface;
    if (height > 8) return;
    const t = Math.max(0, height) / 8;
    const ctx = this.ctx;
    // Ombre douce : nette et sombre au contact, plus large et diffuse quand le ballon s'élève
    const w = ball.r * (1.25 + 0.9 * t) * ball.scale;
    const h = ball.r * (0.32 + 0.25 * t) * ball.scale;
    ctx.globalAlpha = 0.62 * (1 - t) * (1 - t);
    ctx.drawImage(this.shadowSprite, ball.x - w, surface - h * 0.55, w * 2, h * 2);
    // Occlusion de contact : petit noyau sombre quand le ballon touche presque
    if (height < 0.5) {
      const k = 1 - height / 0.5;
      ctx.globalAlpha = 0.5 * k;
      ctx.drawImage(this.shadowSprite, ball.x - ball.r * 0.6, surface - 0.07, ball.r * 1.2, 0.16);
    }
    ctx.globalAlpha = 1;
  }

  /** Traces du ballon dans la neige : petits creux bleutés qui s'effacent lentement. */
  _drawTracks(tracks, time, visible) {
    const ctx = this.ctx;
    for (const t of tracks) {
      if (!visible(t.x - 0.5, t.x + 0.5)) continue;
      const age = time - t.t;
      const a = age < 12 ? 1 - age / 12 : 0;
      if (a <= 0) continue;
      ctx.globalAlpha = a;
      ctx.fillStyle = 'rgba(120,150,200,0.38)';
      ctx.beginPath();
      ctx.ellipse(t.x, t.y - 0.02, t.w, 0.045, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.fillRect(t.x - t.w * 0.9, t.y + 0.015, t.w * 1.8, 0.022);
    }
    ctx.globalAlpha = 1;
  }

  /** Images fantômes derrière un ballon très rapide (sans traînée équipée). */
  _drawGhosts(s) {
    const g = s.ghost;
    const sp = Math.hypot(s.body.vx, s.body.vy);
    if (sp < 10 || g.length < 4) return;
    const ctx = this.ctx;
    const r = s.ball.r * s.ball.scale;
    const k = clamp((sp - 10) / 10, 0, 1);
    for (let i = 0; i < 3; i++) {
      const p = g[g.length - 2 - i * 1];
      if (!p) break;
      ctx.globalAlpha = (0.2 - i * 0.06) * k;
      ctx.drawImage(this.tex.surface, p.x - r, p.y - r, r * 2, r * 2);
    }
    ctx.globalAlpha = 1;
  }

  /** Gerbe de lumière derrière le panier au moment du panier. */
  _drawGoalBurst(g, time) {
    const age = time - g.t0;
    if (age > 1.8) return;
    const ctx = this.ctx;
    const k = age < 0.12 ? age / 0.12 : Math.max(0, 1 - (age - 0.12) / 1.68);
    const rgb = g.swish ? '255,214,90' : '255,255,255';
    ctx.save();
    ctx.translate(g.x, g.y);
    ctx.rotate(age * 0.6);
    ctx.globalCompositeOperation = 'lighter';
    const n = 14;
    const len = 4.2 + age * 2.2;
    const grad = ctx.createRadialGradient(0, 0, 0.2, 0, 0, len);
    grad.addColorStop(0, `rgba(${rgb},${0.5 * k})`);
    grad.addColorStop(1, `rgba(${rgb},0)`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const wa = i % 2 ? 0.07 : 0.12;
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a - wa) * len, Math.sin(a - wa) * len);
      ctx.lineTo(Math.cos(a + wa) * len, Math.sin(a + wa) * len);
      ctx.closePath();
    }
    ctx.fill();
    ctx.restore();
    ctx.globalCompositeOperation = 'source-over';
    this._drawGlow(rgb, g.x, g.y, 2.6 + age, 0.9 * k);
  }

  _drawBall(s) {
    const ctx = this.ctx;
    const { ball, visual } = s;
    const r = ball.r * ball.scale;
    if (r <= 0.001) return;
    const m = visual.m;
    ctx.save();
    ctx.translate(ball.x + visual.offsetX * ball.r, ball.y + visual.offsetY * ball.r);
    // Aura des ballons légendaires (derrière le ballon, ne se déforme pas)
    if (this.skin?.aura) {
      ctx.save();
      ctx.scale(1, -1);
      drawAura(ctx, this.skin.aura, r, s.time);
      ctx.restore();
    }
    ctx.transform(m[0], m[1], m[2], m[3], 0, 0);
    ctx.save();
    ctx.rotate(ball.angle);
    ctx.scale(1, -1);
    ctx.drawImage(this.tex.surface, -r, -r, r * 2, r * 2);
    ctx.restore();
    ctx.scale(1, -1);
    ctx.drawImage(this.tex.shading, -r, -r, r * 2, r * 2);
    // Visage des ballons amusants : reste droit, regarde dans le sens du mouvement
    if (this.skin?.face) drawFace(ctx, this.skin.face, r, { vx: s.body?.vx ?? 0, vy: s.body?.vy ?? 0, t: s.time });
    ctx.scale(1, -1);
    // Lumières du monde qui bordent le ballon (néons, lave, soleil…)
    for (const l of this.rimSprites) {
      ctx.save();
      ctx.rotate(l.angle);
      ctx.globalAlpha = l.alpha;
      ctx.drawImage(l.sprite, -r, -r, r * 2, r * 2);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  /** Petite jauge de puissance au-dessus de la balle : barres croissantes. */
  _drawPowerGauge(s) {
    const g = s.power;
    if (g.alpha <= 0.01) return;
    const ctx = this.ctx;
    const n = g.max;
    const bw = 0.09;
    const gap = 0.05;
    const total = n * bw + (n - 1) * gap;
    const x0 = s.ball.x - total / 2;
    const y0 = s.ball.y + s.ball.r + 0.32;
    ctx.globalAlpha = g.alpha;
    ctx.fillStyle = 'rgba(6,12,28,0.55)';
    roundRect(ctx, x0 - 0.08, y0 - 0.07, total + 0.16, 0.44, 0.1);
    ctx.fill();
    for (let i = 0; i < n; i++) {
      const hh = 0.1 + (0.2 * i) / (n - 1);
      const x = x0 + i * (bw + gap);
      const filled = i < g.level;
      let color = 'rgba(255,255,255,0.16)';
      if (filled) {
        color = g.level >= n ? C.gold : g.level >= 4 ? C.amber : '#ffffff';
        if (i === g.level - 1 && g.warn) color = `rgba(255,255,255,${0.35 + 0.65 * (0.5 + 0.5 * Math.sin(s.time * 20))})`;
      }
      ctx.fillStyle = color;
      roundRect(ctx, x, y0, bw, hh, 0.035);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // ─── Effets ─────────────────────────────────────────────────────────────

  _drawParticles(particles) {
    const ctx = this.ctx;
    for (const p of particles.items) {
      if (!p.alive) continue;
      const t = p.life / p.maxLife;
      if (p.kind === 2) {
        const k = easeOutCubic(1 - t);
        ctx.globalAlpha = t;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 0.08 * t + 0.01;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, p.size * (0.4 + 1.1 * k), p.size * 0.35 * (0.4 + 1.1 * k), 0, 0, Math.PI * 2);
        ctx.stroke();
        continue;
      }
      if (p.kind === 4) {
        // Trait de vitesse : segment orienté le long de la vitesse, qui s'amincit
        const sp = Math.hypot(p.vx, p.vy);
        if (sp < 0.2) continue;
        const len = Math.min(0.9, sp * 0.06);
        ctx.globalAlpha = t;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = p.size * (0.4 + t);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - (p.vx / sp) * len, p.y - (p.vy / sp) * len);
        ctx.stroke();
        continue;
      }
      if (p.kind === 5) {
        const g = this._glow(p.color);
        if (p.rot === 1) {
          // Nuage doux qui gonfle et s'efface
          const sz = p.size * (1 + (1 - t) * 1.4);
          ctx.globalAlpha = Math.min(1, t * 1.6) * 0.9;
          ctx.drawImage(g, p.x - sz, p.y - sz, sz * 2, sz * 2);
        } else {
          // Éclair lumineux additif
          const sz = p.size * (0.7 + 0.5 * (1 - t));
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = t;
          ctx.drawImage(g, p.x - sz, p.y - sz, sz * 2, sz * 2);
          ctx.globalCompositeOperation = 'source-over';
        }
        continue;
      }
      ctx.globalAlpha = Math.min(1, t * 2);
      ctx.fillStyle = p.color;
      if (p.kind === 0) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (1.6 - t * 0.6), 0, Math.PI * 2);
        ctx.fill();
      } else if (p.kind === 3) {
        const sz = p.size * (0.5 + t);
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillRect(-sz, -sz * 0.18, sz * 2, sz * 0.36);
        ctx.fillRect(-sz * 0.18, -sz, sz * 0.36, sz * 2);
        ctx.restore();
      } else {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.scale(1, Math.cos(p.rot * 1.7));
        ctx.fillRect(-p.size, -p.size * 0.5, p.size * 2, p.size);
        ctx.restore();
      }
    }
    ctx.globalAlpha = 1;
  }

  _drawTexts(s) {
    const ctx = this.ctx;
    const cam = s.camera;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const t of s.particles.texts) {
      if (!t.alive) continue;
      const age = t.maxLife - t.life;
      const pop = age < 0.25 ? easeOutBack(age / 0.25) : 1;
      const alpha = Math.min(1, t.life / 0.35);
      const size = Math.round(cam.scale * 0.8 * t.size * pop);
      if (size < 2) continue;
      const x = clamp(cam.worldToScreenX(t.x), size * 2.5, this.w - size * 2.5);
      const y = cam.worldToScreenY(t.y);
      ctx.globalAlpha = alpha;
      ctx.font = `900 ${size}px ${FONT}`;
      ctx.lineWidth = Math.max(2, size * 0.15);
      ctx.strokeStyle = 'rgba(6,12,28,0.88)';
      ctx.lineJoin = 'round';
      ctx.strokeText(t.text, x, y);
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, x, y);
    }
    ctx.globalAlpha = 1;
  }

  // ─── Débogage ───────────────────────────────────────────────────────────

  _drawDebugWorld(s, px) {
    const ctx = this.ctx;
    ctx.lineWidth = 1.5 * px;
    ctx.lineCap = 'round';
    for (const c of s.level.world.colliders) {
      ctx.strokeStyle = c.oneWay ? 'rgba(255,220,0,0.9)' : 'rgba(0,255,170,0.8)';
      ctx.beginPath();
      if (c.ax === c.bx && c.ay === c.by) ctx.arc(c.ax, c.ay, Math.max(c.r, 2 * px), 0, Math.PI * 2);
      else {
        ctx.moveTo(c.ax, c.ay);
        ctx.lineTo(c.bx, c.by);
      }
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(255,60,90,0.9)';
    for (const sp of s.level.spikes) ctx.strokeRect(sp.x, sp.dir === 'down' ? sp.y - sp.h : sp.y, sp.w, sp.h);
    ctx.strokeStyle = 'rgba(120,200,255,0.9)';
    for (const f of s.level.fans) ctx.strokeRect(f.x, f.y, f.w, f.h);
    ctx.strokeStyle = 'rgba(0,255,170,0.9)';
    ctx.beginPath();
    ctx.arc(s.body.x, s.body.y, s.ball.r, 0, Math.PI * 2);
    ctx.stroke();
  }

  _drawDebugText(s) {
    const ctx = this.ctx;
    const b = s.body;
    const lines = [
      `${this.fps.toFixed(0)} fps · dpr ${this.dpr}`,
      `pos ${b.x.toFixed(2)}, ${b.y.toFixed(2)}`,
      `vit ${b.vx.toFixed(2)}, ${b.vy.toFixed(2)}`,
      `sol ${b.grounded ? 'oui' : 'non'} · puissance ${s.power.level} · état ${s.state}`,
    ];
    ctx.font = '12px ui-monospace, Menlo, Consolas, monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    const x = 12;
    const y = 64;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(x - 6, y - 6, 260, lines.length * 16 + 10);
    ctx.fillStyle = '#9dffd9';
    lines.forEach((l, i) => ctx.fillText(l, x, y + i * 16));
  }
}

function makeStarSprite() {
  const size = 128;
  const c = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(size, size) : document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const r = size / 2;
  const glow = g.createRadialGradient(r, r, 0, r, r, r);
  glow.addColorStop(0, 'rgba(255,214,90,0.5)');
  glow.addColorStop(0.45, 'rgba(255,200,70,0.16)');
  glow.addColorStop(1, 'rgba(255,200,70,0)');
  g.fillStyle = glow;
  g.fillRect(0, 0, size, size);
  g.translate(r, r);
  const outer = r * 0.5;
  const inner = outer * 0.48;
  g.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 === 0 ? outer : inner;
    g.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
  }
  g.closePath();
  const fill = g.createLinearGradient(0, -outer, 0, outer);
  fill.addColorStop(0, '#fff2b0');
  fill.addColorStop(1, '#ffb52e');
  g.fillStyle = fill;
  g.lineJoin = 'round';
  g.fill();
  g.lineWidth = size * 0.025;
  g.strokeStyle = 'rgba(255,255,255,0.7)';
  g.stroke();
  return c;
}

/** Ombre douce (dégradé radial), étirée en ellipse au dessin. */
function makeShadowSprite() {
  const size = 64;
  const c = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(size, size) : document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(2,5,14,1)');
  grad.addColorStop(0.45, 'rgba(2,5,14,0.75)');
  grad.addColorStop(1, 'rgba(2,5,14,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  return c;
}

/** Liseré de lumière colorée sur le bord droit d'un disque (tourné vers la source au dessin). */
function makeRimSprite(rgb) {
  const size = 128;
  const c = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(size, size) : document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const r = size / 2 - 1;
  const lin = g.createLinearGradient(size / 2 - r, 0, size / 2 + r, 0);
  lin.addColorStop(0, `rgba(${rgb},0)`);
  lin.addColorStop(0.55, `rgba(${rgb},0.15)`);
  lin.addColorStop(1, `rgba(${rgb},1)`);
  g.fillStyle = lin;
  g.beginPath();
  g.arc(size / 2, size / 2, r, 0, Math.PI * 2);
  g.fill();
  // On creuse l'intérieur : il ne reste qu'un croissant doux du côté de la lumière
  g.globalCompositeOperation = 'destination-out';
  const cut = g.createRadialGradient(size / 2 - r * 0.2, size / 2, 0, size / 2 - r * 0.2, size / 2, r * 1.02);
  cut.addColorStop(0, 'rgba(0,0,0,1)');
  cut.addColorStop(0.78, 'rgba(0,0,0,1)');
  cut.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = cut;
  g.fillRect(0, 0, size, size);
  return c;
}

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.max(0, Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function easeOutCubic(t) {
  return 1 - Math.pow(1 - clamp(t, 0, 1), 3);
}

function easeOutBack(t) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}
