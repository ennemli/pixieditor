import type { ICommand } from '../ICommand.js';
import type { DocumentModel } from '../../model/DocumentModel.js';
import type { AnyElement, ElementType, ElementStyle } from '../../types/index.js';
import type { EventEmitter } from '../../core/EventEmitter.js';

export class AddElementCommand implements ICommand {
  readonly description: string;
  private _createdElement: AnyElement | null = null;

  constructor(
    private readonly _model: DocumentModel,
    private readonly _emitter: EventEmitter,
    private readonly _type: ElementType,
    private readonly _parentId: string | null,
    private readonly _stylePatch: Partial<ElementStyle>,
    private readonly _extraProps: Record<string, unknown> = {}
  ) {
    this.description = `Add ${_type}`;
  }

  execute(): void {
    this._createdElement = this._model.addElement(
      this._type, this._parentId, this._stylePatch, this._extraProps
    );
    this._emitter.emit('element:add', { element: this._createdElement });
    this._emitter.emit('document:change', { document: this._model.getSnapshot() });
  }

  undo(): void {
    if (!this._createdElement) return;
    this._model.removeElement(this._createdElement.id);
    this._emitter.emit('element:remove', { id: this._createdElement.id });
    this._emitter.emit('document:change', { document: this._model.getSnapshot() });
  }

  get createdId(): string | null { return this._createdElement?.id ?? null; }
}
