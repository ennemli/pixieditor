import type { IFormat } from './IFormat.js';
import type { AnyElement, ElementType } from '../types/index.js';

/**
 * FormatRegistry stores all registered IFormat instances.
 * Consumers register custom formats; built-in formats are pre-registered.
 */
export class FormatRegistry {
  private readonly _formats = new Map<string, IFormat>();

  register(format: IFormat): void {
    this._formats.set(format.id, format);
  }

  get(id: string): IFormat | undefined {
    return this._formats.get(id);
  }

  getAll(): IFormat[] {
    return Array.from(this._formats.values());
  }

  getForElement(element: AnyElement): IFormat[] {
    return this.getAll().filter(f => f.appliesTo.includes(element.type));
  }

  getByGroup(): Map<string, IFormat[]> {
    const groups = new Map<string, IFormat[]>();
    for (const f of this.getAll()) {
      if (!groups.has(f.group)) groups.set(f.group, []);
      groups.get(f.group)!.push(f);
    }
    return groups;
  }
}
