import type { IFormat } from '../IFormat.js';
import type { AnyElement, ElementStyle, ElementType, BorderStyle as BS } from '../../types/index.js';
export declare class BorderFormat implements IFormat<BS> {
    id: string;
    name: string;
    group: string;
    appliesTo: ElementType[];
    getValue(el: AnyElement): BS;
    apply(_: AnyElement, v: BS): Partial<ElementStyle>;
    renderControl(el: AnyElement, onChange: (v: BS) => void): HTMLElement;
}
