import type { EditorSnapshot, HistoryState } from '../types/editor.types';
import type { AnyElementModel } from '../types/element.types';

const DEFAULT_MAX = 100;

/**
 * Manages undo/redo stacks.
 *
 * Snapshots are pushed explicitly by the InteractionEngine after an
 * action completes (mouseup, blur, Enter) — never on every micro-change.
 *
 * Single Responsibility: only knows about snapshots, nothing else.
 */
export class HistoryManager {
  private past: EditorSnapshot[] = [];
  private future: EditorSnapshot[] = [];
  private readonly maxSize: number;

  constructor(maxSize = DEFAULT_MAX) {
    this.maxSize = maxSize;
  }

  /** Take a snapshot of the current state elements. */
  push(
    elements: Record<string, AnyElementModel>,
    rootChildren: string[],
    label?: string
  ): void {
    const snapshot: EditorSnapshot = {
      elements: this.deepClone(elements),
      rootChildren: [...rootChildren],
      timestamp: Date.now(),
      label,
    };

    this.past.push(snapshot);
    if (this.past.length > this.maxSize) {
      this.past.shift();
    }

    // A new action always clears the redo stack
    this.future = [];
  }

  undo(
    current: Record<string, AnyElementModel>,
    currentRootChildren: string[]
  ): EditorSnapshot | null {
    if (this.past.length === 0) return null;

    // Push current into future
    this.future.push({
      elements: this.deepClone(current),
      rootChildren: [...currentRootChildren],
      timestamp: Date.now(),
    });

    return this.past.pop()!;
  }

  redo(
    current: Record<string, AnyElementModel>,
    currentRootChildren: string[]
  ): EditorSnapshot | null {
    if (this.future.length === 0) return null;

    this.past.push({
      elements: this.deepClone(current),
      rootChildren: [...currentRootChildren],
      timestamp: Date.now(),
    });

    return this.future.pop()!;
  }

  canUndo(): boolean {
    return this.past.length > 0;
  }

  canRedo(): boolean {
    return this.future.length > 0;
  }

  getState(): HistoryState {
    return {
      past: this.past,
      future: this.future,
      maxSize: this.maxSize,
    };
  }

  clear(): void {
    this.past = [];
    this.future = [];
  }

  private deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
  }
}
