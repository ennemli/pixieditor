import { BaseElement } from './BaseElement';
import type { TextElementModel, RichTextDelta } from '@/types';

/**
 * Text element — renders text on the canvas.
 * Editing happens via a DOM overlay (textarea) synced to canvas position.
 * Supports rich text deltas for future bold/italic/link inline formatting.
 */
export class TextElement extends BaseElement {
  declare protected _model: TextElementModel;

  constructor(model: Partial<TextElementModel> = {}) {
    super({ ...model, type: 'text' });
    const m = this._model as TextElementModel;
    m.content = model.content ?? 'Text';
    m.richContent = model.richContent;
    // Sensible text defaults
    if (!m.format.color) m.format.color = '#000000';
    if (!m.format.fontSize) m.format.fontSize = 16;
    if (!m.format.fontFamily) m.format.fontFamily = 'Inter, sans-serif';
    if (!m.format.fontWeight) m.format.fontWeight = 'normal';
    if (!m.format.textAlign) m.format.textAlign = 'left';
  }

  get content(): string { return (this._model as TextElementModel).content; }
  set content(v: string) { (this._model as TextElementModel).content = v; }

  get richContent(): RichTextDelta | undefined {
    return (this._model as TextElementModel).richContent;
  }
  set richContent(v: RichTextDelta | undefined) {
    (this._model as TextElementModel).richContent = v;
  }

  toModel(): TextElementModel {
    return structuredClone(this._model as TextElementModel);
  }
}
