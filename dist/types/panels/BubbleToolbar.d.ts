import type { EditorAPI } from '../types/index.js';
import type { DocumentModel } from '../model/DocumentModel.js';
import type { HistoryManager } from '../history/HistoryManager.js';
import type { EventEmitter } from '../core/EventEmitter.js';
/**
 * BubbleToolbar — floating toolbar that appears above text elements when selected.
 * Contains quick text formatting: bold, italic, underline, align, size, color.
 */
export declare class BubbleToolbar {
    private readonly _model;
    private readonly _history;
    private readonly _emitter;
    private _root;
    private _currentId;
    constructor(_model: DocumentModel, _history: HistoryManager, _emitter: EventEmitter);
    mount(container: HTMLElement, api: EditorAPI): void;
    private _show;
    private _updateStyle;
    private _hide;
}
