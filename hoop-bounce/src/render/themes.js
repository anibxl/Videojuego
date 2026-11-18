// Identité visuelle des 5 mondes : ciel, astres, plans de décor, effets, particules, lumière et
// matériaux des surfaces. Tout est procédural (aucune image) : voir background.js et world-draw.js.
//
//  sky        dégradé du ciel (haut → horizon), halo d'horizon
//  celestial  astres peints dans le ciel précalculé (lune, soleil, nébuleuses, fumées, planètes, Terre)
//  stars      nombre d'étoiles fixes ; twinkle : étoiles qui scintillent
//  layers     plans de décor en parallaxe (type de forme + couleurs + détails)
//  effects    effets animés propres au monde (projecteurs, rafales, fumée, oiseaux, étoiles filantes…)
//  particles  particules d'ambiance (type, nombre, couleurs)
//  light      teinte de la vignette ; hint : couleur des textes d'aide
//  surface    poussière d'impact ; les matériaux détaillés sont dessinés par world-draw.js

export const THEMES = {
  // ── MONDE 1 — VILLE : ville moderne la nuit ─────────────────────────────────
  city: {
    sky: { stops: [[0, '#05081a'], [0.45, '#0e1736'], [0.78, '#2a1f4d'], [1, '#5a2d5c']], glow: '255,120,150', glowAlpha: 0.22 },
    celestial: [{ kind: 'moon', x: 0.8, y: 0.2, r: 0.045, color: '235,240,255' }],
    stars: 60,
    twinkle: 10,
    layers: [
      { parallax: 0.12, color: '#141a38', kind: 'skyscrapers', minH: 5, maxH: 10, minW: 1.4, maxW: 2.6, gap: 0.5, windows: ['rgba(140,180,255,0.35)', 'rgba(255,220,160,0.3)'], beacons: true },
      { parallax: 0.26, color: '#1a1f42', kind: 'buildings', minH: 3, maxH: 7, minW: 1.6, maxW: 3.2, gap: 0.4, windows: ['rgba(255,214,150,0.75)', 'rgba(150,200,255,0.6)'], neon: true, tanks: true },
      { parallax: 0.42, color: '#11152e', kind: 'highway', deck: 1.7 },
      { parallax: 0.56, color: '#0b0e22', kind: 'buildings', minH: 1.4, maxH: 3.4, minW: 2, maxW: 3.6, gap: 0.2, windows: ['rgba(255,200,130,0.85)', 'rgba(255,120,170,0.5)'], shops: true, graffiti: true },
    ],
    effects: { searchlights: 2 },
    particles: { kind: 'motes', count: 18, colors: ['255,210,170', '160,200,255'] },
    bokeh: ['255,190,140', '255,120,170', '140,190,255'],
    light: '10,10,40',
    surface: { dust: 'rgba(210,215,230,0.55)' },
    music: 'city',
  },

  // ── MONDE 2 — NEIGE : montagnes enneigées, petits flocons, glace brillante ──
  snow: {
    sky: { stops: [[0, '#4a6fa5'], [0.45, '#86a8d4'], [0.82, '#cfe0f3'], [1, '#eef5ff']], glow: '255,250,240', glowAlpha: 0.35 },
    celestial: [{ kind: 'sun', x: 0.24, y: 0.3, r: 0.05, color: '255,250,235', pale: true }],
    layers: [
      { parallax: 0.1, color: '#9fb6d8', kind: 'mountains', minH: 6.5, maxH: 10.5, minW: 7, maxW: 12, shade: '#7f97bf', snowCap: '#f6faff', snowShade: '#d5e2f3' },
      { parallax: 0.22, color: '#7d97c2', kind: 'mountains', minH: 4, maxH: 7, minW: 5, maxW: 9, shade: '#627ba8', snowCap: '#eef5ff', snowShade: '#c9d8ee' },
      { parallax: 0.38, color: '#4d6a96', kind: 'firs', minH: 2.4, maxH: 4.4, minW: 1.2, maxW: 2, shade: '#3d5884', snowCap: 'rgba(240,247,255,0.9)' },
      { parallax: 0.56, color: '#334d77', kind: 'firs', minH: 1.8, maxH: 3.2, minW: 1, maxW: 1.7, shade: '#283f66', snowCap: 'rgba(245,250,255,0.95)' },
    ],
    fog: { color: '235,243,255', alpha: 0.38 },
    effects: { gusts: 3 },
    particles: { kind: 'snow', count: 70, colors: ['255,255,255'] },
    bokeh: [],
    light: '20,40,80',
    hint: 'rgba(25,45,85,0.6)',
    surface: { dust: 'rgba(255,255,255,0.85)' },
    music: 'snow',
  },

  // ── MONDE 3 — VOLCAN : lave animée, braises lentes, fumée légère ───────────
  volcano: {
    sky: { stops: [[0, '#0c0507'], [0.45, '#2a0c0c'], [0.8, '#5e1a0e'], [1, '#a8401a']], glow: '255,90,30', glowAlpha: 0.38 },
    celestial: [{ kind: 'smoke', x: 0.3, y: 0.22, r: 0.5, color: '70,32,30' }, { kind: 'smoke', x: 0.82, y: 0.14, r: 0.45, color: '58,26,28' }],
    layers: [
      { parallax: 0.1, color: '#2e1210', kind: 'volcanoes', minH: 4, maxH: 6, minW: 8, maxW: 11, gap: 1.6 },
      { parallax: 0.26, color: '#1f0d0b', kind: 'rocks', minH: 2.6, maxH: 5.4, minW: 2, maxW: 4.5, rim: 'rgba(255,90,40,0.5)' },
      { parallax: 0.42, color: '#170908', kind: 'lavaRiver' },
      { parallax: 0.56, color: '#110706', kind: 'rocks', minH: 1.2, maxH: 3, minW: 1.5, maxW: 3.5, rim: 'rgba(255,110,50,0.65)' },
    ],
    effects: { smoke: 5 },
    particles: { kind: 'embers', count: 40, colors: ['255,140,50', '255,90,30', '255,200,90'] },
    ash: { count: 26, color: '120,105,100' },
    bokeh: ['255,110,40', '255,70,30'],
    light: '60,10,0',
    surface: { dust: 'rgba(255,170,110,0.6)' },
    music: 'volcano',
  },

  // ── MONDE 4 — FORÊT : arbres détaillés, rayons de soleil, oiseaux, feuilles ─
  forest: {
    sky: { stops: [[0, '#2f6b6a'], [0.45, '#5f9a7a'], [0.8, '#b7d69a'], [1, '#f2e8b0']], glow: '255,240,190', glowAlpha: 0.45 },
    celestial: [{ kind: 'sun', x: 0.18, y: 0.18, r: 0.06, color: '255,245,210' }],
    layers: [
      { parallax: 0.1, color: '#6f9f80', kind: 'hills', minH: 2.5, maxH: 4.5, minW: 8, maxW: 14, canopy: '#7cab88' },
      { parallax: 0.22, color: '#3f6f52', kind: 'trees', minH: 7, maxH: 11, minW: 1.4, maxW: 2.6, canopy: '#4a8058', light: '#67a06d' },
      { parallax: 0.38, color: '#2b5039', kind: 'trees', minH: 5.5, maxH: 9, minW: 1.1, maxW: 2.1, canopy: '#2f5f3e', light: '#4e8a52', mushrooms: true },
      { parallax: 0.56, color: '#1b3424', kind: 'trees', minH: 4.5, maxH: 8, minW: 1, maxW: 1.8, canopy: '#1f4329', light: '#3a6e3e', grass: '#2f5a30' },
    ],
    rays: { color: '255,248,200', count: 5 },
    effects: { birds: 5 },
    particles: { kind: 'fireflies', count: 14, colors: ['230,255,140', '255,240,150'] },
    leaves: { count: 16, colors: ['150,190,80', '210,160,70', '190,120,60'] },
    bokeh: ['255,250,190'],
    light: '10,30,10',
    hint: 'rgba(20,45,25,0.6)',
    surface: { dust: 'rgba(170,140,90,0.6)' },
    music: 'forest',
  },

  // ── MONDE 5 — ESPACE : étoiles animées, planètes, nébuleuses, futuriste ────
  space: {
    sky: { stops: [[0, '#03020e'], [0.5, '#0d0830'], [0.85, '#1d1150'], [1, '#2b1a66']], glow: '140,110,255', glowAlpha: 0.2 },
    celestial: [
      { kind: 'nebula', x: 0.28, y: 0.32, r: 0.45, color: '190,80,255' },
      { kind: 'nebula', x: 0.4, y: 0.2, r: 0.3, color: '255,90,170' },
      { kind: 'nebula', x: 0.78, y: 0.3, r: 0.38, color: '60,140,255' },
      { kind: 'earth', x: 0.8, y: 0.32, r: 0.085 },
      { kind: 'planet', x: 0.14, y: 0.2, r: 0.045, color: '255,170,120', ring: true },
    ],
    stars: 220,
    twinkle: 30,
    layers: [
      { parallax: 0.06, color: '#1a1240', kind: 'station' },
      { parallax: 0.14, color: '#2a1d55', kind: 'asteroidsBg', minH: 0.3, maxH: 1.1, minW: 3, maxW: 7 },
      { parallax: 0.32, color: '#1b1340', kind: 'craters', minH: 1.5, maxH: 3.5, minW: 4, maxW: 8 },
      { parallax: 0.52, color: '#120c2e', kind: 'craters', minH: 0.8, maxH: 2.2, minW: 3, maxW: 6, lights: true },
    ],
    effects: { shootingStars: true },
    particles: { kind: 'stardust', count: 36, colors: ['200,180,255', '140,200,255', '255,190,240'] },
    bokeh: ['160,120,255', '100,170,255'],
    light: '10,0,40',
    surface: { dust: 'rgba(190,220,255,0.6)' },
    music: 'space',
  },
};

export function themeOf(id) {
  return THEMES[id] ?? THEMES.city;
}
