// Niveau de démonstration : une tour à gravir jusqu'au panier.
// Chaque « salle » apprend une seule chose, puis la combine avec les précédentes.
//
//   Salle 1 (0 → 10)   rouler et rebondir           ★ au-dessus de la marche
//   Salle 2 (10 → 23)  rebonds en l'air, jauge       ★ sous la grande dalle
//   Salle 3 (23 → 38)  piques au sol et au plafond
//   Salle 4 (38 → 48)  tremplin, plateforme mobile, scie   ★ près de la scie
//   Salle 5 (48 → 62)  ascension finale et panier, plafond piégé
//
// Repère : x vers la droite (0 → 9 = largeur jouable), y vers le haut, sol à y = 0.
// Mesures utiles (voir config) : un rebond monte d'environ 2,8 u ; saut + 2 rebonds ≈ 8,4 u.
// Un écart de 2,2 u se franchit d'un saut ; 4 à 5,5 u demandent un rebond en l'air ; 6 à 7 u, deux.
//
// Formes disponibles :
//   solids     { x, y, w, h, style }               blocs pleins (style : floor, wall, block)
//   planks     { x1, x2, y }                       plateformes traversables par en dessous
//   movers     { x, y, w, h, path }                plateformes mobiles
//   pads       { x, y, w }                         tremplins
//   spikes     { x, y, w, dir }                    piques (dir : up, down)
//   saws       { x, y, r, path }                   scies mobiles
//   stars      { x, y }
//   checkpoints{ x, y }                            y = surface où le ballon réapparaît
//   hoop       { x, y, facing, mount }
//   hints      { x, y, text, size }                textes peints sur le décor
// path = { dx, dy, period, phase } : aller-retour en douceur vers (dx, dy).

export const DEMO_LEVEL = {
  id: 'demo',
  name: 'La Tour',
  width: 9,
  bounds: { minX: -0.4, maxX: 9.4, minY: -4.5, maxY: 64 },
  spawn: { x: 1.5, y: 0 },

  solids: [
    // Enveloppe
    { x: -4, y: -8, w: 17, h: 8, style: 'floor', material: 'wood' },
    { x: -4, y: 0, w: 4, h: 62.2, style: 'wall', material: 'wall' },
    { x: 9, y: 0, w: 4, h: 62.2, style: 'wall', material: 'wall' },
    { x: -4, y: 62.2, w: 17, h: 4, style: 'wall', material: 'wall' },

    // Salle 1
    { x: 6.5, y: 0, w: 2.5, h: 1.2, style: 'block' },
    { x: 6.8, y: 9.3, w: 2.2, h: 0.6, style: 'block' },          // L1 (checkpoint)

    // Salle 2 → 3
    { x: 0, y: 22.6, w: 3.0, h: 0.6, style: 'block' },           // L2 (checkpoint)
    { x: 3.0, y: 25.8, w: 6.0, h: 0.6, style: 'block' },         // grande dalle piégée
    { x: 4.8, y: 30.65, w: 2.6, h: 0.6, style: 'block' },        // plafond piégé (dessus praticable)

    // Salle 4
    { x: 0, y: 37, w: 2.8, h: 0.6, style: 'block' },           // L3 (checkpoint)
    { x: 2.8, y: 37, w: 1.8, h: 0.6, style: 'block' },         // socle du tremplin
  ],

  planks: [
    { x1: 3.0, x2: 6.0, y: 3.3 },
    { x1: 0, x2: 3.2, y: 5.5 },
    { x1: 3.6, x2: 6.4, y: 7.7 },
    { x1: 0, x2: 3.4, y: 14.6 },
    { x1: 5.0, x2: 9, y: 17 },
    { x1: 7.6, x2: 9, y: 28.8 },
    { x1: 0, x2: 3.6, y: 33.6 },
    { x1: 4.6, x2: 7.6, y: 35.8 },
    { x1: 6.4, x2: 9, y: 48 },          // L4 (checkpoint) : traversable, on peut sauter depuis la plateforme mobile
    { x1: 0, x2: 2.0, y: 48.4 },
    { x1: 3.0, x2: 6.0, y: 50.4 },
    { x1: 5.6, x2: 9, y: 52.8 },
  ],

  movers: [
    { x: 3.0, y: 42.8, w: 2.4, h: 0.4, path: { dx: 3.4, dy: 0, period: 3.4, phase: 0 } },
  ],

  pads: [
    { x: 3.0, y: 37.6, w: 1.4 },
  ],

  spikes: [
    { x: 5.4, y: 26.4, w: 1.4, dir: 'up' },
    { x: 5.2, y: 30.65, w: 1.9, dir: 'down' },
    { x: 3.6, y: 62.2, w: 5.4, dir: 'down' },
  ],

  saws: [
    { x: 1.0, y: 46.2, r: 0.55, path: { dx: 4.6, dy: 0, period: 2.8, phase: 0.25 } },
  ],

  stars: [
    { x: 7.8, y: 3 },
    { x: 6.8, y: 22.4 },
    { x: 2.6, y: 45.8 },
  ],

  checkpoints: [
    { x: 8.0, y: 9.9 },
    { x: 1.3, y: 23.2 },
    { x: 1.2, y: 37.6 },
    { x: 8.0, y: 48 },
  ],

  hoop: { x: 2.01, y: 56.8, facing: 1, mount: 'wall' },

  hints: [
    { x: 4.6, y: 12.3, text: 'Touche en l’air : rebond bonus' },
    { x: 4.6, y: 11.5, text: 'Ta jauge se recharge au sol', size: 0.8 },
    { x: 1.8, y: 28.8, text: 'Gare aux piques !' },
    { x: 6.3, y: 55.6, text: 'Marque le panier !' },
  ],
};
