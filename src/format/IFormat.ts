import type { AnyElement, ElementStyle, ElementType, FormatValue } from '../types/index.js';

export interface IFormat<T extends FormatValue = FormatValue> {
  readonly id: string;
  readonly name: string;
  readonly group: string;
  readonly appliesTo: ElementType[];
  getValue(element: AnyElement): T;
  apply(element: AnyElement, value: T): Partial<ElementStyle>;
  renderControl(element: AnyElement, onChange: (value: T) => void): HTMLElement;
}
