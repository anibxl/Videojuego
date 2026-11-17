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
  coin: svg('<circle cx="12" cy="12" r="9.5" fill="currentColor"/><circle cx="12" cy="12" r="6.2" fill="none" stroke="rgba(120,70,0,.35)" stroke-width="1.6"/><circle cx="12" cy="12" r="2.2" fill="rgba(120,70,0,.3)"/><path d="M7.4 9.2a5.4 5.4 0 0 1 4-3" fill="none" stroke="rgba(255,255,255,.65)" stroke-width="1.5" stroke-linecap="round"/>', { fill: true }),
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
  trickshot: svg('<circle cx="17" cy="7" r="3.2"/><path d="M3.5 19.5c1.6-6.6 5.7-10.5 10.4-11.6"/><path d="M11.5 6.2l2.6 1.7-1.3 2.8"/>'),
  endless: svg('<path d="M12 12c-1.9-2.6-3.4-3.9-5.2-3.9a3.9 3.9 0 0 0 0 7.8c1.8 0 3.3-1.3 5.2-3.9zm0 0c1.9 2.6 3.4 3.9 5.2 3.9a3.9 3.9 0 0 0 0-7.8c-1.8 0-3.3 1.3-5.2 3.9z"/>'),
  daily: svg('<rect x="3.8" y="5.2" width="16.4" height="15.3" rx="2.8"/><path d="M3.8 9.8h16.4M8.2 3.2v4M15.8 3.2v4"/><path d="M12 12.6l.9 1.9 2 .3-1.45 1.4.35 2-1.8-.95-1.8.95.35-2-1.45-1.4 2-.3z" fill="currentColor"/>'),
  multi: svg('<circle cx="8.6" cy="8.6" r="3.2"/><path d="M2.8 19.4a5.8 5.8 0 0 1 11.6 0"/><circle cx="16.8" cy="9.4" r="2.6"/><path d="M15.4 14a5 5 0 0 1 5.8 5.4"/>'),
  map: svg('<path d="M9 4.5L3.5 6.6v13l5.5-2.1 6 2.1 5.5-2.1v-13L15 6.6z"/><path d="M9 4.5v13M15 6.6v13"/>'),
};
