import type { IFormat } from '../IFormat.js';
import type { AnyElement, ElementStyle, ElementType, BorderStyle as BS } from '../../types/index.js';
import { makeRow, makeNumberInput, makeColorInput, makeSelect, makeLabel } from './helpers.js';
export class BorderFormat implements IFormat<BS> {
  id = 'border'; name = 'Border'; group = 'Border';
  appliesTo: ElementType[] = ['box', 'image', 'text'];
  getValue(el: AnyElement): BS { return el.style.border; }
  apply(_: AnyElement, v: BS): Partial<ElementStyle> { return { border: v }; }
  renderControl(el: AnyElement, onChange: (v: BS) => void): HTMLElement {
    const cur = this.getValue(el);
    const wrap = document.createElement('div');
    wrap.appendChild(makeLabel(this.name));
    const row = makeRow();
    row.appendChild(makeNumberInput('width', cur.width, 0, w => onChange({ ...cur, width: w })));
    row.appendChild(makeColorInput('color', cur.color, c => onChange({ ...cur, color: c })));
    row.appendChild(makeSelect('style', [
      {value:'solid',label:'Solid'},{value:'dashed',label:'Dashed'},{value:'dotted',label:'Dotted'},{value:'none',label:'None'}
    ], cur.style, s => onChange({ ...cur, style: s as BS['style'] })));
    wrap.appendChild(row);
    return wrap;
  }
}
