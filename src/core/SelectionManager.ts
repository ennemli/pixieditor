import { EventBus } from './EventBus';

/**
 * SelectionManager
 *
 * Tracks which element IDs are currently selected.
 * Supports multi-selection via Shift+click (additive mode).
 */
export class SelectionManager {
  private selectedIds: Set<string> = new Set();

  constructor(private readonly eventBus: EventBus) {}

  /**
   * Select an element.
   * @param id       Element to select
   * @param additive If true, add to existing selection (Shift+click)
   */
  select(id: string, additive = false): void {
    if (!additive) {
      this.selectedIds.clear();
    }
    this.selectedIds.add(id);
    this.eventBus.emit('element:selected', { ids: this.getSelected() });
  }

  /**
   * Deselect a specific element, or all elements if no ID given.
   */
  deselect(id?: string): void {
    if (id) {
      this.selectedIds.delete(id);
    } else {
      this.selectedIds.clear();
    }
    this.eventBus.emit('element:deselected', { ids: this.getSelected() });
  }

  /** Toggle selection state of an element. */
  toggle(id: string): void {
    if (this.isSelected(id)) {
      this.deselect(id);
    } else {
      this.select(id, true);
    }
  }

  isSelected(id: string): boolean {
    return this.selectedIds.has(id);
  }

  getSelected(): string[] {
    return Array.from(this.selectedIds);
  }

  hasSelection(): boolean {
    return this.selectedIds.size > 0;
  }

  /** Returns the selected ID if exactly one element is selected, else null. */
  getSingleSelected(): string | null {
    const ids = this.getSelected();
    return ids.length === 1 ? ids[0] : null;
  }

  getCount(): number {
    return this.selectedIds.size;
  }
}
