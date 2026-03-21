import type { IFormat } from '../IFormat.js';
import type { AnyElement, ElementStyle, ElementType, TextAlign } from '../../types/index.js';
import { makeSegmented, makeLabel } from './helpers.js';
const OPTIONS = [
  { value: 'left', label: '←' }, { value: 'center', label: '↔' },
  { value: 'right', label: '→' }, { value: 'justify', label: '≡' },
];
export class TextAlignFormat implements IFormat<TextAlign> {
  id = 'textAlign'; name = 'Text Align'; group = 'Typography';
  appliesTo: ElementType[] = ['text'];
  getValue(el: AnyElement): TextAlign { return el.style.textAlign; }
  apply(_: AnyElement, v: TextAlign): Partial<ElementStyle> { return { textAlign: v }; }
  renderControl(el: AnyElement, onChange: (v: TextAlign) => void): HTMLElement {
    const wrap = document.createElement('div');
    wrap.appendChild(makeLabel(this.name));
    wrap.appendChild(makeSegmented(OPTIONS, this.getValue(el), onChange as (v: string) => void));
    return wrap;
  }
}
