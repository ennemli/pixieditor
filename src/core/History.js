import { Events } from './EventBus.js';
import { CommandGroup } from '../commands/Command.js';

/**
 * History — Command Pattern / Memento
 *
 * Manages undo/redo stacks. All mutations flow through execute().
 * Snapshots are taken on action completion (mouseup, blur, Enter) —
 * continuous drag updates do NOT each push to history.
 *
 * Satisfies SRP: History only knows about Command objects, not model internals.
 */
export class History {
  /**
   * @param {import('./EventBus.js').EventBus} bus
   * @param {{ maxSteps: number }} config
   */
  constructor(bus, config) {
    this._bus = bus;
    this._maxSteps = config.maxSteps;
    /** @type {import('../commands/Command.js').Command[]} */
    this._undoStack = [];
    /** @type {import('../commands/Command.js').Command[]} */
    this._redoStack = [];
  }

  /**
   * Execute a command and register it as an undoable step.
   * Clears the redo stack (new action invalidates forward history).
   * @param {import('../commands/Command.js').Command} command
   */
  execute(command) {
    command.execute();
    this._undoStack.push(command);
    if (this._undoStack.length > this._maxSteps) {
      this._undoStack.shift(); // drop oldest
    }
    this._redoStack = [];
    this._notify();
    return command;
  }

  /**
   * Group multiple commands as one atomic undo step.
   * @param {import('../commands/Command.js').Command[]} commands
   * @param {string} [label]
   */
  executeGroup(commands, label) {
    return this.execute(new CommandGroup(commands, label));
  }

  /** Undo the most recent command. */
  undo() {
    if (!this.canUndo) return;
    const command = this._undoStack.pop();
    command.undo();
    this._redoStack.push(command);
    this._notify();
  }

  /** Redo the most recently undone command. */
  redo() {
    if (!this.canRedo) return;
    const command = this._redoStack.pop();
    command.execute();
    this._undoStack.push(command);
    this._notify();
  }

  get canUndo() {
    return this._undoStack.length > 0;
  }

  get canRedo() {
    return this._redoStack.length > 0;
  }

  get undoLabel() {
    return this._undoStack[this._undoStack.length - 1]?.label ?? null;
  }

  get redoLabel() {
    return this._redoStack[this._redoStack.length - 1]?.label ?? null;
  }

  /** Clears all history. Use when loading a new scene. */
  clear() {
    this._undoStack = [];
    this._redoStack = [];
    this._notify();
  }

  _notify() {
    this._bus.emit(Events.HISTORY_CHANGED, {
      canUndo: this.canUndo,
      canRedo: this.canRedo,
      undoLabel: this.undoLabel,
      redoLabel: this.redoLabel,
      undoCount: this._undoStack.length,
    });
  }
}
