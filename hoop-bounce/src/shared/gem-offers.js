// Offres en 💎 gemmes de la boutique (onglet « Gemmes »).
//
// Les gemmes sont la monnaie RARE du jeu (gagnées surtout dans le Hoop Pass) : elles complètent les pièces
// sans les remplacer. Elles servent uniquement à :
//   - les coffres premium et légendaires (ci-dessous) ;
//   - les skins très rares et cosmétiques exclusifs vendus en gemmes (catalogue : exclusive: 'gems') ;
//   - les offres spéciales (packs de saison, limités à leur saison) ;
//   - le Pass Premium (src/shared/seasons/<saison>.js → premium.gems).
// Aucun achat avec de l'argent réel.

import { grant } from './rewards.js';
import { itemById } from './catalog.js';

export const GEM_OFFERS = Object.freeze([
  { id: 'chest-premium', kind: 'chest', chest: 'premium', gems: 60 },
  { id: 'chest-legendary', kind: 'chest', chest: 'legendary', gems: 150 },
  // Offre spéciale de la saison 1 : les deux objets d'hiver ensemble, moins cher que séparément
  { id: 'pack-winter', kind: 'pack', items: ['ball-crystal', 'trail-snow'], gems: 240, season: 'christmas-1' },
]);

export const offerById = (id) => GEM_OFFERS.find((o) => o.id === id) ?? null;

/** Prix des objets du pack achetés séparément (pour afficher la réduction). */
export function packValue(offer) {
  return (offer.items ?? []).reduce((s, id) => s + (itemById(id)?.gems ?? 0), 0);
}

/**
 * L'offre est-elle proposée ? Un pack n'est proposé que pendant sa saison et si aucun de ses objets
 * n'est déjà possédé (jamais deux fois le même objet).
 * @param {string|null} passId  identifiant du Hoop Pass en cours (ex. 'christmas-1'), null hors saison
 */
export function offerAvailable(offer, wallet, passId = null) {
  if (!offer) return false;
  if (offer.season && offer.season !== passId) return false;
  if (offer.kind === 'pack') return offer.items.every((id) => itemById(id) && !wallet.owns(id));
  return true;
}

/**
 * Achète une offre.
 * @returns {{ status: 'ok'|'gems'|'unavailable', reward?: object }}
 *   reward : { coins, gems, item, items, chest } (comme rewards.grant, `items` pour un pack)
 */
export function buyGemOffer(id, wallet, { passId = null, stats = null, rng = Math.random } = {}) {
  const offer = offerById(id);
  if (!offerAvailable(offer, wallet, passId)) return { status: 'unavailable' };
  if (!wallet.spendGems(offer.gems)) return { status: 'gems' };
  if (offer.kind === 'chest') return { status: 'ok', reward: { ...grant({ chest: offer.chest }, wallet, stats, rng), items: null } };
  const items = offer.items.map((i) => itemById(i));
  for (const it of items) wallet.grant(it.id);
  return { status: 'ok', reward: { coins: 0, gems: 0, item: null, items, chest: null } };
}
