// Boîte à outils des cartes TRICKSHOT (laboratoire). La salle fait 24 × 13,5 u ; il n'y a PAS de sol
// continu : le bas de la salle est un vide (champ d'énergie) où le ballon est perdu. Les cartes se
// construisent avec des plateformes (posées, fixées à un mur ou suspendues par des câbles), des murs
// techniques, des murs inclinés, des cages de verre et des paniers posés, fixés au mur ou suspendus.

export const W = 24;
export const H = 13.5;
export const R = 0.4; // rayon du ballon

/** Pas de tir : ballon posé sur une surface dont le dessus est à y. */
export const tee = (x, y) => ({ x, y: y + R });

/** Murs de la salle et plafond (sans sol). */
export const frame = () => [
  { x: -1, y: -2, w: 1, h: H + 3, style: 'wall' },
  { x: W, y: -2, w: 1, h: H + 3, style: 'wall' },
  { x: -1, y: H, w: W + 2, h: 1, style: 'wall' },
];

/** Sol (dalle épaisse jusqu'en bas) entre x0 et x1, dessus à y. */
export const floor = (x0, x1, y = 1) => ({ x: x0, y: -2, w: x1 - x0, h: y + 2, style: 'ground' });

/** Plateforme dont le dessus est à y. hang : suspendue au plafond par deux câbles. */
export const plat = (x, y, w, { h = 0.5, hang = false, style = 'block' } = {}) => ({ x, y: y - h, w, h, style, ...(hang ? { hang: true } : {}) });

/** Mur technique (bloc plein). */
export const wall = (x, y, w, h) => ({ x, y, w, h, style: 'wall' });

/** Bloc d'acier quelconque. */
export const block = (x, y, w, h) => ({ x, y, w, h, style: 'block' });

/** Paroi de verre blindé (cage) : solide comme un mur, mais on voit au travers. */
export const glass = (x, y, w, h) => ({ x, y, w, h, style: 'glass' });

/** Mur incliné (polygone, points dans le sens trigonométrique). */
export const slope = (pts) => ({ points: pts.map(([x, y]) => ({ x, y })), style: 'block' });

/** Bumper de flipper (rend presque toute l'énergie). */
export const bumper = (x, y, w, h) => ({ x, y, w, h, style: 'bumper', material: 'bumper' });

/** Rampe-bumper (polygone). */
export const bramp = (pts) => ({ points: pts.map(([x, y]) => ({ x, y })), style: 'bumper', material: 'bumper' });

/** Glace (le ballon glisse). */
export const ice = (x, y, w, h) => ({ x, y, w, h, style: 'ice' });

/**
 * Paniers. x = avant du cercle, y = hauteur du cercle. facing -1 : ouverture vers la gauche (planche à
 * droite) ; +1 : ouverture vers la droite (planche à gauche).
 */
export const hoopPole = (x, y, floorY, facing = -1) => ({ x, y, facing, mount: 'pole', floorY });
export const hoopWall = (x, y, facing = -1) => ({ x, y, facing, mount: 'wall', floorY: 0 });
export const hoopHang = (x, y, facing = -1) => ({ x, y, facing, mount: 'wall', hang: true, floorY: 0 });

/** Textes en 3 langues. */
export const T = (fr, en, es) => ({ fr, en, es });
