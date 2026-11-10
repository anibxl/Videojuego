/* =========================================================
   RascaManía — lógica principal del juego
   ========================================================= */
(function () {
  'use strict';

  const { TIERS, TIER_BY_ID, ACHIEVEMENTS, tierMath, generateTicket, xpForLevel, levelReward } = window.GameData;
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
    TIERS.forEach((t) => (perTier[t.id] = { bought: 0, scratched: 0, wins: 0, spent: 0, won: 0, best: 0 }));
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
      stats: {
        spent: 0, won: 0, bonus: 0, bought: 0, scratched: 0, wins: 0,
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
  }

  function refreshHeader(animateCoins) {
    renderCoins(animateCoins);
    renderLevel();
    renderBadges();
  }

  /* ---------- Navegación ---------- */
  let current = 'home';
  const renderers = {};
  function go(screen) {
    if (screen !== 'play' && play.card) {
      play.card.destroy();
      play.card = null;
    }
    current = screen;
    document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('active', s.id === 'screen-' + screen));
    document.querySelectorAll('.bottomnav button').forEach((b) => b.classList.toggle('active', b.dataset.go === screen || (screen === 'play' && b.dataset.go === 'inventory')));
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
      const reward = levelReward(S.level);
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
    return 150 + 50 * S.level;
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

  function isBroke() {
    return S.coins < TIERS[0].price && S.inventory.length === 0;
  }
  $('rescue-btn').addEventListener('click', (e) => {
    if (!isBroke()) return;
    S.coins += 100;
    S.stats.bonus += 100;
    Sound.buy();
    const r = e.currentTarget.getBoundingClientRect();
    FX.coins(r.left + r.width / 2, r.top, 20);
    save();
    refreshHeader(true);
    renderHome();
  });

  /* ---------- Inicio ---------- */
  function historyRow(h) {
    const tier = TIER_BY_ID[h.tier];
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
    $('rescue-btn').classList.toggle('hidden', !isBroke());
    const wins = S.history.filter((h) => h.prize > 0).slice(0, 5);
    $('recent-list').innerHTML = wins.length
      ? wins.map(historyRow).join('')
      : '<li class="empty">Aún no has ganado nada. ¡Compra tu primer boleto en la tienda!</li>';
  }
  renderers.home = renderHome;

  /* ---------- Tienda ---------- */
  function renderShop() {
    $('shop-grid').innerHTML = TIERS.map((t) => {
      const m = tierMath(t);
      const locked = S.level < t.level;
      const preview = t.symbols.slice(-3).map((s) => s.e).join('');
      const btn = (q, label) => {
        const cost = t.price * q;
        return `<button class="btn ${q === 1 ? '' : 'btn-ghost'}" data-buy="${t.id}" data-q="${q}" ${locked || S.coins < cost ? 'disabled' : ''}>${label}<small>${fmtShort(cost)}</small></button>`;
      };
      return `<div class="shop-card ${locked ? 'locked' : ''}">
        ${locked ? `<div class="lock-overlay"><span>🔒</span>Se desbloquea en el nivel ${t.level}<small class="muted">Te faltan ${t.level - S.level} niveles</small></div>` : ''}
        <div class="shop-body">
          <div class="mini-ticket mt-${t.id}"><div class="mt-name">${t.name}</div><div class="mt-syms">${preview}</div></div>
          <div class="muted small">${t.tagline}</div>
          <div class="shop-info">
            <div class="si"><small>Precio</small><b><span class="coin-ico"></span> ${fmt(t.price)}</b></div>
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

  $('shop-grid').addEventListener('click', (e) => {
    const b = e.target.closest('[data-buy]');
    if (!b || b.disabled) return;
    buy(b.dataset.buy, +b.dataset.q, b);
  });

  function buy(tierId, qty, srcEl) {
    Sound.unlock();
    const t = TIER_BY_ID[tierId];
    const cost = t.price * qty;
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
      const tk = generateTicket(tierId);
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
    const t = TIER_BY_ID[tk.tier];
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

    const area = el.querySelector('.scratch-area');
    const cellEls = Array.from(area.querySelectorAll('.cell'));
    const t = TIER_BY_ID[tk.tier];
    // Espera al layout para medir correctamente
    requestAnimationFrame(() => {
      play.card = new ScratchCard(area, {
        cover: t.cover,
        cells: cellEls,
        onCellReveal: (i, silent) => onCellReveal(tk, cellEls, i, silent),
        onProgress: (p) => ($('play-progress-fill').style.width = Math.min(100, (p / 0.8) * 100) + '%'),
        onDone: () => settle(tk, el, cellEls),
      });
    });
  }
  renderers.play = () => {};

  $('auto-btn').addEventListener('click', () => {
    if (play.card && !play.card.done) {
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

  function settle(tk, el, cellEls) {
    if (play.settled) return;
    play.settled = true;
    revealCount = 0;
    const t = TIER_BY_ID[tk.tier];
    const idx = S.inventory.findIndex((x) => x.id === tk.id);
    if (idx < 0) return; // ya cobrado
    S.inventory.splice(idx, 1);

    const prize = tk.prize;
    const pt = S.stats.perTier[t.id];
    S.stats.scratched++;
    pt.scratched++;
    if (prize > 0) {
      S.coins += prize;
      S.stats.won += prize;
      S.stats.wins++;
      S.stats.streak++;
      S.stats.bestStreak = Math.max(S.stats.bestStreak, S.stats.streak);
      pt.wins++;
      pt.won += prize;
      pt.best = Math.max(pt.best, prize);
      if (prize > S.stats.biggestWin) {
        S.stats.biggestWin = prize;
        S.stats.biggestTier = t.id;
      }
    } else {
      S.stats.streak = 0;
    }
    notePeak();
    S.history.unshift({ tier: t.id, prize, sym: tk.winSym, mult: tk.mult, t: Date.now(), id: tk.id });
    if (S.history.length > HISTORY_MAX) S.history.length = HISTORY_MAX;

    const xpGain = t.xp + Math.min(Math.floor(prize / 20), t.xp * 5);
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

    celebrate(tk, t, el);

    const res = $('result');
    if (prize > 0) {
      res.className = 'result win';
      res.innerHTML = `<div class="r-title">¡Has ganado ${fmt(prize)} monedas!</div>
        <div class="r-sub">${t.symbols[tk.winSym].e} ×3${tk.mult > 1 ? ` · multiplicador ×${tk.mult}` : ''} · +${xpGain} XP</div>`;
    } else {
      res.className = 'result';
      res.innerHTML = `<div class="r-title">Sin premio esta vez</div><div class="r-sub">¡La suerte cambia! · +${xpGain} XP</div>`;
    }

    addXP(xpGain);
    checkAchievements();
    save();
    setTimeout(() => refreshHeader(true), prize > 0 ? 450 : 0);
    renderPlayActions(t);
  }

  function celebrate(tk, t, el) {
    const prize = tk.prize;
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
    } else if (ratio >= 5 || prize >= 1000) {
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
    const canBuy = S.coins >= t.price && S.level >= t.level;
    acts.push(`<button class="btn ${same.length ? 'btn-ghost' : 'btn-pink'}" data-again="${t.id}" ${canBuy ? '' : 'disabled'}>Comprar otro · ${fmt(t.price)}</button>`);
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
          <div class="inv-actions"><button class="btn" data-open="${list[0].id}">Rascar</button></div>
        </div>`;
      })
      .join('');
  }
  renderers.inventory = renderInventory;
  $('inv-list').addEventListener('click', (e) => {
    const b = e.target.closest('[data-open]');
    if (b) {
      Sound.click();
      openTicket(+b.dataset.open);
    }
  });

  /* ---------- Historial ---------- */
  let histFilter = 'all';
  function renderHistory() {
    const filters = [['all', 'Todos'], ['wins', 'Premios']].concat(TIERS.map((t) => [t.id, t.name]));
    $('hist-filter').innerHTML = filters.map(([id, n]) => `<button data-hf="${id}" class="${histFilter === id ? 'active' : ''}">${n}</button>`).join('');
    const list = S.history.filter((h) => histFilter === 'all' || (histFilter === 'wins' ? h.prize > 0 : h.tier === histFilter));
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
      ['Boletos premiados', st.scratched ? `${fmt(st.wins)} (${Math.round((st.wins / st.scratched) * 100)}%)` : '0'],
      ['Mayor premio', st.biggestWin ? fmt(st.biggestWin) + (st.biggestTier ? ` <span class="chip chip-${st.biggestTier}">${TIER_BY_ID[st.biggestTier].name}</span>` : '') : '—'],
      ['Mejor racha', fmt(st.bestStreak)],
      ['Saldo máximo', fmt(st.peakCoins)],
      ['Retorno real', st.spent ? Math.round((st.won / st.spent) * 100) + '%' : '—'],
      ['Logros', `${Object.keys(S.achievements).length}/${ACHIEVEMENTS.length}`],
    ];
    $('stat-grid').innerHTML = items.map(([k, v]) => `<div class="stat"><small>${k}</small><b>${v}</b></div>`).join('');

    $('tier-table').innerHTML =
      `<tr><th>Boleto</th><th>Comprados</th><th>Rascados</th><th>Premiados</th><th>Gastado</th><th>Ganado</th><th>Retorno</th><th>Mejor</th></tr>` +
      TIERS.map((t) => {
        const p = st.perTier[t.id];
        return `<tr><td><span class="chip chip-${t.id}">${t.name}</span></td><td>${fmt(p.bought)}</td><td>${fmt(p.scratched)}</td>
          <td>${p.scratched ? Math.round((p.wins / p.scratched) * 100) + '%' : '—'}</td><td>${fmt(p.spent)}</td><td>${fmt(p.won)}</td>
          <td>${p.spent ? Math.round((p.won / p.spent) * 100) + '%' : '—'}</td><td>${p.best ? fmt(p.best) : '—'}</td></tr>`;
      }).join('');

    $('odds-list').innerHTML = TIERS.map((t) => {
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
      html: '<p>Perderás tu saldo, nivel, boletos, historial y logros.</p>',
      buttons: [
        {
          label: 'Sí, reiniciar',
          cls: 'btn btn-pink',
          action: () => {
            const sound = S.sound;
            localStorage.removeItem(SAVE_KEY);
            S = load();
            S.sound = sound;
            save();
            refreshHeader(false);
            go('home');
            toast('🔄', 'Partida reiniciada. ¡1.000 monedas para empezar!');
          },
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
  renderSoundBtn();
  refreshHeader(false);
  go('home');
  setInterval(() => {
    if (current === 'home') renderDaily();
  }, 30000);

  const firstTime = !localStorage.getItem(SAVE_KEY);
  save();
  if (firstTime) {
    modal({
      icon: '🎟️',
      title: '¡Bienvenido a RascaManía!',
      html: `<p>Empiezas con <b style="color:var(--accent)">1.000 monedas</b> ficticias.</p>
        <p>Compra boletos en la tienda, <b>ráscalos arrastrando el dedo o el ratón</b> y encuentra 3 símbolos iguales para ganar.</p>
        <p>Sube de nivel para desbloquear boletos Plata, Oro, Diamante y Legendario.</p>`,
      buttons: [{ label: '¡A rascar!', cls: 'btn', action: () => go('shop') }],
    });
  }

  // Acceso de depuración desde la consola
  window.RascaMania = { get state() { return S; }, save, go };
})();
