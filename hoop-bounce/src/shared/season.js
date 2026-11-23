// Saisons du jeu (événements). Saison 1 : NOËL.
//
// Un seul interrupteur : SEASON. Mettre `null` à la fin de l'événement remet le menu habituel (salle de
// basket, musique seule) sans rien toucher d'autre. Pour essayer sans changer le code :
//   index.html?season=off   (menu habituel)        index.html?season=christmas
// La saison ne change que la décoration et l'ambiance du MENU : aucune règle de jeu, aucune sauvegarde.

export const SEASONS = Object.freeze({
  christmas: Object.freeze({ id: 'christmas', number: 1, emoji: '🎄' }),
});

/** Saison en cours (null : aucune). */
export const SEASON = 'christmas';

/** Saison active, en tenant compte du paramètre d'essai ?season=… */
export function activeSeason(search = globalThis.location?.search ?? '') {
  const q = new URLSearchParams(search).get('season');
  if (q === 'off' || q === 'none') return null;
  if (q && SEASONS[q]) return SEASONS[q];
  return SEASON ? SEASONS[SEASON] ?? null : null;
}
