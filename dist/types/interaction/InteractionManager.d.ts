import type { PixiRenderer } from '../renderer/PixiRenderer.js';
import type { DocumentModel } from '../model/DocumentModel.js';
import type { HistoryManager } from '../history/HistoryManager.js';
import type { SnapEngine } from '../snap/SnapEngine.js';
import type { EventEmitter } from '../core/EventEmitter.js';
export interface InteractionState {
    mode: 'idle' | 'selecting' | 'dragging' | 'resizing' | 'textEdit';
    selectedIds: string[];
    hovered: string | null;
}
/**
 * InteractionManager is the Mediator between PixiJS pointer events
 * and the editor commands. It orchestrates drag, resize, select, and
 * text editing interactions.
 */
export declare class InteractionManager {
    private readonly _renderer;
    private readonly _model;
    private readonly _history;
    private readonly _snap;
    private readonly _emitter;
    private _state;
    private _canvas;
    private _dragStartWorld;
    private _dragStartElementPositions;
    private _isDragging;
    private _dragThreshold;
    private _resizeHandle;
    private _resizeStartRect;
    private _resizeStartWorld;
    private _textEditOverlay;
    private _editingId;
    constructor(_renderer: PixiRenderer, _model: DocumentModel, _history: HistoryManager, _snap: SnapEngine, _emitter: EventEmitter);
    mount(canvas: HTMLCanvasElement): void;
    destroy(): void;
    getState(): InteractionState;
    selectIds(ids: string[]): void;
    clearSelection(): void;
    private _onPointerDown;
    private _onPointerMove;
    private _onPointerUp;
    private _onDblClick;
    private _onKeyDown;
    private _doDrag;
    private _commitDrag;
    private _startResize;
    private _doResize;
    private _commitResize;
    private _startTextEdit;
    private _commitTextEdit;
    private _removeTextOverlay;
    private _hitTest;
    private _hitTestIds;
    private _hitTestHandle;
    private _updateSelectionBounds;
    private _emitSelection;
}
