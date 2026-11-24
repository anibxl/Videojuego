// Textes des missions et des succès (partagés par le menu et le jeu), en trois langues.
// Toute clé doit exister dans chaque langue (vérifié par les tests). « singulier|pluriel » selon {n}.

const A = (fr, en, es) => ({ fr, en, es });

// [nom, description] par succès
const ACH = {
  'first-level': [A('Premier panier', 'First Basket', 'Primera canasta'), A('Terminer le premier niveau', 'Finish the first level', 'Completar el primer nivel')],
  'bounces-100': [A('Échauffement', 'Warm-up', 'Calentamiento'), A('Faire 100 rebonds', 'Bounce 100 times', 'Hacer 100 rebotes')],
  'stars-10': [A('Chasseur d’étoiles', 'Star Hunter', 'Cazador de estrellas'), A('Obtenir 10 étoiles', 'Earn 10 stars', 'Conseguir 10 estrellas')],
  'no-death-1': [A('Sans faute', 'Flawless', 'Sin fallos'), A('Terminer un niveau sans mourir', 'Finish a level without dying', 'Completar un nivel sin morir')],
  'buy-1': [A('Premier achat', 'First Purchase', 'Primera compra'), A('Acheter un article dans la boutique', 'Buy an item in the shop', 'Comprar un objeto en la tienda')],
  'games-10': [A('Habitué', 'Regular', 'Habitual'), A('Jouer 10 parties', 'Play 10 games', 'Jugar 10 partidas')],
  'world-city': [A('Roi de la ville', 'King of the City', 'Rey de la ciudad'), A('Terminer les 10 niveaux de la Ville', 'Finish the 10 City levels', 'Completar los 10 niveles de la Ciudad')],
  'coins-1000': [A('Tirelire', 'Piggy Bank', 'Hucha'), A('Gagner 1 000 pièces au total', 'Earn 1,000 coins in total', 'Ganar 1000 monedas en total')],
  'daily-1': [A('Bienvenue !', 'Welcome!', '¡Bienvenido!'), A('Récupérer une récompense quotidienne', 'Claim a daily reward', 'Recoger un premio diario')],
  'mission-1': [A('En mission', 'On a Mission', 'En misión'), A('Accomplir une mission quotidienne', 'Complete a daily mission', 'Completar una misión diaria')],
  'levels-10': [A('Dix sur dix', 'Ten Out of Ten', 'Diez de diez'), A('Terminer 10 niveaux', 'Finish 10 levels', 'Completar 10 niveles')],
  'stars-50': [A('Pluie d’étoiles', 'Star Shower', 'Lluvia de estrellas'), A('Obtenir 50 étoiles', 'Earn 50 stars', 'Conseguir 50 estrellas')],
  'bounces-1000': [A('Dribbleur', 'Dribbler', 'Driblador'), A('Faire 1 000 rebonds', 'Bounce 1,000 times', 'Hacer 1000 rebotes')],
  'goals-100': [A('Tireur', 'Shooter', 'Tirador'), A('Marquer 100 paniers', 'Score 100 baskets', 'Encestar 100 canastas')],
  'swish-25': [A('Swish !', 'Swish!', '¡Swish!'), A('Marquer 25 paniers sans toucher le cercle', 'Score 25 baskets without touching the rim', 'Encestar 25 canastas sin tocar el aro')],
  'buy-5': [A('Accro du shopping', 'Shopaholic', 'Adicto a las compras'), A('Acheter 5 articles', 'Buy 5 items', 'Comprar 5 objetos')],
  'world-snow': [A('Montagnard', 'Mountaineer', 'Montañero'), A('Terminer les 10 niveaux de la Neige', 'Finish the 10 Snow levels', 'Completar los 10 niveles de la Nieve')],
  'deaths-100': [A('Ne lâche rien', 'Never Give Up', 'Nunca te rindas'), A('Rater 100 fois… et continuer', 'Fail 100 times… and keep going', 'Fallar 100 veces… y seguir')],
  'time-30': [A('Passionné', 'Enthusiast', 'Apasionado'), A('Jouer 30 minutes', 'Play for 30 minutes', 'Jugar 30 minutos')],
  'coins-5000': [A('Économe', 'Saver', 'Ahorrador'), A('Gagner 5 000 pièces au total', 'Earn 5,000 coins in total', 'Ganar 5000 monedas en total')],
  'chests-5': [A('Chasseur de trésors', 'Treasure Hunter', 'Cazatesoros'), A('Ouvrir 5 coffres', 'Open 5 chests', 'Abrir 5 cofres')],
  'levels-25': [A('À mi-chemin', 'Halfway There', 'A mitad de camino'), A('Terminer 25 niveaux', 'Finish 25 levels', 'Completar 25 niveles')],
  'world-volcano': [A('Volcanologue', 'Volcanologist', 'Vulcanólogo'), A('Terminer les 10 niveaux du Volcan', 'Finish the 10 Volcano levels', 'Completar los 10 niveles del Volcán')],
  'world-forest': [A('Gardien de la forêt', 'Forest Keeper', 'Guardián del bosque'), A('Terminer les 10 niveaux de la Forêt', 'Finish the 10 Forest levels', 'Completar los 10 niveles del Bosque')],
  'perfect-world': [A('Perfection', 'Perfection', 'Perfección'), A('Terminer un monde avec toutes les étoiles', 'Finish a world with every star', 'Completar un mundo con todas las estrellas')],
  'goals-500': [A('Tireur d’élite', 'Sharpshooter', 'Francotirador'), A('Marquer 500 paniers', 'Score 500 baskets', 'Encestar 500 canastas')],
  'buy-10': [A('Collectionneur', 'Collector', 'Coleccionista'), A('Acheter 10 articles', 'Buy 10 items', 'Comprar 10 objetos')],
  'bounces-5000': [A('Infatigable', 'Tireless', 'Incansable'), A('Faire 5 000 rebonds', 'Bounce 5,000 times', 'Hacer 5000 rebotes')],
  'no-death-20': [A('Impeccable', 'Spotless', 'Impecable'), A('Terminer 20 niveaux sans mourir', 'Finish 20 levels without dying', 'Completar 20 niveles sin morir')],
  'coins-20000': [A('Fortune', 'Fortune', 'Fortuna'), A('Gagner 20 000 pièces au total', 'Earn 20,000 coins in total', 'Ganar 20 000 monedas en total')],
  'stars-100': [A('Constellation naissante', 'Rising Constellation', 'Constelación naciente'), A('Obtenir 100 étoiles', 'Earn 100 stars', 'Conseguir 100 estrellas')],
  'missions-15': [A('Agent spécial', 'Special Agent', 'Agente especial'), A('Accomplir 15 missions', 'Complete 15 missions', 'Completar 15 misiones')],
  'levels-50': [A('Au-delà des étoiles', 'Beyond the Stars', 'Más allá de las estrellas'), A('Terminer les 50 niveaux', 'Finish all 50 levels', 'Completar los 50 niveles')],
  'stars-150': [A('Constellation', 'Constellation', 'Constelación'), A('Obtenir les 150 étoiles', 'Earn all 150 stars', 'Conseguir las 150 estrellas')],
  'swish-100': [A('Maître du swish', 'Swish Master', 'Maestro del swish'), A('Marquer 100 paniers sans toucher le cercle', 'Score 100 baskets without touching the rim', 'Encestar 100 canastas sin tocar el aro')],
  'world-space': [A('Astronaute', 'Astronaut', 'Astronauta'), A('Terminer les 10 niveaux de l’Espace', 'Finish the 10 Space levels', 'Completar los 10 niveles del Espacio')],
  'daily-7': [A('Fidèle', 'Loyal', 'Fiel'), A('Récupérer 7 récompenses quotidiennes', 'Claim 7 daily rewards', 'Recoger 7 premios diarios')],
  'missions-30': [A('Légende des missions', 'Mission Legend', 'Leyenda de las misiones'), A('Accomplir 30 missions', 'Complete 30 missions', 'Completar 30 misiones')],
  'time-180': [A('Marathonien', 'Marathoner', 'Maratonista'), A('Jouer 3 heures', 'Play for 3 hours', 'Jugar 3 horas')],
  'collection': [A('Collection complète', 'Full Collection', 'Colección completa'), A('Posséder tous les articles de la boutique', 'Own every item in the shop', 'Tener todos los objetos de la tienda')],
};

const BASE = {
  'live.mission': A('Mission terminée !', 'Mission complete!', '¡Misión completada!'),
  'live.achievement': A('Succès débloqué !', 'Achievement unlocked!', '¡Logro desbloqueado!'),
  'mission.levels': A('Terminer {n} niveaux différents', 'Finish {n} different levels', 'Completar {n} niveles distintos'),
  'mission.goals': A('Marquer {n} paniers', 'Score {n} baskets', 'Encestar {n} canastas'),
  'mission.stars': A('Obtenir {n} étoiles', 'Earn {n} stars', 'Conseguir {n} estrellas'),
  'mission.noDeath': A('Finir {n} niveau sans mourir|Finir {n} niveaux sans mourir', 'Finish {n} level without dying|Finish {n} levels without dying', 'Completar {n} nivel sin morir|Completar {n} niveles sin morir'),
  'mission.time': A('Jouer pendant {n} minutes', 'Play for {n} minutes', 'Jugar durante {n} minutos'),
  'mission.bounces': A('Faire {n} rebonds', 'Bounce {n} times', 'Hacer {n} rebotes'),
  'mission.world': A('Terminer {n} niveau du monde {world}|Terminer {n} niveaux du monde {world}', 'Finish {n} level in the {world} world|Finish {n} levels in the {world} world', 'Completar {n} nivel del mundo {world}|Completar {n} niveles del mundo {world}'),
  'mission.games': A('Jouer {n} parties', 'Play {n} games', 'Jugar {n} partidas'),
  'mission.swish': A('Marquer {n} swish (sans toucher le cercle)', 'Score {n} swish (without touching the rim)', 'Encestar {n} swish (sin tocar el aro)'),
  'tier.beginner': A('Débutant', 'Beginner', 'Principiante'),
  'tier.intermediate': A('Intermédiaire', 'Intermediate', 'Intermedio'),
  'tier.expert': A('Expert', 'Expert', 'Experto'),
  'tier.legend': A('Légende', 'Legend', 'Leyenda'),
  'chest.common': A('Coffre commun', 'Common chest', 'Cofre común'),
  'chest.rare': A('Coffre rare', 'Rare chest', 'Cofre raro'),
  'chest.epic': A('Coffre épique', 'Epic chest', 'Cofre épico'),
  'reward.cosmetic.common': A('Article commun', 'Common item', 'Objeto común'),
  'reward.cosmetic.rare': A('Article rare', 'Rare item', 'Objeto raro'),
  // Page Roulette quotidienne (étape 13, refaite à la phase 4 : la roulette seule)
  'chest.super': A('Coffre amélioré', 'Upgraded chest', 'Cofre mejorado'),
  'pass.levelUp': A('niveau {n} !', 'level {n}!', '¡nivel {n}!'),
  'chest.legendary': A('Coffre légendaire', 'Legendary chest', 'Cofre legendario'),
  'chest.premium': A('Coffre premium', 'Premium chest', 'Cofre prémium'),
  'bonus.title': A('Roulette quotidienne', 'Daily spin', 'Ruleta diaria'),
  'bonus.wheel.title': A('Roulette du jour', 'Today’s wheel', 'Ruleta del día'),
  'bonus.wheel.sub': A('1 lancer gratuit par jour, puis jusqu’à {n} lancers en plus avec une publicité.', '1 free spin a day, then up to {n} extra spins with an ad.', '1 tirada gratis al día y hasta {n} tiradas más con un anuncio.'),
  'bonus.wheel.freeIn': A('Prochain lancer gratuit dans {t}', 'Next free spin in {t}', 'Próxima tirada gratis en {t}'),
  'bonus.wheel.done': A('Plus de lancers aujourd’hui — reviens demain !', 'No more spins today — come back tomorrow!', 'No quedan tiradas hoy: ¡vuelve mañana!'),
  'bonus.wheel.extraToday': A('Lancers bonus du jour', 'Bonus spins today', 'Tiradas extra de hoy'),
  'bonus.wheel.spin': A('Lancer gratuit', 'Free spin', 'Tirada gratis'),
  'bonus.wheel.extra': A('Lancer supplémentaire', 'Extra spin', 'Tirada extra'),
  'bonus.wheel.left': A('{n} restant|{n} restants', '{n} left|{n} left', '{n} restante|{n} restantes'),
  'bonus.wheel.used': A('Lancer gratuit utilisé', 'Free spin used', 'Tirada gratis usada'),
  'bonus.watch': A('Regarder une publicité', 'Watch an ad', 'Ver un anuncio'),
  'bonus.optional': A('Publicités toujours facultatives', 'Ads are always optional', 'Los anuncios son siempre opcionales'),
  'bonus.renew': A('Revient dans {t}', 'Back in {t}', 'Vuelve en {t}'),
  'bonus.got.wheel': A('Roulette du jour !', 'Daily spin!', '¡Ruleta del día!'),
  'ad.loading': A('Chargement de la publicité…', 'Loading the ad…', 'Cargando el anuncio…'),
  'ad.unavailable': A('Aucune publicité disponible pour le moment', 'No ad available right now', 'No hay anuncios disponibles ahora'),
  'ad.capped': A('Limite du jour atteinte — revenez demain', 'Daily limit reached — come back tomorrow', 'Límite diario alcanzado — vuelve mañana'),
  'ad.dismissed': A('Publicité interrompue : pas de récompense', 'Ad closed early: no reward', 'Anuncio cerrado: sin recompensa'),
  'ad.error': A('La publicité n’a pas pu s’afficher', 'The ad could not be shown', 'No se pudo mostrar el anuncio'),
  'wheel.coins': A('{n}', '{n}', '{n}'),
  'wheel.chestCommon': A('Coffre', 'Chest', 'Cofre'),
  'wheel.chestRare': A('Coffre rare', 'Rare chest', 'Cofre raro'),
  'wheel.effect': A('Effet', 'Effect', 'Efecto'),
  'wheel.skin': A('Skin rare', 'Rare skin', 'Skin raro'),
  'wheel.gems': A('Gemmes', 'Gems', 'Gemas'),
};

export const LIVE_STRINGS = { fr: {}, en: {}, es: {} };
for (const [k, v] of Object.entries(BASE)) for (const l of ['fr', 'en', 'es']) LIVE_STRINGS[l][k] = v[l];
for (const [id, [name, desc]] of Object.entries(ACH)) {
  for (const l of ['fr', 'en', 'es']) {
    LIVE_STRINGS[l][`ach.${id}`] = name[l];
    LIVE_STRINGS[l][`ach.${id}.d`] = desc[l];
  }
}

/** Traduit une clé. Variables {n}, {world}… ; « singulier|pluriel » selon n. */
export function lt(lang, key, vars = {}) {
  let s = LIVE_STRINGS[lang]?.[key] ?? LIVE_STRINGS.fr[key] ?? key;
  if (s.includes('|')) {
    const [one, many] = s.split('|');
    s = vars.n === 1 ? one : many;
  }
  return s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] !== undefined ? String(vars[k]) : `{${k}}`));
}
