// Vibrations. Utilise l'API Vibration du navigateur (Chrome Android).
// Une fois le jeu emballé avec Capacitor, il suffira de remplacer l'implémentation ici
// par le plugin @capacitor/haptics : le reste du code n'appelle que ces méthodes.

export class Haptics {
  constructor() {
    this.enabled = true;
    this.supported = typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
    this._last = 0;
  }

  _vibrate(pattern, minGapMs = 30) {
    if (!this.enabled || !this.supported) return;
    // Le navigateur refuse de vibrer avant la première interaction de l'utilisateur
    if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return;
    const now = performance.now();
    if (now - this._last < minGapMs) return;
    this._last = now;
    try {
      navigator.vibrate(pattern);
    } catch {
      /* ignoré */
    }
  }

  light() {
    this._vibrate(8);
  }

  impact(strength) {
    if (strength < 0.25) return;
    this._vibrate(Math.round(8 + strength * 14), 60);
  }

  success() {
    this._vibrate([18, 50, 28], 0);
  }

  /** Appui sur REBOND en l'air (dribble) : un tic à peine perceptible, confirme l'appui. */
  tap() {
    this._vibrate(5, 25);
  }

  /** Rebond : plus la puissance est haute, plus la vibration est franche. */
  bounce(level) {
    if (level >= 5) this._vibrate([16, 28, 10], 0);
    else this._vibrate(level >= 4 ? 13 : 8, 30);
  }

  /** Panier : petite fanfare de vibrations, plus riche pour un panier parfait. */
  goal(perfect) {
    this._vibrate(perfect ? [20, 40, 26, 40, 42] : [18, 50, 28], 0);
  }
}
