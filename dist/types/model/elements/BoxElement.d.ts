import { BaseElement } from './BaseElement';
import type { BoxElementModel } from '@/types';
/**
 * Box element — the primary container node in the tree.
 * Can hold any number of child elements (Composite pattern node).
 *
 * Children are positioned relative to this box unless they are `free`.
 * Supports background color and background image via its format.
 */
export declare class BoxElement extends BaseElement {
    protected _model: BoxElementModel;
    constructor(model?: Partial<BoxElementModel>);
    get children(): string[];
    addChild(id: string, index?: number): void;
    removeChild(id: string): void;
    hasChild(id: string): boolean;
    moveChild(id: string, newIndex: number): void;
    toModel(): BoxElementModel;
}
