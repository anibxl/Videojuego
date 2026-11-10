/* =========================================================
   Partículas a pantalla completa: monedas, confeti, destellos y polvo
   ========================================================= */
(function () {
  'use strict';

  const canvas = document.getElementById('fx');
  const ctx = canvas.getContext('2d');
  let W = 0, H = 0, DPR = 1;
  let parts = [];
  let running = false;
  let last = 0;

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W * DPR;
    canvas.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  window.addEventListener('resize', resize);
  resize();

  const CONFETTI = ['#ff4d6d', '#ffd166', '#06d6a0', '#4cc9f0', '#b388ff', '#ff9f1c', '#ffffff'];

  function add(p) {
    parts.push(p);
    if (!running) {
      running = true;
      last = performance.now();
      requestAnimationFrame(loop);
    }
  }

  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    ctx.clearRect(0, 0, W, H);
    parts = parts.filter((p) => {
      p.life -= dt;
      if (p.life <= 0) return false;
      p.vx *= p.drag;
      p.vy = p.vy * p.drag + p.g * dt;
      if (p.accel) { p.vx *= 1 + p.accel * dt; p.vy *= 1 + p.accel * dt; }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      draw(p);
      return p.y < H + 260 && p.y > -400 && p.x > -400 && p.x < W + 400;
    });
    if (parts.length) requestAnimationFrame(loop);
    else {
      running = false;
      ctx.clearRect(0, 0, W, H);
    }
  }

  function draw(p) {
    const a = Math.min(1, p.life / p.fade);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    switch (p.kind) {
      case 'coin': {
        const sx = Math.abs(Math.cos(p.rot * 2)) * 0.8 + 0.2; // giro 3D falso
        ctx.scale(sx, 1);
        const r = p.size;
        const g = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r);
        g.addColorStop(0, '#fff6c2');
        g.addColorStop(0.5, '#ffcf3f');
        g.addColorStop(1, '#c98a00');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#a86f00';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.68, 0, Math.PI * 2);
        ctx.stroke();
        break;
      }
      case 'confetti':
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        break;
      case 'spark': {
        ctx.fillStyle = p.color;
        const s = p.size;
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
          const r = i % 2 === 0 ? s : s * 0.3;
          const ang = (i / 8) * Math.PI * 2;
          ctx.lineTo(Math.cos(ang) * r, Math.sin(ang) * r);
        }
        ctx.closePath();
        ctx.fill();
        break;
      }
      case 'dust':
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        break;
      case 'streak': { // estrella fugaz con estela
        ctx.rotate(-p.rot);
        const sp = Math.hypot(p.vx, p.vy) || 1;
        const tx = (-p.vx / sp) * p.len, ty = (-p.vy / sp) * p.len;
        const g = ctx.createLinearGradient(0, 0, tx, ty);
        g.addColorStop(0, '#ffffff');
        g.addColorStop(0.2, p.color);
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.strokeStyle = g;
        ctx.lineWidth = p.size;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(tx, ty);
        ctx.stroke();
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(0, 0, p.size * 1.2, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'ring': { // onda expansiva
        ctx.rotate(-p.rot);
        const k = 1 - p.life / p.max;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = Math.max(1, p.size * (1 - k));
        ctx.beginPath();
        ctx.arc(0, 0, p.r0 + k * p.r1, 0, Math.PI * 2);
        ctx.stroke();
        break;
      }
      case 'warp': { // estrellas saliendo del centro (salto a velocidad luz)
        ctx.rotate(-p.rot);
        const sp = Math.hypot(p.vx, p.vy) || 1;
        const len = Math.min(220, sp * 0.08);
        ctx.strokeStyle = p.color;
        ctx.lineWidth = p.size;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo((-p.vx / sp) * len, (-p.vy / sp) * len);
        ctx.stroke();
        break;
      }
    }
    ctx.restore();
  }

  const rand = (a, b) => a + Math.random() * (b - a);

  const FX = {
    coins(x, y, n) {
      for (let i = 0; i < n; i++) {
        const ang = rand(-Math.PI * 0.95, -Math.PI * 0.05);
        const sp = rand(250, 650);
        add({ kind: 'coin', x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, g: 1100, drag: 0.995, rot: rand(0, 6), vr: rand(-8, 8), size: rand(7, 13), life: rand(1.6, 2.6), fade: 0.5 });
      }
    },
    confetti(n) {
      for (let i = 0; i < n; i++) {
        add({ kind: 'confetti', x: rand(0, W), y: rand(-H * 0.5, -10), vx: rand(-60, 60), vy: rand(60, 220), g: 120, drag: 0.99, rot: rand(0, 6), vr: rand(-10, 10), size: rand(7, 14), color: CONFETTI[(Math.random() * CONFETTI.length) | 0], life: rand(3, 5), fade: 0.8 });
      }
    },
    burst(x, y, n, colors) {
      colors = colors || CONFETTI;
      for (let i = 0; i < n; i++) {
        const ang = rand(0, Math.PI * 2);
        const sp = rand(120, 520);
        add({ kind: Math.random() < 0.5 ? 'spark' : 'confetti', x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, g: 300, drag: 0.97, rot: rand(0, 6), vr: rand(-12, 12), size: rand(5, 11), color: colors[(Math.random() * colors.length) | 0], life: rand(0.8, 1.6), fade: 0.5 });
      }
    },
    sparkle(x, y, n, color) {
      for (let i = 0; i < n; i++) {
        add({ kind: 'spark', x: x + rand(-20, 20), y: y + rand(-20, 20), vx: rand(-40, 40), vy: rand(-80, -10), g: 0, drag: 0.98, rot: rand(0, 6), vr: rand(-3, 3), size: rand(3, 7), color: color || '#fff7b0', life: rand(0.5, 1), fade: 0.4 });
      }
    },
    dust(x, y, n, colors) {
      for (let i = 0; i < n; i++) {
        add({ kind: 'dust', x: x + rand(-6, 6), y: y + rand(-6, 6), vx: rand(-90, 90), vy: rand(-120, 20), g: 900, drag: 0.98, rot: rand(0, 6), vr: rand(-10, 10), size: rand(1.5, 3.5), color: colors[(Math.random() * colors.length) | 0], life: rand(0.4, 0.8), fade: 0.3 });
      }
    },
    fireworks(count) {
      for (let k = 0; k < count; k++) {
        setTimeout(() => FX.burst(rand(W * 0.15, W * 0.85), rand(H * 0.15, H * 0.5), 45), k * 280);
      }
    },
    /* ---- Efectos de los premios extremadamente raros ---- */
    shootingStars(n, spread) {
      for (let i = 0; i < n; i++) {
        setTimeout(() => {
          const x = rand(-W * 0.1, W * 0.7), y = rand(-H * 0.2, H * 0.4);
          const sp = rand(900, 1500);
          add({ kind: 'streak', x, y, vx: sp, vy: sp * rand(0.35, 0.6), g: 0, drag: 1, rot: 0, vr: 0, size: rand(2, 3.5), len: rand(120, 260), color: ['#9fe8ff', '#fff7b0', '#ffffff', '#b388ff'][i % 4], life: 1.6, fade: 0.4, max: 1.6 });
        }, i * (spread || 120));
      }
    },
    goldRain(seconds) {
      const end = performance.now() + seconds * 1000;
      const iv = setInterval(() => {
        if (performance.now() > end) return clearInterval(iv);
        for (let i = 0; i < 6; i++) add({ kind: 'coin', x: rand(0, W), y: rand(-60, -10), vx: rand(-40, 40), vy: rand(200, 420), g: 500, drag: 0.995, rot: rand(0, 6), vr: rand(-8, 8), size: rand(8, 15), life: 4, fade: 0.6 });
      }, 60);
    },
    shockwave(x, y, color, count) {
      for (let i = 0; i < (count || 1); i++) {
        setTimeout(() => add({ kind: 'ring', x, y, vx: 0, vy: 0, g: 0, drag: 1, rot: 0, vr: 0, size: 14, r0: 10, r1: Math.max(W, H) * 0.9, color: color || '#ffffff', life: 1.3, max: 1.3, fade: 1.3 }), i * 220);
      }
    },
    warp(seconds) {
      const end = performance.now() + seconds * 1000;
      const iv = setInterval(() => {
        if (performance.now() > end) return clearInterval(iv);
        for (let i = 0; i < 10; i++) {
          const a = rand(0, Math.PI * 2), sp = rand(60, 160);
          add({ kind: 'warp', x: W / 2 + Math.cos(a) * 10, y: H / 2 + Math.sin(a) * 10, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: 0, drag: 1, accel: 3.2, rot: 0, vr: 0, size: rand(1, 2.5), color: ['#ffffff', '#b9f6ff', '#d6c4ff'][i % 3], life: 2.5, fade: 0.3 });
        }
      }, 40);
    },
    flash(color) {
      const el = document.getElementById('flash');
      el.style.background = color || '#fff';
      el.classList.remove('on');
      void el.offsetWidth;
      el.classList.add('on');
    },
    shake() {
      const el = document.getElementById('app');
      el.classList.remove('shake');
      void el.offsetWidth;
      el.classList.add('shake');
    },
  };

  window.FX = FX;
})();
