/* =========================================================
   RascaManía — datos del juego
   Tipos de boleto, tablas de probabilidad, logros y niveles.
   Todo con monedas ficticias: no hay dinero real.
   ========================================================= */
(function (root) {
  'use strict';

  /*
   * Cada boleto es un "encuentra 3 iguales": si aparecen 3 símbolos
   * idénticos, el jugador gana el valor de ese símbolo
   * (multiplicado por la casilla MULTIPLICADOR en los boletos que la tienen).
   *
   * El resultado se decide en el momento de la compra a partir de la tabla
   * `outcomes`: cada entrada es [índiceSímbolo, multiplicador, probabilidad].
   * La probabilidad restante (1 - suma) es "sin premio".
   * Después se genera una cuadrícula coherente con ese resultado, de modo
   * que lo que se ve al rascar coincide siempre con el premio programado.
   */
  const TIERS = [
    {
      id: 'basic',
      name: 'Básico',
      tagline: 'Pequeños premios, mucha diversión',
      price: 10,
      level: 1,
      xp: 6,
      cols: 3,
      rows: 3,
      symbols: [
        { e: '🍋', v: 5 },
        { e: '🍒', v: 10 },
        { e: '🍇', v: 20 },
        { e: '🔔', v: 50 },
        { e: '⭐', v: 100 },
        { e: '🍀', v: 250 },
        { e: '💰', v: 1000 },
      ],
      multipliers: null,
      outcomes: [
        [0, 1, 0.20],
        [1, 1, 0.16],
        [2, 1, 0.09],
        [3, 1, 0.035],
        [4, 1, 0.015],
        [5, 1, 0.004],
        [6, 1, 0.0005],
      ],
      cover: { colors: ['#1fb57a', '#0e8a5f', '#36d39a'], ink: 'rgba(255,255,255,.85)', label: 'RASCA AQUÍ' },
    },
    {
      id: 'silver',
      name: 'Plata',
      tagline: 'Mejores recompensas a precio medio',
      price: 50,
      level: 3,
      xp: 20,
      cols: 3,
      rows: 3,
      symbols: [
        { e: '🥈', v: 25 },
        { e: '🎲', v: 50 },
        { e: '🎯', v: 100 },
        { e: '🎁', v: 250 },
        { e: '🏆', v: 500 },
        { e: '🌟', v: 1500 },
        { e: '👑', v: 5000 },
      ],
      multipliers: null,
      outcomes: [
        [0, 1, 0.18],
        [1, 1, 0.13],
        [2, 1, 0.09],
        [3, 1, 0.035],
        [4, 1, 0.014],
        [5, 1, 0.004],
        [6, 1, 0.001],
      ],
      cover: { colors: ['#c9d3de', '#8e9aab', '#eef3f8'], ink: 'rgba(60,70,85,.75)', label: 'RASCA AQUÍ' },
    },
    {
      id: 'gold',
      name: 'Oro',
      tagline: 'Premios importantes y multiplicador',
      price: 200,
      level: 6,
      xp: 60,
      cols: 4,
      rows: 3,
      symbols: [
        { e: '💵', v: 100 },
        { e: '🔑', v: 200 },
        { e: '💍', v: 500 },
        { e: '🎩', v: 1000 },
        { e: '🦁', v: 2500 },
        { e: '🐉', v: 10000 },
        { e: '🥇', v: 50000 },
      ],
      multipliers: [
        { m: 1, w: 70 },
        { m: 2, w: 22 },
        { m: 5, w: 8 },
      ],
      outcomes: [
        [0, 1, 0.13],
        [0, 2, 0.035],
        [1, 1, 0.10],
        [1, 2, 0.02],
        [2, 1, 0.05],
        [2, 2, 0.012],
        [3, 1, 0.022],
        [3, 5, 0.002],
        [4, 1, 0.009],
        [4, 2, 0.003],
        [5, 1, 0.002],
        [5, 5, 0.00015],
        [6, 1, 0.00015],
      ],
      cover: { colors: ['#f7c948', '#d99a0b', '#fff1a8'], ink: 'rgba(120,70,0,.75)', label: 'RASCA AQUÍ' },
    },
    {
      id: 'diamond',
      name: 'Diamante',
      tagline: 'Premios extremadamente raros',
      price: 1000,
      level: 10,
      xp: 200,
      cols: 4,
      rows: 3,
      symbols: [
        { e: '💠', v: 500 },
        { e: '🔷', v: 1000 },
        { e: '💎', v: 2500 },
        { e: '🔮', v: 5000 },
        { e: '🦄', v: 15000 },
        { e: '🌌', v: 50000 },
        { e: '🏰', v: 250000 },
      ],
      multipliers: [
        { m: 1, w: 60 },
        { m: 2, w: 25 },
        { m: 3, w: 10 },
        { m: 10, w: 5 },
      ],
      outcomes: [
        [0, 1, 0.12],
        [0, 2, 0.035],
        [1, 1, 0.08],
        [1, 2, 0.03],
        [2, 1, 0.04],
        [2, 3, 0.01],
        [3, 1, 0.02],
        [3, 2, 0.005],
        [4, 1, 0.009],
        [4, 3, 0.0015],
        [5, 1, 0.002],
        [5, 10, 0.0001],
        [6, 1, 0.0002],
      ],
      cover: { colors: ['#6ee7ff', '#3a7bd5', '#d6f8ff'], ink: 'rgba(10,40,90,.7)', label: 'RASCA AQUÍ' },
    },
    {
      id: 'legendary',
      name: 'Legendario',
      tagline: 'Posibilidades mínimas, premios enormes',
      price: 5000,
      level: 15,
      xp: 700,
      cols: 4,
      rows: 4,
      symbols: [
        { e: '🔥', v: 2500 },
        { e: '⚡', v: 5000 },
        { e: '🌙', v: 7500 },
        { e: '🎭', v: 12500 },
        { e: '☄️', v: 25000 },
        { e: '🐲', v: 50000 },
        { e: '🔱', v: 100000 },
        { e: '🌠', v: 250000 },
        { e: '🌈', v: 1000000 },
      ],
      multipliers: [
        { m: 1, w: 55 },
        { m: 2, w: 25 },
        { m: 3, w: 12 },
        { m: 5, w: 6 },
        { m: 10, w: 2 },
      ],
      outcomes: [
        [0, 1, 0.05],
        [1, 1, 0.04],
        [1, 2, 0.015],
        [2, 1, 0.03],
        [3, 1, 0.04],
        [3, 2, 0.012],
        [4, 1, 0.025],
        [4, 3, 0.004],
        [5, 1, 0.013],
        [5, 5, 0.001],
        [6, 1, 0.005],
        [6, 10, 0.0002],
        [7, 1, 0.0017],
        [8, 1, 0.0004],
      ],
      cover: { colors: ['#a855f7', '#ec4899', '#f59e0b'], ink: 'rgba(255,255,255,.85)', label: 'RASCA AQUÍ' },
    },
  ];

  const TIER_BY_ID = {};
  TIERS.forEach((t) => (TIER_BY_ID[t.id] = t));

  /* ---------- Estadísticas teóricas de cada boleto ---------- */
  function tierMath(tier) {
    let pWin = 0;
    let ev = 0;
    let maxPrize = 0;
    let pTop = 0;
    tier.outcomes.forEach(([s, m, p]) => {
      const prize = tier.symbols[s].v * m;
      pWin += p;
      ev += prize * p;
      if (prize > maxPrize) {
        maxPrize = prize;
        pTop = p;
      }
    });
    return {
      pWin,
      ev,
      rtp: ev / tier.price,
      maxPrize,
      oddsWin: 1 / pWin,
      oddsTop: 1 / pTop,
    };
  }

  /* ---------- Generación de boletos ---------- */
  function pickWeighted(list, weightKey, rng) {
    const total = list.reduce((a, x) => a + x[weightKey], 0);
    let r = rng() * total;
    for (const x of list) {
      r -= x[weightKey];
      if (r < 0) return x;
    }
    return list[list.length - 1];
  }

  function shuffle(arr, rng) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function rollOutcome(tier, rng) {
    let r = rng();
    for (const [s, m, p] of tier.outcomes) {
      r -= p;
      if (r < 0) return { sym: s, mult: m };
    }
    return null; // sin premio
  }

  /**
   * Crea un boleto con su resultado ya decidido y una cuadrícula coherente:
   *  - Si gana: exactamente 3 casillas con el símbolo ganador y el resto
   *    con símbolos que aparecen como mucho 2 veces.
   *  - Si pierde: ningún símbolo aparece 3 veces.
   */
  function generateTicket(tierId, rng) {
    rng = rng || Math.random;
    const tier = TIER_BY_ID[tierId];
    const n = tier.cols * tier.rows;
    const outcome = rollOutcome(tier, rng);

    // Bolsa con cada símbolo 2 veces => nunca habrá 3 iguales por azar.
    const pool = [];
    tier.symbols.forEach((_, i) => {
      if (!outcome || i !== outcome.sym) pool.push(i, i);
    });
    shuffle(pool, rng);

    let cells;
    if (outcome) {
      cells = [outcome.sym, outcome.sym, outcome.sym].concat(pool.slice(0, n - 3));
    } else {
      cells = pool.slice(0, n);
    }
    shuffle(cells, rng);

    let mult = 1;
    if (tier.multipliers) {
      mult = outcome ? outcome.mult : pickWeighted(tier.multipliers, 'w', rng).m;
    }

    const prize = outcome ? tier.symbols[outcome.sym].v * outcome.mult : 0;
    return {
      tier: tierId,
      cells,
      mult,
      winSym: outcome ? outcome.sym : -1,
      prize,
    };
  }

  /* ---------- Niveles ---------- */
  // XP necesaria para pasar del nivel `l` al `l + 1`.
  function xpForLevel(l) {
    return Math.round(40 * Math.pow(l, 1.5));
  }
  function levelReward(l) {
    return 75 * l;
  }

  /* ---------- Logros ---------- */
  const ACHIEVEMENTS = [
    { id: 'first', icon: '🎟️', name: 'Primer rasca', desc: 'Rasca tu primer boleto', reward: 25, test: (s) => s.stats.scratched >= 1 },
    { id: 'firstwin', icon: '🎉', name: 'Primer premio', desc: 'Gana tu primer premio', reward: 25, test: (s) => s.stats.wins >= 1 },
    { id: 'collector', icon: '📦', name: 'Coleccionista', desc: 'Rasca 50 boletos', reward: 150, test: (s) => s.stats.scratched >= 50 },
    { id: 'addict', icon: '🔥', name: 'Rascador experto', desc: 'Rasca 250 boletos', reward: 600, test: (s) => s.stats.scratched >= 250 },
    { id: 'master', icon: '🧠', name: 'Maestro del rasca', desc: 'Rasca 1.000 boletos', reward: 3000, test: (s) => s.stats.scratched >= 1000 },
    { id: 'streak3', icon: '🍀', name: 'Racha de suerte', desc: 'Gana 3 boletos seguidos', reward: 100, test: (s) => s.stats.bestStreak >= 3 },
    { id: 'streak6', icon: '🌪️', name: 'Imparable', desc: 'Gana 6 boletos seguidos', reward: 500, test: (s) => s.stats.bestStreak >= 6 },
    { id: 'big1k', icon: '💰', name: 'Gran premio', desc: 'Gana 1.000 monedas en un boleto', reward: 200, test: (s) => s.stats.biggestWin >= 1000 },
    { id: 'big25k', icon: '💎', name: 'Lluvia de diamantes', desc: 'Gana 25.000 monedas en un boleto', reward: 2000, test: (s) => s.stats.biggestWin >= 25000 },
    { id: 'big250k', icon: '🌈', name: 'Leyenda viviente', desc: 'Gana 250.000 monedas en un boleto', reward: 25000, test: (s) => s.stats.biggestWin >= 250000 },
    { id: 'rich10k', icon: '🏦', name: 'Ahorrador', desc: 'Llega a 10.000 monedas', reward: 500, test: (s) => s.coins >= 10000 },
    { id: 'rich100k', icon: '🤑', name: 'Magnate', desc: 'Llega a 100.000 monedas', reward: 5000, test: (s) => s.coins >= 100000 },
    { id: 'explorer', icon: '🧭', name: 'Explorador', desc: 'Rasca un boleto de cada tipo', reward: 5000, test: (s) => TIERS.every((t) => (s.stats.perTier[t.id] || {}).scratched > 0) },
    { id: 'lvl5', icon: '⭐', name: 'Aprendiz', desc: 'Alcanza el nivel 5', reward: 200, test: (s) => s.level >= 5 },
    { id: 'lvl10', icon: '🌟', name: 'Veterano', desc: 'Alcanza el nivel 10', reward: 1000, test: (s) => s.level >= 10 },
    { id: 'lvl20', icon: '👑', name: 'Leyenda', desc: 'Alcanza el nivel 20', reward: 10000, test: (s) => s.level >= 20 },
  ];

  const api = { TIERS, TIER_BY_ID, ACHIEVEMENTS, tierMath, generateTicket, xpForLevel, levelReward };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.GameData = api;
})(typeof window !== 'undefined' ? window : globalThis);
