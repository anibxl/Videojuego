// DÉFIS CACHÉS (phase 5) — repérage des exploits pendant une partie.
//
// Lecture seule : le traqueur écoute les événements du jeu et regarde les contacts du ballon après chaque
// pas de simulation ; il ne modifie jamais la partie (ni physique, ni gameplay, ni score). À la victoire,
// il dit quels défis viennent d'être réussis ; src/shared/achievements.js les enregistre.
//
// Mode principal :
//   ch-chain     10 rebonds d'affilée (sans que le ballon se repose au sol ni tombe), puis le panier
//   ch-teleport  panier moins de 15 s après être passé par un téléporteur
//   ch-nowall    niveau terminé sans avoir touché un mur (contact latéral avec le décor fixe)
//   ch-perfect   3 étoiles, un swish et aucune chute
//   ch-photo     fantôme battu de moins d'un dixième de seconde
// Trickshot (voir trickshotChallenges) :
//   ch-lastshot  réussi avec le tout dernier tir
//   ch-firsttry  carte jamais tentée, réussie dès le premier tir
//   ch-billiard  au moins 5 rebonds pendant le tir gagnant

export const CHAIN_TARGET = 10;
export const TELEPORT_WINDOW = 15;
export const PHOTO_MARGIN = 0.1;
export const BILLIARD_BOUNCES = 5;

/** Décor fixe qui compte comme un « mur » (les caisses à pousser, boutons, trampolines et champignons non). */
const WALL_TAGS = new Set(['ground', 'block', 'wall', 'snow', 'ice', 'rock', 'wood', 'branch', 'log', 'mover', 'asteroid', 'faller', 'crumble', 'blinker']);
/** Normale presque horizontale : contact sur le côté (un mur), pas sur le dessus (un sol) ni dessous (un plafond). */
const WALL_NX = 0.7;

export class ChallengeTracker {
  constructor() {
    this.reset();
  }

  /** Début ou recommencement d'un niveau. */
  reset() {
    this.chain = 0;
    this.lastTeleport = -Infinity;
    this.touchedWall = false;
  }

  onBounce() {
    this.chain++;
  }

  /** Le ballon s'est reposé au sol (la puissance redescend) : la série de rebonds s'arrête. */
  onRest() {
    this.chain = 0;
  }

  onDeath() {
    this.chain = 0;
  }

  onTeleport(time) {
    this.lastTeleport = time;
  }

  /** Après chaque pas de simulation : le ballon touche-t-il un mur ? */
  scanContacts(body) {
    if (this.touchedWall || !body) return;
    for (let i = 0; i < body.contactCount; i++) {
      const c = body.contacts[i];
      if (Math.abs(c.nx) > WALL_NX && WALL_TAGS.has(c.collider?.tag)) {
        this.touchedWall = true;
        return;
      }
    }
  }

  /**
   * Victoire : défis réussis.
   * @param {{ time:number, stars:number, totalStars:number, deaths:number, swish:boolean,
   *           ghostBefore?:number|null, ghostAfter?:number|null }} r
   *        ghostBefore / ghostAfter : temps du fantôme battu et nouveau temps (si le fantôme a été battu)
   * @returns {string[]}
   */
  onWin(r) {
    const out = [];
    if (this.chain >= CHAIN_TARGET) out.push('ch-chain');
    if (r.time - this.lastTeleport < TELEPORT_WINDOW) out.push('ch-teleport');
    if (!this.touchedWall) out.push('ch-nowall');
    if (r.stars >= 3 && r.stars >= (r.totalStars ?? 3) && r.swish && r.deaths === 0) out.push('ch-perfect');
    if (r.ghostBefore != null && r.ghostAfter != null && r.ghostAfter < r.ghostBefore && r.ghostBefore - r.ghostAfter < PHOTO_MARGIN) out.push('ch-photo');
    return out;
  }
}

/**
 * Défis d'un Trickshot réussi.
 * @param {{ shots:number, bounces:number }} result  résultat du tir gagnant (TrickshotGame.result)
 * @param {{ maxShots:number, playsBefore:number, wasDone:boolean }} ctx
 */
export function trickshotChallenges(result, { maxShots, playsBefore, wasDone }) {
  const out = [];
  if (maxShots > 1 && result.shots >= maxShots) out.push('ch-lastshot');
  if (result.shots === 1 && playsBefore === 0 && !wasDone) out.push('ch-firsttry');
  if ((result.bounces ?? 0) >= BILLIARD_BOUNCES) out.push('ch-billiard');
  return out;
}
