import type { AnyElementModel, ElementType } from '@/types';
import type { BaseElement } from './BaseElement';
/**
 * Factory pattern — centralised creation of element instances.
 * Consumers never call `new BoxElement()` directly; they go through this factory.
 */
export declare class ElementFactory {
    static create(type: ElementType, overrides?: Partial<AnyElementModel>): BaseElement;
    static fromModel(model: AnyElementModel): BaseElement;
    static clone(element: BaseElement, offsetX?: number, offsetY?: number): BaseElement;
}
