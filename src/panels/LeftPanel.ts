import type { EditorAPI, ThemeConfig, AnyElement } from '../types/index.js';
import type { FormatRegistry } from '../format/FormatRegistry.js';
import type { DocumentModel } from '../model/DocumentModel.js';
import type { HistoryManager } from '../history/HistoryManager.js';
import { StyleCommand } from '../history/commands/StyleCommand.js';
import type { EventEmitter } from '../core/EventEmitter.js';

/**
 * LeftPanel — draggable element palette + format controls.
 * DOM-based panel overlaid on the canvas.
 */
export class LeftPanel {
  private _root!: HTMLElement;
  private _currentSelectedId: string | null = null;

  constructor(
    private readonly _formatRegistry: FormatRegistry,
    private readonly _model: DocumentModel,
    private readonly _history: HistoryManager,
    private readonly _emitter: EventEmitter
  ) {}

  mount(container: HTMLElement, api: EditorAPI): HTMLElement {
    this._root = document.createElement('div');
    this._root.className = 'pe-left-panel';
    this._root.style.cssText = `
      width: 220px; height: 100%; overflow-y: auto;
      background: var(--pe-panel-bg, #1e1e2e);
      border-right: 1px solid var(--pe-border, #333);
      display: flex; flex-direction: column;
      flex-shrink: 0;
    `;

    this._root.appendChild(this._buildElementsPalette(api));
    this._root.appendChild(this._buildFormatSection(api));

    container.appendChild(this._root);

    // Update format section when selection changes
    this._emitter.on('selection:change', ({ selection }) => {
      const id = selection.ids[0] ?? null;
      this._currentSelectedId = id;
      this._refreshFormats(api);
    });

    return this._root;
  }

  private _buildElementsPalette(api: EditorAPI): HTMLElement {
    const section = this._makeSection('Elements');
    const grid = document.createElement('div');
    grid.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:0 12px 12px';

    const elements = [
      { type: 'box' as const, label: '□ Box', icon: '⬜' },
      { type: 'text' as const, label: 'T Text', icon: 'T' },
      { type: 'image' as const, label: '🖼 Image', icon: '🖼' },
    ];

    for (const el of elements) {
      const card = document.createElement('div');
      card.draggable = true;
      card.style.cssText = `
        padding: 12px 8px; border-radius: 8px; text-align: center;
        background: rgba(255,255,255,0.05); cursor: grab;
        font-size: 11px; color: var(--pe-text, #e2e8f0);
        border: 1px solid var(--pe-border, #333);
        transition: all 0.15s; user-select: none;
      `;
      card.innerHTML = `<div style="font-size:20px;margin-bottom:4px">${el.icon}</div>${el.label}`;

      card.addEventListener('mouseenter', () => card.style.background = 'rgba(99,102,241,0.15)');
      card.addEventListener('mouseleave', () => card.style.background = 'rgba(255,255,255,0.05)');

      // Drag to canvas
      card.addEventListener('dragstart', (e) => {
        e.dataTransfer?.setData('text/plain', JSON.stringify({ type: el.type }));
        card.style.opacity = '0.5';
      });
      card.addEventListener('dragend', () => { card.style.opacity = '1'; });

      // Click to add at center
      card.addEventListener('click', () => {
        const doc = this._model.getDocument();
        const id = api.addElement(el.type, null, {
          x: doc.width / 2 - 100,
          y: doc.height / 2 - 50,
          free: true,
        } as any);
        api.selectElement(id);
      });

      grid.appendChild(card);
    }

    section.appendChild(grid);
    return section;
  }

  private _formatsContainer!: HTMLElement;

  private _buildFormatSection(api: EditorAPI): HTMLElement {
    const section = this._makeSection('Formats');
    this._formatsContainer = document.createElement('div');
    this._formatsContainer.style.cssText = 'padding: 0 12px 12px;';
    const placeholder = document.createElement('p');
    placeholder.textContent = 'Select an element to see formats.';
    placeholder.style.cssText = 'font-size:11px;color:var(--pe-text-muted,#666);margin:8px 0;';
    this._formatsContainer.appendChild(placeholder);
    section.appendChild(this._formatsContainer);
    return section;
  }

  private _refreshFormats(api: EditorAPI): void {
    this._formatsContainer.innerHTML = '';
    if (!this._currentSelectedId) {
      const p = document.createElement('p');
      p.textContent = 'Select an element to see formats.';
      p.style.cssText = 'font-size:11px;color:var(--pe-text-muted,#666);margin:8px 0;';
      this._formatsContainer.appendChild(p);
      return;
    }
    const el = this._model.getElement(this._currentSelectedId);
    if (!el) return;
    const formats = this._formatRegistry.getForElement(el);
    const byGroup = this._formatRegistry.getByGroup();

    for (const [group, groupFormats] of byGroup) {
      const applicable = groupFormats.filter(f => f.appliesTo.includes(el.type));
      if (applicable.length === 0) continue;

      const groupEl = document.createElement('div');
      groupEl.style.cssText = 'margin-bottom:12px;';
      const groupLabel = document.createElement('div');
      groupLabel.textContent = group;
      groupLabel.style.cssText = 'font-size:10px;font-weight:600;color:var(--pe-text-muted,#888);text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;';
      groupEl.appendChild(groupLabel);

      for (const fmt of applicable) {
        const id = this._currentSelectedId;
        const control = fmt.renderControl(el, (value) => {
          const patch = fmt.apply(el, value);
          this._history.execute(new StyleCommand(this._model, this._emitter, id!, patch));
        });
        control.style.marginBottom = '8px';
        groupEl.appendChild(control);
      }
      this._formatsContainer.appendChild(groupEl);
    }
  }

  private _makeSection(title: string): HTMLElement {
    const section = document.createElement('div');
    const header = document.createElement('div');
    header.textContent = title;
    header.style.cssText = `
      font-size: 11px; font-weight: 600; padding: 12px 12px 8px;
      color: var(--pe-text-muted, #888); text-transform: uppercase;
      letter-spacing: 1px; border-bottom: 1px solid var(--pe-border, #333);
      margin-bottom: 8px;
    `;
    section.appendChild(header);
    return section;
  }
}
