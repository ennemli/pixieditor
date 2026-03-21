import type { IFormat } from '../IFormat.js';
import type { AnyElement, ElementStyle, ElementType } from '../../types/index.js';
interface SizeValue {
    width: string | number;
    height: string | number;
}
export declare class SizeFormat implements IFormat<SizeValue> {
    id: string;
    name: string;
    group: string;
    appliesTo: ElementType[];
    getValue(el: AnyElement): SizeValue;
    apply(_: AnyElement, v: SizeValue): Partial<ElementStyle>;
    renderControl(el: AnyElement, onChange: (v: SizeValue) => void): HTMLElement;
}
export {};
