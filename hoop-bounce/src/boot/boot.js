// Écran de chargement du jeu (script classique, exécuté tout de suite, avant le menu).
//
// Il reste affiché le temps de charger ce dont le menu a besoin, puis s'efface en fondu avec un léger
// zoom pendant que le menu fait son entrée. Chaque étape réelle fait avancer la barre :
//   fonts  les deux polices du jeu ;
//   page   la page et ses feuilles de style (événement `load`) ;
//   menu   le code du menu chargé et l'interface construite (signalé par src/menu/main.js) ;
//   scene  la première image du décor dessinée (signalé par src/menu/main.js).
// Une durée minimale très courte (MIN_MS) laisse au logo le temps d'apparaître : pas de flash. Un
// garde-fou (MAX_MS) ouvre le menu même si une étape ne répond pas.
// Il ne s'affiche qu'au lancement : en revenant d'une partie ou de la boutique (même session), le menu
// s'ouvre directement.

(function () {
  'use strict';
  var MIN_MS = 1100;
  var MAX_MS = 8000;
  var SEEN = 'hoopbounce.booted';
  var root = document.getElementById('boot');
  var body = document.body;
  var t0 = performance.now();

  function noop() {}
  var api = { done: noop, skipped: false };
  window.__boot = api;

  var warm = false;
  try {
    warm = sessionStorage.getItem(SEEN) === '1' || new URLSearchParams(location.search).has('noboot');
  } catch (e) {
    /* stockage indisponible : on affiche l'écran */
  }
  if (!root || warm) {
    if (root) root.remove();
    api.skipped = true;
    api.revealed = Promise.resolve();
    api.finished = Promise.resolve();
    return;
  }
  body.classList.add('booting');

  // Langue (lue directement dans la sauvegarde : le menu n'est pas encore chargé)
  var lang = 'fr';
  try {
    var s = JSON.parse(localStorage.getItem('hoopbounce.settings') || 'null');
    lang = (s && s.lang) || (navigator.language || 'fr').slice(0, 2);
  } catch (e) {
    /* réglages illisibles */
  }
  var BY = { fr: 'Par', en: 'By', es: 'Por' };
  var LOADING = { fr: 'Chargement', en: 'Loading', es: 'Cargando' };
  root.querySelector('[data-by]').textContent = BY[lang] || BY.fr;
  root.setAttribute('aria-label', 'HoopBounce — ' + (LOADING[lang] || LOADING.fr));

  // ─── Étapes du chargement ────────────────────────────────────────────────
  var TASKS = { fonts: 1, page: 1, menu: 2, scene: 1 };
  var total = 0;
  for (var k in TASKS) total += TASKS[k];
  var doneW = 0;
  var doneSet = {};
  var resolveReveal, resolveFinish;
  api.revealed = new Promise(function (r) { resolveReveal = r; });
  api.finished = new Promise(function (r) { resolveFinish = r; });

  api.done = function (name) {
    if (doneSet[name] || !(name in TASKS)) return;
    doneSet[name] = true;
    doneW += TASKS[name];
    if (doneW >= total) maybeFinish();
  };

  // Polices : le texte n'apparaît qu'une fois la police chargée (pas de changement de police visible)
  var fontsReady = document.fonts && document.fonts.load
    ? Promise.all([document.fonts.load('800 40px "Unbounded"'), document.fonts.load('600 14px "Outfit"')])
    : Promise.resolve();
  var fontTimer = new Promise(function (r) { setTimeout(r, 1500); });
  Promise.race([fontsReady, fontTimer]).then(function () {
    root.classList.add('ready');
    api.done('fonts');
  }, function () {
    root.classList.add('ready');
    api.done('fonts');
  });

  if (document.readyState === 'complete') api.done('page');
  else window.addEventListener('load', function () { api.done('page'); }, { once: true });

  setTimeout(function () { finish(); }, MAX_MS);

  // ─── Barre : suit les étapes, avec une petite avance continue (jamais figée) ─
  var bar = root.querySelector('.boot-bar i');
  var shown = 0;
  var finishing = false;
  var ended = false;

  // ─── Particules : poussières lumineuses qui montent doucement ─────────────
  var cv = root.querySelector('.boot-particles');
  var ctx = cv.getContext('2d');
  var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var W = 0;
  var H = 0;
  var parts = [];
  function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    cv.width = Math.round(W * dpr);
    cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener('resize', resize);
  var N = reduced ? 14 : Math.round(Math.min(46, (W * H) / 9000));
  function spawn(p, anywhere) {
    p.x = Math.random() * W;
    p.y = anywhere ? Math.random() * H : H + 10;
    p.r = 0.6 + Math.random() * 1.8;
    p.big = Math.random() < 0.12;
    if (p.big) p.r = 3 + Math.random() * 5;
    p.vy = (p.big ? 6 : 10) + Math.random() * 16;
    p.sway = 6 + Math.random() * 18;
    p.ph = Math.random() * Math.PI * 2;
    p.warm = Math.random() < 0.65;
    p.a = 0.15 + Math.random() * 0.45;
    return p;
  }
  for (var i = 0; i < N; i++) parts.push(spawn({}, true));

  var last = t0;
  function frame(now) {
    if (ended) return;
    var dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    // Barre de progression
    var target = 0.08 + 0.8 * (doneW / total);
    var creep = Math.min(0.06, (now - t0) / 40000); // avance lente même si une étape traîne
    if (finishing) target = 1;
    shown += (Math.min(1, target + creep) - shown) * Math.min(1, dt * (finishing ? 10 : 4));
    bar.style.transform = 'scaleX(' + shown.toFixed(4) + ')';

    // Particules
    ctx.clearRect(0, 0, W, H);
    var tt = now / 1000;
    for (var j = 0; j < parts.length; j++) {
      var p = parts[j];
      p.y -= p.vy * dt;
      if (p.y < -12) spawn(p, false);
      var x = p.x + Math.sin(tt * 0.7 + p.ph) * p.sway;
      var fade = Math.min(1, (H - p.y) / 120) * Math.min(1, (p.y + 12) / 140);
      var a = p.a * fade * (0.7 + 0.3 * Math.sin(tt * 2 + p.ph));
      if (p.big) {
        var g = ctx.createRadialGradient(x, p.y, 0, x, p.y, p.r * 2.2);
        g.addColorStop(0, p.warm ? 'rgba(255,150,80,' + (a * 0.35) + ')' : 'rgba(150,180,255,' + (a * 0.3) + ')');
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, p.y, p.r * 2.2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = p.warm ? 'rgba(255,190,120,' + a + ')' : 'rgba(200,215,255,' + a + ')';
        ctx.beginPath();
        ctx.arc(x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // ─── Fin : barre pleine, puis fondu + léger zoom vers le menu ─────────────
  function maybeFinish() {
    var wait = MIN_MS - (performance.now() - t0);
    setTimeout(finish, Math.max(0, wait));
  }

  function finish() {
    if (finishing) return;
    finishing = true;
    // La barre se remplit (≈ 0,3 s), puis le menu apparaît derrière l'écran qui s'efface
    setTimeout(function () {
      body.classList.remove('booting');
      body.classList.add('boot-reveal');
      root.classList.add('out');
      try {
        sessionStorage.setItem(SEEN, '1');
      } catch (e) {
        /* stockage indisponible */
      }
      resolveReveal();
      setTimeout(function () {
        ended = true;
        window.removeEventListener('resize', resize);
        root.remove();
        resolveFinish();
        setTimeout(function () { body.classList.remove('boot-reveal'); }, 600);
      }, 900);
    }, 320);
  }
})();
