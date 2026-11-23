// Décorations de la SAISON DE NOËL sur l'accueil du menu (saison 1, étape 1).
//
// Ajoute, sans toucher aux boutons existants ni à leur rôle :
//   - une guirlande lumineuse qui court en haut de l'écran (ampoules qui scintillent, deux boules) ;
//   - un bonnet de Père Noël posé sur le ballon du logo, quelques étincelles autour, un reflet brillant ;
//   - un ruban « Saison de Noël » sous le slogan ;
//   - de la neige sur le bouton JOUER, un brin de houx et une lueur chaude ;
//   - deux cadeaux à côté du bouton JOUER, un sucre d'orge au bout des tuiles ;
//   - de la neige sur le haut des tuiles et des boutons du haut (CSS : css/season-christmas.css).
// Tout est décoratif (aria-hidden, pointer-events: none) et disparaît dès qu'une page s'ouvre.

const BULB_COLORS = ['#ff5c5c', '#ffd254', '#78dc8c', '#6eb4ff', '#ff96dc'];

/** Guirlande : fils en chaînettes d'un bord à l'autre, ampoules régulièrement espacées. */
function garlandSvg() {
  const spans = 6;
  const W = 1200;
  const sag = 22;
  let wire = '';
  let bulbs = '';
  let n = 0;
  for (let i = 0; i < spans; i++) {
    const x0 = (i * W) / spans;
    const x1 = ((i + 1) * W) / spans;
    const mx = (x0 + x1) / 2;
    wire += `M${x0} 4 Q${mx} ${4 + sag * 2} ${x1} 4 `;
    for (let k = 1; k <= 5; k++) {
      const u = k / 6;
      const x = x0 + (x1 - x0) * u;
      const y = 4 + sag * 2 * 2 * u * (1 - u) * 1;
      const c = BULB_COLORS[n % BULB_COLORS.length];
      bulbs += `<g class="xb" style="--c:${c};--d:${((n * 0.37) % 2.4).toFixed(2)}s" transform="translate(${x.toFixed(1)} ${(y + 1).toFixed(1)})"><rect x="-2.2" y="-1" width="4.4" height="3.2" rx="1" fill="#2b3550"/><ellipse cy="7" rx="4" ry="6" fill="${c}"/><ellipse class="xb-glow" cy="7" rx="9" ry="11" fill="${c}"/></g>`;
      n++;
    }
  }
  return `<svg class="xmas-garland-svg" viewBox="0 0 ${W} 60" preserveAspectRatio="none" aria-hidden="true">
    <path d="${wire}" fill="none" stroke="#1d2a40" stroke-width="2.2"/>
    <path d="${wire}" fill="none" stroke="#2f6b3a" stroke-width="1" stroke-dasharray="3 5" opacity="0.8"/>
    ${bulbs}
  </svg>`;
}

const BAUBLE = (c) => `<svg viewBox="0 0 40 64" aria-hidden="true"><line x1="20" y1="0" x2="20" y2="20" stroke="#c9d4ee" stroke-width="1.2"/><rect x="15" y="18" width="10" height="6" rx="1.5" fill="#d9b25a"/><circle cx="20" cy="40" r="16" fill="${c}"/><path d="M6 38 Q20 46 34 38" stroke="rgba(255,255,255,0.55)" stroke-width="2" fill="none"/><circle cx="14" cy="33" r="4" fill="rgba(255,255,255,0.55)"/></svg>`;

const HAT = `<svg viewBox="0 0 80 64" aria-hidden="true">
  <path d="M8 46 Q22 6 52 8 Q70 9 74 30 L64 34 Q60 20 50 22 Q36 26 30 50 Z" fill="#e2263a"/>
  <path d="M30 50 Q36 26 50 22 Q58 20 62 28" fill="none" stroke="rgba(0,0,0,0.18)" stroke-width="3"/>
  <circle cx="70" cy="36" r="8" fill="#fbfdff"/>
  <path d="M4 44 Q30 56 42 52 L40 62 Q18 62 2 54 Z" fill="#fbfdff"/>
</svg>`;

const GIFT = (box, ribbon) => `<svg viewBox="0 0 60 60" aria-hidden="true">
  <rect x="6" y="22" width="48" height="34" rx="3" fill="${box}"/>
  <rect x="3" y="16" width="54" height="10" rx="2.5" fill="${box}" style="filter:brightness(1.12)"/>
  <rect x="26" y="16" width="8" height="40" fill="${ribbon}"/>
  <path d="M30 16 C22 2 10 8 18 14 Z M30 16 C38 2 50 8 42 14 Z" fill="${ribbon}"/>
  <rect x="6" y="26" width="48" height="3" fill="rgba(0,0,0,0.12)"/>
</svg>`;

const CANDY = `<svg viewBox="0 0 30 80" aria-hidden="true">
  <defs><pattern id="xcane" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(40)"><rect width="10" height="10" fill="#fbfdff"/><rect width="5" height="10" fill="#e2263a"/></pattern></defs>
  <path d="M10 78 L10 22 Q10 6 20 6 Q28 6 28 16" fill="none" stroke="url(#xcane)" stroke-width="8" stroke-linecap="round"/>
</svg>`;

const HOLLY = `<svg viewBox="0 0 60 40" aria-hidden="true">
  <path d="M30 22 C20 6 6 10 2 4 C8 16 4 22 14 26 C18 20 24 22 30 22 Z" fill="#2f8a48"/>
  <path d="M30 22 C40 6 54 10 58 4 C52 16 56 22 46 26 C42 20 36 22 30 22 Z" fill="#267a3e"/>
  <circle cx="27" cy="24" r="4.2" fill="#e2263a"/><circle cx="33" cy="25" r="4.2" fill="#d01f33"/><circle cx="30" cy="19" r="4.2" fill="#ef3448"/>
  <circle cx="26" cy="22.5" r="1.3" fill="rgba(255,255,255,0.7)"/>
</svg>`;

const SNOWCAP = `<svg viewBox="0 0 200 22" preserveAspectRatio="none" aria-hidden="true"><path d="M4 9 Q2 2 12 2 L188 2 Q198 2 196 9 Q190 13 182 10 Q176 18 168 11 Q156 15 146 10 Q138 14 128 10 Q116 19 106 11 Q94 14 84 10 Q74 16 64 10 Q52 14 42 10 Q34 18 26 11 Q16 14 4 9 Z" fill="#f6f9ff"/><path d="M14 4 L186 4" stroke="rgba(255,255,255,0.9)" stroke-width="1.5" stroke-linecap="round"/></svg>`;

/**
 * Applique la saison au menu.
 * @param {{id:string}|null} season
 * @param {{ text: (key:string) => string }} env
 */
export function applySeason(season, env) {
  const root = document.documentElement;
  if (!season) {
    delete root.dataset.season;
    return;
  }
  root.dataset.season = season.id;
  if (season.id !== 'christmas') return;
  const app = document.getElementById('app');
  const add = (parent, cls, html, tag = 'span') => {
    if (!parent || parent.querySelector(`:scope > .${cls}`)) return null;
    const el = document.createElement(tag);
    el.className = `xmas ${cls}`;
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML = html;
    parent.appendChild(el);
    return el;
  };
  // Guirlande lumineuse en haut de l'écran, avec deux boules suspendues
  const garland = add(app, 'xmas-garland', garlandSvg(), 'div');
  if (garland) {
    garland.insertAdjacentHTML('beforeend', `<span class="xmas-bauble b1">${BAUBLE('#e2263a')}</span><span class="xmas-bauble b2">${BAUBLE('#d9b25a')}</span>`);
    app.prepend(garland);
  }
  // Logo : bonnet sur le ballon, étincelles autour
  const logo = document.querySelector('.logo');
  add(document.querySelector('.logo-ball'), 'xmas-hat', HAT);
  add(logo, 'xmas-sparks', '<i>✦</i><i>✧</i><i>✦</i><i>❄</i>');
  // Ruban « Saison de Noël »
  const tagline = document.querySelector('.tagline');
  if (tagline && !document.querySelector('.xmas-ribbon')) {
    tagline.insertAdjacentHTML('afterend', `<p class="xmas xmas-ribbon"><span aria-hidden="true">🎄</span><span data-i18n="season.christmas">${env.text('season.christmas')}</span><span aria-hidden="true">❄</span></p>`);
  }
  // JOUER : neige sur le dessus, houx, cadeaux à côté
  const play = document.getElementById('btn-play');
  add(play, 'xmas-snowcap', SNOWCAP);
  add(play, 'xmas-holly', HOLLY);
  // Les cadeaux se posent contre le billet du Hoop Pass s'il est là, sinon à côté de JOUER
  const passBtn = document.querySelector('.pass-btn:not([hidden])');
  add(passBtn ?? play, 'xmas-gifts', `<span class="g1">${GIFT('#2f8a48', '#ffd254')}</span><span class="g2">${GIFT('#e2263a', '#fbfdff')}</span>`);
  // Sucre d'orge au bout des tuiles
  add(document.querySelector('.dock'), 'xmas-candy', CANDY);
}
