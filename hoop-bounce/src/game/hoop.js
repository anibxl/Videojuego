// Panier : géométrie de collision (cercle, fixation, planche, poteau), détection
// des paniers marqués et filet.

import { createCircle, createCapsule, createPolygonEdges, boxPoints } from '../physics/colliders.js';
import { Net } from './net.js';

export class Hoop {
  /**
   * @param {object} def        { x, y, facing, floorY, mount } — x = avant du cercle, y = hauteur du cercle,
   *                            facing = -1 : ouverture vers la gauche (planche à droite), +1 : l'inverse,
   *                            mount = 'pole' (poteau au sol) ou 'wall' (planche fixée au mur)
   * @param {object} cfg        CONFIG.hoop
   * @param {number} ballRadius
   * @param {object} materials  CONFIG.materials
   */
  constructor(def, cfg, ballRadius, materials) {
    const s = def.facing === 1 ? -1 : 1; // direction avant → arrière
    const rr = cfg.rimRadius;
    const span = 2 * ballRadius * cfg.innerWidthFactor + 2 * rr;

    this.facing = def.facing;
    this.rimY = def.y;
    this.rimRadius = rr;
    this.frontX = def.x;
    this.backX = def.x + s * span;
    this.leftX = Math.min(this.frontX, this.backX);
    this.rightX = Math.max(this.frontX, this.backX);
    this.centerX = (this.leftX + this.rightX) / 2;
    this.innerLeft = this.leftX + rr;
    this.innerRight = this.rightX - rr;

    const boardNear = this.backX + s * cfg.bracketLength;
    const boardFar = boardNear + s * cfg.backboardThickness;
    this.board = {
      x: Math.min(boardNear, boardFar),
      y: def.y - cfg.backboardBelowRim,
      w: cfg.backboardThickness,
      h: cfg.backboardHeight,
    };
    this.colliders = [
      createCircle(this.frontX, this.rimY, rr, materials.rim, 'rim'),
      createCircle(this.backX, this.rimY, rr, materials.rim, 'rim'),
      createCapsule(this.backX, this.rimY, boardNear, this.rimY, rr * 0.8, materials.rim, 'rim'),
      ...createPolygonEdges(boxPoints(this.board.x, this.board.y, this.board.w, this.board.h), materials.backboard, 'backboard'),
    ];

    this.pole = null;
    this.arm = null;
    if (def.mount !== 'wall') {
      const poleW = 0.28;
      const poleNear = boardFar + s * 0.25;
      this.pole = {
        x: s > 0 ? poleNear : poleNear - poleW,
        y: def.floorY,
        w: poleW,
        h: this.board.y + this.board.h * 0.5 - def.floorY,
      };
      // Bras qui relie le poteau à la planche (visuel)
      this.arm = { x1: boardFar, x2: poleNear + (s > 0 ? poleW / 2 : -poleW / 2), y: this.board.y + this.board.h * 0.45 };
      this.colliders.push(...createPolygonEdges(boxPoints(this.pole.x, this.pole.y, this.pole.w, this.pole.h), materials.wall, 'pole'));
    }

    this.net = new Net(this.innerLeft, this.innerRight, this.rimY, cfg);
    this.ballRadius = ballRadius;
    this._blocked = false; // vrai si le ballon est passé par en dessous (panier refusé)
    this.lastScoreTime = -Infinity;
  }

  /**
   * Détecte un panier : le centre du ballon traverse la ligne du cercle vers le bas,
   * entre les deux bords. Un ballon passé par en dessous ne compte pas.
   * @returns {boolean}
   */
  checkScore(prevX, prevY, x, y) {
    const Y = this.rimY;
    const inside = (px) => px > this.innerLeft && px < this.innerRight;

    if (prevY < Y && y >= Y && inside((prevX + x) / 2)) this._blocked = true;
    if (this._blocked) {
      const far = Math.abs(x - this.centerX) > (this.rightX - this.leftX) / 2 + 2 * this.ballRadius;
      if (far || y < Y - 3 * this.ballRadius) this._blocked = false;
    }

    if (prevY >= Y && y < Y && !this._blocked) {
      // Position exacte du croisement (interpolée)
      const t = (prevY - Y) / (prevY - y);
      const cx = prevX + (x - prevX) * t;
      if (inside(cx)) return true;
    }
    return false;
  }

  step(dt, ball) {
    this.net.step(dt, ball);
  }
}
