import type { EditorState } from '../models/types';

// ─── Command Interface ────────────────────────────────────────────────────────

/**
 * Command pattern: every mutation to EditorState is a Command.
 * Enables undo/redo and audit trails.
 */
export interface ICommand {
  readonly label: string;
  execute(state: EditorState): EditorState;
  undo(state: EditorState): EditorState;
}

// ─── Command History ─────────────────────────────────────────────────────────

const MAX_HISTORY = 200;

export class CommandHistory {
  private undoStack: ICommand[] = [];
  private redoStack: ICommand[] = [];

  get canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  get canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  push(command: ICommand): void {
    this.undoStack.push(command);
    if (this.undoStack.length > MAX_HISTORY) {
      this.undoStack.shift();
    }
    // Any new action clears the redo stack
    this.redoStack = [];
  }

  undo(state: EditorState): { state: EditorState; command: ICommand } | null {
    const command = this.undoStack.pop();
    if (!command) return null;
    this.redoStack.push(command);
    return { state: command.undo(state), command };
  }

  redo(state: EditorState): { state: EditorState; command: ICommand } | null {
    const command = this.redoStack.pop();
    if (!command) return null;
    this.undoStack.push(command);
    return { state: command.execute(state), command };
  }

  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }

  getUndoLabel(): string | null {
    return this.undoStack.at(-1)?.label ?? null;
  }

  getRedoLabel(): string | null {
    return this.redoStack.at(-1)?.label ?? null;
  }
}
