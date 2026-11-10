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

  /* ---------- Juegos sin rascar ----------
   * Misma mecánica que los boletos: 3 símbolos iguales = premio.
   * El resultado se sortea con la tabla `outcomes` y se muestran 3 símbolos
   * coherentes con él. kind 'slot' = rodillos; 'boxes' = cajas que se abren.
   */
  const GAMES = [
    {
      id: 'slot1', kind: 'slot', name: 'Tragaperras clásica', tagline: 'Tira de la palanca: 3 iguales ganan',
      price: 25, level: 2, xp: 12, icon: '🎰',
      symbols: [
        { e: '🍒', v: 15 }, { e: '🍋', v: 25 }, { e: '🔔', v: 50 }, { e: '🍉', v: 100 },
        { e: '⭐', v: 250 }, { e: '7️⃣', v: 1000 }, { e: '💎', v: 5000 },
      ],
      outcomes: [[0, 1, 0.2], [1, 1, 0.13], [2, 1, 0.08], [3, 1, 0.035], [4, 1, 0.014], [5, 1, 0.0035], [6, 1, 0.0006]],
    },
    {
      id: 'boxes1', kind: 'boxes', name: 'Cajas sorpresa', tagline: 'Abre 3 cajas y busca 3 regalos iguales',
      price: 100, level: 4, xp: 35, icon: '🎁',
      symbols: [
        { e: '🧸', v: 50 }, { e: '🎈', v: 100 }, { e: '🎀', v: 200 }, { e: '🎮', v: 500 },
        { e: '🎸', v: 1500 }, { e: '🚗', v: 5000 }, { e: '🏝️', v: 25000 },
      ],
      outcomes: [[0, 1, 0.18], [1, 1, 0.13], [2, 1, 0.08], [3, 1, 0.035], [4, 1, 0.01], [5, 1, 0.0025], [6, 1, 0.0004]],
    },
    {
      id: 'slot2', kind: 'slot', name: 'Máquina mega', tagline: 'Rodillos de alto voltaje y premios gordos',
      price: 500, level: 8, xp: 120, icon: '⚡',
      symbols: [
        { e: '💵', v: 250 }, { e: '🎲', v: 500 }, { e: '🍀', v: 1000 }, { e: '🔥', v: 2500 },
        { e: '💰', v: 7500 }, { e: '👑', v: 25000 }, { e: '🌟', v: 100000 },
      ],
      outcomes: [[0, 1, 0.17], [1, 1, 0.11], [2, 1, 0.06], [3, 1, 0.03], [4, 1, 0.012], [5, 1, 0.003], [6, 1, 0.0008]],
    },
    {
      id: 'boxes2', kind: 'boxes', name: 'Cofres reales', tagline: 'Tesoros de la realeza en 3 cofres',
      price: 2500, level: 12, xp: 400, icon: '👑',
      symbols: [
        { e: '💍', v: 1250 }, { e: '🔱', v: 2500 }, { e: '🏺', v: 5000 }, { e: '🗡️', v: 12500 },
        { e: '🐉', v: 40000 }, { e: '🏰', v: 150000 }, { e: '🌌', v: 750000 },
      ],
      outcomes: [[0, 1, 0.15], [1, 1, 0.1], [2, 1, 0.06], [3, 1, 0.03], [4, 1, 0.01], [5, 1, 0.0028], [6, 1, 0.0006]],
    },
  ];
  const GAME_BY_ID = {};
  GAMES.forEach((g) => (GAME_BY_ID[g.id] = g));
  const PRODUCT_BY_ID = Object.assign({}, TIER_BY_ID, GAME_BY_ID);

  const WILD = -1; // índice del comodín 🃏

  /**
   * Genera una partida de 3 símbolos.
   *  - Gana: los 3 iguales.
   *  - Pierde: 55 % de las veces una pareja (casi-premio) y el resto, 3 distintos.
   *  - opts.wildChance: probabilidad de que una pareja perdedora se complete con un comodín
   *    de uno de los 3 símbolos más comunes (habilidad «Comodín»): entonces gana el premio de esa pareja.
   */
  function generateRound(gameId, rng, opts) {
    rng = rng || Math.random;
    opts = opts || {};
    const g = GAME_BY_ID[gameId];
    const n = g.symbols.length;
    const outcome = rollOutcome(g, rng);
    if (outcome) {
      return { tier: gameId, cells: [outcome.sym, outcome.sym, outcome.sym], mult: 1, winSym: outcome.sym, prize: g.symbols[outcome.sym].v };
    }
    const a = Math.floor(rng() * n);
    let b = Math.floor(rng() * (n - 1));
    if (b >= a) b++;
    if (rng() < 0.55) {
      // El comodín solo completa parejas de los 3 símbolos de menor valor
      if (opts.wildChance && a < 3 && rng() < opts.wildChance) {
        const cells = shuffle([a, a, WILD], rng);
        return { tier: gameId, cells, mult: 1, winSym: a, prize: g.symbols[a].v, wild: true };
      }
      return { tier: gameId, cells: shuffle([a, a, b], rng), mult: 1, winSym: -1, prize: 0, pair: true };
    }
    let c = Math.floor(rng() * (n - 2));
    [a, b].sort((x, y) => x - y).forEach((x) => { if (c >= x) c++; });
    return { tier: gameId, cells: shuffle([a, b, c], rng), mult: 1, winSym: -1, prize: 0 };
  }

  /* ---------- Objetos de la tienda ----------
   * Potenciadores con un número de usos (cada boleto o partida gasta un uso).
   * El precio sube con el nivel del jugador: price * (1 + 0.2 * (nivel - 1)).
   */
  const ITEMS = [
    // Se gasta sola al quedarte sin monedas: evita empezar de cero
    { id: 'life', icon: '❤️', name: 'Segunda vida', desc: 'Si te quedas sin monedas, te salva de empezar de cero y te da monedas para seguir', uses: 1, price: 1200, level: 2, fixedUses: true, max: 3 },
    { id: 'xp2', icon: '🧪', name: 'Poción de sabiduría', desc: 'Doble de experiencia', uses: 20, price: 300, level: 2 },
    { id: 'crystal', icon: '🔮', name: 'Bola de cristal', desc: '2 casillas extra descubiertas al abrir cada boleto', uses: 8, price: 450, level: 3, ticketsOnly: true },
    { id: 'charm', icon: '🧿', name: 'Amuleto de la fortuna', desc: 'Premios +10 %', uses: 10, price: 900, level: 4 },
    { id: 'shield', icon: '🛡️', name: 'Escudo de consuelo', desc: 'Recuperas el 10 % de cada partida sin premio', uses: 10, price: 1000, level: 5 },
  ];
  const ITEM_BY_ID = {};
  ITEMS.forEach((i) => (ITEM_BY_ID[i.id] = i));

  /* ---------- Mina de monedas (ingresos pasivos) ---------- */
  const MINE = {
    minLevel: 3,
    maxLevel: 10,
    capHours: 6,
    cost: (l) => Math.round((2000 * Math.pow(1.9, l)) / 50) * 50, // precio para pasar de l a l+1
    rate: (l) => 3 * l, // monedas por minuto
  };

  /* ---------- Niveles ---------- */
  // XP necesaria para pasar del nivel `l` al `l + 1`.
  function xpForLevel(l) {
    return Math.round(40 * Math.pow(l, 1.5));
  }
  function levelReward(l) {
    return 75 * l;
  }

  /* ---------- Árbol de habilidades ----------
   * Cada habilidad se compra con monedas y tiene varios niveles.
   * `per` es el efecto por nivel; `req` = [habilidad, nivel mínimo] necesaria antes;
   * `minLevel` = nivel de jugador necesario.
   * Coste del nivel L (0 = primera compra): base * growth^L, redondeado a 50.
   */
  const SKILL_BRANCHES = [
    { id: 'mastery', name: 'Maestría', icon: '⚡', color: '#4cc9f0', desc: 'Progresa y rasca más rápido' },
    { id: 'luck', name: 'Suerte', icon: '🍀', color: '#2ee6a0', desc: 'Más y mejores premios' },
    { id: 'econ', name: 'Economía', icon: '💰', color: '#ffcf3f', desc: 'Gasta menos, recibe más' },
    { id: 'arcade', name: 'Arcade', icon: '🎰', color: '#ff4d8d', desc: 'Mejora los juegos sin rascar' },
    { id: 'biz', name: 'Negocios', icon: '⛏️', color: '#ff9f1c', desc: 'Mina de monedas y objetos' },
  ];

  const pct = (x) => Math.round(x * 100) + '%';
  const SKILLS = [
    // Suerte
    { id: 'lucky', branch: 'luck', icon: '🍀', name: 'Trébol de la suerte', max: 5, base: 500, growth: 2.2, minLevel: 2, req: null, per: 0.02,
      fx: (l) => `Todos los premios +${pct(l * 0.02)}` },
    { id: 'reroll', branch: 'luck', icon: '🔄', name: 'Segunda oportunidad', max: 4, base: 3000, growth: 2.4, minLevel: 5, req: ['lucky', 2], per: 0.03,
      fx: (l) => `${pct(l * 0.03)} de que un boleto sin premio se vuelva a sortear` },
    { id: 'golden', branch: 'luck', icon: '✨', name: 'Toque dorado', max: 3, base: 20000, growth: 2.8, minLevel: 10, req: ['reroll', 2], per: 0.05,
      fx: (l) => `${pct(l * 0.05)} de que un premio se duplique` },
    // Economía
    { id: 'discount', branch: 'econ', icon: '🏷️', name: 'Cliente VIP', max: 5, base: 800, growth: 2.3, minLevel: 2, req: null, per: 0.02,
      fx: (l) => `Boletos un ${pct(l * 0.02)} más baratos` },
    { id: 'daily', branch: 'econ', icon: '🎁', name: 'Bonus generoso', max: 3, base: 1500, growth: 2.5, minLevel: 4, req: ['discount', 1], per: 0.3,
      fx: (l) => `Bonus diario +${pct(l * 0.3)}` },
    { id: 'refund', branch: 'econ', icon: '🛟', name: 'Seguro de consuelo', max: 5, base: 4000, growth: 2.3, minLevel: 6, req: ['daily', 1], per: 0.04,
      fx: (l) => `Recuperas el ${pct(l * 0.04)} de cada boleto sin premio` },
    { id: 'investor', branch: 'econ', icon: '📈', name: 'Inversor', max: 4, base: 12000, growth: 2.5, minLevel: 9, req: ['refund', 2], per: 0.25,
      fx: (l) => `Recompensas de nivel +${pct(l * 0.25)}` },
    // Maestría
    { id: 'xp', branch: 'mastery', icon: '📚', name: 'Aprendiz veloz', max: 5, base: 400, growth: 2.1, minLevel: 1, req: null, per: 0.1,
      fx: (l) => `Experiencia +${pct(l * 0.1)}` },
    { id: 'brush', branch: 'mastery', icon: '💅', name: 'Uña de acero', max: 3, base: 600, growth: 2.5, minLevel: 2, req: ['xp', 1], per: 0.25,
      fx: (l) => `Rascas un ${pct(l * 0.25)} más ancho` },
    { id: 'auto', branch: 'mastery', icon: '🤖', name: 'Rascado automático', max: 1, base: 1500, growth: 1, minLevel: 3, req: ['brush', 1], per: 1,
      fx: (l) => (l ? 'Botón «⚡ Rascar todo» en cada boleto' : 'Desbloquea el botón «⚡ Rascar todo»') },
    { id: 'peek', branch: 'mastery', icon: '👁️', name: 'Ojo de lince', max: 2, base: 5000, growth: 4, minLevel: 5, req: ['auto', 1], per: 1,
      fx: (l) => `${l} casilla${l === 1 ? '' : 's'} ya descubierta${l === 1 ? '' : 's'} en cada boleto` },
    { id: 'bulk', branch: 'mastery', icon: '🚀', name: 'Rascado en lote', max: 1, base: 15000, growth: 1, minLevel: 8, req: ['peek', 1], per: 1,
      fx: (l) => (l ? 'Botón «Rascar todos» en el inventario' : 'Desbloquea «Rascar todos» en el inventario') },
  ];
  SKILLS.push(
    // Arcade
    { id: 'lever', branch: 'arcade', icon: '🎰', name: 'Palanca engrasada', max: 5, base: 600, growth: 2.2, minLevel: 2, req: null, per: 0.04,
      fx: (l) => `Premios de los juegos +${pct(l * 0.04)}` },
    { id: 'consol', branch: 'arcade', icon: '🥈', name: 'Premio de consolación', max: 3, base: 2000, growth: 2.5, minLevel: 4, req: ['lever', 1], per: 0.1,
      fx: (l) => `Con 2 iguales en un juego recuperas el ${pct(l * 0.1)}` },
    { id: 'multi', branch: 'arcade', icon: '🔁', name: 'Tirada múltiple', max: 1, base: 6000, growth: 1, minLevel: 5, req: ['consol', 1], per: 1,
      fx: (l) => (l ? 'Botones ×5 y ×10 en los juegos' : 'Desbloquea jugar ×5 y ×10 en los juegos') },
    { id: 'wild', branch: 'arcade', icon: '🃏', name: 'Comodín', max: 3, base: 15000, growth: 2.6, minLevel: 9, req: ['multi', 1], per: 0.06,
      fx: (l) => `${pct(l * 0.06)} de que una pareja perdedora de símbolos comunes se complete con un comodín` },
    // Negocios
    { id: 'foreman', branch: 'biz', icon: '👷', name: 'Capataz', max: 4, base: 1000, growth: 2.4, minLevel: 3, req: null, per: 0.25,
      fx: (l) => `La mina produce un ${pct(l * 0.25)} más` },
    { id: 'storage', branch: 'biz', icon: '📦', name: 'Almacén', max: 3, base: 2500, growth: 2.5, minLevel: 4, req: ['foreman', 1], per: 0.5,
      fx: (l) => `Capacidad de la mina +${pct(l * 0.5)}` },
    { id: 'alchemist', branch: 'biz', icon: '⚗️', name: 'Alquimista', max: 4, base: 3000, growth: 2.3, minLevel: 6, req: ['storage', 1], per: 0.25,
      fx: (l) => `Los objetos duran un ${pct(l * 0.25)} más` },
    { id: 'merchant', branch: 'biz', icon: '🤝', name: 'Comerciante', max: 3, base: 8000, growth: 2.5, minLevel: 8, req: ['alchemist', 1], per: 0.08,
      fx: (l) => `Objetos y mejoras de la mina un ${pct(l * 0.08)} más baratos` }
  );
  const SKILL_BY_ID = {};
  SKILLS.forEach((s) => (SKILL_BY_ID[s.id] = s));

  function skillCost(skill, level) {
    return Math.round((skill.base * Math.pow(skill.growth, level)) / 50) * 50;
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
    { id: 'skill1', icon: '🌱', name: 'Primera habilidad', desc: 'Mejora una habilidad del árbol', reward: 100, test: (s) => Object.keys(s.skills || {}).some((k) => s.skills[k] > 0) },
    { id: 'branch', icon: '🌳', name: 'Rama completa', desc: 'Lleva al máximo una rama del árbol', reward: 5000, test: (s) => SKILL_BRANCHES.some((b) => SKILLS.filter((k) => k.branch === b.id).every((k) => (s.skills || {})[k.id] >= k.max)) },
    { id: 'arcade1', icon: '🕹️', name: 'A jugar', desc: 'Juega tu primera partida de un juego', reward: 50, test: (s) => (s.stats.games || 0) >= 1 },
    { id: 'arcade100', icon: '🎰', name: 'Jugón', desc: 'Juega 100 partidas de juegos', reward: 800, test: (s) => (s.stats.games || 0) >= 100 },
    { id: 'wildwin', icon: '🃏', name: '¡Comodín!', desc: 'Gana gracias a un comodín', reward: 300, test: (s) => (s.stats.wildWins || 0) >= 1 },
    { id: 'items10', icon: '🧪', name: 'Buen cliente', desc: 'Compra 10 objetos', reward: 400, test: (s) => (s.stats.items || 0) >= 10 },
    { id: 'miner1', icon: '⛏️', name: 'Primera mina', desc: 'Compra la mina de monedas', reward: 200, test: (s) => ((s.mine || {}).level || 0) >= 1 },
    { id: 'miner5', icon: '💎', name: 'Magnate minero', desc: 'Mejora la mina al nivel 5', reward: 3000, test: (s) => ((s.mine || {}).level || 0) >= 5 },
    { id: 'survivor', icon: '❤️', name: 'Superviviente', desc: 'Salva la partida con una Segunda vida', reward: 300, test: (s) => (s.stats.livesUsed || 0) >= 1 },
    { id: 'skillall', icon: '🧙', name: 'Gran maestro', desc: 'Lleva al máximo todo el árbol', reward: 50000, test: (s) => SKILLS.every((k) => (s.skills || {})[k.id] >= k.max) },
  ];

  const api = { TIERS, TIER_BY_ID, GAMES, GAME_BY_ID, PRODUCT_BY_ID, WILD, generateRound, ITEMS, ITEM_BY_ID, MINE, ACHIEVEMENTS, SKILL_BRANCHES, SKILLS, SKILL_BY_ID, skillCost, tierMath, generateTicket, xpForLevel, levelReward };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.GameData = api;
})(typeof window !== 'undefined' ? window : globalThis);
