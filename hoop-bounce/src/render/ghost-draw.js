// MODE FANTÔME (phase 3) — dessin du ballon fantôme.
//
// Un ballon translucide blanc bleuté, avec les coutures d'un ballon de basket (il tourne comme le vrai),
// un léger halo, une traînée lumineuse fine et un petit anneau à chaque rebond. Il passe SOUS le vrai
// ballon et s'efface quand il s'en approche : il ne le masque jamais.
// Le sprite est dessiné une seule fois (canvas hors écran) ; chaque image ne coûte que quelques traits.

const SPRITE_PX = 96;
const TRAIL_RGB = '190,225,255';

/** Sprite du ballon fantôme (une fois pour toutes). */
export function makeGhostSprite() {
  const c = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(SPRITE_PX, SPRITE_PX) : Object.assign(document.createElement('canvas'), { width: SPRITE_PX, height: SPRITE_PX });
  const g = c.getContext('2d');
  const m = SPRITE_PX / 2;
  const r = m - 3;
  // Corps : verre givré, plus clair au centre
  const body = g.createRadialGradient(m - r * 0.3, m - r * 0.35, r * 0.1, m, m, r);
  body.addColorStop(0, 'rgba(245,250,255,0.92)');
  body.addColorStop(0.55, 'rgba(190,222,255,0.58)');
  body.addColorStop(1, 'rgba(150,196,255,0.32)');
  g.fillStyle = body;
  g.beginPath();
  g.arc(m, m, r, 0, Math.PI * 2);
  g.fill();
  // Coutures du ballon
  g.save();
  g.beginPath();
  g.arc(m, m, r - 1, 0, Math.PI * 2);
  g.clip();
  g.strokeStyle = 'rgba(255,255,255,0.62)';
  g.lineWidth = 2.4;
  g.beginPath();
  g.moveTo(m, m - r);
  g.lineTo(m, m + r);
  g.moveTo(m - r, m);
  g.lineTo(m + r, m);
  g.stroke();
  g.beginPath();
  g.arc(m - r * 1.25, m, r * 0.95, -Math.PI / 2.6, Math.PI / 2.6);
  g.stroke();
  g.beginPath();
  g.arc(m + r * 1.25, m, r * 0.95, Math.PI - Math.PI / 2.6, Math.PI + Math.PI / 2.6);
  g.stroke();
  g.restore();
  // Liseré lumineux, doublé d'un fin trait bleu nuit : lisible aussi sur la neige et les fonds clairs
  g.strokeStyle = 'rgba(214,236,255,0.95)';
  g.lineWidth = 2.2;
  g.beginPath();
  g.arc(m, m, r - 1, 0, Math.PI * 2);
  g.stroke();
  g.strokeStyle = 'rgba(30,62,120,0.7)';
  g.lineWidth = 1.6;
  g.beginPath();
  g.arc(m, m, r + 0.6, 0, Math.PI * 2);
  g.stroke();
  return c;
}

/**
 * Dessine le fantôme (repère du monde : y vers le haut).
 * @param {CanvasRenderingContext2D} ctx
 * @param {{ x, y, angle, alpha, r, trail: number[], sinceBounce }} g
 * @param {(rgb:string, x:number, y:number, r:number, a:number) => void} glow  halo (sprite flou du moteur de rendu)
 */
export function drawGhostRun(ctx, g, sprite, glow) {
  const a = g.alpha;
  if (a <= 0.01) return;
  const r = g.r;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  // Traînée : segments de plus en plus fins et transparents vers l'arrière
  const p = g.trail;
  const segs = p.length / 2 - 1;
  if (segs > 0) {
    ctx.lineCap = 'round';
    for (let i = 0; i < segs; i++) {
      const k = (i + 1) / (segs + 1);
      ctx.strokeStyle = `rgba(${TRAIL_RGB},${(0.3 * k * a).toFixed(3)})`;
      ctx.lineWidth = r * (0.25 + 0.95 * k);
      ctx.beginPath();
      ctx.moveTo(p[i * 2], p[i * 2 + 1]);
      ctx.lineTo(p[i * 2 + 2], p[i * 2 + 3]);
      ctx.stroke();
    }
    // dernier tronçon jusqu'au ballon
    ctx.strokeStyle = `rgba(${TRAIL_RGB},${(0.3 * a).toFixed(3)})`;
    ctx.lineWidth = r * 1.2;
    ctx.beginPath();
    ctx.moveTo(p[p.length - 2], p[p.length - 1]);
    ctx.lineTo(g.x, g.y);
    ctx.stroke();
  }
  // Halo très léger
  glow(TRAIL_RGB, g.x, g.y, r * 2.4, 0.28 * a);
  // Petit anneau au moment d'un rebond
  if (g.sinceBounce < 0.3) {
    const k = g.sinceBounce / 0.3;
    ctx.strokeStyle = `rgba(${TRAIL_RGB},${(0.35 * (1 - k) * a).toFixed(3)})`;
    ctx.lineWidth = r * 0.12;
    ctx.beginPath();
    ctx.arc(g.x, g.y, r * (1.05 + 0.9 * k), 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalCompositeOperation = 'source-over';
  // Le ballon, qui tourne exactement comme pendant le record
  ctx.globalAlpha = a;
  ctx.translate(g.x, g.y);
  ctx.rotate(g.angle);
  ctx.scale(1, -1);
  ctx.drawImage(sprite, -r, -r, r * 2, r * 2);
  ctx.restore();
}
