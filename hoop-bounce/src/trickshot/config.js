// Réglages du mode TRICKSHOT. Ils dérivent de CONFIG (même moteur physique, mêmes matériaux) sans le
// modifier : le mode principal reste strictement identique.

import { CONFIG } from '../config.js';

export const TS_CONFIG = Object.freeze({
  ...CONFIG,
  materials: Object.freeze({
    ...CONFIG.materials,
    // Bumper de flipper : rend presque toute l'énergie (ricochets spectaculaires)
    bumper: Object.freeze({ restitution: 0.9, friction: 0.25 }),
    // Feutre : amortit fort (le ballon « colle »)
    felt: Object.freeze({ restitution: 0.3, friction: 0.9 }),
  }),
  // Au sol, le ballon s'arrête un peu plus vite que dans le mode principal : le tir se termine vite
  controls: Object.freeze({ ...CONFIG.controls, groundBrake: 5.5 }),
  feel: Object.freeze({ ...CONFIG.feel, deathDelay: 0.6 }),
});

export const TRICKSHOT = Object.freeze({
  shots: 3,              // essais par niveau
  maxSpeed: 30,          // vitesse de lancement à pleine puissance (u/s) : portée ≈ 26 u, hauteur ≈ 13 u
  minPower: 0.1,         // en dessous, le tir est annulé (le joueur a relâché trop près)
  maxDrag: 3.2,          // tirage de référence (u) : aimFromDrag() le reçoit déjà ramené à cette échelle
  // Visée tactile : une fois le ballon touché, le geste continue PARTOUT sur l'écran. La puissance dépend
  // de la longueur du geste à l'écran (et non de la distance au ballon) : pleine puissance à pullScreen ×
  // la plus petite dimension de l'écran, quelle que soit la place autour du ballon.
  pullScreen: 0.36,
  grabRadiusPx: 90,      // zone du doigt autour du ballon pour le saisir (px) …
  grabRadius: 1.6,       // … ou en unités du monde (la plus grande des deux)
  // Aide à la visée volontairement limitée : les pointillés montrent le DÉBUT de l'arc seulement
  // (longueur fixe, quel que soit le tir), s'arrêtent au premier obstacle et ne prévoient jamais les rebonds.
  previewLength: 5.2,    // longueur de l'arc montré (u)
  restSpeed: 0.35,       // vitesse sous laquelle le ballon est considéré arrêté (u/s)
  restTime: 0.45,        // … pendant ce temps (s) → fin du tir
  maxShotTime: 12,       // un tir ne dure jamais plus de 12 s
  outMargin: 3,          // sortie de l'écran (u) → fin du tir
});

/** Difficultés affichées (couleur, rang) : 5 paliers de 10 cartes (mode expert, 50 cartes). */
export const DIFFICULTIES = Object.freeze({
  easy: { rank: 0, color: '#3fe08a', emoji: '🟢' },
  medium: { rank: 1, color: '#3f9dff', emoji: '🔵' },
  hard: { rank: 2, color: '#ff9a3d', emoji: '🟠' },
  very: { rank: 3, color: '#ff4f63', emoji: '🔴' },
  impossible: { rank: 4, color: '#1c1c22', emoji: '⚫' },
});

/** Chapitres (5 cartes chacun, 2 par palier) : couleur d'accent du laboratoire. */
export const CHAPTERS = Object.freeze([
  { id: 'basics', accent: '63,224,255', from: 1, to: 5 },
  { id: 'machines', accent: '120,255,170', from: 6, to: 10 },
  { id: 'circuits', accent: '90,170,255', from: 11, to: 15 },
  { id: 'portals', accent: '170,130,255', from: 16, to: 20 },
  { id: 'precision', accent: '255,154,61', from: 21, to: 25 },
  { id: 'vertigo', accent: '255,214,90', from: 26, to: 30 },
  { id: 'chaos', accent: '255,90,120', from: 31, to: 35 },
  { id: 'master', accent: '255,110,200', from: 36, to: 40 },
  { id: 'expert', accent: '200,210,235', from: 41, to: 45 },
  { id: 'legend', accent: '255,230,150', from: 46, to: 50 },
]);

export const chapterOf = (n) => CHAPTERS.find((c) => n >= c.from && n <= c.to) ?? CHAPTERS[0];
