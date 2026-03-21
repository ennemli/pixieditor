import type { BaseElementModel, ElementFormat, TailwindSize } from '@/types';
/**
 * Abstract base class for all editor elements.
 * Implements the Composite pattern — BoxElement extends this to hold children.
 *
 * Responsibilities:
 *  - Owns the raw model data (plain serialisable object).
 *  - Provides typed getters/setters for all shared properties.
 *  - Does NOT know about rendering or interaction.
 */
export declare abstract class BaseElement {
    protected _model: BaseElementModel;
    constructor(model: Partial<BaseElementModel> & {
        type: BaseElementModel['type'];
    });
    get id(): string;
    get type(): BaseElementModel['type'];
    get name(): string;
    set name(v: string);
    get x(): number;
    set x(v: number);
    get y(): number;
    set y(v: number);
    get width(): TailwindSize;
    set width(v: TailwindSize);
    get height(): TailwindSize;
    set height(v: TailwindSize);
    get zIndex(): number;
    set zIndex(v: number);
    get free(): boolean;
    set free(v: boolean);
    get parentId(): string | null;
    set parentId(v: string | null);
    get locked(): boolean;
    set locked(v: boolean);
    get visible(): boolean;
    set visible(v: boolean);
    get format(): ElementFormat;
    applyFormat(patch: Partial<ElementFormat>): void;
    clearFormat(key: keyof ElementFormat): void;
    /** Returns a deep-cloned plain model object (safe to store in history). */
    toModel(): BaseElementModel;
    /** Patch model directly (used when restoring from history). */
    fromModel(model: BaseElementModel): void;
}
