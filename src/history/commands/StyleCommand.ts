import type { ICommand } from '../ICommand.js';
import type { DocumentModel } from '../../model/DocumentModel.js';
import type { ElementStyle } from '../../types/index.js';
import type { EventEmitter } from '../../core/EventEmitter.js';

export class StyleCommand implements ICommand {
  readonly description = 'Update style';
  private _before: Partial<ElementStyle> = {};

  constructor(
    private readonly _model: DocumentModel,
    private readonly _emitter: EventEmitter,
    private readonly _id: string,
    private readonly _patch: Partial<ElementStyle>
  ) {}

  execute(): void {
    const el = this._model.getElement(this._id);
    if (!el) return;
    // Capture only the keys we're going to change
    const keys = Object.keys(this._patch) as (keyof ElementStyle)[];
    this._before = Object.fromEntries(
      keys.map(k => [k, el.style[k]])
    ) as Partial<ElementStyle>;
    this._model.updateStyle(this._id, this._patch);
    const updated = this._model.getElement(this._id)!;
    this._emitter.emit('element:update', { element: updated });
    this._emitter.emit('document:change', { document: this._model.getSnapshot() });
  }

  undo(): void {
    this._model.updateStyle(this._id, this._before);
    const updated = this._model.getElement(this._id)!;
    this._emitter.emit('element:update', { element: updated });
    this._emitter.emit('document:change', { document: this._model.getSnapshot() });
  }
}
