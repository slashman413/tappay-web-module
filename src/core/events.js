// Minimal synchronous event emitter (~30 LOC) so the module stays
// zero-dependency. Used by the card adapter to broadcast field-status
// changes and by the checkout UI to surface lifecycle events.

export class Emitter {
  constructor() {
    /** @type {Map<string, Set<Function>>} */
    this._handlers = new Map();
  }

  /** Subscribe. Returns an unsubscribe function. */
  on(event, handler) {
    if (!this._handlers.has(event)) this._handlers.set(event, new Set());
    this._handlers.get(event).add(handler);
    return () => this.off(event, handler);
  }

  off(event, handler) {
    this._handlers.get(event)?.delete(handler);
  }

  emit(event, payload) {
    this._handlers.get(event)?.forEach((h) => {
      try {
        h(payload);
      } catch (err) {
        // A misbehaving listener must not break the payment flow.
        console.error(`[tappay-web-module] listener for "${event}" threw:`, err);
      }
    });
  }
}
