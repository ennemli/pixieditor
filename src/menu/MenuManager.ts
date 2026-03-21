import type { CustomMenuItem, ExportFormat, EditorAPI } from '../types/index.js';
export class MenuManager {
  private _bar!: HTMLElement;
  private readonly _customItems: CustomMenuItem[];
  private readonly _exportFormats: ExportFormat[];
  constructor(customItems: CustomMenuItem[] = [], exportFormats: ExportFormat[] = []) {
    this._customItems = [...customItems]; this._exportFormats = [...exportFormats];
  }
  mount(container: HTMLElement, api: EditorAPI): HTMLElement {
    this._bar = document.createElement('div');
    this._bar.style.cssText = 'display:flex;align-items:center;height:40px;background:var(--pe-panel-bg,#1e1e2e);border-bottom:1px solid var(--pe-border,#333);padding:0 12px;gap:4px;z-index:100;flex-shrink:0;';
    const logo = document.createElement('span');
    logo.textContent = '✦ PixiEditor';
    logo.style.cssText = 'font-size:13px;font-weight:600;color:#a5b4fc;margin-right:16px;';
    this._bar.appendChild(logo);
    this._addMenu('File', [
      { label: 'Export JSON', action: () => { const b = new Blob([JSON.stringify(api.getDocument(), null, 2)], {type:'application/json'}); this._dl(b,'document.json'); }},
      ...this._exportFormats.map(ef => ({ label: ef.label, action: async () => { const r = await ef.handler(api.getDocument()); this._dl(r instanceof Blob ? r : new Blob([r as string]), `document.${ef.id}`); } })),
    ]);
    this._addMenu('Edit', [
      { label: 'Undo  ⌘Z', action: () => api.undo() },
      { label: 'Redo  ⌘⇧Z', action: () => api.redo() },
    ]);
    const groups = new Map<string, CustomMenuItem[]>();
    for (const item of this._customItems) { if (!groups.has(item.group)) groups.set(item.group,[]); groups.get(item.group)!.push(item); }
    for (const [g, items] of groups) this._addMenu(g, items.map(i => ({ label: i.label, action: () => i.callback(api) })));
    container.appendChild(this._bar);
    return this._bar;
  }
  private _addMenu(label: string, items: {label:string;action:()=>void}[]): void {
    const wrap = document.createElement('div');
    wrap.style.position = 'relative';
    const btn = this._mkBtn(label, () => { const open = dd.style.display==='block'; this._closeAll(); dd.style.display = open?'none':'block'; });
    const dd = document.createElement('div');
    dd.className = 'pe-dropdown';
    dd.style.cssText = 'display:none;position:absolute;top:100%;left:0;background:var(--pe-panel-bg,#1e1e2e);border:1px solid var(--pe-border,#333);border-radius:6px;min-width:160px;z-index:9999;box-shadow:0 8px 24px rgba(0,0,0,0.4);padding:4px 0;';
    for (const it of items) {
      const e = document.createElement('button');
      e.textContent = it.label;
      e.style.cssText = 'display:block;width:100%;text-align:left;padding:7px 14px;border:none;background:none;color:var(--pe-text,#e2e8f0);font-size:12px;cursor:pointer;';
      e.addEventListener('mouseenter',()=>e.style.background='rgba(99,102,241,0.15)');
      e.addEventListener('mouseleave',()=>e.style.background='none');
      e.addEventListener('click',()=>{ this._closeAll(); it.action(); });
      dd.appendChild(e);
    }
    wrap.append(btn, dd);
    this._bar.appendChild(wrap);
    document.addEventListener('click', ev => { if (!wrap.contains(ev.target as Node)) dd.style.display='none'; });
  }
  private _mkBtn(label: string, onClick: ()=>void): HTMLButtonElement {
    const b = document.createElement('button');
    b.textContent = label;
    b.style.cssText = 'background:none;border:none;padding:5px 10px;color:var(--pe-text,#e2e8f0);font-size:12px;cursor:pointer;border-radius:4px;';
    b.addEventListener('mouseenter',()=>b.style.background='rgba(255,255,255,0.08)');
    b.addEventListener('mouseleave',()=>b.style.background='none');
    b.addEventListener('click',onClick);
    return b;
  }
  private _closeAll(): void { document.querySelectorAll<HTMLElement>('.pe-dropdown').forEach(d=>d.style.display='none'); }
  private _dl(blob: Blob, name: string): void { const u=URL.createObjectURL(blob);const a=document.createElement('a');a.href=u;a.download=name;a.click();URL.revokeObjectURL(u); }
}
