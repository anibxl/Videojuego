// Identité visuelle des 5 mondes : ciel, plans de décor, particules d'ambiance, lumière et
// palette des surfaces. Tout est procédural (aucune image).
//
// Chaque thème décrit :
//  - sky        : dégradé du ciel (haut → horizon) et halo d'horizon
//  - celestial  : astre(s) peints dans le ciel (soleil, lune, planètes, Terre, volcans lointains…)
//  - layers     : plans de silhouettes (parallax, couleur, type de forme)
//  - particles  : particules d'ambiance (type, nombre, couleurs)
//  - light      : teinte de la vignette (lumière du monde)
//  - surface    : couleurs du sol, des blocs, des murs et du liseré du dessus
//  - extras     : effets propres (rayons de lumière, brume, éruptions…)

export const THEMES = {
  // ── MONDE 1 — VILLE : terrain urbain au coucher du soleil ──────────────────
  city: {
    sky: { stops: [[0, '#1b1640'], [0.45, '#5a2f63'], [0.78, '#d0586a'], [1, '#ffa66b']], glow: '255,170,110', glowAlpha: 0.32 },
    celestial: [{ kind: 'sun', x: 0.7, y: 0.26, r: 0.09, color: '255,196,120' }],
    layers: [
      { parallax: 0.16, color: '#4a2c5c', kind: 'buildings', minH: 2.4, maxH: 5.6, minW: 1.6, maxW: 3.4, windows: 'rgba(255,214,150,0.55)', gap: 1.4 },
      { parallax: 0.32, color: '#33204a', kind: 'buildings', minH: 1.6, maxH: 4.2, minW: 1.4, maxW: 2.8, windows: 'rgba(255,200,130,0.7)', lamps: true, gap: 1 },
      { parallax: 0.52, color: '#241837', kind: 'buildings', minH: 1, maxH: 2.6, minW: 1.6, maxW: 3, graffiti: true, gap: 0.6 },
    ],
    particles: { kind: 'motes', count: 26, colors: ['255,200,150', '255,150,170'] },
    bokeh: ['255,190,140', '255,140,170', '255,220,160'],
    light: '40,10,40',
    surface: {
      groundTop: '#3a2a4f', groundBottom: '#1b1430',
      blockTop: '#4a3466', blockBottom: '#2c1f45',
      wall: '#3b2a55', wallDark: '#291d40', wallEdge: 'rgba(255,214,170,0.5)',
      cap: '#ffd9b0', capShade: '#d9a37e', capStyle: 'court',
      dust: 'rgba(255,220,190,0.55)',
    },
    music: 'city',
  },

  // ── MONDE 2 — NEIGE : paysage enneigé, sapins, montagnes, lumière froide ───
  snow: {
    sky: { stops: [[0, '#2a3f6b'], [0.5, '#5f82b4'], [0.85, '#b9d3ef'], [1, '#e6f1ff']], glow: '230,245,255', glowAlpha: 0.28 },
    celestial: [{ kind: 'moon', x: 0.22, y: 0.24, r: 0.05, color: '240,248,255' }],
    layers: [
      { parallax: 0.12, color: '#8aa6cf', kind: 'mountains', minH: 6, maxH: 10, minW: 6, maxW: 11, snowCap: '#f2f8ff' },
      { parallax: 0.26, color: '#6d8cbb', kind: 'mountains', minH: 3.5, maxH: 6.5, minW: 4, maxW: 8, snowCap: '#e8f2ff' },
      { parallax: 0.42, color: '#3f5f8e', kind: 'firs', minH: 2.2, maxH: 4.2, minW: 1.2, maxW: 2, snowCap: 'rgba(235,245,255,0.85)' },
      { parallax: 0.6, color: '#2b456d', kind: 'firs', minH: 1.6, maxH: 3, minW: 1, maxW: 1.7, snowCap: 'rgba(240,248,255,0.9)' },
    ],
    fog: { color: '220,235,255', alpha: 0.32 },
    particles: { kind: 'snow', count: 90, colors: ['255,255,255'] },
    bokeh: [],
    light: '20,40,80',
    hint: 'rgba(25,45,85,0.6)',
    surface: {
      groundTop: '#dfeaf7', groundBottom: '#7f9cc3',
      blockTop: '#5d7fae', blockBottom: '#3c5a86',
      wall: '#4a6a99', wallDark: '#34507c', wallEdge: 'rgba(240,248,255,0.6)',
      cap: '#ffffff', capShade: '#c3d6ee', capStyle: 'snow',
      dust: 'rgba(255,255,255,0.8)',
    },
    music: 'snow',
  },

  // ── MONDE 3 — VOLCAN : lave, roches, cendres, éruptions, lumière orange ────
  volcano: {
    sky: { stops: [[0, '#120708'], [0.5, '#3a1010'], [0.82, '#7a2410'], [1, '#d4521c']], glow: '255,110,40', glowAlpha: 0.4 },
    celestial: [],
    layers: [
      { parallax: 0.12, color: '#3a1512', kind: 'volcanoes', minH: 3.2, maxH: 5, minW: 6, maxW: 9, erupt: true },
      { parallax: 0.3, color: '#26100e', kind: 'rocks', minH: 2.5, maxH: 5.5, minW: 2, maxW: 4.5, cracks: 'rgba(255,110,40,0.55)' },
      { parallax: 0.52, color: '#170a09', kind: 'rocks', minH: 1.2, maxH: 3.2, minW: 1.5, maxW: 3.5, cracks: 'rgba(255,130,50,0.7)' },
    ],
    particles: { kind: 'embers', count: 60, colors: ['255,140,50', '255,90,30', '255,200,90'] },
    ash: { count: 40, color: '120,105,100' },
    bokeh: ['255,110,40', '255,70,30'],
    light: '60,10,0',
    surface: {
      groundTop: '#2b1a17', groundBottom: '#120a09',
      blockTop: '#3a2420', blockBottom: '#1f1210',
      wall: '#2e1b18', wallDark: '#1d100e', wallEdge: 'rgba(255,140,70,0.45)',
      cap: '#5a3a33', capShade: '#3a2420', capStyle: 'ember',
      dust: 'rgba(255,170,110,0.6)',
    },
    music: 'volcano',
  },

  // ── MONDE 4 — FORÊT : grands arbres, rayons de lumière, champignons, lucioles
  forest: {
    sky: { stops: [[0, '#0f2a24'], [0.45, '#1f4d3a'], [0.8, '#4f8a5a'], [1, '#c7e6a0']], glow: '230,255,180', glowAlpha: 0.3 },
    celestial: [],
    layers: [
      { parallax: 0.14, color: '#2a5a44', kind: 'trees', minH: 7, maxH: 11, minW: 1.6, maxW: 3, canopy: '#2f6a4c' },
      { parallax: 0.3, color: '#1f4836', kind: 'trees', minH: 5, maxH: 9, minW: 1.2, maxW: 2.2, canopy: '#24563d', mushrooms: true },
      { parallax: 0.5, color: '#14321f', kind: 'trees', minH: 4, maxH: 8, minW: 0.9, maxW: 1.8, canopy: '#173f28', river: true },
    ],
    rays: { color: '255,250,200', count: 5 },
    particles: { kind: 'fireflies', count: 34, colors: ['220,255,120', '255,240,140'] },
    leaves: { count: 14, colors: ['120,190,90', '200,170,80'] },
    bokeh: ['220,255,150', '255,240,170'],
    light: '0,30,10',
    hint: 'rgba(235,255,220,0.62)',
    surface: {
      groundTop: '#4a3424', groundBottom: '#24180f',
      blockTop: '#3f6b3e', blockBottom: '#284a2a',
      wall: '#3b2a1e', wallDark: '#281c13', wallEdge: 'rgba(200,240,160,0.4)',
      cap: '#7fcf5f', capShade: '#4e9a3e', capStyle: 'grass',
      dust: 'rgba(210,190,140,0.6)',
    },
    music: 'forest',
  },

  // ── MONDE 5 — ESPACE : planètes, étoiles, nébuleuses, astéroïdes, la Terre ─
  space: {
    sky: { stops: [[0, '#05031a'], [0.5, '#140b3a'], [0.85, '#2a1659'], [1, '#3d2378']], glow: '160,120,255', glowAlpha: 0.22 },
    celestial: [
      { kind: 'nebula', x: 0.3, y: 0.35, r: 0.42, color: '170,90,255' },
      { kind: 'nebula', x: 0.78, y: 0.25, r: 0.35, color: '70,140,255' },
      { kind: 'earth', x: 0.8, y: 0.3, r: 0.085 },
      { kind: 'planet', x: 0.16, y: 0.2, r: 0.04, color: '255,170,120', ring: true },
    ],
    stars: 140,
    layers: [
      { parallax: 0.1, color: '#2a1d55', kind: 'asteroidsBg', minH: 0.4, maxH: 1.4, minW: 3, maxW: 7 },
      { parallax: 0.3, color: '#1d1440', kind: 'craters', minH: 1.5, maxH: 3.5, minW: 4, maxW: 8 },
      { parallax: 0.5, color: '#140e30', kind: 'craters', minH: 0.8, maxH: 2.2, minW: 3, maxW: 6 },
    ],
    particles: { kind: 'stardust', count: 40, colors: ['200,180,255', '140,200,255'] },
    bokeh: ['160,120,255', '100,170,255'],
    light: '10,0,40',
    surface: {
      groundTop: '#3a3360', groundBottom: '#16112e',
      blockTop: '#463d75', blockBottom: '#2a2350',
      wall: '#352d60', wallDark: '#221c45', wallEdge: 'rgba(160,220,255,0.55)',
      cap: '#9fe7ff', capShade: '#5aa9d6', capStyle: 'neon',
      dust: 'rgba(190,220,255,0.6)',
    },
    music: 'space',
  },
};

export function themeOf(id) {
  return THEMES[id] ?? THEMES.city;
}
