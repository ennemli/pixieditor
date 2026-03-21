import type { ICommand } from '../ICommand.js';
/** Groups multiple commands into a single undo/redo unit */
export declare class CompoundCommand implements ICommand {
    private readonly _commands;
    readonly description: string;
    constructor(_commands: ICommand[], description?: string);
    execute(): void;
    undo(): void;
}
