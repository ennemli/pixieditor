import type { ICommand } from '../ICommand.js';
import type { DocumentModel } from '../../model/DocumentModel.js';
import type { EventEmitter } from '../../core/EventEmitter.js';
export declare class MoveCommand implements ICommand {
    private readonly _model;
    private readonly _emitter;
    private readonly _id;
    private readonly _x;
    private readonly _y;
    readonly description = "Move element";
    private _prevX;
    private _prevY;
    constructor(_model: DocumentModel, _emitter: EventEmitter, _id: string, _x: number, _y: number);
    execute(): void;
    undo(): void;
}
