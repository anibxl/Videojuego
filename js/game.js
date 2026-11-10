/* =========================================================
   RascaManía — lógica principal del juego
   ========================================================= */
(function () {
  'use strict';

  const { RARE_EVENTS, rollRare, PRESTIGE, albumSlots, albumProgress, DAYS, TIERS, TIER_BY_ID, SECRET_TIERS, EVENTS, LIMITED_TIERS, eventAt, JACKPOT, GAMES, GAME_BY_ID, PRODUCT_BY_ID, WILD, generateRound, ITEMS, ITEM_BY_ID, MINE, ACHIEVEMENTS, SKILL_BRANCHES, SKILLS, SKILL_BY_ID, skillCost, tierMath, generateTicket, xpForLevel, levelReward } = window.GameData;
  const SAVE_KEY = 'rascamania_save_v1';
  const HISTORY_MAX = 300;
  const $ = (id) => document.getElementById(id);
  const SPECIAL_TIERS = SECRET_TIERS.concat(LIMITED_TIERS);

  /* ---------- Utilidades ---------- */
  const fmt = (n) => (n < 0 ? '-' : '') + String(Math.abs(Math.round(n))).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const fmtShort = (n) => {
    if (n >= 1e6) return fmt(n / 1e6) + (n % 1e6 ? ',' + String(Math.round((n % 1e6) / 1e5)) : '') + ' M';
    if (n >= 1e4) return fmt(Math.round(n / 1000)) + ' mil';
    return fmt(n);
  };
  const fmtOdds = (x) => (x < 10 ? x.toFixed(2).replace('.', ',') : fmt(Math.round(x)));
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function timeAgo(t) {
    const s = Math.floor((Date.now() - t) / 1000);
    if (s < 60) return 'hace un momento';
    if (s < 3600) return `hace ${Math.floor(s / 60)} min`;
    if (s < 86400) return `hace ${Math.floor(s / 3600)} h`;
    return new Date(t).toLocaleDateString('es-ES');
  }

  /* ---------- Estado y guardado ---------- */
  function freshPerTier() {
    const perTier = {};
    TIERS.concat(SPECIAL_TIERS, GAMES).forEach((t) => (perTier[t.id] = { bought: 0, scratched: 0, wins: 0, spent: 0, won: 0, best: 0 }));
    return perTier;
  }

  function defaultState() {
    return {
      coins: DAYS.startCoins,
      level: 1,
      xp: 0,
      inventory: [],
      history: [],
      serial: 1,
      day: { n: 1, target: DAYS.target(1), plays: DAYS.plays(1), playsTotal: DAYS.plays(1) },
      sound: true,
      achievements: {},
      skills: {},
      boosts: {},
      mine: { level: 0, stored: 0, last: Date.now() },
      pendingRound: null,
      secret: { nextAt: 0, tier: null, until: 0, left: 0 },
      lastEventSeen: null,
      jpLocal: { round: 1, startedAt: Date.now(), contrib: 0, lastWin: null },
      // Récords de todas las partidas: se conservan al empezar de cero
      records: { runs: 1, bestLevel: 1, bestCoins: DAYS.startCoins, bestWin: 0, bestDay: 1 },
      prestige: 0, // renacimientos (permanente)
      album: {}, // premios descubiertos (permanente)
      stats: {
        spent: 0, won: 0, bonus: 0, skillSpent: 0, shopSpent: 0, refunds: 0, bought: 0, scratched: 0, wins: 0,
        games: 0, items: 0, mineEarned: 0, wildWins: 0, livesUsed: 0,
        secrets: 0, jackpots: 0, eventIds: [],
        biggestWin: 0, biggestTier: null, streak: 0, bestStreak: 0, peakCoins: DAYS.startCoins, rares: 0,
        perTier: freshPerTier(),
      },
      createdAt: Date.now(),
    };
  }

  function load() {
    const d = defaultState();
    let s = null;
    try {
      s = JSON.parse(localStorage.getItem(SAVE_KEY));
    } catch (e) {
      s = null;
    }
    if (!s || typeof s !== 'object') return d;
    const out = Object.assign(d, s);
    const savedStats = s.stats || {};
    out.stats = Object.assign(defaultState().stats, savedStats);
    out.stats.perTier = freshPerTier();
    Object.keys(out.stats.perTier).forEach((id) => Object.assign(out.stats.perTier[id], (savedStats.perTier || {})[id] || {}));
    // Descarta boletos de tipos desconocidos (por si cambian los datos)
    out.inventory = (out.inventory || []).filter((t) => TIER_BY_ID[t.tier]);
    out.skills = Object.assign({}, s.skills || {});
    out.boosts = Object.assign({}, s.boosts || {});
    out.mine = Object.assign({ level: 0, stored: 0, last: Date.now() }, s.mine || {});
    out.secret = Object.assign({ nextAt: 0, tier: null, until: 0, left: 0 }, s.secret || {});
    out.jpLocal = Object.assign({ round: 1, startedAt: Date.now(), contrib: 0, lastWin: null }, s.jpLocal || {});
    out.stats.eventIds = Array.isArray(savedStats.eventIds) ? savedStats.eventIds.slice() : [];
    out.records = Object.assign({ runs: 1, bestLevel: 1, bestCoins: DAYS.startCoins, bestWin: 0, bestDay: 1 }, s.records || {});
    out.album = Object.assign({}, s.album || {});
    out.prestige = Number(s.prestige) || 0;
    out.day = Object.assign({ n: 1, target: DAYS.target(1), plays: DAYS.plays(1), playsTotal: DAYS.plays(1) }, s.day || {});
    out.day.target = DAYS.target(out.day.n); // por si cambia la fórmula
    // Partidas anteriores a los días: lo acumulado en la mina se cobra una vez
    if (out.mine.stored >= 1) {
      out.coins += Math.floor(out.mine.stored);
      out.stats.bonus += Math.floor(out.mine.stored);
      out.stats.mineEarned += Math.floor(out.mine.stored);
    }
    out.mine.stored = 0;
    return out;
  }

  let S = load();
  function save() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(S));
    } catch (e) {
      /* almacenamiento no disponible: el juego sigue en memoria */
    }
  }

  /* ---------- Habilidades: efectos ---------- */
  const sk = (id) => (S.skills && S.skills[id]) || 0;
  const skEffect = (id) => sk(id) * SKILL_BY_ID[id].per;
  function ticketPrice(t) {
    return Math.max(1, Math.round(t.price * (1 - skEffect('discount'))));
  }
  function skillState(s) {
    const lvl = sk(s.id);
    if (lvl >= s.max) return { lvl, state: 'maxed' };
    if (S.level < s.minLevel) return { lvl, state: 'locked', why: `Requiere nivel de jugador ${s.minLevel}` };
    if (s.req && sk(s.req[0]) < s.req[1]) return { lvl, state: 'locked', why: `Requiere ${SKILL_BY_ID[s.req[0]].name} nivel ${s.req[1]}` };
    const cost = skillCost(s, lvl);
    return { lvl, cost, state: S.coins >= cost ? 'available' : 'expensive' };
  }
  const affordableSkills = () => SKILLS.filter((s) => skillState(s).state === 'available').length;

  /* ---------- Renacer: mejoras permanentes ---------- */
  const P = () => S.prestige || 0;
  const prestigePrize = () => P() * PRESTIGE.prizeBonus;
  const prestigeXp = () => P() * PRESTIGE.xpBonus;
  const dayPlaysFor = (n) => DAYS.plays(n) + P() * PRESTIGE.extraPlays;

  /* ---------- Objetos y mina ---------- */
  function itemPrice(it) {
    return Math.max(10, Math.round((it.price * (1 + 0.2 * (S.level - 1)) * (1 - skEffect('merchant'))) / 10) * 10);
  }
  const itemUses = (it) => (it.fixedUses ? it.uses : Math.round(it.uses * (1 + skEffect('alchemist'))));
  const mineYieldAt = (l) => Math.round(MINE.dailyYield(l) * (1 + skEffect('foreman'))); // monedas por día
  const mineYield = () => mineYieldAt(S.mine.level);
  const mineUpgradeCost = () => Math.round((MINE.cost(S.mine.level) * (1 - skEffect('merchant'))) / 50) * 50;
  function mineTick() {
    /* La mina produce al empezar cada día (ya no en tiempo real) */
  }

  /** Gasta un uso de cada potenciador activo que aplique. */
  function useBoosts(isTicket) {
    const used = {};
    ['xp2', 'charm', 'shield'].forEach((id) => {
      if ((S.boosts[id] || 0) > 0) {
        S.boosts[id]--;
        used[id] = true;
      }
    });
    return used;
  }
  function boostChips() {
    return ITEMS.filter((it) => (S.boosts[it.id] || 0) > 0)
      .map((it) => `<span class="boost-chip" title="${esc(it.name)}: ${esc(it.desc)}">${it.icon} ${S.boosts[it.id]}</span>`)
      .join('');
  }
  function renderBoosts() {
    const html = boostChips();
    ['home-boosts', 'play-boosts', 'game-boosts'].forEach((id) => {
      const el = $(id);
      if (el) el.innerHTML = html;
    });
  }

  /* ---------- Saldo y XP en la cabecera ---------- */
  let shownCoins = S.coins;
  let coinAnim = null;
  function renderCoins(animate) {
    const target = S.coins;
    const els = [$('coins'), $('home-coins')];
    if (!animate) {
      shownCoins = target;
      els.forEach((e) => (e.textContent = fmt(target)));
      return;
    }
    cancelAnimationFrame(coinAnim);
    const from = shownCoins;
    const t0 = performance.now();
    const dur = Math.min(1600, 400 + Math.abs(target - from) / 50);
    const step = (now) => {
      const k = Math.min(1, (now - t0) / dur);
      const e = 1 - Math.pow(1 - k, 3);
      shownCoins = from + (target - from) * e;
      els.forEach((el) => (el.textContent = fmt(shownCoins)));
      if (k < 1) coinAnim = requestAnimationFrame(step);
    };
    coinAnim = requestAnimationFrame(step);
    const pill = document.querySelector('.coins-pill');
    pill.classList.remove('bump');
    void pill.offsetWidth;
    pill.classList.add('bump');
  }

  function renderLevel() {
    const need = xpForLevel(S.level);
    const pct = Math.min(100, (S.xp / need) * 100);
    $('level').textContent = S.level;
    $('prestige-badge').textContent = P() ? '🌟' + P() : '';
    $('home-level').textContent = S.level;
    $('xp-fill').style.width = pct + '%';
    $('home-xp-fill').style.width = pct + '%';
    $('home-xp-text').textContent = `${fmt(S.xp)} / ${fmt(need)} XP para el nivel ${S.level + 1}`;
    const next = TIERS.find((t) => t.level > S.level);
    $('next-unlock').innerHTML = next
      ? `🔒 Próximo desbloqueo: <span class="chip chip-${next.id}">${next.name}</span> en el nivel <b>${next.level}</b>`
      : '✨ ¡Has desbloqueado todos los boletos!';
  }

  function renderBadges() {
    const n = S.inventory.length || '';
    $('nav-inv-badge').textContent = n;
    $('home-inv-badge').textContent = n;
    const k = affordableSkills() || '';
    $('nav-skill-badge').textContent = k;
    $('home-skill-badge').textContent = k;
  }

  function refreshHeader(animateCoins) {
    renderCoins(animateCoins);
    if (typeof renderDay === 'function') renderDay();
    renderLevel();
    renderBadges();
    renderBoosts();
  }

  /* ---------- Navegación ---------- */
  let current = 'home';
  const renderers = {};
  function go(screen) {
    if (screen !== 'play' && play.card) {
      play.card.destroy();
      play.card = null;
    }
    if (screen !== 'game' && gameRun.tk && !gameRun.done) finishGame(true);
    current = screen;
    document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('active', s.id === 'screen-' + screen));
    document.querySelectorAll('.bottomnav button').forEach((b) => b.classList.toggle('active', b.dataset.go === screen || (screen === 'play' && b.dataset.go === 'inventory') || (screen === 'game' && b.dataset.go === 'shop')));
    if (renderers[screen]) renderers[screen]();
    window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
  }

  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-go]');
    if (b) {
      Sound.click();
      go(b.dataset.go);
    }
  });

  /* ---------- Avisos y ventanas ---------- */
  function toast(icon, html, ms) {
    const el = document.createElement('div');
    el.className = 'toast';
    el.innerHTML = `<span class="t-ico">${icon}</span><div>${html}</div>`;
    $('toasts').appendChild(el);
    setTimeout(() => {
      el.classList.add('out');
      setTimeout(() => el.remove(), 320);
    }, ms || 3200);
  }

  const modalQueue = [];
  let modalOpen = false;
  function modal(opts) {
    modalQueue.push(opts);
    if (!modalOpen) nextModal();
  }
  function nextModal() {
    const m = $('modal');
    const opts = modalQueue.shift();
    if (!opts) {
      modalOpen = false;
      m.classList.add('hidden');
      m.innerHTML = '';
      return;
    }
    modalOpen = true;
    m.classList.remove('hidden');
    const buttons = opts.buttons || [{ label: '¡Genial!', cls: 'btn' }];
    m.innerHTML = `<div class="modal-box ${opts.cls || ''}">
      <div class="m-ico">${opts.icon || '✨'}</div>
      <h3>${opts.title}</h3>
      ${opts.html || ''}
      <div class="m-actions">${buttons.map((b, i) => `<button class="${b.cls || 'btn'}" data-mi="${i}">${b.label}</button>`).join('')}</div>
    </div>`;
    m.querySelectorAll('[data-mi]').forEach((btn) =>
      btn.addEventListener('click', () => {
        Sound.click();
        const b = buttons[+btn.dataset.mi];
        nextModal();
        if (b.action) b.action();
      })
    );
    if (opts.onShow) opts.onShow(m);
  }

  function banner(text, color) {
    const el = document.createElement('div');
    el.className = 'big-banner';
    el.textContent = text;
    if (color) el.style.textShadow = `0 0 24px ${color}, 0 4px 0 rgba(0,0,0,.4)`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2300);
  }

  /* ---------- Progresión ---------- */
  function addXP(amount) {
    S.xp += amount;
    let leveled = false;
    while (S.xp >= xpForLevel(S.level)) {
      S.xp -= xpForLevel(S.level);
      S.level++;
      leveled = true;
      const reward = Math.round(levelReward(S.level) * (1 + skEffect('investor')));
      S.coins += reward;
      S.stats.bonus += reward;
      const unlocked = TIERS.filter((t) => t.level === S.level);
      modal({
        icon: '⬆️',
        title: `¡Nivel ${S.level}!`,
        html: `<p>Recompensa de nivel</p><div class="jp-amount"><span class="coin-ico lg"></span>+${fmt(reward)}</div>` +
          (unlocked.length ? `<p>Nuevo boleto desbloqueado:</p>${unlocked.map((t) => `<span class="unlock-chip chip-${t.id} chip">🎟️ ${t.name}</span>`).join(' ')}` : ''),
        buttons: unlocked.length
          ? [{ label: 'Ir a la tienda', cls: 'btn', action: () => go('shop') }, { label: 'Más tarde', cls: 'btn btn-ghost' }]
          : [{ label: '¡Genial!', cls: 'btn' }],
        onShow: () => {
          Sound.levelUp();
          FX.confetti(90);
        },
      });
    }
    return leveled;
  }

  function checkAchievements() {
    ACHIEVEMENTS.forEach((a) => {
      if (S.achievements[a.id]) return;
      if (a.test(S)) {
        S.achievements[a.id] = Date.now();
        S.coins += a.reward;
        S.stats.bonus += a.reward;
        setTimeout(() => {
          Sound.achievement();
          toast(a.icon, `<b>¡Logro desbloqueado!</b><br>${esc(a.name)} · <span style="color:var(--accent)">+${fmt(a.reward)}</span>`, 4000);
          renderCoins(true);
        }, 900);
      }
    });
  }

  function notePeak() {
    if (S.coins > S.stats.peakCoins) S.stats.peakCoins = S.coins;
  }

  /* ---------- Días, objetivos, segunda vida y récords ---------- */
  /** Precio de lo más barato que se puede jugar ahora mismo. */
  function cheapestPlay() {
    return Math.min(...TIERS.concat(GAMES).filter((t) => S.level >= t.level).map(ticketPrice));
  }
  const busy = () => S.inventory.length > 0 || !!S.pendingRound || !!(gameRun.tk && !gameRun.done);
  /** Sin monedas para jugar nada (con ese saldo). */
  function isBroke(coins) {
    if (coins === undefined) coins = S.coins;
    return coins < cheapestPlay() && !busy();
  }
  /** El día termina al gastar las jugadas o quedarse sin dinero para jugar, con todo rascado. */
  const dayOver = () => !busy() && (S.day.plays <= 0 || S.coins < cheapestPlay());
  const canEndEarly = () => !busy() && S.coins >= S.day.target;
  const playsOk = (q) => S.day.plays >= q;

  const reviveCoins = () => 300 + 100 * S.level;
  /** Bonus al empezar el día n: proporcional a la parte de las jugadas usadas el día anterior. */
  const dayBonus = (n, used) => Math.round(DAYS.target(n) * DAYS.bonusShare * (1 + skEffect('daily')) * used);
  function noteRecords() {
    const r = S.records;
    r.bestLevel = Math.max(r.bestLevel, S.level);
    r.bestCoins = Math.max(r.bestCoins, S.stats.peakCoins, S.coins);
    r.bestWin = Math.max(r.bestWin, S.stats.biggestWin);
    r.bestDay = Math.max(r.bestDay || 1, S.day.n);
  }

  let bankruptTimer = null;
  let rareShowing = false;
  /** Comprueba si el día ha terminado (con retraso para que se vea antes el resultado). */
  function checkBankrupt(delay) {
    clearTimeout(bankruptTimer);
    bankruptTimer = setTimeout(() => {
      renderDay();
      if (!dayOver()) return;
      if (modalOpen || rareShowing) return checkBankrupt(600); // espera a que se cierren otras ventanas
      endDay();
    }, delay === undefined ? 300 : delay);
  }

  function endDay() {
    if (S.coins >= S.day.target) return passDay();
    if ((S.boosts.life || 0) > 0) return useLife();
    gameOver();
  }

  /** Pasa al día siguiente con su bonus, la mina y los intereses del Banco. */
  function passDay(saved) {
    const prev = S.day;
    const n = prev.n + 1;
    const target = DAYS.target(n);
    const plays = dayPlaysFor(n);
    const surplus = Math.max(0, S.coins - prev.target);
    const interest = saved ? 0 : Math.min(Math.round(surplus * skEffect('storage')), Math.round(target * DAYS.interestCap));
    const used = prev.playsTotal ? (prev.playsTotal - Math.max(0, prev.plays)) / prev.playsTotal : 1;
    const bonus = dayBonus(n, used);
    const mine = S.mine.level ? mineYield() : 0;
    const total = bonus + mine + interest;
    S.coins += total;
    S.stats.bonus += total;
    S.stats.mineEarned += mine;
    S.day = { n, target, plays, playsTotal: plays };
    notePeak();
    noteRecords();
    checkAchievements();
    save();
    Sound.levelUp();
    FX.confetti(80);
    const row = (k, v) => `<div class="go-row"><span>${k}</span><b>${v}</b></div>`;
    if (!saved) {
      modal({
        cls: 'daypass',
        icon: '☀️',
        title: `¡Día ${prev.n} superado!`,
        html: `<p>Objetivo ${fmt(prev.target)} conseguido. Empieza el <b>día ${n}</b>.</p>
          <div class="go-stats">
            ${row(`🎁 Bonus de inicio de día (${prev.playsTotal - Math.max(0, prev.plays)}/${prev.playsTotal} jugadas usadas)`, '+' + fmt(bonus))}
            ${S.mine.level ? row('⛏️ Producción de la mina', '+' + fmt(mine)) : ''}
            ${sk('storage') ? row('🏦 Intereses del Banco', '+' + fmt(interest)) : ''}
          </div>
          <div class="day-next"><div><small>Nuevo objetivo</small><b>${fmt(target)}</b></div><div><small>Jugadas</small><b>${plays}</b></div></div>`,
        buttons: [{ label: `Empezar el día ${n}`, cls: 'btn' }],
      });
    }
    refreshHeader(true);
    if (renderers[current]) renderers[current]();
    return total;
  }

  function useLife() {
    S.boosts.life--;
    const amt = reviveCoins();
    S.coins += amt;
    S.stats.bonus += amt;
    S.stats.livesUsed++;
    const failed = S.day;
    passDay(true);
    Sound.levelUp();
    FX.flash('#ff8ab5');
    FX.burst(window.innerWidth / 2, window.innerHeight / 2, 60, ['#ff4d6d', '#ff8ab5', '#ffffff']);
    modal({
      icon: '❤️',
      title: '¡Segunda vida!',
      html: `<p>No llegaste al objetivo del día ${failed.n} (${fmt(failed.target)}), pero tu Segunda vida te ha salvado: conservas tu progreso y pasas al <b>día ${S.day.n}</b>.</p>
        <div class="jp-amount"><span class="coin-ico lg"></span>+${fmt(amt)}</div>
        <div class="day-next"><div><small>Nuevo objetivo</small><b>${fmt(S.day.target)}</b></div><div><small>Jugadas</small><b>${S.day.plays}</b></div></div>
        <p>${S.boosts.life ? `Te quedan ${S.boosts.life} vidas.` : 'Ya no te quedan vidas: ¡compra otra en la tienda!'}</p>`,
      buttons: [{ label: '¡A seguir!', cls: 'btn btn-pink' }],
    });
    refreshHeader(true);
  }

  function gameOver() {
    noteRecords();
    save();
    Sound.lose();
    FX.shake();
    const st = S.stats;
    const row = (k, v) => `<div class="go-row"><span>${k}</span><b>${v}</b></div>`;
    modal({
      cls: 'gameover',
      icon: '💀',
      title: '¡Fin de la partida!',
      html: `<p>Terminó el <b>día ${S.day.n}</b> con ${fmt(S.coins)} monedas y el objetivo era ${fmt(S.day.target)}. Tendrás que <b>empezar de cero</b>.</p>
        <div class="go-stats">
          ${row('Día alcanzado', S.day.n)}
          ${row('Récord de días', S.records.bestDay)}
          ${row('Nivel alcanzado', S.level)}
          ${row('Saldo máximo', fmt(st.peakCoins))}
          ${row('Mayor premio', st.biggestWin ? fmt(st.biggestWin) : '—')}
        </div>
        <p class="small">💡 Una <b>❤️ Segunda vida</b> (tienda → Objetos) te salva cuando no llegas al objetivo.</p>`,
      buttons: [{ label: '🔄 Empezar de cero', cls: 'btn', action: () => resetRun('💀 Nueva partida: día 1. ¡A por ello!') }],
    });
  }

  /* Panel del día (inicio) y franja del día (tienda y pantallas de juego) */
  function renderDay() {
    const d = S.day;
    const pct = Math.min(100, (S.coins / d.target) * 100);
    const reached = S.coins >= d.target;
    const missing = Math.max(0, d.target - S.coins);
    const panel = $('day-panel');
    if (panel) {
      panel.classList.toggle('reached', reached);
      panel.innerHTML = `<div class="dp-top"><div><span class="dp-day">☀️ Día ${d.n}</span><small class="muted">Récord: día ${Math.max(S.records.bestDay || 1, d.n)}</small></div>
          <div class="dp-plays"><b>${d.plays}</b><small>/ ${d.playsTotal} jugadas</small></div></div>
        <div class="dp-goal"><span>Objetivo del día</span><b>${fmt(S.coins)} / ${fmt(d.target)}</b></div>
        <div class="xp-bar wide dp-bar"><span style="width:${pct}%"></span></div>
        <div class="dp-foot">${reached ? '✅ ¡Objetivo conseguido! Puedes seguir jugando o terminar el día ya.' : `Te faltan <b>${fmt(missing)}</b> monedas. Cada boleto o partida gasta una jugada.`}</div>
        ${S.inventory.length ? `<button class="btn btn-pink dp-end" data-go="inventory">🎟️ Tienes ${S.inventory.length} boleto${S.inventory.length === 1 ? '' : 's'} sin rascar${d.plays <= 0 ? ': rásca' + (S.inventory.length === 1 ? 'lo' : 'los') + ' para terminar el día' : ''}</button>` : ''}
        ${canEndEarly() ? `<button class="btn dp-end" data-endday>🌙 Terminar el día ${d.n}</button>` : ''}`;
    }
    document.querySelectorAll('.day-strip').forEach((el) => {
      el.classList.toggle('reached', reached);
      el.innerHTML = `<span>☀️ Día ${d.n}</span><span>🎯 ${reached ? '✅ ' : ''}${fmt(S.coins)} / ${fmt(d.target)}</span><span>🎟️ ${d.plays} jugada${d.plays === 1 ? '' : 's'}</span>`;
    });
  }
  document.addEventListener('click', (e) => {
    if (!e.target.closest('[data-endday]') || !canEndEarly()) return;
    const left = S.day.plays;
    if (left > 0) {
      modal({
        icon: '🌙',
        title: `¿Terminar el día ${S.day.n}?`,
        html: `<p>Ya tienes el objetivo. Si terminas ahora perderás las <b>${left}</b> jugadas que te quedan hoy, pero no arriesgarás tus monedas.</p>
          <p>⚠️ El bonus de mañana depende de las jugadas que uses: bajará de <b>${fmt(dayBonus(S.day.n + 1, 1))}</b> a <b>${fmt(dayBonus(S.day.n + 1, (S.day.playsTotal - left) / S.day.playsTotal))}</b>.</p>`,
        buttons: [{ label: 'Terminar el día', cls: 'btn', action: () => passDay() }, { label: 'Seguir jugando', cls: 'btn btn-ghost' }],
      });
    } else passDay();
  });

  /** Empieza una partida nueva conservando sonido y récords. */
  function resetRun(msg, opts) {
    noteRecords();
    const keep = { sound: S.sound, records: S.records, prestige: S.prestige || 0, album: S.album || {} };
    if (play.card) {
      play.card.destroy();
      play.card = null;
    }
    gameRun.timers.forEach((t) => { clearTimeout(t); clearInterval(t); });
    gameRun.tk = null;
    gameRun.done = true;
    try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* sin almacenamiento */ }
    S = load();
    S.sound = keep.sound;
    S.records = keep.records;
    S.records.runs++;
    S.prestige = keep.prestige + (opts && opts.prestige ? 1 : 0);
    S.album = keep.album;
    // Mejoras de los renacimientos
    S.coins += P() * PRESTIGE.startCoins;
    S.stats.peakCoins = S.coins;
    S.day.plays = S.day.playsTotal = dayPlaysFor(1);
    save();
    refreshHeader(false);
    go('home');
    toast('🔄', msg);
  }

  /** Si una compra te dejaría sin dinero, pide confirmación antes. */
  function guardRuin(cost, action) {
    if (!isBroke(S.coins - cost)) return action();
    modal({
      icon: '⚠️',
      title: '¿Seguro?',
      html: S.coins - cost >= S.day.target
        ? '<p>Con esta compra no te quedará dinero para jugar y <b>terminará el día</b> (aunque llegas al objetivo).</p>'
        : (S.boosts.life || 0) > 0
          ? '<p>Con esta compra no te quedará dinero para jugar, no llegarás al objetivo del día y se gastará una <b>❤️ Segunda vida</b>.</p>'
          : '<p>Con esta compra no te quedará dinero para jugar, no llegarás al objetivo del día y <b>perderás la partida</b>.</p>',
      buttons: [
        { label: 'Comprar igualmente', cls: 'btn btn-pink', action },
        { label: 'Cancelar', cls: 'btn btn-ghost' },
      ],
    });
  }

  /* ---------- Inicio ---------- */
  function historyRow(h) {
    const tier = PRODUCT_BY_ID[h.tier];
    const sym = h.sym >= 0 ? tier.symbols[h.sym].e : '❌';
    return `<li><span class="h-sym">${sym}</span><span class="chip chip-${h.tier}">${tier.name}</span>
      <span class="grow h-time">${timeAgo(h.t)}${h.mult > 1 && h.prize ? ` · ×${h.mult}` : ''}</span>
      <span class="${h.prize ? 'prize-pos' : 'prize-zero'}">${h.prize ? '+' + fmt(h.prize) : 'Sin premio'}</span></li>`;
  }

  function renderHome() {
    renderLevel();
    renderBadges();
    renderDay();
    const got = Object.keys(S.achievements).length;
    $('ach-count').textContent = `${got}/${ACHIEVEMENTS.length}`;
    renderMineCard();
    renderPrestigeCard();
    renderBoosts();
    renderJackpot();
    const ap = albumProgress(S.album);
    $('album-count').textContent = `${ap.got}/${ap.total}`;
    const wins = S.history.filter((h) => h.prize > 0).slice(0, 5);
    $('recent-list').innerHTML = wins.length
      ? wins.map(historyRow).join('')
      : '<li class="empty">Aún no has ganado nada. ¡Compra tu primer boleto en la tienda!</li>';
  }
  renderers.home = renderHome;

  function renderMineCard() {
    const el = $('mine-card');
    if (S.level < MINE.minLevel) {
      el.innerHTML = `<div class="mine-row"><span class="mine-ico">⛏️</span><div class="grow"><b>Mina de monedas</b><small class="muted">Se desbloquea en el nivel ${MINE.minLevel}</small></div></div>`;
      el.classList.add('locked');
      return;
    }
    el.classList.remove('locked');
    if (!S.mine.level) {
      el.innerHTML = `<div class="mine-row"><span class="mine-ico">⛏️</span><div class="grow"><b>Mina de monedas</b><small class="muted">Te da monedas al empezar cada día</small></div>
        <button class="btn btn-ghost small-btn" data-shoptab="items">Construir</button></div>`;
      return;
    }
    el.innerHTML = `<div class="mine-row"><span class="mine-ico">⛏️</span>
      <div class="grow"><b>Mina nivel ${S.mine.level}</b><small class="muted">Produce <b>${fmt(mineYield())}</b> monedas al empezar cada día</small></div>
      <button class="btn btn-ghost small-btn" data-shoptab="items">Mejorar</button></div>`;
  }
  const fmtDec = (x) => (Math.round(x * 10) / 10).toString().replace('.', ',');

  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-shoptab]');
    if (t) {
      shopTab = t.dataset.shoptab;
      go('shop');
    }
  });

  /* ---------- Tienda ---------- */
  let shopTab = 'tickets';
  function renderShop() {
    document.querySelectorAll('#shop-tabs [data-tab]').forEach((b) => b.classList.toggle('active', b.dataset.tab === shopTab));
    if (shopTab === 'games') return renderGamesTab();
    if (shopTab === 'items') return renderItemsTab();
    $('shop-grid').innerHTML = renderSpecials() + TIERS.map((t) => {
      const m = tierMath(t);
      const locked = S.level < t.level;
      const preview = t.symbols.slice(-3).map((s) => s.e).join('');
      const price = ticketPrice(t);
      const btn = (q, label) => {
        const cost = price * q;
        return `<button class="btn ${q === 1 ? '' : 'btn-ghost'}" data-buy="${t.id}" data-q="${q}" ${locked || S.coins < cost || !playsOk(q) ? 'disabled' : ''}>${label}<small>${fmtShort(cost)}</small></button>`;
      };
      return `<div class="shop-card ${locked ? 'locked' : ''}">
        ${locked ? `<div class="lock-overlay"><span>🔒</span>Se desbloquea en el nivel ${t.level}<small class="muted">Te faltan ${t.level - S.level} niveles</small></div>` : ''}
        <div class="shop-body">
          <div class="mini-ticket mt-${t.id}"><div class="mt-name">${t.name}</div><div class="mt-syms">${preview}</div></div>
          <div class="muted small">${t.tagline}</div>
          <div class="shop-info">
            <div class="si"><small>Precio</small><b><span class="coin-ico"></span> ${fmt(price)}${price < t.price ? ` <s class="muted small">${fmt(t.price)}</s>` : ''}</b></div>
            <div class="si"><small>Premio máximo</small><b>${fmtShort(m.maxPrize)}</b></div>
            <div class="si"><small>Probabilidad de premio</small><b>1 de ${fmtOdds(m.oddsWin)}</b></div>
            <div class="si"><small>Prob. premio máximo</small><b>1 de ${fmt(Math.round(m.oddsTop))}</b></div>
          </div>
          <div class="buy-row">${btn(1, 'Comprar')}${btn(5, '×5')}${btn(10, '×10')}</div>
        </div>
      </div>`;
    }).join('');
  }
  renderers.shop = renderShop;

  function renderGamesTab() {
    const multi = sk('multi');
    $('shop-grid').innerHTML = GAMES.map((g) => {
      const m = tierMath(g);
      const locked = S.level < g.level;
      const price = ticketPrice(g);
      const btn = (q, label) => {
        const cost = price * q;
        return `<button class="btn ${q === 1 ? '' : 'btn-ghost'}" data-play="${g.id}" data-q="${q}" ${locked || S.coins < cost || !playsOk(q) ? 'disabled' : ''}>${label}<small>${fmtShort(cost)}</small></button>`;
      };
      return `<div class="shop-card ${locked ? 'locked' : ''}">
        ${locked ? `<div class="lock-overlay"><span>🔒</span>Se desbloquea en el nivel ${g.level}<small class="muted">Te faltan ${g.level - S.level} niveles</small></div>` : ''}
        <div class="shop-body">
          <div class="mini-ticket mg-${g.id}"><div class="mt-kind">${g.kind === 'slot' ? 'MÁQUINA' : 'CAJAS'}</div><div class="mt-name">${g.icon} ${g.name}</div><div class="mt-syms">${g.symbols.slice(-3).map((x) => x.e).join('')}</div></div>
          <div class="muted small">${g.tagline} · sin rascar</div>
          <div class="shop-info">
            <div class="si"><small>Precio por partida</small><b><span class="coin-ico"></span> ${fmt(price)}${price < g.price ? ` <s class="muted small">${fmt(g.price)}</s>` : ''}</b></div>
            <div class="si"><small>Premio máximo</small><b>${fmtShort(m.maxPrize)}</b></div>
            <div class="si"><small>Probabilidad de premio</small><b>1 de ${fmtOdds(m.oddsWin)}</b></div>
            <div class="si"><small>Prob. premio máximo</small><b>1 de ${fmt(Math.round(m.oddsTop))}</b></div>
          </div>
          <div class="buy-row ${multi ? '' : 'single'}">${btn(1, 'Jugar')}${multi ? btn(5, '×5') + btn(10, '×10') : '<span class="multi-hint">🔁 ×5 y ×10 con la habilidad «Tirada múltiple»</span>'}</div>
        </div>
      </div>`;
    }).join('');
  }

  function renderItemsTab() {
    mineTick();
    const mineLocked = S.level < MINE.minLevel;
    const maxed = S.mine.level >= MINE.maxLevel;
    const upCost = mineUpgradeCost();
    const nextYield = mineYieldAt(S.mine.level + 1);
    const mineCard = `<div class="shop-card mine-shop ${mineLocked ? 'locked' : ''}">
      ${mineLocked ? `<div class="lock-overlay"><span>🔒</span>Se desbloquea en el nivel ${MINE.minLevel}</div>` : ''}
      <div class="shop-body">
        <div class="item-head"><span class="item-ico">⛏️</span><div><b>Mina de monedas</b><small class="muted">Ingresos pasivos: al empezar cada día te da monedas. Cada mejora se amortiza en unos 5 días.</small></div></div>
        <div class="shop-info">
          <div class="si"><small>Nivel</small><b>${S.mine.level} / ${MINE.maxLevel}</b></div>
          <div class="si"><small>Producción por día</small><b>${S.mine.level ? fmt(mineYield()) : '—'}</b></div>
          <div class="si"><small>${maxed ? 'Nivel máximo' : 'Con el siguiente nivel'}</small><b>${maxed ? '✔' : fmt(nextYield) + '/día'}</b></div>
        </div>
        <div class="buy-row single">
          <button class="btn" data-mine-up ${mineLocked || maxed || S.coins < upCost ? 'disabled' : ''}>${maxed ? 'Al máximo' : (S.mine.level ? 'Mejorar' : 'Construir') + ` <small>${fmtShort(upCost)}</small>`}</button>
        </div>
      </div>
    </div>`;
    const items = ITEMS.map((it) => {
      const locked = S.level < it.level;
      const price = itemPrice(it);
      const have = S.boosts[it.id] || 0;
      return `<div class="shop-card item-card ${locked ? 'locked' : ''}">
        ${locked ? `<div class="lock-overlay"><span>🔒</span>Se desbloquea en el nivel ${it.level}</div>` : ''}
        <div class="shop-body">
          <div class="item-head"><span class="item-ico">${it.icon}</span><div><b>${it.name}</b><small class="muted">${it.desc}</small></div></div>
          <div class="shop-info">
            <div class="si"><small>${it.fixedUses ? 'Máximo' : 'Duración'}</small><b>${it.fixedUses ? it.max + ' vidas' : itemUses(it) + (it.ticketsOnly ? ' boletos' : ' partidas')}</b></div>
            <div class="si"><small>Te quedan</small><b>${have ? have + (it.fixedUses ? (have === 1 ? ' vida' : ' vidas') : ' usos') : '—'}</b></div>
          </div>
          <div class="buy-row single"><button class="btn" data-item="${it.id}" ${locked || S.coins < price || (it.max && have >= it.max) ? 'disabled' : ''}>${it.max && have >= it.max ? 'Al máximo' : `Comprar <small>${fmtShort(price)}</small>`}</button></div>
        </div>
      </div>`;
    }).join('');
    $('shop-grid').innerHTML = mineCard + items;
  }

  $('shop-tabs').addEventListener('click', (e) => {
    const b = e.target.closest('[data-tab]');
    if (!b) return;
    Sound.click();
    shopTab = b.dataset.tab;
    renderShop();
  });

  $('shop-grid').addEventListener('click', (e) => {
    const b = e.target.closest('[data-buy]');
    if (b && !b.disabled) return buy(b.dataset.buy, +b.dataset.q, b);
    const g = e.target.closest('[data-play]');
    if (g && !g.disabled) return playGame(g.dataset.play, +g.dataset.q, g);
    const it = e.target.closest('[data-item]');
    if (it && !it.disabled) return buyItem(it.dataset.item, it);
    const mu = e.target.closest('[data-mine-up]');
    if (mu && !mu.disabled) return upgradeMine(mu);
  });

  function buyItem(id, srcEl) {
    Sound.unlock();
    const it = ITEM_BY_ID[id];
    const price = itemPrice(it);
    if (S.level < it.level || S.coins < price || (it.max && (S.boosts[id] || 0) >= it.max)) return Sound.error();
    const r = srcEl.getBoundingClientRect();
    guardRuin(price, () => {
      S.coins -= price;
      S.stats.shopSpent += price;
      S.stats.items++;
      S.boosts[id] = (S.boosts[id] || 0) + itemUses(it);
      Sound.buy();
      FX.sparkle(r.left + r.width / 2, r.top + r.height / 2, 14, '#c9b6ff');
      toast(it.icon, `<b>${it.name}</b><br>${it.desc}${it.fixedUses ? '' : ` · ${itemUses(it)} usos`}`);
      checkAchievements();
      save();
      refreshHeader(true);
      renderShop();
      checkBankrupt();
    });
  }

  function upgradeMine(srcEl) {
    Sound.unlock();
    const cost = mineUpgradeCost();
    if (S.level < MINE.minLevel || S.mine.level >= MINE.maxLevel || S.coins < cost) return Sound.error();
    const r = srcEl.getBoundingClientRect();
    guardRuin(cost, () => {
      mineTick();
      S.coins -= cost;
      S.stats.shopSpent += cost;
      S.mine.level++;
      Sound.levelUp();
      FX.burst(r.left + r.width / 2, r.top + r.height / 2, 40, ['#ff9f1c', '#ffcf3f', '#ffffff']);
      toast('⛏️', `<b>Mina nivel ${S.mine.level}</b><br>${fmt(mineYield())} monedas al empezar cada día`);
      checkAchievements();
      save();
      refreshHeader(true);
      renderShop();
      checkBankrupt();
    });
  }

  /** Crea un boleto o una partida aplicando las habilidades que actúan al comprar. */
  function makeRound(id) {
    const isGame = !!GAME_BY_ID[id];
    const gen = () => (isGame ? generateRound(id, Math.random, { wildChance: skEffect('wild') }) : generateTicket(id));
    let tk = gen();
    // Segunda oportunidad: una partida perdedora se sortea de nuevo
    if (!tk.prize && Math.random() < skEffect('reroll')) {
      tk = gen();
      if (tk.prize) tk.rerolled = true;
    }
    // Toque dorado: el premio se duplicará al cobrarlo
    if (tk.prize && Math.random() < skEffect('golden')) tk.golden = true;
    // Sorteo del jackpot mundial (probabilidad proporcional al precio)
    if (Math.random() < PRODUCT_BY_ID[id].price * JACKPOT.chancePerCoin) tk.jackpot = true;
    // Premios extremadamente raros (1 de 10.000 … 1 de 10.000.000)
    const rare = rollRare();
    if (rare >= 0) tk.rare = rare;
    return tk;
  }

  function buy(tierId, qty, srcEl) {
    Sound.unlock();
    const t = PRODUCT_BY_ID[tierId];
    const unit = ticketPrice(t);
    const cost = unit * qty;
    if (S.level < t.level) return;
    if (!specialAvailable(t, qty)) {
      Sound.error();
      toast('⌛', t.secret ? 'El boleto secreto ya no está disponible.' : 'El evento de este boleto ha terminado.');
      renderShop();
      return;
    }
    if (!playsOk(qty)) {
      Sound.error();
      toast('🌙', `No te quedan jugadas suficientes hoy (${S.day.plays}).`);
      return;
    }
    if (S.coins < cost) {
      Sound.error();
      toast('💸', 'No tienes monedas suficientes.');
      return;
    }
    S.day.plays -= qty;
    if (t.secret) {
      S.secret.left -= qty;
      S.stats.secrets += qty;
    }
    contributeJackpot(cost);
    S.coins -= cost;
    S.stats.spent += cost;
    S.stats.bought += qty;
    S.stats.perTier[tierId].bought += qty;
    S.stats.perTier[tierId].spent += cost;
    const created = [];
    for (let i = 0; i < qty; i++) {
      const tk = makeRound(tierId);
      tk.paid = unit;
      tk.id = S.serial++;
      tk.bought = Date.now();
      S.inventory.push(tk);
      created.push(tk);
    }
    save();
    Sound.buy();
    if (srcEl) {
      const r = srcEl.getBoundingClientRect();
      FX.sparkle(r.left + r.width / 2, r.top + r.height / 2, 10, '#ffe48a');
    }
    refreshHeader(true);
    openTicket(created[0].id);
  }

  /* ---------- Rascar ---------- */
  const play = { card: null, ticket: null, revealedSyms: {}, settled: false };

  function renderTicketEl(tk) {
    const t = PRODUCT_BY_ID[tk.tier];
    const el = document.createElement('div');
    el.className = `ticket tier-${t.id}${t.secret ? ' tier-secret' : ''}${t.limited ? ' tier-limited' : ''}`;
    if (t.limited || t.secret) {
      const [c1, c2, c3] = t.cover.colors;
      el.style.cssText = `--t-bg:${c2};--t-bg2:${c1};--t-accent:${c3}`;
    }
    const cells = tk.cells
      .map((s, i) => `<div class="cell" data-i="${i}"><span class="sym">${t.symbols[s].e}</span><span class="val">${fmtShort(t.symbols[s].v)}</span></div>`)
      .join('');
    const mult = t.multipliers ? `<div class="cell mult-cell" data-i="${tk.cells.length}"><span class="mlabel">MULTIPLICADOR</span><span class="mval">×${tk.mult}</span></div>` : '';
    el.innerHTML = `${t.id === 'legendary' ? '<div class="rainbow-border"></div>' : ''}
      <div class="t-body">
        ${t.secret ? '<div class="t-badge">🕵️ BOLETO SECRETO</div>' : ''}${t.limited ? `<div class="t-badge">${t.icon} EDICIÓN LIMITADA</div>` : ''}
        <div class="t-head"><div class="t-name">${t.name}</div><div class="t-price"><span class="coin-ico"></span>${fmt(t.price)}</div></div>
        <div class="t-sub">¡Encuentra <b>3 símbolos iguales</b> y gana su premio!${t.multipliers ? ' El <b>multiplicador</b> lo aumenta.' : ''}</div>
        <div class="scratch-area cols-${t.cols}" style="grid-template-columns: repeat(${t.cols}, 1fr)">${cells}${mult}</div>
        <div class="t-legend">${t.symbols.map((s, i) => `<span data-sym="${i}">${s.e} ${fmtShort(s.v)}</span>`).join('')}</div>
        <div class="t-foot"><span>Nº ${String(tk.id).padStart(7, '0')}</span><span>RASCAMANÍA · MONEDAS FICTICIAS</span></div>
      </div>`;
    return el;
  }

  function openTicket(id) {
    const tk = S.inventory.find((x) => x.id === id);
    if (!tk) return go('inventory');
    if (play.card) play.card.destroy();
    play.ticket = tk;
    play.settled = false;
    play.revealedSyms = {};
    revealCount = 0;
    go('play');
    const holder = $('ticket-holder');
    holder.innerHTML = '';
    const el = renderTicketEl(tk);
    holder.appendChild(el);
    $('result').className = 'result';
    $('result').innerHTML = '<div class="hint">👆 Arrastra el dedo o el ratón para rascar</div>';
    $('play-actions').innerHTML = '';
    $('play-progress-fill').style.width = '0%';
    $('auto-btn').disabled = false;
    $('auto-btn').classList.toggle('hidden', !sk('auto')); // mejora del árbol

    const area = el.querySelector('.scratch-area');
    const cellEls = Array.from(area.querySelectorAll('.cell'));
    const t = PRODUCT_BY_ID[tk.tier];
    // Espera al layout para medir correctamente
    requestAnimationFrame(() => {
      play.card = new ScratchCard(area, {
        cover: t.cover,
        cells: cellEls,
        onCellReveal: (i, silent) => onCellReveal(tk, cellEls, i, silent),
        onProgress: (p) => ($('play-progress-fill').style.width = Math.min(100, (p / 0.8) * 100) + '%'),
        onDone: () => settle(tk, el, cellEls),
        brushScale: 1 + skEffect('brush'),
      });
      // Ojo de lince: descubre casillas al azar nada más empezar
      let peek = sk('peek');
      if ((S.boosts.crystal || 0) > 0) {
        S.boosts.crystal--;
        peek += 2;
        save();
        renderBoosts();
      }
      if (peek) {
        const idx = shuffleIdx(tk.cells.length).slice(0, peek);
        setTimeout(() => play.card && play.card.revealCells(idx), 350);
      }
    });
  }
  renderers.play = () => {};
  function shuffleIdx(n) {
    const a = Array.from({ length: n }, (_, i) => i);
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  $('auto-btn').addEventListener('click', () => {
    if (play.card && !play.card.done && sk('auto')) {
      Sound.unlock();
      $('auto-btn').disabled = true;
      play.card.autoScratch();
    }
  });

  let revealCount = 0;
  function onCellReveal(tk, cellEls, i, silent) {
    const cell = cellEls[i];
    cell.classList.add('revealed');
    if (cell.classList.contains('mult-cell')) {
      if (!silent) Sound.reveal(10);
      return;
    }
    if (!silent) Sound.reveal(revealCount++);
    const sym = tk.cells[i];
    play.revealedSyms[sym] = (play.revealedSyms[sym] || 0) + 1;
    const n = play.revealedSyms[sym];
    if (n >= 2) {
      // Dos iguales: se iluminan para crear tensión
      cellEls.forEach((c, j) => {
        if (j < tk.cells.length && tk.cells[j] === sym && c.classList.contains('revealed')) c.classList.add('hot');
      });
    }
    if (n === 3 && sym === tk.winSym) {
      if (!silent) Sound.match();
      cellEls.forEach((c, j) => {
        if (tk.cells[j] === sym) {
          c.classList.remove('hot');
          c.classList.add('win');
          const r = c.getBoundingClientRect();
          FX.sparkle(r.left + r.width / 2, r.top + r.height / 2, 8);
        }
      });
    }
  }

  /** Cobra un boleto o una partida: aplica habilidades y objetos y actualiza el estado. */
  function resolveTicket(tk) {
    const t = PRODUCT_BY_ID[tk.tier];
    const isGame = !!GAME_BY_ID[tk.tier];
    if (!isGame) {
      const idx = S.inventory.findIndex((x) => x.id === tk.id);
      if (idx < 0) return null; // ya cobrado
      S.inventory.splice(idx, 1);
    }
    const used = useBoosts(!isGame);
    const base = tk.prize;
    const luckBonus = skEffect('lucky') + (isGame ? skEffect('lever') : 0) + (used.charm ? 0.1 : 0) + prestigePrize();
    const payout = base ? Math.round(base * (tk.golden ? 2 : 1) * (1 + luckBonus)) : 0;
    const paid = tk.paid || t.price;
    const refund = base ? 0 : Math.round(paid * (skEffect('refund') + (used.shield ? 0.1 : 0)));
    const consolation = !base && isGame && tk.pair ? Math.round(paid * skEffect('consol')) : 0;
    const pt = S.stats.perTier[t.id];
    if (t.limited && !S.stats.eventIds.includes(t.event)) S.stats.eventIds.push(t.event);
    if (tk.jackpot) setTimeout(() => winJackpot(t), 2200);
    if (isGame) S.stats.games++;
    else S.stats.scratched++;
    pt.scratched++;
    if (payout > 0) {
      S.coins += payout;
      S.stats.won += payout;
      S.stats.wins++;
      S.stats.streak++;
      S.stats.bestStreak = Math.max(S.stats.bestStreak, S.stats.streak);
      pt.wins++;
      pt.won += payout;
      pt.best = Math.max(pt.best, payout);
      if (tk.wild) S.stats.wildWins++;
      const ak = t.id + ':' + tk.winSym;
      S.album[ak] = (S.album[ak] || 0) + 1;
      if (payout > S.stats.biggestWin) {
        S.stats.biggestWin = payout;
        S.stats.biggestTier = t.id;
      }
    } else {
      S.stats.streak = 0;
      if (refund + consolation) {
        S.coins += refund + consolation;
        S.stats.bonus += refund + consolation;
        S.stats.refunds += refund + consolation;
      }
    }
    notePeak();
    S.history.unshift({ tier: t.id, prize: payout, sym: tk.winSym, mult: tk.mult, t: Date.now(), id: tk.id });
    if (S.history.length > HISTORY_MAX) S.history.length = HISTORY_MAX;

    // Acontecimiento extremadamente raro: premio aparte, multiplicado por el precio
    let rareAmount = 0;
    if (tk.rare >= 0 && RARE_EVENTS[tk.rare]) {
      const ev = RARE_EVENTS[tk.rare];
      rareAmount = Math.round(t.price * ev.mult * (1 + luckBonus));
      S.coins += rareAmount;
      S.stats.won += rareAmount;
      S.stats.rares++;
      S.album['rare:' + ev.id] = (S.album['rare:' + ev.id] || 0) + 1;
      if (rareAmount > S.stats.biggestWin) { S.stats.biggestWin = rareAmount; S.stats.biggestTier = t.id; }
      notePeak();
      rareShowing = true;
      setTimeout(() => playRareEvent(tk.rare, rareAmount, t), 1600);
    }
    const xpGain = Math.round((t.xp + Math.min(Math.floor(payout / 20), t.xp * 5)) * (1 + skEffect('xp') + prestigeXp()) * (used.xp2 ? 2 : 1));
    addXP(xpGain);
    return { payout, refund, consolation, xpGain, luckBonus, used, rareAmount };
  }

  /** Texto de bonificaciones aplicadas a un resultado. */
  function resultExtras(tk, r) {
    const extras = [];
    if (r.payout) {
      if (tk.rerolled) extras.push('🔄 ¡Segunda oportunidad!');
      if (tk.wild) extras.push('🃏 ¡Comodín!');
      if (tk.golden) extras.push('✨ ¡Toque dorado: premio doble!');
      if (r.luckBonus) extras.push(`🍀 Premio +${Math.round(r.luckBonus * 100)}%`);
    } else {
      if (r.refund) extras.push(`🛟 Recuperas ${fmt(r.refund)}`);
      if (r.consolation) extras.push(`🥈 Consolación: +${fmt(r.consolation)}`);
    }
    if (r.used.xp2) extras.push('🧪 XP ×2');
    return extras.length ? `<div class="r-extras">${extras.join(' · ')}</div>` : '';
  }

  function settle(tk, el, cellEls) {
    if (play.settled) return;
    play.settled = true;
    revealCount = 0;
    const t = PRODUCT_BY_ID[tk.tier];
    const r = resolveTicket(tk);
    if (!r) return;
    const prize = r.payout;
    const xpGain = r.xpGain;
    const area = el.querySelector('.scratch-area');
    area.classList.add('finished');
    $('auto-btn').disabled = true;
    $('play-progress-fill').style.width = '100%';

    // Resaltado final
    if (prize > 0) {
      cellEls.forEach((c, j) => {
        if (j < tk.cells.length && tk.cells[j] === tk.winSym) c.classList.add('win');
        c.classList.remove('hot');
      });
      const mc = el.querySelector('.mult-cell');
      if (mc && tk.mult > 1) mc.classList.add('active');
      const lg = el.querySelector(`.t-legend [data-sym="${tk.winSym}"]`);
      if (lg) lg.classList.add('lit');
    } else {
      cellEls.forEach((c) => c.classList.remove('hot'));
    }

    celebrate(tk, t, el, prize);

    const res = $('result');
    if (prize > 0) {
      res.className = 'result win';
      res.innerHTML = `<div class="r-title">¡Has ganado ${fmt(prize)} monedas!</div>
        <div class="r-sub">${t.symbols[tk.winSym].e} ×3${tk.mult > 1 ? ` · multiplicador ×${tk.mult}` : ''} · +${xpGain} XP</div>
        ${resultExtras(tk, r)}`;
    } else {
      res.className = 'result';
      res.innerHTML = `<div class="r-title">Sin premio esta vez</div><div class="r-sub">¡La suerte cambia! · +${xpGain} XP</div>
        ${resultExtras(tk, r)}`;
    }

    checkAchievements();
    save();
    setTimeout(() => refreshHeader(true), prize > 0 ? 450 : 0);
    renderPlayActions(t);
    checkBankrupt(1800);
  }

  function celebrate(tk, t, el, prize) {
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    if (!prize) {
      Sound.lose();
      return;
    }
    const ratio = prize / t.price;
    const topSym = tk.winSym === t.symbols.length - 1;
    if (ratio >= 50 || topSym) {
      // Premio legendario
      Sound.jackpot();
      FX.flash('#fff6c2');
      FX.shake();
      FX.fireworks(8);
      FX.confetti(260);
      FX.coins(cx, cy, 80);
      banner('¡PREMIO LEGENDARIO!', '#b388ff');
      setTimeout(() => {
        modal({
          cls: 'jackpot',
          icon: t.symbols[tk.winSym].e,
          title: '¡JACKPOT!',
          html: `<p>Boleto ${t.name} · ${t.symbols[tk.winSym].e}×3${tk.mult > 1 ? ` · ×${tk.mult}` : ''}</p>
            <div class="jp-amount"><span class="coin-ico lg"></span><span id="jp-count">0</span></div>
            <p>Probabilidad de este premio: muy, muy baja.</p>`,
          buttons: [{ label: '¡Increíble!', cls: 'btn btn-pink' }],
          onShow: (m) => countUp(m.querySelector('#jp-count'), prize, 2000),
        });
      }, 1200);
    } else if (ratio >= 5 || (prize >= 1000 && ratio >= 2)) {
      Sound.bigWin();
      FX.flash('#ffe48a');
      FX.confetti(130);
      FX.coins(cx, cy, 45);
      banner('¡GRAN PREMIO!', '#ffcf3f');
    } else {
      Sound.win();
      FX.coins(cx, cy, Math.min(30, 8 + Math.round(ratio * 6)));
      FX.burst(cx, cy, 25);
    }
  }

  function countUp(el, to, dur) {
    const t0 = performance.now();
    const step = (now) => {
      const k = Math.min(1, (now - t0) / dur);
      el.textContent = fmt(to * (1 - Math.pow(1 - k, 3)));
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  function renderPlayActions(t) {
    const same = S.inventory.filter((x) => x.tier === t.id);
    const acts = [];
    if (same.length) acts.push(`<button class="btn" data-next="${same[0].id}">Siguiente ${t.name} (${same.length}) →</button>`);
    else if (S.inventory.length) acts.push(`<button class="btn" data-next="${S.inventory[0].id}">Siguiente boleto (${S.inventory.length}) →</button>`);
    const canBuy = S.coins >= ticketPrice(t) && S.level >= t.level && playsOk(1) && specialAvailable(t, 1);
    acts.push(`<button class="btn ${same.length ? 'btn-ghost' : 'btn-pink'}" data-again="${t.id}" ${canBuy ? '' : 'disabled'}>Comprar otro · ${fmt(ticketPrice(t))}</button>`);
    acts.push(`<button class="btn btn-ghost" data-go="shop">Tienda</button>`);
    $('play-actions').innerHTML = acts.join('');
  }

  $('play-actions').addEventListener('click', (e) => {
    const n = e.target.closest('[data-next]');
    if (n) {
      Sound.click();
      return openTicket(+n.dataset.next);
    }
    const a = e.target.closest('[data-again]');
    if (a && !a.disabled) buy(a.dataset.again, 1, a);
  });

  /* ---------- Inventario ---------- */
  function renderInventory() {
    if (!S.inventory.length) {
      $('inv-list').innerHTML = `<div class="card empty">No tienes boletos sin rascar.<br><br><button class="btn" data-go="shop">🛒 Ir a la tienda</button></div>`;
      return;
    }
    $('inv-list').innerHTML = TIERS.concat(SPECIAL_TIERS).filter((t) => S.inventory.some((x) => x.tier === t.id))
      .map((t) => {
        const list = S.inventory.filter((x) => x.tier === t.id);
        return `<div class="inv-group">
          <div class="inv-thumb mt-${t.id}"${t.secret || t.limited ? ` style="background:linear-gradient(135deg,${t.cover.colors[0]},${t.cover.colors[1]})"` : ''}>${t.secret ? '🕵️' : t.limited ? t.icon : '🎟️'}</div>
          <div class="grow"><b>${t.name}${t.secret ? ' <span class="chip inv-tag">SECRETO</span>' : t.limited ? ' <span class="chip inv-tag">EDICIÓN LIMITADA</span>' : ''}</b><span class="muted small">${list.length} boleto${list.length > 1 ? 's' : ''} · premio máx. ${fmtShort(tierMath(t).maxPrize)}</span></div>
          <div class="inv-actions">${sk('bulk') && list.length > 1 ? `<button class="btn btn-ghost" data-bulk="${t.id}">🚀 Rascar todos</button>` : ''}<button class="btn" data-open="${list[0].id}">Rascar</button></div>
        </div>`;
      })
      .join('');
  }
  renderers.inventory = renderInventory;
  $('inv-list').addEventListener('click', (e) => {
    const bulk = e.target.closest('[data-bulk]');
    if (bulk) return bulkScratch(bulk.dataset.bulk, bulk);
    const b = e.target.closest('[data-open]');
    if (b) {
      Sound.click();
      openTicket(+b.dataset.open);
    }
  });

  /* ---------- Rascado en lote (habilidad) ---------- */
  function bulkScratch(tierId, srcEl) {
    if (!sk('bulk')) return;
    Sound.unlock();
    const t = PRODUCT_BY_ID[tierId];
    const list = S.inventory.filter((x) => x.tier === tierId);
    if (!list.length) return;
    resolveMany(t, list, srcEl, '🚀', `${list.length} boletos ${t.name} rascados`);
    renderInventory();
  }

  /** Cobra varias partidas de golpe y muestra un resumen. */
  function resolveMany(t, list, srcEl, icon, title) {
    let total = 0, refunds = 0, xp = 0, best = null;
    const wins = [];
    list.forEach((tk) => {
      const r = resolveTicket(tk);
      if (!r) return;
      total += r.payout;
      refunds += r.refund + r.consolation;
      xp += r.xpGain;
      if (r.payout) {
        wins.push({ tk, payout: r.payout });
        if (!best || r.payout > best.payout) best = { tk, payout: r.payout };
      }
    });
    checkAchievements();
    save();
    const rect = (srcEl || document.body).getBoundingClientRect();
    const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
    const bigRatio = best ? best.payout / t.price : 0;
    if (bigRatio >= 50) { Sound.jackpot(); FX.flash('#fff6c2'); FX.shake(); FX.fireworks(6); FX.confetti(200); }
    else if (bigRatio >= 5) { Sound.bigWin(); FX.confetti(110); }
    else if (best) Sound.win();
    else Sound.lose();
    if (total) FX.coins(cx, cy, Math.min(80, 10 + wins.length * 4));
    wins.sort((a, b) => b.payout - a.payout);
    modal({
      icon,
      title,
      html: `<p>${wins.length} con premio · +${fmt(xp)} XP</p>
        <div class="jp-amount"><span class="coin-ico lg"></span>+${fmt(total)}</div>
        ${refunds ? `<p>🛟 Reembolsos y consolación: +${fmt(refunds)}</p>` : ''}
        <div class="bulk-wins">${wins.slice(0, 12).map((w) => `<span>${t.symbols[w.tk.winSym].e} ${fmtShort(w.payout)}${w.tk.golden ? ' ✨' : ''}${w.tk.wild ? ' 🃏' : ''}</span>`).join('')}${wins.length > 12 ? `<span>+${wins.length - 12} más</span>` : ''}</div>`,
      buttons: [{ label: '¡Genial!', cls: 'btn' }],
    });
    refreshHeader(true);
    checkBankrupt(800);
  }

  /* ---------- Juegos sin rascar: máquinas y cajas ---------- */
  const gameRun = { tk: null, done: true, timers: [] };
  const symE = (g, i) => (i === WILD ? '🃏' : g.symbols[i].e);
  const BOX_LID = { boxes1: '🎁', boxes2: '🧰' };

  function playGame(gameId, qty, srcEl) {
    Sound.unlock();
    const g = GAME_BY_ID[gameId];
    if (gameRun.tk && !gameRun.done) return; // hay una partida en curso
    if (S.level < g.level) return;
    if (qty > 1 && !sk('multi')) return;
    const unit = ticketPrice(g);
    const cost = unit * qty;
    if (!playsOk(qty)) {
      Sound.error();
      toast('🌙', `No te quedan jugadas suficientes hoy (${S.day.plays}).`);
      return;
    }
    if (S.coins < cost) {
      Sound.error();
      toast('💸', 'No tienes monedas suficientes.');
      return;
    }
    S.day.plays -= qty;
    S.coins -= cost;
    S.stats.spent += cost;
    S.stats.bought += qty;
    S.stats.perTier[g.id].bought += qty;
    S.stats.perTier[g.id].spent += cost;
    contributeJackpot(cost);
    const rounds = [];
    for (let i = 0; i < qty; i++) {
      const tk = makeRound(g.id);
      tk.paid = unit;
      tk.id = S.serial++;
      rounds.push(tk);
    }
    Sound.buy();
    if (qty > 1) {
      resolveMany(g, rounds, srcEl, g.icon, `${qty} partidas de ${g.name}`);
      if (current === 'shop') renderShop();
      if (current === 'game') renderGameActions(g);
      return;
    }
    // Se guarda como pendiente: si se cierra la página a mitad, se cobra al volver
    S.pendingRound = rounds[0];
    save();
    refreshHeader(true);
    startGame(g, rounds[0]);
  }

  function startGame(g, tk) {
    gameRun.timers.forEach(clearTimeout);
    gameRun.timers = [];
    gameRun.tk = tk;
    gameRun.g = g;
    gameRun.done = false;
    gameRun.opened = [false, false, false];
    if (current !== 'game') go('game');
    const holder = $('game-holder');
    const pay = g.symbols.map((x) => `<span>${x.e}×3 ${fmtShort(x.v)}</span>`).join('');
    $('game-result').className = 'result';
    $('game-actions').innerHTML = '';
    if (g.kind === 'slot') {
      holder.innerHTML = `<div class="machine mg-${g.id}">
        <div class="m-title">${g.icon} ${g.name}</div>
        <div class="reels">${[0, 1, 2].map((i) => `<div class="reel" data-i="${i}"><div class="reel-sym">${g.symbols[(Math.random() * g.symbols.length) | 0].e}</div></div>`).join('')}</div>
        <div class="m-pay">${pay}</div>
      </div>`;
      $('game-result').innerHTML = '<div class="hint">🎰 ¡Girando!</div>';
      spinReels(g, tk);
    } else {
      holder.innerHTML = `<div class="machine mg-${g.id}">
        <div class="m-title">${g.icon} ${g.name}</div>
        <div class="boxes">${[0, 1, 2].map((i) => `<button class="gbox" data-box="${i}"><span class="lid">${BOX_LID[g.id] || '🎁'}</span><span class="content">${symE(g, tk.cells[i])}</span></button>`).join('')}</div>
        <div class="m-pay">${pay}</div>
      </div>`;
      $('game-result').innerHTML = '<div class="hint">👆 Toca cada caja para abrirla</div>';
      $('game-actions').innerHTML = '<button class="btn btn-ghost" data-openall>Abrir todas</button>';
    }
    renderBoosts();
  }
  renderers.game = () => renderBoosts();

  function spinReels(g, tk) {
    const reels = Array.from(document.querySelectorAll('#game-holder .reel'));
    const stops = [800, 1250, 1700];
    // Suspense: si los dos primeros coinciden, el tercero tarda más
    const firstTwo = tk.cells[0] === tk.cells[1] || tk.cells[0] === WILD || tk.cells[1] === WILD;
    if (firstTwo) stops[2] = 2500;
    reels.forEach((reel, i) => {
      reel.classList.add('spinning');
      const el = reel.querySelector('.reel-sym');
      const iv = setInterval(() => (el.textContent = g.symbols[(Math.random() * g.symbols.length) | 0].e), 70);
      gameRun.timers.push(setTimeout(() => {
        clearInterval(iv);
        reel.classList.remove('spinning');
        reel.classList.add('stopped');
        el.textContent = symE(g, tk.cells[i]);
        Sound.reveal(i * 3);
        if (i === 1 && firstTwo) reels.slice(0, 2).forEach((r) => r.classList.add('hot'));
        if (i === 2) finishGame(false);
      }, stops[i]));
      gameRun.timers.push(iv);
    });
  }

  function openBox(i) {
    if (gameRun.done || gameRun.opened[i]) return;
    const g = gameRun.g, tk = gameRun.tk;
    gameRun.opened[i] = true;
    const box = document.querySelector(`#game-holder .gbox[data-box="${i}"]`);
    box.classList.add('opening');
    gameRun.timers.push(setTimeout(() => {
      box.classList.remove('opening');
      box.classList.add('open');
      Sound.reveal(i * 3);
      const r = box.getBoundingClientRect();
      FX.sparkle(r.left + r.width / 2, r.top + r.height / 2, 6);
      // Pareja abierta: se ilumina
      const openIdx = [0, 1, 2].filter((j) => gameRun.opened[j] && document.querySelector(`#game-holder .gbox[data-box="${j}"]`).classList.contains('open'));
      const vals = openIdx.map((j) => tk.cells[j]);
      openIdx.forEach((j) => {
        const same = vals.filter((v) => v === tk.cells[j] || v === WILD || tk.cells[j] === WILD).length;
        if (same >= 2) document.querySelector(`#game-holder .gbox[data-box="${j}"]`).classList.add('hot');
      });
      if (openIdx.length === 3) finishGame(false);
    }, 380));
  }

  document.addEventListener('click', (e) => {
    const b = e.target.closest('#game-holder [data-box]');
    if (b) return openBox(+b.dataset.box);
    if (e.target.closest('[data-openall]')) {
      [0, 1, 2].forEach((i, k) => gameRun.timers.push(setTimeout(() => openBox(i), k * 260)));
    }
  });

  /** Termina la partida en curso. `silent` = se cobra sin animación (al salir de la pantalla). */
  function finishGame(silent) {
    if (gameRun.done || !gameRun.tk) return;
    gameRun.done = true;
    gameRun.timers.forEach((t) => { clearTimeout(t); clearInterval(t); });
    gameRun.timers = [];
    const g = gameRun.g, tk = gameRun.tk;
    S.pendingRound = null;
    const r = resolveTicket(tk);
    checkAchievements();
    save();
    if (silent) {
      if (r.payout) toast(g.icon, `<b>${g.name}</b><br>Partida cobrada: +${fmt(r.payout)}`);
      refreshHeader(true);
      checkBankrupt(800);
      return;
    }
    const holder = $('game-holder');
    const machine = holder.querySelector('.machine');
    const parts = holder.querySelectorAll(g.kind === 'slot' ? '.reel' : '.gbox');
    parts.forEach((p, i) => {
      p.classList.remove('hot');
      if (r.payout && (tk.cells[i] === tk.winSym || tk.cells[i] === WILD)) p.classList.add('win');
      if (g.kind === 'boxes') p.classList.add('open');
    });
    machine.classList.add(r.payout ? 'won' : 'lost');
    celebrate(tk, g, machine, r.payout);
    const res = $('game-result');
    if (r.payout) {
      res.className = 'result win';
      res.innerHTML = `<div class="r-title">¡Has ganado ${fmt(r.payout)} monedas!</div>
        <div class="r-sub">${symE(g, tk.winSym)} ×3 · +${r.xpGain} XP</div>${resultExtras(tk, r)}`;
    } else {
      res.className = 'result';
      res.innerHTML = `<div class="r-title">${tk.pair ? '¡Casi! Dos iguales' : 'Sin premio esta vez'}</div>
        <div class="r-sub">¡La suerte cambia! · +${r.xpGain} XP</div>${resultExtras(tk, r)}`;
    }
    setTimeout(() => refreshHeader(true), r.payout ? 450 : 0);
    renderGameActions(g);
    checkBankrupt(1800);
  }

  function renderGameActions(g) {
    const price = ticketPrice(g);
    const acts = [`<button class="btn btn-pink" data-replay="${g.id}" data-q="1" ${S.coins >= price && playsOk(1) ? '' : 'disabled'}>${g.kind === 'slot' ? '🎰 Tirar otra vez' : '🎁 Otra partida'} · ${fmt(price)}</button>`];
    if (sk('multi')) {
      acts.push(`<button class="btn btn-ghost" data-replay="${g.id}" data-q="5" ${S.coins >= price * 5 && playsOk(5) ? '' : 'disabled'}>×5 · ${fmtShort(price * 5)}</button>`);
      acts.push(`<button class="btn btn-ghost" data-replay="${g.id}" data-q="10" ${S.coins >= price * 10 && playsOk(10) ? '' : 'disabled'}>×10 · ${fmtShort(price * 10)}</button>`);
    }
    acts.push('<button class="btn btn-ghost" data-shoptab="games">Juegos</button>');
    $('game-actions').innerHTML = acts.join('');
  }
  $('game-actions').addEventListener('click', (e) => {
    const b = e.target.closest('[data-replay]');
    if (b && !b.disabled) playGame(b.dataset.replay, +b.dataset.q, b);
  });

  /* =========================================================
     Boletos secretos y eventos de edición limitada
     ========================================================= */
  const fmtLeft = (ms) => {
    const sec = Math.max(0, Math.ceil(ms / 1000));
    if (sec < 60) return sec + ' s';
    const m = Math.floor(sec / 60), h = Math.floor(m / 60), d = Math.floor(h / 24);
    if (d) return `${d} d ${h % 24} h`;
    if (h) return `${h} h ${m % 60} min`;
    return `${m} min ${sec % 60} s`;
  };
  const secretActive = () => !!(S.secret.tier && S.secret.until > Date.now() && S.secret.left > 0);

  function specialAvailable(t, qty) {
    if (t.secret) return secretActive() && S.secret.tier === t.id && S.secret.left >= qty;
    if (t.limited) {
      const ev = eventAt(Date.now());
      return ev.active && ev.event.id === t.event;
    }
    return true;
  }

  function renderSpecials() {
    const now = Date.now();
    let html = '';
    // Boleto secreto
    if (secretActive()) {
      const t = PRODUCT_BY_ID[S.secret.tier];
      const m = tierMath(t);
      const price = ticketPrice(t);
      const q = (n) => `<button class="btn ${n === 1 ? '' : 'btn-ghost'}" data-buy="${t.id}" data-q="${n}" ${S.coins < price * n || !playsOk(n) ? 'disabled' : ''}>${n === 1 ? 'Comprar' : '×' + n}<small>${fmtShort(price * n)}</small></button>`;
      html += `<div class="shop-card special-card secret-card">
        <div class="special-head"><span class="sp-tag">🕵️ BOLETO SECRETO</span><span class="sp-timer" data-countdown="secret">${fmtLeft(S.secret.until - now)}</span></div>
        <div class="shop-body">
          <div class="mini-ticket" style="background:linear-gradient(135deg,${t.cover.colors[0]},${t.cover.colors[1]});color:${t.cover.ink}"><div class="mt-kind">SECRETO</div><div class="mt-name">${t.name}</div><div class="mt-syms">${t.symbols.slice(-3).map((x) => x.e).join('')}</div></div>
          <div class="muted small">${t.tagline}. Premios que no existen en ningún otro boleto · quedan ${S.secret.left}</div>
          <div class="shop-info">
            <div class="si"><small>Precio</small><b><span class="coin-ico"></span> ${fmt(price)}</b></div>
            <div class="si"><small>Premio máximo</small><b>${fmtShort(m.maxPrize)}</b></div>
            <div class="si"><small>Probabilidad de premio</small><b>1 de ${fmtOdds(m.oddsWin)}</b></div>
            <div class="si"><small>Retorno</small><b>${Math.round(m.rtp * 100)} %</b></div>
          </div>
          <div class="buy-row two">${q(1)}${S.secret.left > 1 ? q(S.secret.left) : ''}</div>
        </div>
      </div>`;
    }
    // Evento
    const ev = eventAt(now);
    if (ev.active) {
      const t = LIMITED_TIERS.find((x) => x.event === ev.event.id);
      const m = tierMath(t);
      const locked = S.level < t.level;
      const price = ticketPrice(t);
      const q = (n, label) => `<button class="btn ${n === 1 ? '' : 'btn-ghost'}" data-buy="${t.id}" data-q="${n}" ${locked || S.coins < price * n || !playsOk(n) ? 'disabled' : ''}>${label}<small>${fmtShort(price * n)}</small></button>`;
      html += `<div class="shop-card special-card event-card ${locked ? 'locked' : ''}" style="--ev1:${ev.event.colors[0]};--ev2:${ev.event.colors[1]}">
        ${locked ? `<div class="lock-overlay"><span>🔒</span>Los boletos de evento se desbloquean en el nivel ${t.level}</div>` : ''}
        <div class="special-head"><span class="sp-tag">${ev.event.icon} EVENTO · EDICIÓN LIMITADA</span><span class="sp-timer">termina en <b data-countdown="event">${fmtLeft(ev.end - now)}</b></span></div>
        <div class="shop-body">
          <div class="mini-ticket" style="background:linear-gradient(135deg,${ev.event.colors[0]},${ev.event.colors[1]})"><div class="mt-kind">EDICIÓN LIMITADA</div><div class="mt-name">${ev.event.icon} ${t.name}</div><div class="mt-syms">${t.symbols.slice(-3).map((x) => x.e).join('')}</div></div>
          <div class="muted small">Símbolos y premios exclusivos de este evento. Cuando termine, desaparece de la tienda.</div>
          <div class="shop-info">
            <div class="si"><small>Precio</small><b><span class="coin-ico"></span> ${fmt(price)}${price < t.price ? ` <s class="muted small">${fmt(t.price)}</s>` : ''}</b></div>
            <div class="si"><small>Premio máximo</small><b>${fmtShort(m.maxPrize)}</b></div>
            <div class="si"><small>Probabilidad de premio</small><b>1 de ${fmtOdds(m.oddsWin)}</b></div>
            <div class="si"><small>Prob. premio máximo</small><b>1 de ${fmt(Math.round(m.oddsTop))}</b></div>
          </div>
          <div class="buy-row">${q(1, 'Comprar')}${q(5, '×5')}${q(10, '×10')}</div>
        </div>
      </div>`;
    } else {
      html += `<div class="shop-card special-card next-event">
        <div class="special-head"><span class="sp-tag">📅 PRÓXIMO EVENTO</span><span class="sp-timer">empieza en <b data-countdown="event">${fmtLeft(ev.start - now)}</b></span></div>
        <div class="next-ev-body"><span class="next-ev-ico">${ev.event.icon}</span><div><b>${ev.event.name}</b><small class="muted">Traerá un boleto de edición limitada con premios exclusivos durante 2 días.</small></div></div>
      </div>`;
    }
    return html;
  }

  /** Se llama cada segundo: aparición de secretos, cambios de evento y cuentas atrás. */
  function tickSpecials() {
    const now = Date.now();
    let changed = false;
    // Boleto secreto: desaparece al acabar el tiempo o agotarse
    if (S.secret.tier && (S.secret.until <= now || S.secret.left <= 0)) {
      S.secret = { nextAt: now + (180 + Math.random() * 300) * 1000, tier: null, until: 0, left: 0 };
      changed = true;
    }
    if (!S.secret.tier && !S.secret.nextAt) {
      S.secret.nextAt = now + (60 + Math.random() * 90) * 1000; // el primero llega pronto
      changed = true;
    }
    if (!S.secret.tier && now >= S.secret.nextAt) {
      const pool = SECRET_TIERS.filter((t) => S.level >= t.level);
      const t = pool[Math.floor(Math.random() * pool.length)];
      S.secret = { nextAt: 0, tier: t.id, until: now + 45000, left: 3 };
      changed = true;
      Sound.achievement();
      toast('🕵️', `<b>¡Boleto secreto!</b><br>«${t.name}» está en la tienda durante 45 s`, 5000);
    }
    // Evento nuevo
    const ev = eventAt(now);
    const evKey = ev.active ? ev.event.id + '@' + ev.start : null;
    if (evKey !== S.lastEventSeen) {
      if (evKey && S.lastEventSeen !== null) toast(ev.event.icon, `<b>¡Nuevo evento!</b><br>${ev.event.name}: boleto de edición limitada en la tienda`, 5000);
      S.lastEventSeen = evKey;
      changed = true;
    }
    if (changed) {
      save();
      if (current === 'shop' && shopTab === 'tickets') renderShop();
    } else if (current === 'shop') {
      document.querySelectorAll('[data-countdown="secret"]').forEach((el) => (el.textContent = fmtLeft(S.secret.until - now)));
      document.querySelectorAll('[data-countdown="event"]').forEach((el) => (el.textContent = fmtLeft((ev.active ? ev.end : ev.start) - now)));
    }
    document.querySelector('.bottomnav [data-go="shop"]').classList.toggle('secret-alert', secretActive());
  }

  /* =========================================================
     Jackpot mundial
     - En claude.ai: bote compartido entre todos los jugadores (capacidad db).
       Cada jugador escribe solo su aportación (jpc/<id>); el bote es la suma.
       Para cobrarlo se toma un bloqueo corto sobre jackpot/state.
     - Fuera de claude.ai: "modo local" con la misma mecánica en este navegador.
     ========================================================= */
  const JP = { db: null, user: null, uid: null, online: false, loading: true, state: null, contribs: {}, pending: 0, writing: false, flushTimer: null, names: {} };
  const defaultJpState = () => ({ round: 1, startedAt: JACKPOT.epoch, base: JACKPOT.base, lastWin: null, winners: [] });

  function jackpotPot() {
    const now = Date.now();
    if (JP.online) {
      const st = JP.state || defaultJpState();
      let sum = 0;
      Object.values(JP.contribs).forEach((c) => { if (c && c.round === st.round) sum += Number(c.amount) || 0; });
      if (JP.pending) sum += JP.pending;
      return Math.floor((st.base || JACKPOT.base) + Math.max(0, now - st.startedAt) / 60000 * JACKPOT.perMinute + sum);
    }
    const L = S.jpLocal;
    return Math.floor(JACKPOT.base + Math.max(0, now - L.startedAt) / 60000 * JACKPOT.perMinute + L.contrib);
  }

  function contributeJackpot(cost) {
    const amt = Math.round(cost * JACKPOT.contribution * 100) / 100;
    if (!JP.online) {
      S.jpLocal.contrib += amt;
      return;
    }
    JP.pending += amt;
    clearTimeout(JP.flushTimer);
    JP.flushTimer = setTimeout(flushContribution, 2500); // agrupa varias jugadas en una escritura
  }

  async function flushContribution() {
    if (!JP.online || JP.writing || !JP.pending) return;
    JP.writing = true;
    const round = (JP.state || defaultJpState()).round;
    const mine = JP.contribs[JP.uid];
    const prev = mine && mine.round === round ? Number(mine.amount) || 0 : 0;
    const add = JP.pending;
    JP.pending = 0;
    try {
      await JP.db.doc('jpc/' + JP.uid).set({ round, amount: Math.round((prev + add) * 100) / 100 });
    } catch (e) {
      JP.pending += add; // se reintenta con la siguiente jugada
    }
    JP.writing = false;
    if (JP.pending) JP.flushTimer = setTimeout(flushContribution, 2500);
  }

  async function initJackpot() {
    try {
      if (!window.claude || typeof window.claude.use !== 'function') throw new Error('sin runtime');
      const [db, user] = await Promise.all([window.claude.use('db'), window.claude.use('user')]);
      if (!db || !user) throw new Error('sin db');
      const uid = await user.id();
      if (!uid) throw new Error('sin id');
      JP.db = db;
      JP.user = user;
      JP.uid = uid;
      JP.online = true;
      const loadTimer = setTimeout(() => { JP.loading = false; renderJackpot(); }, 10000);
      db.doc('jackpot/state').onSnapshot(
        (snap) => {
          JP.state = snap.exists ? Object.assign(defaultJpState(), snap.data()) : defaultJpState();
          if (!snap.metadata.fromCache) { JP.loading = false; clearTimeout(loadTimer); }
          renderJackpot();
        },
        () => { JP.loading = false; renderJackpot(); }
      );
      db.collection('jpc').onSnapshot(
        (qs) => {
          const c = {};
          qs.docs.forEach((d) => (c[d.id] = d.data()));
          JP.contribs = c;
          renderJackpot();
        },
        () => {}
      );
    } catch (e) {
      JP.online = false;
      JP.loading = false;
    }
    renderJackpot();
  }

  async function claimOnline() {
    const ref = JP.db.doc('jackpot/state');
    for (let attempt = 0; attempt < 6; attempt++) {
      try {
        const lease = await ref.acquire({ holder: JP.uid, ttlMs: 8000 });
        if (lease.acquired) {
          await flushContribution();
          const snap = await ref.get();
          const st = snap.exists ? Object.assign(defaultJpState(), snap.data()) : defaultJpState();
          JP.state = st;
          const amount = jackpotPot();
          const win = { amount, at: Date.now(), by: JP.uid };
          await ref.set({
            round: st.round + 1, startedAt: Date.now(), base: JACKPOT.base, lastWin: win,
            winners: [win].concat(st.winners || []).slice(0, 5),
          });
          return amount;
        }
      } catch (e) { /* se reintenta */ }
      await new Promise((r) => setTimeout(r, 900 + Math.random() * 600));
    }
    return null;
  }

  async function winJackpot(t) {
    let amount = null;
    if (JP.online) amount = await claimOnline();
    if (amount === null) {
      // Modo local (o el bote compartido no respondió): se cobra el bote local
      amount = Math.floor(JACKPOT.base + Math.max(0, Date.now() - S.jpLocal.startedAt) / 60000 * JACKPOT.perMinute + S.jpLocal.contrib);
      S.jpLocal = { round: S.jpLocal.round + 1, startedAt: Date.now(), contrib: 0, lastWin: { amount, at: Date.now() } };
    }
    S.coins += amount;
    S.stats.won += amount;
    S.stats.jackpots++;
    if (amount > S.stats.biggestWin) { S.stats.biggestWin = amount; S.stats.biggestTier = t.id; }
    notePeak();
    checkAchievements();
    save();
    Sound.jackpot();
    FX.flash('#b9f6ff');
    FX.shake();
    FX.fireworks(10);
    FX.confetti(300);
    FX.coins(window.innerWidth / 2, window.innerHeight / 2, 100);
    banner('¡JACKPOT MUNDIAL!', '#4cc9f0');
    modal({
      cls: 'jackpot world',
      icon: '🌍',
      title: '¡JACKPOT MUNDIAL!',
      html: `<p>Tu ${GAME_BY_ID[t.id] ? 'partida de' : 'boleto'} ${esc(t.name)} se ha llevado el bote${JP.online ? ' que comparten todos los jugadores' : ''}.</p>
        <div class="jp-amount"><span class="coin-ico lg"></span><span id="jp-count">0</span></div>`,
      buttons: [{ label: '¡INCREÍBLE!', cls: 'btn btn-pink' }],
      onShow: (m) => countUp(m.querySelector('#jp-count'), amount, 2500),
    });
    refreshHeader(true);
  }

  function renderJackpot() {
    const pot = jackpotPot();
    let sub;
    if (JP.online && JP.loading) sub = 'Conectando con el bote mundial…';
    else if (JP.online) {
      const lw = JP.state && JP.state.lastWin;
      const players = Object.values(JP.contribs).filter((c) => c && JP.state && c.round === JP.state.round).length;
      sub = lw
        ? `Último ganador: ${lw.by === JP.uid ? '¡tú!' : esc(JP.names[lw.by] || 'un jugador')} · ${fmtShort(lw.amount)} · ${timeAgo(lw.at)}`
        : 'Nadie lo ha ganado todavía';
      if (players) sub += ` · ${players} jugador${players === 1 ? '' : 'es'} aportando`;
      if (lw && lw.by !== JP.uid && !JP.names[lw.by] && JP.user && JP.user.profiles) {
        JP.names[lw.by] = '';
        JP.user.profiles([lw.by]).then((ps) => { const p = ps && ps[lw.by]; if (p && p.name) { JP.names[lw.by] = p.name; renderJackpot(); } }).catch(() => {});
      }
    } else {
      const lw = S.jpLocal.lastWin;
      sub = 'Modo local: abre el juego en claude.ai para jugar por el bote compartido' + (lw ? ` · último: ${fmtShort(lw.amount)}` : '');
    }
    document.querySelectorAll('.jp-value').forEach((el) => (el.textContent = fmt(pot)));
    document.querySelectorAll('.jp-subline').forEach((el) => (el.innerHTML = sub));
    document.querySelectorAll('.jp-mode').forEach((el) => (el.textContent = JP.online ? '🌍 JACKPOT MUNDIAL' : '🌍 JACKPOT (MODO LOCAL)'));
  }

  /* =========================================================
     Premios extremadamente raros: una animación distinta para cada nivel
     ========================================================= */
  function playRareEvent(level, amount, t) {
    const ev = RARE_EVENTS[level];
    rareShowing = true;
    const ov = document.createElement('div');
    ov.className = `rare-overlay rare-${ev.id}`;
    ov.innerHTML = `<div class="ro-dot"></div><div class="ro-count"></div>
      <div class="ro-card">
        <div class="ro-icon">${ev.icon}</div>
        <div class="ro-odds">1 entre ${fmt(ev.odds)}</div>
        <div class="ro-title">¡${ev.name.toUpperCase()}!</div>
        <div class="ro-amount"><span class="coin-ico lg"></span><span class="ro-num">0</span></div>
        <div class="ro-sub">Un acontecimiento en tu ${GAME_BY_ID[t.id] ? 'partida de' : 'boleto'} ${esc(t.name)} (×${fmt(ev.mult)} su precio)</div>
        <button class="btn btn-pink ro-close">¡INCREÍBLE!</button>
      </div>`;
    document.body.appendChild(ov);
    requestAnimationFrame(() => ov.classList.add('on'));
    Sound.rare(level);
    const at = (ms, fn) => setTimeout(fn, ms);
    const cx = window.innerWidth / 2, cy = window.innerHeight / 2;
    const reveal = (ms, countMs) => at(ms, () => {
      ov.classList.add('reveal');
      countUp(ov.querySelector('.ro-num'), amount, countMs);
    });
    if (level === 0) {
      // 🌠 Estrella fugaz: lluvia de estrellas fugaces sobre un cielo nocturno
      FX.shootingStars(16, 110);
      at(900, () => FX.sparkle(cx, cy, 30, '#bff7ff'));
      reveal(700, 1200);
    } else if (level === 1) {
      // 💰 Lluvia de oro: la pantalla se oscurece y caen monedas sin parar
      FX.goldRain(4.5);
      at(300, () => FX.flash('#ffe48a'));
      at(500, () => FX.coins(cx, cy, 60));
      reveal(900, 1800);
    } else if (level === 2) {
      // 💥 Supernova: apagón, un punto de luz crece y estalla con ondas expansivas
      at(850, () => {
        ov.classList.add('boom');
        FX.flash('#ffffff');
        FX.shake();
        FX.shockwave(cx, cy, '#ffffff', 3);
        FX.shockwave(cx, cy, '#ff8ab5', 2);
        FX.burst(cx, cy, 120);
        FX.confetti(200);
      });
      reveal(1500, 2200);
    } else {
      // 🌌 Big Bang: salto a velocidad luz, cuenta atrás y explosión de todos los colores
      FX.warp(4.2);
      const cnt = ov.querySelector('.ro-count');
      [['3', 1200], ['2', 2200], ['1', 3200]].forEach(([n, ms]) => at(ms, () => {
        cnt.textContent = n;
        cnt.classList.remove('pop');
        void cnt.offsetWidth;
        cnt.classList.add('pop');
      }));
      at(4200, () => {
        cnt.textContent = '';
        ov.classList.add('boom');
        FX.flash('#ffffff');
        FX.shake();
        FX.shockwave(cx, cy, '#ffffff', 4);
        FX.shockwave(cx, cy, '#b388ff', 3);
        FX.fireworks(14);
        FX.confetti(400);
        FX.coins(cx, cy, 120);
      });
      at(5600, () => FX.shake());
      reveal(4700, 3000);
    }
    ov.querySelector('.ro-close').addEventListener('click', () => {
      Sound.click();
      ov.classList.remove('on');
      setTimeout(() => ov.remove(), 400);
      rareShowing = false;
      checkAchievements();
      save();
      refreshHeader(true);
      checkBankrupt(300);
    });
  }

  /* =========================================================
     Álbum de premios (se conserva siempre)
     ========================================================= */
  function renderAlbum() {
    const slots = albumSlots();
    const ap = albumProgress(S.album);
    $('album-progress').innerHTML = `<div class="dp-goal"><span>Premios descubiertos</span><b>${ap.got} / ${ap.total} · ${ap.pct} %</b></div>
      <div class="xp-bar wide dp-bar"><span style="width:${ap.pct}%"></span></div>`;
    const slot = (x) => {
      const n = S.album[x.key] || 0;
      if (x.rare) {
        return `<div class="al-slot rare ${n ? 'got' : ''}" style="--rc:${x.rare.color}">
          <span class="al-ico">${n ? x.rare.icon : '❔'}</span><b>${n ? x.rare.name : '???'}</b>
          <small>1 entre ${fmt(x.rare.odds)} · ×${fmt(x.rare.mult)}</small>${n ? `<em>×${n}</em>` : ''}</div>`;
      }
      return `<div class="al-slot ${n ? 'got' : ''}"><span class="al-ico">${n ? x.sym.e : '❔'}</span>
        <small>${n ? fmtShort(x.sym.v) : '???'}</small>${n ? `<em>×${n}</em>` : ''}</div>`;
    };
    const groups = [
      ['✨ Acontecimientos extremadamente raros', slots.filter((x) => x.rare), true],
    ];
    const byProduct = (list, label) => list.forEach((t) => groups.push([`${label} ${t.icon || ''} ${t.name}`, slots.filter((x) => x.product === t), false]));
    byProduct(TIERS, '🎟️');
    byProduct(SECRET_TIERS, '🕵️');
    byProduct(LIMITED_TIERS, '🎉');
    byProduct(GAMES, '🎰');
    $('album-list').innerHTML = groups.map(([title, list, isRare]) => {
      const got = list.filter((x) => (S.album[x.key] || 0) > 0).length;
      return `<div class="card al-group ${got === list.length ? 'complete' : ''}">
        <div class="al-head"><b>${title}</b><span class="${got === list.length ? 'al-done' : 'muted'}">${got === list.length ? '✔ Completo' : `${got}/${list.length}`}</span></div>
        <div class="al-grid ${isRare ? 'rare-grid' : ''}">${list.map(slot).join('')}</div>
      </div>`;
    }).join('');
  }
  renderers.album = renderAlbum;

  /* =========================================================
     Renacer: reinicia la partida a cambio de mejoras permanentes
     ========================================================= */
  const canPrestige = () => S.level >= PRESTIGE.minLevel(P());
  function prestigeBoostsText(p) {
    return `+${Math.round(p * PRESTIGE.prizeBonus * 100)} % premios · +${Math.round(p * PRESTIGE.xpBonus * 100)} % XP · +${fmt(p * PRESTIGE.startCoins)} monedas iniciales · +${p * PRESTIGE.extraPlays} jugada${p === 1 ? '' : 's'} al día`;
  }
  function renderPrestigeCard() {
    const el = $('prestige-card');
    const need = PRESTIGE.minLevel(P());
    const ready = canPrestige();
    el.classList.toggle('ready', ready);
    el.innerHTML = `<div class="mine-row"><span class="mine-ico">🌟</span>
      <div class="grow"><b>Renacer${P() ? ` · llevas ${P()}` : ''}</b>
        <small class="muted">${ready ? `¡Ya puedes renacer! Empezarás de cero con: ${prestigeBoostsText(P() + 1)}` : `Disponible en el nivel ${need} (te faltan ${need - S.level}).${P() ? ' Mejoras actuales: ' + prestigeBoostsText(P()) : ' Te da mejoras permanentes para siempre.'}`}</small>
        ${ready ? '' : `<div class="xp-bar wide mine-bar"><span style="width:${Math.min(100, (S.level / need) * 100)}%"></span></div>`}</div>
      ${ready ? '<button class="btn small-btn" data-prestige>🌟 Renacer</button>' : ''}</div>`;
  }
  document.addEventListener('click', (e) => {
    if (!e.target.closest('[data-prestige-info]')) return;
    Sound.click();
    const card = $('prestige-card');
    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    card.classList.remove('pulse');
    void card.offsetWidth;
    card.classList.add('pulse');
  });
  document.addEventListener('click', (e) => {
    if (!e.target.closest('[data-prestige]') || !canPrestige()) return;
    Sound.click();
    const next = P() + 1;
    modal({
      cls: 'prestige',
      icon: '🌟',
      title: `¿Renacer por ${next === 1 ? 'primera' : next + 'ª'} vez?`,
      html: `<p>Empezarás una partida nueva desde el día 1. <b>Pierdes</b> el saldo, el nivel, las habilidades, los objetos, la mina y los logros de esta partida.</p>
        <p><b>Conservas</b> el álbum, los récords y tus renacimientos, y ganas estas mejoras permanentes:</p>
        <div class="go-stats">
          <div class="go-row"><span>🍀 Premios</span><b>+${Math.round(next * PRESTIGE.prizeBonus * 100)} %</b></div>
          <div class="go-row"><span>📚 Experiencia</span><b>+${Math.round(next * PRESTIGE.xpBonus * 100)} %</b></div>
          <div class="go-row"><span>💰 Monedas iniciales</span><b>${fmt(DAYS.startCoins + next * PRESTIGE.startCoins)}</b></div>
          <div class="go-row"><span>🎟️ Jugadas extra al día</span><b>+${next * PRESTIGE.extraPlays}</b></div>
        </div>
        <p class="small">El siguiente renacimiento pedirá el nivel ${PRESTIGE.minLevel(next)}.</p>`,
      buttons: [
        { label: '🌟 Renacer', cls: 'btn', action: () => {
          resetRun(`🌟 ¡Has renacido! Renacimientos: ${next}`, { prestige: true });
          Sound.levelUp();
          FX.flash('#fff3b0');
          FX.confetti(160);
        } },
        { label: 'Todavía no', cls: 'btn btn-ghost' },
      ],
    });
  });

  /* ---------- Árbol de habilidades ---------- */
  function renderSkills() {
    const active = SKILLS.filter((k) => sk(k.id) > 0);
    $('skill-summary').innerHTML = active.length
      ? active.map((k) => `<span class="eff">${k.icon} ${k.fx(sk(k.id))}</span>`).join('')
      : '<span class="muted">Aún no tienes habilidades. ¡Invierte tus monedas para mejorar tu suerte!</span>';
    $('skill-tree').innerHTML = SKILL_BRANCHES.map((b) => {
      const nodes = SKILLS.filter((k) => k.branch === b.id).map((k) => {
        const st = skillState(k);
        const pips = Array.from({ length: k.max }, (_, i) => `<i class="${i < st.lvl ? 'on' : ''}"></i>`).join('');
        let action;
        if (st.state === 'maxed') action = '<div class="sn-max">✔ Nivel máximo</div>';
        else if (st.state === 'locked') action = `<div class="sn-lock">🔒 ${st.why}</div>`;
        else action = `<button class="btn ${st.state === 'available' ? '' : 'btn-ghost'}" data-skill="${k.id}" ${st.state === 'available' ? '' : 'disabled'}>${st.lvl ? 'Mejorar' : 'Comprar'} · <span class="coin-ico"></span> ${fmtShort(st.cost)}</button>`;
        return `<div class="skill-node s-${st.state}${st.lvl ? ' owned' : ''}" data-node="${k.id}">
          <div class="sn-ico">${k.icon}</div>
          <div class="sn-body">
            <div class="sn-top"><b>${k.name}</b><span class="pips">${pips}</span></div>
            <div class="sn-fx">${st.lvl ? `Ahora: ${k.fx(st.lvl)}` : k.fx(1)}</div>
            ${st.state !== 'maxed' && st.lvl ? `<div class="sn-next">Siguiente: ${k.fx(st.lvl + 1)}</div>` : ''}
            ${action}
          </div>
        </div>`;
      }).join('');
      const done = SKILLS.filter((k) => k.branch === b.id).reduce((a, k) => a + sk(k.id), 0);
      const max = SKILLS.filter((k) => k.branch === b.id).reduce((a, k) => a + k.max, 0);
      return `<div class="branch" style="--bc:${b.color}">
        <div class="branch-head"><span>${b.icon}</span><div><b>${b.name}</b><small>${b.desc} · ${done}/${max}</small></div></div>
        <div class="branch-nodes">${nodes}</div>
      </div>`;
    }).join('');
  }
  renderers.skills = renderSkills;

  $('skill-tree').addEventListener('click', (e) => {
    const b = e.target.closest('[data-skill]');
    if (!b || b.disabled) return;
    Sound.unlock();
    const k = SKILL_BY_ID[b.dataset.skill];
    const st = skillState(k);
    if (st.state !== 'available') {
      Sound.error();
      return;
    }
    const r = b.getBoundingClientRect();
    guardRuin(st.cost, () => {
      S.coins -= st.cost;
      S.stats.skillSpent += st.cost;
      S.skills[k.id] = st.lvl + 1;
      Sound.levelUp();
      FX.burst(r.left + r.width / 2, r.top + r.height / 2, 40, [SKILL_BRANCHES.find((x) => x.id === k.branch).color, '#ffffff', '#ffe48a']);
      toast(k.icon, `<b>${k.name} nivel ${st.lvl + 1}</b><br>${k.fx(st.lvl + 1)}`);
      checkAchievements();
      save();
      refreshHeader(true);
      renderSkills();
      const node = document.querySelector(`[data-node="${k.id}"]`);
      if (node) node.classList.add('just');
      checkBankrupt();
    });
  });

  /* ---------- Historial ---------- */
  let histFilter = 'all';
  function renderHistory() {
    const filters = [['all', 'Todos'], ['wins', 'Premios'], ['games', 'Juegos'], ['special', 'Especiales']].concat(TIERS.map((t) => [t.id, t.name]));
    $('hist-filter').innerHTML = filters.map(([id, n]) => `<button data-hf="${id}" class="${histFilter === id ? 'active' : ''}">${n}</button>`).join('');
    const list = S.history.filter((h) => histFilter === 'all' || (histFilter === 'wins' ? h.prize > 0 : histFilter === 'games' ? !!GAME_BY_ID[h.tier] : histFilter === 'special' ? SPECIAL_TIERS.some((t) => t.id === h.tier) : h.tier === histFilter));
    $('hist-list').innerHTML = list.length ? list.slice(0, 150).map(historyRow).join('') : '<li class="empty">Todavía no hay boletos rascados aquí.</li>';
  }
  renderers.history = renderHistory;
  $('hist-filter').addEventListener('click', (e) => {
    const b = e.target.closest('[data-hf]');
    if (!b) return;
    histFilter = b.dataset.hf;
    renderHistory();
  });

  /* ---------- Estadísticas ---------- */
  function renderStats() {
    const st = S.stats;
    const net = st.won - st.spent;
    const items = [
      ['Día actual', `${S.day.n} · objetivo ${fmt(S.day.target)}`],
      ['Saldo actual', fmt(S.coins)],
      ['Boletos rascados', fmt(st.scratched)],
      ['Monedas gastadas', fmt(st.spent)],
      ['Monedas ganadas en premios', fmt(st.won)],
      ['Balance de boletos', `<span class="${net >= 0 ? 'pos' : 'neg'}">${net >= 0 ? '+' : ''}${fmt(net)}</span>`],
      ['Bonus, niveles y logros', '+' + fmt(st.bonus)],
      ['Invertido en habilidades', fmt(st.skillSpent)],
      ['Partidas de juegos', fmt(st.games)],
      ['Ganado con la mina', fmt(st.mineEarned)],
      ['Gastado en objetos y mina', fmt(st.shopSpent)],
      ['Boletos premiados', st.scratched ? `${fmt(st.wins)} (${Math.round((st.wins / st.scratched) * 100)}%)` : '0'],
      ['Mayor premio', st.biggestWin ? fmt(st.biggestWin) + (st.biggestTier ? ` <span class="chip chip-${st.biggestTier}">${PRODUCT_BY_ID[st.biggestTier].name}</span>` : '') : '—'],
      ['Mejor racha', fmt(st.bestStreak)],
      ['Saldo máximo', fmt(st.peakCoins)],
      ['Retorno real', st.spent ? Math.round((st.won / st.spent) * 100) + '%' : '—'],
      ['Logros', `${Object.keys(S.achievements).length}/${ACHIEVEMENTS.length}`],
      ['Segundas vidas usadas', fmt(st.livesUsed)],
      ['Boletos secretos', fmt(st.secrets)],
      ['Eventos jugados', fmt(st.eventIds.length)],
      ['Jackpots ganados', fmt(st.jackpots)],
      ['Premios extremadamente raros', fmt(st.rares)],
    ];
    noteRecords();
    const rec = S.records;
    $('record-grid').innerHTML = [
      ['Partida nº', fmt(rec.runs)],
      ['Récord de días', fmt(Math.max(rec.bestDay || 1, S.day.n))],
      ['Renacimientos', fmt(P())],
      ['Récord de nivel', fmt(rec.bestLevel)],
      ['Récord de saldo', fmt(rec.bestCoins)],
      ['Récord de premio', rec.bestWin ? fmt(rec.bestWin) : '—'],
    ].map(([k, v]) => `<div class="stat"><small>${k}</small><b>${v}</b></div>`).join('');
    $('stat-grid').innerHTML = items.map(([k, v]) => `<div class="stat"><small>${k}</small><b>${v}</b></div>`).join('');

    $('tier-table').innerHTML =
      `<tr><th>Boleto / juego</th><th>Comprados</th><th>Jugados</th><th>Premiados</th><th>Gastado</th><th>Ganado</th><th>Retorno</th><th>Mejor</th></tr>` +
      TIERS.concat(SPECIAL_TIERS, GAMES).filter((t) => !t.limited || st.perTier[t.id].bought).map((t) => {
        const p = st.perTier[t.id];
        return `<tr><td><span class="chip chip-${t.id}">${t.name}</span></td><td>${fmt(p.bought)}</td><td>${fmt(p.scratched)}</td>
          <td>${p.scratched ? Math.round((p.wins / p.scratched) * 100) + '%' : '—'}</td><td>${fmt(p.spent)}</td><td>${fmt(p.won)}</td>
          <td>${p.spent ? Math.round((p.won / p.spent) * 100) + '%' : '—'}</td><td>${p.best ? fmt(p.best) : '—'}</td></tr>`;
      }).join('');

    $('odds-list').innerHTML = TIERS.concat(SECRET_TIERS, LIMITED_TIERS.slice(0, 1), GAMES).map((t) => {
      const m = tierMath(t);
      const rows = t.outcomes
        .slice()
        .sort((a, b) => t.symbols[a[0]].v * a[1] - t.symbols[b[0]].v * b[1])
        .map(([s, mu, p]) => `<div><span>${t.symbols[s].e}×3${mu > 1 ? ` ×${mu}` : ''} → ${fmtShort(t.symbols[s].v * mu)}</span><b>1 de ${fmtOdds(1 / p)}</b></div>`)
        .join('');
      return `<details class="odds-tier"><summary><span class="chip chip-${t.id}">${t.name}</span>
        <span class="muted small">premio 1 de ${fmtOdds(m.oddsWin)} · retorno teórico ${Math.round(m.rtp * 1000) / 10}%</span></summary>
        <div class="odds-rows">${rows}</div></details>`;
    }).join('');
  }
  renderers.stats = renderStats;

  $('reset-btn').addEventListener('click', () => {
    modal({
      icon: '⚠️',
      title: '¿Reiniciar partida?',
      html: '<p>Perderás tu saldo, nivel, boletos, habilidades, objetos, mina, historial y logros. Los récords se conservan.</p>',
      buttons: [
        {
          label: 'Sí, reiniciar',
          cls: 'btn btn-pink',
          action: () => resetRun('🔄 Partida reiniciada.'),
        },
        { label: 'Cancelar', cls: 'btn btn-ghost' },
      ],
    });
  });

  /* ---------- Logros ---------- */
  function renderAchievements() {
    $('ach-grid').innerHTML = ACHIEVEMENTS.map((a) => {
      const done = !!S.achievements[a.id];
      return `<div class="ach ${done ? 'done' : 'locked'}"><div class="a-ico">${a.icon}</div>
        <div><b>${a.name}</b><small>${a.desc}</small><div class="a-rew">${done ? '✔ Conseguido' : 'Recompensa: +' + fmt(a.reward)}</div></div></div>`;
    }).join('');
  }
  renderers.achievements = renderAchievements;

  /* ---------- Sonido ---------- */
  function renderSoundBtn() {
    $('sound-btn').textContent = S.sound ? '🔊' : '🔇';
    Sound.setEnabled(S.sound);
  }
  $('sound-btn').addEventListener('click', () => {
    S.sound = !S.sound;
    renderSoundBtn();
    Sound.unlock();
    Sound.click();
    save();
  });

  /* ---------- Arranque ---------- */
  let firstTime = true;
  try {
    firstTime = !localStorage.getItem(SAVE_KEY);
  } catch (e) {
    /* sin almacenamiento: se muestra la bienvenida */
  }
  // Partida de un juego que quedó a medias (página cerrada durante la animación)
  if (S.pendingRound && GAME_BY_ID[S.pendingRound.tier]) {
    const tk = S.pendingRound;
    S.pendingRound = null;
    const r = resolveTicket(tk);
    if (r) toast(PRODUCT_BY_ID[tk.tier].icon, `Partida pendiente cobrada${r.payout ? `: +${fmt(r.payout)}` : ' (sin premio)'}`);
    checkAchievements();
  } else {
    S.pendingRound = null;
  }
  mineTick();
  renderSoundBtn();
  refreshHeader(false);
  go('home');
  checkBankrupt(900);
  // Secretos, eventos y jackpot
  setInterval(() => {
    tickSpecials();
    renderJackpot();
  }, 1000);
  tickSpecials();
  initJackpot();
  // Guarda al salir
  window.addEventListener('pagehide', () => {
    mineTick();
    save();
    flushContribution();
  });

  save();
  if (firstTime) {
    modal({
      icon: '🎟️',
      title: '¡Bienvenido a RascaManía!',
      html: `<p>Empiezas con <b style="color:var(--accent)">${fmt(S.coins)} monedas</b> ficticias.</p>
        <p>Compra boletos en la tienda, <b>ráscalos arrastrando el dedo o el ratón</b> y encuentra 3 símbolos iguales para ganar.</p>
        <p>Sube de nivel para desbloquear boletos mejores, juegos sin rascar, objetos, una mina de monedas y el árbol de habilidades.</p>
        <p>📅 La partida va <b>por días</b>: cada día tienes unas jugadas y un <b>objetivo de monedas</b> que crece cada día. Si al acabar las jugadas no lo alcanzas, <b>empiezas de cero</b>… salvo que tengas una ❤️ Segunda vida.</p>`,
      buttons: [{ label: '¡A rascar!', cls: 'btn', action: () => go('shop') }],
    });
  }

  // Acceso de depuración desde la consola
  window.RascaMania = { get state() { return S; }, save, go, setShopTab: (t) => { shopTab = t; }, playRareEvent: (l, a) => playRareEvent(l, a, TIERS[0]) };
})();
