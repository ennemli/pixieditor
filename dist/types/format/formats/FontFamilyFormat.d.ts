import type { IFormat } from '../IFormat.js';
import type { AnyElement, ElementStyle, ElementType } from '../../types/index.js';
export declare class FontFamilyFormat implements IFormat<string> {
    id: string;
    name: string;
    group: string;
    appliesTo: ElementType[];
    getValue(el: AnyElement): string;
    apply(_: AnyElement, v: string): Partial<ElementStyle>;
    renderControl(el: AnyElement, onChange: (v: string) => void): HTMLElement;
}
