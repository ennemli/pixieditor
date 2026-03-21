import type { IFormat } from '../IFormat.js';
import type { AnyElement, ElementStyle, ElementType, ShadowStyle } from '../../types/index.js';
import { makeRow, makeNumberInput, makeColorInput, makeToggle, makeLabel } from './helpers.js';
const DEFAULT_SHADOW: ShadowStyle = { x: 0, y: 4, blur: 8, spread: 0, color: 'rgba(0,0,0,0.2)', inset: false };
export class ShadowFormat implements IFormat<ShadowStyle | null> {
  id = 'shadow'; name = 'Shadow'; group = 'Effects';
  appliesTo: ElementType[] = ['box', 'image', 'text'];
  getValue(el: AnyElement): ShadowStyle | null { return el.style.shadow; }
  apply(_: AnyElement, v: ShadowStyle | null): Partial<ElementStyle> { return { shadow: v }; }
  renderControl(el: AnyElement, onChange: (v: ShadowStyle | null) => void): HTMLElement {
    const cur = this.getValue(el) ?? DEFAULT_SHADOW;
    const wrap = document.createElement('div');
    wrap.appendChild(makeLabel(this.name));
    wrap.appendChild(makeToggle('Enable', !!this.getValue(el), (on) => onChange(on ? { ...DEFAULT_SHADOW } : null)));
    const row = makeRow();
    (['x','y','blur','spread'] as (keyof ShadowStyle)[]).forEach(k => {
      row.appendChild(makeNumberInput(k as string, cur[k] as number, -999, (v) => onChange({ ...cur, [k]: v })));
    });
    row.appendChild(makeColorInput('color', cur.color, c => onChange({ ...cur, color: c })));
    wrap.appendChild(row);
    return wrap;
  }
}
