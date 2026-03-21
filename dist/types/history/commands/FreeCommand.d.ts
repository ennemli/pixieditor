import type { ICommand } from '../ICommand.js';
import type { DocumentModel } from '../../model/DocumentModel.js';
import type { EventEmitter } from '../../core/EventEmitter.js';
export declare class FreeCommand implements ICommand {
    private readonly _model;
    private readonly _emitter;
    private readonly _id;
    private readonly _free;
    private readonly _worldPos?;
    readonly description: string;
    private _prevParentId;
    private _prevFree;
    private _prevX;
    private _prevY;
    constructor(_model: DocumentModel, _emitter: EventEmitter, _id: string, _free: boolean, _worldPos?: {
        x: number;
        y: number;
    } | undefined);
    execute(): void;
    undo(): void;
}
