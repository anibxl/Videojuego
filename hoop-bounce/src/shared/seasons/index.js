// Registre des saisons. Ajouter une saison = un fichier de configuration (voir ./christmas.js) + une
// ligne ici. La saison en cours se choisit dans ../season.js (SEASON).

import christmas from './christmas.js';

export const SEASON_CONFIGS = Object.freeze({
  [christmas.id]: christmas,
});

/** Configuration d'une saison par son id (ou null). */
export function seasonConfig(id) {
  return (id && SEASON_CONFIGS[id]) || null;
}
