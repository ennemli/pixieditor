import type { ICommand } from '../ICommand.js';
import type { DocumentModel } from '../../model/DocumentModel.js';
import type { ElementType, ElementStyle } from '../../types/index.js';
import type { EventEmitter } from '../../core/EventEmitter.js';
export declare class AddElementCommand implements ICommand {
    private readonly _model;
    private readonly _emitter;
    private readonly _type;
    private readonly _parentId;
    private readonly _stylePatch;
    private readonly _extraProps;
    readonly description: string;
    private _createdElement;
    constructor(_model: DocumentModel, _emitter: EventEmitter, _type: ElementType, _parentId: string | null, _stylePatch: Partial<ElementStyle>, _extraProps?: Record<string, unknown>);
    execute(): void;
    undo(): void;
    get createdId(): string | null;
}
