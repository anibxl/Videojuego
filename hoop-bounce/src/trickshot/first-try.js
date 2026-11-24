// Défi « Premier essai » du mode TRICKSHOT (3e étoile).
//
// Règle : le joueur obtient « Premier essai » s'il réussit la carte du premier tir, SANS avoir utilisé le bouton
// ↺ Recommencer et sans essai précédent depuis son entrée dans la carte. Concrètement :
//  - entrer dans une carte (depuis le menu, « Carte suivante », ou en rouvrant le jeu) ouvre une tentative où le
//    défi est disponible… sauf si une tentative entamée sur cette carte avait été abandonnée en cours de route
//    (le joueur a tiré puis quitté) : on la reprend, défi perdu ;
//  - utiliser ↺ (bouton, pause, touche R, « Rejouer », « Réessayer ») perd le défi jusqu'à la prochaine entrée ;
//  - une tentative se termine par une victoire ou par 3 essais ratés : la prochaine entrée est neuve.
// Les étoiles déjà gagnées ne sont jamais retirées (TrickshotProgress garde le meilleur résultat).

export class FirstTryRule {
  /** @param {{attemptOpen(n:number):boolean, openAttempt(n:number):void, closeAttempt(n:number):void}} progress */
  constructor(progress) {
    this.progress = progress;
    this.level = 0;
    this.allowed = true;
  }

  /** Nouvelle entrée dans la carte n. @returns {boolean} défi disponible */
  enter(n) {
    this.level = n;
    this.allowed = !this.progress.attemptOpen(n);
    return this.allowed;
  }

  /** Le joueur utilise ↺ : défi perdu pour la tentative en cours. @returns {boolean} il était encore disponible */
  restart() {
    const was = this.allowed;
    this.allowed = false;
    return was;
  }

  /** Un tir est lancé : la tentative est entamée (elle reste ouverte si le joueur quitte). */
  shot() {
    this.progress.openAttempt(this.level);
  }

  /** Victoire ou 3 essais ratés : la tentative est terminée. */
  end() {
    this.progress.closeAttempt(this.level);
  }

  /** À appliquer à chaque nouvelle partie (TrickshotGame). */
  apply(game) {
    game.firstTryAllowed = this.allowed;
    return game;
  }
}
