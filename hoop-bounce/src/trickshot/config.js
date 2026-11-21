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
  maxDrag: 3.2,          // distance de tirage (u) qui donne la pleine puissance
  restSpeed: 0.35,       // vitesse sous laquelle le ballon est considéré arrêté (u/s)
  restTime: 0.45,        // … pendant ce temps (s) → fin du tir
  maxShotTime: 12,       // un tir ne dure jamais plus de 12 s
  outMargin: 3,          // sortie de l'écran (u) → fin du tir
});

/** Difficultés affichées (couleur, rang). */
export const DIFFICULTIES = Object.freeze({
  easy: { rank: 0, color: '#3fe08a', emoji: '🟢' },
  hard: { rank: 1, color: '#ff9a3d', emoji: '🟠' },
  very: { rank: 2, color: '#ff4f63', emoji: '🔴' },
  impossible: { rank: 3, color: '#1c1c22', emoji: '⚫' },
});

/** Chapitres (10 niveaux chacun) : nom, couleur d'accent de l'arène, mécaniques introduites. */
export const CHAPTERS = Object.freeze([
  { id: 'basics', accent: '63,224,255', from: 1, to: 10 },
  { id: 'machines', accent: '255,154,61', from: 11, to: 20 },
  { id: 'danger', accent: '255,79,140', from: 21, to: 30 },
  { id: 'lab', accent: '160,120,255', from: 31, to: 40 },
  { id: 'master', accent: '255,214,90', from: 41, to: 50 },
]);

export const chapterOf = (n) => CHAPTERS.find((c) => n >= c.from && n <= c.to) ?? CHAPTERS[0];
