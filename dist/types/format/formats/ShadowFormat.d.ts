import type { IFormat } from '../IFormat.js';
import type { AnyElement, ElementStyle, ElementType, ShadowStyle } from '../../types/index.js';
export declare class ShadowFormat implements IFormat<ShadowStyle | null> {
    id: string;
    name: string;
    group: string;
    appliesTo: ElementType[];
    getValue(el: AnyElement): ShadowStyle | null;
    apply(_: AnyElement, v: ShadowStyle | null): Partial<ElementStyle>;
    renderControl(el: AnyElement, onChange: (v: ShadowStyle | null) => void): HTMLElement;
}
