import type { IFormat } from '../IFormat.js';
import type { AnyElement, ElementStyle, ElementType } from '../../types/index.js';
import { makeColorInput } from './helpers.js';
export class BackgroundColorFormat implements IFormat<string> {
  id = 'backgroundColor'; name = 'Background Color'; group = 'Background';
  appliesTo: ElementType[] = ['box', 'text'];
  getValue(el: AnyElement): string { return el.style.backgroundColor; }
  apply(_: AnyElement, value: string): Partial<ElementStyle> { return { backgroundColor: value }; }
  renderControl(el: AnyElement, onChange: (v: string) => void): HTMLElement {
    return makeColorInput(this.name, this.getValue(el), onChange);
  }
}
