import type { ICommand } from './ICommand';
import type {
  AnyElementModel,
  EditorState,
  ElementId,
  Formats,
  ParentId,
  PositionValue,
  SizeValue,
  Transform,
} from '../models/types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function patchElement<T extends AnyElementModel>(
  state: EditorState,
  id: ElementId,
  patch: Partial<T>,
): EditorState {
  const el = state.elements[id];
  if (!el) return state;
  return {
    ...state,
    elements: { ...state.elements, [id]: { ...el, ...patch } },
  };
}

function removeFromArray<T>(arr: T[], item: T): T[] {
  return arr.filter((v) => v !== item);
}

function insertAt<T>(arr: T[], item: T, index: number): T[] {
  const copy = [...arr];
  copy.splice(index, 0, item);
  return copy;
}

// ─── AddElementCommand ────────────────────────────────────────────────────────

export class AddElementCommand implements ICommand {
  readonly label: string;

  constructor(private readonly element: AnyElementModel) {
    this.label = `Add ${element.type} "${element.name}"`;
  }

  execute(state: EditorState): EditorState {
    const newElements = { ...state.elements, [this.element.id]: this.element };
    let newRoot = state.rootChildren;
    let newParent = state.elements;

    if (this.element.parentId === null) {
      newRoot = [...state.rootChildren, this.element.id];
    } else {
      const parent = state.elements[this.element.parentId];
      if (parent?.type === 'box') {
        newParent = {
          ...state.elements,
          [parent.id]: {
            ...parent,
            children: [...parent.children, this.element.id],
          },
        };
      }
    }

    return {
      ...state,
      elements: { ...newParent, [this.element.id]: this.element },
      rootChildren: newRoot,
    };
  }

  undo(state: EditorState): EditorState {
    const { [this.element.id]: _removed, ...rest } = state.elements;
    let newRoot = removeFromArray(state.rootChildren, this.element.id);
    const parent = this.element.parentId ? rest[this.element.parentId] : null;
    if (parent?.type === 'box') {
      rest[parent.id] = { ...parent, children: removeFromArray(parent.children, this.element.id) };
    }
    return { ...state, elements: rest, rootChildren: newRoot };
  }
}

// ─── RemoveElementCommand ─────────────────────────────────────────────────────

export class RemoveElementCommand implements ICommand {
  readonly label: string;
  private snapshot: AnyElementModel;

  constructor(private readonly id: ElementId, state: EditorState) {
    this.snapshot = state.elements[id]!;
    this.label = `Remove "${this.snapshot.name}"`;
  }

  execute(state: EditorState): EditorState {
    const { [this.id]: _removed, ...rest } = state.elements;
    let newRoot = removeFromArray(state.rootChildren, this.id);
    const parent = this.snapshot.parentId ? rest[this.snapshot.parentId] : null;
    if (parent?.type === 'box') {
      rest[parent.id] = { ...parent, children: removeFromArray(parent.children, this.id) };
    }
    const newSelected = removeFromArray(state.selectedIds, this.id);
    return { ...state, elements: rest, rootChildren: newRoot, selectedIds: newSelected };
  }

  undo(state: EditorState): EditorState {
    const newElements = { ...state.elements, [this.id]: this.snapshot };
    let newRoot = state.rootChildren;
    if (this.snapshot.parentId === null) {
      newRoot = [...state.rootChildren, this.id];
    } else {
      const parent = newElements[this.snapshot.parentId];
      if (parent?.type === 'box') {
        newElements[parent.id] = { ...parent, children: [...parent.children, this.id] };
      }
    }
    return { ...state, elements: newElements, rootChildren: newRoot };
  }
}

// ─── MoveCommand ──────────────────────────────────────────────────────────────

export class MoveCommand implements ICommand {
  readonly label = 'Move element';
  private previousTransform: Transform;

  constructor(
    private readonly id: ElementId,
    private readonly nextX: PositionValue,
    private readonly nextY: PositionValue,
    state: EditorState,
  ) {
    this.previousTransform = state.elements[id]!.transform;
  }

  execute(state: EditorState): EditorState {
    return patchElement(state, this.id, {
      transform: { ...state.elements[this.id]!.transform, x: this.nextX, y: this.nextY },
    } as Partial<AnyElementModel>);
  }

  undo(state: EditorState): EditorState {
    return patchElement(state, this.id, { transform: this.previousTransform } as Partial<AnyElementModel>);
  }
}

// ─── ResizeCommand ────────────────────────────────────────────────────────────

export class ResizeCommand implements ICommand {
  readonly label = 'Resize element';
  private previousTransform: Transform;

  constructor(
    private readonly id: ElementId,
    private readonly next: Pick<Transform, 'x' | 'y' | 'width' | 'height'>,
    state: EditorState,
  ) {
    this.previousTransform = state.elements[id]!.transform;
  }

  execute(state: EditorState): EditorState {
    return patchElement(state, this.id, {
      transform: { ...state.elements[this.id]!.transform, ...this.next },
    } as Partial<AnyElementModel>);
  }

  undo(state: EditorState): EditorState {
    return patchElement(state, this.id, { transform: this.previousTransform } as Partial<AnyElementModel>);
  }
}

// ─── SetFormatCommand ─────────────────────────────────────────────────────────

export class SetFormatCommand implements ICommand {
  readonly label: string;
  private previousFormats: Formats;

  constructor(
    private readonly id: ElementId,
    private readonly patch: Partial<Formats>,
    state: EditorState,
  ) {
    this.previousFormats = { ...state.elements[id]!.formats };
    this.label = `Format: ${Object.keys(patch).join(', ')}`;
  }

  execute(state: EditorState): EditorState {
    const el = state.elements[this.id]!;
    return patchElement(state, this.id, { formats: { ...el.formats, ...this.patch } } as Partial<AnyElementModel>);
  }

  undo(state: EditorState): EditorState {
    return patchElement(state, this.id, { formats: this.previousFormats } as Partial<AnyElementModel>);
  }
}

// ─── SetPropertyCommand ───────────────────────────────────────────────────────

export class SetPropertyCommand<K extends keyof AnyElementModel> implements ICommand {
  readonly label: string;
  private previousValue: AnyElementModel[K];

  constructor(
    private readonly id: ElementId,
    private readonly key: K,
    private readonly value: AnyElementModel[K],
    state: EditorState,
  ) {
    this.previousValue = state.elements[id]![key];
    this.label = `Set ${String(key)}`;
  }

  execute(state: EditorState): EditorState {
    return patchElement(state, this.id, { [this.key]: this.value } as Partial<AnyElementModel>);
  }

  undo(state: EditorState): EditorState {
    return patchElement(state, this.id, { [this.key]: this.previousValue } as Partial<AnyElementModel>);
  }
}

// ─── SetFreeCommand ───────────────────────────────────────────────────────────

/**
 * When free=true:
 *   - Stores originalParentId
 *   - Removes element from parent's children
 *   - Adds to rootChildren
 *   - Converts transform to absolute canvas coords
 *
 * When free=false:
 *   - Restores to originalParentId (or root if gone)
 *   - Converts transform back to relative coords
 */
export class SetFreeCommand implements ICommand {
  readonly label: string;
  private snapshot: AnyElementModel;

  constructor(
    private readonly id: ElementId,
    private readonly free: boolean,
    private readonly absoluteRect: { x: number; y: number } | null,
    state: EditorState,
  ) {
    this.snapshot = { ...state.elements[id]! };
    this.label = free ? 'Free element' : 'Un-free element';
  }

  execute(state: EditorState): EditorState {
    const el = state.elements[this.id]!;

    if (this.free) {
      // Detach from parent → attach to root
      let s = state;
      if (el.parentId !== null) {
        const parent = s.elements[el.parentId];
        if (parent?.type === 'box') {
          s = {
            ...s,
            elements: {
              ...s.elements,
              [parent.id]: { ...parent, children: removeFromArray(parent.children, this.id) },
            },
          };
        }
      }
      return {
        ...s,
        elements: {
          ...s.elements,
          [this.id]: {
            ...el,
            free: true,
            originalParentId: el.parentId,
            parentId: null,
            transform: {
              ...el.transform,
              x: this.absoluteRect?.x ?? el.transform.x,
              y: this.absoluteRect?.y ?? el.transform.y,
            },
          },
        },
        rootChildren: [...s.rootChildren, this.id],
      };
    } else {
      // Re-attach to originalParentId or root
      const targetParentId = el.originalParentId ?? null;
      let s = {
        ...state,
        elements: {
          ...state.elements,
          [this.id]: {
            ...el,
            free: false,
            originalParentId: undefined,
            parentId: targetParentId,
          },
        },
        rootChildren: removeFromArray(state.rootChildren, this.id),
      };

      if (targetParentId !== null) {
        const parent = s.elements[targetParentId];
        if (parent?.type === 'box') {
          s = {
            ...s,
            elements: {
              ...s.elements,
              [parent.id]: { ...parent, children: [...parent.children, this.id] },
            },
          };
        } else {
          // Parent gone, put on root
          s = { ...s, elements: { ...s.elements, [this.id]: { ...s.elements[this.id]!, parentId: null } }, rootChildren: [...s.rootChildren, this.id] };
        }
      } else {
        s = { ...s, rootChildren: [...s.rootChildren, this.id] };
      }

      return s;
    }
  }

  undo(state: EditorState): EditorState {
    // Full restore from snapshot
    const current = state.elements[this.id]!;
    let s = state;

    // Remove current tree connections
    const currentParent = current.parentId ? s.elements[current.parentId] : null;
    if (currentParent?.type === 'box') {
      s = {
        ...s,
        elements: {
          ...s.elements,
          [currentParent.id]: { ...currentParent, children: removeFromArray(currentParent.children, this.id) },
        },
      };
    }
    const newRoot = removeFromArray(s.rootChildren, this.id);

    // Restore snapshot
    s = { ...s, elements: { ...s.elements, [this.id]: this.snapshot }, rootChildren: newRoot };

    // Re-wire to snapshot parent
    if (this.snapshot.parentId !== null) {
      const p = s.elements[this.snapshot.parentId];
      if (p?.type === 'box' && !p.children.includes(this.id)) {
        s = { ...s, elements: { ...s.elements, [p.id]: { ...p, children: [...p.children, this.id] } } };
      }
    } else {
      s = { ...s, rootChildren: [...s.rootChildren, this.id] };
    }
    return s;
  }
}

// ─── ReorderCommand ───────────────────────────────────────────────────────────

export class ReorderCommand implements ICommand {
  readonly label = 'Reorder layers';

  constructor(
    private readonly parentId: ParentId,
    private readonly newOrder: ElementId[],
    private readonly previousOrder: ElementId[],
  ) {}

  execute(state: EditorState): EditorState {
    if (this.parentId === null) {
      return { ...state, rootChildren: this.newOrder };
    }
    const parent = state.elements[this.parentId];
    if (!parent || parent.type !== 'box') return state;
    return patchElement(state, this.parentId, { children: this.newOrder } as Partial<AnyElementModel>);
  }

  undo(state: EditorState): EditorState {
    if (this.parentId === null) {
      return { ...state, rootChildren: this.previousOrder };
    }
    const parent = state.elements[this.parentId];
    if (!parent || parent.type !== 'box') return state;
    return patchElement(state, this.parentId, { children: this.previousOrder } as Partial<AnyElementModel>);
  }
}

// ─── BatchCommand ─────────────────────────────────────────────────────────────

/** Wraps multiple commands into a single undoable unit */
export class BatchCommand implements ICommand {
  readonly label: string;

  constructor(
    private readonly commands: ICommand[],
    label?: string,
  ) {
    this.label = label ?? commands.map((c) => c.label).join(' + ');
  }

  execute(state: EditorState): EditorState {
    return this.commands.reduce((s, cmd) => cmd.execute(s), state);
  }

  undo(state: EditorState): EditorState {
    return [...this.commands].reverse().reduce((s, cmd) => cmd.undo(s), state);
  }
}
