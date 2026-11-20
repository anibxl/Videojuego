// Effets visuels propres à chaque monde (étape 18) : ce que le ballon soulève quand il touche le
// sol, ce qu'il projette en roulant, et les petites réactions du décor aux gros chocs.
//
//  Ville   : poussière du bitume, étincelles sur le métal, éclats de lumière néon (magenta, cyan)
//  Neige   : neige soulevée, flocons, éclats et rayures brillantes sur la glace
//  Volcan  : braises, fumée, étincelles, cendres qui retombent après un grondement
//  Forêt   : brins d'herbe, feuilles qui tombent des arbres, lucioles qui s'envolent
//  Espace  : poussière cosmique, étincelles cyan et violettes, anneaux d'énergie
//
// Tout passe par le réservoir de particules préalloué (`Particles`) : aucune allocation en jeu.

const TINT = {
  city: '255,236,200',
  snow: '230,245,255',
  volcano: '255,170,90',
  forest: '210,240,160',
  space: '190,170,255',
};

const rnd = (a, b) => a + Math.random() * (b - a);

export class WorldFx {
  /** @param {import('./particles.js').Particles} particles */
  constructor(particles) {
    this.p = particles;
    this._neon = 0;
  }

  /** Couleur de lumière du monde (« r,g,b ») pour les ondes d'atterrissage. */
  tint(theme) {
    return TINT[theme] ?? TINT.city;
  }

  /**
   * Choc contre le sol (`strength` 0..1). La matière dépend du monde et de la surface.
   * @param {string} surface  voix de surface (voir `surfaceOf` dans audio/sfx.js)
   */
  impact(theme, surface, x, y, strength) {
    const P = this.p;
    const n = (a, b) => Math.round(a + strength * b);
    if (surface === 'ice') {
      P.puff(x, y, n(1, 3), '235,248,255', 0.18 + strength * 0.2, 1.4, 0.6);
      P.bits(x, y, n(2, 6), ['#ffffff', '#d8f1ff', '#a9dcff'], { speed: 2.6, up: 2.2, gravity: 9, life: 0.45, size: 0.045, kind: 3 });
      if (strength > 0.4) P.flash(x, y + 0.05, 0.6 + strength, '220,245,255', 0.2);
      return;
    }
    switch (theme) {
      case 'snow':
        P.puff(x, y, n(2, 5), '255,255,255', 0.22 + strength * 0.25, 1.6, 0.8);
        P.bits(x, y, n(2, 6), ['#ffffff', '#eef7ff'], { speed: 1.8, up: 2.4, gravity: 2.2, life: 1, size: 0.035, kind: 0, drag: 2.2 });
        break;
      case 'volcano':
        P.bits(x, y, n(2, 8), ['#ffb35c', '#ff7a2a', '#ffd38a'], { speed: 2.2, up: 3.4, gravity: 3.5, life: 0.9, size: 0.04 });
        if (strength > 0.3) P.puff(x, y, n(1, 3), '90,70,70', 0.32 + strength * 0.2, 1, 0.9);
        if (strength > 0.55) P.streaks(x, y, 0, 1, n(2, 4), 6, 'rgba(255,190,110,0.9)');
        break;
      case 'forest':
        if (surface === 'grass' || surface === 'wood') P.bits(x, y, n(1, 5), ['#7fb24a', '#a8c75a', '#c99a4a'], { speed: 1.8, up: 2.6, gravity: 3, life: 1.1, size: 0.07, kind: 1, drag: 2.5 });
        if (strength > 0.5) this.fireflies(x, y + 0.2, n(1, 4));
        break;
      case 'space':
        P.bits(x, y, n(2, 6), ['#9fe8ff', '#c8b6ff', '#ffffff'], { speed: 3, up: 1.6, gravity: 1, life: 0.6, size: 0.05, kind: 3 });
        if (strength > 0.4) P.ring(x, y + 0.03, 0.6 + strength * 0.8, 'rgba(170,150,255,0.7)', 0.4);
        break;
      default: // ville
        P.puff(x, y, n(1, 3), '190,180,170', 0.18 + strength * 0.18, 1.5, 0.5);
        if (surface === 'metal' || strength > 0.5) P.bits(x, y, n(1, 5), ['#ffd38a', '#ffffff', '#ffb35c'], { speed: 3.2, up: 2.2, gravity: 14, life: 0.35, size: 0.035, kind: 3 });
        if (strength > 0.55) {
          // Reflet des enseignes : éclat magenta ou cyan, en alternance
          this._neon ^= 1;
          P.flash(x, y + 0.1, 1 + strength, this._neon ? '255,80,200' : '80,220,255', 0.22);
        }
    }
  }

  /** Projeté derrière le ballon qui roule vite (appelé tous les ~0,9 u parcourus). */
  roll(theme, surface, x, y, vx, speed) {
    const P = this.p;
    const back = -Math.sign(vx) || 1;
    const k = Math.min(1, speed / 7.5);
    const bx = x + back * 0.25;
    switch (surface) {
      case 'snow':
        P.bits(bx, y, 1 + Math.round(k * 2), ['#ffffff', '#f0f8ff'], { speed: 0.8, up: 1.8 * k, gravity: 4, life: 0.6, size: 0.035, kind: 0, drag: 2 });
        this._push(back, 1.2 * k);
        break;
      case 'ice':
        P.bits(bx, y, 1, ['#ffffff', '#cfefff'], { speed: 0.6, up: 0.6, gravity: 2, life: 0.4, size: 0.04, kind: 3 });
        break;
      case 'rock':
        if (theme === 'volcano') P.bits(bx, y, 1 + Math.round(k), ['#ffb35c', '#ff7a2a'], { speed: 0.8, up: 1.4, gravity: 2, life: 0.7, size: 0.03 });
        P.bits(bx, y, 1, ['#3a2a28', '#5a4440'], { speed: 1, up: 1.2 * k, gravity: 12, life: 0.4, size: 0.03, kind: 1 });
        this._push(back, 1.5 * k);
        break;
      case 'grass':
        P.bits(bx, y, 1, ['#7fb24a', '#a8c75a', '#5f9a3a'], { speed: 0.7, up: 1.6 * k, gravity: 5, life: 0.7, size: 0.045, kind: 1, drag: 2.5 });
        this._push(back, 1.1 * k);
        break;
      case 'tech':
      case 'asteroid':
        P.bits(bx, y, 1, ['#9fe8ff', '#c8b6ff'], { speed: 0.6, up: 0.8, gravity: 0.5, life: 0.6, size: 0.04, kind: 3 });
        break;
      case 'metal':
        if (speed > 6 && Math.random() < 0.5) P.bits(bx, y, 2, ['#ffd38a', '#ffffff'], { speed: 1.4, up: 1.6, gravity: 14, life: 0.25, size: 0.03, kind: 3 });
        break;
      case 'wood':
        P.bits(bx, y, 1, ['#c9a26a', '#e0c08a'], { speed: 0.8, up: 1.2 * k, gravity: 6, life: 0.5, size: 0.03, kind: 0, drag: 2 });
        break;
      default:
        P.dust(bx, y, 0, 1, 0.12 * k, 'rgba(210,200,190,0.55)');
    }
  }

  /** Les dernières particules créées partent vers l'arrière (gerbe derrière le ballon). */
  _push(back, v) {
    const items = this.p.items;
    const i = (this.p._cursor - 1 + items.length) % items.length;
    const q = items[i];
    if (q?.alive) q.vx += back * v * (0.6 + Math.random() * 0.8);
  }

  /** Rebond à pleine puissance : gerbe généreuse de la matière du monde. */
  burst(theme, x, y) {
    this.impact(theme, null, x, y, 1);
    const P = this.p;
    switch (theme) {
      case 'snow':
        P.bits(x, y, 10, ['#ffffff', '#dff2ff'], { speed: 3, up: 3.5, gravity: 3, life: 1.2, size: 0.04, kind: 0, drag: 1.6 });
        break;
      case 'volcano':
        P.bits(x, y, 12, ['#ffd38a', '#ff9a3c', '#ff5a1a'], { speed: 3, up: 5, gravity: 4, life: 1.1, size: 0.045 });
        P.puff(x, y, 3, '70,55,55', 0.5, 1.4, 1);
        break;
      case 'forest':
        P.bits(x, y, 8, ['#7fb24a', '#a8c75a', '#d6b25a'], { speed: 2.6, up: 4, gravity: 2.4, life: 1.5, size: 0.075, kind: 1, drag: 2 });
        this.fireflies(x, y + 0.3, 5);
        break;
      case 'space':
        P.bits(x, y, 14, ['#9fe8ff', '#c8b6ff', '#ffffff', '#ff9ff3'], { speed: 4.5, up: 2.5, gravity: 0.6, life: 0.9, size: 0.055, kind: 3 });
        P.ring(x, y, 2, 'rgba(160,140,255,0.55)', 0.6);
        break;
      default:
        P.bits(x, y, 10, ['#ffd38a', '#ffffff', '#ff7ad9', '#7ae8ff'], { speed: 4, up: 3, gravity: 12, life: 0.5, size: 0.04, kind: 3 });
    }
  }

  /** Lucioles qui s'envolent doucement (forêt). */
  fireflies(x, y, count) {
    this.p.glow(x, y, count, '220,255,120', { size: 0.22, life: 1.6, speed: 0.8, up: 0.9 });
  }

  /**
   * Le décor réagit : un peu de matière tombe du haut de l'écran (feuilles des arbres, neige des
   * branches, cendres, poussière des toits, poussière d'étoiles).
   */
  debris(theme, cam, count = 8) {
    const P = this.p;
    const top = cam.y + cam.halfHeight + 0.3;
    for (let i = 0; i < count; i++) {
      const x = cam.x + rnd(-cam.halfWidth, cam.halfWidth);
      const y = top + rnd(0, 1.2);
      switch (theme) {
        case 'forest':
          P.bits(x, y, 1, ['#7fb24a', '#a8c75a', '#c99a4a', '#d9b44a'], { speed: 0.8, up: -0.3, gravity: 3, life: 3.4, size: 0.08, kind: 1, drag: 1.6 });
          break;
        case 'snow':
          P.bits(x, y, 1, ['#ffffff', '#eef7ff'], { speed: 0.5, up: -0.4, gravity: 3.2, life: 3, size: 0.05, kind: 0, drag: 1.4 });
          break;
        case 'volcano':
          P.bits(x, y, 1, Math.random() < 0.3 ? ['#ffb35c', '#ff7a2a'] : ['#6a5a58', '#8a7a76'], { speed: 0.6, up: -0.3, gravity: 3, life: 3, size: 0.035, kind: 0, drag: 1.4 });
          break;
        case 'space':
          P.bits(x, y, 1, ['#9fe8ff', '#c8b6ff', '#ffffff'], { speed: 0.4, up: -0.3, gravity: 1.6, life: 3.4, size: 0.045, kind: 3, drag: 0.8 });
          break;
        default:
          P.bits(x, y, 1, ['#b8aca0', '#d8ccc0'], { speed: 0.5, up: -0.3, gravity: 3.5, life: 2.6, size: 0.028, kind: 0, drag: 1.4 });
      }
    }
  }
}
