import type { IFormat } from '../IFormat.js';
import type { AnyElement, ElementStyle, ElementType } from '../../types/index.js';
import { makeNumberInput, makeLabel } from './helpers.js';
export class RotationFormat implements IFormat<number> {
  id = 'rotation'; name = 'Rotation'; group = 'Transform';
  appliesTo: ElementType[] = ['box', 'image', 'text'];
  getValue(el: AnyElement): number { return el.style.rotation; }
  apply(_: AnyElement, v: number): Partial<ElementStyle> { return { rotation: v }; }
  renderControl(el: AnyElement, onChange: (v: number) => void): HTMLElement {
    const wrap = document.createElement('div');
    wrap.appendChild(makeLabel(this.name));
    wrap.appendChild(makeNumberInput('deg', this.getValue(el), -360, onChange));
    return wrap;
  }
}
