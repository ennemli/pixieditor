import type { ICommand } from '../ICommand.js';

/** Groups multiple commands into a single undo/redo unit */
export class CompoundCommand implements ICommand {
  readonly description: string;

  constructor(
    private readonly _commands: ICommand[],
    description?: string
  ) {
    this.description = description ?? _commands.map(c => c.description).join(' + ');
  }

  execute(): void {
    for (const cmd of this._commands) cmd.execute();
  }

  undo(): void {
    for (let i = this._commands.length - 1; i >= 0; i--) {
      this._commands[i].undo();
    }
  }
}
