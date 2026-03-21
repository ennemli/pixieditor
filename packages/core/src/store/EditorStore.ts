import type { EditorState, CanvasConfig, SnapConfig } from '../types/editor.types';
import type {
  AnyElementModel,
  BoxElementModel,
  ElementFormat,
  ElementTransform,
  ElementType,
} from '../types/element.types';
import type { EventEmitter } from '../core/EventEmitter';
import { HistoryManager } from './HistoryManager';
import { generateId } from '../core/IdGenerator';

const DEFAULT_CANVAS: CanvasConfig = {
  width: 1200,
  height: 800,
  backgroundColor: '#ffffff',
  zoom: 1,
  panX: 0,
  panY: 0,
};

const DEFAULT_SNAP: SnapConfig = {
  enabled: true,
  grid: true,
  gridSize: 8,
  elements: true,
  canvas: true,
  smartGuides: true,
  threshold: 6,
};

/**
 * EditorStore — the single source of truth.
 *
 * All state is mutated here.  The store emits 'state:change' after every
 * mutation so that the renderer and panels can react.
 *
 * Single Responsibility: owns state and exposes atomic mutation methods.
 * Open/Closed: new element types can be added without touching the store;
 *   they just need to be registered via addElement().
 */
export class EditorStore {
  private state: EditorState;
  private readonly history: HistoryManager;
  private readonly emitter: EventEmitter;

  constructor(emitter: EventEmitter, initial?: Partial<EditorState>) {
    this.emitter = emitter;
    this.history = new HistoryManager(100);

    this.state = {
      elements: {},
      rootChildren: [],
      selectedIds: [],
      hoveredId: null,
      editingTextId: null,
      canvas: { ...DEFAULT_CANVAS, ...initial?.canvas },
      snap: { ...DEFAULT_SNAP, ...initial?.snap },
      history: this.history.getState(),
      ...initial,
    };
  }

  // -------------------------------------------------------------------------
  // Read
  // -------------------------------------------------------------------------

  getState(): EditorState {
    return this.state;
  }

  getElement(id: string): AnyElementModel | undefined {
    return this.state.elements[id];
  }

  getSelected(): AnyElementModel[] {
    return this.state.selectedIds
      .map((id) => this.state.elements[id])
      .filter(Boolean);
  }

  // -------------------------------------------------------------------------
  // Element mutations
  // -------------------------------------------------------------------------

  addElement(element: AnyElementModel, pushHistory = true): void {
    this.state = {
      ...this.state,
      elements: { ...this.state.elements, [element.id]: element },
    };

    if (!element.parentId) {
      this.state = {
        ...this.state,
        rootChildren: [...this.state.rootChildren, element.id],
      };
    } else {
      const parent = this.state.elements[element.parentId] as BoxElementModel | undefined;
      if (parent && parent.type === 'box') {
        this.updateElement(parent.id, {
          children: [...parent.children, element.id],
        } as Partial<BoxElementModel>, false);
      }
    }

    if (pushHistory) this.pushHistory(`Add ${element.type}`);
    this.emitter.emit('element:add', { element });
    this.emitStateChange();
  }

  removeElement(id: string, pushHistory = true): void {
    const el = this.state.elements[id];
    if (!el) return;

    // Recursively remove children first
    if (el.type === 'box') {
      [...(el as BoxElementModel).children].forEach((childId) =>
        this.removeElement(childId, false)
      );
    }

    const newElements = { ...this.state.elements };
    delete newElements[id];

    let newRootChildren = this.state.rootChildren.filter((c) => c !== id);

    // Remove from parent children array
    if (el.parentId) {
      const parent = newElements[el.parentId] as BoxElementModel | undefined;
      if (parent && parent.type === 'box') {
        newElements[el.parentId] = {
          ...parent,
          children: parent.children.filter((c) => c !== id),
        };
      }
    }

    this.state = {
      ...this.state,
      elements: newElements,
      rootChildren: newRootChildren,
      selectedIds: this.state.selectedIds.filter((s) => s !== id),
    };

    if (pushHistory) this.pushHistory(`Remove ${el.type}`);
    this.emitter.emit('element:remove', { id });
    this.emitStateChange();
  }

  updateElement(id: string, changes: Partial<AnyElementModel>, pushHistory = false): void {
    const el = this.state.elements[id];
    if (!el) return;

    this.state = {
      ...this.state,
      elements: {
        ...this.state.elements,
        [id]: { ...el, ...changes } as AnyElementModel,
      },
    };

    this.emitter.emit('element:update', { id, changes });
    this.emitStateChange();
    if (pushHistory) this.pushHistory();
  }

  updateTransform(id: string, transform: Partial<ElementTransform>, pushHistory = false): void {
    const el = this.state.elements[id];
    if (!el) return;
    this.updateElement(id, { transform: { ...el.transform, ...transform } }, pushHistory);
    this.emitter.emit('element:resize', { id, transform });
  }

  updateFormat(id: string, format: Partial<ElementFormat>, pushHistory = false): void {
    const el = this.state.elements[id];
    if (!el) return;
    this.updateElement(id, { format: { ...el.format, ...format } }, pushHistory);
    this.emitter.emit('element:format', { id, format });
  }

  // -------------------------------------------------------------------------
  // Free mode
  // -------------------------------------------------------------------------

  setFree(id: string, free: boolean, pushHistory = true): void {
    const el = this.state.elements[id];
    if (!el) return;

    this.updateElement(id, { free }, false);

    if (free) {
      // Move to root children list while keeping parentId for re-nesting
      if (!this.state.rootChildren.includes(id)) {
        this.state = {
          ...this.state,
          rootChildren: [...this.state.rootChildren, id],
        };
      }
      this.emitter.emit('element:free', { id });
    } else {
      // Remove from rootChildren if it has a real parent
      if (el.parentId) {
        this.state = {
          ...this.state,
          rootChildren: this.state.rootChildren.filter((c) => c !== id),
        };
      }
      this.emitter.emit('element:unfree', { id });
    }

    if (pushHistory) this.pushHistory(free ? 'Set free' : 'Un-free');
    this.emitStateChange();
  }

  // -------------------------------------------------------------------------
  // Selection
  // -------------------------------------------------------------------------

  select(ids: string[], additive = false): void {
    const next = additive
      ? [...new Set([...this.state.selectedIds, ...ids])]
      : ids;
    this.state = { ...this.state, selectedIds: next };
    this.emitter.emit('element:select', { ids: next });
    this.emitStateChange();
  }

  deselect(): void {
    this.state = { ...this.state, selectedIds: [] };
    this.emitter.emit('element:deselect', {});
    this.emitStateChange();
  }

  setHovered(id: string | null): void {
    if (this.state.hoveredId === id) return;
    this.state = { ...this.state, hoveredId: id };
    this.emitStateChange();
  }

  setEditingText(id: string | null): void {
    this.state = { ...this.state, editingTextId: id };
    if (id) this.emitter.emit('text:editstart', { id });
    this.emitStateChange();
  }

  // -------------------------------------------------------------------------
  // Layer reordering
  // -------------------------------------------------------------------------

  setZIndex(id: string, zIndex: number): void {
    this.updateElement(id, { zIndex }, false);
    this.emitter.emit('layer:reorder', { id, newZIndex: zIndex });
    this.pushHistory('Reorder layer');
    this.emitStateChange();
  }

  reparent(id: string, newParentId: string | null): void {
    const el = this.state.elements[id];
    if (!el || el.parentId === newParentId) return;

    // Remove from old parent
    if (el.parentId) {
      const oldParent = this.state.elements[el.parentId] as BoxElementModel;
      if (oldParent) {
        this.updateElement(el.parentId, {
          children: oldParent.children.filter((c) => c !== id),
        } as Partial<BoxElementModel>, false);
      }
    } else {
      this.state = {
        ...this.state,
        rootChildren: this.state.rootChildren.filter((c) => c !== id),
      };
    }

    // Add to new parent
    this.updateElement(id, { parentId: newParentId }, false);
    if (newParentId) {
      const newParent = this.state.elements[newParentId] as BoxElementModel;
      if (newParent) {
        this.updateElement(newParentId, {
          children: [...newParent.children, id],
        } as Partial<BoxElementModel>, false);
      }
    } else {
      this.state = {
        ...this.state,
        rootChildren: [...this.state.rootChildren, id],
      };
    }

    this.emitter.emit('layer:parent', { id, newParentId });
    this.pushHistory('Reparent');
    this.emitStateChange();
  }

  // -------------------------------------------------------------------------
  // Canvas
  // -------------------------------------------------------------------------

  updateCanvas(changes: Partial<CanvasConfig>): void {
    this.state = { ...this.state, canvas: { ...this.state.canvas, ...changes } };
    this.emitter.emit('canvas:update', changes);
    this.emitStateChange();
  }

  // -------------------------------------------------------------------------
  // Snap
  // -------------------------------------------------------------------------

  updateSnap(changes: Partial<SnapConfig>): void {
    this.state = { ...this.state, snap: { ...this.state.snap, ...changes } };
    this.emitter.emit('snap:change', changes);
    this.emitStateChange();
  }

  // -------------------------------------------------------------------------
  // History
  // -------------------------------------------------------------------------

  pushHistory(label?: string): void {
    this.history.push(this.state.elements, this.state.rootChildren, label);
    this.state = { ...this.state, history: this.history.getState() };
    this.emitter.emit('history:push', { label });
  }

  undo(): void {
    const snapshot = this.history.undo(this.state.elements, this.state.rootChildren);
    if (!snapshot) return;
    this.state = {
      ...this.state,
      elements: snapshot.elements,
      rootChildren: snapshot.rootChildren,
      selectedIds: [],
      history: this.history.getState(),
    };
    this.emitter.emit('history:undo', {});
    this.emitStateChange();
  }

  redo(): void {
    const snapshot = this.history.redo(this.state.elements, this.state.rootChildren);
    if (!snapshot) return;
    this.state = {
      ...this.state,
      elements: snapshot.elements,
      rootChildren: snapshot.rootChildren,
      selectedIds: [],
      history: this.history.getState(),
    };
    this.emitter.emit('history:redo', {});
    this.emitStateChange();
  }

  // -------------------------------------------------------------------------
  // Serialisation
  // -------------------------------------------------------------------------

  serialize(): EditorState {
    return JSON.parse(JSON.stringify(this.state));
  }

  hydrate(state: Partial<EditorState>): void {
    this.state = { ...this.state, ...state };
    this.emitStateChange();
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  private emitStateChange(): void {
    this.emitter.emit('state:change', this.state);
  }
}
