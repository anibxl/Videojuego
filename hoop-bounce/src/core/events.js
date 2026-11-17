// Bus d'événements minimal : la logique de jeu émet, la présentation (son, vibrations,
// effets visuels, caméra) écoute. Les deux restent indépendantes.

export class EventBus {
  constructor() {
    this._handlers = new Map();
  }

  on(type, handler) {
    if (!this._handlers.has(type)) this._handlers.set(type, new Set());
    this._handlers.get(type).add(handler);
    return () => this._handlers.get(type)?.delete(handler);
  }

  emit(type, payload) {
    const set = this._handlers.get(type);
    if (!set) return;
    for (const h of set) h(payload);
  }
}
