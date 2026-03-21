import type { IFormat } from '../IFormat.js';
import type { AnyElement, ElementStyle, ElementType } from '../../types/index.js';
import { makeRow, makeNumberInput, makeLabel } from './helpers.js';

interface PaddingValue { top: number; right: number; bottom: number; left: number; }

export class PaddingFormat implements IFormat<PaddingValue> {
  id = 'padding'; name = 'Padding'; group = 'Spacing';
  appliesTo: ElementType[] = ['box', 'text'];
  getValue(el: AnyElement): PaddingValue {
    return { top: el.style.paddingTop, right: el.style.paddingRight, bottom: el.style.paddingBottom, left: el.style.paddingLeft };
  }
  apply(_: AnyElement, v: PaddingValue): Partial<ElementStyle> {
    return { paddingTop: v.top, paddingRight: v.right, paddingBottom: v.bottom, paddingLeft: v.left };
  }
  renderControl(el: AnyElement, onChange: (v: PaddingValue) => void): HTMLElement {
    const cur = this.getValue(el);
    const wrap = document.createElement('div');
    wrap.appendChild(makeLabel(this.name));
    const row = makeRow();
    const update = (key: keyof PaddingValue) => (val: number) => onChange({ ...cur, [key]: val });
    ['top','right','bottom','left'].forEach(k => {
      row.appendChild(makeNumberInput(k, cur[k as keyof PaddingValue], 0, update(k as keyof PaddingValue)));
    });
    wrap.appendChild(row);
    return wrap;
  }
}
