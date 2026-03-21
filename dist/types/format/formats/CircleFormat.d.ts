import type { IFormat } from '../IFormat.js';
import type { AnyElement, ElementStyle, ElementType } from '../../types/index.js';
export declare class CircleFormat implements IFormat<boolean> {
    id: string;
    name: string;
    group: string;
    appliesTo: ElementType[];
    getValue(el: AnyElement): boolean;
    apply(_: AnyElement, v: boolean): Partial<ElementStyle>;
    renderControl(el: AnyElement, onChange: (v: boolean) => void): HTMLElement;
}
