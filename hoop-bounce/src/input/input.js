// Commandes tactiles (paysage, deux pouces) et clavier.
//
// L'écran est découpé en deux grandes zones, bien plus larges que les boutons dessinés :
//  - moitié gauche : direction. Le pouce choisit ◀ ou ▶ selon qu'il est à gauche ou à droite
//    du milieu des deux boutons. On peut glisser d'un bouton à l'autre sans lever le pouce.
//  - moitié droite : REBOND. Chaque nouveau contact = un appui (au toucher, sans latence).
// Plusieurs doigts sont gérés en même temps (diriger et rebondir simultanément).
//
// Clavier : ← → (ou Q/A, D) pour diriger, Espace / ↑ / Z / W pour rebondir.

export class Input {
  /**
   * @param {HTMLElement} surface      élément qui reçoit les touchers (plein écran)
   * @param {object} ui                { left, right, bounce } : éléments des boutons dessinés
   * @param {object} h
   * @param {(left:boolean, right:boolean) => void} h.onDirection
   * @param {() => void} h.onBounce
   * @param {() => void} [h.onFirstInput]
   * @param {(code:string) => void} [h.onShortcut]
   */
  constructor(surface, ui, h) {
    this.surface = surface;
    this.ui = ui;
    this.h = h;
    this.enabled = true;
    this.steering = new Map(); // pointerId → -1 | 1
    this.bouncing = new Set();
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

  releaseAll() {
    this.steering.clear();
    this.bouncing.clear();
    this.keys.left = this.keys.right = false;
    this._emit();
    this.ui.bounce.classList.remove('pressed');
  }

  /** Milieu horizontal des deux boutons de direction (px). */
  _steerMid() {
    const a = this.ui.left.getBoundingClientRect();
    const b = this.ui.right.getBoundingClientRect();
    return (a.right + b.left) / 2;
  }

  _isSteerZone(x) {
    return x < window.innerWidth * 0.5;
  }

  _dirAt(x) {
    return x < this._steerMid() ? -1 : 1;
  }

  _emit() {
    let left = this.keys.left;
    let right = this.keys.right;
    for (const d of this.steering.values()) {
      if (d < 0) left = true;
      else right = true;
    }
    this.ui.left.classList.toggle('pressed', left);
    this.ui.right.classList.toggle('pressed', right);
    this.h.onDirection(left, right);
  }

  _down(e) {
    if (e.button !== undefined && e.button > 0) return;
    e.preventDefault();
    try {
      this.surface.setPointerCapture(e.pointerId);
    } catch {
      /* sans importance */
    }
    this.h.onFirstInput?.();
    if (!this.enabled) return;
    if (this._isSteerZone(e.clientX)) {
      this.steering.set(e.pointerId, this._dirAt(e.clientX));
      this._emit();
    } else {
      this.bouncing.add(e.pointerId);
      this.ui.bounce.classList.add('pressed');
      this.h.onBounce();
    }
  }

  _move(e) {
    if (!this.steering.has(e.pointerId)) return;
    e.preventDefault();
    const d = this._dirAt(e.clientX);
    if (d !== this.steering.get(e.pointerId)) {
      this.steering.set(e.pointerId, d);
      this._emit();
    }
  }

  _up(e) {
    if (this.steering.delete(e.pointerId)) this._emit();
    if (this.bouncing.delete(e.pointerId) && this.bouncing.size === 0) this.ui.bounce.classList.remove('pressed');
  }

  _keyDown(e) {
    const c = e.code;
    if (c === 'ArrowLeft' || c === 'KeyA' || c === 'KeyQ') this.keys.left = true;
    else if (c === 'ArrowRight' || c === 'KeyD') this.keys.right = true;
    else if (c === 'Space' || c === 'ArrowUp' || c === 'KeyW' || c === 'KeyZ') {
      e.preventDefault();
      if (!e.repeat) {
        this.h.onFirstInput?.();
        if (this.enabled) {
          this.ui.bounce.classList.add('pressed');
          this.h.onBounce();
        }
      }
      return;
    } else {
      if (!e.repeat) this.h.onShortcut?.(c);
      return;
    }
    e.preventDefault();
    this.h.onFirstInput?.();
    if (this.enabled) this._emit();
  }

  _keyUp(e) {
    const c = e.code;
    if (c === 'ArrowLeft' || c === 'KeyA' || c === 'KeyQ') this.keys.left = false;
    else if (c === 'ArrowRight' || c === 'KeyD') this.keys.right = false;
    else if (c === 'Space' || c === 'ArrowUp' || c === 'KeyW' || c === 'KeyZ') {
      if (this.bouncing.size === 0) this.ui.bounce.classList.remove('pressed');
      return;
    } else return;
    this._emit();
  }
}
