import type { IFormat } from '../IFormat.js';
import type { AnyElement, ElementStyle, ElementType } from '../../types/index.js';
import { makeSlider, makeLabel } from './helpers.js';
export class OpacityFormat implements IFormat<number> {
  id = 'opacity'; name = 'Opacity'; group = 'Effects';
  appliesTo: ElementType[] = ['box', 'image', 'text'];
  getValue(el: AnyElement): number { return el.style.opacity; }
  apply(_: AnyElement, v: number): Partial<ElementStyle> { return { opacity: v }; }
  renderControl(el: AnyElement, onChange: (v: number) => void): HTMLElement {
    const wrap = document.createElement('div');
    wrap.appendChild(makeLabel(this.name));
    wrap.appendChild(makeSlider('opacity', this.getValue(el), 0, 1, 0.01, onChange));
    return wrap;
  }
}
