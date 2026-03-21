import type { EditorAPI, PanelConfig } from '../types/index.js';
import type { DocumentModel } from '../model/DocumentModel.js';
import type { FormatRegistry } from '../format/FormatRegistry.js';
import type { HistoryManager } from '../history/HistoryManager.js';
import type { EventEmitter } from '../core/EventEmitter.js';
import type { MenuManager } from '../menu/MenuManager.js';
/**
 * PanelManager orchestrates all DOM panels and applies theming.
 */
export declare class PanelManager {
    private readonly _model;
    private readonly _formatRegistry;
    private readonly _history;
    private readonly _emitter;
    private readonly _menu;
    private readonly _config;
    private _shell;
    private _canvasWrap;
    private readonly _left;
    private readonly _right;
    private readonly _bubble;
    constructor(_model: DocumentModel, _formatRegistry: FormatRegistry, _history: HistoryManager, _emitter: EventEmitter, _menu: MenuManager, _config?: PanelConfig);
    mount(container: HTMLElement, api: EditorAPI): {
        canvasContainer: HTMLElement;
    };
    private _applyTheme;
}
