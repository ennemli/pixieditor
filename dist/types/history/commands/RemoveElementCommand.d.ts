import type { ICommand } from '../ICommand.js';
import type { DocumentModel } from '../../model/DocumentModel.js';
import type { EventEmitter } from '../../core/EventEmitter.js';
export declare class RemoveElementCommand implements ICommand {
    private readonly _model;
    private readonly _emitter;
    private readonly _id;
    readonly description = "Remove element";
    private _snapshot;
    constructor(_model: DocumentModel, _emitter: EventEmitter, _id: string);
    execute(): void;
    undo(): void;
}
