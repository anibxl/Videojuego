// Catalogue de la boutique : tout se débloque en jouant, avec les pièces gagnées dans les niveaux.
// Aucun achat avec de l'argent réel.
//
// Catégories : ball (ballons), bounce (effets de rebond), trail (traînées), goal (animations de panier).
// Raretés : common, rare, epic, legendary, mythic (Hoop Pass). Le premier article de chaque catégorie est offert.
//
// Provenance (champ `exclusive`, absent = vendu en pièces dans la boutique) :
//   'daily' / 'achievement'  récompense quotidienne, succès
//   'pass'                   Hoop Pass d'une saison (`season`) : ne s'obtient QUE pendant cette saison
//   'gems'                   vendu en 💎 gemmes (`gems`) dans l'onglet Gemmes de la boutique
// `group: 'fun'` : ballons avec un visage (onglet « Visages »), équipés comme des ballons.
//
// Économie (étape 17) : des prix de collection à long terme, les gains du jeu restent inchangés.
//   Commun 6 000–10 000 · Rare 15 000–50 000 · Épique 75 000–250 000 · Légendaire 500 000–1 000 000.

export const RARITIES = {
  common: { color: '#a7b4cc', rgb: '167,180,204', order: 0 },
  rare: { color: '#4da3ff', rgb: '77,163,255', order: 1 },
  epic: { color: '#b46bff', rgb: '180,107,255', order: 2 },
  legendary: { color: '#ffc23d', rgb: '255,194,61', order: 3 },
  // Mythique : objets de fin de Hoop Pass, uniques à une saison (ne s'obtiennent plus ensuite)
  mythic: { color: '#ff5f8f', rgb: '255,95,143', order: 4 },
};

export const CATEGORIES = ['ball', 'bounce', 'trail', 'goal'];

const n = (fr, en, es) => ({ fr, en, es });

export const CATALOG = [
  // ── Ballons (prix : commun 6 000–10 000 · rare 15 000–50 000 · épique 75 000–250 000 · légendaire 500 000–1 000 000) ──
  { id: 'ball-classic', category: 'ball', rarity: 'common', price: 0, name: n('Classique', 'Classic', 'Clásico'), desc: n('Le cuir orange des grands soirs.', 'Orange leather for big nights.', 'El cuero naranja de las grandes noches.') },
  { id: 'ball-street', category: 'ball', rarity: 'common', price: 6000, name: n('Street', 'Street', 'Callejero'), desc: n('Usé par mille parties sur le bitume.', 'Worn by a thousand games on asphalt.', 'Gastado por mil partidos en el asfalto.') },
  { id: 'ball-retro', category: 'ball', rarity: 'common', price: 7500, name: n('Rétro', 'Retro', 'Retro'), desc: n('Rouge, blanc, bleu : le style des années 70.', 'Red, white, blue: pure 70s style.', 'Rojo, blanco y azul: puro estilo de los 70.') },
  { id: 'ball-frost', category: 'ball', rarity: 'rare', price: 18000, name: n('Givre', 'Frost', 'Escarcha'), desc: n('Taillé dans la glace des sommets.', 'Carved from mountain ice.', 'Tallado en el hielo de las cumbres.') },
  { id: 'ball-neon', category: 'ball', rarity: 'rare', price: 25000, name: n('Néon', 'Neon', 'Neón'), desc: n('Des coutures qui brillent dans la nuit.', 'Seams that glow in the dark.', 'Costuras que brillan en la noche.') },
  { id: 'ball-shadow', category: 'ball', rarity: 'rare', price: 45000, name: n('Ombre', 'Shadow', 'Sombra'), desc: n('Noir d’encre, fumée violette dans les coutures.', 'Ink black, violet smoke in the seams.', 'Negro tinta, humo violeta en las costuras.') },
  { id: 'ball-lava', category: 'ball', rarity: 'epic', price: 85000, name: n('Magma', 'Magma', 'Magma'), desc: n('Obsidienne et fissures de lave en fusion.', 'Obsidian with molten lava cracks.', 'Obsidiana con grietas de lava.') },
  { id: 'ball-galaxy', category: 'ball', rarity: 'epic', price: 120000, name: n('Galaxie', 'Galaxy', 'Galaxia'), desc: n('Une nébuleuse entière dans tes mains.', 'A whole nebula in your hands.', 'Una nebulosa entera en tus manos.') },
  { id: 'ball-plasma', category: 'ball', rarity: 'epic', price: 180000, name: n('Plasma', 'Plasma', 'Plasma'), desc: n('Des veines d’énergie qui crépitent.', 'Crackling veins of energy.', 'Venas de energía que chisporrotean.') },
  { id: 'ball-rainbow', category: 'ball', rarity: 'epic', price: 240000, name: n('Arc-en-ciel', 'Rainbow', 'Arcoíris'), desc: n('Toutes les couleurs, en spirale.', 'Every color, in a spiral.', 'Todos los colores, en espiral.') },
  { id: 'ball-gold', category: 'ball', rarity: 'legendary', price: 500000, name: n('Or pur', 'Pure Gold', 'Oro puro'), desc: n('Réservé aux champions. Il étincelle.', 'For champions only. It sparkles.', 'Solo para campeones. Destella.') },
  { id: 'ball-diamond', category: 'ball', rarity: 'legendary', price: 1000000, name: n('Diamant', 'Diamond', 'Diamante'), desc: n('Taillé à facettes. Le trophée ultime.', 'Cut with facets. The ultimate trophy.', 'Tallado en facetas. El trofeo definitivo.') },
  // Ballons amusants, avec un visage (onglet « Visages » de la boutique ; même emplacement que les ballons)
  { id: 'ball-smile', category: 'ball', rarity: 'common', price: 6500, group: 'fun', name: n('Souriant', 'Smiley', 'Sonriente'), desc: n('Toujours de bonne humeur.', 'Always in a good mood.', 'Siempre de buen humor.') },
  { id: 'ball-pirate', category: 'ball', rarity: 'common', price: 9500, group: 'fun', name: n('Pirate', 'Pirate', 'Pirata'), desc: n('Bandeau, foulard et sourire de corsaire.', 'Eye patch, bandana and a buccaneer grin.', 'Parche, pañuelo y sonrisa de corsario.') },
  { id: 'ball-ninja', category: 'ball', rarity: 'rare', price: 22000, group: 'fun', name: n('Ninja', 'Ninja', 'Ninja'), desc: n('Masque noir et bandeau rouge qui flotte.', 'Black mask and a fluttering red headband.', 'Máscara negra y cinta roja al viento.') },
  { id: 'ball-robot', category: 'ball', rarity: 'rare', price: 38000, group: 'fun', name: n('Robot', 'Robot', 'Robot'), desc: n('Visière lumineuse et antenne qui clignote.', 'Glowing visor and a blinking antenna.', 'Visor luminoso y antena que parpadea.') },
  { id: 'ball-ghost', category: 'ball', rarity: 'epic', price: 95000, group: 'fun', name: n('Fantôme', 'Ghost', 'Fantasma'), desc: n('Bouh ! Il flotte dans un halo pâle.', 'Boo! It floats in a pale glow.', '¡Bu! Flota en un halo pálido.') },
  { id: 'ball-googly', category: 'ball', rarity: 'epic', price: 160000, group: 'fun', name: n('Yeux fous', 'Googly Eyes', 'Ojos locos'), desc: n('Des yeux qui roulent dans tous les sens.', 'Eyes that roll in every direction.', 'Ojos que giran en todas direcciones.') },
  { id: 'ball-alien', category: 'ball', rarity: 'legendary', price: 550000, group: 'fun', name: n('Extraterrestre', 'Alien', 'Extraterrestre'), desc: n('Venu d’ailleurs, antennes lumineuses et aura verte.', 'From beyond, with glowing antennae and a green aura.', 'Llegado de otro mundo, antenas luminosas y aura verde.') },
  // Exclusifs : récompense du 7e jour, succès « Au-delà des étoiles » (non achetables)
  { id: 'ball-hoop', category: 'ball', rarity: 'legendary', price: null, exclusive: 'daily', name: n('Hoop Bounce', 'Hoop Bounce', 'Hoop Bounce'), desc: n('Le ballon officiel du jeu. Récompense du 7e jour.', 'The official ball of the game. Day 7 reward.', 'El balón oficial del juego. Premio del día 7.') },
  { id: 'ball-legend', category: 'ball', rarity: 'legendary', price: null, exclusive: 'achievement', name: n('Légende', 'Legend', 'Leyenda'), desc: n('Noir et or. Pour qui a terminé les 50 niveaux.', 'Black and gold. For those who beat all 50 levels.', 'Negro y oro. Para quien superó los 50 niveles.') },

  // ── Effets de rebond ──
  { id: 'bounce-classic', category: 'bounce', rarity: 'common', price: 0, name: n('Onde', 'Shockwave', 'Onda'), desc: n('L’onde de choc d’origine.', 'The original shockwave.', 'La onda de choque original.') },
  { id: 'bounce-sparks', category: 'bounce', rarity: 'common', price: 6000, name: n('Étincelles', 'Sparks', 'Chispas'), desc: n('Chaque rebond fait jaillir des étincelles.', 'Every bounce throws sparks.', 'Cada rebote saca chispas.') },
  { id: 'bounce-smoke', category: 'bounce', rarity: 'common', price: 8500, name: n('Fumée', 'Smoke', 'Humo'), desc: n('Un nuage de fumée à chaque rebond.', 'A puff of smoke on every bounce.', 'Una nube de humo en cada rebote.') },
  { id: 'bounce-bubbles', category: 'bounce', rarity: 'rare', price: 16000, name: n('Bulles', 'Bubbles', 'Burbujas'), desc: n('Des bulles de savon qui s’envolent.', 'Soap bubbles floating away.', 'Pompas de jabón que se van volando.') },
  { id: 'bounce-stars', category: 'bounce', rarity: 'rare', price: 28000, name: n('Étoiles', 'Stars', 'Estrellas'), desc: n('Une pluie d’étoiles à chaque appui.', 'A shower of stars on every tap.', 'Una lluvia de estrellas en cada toque.') },
  { id: 'bounce-flames', category: 'bounce', rarity: 'epic', price: 80000, name: n('Flammes', 'Flames', 'Llamas'), desc: n('Le sol s’embrase sous le ballon.', 'The ground bursts into flames under the ball.', 'El suelo arde bajo el balón.') },
  { id: 'bounce-lightning', category: 'bounce', rarity: 'epic', price: 140000, name: n('Éclairs', 'Lightning', 'Rayos'), desc: n('Des éclairs crépitent sous le ballon.', 'Lightning crackles under the ball.', 'Rayos crepitan bajo el balón.') },
  { id: 'bounce-rainbow', category: 'bounce', rarity: 'legendary', price: 500000, name: n('Arc-en-ciel', 'Rainbow', 'Arcoíris'), desc: n('Des anneaux de toutes les couleurs.', 'Rings of every color.', 'Anillos de todos los colores.') },
  { id: 'bounce-cosmic', category: 'bounce', rarity: 'legendary', price: 800000, name: n('Particules cosmiques', 'Cosmic Particles', 'Partículas cósmicas'), desc: n('Une galaxie naît à chaque rebond.', 'A galaxy is born on every bounce.', 'Una galaxia nace en cada rebote.') },
  { id: 'bounce-crown', category: 'bounce', rarity: 'legendary', price: null, exclusive: 'achievement', name: n('Couronne', 'Crown', 'Corona'), desc: n('Une couronne d’or à chaque rebond. Succès « Maître du swish ».', 'A golden crown on every bounce. “Swish Master” achievement.', 'Una corona de oro en cada rebote. Logro «Maestro del swish».') },
  { id: 'bounce-lab', category: 'bounce', rarity: 'legendary', price: null, exclusive: 'achievement', name: n('Labo', 'Lab', 'Laboratorio'), desc: n('Un hexagone électrique jaillit à chaque rebond. Succès « Virtuose du Trickshot ».', 'An electric hexagon bursts out on every bounce. “Trickshot Virtuoso” achievement.', 'Un hexágono eléctrico surge en cada rebote. Logro «Virtuoso del Trickshot».') },

  // ── Traînées ──
  { id: 'trail-none', category: 'trail', rarity: 'common', price: 0, name: n('Aucune', 'None', 'Ninguna'), desc: n('Sobre et efficace.', 'Clean and simple.', 'Sobrio y eficaz.') },
  { id: 'trail-streak', category: 'trail', rarity: 'common', price: 6000, name: n('Sillage', 'Streak', 'Estela'), desc: n('Un fin sillage de lumière.', 'A thin streak of light.', 'Una fina estela de luz.') },
  { id: 'trail-frost', category: 'trail', rarity: 'rare', price: 18000, name: n('Glace', 'Ice', 'Hielo'), desc: n('Des cristaux de glace dans ton sillage.', 'Ice crystals in your wake.', 'Cristales de hielo a tu paso.') },
  { id: 'trail-flame', category: 'trail', rarity: 'rare', price: 30000, name: n('Feu', 'Fire', 'Fuego'), desc: n('Le ballon laisse une traînée de feu.', 'The ball leaves a trail of fire.', 'El balón deja una estela de fuego.') },
  { id: 'trail-energy', category: 'trail', rarity: 'rare', price: 48000, name: n('Énergie', 'Energy', 'Energía'), desc: n('Un courant électrique vert et cyan.', 'A green and cyan electric current.', 'Una corriente eléctrica verde y cian.') },
  { id: 'trail-rainbow', category: 'trail', rarity: 'epic', price: 120000, name: n('Arc-en-ciel', 'Rainbow', 'Arcoíris'), desc: n('Un ruban de toutes les couleurs.', 'A ribbon of every color.', 'Una cinta de todos los colores.') },
  { id: 'trail-galaxy', category: 'trail', rarity: 'epic', price: 230000, name: n('Galaxie', 'Galaxy', 'Galaxia'), desc: n('Un ruban de nébuleuse semé d’étoiles.', 'A nebula ribbon sprinkled with stars.', 'Una cinta de nebulosa llena de estrellas.') },
  { id: 'trail-plasma', category: 'trail', rarity: 'legendary', price: 600000, name: n('Plasma', 'Plasma', 'Plasma'), desc: n('Énergie pure et étincelles électriques.', 'Pure energy and electric sparks.', 'Energía pura y chispas eléctricas.') },
  { id: 'trail-hoop', category: 'trail', rarity: 'epic', price: null, exclusive: 'daily', name: n('Hoop Bounce', 'Hoop Bounce', 'Hoop Bounce'), desc: n('Un ruban orange et bleu nuit semé de ballons. Récompense du 7e jour (2e semaine).', 'An orange and navy ribbon dotted with balls. Day 7 reward (week 2).', 'Una cinta naranja y azul llena de balones. Premio del día 7 (semana 2).') },
  { id: 'trail-aurora', category: 'trail', rarity: 'legendary', price: null, exclusive: 'achievement', name: n('Aurore', 'Aurora', 'Aurora'), desc: n('Une aurore boréale dans ton sillage. Succès « Perfection ».', 'Northern lights in your wake. “Perfection” achievement.', 'Una aurora boreal a tu paso. Logro «Perfección».') },
  { id: 'trail-spectre', category: 'trail', rarity: 'legendary', price: null, exclusive: 'achievement', name: n('Spectre', 'Spectre', 'Espectro'), desc: n('Des échos translucides de ton ballon, comme un fantôme. Succès « Chasseur de fantômes ».', 'Translucent echoes of your ball, like a ghost. “Ghost Hunter” achievement.', 'Ecos translúcidos de tu balón, como un fantasma. Logro «Cazafantasmas».') },

  // ── Animations de panier ──
  { id: 'goal-confetti', category: 'goal', rarity: 'common', price: 0, name: n('Confettis', 'Confetti', 'Confeti'), desc: n('La fête classique.', 'The classic party.', 'La fiesta clásica.') },
  { id: 'goal-streamers', category: 'goal', rarity: 'common', price: 6000, name: n('Serpentins', 'Streamers', 'Serpentinas'), desc: n('Des serpentins colorés jaillissent du filet.', 'Colorful streamers burst from the net.', 'Serpentinas de colores salen de la red.') },
  { id: 'goal-burst', category: 'goal', rarity: 'common', price: 9000, name: n('Explosion de confettis', 'Confetti Blast', 'Explosión de confeti'), desc: n('Le filet explose en mille confettis.', 'The net bursts into a thousand pieces of confetti.', 'La red estalla en mil confetis.') },
  { id: 'goal-fireworks', category: 'goal', rarity: 'rare', price: 22000, name: n('Feu d’artifice', 'Fireworks', 'Fuegos artificiales'), desc: n('Un vrai feu d’artifice au-dessus du panier.', 'Real fireworks above the hoop.', 'Fuegos artificiales sobre la canasta.') },
  { id: 'goal-electric', category: 'goal', rarity: 'rare', price: 42000, name: n('Électrique', 'Electric', 'Eléctrico'), desc: n('Des éclairs jaillissent du cercle.', 'Lightning bursts from the rim.', 'Rayos salen del aro.') },
  { id: 'goal-coins', category: 'goal', rarity: 'epic', price: 100000, name: n('Jackpot', 'Jackpot', 'Premio gordo'), desc: n('Une pluie de pièces d’or.', 'A shower of gold coins.', 'Una lluvia de monedas de oro.') },
  { id: 'goal-space', category: 'goal', rarity: 'epic', price: 200000, name: n('Spatial', 'Cosmic', 'Espacial'), desc: n('Planètes, anneaux et étoiles filantes.', 'Planets, rings and shooting stars.', 'Planetas, anillos y estrellas fugaces.') },
  { id: 'goal-supernova', category: 'goal', rarity: 'legendary', price: 650000, name: n('Supernova', 'Supernova', 'Supernova'), desc: n('Une explosion d’étoiles et une onde de lumière.', 'An explosion of stars and a wave of light.', 'Una explosión de estrellas y una onda de luz.') },
  { id: 'goal-legend', category: 'goal', rarity: 'legendary', price: 1000000, name: n('Triomphe légendaire', 'Legendary Triumph', 'Triunfo legendario'), desc: n('Couronne d’or, pluie d’or et ondes de lumière.', 'A golden crown, golden rain and waves of light.', 'Corona de oro, lluvia dorada y ondas de luz.') },
  { id: 'goal-constellation', category: 'goal', rarity: 'legendary', price: null, exclusive: 'achievement', name: n('Constellation', 'Constellation', 'Constelación'), desc: n('Les étoiles se relient au-dessus du panier. Succès « Constellation ».', 'Stars join up above the hoop. “Constellation” achievement.', 'Las estrellas se unen sobre la canasta. Logro «Constelación».') },
  { id: 'goal-mystery', category: 'goal', rarity: 'legendary', price: null, exclusive: 'achievement', name: n('Énigme', 'Enigma', 'Enigma'), desc: n('Un sceau mystérieux s’ouvre au-dessus du panier. Succès « Maître des défis ».', 'A mysterious seal opens above the hoop. “Challenge Master” achievement.', 'Un sello misterioso se abre sobre la canasta. Logro «Maestro de los desafíos».') },
  // ── Saison 1 « Noël » : récompenses du Hoop Pass (exclusives à la saison) ──
  { id: 'ball-xmas', category: 'ball', rarity: 'epic', price: null, exclusive: 'pass', season: 'christmas-1', name: n('Ballon de Noël', 'Christmas Ball', 'Balón de Navidad'), desc: n('Rouge et or, semé de flocons. Hoop Pass, saison de Noël.', 'Red and gold, dotted with snowflakes. Hoop Pass, Christmas season.', 'Rojo y oro, salpicado de copos. Hoop Pass, temporada de Navidad.') },
  { id: 'ball-santa', category: 'ball', rarity: 'legendary', price: null, exclusive: 'pass', season: 'christmas-1', group: 'fun', name: n('Père Noël', 'Santa', 'Papá Noel'), desc: n('Bonnet, barbe blanche et joues roses. Ho ho ho !', 'Hat, white beard and rosy cheeks. Ho ho ho!', 'Gorro, barba blanca y mejillas rosadas. ¡Jo jo jo!') },
  { id: 'ball-polaris', category: 'ball', rarity: 'mythic', price: null, exclusive: 'pass', season: 'christmas-1', name: n('Étoile du Nord', 'North Star', 'Estrella del Norte'), desc: n('Mythique. La nuit de Noël dans un ballon. Introuvable après la saison.', 'Mythic. Christmas night inside a ball. Gone after the season.', 'Mítico. La noche de Navidad en un balón. Imposible tras la temporada.') },
  { id: 'trail-xmas', category: 'trail', rarity: 'epic', price: null, exclusive: 'pass', season: 'christmas-1', name: n('Sucre d’orge', 'Candy Cane', 'Bastón de caramelo'), desc: n('Un ruban rouge et blanc, fil d’or et étincelles.', 'A red and white ribbon, golden thread and sparkles.', 'Una cinta roja y blanca, hilo de oro y destellos.') },
  { id: 'bounce-snow', category: 'bounce', rarity: 'rare', price: null, exclusive: 'pass', season: 'christmas-1', name: n('Flocons', 'Snowflakes', 'Copos'), desc: n('Une gerbe de flocons à chaque rebond.', 'A burst of snowflakes on every bounce.', 'Un estallido de copos en cada rebote.') },
  { id: 'goal-xmas', category: 'goal', rarity: 'legendary', price: null, exclusive: 'pass', season: 'christmas-1', name: n('Pluie de cadeaux', 'Gift Shower', 'Lluvia de regalos'), desc: n('Des cadeaux jaillissent du panier sous la neige.', 'Gifts burst out of the hoop in the snow.', 'Los regalos saltan de la canasta bajo la nieve.') },
  // ── Objets à gemmes (onglet Gemmes de la boutique) ──
  { id: 'ball-crystal', category: 'ball', rarity: 'legendary', price: null, exclusive: 'gems', gems: 180, name: n('Cristal', 'Crystal', 'Cristal'), desc: n('Taillé dans la glace, il scintille de givre.', 'Cut from ice, it sparkles with frost.', 'Tallado en hielo, brilla de escarcha.') },
  { id: 'ball-aurora', category: 'ball', rarity: 'legendary', price: null, exclusive: 'gems', gems: 260, name: n('Aurore', 'Aurora', 'Aurora'), desc: n('Des veines d’aurore boréale qui ondulent.', 'Rippling veins of northern lights.', 'Venas de aurora boreal que ondulan.') },
  { id: 'trail-snow', category: 'trail', rarity: 'epic', price: null, exclusive: 'gems', gems: 120, name: n('Tempête de neige', 'Snowstorm', 'Tormenta de nieve'), desc: n('Un tourbillon de flocons dans ton sillage.', 'A whirl of snowflakes in your wake.', 'Un remolino de copos a tu paso.') },
];

export const DEFAULTS = { ball: 'ball-classic', bounce: 'bounce-classic', trail: 'trail-none', goal: 'goal-confetti' };

export function itemById(id) {
  return CATALOG.find((i) => i.id === id) ?? null;
}

/** Barème des pièces (voir wallet.js). */
// Phase 4 (économie) : la première victoire rapporte selon le MONDE (niveaux plus longs) et la DIFFICULTÉ ;
// rejouer rapporte peu (le Mode Fantôme donne une autre raison de rejouer) ; une partie complète des 50
// niveaux rapporte ≈ 8 800 pièces.
export const REWARDS = {
  firstClear: 40,       // première victoire dans un niveau…
  perWorld: 15,         // … + 15 par monde (Ville 40 … Espace 100)…
  difficulty: Object.freeze({ easy: 0, medium: 10, hard: 20, expert: 35, extreme: 50 }), // … + selon la difficulté
  newStar: 20,          // chaque étoile obtenue pour la première fois
  perfect: 30,          // bonus : les 3 étoiles obtenues
  replay: 8,            // rejouer un niveau déjà terminé…
  replayPerWorld: 2,    // … + 2 par monde (8 … 16)
  swish: 5,             // panier sans toucher le cercle
};

/** Pièces de la première victoire dans un niveau. */
export function firstClearCoins(worldIndex, difficulty = 'medium') {
  return REWARDS.firstClear + REWARDS.perWorld * worldIndex + (REWARDS.difficulty[difficulty] ?? 0);
}

/** Pièces quand on rejoue un niveau déjà terminé. */
export function replayCoins(worldIndex) {
  return REWARDS.replay + REWARDS.replayPerWorld * worldIndex;
}
