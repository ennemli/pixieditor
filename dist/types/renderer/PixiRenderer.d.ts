import type { DocumentState, AnyElement, SnapGuide, SelectionState } from '../types/index.js';
import type { IRenderer } from './IRenderer.js';
/**
 * PixiRenderer — the WebGL rendering engine.
 * Each element maps to a PIXI.Container. Free elements live on the rootStage,
 * nested elements inside their parent's childContainer.
 *
 * Implements IRenderer (Dependency Inversion Principle).
 */
export declare class PixiRenderer implements IRenderer {
    private _app;
    private _rootStage;
    private _guideLayer;
    private _selectionLayer;
    private _gridLayer;
    private _doc;
    /** Map elementId → PIXI.Container */
    private readonly _displayObjects;
    private _showGrid;
    private _gridSize;
    private _gridColor;
    mount(container: HTMLElement): void;
    render(doc: DocumentState): void;
    updateElement(element: AnyElement): void;
    removeElement(id: string): void;
    setSelection(selection: SelectionState): void;
    setSnapGuides(guides: SnapGuide[]): void;
    getWorldPosition(screenX: number, screenY: number): {
        x: number;
        y: number;
    };
    getElementAt(worldX: number, worldY: number): string | null;
    getCanvas(): HTMLCanvasElement;
    getStageOffset(): {
        x: number;
        y: number;
    };
    showGrid(show: boolean, size?: number, color?: string): void;
    destroy(): void;
    private _docBg;
    private _drawDocBackground;
    private _drawGrid;
    private _renderChildren;
    private _createDisplayObject;
    private _drawElementGraphics;
    private _syncElementDisplay;
    private _getParentContainer;
    private _toScreenRect;
    private _getHandlePositions;
}
