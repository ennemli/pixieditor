import type { EditorAPI, ThemeConfig, PanelConfig } from '../types/index.js';
import type { DocumentModel } from '../model/DocumentModel.js';
import type { FormatRegistry } from '../format/FormatRegistry.js';
import type { HistoryManager } from '../history/HistoryManager.js';
import type { EventEmitter } from '../core/EventEmitter.js';
import type { MenuManager } from '../menu/MenuManager.js';
import { LeftPanel } from './LeftPanel.js';
import { RightPanel } from './RightPanel.js';
import { BubbleToolbar } from './BubbleToolbar.js';

/**
 * PanelManager orchestrates all DOM panels and applies theming.
 */
export class PanelManager {
  private _shell!: HTMLElement;
  private _canvasWrap!: HTMLElement;
  private readonly _left: LeftPanel;
  private readonly _right: RightPanel;
  private readonly _bubble: BubbleToolbar;

  constructor(
    private readonly _model: DocumentModel,
    private readonly _formatRegistry: FormatRegistry,
    private readonly _history: HistoryManager,
    private readonly _emitter: EventEmitter,
    private readonly _menu: MenuManager,
    private readonly _config: PanelConfig = {}
  ) {
    this._left = new LeftPanel(_formatRegistry, _model, _history, _emitter);
    this._right = new RightPanel(_model, _formatRegistry, _history, _emitter);
    this._bubble = new BubbleToolbar(_model, _history, _emitter);
  }

  mount(container: HTMLElement, api: EditorAPI): { canvasContainer: HTMLElement } {
    this._applyTheme(container, this._config.theme);

    // Shell layout
    this._shell = document.createElement('div');
    this._shell.style.cssText = 'display:flex;flex-direction:column;width:100%;height:100%;overflow:hidden;font-family:var(--pe-font-family,Inter,system-ui,sans-serif);';

    // Menubar
    this._menu.mount(this._shell, api);

    // Main area (panels + canvas)
    const main = document.createElement('div');
    main.style.cssText = 'display:flex;flex:1;overflow:hidden;position:relative;';

    this._left.mount(main, api);

    // Canvas wrapper
    this._canvasWrap = document.createElement('div');
    this._canvasWrap.style.cssText = 'flex:1;position:relative;overflow:hidden;background:var(--pe-canvas-bg,#f0f0f0);';
    main.appendChild(this._canvasWrap);

    this._right.mount(main, api);
    this._shell.appendChild(main);
    container.appendChild(this._shell);

    // Bubble toolbar mounts on canvas wrap
    this._bubble.mount(this._canvasWrap, api);

    // Drop zone for dragging elements from palette
    this._canvasWrap.addEventListener('dragover', (e) => e.preventDefault());
    this._canvasWrap.addEventListener('drop', (e) => {
      e.preventDefault();
      try {
        const data = JSON.parse(e.dataTransfer?.getData('text/plain') ?? '{}');
        if (data.type) {
          const rect = this._canvasWrap.getBoundingClientRect();
          const id = api.addElement(data.type, null, {
            x: e.clientX - rect.left - 100,
            y: e.clientY - rect.top - 50,
          } as any);
          api.selectElement(id);
        }
      } catch {}
    });

    this._emitter.emit('panel:ready', {});
    return { canvasContainer: this._canvasWrap };
  }

  private _applyTheme(container: HTMLElement, theme?: ThemeConfig): void {
    const t = theme ?? {};
    const vars: Record<string, string> = {
      '--pe-panel-bg': t.panelBackground ?? '#1e1e2e',
      '--pe-border': t.panelBorder ?? '#2d2d3d',
      '--pe-accent': t.accent ?? '#6366f1',
      '--pe-text': t.text ?? '#e2e8f0',
      '--pe-text-muted': t.textMuted ?? '#64748b',
      '--pe-input-bg': t.inputBackground ?? 'rgba(255,255,255,0.06)',
      '--pe-font-family': t.fontFamily ?? 'Inter, system-ui, sans-serif',
    };
    for (const [k, v] of Object.entries(vars)) {
      container.style.setProperty(k, v);
    }
  }
}
