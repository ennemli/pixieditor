import type { EditorEventType, EventHandler } from '../types/index.js';

/**
 * EventBus — Observer pattern.
 *
 * Provides typed pub/sub between editor subsystems so that
 * each component stays decoupled from others.
 */
export class EventBus {
  private handlers: Map<EditorEventType, Set<EventHandler>> = new Map();

  /** Subscribe to an event. Returns an unsubscribe function. */
  on<T = unknown>(event: EditorEventType, handler: EventHandler<T>): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler as EventHandler);
    return () => this.off(event, handler);
  }

  /** Unsubscribe a specific handler. */
  off<T = unknown>(event: EditorEventType, handler: EventHandler<T>): void {
    this.handlers.get(event)?.delete(handler as EventHandler);
  }

  /** Publish an event to all subscribers. */
  emit<T = unknown>(event: EditorEventType, payload?: T): void {
    this.handlers.get(event)?.forEach(h => h(payload));
  }

  /** Remove all subscribers for all events. */
  removeAll(): void {
    this.handlers.clear();
  }
}
