#!/usr/bin/env node
/* Verifica las probabilidades: compara la teoría con una simulación
   y comprueba que cada cuadrícula generada es coherente con su premio.
   Uso: node tools/simulate.js [boletosPorTipo] */
const D = require('../js/data.js');
const N = parseInt(process.argv[2] || '200000', 10);
let ok = true;
for (const tier of D.TIERS.concat(D.SECRET_TIERS, D.LIMITED_TIERS)) {
  const m = D.tierMath(tier);
  let wins = 0, paid = 0;
  for (let i = 0; i < N; i++) {
    const t = D.generateTicket(tier.id);
    const counts = {};
    t.cells.forEach((c) => (counts[c] = (counts[c] || 0) + 1));
    const triples = Object.keys(counts).filter((k) => counts[k] >= 3).map(Number);
    const seen = triples.length ? tier.symbols[triples[0]].v * t.mult : 0;
    if (triples.length > 1 || counts[triples[0]] > 3 || seen !== t.prize || t.cells.length !== tier.cols * tier.rows) {
      ok = false; console.error('Boleto incoherente', tier.id, t);
    }
    if (t.prize > 0) wins++;
    paid += t.prize;
  }
  console.log(
    `${tier.name.padEnd(11)} precio ${String(tier.price).padStart(5)} | ` +
    `premio 1 de ${m.oddsWin.toFixed(2)} (sim ${(N / wins).toFixed(2)}) | ` +
    `RTP ${(m.rtp * 100).toFixed(1)}% (sim ${(paid / (N * tier.price) * 100).toFixed(1)}%) | ` +
    `máx ${m.maxPrize} (1 de ${Math.round(m.oddsTop).toLocaleString('es-ES')})`
  );
}
for (const wildChance of [0, 0.18]) {
  if (wildChance) console.log(`-- Juegos con la habilidad Comodín al máximo (${wildChance * 100}%) --`);
  for (const g of D.GAMES) {
    const m = D.tierMath(g);
    let wins = 0, paid = 0;
    for (let i = 0; i < N; i++) {
      const r = D.generateRound(g.id, Math.random, { wildChance });
      const c = r.cells;
      const real = c.filter((x) => x !== D.WILD);
      const allEq = real.every((x) => x === real[0]);
      const wilds = c.length - real.length;
      let seen = 0;
      if (c.length === 3 && allEq && wilds <= 1) seen = g.symbols[real[0]].v;
      if (wilds && !r.wild) ok = false;
      if (seen !== r.prize || c.length !== 3) { ok = false; console.error('Partida incoherente', g.id, r); }
      if (r.prize) wins++;
      paid += r.prize;
    }
    console.log(
      `${g.name.padEnd(20)} precio ${String(g.price).padStart(5)} | premio 1 de ${m.oddsWin.toFixed(2)} (sim ${(N / wins).toFixed(2)}) | ` +
      `RTP ${(m.rtp * 100).toFixed(1)}% (sim ${(paid / (N * g.price) * 100).toFixed(1)}%) | máx ${m.maxPrize}`
    );
  }
}
console.log(ok ? 'Todas las cuadrículas son coherentes con su premio.' : 'ERRORES detectados');
process.exit(ok ? 0 : 1);
