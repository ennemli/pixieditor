import { nanoid } from 'nanoid';
import type { EditorConfig } from './EditorConfig';
import { DEFAULT_CANVAS, DEFAULT_SNAP } from './EditorConfig';
import { EventBus } from '../events/EventBus';
import type { EditorEventMap } from '../events/EditorEvents';
import { CommandHistory } from '../commands/ICommand';
import type { ICommand } from '../commands/ICommand';
import {
  AddElementCommand,
  RemoveElementCommand,
  SetFormatCommand,
  SetPropertyCommand,
  SetFreeCommand,
  BatchCommand,
} from '../commands/commands';
import { PixiRenderer } from '../renderer/PixiRenderer';
import type { IRenderer } from '../renderer/PixiRenderer';
import { InteractionEngine } from '../interaction/InteractionEngine';
import type { InteractionContext } from '../interaction/InteractionEngine';
import { SnapEngine } from '../snap/SnapEngine';
import { FormatRegistry, registerBuiltinFormats } from '../formats/FormatRegistry';
import { ExportManager, MenuBarManager } from '../export/ExportManager';
import { PanelManager } from '../panels/PanelManager';
import { sizingResolver } from '../sizing/SizingResolver';
import type {
  AnyElementModel,
  BoxElementModel,
  CanvasConfig,
  EditorState,
  ElementId,
  ElementTemplate,
  Formats,
  ImageElementModel,
  ResolvedRect,
  SnapConfig,
  TextElementModel,
  ThemeConfig,
} from '../models/types';
import { DEFAULT_THEME } from '../models/types';

// ─── Default Element Templates ────────────────────────────────────────────────

const DEFAULT_TEMPLATES: ElementTemplate[] = [
  {
    id: 'tpl-box',
    label: 'Box',
    icon: '📦',
    type: 'box',
    defaultModel: {
      transform: { x: 0, y: 0, width: 200, height: 150, rotation: 0, scaleX: 1, scaleY: 1 },
      formats: { backgroundColor: '#e2e8f0' },
    },
  },
  {
    id: 'tpl-text',
    label: 'Text',
    icon: '📝',
    type: 'text',
    defaultModel: {
      transform: { x: 0, y: 0, width: 200, height: 50, rotation: 0, scaleX: 1, scaleY: 1 },
      formats: { fontSize: 16, color: '#000000' },
    },
  },
  {
    id: 'tpl-image',
    label: 'Image',
    icon: '🖼️',
    type: 'image',
    defaultModel: {
      transform: { x: 0, y: 0, width: 200, height: 200, rotation: 0, scaleX: 1, scaleY: 1 },
      formats: {},
    },
  },
];

// ─── Editor ───────────────────────────────────────────────────────────────────

/**
 * The central Mediator.
 *
 * Owns EditorState and coordinates:
 *   Renderer ← InteractionEngine → SnapEngine
 *                ↓ Commands ↓
 *          CommandHistory → EventBus → Panels
 */
export class Editor {
  // Subsystems
  readonly bus: EventBus<EditorEventMap>;
  private history: CommandHistory;
  private renderer: IRenderer;
  private snap: SnapEngine;
  private formatRegistry: FormatRegistry;
  private exportManager: ExportManager;
  private menubarManager: MenuBarManager;
  private panelManager!: PanelManager;
  private interactionEngine!: InteractionEngine;

  // State
  private state: EditorState;

  // DOM
  private readonly wrapper: HTMLDivElement;
  private readonly canvasWrapper: HTMLDivElement;

  constructor(private readonly config: EditorConfig) {
    this.bus = new EventBus<EditorEventMap>();
    this.history = new CommandHistory();
    this.renderer = new PixiRenderer();
    this.snap = new SnapEngine();
    this.formatRegistry = new FormatRegistry();
    this.exportManager = new ExportManager();
    this.menubarManager = new MenuBarManager();

    registerBuiltinFormats(this.formatRegistry);
    config.customFormats?.forEach((f) => this.formatRegistry.register(f));
    config.exportFormats?.forEach((f) => this.exportManager.register(f));
    config.menuBarItems?.forEach((m) => this.menubarManager.register(m));

    // Build initial state
    this.state = this.buildInitialState();

    // Build DOM structure
    this.wrapper = document.createElement('div');
    this.wrapper.style.cssText = `
      position: relative; width: 100%; height: 100%;
      overflow: hidden; background: #0d0d1a;
    `;
    config.container.appendChild(this.wrapper);

    this.canvasWrapper = document.createElement('div');
    this.canvasWrapper.style.cssText = `
      position: absolute; top: 40px; left: 260px; right: 260px; bottom: 0;
    `;
    this.wrapper.appendChild(this.canvasWrapper);
  }

  // ── Async Init ────────────────────────────────────────────────────────────

  async init(): Promise<void> {
    // Init renderer
    await this.renderer.init(this.canvasWrapper);

    // Build panels
    this.panelManager = new PanelManager(
      this.wrapper,
      this.formatRegistry,
      this.exportManager,
      this.menubarManager,
      this.bus,
      () => this.state,
      (cmd) => this.execute(cmd),
      [...DEFAULT_TEMPLATES, ...(this.config.templates ?? [])],
    );

    // Build interaction engine with context
    const ctx: InteractionContext = {
      getState: () => this.state,
      renderer: this.renderer,
      bus: this.bus,
      snapEngine: this.snap,
      executeCommand: (cmd) => this.execute(cmd),
      setActiveHandler: () => {},
      getOtherRects: (excludeId) => this.getOtherRects(excludeId),
    };

    this.interactionEngine = new InteractionEngine(
      this.canvasWrapper,
      ctx,
      this.wrapper,
    );

    // Wire events
    this.wireEvents();

    // Initial render
    this.renderer.render(this.state);

    // Keyboard shortcuts
    document.addEventListener('keydown', this.onKeyDown);
  }

  // ── Command Execution ────────────────────────────────────────────────────

  execute(command: ICommand): void {
    const nextState = command.execute(this.state);
    this.history.push(command);
    this.applyState(nextState);
    this.bus.emit('history:changed', {
      canUndo: this.history.canUndo,
      canRedo: this.history.canRedo,
    });
  }

  undo(): void {
    const result = this.history.undo(this.state);
    if (!result) return;
    this.applyState(result.state);
    this.bus.emit('history:changed', {
      canUndo: this.history.canUndo,
      canRedo: this.history.canRedo,
    });
  }

  redo(): void {
    const result = this.history.redo(this.state);
    if (!result) return;
    this.applyState(result.state);
    this.bus.emit('history:changed', {
      canUndo: this.history.canUndo,
      canRedo: this.history.canRedo,
    });
  }

  // ── Public Element API ────────────────────────────────────────────────────

  addElement(model: Partial<AnyElementModel> & { type: AnyElementModel['type'] }): ElementId {
    const element = this.buildElement(model);
    this.execute(new AddElementCommand(element));
    return element.id;
  }

  removeElement(id: ElementId): void {
    this.execute(new RemoveElementCommand(id, this.state));
  }

  setFormat(id: ElementId, formats: Partial<Formats>): void {
    this.execute(new SetFormatCommand(id, formats, this.state));
  }

  setFree(id: ElementId, free: boolean): void {
    const el = this.state.elements[id];
    if (!el) return;
    const rect = sizingResolver.resolveRect(el.transform, this.state.canvas.width, this.state.canvas.height);
    this.execute(new SetFreeCommand(id, free, free ? { x: rect.x, y: rect.y } : null, this.state));
  }

  select(ids: ElementId[]): void {
    this.state = { ...this.state, selectedIds: ids };
    this.bus.emit('selection:changed', { selectedIds: ids });
    this.renderer.showSelectionHandles(ids, this.state);
  }

  // ── Public Canvas API ─────────────────────────────────────────────────────

  setZoom(zoom: number): void {
    this.state = { ...this.state, canvas: { ...this.state.canvas, zoom } };
    this.renderer.setZoom(zoom);
    this.bus.emit('canvas:zoom-changed', { zoom });
  }

  setPan(panX: number, panY: number): void {
    this.state = { ...this.state, canvas: { ...this.state.canvas, panX, panY } };
    this.renderer.setPan(panX, panY);
    this.bus.emit('canvas:pan-changed', { panX, panY });
  }

  setSnapConfig(patch: Partial<SnapConfig>): void {
    this.state = { ...this.state, snap: { ...this.state.snap, ...patch } };
    this.bus.emit('snap:config-changed', { enabled: this.state.snap.enabled });
    this.renderer.render(this.state);
  }

  // ── State I/O ─────────────────────────────────────────────────────────────

  getState(): Readonly<EditorState> {
    return this.state;
  }

  loadState(state: EditorState): void {
    this.history.clear();
    this.applyState(state);
  }

  registerExportFormat(format: import('../models/types').IExportFormat): void {
    this.exportManager.register(format);
    this.panelManager.refreshMenuBar();
  }

  registerMenuBarItem(item: import('../models/types').IMenuBarItem): void {
    this.menubarManager.register(item);
    this.panelManager.refreshMenuBar();
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  destroy(): void {
    document.removeEventListener('keydown', this.onKeyDown);
    this.interactionEngine.destroy();
    this.panelManager.destroy();
    this.renderer.destroy();
    this.bus.clear();
    this.wrapper.remove();
  }

  // ── Private ───────────────────────────────────────────────────────────────

  private applyState(next: EditorState): void {
    const changed = this.diffChangedIds(this.state, next);
    this.state = next;
    this.renderer.render(this.state);
    this.renderer.showSelectionHandles(this.state.selectedIds, this.state);
    this.bus.emit('state:changed', { state: this.state, changedIds: changed });
    this.config.onChange?.(this.state);
  }

  private diffChangedIds(prev: EditorState, next: EditorState): ElementId[] {
    const changed: ElementId[] = [];
    const allIds = new Set([...Object.keys(prev.elements), ...Object.keys(next.elements)]);
    for (const id of allIds) {
      if (prev.elements[id] !== next.elements[id]) changed.push(id);
    }
    return changed;
  }

  private wireEvents(): void {
    // Selection sync → renderer
    this.bus.on('selection:changed', ({ selectedIds }) => {
      this.state = { ...this.state, selectedIds };
      this.renderer.showSelectionHandles(selectedIds, this.state);
    });

    this.bus.on('selection:cleared', () => {
      this.state = { ...this.state, selectedIds: [] };
      this.renderer.clearSelectionHandles();
    });

    // Live drag preview — update element transform without pushing to history
    this.bus.on('drag:move', ({ id, x, y }) => {
      const el = this.state.elements[id];
      if (!el) return;
      this.state = {
        ...this.state,
        elements: {
          ...this.state.elements,
          [id]: { ...el, transform: { ...el.transform, x, y } },
        },
      };
      this.renderer.render(this.state);
      this.renderer.showSelectionHandles(this.state.selectedIds, this.state);
    });

    // Drop from panel → create element at drop position
    this.bus.on('drop:element-template', ({ templateId, canvasX, canvasY }) => {
      const allTemplates = [...DEFAULT_TEMPLATES, ...(this.config.templates ?? [])];
      const template = allTemplates.find((t) => t.id === templateId);
      if (!template) return;

      this.addElement({
        ...template.defaultModel,
        type: template.type,
        transform: {
          x: canvasX,
          y: canvasY,
          width: 200,
          height: 150,
          rotation: 0,
          scaleX: 1,
          scaleY: 1,
          ...(template.defaultModel.transform ?? {}),
        },
      } as Partial<AnyElementModel> & { type: AnyElementModel['type'] });
    });

    // Undo/redo from MenuBar events (if emitted)
    this.bus.on('history:changed', ({ canUndo, canRedo }) => {
      // Used by MenuBar to enable/disable items — already handled
    });
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    const ctrl = e.ctrlKey || e.metaKey;
    if (ctrl && e.key === 'z' && !e.shiftKey) { e.preventDefault(); this.undo(); }
    if (ctrl && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); this.redo(); }
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.getAttribute('contenteditable')) return;
      const ids = [...this.state.selectedIds];
      if (!ids.length) return;
      const batch = new BatchCommand(
        ids.map((id) => new RemoveElementCommand(id, this.state)),
        'Delete selected',
      );
      this.execute(batch);
    }
  };

  private buildInitialState(): EditorState {
    const canvas: CanvasConfig = { ...DEFAULT_CANVAS, ...(this.config.canvas ?? {}) };
    const snap: SnapConfig = { ...DEFAULT_SNAP, ...(this.config.snap ?? {}) };
    const theme: ThemeConfig = { ...DEFAULT_THEME, ...(this.config.theme ?? {}) };
    return this.config.initialState
      ? { elements: {}, rootChildren: [], selectedIds: [], hoveredId: null, canvas, snap, theme, ...this.config.initialState }
      : { elements: {}, rootChildren: [], selectedIds: [], hoveredId: null, canvas, snap, theme };
  }

  private buildElement(
    partial: Partial<AnyElementModel> & { type: AnyElementModel['type'] },
  ): AnyElementModel {
    const id = nanoid(10);
    const base = {
      id,
      parentId: null,
      free: false,
      zIndex: Object.keys(this.state.elements).length,
      transform: { x: 0, y: 0, width: 200, height: 150, rotation: 0, scaleX: 1, scaleY: 1 },
      formats: {},
      locked: false,
      visible: true,
      name: `${partial.type} ${id.slice(0, 4)}`,
      ...partial,
    };

    if (partial.type === 'box') {
      return { ...base, type: 'box', children: [] } as BoxElementModel;
    } else if (partial.type === 'image') {
      return { ...base, type: 'image', src: '', alt: '', objectFit: 'cover' } as ImageElementModel;
    } else {
      return { ...base, type: 'text', content: '', placeholder: 'Click to edit...' } as TextElementModel;
    }
  }

  private getOtherRects(excludeId: ElementId): Record<string, ResolvedRect> {
    const result: Record<string, ResolvedRect> = {};
    for (const [id, el] of Object.entries(this.state.elements)) {
      if (id === excludeId) continue;
      const rect = sizingResolver.resolveRect(el.transform, this.state.canvas.width, this.state.canvas.height);
      result[id] = rect;
    }
    return result;
  }
}
