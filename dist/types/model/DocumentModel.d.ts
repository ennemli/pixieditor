import type { DocumentState, AnyElement, ElementType, ElementStyle } from '../types/index.js';
/**
 * DocumentModel owns all element data and enforces tree invariants.
 * It is the single source of truth — the renderer and panels only READ from it.
 *
 * Design: Repository + in-memory store with an immutable snapshot API.
 */
export declare class DocumentModel {
    private _state;
    constructor(initial?: Partial<Omit<DocumentState, 'id' | 'elements' | 'children'>>);
    getSnapshot(): DocumentState;
    loadSnapshot(snap: DocumentState): void;
    getElement(id: string): AnyElement | undefined;
    getElementOrThrow(id: string): AnyElement;
    getAllElements(): AnyElement[];
    getChildren(parentId: string | null): AnyElement[];
    getRootChildren(): AnyElement[];
    /** Walk the full subtree in DFS order */
    walkSubtree(rootId: string | null, cb: (el: AnyElement) => void): void;
    /** Returns all ancestors from immediate parent up to root */
    getAncestors(id: string): AnyElement[];
    getDocument(): DocumentState;
    addElement(type: ElementType, parentId: string | null, stylePatch?: Partial<ElementStyle>, extraProps?: Record<string, unknown>): AnyElement;
    removeElement(id: string): void;
    updateStyle(id: string, patch: Partial<ElementStyle>): void;
    updateContent(id: string, content: string): void;
    updateSrc(id: string, src: string): void;
    updateName(id: string, name: string): void;
    setLocked(id: string, locked: boolean): void;
    setVisible(id: string, visible: boolean): void;
    /**
     * Make element free: reparent it to root and record absolute position.
     * Position is passed in (caller must resolve world coordinates first).
     */
    setFree(id: string, free: boolean, worldPos?: {
        x: number;
        y: number;
    }): void;
    /**
     * Reparent an element under a new parent.
     * If newParentId is null, element goes to root.
     */
    reparent(id: string, newParentId: string | null): void;
    moveLayer(id: string, direction: 'up' | 'down' | 'top' | 'bottom'): void;
    reorderLayer(id: string, targetId: string, position: 'before' | 'after'): void;
    setDocumentSize(width: number, height: number): void;
    setDocumentBackground(color: string): void;
    setDocumentBackgroundImage(url: string): void;
    private _appendToParent;
    private _removeFromParent;
    private _defaultStyleFor;
}
