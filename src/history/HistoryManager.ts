import type { ICommand } from './ICommand.js';
import type { EventEmitter } from '../core/EventEmitter.js';

/**
 * HistoryManager implements the Command pattern for undo/redo.
 * Snapshots are pushed on action completion (mouseup, blur, etc.),
 * not on every incremental change.
 */
export class HistoryManager {
  private readonly _stack: ICommand[] = [];
  private _cursor = -1;
  private readonly _maxSize: number;
  private readonly _emitter: EventEmitter;

  constructor(emitter: EventEmitter, maxSize = 100) {
    this._emitter = emitter;
    this._maxSize = maxSize;
  }

  execute(command: ICommand): void {
    // Truncate any redo future
    this._stack.splice(this._cursor + 1);

    command.execute();
    this._stack.push(command);

    if (this._stack.length > this._maxSize) {
      this._stack.shift();
    } else {
      this._cursor = this._stack.length - 1;
    }

    this._notify();
  }

  undo(): void {
    if (!this.canUndo()) return;
    this._stack[this._cursor].undo();
    this._cursor--;
    this._notify();
  }

  redo(): void {
    if (!this.canRedo()) return;
    this._cursor++;
    this._stack[this._cursor].execute();
    this._notify();
  }

  canUndo(): boolean { return this._cursor >= 0; }
  canRedo(): boolean { return this._cursor < this._stack.length - 1; }

  clear(): void {
    this._stack.length = 0;
    this._cursor = -1;
    this._notify();
  }

  private _notify(): void {
    this._emitter.emit('history:change', {
      canUndo: this.canUndo(),
      canRedo: this.canRedo(),
    });
  }
}
