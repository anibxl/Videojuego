// Neige du menu (saison de Noël) : une vraie chute de neige, pas des points blancs.
//
// Trois plans, chacun avec ses flocons, sa vitesse, sa parallaxe et son flou :
//   - LOIN   : beaucoup de très petits flocons doux, lents, dessinés DERRIÈRE les sapins (profondeur) ;
//   - MILIEU : des cristaux à six branches de tailles variées, qui tournent lentement sur eux-mêmes ;
//   - PRÈS   : quelques grands flocons flous qui passent devant, plus vite (effet de profondeur de champ).
// Un vent commun souffle par rafales douces ; chaque flocon se balance à son rythme.
// Les flocons sont des images précalculées (dessinées une fois) : le coût par image reste très faible.

const COUNTS = {
  low: { far: 26, mid: 10, near: 0 },
  medium: { far: 55, mid: 22, near: 3 },
  high: { far: 85, mid: 34, near: 6 },
};

function canvas(size) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  return c;
}

/** Flocon doux (plan lointain) : cœur blanc, bord qui s'efface. */
function softDot(size) {
  const c = canvas(size);
  const g = c.getContext('2d');
  const r = size / 2;
  const grad = g.createRadialGradient(r, r, 0, r, r, r);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.35, 'rgba(240,247,255,0.85)');
  grad.addColorStop(1, 'rgba(230,240,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  return c;
}

/** Cristal à six branches (plan du milieu), légèrement adouci. variant : position des ramures. */
function crystal(size, variant) {
  const c = canvas(size);
  const g = c.getContext('2d');
  const r = size / 2;
  const arm = r * 0.78;
  g.translate(r, r);
  g.strokeStyle = 'rgba(255,255,255,0.88)';
  g.lineCap = 'round';
  g.shadowColor = 'rgba(210,230,255,0.9)';
  g.shadowBlur = size * 0.1;
  const branches = [[0.42, 0.3], [0.62, 0.22], [0.5, 0.36]][variant % 3];
  for (let i = 0; i < 6; i++) {
    g.save();
    g.rotate((i * Math.PI) / 3);
    g.lineWidth = size * 0.055;
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(0, -arm);
    // Ramures en V
    for (const [at, len] of [branches, [branches[0] + 0.25, branches[1] * 0.7]]) {
      const y = -arm * at;
      const l = arm * len;
      g.moveTo(0, y);
      g.lineTo(l * 0.7, y - l * 0.7);
      g.moveTo(0, y);
      g.lineTo(-l * 0.7, y - l * 0.7);
    }
    g.stroke();
    g.restore();
  }
  // Petit cœur hexagonal
  g.fillStyle = 'rgba(255,255,255,0.9)';
  g.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3;
    g.lineTo(Math.sin(a) * size * 0.07, -Math.cos(a) * size * 0.07);
  }
  g.closePath();
  g.fill();
  return c;
}

/** Grand flocon flou (premier plan) : disque très doux avec un bord à peine plus lumineux. */
function bokeh(size) {
  const c = canvas(size);
  const g = c.getContext('2d');
  const r = size / 2;
  const grad = g.createRadialGradient(r, r, 0, r, r, r);
  grad.addColorStop(0, 'rgba(255,255,255,0.55)');
  grad.addColorStop(0.6, 'rgba(240,247,255,0.45)');
  grad.addColorStop(0.82, 'rgba(250,252,255,0.5)');
  grad.addColorStop(1, 'rgba(240,247,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  return c;
}

export class Snowfall {
  constructor(quality = 'high', rng = Math.random) {
    this.rng = rng;
    this.sprites = { dot: softDot(32), crystals: [crystal(64, 0), crystal(64, 1), crystal(64, 2)], bokeh: bokeh(96) };
    this.wind = 0;
    this.time = 0;
    this.setQuality(quality);
  }

  setQuality(name) {
    const n = COUNTS[name] ?? COUNTS.high;
    const R = this.rng;
    const make = (layer, count) =>
      Array.from({ length: count }, () => ({
        layer,
        x: R(),
        y: R(),
        // Taille (px), vitesse de chute (hauteurs d'écran par seconde), opacité, balancement, rotation
        s: layer === 'far' ? 1.4 + R() * 1.8 : layer === 'mid' ? 3.5 + R() * 5 : 16 + R() * 18,
        v: layer === 'far' ? 0.022 + R() * 0.018 : layer === 'mid' ? 0.045 + R() * 0.035 : 0.1 + R() * 0.06,
        a: layer === 'far' ? 0.35 + R() * 0.35 : layer === 'mid' ? 0.4 + R() * 0.3 : 0.1 + R() * 0.1,
        sway: 0.4 + R() * 0.9,
        amp: layer === 'far' ? 4 + R() * 6 : layer === 'mid' ? 8 + R() * 14 : 18 + R() * 24,
        phase: R() * Math.PI * 2,
        rot: R() * Math.PI * 2,
        vr: (R() - 0.5) * 0.9,
        kind: Math.floor(R() * 3),
      }));
    this.layers = { far: make('far', n.far), mid: make('mid', n.mid), near: make('near', n.near) };
  }

  update(dt, motion = 1) {
    this.time += dt * motion;
    const t = this.time;
    // Vent par rafales douces (somme de sinusoïdes lentes)
    this.wind = Math.sin(t * 0.13) * 0.6 + Math.sin(t * 0.37 + 1.3) * 0.25 + Math.sin(t * 0.05 + 4) * 0.3;
    for (const list of Object.values(this.layers)) {
      for (const f of list) {
        const depth = f.layer === 'far' ? 0.4 : f.layer === 'mid' ? 1 : 1.8;
        f.y += f.v * dt * motion;
        f.x += this.wind * 0.012 * depth * dt * motion;
        f.rot += f.vr * dt * motion;
        if (f.y > 1.06) {
          f.y = -0.06;
          f.x = this.rng();
        }
        if (f.x > 1.05) f.x -= 1.1;
        else if (f.x < -0.05) f.x += 1.1;
      }
    }
  }

  /**
   * Dessine un plan. ctx est déjà mis à l'échelle (dpr) par le décor.
   * @param {'far'|'mid'|'near'} layer
   * @param {{ w:number, h:number, camX?:number, camY?:number, alpha?:number }} o
   */
  draw(ctx, layer, { w, h, camX = 0, camY = 0, alpha = 1 }) {
    const list = this.layers[layer];
    if (!list?.length || alpha <= 0.01) return;
    const k = layer === 'far' ? 0.25 : layer === 'mid' ? 0.7 : 1.6; // parallaxe
    const t = this.time;
    const { dot, crystals, bokeh: bk } = this.sprites;
    for (const f of list) {
      const sx = f.x * w + Math.sin(t * f.sway + f.phase) * f.amp - camX * k;
      const x = ((sx % (w + 40)) + w + 40) % (w + 40) - 20;
      const y = f.y * h - camY * k;
      ctx.globalAlpha = f.a * alpha;
      if (layer === 'far') {
        ctx.drawImage(dot, x - f.s, y - f.s, f.s * 2, f.s * 2);
      } else if (layer === 'mid') {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(f.rot);
        ctx.drawImage(crystals[f.kind], -f.s, -f.s, f.s * 2, f.s * 2);
        ctx.restore();
      } else {
        ctx.drawImage(bk, x - f.s, y - f.s, f.s * 2, f.s * 2);
      }
    }
    ctx.globalAlpha = 1;
  }
}
