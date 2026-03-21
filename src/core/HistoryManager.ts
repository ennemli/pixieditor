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
export class HistoryManager {
  private past: ICommand[] = [];
  private future: ICommand[] = [];
  private readonly maxHistory: number;

  constructor(private readonly eventBus: EventBus, maxHistory = 100) {
    this.maxHistory = maxHistory;
  }

  /**
   * Execute a command and push it to the past stack.
   * Clears the future stack (invalidates any pending redos).
   */
  execute(command: ICommand): void {
    command.execute();
    this._pushPast(command);
    this.future = [];
    this._notify();
  }

  /**
   * Push a command that has *already been applied* to the history stack
   * without calling execute() again. Used for drag/resize completions
   * where mutations were applied incrementally during the gesture.
   */
  push(command: ICommand): void {
    this._pushPast(command);
    this.future = [];
    this._notify();
  }

  undo(): void {
    const command = this.past.pop();
    if (!command) return;
    command.undo();
    this.future.push(command);
    this._notify();
  }

  redo(): void {
    const command = this.future.pop();
    if (!command) return;
    command.execute();
    this.past.push(command);
    this._notify();
  }

  canUndo(): boolean {
    return this.past.length > 0;
  }

  canRedo(): boolean {
    return this.future.length > 0;
  }

  getState(): HistoryState {
    return { canUndo: this.canUndo(), canRedo: this.canRedo() };
  }

  clear(): void {
    this.past = [];
    this.future = [];
    this._notify();
  }

  private _pushPast(command: ICommand): void {
    this.past.push(command);
    if (this.past.length > this.maxHistory) {
      this.past.shift();
    }
  }

  private _notify(): void {
    this.eventBus.emit('history:changed', this.getState());
  }
}
