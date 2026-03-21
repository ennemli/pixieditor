import type { EditorEventMap } from '../events/EditorEvents';
import type { EventBus } from '../events/EventBus';
import type {
  AnyElementModel,
  EditorState,
  ElementId,
  ElementTemplate,
  IFormatDefinition,
  ThemeConfig,
} from '../models/types';
import type { FormatRegistry } from '../formats/FormatRegistry';
import type { ExportManager } from '../export/ExportManager';
import type { MenuBarManager } from '../export/ExportManager';

// ─── CSS Variable Injection ───────────────────────────────────────────────────

function injectTheme(theme: ThemeConfig, root: HTMLElement): void {
  root.style.setProperty('--pe-bg', theme.panelBackground);
  root.style.setProperty('--pe-border', theme.panelBorder);
  root.style.setProperty('--pe-accent', theme.accent);
  root.style.setProperty('--pe-accent-fg', theme.accentForeground);
  root.style.setProperty('--pe-text', theme.text);
  root.style.setProperty('--pe-text-2', theme.textSecondary);
  root.style.setProperty('--pe-surface', theme.surface);
  root.style.setProperty('--pe-surface-hover', theme.surfaceHover);
  root.style.setProperty('--pe-danger', theme.danger);
}

function injectGlobalStyles(): void {
  if (document.getElementById('pixieditor-styles')) return;
  const style = document.createElement('style');
  style.id = 'pixieditor-styles';
  style.textContent = `
    .pe-panel {
      position: absolute;
      top: 40px;
      bottom: 0;
      width: 260px;
      background: var(--pe-bg);
      border: 1px solid var(--pe-border);
      color: var(--pe-text);
      font-family: Inter, system-ui, sans-serif;
      font-size: 13px;
      overflow-y: auto;
      z-index: 100;
      display: flex;
      flex-direction: column;
      user-select: none;
    }
    .pe-panel--left { left: 0; border-left: none; border-top: none; border-bottom: none; }
    .pe-panel--right { right: 0; border-right: none; border-top: none; border-bottom: none; }
    .pe-panel-section { padding: 12px; border-bottom: 1px solid var(--pe-border); }
    .pe-panel-section-title { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: var(--pe-text-2); margin-bottom: 8px; }
    .pe-element-card {
      display: flex; align-items: center; gap: 8px; padding: 8px 10px;
      border-radius: 6px; cursor: grab; background: var(--pe-surface);
      border: 1px solid var(--pe-border); margin-bottom: 6px;
      transition: background 0.15s;
    }
    .pe-element-card:hover { background: var(--pe-surface-hover); }
    .pe-element-card span { font-size: 14px; }
    .pe-format-card {
      display: flex; align-items: center; gap: 8px; padding: 7px 10px;
      border-radius: 6px; cursor: pointer; background: var(--pe-surface);
      border: 1px solid var(--pe-border); margin-bottom: 5px;
      transition: background 0.15s;
    }
    .pe-format-card:hover { background: var(--pe-surface-hover); }
    .pe-tabs { display: flex; border-bottom: 1px solid var(--pe-border); }
    .pe-tab {
      flex: 1; padding: 10px; text-align: center; cursor: pointer;
      font-size: 12px; font-weight: 500; color: var(--pe-text-2);
      border-bottom: 2px solid transparent; transition: color 0.15s, border-color 0.15s;
    }
    .pe-tab--active { color: var(--pe-accent); border-bottom-color: var(--pe-accent); }
    .pe-prop-row { display: flex; align-items: center; gap: 8px; padding: 6px 12px; }
    .pe-prop-label { flex: 1; color: var(--pe-text-2); font-size: 12px; }
    .pe-prop-input {
      background: var(--pe-surface); border: 1px solid var(--pe-border);
      color: var(--pe-text); border-radius: 4px; padding: 3px 7px;
      font-size: 12px; width: 90px; outline: none;
    }
    .pe-prop-input:focus { border-color: var(--pe-accent); }
    .pe-prop-color { width: 28px; height: 24px; border-radius: 4px; border: 1px solid var(--pe-border); cursor: pointer; }
    .pe-menubar {
      position: absolute; top: 0; left: 0; right: 0; height: 40px;
      background: var(--pe-bg); border-bottom: 1px solid var(--pe-border);
      display: flex; align-items: center; padding: 0 8px; gap: 4px;
      z-index: 200; font-family: Inter, system-ui, sans-serif; font-size: 13px;
    }
    .pe-menu-group { position: relative; }
    .pe-menu-btn {
      padding: 4px 10px; border-radius: 4px; cursor: pointer; color: var(--pe-text);
      background: none; border: none; font-size: 13px; font-family: inherit;
    }
    .pe-menu-btn:hover { background: var(--pe-surface); }
    .pe-menu-dropdown {
      position: absolute; top: 100%; left: 0; min-width: 180px;
      background: var(--pe-bg); border: 1px solid var(--pe-border);
      border-radius: 6px; box-shadow: 0 8px 24px rgba(0,0,0,0.4); z-index: 300; padding: 4px;
    }
    .pe-menu-item {
      padding: 7px 12px; border-radius: 4px; cursor: pointer; color: var(--pe-text);
      display: flex; justify-content: space-between; align-items: center;
    }
    .pe-menu-item:hover { background: var(--pe-surface-hover); }
    .pe-menu-shortcut { color: var(--pe-text-2); font-size: 11px; }
    .pe-layer-item {
      display: flex; align-items: center; gap: 8px; padding: 6px 12px;
      cursor: pointer; border-radius: 4px; transition: background 0.1s;
    }
    .pe-layer-item:hover { background: var(--pe-surface-hover); }
    .pe-layer-item--selected { background: color-mix(in srgb, var(--pe-accent) 20%, transparent); }
    .pe-layer-item__icon { font-size: 12px; }
    .pe-layer-item__name { flex: 1; font-size: 12px; }
    .pe-layer-item__actions { display: flex; gap: 4px; opacity: 0; }
    .pe-layer-item:hover .pe-layer-item__actions { opacity: 1; }
    .pe-icon-btn {
      background: none; border: none; cursor: pointer; color: var(--pe-text-2);
      padding: 2px; border-radius: 3px; font-size: 12px;
    }
    .pe-icon-btn:hover { color: var(--pe-text); background: var(--pe-surface); }
    .pe-bubble-bar {
      position: absolute; background: var(--pe-bg); border: 1px solid var(--pe-border);
      border-radius: 8px; padding: 4px 8px; display: flex; gap: 4px; align-items: center;
      box-shadow: 0 4px 16px rgba(0,0,0,0.3); z-index: 500;
    }
    .pe-bubble-btn {
      background: none; border: none; color: var(--pe-text); cursor: pointer;
      padding: 4px 8px; border-radius: 4px; font-size: 13px;
    }
    .pe-bubble-btn:hover { background: var(--pe-surface-hover); }
    .pe-bubble-btn--active { background: var(--pe-accent); color: var(--pe-accent-fg); }
    .pe-transform-section { padding: 12px; border-bottom: 1px solid var(--pe-border); }
    .pe-transform-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
    .pe-transform-field { display: flex; flex-direction: column; gap: 3px; }
    .pe-transform-field label { font-size: 10px; color: var(--pe-text-2); font-weight: 600; text-transform: uppercase; }
    .pe-free-toggle {
      display: flex; align-items: center; justify-content: space-between;
      padding: 8px 12px; border-bottom: 1px solid var(--pe-border); cursor: pointer;
    }
    .pe-toggle {
      width: 32px; height: 18px; background: var(--pe-surface); border-radius: 9px;
      position: relative; transition: background 0.2s; border: 1px solid var(--pe-border);
    }
    .pe-toggle--on { background: var(--pe-accent); }
    .pe-toggle::after {
      content: ''; position: absolute; width: 12px; height: 12px;
      background: white; border-radius: 50%; top: 2px; left: 2px; transition: transform 0.2s;
    }
    .pe-toggle--on::after { transform: translateX(14px); }
  `;
  document.head.appendChild(style);
}

// ─── MenuBar ──────────────────────────────────────────────────────────────────

class MenuBar {
  private el: HTMLElement;
  private openGroup: string | null = null;

  constructor(
    private readonly container: HTMLElement,
    private readonly menubarMgr: MenuBarManager,
    private readonly exportMgr: ExportManager,
    private readonly bus: EventBus<EditorEventMap>,
    private readonly getState: () => EditorState,
  ) {
    this.el = document.createElement('div');
    this.el.className = 'pe-menubar';
    container.appendChild(this.el);
    this.render();
    document.addEventListener('click', this.onDocClick);
  }

  private render(): void {
    this.el.innerHTML = '';

    // Built-in Edit group
    this.renderGroup('Edit', [
      { label: 'Undo', shortcut: '⌘Z', action: () => this.bus.emit('history:changed', { canUndo: false, canRedo: false }) },
      { label: 'Redo', shortcut: '⌘⇧Z', action: () => {} },
    ]);

    // Built-in Export group
    const exports = this.exportMgr.getAll();
    if (exports.length) {
      this.renderGroup('Export', exports.map((fmt) => ({
        label: fmt.label,
        action: () => this.exportMgr.export(fmt.id, this.getState()),
      })));
    }

    // Custom groups from MenuBarManager
    const grouped = this.menubarMgr.getGrouped();
    for (const [group, items] of Object.entries(grouped)) {
      this.renderGroup(group, items.map((item) => ({
        label: item.label,
        shortcut: item.shortcut,
        action: () => item.callback(this.getState()),
      })));
    }
  }

  private renderGroup(name: string, items: { label: string; shortcut?: string; action: () => void }[]): void {
    const wrap = document.createElement('div');
    wrap.className = 'pe-menu-group';

    const btn = document.createElement('button');
    btn.className = 'pe-menu-btn';
    btn.textContent = name;
    btn.onclick = (e) => {
      e.stopPropagation();
      const isOpen = this.openGroup === name;
      this.closeAll();
      if (!isOpen) {
        this.openGroup = name;
        dropdown.style.display = 'block';
      }
    };

    const dropdown = document.createElement('div');
    dropdown.className = 'pe-menu-dropdown';
    dropdown.style.display = 'none';

    for (const item of items) {
      const row = document.createElement('div');
      row.className = 'pe-menu-item';
      row.innerHTML = `<span>${item.label}</span>${item.shortcut ? `<span class="pe-menu-shortcut">${item.shortcut}</span>` : ''}`;
      row.onclick = () => {
        item.action();
        this.closeAll();
      };
      dropdown.appendChild(row);
    }

    wrap.appendChild(btn);
    wrap.appendChild(dropdown);
    this.el.appendChild(wrap);
  }

  private closeAll(): void {
    this.openGroup = null;
    this.el.querySelectorAll('.pe-menu-dropdown').forEach((d) => ((d as HTMLElement).style.display = 'none'));
  }

  private onDocClick = (): void => this.closeAll();

  refresh(): void {
    this.render();
  }

  destroy(): void {
    document.removeEventListener('click', this.onDocClick);
    this.el.remove();
  }
}

// ─── LeftPanel ────────────────────────────────────────────────────────────────

class LeftPanel {
  private el: HTMLElement;

  constructor(
    private readonly container: HTMLElement,
    private readonly templates: ElementTemplate[],
    private readonly formatRegistry: FormatRegistry,
    private readonly bus: EventBus<EditorEventMap>,
    private readonly getState: () => EditorState,
  ) {
    this.el = document.createElement('div');
    this.el.className = 'pe-panel pe-panel--left';
    container.appendChild(this.el);
    this.render();
  }

  private render(): void {
    this.el.innerHTML = `
      <div class="pe-panel-section">
        <div class="pe-panel-section-title">Elements</div>
        ${this.templates.map((t) => `
          <div class="pe-element-card" draggable="true" data-template-id="${t.id}">
            <span>${t.icon}</span>
            <span>${t.label}</span>
          </div>
        `).join('')}
      </div>
      <div class="pe-panel-section">
        <div class="pe-panel-section-title">Formats</div>
        ${this.formatRegistry.getAll().map((f) => `
          <div class="pe-format-card" data-format-id="${f.id}">
            <span>${f.icon}</span>
            <span>${f.label}</span>
          </div>
        `).join('')}
      </div>
    `;

    // Wire drag-start for element templates
    this.el.querySelectorAll('[data-template-id]').forEach((card) => {
      card.addEventListener('dragstart', (e) => {
        const id = (card as HTMLElement).dataset.templateId!;
        const template = this.templates.find((t) => t.id === id)!;
        (e as DragEvent).dataTransfer?.setData(
          'application/pixieditor-template',
          JSON.stringify(template),
        );
      });
    });

    // Wire format apply on drag to canvas (formats dragged directly)
    this.el.querySelectorAll('[data-format-id]').forEach((card) => {
      (card as HTMLElement).addEventListener('dragstart', (e) => {
        const id = (card as HTMLElement).dataset.formatId!;
        (e as DragEvent).dataTransfer?.setData('application/pixieditor-format', id);
      });
      (card as HTMLElement).draggable = true;
    });
  }

  setCollapsed(collapsed: boolean): void {
    this.el.style.display = collapsed ? 'none' : 'flex';
  }

  destroy(): void {
    this.el.remove();
  }
}

// ─── RightPanel ───────────────────────────────────────────────────────────────

class RightPanel {
  private el: HTMLElement;
  private activeTab: 'properties' | 'layers' = 'properties';
  private selectedIds: ElementId[] = [];

  constructor(
    private readonly container: HTMLElement,
    private readonly formatRegistry: FormatRegistry,
    private readonly bus: EventBus<EditorEventMap>,
    private readonly getState: () => EditorState,
    private readonly executeCommand: (cmd: import('../commands/ICommand').ICommand) => void,
  ) {
    this.el = document.createElement('div');
    this.el.className = 'pe-panel pe-panel--right';
    container.appendChild(this.el);

    bus.on('selection:changed', ({ selectedIds }) => {
      this.selectedIds = selectedIds;
      this.render();
    });

    this.render();
  }

  private render(): void {
    const state = this.getState();
    const selected = this.selectedIds.map((id) => state.elements[id]).filter(Boolean) as AnyElementModel[];
    const el = selected[0] ?? null;

    this.el.innerHTML = `
      <div class="pe-tabs">
        <div class="pe-tab ${this.activeTab === 'properties' ? 'pe-tab--active' : ''}" data-tab="properties">Properties</div>
        <div class="pe-tab ${this.activeTab === 'layers' ? 'pe-tab--active' : ''}" data-tab="layers">Layers</div>
      </div>
      <div class="pe-tab-content">
        ${this.activeTab === 'properties' ? this.renderProperties(el, state) : this.renderLayers(state)}
      </div>
    `;

    this.el.querySelectorAll('[data-tab]').forEach((t) => {
      t.addEventListener('click', () => {
        this.activeTab = (t as HTMLElement).dataset.tab as 'properties' | 'layers';
        this.render();
        this.bus.emit('panel:right-tab-changed', { tab: this.activeTab });
      });
    });

    this.wirePropInputs(el, state);
    this.wireLayerActions(state);
  }

  private renderProperties(el: AnyElementModel | null, state: EditorState): string {
    if (!el) return `<div style="padding:16px;color:var(--pe-text-2);font-size:12px;">No element selected</div>`;

    const formats = this.formatRegistry.getForType(el.type);
    const t = el.transform;

    return `
      <!-- Free toggle -->
      <div class="pe-free-toggle" data-action="toggle-free">
        <span>Free position</span>
        <div class="pe-toggle ${el.free ? 'pe-toggle--on' : ''}"></div>
      </div>

      <!-- Transform -->
      <div class="pe-transform-section">
        <div class="pe-panel-section-title">Transform</div>
        <div class="pe-transform-grid">
          ${['x','y','width','height'].map((k) => `
            <div class="pe-transform-field">
              <label>${k.toUpperCase()}</label>
              <input class="pe-prop-input" data-transform="${k}" value="${(t as any)[k]}">
            </div>
          `).join('')}
          <div class="pe-transform-field">
            <label>Rotation</label>
            <input class="pe-prop-input" data-transform="rotation" value="${t.rotation}">
          </div>
          <div class="pe-transform-field">
            <label>Z-Index</label>
            <input class="pe-prop-input" data-zindex value="${el.zIndex}" type="number">
          </div>
        </div>
      </div>

      <!-- Visibility & Lock -->
      <div style="display:flex;gap:8px;padding:10px 12px;border-bottom:1px solid var(--pe-border)">
        <button class="pe-icon-btn" data-action="toggle-visible" title="Toggle visibility">${el.visible ? '👁' : '🚫'}</button>
        <button class="pe-icon-btn" data-action="toggle-locked" title="Toggle lock">${el.locked ? '🔒' : '🔓'}</button>
        <button class="pe-icon-btn" data-action="delete" title="Delete" style="color:var(--pe-danger)">🗑</button>
      </div>

      <!-- Format sections -->
      ${formats.map((fmt) => this.renderFormatSection(fmt, el)).join('')}
    `;
  }

  private renderFormatSection(fmt: IFormatDefinition, el: AnyElementModel): string {
    return `
      <div class="pe-panel-section">
        <div class="pe-panel-section-title">${fmt.icon} ${fmt.label}</div>
        ${fmt.controls.map((ctrl) => `
          <div class="pe-prop-row">
            <span class="pe-prop-label">${ctrl.label}</span>
            ${this.renderControl(ctrl, el)}
          </div>
        `).join('')}
      </div>
    `;
  }

  private renderControl(ctrl: import('../models/types').FormatControl, el: AnyElementModel): string {
    const value = (el.formats as any)[ctrl.key] ?? '';
    switch (ctrl.type) {
      case 'color':
        return `<input type="color" class="pe-prop-color" data-format="${ctrl.key}" value="${typeof value === 'string' && value.startsWith('#') ? value : '#000000'}">`;
      case 'toggle':
        return `<div class="pe-toggle ${value ? 'pe-toggle--on' : ''}" data-format-toggle="${ctrl.key}"></div>`;
      case 'select':
        return `<select class="pe-prop-input" data-format="${ctrl.key}">${(ctrl.options ?? []).map((o) => `<option value="${String(o.value)}" ${String(o.value) === String(value) ? 'selected' : ''}>${o.label}</option>`).join('')}</select>`;
      case 'slider':
        return `<input type="range" data-format="${ctrl.key}" min="${ctrl.min ?? 0}" max="${ctrl.max ?? 1}" step="${ctrl.step ?? 0.01}" value="${typeof value === 'number' ? value : 1}" style="width:90px">`;
      default:
        return `<input class="pe-prop-input" data-format="${ctrl.key}" value="${typeof value === 'number' || typeof value === 'string' ? value : ''}">`;
    }
  }

  private renderLayers(state: EditorState): string {
    const renderLayer = (id: ElementId, depth = 0): string => {
      const el = state.elements[id];
      if (!el) return '';
      const isSelected = this.selectedIds.includes(id);
      const indent = depth * 16;
      const children = el.type === 'box' ? el.children.map((c) => renderLayer(c, depth + 1)).join('') : '';
      return `
        <div class="pe-layer-item ${isSelected ? 'pe-layer-item--selected' : ''}" data-layer-id="${id}" style="padding-left:${12 + indent}px">
          <span class="pe-layer-item__icon">${el.type === 'box' ? '📦' : el.type === 'image' ? '🖼' : '📝'}</span>
          <span class="pe-layer-item__name">${el.name}</span>
          <div class="pe-layer-item__actions">
            <button class="pe-icon-btn" data-layer-action="visibility" data-layer-id="${id}">${el.visible ? '👁' : '🚫'}</button>
            <button class="pe-icon-btn" data-layer-action="lock" data-layer-id="${id}">${el.locked ? '🔒' : '🔓'}</button>
            <button class="pe-icon-btn" data-layer-action="up" data-layer-id="${id}">↑</button>
            <button class="pe-icon-btn" data-layer-action="down" data-layer-id="${id}">↓</button>
          </div>
        </div>
        ${children}
      `;
    };

    const sorted = [...state.rootChildren].sort(
      (a, b) => (state.elements[b]?.zIndex ?? 0) - (state.elements[a]?.zIndex ?? 0),
    );

    return `<div>${sorted.map((id) => renderLayer(id)).join('')}</div>`;
  }

  private wirePropInputs(el: AnyElementModel | null, state: EditorState): void {
    if (!el) return;

    // Free toggle
    this.el.querySelector('[data-action="toggle-free"]')?.addEventListener('click', async () => {
      const { SetFreeCommand } = await import('../commands/commands');
      this.executeCommand(new SetFreeCommand(el.id, !el.free, null, state));
    });

    // Transform inputs
    this.el.querySelectorAll('[data-transform]').forEach((input) => {
      input.addEventListener('change', async (e) => {
        const key = (input as HTMLElement).dataset.transform!;
        const raw = (e.target as HTMLInputElement).value;
        const value = isNaN(Number(raw)) ? raw : Number(raw);
        const { SetPropertyCommand } = await import('../commands/commands');
        this.executeCommand(
          new SetPropertyCommand(el.id, 'transform' as any, { ...el.transform, [key]: value }, state),
        );
      });
    });

    // zIndex
    this.el.querySelector('[data-zindex]')?.addEventListener('change', async (e) => {
      const { SetPropertyCommand } = await import('../commands/commands');
      this.executeCommand(new SetPropertyCommand(el.id, 'zIndex' as any, Number((e.target as HTMLInputElement).value), state));
    });

    // Format inputs
    this.el.querySelectorAll('[data-format]').forEach((input) => {
      input.addEventListener('change', async (e) => {
        const key = (input as HTMLElement).dataset.format! as keyof import('../models/types').Formats;
        const value = (e.target as HTMLInputElement).value;
        const { SetFormatCommand } = await import('../commands/commands');
        this.executeCommand(new SetFormatCommand(el.id, { [key]: value }, state));
      });
    });

    // Action buttons
    this.el.querySelectorAll('[data-action]').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        const action = (btn as HTMLElement).dataset.action!;
        const { SetPropertyCommand, RemoveElementCommand } = await import('../commands/commands');
        if (action === 'toggle-visible') {
          this.executeCommand(new SetPropertyCommand(el.id, 'visible' as any, !el.visible, state));
        } else if (action === 'toggle-locked') {
          this.executeCommand(new SetPropertyCommand(el.id, 'locked' as any, !el.locked, state));
        } else if (action === 'delete') {
          this.executeCommand(new RemoveElementCommand(el.id, state));
          this.bus.emit('selection:changed', { selectedIds: [] });
        }
      });
    });
  }

  private wireLayerActions(state: EditorState): void {
    // Layer item click → select
    this.el.querySelectorAll('.pe-layer-item').forEach((item) => {
      item.addEventListener('click', () => {
        const id = (item as HTMLElement).dataset.layerId!;
        this.bus.emit('selection:changed', { selectedIds: [id] });
      });
    });

    // Layer action buttons
    this.el.querySelectorAll('[data-layer-action]').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const action = (btn as HTMLElement).dataset.layerAction!;
        const id = (btn as HTMLElement).dataset.layerId!;
        const el = state.elements[id];
        if (!el) return;
        const { SetPropertyCommand, ReorderCommand } = await import('../commands/commands');

        if (action === 'visibility') {
          this.executeCommand(new SetPropertyCommand(id, 'visible' as any, !el.visible, state));
        } else if (action === 'lock') {
          this.executeCommand(new SetPropertyCommand(id, 'locked' as any, !el.locked, state));
        } else if (action === 'up' || action === 'down') {
          const list = state.rootChildren;
          const idx = list.indexOf(id);
          const swapIdx = action === 'up' ? idx - 1 : idx + 1;
          if (swapIdx < 0 || swapIdx >= list.length) return;
          const newOrder = [...list];
          [newOrder[idx], newOrder[swapIdx]] = [newOrder[swapIdx], newOrder[idx]];
          this.executeCommand(new ReorderCommand(null, newOrder, list));
        }
      });
    });
  }

  setCollapsed(collapsed: boolean): void {
    this.el.style.display = collapsed ? 'none' : 'flex';
  }

  refresh(): void {
    this.render();
  }

  destroy(): void {
    this.el.remove();
  }
}

// ─── BubbleFormatBar ──────────────────────────────────────────────────────────

class BubbleFormatBar {
  private el: HTMLElement;

  constructor(
    private readonly container: HTMLElement,
    private readonly bus: EventBus<EditorEventMap>,
    private readonly getState: () => EditorState,
    private readonly executeCommand: (cmd: import('../commands/ICommand').ICommand) => void,
  ) {
    this.el = document.createElement('div');
    this.el.className = 'pe-bubble-bar';
    this.el.style.display = 'none';
    container.appendChild(this.el);

    bus.on('text:edit-start', ({ id }) => this.showForElement(id));
    bus.on('text:edit-end', () => this.hide());
    bus.on('selection:cleared', () => this.hide());
  }

  private showForElement(id: ElementId): void {
    const state = this.getState();
    const el = state.elements[id];
    if (!el || el.type !== 'text') return;

    this.el.innerHTML = `
      <button class="pe-bubble-btn ${el.formats.fontWeight === '700' ? 'pe-bubble-btn--active' : ''}" data-cmd="bold"><b>B</b></button>
      <button class="pe-bubble-btn ${el.formats.fontStyle === 'italic' ? 'pe-bubble-btn--active' : ''}" data-cmd="italic"><i>I</i></button>
      <button class="pe-bubble-btn ${el.formats.textDecoration === 'underline' ? 'pe-bubble-btn--active' : ''}" data-cmd="underline"><u>U</u></button>
      <div style="width:1px;height:20px;background:var(--pe-border)"></div>
      <button class="pe-bubble-btn" data-cmd="left">⬅</button>
      <button class="pe-bubble-btn" data-cmd="center">⬜</button>
      <button class="pe-bubble-btn" data-cmd="right">➡</button>
      <div style="width:1px;height:20px;background:var(--pe-border)"></div>
      <input type="color" class="pe-prop-color" data-cmd="color" value="${el.formats.color ?? '#000000'}" style="width:24px;height:24px">
    `;

    this.el.querySelectorAll('[data-cmd]').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        const cmd = (btn as HTMLElement).dataset.cmd!;
        const { SetFormatCommand } = await import('../commands/commands');
        const fmt: Partial<import('../models/types').Formats> = {};
        if (cmd === 'bold') fmt.fontWeight = el.formats.fontWeight === '700' ? '400' : '700';
        else if (cmd === 'italic') fmt.fontStyle = el.formats.fontStyle === 'italic' ? 'normal' : 'italic';
        else if (cmd === 'underline') fmt.textDecoration = el.formats.textDecoration === 'underline' ? 'none' : 'underline';
        else if (cmd === 'left') fmt.textAlign = 'left';
        else if (cmd === 'center') fmt.textAlign = 'center';
        else if (cmd === 'right') fmt.textAlign = 'right';
        else if (cmd === 'color') fmt.color = (btn as HTMLInputElement).value;
        if (Object.keys(fmt).length) this.executeCommand(new SetFormatCommand(id, fmt, state));
      });
    });

    this.el.style.display = 'flex';
    // Position near element
    const rect = state.elements[id];
    // Position at top of editor by default; can be refined later
    this.el.style.top = '60px';
    this.el.style.left = '50%';
    this.el.style.transform = 'translateX(-50%)';
  }

  private hide(): void {
    this.el.style.display = 'none';
  }

  destroy(): void {
    this.el.remove();
  }
}

// ─── PanelManager ─────────────────────────────────────────────────────────────

/**
 * Owns the MenuBar, LeftPanel, RightPanel, and BubbleFormatBar.
 * Consumes theme and provides collapse/expand.
 */
export class PanelManager {
  private menuBar: MenuBar;
  private leftPanel: LeftPanel;
  private rightPanel: RightPanel;
  private bubble: BubbleFormatBar;

  constructor(
    private readonly container: HTMLElement,
    private readonly formatRegistry: FormatRegistry,
    private readonly exportMgr: ExportManager,
    private readonly menubarMgr: MenuBarManager,
    private readonly bus: EventBus<EditorEventMap>,
    private readonly getState: () => EditorState,
    private readonly executeCommand: (cmd: import('../commands/ICommand').ICommand) => void,
    templates: ElementTemplate[],
  ) {
    injectGlobalStyles();
    injectTheme(getState().theme, container);

    this.menuBar = new MenuBar(container, menubarMgr, exportMgr, bus, getState);
    this.leftPanel = new LeftPanel(container, templates, formatRegistry, bus, getState);
    this.rightPanel = new RightPanel(container, formatRegistry, bus, getState, executeCommand);
    this.bubble = new BubbleFormatBar(container, bus, getState, executeCommand);

    bus.on('panel:left-toggle', ({ collapsed }) => this.leftPanel.setCollapsed(collapsed));
    bus.on('panel:right-toggle', ({ collapsed }) => this.rightPanel.setCollapsed(collapsed));

    bus.on('element:format-changed', () => this.rightPanel.refresh());
    bus.on('element:moved', () => this.rightPanel.refresh());
    bus.on('element:resized', () => this.rightPanel.refresh());
    bus.on('element:added', () => this.rightPanel.refresh());
    bus.on('element:removed', () => this.rightPanel.refresh());
  }

  updateTheme(theme: ThemeConfig): void {
    injectTheme(theme, this.container);
  }

  refreshMenuBar(): void {
    this.menuBar.refresh();
  }

  /** Returns the canvas area's left and right offsets based on panel visibility */
  getCanvasInsets(): { left: number; right: number; top: number } {
    return { left: 260, right: 260, top: 40 };
  }

  destroy(): void {
    this.menuBar.destroy();
    this.leftPanel.destroy();
    this.rightPanel.destroy();
    this.bubble.destroy();
  }
}
