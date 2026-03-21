export function makeLabel(text: string): HTMLElement {
  const el = document.createElement('label');
  el.textContent = text;
  el.style.cssText = 'display:block;font-size:11px;color:var(--pe-text-muted,#888);margin-bottom:3px;text-transform:uppercase;letter-spacing:0.5px';
  return el;
}
export function makeRow(): HTMLElement {
  const el = document.createElement('div');
  el.style.cssText = 'display:flex;gap:6px;align-items:center;flex-wrap:wrap;';
  return el;
}
export function makeColorInput(label: string, value: string, onChange: (v: string) => void): HTMLElement {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex;flex-direction:column;gap:2px';
  const lbl = makeLabel(label);
  const inp = document.createElement('input');
  inp.type = 'color';
  inp.value = value.startsWith('#') ? value : '#000000';
  inp.style.cssText = 'width:36px;height:28px;border:none;padding:0;cursor:pointer;border-radius:4px;background:none';
  inp.addEventListener('input', () => onChange(inp.value));
  wrap.append(lbl, inp);
  return wrap;
}
export function makeNumberInput(label: string, value: number, min: number, onChange: (v: number) => void): HTMLElement {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex;flex-direction:column;gap:2px;';
  const lbl = makeLabel(label);
  const inp = document.createElement('input');
  inp.type = 'number';
  inp.value = String(value);
  inp.min = String(min);
  inp.style.cssText = 'width:56px;padding:4px 6px;border:1px solid var(--pe-border,#ddd);border-radius:4px;font-size:12px;background:var(--pe-input-bg,#fff)';
  inp.addEventListener('change', () => onChange(Number(inp.value)));
  wrap.append(lbl, inp);
  return wrap;
}
export function makeTextInput(label: string, placeholder: string, value: string, onChange: (v: string) => void): HTMLElement {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex;flex-direction:column;gap:2px;flex:1';
  const lbl = makeLabel(label);
  const inp = document.createElement('input');
  inp.type = 'text';
  inp.value = value;
  inp.placeholder = placeholder;
  inp.style.cssText = 'width:100%;padding:4px 6px;border:1px solid var(--pe-border,#ddd);border-radius:4px;font-size:12px;background:var(--pe-input-bg,#fff)';
  inp.addEventListener('change', () => onChange(inp.value));
  wrap.append(lbl, inp);
  return wrap;
}
export function makeSlider(label: string, value: number, min: number, max: number, step: number, onChange: (v: number) => void): HTMLElement {
  const inp = document.createElement('input');
  inp.type = 'range';
  inp.min = String(min); inp.max = String(max); inp.step = String(step);
  inp.value = String(value);
  inp.style.cssText = 'width:100%;accent-color:var(--pe-accent,#6366f1)';
  inp.addEventListener('input', () => onChange(Number(inp.value)));
  return inp;
}
export function makeToggle(label: string, value: boolean, onChange: (v: boolean) => void): HTMLElement {
  const wrap = document.createElement('label');
  wrap.style.cssText = 'display:flex;align-items:center;gap:6px;cursor:pointer;font-size:12px;user-select:none';
  const inp = document.createElement('input');
  inp.type = 'checkbox'; inp.checked = value;
  inp.addEventListener('change', () => onChange(inp.checked));
  wrap.append(inp, document.createTextNode(label));
  return wrap;
}
export function makeSelect(label: string, options: {value:string;label:string}[], value: string, onChange: (v: string) => void): HTMLElement {
  const sel = document.createElement('select');
  sel.style.cssText = 'padding:4px 6px;border:1px solid var(--pe-border,#ddd);border-radius:4px;font-size:12px;background:var(--pe-input-bg,#fff)';
  for (const opt of options) {
    const o = document.createElement('option');
    o.value = opt.value; o.textContent = opt.label;
    if (opt.value === value) o.selected = true;
    sel.appendChild(o);
  }
  sel.addEventListener('change', () => onChange(sel.value));
  return sel;
}
export function makeSegmented(options: {value:string;label:string}[], value: string, onChange: (v: string) => void): HTMLElement {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex;border:1px solid var(--pe-border,#ddd);border-radius:4px;overflow:hidden';
  for (const opt of options) {
    const btn = document.createElement('button');
    btn.textContent = opt.label; btn.title = opt.value;
    btn.style.cssText = `flex:1;padding:4px;border:none;font-size:12px;cursor:pointer;background:${opt.value===value?'var(--pe-accent,#6366f1)':'var(--pe-input-bg,#fff)'};color:${opt.value===value?'#fff':'inherit'}`;
    btn.addEventListener('click', () => onChange(opt.value));
    wrap.appendChild(btn);
  }
  return wrap;
}
