// Achats du jeu (phase 4) — une seule porte d'entrée pour débloquer le Premium du Hoop Pass.
//
// VERSION DE TEST : le Premium se paie en 💎 gemmes (prix de la saison, `season.premium.gems`).
// PLUS TARD : achat intégré Google Play Billing (et App Store sur iPhone). Il suffira de :
//   1. créer le produit dans la Play Console (identifiant `season.premium.productId`) ;
//   2. brancher un fournisseur natif (plugin Capacitor de paiement) dans `PlayBillingProvider` ;
//   3. passer `BILLING.mode` à 'store'.
// Le reste du jeu (page du Pass, sauvegarde `pass.data.premium`) ne change pas : le fournisseur appelle
// seulement `pass.grantPremium()` une fois l'achat validé.
// Aucun paiement réel n'est implémenté ni appelé dans cette version.

export const BILLING = Object.freeze({
  /** 'gems' : Premium payé en gemmes (version de test) · 'store' : achat intégré (pas encore branché). */
  mode: 'gems',
});

/**
 * Fournisseur d'achats intégrés (Google Play Billing / App Store) — pas encore branché.
 * Il devra : charger le prix localisé du produit, lancer l'achat, valider le reçu, puis appeler `onGranted`.
 */
export class PlayBillingProvider {
  get available() {
    return false;
  }

  async price() {
    return null;
  }

  async purchase() {
    return { status: 'unavailable' };
  }
}

/** Comment le Premium s'obtient dans cette version (pour l'affichage). */
export function premiumOffer(season, mode = BILLING.mode) {
  if (mode === 'store') return { kind: 'store', productId: season.premium.productId ?? null };
  return { kind: 'gems', gems: season.premium.gems };
}

/**
 * Débloque le Premium du Pass selon le mode d'achat.
 * @returns {'ok'|'owned'|'gems'|'over'|'unavailable'}
 */
export function purchasePremium(pass, wallet, mode = BILLING.mode) {
  if (mode === 'store') return 'unavailable'; // achat intégré : à brancher (voir en haut du fichier)
  return pass.unlockPremium(wallet);
}
