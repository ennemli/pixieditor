import type { ICommand } from '@/history/ICommand';
import type { EditorState } from '@/model/EditorState';
import type { AnyElementModel, ElementFormat } from '@/types';
import { ElementFactory } from '@/model/elements/ElementFactory';
import type { BaseElement } from '@/model/elements/BaseElement';

// ─────────────────────────────────────────────────────────────────────────────
// AddElementCommand
// ─────────────────────────────────────────────────────────────────────────────
export class AddElementCommand implements ICommand {
  readonly label: string;
  private _element: BaseElement;

  constructor(
    private state: EditorState,
    element: BaseElement,
    private onAdded?: (el: BaseElement) => void,
    private onRemoved?: (id: string) => void,
  ) {
    this._element = element;
    this.label = `Add ${element.type}`;
  }

  execute(): void {
    this.state.addElement(this._element);
    this.onAdded?.(this._element);
  }

  undo(): void {
    this.state.removeElement(this._element.id);
    this.onRemoved?.(this._element.id);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// RemoveElementCommand
// ─────────────────────────────────────────────────────────────────────────────
export class RemoveElementCommand implements ICommand {
  readonly label: string;
  private _snapshot: AnyElementModel;
  private _element: BaseElement;

  constructor(
    private state: EditorState,
    element: BaseElement,
    private onRemoved?: (id: string) => void,
    private onAdded?: (el: BaseElement) => void,
  ) {
    this._element = element;
    this._snapshot = element.toModel() as AnyElementModel;
    this.label = `Remove ${element.type}`;
  }

  execute(): void {
    this.state.removeElement(this._element.id);
    this.onRemoved?.(this._element.id);
  }

  undo(): void {
    const restored = ElementFactory.fromModel(this._snapshot);
    this.state.addElement(restored);
    this.onAdded?.(restored);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MoveElementCommand
// ─────────────────────────────────────────────────────────────────────────────
export class MoveElementCommand implements ICommand {
  readonly label = 'Move element';

  constructor(
    private state: EditorState,
    private id: string,
    private fromX: number,
    private fromY: number,
    private toX: number,
    private toY: number,
    private onMoved?: (id: string, x: number, y: number) => void,
  ) {}

  execute(): void {
    const el = this.state.getElement(this.id);
    if (!el) return;
    el.x = this.toX;
    el.y = this.toY;
    this.onMoved?.(this.id, this.toX, this.toY);
  }

  undo(): void {
    const el = this.state.getElement(this.id);
    if (!el) return;
    el.x = this.fromX;
    el.y = this.fromY;
    this.onMoved?.(this.id, this.fromX, this.fromY);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ResizeElementCommand
// ─────────────────────────────────────────────────────────────────────────────
export class ResizeElementCommand implements ICommand {
  readonly label = 'Resize element';

  constructor(
    private state: EditorState,
    private id: string,
    private from: { x: number; y: number; width: number; height: number },
    private to: { x: number; y: number; width: number; height: number },
    private onResized?: (id: string, rect: typeof this.to) => void,
  ) {}

  execute(): void {
    const el = this.state.getElement(this.id);
    if (!el) return;
    Object.assign(el, { x: this.to.x, y: this.to.y, width: this.to.width, height: this.to.height });
    this.onResized?.(this.id, this.to);
  }

  undo(): void {
    const el = this.state.getElement(this.id);
    if (!el) return;
    Object.assign(el, { x: this.from.x, y: this.from.y, width: this.from.width, height: this.from.height });
    this.onResized?.(this.id, this.from);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// FormatElementCommand
// ─────────────────────────────────────────────────────────────────────────────
export class FormatElementCommand implements ICommand {
  readonly label: string;
  private _prevFormat: ElementFormat;

  constructor(
    private state: EditorState,
    private id: string,
    private patch: Partial<ElementFormat>,
    private onFormatted?: (id: string) => void,
  ) {
    const el = state.getElement(id);
    this._prevFormat = el ? { ...el.format } : {};
    this.label = `Format element`;
  }

  execute(): void {
    const el = this.state.getElement(this.id);
    if (!el) return;
    el.applyFormat(this.patch);
    this.onFormatted?.(this.id);
  }

  undo(): void {
    const el = this.state.getElement(this.id);
    if (!el) return;
    el.fromModel({ ...el.toModel(), format: this._prevFormat } as AnyElementModel);
    this.onFormatted?.(this.id);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// FreeElementCommand
// ─────────────────────────────────────────────────────────────────────────────
export class FreeElementCommand implements ICommand {
  readonly label: string;
  private _prevParentId: string | null;
  private _prevFree: boolean;
  private _prevX: number;
  private _prevY: number;

  constructor(
    private state: EditorState,
    private id: string,
    private newFree: boolean,
    private canvasX: number,
    private canvasY: number,
    private onChanged?: (id: string) => void,
  ) {
    const el = state.getElement(id);
    this._prevParentId = el?.parentId ?? null;
    this._prevFree = el?.free ?? false;
    this._prevX = el?.x ?? 0;
    this._prevY = el?.y ?? 0;
    this.label = newFree ? 'Free element' : 'Attach element';
  }

  execute(): void {
    if (this.newFree) {
      this.state.freeElement(this.id, this.canvasX, this.canvasY);
    } else {
      this.state.unfreeElement(this.id, null, this.canvasX, this.canvasY);
    }
    this.onChanged?.(this.id);
  }

  undo(): void {
    if (this._prevFree) {
      this.state.freeElement(this.id, this._prevX, this._prevY);
    } else {
      this.state.unfreeElement(this.id, this._prevParentId, this._prevX, this._prevY);
    }
    this.onChanged?.(this.id);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ReorderLayerCommand
// ─────────────────────────────────────────────────────────────────────────────
export class ReorderLayerCommand implements ICommand {
  readonly label = 'Reorder layer';
  private _prevZIndex: number;

  constructor(
    private state: EditorState,
    private id: string,
    private newZIndex: number,
    private onReordered?: (id: string) => void,
  ) {
    this._prevZIndex = state.getElement(id)?.zIndex ?? 0;
  }

  execute(): void {
    this.state.setZIndex(this.id, this.newZIndex);
    this.onReordered?.(this.id);
  }

  undo(): void {
    this.state.setZIndex(this.id, this._prevZIndex);
    this.onReordered?.(this.id);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// UpdatePropertyCommand (generic)
// ─────────────────────────────────────────────────────────────────────────────
export class UpdatePropertyCommand implements ICommand {
  readonly label: string;
  private _prevValue: unknown;

  constructor(
    private state: EditorState,
    private id: string,
    private property: Extract<keyof AnyElementModel, string>,
    private newValue: unknown,
    private onUpdated?: (id: string) => void,
    label?: string,
  ) {
    const el = state.getElement(id);
    this._prevValue = el ? ((el.toModel() as unknown as Record<string, unknown>)[property]) : undefined;
    this.label = label ?? `Update ${String(property)}`;
  }

  execute(): void {
    const el = this.state.getElement(this.id);
    if (!el) return;
    const model = { ...el.toModel(), [this.property]: this.newValue } as AnyElementModel;
    el.fromModel(model);
    this.onUpdated?.(this.id);
  }

  undo(): void {
    const el = this.state.getElement(this.id);
    if (!el) return;
    const model = { ...el.toModel(), [this.property]: this._prevValue } as AnyElementModel;
    el.fromModel(model);
    this.onUpdated?.(this.id);
  }
}
