// Largeur réellement utilisable de l'écran (iPhone à encoche ou Dynamic Island, téléphones à découpe).
//
// En paysage, iOS réserve ~47 à 59 px de chaque côté pour l'encoche : un iPhone 15 (852 px de large)
// n'offre en fait que ~734 px à l'interface. Les media queries ne voient que la largeur totale ; ce
// module mesure les marges (env(safe-area-inset-*)) et pose sur <html> les classes `fit-760` et
// `fit-1100` quand la largeur utilisable passe sous ces seuils. Le CSS applique alors les mêmes mises en
// page compactes que sur un écran plus étroit. Sans encoche, rien ne change (les media queries
// s'appliquent déjà).

const THRESHOLDS = [760, 1100];

let probe = null;

function insets() {
  if (!probe) {
    probe = document.createElement('div');
    probe.setAttribute('aria-hidden', 'true');
    probe.style.cssText =
      'position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;pointer-events:none;' +
      'padding-left:var(--safe-left, env(safe-area-inset-left, 0px));padding-right:var(--safe-right, env(safe-area-inset-right, 0px))';
    document.body.appendChild(probe);
  }
  const cs = getComputedStyle(probe);
  return (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0);
}

/** Met à jour les classes fit-* ; renvoie la largeur utilisable (px CSS). */
export function updateSafeWidth() {
  const usable = window.innerWidth - insets();
  const root = document.documentElement;
  for (const t of THRESHOLDS) root.classList.toggle(`fit-${t}`, usable <= t);
  return usable;
}

export function watchSafeWidth() {
  const run = () => updateSafeWidth();
  if (document.body) run();
  else document.addEventListener('DOMContentLoaded', run, { once: true });
  window.addEventListener('resize', run);
  window.addEventListener('orientationchange', () => setTimeout(run, 250));
}
