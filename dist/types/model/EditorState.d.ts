import type { EditorStateSnapshot, CanvasConfig, SnapConfig } from '@/types';
import type { BaseElement } from './elements/BaseElement';
/**
 * EditorState — the single source of truth for all editor data.
 *
 * Stores:
 *  - A flat map of all elements by ID.
 *  - The root-level ordered list (z-order for elements with no parent).
 *  - Selected element IDs.
 *  - Canvas and snap config.
 *
 * Does NOT know about rendering or interaction — only data.
 * Emits no events itself; the Editor mediator subscribes to changes.
 */
export declare class EditorState {
    private _elements;
    /** Root-level IDs in z-order (index 0 = bottom). */
    private _rootOrder;
    private _selectedIds;
    private _canvas;
    private _snap;
    constructor(canvas?: CanvasConfig, snap?: SnapConfig);
    getElement(id: string): BaseElement | undefined;
    getAllElements(): BaseElement[];
    getElementById<T extends BaseElement = BaseElement>(id: string): T;
    hasElement(id: string): boolean;
    /**
     * Add an element to the state. If parentId is set and element is not free,
     * it is added to the parent's children list. Otherwise it joins rootOrder.
     */
    addElement(element: BaseElement): void;
    removeElement(id: string): BaseElement | undefined;
    /** Make element free: detach from parent, add to root canvas. */
    freeElement(id: string, canvasX: number, canvasY: number): void;
    /** Unfree an element: attach it to a target parent box. */
    unfreeElement(id: string, targetParentId: string | null, localX: number, localY: number): void;
    get rootOrder(): string[];
    private _ensureInRoot;
    setZIndex(id: string, zIndex: number): void;
    bringForward(id: string): void;
    sendBackward(id: string): void;
    bringToFront(id: string): void;
    sendToBack(id: string): void;
    get selectedIds(): string[];
    setSelection(ids: string[]): void;
    addToSelection(id: string): void;
    removeFromSelection(id: string): void;
    clearSelection(): void;
    isSelected(id: string): boolean;
    get canvas(): CanvasConfig;
    get snap(): SnapConfig;
    updateCanvas(patch: Partial<CanvasConfig>): void;
    updateSnap(patch: Partial<SnapConfig>): void;
    toSnapshot(): EditorStateSnapshot;
    loadSnapshot(snapshot: EditorStateSnapshot): void;
}
