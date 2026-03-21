import type { IFormat } from '../IFormat.js';
import type { AnyElement, ElementStyle, ElementType, TextAlign } from '../../types/index.js';
export declare class TextAlignFormat implements IFormat<TextAlign> {
    id: string;
    name: string;
    group: string;
    appliesTo: ElementType[];
    getValue(el: AnyElement): TextAlign;
    apply(_: AnyElement, v: TextAlign): Partial<ElementStyle>;
    renderControl(el: AnyElement, onChange: (v: TextAlign) => void): HTMLElement;
}
