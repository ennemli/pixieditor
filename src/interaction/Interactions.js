import { Events } from '../core/EventBus.js';
import { MoveCommand, ResizeCommand, FreeCommand, TextContentCommand } from '../commands/Commands.js';

// ─────────────────────────────────────────────────────────────────────────────
// DragManager
// ─────────────────────────────────────────────────────────────────────────────

/**
 * DragManager — handles drag interactions for canvas elements.
 *
 * Lifecycle:
 *  1. startDrag(id, pointerPos) — called on pointerdown + move threshold
 *  2. moveDrag(pointerPos)      — called on pointermove
 *  3. endDrag()                 — called on pointerup → commits MoveCommand
 *
 * If dragged element is NOT free, it becomes free at drag start
 * (FreeCommand is executed as part of the drag end commit).
 */
export class DragManager {
  constructor(scene, bus, history, snapEngine, layoutCache) {
    this._scene = scene;
    this._bus = bus;
    this._history = history;
    this._snap = snapEngine;
    this._layoutCache = layoutCache;

    this._active = false;
    this._elementId = null;
    this._startPointer = null;
    this._startElementPos = null;
    this._currentPos = null;
    this._madeFreeDuringDrag = false;
    this._originalParentId = null;
  }

  get isDragging() { return this._active; }

  /**
   * Begin a drag operation.
   * @param {string} elementId
   * @param {{ x: number, y: number }} pointerPos - canvas-space pointer position
   */
  startDrag(elementId, pointerPos) {
    const el = this._scene.getElementById(elementId);
    if (!el || el.locked) return;

    this._active = true;
    this._elementId = elementId;
    this._startPointer = { ...pointerPos };
    this._startElementPos = { x: el.x, y: el.y };
    this._currentPos = { x: el.x, y: el.y };
    this._madeFreeDuringDrag = false;
    this._originalParentId = el.parentId;

    // If not free, make free immediately (visual feedback starts at drag)
    if (!el.free) {
      const bounds = this._layoutCache.get(elementId);
      const canvasPos = bounds ? { x: bounds.x, y: bounds.y } : { x: el.x, y: el.y };

      // Apply free directly (not via history yet — will be part of endDrag commit)
      this._scene.freeElement(elementId, canvasPos);
      this._startElementPos = { x: canvasPos.x, y: canvasPos.y };
      this._currentPos = { ...this._startElementPos };
      this._madeFreeDuringDrag = true;

      this._bus.emit(Events.ELEMENT_FREE_CHANGED, { id: elementId, free: true });
    }

    this._bus.emit(Events.DRAG_START, { id: elementId, ...pointerPos });
  }

  /**
   * Update drag position (called every pointermove).
   * Does NOT push to history — only visual position updates.
   */
  moveDrag(pointerPos) {
    if (!this._active) return;

    const el = this._scene.getElementById(this._elementId);
    if (!el) return;

    const dx = pointerPos.x - this._startPointer.x;
    const dy = pointerPos.y - this._startPointer.y;

    let newX = this._startElementPos.x + dx;
    let newY = this._startElementPos.y + dy;

    // Apply snap
    const bounds = this._layoutCache.get(this._elementId);
    const snapped = this._snap.snap({
      x: newX,
      y: newY,
      width: bounds?.width ?? 100,
      height: bounds?.height ?? 60,
      elementId: this._elementId,
      resolvedBounds: this._layoutCache,
    });

    newX = snapped.x;
    newY = snapped.y;

    // Apply position directly (no history — continuous update)
    el.x = newX;
    el.y = newY;
    this._currentPos = { x: newX, y: newY };

    this._bus.emit(Events.DRAG_MOVE, { id: this._elementId, x: newX, y: newY });
    this._bus.emit(Events.RENDER_REQUESTED);
  }

  /**
   * Finish drag — commits a single MoveCommand (+ FreeCommand if became free).
   * This is the only history snapshot for the entire drag gesture.
   */
  endDrag() {
    if (!this._active) return;

    this._snap.clearGuides();

    const elementId = this._elementId;
    const startPos = this._startElementPos;
    const endPos = this._currentPos;

    if (this._madeFreeDuringDrag) {
      // Commit: FreeCommand (tracks the parent change) + MoveCommand
      this._history.executeGroup([
        new FreeCommand(
          this._scene, this._bus, elementId,
          true,
          startPos,
          null
        ),
        new MoveCommand(this._scene, this._bus, elementId, endPos, startPos),
      ], 'Move');
    } else {
      // Already free: just a MoveCommand
      this._history.execute(
        new MoveCommand(this._scene, this._bus, elementId, endPos, startPos)
      );
    }

    this._active = false;
    this._elementId = null;
    this._bus.emit(Events.DRAG_END, { id: elementId, ...endPos });
    this._bus.emit(Events.RENDER_REQUESTED);
  }

  /** Cancel drag — restores element to start position. */
  cancelDrag() {
    if (!this._active) return;
    const el = this._scene.getElementById(this._elementId);
    if (el) {
      if (this._madeFreeDuringDrag) {
        this._scene.unfreeElement(this._elementId, this._originalParentId);
      } else {
        el.x = this._startElementPos.x;
        el.y = this._startElementPos.y;
      }
    }
    this._snap.clearGuides();
    this._active = false;
    this._elementId = null;
    this._bus.emit(Events.RENDER_REQUESTED);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ResizeManager
// ─────────────────────────────────────────────────────────────────────────────

/**
 * ResizeManager — handles resize handle interactions.
 *
 * Handles are: nw, n, ne, e, se, s, sw, w (8 directions).
 * Maintains aspect ratio when Shift is held.
 */
export class ResizeManager {
  constructor(scene, bus, history, snapEngine, layoutCache) {
    this._scene = scene;
    this._bus = bus;
    this._history = history;
    this._snap = snapEngine;
    this._layoutCache = layoutCache;

    this._active = false;
    this._elementId = null;
    this._handle = null;       // 'nw'|'n'|'ne'|'e'|'se'|'s'|'sw'|'w'
    this._startPointer = null;
    this._startRect = null;
    this._currentRect = null;
    this._keepAspect = false;
  }

  get isResizing() { return this._active; }

  startResize(elementId, handle, pointerPos, keepAspect = false) {
    const el = this._scene.getElementById(elementId);
    if (!el || el.locked) return;

    const bounds = this._layoutCache.get(elementId);
    if (!bounds) return;

    this._active = true;
    this._elementId = elementId;
    this._handle = handle;
    this._startPointer = { ...pointerPos };
    this._startRect = { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height };
    this._currentRect = { ...this._startRect };
    this._keepAspect = keepAspect;
    this._aspectRatio = bounds.width / (bounds.height || 1);

    this._bus.emit(Events.RESIZE_START, { id: elementId, handle });
  }

  moveResize(pointerPos) {
    if (!this._active) return;
    const dx = pointerPos.x - this._startPointer.x;
    const dy = pointerPos.y - this._startPointer.y;
    const start = this._startRect;

    let { x, y, width, height } = start;

    const h = this._handle;

    // Adjust dimensions per handle
    if (h.includes('e')) width = Math.max(20, start.width + dx);
    if (h.includes('s')) height = Math.max(20, start.height + dy);
    if (h.includes('w')) { x = start.x + dx; width = Math.max(20, start.width - dx); }
    if (h.includes('n')) { y = start.y + dy; height = Math.max(20, start.height - dy); }

    if (this._keepAspect) {
      if (h.includes('e') || h.includes('w')) {
        height = width / this._aspectRatio;
      } else {
        width = height * this._aspectRatio;
      }
    }

    this._currentRect = { x, y, width: Math.round(width), height: Math.round(height) };

    // Apply directly to element for live preview
    const el = this._scene.getElementById(this._elementId);
    if (el) {
      el.x = x; el.y = y;
      el.width = Math.round(width); el.height = Math.round(height);
    }

    this._bus.emit(Events.RESIZE_MOVE, { id: this._elementId, ...this._currentRect });
    this._bus.emit(Events.RENDER_REQUESTED);
  }

  endResize() {
    if (!this._active) return;

    this._history.execute(
      new ResizeCommand(
        this._scene, this._bus,
        this._elementId,
        this._currentRect,
        this._startRect
      )
    );

    this._active = false;
    this._bus.emit(Events.RESIZE_END, { id: this._elementId });
    this._bus.emit(Events.RENDER_REQUESTED);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// TextEditManager
// ─────────────────────────────────────────────────────────────────────────────

/**
 * TextEditManager — manages the DOM overlay for text editing.
 *
 * When the user double-clicks a TextModel element:
 *  1. A contenteditable div is positioned over the canvas element's bounds.
 *  2. The user types; the div is the source of truth for content.
 *  3. On blur/Enter, a TextContentCommand is committed to history.
 *
 * The PixiJS text node is hidden while the overlay is active.
 */
export class TextEditManager {
  constructor(scene, bus, history, canvasContainer) {
    this._scene = scene;
    this._bus = bus;
    this._history = history;
    this._container = canvasContainer; // DOM element that wraps the canvas

    this._activeId = null;
    this._overlay = null;
    this._prevContent = null;
  }

  get isEditing() { return this._activeId !== null; }
  get activeId() { return this._activeId; }

  /**
   * Begin editing a text element.
   * @param {string} elementId
   * @param {import('../layout/LayoutEngine.js').Bounds} bounds - canvas-space bounds
   * @param {number} scale - current canvas scale (for DOM positioning)
   */
  startEdit(elementId, bounds, scale = 1) {
    const el = this._scene.getElementById(elementId);
    if (!el || el.type !== 'text') return;

    this._activeId = elementId;
    this._prevContent = el.content;

    // Create overlay div
    const overlay = document.createElement('div');
    overlay.contentEditable = 'true';
    overlay.spellcheck = false;
    overlay.innerHTML = el.content;

    const containerRect = this._container.getBoundingClientRect();
    Object.assign(overlay.style, {
      position: 'absolute',
      left: `${bounds.x * scale}px`,
      top: `${bounds.y * scale}px`,
      width: `${bounds.width * scale}px`,
      minHeight: `${bounds.height * scale}px`,
      padding: `${el.style.padding.top * scale}px ${el.style.padding.right * scale}px ${el.style.padding.bottom * scale}px ${el.style.padding.left * scale}px`,
      fontFamily: el.style.fontFamily,
      fontSize: `${el.style.fontSize * scale}px`,
      fontWeight: el.style.fontWeight,
      fontStyle: el.style.fontStyle,
      color: el.style.color,
      textAlign: el.style.textAlign,
      lineHeight: el.style.lineHeight,
      letterSpacing: `${el.style.letterSpacing}em`,
      background: 'transparent',
      border: '2px solid #3b82f6',
      outline: 'none',
      zIndex: '9999',
      cursor: 'text',
      whiteSpace: 'pre-wrap',
      wordBreak: 'break-word',
      boxSizing: 'border-box',
      borderRadius: '2px',
    });

    this._container.style.position = 'relative';
    this._container.appendChild(overlay);
    this._overlay = overlay;

    // Focus and select all
    overlay.focus();
    document.execCommand('selectAll', false, null);

    // Bubble menu trigger
    overlay.addEventListener('selectionchange', () => {
      this._bus.emit(Events.TEXT_SELECTION_CHANGED, {
        id: elementId,
        selection: window.getSelection(),
        overlay,
      });
    });

    // Commit on blur
    overlay.addEventListener('blur', () => this.endEdit(), { once: true });

    // Commit on Escape (cancel) or handle special keys
    overlay.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { this.cancelEdit(); e.preventDefault(); }
    });

    this._bus.emit(Events.TEXT_EDIT_START, { id: elementId });
  }

  /**
   * Commit text changes and remove overlay.
   */
  endEdit() {
    if (!this._activeId) return;

    const newContent = this._overlay?.innerHTML ?? '';
    const id = this._activeId;

    this._removeOverlay();

    if (newContent !== this._prevContent) {
      this._history.execute(
        new TextContentCommand(this._scene, this._bus, id, newContent, this._prevContent)
      );
    }

    this._bus.emit(Events.TEXT_EDIT_END, { id });
    this._bus.emit(Events.RENDER_REQUESTED);
  }

  cancelEdit() {
    if (!this._activeId) return;
    const id = this._activeId;
    // Restore original content
    const el = this._scene.getElementById(id);
    if (el) el.content = this._prevContent;
    this._removeOverlay();
    this._bus.emit(Events.TEXT_EDIT_END, { id });
    this._bus.emit(Events.RENDER_REQUESTED);
  }

  /**
   * Apply an inline format command to the selected text in the overlay.
   * Uses document.execCommand for basic formatting.
   * @param {'bold'|'italic'|'underline'|'foreColor'|'backColor'|'justifyLeft'|'justifyCenter'|'justifyRight'} command
   * @param {string} [value]
   */
  applyInlineFormat(command, value) {
    if (!this._overlay) return;
    this._overlay.focus();
    document.execCommand(command, false, value ?? null);
    this._bus.emit(Events.TEXT_FORMAT_APPLIED, { command, value });
  }

  _removeOverlay() {
    if (this._overlay && this._overlay.parentNode) {
      this._overlay.parentNode.removeChild(this._overlay);
    }
    this._overlay = null;
    this._activeId = null;
    this._prevContent = null;
  }

  /**
   * Sync overlay position when canvas is panned/zoomed.
   */
  syncPosition(bounds, scale) {
    if (!this._overlay) return;
    Object.assign(this._overlay.style, {
      left: `${bounds.x * scale}px`,
      top: `${bounds.y * scale}px`,
      width: `${bounds.width * scale}px`,
      fontSize: `${this._scene.getElementById(this._activeId)?.style.fontSize * scale}px`,
    });
  }
}
