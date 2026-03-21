import type { EditorConfig, EditorAPI } from '../types/index.js';
/**
 * Editor — the top-level composition root.
 *
 * Responsibilities:
 *  - Wire all subsystems together
 *  - Expose a clean EditorAPI to consumers
 *  - Manage lifecycle (mount / destroy)
 *
 * All subsystems communicate only through EventEmitter (loose coupling).
 * Editor itself acts as a thin Facade over the subsystems.
 */
export declare class Editor {
    private readonly _config;
    private readonly _emitter;
    private readonly _model;
    private readonly _history;
    private readonly _snap;
    private readonly _formats;
    private readonly _renderer;
    private readonly _interaction;
    private readonly _menu;
    private readonly _panels;
    private _api;
    constructor(_config: EditorConfig);
    /**
     * Mount the editor into the given container and return the public API.
     */
    mount(): EditorAPI;
    private _buildAPI;
    private _registerBuiltinFormats;
}
