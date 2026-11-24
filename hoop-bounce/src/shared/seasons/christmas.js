// Configuration de la SAISON 1 — 🎄 NOËL — et de son Hoop Pass.
//
// Tout ce qui fait une saison est ici, en données : thème, textes, couleurs, dates, barème d'XP, prix du
// Premium, 50 niveaux et leurs récompenses (ligne gratuite et ligne Premium), objets exclusifs.
// Pour créer une nouvelle saison (Halloween, Été, Espace, Volcan…) : copier ce fichier, changer les
// valeurs, l'ajouter au registre (./index.js) et passer SEASON à son `id` (../season.js). Le système
// (src/shared/pass.js, page du menu) ne change pas.
//
// Récompenses (voir src/shared/rewards.js) : { coins }, { gems }, { chest: 'common'|'rare'|'epic'|'premium'|'legendary' },
// { item: 'id' } (objet précis), éventuellement combinées.

const T = (fr, en, es) => ({ fr, en, es });

/** Construit les 50 niveaux : valeurs par défaut + niveaux marquants écrits à la main. */
function buildLevels() {
  const FREE = {
    3: { chest: 'common' },
    9: { chest: 'common' },
    15: { chest: 'rare' },
    25: { item: 'bounce-snow' },
    27: { chest: 'rare' },
    39: { chest: 'epic' },
    45: { chest: 'epic' },
    50: { gems: 40 },
  };
  // Phase 4 (économie) : moins de gemmes, mieux réparties (160 sur la ligne gratuite)
  const FREE_GEMS = { 8: 15, 16: 15, 24: 20, 32: 20, 40: 25, 48: 25 };
  const PREMIUM = {
    1: { gems: 30 },
    3: { chest: 'rare' },
    5: { item: 'trail-xmas' },
    10: { item: 'ball-xmas' },
    13: { chest: 'epic' },
    15: { coins: 2000 },
    20: { item: 'goal-xmas' },
    23: { chest: 'epic' },
    25: { coins: 3000 },
    30: { item: 'ball-santa' },
    33: { chest: 'premium' },
    35: { coins: 4000 },
    40: { chest: 'legendary' },
    43: { chest: 'premium' },
    45: { chest: 'premium' },
    12: { gems: 20 },
    24: { gems: 25 },
    36: { gems: 25 },
    48: { gems: 60 },
    50: { item: 'ball-polaris' },
  };
  return Array.from({ length: 50 }, (_, i) => {
    const n = i + 1;
    const free = FREE[n] ?? (FREE_GEMS[n] ? { gems: FREE_GEMS[n] } : { coins: Math.round((150 + 10 * n) / 10) * 10 });
    // Ligne Premium : des pièces par défaut (≈ 160 gemmes au total, aux niveaux 1, 12, 24, 36 et 48)
    const premium = PREMIUM[n] ?? { coins: Math.round((300 + 15 * n) / 10) * 10 };
    return { level: n, free, premium, highlight: [5, 10, 20, 30, 40, 50].includes(n) };
  });
}

export default Object.freeze({
  id: 'christmas', // thème (décor du menu, styles) — SEASON dans ../season.js
  passId: 'christmas-1', // identifiant du Hoop Pass (sauvegarde, objets exclusifs `season`)
  number: 1,
  emoji: '🎄',
  name: T('Noël', 'Christmas', 'Navidad'),
  tagline: T('Un hiver de trickshots sous la neige.', 'A winter of trickshots in the snow.', 'Un invierno de trickshots bajo la nieve.'),
  // Dates (heure de l'appareil) : le Pass se termine le 7 janvier à minuit
  start: '2026-11-23T00:00:00',
  end: '2027-01-07T00:00:00',
  // Palette : bleu nuit, blanc, rouge foncé, doré, touches de vert sapin
  palette: Object.freeze({ night: '#0b1430', night2: '#14214a', snow: '#f4f7ff', red: '#a3162a', red2: '#d42a3a', gold: '#ffd36b', fir: '#1f5b3a', fir2: '#2f8a48' }),
  // XP de Pass gagnée par action (première fois / fois suivantes)
  // Phase 4 : XP ajustée pour qu'un joueur actif termine le Pass en ≈ 5 semaines (la saison en dure 6)
  xp: Object.freeze({ level: 50, levelReplay: 10, trickshot: 60, trickshotReplay: 15, mission: 60, achievement: 100 }),
  maxLevel: 50,
  /** XP nécessaire pour passer au niveau n (n ≥ 2) : 208, 212… 400 → 14 896 XP pour tout le Pass. */
  levelXp: (n) => 200 + 4 * n,
  // Premium : payé en gemmes dans la version de test ; `productId` = futur produit Google Play Billing
  // (voir src/shared/billing.js — aucun paiement réel n'est branché)
  premium: Object.freeze({ gems: 250, productId: 'hoop_pass_christmas_1' }),
  // Cadeau de bienvenue à la première ouverture du Pass
  welcomeGift: Object.freeze({ gems: 50 }),
  // Objets exclusifs : obtenables uniquement pendant cette saison, via ce Pass
  exclusives: Object.freeze(['trail-xmas', 'ball-xmas', 'goal-xmas', 'bounce-snow', 'ball-santa', 'ball-polaris']),
  levels: Object.freeze(buildLevels()),
});
