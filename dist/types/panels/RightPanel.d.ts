import type { EditorAPI } from '../types/index.js';
import type { DocumentModel } from '../model/DocumentModel.js';
import type { HistoryManager } from '../history/HistoryManager.js';
import type { EventEmitter } from '../core/EventEmitter.js';
import type { FormatRegistry } from '../format/FormatRegistry.js';
/**
 * RightPanel — two-tab panel: Properties + Layers.
 */
export declare class RightPanel {
    private readonly _model;
    private readonly _formatRegistry;
    private readonly _history;
    private readonly _emitter;
    private _root;
    private _propertiesPane;
    private _layersPane;
    private _activeTab;
    private _currentSelectedId;
    constructor(_model: DocumentModel, _formatRegistry: FormatRegistry, _history: HistoryManager, _emitter: EventEmitter);
    mount(container: HTMLElement, api: EditorAPI): HTMLElement;
    private _refreshProperties;
    private _refreshLayers;
    private _makeLayerRow;
    private _makeSection;
    private _placeholder;
}
