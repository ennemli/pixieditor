import { Events } from '../core/EventBus.js';
import { ReorderCommand, RemoveElementCommand } from '../commands/Commands.js';

// ─────────────────────────────────────────────────────────────────────────────
// PanelManager — orchestrates all UI panels
// ─────────────────────────────────────────────────────────────────────────────

/**
 * PanelManager — Facade over all UI panels.
 *
 * Creates and mounts all DOM-based floating panels.
 * Panels are rendered as absolutely-positioned HTML over the canvas container.
 * Theme is applied via CSS variables on a root element.
 *
 * Satisfies SRP: each panel is a separate class; PanelManager only wires them.
 */
export class PanelManager {
  constructor({ bus, scene, history, selection, formatRegistry, config, interactionEngine }) {
    this._bus = bus;
    this._scene = scene;
    this._history = history;
    this._selection = selection;
    this._formats = formatRegistry;
    this._config = config;
    this._interaction = interactionEngine;

    this._root = null;
    this._menubar = null;
    this._leftPanel = null;
    this._rightPanel = null;
    this._bubbleMenu = null;
  }

  /**
   * Mount all panels into a container element.
   * @param {HTMLElement} container
   */
  mount(container) {
    this._root = container;
    this._applyTheme(container);

    this._menubar = new Menubar(this._bus, this._config, this._scene, this._history);
    this._leftPanel = new LeftPanel(this._bus, this._config, this._interaction);
    this._rightPanel = new RightPanel(
      this._bus, this._scene, this._history, this._selection,
      this._formats, this._config, this._interaction
    );
    this._bubbleMenu = new BubbleMenu(this._bus, this._interaction);

    container.appendChild(this._menubar.render());
    container.appendChild(this._leftPanel.render());
    container.appendChild(this._rightPanel.render());
    container.appendChild(this._bubbleMenu.render());

    this._bindBusEvents();
    this._leftPanel.mount();
    this._rightPanel.mount();
  }

  _applyTheme(el) {
    const isDark = this._config.ui.theme === 'dark';
    el.style.setProperty('--pe-bg', isDark ? '#1e1e2e' : '#ffffff');
    el.style.setProperty('--pe-bg-2', isDark ? '#2a2a3e' : '#f8f8f8');
    el.style.setProperty('--pe-border', isDark ? '#3a3a5c' : '#e2e2e2');
    el.style.setProperty('--pe-text', isDark ? '#e2e2e2' : '#1a1a1a');
    el.style.setProperty('--pe-text-muted', isDark ? '#9999bb' : '#666666');
    el.style.setProperty('--pe-accent', '#3b82f6');
    el.style.setProperty('--pe-accent-hover', '#2563eb');
    el.style.setProperty('--pe-radius', '6px');
    el.style.setProperty('--pe-font', this._config.ui.fontStack);
    el.style.setProperty('--pe-panel-w-left', `${this._config.ui.leftPanelWidth}px`);
    el.style.setProperty('--pe-panel-w-right', `${this._config.ui.rightPanelWidth}px`);
  }

  _bindBusEvents() {
    this._bus.on(Events.SELECTION_CHANGED, (data) => {
      this._rightPanel.onSelectionChanged(data);
    });
    this._bus.on(Events.ELEMENT_STYLE_CHANGED, () => {
      this._rightPanel.refresh();
    });
    this._bus.on(Events.SCENE_CHANGED, () => {
      this._rightPanel.refreshLayers();
    });
    this._bus.on(Events.ELEMENT_ADDED, () => this._rightPanel.refreshLayers());
    this._bus.on(Events.ELEMENT_REMOVED, () => this._rightPanel.refreshLayers());
    this._bus.on(Events.ELEMENT_REORDERED, () => this._rightPanel.refreshLayers());
    this._bus.on(Events.TEXT_SELECTION_CHANGED, (data) => {
      this._bubbleMenu.show(data);
    });
    this._bus.on(Events.TEXT_EDIT_END, () => {
      this._bubbleMenu.hide();
    });
    this._bus.on(Events.HISTORY_CHANGED, (data) => {
      this._menubar.updateHistoryState(data);
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Menubar
// ─────────────────────────────────────────────────────────────────────────────

const MENUBAR_CSS = `
.pe-menubar {
  position: absolute; top: 0; left: 0; right: 0;
  height: var(--pe-menubar-h, 44px);
  background: var(--pe-bg);
  border-bottom: 1px solid var(--pe-border);
  display: flex; align-items: center; gap: 4px; padding: 0 12px;
  z-index: 1000; font-family: var(--pe-font); font-size: 13px;
  color: var(--pe-text); user-select: none;
}
.pe-menubar .pe-title {
  font-weight: 600; margin-right: 12px; color: var(--pe-accent);
  letter-spacing: -0.02em;
}
.pe-menubar button {
  background: transparent; border: none; color: var(--pe-text-muted);
  cursor: pointer; padding: 4px 8px; border-radius: var(--pe-radius);
  font-size: 13px; font-family: var(--pe-font);
  transition: background 0.15s, color 0.15s;
}
.pe-menubar button:hover { background: var(--pe-bg-2); color: var(--pe-text); }
.pe-menubar button:disabled { opacity: 0.35; cursor: not-allowed; }
.pe-menubar .pe-separator { width: 1px; height: 20px; background: var(--pe-border); margin: 0 4px; }
.pe-menu-group { position: relative; }
.pe-dropdown {
  display: none; position: absolute; top: 100%; left: 0; min-width: 160px;
  background: var(--pe-bg); border: 1px solid var(--pe-border);
  border-radius: var(--pe-radius); box-shadow: 0 8px 24px rgba(0,0,0,0.3);
  z-index: 2000; overflow: hidden;
}
.pe-menu-group:hover .pe-dropdown, .pe-dropdown.open { display: block; }
.pe-dropdown button {
  display: block; width: 100%; text-align: left;
  padding: 8px 12px; border-radius: 0; color: var(--pe-text);
}
`;

export class Menubar {
  constructor(bus, config, scene, history) {
    this._bus = bus;
    this._config = config;
    this._scene = scene;
    this._history = history;
    this._el = null;
    this._undoBtn = null;
    this._redoBtn = null;
  }

  render() {
    injectStyles('pe-menubar-styles', MENUBAR_CSS);
    const el = document.createElement('div');
    el.className = 'pe-menubar';

    el.innerHTML = `<span class="pe-title">✏ Editor</span>`;

    // Undo / Redo
    this._undoBtn = this._btn('↩ Undo', () => this._bus.emit('editor:undo'), true);
    this._redoBtn = this._btn('↪ Redo', () => this._bus.emit('editor:redo'), true);
    el.appendChild(this._undoBtn);
    el.appendChild(this._redoBtn);
    el.appendChild(this._sep());

    // Snap toggle
    const snapBtn = this._btn('⊞ Snap: ON', () => {
      this._bus.emit(Events.SNAP_TOGGLED);
    });
    this._bus.on(Events.SNAP_TOGGLED, ({ enabled }) => {
      snapBtn.textContent = `⊞ Snap: ${enabled ? 'ON' : 'OFF'}`;
    });
    el.appendChild(snapBtn);
    el.appendChild(this._sep());

    // Export menu
    if (this._config.menubar.exportFormats.length > 0) {
      el.appendChild(this._exportMenu());
      el.appendChild(this._sep());
    }

    // Custom menu groups
    const customGroups = groupBy(this._config.menubar.items, 'group');
    for (const [groupName, items] of Object.entries(customGroups)) {
      el.appendChild(this._customGroup(groupName, items));
    }

    this._el = el;
    return el;
  }

  updateHistoryState({ canUndo, canRedo }) {
    if (this._undoBtn) this._undoBtn.disabled = !canUndo;
    if (this._redoBtn) this._redoBtn.disabled = !canRedo;
  }

  _exportMenu() {
    const group = document.createElement('div');
    group.className = 'pe-menu-group';
    const trigger = this._btn('⬇ Export ▾');
    const dropdown = document.createElement('div');
    dropdown.className = 'pe-dropdown';

    // JSON export always available
    const jsonBtn = this._btn('Export JSON');
    jsonBtn.onclick = () => {
      const json = this._scene.toJSON();
      this._bus.emit(Events.MENU_EXPORT, { formatName: 'JSON', data: json });
    };
    dropdown.appendChild(jsonBtn);

    this._config.menubar.exportFormats.forEach((fmt) => {
      const btn = this._btn(fmt.name);
      btn.onclick = () => {
        const json = this._scene.toJSON();
        fmt.handler(json);
        this._bus.emit(Events.MENU_EXPORT, { formatName: fmt.name });
      };
      dropdown.appendChild(btn);
    });

    group.appendChild(trigger);
    group.appendChild(dropdown);
    return group;
  }

  _customGroup(name, items) {
    const group = document.createElement('div');
    group.className = 'pe-menu-group';
    const trigger = this._btn(`${name} ▾`);
    const dropdown = document.createElement('div');
    dropdown.className = 'pe-dropdown';

    items.forEach((item) => {
      const btn = this._btn(item.name);
      btn.onclick = () => {
        item.callback(this._scene.toJSON());
        this._bus.emit(Events.MENU_CUSTOM_ACTION, { name: item.name, group: item.group });
      };
      dropdown.appendChild(btn);
    });

    group.appendChild(trigger);
    group.appendChild(dropdown);
    return group;
  }

  _btn(label, onClick, disabled = false) {
    const btn = document.createElement('button');
    btn.textContent = label;
    if (onClick) btn.onclick = onClick;
    btn.disabled = disabled;
    return btn;
  }

  _sep() {
    const s = document.createElement('div');
    s.className = 'pe-separator';
    return s;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// LeftPanel — Elements + Formats palette
// ─────────────────────────────────────────────────────────────────────────────

const LEFT_PANEL_CSS = `
.pe-left-panel {
  position: absolute; top: var(--pe-menubar-h, 44px); left: 0; bottom: 0;
  width: var(--pe-panel-w-left);
  background: var(--pe-bg); border-right: 1px solid var(--pe-border);
  display: flex; flex-direction: column; z-index: 100;
  font-family: var(--pe-font); font-size: 13px; color: var(--pe-text);
  overflow: hidden;
}
.pe-left-panel .pe-panel-header {
  padding: 12px 14px 8px; font-weight: 600; font-size: 11px;
  letter-spacing: 0.05em; text-transform: uppercase; color: var(--pe-text-muted);
}
.pe-left-panel .pe-elements-grid {
  display: grid; grid-template-columns: 1fr 1fr; gap: 8px; padding: 0 12px 12px;
}
.pe-drag-item {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 6px; padding: 14px 8px;
  background: var(--pe-bg-2); border: 1px solid var(--pe-border);
  border-radius: var(--pe-radius); cursor: grab;
  font-size: 12px; font-weight: 500; transition: all 0.15s;
  user-select: none;
}
.pe-drag-item:hover {
  border-color: var(--pe-accent); color: var(--pe-accent);
  transform: translateY(-1px); box-shadow: 0 4px 12px rgba(59,130,246,0.15);
}
.pe-drag-item:active { cursor: grabbing; transform: scale(0.97); }
.pe-drag-item .pe-icon { font-size: 22px; }
`;

export class LeftPanel {
  constructor(bus, config, interactionEngine) {
    this._bus = bus;
    this._config = config;
    this._interaction = interactionEngine;
    this._el = null;
  }

  render() {
    injectStyles('pe-left-panel-styles', LEFT_PANEL_CSS);
    const el = document.createElement('div');
    el.className = 'pe-left-panel';

    el.innerHTML = `<div class="pe-panel-header">Elements</div>`;
    const grid = document.createElement('div');
    grid.className = 'pe-elements-grid';

    [
      { type: 'box',   icon: '▭', label: 'Box' },
      { type: 'text',  icon: 'T', label: 'Text' },
      { type: 'image', icon: '🖼', label: 'Image' },
    ].forEach(({ type, icon, label }) => {
      const item = document.createElement('div');
      item.className = 'pe-drag-item';
      item.draggable = true;
      item.innerHTML = `<span class="pe-icon">${icon}</span><span>${label}</span>`;

      item.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('application/pe-element', JSON.stringify({ type }));
        e.dataTransfer.effectAllowed = 'copy';
      });

      grid.appendChild(item);
    });

    el.appendChild(grid);
    this._el = el;
    return el;
  }

  mount() {
    // Bind canvas drop zone (handled in EditorEngine)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// RightPanel — Properties + Layers tabs
// ─────────────────────────────────────────────────────────────────────────────

const RIGHT_PANEL_CSS = `
.pe-right-panel {
  position: absolute; top: var(--pe-menubar-h, 44px); right: 0; bottom: 0;
  width: var(--pe-panel-w-right);
  background: var(--pe-bg); border-left: 1px solid var(--pe-border);
  display: flex; flex-direction: column; z-index: 100;
  font-family: var(--pe-font); font-size: 13px; color: var(--pe-text);
  overflow: hidden;
}
.pe-tab-bar {
  display: flex; border-bottom: 1px solid var(--pe-border); flex-shrink: 0;
}
.pe-tab {
  flex: 1; padding: 10px 0; background: none; border: none;
  font-family: var(--pe-font); font-size: 12px; font-weight: 600;
  letter-spacing: 0.03em; color: var(--pe-text-muted); cursor: pointer;
  border-bottom: 2px solid transparent; transition: all 0.15s;
}
.pe-tab.active {
  color: var(--pe-accent); border-bottom-color: var(--pe-accent);
}
.pe-panel-body { flex: 1; overflow-y: auto; padding: 12px; }
.pe-section { margin-bottom: 16px; }
.pe-section-title {
  font-size: 11px; font-weight: 600; text-transform: uppercase;
  letter-spacing: 0.05em; color: var(--pe-text-muted);
  margin-bottom: 8px; padding-bottom: 4px;
  border-bottom: 1px solid var(--pe-border);
}
.pe-field { margin-bottom: 10px; }
.pe-field label {
  display: block; font-size: 11px; color: var(--pe-text-muted); margin-bottom: 4px;
}
.pe-field input, .pe-field select {
  width: 100%; padding: 5px 8px; border-radius: var(--pe-radius);
  border: 1px solid var(--pe-border); background: var(--pe-bg-2);
  color: var(--pe-text); font-size: 12px; font-family: var(--pe-font);
  box-sizing: border-box; outline: none;
}
.pe-field input:focus, .pe-field select:focus { border-color: var(--pe-accent); }
.pe-color-swatch {
  width: 100%; height: 28px; border-radius: var(--pe-radius);
  border: 1px solid var(--pe-border); cursor: pointer;
}
.pe-toggle {
  display: flex; align-items: center; gap: 8px; cursor: pointer;
  padding: 6px 0;
}
.pe-toggle input[type=checkbox] { accent-color: var(--pe-accent); }
/* Layers panel */
.pe-layer-item {
  display: flex; align-items: center; gap: 8px; padding: 6px 8px;
  border-radius: var(--pe-radius); cursor: pointer;
  border: 1px solid transparent; transition: all 0.1s;
}
.pe-layer-item:hover { background: var(--pe-bg-2); }
.pe-layer-item.selected {
  background: rgba(59,130,246,0.12); border-color: rgba(59,130,246,0.3);
}
.pe-layer-item .pe-layer-type {
  font-size: 10px; opacity: 0.5; flex-shrink: 0;
}
.pe-layer-item .pe-layer-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pe-layer-actions { display: flex; gap: 2px; flex-shrink: 0; }
.pe-layer-actions button {
  background: none; border: none; cursor: pointer; padding: 2px 4px;
  font-size: 12px; opacity: 0.5; border-radius: 3px;
}
.pe-layer-actions button:hover { opacity: 1; background: var(--pe-bg-2); }
.pe-empty-state {
  color: var(--pe-text-muted); text-align: center; padding: 32px 16px;
  font-size: 12px; line-height: 1.6;
}
`;

export class RightPanel {
  constructor(bus, scene, history, selection, formatRegistry, config, interaction) {
    this._bus = bus;
    this._scene = scene;
    this._history = history;
    this._selection = selection;
    this._formats = formatRegistry;
    this._config = config;
    this._interaction = interaction;

    this._el = null;
    this._activeTab = 'properties';
    this._body = null;
  }

  render() {
    injectStyles('pe-right-panel-styles', RIGHT_PANEL_CSS);
    const el = document.createElement('div');
    el.className = 'pe-right-panel';

    // Tab bar
    const tabBar = document.createElement('div');
    tabBar.className = 'pe-tab-bar';
    ['Properties', 'Layers'].forEach((tab) => {
      const btn = document.createElement('button');
      btn.className = `pe-tab ${this._activeTab === tab.toLowerCase() ? 'active' : ''}`;
      btn.textContent = tab;
      btn.onclick = () => {
        this._activeTab = tab.toLowerCase();
        tabBar.querySelectorAll('.pe-tab').forEach((t) => t.classList.remove('active'));
        btn.classList.add('active');
        this._renderBody();
      };
      tabBar.appendChild(btn);
    });

    this._body = document.createElement('div');
    this._body.className = 'pe-panel-body';

    el.appendChild(tabBar);
    el.appendChild(this._body);
    this._el = el;
    return el;
  }

  mount() {
    this._renderBody();
  }

  onSelectionChanged(data) {
    if (this._activeTab === 'properties') this._renderBody();
  }

  refresh() {
    if (this._activeTab === 'properties') this._renderBody();
  }

  refreshLayers() {
    if (this._activeTab === 'layers') this._renderBody();
  }

  _renderBody() {
    if (!this._body) return;
    this._body.innerHTML = '';
    if (this._activeTab === 'properties') this._renderProperties();
    else this._renderLayers();
  }

  // ─── Properties ──────────────────────────────────────────────────────────

  _renderProperties() {
    const id = this._selection.primary;
    if (!id) {
      this._body.innerHTML = `<div class="pe-empty-state">Select an element to edit its properties</div>`;
      return;
    }

    const el = this._scene.getElementById(id);
    if (!el) return;

    // Position & Size section
    this._body.appendChild(this._positionSection(el));

    // Free toggle
    this._body.appendChild(this._freeToggle(el));

    // Format sections grouped by category
    const groups = this._formats.getGroupedForElement(el.type);
    groups.forEach((formats, group) => {
      const section = this._section(group);
      formats.forEach((format) => {
        section.querySelector('.pe-section-body').appendChild(
          this._formatField(format, el)
        );
      });
      this._body.appendChild(section);
    });
  }

  _positionSection(el) {
    const section = document.createElement('div');
    section.className = 'pe-section';
    section.innerHTML = `<div class="pe-section-title">Transform</div>`;
    const body = document.createElement('div');
    body.className = 'pe-section-body';

    const makeField = (label, prop, isSize = false) => {
      const field = document.createElement('div');
      field.className = 'pe-field';
      const input = document.createElement('input');
      input.type = 'text';
      const val = el[prop];
      input.value = typeof val === 'number' ? Math.round(val) : val;

      input.onchange = () => {
        const v = isNaN(parseFloat(input.value)) ? input.value : parseFloat(input.value);
        const prev = el[prop];
        el[prop] = v;
        if (prop === 'x' || prop === 'y') {
          const { MoveCommand } = _Commands;
          this._history.execute(
            new MoveCommand(this._scene, this._bus, el.id,
              { x: el.x, y: el.y }, prop === 'x' ? { x: prev, y: el.y } : { x: el.x, y: prev }
            )
          );
        }
        this._bus.emit(Events.RENDER_REQUESTED);
      };

      field.innerHTML = `<label>${label}</label>`;
      field.appendChild(input);
      return field;
    };

    const grid = document.createElement('div');
    grid.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:6px';
    grid.appendChild(makeField('X', 'x'));
    grid.appendChild(makeField('Y', 'y'));
    grid.appendChild(makeField('W', 'width', true));
    grid.appendChild(makeField('H', 'height', true));
    body.appendChild(grid);

    const nameField = document.createElement('div');
    nameField.className = 'pe-field';
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.value = el.name;
    nameInput.onchange = () => { el.name = nameInput.value; this._bus.emit(Events.SCENE_CHANGED); };
    nameField.innerHTML = `<label>Name</label>`;
    nameField.appendChild(nameInput);
    body.appendChild(nameField);

    section.appendChild(body);
    return section;
  }

  _freeToggle(el) {
    const div = document.createElement('div');
    div.className = 'pe-section';
    const toggle = document.createElement('label');
    toggle.className = 'pe-toggle';
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = el.free;
    cb.onchange = () => {
      this._interaction.toggleFree(el.id, cb.checked);
    };
    toggle.appendChild(cb);
    toggle.appendChild(document.createTextNode(' Free (absolute positioning)'));
    div.appendChild(toggle);
    return div;
  }

  _section(title) {
    const el = document.createElement('div');
    el.className = 'pe-section';
    el.innerHTML = `<div class="pe-section-title">${title}</div>`;
    const body = document.createElement('div');
    body.className = 'pe-section-body';
    el.appendChild(body);
    return el;
  }

  _formatField(format, el) {
    const container = document.createElement('div');
    container.className = 'pe-field';
    container.innerHTML = `<label>${format.name}</label>`;
    const currentValue = format.read(el.style);

    const apply = (val) => format.apply({
      scene: this._scene, bus: this._bus,
      history: this._history, elementId: el.id, value: val,
    });

    switch (format.component) {
      case 'color-picker': {
        const input = document.createElement('input');
        input.type = 'color';
        input.value = currentValue ?? '#000000';
        input.style.cssText = 'width:100%;height:28px;border:none;background:none;cursor:pointer;padding:0;border-radius:var(--pe-radius)';
        input.onchange = () => apply(input.value);
        container.appendChild(input);
        break;
      }
      case 'toggle': {
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.checked = Boolean(currentValue);
        cb.onchange = () => apply(cb.checked);
        container.querySelector('label').appendChild(cb);
        break;
      }
      case 'slider': {
        const input = document.createElement('input');
        input.type = 'range';
        input.min = format.min ?? 0;
        input.max = format.max ?? 1;
        input.step = format.step ?? 0.01;
        input.value = currentValue ?? 0;
        input.style.cssText = 'width:100%';
        const display = document.createElement('span');
        display.style.cssText = 'font-size:11px;color:var(--pe-text-muted);margin-left:6px';
        display.textContent = parseFloat(currentValue).toFixed(2);
        input.oninput = () => {
          display.textContent = parseFloat(input.value).toFixed(2);
          apply(parseFloat(input.value));
        };
        const row = document.createElement('div');
        row.style.cssText = 'display:flex;align-items:center;gap:4px';
        row.appendChild(input); row.appendChild(display);
        container.appendChild(row);
        break;
      }
      case 'select': {
        const sel = document.createElement('select');
        (format.options ?? []).forEach((opt) => {
          const o = document.createElement('option');
          o.value = opt; o.textContent = opt;
          if (opt === currentValue) o.selected = true;
          sel.appendChild(o);
        });
        sel.onchange = () => apply(sel.value);
        container.appendChild(sel);
        break;
      }
      default: {
        const input = document.createElement('input');
        input.type = 'text';
        input.value = typeof currentValue === 'object' ? JSON.stringify(currentValue) : (currentValue ?? '');
        input.onchange = () => {
          try { apply(JSON.parse(input.value)); } catch { apply(input.value); }
        };
        container.appendChild(input);
      }
    }

    return container;
  }

  // ─── Layers ───────────────────────────────────────────────────────────────

  _renderLayers() {
    const allEls = this._scene.getAllElements()
      .sort((a, b) => b.zIndex - a.zIndex); // highest z on top in list

    if (allEls.length === 0) {
      this._body.innerHTML = `<div class="pe-empty-state">No elements yet.<br>Drag elements from the left panel.</div>`;
      return;
    }

    allEls.forEach((el) => {
      const item = document.createElement('div');
      item.className = `pe-layer-item ${this._selection.has(el.id) ? 'selected' : ''}`;

      const typeIcons = { box: '▭', text: 'T', image: '🖼' };
      item.innerHTML = `
        <span class="pe-layer-type">${typeIcons[el.type] ?? '?'}</span>
        <span class="pe-layer-name">${el.name}</span>
        <div class="pe-layer-actions">
          <button title="Move up" data-action="up">↑</button>
          <button title="Move down" data-action="down">↓</button>
          <button title="Toggle visibility" data-action="vis">${el.visible ? '👁' : '🚫'}</button>
          <button title="Delete" data-action="del">🗑</button>
        </div>
      `;

      item.addEventListener('click', (e) => {
        if (e.target.closest('[data-action]')) return;
        this._selection.select(el.id);
      });

      item.addEventListener('click', (e) => {
        const action = e.target.closest('[data-action]')?.dataset.action;
        if (!action) return;
        if (action === 'up') this._history.execute(new ReorderCommand(this._scene, this._bus, el.id, 'up'));
        if (action === 'down') this._history.execute(new ReorderCommand(this._scene, this._bus, el.id, 'down'));
        if (action === 'vis') { el.visible = !el.visible; this._bus.emit(Events.RENDER_REQUESTED); this._renderBody(); }
        if (action === 'del') {
          this._history.execute(new RemoveElementCommand(this._scene, this._bus, el.id));
          this._selection.remove(el.id);
        }
      });

      this._body.appendChild(item);
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// BubbleMenu — text formatting popup on text selection
// ─────────────────────────────────────────────────────────────────────────────

const BUBBLE_CSS = `
.pe-bubble-menu {
  position: fixed; z-index: 9999; display: none;
  background: var(--pe-bg); border: 1px solid var(--pe-border);
  border-radius: var(--pe-radius); padding: 4px 6px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.35);
  font-family: var(--pe-font); font-size: 12px;
  display: none; gap: 2px; align-items: center; flex-wrap: wrap;
}
.pe-bubble-menu.visible { display: flex; }
.pe-bubble-btn {
  background: none; border: none; color: var(--pe-text);
  padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 13px;
}
.pe-bubble-btn:hover { background: var(--pe-bg-2); }
.pe-bubble-sep { width: 1px; height: 18px; background: var(--pe-border); margin: 0 2px; }
`;

export class BubbleMenu {
  constructor(bus, interaction) {
    this._bus = bus;
    this._interaction = interaction;
    this._el = null;
  }

  render() {
    injectStyles('pe-bubble-styles', BUBBLE_CSS);
    const el = document.createElement('div');
    el.className = 'pe-bubble-menu';

    const buttons = [
      { label: '<b>B</b>', cmd: 'bold' },
      { label: '<i>I</i>', cmd: 'italic' },
      { label: '<u>U</u>', cmd: 'underline' },
      { label: '—', type: 'sep' },
      { label: '≡L', cmd: 'justifyLeft' },
      { label: '≡C', cmd: 'justifyCenter' },
      { label: '≡R', cmd: 'justifyRight' },
      { label: '—', type: 'sep' },
      { label: '🎨', cmd: 'color' },
    ];

    buttons.forEach((b) => {
      if (b.type === 'sep') {
        const sep = document.createElement('div');
        sep.className = 'pe-bubble-sep';
        el.appendChild(sep);
        return;
      }
      const btn = document.createElement('button');
      btn.className = 'pe-bubble-btn';
      btn.innerHTML = b.label;

      btn.onclick = (e) => {
        e.preventDefault();
        if (b.cmd === 'color') {
          const color = prompt('Color (hex):');
          if (color) this._interaction.textEditManager.applyInlineFormat('foreColor', color);
        } else {
          this._interaction.textEditManager.applyInlineFormat(b.cmd);
        }
      };
      el.appendChild(btn);
    });

    this._el = el;
    return el;
  }

  show({ overlay }) {
    if (!this._el || !overlay) return;
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) { this.hide(); return; }

    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    if (rect.width === 0) { this.hide(); return; }

    this._el.classList.add('visible');
    this._el.style.left = `${rect.left + rect.width / 2 - 80}px`;
    this._el.style.top = `${rect.top - 44}px`;
  }

  hide() {
    this._el?.classList.remove('visible');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────────────────────

function injectStyles(id, css) {
  if (document.getElementById(id)) return;
  const style = document.createElement('style');
  style.id = id;
  style.textContent = css;
  document.head.appendChild(style);
}

function groupBy(arr, key) {
  return arr.reduce((acc, item) => {
    const k = item[key] ?? 'Other';
    if (!acc[k]) acc[k] = [];
    acc[k].push(item);
    return acc;
  }, {});
}

const _Commands = {};
import('../commands/Commands.js').then((m) => Object.assign(_Commands, m));
