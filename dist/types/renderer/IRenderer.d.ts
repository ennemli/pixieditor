import type { DocumentState, AnyElement, SnapGuide, SelectionState } from '../types/index.js';
export interface IRenderer {
    mount(container: HTMLElement): void | Promise<void>;
    render(document: DocumentState): void;
    updateElement(element: AnyElement): void;
    removeElement(id: string): void;
    setSelection(selection: SelectionState): void;
    setSnapGuides(guides: SnapGuide[]): void;
    getWorldPosition(screenX: number, screenY: number): {
        x: number;
        y: number;
    };
    getElementAt(worldX: number, worldY: number): string | null;
    destroy(): void;
}
