import type { EditorAPI, AnyElement } from '../types/index.js';
import type { DocumentModel } from '../model/DocumentModel.js';
import type { HistoryManager } from '../history/HistoryManager.js';
import type { EventEmitter } from '../core/EventEmitter.js';
import { StyleCommand } from '../history/commands/StyleCommand.js';

/**
 * BubbleToolbar — floating toolbar that appears above text elements when selected.
 * Contains quick text formatting: bold, italic, underline, align, size, color.
 */
export class BubbleToolbar {
  private _root: HTMLElement | null = null;
  private _currentId: string | null = null;

  constructor(
    private readonly _model: DocumentModel,
    private readonly _history: HistoryManager,
    private readonly _emitter: EventEmitter
  ) {}

  mount(container: HTMLElement, api: EditorAPI): void {
    this._emitter.on('selection:change', ({ selection }) => {
      const id = selection.ids[0] ?? null;
      const el = id ? this._model.getElement(id) : null;
      this._currentId = id;
      if (el?.type === 'text' && selection.bounds) {
        this._show(container, api, el, selection.bounds);
      } else {
        this._hide();
      }
    });
  }

  private _show(container: HTMLElement, api: EditorAPI, el: AnyElement, bounds: { x: number; y: number; width: number; height: number }): void {
    this._hide();

    const toolbar = document.createElement('div');
    toolbar.style.cssText = `
      position: absolute;
      left: ${bounds.x + bounds.width / 2}px;
      top: ${Math.max(8, bounds.y - 48)}px;
      transform: translateX(-50%);
      background: #1e1e2e;
      border: 1px solid #333;
      border-radius: 8px;
      display: flex;
      align-items: center;
      gap: 2px;
      padding: 4px 6px;
      z-index: 10000;
      box-shadow: 0 4px 16px rgba(0,0,0,0.4);
    `;

    const addBtn = (label: string, title: string, action: () => void, active = false) => {
      const btn = document.createElement('button');
      btn.innerHTML = label; btn.title = title;
      btn.style.cssText = `
        background:${active?'rgba(99,102,241,0.3)':'none'};
        border:none;padding:5px 8px;color:#e2e8f0;cursor:pointer;
        font-size:13px;border-radius:4px;
      `;
      btn.addEventListener('click', action);
      toolbar.appendChild(btn);
    };

    const sep = () => { const d=document.createElement('div'); d.style.cssText='width:1px;height:16px;background:#333;margin:0 2px;'; toolbar.appendChild(d); };

    addBtn('<b>B</b>', 'Bold', () => this._updateStyle({ fontWeight: el.style.fontWeight === '700' ? '400' : '700' }), el.style.fontWeight === '700');
    addBtn('<i>I</i>', 'Italic', () => this._updateStyle({ fontStyle: el.style.fontStyle === 'italic' ? 'normal' : 'italic' }), el.style.fontStyle === 'italic');
    addBtn('<u>U</u>', 'Underline', () => this._updateStyle({ textDecoration: el.style.textDecoration === 'underline' ? 'none' : 'underline' }), el.style.textDecoration === 'underline');
    sep();
    addBtn('←', 'Align Left', () => this._updateStyle({ textAlign: 'left' }), el.style.textAlign === 'left');
    addBtn('↔', 'Center', () => this._updateStyle({ textAlign: 'center' }), el.style.textAlign === 'center');
    addBtn('→', 'Align Right', () => this._updateStyle({ textAlign: 'right' }), el.style.textAlign === 'right');
    sep();

    // Font size control
    const sizeInput = document.createElement('input');
    sizeInput.type = 'number'; sizeInput.value = String(el.style.fontSize);
    sizeInput.min = '8'; sizeInput.max = '200';
    sizeInput.style.cssText = 'width:44px;padding:3px 6px;background:rgba(255,255,255,0.05);border:1px solid #444;border-radius:4px;color:#e2e8f0;font-size:12px;';
    sizeInput.addEventListener('change', () => this._updateStyle({ fontSize: Number(sizeInput.value) }));
    toolbar.appendChild(sizeInput);

    sep();

    // Color
    const colorInp = document.createElement('input');
    colorInp.type = 'color'; colorInp.value = el.style.color;
    colorInp.style.cssText = 'width:28px;height:28px;border:none;padding:0;cursor:pointer;border-radius:4px;background:none;';
    colorInp.addEventListener('input', () => this._updateStyle({ color: colorInp.value }));
    toolbar.appendChild(colorInp);

    this._root = toolbar;
    container.appendChild(toolbar);
  }

  private _updateStyle(patch: Partial<import('../types/index.js').ElementStyle>): void {
    if (!this._currentId) return;
    this._history.execute(new StyleCommand(this._model, this._emitter, this._currentId, patch));
  }

  private _hide(): void {
    this._root?.remove();
    this._root = null;
  }
}
