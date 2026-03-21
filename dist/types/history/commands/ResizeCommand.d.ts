import type { ICommand } from '../ICommand.js';
import type { DocumentModel } from '../../model/DocumentModel.js';
import type { EventEmitter } from '../../core/EventEmitter.js';
export declare class ResizeCommand implements ICommand {
    private readonly _model;
    private readonly _emitter;
    private readonly _id;
    private readonly _next;
    readonly description = "Resize element";
    private _prev;
    constructor(_model: DocumentModel, _emitter: EventEmitter, _id: string, _next: {
        x: number;
        y: number;
        width: number;
        height: number;
    });
    execute(): void;
    undo(): void;
}
