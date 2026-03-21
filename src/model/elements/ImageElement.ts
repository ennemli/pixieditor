import { BaseElement } from './BaseElement';
import type { ImageElementModel } from '@/types';

/**
 * Image element — renders a raster image on the canvas.
 * Supports objectFit via its format, and alt text for accessibility metadata.
 */
export class ImageElement extends BaseElement {
  declare protected _model: ImageElementModel;

  constructor(model: Partial<ImageElementModel> = {}) {
    super({ ...model, type: 'image' });
    const m = this._model as ImageElementModel;
    m.src = model.src ?? '';
    m.alt = model.alt ?? '';
  }

  get src(): string { return (this._model as ImageElementModel).src; }
  set src(v: string) { (this._model as ImageElementModel).src = v; }

  get alt(): string { return (this._model as ImageElementModel).alt; }
  set alt(v: string) { (this._model as ImageElementModel).alt = v; }

  toModel(): ImageElementModel {
    return structuredClone(this._model as ImageElementModel);
  }
}
