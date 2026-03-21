import type { IFormat } from '../IFormat.js';
import type { AnyElement, ElementStyle, ElementType } from '../../types/index.js';
interface PaddingValue {
    top: number;
    right: number;
    bottom: number;
    left: number;
}
export declare class PaddingFormat implements IFormat<PaddingValue> {
    id: string;
    name: string;
    group: string;
    appliesTo: ElementType[];
    getValue(el: AnyElement): PaddingValue;
    apply(_: AnyElement, v: PaddingValue): Partial<ElementStyle>;
    renderControl(el: AnyElement, onChange: (v: PaddingValue) => void): HTMLElement;
}
export {};
