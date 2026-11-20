// Vibrations, sur toutes les plateformes, à partir d'un « motif » au format de navigator.vibrate
// (durée en ms, ou [vibre, pause, vibre, …]).
//
//  - Android (application ou navigateur) : navigator.vibrate, exactement comme avant ;
//  - iPhone : Safari et la WebView iOS n'ont pas navigator.vibrate. Dans l'application iOS
//    (Capacitor), on utilise le retour haptique natif (plugin officiel @capacitor/haptics) : chaque
//    segment « vibre » du motif devient un petit choc (léger, moyen ou fort selon sa durée), au même
//    rythme que le motif.
//  - ailleurs (Safari sur ordinateur…) : rien.

const nativeHaptics = () => {
  const C = globalThis.Capacitor;
  return C?.isNativePlatform?.() ? C.Plugins?.Haptics ?? null : null;
};

/** true si l'appareil peut vibrer (navigator.vibrate ou retour haptique natif). */
export function canVibrate() {
  return (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') || !!nativeHaptics();
}

const style = (ms) => (ms < 10 ? 'LIGHT' : ms < 20 ? 'MEDIUM' : 'HEAVY');

/** Joue un motif de vibration. Renvoie false si aucune vibration n'est possible. */
export function vibratePattern(pattern) {
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    try {
      navigator.vibrate(pattern);
    } catch {
      /* ignoré */
    }
    return true;
  }
  const H = nativeHaptics();
  if (!H) return false;
  const parts = Array.isArray(pattern) ? pattern : [pattern];
  let at = 0;
  parts.forEach((ms, i) => {
    if (i % 2 === 0 && ms > 0) {
      const fire = () => H.impact({ style: style(ms) }).catch?.(() => {});
      if (at === 0) fire();
      else setTimeout(fire, at);
    }
    at += ms;
  });
  return true;
}
