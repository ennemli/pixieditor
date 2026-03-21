import type { ICommand } from '@/history/ICommand';
import type { EditorState } from '@/model/EditorState';
import type { AnyElementModel, ElementFormat } from '@/types';
import type { BaseElement } from '@/model/elements/BaseElement';
export declare class AddElementCommand implements ICommand {
    private state;
    private onAdded?;
    private onRemoved?;
    readonly label: string;
    private _element;
    constructor(state: EditorState, element: BaseElement, onAdded?: ((el: BaseElement) => void) | undefined, onRemoved?: ((id: string) => void) | undefined);
    execute(): void;
    undo(): void;
}
export declare class RemoveElementCommand implements ICommand {
    private state;
    private onRemoved?;
    private onAdded?;
    readonly label: string;
    private _snapshot;
    private _element;
    constructor(state: EditorState, element: BaseElement, onRemoved?: ((id: string) => void) | undefined, onAdded?: ((el: BaseElement) => void) | undefined);
    execute(): void;
    undo(): void;
}
export declare class MoveElementCommand implements ICommand {
    private state;
    private id;
    private fromX;
    private fromY;
    private toX;
    private toY;
    private onMoved?;
    readonly label = "Move element";
    constructor(state: EditorState, id: string, fromX: number, fromY: number, toX: number, toY: number, onMoved?: ((id: string, x: number, y: number) => void) | undefined);
    execute(): void;
    undo(): void;
}
export declare class ResizeElementCommand implements ICommand {
    private state;
    private id;
    private from;
    private to;
    private onResized?;
    readonly label = "Resize element";
    constructor(state: EditorState, id: string, from: {
        x: number;
        y: number;
        width: number;
        height: number;
    }, to: {
        x: number;
        y: number;
        width: number;
        height: number;
    }, onResized?: ((id: string, rect: typeof this.to) => void) | undefined);
    execute(): void;
    undo(): void;
}
export declare class FormatElementCommand implements ICommand {
    private state;
    private id;
    private patch;
    private onFormatted?;
    readonly label: string;
    private _prevFormat;
    constructor(state: EditorState, id: string, patch: Partial<ElementFormat>, onFormatted?: ((id: string) => void) | undefined);
    execute(): void;
    undo(): void;
}
export declare class FreeElementCommand implements ICommand {
    private state;
    private id;
    private newFree;
    private canvasX;
    private canvasY;
    private onChanged?;
    readonly label: string;
    private _prevParentId;
    private _prevFree;
    private _prevX;
    private _prevY;
    constructor(state: EditorState, id: string, newFree: boolean, canvasX: number, canvasY: number, onChanged?: ((id: string) => void) | undefined);
    execute(): void;
    undo(): void;
}
export declare class ReorderLayerCommand implements ICommand {
    private state;
    private id;
    private newZIndex;
    private onReordered?;
    readonly label = "Reorder layer";
    private _prevZIndex;
    constructor(state: EditorState, id: string, newZIndex: number, onReordered?: ((id: string) => void) | undefined);
    execute(): void;
    undo(): void;
}
export declare class UpdatePropertyCommand implements ICommand {
    private state;
    private id;
    private property;
    private newValue;
    private onUpdated?;
    readonly label: string;
    private _prevValue;
    constructor(state: EditorState, id: string, property: Extract<keyof AnyElementModel, string>, newValue: unknown, onUpdated?: ((id: string) => void) | undefined, label?: string);
    execute(): void;
    undo(): void;
}
