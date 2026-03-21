import type { ICommand } from '../ICommand.js';
import type { DocumentModel } from '../../model/DocumentModel.js';
import type { EventEmitter } from '../../core/EventEmitter.js';

export class MoveCommand implements ICommand {
  readonly description = 'Move element';
  private _prevX = 0;
  private _prevY = 0;

  constructor(
    private readonly _model: DocumentModel,
    private readonly _emitter: EventEmitter,
    private readonly _id: string,
    private readonly _x: number,
    private readonly _y: number
  ) {}

  execute(): void {
    const el = this._model.getElement(this._id);
    if (!el) return;
    this._prevX = el.style.x;
    this._prevY = el.style.y;
    this._model.updateStyle(this._id, { x: this._x, y: this._y });
    this._emitter.emit('element:move', { id: this._id, x: this._x, y: this._y });
    this._emitter.emit('document:change', { document: this._model.getSnapshot() });
  }

  undo(): void {
    this._model.updateStyle(this._id, { x: this._prevX, y: this._prevY });
    this._emitter.emit('element:move', { id: this._id, x: this._prevX, y: this._prevY });
    this._emitter.emit('document:change', { document: this._model.getSnapshot() });
  }
}
