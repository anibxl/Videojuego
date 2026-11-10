#!/usr/bin/env node
/* Simula partidas completas por días con una estrategia sencilla para ajustar
   la dificultad: cada jugada compra el mejor boleto desbloqueado que cueste
   como mucho un % del saldo; sin habilidades, objetos ni mina.
   Uso: node tools/simulate-days.js [partidas] [objetivo_dia1] [crecimiento] [bonus] [antes] */
const D = require('../js/data.js');
const RUNS = +process.argv[2] || 3000;
const T1 = +process.argv[3] || D.DAYS.target(1);
const G = +process.argv[4] || D.DAYS.target(2) / D.DAYS.target(1);
const B = process.argv[5] !== undefined ? +process.argv[5] : D.DAYS.bonusShare;
const EARLY = process.argv[6] === 'antes'; // estrategia: cerrar el día antes cuando se pueda
const target = (n) => Math.round(T1 * Math.pow(G, n - 1));
const days = [];
for (let r = 0; r < RUNS; r++) {
  let coins = 1000, xp = 0, level = 1, day = 1;
  for (;;) {
    let plays = D.DAYS.plays(day);
    while (plays > 0) {
      const opts = D.TIERS.filter((t) => t.level <= level && t.price <= Math.max(10, coins * 0.12));
      if (!opts.length || coins < 10) break;
      const t = opts[opts.length - 1];
      coins -= t.price; plays--;
      const tk = D.generateTicket(t.id);
      coins += tk.prize;
      xp += t.xp + Math.min(Math.floor(tk.prize / 20), t.xp * 5);
      while (xp >= D.xpForLevel(level)) { xp -= D.xpForLevel(level); level++; coins += D.levelReward(level); }
      if (EARLY && coins >= target(day) * 1.05 && plays > 0 && Math.random() < 0.5) break; // a veces termina antes
    }
    if (coins < target(day)) break;
    const used = (D.DAYS.plays(day) - plays) / D.DAYS.plays(day); // el bonus depende de las jugadas usadas
    day++;
    coins += Math.round(target(day) * B * used);
    if (day > 200) break;
  }
  days.push(day);
}
days.sort((a, b) => a - b);
const pctl = (p) => days[Math.floor(p * (days.length - 1))];
const pass = (d) => (days.filter((x) => x > d).length / days.length * 100).toFixed(0) + '%';
console.log(`objetivo día 1 ${T1}, crecimiento ×${G}, bonus ${B * 100}%${EARLY ? ' (cierra antes)' : ' (usa todas las jugadas)'} → día alcanzado: mediana ${pctl(0.5)}, p10 ${pctl(0.1)}, p90 ${pctl(0.9)}, máx ${days[days.length - 1]}`);
console.log(`  supera el día 1: ${pass(1)} · día 3: ${pass(3)} · día 7: ${pass(7)} · día 15: ${pass(15)}`);
