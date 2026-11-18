// Finitions communes aux pages : onde lumineuse au point touché sur les éléments interactifs.
// (Les commandes de jeu en sont exclues : rien ne doit coûter du temps pendant la partie.)

const SELECTOR = 'button, a[href], [role="tab"], [data-ripple]';
const EXCLUDE = '.pad, .bounce, .controls, [data-no-ripple]';

document.addEventListener(
  'pointerdown',
  (e) => {
    if (e.button > 0) return;
    const el = e.target.closest?.(SELECTOR);
    if (!el || el.closest(EXCLUDE) || el.disabled) return;
    const r = document.createElement('span');
    r.className = 'touch-ripple';
    r.style.left = `${e.clientX}px`;
    r.style.top = `${e.clientY}px`;
    document.body.appendChild(r);
    r.addEventListener('animationend', () => r.remove(), { once: true });
    setTimeout(() => r.remove(), 900);
  },
  { passive: true },
);
