import type { IFormat } from '../IFormat.js';
import type { AnyElement, ElementStyle, ElementType } from '../../types/index.js';
import { makeToggle } from './helpers.js';
export class CircleFormat implements IFormat<boolean> {
  id = 'isCircle'; name = 'Circle'; group = 'Shape';
  appliesTo: ElementType[] = ['box', 'image'];
  getValue(el: AnyElement): boolean { return el.style.isCircle; }
  apply(_: AnyElement, v: boolean): Partial<ElementStyle> { return { isCircle: v }; }
  renderControl(el: AnyElement, onChange: (v: boolean) => void): HTMLElement {
    return makeToggle(this.name, this.getValue(el), onChange);
  }
}
