/**
 * Command — Abstract Base (Command Pattern)
 *
 * Every user action that mutates editor state MUST be expressed as a Command.
 * Commands are the only way mutations reach the model — this ensures
 * history (undo/redo) is always consistent with the actual state.
 *
 * Subclasses implement execute() and undo().
 * The label property is shown in the history UI.
 */
export class Command {
  /** @param {string} label - Human-readable name for undo/redo UI */
  constructor(label = 'Action') {
    this.label = label;
  }

  /** Apply the command. Must be idempotent when called after undo(). */
  execute() {
    throw new Error(`[Command] ${this.constructor.name} must implement execute()`);
  }

  /** Reverse the command. Must fully restore pre-execute() state. */
  undo() {
    throw new Error(`[Command] ${this.constructor.name} must implement undo()`);
  }
}

/**
 * CommandGroup — Composite Command
 *
 * Wraps multiple commands into a single undo/redo step.
 * Executes in order, undoes in reverse.
 */
export class CommandGroup extends Command {
  /**
   * @param {Command[]} commands
   * @param {string} [label]
   */
  constructor(commands, label) {
    super(label ?? commands[0]?.label ?? 'Group');
    this.commands = commands;
  }

  execute() {
    this.commands.forEach((c) => c.execute());
  }

  undo() {
    [...this.commands].reverse().forEach((c) => c.undo());
  }
}
