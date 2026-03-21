import type { ICommand } from '../ICommand.js';
import type { DocumentModel } from '../../model/DocumentModel.js';
import type { EventEmitter } from '../../core/EventEmitter.js';

export class FreeCommand implements ICommand {
  readonly description: string;
  private _prevParentId: string | null = null;
  private _prevFree = false;
  private _prevX = 0;
  private _prevY = 0;

  constructor(
    private readonly _model: DocumentModel,
    private readonly _emitter: EventEmitter,
    private readonly _id: string,
    private readonly _free: boolean,
    private readonly _worldPos?: { x: number; y: number }
  ) {
    this.description = _free ? 'Make element free' : 'Unset free element';
  }

  execute(): void {
    const el = this._model.getElement(this._id);
    if (!el) return;
    this._prevParentId = el.parentId;
    this._prevFree = el.free;
    this._prevX = el.style.x;
    this._prevY = el.style.y;
    this._model.setFree(this._id, this._free, this._worldPos);
    const updated = this._model.getElement(this._id)!;
    this._emitter.emit('element:update', { element: updated });
    this._emitter.emit('document:change', { document: this._model.getSnapshot() });
  }

  undo(): void {
    // Restore free state and position
    this._model.setFree(this._id, this._prevFree);
    this._model.updateStyle(this._id, { x: this._prevX, y: this._prevY });
    if (this._prevParentId) {
      this._model.reparent(this._id, this._prevParentId);
    }
    const updated = this._model.getElement(this._id)!;
    this._emitter.emit('element:update', { element: updated });
    this._emitter.emit('document:change', { document: this._model.getSnapshot() });
  }
}
