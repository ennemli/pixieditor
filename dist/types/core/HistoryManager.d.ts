import type { ICommand } from '../commands/ICommand';
import { EventBus } from './EventBus';
interface HistoryState {
    canUndo: boolean;
    canRedo: boolean;
}
/**
 * HistoryManager — Command Pattern.
 *
 * Maintains a past/future stack of ICommand objects.
 * All mutations should go through execute() so they can be undone/redone.
 *
 * For gestures (drag, resize) where the action is applied incrementally,
 * use push() after the gesture completes to record the before/after state
 * without re-executing the command.
 */
export declare class HistoryManager {
    private readonly eventBus;
    private past;
    private future;
    private readonly maxHistory;
    constructor(eventBus: EventBus, maxHistory?: number);
    /**
     * Execute a command and push it to the past stack.
     * Clears the future stack (invalidates any pending redos).
     */
    execute(command: ICommand): void;
    /**
     * Push a command that has *already been applied* to the history stack
     * without calling execute() again. Used for drag/resize completions
     * where mutations were applied incrementally during the gesture.
     */
    push(command: ICommand): void;
    undo(): void;
    redo(): void;
    canUndo(): boolean;
    canRedo(): boolean;
    getState(): HistoryState;
    clear(): void;
    private _pushPast;
    private _notify;
}
export {};
