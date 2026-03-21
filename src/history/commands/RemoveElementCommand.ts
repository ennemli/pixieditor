import type { ICommand } from '../ICommand.js';
import type { DocumentModel } from '../../model/DocumentModel.js';
import type { AnyElement, DocumentState } from '../../types/index.js';
import type { EventEmitter } from '../../core/EventEmitter.js';
import { deepClone } from '../../utils/deepClone.js';

export class RemoveElementCommand implements ICommand {
  readonly description = 'Remove element';
  private _snapshot: DocumentState | null = null;

  constructor(
    private readonly _model: DocumentModel,
    private readonly _emitter: EventEmitter,
    private readonly _id: string
  ) {}

  execute(): void {
    this._snapshot = this._model.getSnapshot();
    this._model.removeElement(this._id);
    this._emitter.emit('element:remove', { id: this._id });
    this._emitter.emit('document:change', { document: this._model.getSnapshot() });
  }

  undo(): void {
    if (!this._snapshot) return;
    this._model.loadSnapshot(this._snapshot);
    const el = this._model.getElement(this._id)!;
    this._emitter.emit('element:add', { element: el });
    this._emitter.emit('document:change', { document: this._model.getSnapshot() });
  }
}
