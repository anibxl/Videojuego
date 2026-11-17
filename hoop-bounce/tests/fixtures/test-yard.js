// Terrain d'essai pour les tests de mécanique : chaque élément à une position connue, loin des autres.
// Indépendant des vrais niveaux (qu'on peut donc retoucher sans casser ces tests).

export const TEST_YARD = {
  id: 'test-yard',
  name: 'Terrain d’essai',
  bounds: { minX: -2, maxX: 82, minY: -4, maxY: 10.5 },
  spawn: { x: 3, y: 0 },
  solids: [
    { x: -4, y: -6, w: 34, h: 6, style: 'ground' },          // sol A (0 → 30)
    { x: 36, y: -6, w: 48, h: 6, style: 'ground' },          // sol B (36 → 84), vide entre 30 et 36
    { x: -4, y: 0, w: 3, h: 16, style: 'wall' },
    { x: 80, y: 0, w: 4, h: 16, style: 'wall' },
    { x: 21.6, y: 3.0, w: 5, h: 0.8, style: 'block' },       // corniche (dessus à 3,8)
    { x: 39.8, y: 2.7, w: 1.2, h: 13.3, style: 'wall' },     // mur au-dessus de la porte
    { x: 48, y: 0, w: 2, h: 16, style: 'wall' },             // grand mur (téléporteur)
  ],
  movers: [{ x: 30.2, y: -0.5, w: 3, h: 0.5, path: { dx: 2.6, dy: 0, period: 4, phase: 0 } }],
  trampolines: [{ x: 10, y: 0, w: 1.6 }],
  spikes: [{ x: 13, y: 0, w: 3, dir: 'up' }],
  fans: [{ x: 18, y: 0, w: 2.2, h: 8, strength: 82 }],
  switches: [{ x: 25, y: 3.8, w: 1.2, target: 'gate' }],
  doors: [{ id: 'gate', x: 40, y: 0, w: 0.8, h: 2.7, open: { dx: 0, dy: 2.7 }, duration: 0.8 }],
  teleporters: [{ a: { x: 45, y: 0.9 }, b: { x: 55, y: 1.3 }, r: 0.8 }],
  stars: [{ x: 5, y: 2.4 }],
  checkpoints: [],
  hoop: { x: 66, y: 3.6, facing: -1, mount: 'pole' },
  hints: [],
};
