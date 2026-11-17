// Entrées : tactile / souris (Pointer Events) et clavier, ramenés à trois intentions :
// appuyer (avec une position écran), bouger, relâcher.
// Un seul doigt à la fois est suivi : un deuxième doigt est ignoré.

export class Input {
  /**
   * @param {HTMLElement} surface  élément qui reçoit le toucher (le canvas)
   * @param {object} h
   * @param {(x:number, y:number) => void} h.onPress
   * @param {(x:number, y:number) => void} h.onMove
   * @param {() => void} h.onRelease
   * @param {() => void} h.onCancel
   * @param {(dir:number) => void} h.onKeyPress    flèches / A-D / espace (0 = direction actuelle)
   * @param {(code:string) => void} [h.onShortcut] autres touches
   */
  constructor(surface, h) {
    this.surface = surface;
    this.h = h;
    this.activePointer = null;
    this.activeKey = null;

    surface.addEventListener('pointerdown', (e) => this._down(e));
    surface.addEventListener('pointermove', (e) => this._move(e));
    surface.addEventListener('pointerup', (e) => this._up(e));
    surface.addEventListener('pointercancel', (e) => this._cancel(e));
    surface.addEventListener('lostpointercapture', (e) => this._up(e));
    surface.addEventListener('contextmenu', (e) => e.preventDefault());

    window.addEventListener('keydown', (e) => this._keyDown(e));
    window.addEventListener('keyup', (e) => this._keyUp(e));
    window.addEventListener('blur', () => this.cancelAll());
  }

  get isPressed() {
    return this.activePointer !== null || this.activeKey !== null;
  }

  cancelAll() {
    if (!this.isPressed) return;
    this.activePointer = null;
    this.activeKey = null;
    this.h.onCancel();
  }

  _down(e) {
    if (e.button !== undefined && e.button > 0) return; // clic droit / milieu
    e.preventDefault();
    if (this.isPressed) return;
    this.activePointer = e.pointerId;
    try {
      this.surface.setPointerCapture(e.pointerId);
    } catch {
      /* certains navigateurs refusent : sans importance */
    }
    this.h.onPress(e.clientX, e.clientY);
  }

  _move(e) {
    if (e.pointerId !== this.activePointer) return;
    this.h.onMove(e.clientX, e.clientY);
  }

  _up(e) {
    if (e.pointerId !== this.activePointer) return;
    this.activePointer = null;
    this.h.onRelease();
  }

  _cancel(e) {
    if (e.pointerId !== this.activePointer) return;
    this.activePointer = null;
    this.h.onCancel();
  }

  _keyDown(e) {
    const dir = KEY_DIRECTIONS[e.code];
    if (dir === undefined) {
      if (!e.repeat) this.h.onShortcut?.(e.code);
      return;
    }
    e.preventDefault();
    if (e.repeat || this.isPressed) return;
    this.activeKey = e.code;
    this.h.onKeyPress(dir);
  }

  _keyUp(e) {
    if (e.code !== this.activeKey) return;
    this.activeKey = null;
    this.h.onRelease();
  }
}

const KEY_DIRECTIONS = {
  ArrowLeft: -1,
  KeyA: -1,
  KeyQ: -1, // AZERTY
  ArrowRight: 1,
  KeyD: 1,
  Space: 0,
  ArrowUp: 0,
};
