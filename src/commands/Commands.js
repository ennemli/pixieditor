import { Command } from './Command.js';
import { Events } from '../core/EventBus.js';

// ─────────────────────────────────────────────────────────────────────────────
// MoveCommand
// ─────────────────────────────────────────────────────────────────────────────

/**
 * MoveCommand — moves one or more elements.
 * For free elements, updates (x, y) on the canvas.
 * For flow elements, updates (x, y) as layout offset.
 */
export class MoveCommand extends Command {
  /**
   * @param {import('../model/SceneModel.js').SceneModel} scene
   * @param {import('../core/EventBus.js').EventBus} bus
   * @param {string} elementId
   * @param {{ x: number, y: number }} newPos
   * @param {{ x: number, y: number }} oldPos
   */
  constructor(scene, bus, elementId, newPos, oldPos) {
    super('Move');
    this._scene = scene;
    this._bus = bus;
    this._id = elementId;
    this._newPos = { ...newPos };
    this._oldPos = { ...oldPos };
  }

  execute() {
    const el = this._scene.getElementById(this._id);
    if (!el) return;
    el.x = this._newPos.x;
    el.y = this._newPos.y;
    this._bus.emit(Events.ELEMENT_MOVED, { id: this._id, ...this._newPos });
  }

  undo() {
    const el = this._scene.getElementById(this._id);
    if (!el) return;
    el.x = this._oldPos.x;
    el.y = this._oldPos.y;
    this._bus.emit(Events.ELEMENT_MOVED, { id: this._id, ...this._oldPos });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ResizeCommand
// ─────────────────────────────────────────────────────────────────────────────

export class ResizeCommand extends Command {
  constructor(scene, bus, elementId, newRect, oldRect) {
    super('Resize');
    this._scene = scene;
    this._bus = bus;
    this._id = elementId;
    this._newRect = { ...newRect };
    this._oldRect = { ...oldRect };
  }

  execute() {
    const el = this._scene.getElementById(this._id);
    if (!el) return;
    Object.assign(el, this._newRect);
    this._bus.emit(Events.ELEMENT_RESIZED, { id: this._id, ...this._newRect });
  }

  undo() {
    const el = this._scene.getElementById(this._id);
    if (!el) return;
    Object.assign(el, this._oldRect);
    this._bus.emit(Events.ELEMENT_RESIZED, { id: this._id, ...this._oldRect });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// StyleCommand
// ─────────────────────────────────────────────────────────────────────────────

/**
 * StyleCommand — applies style overrides to an element.
 * Stores the previous style snapshot for undo.
 */
export class StyleCommand extends Command {
  constructor(scene, bus, elementId, styleOverrides) {
    super('Style');
    this._scene = scene;
    this._bus = bus;
    this._id = elementId;
    this._overrides = styleOverrides;
    // Snapshot old style at construction time (before execute)
    this._oldStyle = scene.getElementById(elementId)?.style?.toJSON() ?? {};
  }

  execute() {
    const el = this._scene.getElementById(this._id);
    if (!el) return;
    el.style = el.style.merge(this._overrides);
    this._bus.emit(Events.ELEMENT_STYLE_CHANGED, { id: this._id, style: el.style });
  }

  undo() {
    const el = this._scene.getElementById(this._id);
    if (!el) return;
    const { StyleModel } = _StyleModule;
    el.style = StyleModel.fromJSON(this._oldStyle);
    this._bus.emit(Events.ELEMENT_STYLE_CHANGED, { id: this._id, style: el.style });
  }
}
// Lazy import to avoid circular dep
const _StyleModule = { StyleModel: null };
import('../model/StyleModel.js').then((m) => { _StyleModule.StyleModel = m.StyleModel; });

// ─────────────────────────────────────────────────────────────────────────────
// AddElementCommand
// ─────────────────────────────────────────────────────────────────────────────

export class AddElementCommand extends Command {
  constructor(scene, bus, element) {
    super(`Add ${element.type}`);
    this._scene = scene;
    this._bus = bus;
    this._element = element;
  }

  execute() {
    this._scene.addElement(this._element);
    this._bus.emit(Events.ELEMENT_ADDED, { element: this._element });
    this._bus.emit(Events.SCENE_CHANGED);
  }

  undo() {
    this._scene.removeElement(this._element.id);
    this._bus.emit(Events.ELEMENT_REMOVED, { id: this._element.id });
    this._bus.emit(Events.SCENE_CHANGED);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// RemoveElementCommand
// ─────────────────────────────────────────────────────────────────────────────

export class RemoveElementCommand extends Command {
  constructor(scene, bus, elementId) {
    super('Delete');
    this._scene = scene;
    this._bus = bus;
    this._id = elementId;
    // Snapshot the full element (and its children) before deletion
    this._snapshot = this._captureSubtree(elementId);
  }

  execute() {
    this._scene.removeElement(this._id);
    this._bus.emit(Events.ELEMENT_REMOVED, { id: this._id });
    this._bus.emit(Events.SCENE_CHANGED);
  }

  undo() {
    // Restore all snapshotted elements
    this._snapshot.forEach((el) => this._scene.addElement(el));
    this._bus.emit(Events.ELEMENT_ADDED, { element: this._scene.getElementById(this._id) });
    this._bus.emit(Events.SCENE_CHANGED);
  }

  _captureSubtree(id) {
    const results = [];
    const el = this._scene.getElementById(id);
    if (!el) return results;
    results.push(el.clone());
    if (el.children) {
      el.children.forEach((childId) => {
        results.push(...this._captureSubtree(childId));
      });
    }
    return results;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ReorderCommand
// ─────────────────────────────────────────────────────────────────────────────

export class ReorderCommand extends Command {
  constructor(scene, bus, elementId, direction) {
    super('Reorder layer');
    this._scene = scene;
    this._bus = bus;
    this._id = elementId;
    this._direction = direction;
    this._oldZIndex = scene.getElementById(elementId)?.zIndex ?? 0;
  }

  execute() {
    this._scene.reorder(this._id, this._direction);
    const el = this._scene.getElementById(this._id);
    this._newZIndex = el?.zIndex ?? this._oldZIndex;
    this._bus.emit(Events.ELEMENT_REORDERED, { id: this._id, zIndex: this._newZIndex });
  }

  undo() {
    const el = this._scene.getElementById(this._id);
    if (!el) return;
    el.zIndex = this._oldZIndex;
    this._bus.emit(Events.ELEMENT_REORDERED, { id: this._id, zIndex: this._oldZIndex });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// FreeCommand
// ─────────────────────────────────────────────────────────────────────────────

/**
 * FreeCommand — toggles the `free` property.
 * When freeing: detaches from parent, places at canvasPos on root.
 * When un-freeing: returns to original parent (or re-nests under targetParentId).
 */
export class FreeCommand extends Command {
  constructor(scene, bus, elementId, makeFree, canvasPos, targetParentId = null) {
    super(makeFree ? 'Make free' : 'Embed element');
    this._scene = scene;
    this._bus = bus;
    this._id = elementId;
    this._makeFree = makeFree;
    this._canvasPos = canvasPos;
    this._targetParentId = targetParentId;

    // Snapshot state before change
    const el = scene.getElementById(elementId);
    this._prevFree = el?.free ?? false;
    this._prevParentId = el?.parentId ?? null;
    this._prevPos = el ? { x: el.x, y: el.y } : { x: 0, y: 0 };
    this._prevOriginalParentId = el?._originalParentId ?? null;
  }

  execute() {
    if (this._makeFree) {
      this._scene.freeElement(this._id, this._canvasPos);
    } else {
      this._scene.unfreeElement(this._id, this._targetParentId);
    }
    const el = this._scene.getElementById(this._id);
    this._bus.emit(Events.ELEMENT_FREE_CHANGED, { id: this._id, free: el?.free });
    this._bus.emit(Events.SCENE_CHANGED);
  }

  undo() {
    const el = this._scene.getElementById(this._id);
    if (!el) return;

    if (this._makeFree) {
      // Undo freeing → put back in original parent
      this._scene.unfreeElement(this._id, this._prevParentId);
    } else {
      // Undo un-freeing → make free again at previous position
      this._scene.freeElement(this._id, this._prevPos);
    }
    const updated = this._scene.getElementById(this._id);
    this._bus.emit(Events.ELEMENT_FREE_CHANGED, { id: this._id, free: updated?.free });
    this._bus.emit(Events.SCENE_CHANGED);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// TextContentCommand
// ─────────────────────────────────────────────────────────────────────────────

export class TextContentCommand extends Command {
  constructor(scene, bus, elementId, newContent, oldContent) {
    super('Edit text');
    this._scene = scene;
    this._bus = bus;
    this._id = elementId;
    this._newContent = newContent;
    this._oldContent = oldContent;
  }

  execute() {
    const el = this._scene.getElementById(this._id);
    if (!el) return;
    el.content = this._newContent;
    this._bus.emit(Events.ELEMENT_STYLE_CHANGED, { id: this._id });
  }

  undo() {
    const el = this._scene.getElementById(this._id);
    if (!el) return;
    el.content = this._oldContent;
    this._bus.emit(Events.ELEMENT_STYLE_CHANGED, { id: this._id });
  }
}
