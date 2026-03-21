import type { EditorAPI, AnyElement, Point, SelectionState, DocumentState } from '../types/index.js';
import type { PixiRenderer } from '../renderer/PixiRenderer.js';
import type { DocumentModel } from '../model/DocumentModel.js';
import type { HistoryManager } from '../history/HistoryManager.js';
import type { SnapEngine } from '../snap/SnapEngine.js';
import type { EventEmitter } from '../core/EventEmitter.js';
import { MoveCommand } from '../history/commands/MoveCommand.js';
import { ResizeCommand } from '../history/commands/ResizeCommand.js';
import { FreeCommand } from '../history/commands/FreeCommand.js';
import { layoutResolver } from '../layout/LayoutResolver.js';

type HandleIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7; // 8 handles: TL,T,TR,L,R,BL,B,BR

export interface InteractionState {
  mode: 'idle' | 'selecting' | 'dragging' | 'resizing' | 'textEdit';
  selectedIds: string[];
  hovered: string | null;
}

/**
 * InteractionManager is the Mediator between PixiJS pointer events
 * and the editor commands. It orchestrates drag, resize, select, and
 * text editing interactions.
 */
export class InteractionManager {
  private _state: InteractionState = { mode: 'idle', selectedIds: [], hovered: null };
  private _canvas!: HTMLCanvasElement;

  // Drag state
  private _dragStartWorld: Point = { x: 0, y: 0 };
  private _dragStartElementPositions = new Map<string, Point>();
  private _isDragging = false;
  private _dragThreshold = 4; // px

  // Resize state
  private _resizeHandle: HandleIndex | null = null;
  private _resizeStartRect = { x: 0, y: 0, width: 0, height: 0 };
  private _resizeStartWorld: Point = { x: 0, y: 0 };

  // Text edit state
  private _textEditOverlay: HTMLDivElement | null = null;
  private _editingId: string | null = null;

  constructor(
    private readonly _renderer: PixiRenderer,
    private readonly _model: DocumentModel,
    private readonly _history: HistoryManager,
    private readonly _snap: SnapEngine,
    private readonly _emitter: EventEmitter
  ) {}

  mount(canvas: HTMLCanvasElement): void {
    this._canvas = canvas;
    canvas.addEventListener('pointerdown', this._onPointerDown);
    canvas.addEventListener('pointermove', this._onPointerMove);
    canvas.addEventListener('pointerup', this._onPointerUp);
    canvas.addEventListener('pointerleave', this._onPointerUp);
    canvas.addEventListener('dblclick', this._onDblClick);
    window.addEventListener('keydown', this._onKeyDown);
  }

  destroy(): void {
    this._canvas.removeEventListener('pointerdown', this._onPointerDown);
    this._canvas.removeEventListener('pointermove', this._onPointerMove);
    this._canvas.removeEventListener('pointerup', this._onPointerUp);
    this._canvas.removeEventListener('pointerleave', this._onPointerUp);
    this._canvas.removeEventListener('dblclick', this._onDblClick);
    window.removeEventListener('keydown', this._onKeyDown);
    this._removeTextOverlay();
  }

  getState(): InteractionState { return this._state; }

  selectIds(ids: string[]): void {
    this._state.selectedIds = [...ids];
    this._emitSelection();
  }

  clearSelection(): void {
    this._state.selectedIds = [];
    this._emitSelection();
  }

  // ─── Event Handlers ───────────────────────────────────────────────────────

  private _onPointerDown = (e: PointerEvent): void => {
    if (this._editingId) { this._commitTextEdit(); return; }

    const world = this._renderer.getWorldPosition(e.clientX, e.clientY);
    const hitId = this._hitTest(world);
    const handle = this._hitTestHandle(e.clientX, e.clientY);

    if (handle !== null && this._state.selectedIds.length > 0) {
      // Start resize
      this._startResize(handle, world);
      return;
    }

    if (hitId) {
      const el = this._model.getElement(hitId);
      if (el?.locked) return;

      if (!this._state.selectedIds.includes(hitId)) {
        const additive = e.shiftKey || e.metaKey || e.ctrlKey;
        if (!additive) {
          this._state.selectedIds = [hitId];
        } else {
          this._state.selectedIds = [...this._state.selectedIds, hitId];
        }
        this._emitSelection();
      }

      // Prepare drag
      this._dragStartWorld = world;
      this._dragStartElementPositions.clear();
      for (const id of this._state.selectedIds) {
        const el2 = this._model.getElement(id);
        if (el2) this._dragStartElementPositions.set(id, { x: el2.style.x, y: el2.style.y });
      }
      this._state.mode = 'selecting'; // will switch to 'dragging' on threshold
      this._canvas.setPointerCapture(e.pointerId);
    } else {
      // Click on empty canvas
      if (!e.shiftKey) this.clearSelection();
      this._renderer.setSelection({ ids: [], bounds: null });
    }
  };

  private _onPointerMove = (e: PointerEvent): void => {
    const world = this._renderer.getWorldPosition(e.clientX, e.clientY);

    if (this._state.mode === 'resizing') {
      this._doResize(world);
      return;
    }

    if (this._state.mode === 'selecting' || this._state.mode === 'dragging') {
      const dx = world.x - this._dragStartWorld.x;
      const dy = world.y - this._dragStartWorld.y;

      if (!this._isDragging && Math.hypot(dx, dy) > this._dragThreshold) {
        this._isDragging = true;
        this._state.mode = 'dragging';
        // Make element free if not already
        for (const id of this._state.selectedIds) {
          const el = this._model.getElement(id);
          if (el && !el.free) {
            const worldPos = { x: el.style.x, y: el.style.y };
            this._history.execute(new FreeCommand(this._model, this._emitter, id, true, worldPos));
          }
        }
      }

      if (this._isDragging) {
        this._doDrag(dx, dy);
      }
    }

    // Hover
    const hovered = this._hitTest(world);
    if (hovered !== this._state.hovered) {
      this._state.hovered = hovered;
      this._canvas.style.cursor = hovered ? 'move' : 'default';
    }
  };

  private _onPointerUp = (e: PointerEvent): void => {
    if (this._state.mode === 'dragging' && this._isDragging) {
      this._commitDrag();
    }
    if (this._state.mode === 'resizing') {
      this._commitResize();
    }
    this._isDragging = false;
    this._state.mode = 'idle';
    this._renderer.setSnapGuides([]);
    if (e.type !== 'pointerleave') this._canvas.releasePointerCapture(e.pointerId);
  };

  private _onDblClick = (e: MouseEvent): void => {
    const world = this._renderer.getWorldPosition(e.clientX, e.clientY);
    const hitId = this._hitTest(world);
    if (!hitId) return;
    const el = this._model.getElement(hitId);
    if (el?.type === 'text') this._startTextEdit(hitId, e.clientX, e.clientY);
  };

  private _onKeyDown = (e: KeyboardEvent): void => {
    if (this._editingId) return;

    if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
      e.preventDefault();
      if (e.shiftKey) { /* redo */ } else { this._history.undo(); }
    }
    if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) {
      e.preventDefault();
      this._history.redo();
    }

    if ((e.key === 'Delete' || e.key === 'Backspace') && this._state.selectedIds.length > 0) {
      // Deletion handled by Editor
      this._emitter.emit('element:remove', { id: this._state.selectedIds[0] });
    }

    // Nudge with arrow keys
    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) {
      const step = e.shiftKey ? 10 : 1;
      const dMap: Record<string, [number, number]> = {
        ArrowUp: [0, -step], ArrowDown: [0, step], ArrowLeft: [-step, 0], ArrowRight: [step, 0]
      };
      const [dx, dy] = dMap[e.key];
      for (const id of this._state.selectedIds) {
        const el = this._model.getElement(id);
        if (el) this._history.execute(
          new MoveCommand(this._model, this._emitter, id, el.style.x + dx, el.style.y + dy)
        );
      }
    }
  };

  // ─── Drag ─────────────────────────────────────────────────────────────────

  private _doDrag(dx: number, dy: number): void {
    const doc = this._model.getDocument();
    for (const id of this._state.selectedIds) {
      const start = this._dragStartElementPositions.get(id);
      if (!start) continue;
      const el = this._model.getElement(id);
      if (!el) continue;
      const w = layoutResolver.resolveSize(el.style.width, doc.width);
      const h = layoutResolver.resolveSize(el.style.height, doc.height);

      const proposed = { x: start.x + dx, y: start.y + dy, width: w, height: h };
      const snapped = this._snap.snap(proposed, new Set(this._state.selectedIds), doc);

      // Live update (no history — history is committed on mouseup)
      this._model.updateStyle(id, { x: snapped.x, y: snapped.y });
      this._renderer.updateElement(this._model.getElement(id)!);
      this._renderer.setSnapGuides(snapped.guides);
    }
    this._updateSelectionBounds();
  }

  private _commitDrag(): void {
    // Commit final positions to history
    for (const id of this._state.selectedIds) {
      const el = this._model.getElement(id);
      const start = this._dragStartElementPositions.get(id);
      if (el && start && (el.style.x !== start.x || el.style.y !== start.y)) {
        this._history.execute(
          new MoveCommand(this._model, this._emitter, id, el.style.x, el.style.y)
        );
      }
    }
  }

  // ─── Resize ───────────────────────────────────────────────────────────────

  private _startResize(handle: HandleIndex, world: Point): void {
    this._state.mode = 'resizing';
    this._resizeHandle = handle;
    this._resizeStartWorld = world;
    if (this._state.selectedIds.length === 1) {
      const el = this._model.getElement(this._state.selectedIds[0]);
      if (el) {
        const doc = this._model.getDocument();
        this._resizeStartRect = {
          x: el.style.x, y: el.style.y,
          width: layoutResolver.resolveSize(el.style.width, doc.width),
          height: layoutResolver.resolveSize(el.style.height, doc.height),
        };
      }
    }
  }

  private _doResize(world: Point): void {
    if (this._resizeHandle === null || this._state.selectedIds.length !== 1) return;
    const id = this._state.selectedIds[0];
    const dx = world.x - this._resizeStartWorld.x;
    const dy = world.y - this._resizeStartWorld.y;
    const r = this._resizeStartRect;
    let { x, y, width, height } = r;

    const h = this._resizeHandle;
    // TL=0, T=1, TR=2, L=3, R=4, BL=5, B=6, BR=7
    if (h === 0 || h === 3 || h === 5) { x += dx; width -= dx; }
    if (h === 2 || h === 4 || h === 7) { width += dx; }
    if (h === 0 || h === 1 || h === 2) { y += dy; height -= dy; }
    if (h === 5 || h === 6 || h === 7) { height += dy; }

    width = Math.max(10, width);
    height = Math.max(10, height);

    this._model.updateStyle(id, { x, y, width, height });
    this._renderer.updateElement(this._model.getElement(id)!);
    this._updateSelectionBounds();
  }

  private _commitResize(): void {
    if (this._state.selectedIds.length !== 1) return;
    const id = this._state.selectedIds[0];
    const el = this._model.getElement(id);
    if (!el) return;
    this._history.execute(new ResizeCommand(this._model, this._emitter, id, {
      x: el.style.x, y: el.style.y,
      width: typeof el.style.width === 'number' ? el.style.width : this._resizeStartRect.width,
      height: typeof el.style.height === 'number' ? el.style.height : this._resizeStartRect.height,
    }));
  }

  // ─── Text Edit ───────────────────────────────────────────────────────────

  private _startTextEdit(id: string, screenX: number, screenY: number): void {
    this._editingId = id;
    this._state.mode = 'textEdit';
    const el = this._model.getElement(id);
    if (!el || el.type !== 'text') return;

    const world = this._renderer.getWorldPosition(screenX, screenY);
    const offset = this._renderer.getStageOffset();
    const doc = this._model.getDocument();
    const w = layoutResolver.resolveSize(el.style.width, doc.width);
    const h = layoutResolver.resolveSize(el.style.height, doc.height);
    const canvasBounds = this._canvas.getBoundingClientRect();

    const overlay = document.createElement('div');
    overlay.contentEditable = 'true';
    overlay.textContent = (el as any).content;
    overlay.style.cssText = `
      position: fixed;
      left: ${canvasBounds.left + el.style.x + offset.x}px;
      top: ${canvasBounds.top + el.style.y + offset.y}px;
      width: ${w}px;
      min-height: ${h}px;
      font-size: ${el.style.fontSize}px;
      font-family: ${el.style.fontFamily};
      font-weight: ${el.style.fontWeight};
      color: ${el.style.color};
      text-align: ${el.style.textAlign};
      padding: ${el.style.paddingTop}px ${el.style.paddingRight}px ${el.style.paddingBottom}px ${el.style.paddingLeft}px;
      outline: 2px solid #6366f1;
      background: ${el.style.backgroundColor || 'transparent'};
      border: none;
      z-index: 9999;
      box-sizing: border-box;
      resize: none;
      overflow: hidden;
    `;

    overlay.addEventListener('blur', () => this._commitTextEdit());
    overlay.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this._commitTextEdit();
    });

    document.body.appendChild(overlay);
    overlay.focus();

    // Select all text
    const range = document.createRange();
    range.selectNodeContents(overlay);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);

    this._textEditOverlay = overlay;
    this._emitter.emit('text:edit:start', { id });
  }

  private _commitTextEdit(): void {
    if (!this._editingId || !this._textEditOverlay) return;
    const content = this._textEditOverlay.textContent ?? '';
    this._model.updateContent(this._editingId, content);
    const el = this._model.getElement(this._editingId);
    if (el) this._renderer.updateElement(el);
    this._emitter.emit('text:edit:end', { id: this._editingId, content });
    this._emitter.emit('document:change', { document: this._model.getSnapshot() });
    this._removeTextOverlay();
    this._editingId = null;
    this._state.mode = 'idle';
  }

  private _removeTextOverlay(): void {
    this._textEditOverlay?.remove();
    this._textEditOverlay = null;
  }

  // ─── Hit Testing ──────────────────────────────────────────────────────────

  private _hitTest(world: Point): string | null {
    const doc = this._model.getDocument();
    // Walk in reverse order (top-most rendered last = highest zIndex)
    const allIds = [...doc.children].reverse();
    return this._hitTestIds(allIds, world);
  }

  private _hitTestIds(ids: string[], world: Point): string | null {
    const docState = this._model.getDocument();
    for (const id of ids) {
      const el = docState.elements[id];
      if (!el || !el.visible) continue;
      const w = layoutResolver.resolveSize(el.style.width, docState.width);
      const h = layoutResolver.resolveSize(el.style.height, docState.height);
      if (world.x >= el.style.x && world.x <= el.style.x + w &&
          world.y >= el.style.y && world.y <= el.style.y + h) {
        if (el.type === 'box' && (el as any).children?.length > 0) {
          // Check children first (deeper elements)
          const childHit = this._hitTestIds(
            [...((el as any).children as string[])].reverse(),
            { x: world.x - el.style.x - el.style.paddingLeft, y: world.y - el.style.y - el.style.paddingTop }
          );
          if (childHit) return childHit;
        }
        return id;
      }
    }
    return null;
  }

  private _hitTestHandle(_sx: number, _sy: number): HandleIndex | null {
    // Simplified: actual implementation uses selection bounds + 8 handle rects
    return null;
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  private _updateSelectionBounds(): void {
    if (this._state.selectedIds.length === 0) {
      this._renderer.setSelection({ ids: [], bounds: null });
      return;
    }
    const doc = this._model.getDocument();
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const id of this._state.selectedIds) {
      const el = doc.elements[id];
      if (!el) continue;
      const w = layoutResolver.resolveSize(el.style.width, doc.width);
      const h = layoutResolver.resolveSize(el.style.height, doc.height);
      minX = Math.min(minX, el.style.x);
      minY = Math.min(minY, el.style.y);
      maxX = Math.max(maxX, el.style.x + w);
      maxY = Math.max(maxY, el.style.y + h);
    }
    const selection: SelectionState = {
      ids: this._state.selectedIds,
      bounds: { x: minX, y: minY, width: maxX - minX, height: maxY - minY },
    };
    this._renderer.setSelection(selection);
    this._emitter.emit('selection:change', { selection });
  }

  private _emitSelection(): void {
    this._updateSelectionBounds();
  }
}
