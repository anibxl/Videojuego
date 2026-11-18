// Les 5 mondes du jeu : identité, mécaniques, réglages physiques et niveaux.
//
// Un monde = { id, number, nameKey, taglineKey, theme, accent, planned, mechanics, physics, levels }
//  - theme      : décor, palette, particules, musique et sons (src/render/themes.js, src/audio/music.js)
//  - planned    : nombre de niveaux prévus (10 par monde) ; les emplacements pas encore créés
//                 s'affichent « bientôt » sur la carte
//  - mechanics  : mécaniques présentées sur l'écran d'introduction (clés de traduction mech.*)
//  - physics    : réglages appliqués à tous les niveaux du monde (gravité réduite dans l'espace)
//
// Déblocage : un monde s'ouvre quand tous les niveaux disponibles du monde précédent sont terminés
// (voir progress.js).

import { CITY_LEVELS } from './levels/city.js';
import { SNOW_LEVELS } from './levels/snow.js';
import { VOLCANO_LEVELS } from './levels/volcano.js';
import { FOREST_LEVELS } from './levels/forest.js';
import { SPACE_LEVELS } from './levels/space.js';

export const WORLDS = [
  {
    id: 'city',
    number: 1,
    nameKey: 'world.city',
    taglineKey: 'world.city.tagline',
    theme: 'city',
    accent: '#ff8a4c',
    planned: 10,
    mechanics: ['platforms', 'movers', 'trampolines', 'fans', 'crate'],
    physics: {},
    levels: CITY_LEVELS,
  },
  {
    id: 'snow',
    number: 2,
    nameKey: 'world.snow',
    taglineKey: 'world.snow.tagline',
    theme: 'snow',
    accent: '#8fd8ff',
    planned: 10,
    mechanics: ['ice', 'icyPlatforms', 'wind', 'icicles', 'ramps'],
    physics: {},
    levels: SNOW_LEVELS,
  },
  {
    id: 'volcano',
    number: 3,
    nameKey: 'world.volcano',
    taglineKey: 'world.volcano.tagline',
    theme: 'volcano',
    accent: '#ff6a2a',
    planned: 10,
    mechanics: ['lava', 'crumble', 'geysers', 'rocks', 'elevators'],
    physics: {},
    levels: VOLCANO_LEVELS,
  },
  {
    id: 'forest',
    number: 4,
    nameKey: 'world.forest',
    taglineKey: 'world.forest.tagline',
    theme: 'forest',
    accent: '#7be08a',
    planned: 10,
    mechanics: ['vines', 'wood', 'mushrooms', 'logs', 'branches'],
    physics: {},
    levels: FOREST_LEVELS,
  },
  {
    id: 'space',
    number: 5,
    nameKey: 'world.space',
    taglineKey: 'world.space.tagline',
    theme: 'space',
    accent: '#b48cff',
    planned: 10,
    mechanics: ['lowGravity', 'asteroids', 'portals', 'floating', 'inverted'],
    // Gravité réduite : on retombe plus lentement et les rebonds montent 25 % plus haut
    physics: { gravityScale: 0.55, jumpScale: 1.25 },
    levels: SPACE_LEVELS,
  },
];

/**
 * Tous les niveaux à plat, dans l'ordre des mondes, enrichis des informations de leur monde
 * (thème, réglages physiques, position dans le monde).
 */
export const LEVELS = WORLDS.flatMap((w, worldIndex) =>
  w.levels.map((l, indexInWorld) => ({
    ...w.physics,
    ...l,
    theme: w.theme,
    world: w.id,
    worldIndex,
    indexInWorld,
  })),
);

/** Index (dans LEVELS) du niveau `number` (1..) du monde `worldId`, ou -1. */
export function levelIndexOf(worldId, number) {
  return LEVELS.findIndex((l) => l.world === worldId && l.number === number);
}

export function worldById(id) {
  return WORLDS.find((w) => w.id === id) ?? null;
}
