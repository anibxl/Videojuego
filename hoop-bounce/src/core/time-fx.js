// Effets de temps : ralentis et arrêts sur image, sans à-coup.
//
// Avant l'étape 18, le ralenti du panier passait brutalement de ×0,3 à ×1 (minuteur). Ici chaque
// effet a trois phases : entrée rapide, maintien, puis **retour progressif** à la vitesse normale
// (courbe douce). Le plus fort des effets en cours l'emporte ; un arrêt sur image bref ne coupe
// jamais un ralenti plus long.
//
// Le temps réel (celui de l'écran) pilote les effets : ils durent toujours le même temps à l'œil.

import { clamp } from './math.js';

const smooth = (t) => t * t * (3 - 2 * t);

export class TimeFx {
  constructor() {
    this.effects = [];
    this.scale = 1;
  }

  /**
   * Ralenti.
   * @param {number} scale    vitesse au plus fort (0.25 = quatre fois plus lent)
   * @param {number} hold     durée au plus fort (s, temps réel)
   * @param {number} release  durée du retour à la normale (s)
   * @param {number} [attack] durée de l'entrée (s)
   */
  slowmo(scale, hold, release, attack = 0.06) {
    this.effects.push({ scale, attack, hold, release, t: 0 });
  }

  /** Arrêt sur image très bref (impact, étoile). */
  hitStop(seconds, scale = 0.05) {
    this.slowmo(scale, seconds, 0.04, 0);
  }

  /** Annule tout (nouveau niveau, recommencer). */
  clear() {
    this.effects.length = 0;
    this.scale = 1;
  }

  get active() {
    return this.effects.length > 0;
  }

  /** @param {number} dt temps réel écoulé (s) ; renvoie la vitesse du jeu à appliquer. */
  update(dt) {
    let s = 1;
    for (let i = this.effects.length - 1; i >= 0; i--) {
      const e = this.effects[i];
      e.t += dt;
      const { attack, hold, release } = e;
      let k; // 0 = vitesse normale, 1 = au plus fort
      if (e.t < attack) k = smooth(e.t / attack);
      else if (e.t < attack + hold) k = 1;
      else if (e.t < attack + hold + release) k = 1 - smooth((e.t - attack - hold) / release);
      else {
        this.effects.splice(i, 1);
        continue;
      }
      s = Math.min(s, 1 - (1 - e.scale) * k);
    }
    this.scale = clamp(s, 0, 1);
    return this.scale;
  }
}
