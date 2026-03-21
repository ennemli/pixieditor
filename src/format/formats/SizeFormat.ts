import type { IFormat } from '../IFormat.js';
import type { AnyElement, ElementStyle, ElementType } from '../../types/index.js';
import { makeRow, makeTextInput, makeLabel } from './helpers.js';
interface SizeValue { width: string | number; height: string | number; }
export class SizeFormat implements IFormat<SizeValue> {
  id = 'size'; name = 'Size'; group = 'Layout';
  appliesTo: ElementType[] = ['box', 'image', 'text'];
  getValue(el: AnyElement): SizeValue { return { width: el.style.width, height: el.style.height }; }
  apply(_: AnyElement, v: SizeValue): Partial<ElementStyle> { return { width: v.width, height: v.height }; }
  renderControl(el: AnyElement, onChange: (v: SizeValue) => void): HTMLElement {
    const cur = this.getValue(el);
    const wrap = document.createElement('div');
    wrap.appendChild(makeLabel(this.name));
    const row = makeRow();
    row.appendChild(makeTextInput('W', 'width', String(cur.width), v => onChange({ ...cur, width: isNaN(Number(v)) ? v : Number(v) })));
    row.appendChild(makeTextInput('H', 'height', String(cur.height), v => onChange({ ...cur, height: isNaN(Number(v)) ? v : Number(v) })));
    wrap.appendChild(row);
    return wrap;
  }
}
