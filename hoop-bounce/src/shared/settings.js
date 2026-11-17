// Réglages du joueur, enregistrés sur l'appareil et partagés entre le menu et le jeu.
// Le stockage peut être indisponible (navigation privée…) : on garde alors les valeurs en mémoire.

const KEY = 'hoopbounce.settings';

export const QUALITY_LEVELS = ['low', 'medium', 'high'];
export const LANGUAGES = ['fr', 'en', 'es'];

export function defaultSettings(navigatorLanguage = 'fr') {
  const lang = (navigatorLanguage || 'fr').slice(0, 2).toLowerCase();
  return {
    music: 0.5,          // 0..1
    sfx: 0.8,            // 0..1
    vibration: true,
    lang: LANGUAGES.includes(lang) ? lang : 'fr',
    quality: 'high',     // low | medium | high
  };
}

/** Corrige une valeur lue (ancienne version, valeur abîmée…) pour toujours rester valide. */
export function sanitize(raw, defaults) {
  const s = { ...defaults };
  if (!raw || typeof raw !== 'object') return s;
  const unit = (v, d) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : d);
  s.music = unit(raw.music, defaults.music);
  s.sfx = unit(raw.sfx, defaults.sfx);
  s.vibration = typeof raw.vibration === 'boolean' ? raw.vibration : defaults.vibration;
  s.lang = LANGUAGES.includes(raw.lang) ? raw.lang : defaults.lang;
  s.quality = QUALITY_LEVELS.includes(raw.quality) ? raw.quality : defaults.quality;
  return s;
}

export class Settings {
  /** @param {Storage|null} storage */
  constructor(storage = safeLocalStorage(), navigatorLanguage = globalThis.navigator?.language) {
    this.storage = storage;
    this.defaults = defaultSettings(navigatorLanguage);
    this.values = sanitize(this._read(), this.defaults);
    this._listeners = new Set();
  }

  get(key) {
    return this.values[key];
  }

  set(key, value) {
    const next = sanitize({ ...this.values, [key]: value }, this.defaults);
    if (next[key] === this.values[key]) return;
    this.values = next;
    this._write();
    for (const l of this._listeners) l(key, next[key], this.values);
  }

  onChange(listener) {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  _read() {
    try {
      const txt = this.storage?.getItem(KEY);
      return txt ? JSON.parse(txt) : null;
    } catch {
      return null;
    }
  }

  _write() {
    try {
      this.storage?.setItem(KEY, JSON.stringify(this.values));
    } catch {
      /* stockage indisponible : les réglages restent valables pour cette session */
    }
  }
}

function safeLocalStorage() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}
