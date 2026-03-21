import type { EditorEventType, EventHandler } from '../types/index.js';
/**
 * EventBus — Observer pattern.
 *
 * Provides typed pub/sub between editor subsystems so that
 * each component stays decoupled from others.
 */
export declare class EventBus {
    private handlers;
    /** Subscribe to an event. Returns an unsubscribe function. */
    on<T = unknown>(event: EditorEventType, handler: EventHandler<T>): () => void;
    /** Unsubscribe a specific handler. */
    off<T = unknown>(event: EditorEventType, handler: EventHandler<T>): void;
    /** Publish an event to all subscribers. */
    emit<T = unknown>(event: EditorEventType, payload?: T): void;
    /** Remove all subscribers for all events. */
    removeAll(): void;
}
