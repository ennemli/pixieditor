/**
 * ICommand — Command Pattern interface.
 *
 * Every mutation in the editor (move, resize, format, add, remove, etc.)
 * is expressed as a command. This enables undo/redo without special-casing
 * individual operations.
 */
export interface ICommand {
  /** Apply the mutation. */
  execute(): void;
  /** Reverse the mutation. */
  undo(): void;
  /** Human-readable label for debugging / history display. */
  readonly description: string;
}
