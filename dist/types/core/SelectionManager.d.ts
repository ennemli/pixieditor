import { EventBus } from './EventBus';
/**
 * SelectionManager
 *
 * Tracks which element IDs are currently selected.
 * Supports multi-selection via Shift+click (additive mode).
 */
export declare class SelectionManager {
    private readonly eventBus;
    private selectedIds;
    constructor(eventBus: EventBus);
    /**
     * Select an element.
     * @param id       Element to select
     * @param additive If true, add to existing selection (Shift+click)
     */
    select(id: string, additive?: boolean): void;
    /**
     * Deselect a specific element, or all elements if no ID given.
     */
    deselect(id?: string): void;
    /** Toggle selection state of an element. */
    toggle(id: string): void;
    isSelected(id: string): boolean;
    getSelected(): string[];
    hasSelection(): boolean;
    /** Returns the selected ID if exactly one element is selected, else null. */
    getSingleSelected(): string | null;
    getCount(): number;
}
