// Saisons du jeu (événements). Saison 1 : NOËL.
//
// Un seul interrupteur : SEASON. Mettre `null` à la fin de l'événement remet le menu habituel (salle de
// basket, musique seule) sans rien toucher d'autre. Pour essayer sans changer le code :
//   index.html?season=off   (menu habituel)        index.html?season=christmas
// La saison change la décoration et l'ambiance du MENU et donne son Hoop Pass (src/shared/pass.js) ;
// elle ne touche à aucune règle de jeu.

import { SEASON_CONFIGS } from './seasons/index.js';

/** Saisons connues (configurations complètes : thème, dates, Hoop Pass) — voir ./seasons/. */
export const SEASONS = SEASON_CONFIGS;

/** Saison en cours (null : aucune). */
export const SEASON = 'christmas';

/** Saison active, en tenant compte du paramètre d'essai ?season=… */
export function activeSeason(search = globalThis.location?.search ?? '') {
  const q = new URLSearchParams(search).get('season');
  if (q === 'off' || q === 'none') return null;
  if (q && SEASONS[q]) return SEASONS[q];
  return SEASON ? SEASONS[SEASON] ?? null : null;
}
