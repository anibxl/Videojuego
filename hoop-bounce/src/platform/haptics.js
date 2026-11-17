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
}
