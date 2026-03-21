import type { ICommand } from '../ICommand.js';
import type { DocumentModel } from '../../model/DocumentModel.js';
import type { EventEmitter } from '../../core/EventEmitter.js';

export class LayerMoveCommand implements ICommand {
  readonly description: string;
  private _snapshot: import('../../types/index.js').DocumentState | null = null;

  constructor(
    private readonly _model: DocumentModel,
    private readonly _emitter: EventEmitter,
    private readonly _id: string,
    private readonly _direction: 'up' | 'down' | 'top' | 'bottom'
  ) {
    this.description = `Move layer ${_direction}`;
  }

  execute(): void {
    this._snapshot = this._model.getSnapshot();
    this._model.moveLayer(this._id, this._direction);
    this._emitter.emit('document:change', { document: this._model.getSnapshot() });
  }

  undo(): void {
    if (!this._snapshot) return;
    this._model.loadSnapshot(this._snapshot);
    this._emitter.emit('document:change', { document: this._model.getSnapshot() });
  }
}

export class LayerReorderCommand implements ICommand {
  readonly description = 'Reorder layer';
  private _snapshot: import('../../types/index.js').DocumentState | null = null;

  constructor(
    private readonly _model: DocumentModel,
    private readonly _emitter: EventEmitter,
    private readonly _id: string,
    private readonly _targetId: string,
    private readonly _position: 'before' | 'after'
  ) {}

  execute(): void {
    this._snapshot = this._model.getSnapshot();
    this._model.reorderLayer(this._id, this._targetId, this._position);
    this._emitter.emit('document:change', { document: this._model.getSnapshot() });
  }

  undo(): void {
    if (!this._snapshot) return;
    this._model.loadSnapshot(this._snapshot);
    this._emitter.emit('document:change', { document: this._model.getSnapshot() });
  }
}
