import { Events } from '../core/EventBus.js';
import { DragManager, ResizeManager, TextEditManager } from './Interactions.js';
import { FreeCommand, AddElementCommand } from '../commands/Commands.js';
import { BoxModel, ImageModel, TextModel } from '../model/Elements.js';

/**
 * InteractionEngine — Mediator Pattern
 *
 * Routes ALL pointer and keyboard events from PixiJS to the correct handler.
 * No other module handles input events directly.
 *
 * Responsibilities:
 *  - Hit testing (which element is at pointer pos?)
 *  - Click → select
 *  - Double-click → text edit
 *  - Drag → DragManager
 *  - Handle drag → ResizeManager
 *  - Drop from panel → AddElementCommand
 *  - Keyboard → undo/redo/delete/escape
 *  - Pointer position → canvas coordinates (accounts for scale/offset)
 */
export class InteractionEngine {
  constructor({
    scene,
    bus,
    history,
    snapEngine,
    selectionManager,
    layoutCache,
    canvasContainer,
    config,
  }) {
    this._scene = scene;
    this._bus = bus;
    this._history = history;
    this._snap = snapEngine;
    this._selection = selectionManager;
    this._layoutCache = layoutCache;
    this._container = canvasContainer;
    this._config = config;

    // Sub-managers
    this._drag = new DragManager(scene, bus, history, snapEngine, layoutCache);
    this._resize = new ResizeManager(scene, bus, history, snapEngine, layoutCache);
    this._textEdit = new TextEditManager(scene, bus, history, canvasContainer);

    // Pointer state
    this._pointerDown = false;
    this._pointerMoved = false;
    this._downPos = null;
    this._downTarget = null; // { type: 'element'|'handle'|'canvas', id?, handle? }
    this._DRAG_THRESHOLD = 4; // px before drag starts

    // Canvas transform state (set by renderer)
    this._scale = 1;
    this._offsetX = 0;
    this._offsetY = 0;

    this._bindKeyboard();
    this._bindBusEvents();
  }

  // ─── Transform ─────────────────────────────────────────────────────────────

  /** Called by renderer when scale/pan changes */
  setTransform(scale, offsetX, offsetY) {
    this._scale = scale;
    this._offsetX = offsetX;
    this._offsetY = offsetY;
  }

  /** Convert screen-space pointer to canvas-space coordinates */
  screenToCanvas(screenX, screenY) {
    const rect = this._container.getBoundingClientRect();
    return {
      x: (screenX - rect.left - this._offsetX) / this._scale,
      y: (screenY - rect.top - this._offsetY) / this._scale,
    };
  }

  // ─── Pointer Events (called by PixiJS event handlers) ─────────────────────

  /**
   * Called on PixiJS pointerdown on a canvas element.
   * @param {string} elementId
   * @param {{ x: number, y: number }} canvasPos
   * @param {{ shiftKey: boolean }} modifiers
   */
  onElementPointerDown(elementId, canvasPos, modifiers = {}) {
    const el = this._scene.getElementById(elementId);
    if (!el || el.locked) return;

    this._pointerDown = true;
    this._pointerMoved = false;
    this._downPos = canvasPos;
    this._downTarget = { type: 'element', id: elementId };

    // Immediate selection on pointerdown
    if (modifiers.shiftKey) {
      this._selection.toggle(elementId);
    } else if (!this._selection.has(elementId)) {
      this._selection.select(elementId);
    }
  }

  /**
   * Called on PixiJS pointermove on canvas element or canvas itself.
   * @param {{ x: number, y: number }} canvasPos
   */
  onPointerMove(canvasPos) {
    if (!this._pointerDown) return;

    const dx = Math.abs(canvasPos.x - this._downPos.x);
    const dy = Math.abs(canvasPos.y - this._downPos.y);
    const moved = dx > this._DRAG_THRESHOLD || dy > this._DRAG_THRESHOLD;

    if (moved && !this._pointerMoved) {
      this._pointerMoved = true;
      // Start appropriate drag
      if (this._downTarget?.type === 'element') {
        this._drag.startDrag(this._downTarget.id, this._downPos);
      } else if (this._downTarget?.type === 'handle') {
        this._resize.startResize(
          this._downTarget.id, this._downTarget.handle,
          this._downPos
        );
      }
    }

    if (this._drag.isDragging) this._drag.moveDrag(canvasPos);
    if (this._resize.isResizing) this._resize.moveResize(canvasPos);
  }

  /**
   * Called on pointerup.
   * @param {{ x: number, y: number }} canvasPos
   */
  onPointerUp(canvasPos) {
    if (!this._pointerDown) return;
    this._pointerDown = false;

    if (this._drag.isDragging) {
      this._drag.endDrag();
    } else if (this._resize.isResizing) {
      this._resize.endResize();
    }
    // else: it was just a click, selection already set in pointerDown
  }

  /**
   * Called on pointerdown on the canvas background (no element hit).
   */
  onCanvasPointerDown(canvasPos, modifiers = {}) {
    this._pointerDown = true;
    this._pointerMoved = false;
    this._downPos = canvasPos;
    this._downTarget = { type: 'canvas' };

    if (!modifiers.shiftKey) {
      this._selection.clear();
    }

    // Close text editor if open
    if (this._textEdit.isEditing) {
      this._textEdit.endEdit();
    }
  }

  /**
   * Called on double-click on an element.
   * @param {string} elementId
   * @param {{ x: number, y: number }} canvasPos
   */
  onElementDoubleClick(elementId, canvasPos) {
    const el = this._scene.getElementById(elementId);
    if (!el) return;

    if (el.type === 'text' && el.editable) {
      const bounds = this._layoutCache.get(elementId);
      if (bounds) {
        this._textEdit.startEdit(elementId, bounds, this._scale);
      }
    }
  }

  /**
   * Called by PixiJS when a resize handle is pressed.
   * @param {string} elementId
   * @param {string} handle - 'nw'|'n'|'ne'|'e'|'se'|'s'|'sw'|'w'
   * @param {{ x: number, y: number }} canvasPos
   */
  onHandlePointerDown(elementId, handle, canvasPos) {
    this._pointerDown = true;
    this._pointerMoved = false;
    this._downPos = canvasPos;
    this._downTarget = { type: 'handle', id: elementId, handle };
  }

  // ─── Panel Drop ────────────────────────────────────────────────────────────

  /**
   * Called when an element is dropped from the left panel onto the canvas.
   * @param {{ type: string, src?: string, content?: string }} dragData
   * @param {{ x: number, y: number }} canvasPos
   * @param {string|null} targetParentId - id of box under drop point, or null
   */
  onDropFromPanel(dragData, canvasPos, targetParentId = null) {
    const defaults = this._config.defaults;
    let element;

    switch (dragData.type) {
      case 'box':
        element = new BoxModel({
          x: canvasPos.x,
          y: canvasPos.y,
          parentId: targetParentId,
          free: !targetParentId,
          ...defaults.box,
        });
        break;
      case 'image':
        element = new ImageModel({
          x: canvasPos.x,
          y: canvasPos.y,
          src: dragData.src ?? '',
          parentId: targetParentId,
          free: !targetParentId,
          ...defaults.image,
        });
        break;
      case 'text':
        element = new TextModel({
          x: canvasPos.x,
          y: canvasPos.y,
          content: dragData.content ?? 'Text',
          parentId: targetParentId,
          free: !targetParentId,
          ...defaults.text,
        });
        break;
      default:
        console.warn(`[InteractionEngine] Unknown drop type: "${dragData.type}"`);
        return;
    }

    this._history.execute(new AddElementCommand(this._scene, this._bus, element));
    this._selection.select(element.id);
    this._bus.emit(Events.DROP_FROM_PANEL, { element, canvasPos });
  }

  // ─── Free toggle from properties panel ────────────────────────────────────

  toggleFree(elementId, makeFree) {
    const el = this._scene.getElementById(elementId);
    if (!el) return;
    const bounds = this._layoutCache.get(elementId);
    const canvasPos = bounds ? { x: bounds.x, y: bounds.y } : { x: el.x, y: el.y };
    this._history.execute(
      new FreeCommand(this._scene, this._bus, elementId, makeFree, canvasPos)
    );
  }

  // ─── Keyboard ─────────────────────────────────────────────────────────────

  _bindKeyboard() {
    window.addEventListener('keydown', (e) => {
      // Don't intercept when typing in inputs/contenteditable
      const target = e.target;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) return;

      const ctrl = e.ctrlKey || e.metaKey;

      if (ctrl && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        this._bus.emit('editor:undo');
      }
      if (ctrl && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        this._bus.emit('editor:redo');
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (this._selection.count > 0) {
          e.preventDefault();
          this._bus.emit('editor:delete-selected');
        }
      }
      if (e.key === 'Escape') {
        this._selection.clear();
        if (this._textEdit.isEditing) this._textEdit.endEdit();
        if (this._drag.isDragging) this._drag.cancelDrag();
      }

      // Arrow key nudge (1px, or 10px with Shift)
      const nudge = e.shiftKey ? 10 : 1;
      const arrowMap = { ArrowLeft: [-nudge,0], ArrowRight: [nudge,0], ArrowUp: [0,-nudge], ArrowDown: [0,nudge] };
      if (arrowMap[e.key] && this._selection.primary) {
        e.preventDefault();
        const [dx, dy] = arrowMap[e.key];
        const id = this._selection.primary;
        const el = this._scene.getElementById(id);
        if (el) {
          const { MoveCommand } = _Commands;
          this._history.execute(
            new MoveCommand(this._scene, this._bus, id, { x: el.x + dx, y: el.y + dy }, { x: el.x, y: el.y })
          );
        }
      }
    });
  }

  _bindBusEvents() {
    this._bus.on('editor:undo', () => this._history.undo());
    this._bus.on('editor:redo', () => this._history.redo());
    this._bus.on('editor:delete-selected', () => {
      const { RemoveElementCommand } = _Commands;
      this._selection.ids.forEach((id) => {
        this._history.execute(new RemoveElementCommand(this._scene, this._bus, id));
        this._selection.remove(id);
      });
    });
  }

  get textEditManager() { return this._textEdit; }
  get dragManager() { return this._drag; }
  get resizeManager() { return this._resize; }
}

// Lazy import
const _Commands = {};
import('../commands/Commands.js').then((m) => Object.assign(_Commands, m));
