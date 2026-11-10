/* =========================================================
   Motor de rascado: capa <canvas> que se borra con el ratón o el dedo.
   Detecta qué casillas se han descubierto y el porcentaje rascado.
   ========================================================= */
(function () {
  'use strict';

  class ScratchCard {
    /**
     * @param {HTMLElement} area   contenedor con las casillas debajo
     * @param {object} opts
     *   cover: {colors, ink, label}
     *   cells: HTMLElement[]   casillas a vigilar
     *   onCellReveal(i)        casilla i descubierta
     *   onDone()               boleto totalmente descubierto
     */
    constructor(area, opts) {
      this.area = area;
      this.opts = opts;
      this.cover = opts.cover;
      this.revealed = new Array(opts.cells.length).fill(false);
      this.done = false;
      this.down = false;
      this.last = null;
      this.checkTimer = null;
      this.dustTick = 0;

      const c = (this.canvas = document.createElement('canvas'));
      c.className = 'scratch-canvas';
      area.appendChild(c);
      this.ctx = c.getContext('2d', { willReadFrequently: true });

      this._down = this.onDown.bind(this);
      this._move = this.onMove.bind(this);
      this._up = this.onUp.bind(this);
      this._resize = this.resize.bind(this);
      c.addEventListener('pointerdown', this._down);
      c.addEventListener('pointermove', this._move);
      c.addEventListener('pointerup', this._up);
      c.addEventListener('pointercancel', this._up);
      c.addEventListener('lostpointercapture', this._up);
      window.addEventListener('resize', this._resize);

      this.resize(true);
    }

    /* ---------- Tamaño y dibujo de la capa ---------- */
    resize(first) {
      if (this.done) return;
      const r = this.area.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(1, Math.round(r.width));
      const h = Math.max(1, Math.round(r.height));
      if (!first && w === this.w && h === this.h) return;

      let snapshot = null;
      if (!first && this.canvas.width > 1) {
        snapshot = document.createElement('canvas');
        snapshot.width = this.canvas.width;
        snapshot.height = this.canvas.height;
        snapshot.getContext('2d').drawImage(this.canvas, 0, 0);
      }

      this.w = w;
      this.h = h;
      this.dpr = dpr;
      this.canvas.width = w * dpr;
      this.canvas.height = h * dpr;
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.brush = Math.max(13, Math.min(26, Math.min(w, h) * 0.06)) * (this.opts.brushScale || 1);

      if (snapshot) {
        this.ctx.globalCompositeOperation = 'source-over';
        this.ctx.drawImage(snapshot, 0, 0, w, h);
      } else {
        this.drawCover();
      }
      this.measureCells();
    }

    drawCover() {
      const { ctx, w, h } = this;
      const [c1, c2, c3] = this.cover.colors;
      ctx.globalCompositeOperation = 'source-over';

      // Base metálica
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, c1);
      g.addColorStop(0.45, c3);
      g.addColorStop(0.55, c1);
      g.addColorStop(1, c2);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      // Brillos diagonales
      ctx.save();
      ctx.globalAlpha = 0.18;
      ctx.fillStyle = '#fff';
      for (let x = -h; x < w; x += 46) {
        ctx.beginPath();
        ctx.moveTo(x, h);
        ctx.lineTo(x + 14, h);
        ctx.lineTo(x + 14 + h, 0);
        ctx.lineTo(x + h, 0);
        ctx.fill();
      }
      ctx.restore();

      // Grano (textura de látex)
      const n = Math.floor((w * h) / 18);
      for (let i = 0; i < n; i++) {
        ctx.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,255,.14)' : 'rgba(0,0,0,.10)';
        ctx.fillRect(Math.random() * w, Math.random() * h, 1.3, 1.3);
      }

      // Texto repetido
      ctx.save();
      ctx.fillStyle = this.cover.ink;
      ctx.font = `800 ${Math.max(11, Math.min(16, w / 22))}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.translate(w / 2, h / 2);
      ctx.rotate(-0.32);
      const stepY = 38, stepX = 150;
      for (let y = -h; y < h; y += stepY) {
        const off = (Math.round(y / stepY) % 2) * (stepX / 2);
        for (let x = -w; x < w; x += stepX) ctx.fillText('✦ ' + this.cover.label + ' ✦', x + off, y);
      }
      ctx.restore();

      // Marco punteado interior
      ctx.save();
      ctx.strokeStyle = this.cover.ink;
      ctx.globalAlpha = 0.5;
      ctx.setLineDash([6, 5]);
      ctx.lineWidth = 2;
      ctx.strokeRect(6, 6, w - 12, h - 12);
      ctx.restore();
    }

    measureCells() {
      const ar = this.area.getBoundingClientRect();
      this.rects = this.opts.cells.map((el) => {
        const r = el.getBoundingClientRect();
        return { x: r.left - ar.left, y: r.top - ar.top, w: r.width, h: r.height };
      });
    }

    /* ---------- Entrada ---------- */
    pos(e) {
      const r = this.canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top, cx: e.clientX, cy: e.clientY };
    }

    onDown(e) {
      if (this.done) return;
      e.preventDefault();
      if (window.Sound) Sound.unlock();
      this.canvas.setPointerCapture(e.pointerId);
      this.down = true;
      const p = this.pos(e);
      this.last = p;
      this.scratchAt(p.x, p.y);
      this.scheduleCheck();
    }

    onMove(e) {
      if (!this.down || this.done) return;
      e.preventDefault();
      const events = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
      let dist = 0;
      for (const ev of events.length ? events : [e]) {
        const p = this.pos(ev);
        dist += Math.hypot(p.x - this.last.x, p.y - this.last.y);
        this.scratchLine(this.last, p);
        this.last = p;
      }
      if (window.Sound) Sound.scratch(dist);
      this.dustTick += dist;
      if (this.dustTick > 10 && window.FX) {
        this.dustTick = 0;
        FX.dust(this.last.cx, this.last.cy, 3, this.cover.colors);
      }
      this.scheduleCheck();
    }

    onUp() {
      if (!this.down) return;
      this.down = false;
      if (window.Sound) Sound.scratchStop();
      this.scheduleCheck(0);
    }

    /* ---------- Borrado ---------- */
    scratchAt(x, y) {
      const { ctx } = this;
      const r = this.brush;
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.arc(x, y, r * (0.85 + Math.random() * 0.2), 0, Math.PI * 2);
      ctx.fill();
      // Bordes irregulares para un rascado más realista
      for (let i = 0; i < 3; i++) {
        const a = Math.random() * Math.PI * 2;
        const d = r * (0.8 + Math.random() * 0.35);
        ctx.beginPath();
        ctx.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, r * (0.15 + Math.random() * 0.2), 0, Math.PI * 2);
        ctx.fill();
      }
    }

    scratchLine(a, b) {
      const d = Math.hypot(b.x - a.x, b.y - a.y);
      const step = Math.max(2, this.brush / 3);
      const n = Math.max(1, Math.ceil(d / step));
      for (let i = 1; i <= n; i++) {
        const t = i / n;
        this.scratchAt(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t);
      }
    }

    /* ---------- Comprobación de progreso ---------- */
    scheduleCheck(delay) {
      if (this.checkTimer !== null) return;
      this.checkTimer = setTimeout(() => {
        this.checkTimer = null;
        this.check();
      }, delay === undefined ? 90 : delay);
    }

    check() {
      if (this.done) return;
      const W = this.canvas.width, H = this.canvas.height, dpr = this.dpr;
      let data;
      try {
        data = this.ctx.getImageData(0, 0, W, H).data;
      } catch (e) {
        return;
      }
      const alphaAt = (x, y) => {
        const px = Math.min(W - 1, Math.max(0, Math.round(x * dpr)));
        const py = Math.min(H - 1, Math.max(0, Math.round(y * dpr)));
        return data[(py * W + px) * 4 + 3];
      };

      // Casillas
      const S = 7;
      this.rects.forEach((r, i) => {
        if (this.revealed[i]) return;
        let clear = 0;
        for (let iy = 0; iy < S; iy++) {
          for (let ix = 0; ix < S; ix++) {
            const x = r.x + r.w * (0.15 + (0.7 * ix) / (S - 1));
            const y = r.y + r.h * (0.15 + (0.7 * iy) / (S - 1));
            if (alphaAt(x, y) < 60) clear++;
          }
        }
        if (clear / (S * S) >= 0.55) {
          this.revealed[i] = true;
          if (this.opts.onCellReveal) this.opts.onCellReveal(i);
        }
      });

      // Total
      let clear = 0, total = 0;
      const step = 8 * dpr;
      for (let y = 0; y < H; y += step) {
        for (let x = 0; x < W; x += step) {
          total++;
          if (data[((y | 0) * W + (x | 0)) * 4 + 3] < 60) clear++;
        }
      }
      this.progress = clear / total;
      if (this.opts.onProgress) this.opts.onProgress(this.progress);

      if (this.revealed.every(Boolean) || this.progress > 0.8) this.finish();
    }

    /* ---------- Descubrir casillas concretas (habilidad «Ojo de lince») ---------- */
    revealCells(indices) {
      if (this.done) return;
      indices.forEach((i) => {
        const r = this.rects[i];
        if (!r) return;
        const step = this.brush * 0.8;
        for (let y = r.y + step * 0.4; y < r.y + r.h; y += step) {
          for (let x = r.x + step * 0.4; x < r.x + r.w; x += step) this.scratchAt(x, y);
        }
        if (window.FX) {
          const cr = this.canvas.getBoundingClientRect();
          FX.sparkle(cr.left + r.x + r.w / 2, cr.top + r.y + r.h / 2, 8, '#bff7ff');
        }
      });
      this.scheduleCheck(0);
    }

    /* ---------- Rascado automático ---------- */
    autoScratch() {
      if (this.done || this.auto) return;
      this.auto = true;
      const { w, h } = this;
      const rows = Math.ceil(h / (this.brush * 1.4)) + 1;
      const pts = [];
      for (let i = 0; i <= rows; i++) {
        const y = (i / rows) * h;
        pts.push(i % 2 ? { x: w + 10, y } : { x: -10, y });
      }
      const dur = 1100;
      const t0 = performance.now();
      let prev = { x: pts[0].x, y: pts[0].y };
      let lastK = 0;
      const segs = pts.length - 1;
      const frame = (now) => {
        if (this.done) return;
        // El primer timestamp de rAF puede ser anterior a t0: se acota a [0, 1]
        const t = Math.max(0, Math.min(1, (now - t0) / dur));
        const f = t * segs;
        const k = Math.min(segs - 1, Math.floor(f));
        const lt = f - k;
        // Recorre los vértices del zigzag saltados en este fotograma
        for (let j = lastK + 1; j <= k; j++) {
          this.scratchLine(prev, pts[j]);
          prev = pts[j];
        }
        lastK = Math.max(lastK, k);
        const a = pts[k], b = pts[k + 1];
        const p = { x: a.x + (b.x - a.x) * lt, y: a.y + (b.y - a.y) * lt };
        this.scratchLine(prev, p);
        prev = p;
        if (window.Sound) Sound.scratch(25);
        if (window.FX && Math.random() < 0.5) {
          const r = this.canvas.getBoundingClientRect();
          FX.dust(r.left + p.x, r.top + p.y, 2, this.cover.colors);
        }
        this.scheduleCheck(40);
        if (t < 1) requestAnimationFrame(frame);
        else {
          if (window.Sound) Sound.scratchStop();
          setTimeout(() => this.finish(), 120);
        }
      };
      requestAnimationFrame(frame);
    }

    finish() {
      if (this.done) return;
      // Anuncia las casillas que aún no se habían contado
      this.revealed.forEach((v, i) => {
        if (!v) {
          this.revealed[i] = true;
          if (this.opts.onCellReveal) this.opts.onCellReveal(i, true);
        }
      });
      this.done = true;
      this.down = false;
      if (window.Sound) Sound.scratchStop();
      this.canvas.classList.add('fade');
      setTimeout(() => this.canvas.remove(), 600);
      this.detach();
      if (this.opts.onDone) this.opts.onDone();
    }

    detach() {
      const c = this.canvas;
      c.removeEventListener('pointerdown', this._down);
      c.removeEventListener('pointermove', this._move);
      c.removeEventListener('pointerup', this._up);
      c.removeEventListener('pointercancel', this._up);
      c.removeEventListener('lostpointercapture', this._up);
      window.removeEventListener('resize', this._resize);
      clearTimeout(this.checkTimer);
    }

    destroy() {
      this.done = true;
      this.detach();
      if (window.Sound) Sound.scratchStop();
      this.canvas.remove();
    }
  }

  window.ScratchCard = ScratchCard;
})();
