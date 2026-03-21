import type { IFormat } from '../IFormat.js';
import type { AnyElement, ElementStyle, ElementType } from '../../types/index.js';
import { makeTextInput } from './helpers.js';
export class BackgroundImageFormat implements IFormat<string> {
  id = 'backgroundImage'; name = 'Background Image'; group = 'Background';
  appliesTo: ElementType[] = ['box'];
  getValue(el: AnyElement): string { return el.style.backgroundImage; }
  apply(_: AnyElement, value: string): Partial<ElementStyle> { return { backgroundImage: value }; }
  renderControl(el: AnyElement, onChange: (v: string) => void): HTMLElement {
    return makeTextInput(this.name, 'Image URL', this.getValue(el), onChange);
  }
}
