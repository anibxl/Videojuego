// Identité sonore de Hoop Bounce : la « voix » de l'interface, partagée par le menu, la boutique
// et les écrans du jeu (victoire, échec, pause). Tout est synthétisé (Web Audio) : aucun fichier.
//
// Trois règles donnent au jeu une signature reconnaissable :
//  1. Un timbre : le « pop » du ballon — un sinus qui grimpe très vite (le cuir qui claque), une
//     octave au triangle et un souffle bref. Tous les boutons, onglets et choix le partagent.
//  2. Une gamme : do majeur pentatonique (do, ré, mi, sol, la). Aucune fausse note possible, et
//     les sons s'enchaînent toujours bien entre eux et avec la musique du menu.
//  3. Un motif : le **motif du rebond** — quelques notes qui montent sur le rythme d'un ballon qui
//     rebondit (les intervalles de temps raccourcissent : pom… pom.. pom. pom-pom). On l'entend à
//     l'achat, au déblocage, à la victoire et dans la musique du menu.
//
// Chaque son passe dans une petite réverbération (espace, rondeur) et un compresseur commun.

/** Do majeur pentatonique, en Hz (do4 → la6). */
export const PENTA = [261.63, 293.66, 329.63, 392, 440, 523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.51, 1567.98, 1760];

/** Le motif du rebond : instants (s) qui raccourcissent comme les rebonds d'un ballon, et notes. */
export const BOUNCE_MOTIF = {
  times: [0, 0.2, 0.34, 0.44, 0.51],
  notes: [5, 7, 8, 10, 12], // indices dans PENTA : do5 mi5 sol5 do6 mi6
};

export class UiVoice {
  /**
   * @param {AudioContext} ctx
   * @param {AudioNode} dest  sortie (bus des effets)
   * @param {AudioBuffer} noise  bruit blanc partagé
   */
  constructor(ctx, dest, noise) {
    this.ctx = ctx;
    this.dest = dest;
    this.noise = noise;
    this._last = new Map();
    // Petite réverbération de « salle » : donne de la rondeur sans traîner
    this.verb = ctx.createConvolver();
    this.verb.buffer = makeImpulse(ctx, 0.9, 3.2);
    const wet = ctx.createGain();
    wet.gain.value = 0.32;
    this.verb.connect(wet).connect(dest);
  }

  _gap(tag, s) {
    const now = this.ctx.currentTime;
    if (now - (this._last.get(tag) ?? -1) < s) return false;
    this._last.set(tag, now);
    return true;
  }

  /** Note simple avec enveloppe percussive ; `send` = part envoyée dans la réverbération. */
  note(f, dur, gain, { type = 'sine', delay = 0, glide = 0, send = 0.4, attack = 0.005 } = {}) {
    const c = this.ctx;
    const t = c.currentTime + delay;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(glide ? f * glide : f, t);
    if (glide) o.frequency.exponentialRampToValueAtTime(f, t + Math.min(0.05, dur * 0.4));
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.dest);
    if (send > 0) {
      const s = c.createGain();
      s.gain.value = send;
      g.connect(s).connect(this.verb);
    }
    o.start(t);
    o.stop(t + dur + 0.03);
  }

  /** Souffle filtré qui glisse (ouverture, éclat, vent d'une page). */
  air(dur, gain, from, to, { q = 1, delay = 0, type = 'bandpass', send = 0.3 } = {}) {
    const c = this.ctx;
    const t = c.currentTime + delay;
    const s = c.createBufferSource();
    s.buffer = this.noise;
    const f = c.createBiquadFilter();
    f.type = type;
    f.Q.value = q;
    f.frequency.setValueAtTime(from, t);
    f.frequency.exponentialRampToValueAtTime(to, t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + dur * 0.3);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(this.dest);
    if (send > 0) {
      const sg = c.createGain();
      sg.gain.value = send;
      g.connect(sg).connect(this.verb);
    }
    s.start(t, Math.random() * 0.5);
    s.stop(t + dur + 0.03);
  }

  /** Le « pop » du ballon, base de tous les boutons : f = hauteur de la note. */
  pop(f, gain = 0.14, delay = 0) {
    this.note(f, 0.09, gain, { glide: 0.62, delay, send: 0.15 });
    this.note(f * 2, 0.04, gain * 0.18, { type: 'triangle', delay, send: 0 });
    this.air(0.025, gain * 0.25, 2600, 1800, { q: 0.8, delay, send: 0 });
  }

  /** Le motif du rebond, joué avec un timbre donné (`bell`, `pop`, `pluck`) et une transposition. */
  motif({ voice = 'bell', gain = 0.07, shift = 0, delay = 0, count = 5 } = {}) {
    const { times, notes } = BOUNCE_MOTIF;
    for (let i = 0; i < Math.min(count, notes.length); i++) {
      const f = PENTA[Math.max(0, Math.min(PENTA.length - 1, notes[i] + shift))];
      const d = delay + times[i];
      const last = i === count - 1;
      if (voice === 'pop') this.pop(f, gain * 1.6, d);
      else if (voice === 'pluck') this.note(f, last ? 0.7 : 0.25, gain, { type: 'triangle', delay: d, send: 0.5 });
      else {
        this.note(f, last ? 1.1 : 0.4, gain, { delay: d, send: 0.6 });
        this.note(f * 2.01, last ? 0.5 : 0.18, gain * 0.25, { delay: d, send: 0.6 });
      }
    }
  }

  // ─── Navigation ──────────────────────────────────────────────────────────

  /** Toucher un bouton. */
  tap() {
    if (!this._gap('tap', 0.035)) return;
    this.pop(PENTA[7] * (0.98 + Math.random() * 0.04));
  }

  /** Ouvrir une page : souffle qui monte et deux notes qui s'ouvrent (sol → do). */
  open() {
    this.air(0.3, 0.05, 420, 2800, { q: 0.9 });
    this.pop(PENTA[8], 0.1, 0.03);
    this.note(PENTA[10], 0.3, 0.045, { delay: 0.09, send: 0.6 });
  }

  /** Revenir : la même chose, en descendant. */
  back() {
    this.air(0.24, 0.045, 2400, 480, { q: 0.9 });
    this.pop(PENTA[8], 0.1);
    this.note(PENTA[5], 0.22, 0.04, { delay: 0.07, send: 0.5 });
  }

  /** Changement de sélection (onglet, article, niveau, option) : petit « tic » boisé et clair. */
  select(index = 0) {
    if (!this._gap('select', 0.03)) return;
    const f = PENTA[8 + (Math.abs(index) % 4)];
    this.note(f, 0.06, 0.09, { type: 'triangle', glide: 0.8, send: 0.2 });
    this.air(0.02, 0.04, 5200, 4000, { q: 1.2, send: 0 });
  }

  /** Onglet : comme une sélection, avec un léger glissé. */
  tab(index = 0) {
    if (!this._gap('tab', 0.03)) return;
    this.air(0.1, 0.03, 1200, 3200, { q: 1.4, send: 0 });
    this.pop(PENTA[9 + (Math.abs(index) % 3)], 0.1);
  }

  toggle(on) {
    this.pop(on ? PENTA[10] : PENTA[6], 0.12);
    if (on) this.note(PENTA[12], 0.12, 0.03, { delay: 0.05, send: 0.4 });
  }

  /** Curseur : la hauteur suit la valeur (0..1). */
  tick(value) {
    if (!this._gap('tick', 0.045)) return;
    const i = Math.round(value * 9);
    this.note(PENTA[4 + i], 0.035, 0.06, { type: 'triangle', send: 0 });
  }

  /** Élément verrouillé / refusé : deux notes sourdes, jamais agressives. */
  locked() {
    this.note(220, 0.12, 0.13, { type: 'triangle', glide: 1.3, send: 0.1 });
    this.note(196, 0.12, 0.08, { type: 'triangle', delay: 0.08, send: 0.1 });
  }

  // ─── Boutique et collection ──────────────────────────────────────────────

  /** Équiper un objet : « clac » de mise en place + carillon. */
  equip() {
    this.note(140, 0.1, 0.18, { glide: 2, send: 0 });
    this.air(0.04, 0.08, 3000, 1500, { q: 1, send: 0 });
    [10, 12, 13].forEach((n, i) => this.note(PENTA[n], 0.35, 0.05, { type: 'triangle', delay: 0.05 + i * 0.05, send: 0.6 }));
  }

  /**
   * Achat : caisse (pièces), puis le motif du rebond. Plus la rareté est haute, plus c'est grand :
   * épique = octave et nappe ; légendaire = chœur de cloches, sous-basse et étincelles.
   */
  buy(rarity = 'common') {
    const order = { common: 0, rare: 1, epic: 2, legendary: 3 }[rarity] ?? 0;
    // Pièces versées
    for (let i = 0; i < 5 + order * 2; i++) this.note(2100 + ((i * 433) % 1100), 0.08, 0.035, { delay: i * 0.035, send: 0.2 });
    this.note(98, 0.35, 0.2 + order * 0.04, { glide: 1.6, delay: 0.18, send: 0.2 });
    this.motif({ voice: order >= 2 ? 'bell' : 'pluck', gain: 0.06 + order * 0.01, delay: 0.2 });
    if (order >= 1) this.air(0.7, 0.05, 600, 7000, { q: 0.7, delay: 0.2 });
    if (order >= 2) {
      this.motif({ voice: 'bell', gain: 0.035, shift: 5, delay: 0.24 });
      for (const n of [5, 7, 8]) this.note(PENTA[n], 1.6, 0.025, { type: 'sawtooth', delay: 0.72, send: 0.9, attack: 0.25 });
    }
    if (order >= 3) {
      this.note(55, 1.6, 0.22, { delay: 0.7, send: 0.3, attack: 0.02 });
      for (let i = 0; i < 12; i++) this.note(PENTA[9 + (i % 6)] * 2, 0.25, 0.02, { delay: 0.8 + i * 0.06, send: 0.8 });
    }
  }

  /** Pas assez de pièces. */
  denied() {
    this.locked();
    this.air(0.12, 0.04, 700, 300, { q: 1.5, send: 0 });
  }

  // ─── Récompenses ─────────────────────────────────────────────────────────

  /** Une pièce comptée (compteurs qui défilent) : la hauteur monte un peu à chaque pièce. */
  coin(i = 0) {
    if (!this._gap('coin', 0.03)) return;
    const f = 1800 + (i % 8) * 90;
    this.note(f, 0.07, 0.05, { send: 0.15 });
    this.note(f * 1.5, 0.09, 0.025, { delay: 0.025, send: 0.25 });
  }

  /** Pluie de pièces. */
  coins() {
    for (let i = 0; i < 10; i++) this.coin(i), this.note(1900 + ((i * 377) % 900), 0.08, 0.035, { delay: 0.08 + i * 0.065, send: 0.25 });
  }

  /** Récompense ouverte : éclat de lumière + motif du rebond en cloches. */
  reward() {
    this.air(0.7, 0.07, 500, 7000, { q: 0.8 });
    this.note(130.81, 0.6, 0.14, { glide: 1.5, send: 0.3 });
    this.motif({ voice: 'bell', gain: 0.07 });
    this.note(PENTA[14], 0.8, 0.02, { delay: 0.55, send: 0.8 });
  }

  /** Hoop Pass : niveau gagné (la note monte avec le niveau, cloches et souffle lumineux). */
  passLevel(level = 1) {
    const shift = Math.min(6, Math.floor(level / 8));
    this.air(0.9, 0.06, 700, 9000, { q: 0.7 });
    this.motif({ voice: 'bell', gain: 0.075, shift });
    this.motif({ voice: 'pluck', gain: 0.035, shift: shift - 5, delay: 0.03 });
    this.note(PENTA[Math.min(PENTA.length - 1, 12 + shift)], 1.1, 0.03, { delay: 0.5, send: 0.9 });
  }

  /** Hoop Pass : la barre d'XP se remplit (petit grain ascendant). */
  passFill(t = 0) {
    this.note(520 + t * 900, 0.05, 0.018, { type: 'triangle', send: 0.2 });
  }

  /** Hoop Pass Premium débloqué : grand accord doré. */
  passPremium() {
    this.air(1.4, 0.08, 300, 8000, { q: 0.6 });
    this.note(130.81, 1.2, 0.12, { glide: 1.5, send: 0.4 });
    this.motif({ voice: 'bell', gain: 0.08 });
    this.motif({ voice: 'bell', gain: 0.05, shift: 5, delay: 0.25, count: 5 });
    this.note(PENTA[14], 1.4, 0.03, { delay: 0.8, send: 0.9 });
  }

  /** Mission terminée / succès débloqué : motif court et lumineux. */
  mission() {
    this.motif({ voice: 'pluck', gain: 0.07, shift: 2, count: 4 });
    this.note(PENTA[14], 0.4, 0.025, { delay: 0.45, send: 0.7 });
  }

  /** Monde débloqué : motif du rebond en entier, deux octaves, grand souffle. */
  unlockWorld() {
    this.air(1, 0.07, 400, 6000, { q: 0.8 });
    this.motif({ voice: 'bell', gain: 0.07 });
    this.motif({ voice: 'pluck', gain: 0.04, shift: -5, delay: 0.02 });
  }

  /** Coffre : il tombe, rebondit (choc sourd) puis grince en tremblant. */
  chest() {
    this.note(140, 0.25, 0.22, { glide: 2, delay: 0.35, send: 0.2 });
    this.note(120, 0.18, 0.1, { glide: 2, delay: 0.55, send: 0.2 });
    this.air(0.18, 0.05, 900, 400, { q: 1.2, delay: 0.35 });
    for (let i = 0; i < 4; i++) this.note(260 + i * 30, 0.06, 0.05, { type: 'triangle', delay: 0.7 + i * 0.1, send: 0.2 });
  }

  /** Roue : élan au départ. */
  spin() {
    this.air(0.7, 0.07, 300, 2400, { q: 1 });
    this.note(220, 0.4, 0.05, { type: 'triangle', glide: 0.5 });
  }

  /** Roue : clic quand le pointeur passe une case (plus grave quand elle ralentit). */
  wheelTick(speed = 1) {
    const f = 900 + Math.min(1, speed) * 700;
    this.note(f, 0.035, 0.06, { type: 'square', glide: 1.4, send: 0.05 });
  }

  /** Coffre amélioré : roulement qui monte puis éclat. */
  surprise() {
    for (let i = 0; i < 10; i++) this.note(PENTA[i % PENTA.length], 0.06, 0.04, { type: 'triangle', delay: i * 0.05, send: 0.3 });
    this.air(0.5, 0.06, 800, 5000, { q: 0.9, delay: 0.45 });
  }

  /** JOUER : grand souffle, basse, et le motif du rebond. */
  play() {
    this.air(0.8, 0.09, 300, 4500, { q: 0.8 });
    this.note(130.81, 0.6, 0.18, { glide: 1.4, send: 0.3 });
    this.motif({ voice: 'pop', gain: 0.06 });
  }

  /** Bonus (pièces doublées, reprise) : cascade de pièces et accord brillant. */
  bonus() {
    for (let i = 0; i < 8; i++) this.note(1500 + i * 160, 0.09, 0.06, { glide: 0.8, delay: i * 0.05, send: 0.3 });
    [5, 7, 8, 10].forEach((n, i) => this.note(PENTA[n], 0.5, 0.08, { type: 'triangle', delay: 0.18 + i * 0.05, send: 0.6 }));
    this.air(0.35, 0.1, 5000, 9000, { type: 'highpass', delay: 0.15 });
  }
}

/** Réponse impulsionnelle synthétique (bruit stéréo qui décroît) : réverbération sans fichier. */
export function makeImpulse(ctx, seconds, decay, { tone = 1 } = {}) {
  const rate = ctx.sampleRate;
  const len = Math.max(1, Math.floor(rate * seconds));
  const b = ctx.createBuffer(2, len, rate);
  for (let ch = 0; ch < 2; ch++) {
    const d = b.getChannelData(ch);
    let lp = 0;
    for (let i = 0; i < len; i++) {
      // Un léger filtre passe-bas (tone < 1) rend la queue plus douce et plus « chaude »
      const n = Math.random() * 2 - 1;
      lp += (n - lp) * tone;
      d[i] = lp * Math.pow(1 - i / len, decay);
    }
  }
  return b;
}
