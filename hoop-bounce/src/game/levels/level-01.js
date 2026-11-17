// Niveau 1 — « Premier dribble »
// Un parcours horizontal. Chaque section présente UN élément, dans un endroit sûr, puis le met à l'épreuve.
//
//   A (0 → 15)    rouler, rebondir                          ★ au-dessus de la marche (puissance 2)
//   B (15 → 25)   enchaîner les rebonds pour passer un mur  (puissance 3)
//   C (25 → 40)   trampoline au-dessus d'un champ de pics   ★ au sommet du saut
//   D (40 → 54)   plateforme mobile au-dessus du vide
//   E (54 → 73)   ventilateur, corniche, interrupteur       ★ au-dessus de l'interrupteur
//   F (73 → 88)   la porte s'ouvre si l'interrupteur a été activé
//   G (88 → 94)   téléporteur pour franchir le grand mur
//   H (94 → 116)  le terrain : marquer le panier            (puissance 4 ou 5)
//
// Repère : x vers la droite, y vers le haut, sol à y = 0.
// Hauteurs de rebond (centre de la balle) : 1,5 · 2,3 · 3,2 · 4,2 · 5,3 u selon la puissance.
//
// Formes :
//   solids      { x, y, w, h, style }              style : ground, wall, block
//   movers      { x, y, w, h, path }               path = { dx, dy, period, phase }
//   trampolines { x, y, w }
//   spikes      { x, y, w, dir }                   dir : up, down
//   fans        { x, y, w, h, strength }           y = grille du ventilateur (encastrée dans le sol)
//   switches    { x, y, w, target }                target = id de porte
//   doors       { id, x, y, w, h, open:{dx,dy} }
//   teleporters { a:{x,y}, b:{x,y}, r }            sens unique A → B
//   stars, checkpoints { x, y }                    checkpoint : y = surface de réapparition
//   hoop        { x, y, facing, mount }
//   hints       { x, y, text, size }

export const LEVEL_01 = {
  id: 'level-01',
  name: 'Premier dribble',
  bounds: { minX: -1.5, maxX: 116.5, minY: -4, maxY: 10.5 },
  spawn: { x: 2.5, y: 0 },

  solids: [
    // Sol (deux tronçons, séparés par le vide de la section D)
    { x: -4, y: -6, w: 46, h: 6, style: 'ground' },
    { x: 54, y: -6, w: 66, h: 6, style: 'ground' },
    // Murs de fin
    { x: -4, y: 0, w: 3, h: 16, style: 'wall' },
    { x: 116.5, y: 0, w: 3.5, h: 16, style: 'wall' },

    // A — marche
    { x: 8, y: 0, w: 3, h: 1.0, style: 'block' },
    // B — mur à franchir en enchaînant
    { x: 17, y: 0, w: 4, h: 2.6, style: 'block' },

    // E — corniche au-dessus des pics, petite plateforme de l'interrupteur
    { x: 61, y: 3.0, w: 11, h: 0.8, style: 'block' },
    { x: 66, y: 5.75, w: 2.6, h: 0.4, style: 'block' },

    // F — mur percé d'une porte
    { x: 79, y: 2.7, w: 1.2, h: 13.3, style: 'wall' },

    // G — grand mur (seul le téléporteur permet de passer)
    { x: 90, y: 0, w: 2, h: 16, style: 'wall' },
  ],

  movers: [
    { x: 42.2, y: -0.5, w: 4, h: 0.5, path: { dx: 7.6, dy: 0, period: 5.2, phase: 0 } },
  ],

  trampolines: [
    { x: 27.0, y: 0, w: 1.6 },
  ],

  spikes: [
    { x: 30.6, y: 0, w: 4.4, dir: 'up' },
    { x: 61, y: 0, w: 11, dir: 'up' },
  ],

  fans: [
    { x: 57.4, y: 0, w: 2.2, h: 8, strength: 72 },
  ],

  switches: [
    { x: 66.7, y: 6.15, w: 1.2, target: 'gate' },
  ],

  doors: [
    { id: 'gate', x: 79.2, y: 0, w: 0.8, h: 2.7, open: { dx: 0, dy: 2.7 }, duration: 0.8 },
  ],

  teleporters: [
    { a: { x: 87.4, y: 0.9 }, b: { x: 95.2, y: 1.3 }, r: 0.8 },
  ],

  stars: [
    { x: 9.5, y: 3.1 },
    { x: 31.9, y: 6.2 },
    { x: 67.3, y: 7.7 },
  ],

  checkpoints: [
    { x: 24, y: 0 },
    { x: 39.5, y: 0 },
    { x: 55.6, y: 0 },
    { x: 74.5, y: 0 },
    { x: 96.5, y: 0 },
  ],

  hoop: { x: 106, y: 3.6, facing: -1, mount: 'pole' },

  hints: [
    { x: 4.5, y: 3.6, text: '◀ ▶  pour rouler' },
    { x: 4.5, y: 2.8, text: 'REBOND pour sauter', size: 0.8 },
    { x: 14, y: 5.0, text: 'Enchaîne les rebonds : la puissance monte' },
    { x: 14, y: 4.2, text: 'Elle redescend si tu attends', size: 0.8 },
    { x: 100.5, y: 5.6, text: 'Marque le panier !' },
  ],
};
