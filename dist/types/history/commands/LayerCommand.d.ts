import type { ICommand } from '../ICommand.js';
import type { DocumentModel } from '../../model/DocumentModel.js';
import type { EventEmitter } from '../../core/EventEmitter.js';
export declare class LayerMoveCommand implements ICommand {
    private readonly _model;
    private readonly _emitter;
    private readonly _id;
    private readonly _direction;
    readonly description: string;
    private _snapshot;
    constructor(_model: DocumentModel, _emitter: EventEmitter, _id: string, _direction: 'up' | 'down' | 'top' | 'bottom');
    execute(): void;
    undo(): void;
}
export declare class LayerReorderCommand implements ICommand {
    private readonly _model;
    private readonly _emitter;
    private readonly _id;
    private readonly _targetId;
    private readonly _position;
    readonly description = "Reorder layer";
    private _snapshot;
    constructor(_model: DocumentModel, _emitter: EventEmitter, _id: string, _targetId: string, _position: 'before' | 'after');
    execute(): void;
    undo(): void;
}
