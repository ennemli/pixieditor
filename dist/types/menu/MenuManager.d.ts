import type { CustomMenuItem, ExportFormat, EditorAPI } from '../types/index.js';
export declare class MenuManager {
    private _bar;
    private readonly _customItems;
    private readonly _exportFormats;
    constructor(customItems?: CustomMenuItem[], exportFormats?: ExportFormat[]);
    mount(container: HTMLElement, api: EditorAPI): HTMLElement;
    private _addMenu;
    private _mkBtn;
    private _closeAll;
    private _dl;
}
