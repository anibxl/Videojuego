// Catalogue de la boutique : tout se débloque en jouant, avec les pièces gagnées dans les niveaux.
// Aucun achat avec de l'argent réel.
//
// Catégories : ball (ballons), bounce (effets de rebond), trail (traînées), goal (animations de panier).
// Raretés : common, rare, epic, legendary. Le premier article de chaque catégorie est offert et équipé.

export const RARITIES = {
  common: { color: '#a7b4cc', rgb: '167,180,204', order: 0 },
  rare: { color: '#4da3ff', rgb: '77,163,255', order: 1 },
  epic: { color: '#b46bff', rgb: '180,107,255', order: 2 },
  legendary: { color: '#ffc23d', rgb: '255,194,61', order: 3 },
};

export const CATEGORIES = ['ball', 'bounce', 'trail', 'goal'];

const n = (fr, en, es) => ({ fr, en, es });

export const CATALOG = [
  // ── Ballons ──
  { id: 'ball-classic', category: 'ball', rarity: 'common', price: 0, name: n('Classique', 'Classic', 'Clásico'), desc: n('Le cuir orange des grands soirs.', 'Orange leather for big nights.', 'El cuero naranja de las grandes noches.') },
  { id: 'ball-street', category: 'ball', rarity: 'common', price: 150, name: n('Street', 'Street', 'Callejero'), desc: n('Usé par mille parties sur le bitume.', 'Worn by a thousand games on asphalt.', 'Gastado por mil partidos en el asfalto.') },
  { id: 'ball-retro', category: 'ball', rarity: 'common', price: 200, name: n('Rétro', 'Retro', 'Retro'), desc: n('Rouge, blanc, bleu : le style des années 70.', 'Red, white, blue: pure 70s style.', 'Rojo, blanco y azul: puro estilo de los 70.') },
  { id: 'ball-frost', category: 'ball', rarity: 'rare', price: 400, name: n('Givre', 'Frost', 'Escarcha'), desc: n('Taillé dans la glace des sommets.', 'Carved from mountain ice.', 'Tallado en el hielo de las cumbres.') },
  { id: 'ball-neon', category: 'ball', rarity: 'rare', price: 450, name: n('Néon', 'Neon', 'Neón'), desc: n('Des coutures qui brillent dans la nuit.', 'Seams that glow in the dark.', 'Costuras que brillan en la noche.') },
  { id: 'ball-lava', category: 'ball', rarity: 'epic', price: 900, name: n('Magma', 'Magma', 'Magma'), desc: n('Obsidienne et fissures de lave en fusion.', 'Obsidian with molten lava cracks.', 'Obsidiana con grietas de lava.') },
  { id: 'ball-galaxy', category: 'ball', rarity: 'epic', price: 950, name: n('Galaxie', 'Galaxy', 'Galaxia'), desc: n('Une nébuleuse entière dans tes mains.', 'A whole nebula in your hands.', 'Una nebulosa entera en tus manos.') },
  { id: 'ball-gold', category: 'ball', rarity: 'legendary', price: 1800, name: n('Or pur', 'Pure Gold', 'Oro puro'), desc: n('Réservé aux champions. Il étincelle.', 'For champions only. It sparkles.', 'Solo para campeones. Destella.') },
  // ── Effets de rebond ──
  { id: 'bounce-classic', category: 'bounce', rarity: 'common', price: 0, name: n('Onde', 'Shockwave', 'Onda'), desc: n('L’onde de choc d’origine.', 'The original shockwave.', 'La onda de choque original.') },
  { id: 'bounce-sparks', category: 'bounce', rarity: 'common', price: 150, name: n('Étincelles', 'Sparks', 'Chispas'), desc: n('Chaque rebond fait jaillir des étincelles.', 'Every bounce throws sparks.', 'Cada rebote saca chispas.') },
  { id: 'bounce-bubbles', category: 'bounce', rarity: 'rare', price: 400, name: n('Bulles', 'Bubbles', 'Burbujas'), desc: n('Des bulles de savon qui s’envolent.', 'Soap bubbles floating away.', 'Pompas de jabón que se van volando.') },
  { id: 'bounce-stars', category: 'bounce', rarity: 'rare', price: 450, name: n('Étoiles', 'Stars', 'Estrellas'), desc: n('Une pluie d’étoiles à chaque appui.', 'A shower of stars on every tap.', 'Una lluvia de estrellas en cada toque.') },
  { id: 'bounce-lightning', category: 'bounce', rarity: 'epic', price: 900, name: n('Foudre', 'Lightning', 'Rayo'), desc: n('Des éclairs crépitent sous le ballon.', 'Lightning crackles under the ball.', 'Rayos crepitan bajo el balón.') },
  { id: 'bounce-rainbow', category: 'bounce', rarity: 'legendary', price: 1500, name: n('Arc-en-ciel', 'Rainbow', 'Arcoíris'), desc: n('Des anneaux de toutes les couleurs.', 'Rings of every color.', 'Anillos de todos los colores.') },
  // ── Traînées ──
  { id: 'trail-none', category: 'trail', rarity: 'common', price: 0, name: n('Aucune', 'None', 'Ninguna'), desc: n('Sobre et efficace.', 'Clean and simple.', 'Sobrio y eficaz.') },
  { id: 'trail-streak', category: 'trail', rarity: 'common', price: 150, name: n('Sillage', 'Streak', 'Estela'), desc: n('Un fin sillage de lumière.', 'A thin streak of light.', 'Una fina estela de luz.') },
  { id: 'trail-frost', category: 'trail', rarity: 'rare', price: 400, name: n('Poudreuse', 'Powder', 'Polvo de nieve'), desc: n('Des cristaux de glace dans ton sillage.', 'Ice crystals in your wake.', 'Cristales de hielo a tu paso.') },
  { id: 'trail-flame', category: 'trail', rarity: 'rare', price: 450, name: n('Flammes', 'Flames', 'Llamas'), desc: n('Le ballon laisse une traînée de feu.', 'The ball leaves a trail of fire.', 'El balón deja una estela de fuego.') },
  { id: 'trail-rainbow', category: 'trail', rarity: 'epic', price: 950, name: n('Arc-en-ciel', 'Rainbow', 'Arcoíris'), desc: n('Un ruban de toutes les couleurs.', 'A ribbon of every color.', 'Una cinta de todos los colores.') },
  { id: 'trail-plasma', category: 'trail', rarity: 'legendary', price: 1600, name: n('Plasma', 'Plasma', 'Plasma'), desc: n('Énergie pure et étincelles électriques.', 'Pure energy and electric sparks.', 'Energía pura y chispas eléctricas.') },
  // ── Animations de panier ──
  { id: 'goal-confetti', category: 'goal', rarity: 'common', price: 0, name: n('Confettis', 'Confetti', 'Confeti'), desc: n('La fête classique.', 'The classic party.', 'La fiesta clásica.') },
  { id: 'goal-streamers', category: 'goal', rarity: 'common', price: 150, name: n('Serpentins', 'Streamers', 'Serpentinas'), desc: n('Des serpentins colorés jaillissent du filet.', 'Colorful streamers burst from the net.', 'Serpentinas de colores salen de la red.') },
  { id: 'goal-fireworks', category: 'goal', rarity: 'rare', price: 450, name: n('Feu d’artifice', 'Fireworks', 'Fuegos artificiales'), desc: n('Un vrai feu d’artifice au-dessus du panier.', 'Real fireworks above the hoop.', 'Fuegos artificiales sobre la canasta.') },
  { id: 'goal-coins', category: 'goal', rarity: 'epic', price: 900, name: n('Jackpot', 'Jackpot', 'Premio gordo'), desc: n('Une pluie de pièces d’or.', 'A shower of gold coins.', 'Una lluvia de monedas de oro.') },
  { id: 'goal-supernova', category: 'goal', rarity: 'legendary', price: 1500, name: n('Supernova', 'Supernova', 'Supernova'), desc: n('Une explosion d’étoiles et une onde de lumière.', 'An explosion of stars and a wave of light.', 'Una explosión de estrellas y una onda de luz.') },
];

export const DEFAULTS = { ball: 'ball-classic', bounce: 'bounce-classic', trail: 'trail-none', goal: 'goal-confetti' };

export function itemById(id) {
  return CATALOG.find((i) => i.id === id) ?? null;
}

/** Barème des pièces (voir wallet.js). */
export const REWARDS = {
  firstClear: 40,       // première victoire dans un niveau…
  perWorld: 10,         // … + 10 par monde (la Neige rapporte plus que la Ville, etc.)
  newStar: 25,          // chaque étoile obtenue pour la première fois
  perfect: 20,          // bonus : les 3 étoiles obtenues
  replay: 10,           // rejouer un niveau déjà terminé
  swish: 5,             // panier sans toucher le cercle
};
