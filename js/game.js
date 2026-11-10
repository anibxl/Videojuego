/* =========================================================
   RascaManía — lógica principal del juego
   ========================================================= */
(function () {
  'use strict';

  const { TIERS, TIER_BY_ID, GAMES, GAME_BY_ID, PRODUCT_BY_ID, WILD, generateRound, ITEMS, ITEM_BY_ID, MINE, ACHIEVEMENTS, SKILL_BRANCHES, SKILLS, SKILL_BY_ID, skillCost, tierMath, generateTicket, xpForLevel, levelReward } = window.GameData;
  const SAVE_KEY = 'rascamania_save_v1';
  const DAILY_MS = 20 * 60 * 60 * 1000; // bonus cada 20 h
  const HISTORY_MAX = 300;
  const $ = (id) => document.getElementById(id);

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
    TIERS.concat(GAMES).forEach((t) => (perTier[t.id] = { bought: 0, scratched: 0, wins: 0, spent: 0, won: 0, best: 0 }));
    return perTier;
  }

  function defaultState() {
    return {
      coins: 1000,
      level: 1,
      xp: 0,
      inventory: [],
      history: [],
      serial: 1,
      lastDaily: 0,
      sound: true,
      achievements: {},
      skills: {},
      boosts: {},
      mine: { level: 0, stored: 0, last: Date.now() },
      pendingRound: null,
      // Récords de todas las partidas: se conservan al empezar de cero
      records: { runs: 1, bestLevel: 1, bestCoins: 1000, bestWin: 0 },
      stats: {
        spent: 0, won: 0, bonus: 0, skillSpent: 0, shopSpent: 0, refunds: 0, bought: 0, scratched: 0, wins: 0,
        games: 0, items: 0, mineEarned: 0, wildWins: 0, livesUsed: 0,
        biggestWin: 0, biggestTier: null, streak: 0, bestStreak: 0, peakCoins: 1000,
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
    out.records = Object.assign({ runs: 1, bestLevel: 1, bestCoins: 1000, bestWin: 0 }, s.records || {});
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

  /* ---------- Objetos y mina ---------- */
  function itemPrice(it) {
    return Math.max(10, Math.round((it.price * (1 + 0.2 * (S.level - 1)) * (1 - skEffect('merchant'))) / 10) * 10);
  }
  const itemUses = (it) => (it.fixedUses ? it.uses : Math.round(it.uses * (1 + skEffect('alchemist'))));
  const mineRate = () => MINE.rate(S.mine.level) * (1 + skEffect('foreman')); // monedas/min
  const mineCap = () => Math.round(mineRate() * 60 * MINE.capHours * (1 + skEffect('storage')));
  const mineUpgradeCost = () => Math.round((MINE.cost(S.mine.level) * (1 - skEffect('merchant'))) / 50) * 50;
  function mineTick() {
    const now = Date.now();
    if (S.mine.level > 0) {
      const dt = Math.max(0, now - (S.mine.last || now));
      S.mine.stored = Math.min(mineCap(), (S.mine.stored || 0) + (mineRate() * dt) / 60000);
    }
    S.mine.last = now;
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

  /* ---------- Bonus diario y ayuda ---------- */
  function dailyAmount() {
    return Math.round((150 + 50 * S.level) * (1 + skEffect('daily')));
  }
  function renderDaily() {
    const left = S.lastDaily + DAILY_MS - Date.now();
    const btn = $('daily-btn');
    if (left <= 0) {
      btn.classList.add('ready');
      $('daily-text').textContent = `¡Reclama ${fmt(dailyAmount())}!`;
    } else {
      btn.classList.remove('ready');
      const h = Math.floor(left / 3600000);
      const m = Math.floor((left % 3600000) / 60000);
      $('daily-text').textContent = `en ${h} h ${m} min`;
    }
  }
  $('daily-btn').addEventListener('click', (e) => {
    Sound.unlock();
    if (S.lastDaily + DAILY_MS > Date.now()) {
      Sound.error();
      toast('⏳', 'El bonus diario aún no está listo.');
      return;
    }
    const amt = dailyAmount();
    S.lastDaily = Date.now();
    S.coins += amt;
    S.stats.bonus += amt;
    notePeak();
    Sound.win();
    const r = e.currentTarget.getBoundingClientRect();
    FX.coins(r.left + r.width / 2, r.top + r.height / 2, 30);
    toast('🎁', `<b>Bonus diario</b><br>+${fmt(amt)} monedas`);
    checkAchievements();
    save();
    refreshHeader(true);
    renderHome();
  });

  /* ---------- Bancarrota, segunda vida y récords ---------- */
  const dailyReady = () => S.lastDaily + DAILY_MS <= Date.now();
  /** Precio de lo más barato que se puede jugar ahora mismo. */
  function cheapestPlay() {
    return Math.min(...TIERS.concat(GAMES).filter((t) => S.level >= t.level).map(ticketPrice));
  }
  /**
   * Sin dinero = no llega para lo más barato (contando lo que hay en la mina),
   * sin boletos por rascar, sin partida en curso y sin bonus diario disponible.
   */
  function isBroke(coins) {
    if (coins === undefined) coins = S.coins;
    mineTick();
    const available = coins + Math.floor(S.mine.stored || 0);
    return available < cheapestPlay() && S.inventory.length === 0 && !S.pendingRound && !(gameRun.tk && !gameRun.done) && !dailyReady();
  }
  /** Sin monedas pero con el bonus diario listo: se avisa en el inicio. */
  const needsDaily = () => S.coins + Math.floor(S.mine.stored || 0) < cheapestPlay() && S.inventory.length === 0 && dailyReady();
  $('rescue-btn').addEventListener('click', () => $('daily-btn').click());

  const reviveCoins = () => 300 + 100 * S.level;
  function noteRecords() {
    const r = S.records;
    r.bestLevel = Math.max(r.bestLevel, S.level);
    r.bestCoins = Math.max(r.bestCoins, S.stats.peakCoins, S.coins);
    r.bestWin = Math.max(r.bestWin, S.stats.biggestWin);
  }

  let bankruptTimer = null;
  /** Comprueba la bancarrota (con retraso para que se vea antes el resultado). */
  function checkBankrupt(delay) {
    clearTimeout(bankruptTimer);
    bankruptTimer = setTimeout(() => {
      if (!isBroke()) return;
      if (modalOpen) return checkBankrupt(600); // espera a que se cierren otras ventanas
      if ((S.boosts.life || 0) > 0) return useLife();
      gameOver();
    }, delay === undefined ? 300 : delay);
  }

  function useLife() {
    S.boosts.life--;
    const amt = reviveCoins();
    S.coins += amt;
    S.stats.bonus += amt;
    S.stats.livesUsed++;
    checkAchievements();
    save();
    Sound.levelUp();
    FX.flash('#ff8ab5');
    FX.burst(window.innerWidth / 2, window.innerHeight / 2, 60, ['#ff4d6d', '#ff8ab5', '#ffffff']);
    modal({
      icon: '❤️',
      title: '¡Segunda vida!',
      html: `<p>Te habías quedado sin monedas, pero tu Segunda vida te ha salvado. Conservas todo tu progreso.</p>
        <div class="jp-amount"><span class="coin-ico lg"></span>+${fmt(amt)}</div>
        <p>${S.boosts.life ? `Te quedan ${S.boosts.life} vidas.` : 'Ya no te quedan vidas: ¡compra otra en la tienda!'}</p>`,
      buttons: [{ label: '¡A seguir!', cls: 'btn btn-pink' }],
    });
    refreshHeader(true);
    if (renderers[current]) renderers[current]();
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
      title: '¡Bancarrota!',
      html: `<p>Te has quedado sin monedas. La partida ha terminado y tendrás que <b>empezar de cero</b>.</p>
        <div class="go-stats">
          ${row('Nivel alcanzado', S.level)}
          ${row('Saldo máximo', fmt(st.peakCoins))}
          ${row('Mayor premio', st.biggestWin ? fmt(st.biggestWin) : '—')}
          ${row('Boletos rascados', fmt(st.scratched))}
          ${row('Partidas de juegos', fmt(st.games))}
        </div>
        <p class="small">💡 La próxima vez, compra una <b>❤️ Segunda vida</b> en la tienda (pestaña Objetos) para no perderlo todo.</p>`,
      buttons: [{ label: '🔄 Empezar de cero', cls: 'btn', action: () => resetRun('💀 Nueva partida: ¡1.000 monedas para empezar!') }],
    });
  }

  /** Empieza una partida nueva conservando sonido y récords. */
  function resetRun(msg) {
    noteRecords();
    const keep = { sound: S.sound, records: S.records };
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
      html: (S.boosts.life || 0) > 0
        ? '<p>Con esta compra te quedarás sin monedas y se gastará una <b>❤️ Segunda vida</b>.</p>'
        : '<p>Con esta compra te quedarás sin monedas y <b>perderás la partida</b>: tendrás que empezar de cero.</p>',
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
    renderDaily();
    const got = Object.keys(S.achievements).length;
    $('ach-count').textContent = `${got}/${ACHIEVEMENTS.length}`;
    $('rescue-btn').classList.toggle('hidden', !needsDaily());
    renderMineCard();
    renderBoosts();
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
      el.innerHTML = `<div class="mine-row"><span class="mine-ico">⛏️</span><div class="grow"><b>Mina de monedas</b><small class="muted">Genera monedas aunque no juegues</small></div>
        <button class="btn btn-ghost small-btn" data-shoptab="items">Construir</button></div>`;
      return;
    }
    mineTick();
    const cap = mineCap();
    const st = Math.floor(S.mine.stored);
    el.innerHTML = `<div class="mine-row"><span class="mine-ico">⛏️</span>
      <div class="grow"><b>Mina nivel ${S.mine.level}</b><small class="muted">${fmtDec(mineRate())} monedas/min · máx. ${fmt(cap)}</small>
        <div class="xp-bar wide mine-bar"><span style="width:${Math.min(100, (S.mine.stored / cap) * 100)}%"></span></div></div>
      <button class="btn small-btn" data-collect ${st < 1 ? 'disabled' : ''}>Recoger <span class="coin-ico"></span> ${fmt(st)}</button></div>`;
  }
  const fmtDec = (x) => (Math.round(x * 10) / 10).toString().replace('.', ',');

  function collectMine(srcEl) {
    mineTick();
    const amt = Math.floor(S.mine.stored);
    if (amt < 1) return;
    S.mine.stored -= amt;
    S.coins += amt;
    S.stats.bonus += amt;
    S.stats.mineEarned += amt;
    notePeak();
    Sound.win();
    if (srcEl) {
      const r = srcEl.getBoundingClientRect();
      FX.coins(r.left + r.width / 2, r.top + r.height / 2, Math.min(40, 8 + Math.round(amt / 100)));
    }
    toast('⛏️', `<b>Mina</b><br>+${fmt(amt)} monedas`);
    checkAchievements();
    save();
    refreshHeader(true);
    if (current === 'home') renderMineCard();
    if (current === 'shop') renderShop();
  }
  document.addEventListener('click', (e) => {
    const c = e.target.closest('[data-collect]');
    if (c && !c.disabled) collectMine(c);
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
    $('shop-grid').innerHTML = TIERS.map((t) => {
      const m = tierMath(t);
      const locked = S.level < t.level;
      const preview = t.symbols.slice(-3).map((s) => s.e).join('');
      const price = ticketPrice(t);
      const btn = (q, label) => {
        const cost = price * q;
        return `<button class="btn ${q === 1 ? '' : 'btn-ghost'}" data-buy="${t.id}" data-q="${q}" ${locked || S.coins < cost ? 'disabled' : ''}>${label}<small>${fmtShort(cost)}</small></button>`;
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
        return `<button class="btn ${q === 1 ? '' : 'btn-ghost'}" data-play="${g.id}" data-q="${q}" ${locked || S.coins < cost ? 'disabled' : ''}>${label}<small>${fmtShort(cost)}</small></button>`;
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
    const nextRate = MINE.rate(S.mine.level + 1) * (1 + skEffect('foreman'));
    const mineCard = `<div class="shop-card mine-shop ${mineLocked ? 'locked' : ''}">
      ${mineLocked ? `<div class="lock-overlay"><span>🔒</span>Se desbloquea en el nivel ${MINE.minLevel}</div>` : ''}
      <div class="shop-body">
        <div class="item-head"><span class="item-ico">⛏️</span><div><b>Mina de monedas</b><small class="muted">Ingresos pasivos: produce monedas incluso con el juego cerrado (hasta ${MINE.capHours} h acumuladas).</small></div></div>
        <div class="shop-info">
          <div class="si"><small>Nivel</small><b>${S.mine.level} / ${MINE.maxLevel}</b></div>
          <div class="si"><small>Producción</small><b>${S.mine.level ? fmtDec(mineRate()) + '/min' : '—'}</b></div>
          <div class="si"><small>Almacenado</small><b>${fmt(Math.floor(S.mine.stored || 0))}${S.mine.level ? ' / ' + fmtShort(mineCap()) : ''}</b></div>
          <div class="si"><small>${maxed ? 'Nivel máximo' : 'Siguiente nivel'}</small><b>${maxed ? '✔' : fmtDec(nextRate) + '/min'}</b></div>
        </div>
        <div class="buy-row two">
          <button class="btn" data-mine-up ${mineLocked || maxed || S.coins < upCost ? 'disabled' : ''}>${maxed ? 'Al máximo' : (S.mine.level ? 'Mejorar' : 'Construir') + ` <small>${fmtShort(upCost)}</small>`}</button>
          <button class="btn btn-ghost" data-collect ${Math.floor(S.mine.stored || 0) < 1 ? 'disabled' : ''}>Recoger <small>${fmt(Math.floor(S.mine.stored || 0))}</small></button>
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
      toast('⛏️', `<b>Mina nivel ${S.mine.level}</b><br>${fmtDec(mineRate())} monedas por minuto`);
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
    return tk;
  }

  function buy(tierId, qty, srcEl) {
    Sound.unlock();
    const t = PRODUCT_BY_ID[tierId];
    const unit = ticketPrice(t);
    const cost = unit * qty;
    if (S.level < t.level) return;
    if (S.coins < cost) {
      Sound.error();
      toast('💸', 'No tienes monedas suficientes.');
      return;
    }
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
    el.className = `ticket tier-${t.id}`;
    const cells = tk.cells
      .map((s, i) => `<div class="cell" data-i="${i}"><span class="sym">${t.symbols[s].e}</span><span class="val">${fmtShort(t.symbols[s].v)}</span></div>`)
      .join('');
    const mult = t.multipliers ? `<div class="cell mult-cell" data-i="${tk.cells.length}"><span class="mlabel">MULTIPLICADOR</span><span class="mval">×${tk.mult}</span></div>` : '';
    el.innerHTML = `${t.id === 'legendary' ? '<div class="rainbow-border"></div>' : ''}
      <div class="t-body">
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
    const luckBonus = skEffect('lucky') + (isGame ? skEffect('lever') : 0) + (used.charm ? 0.1 : 0);
    const payout = base ? Math.round(base * (tk.golden ? 2 : 1) * (1 + luckBonus)) : 0;
    const paid = tk.paid || t.price;
    const refund = base ? 0 : Math.round(paid * (skEffect('refund') + (used.shield ? 0.1 : 0)));
    const consolation = !base && isGame && tk.pair ? Math.round(paid * skEffect('consol')) : 0;
    const pt = S.stats.perTier[t.id];
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

    const xpGain = Math.round((t.xp + Math.min(Math.floor(payout / 20), t.xp * 5)) * (1 + skEffect('xp')) * (used.xp2 ? 2 : 1));
    addXP(xpGain);
    return { payout, refund, consolation, xpGain, luckBonus, used };
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
    const canBuy = S.coins >= ticketPrice(t) && S.level >= t.level;
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
    $('inv-list').innerHTML = TIERS.filter((t) => S.inventory.some((x) => x.tier === t.id))
      .map((t) => {
        const list = S.inventory.filter((x) => x.tier === t.id);
        return `<div class="inv-group">
          <div class="inv-thumb mt-${t.id}">🎟️</div>
          <div class="grow"><b>${t.name}</b><span class="muted small">${list.length} boleto${list.length > 1 ? 's' : ''} · premio máx. ${fmtShort(tierMath(t).maxPrize)}</span></div>
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
    if (S.coins < cost) {
      Sound.error();
      toast('💸', 'No tienes monedas suficientes.');
      return;
    }
    S.coins -= cost;
    S.stats.spent += cost;
    S.stats.bought += qty;
    S.stats.perTier[g.id].bought += qty;
    S.stats.perTier[g.id].spent += cost;
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
    const acts = [`<button class="btn btn-pink" data-replay="${g.id}" data-q="1" ${S.coins >= price ? '' : 'disabled'}>${g.kind === 'slot' ? '🎰 Tirar otra vez' : '🎁 Otra partida'} · ${fmt(price)}</button>`];
    if (sk('multi')) {
      acts.push(`<button class="btn btn-ghost" data-replay="${g.id}" data-q="5" ${S.coins >= price * 5 ? '' : 'disabled'}>×5 · ${fmtShort(price * 5)}</button>`);
      acts.push(`<button class="btn btn-ghost" data-replay="${g.id}" data-q="10" ${S.coins >= price * 10 ? '' : 'disabled'}>×10 · ${fmtShort(price * 10)}</button>`);
    }
    acts.push('<button class="btn btn-ghost" data-shoptab="games">Juegos</button>');
    $('game-actions').innerHTML = acts.join('');
  }
  $('game-actions').addEventListener('click', (e) => {
    const b = e.target.closest('[data-replay]');
    if (b && !b.disabled) playGame(b.dataset.replay, +b.dataset.q, b);
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
    const filters = [['all', 'Todos'], ['wins', 'Premios'], ['games', 'Juegos']].concat(TIERS.map((t) => [t.id, t.name]));
    $('hist-filter').innerHTML = filters.map(([id, n]) => `<button data-hf="${id}" class="${histFilter === id ? 'active' : ''}">${n}</button>`).join('');
    const list = S.history.filter((h) => histFilter === 'all' || (histFilter === 'wins' ? h.prize > 0 : histFilter === 'games' ? !!GAME_BY_ID[h.tier] : h.tier === histFilter));
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
    ];
    noteRecords();
    const rec = S.records;
    $('record-grid').innerHTML = [
      ['Partida nº', fmt(rec.runs)],
      ['Récord de nivel', fmt(rec.bestLevel)],
      ['Récord de saldo', fmt(rec.bestCoins)],
      ['Récord de premio', rec.bestWin ? fmt(rec.bestWin) : '—'],
    ].map(([k, v]) => `<div class="stat"><small>${k}</small><b>${v}</b></div>`).join('');
    $('stat-grid').innerHTML = items.map(([k, v]) => `<div class="stat"><small>${k}</small><b>${v}</b></div>`).join('');

    $('tier-table').innerHTML =
      `<tr><th>Boleto / juego</th><th>Comprados</th><th>Jugados</th><th>Premiados</th><th>Gastado</th><th>Ganado</th><th>Retorno</th><th>Mejor</th></tr>` +
      TIERS.concat(GAMES).map((t) => {
        const p = st.perTier[t.id];
        return `<tr><td><span class="chip chip-${t.id}">${t.name}</span></td><td>${fmt(p.bought)}</td><td>${fmt(p.scratched)}</td>
          <td>${p.scratched ? Math.round((p.wins / p.scratched) * 100) + '%' : '—'}</td><td>${fmt(p.spent)}</td><td>${fmt(p.won)}</td>
          <td>${p.spent ? Math.round((p.won / p.spent) * 100) + '%' : '—'}</td><td>${p.best ? fmt(p.best) : '—'}</td></tr>`;
      }).join('');

    $('odds-list').innerHTML = TIERS.concat(GAMES).map((t) => {
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
          action: () => resetRun('🔄 Partida reiniciada. ¡1.000 monedas para empezar!'),
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
  setInterval(() => {
    if (current === 'home') renderDaily();
  }, 30000);
  // La mina va sumando en tiempo real
  setInterval(() => {
    if (current === 'home' && S.mine.level) renderMineCard();
  }, 2000);
  // Guarda la producción de la mina al salir
  window.addEventListener('pagehide', () => {
    mineTick();
    save();
  });

  let firstTime = true;
  try {
    firstTime = !localStorage.getItem(SAVE_KEY);
  } catch (e) {
    /* sin almacenamiento: se muestra la bienvenida */
  }
  save();
  if (firstTime) {
    modal({
      icon: '🎟️',
      title: '¡Bienvenido a RascaManía!',
      html: `<p>Empiezas con <b style="color:var(--accent)">1.000 monedas</b> ficticias.</p>
        <p>Compra boletos en la tienda, <b>ráscalos arrastrando el dedo o el ratón</b> y encuentra 3 símbolos iguales para ganar.</p>
        <p>Sube de nivel para desbloquear boletos mejores, juegos sin rascar, objetos, una mina de monedas y el árbol de habilidades.</p>
        <p>⚠️ Si te quedas sin monedas, <b>pierdes y empiezas de cero</b>… salvo que tengas una ❤️ Segunda vida.</p>`,
      buttons: [{ label: '¡A rascar!', cls: 'btn', action: () => go('shop') }],
    });
  }

  // Acceso de depuración desde la consola
  window.RascaMania = { get state() { return S; }, save, go, setShopTab: (t) => { shopTab = t; } };
})();
