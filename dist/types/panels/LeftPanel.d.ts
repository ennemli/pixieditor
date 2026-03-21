import type { EditorAPI } from '../types/index.js';
import type { FormatRegistry } from '../format/FormatRegistry.js';
import type { DocumentModel } from '../model/DocumentModel.js';
import type { HistoryManager } from '../history/HistoryManager.js';
import type { EventEmitter } from '../core/EventEmitter.js';
/**
 * LeftPanel — draggable element palette + format controls.
 * DOM-based panel overlaid on the canvas.
 */
export declare class LeftPanel {
    private readonly _formatRegistry;
    private readonly _model;
    private readonly _history;
    private readonly _emitter;
    private _root;
    private _currentSelectedId;
    constructor(_formatRegistry: FormatRegistry, _model: DocumentModel, _history: HistoryManager, _emitter: EventEmitter);
    mount(container: HTMLElement, api: EditorAPI): HTMLElement;
    private _buildElementsPalette;
    private _formatsContainer;
    private _buildFormatSection;
    private _refreshFormats;
    private _makeSection;
}
