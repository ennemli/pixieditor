import type { EditorAPI, AnyElement, DocumentState } from '../types/index.js';
import type { DocumentModel } from '../model/DocumentModel.js';
import type { HistoryManager } from '../history/HistoryManager.js';
import type { EventEmitter } from '../core/EventEmitter.js';
import type { FormatRegistry } from '../format/FormatRegistry.js';
import { StyleCommand } from '../history/commands/StyleCommand.js';
import { LayerMoveCommand, LayerReorderCommand } from '../history/commands/LayerCommand.js';

/**
 * RightPanel — two-tab panel: Properties + Layers.
 */
export class RightPanel {
  private _root!: HTMLElement;
  private _propertiesPane!: HTMLElement;
  private _layersPane!: HTMLElement;
  private _activeTab: 'properties' | 'layers' = 'properties';
  private _currentSelectedId: string | null = null;

  constructor(
    private readonly _model: DocumentModel,
    private readonly _formatRegistry: FormatRegistry,
    private readonly _history: HistoryManager,
    private readonly _emitter: EventEmitter
  ) {}

  mount(container: HTMLElement, api: EditorAPI): HTMLElement {
    this._root = document.createElement('div');
    this._root.style.cssText = 'width:260px;height:100%;background:var(--pe-panel-bg,#1e1e2e);border-left:1px solid var(--pe-border,#333);display:flex;flex-direction:column;flex-shrink:0;';

    // Tab bar
    const tabBar = document.createElement('div');
    tabBar.style.cssText = 'display:flex;border-bottom:1px solid var(--pe-border,#333);flex-shrink:0;';
    const makeTab = (label: string, key: 'properties' | 'layers') => {
      const t = document.createElement('button');
      t.textContent = label;
      t.style.cssText = 'flex:1;padding:10px;border:none;background:none;cursor:pointer;font-size:12px;color:var(--pe-text-muted,#888);border-bottom:2px solid transparent;';
      t.addEventListener('click', () => {
        this._activeTab = key;
        this._propertiesPane.style.display = key === 'properties' ? 'block' : 'none';
        this._layersPane.style.display = key === 'layers' ? 'block' : 'none';
        propTab.style.cssText = propTab.style.cssText.replace(/border-bottom:[^;]+/, `border-bottom:2px solid ${key==='properties'?'#6366f1':'transparent'}`);
        layTab.style.cssText = layTab.style.cssText.replace(/border-bottom:[^;]+/, `border-bottom:2px solid ${key==='layers'?'#6366f1':'transparent'}`);
        propTab.style.color = key === 'properties' ? 'var(--pe-text,#e2e8f0)' : 'var(--pe-text-muted,#888)';
        layTab.style.color = key === 'layers' ? 'var(--pe-text,#e2e8f0)' : 'var(--pe-text-muted,#888)';
        if (key === 'layers') this._refreshLayers(api);
      });
      return t;
    };
    const propTab = makeTab('Properties', 'properties');
    const layTab = makeTab('Layers', 'layers');
    propTab.style.color = 'var(--pe-text,#e2e8f0)';
    propTab.style.borderBottom = '2px solid #6366f1';
    tabBar.append(propTab, layTab);
    this._root.appendChild(tabBar);

    // Content panes
    this._propertiesPane = document.createElement('div');
    this._propertiesPane.style.cssText = 'flex:1;overflow-y:auto;display:block;';
    this._layersPane = document.createElement('div');
    this._layersPane.style.cssText = 'flex:1;overflow-y:auto;display:none;';
    this._root.append(this._propertiesPane, this._layersPane);
    container.appendChild(this._root);

    // Listeners
    this._emitter.on('selection:change', ({ selection }) => {
      this._currentSelectedId = selection.ids[0] ?? null;
      this._refreshProperties(api);
      if (this._activeTab === 'layers') this._refreshLayers(api);
    });
    this._emitter.on('document:change', () => {
      if (this._activeTab === 'layers') this._refreshLayers(api);
      if (this._currentSelectedId) this._refreshProperties(api);
    });

    return this._root;
  }

  private _refreshProperties(api: EditorAPI): void {
    this._propertiesPane.innerHTML = '';
    if (!this._currentSelectedId) {
      const p = this._placeholder('Select an element to edit its properties.');
      this._propertiesPane.appendChild(p);
      return;
    }
    const el = this._model.getElement(this._currentSelectedId);
    if (!el) return;

    // Element info header
    const header = document.createElement('div');
    header.style.cssText = 'padding:12px;border-bottom:1px solid var(--pe-border,#333);';
    const nameInput = document.createElement('input');
    nameInput.value = el.name;
    nameInput.style.cssText = 'width:100%;padding:6px 8px;background:rgba(255,255,255,0.05);border:1px solid var(--pe-border,#333);border-radius:4px;color:var(--pe-text,#e2e8f0);font-size:12px;box-sizing:border-box;';
    nameInput.addEventListener('change', () => this._model.updateName(el.id, nameInput.value));

    const meta = document.createElement('div');
    meta.style.cssText = 'font-size:10px;color:var(--pe-text-muted,#666);margin-top:4px;display:flex;gap:8px;';
    meta.innerHTML = `<span>Type: ${el.type}</span><span>Free: ${el.free}</span>`;

    // Free toggle
    const freeToggle = document.createElement('label');
    freeToggle.style.cssText = 'display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer;margin-top:6px;color:var(--pe-text,#e2e8f0);';
    const freeCheck = document.createElement('input');
    freeCheck.type = 'checkbox'; freeCheck.checked = el.free;
    freeCheck.addEventListener('change', () => api.setFree(el.id, freeCheck.checked));
    freeToggle.append(freeCheck, document.createTextNode('Free position'));

    header.append(nameInput, meta, freeToggle);
    this._propertiesPane.appendChild(header);

    // Format controls by group
    const byGroup = this._formatRegistry.getByGroup();
    for (const [group, formats] of byGroup) {
      const applicable = formats.filter(f => f.appliesTo.includes(el.type));
      if (applicable.length === 0) continue;
      const section = this._makeSection(group);
      const id = this._currentSelectedId;
      for (const fmt of applicable) {
        const control = fmt.renderControl(el, (value) => {
          const patch = fmt.apply(el, value);
          this._history.execute(new StyleCommand(this._model, this._emitter, id!, patch));
        });
        control.style.marginBottom = '8px';
        section.appendChild(control);
      }
      this._propertiesPane.appendChild(section);
    }
  }

  private _refreshLayers(api: EditorAPI): void {
    this._layersPane.innerHTML = '';
    const doc = this._model.getDocument();
    const header = document.createElement('div');
    header.style.cssText = 'padding:12px;font-size:11px;font-weight:600;color:var(--pe-text-muted,#888);text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid var(--pe-border,#333);';
    header.textContent = `Layers (${Object.keys(doc.elements).length})`;
    this._layersPane.appendChild(header);
    const list = document.createElement('div');
    list.style.cssText = 'padding:8px 0;';
    // Render from top to bottom (reverse for visual top = first)
    const renderIds = (ids: string[], depth: number) => {
      for (const id of [...ids].reverse()) {
        const el = doc.elements[id];
        if (!el) continue;
        const row = this._makeLayerRow(el, depth, api, doc);
        list.appendChild(row);
        if (el.type === 'box' && (el as any).children?.length > 0) {
          renderIds((el as any).children, depth + 1);
        }
      }
    };
    renderIds(doc.children, 0);
    this._layersPane.appendChild(list);
  }

  private _makeLayerRow(el: AnyElement, depth: number, api: EditorAPI, doc: DocumentState): HTMLElement {
    const isSelected = el.id === this._currentSelectedId;
    const row = document.createElement('div');
    row.draggable = true;
    row.style.cssText = `
      display:flex;align-items:center;gap:6px;padding:6px 12px 6px ${12+depth*16}px;
      cursor:pointer;font-size:12px;
      background:${isSelected?'rgba(99,102,241,0.2)':'transparent'};
      color:var(--pe-text,#e2e8f0);
      border-left:${isSelected?'2px solid #6366f1':'2px solid transparent'};
    `;
    const icon = { box: '⬜', image: '🖼', text: 'T' }[el.type];
    const typeSpan = document.createElement('span');
    typeSpan.textContent = icon;
    typeSpan.style.cssText = 'font-size:12px;flex-shrink:0';

    const nameEl = document.createElement('span');
    nameEl.textContent = el.name;
    nameEl.style.cssText = 'flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';

    // Visibility toggle
    const visBtn = document.createElement('button');
    visBtn.textContent = el.visible ? '👁' : '🚫';
    visBtn.style.cssText = 'background:none;border:none;cursor:pointer;font-size:12px;padding:2px;';
    visBtn.title = el.visible ? 'Hide' : 'Show';
    visBtn.addEventListener('click', (e) => { e.stopPropagation(); this._model.setVisible(el.id, !el.visible); this._emitter.emit('document:change', { document: this._model.getSnapshot() }); });

    // Lock toggle
    const lockBtn = document.createElement('button');
    lockBtn.textContent = el.locked ? '🔒' : '🔓';
    lockBtn.style.cssText = 'background:none;border:none;cursor:pointer;font-size:12px;padding:2px;';
    lockBtn.addEventListener('click', (e) => { e.stopPropagation(); this._model.setLocked(el.id, !el.locked); this._emitter.emit('document:change', { document: this._model.getSnapshot() }); });

    // Layer order buttons
    const upBtn = document.createElement('button');
    upBtn.textContent = '↑'; upBtn.title = 'Move up';
    upBtn.style.cssText = 'background:none;border:none;cursor:pointer;font-size:12px;padding:2px;color:var(--pe-text-muted,#888);';
    upBtn.addEventListener('click', (e) => { e.stopPropagation(); api.moveLayer(el.id, 'up'); });

    const downBtn = document.createElement('button');
    downBtn.textContent = '↓'; downBtn.title = 'Move down';
    downBtn.style.cssText = 'background:none;border:none;cursor:pointer;font-size:12px;padding:2px;color:var(--pe-text-muted,#888);';
    downBtn.addEventListener('click', (e) => { e.stopPropagation(); api.moveLayer(el.id, 'down'); });

    row.append(typeSpan, nameEl, visBtn, lockBtn, upBtn, downBtn);
    row.addEventListener('click', () => api.selectElement(el.id));

    // Drag-to-reorder
    row.addEventListener('dragstart', (e) => { e.dataTransfer?.setData('text/plain', JSON.stringify({ layerId: el.id })); });
    row.addEventListener('dragover', (e) => { e.preventDefault(); row.style.borderTop = '2px solid #6366f1'; });
    row.addEventListener('dragleave', () => { row.style.borderTop = ''; });
    row.addEventListener('drop', (e) => {
      e.preventDefault(); row.style.borderTop = '';
      try {
        const data = JSON.parse(e.dataTransfer?.getData('text/plain') ?? '{}');
        if (data.layerId && data.layerId !== el.id) {
          api.reorderLayer(data.layerId, el.id, 'before');
        }
      } catch {}
    });

    return row;
  }

  private _makeSection(title: string): HTMLElement {
    const s = document.createElement('div');
    s.style.cssText = 'padding:12px;border-bottom:1px solid rgba(255,255,255,0.05);';
    const h = document.createElement('div');
    h.textContent = title;
    h.style.cssText = 'font-size:10px;font-weight:600;color:var(--pe-text-muted,#888);text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;';
    s.appendChild(h);
    return s;
  }

  private _placeholder(text: string): HTMLElement {
    const p = document.createElement('p');
    p.textContent = text;
    p.style.cssText = 'font-size:12px;color:var(--pe-text-muted,#666);padding:16px;text-align:center;';
    return p;
  }
}
