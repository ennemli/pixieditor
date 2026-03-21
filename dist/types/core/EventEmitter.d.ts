import type { EditorEventMap, EditorEventName } from '../types/index.js';
type Handler<T> = (payload: T) => void;
/**
 * Typed event emitter — the internal bus used by all subsystems.
 * Follows the Observer pattern.
 */
export declare class EventEmitter {
    private readonly _listeners;
    on<K extends EditorEventName>(event: K, handler: Handler<EditorEventMap[K]>): void;
    off<K extends EditorEventName>(event: K, handler: Handler<EditorEventMap[K]>): void;
    emit<K extends EditorEventName>(event: K, payload: EditorEventMap[K]): void;
    removeAllListeners(event?: EditorEventName): void;
}
export {};
