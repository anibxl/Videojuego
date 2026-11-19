// ════════════════════════════════════════════════════════════════════════════
//  PAGE « À PROPOS » — informations, crédits et liens. Le seul fichier à modifier pour les compléter.
// ════════════════════════════════════════════════════════════════════════════
//
// Ajouter un crédit : copier un bloc de CREDITS et l'adapter. L'ordre du tableau est l'ordre affiché.
//   { id: 'unique', icon: 'music', role: T('…', '…', '…'), names: ['Nom', 'Autre nom'], note: T('…', '…', '…') }
//   - icon : une icône de src/menu/icons.js (code, palette, music, sound, image, type, chip, heart…) ;
//   - names : une ou plusieurs personnes / ressources (texte libre, non traduit) ;
//   - note (facultatif) : précision, licence…
//
// Relier un lien : mettre l'adresse dans LINKS (https://…). Sans adresse :
//   - politique de confidentialité → la version intégrée au jeu s'ouvre ;
//   - conditions d'utilisation → le bouton affiche « Bientôt ».

import { APP_VERSION } from './version.js';

const T = (fr, en, es) => ({ fr, en, es });

export const ABOUT = {
  game: 'Hoop Bounce',
  creator: 'EchoSpeed',
  /** Première année de publication : « © 2026 », puis « © 2026–2027 »… */
  since: 2026,
  version: APP_VERSION,
};

export const LINKS = {
  /** Politique de confidentialité en ligne (store/privacy-policy.html une fois hébergée). */
  privacy: null,
  /** Conditions d'utilisation (facultatives). */
  terms: null,
};

export const CREDITS = [
  {
    id: 'development',
    icon: 'code',
    role: T('Développement', 'Development', 'Desarrollo'),
    names: ['EchoSpeed'],
    note: T('Moteur physique, niveaux et code du jeu', 'Physics engine, levels and game code', 'Motor físico, niveles y código del juego'),
  },
  {
    id: 'design',
    icon: 'palette',
    role: T('Design', 'Design', 'Diseño'),
    names: ['EchoSpeed'],
    note: T('Game design, interface et identité visuelle', 'Game design, interface and visual identity', 'Diseño de juego, interfaz e identidad visual'),
  },
  {
    id: 'music',
    icon: 'music',
    role: T('Musiques', 'Music', 'Música'),
    names: ['EchoSpeed'],
    note: T('Compositions originales, jouées en temps réel', 'Original compositions, played in real time', 'Composiciones originales, tocadas en tiempo real'),
  },
  {
    id: 'sfx',
    icon: 'sound',
    role: T('Effets sonores', 'Sound effects', 'Efectos de sonido'),
    names: ['EchoSpeed'],
    note: T('Synthétisés en temps réel, aucun fichier audio', 'Synthesized in real time, no audio files', 'Sintetizados en tiempo real, sin archivos de audio'),
  },
  {
    id: 'graphics',
    icon: 'image',
    role: T('Graphismes', 'Graphics', 'Gráficos'),
    names: ['EchoSpeed'],
    note: T('Décors, ballons et effets dessinés par le code', 'Scenery, balls and effects drawn in code', 'Escenarios, balones y efectos dibujados con código'),
  },
  {
    id: 'fonts',
    icon: 'type',
    role: T('Polices', 'Fonts', 'Tipografías'),
    names: ['Unbounded — The Unbounded Project Authors', 'Outfit — The Outfit Project Authors'],
    note: T('SIL Open Font License 1.1', 'SIL Open Font License 1.1', 'SIL Open Font License 1.1'),
  },
  {
    id: 'tech',
    icon: 'chip',
    role: T('Technologies', 'Technology', 'Tecnología'),
    names: ['Capacitor', 'Google Mobile Ads (AdMob)'],
  },
];

/** « © 2026 EchoSpeed » (ou « © 2026–2027 » les années suivantes). */
export function copyrightYears(now = new Date()) {
  const y = now.getFullYear();
  return y > ABOUT.since ? `${ABOUT.since}–${y}` : String(ABOUT.since);
}

/** Texte d'une valeur traduite (repli sur le français). */
export const pick = (v, lang) => (typeof v === 'string' ? v : v?.[lang] ?? v?.fr ?? '');
