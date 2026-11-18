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
