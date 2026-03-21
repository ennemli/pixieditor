import { BaseElement } from './BaseElement';
import type { TextElementModel, RichTextDelta } from '@/types';
/**
 * Text element — renders text on the canvas.
 * Editing happens via a DOM overlay (textarea) synced to canvas position.
 * Supports rich text deltas for future bold/italic/link inline formatting.
 */
export declare class TextElement extends BaseElement {
    protected _model: TextElementModel;
    constructor(model?: Partial<TextElementModel>);
    get content(): string;
    set content(v: string);
    get richContent(): RichTextDelta | undefined;
    set richContent(v: RichTextDelta | undefined);
    toModel(): TextElementModel;
}
