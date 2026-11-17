// Boucle de jeu à pas fixe (« fix your timestep ») :
// la simulation avance toujours par pas de `dt`, quel que soit le taux de rafraîchissement
// de l'écran (60, 90, 120 Hz…). Le rendu interpole entre les deux derniers états : fluide et
// parfaitement reproductible.

export class FixedLoop {
  /**
   * @param {object} o
   * @param {number} o.dt                         pas fixe (s)
   * @param {(dt:number) => void} o.update        un pas de simulation
   * @param {(frameDt:number, alpha:number) => void} o.render
   */
  constructor({ dt, update, render }) {
    this.dt = dt;
    this.update = update;
    this.render = render;
    this.maxFrame = 0.1; // évite la « spirale de la mort » après une longue pause
    this.maxStepsPerFrame = 24;
    this.timeScale = 1;
    this._acc = 0;
    this._last = 0;
    this._raf = 0;
    this._running = false;
    this._frame = this._frame.bind(this);
  }

  start() {
    if (this._running) return;
    this._running = true;
    this._last = performance.now();
    this._acc = 0;
    this._raf = requestAnimationFrame(this._frame);
  }

  stop() {
    this._running = false;
    cancelAnimationFrame(this._raf);
  }

  _frame(now) {
    if (!this._running) return;
    const frameDt = Math.min(Math.max(0, (now - this._last) / 1000), this.maxFrame);
    this._last = now;
    this._acc += frameDt * this.timeScale;

    let steps = 0;
    while (this._acc >= this.dt && steps < this.maxStepsPerFrame) {
      this.update(this.dt);
      this._acc -= this.dt;
      steps++;
    }
    if (steps === this.maxStepsPerFrame) this._acc = 0;

    this.render(frameDt, this._acc / this.dt);
    this._raf = requestAnimationFrame(this._frame);
  }
}
