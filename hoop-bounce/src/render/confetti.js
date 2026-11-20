// Confettis de victoire, dessinés par-dessus l'écran de victoire (canvas en coordonnées écran).
//
// - `celebrate()` : deux canons de confettis dans les coins du bas, puis une pluie légère ;
// - `pop(x, y)`   : petite gerbe à un point de l'écran (étoile qui se pose sur la carte).
//
// La boucle d'animation ne tourne que tant qu'il reste des confettis, puis s'arrête et efface le
// canvas : aucun coût le reste du temps. Réservoir préalloué (pas d'allocation pendant l'animation).

const MAX = 260;
const COLORS = ['#ffcf3f', '#ff6b3d', '#4fd1ff', '#7cff8a', '#ffffff', '#ff5fa2', '#b98bff'];

export class Confetti {
  /** @param {HTMLCanvasElement | null} canvas */
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas?.getContext('2d') ?? null;
    this.items = Array.from({ length: MAX }, () => ({ alive: false, x: 0, y: 0, vx: 0, vy: 0, rot: 0, vrot: 0, flip: 0, vflip: 0, size: 6, life: 0, max: 1, color: '#fff', round: false }));
    this._raf = 0;
    this._last = 0;
    this._tick = this._tick.bind(this);
    this.density = 1;
  }

  _spawn() {
    for (const p of this.items) if (!p.alive) return p;
    return this.items[(Math.random() * MAX) | 0];
  }

  _add(x, y, vx, vy, colors = COLORS, size = 1) {
    const p = this._spawn();
    p.alive = true;
    p.x = x;
    p.y = y;
    p.vx = vx;
    p.vy = vy;
    p.rot = Math.random() * Math.PI * 2;
    p.vrot = (Math.random() - 0.5) * 12;
    p.flip = Math.random() * Math.PI * 2;
    p.vflip = 6 + Math.random() * 10;
    p.size = (5 + Math.random() * 6) * size;
    p.life = p.max = 2.2 + Math.random() * 1.4;
    p.color = colors[(Math.random() * colors.length) | 0];
    p.round = Math.random() < 0.2;
  }

  /** Grande fête : canons dans les deux coins du bas, puis pluie depuis le haut. */
  celebrate(intensity = 1) {
    if (!this.ctx) return;
    this._resize();
    const w = this.w;
    const h = this.h;
    const n = Math.round(70 * intensity * this.density);
    for (let i = 0; i < n; i++) {
      const left = i % 2 === 0;
      const spread = 0.25 + Math.random() * 0.5; // écart à la verticale, vers le centre de l'écran
      const sp = (0.8 + Math.random() * 0.7) * h * 1.9;
      this._add(left ? -10 : w + 10, h * 0.95, Math.sin(spread) * sp * (left ? 1 : -1), -Math.cos(spread) * sp);
    }
    setTimeout(() => {
      for (let i = 0; i < Math.round(40 * intensity * this.density); i++) this._add(Math.random() * w, -20 - Math.random() * 80, (Math.random() - 0.5) * 60, 40 + Math.random() * 80);
      this._start();
    }, 350);
    this._start();
  }

  /** Petite gerbe autour d'un point (coordonnées écran, px CSS). */
  pop(x, y, count = 14, colors = COLORS) {
    if (!this.ctx) return;
    this._resize();
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 140 + Math.random() * 220;
      this._add(x, y, Math.cos(a) * sp, Math.sin(a) * sp - 120, colors, 0.75);
    }
    this._start();
  }

  clear() {
    for (const p of this.items) p.alive = false;
    cancelAnimationFrame(this._raf);
    this._raf = 0;
    this.ctx?.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  _resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth;
    const h = window.innerHeight;
    if (this.w === w && this.h === h && this.dpr === dpr) return;
    this.w = w;
    this.h = h;
    this.dpr = dpr;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
  }

  _start() {
    if (this._raf) return;
    this._last = performance.now();
    this._raf = requestAnimationFrame(this._tick);
  }

  _tick(now) {
    const dt = Math.min(0.05, (now - this._last) / 1000);
    this._last = now;
    const { ctx, dpr } = this;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    let alive = 0;
    const drag = Math.exp(-1.6 * dt);
    for (const p of this.items) {
      if (!p.alive) continue;
      p.life -= dt;
      if (p.life <= 0 || p.y > this.h + 40) {
        p.alive = false;
        continue;
      }
      alive++;
      p.vx *= drag;
      p.vy = p.vy * drag + 520 * dt;
      // Les confettis « planent » en tombant : la vitesse de chute est limitée et ils oscillent
      if (p.vy > 170) p.vy = 170;
      p.x += (p.vx + Math.sin(p.flip) * 30) * dt;
      p.y += p.vy * dt;
      p.rot += p.vrot * dt;
      p.flip += p.vflip * dt;
      ctx.globalAlpha = Math.min(1, p.life / 0.5);
      ctx.fillStyle = p.color;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.scale(1, Math.cos(p.flip));
      if (p.round) {
        ctx.beginPath();
        ctx.arc(0, 0, p.size * 0.45, 0, Math.PI * 2);
        ctx.fill();
      } else ctx.fillRect(-p.size / 2, -p.size * 0.3, p.size, p.size * 0.6);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    if (alive > 0) this._raf = requestAnimationFrame(this._tick);
    else {
      this._raf = 0;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }
}
