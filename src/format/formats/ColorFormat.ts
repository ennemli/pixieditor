import type { IFormat } from '../IFormat.js';
import type { AnyElement, ElementStyle, ElementType } from '../../types/index.js';
import { makeColorInput } from './helpers.js';
export class ColorFormat implements IFormat<string> {
  id = 'color'; name = 'Text Color'; group = 'Typography';
  appliesTo: ElementType[] = ['text', 'box'];
  getValue(el: AnyElement): string { return el.style.color; }
  apply(_: AnyElement, value: string): Partial<ElementStyle> { return { color: value }; }
  renderControl(el: AnyElement, onChange: (v: string) => void): HTMLElement {
    return makeColorInput(this.name, this.getValue(el), onChange);
  }
}
