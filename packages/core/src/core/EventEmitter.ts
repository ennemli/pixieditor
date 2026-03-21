import type { EditorEventMap, EditorEventType, EditorEventListener } from '../types/event.types';

type ListenerMap = {
  [K in EditorEventType]?: Set<EditorEventListener<K>>;
};

/**
 * Strongly-typed event emitter.
 * All modules communicate exclusively through this — never through
 * direct method calls across module boundaries (Dependency Inversion).
 */
export class EventEmitter {
  private readonly listeners: ListenerMap = {};

  on<K extends EditorEventType>(
    event: K,
    listener: EditorEventListener<K>
  ): () => void {
    if (!this.listeners[event]) {
      (this.listeners as Record<string, Set<unknown>>)[event] = new Set();
    }
    (this.listeners[event] as Set<EditorEventListener<K>>).add(listener);

    // Return an unsubscribe function
    return () => this.off(event, listener);
  }

  off<K extends EditorEventType>(
    event: K,
    listener: EditorEventListener<K>
  ): void {
    (this.listeners[event] as Set<EditorEventListener<K>> | undefined)?.delete(listener);
  }

  emit<K extends EditorEventType>(event: K, payload: EditorEventMap[K]): void {
    const set = this.listeners[event] as Set<EditorEventListener<K>> | undefined;
    if (!set) return;
    for (const listener of set) {
      try {
        listener(payload);
      } catch (err) {
        console.error(`[EventEmitter] Error in listener for "${event}":`, err);
      }
    }
  }

  /** Remove all listeners for an event (or all events). */
  removeAll(event?: EditorEventType): void {
    if (event) {
      delete this.listeners[event];
    } else {
      for (const key of Object.keys(this.listeners)) {
        delete (this.listeners as Record<string, unknown>)[key];
      }
    }
  }

  /** One-time listener. */
  once<K extends EditorEventType>(
    event: K,
    listener: EditorEventListener<K>
  ): void {
    const wrapper: EditorEventListener<K> = (payload) => {
      listener(payload);
      this.off(event, wrapper);
    };
    this.on(event, wrapper);
  }
}
