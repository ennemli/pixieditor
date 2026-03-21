import type { EditorEventMap, EditorEventName } from '../types/index.js';

type Handler<T> = (payload: T) => void;

/**
 * Typed event emitter — the internal bus used by all subsystems.
 * Follows the Observer pattern.
 */
export class EventEmitter {
  private readonly _listeners = new Map<string, Set<Handler<any>>>();

  on<K extends EditorEventName>(event: K, handler: Handler<EditorEventMap[K]>): void {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set());
    }
    this._listeners.get(event)!.add(handler);
  }

  off<K extends EditorEventName>(event: K, handler: Handler<EditorEventMap[K]>): void {
    this._listeners.get(event)?.delete(handler);
  }

  emit<K extends EditorEventName>(event: K, payload: EditorEventMap[K]): void {
    this._listeners.get(event)?.forEach(h => h(payload));
  }

  removeAllListeners(event?: EditorEventName): void {
    if (event) {
      this._listeners.delete(event);
    } else {
      this._listeners.clear();
    }
  }
}
