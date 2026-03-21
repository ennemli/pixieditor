import type { IFormat } from '../IFormat.js';
import type { AnyElement, ElementStyle, ElementType } from '../../types/index.js';
import { makeNumberInput, makeLabel } from './helpers.js';
export class FontSizeFormat implements IFormat<number> {
  id = 'fontSize'; name = 'Font Size'; group = 'Typography';
  appliesTo: ElementType[] = ['text'];
  getValue(el: AnyElement): number { return el.style.fontSize; }
  apply(_: AnyElement, v: number): Partial<ElementStyle> { return { fontSize: v }; }
  renderControl(el: AnyElement, onChange: (v: number) => void): HTMLElement {
    const wrap = document.createElement('div');
    wrap.appendChild(makeLabel(this.name));
    wrap.appendChild(makeNumberInput('size', this.getValue(el), 1, onChange));
    return wrap;
  }
}
