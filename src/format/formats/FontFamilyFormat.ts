import type { IFormat } from '../IFormat.js';
import type { AnyElement, ElementStyle, ElementType } from '../../types/index.js';
import { makeSelect, makeLabel } from './helpers.js';
const FONTS = ['Inter', 'Arial', 'Helvetica', 'Georgia', 'Times New Roman', 'Courier New', 'Verdana', 'Trebuchet MS', 'Impact'];
export class FontFamilyFormat implements IFormat<string> {
  id = 'fontFamily'; name = 'Font Family'; group = 'Typography';
  appliesTo: ElementType[] = ['text'];
  getValue(el: AnyElement): string { return el.style.fontFamily; }
  apply(_: AnyElement, v: string): Partial<ElementStyle> { return { fontFamily: v }; }
  renderControl(el: AnyElement, onChange: (v: string) => void): HTMLElement {
    const wrap = document.createElement('div');
    wrap.appendChild(makeLabel(this.name));
    wrap.appendChild(makeSelect('fontFamily', FONTS.map(f => ({ value: f, label: f })), this.getValue(el), onChange));
    return wrap;
  }
}
