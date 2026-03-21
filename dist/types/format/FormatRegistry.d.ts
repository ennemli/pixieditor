import type { IFormat } from './IFormat.js';
import type { AnyElement } from '../types/index.js';
/**
 * FormatRegistry stores all registered IFormat instances.
 * Consumers register custom formats; built-in formats are pre-registered.
 */
export declare class FormatRegistry {
    private readonly _formats;
    register(format: IFormat): void;
    get(id: string): IFormat | undefined;
    getAll(): IFormat[];
    getForElement(element: AnyElement): IFormat[];
    getByGroup(): Map<string, IFormat[]>;
}
