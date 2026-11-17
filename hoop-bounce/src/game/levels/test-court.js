// Scène de test : un terrain d'entraînement pour éprouver la physique et les contrôles.
// Les niveaux sont de simples données : ajouter un niveau = ajouter un fichier comme celui-ci.
//
// Repère : x vers la droite, y vers le haut, le parquet est à y = 0.
// Formes disponibles :
//   { type: 'box',    x, y, w, h,        material, style }
//   { type: 'poly',   points: [{x,y}…],  material, style }
//   { type: 'circle', x, y, r,           material, style }

export const TEST_COURT = {
  id: 'test-court',
  name: "Terrain d'entraînement",
  bounds: { minX: -16, maxX: 36, minY: -3, maxY: 22 },
  spawn: { x: 0, y: 0.6 },
  solids: [
    // Parquet et murs
    { type: 'box', x: -16, y: -3, w: 52, h: 3, material: 'wood', style: 'floor' },
    { type: 'box', x: -16, y: 0, w: 1.5, h: 22, material: 'wall', style: 'wall' },
    { type: 'box', x: 34.5, y: 0, w: 1.5, h: 22, material: 'wall', style: 'wall' },

    // Côté gauche : bumper en caoutchouc et plateforme suspendue
    { type: 'circle', x: -11.5, y: 0.8, r: 0.8, material: 'rubber', style: 'bumper' },
    { type: 'box', x: -8.5, y: 3.2, w: 3.5, h: 0.45, material: 'platform', style: 'platform' },

    // Escalier
    { type: 'box', x: 4, y: 0, w: 2.5, h: 0.9, material: 'platform', style: 'block' },
    { type: 'box', x: 6.5, y: 0, w: 2.5, h: 1.9, material: 'platform', style: 'block' },

    // Rampe puis plateau de tir
    { type: 'poly', points: [{ x: 11, y: 0 }, { x: 15.5, y: 0 }, { x: 15.5, y: 1.6 }], material: 'platform', style: 'block' },
    { type: 'box', x: 15.5, y: 0, w: 3, h: 1.6, material: 'platform', style: 'block' },
  ],
  hoops: [
    { x: 26, y: 4.8, facing: -1 },
  ],
};
