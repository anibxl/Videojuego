// Filet du panier : petite simulation de cordes (Verlet + contraintes de distance).
// Purement visuel : il réagit au ballon mais ne le freine pas.

export class Net {
  /**
   * @param {number} leftX   bord gauche du cercle
   * @param {number} rightX  bord droit du cercle
   * @param {number} topY    hauteur du cercle
   * @param {{netDepth:number, netColumns:number, netRows:number}} cfg
   */
  constructor(leftX, rightX, topY, cfg) {
    this.cols = cfg.netColumns;
    this.rows = cfg.netRows;
    this.gravity = 9; // filet léger : il retombe en douceur
    this.damping = 0.985;
    this.iterations = 8;

    const n = this.cols * this.rows;
    this.x = new Float64Array(n);
    this.y = new Float64Array(n);
    this.px = new Float64Array(n);
    this.py = new Float64Array(n);
    this.pinned = new Uint8Array(n);

    const cx = (leftX + rightX) / 2;
    const halfW = (rightX - leftX) / 2;
    const dy = cfg.netDepth / (this.rows - 1);
    for (let r = 0; r < this.rows; r++) {
      const taper = 1 - 0.4 * (r / (this.rows - 1)); // le filet se resserre vers le bas
      for (let c = 0; c < this.cols; c++) {
        const i = this.index(r, c);
        const u = c / (this.cols - 1) * 2 - 1;
        this.x[i] = this.px[i] = cx + u * halfW * taper;
        this.y[i] = this.py[i] = topY - r * dy;
        this.pinned[i] = r === 0 ? 1 : 0;
      }
    }

    // Contraintes : verticales, horizontales et diagonales (maillage en losanges)
    /** @type {number[]} triplets [a, b, longueurAuRepos] */
    const links = [];
    const link = (a, b) => links.push(a, b, Math.hypot(this.x[a] - this.x[b], this.y[a] - this.y[b]));
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const i = this.index(r, c);
        if (c + 1 < this.cols) link(i, this.index(r, c + 1));
        if (r + 1 < this.rows) {
          link(i, this.index(r + 1, c));
          if (c + 1 < this.cols) link(i, this.index(r + 1, c + 1));
          if (c > 0) link(i, this.index(r + 1, c - 1));
        }
      }
    }
    this.links = Float64Array.from(links);

    /** Segments à dessiner (losanges + bords). */
    this.drawLinks = [];
    for (let r = 0; r + 1 < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (c + 1 < this.cols) this.drawLinks.push(this.index(r, c), this.index(r + 1, c + 1));
        if (c > 0) this.drawLinks.push(this.index(r, c), this.index(r + 1, c - 1));
      }
      this.drawLinks.push(this.index(r, 0), this.index(r + 1, 0));
      this.drawLinks.push(this.index(r, this.cols - 1), this.index(r + 1, this.cols - 1));
    }
    const last = this.rows - 1;
    for (let c = 0; c + 1 < this.cols; c++) this.drawLinks.push(this.index(last, c), this.index(last, c + 1));
  }

  index(r, c) {
    return r * this.cols + c;
  }

  /** @param {number} dt @param {{x:number,y:number,radius:number}} ball */
  step(dt, ball) {
    const n = this.x.length;
    const g = this.gravity * dt * dt;
    for (let i = 0; i < n; i++) {
      if (this.pinned[i]) continue;
      const vx = (this.x[i] - this.px[i]) * this.damping;
      const vy = (this.y[i] - this.py[i]) * this.damping;
      this.px[i] = this.x[i];
      this.py[i] = this.y[i];
      this.x[i] += vx;
      this.y[i] += vy - g;
    }

    const L = this.links;
    const reach = ball.radius + 0.03;
    for (let it = 0; it < this.iterations; it++) {
      for (let k = 0; k < L.length; k += 3) {
        const a = L[k];
        const b = L[k + 1];
        const rest = L[k + 2];
        const dx = this.x[b] - this.x[a];
        const dy = this.y[b] - this.y[a];
        const d = Math.hypot(dx, dy) || 1e-9;
        // Les cordes résistent à l'étirement mais se plient librement
        if (d <= rest) continue;
        const diff = (d - rest) / d;
        const wa = this.pinned[a] ? 0 : 1;
        const wb = this.pinned[b] ? 0 : 1;
        const sum = wa + wb;
        if (sum === 0) continue;
        this.x[a] += dx * diff * (wa / sum);
        this.y[a] += dy * diff * (wa / sum);
        this.x[b] -= dx * diff * (wb / sum);
        this.y[b] -= dy * diff * (wb / sum);
      }
      // Le ballon pousse les mailles
      for (let i = 0; i < n; i++) {
        if (this.pinned[i]) continue;
        const dx = this.x[i] - ball.x;
        const dy = this.y[i] - ball.y;
        const d2 = dx * dx + dy * dy;
        if (d2 >= reach * reach) continue;
        const d = Math.sqrt(d2) || 1e-9;
        this.x[i] = ball.x + (dx / d) * reach;
        this.y[i] = ball.y + (dy / d) * reach;
      }
    }
  }
}
