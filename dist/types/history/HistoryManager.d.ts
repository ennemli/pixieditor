import type { ICommand } from './ICommand.js';
import type { EventEmitter } from '../core/EventEmitter.js';
/**
 * HistoryManager implements the Command pattern for undo/redo.
 * Snapshots are pushed on action completion (mouseup, blur, etc.),
 * not on every incremental change.
 */
export declare class HistoryManager {
    private readonly _stack;
    private _cursor;
    private readonly _maxSize;
    private readonly _emitter;
    constructor(emitter: EventEmitter, maxSize?: number);
    execute(command: ICommand): void;
    undo(): void;
    redo(): void;
    canUndo(): boolean;
    canRedo(): boolean;
    clear(): void;
    private _notify;
}
