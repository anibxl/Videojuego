// Briques communes aux niveaux.

/** Sol de -4 à `end`, murs aux deux bouts (zone jouable de 0 à `end`). */
export function court(end, style = 'ground') {
  return [
    { x: -4, y: -6, w: end + 8, h: 6, style },
    { x: -4, y: 0, w: 4, h: 16, style: 'wall' },
    { x: end, y: 0, w: 4, h: 16, style: 'wall' },
  ];
}

/** Murs aux deux bouts seulement (le sol est décrit à part : trous, lave, rivière…). */
export function walls(end) {
  return [
    { x: -4, y: 0, w: 4, h: 16, style: 'wall' },
    { x: end, y: 0, w: 4, h: 16, style: 'wall' },
  ];
}

export const bounds = (end, maxY = 10.5) => ({ minX: -1.5, maxX: end + 1.5, minY: -4, maxY });

/** Sol (bloc de 6 u d'épaisseur) de x0 à x1, dessus à la hauteur `top`. */
export const floor = (x0, x1, style = 'ground', top = 0) => ({ x: x0, y: top - 6, w: x1 - x0, h: 6, style });

/** Panier sur poteau : avant du cercle en x, cercle à `rim` au-dessus du sol `floorY`. */
export const hoopAt = (x, rim = 3.4, floorY = 0) => ({ x, y: floorY + rim, facing: -1, mount: 'pole', floorY });

/** Bassin de liquide (lave, eau) entre x0 et x1 : fond à -1,2, surface à -0,4. */
export const basin = (x0, x1, style = 'rock') => ({ x: x0, y: -6, w: x1 - x0, h: 4.8, style });
