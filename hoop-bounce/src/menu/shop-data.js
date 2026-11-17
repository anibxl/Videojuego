// Catalogue de la boutique. Vide pour l'instant : l'interface affiche des emplacements « Bientôt ».
// Pour ajouter un article plus tard, il suffit de le déclarer ici, par exemple :
//   { id: 'ball-neon', name: { fr: 'Néon', en: 'Neon', es: 'Neón' }, price: 500, colors: ['#3fe0b8', '#1a8f7a'] }

export const SHOP_CATALOG = {
  featured: null, // offre mise en avant : { id, title, body, price, ... }
  tabs: [
    { id: 'featured', labelKey: 'shop.tab.featured' },
    { id: 'balls', labelKey: 'shop.tab.balls', items: [] },
    { id: 'trails', labelKey: 'shop.tab.trails', items: [] },
    { id: 'coins', labelKey: 'shop.tab.coins', items: [] },
  ],
  placeholderCount: 4, // emplacements affichés tant qu'une catégorie est vide
};

// Ballons de la collection (vide : la page affiche son état vide)
export const BALL_COLLECTION = [];
