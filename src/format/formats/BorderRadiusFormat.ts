import type { IFormat } from '../IFormat.js';
import type { AnyElement, ElementStyle, ElementType } from '../../types/index.js';
import { makeNumberInput, makeLabel } from './helpers.js';

export class BorderRadiusFormat implements IFormat<number> {
  id = 'borderRadius'; name = 'Border Radius'; group = 'Border';
  appliesTo: ElementType[] = ['box', 'image', 'text'];
  getValue(el: AnyElement): number { return el.style.borderRadiusTopLeft; }
  apply(_: AnyElement, v: number): Partial<ElementStyle> {
    return { borderRadiusTopLeft: v, borderRadiusTopRight: v, borderRadiusBottomRight: v, borderRadiusBottomLeft: v };
  }
  renderControl(el: AnyElement, onChange: (v: number) => void): HTMLElement {
    const wrap = document.createElement('div');
    wrap.appendChild(makeLabel(this.name));
    wrap.appendChild(makeNumberInput('radius', this.getValue(el), 0, onChange));
    return wrap;
  }
}
