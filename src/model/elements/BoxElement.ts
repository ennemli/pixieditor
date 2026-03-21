import { BaseElement } from './BaseElement';
import type { BoxElementModel } from '@/types';

/**
 * Box element — the primary container node in the tree.
 * Can hold any number of child elements (Composite pattern node).
 *
 * Children are positioned relative to this box unless they are `free`.
 * Supports background color and background image via its format.
 */
export class BoxElement extends BaseElement {
  declare protected _model: BoxElementModel;

  constructor(model: Partial<BoxElementModel> = {}) {
    super({ ...model, type: 'box' });
    (this._model as BoxElementModel).children = model.children ?? [];
  }

  // ── Children ────────────────────────────────────────────────────────────────

  get children(): string[] {
    return (this._model as BoxElementModel).children;
  }

  addChild(id: string, index?: number): void {
    const children = (this._model as BoxElementModel).children;
    if (children.includes(id)) return;
    if (index !== undefined) {
      children.splice(index, 0, id);
    } else {
      children.push(id);
    }
  }

  removeChild(id: string): void {
    const children = (this._model as BoxElementModel).children;
    const idx = children.indexOf(id);
    if (idx !== -1) children.splice(idx, 1);
  }

  hasChild(id: string): boolean {
    return (this._model as BoxElementModel).children.includes(id);
  }

  moveChild(id: string, newIndex: number): void {
    const children = (this._model as BoxElementModel).children;
    const oldIndex = children.indexOf(id);
    if (oldIndex === -1) return;
    children.splice(oldIndex, 1);
    children.splice(newIndex, 0, id);
  }

  // ── Serialisation ───────────────────────────────────────────────────────────

  toModel(): BoxElementModel {
    return structuredClone(this._model as BoxElementModel);
  }
}
