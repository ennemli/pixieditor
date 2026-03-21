import type { ICommand } from '../ICommand.js';
import type { DocumentModel } from '../../model/DocumentModel.js';
import type { ElementStyle } from '../../types/index.js';
import type { EventEmitter } from '../../core/EventEmitter.js';
export declare class StyleCommand implements ICommand {
    private readonly _model;
    private readonly _emitter;
    private readonly _id;
    private readonly _patch;
    readonly description = "Update style";
    private _before;
    constructor(_model: DocumentModel, _emitter: EventEmitter, _id: string, _patch: Partial<ElementStyle>);
    execute(): void;
    undo(): void;
}
