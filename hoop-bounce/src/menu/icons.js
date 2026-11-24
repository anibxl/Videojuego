// Icônes du menu : SVG dessinés à la main, trait arrondi homogène (24 × 24, trait 1,9).
// Aucune image ni police d'icônes à charger.

const svg = (body, { fill = false, stroke = 1.9 } = {}) =>
  `<svg viewBox="0 0 24 24" aria-hidden="true" fill="${fill ? 'currentColor' : 'none'}" stroke="${fill ? 'none' : 'currentColor'}" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;

/** Roue dentée calculée (8 dents) : plus régulière qu'un tracé approximatif. */
function gearPath() {
  const teeth = 8;
  const rOut = 9.2;
  const rIn = 7.1;
  let d = '';
  for (let i = 0; i < teeth; i++) {
    const a = (i / teeth) * Math.PI * 2;
    const w = (Math.PI * 2) / teeth;
    const pts = [
      [a - w * 0.5, rIn],
      [a - w * 0.22, rIn],
      [a - w * 0.14, rOut],
      [a + w * 0.14, rOut],
      [a + w * 0.22, rIn],
    ];
    for (const [ang, r] of pts) {
      const x = (12 + Math.cos(ang) * r).toFixed(2);
      const y = (12 + Math.sin(ang) * r).toFixed(2);
      d += `${d ? 'L' : 'M'}${x} ${y}`;
    }
  }
  return `${d}Z`;
}

export const ICONS = {
  // ── Icônes de contenu (missions, succès, mondes, modes, sources d'XP) : même trait, même grille ──
  ball: svg('<circle cx="12" cy="12" r="8.6"/><path d="M12 3.4v17.2M3.4 12h17.2"/><path d="M6.4 5.7c2.2 1.8 3.3 3.9 3.3 6.3s-1.1 4.5-3.3 6.3M17.6 5.7c-2.2 1.8-3.3 3.9-3.3 6.3s1.1 4.5 3.3 6.3"/>'),
  flag: svg('<path d="M5.5 21V4"/><path d="M5.5 4.5h11l-2.2 3.8 2.2 3.7h-11"/>'),
  hoop: svg('<path d="M12 4v4.5"/><path d="M4.5 8.5h15"/><path d="M6.2 8.5l1.5 10h8.6l1.5-10"/><path d="M9.2 8.5l.9 10M14.8 8.5l-.9 10M7 13.2h10"/>'),
  star: svg('<path d="M12 3.6l2.5 5.3 5.8.7-4.3 4 1.1 5.7L12 16.5l-5.1 2.8 1.1-5.7-4.3-4 5.8-.7z"/>'),
  clock: svg('<circle cx="12" cy="13" r="7.8"/><path d="M12 9v4.3l2.8 1.7M9.5 2.8h5"/>'),
  burst: svg('<path d="M12 3v3.8M12 17.2V21M3 12h3.8M17.2 12H21M5.6 5.6l2.7 2.7M15.7 15.7l2.7 2.7M18.4 5.6l-2.7 2.7M8.3 15.7l-2.7 2.7"/><circle cx="12" cy="12" r="2.3"/>'),
  city: svg('<path d="M3.5 20.5h17"/><path d="M5 20.5v-11h5v11M10 20.5V5h5.5v15.5M15.5 20.5V11H19v9.5"/><path d="M7 12.5h1M7 15.5h1M12.3 8h1M12.3 11h1M12.3 14h1M17 14h.5"/>'),
  snow: svg('<path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9"/><path d="M9.6 4.6 12 7l2.4-2.4M9.6 19.4 12 17l2.4 2.4M4.5 10.6l3.3-.9-.9-3.3M19.5 13.4l-3.3.9.9 3.3M4.5 13.4l3.3.9-.9 3.3M19.5 10.6l-3.3-.9.9-3.3"/>', { stroke: 1.7 }),
  volcano: svg('<path d="M3 20.5h18l-5.5-10h-7z"/><path d="M8.5 10.5l1.8 2.4 1.7-1.4 1.7 1.4 1.8-2.4"/><path d="M10 6.6c.4-1.6 1.6-2.6 3-2.6M14.6 7.2c.8-1 1.9-1.5 3-1.3"/>'),
  forest: svg('<path d="M12 3l5 6.4h-2.6L18 14h-3l3.5 4.5h-13L9 14H6l3.6-4.6H7z"/><path d="M12 18.5v3"/>'),
  space: svg('<circle cx="12" cy="12" r="5.6"/><path d="M5.2 14.6c-2.6 2-2.4 3.7.6 3.6 2.4-.1 5.6-1.2 8.7-3 3.1-1.8 5.4-3.9 6.3-5.7.9-1.8-.4-2.8-3.3-2.5"/>'),
  skull: svg('<path d="M12 3.5c-4.3 0-7.5 3-7.5 7 0 2.5 1.2 4.3 3 5.3V19a1.5 1.5 0 0 0 1.5 1.5h6a1.5 1.5 0 0 0 1.5-1.5v-3.2c1.8-1 3-2.8 3-5.3 0-4-3.2-7-7.5-7z"/><circle cx="9" cy="11" r="1.5"/><circle cx="15" cy="11" r="1.5"/><path d="M10.5 20.5v-2.4M13.5 20.5v-2.4"/>'),
  chest: svg('<path d="M3.8 11h16.4v8.2a1.3 1.3 0 0 1-1.3 1.3H5.1a1.3 1.3 0 0 1-1.3-1.3z"/><path d="M3.8 11V9a5 5 0 0 1 5-5h6.4a5 5 0 0 1 5 5v2"/><path d="M10.5 11v3.2h3V11"/>'),
  crown: svg('<path d="M3.5 8l4.3 3.6L12 5l4.2 6.6L20.5 8l-1.7 10.5H5.2z"/><path d="M5.2 21h13.6"/>'),
  coinline: svg('<circle cx="12" cy="12" r="8.6"/><circle cx="12" cy="12" r="5.4"/><path d="M12 9.4v5.2"/>'),
  gemline: svg('<path d="M7 4h10l4 5.5-9 11-9-11z"/><path d="M3 9.5h18M9.6 4 8 9.5l4 11 4-11L14.4 4"/>'),
  wave: svg('<path d="M3 15.5c2.2 0 2.2-2 4.5-2s2.3 2 4.5 2 2.2-2 4.5-2 2.3 2 4.5 2"/><path d="M3 19.5c2.2 0 2.2-2 4.5-2s2.3 2 4.5 2 2.2-2 4.5-2 2.3 2 4.5 2"/><path d="M5.5 11c1-3.8 3.9-6.4 7.5-6.4 2.6 0 4.7 1.4 5.4 3.5-1.8-.9-4.4-.4-5.5 1.5"/>'),
  race: svg('<path d="M5 21V4"/><path d="M5 4.5h13.5v8.5H5"/><path d="M9.5 4.5v8.5M14 4.5v8.5M5 8.75h13.5"/>', { stroke: 1.7 }),
  tools: svg('<path d="M14.6 6.4a4.2 4.2 0 0 0 5.1 5.1l-7.6 7.6a2.1 2.1 0 0 1-3-3z"/><path d="M4.5 4.5l4.6 4.6"/><path d="M3.6 6.9 6.9 3.6l2.6 2.6-3.3 3.3z"/>'),
  tv: svg('<rect x="3.5" y="5.5" width="17" height="12.5" rx="2.4"/><path d="M8.5 21h7"/><path d="M10.5 9.4l4.2 2.35-4.2 2.35z"/>'),
  tree: svg('<path d="M12 3l5.2 7h-2.8l3.8 5.5H5.8L9.6 10H6.8z"/><path d="M12 15.5V20M9.5 20.5h5"/>'),
  gem: '<span class="hb-gem fill" aria-hidden="true"></span>',
  play: svg('<path d="M8.5 5.8v12.4a1 1 0 0 0 1.5.86l10.1-6.2a1 1 0 0 0 0-1.72L10 4.94a1 1 0 0 0-1.5.86z"/>', { fill: true }),
  back: svg('<path d="M15 5l-7 7 7 7"/>', { stroke: 2.3 }),
  close: svg('<path d="M6 6l12 12M18 6L6 18"/>', { stroke: 2.2 }),
  chevron: svg('<path d="M9 5l7 7-7 7"/>', { stroke: 2.2 }),
  worlds: svg('<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="3.8" ry="9"/><path d="M3.5 9h17M3.5 15h17"/>'),
  modes: svg('<path d="M7.2 7.5h9.6a4.2 4.2 0 0 1 4.05 3.1l1.05 3.9a2.6 2.6 0 0 1-4.45 2.4L15.6 15H8.4l-1.85 1.9a2.6 2.6 0 0 1-4.45-2.4l1.05-3.9A4.2 4.2 0 0 1 7.2 7.5z"/><path d="M8 10v3M6.5 11.5h3"/><circle cx="16.2" cy="10.6" r=".6" fill="currentColor"/><circle cx="17.8" cy="12.4" r=".6" fill="currentColor"/>'),
  shop: svg('<path d="M5 8h14l-1.1 11.1a1.6 1.6 0 0 1-1.6 1.4H7.7a1.6 1.6 0 0 1-1.6-1.4z"/><path d="M8.8 10.5V7.2a3.2 3.2 0 0 1 6.4 0v3.3"/>'),
  collection: svg('<circle cx="12" cy="12" r="9"/><path d="M12 3v18M3 12h18"/><path d="M5.6 5.6a12 12 0 0 1 0 12.8M18.4 5.6a12 12 0 0 0 0 12.8"/>'),
  settings: svg(`<path d="${gearPath()}"/><circle cx="12" cy="12" r="3"/>`),
  lock: svg('<rect x="5" y="10.5" width="14" height="10" rx="2.6"/><path d="M8.3 10.5V7.6a3.7 3.7 0 0 1 7.4 0v2.9"/><path d="M12 14.5v2.2"/>'),
  // Pièce et gemme : illustrations communes (assets/ui/, css/tokens.css)
  coin: '<span class="hb-coin fill" aria-hidden="true"></span>',
  music: svg('<path d="M9 18V6.2l10-2v11.6"/><circle cx="6.8" cy="18" r="2.4"/><circle cx="16.8" cy="15.8" r="2.4"/>'),
  sound: svg('<path d="M4.5 9.5h3.2L12 5.8v12.4l-4.3-3.7H4.5z"/><path d="M15.6 9a4.2 4.2 0 0 1 0 6M18.3 6.5a7.8 7.8 0 0 1 0 11"/>'),
  vibration: svg('<rect x="8" y="3.8" width="8" height="16.4" rx="2.2"/><path d="M4.5 8.5v7M19.5 8.5v7M2 10.5v3M22 10.5v3"/>'),
  language: svg('<circle cx="12" cy="12" r="9"/><path d="M12 3c2.6 2.4 3.9 5.4 3.9 9s-1.3 6.6-3.9 9c-2.6-2.4-3.9-5.4-3.9-9S9.4 5.4 12 3zM3.3 12h17.4"/>'),
  quality: svg('<path d="M12 3.2l1.9 5 5.2.4-4 3.4 1.3 5.1L12 14.3l-4.4 2.8 1.3-5.1-4-3.4 5.2-.4z"/><path d="M19 17.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z" fill="currentColor"/>'),
  shield: svg('<path d="M12 3l7.5 3v5.6c0 4.4-3.1 8.1-7.5 9.4-4.4-1.3-7.5-5-7.5-9.4V6z"/><path d="M8.8 12.2l2.2 2.2 4.3-4.6"/>'),
  heart: svg('<path d="M12 19.5s-7.5-4.4-7.5-10a4.2 4.2 0 0 1 7.5-2.6 4.2 4.2 0 0 1 7.5 2.6c0 5.6-7.5 10-7.5 10z"/>'),
  sparkle: svg('<path d="M12 3.5c.6 4.1 2.4 5.9 6.5 6.5-4.1.6-5.9 2.4-6.5 6.5-.6-4.1-2.4-5.9-6.5-6.5 4.1-.6 5.9-2.4 6.5-6.5z"/><path d="M18.5 15.5c.3 1.7 1 2.4 2.7 2.7-1.7.3-2.4 1-2.7 2.7-.3-1.7-1-2.4-2.7-2.7 1.7-.3 2.4-1 2.7-2.7z"/>'),
  trail: svg('<circle cx="16.5" cy="9" r="4.2"/><path d="M12.4 10.4L3.5 15M13 12.6l-7.2 6M12 8L5 9.2"/>'),
  // Modes
  // Phase 5 : succès (Fantôme, défis cachés)
  ghost: svg('<path d="M5.5 20.5V11a6.5 6.5 0 0 1 13 0v9.5l-2.2-1.6-2.1 1.6-2.2-1.6-2.2 1.6-2.1-1.6z"/><circle cx="9.6" cy="11.2" r="1.15" fill="currentColor" stroke="none"/><circle cx="14.4" cy="11.2" r="1.15" fill="currentColor" stroke="none"/>'),
  mystery: svg('<path d="M12 2.8l7.8 4.5v9.4L12 21.2l-7.8-4.5V7.3z"/><path d="M9.8 9.7a2.3 2.3 0 1 1 3.4 2c-.8.5-1.2 1-1.2 1.9"/><circle cx="12" cy="16.5" r=".7" fill="currentColor" stroke="none"/>'),
  trickshot: svg('<circle cx="17" cy="7" r="3.2"/><path d="M3.5 19.5c1.6-6.6 5.7-10.5 10.4-11.6"/><path d="M11.5 6.2l2.6 1.7-1.3 2.8"/>'),
  endless: svg('<path d="M12 12c-1.9-2.6-3.4-3.9-5.2-3.9a3.9 3.9 0 0 0 0 7.8c1.8 0 3.3-1.3 5.2-3.9zm0 0c1.9 2.6 3.4 3.9 5.2 3.9a3.9 3.9 0 0 0 0-7.8c-1.8 0-3.3 1.3-5.2 3.9z"/>'),
  daily: svg('<rect x="3.8" y="5.2" width="16.4" height="15.3" rx="2.8"/><path d="M3.8 9.8h16.4M8.2 3.2v4M15.8 3.2v4"/><path d="M12 12.6l.9 1.9 2 .3-1.45 1.4.35 2-1.8-.95-1.8.95.35-2-1.45-1.4 2-.3z" fill="currentColor"/>'),
  multi: svg('<circle cx="8.6" cy="8.6" r="3.2"/><path d="M2.8 19.4a5.8 5.8 0 0 1 11.6 0"/><circle cx="16.8" cy="9.4" r="2.6"/><path d="M15.4 14a5 5 0 0 1 5.8 5.4"/>'),
  gift: svg('<rect x="3.5" y="9" width="17" height="11.5" rx="2"/><path d="M2.8 9h18.4v-3H2.8zM12 6v14.5"/><path d="M12 6c-1.2-2.8-4.6-3.6-5.4-1.6C5.9 6 9.2 6 12 6zm0 0c1.2-2.8 4.6-3.6 5.4-1.6.7 1.6-2.6 1.6-5.4 1.6z"/>'),
  target: svg('<circle cx="12" cy="12" r="8.6"/><circle cx="12" cy="12" r="4.8"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/><path d="M12 12l7-7M16.5 4.2l2.6.3.3 2.6"/>'),
  wheel: svg('<circle cx="12" cy="12.6" r="8.4"/><circle cx="12" cy="12.6" r="1.8" fill="currentColor"/><path d="M12 4.2v6.6M12 14.4V21M3.6 12.6h6.6M13.8 12.6h6.6M6.1 6.7l4.6 4.6M13.3 13.9l4.6 4.6M17.9 6.7l-4.6 4.6M10.7 13.9l-4.6 4.6"/><path d="M10.2 1.8h3.6L12 4.4z" fill="currentColor"/>'),
  trophy: svg('<path d="M7.5 4h9v5.2a4.5 4.5 0 0 1-9 0z"/><path d="M7.5 6H4.2v1.4a3.3 3.3 0 0 0 3.6 3.3M16.5 6h3.3v1.4a3.3 3.3 0 0 1-3.6 3.3M12 13.8v3.4M8.2 20.4h7.6l-.8-3.2H9z"/>'),
  // Page À propos
  info: svg('<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.6v.1"/>', { stroke: 2.1 }),
  code: svg('<path d="M8.5 7.5L4 12l4.5 4.5M15.5 7.5L20 12l-4.5 4.5M13.4 5.5l-2.8 13"/>'),
  palette: svg('<path d="M12 3.6a8.4 8.4 0 0 0 0 16.8c1.2 0 1.9-.8 1.9-1.8 0-1.2-1-1.6-1-2.7 0-1 .8-1.7 1.9-1.7h2a3.6 3.6 0 0 0 3.6-3.7C20.4 6.8 16.6 3.6 12 3.6z"/><circle cx="7.8" cy="11" r="1.2" fill="currentColor"/><circle cx="10.4" cy="7.4" r="1.2" fill="currentColor"/><circle cx="14.8" cy="7.6" r="1.2" fill="currentColor"/>'),
  image: svg('<rect x="3.8" y="5" width="16.4" height="14" rx="2.6"/><circle cx="9" cy="10" r="1.7"/><path d="M4.5 17.5l4.8-4.6 3.4 3.1 2.6-2.4 4.5 4"/>'),
  type: svg('<path d="M5 7V5.2h14V7M12 5.2v13.6M9 18.8h6"/>'),
  chip: svg('<rect x="6.5" y="6.5" width="11" height="11" rx="2"/><rect x="9.6" y="9.6" width="4.8" height="4.8" rx=".8"/><path d="M9.5 3.5v3M14.5 3.5v3M9.5 17.5v3M14.5 17.5v3M3.5 9.5h3M3.5 14.5h3M17.5 9.5h3M17.5 14.5h3"/>'),
  doc: svg('<path d="M7 3.8h6.8L18.5 8.5v11.7H7a1.5 1.5 0 0 1-1.5-1.5V5.3A1.5 1.5 0 0 1 7 3.8z"/><path d="M13.5 4v4.8h4.8M9 12.5h6M9 15.8h6"/>'),
  external: svg('<path d="M14 4.5h5.5V10M19.5 4.5l-8 8M17 13.5v4.6a1.4 1.4 0 0 1-1.4 1.4H5.9a1.4 1.4 0 0 1-1.4-1.4V8.4A1.4 1.4 0 0 1 5.9 7h4.6"/>'),
  map: svg('<path d="M9 4.5L3.5 6.6v13l5.5-2.1 6 2.1 5.5-2.1v-13L15 6.6z"/><path d="M9 4.5v13M15 6.6v13"/>'),
};
