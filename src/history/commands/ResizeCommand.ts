import type { ICommand } from '../ICommand.js';
import type { DocumentModel } from '../../model/DocumentModel.js';
import type { EventEmitter } from '../../core/EventEmitter.js';

export class ResizeCommand implements ICommand {
  readonly description = 'Resize element';
  private _prev = { x: 0, y: 0, width: 0, height: 0 };

  constructor(
    private readonly _model: DocumentModel,
    private readonly _emitter: EventEmitter,
    private readonly _id: string,
    private readonly _next: { x: number; y: number; width: number; height: number }
  ) {}

  execute(): void {
    const el = this._model.getElement(this._id);
    if (!el) return;
    this._prev = {
      x: el.style.x,
      y: el.style.y,
      width: typeof el.style.width === 'number' ? el.style.width : 0,
      height: typeof el.style.height === 'number' ? el.style.height : 0,
    };
    this._model.updateStyle(this._id, this._next);
    this._emitter.emit('element:resize', { id: this._id, width: this._next.width, height: this._next.height });
    this._emitter.emit('document:change', { document: this._model.getSnapshot() });
  }

  undo(): void {
    this._model.updateStyle(this._id, this._prev);
    this._emitter.emit('element:resize', { id: this._id, width: this._prev.width, height: this._prev.height });
    this._emitter.emit('document:change', { document: this._model.getSnapshot() });
  }
}
