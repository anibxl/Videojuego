// Entrées, pensées pour jouer d'une seule main en mode portrait.
//
//  - Poser le doigt n'importe où = REBONDIR (immédiatement, au toucher : aucune latence).
//  - Garder le doigt et GLISSER à gauche / à droite = DIRIGER (comme un joystick invisible,
//    centré là où le doigt s'est posé). Pleine vitesse après ~34 px de glissement.
//  - Le centre du joystick suit le doigt quand on dépasse : un demi-tour est instantané,
//    sans devoir revenir au point de départ.
//  - Un second doigt peut taper pour rebondir pendant que le premier dirige (jeu à deux pouces).
//
// Clavier (ordinateur) : ← → / Q D / A D pour diriger, Espace / ↑ / Z / W pour rebondir.

export class Input {
  /**
   * @param {HTMLElement} surface
   * @param {object} opts  CONFIG.input
   * @param {object} h
   * @param {() => void} h.onBounce
   * @param {(axis:number) => void} h.onAxis
   * @param {(code:string) => void} [h.onShortcut]
   * @param {() => void} [h.onFirstInput]
   */
  constructor(surface, opts, h) {
    this.surface = surface;
    this.opts = opts;
    this.h = h;
    this.enabled = true;

    // État du doigt qui dirige (lisible par le rendu pour afficher le repère du pouce)
    this.steer = { id: null, originX: 0, originY: 0, x: 0, axis: 0 };
    this.pointers = new Set();
    this.keys = { left: false, right: false };

    surface.addEventListener('pointerdown', (e) => this._down(e), { passive: false });
    surface.addEventListener('pointermove', (e) => this._move(e), { passive: false });
    surface.addEventListener('pointerup', (e) => this._up(e));
    surface.addEventListener('pointercancel', (e) => this._up(e));
    surface.addEventListener('lostpointercapture', (e) => this._up(e));
    surface.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('keydown', (e) => this._keyDown(e));
    window.addEventListener('keyup', (e) => this._keyUp(e));
    window.addEventListener('blur', () => this.releaseAll());
  }

  get touching() {
    return this.steer.id !== null;
  }

  releaseAll() {
    this.pointers.clear();
    this.steer.id = null;
    this.steer.axis = 0;
    this.keys.left = this.keys.right = false;
    this._emitAxis();
  }

  _emitAxis() {
    const k = (this.keys.right ? 1 : 0) - (this.keys.left ? 1 : 0);
    this.h.onAxis(this.steer.id !== null ? this.steer.axis : k);
  }

  _down(e) {
    if (e.button !== undefined && e.button > 0) return;
    e.preventDefault();
    this.pointers.add(e.pointerId);
    try {
      this.surface.setPointerCapture(e.pointerId);
    } catch {
      /* sans importance */
    }
    this.h.onFirstInput?.();
    if (!this.enabled) return;
    if (this.steer.id === null) {
      this.steer.id = e.pointerId;
      this.steer.originX = this.steer.x = e.clientX;
      this.steer.originY = e.clientY;
      this.steer.axis = 0;
      this._emitAxis();
    }
    this.h.onBounce();
  }

  _move(e) {
    if (e.pointerId !== this.steer.id) return;
    e.preventDefault();
    const { dragFullPx, dragDeadPx } = this.opts;
    const s = this.steer;
    s.x = e.clientX;
    let dx = s.x - s.originX;
    // Le centre suit le doigt au-delà de la course : demi-tour instantané
    if (dx > dragFullPx) {
      s.originX = s.x - dragFullPx;
      dx = dragFullPx;
    } else if (dx < -dragFullPx) {
      s.originX = s.x + dragFullPx;
      dx = -dragFullPx;
    }
    s.originY += (e.clientY - s.originY) * 0.2; // le repère suit doucement le pouce en hauteur
    const mag = Math.abs(dx);
    s.axis = mag <= dragDeadPx ? 0 : (Math.sign(dx) * (mag - dragDeadPx)) / (dragFullPx - dragDeadPx);
    this._emitAxis();
  }

  _up(e) {
    if (!this.pointers.delete(e.pointerId)) return;
    if (e.pointerId === this.steer.id) {
      this.steer.id = null;
      this.steer.axis = 0;
      this._emitAxis();
    }
  }

  _keyDown(e) {
    const code = e.code;
    if (code === 'ArrowLeft' || code === 'KeyA' || code === 'KeyQ') this.keys.left = true;
    else if (code === 'ArrowRight' || code === 'KeyD') this.keys.right = true;
    else if (code === 'Space' || code === 'ArrowUp' || code === 'KeyW' || code === 'KeyZ') {
      e.preventDefault();
      if (!e.repeat) {
        this.h.onFirstInput?.();
        if (this.enabled) this.h.onBounce();
      }
      return;
    } else {
      if (!e.repeat) this.h.onShortcut?.(code);
      return;
    }
    e.preventDefault();
    this.h.onFirstInput?.();
    this._emitAxis();
  }

  _keyUp(e) {
    const code = e.code;
    if (code === 'ArrowLeft' || code === 'KeyA' || code === 'KeyQ') this.keys.left = false;
    else if (code === 'ArrowRight' || code === 'KeyD') this.keys.right = false;
    else return;
    this._emitAxis();
  }
}
