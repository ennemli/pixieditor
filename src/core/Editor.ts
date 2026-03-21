import type {
  EditorConfig, EditorAPI, EditorEventName,
  DocumentState, SelectionState,
  ElementType, ElementStyle, SnapConfig,
  CustomMenuItem, ExportFormat,
} from '../types/index.js';
import { EventEmitter } from './EventEmitter.js';
import { DocumentModel } from '../model/DocumentModel.js';
import { HistoryManager } from '../history/HistoryManager.js';
import { SnapEngine } from '../snap/SnapEngine.js';
import { FormatRegistry } from '../format/FormatRegistry.js';
import { PixiRenderer } from '../renderer/PixiRenderer.js';
import { InteractionManager } from '../interaction/InteractionManager.js';
import { PanelManager } from '../panels/PanelManager.js';
import { MenuManager } from '../menu/MenuManager.js';
import {
  BackgroundColorFormat, BackgroundImageFormat, ColorFormat,
  PaddingFormat, BorderRadiusFormat, CircleFormat,
  OpacityFormat, FontSizeFormat, FontFamilyFormat,
  TextAlignFormat, BorderFormat, ShadowFormat,
  SizeFormat, RotationFormat,
} from '../format/formats/index.js';
import { AddElementCommand } from '../history/commands/AddElementCommand.js';
import { RemoveElementCommand } from '../history/commands/RemoveElementCommand.js';
import { StyleCommand } from '../history/commands/StyleCommand.js';
import { FreeCommand } from '../history/commands/FreeCommand.js';
import { LayerMoveCommand, LayerReorderCommand } from '../history/commands/LayerCommand.js';

const DEFAULT_SNAP_CONFIG: SnapConfig = {
  enabled: true,
  grid: true,
  gridSize: 20,
  gridColor: '#e2e8f0',
  elements: true,
  canvas: true,
  smartGuides: true,
  threshold: 8,
};

/**
 * Editor — the top-level composition root.
 *
 * Responsibilities:
 *  - Wire all subsystems together
 *  - Expose a clean EditorAPI to consumers
 *  - Manage lifecycle (mount / destroy)
 *
 * All subsystems communicate only through EventEmitter (loose coupling).
 * Editor itself acts as a thin Facade over the subsystems.
 */
export class Editor {
  private readonly _emitter = new EventEmitter();
  private readonly _model: DocumentModel;
  private readonly _history: HistoryManager;
  private readonly _snap: SnapEngine;
  private readonly _formats: FormatRegistry;
  private readonly _renderer: PixiRenderer;
  private readonly _interaction: InteractionManager;
  private readonly _menu: MenuManager;
  private readonly _panels: PanelManager;
  private _api!: EditorAPI;

  constructor(private readonly _config: EditorConfig) {
    // ── 1. Core model ──────────────────────────────────────────────────────
    this._model = new DocumentModel(_config.document);
    this._history = new HistoryManager(this._emitter);

    // ── 2. Snap engine ────────────────────────────────────────────────────
    this._snap = new SnapEngine({ ...DEFAULT_SNAP_CONFIG, ...(_config.snap ?? {}) });

    // ── 3. Format registry ───────────────────────────────────────────────
    this._formats = new FormatRegistry();
    this._registerBuiltinFormats();

    // ── 4. Renderer ───────────────────────────────────────────────────────
    this._renderer = new PixiRenderer();

    // ── 5. Interaction ────────────────────────────────────────────────────
    this._interaction = new InteractionManager(
      this._renderer, this._model, this._history, this._snap, this._emitter
    );

    // ── 6. Menus / Panels ─────────────────────────────────────────────────
    this._menu = new MenuManager(_config.menuItems, _config.exportFormats);
    this._panels = new PanelManager(
      this._model, this._formats, this._history, this._emitter,
      this._menu, _config.panel
    );
  }

  /**
   * Mount the editor into the given container and return the public API.
   */
  mount(): EditorAPI {
    const container = this._config.container;
    container.style.cssText = `
      ${container.style.cssText}
      position: relative;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    `;

    // Build public API early so panels can reference it
    this._api = this._buildAPI();

    // Mount panels (returns the canvas container div)
    const { canvasContainer } = this._panels.mount(container, this._api);

    // Mount renderer into canvas container
    this._renderer.mount(canvasContainer);

    // Mount interaction on the canvas element
    this._interaction.mount(this._renderer.getCanvas());

    // Wire document changes → renderer re-render
    this._emitter.on('document:change', ({ document }) => {
      this._renderer.render(document);
    });
    this._emitter.on('element:update', ({ element }) => {
      this._renderer.updateElement(element);
    });
    this._emitter.on('element:remove', ({ id }) => {
      this._renderer.removeElement(id);
    });

    // Wire snap config → grid display
    this._emitter.on('snap:change', ({ config }) => {
      this._renderer.showGrid(config.grid, config.gridSize, config.gridColor);
    });

    // Initial render
    this._renderer.render(this._model.getDocument());

    if (this._snap.getConfig().grid) {
      const cfg = this._snap.getConfig();
      this._renderer.showGrid(cfg.grid, cfg.gridSize, cfg.gridColor);
    }

    // Notify consumer
    this._config.onReady?.(this._api);

    return this._api;
  }

  // ─── Build the public EditorAPI facade ──────────────────────────────────

  private _buildAPI(): EditorAPI {
    const self = this;

    const api: EditorAPI = {
      getDocument(): DocumentState {
        return self._model.getSnapshot();
      },

      getSelection(): SelectionState {
        const ids = self._interaction.getState().selectedIds;
        if (ids.length === 0) return { ids: [], bounds: null };
        const doc = self._model.getDocument();
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const id of ids) {
          const el = doc.elements[id];
          if (!el) continue;
          const w = typeof el.style.width === 'number' ? el.style.width : 0;
          const h = typeof el.style.height === 'number' ? el.style.height : 0;
          minX = Math.min(minX, el.style.x);
          minY = Math.min(minY, el.style.y);
          maxX = Math.max(maxX, el.style.x + w);
          maxY = Math.max(maxY, el.style.y + h);
        }
        return {
          ids,
          bounds: { x: minX, y: minY, width: maxX - minX, height: maxY - minY },
        };
      },

      selectElement(id: string, additive = false): void {
        const ids = additive
          ? [...self._interaction.getState().selectedIds, id]
          : [id];
        self._interaction.selectIds(ids);
      },

      clearSelection(): void {
        self._interaction.clearSelection();
      },

      addElement(
        type: ElementType,
        parentId: string | null = null,
        style: Partial<ElementStyle> = {}
      ): string {
        const cmd = new AddElementCommand(
          self._model, self._emitter, type, parentId, style
        );
        self._history.execute(cmd);
        return cmd.createdId!;
      },

      removeElement(id: string): void {
        self._history.execute(
          new RemoveElementCommand(self._model, self._emitter, id)
        );
      },

      updateStyle(id: string, patch: Partial<ElementStyle>): void {
        self._history.execute(
          new StyleCommand(self._model, self._emitter, id, patch)
        );
      },

      updateContent(id: string, content: string): void {
        self._model.updateContent(id, content);
        const el = self._model.getElement(id);
        if (el) {
          self._emitter.emit('element:update', { element: el });
          self._emitter.emit('document:change', { document: self._model.getSnapshot() });
        }
      },

      updateSrc(id: string, src: string): void {
        self._model.updateSrc(id, src);
        const el = self._model.getElement(id);
        if (el) {
          self._emitter.emit('element:update', { element: el });
          self._emitter.emit('document:change', { document: self._model.getSnapshot() });
        }
      },

      setFree(id: string, free: boolean): void {
        const el = self._model.getElement(id);
        if (!el) return;
        const worldPos = free ? { x: el.style.x, y: el.style.y } : undefined;
        self._history.execute(
          new FreeCommand(self._model, self._emitter, id, free, worldPos)
        );
      },

      moveLayer(id: string, direction: 'up' | 'down' | 'top' | 'bottom'): void {
        self._history.execute(
          new LayerMoveCommand(self._model, self._emitter, id, direction)
        );
      },

      reorderLayer(id: string, targetId: string, position: 'before' | 'after'): void {
        self._history.execute(
          new LayerReorderCommand(self._model, self._emitter, id, targetId, position)
        );
      },

      undo(): void { self._history.undo(); },
      redo(): void { self._history.redo(); },
      canUndo(): boolean { return self._history.canUndo(); },
      canRedo(): boolean { return self._history.canRedo(); },

      setSnapConfig(patch: Partial<SnapConfig>): void {
        self._snap.setConfig(patch);
        self._emitter.emit('snap:change', { config: self._snap.getConfig() });
      },

      getSnapConfig(): SnapConfig {
        return self._snap.getConfig();
      },

      destroy(): void {
        self._interaction.destroy();
        self._renderer.destroy();
        self._emitter.removeAllListeners();
        self._config.container.innerHTML = '';
      },

      on(event: EditorEventName, handler: (payload: any) => void): void {
        self._emitter.on(event as any, handler);
      },

      off(event: EditorEventName, handler: (payload: any) => void): void {
        self._emitter.off(event as any, handler);
      },
    };

    return api;
  }

  // ─── Register built-in formats ───────────────────────────────────────────

  private _registerBuiltinFormats(): void {
    const formats = [
      new SizeFormat(),
      new BackgroundColorFormat(),
      new BackgroundImageFormat(),
      new ColorFormat(),
      new PaddingFormat(),
      new BorderRadiusFormat(),
      new CircleFormat(),
      new OpacityFormat(),
      new FontSizeFormat(),
      new FontFamilyFormat(),
      new TextAlignFormat(),
      new BorderFormat(),
      new ShadowFormat(),
      new RotationFormat(),
    ];
    for (const f of formats) this._formats.register(f);
  }
}
