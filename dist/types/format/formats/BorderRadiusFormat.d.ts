import type { IFormat } from '../IFormat.js';
import type { AnyElement, ElementStyle, ElementType } from '../../types/index.js';
export declare class BorderRadiusFormat implements IFormat<number> {
    id: string;
    name: string;
    group: string;
    appliesTo: ElementType[];
    getValue(el: AnyElement): number;
    apply(_: AnyElement, v: number): Partial<ElementStyle>;
    renderControl(el: AnyElement, onChange: (v: number) => void): HTMLElement;
}
