import type {
  AnyElementModel, EditorStateSnapshot, CanvasConfig, SnapConfig,
} from '@/types';
import { DEFAULT_SNAP, DEFAULT_CANVAS } from '@/core/EditorConfig';
import { ElementFactory } from './elements/ElementFactory';
import type { BaseElement } from './elements/BaseElement';
import type { BoxElement } from './elements/BoxElement';

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
export class EditorState {
  private _elements: Map<string, BaseElement> = new Map();
  /** Root-level IDs in z-order (index 0 = bottom). */
  private _rootOrder: string[] = [];
  private _selectedIds: Set<string> = new Set();
  private _canvas: CanvasConfig;
  private _snap: SnapConfig;

  constructor(canvas: CanvasConfig = DEFAULT_CANVAS, snap: SnapConfig = DEFAULT_SNAP) {
    this._canvas = { ...canvas };
    this._snap = { ...snap };
  }

  // ── Elements ─────────────────────────────────────────────────────────────────

  getElement(id: string): BaseElement | undefined {
    return this._elements.get(id);
  }

  getAllElements(): BaseElement[] {
    return Array.from(this._elements.values());
  }

  getElementById<T extends BaseElement = BaseElement>(id: string): T {
    const el = this._elements.get(id);
    if (!el) throw new Error(`[EditorState] Element not found: ${id}`);
    return el as T;
  }

  hasElement(id: string): boolean {
    return this._elements.has(id);
  }

  /**
   * Add an element to the state. If parentId is set and element is not free,
   * it is added to the parent's children list. Otherwise it joins rootOrder.
   */
  addElement(element: BaseElement): void {
    this._elements.set(element.id, element);

    if (element.parentId && !element.free) {
      const parent = this._elements.get(element.parentId);
      if (parent && parent.type === 'box') {
        (parent as BoxElement).addChild(element.id);
      }
    } else {
      this._ensureInRoot(element.id, element.zIndex);
    }
  }

  removeElement(id: string): BaseElement | undefined {
    const element = this._elements.get(id);
    if (!element) return undefined;

    // Remove from parent or root
    if (element.parentId) {
      const parent = this._elements.get(element.parentId);
      if (parent?.type === 'box') (parent as BoxElement).removeChild(id);
    } else {
      this._rootOrder = this._rootOrder.filter(i => i !== id);
    }

    // Remove from selection
    this._selectedIds.delete(id);
    this._elements.delete(id);

    // Recursively remove children if it's a box
    if (element.type === 'box') {
      const box = element as BoxElement;
      [...box.children].forEach(childId => this.removeElement(childId));
    }

    return element;
  }

  /** Make element free: detach from parent, add to root canvas. */
  freeElement(id: string, canvasX: number, canvasY: number): void {
    const element = this._elements.get(id);
    if (!element) return;

    if (element.parentId) {
      const parent = this._elements.get(element.parentId);
      if (parent?.type === 'box') (parent as BoxElement).removeChild(id);
      element.parentId = null;
    }

    element.free = true;
    element.x = canvasX;
    element.y = canvasY;
    this._ensureInRoot(id, element.zIndex);
  }

  /** Unfree an element: attach it to a target parent box. */
  unfreeElement(id: string, targetParentId: string | null, localX: number, localY: number): void {
    const element = this._elements.get(id);
    if (!element) return;

    // Remove from root order
    this._rootOrder = this._rootOrder.filter(i => i !== id);
    element.free = false;
    element.x = localX;
    element.y = localY;
    element.parentId = targetParentId;

    if (targetParentId) {
      const parent = this._elements.get(targetParentId);
      if (parent?.type === 'box') (parent as BoxElement).addChild(id);
    } else {
      this._ensureInRoot(id, element.zIndex);
    }
  }

  // ── Root order / z-index ─────────────────────────────────────────────────────

  get rootOrder(): string[] { return [...this._rootOrder]; }

  private _ensureInRoot(id: string, zIndex: number): void {
    if (!this._rootOrder.includes(id)) {
      // Insert at correct z-index position
      const insertAt = this._rootOrder.findIndex(existingId => {
        const el = this._elements.get(existingId);
        return (el?.zIndex ?? 0) > zIndex;
      });
      if (insertAt === -1) {
        this._rootOrder.push(id);
      } else {
        this._rootOrder.splice(insertAt, 0, id);
      }
    }
  }

  setZIndex(id: string, zIndex: number): void {
    const element = this._elements.get(id);
    if (!element) return;
    element.zIndex = zIndex;

    if (!element.parentId || element.free) {
      // Re-sort root order
      this._rootOrder = this._rootOrder
        .map(i => ({ id: i, z: this._elements.get(i)?.zIndex ?? 0 }))
        .sort((a, b) => a.z - b.z)
        .map(e => e.id);
    }
  }

  bringForward(id: string): void {
    const element = this._elements.get(id);
    if (!element) return;
    this.setZIndex(id, element.zIndex + 1);
  }

  sendBackward(id: string): void {
    const element = this._elements.get(id);
    if (!element) return;
    this.setZIndex(id, Math.max(0, element.zIndex - 1));
  }

  bringToFront(id: string): void {
    const maxZ = Math.max(0, ...Array.from(this._elements.values()).map(e => e.zIndex));
    this.setZIndex(id, maxZ + 1);
  }

  sendToBack(id: string): void {
    this.setZIndex(id, 0);
  }

  // ── Selection ────────────────────────────────────────────────────────────────

  get selectedIds(): string[] { return Array.from(this._selectedIds); }

  setSelection(ids: string[]): void {
    this._selectedIds = new Set(ids.filter(id => this._elements.has(id)));
  }

  addToSelection(id: string): void {
    if (this._elements.has(id)) this._selectedIds.add(id);
  }

  removeFromSelection(id: string): void {
    this._selectedIds.delete(id);
  }

  clearSelection(): void {
    this._selectedIds.clear();
  }

  isSelected(id: string): boolean {
    return this._selectedIds.has(id);
  }

  // ── Canvas & Snap ────────────────────────────────────────────────────────────

  get canvas(): CanvasConfig { return { ...this._canvas }; }
  get snap(): SnapConfig { return { ...this._snap }; }

  updateCanvas(patch: Partial<CanvasConfig>): void {
    this._canvas = { ...this._canvas, ...patch };
  }

  updateSnap(patch: Partial<SnapConfig>): void {
    this._snap = { ...this._snap, ...patch };
  }

  // ── Serialisation ────────────────────────────────────────────────────────────

  toSnapshot(): EditorStateSnapshot {
    const elements: Record<string, AnyElementModel> = {};
    this._elements.forEach((el, id) => {
      elements[id] = el.toModel() as AnyElementModel;
    });
    return {
      version: '1.0.0',
      canvas: { ...this._canvas },
      elements,
      rootOrder: [...this._rootOrder],
      snap: { ...this._snap },
    };
  }

  loadSnapshot(snapshot: EditorStateSnapshot): void {
    this._elements.clear();
    this._rootOrder = [];
    this._selectedIds.clear();
    this._canvas = { ...snapshot.canvas };
    this._snap = { ...snapshot.snap };

    // First pass: create all elements
    Object.values(snapshot.elements).forEach(model => {
      const el = ElementFactory.fromModel(model);
      this._elements.set(el.id, el);
    });

    // Second pass: restore root order
    this._rootOrder = [...snapshot.rootOrder];
  }
}
