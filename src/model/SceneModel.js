import { BoxModel } from './Elements.js';

/**
 * SceneModel — Aggregate Root
 *
 * The single source of truth for editor state.
 * - Owns a flat map of ALL elements keyed by id.
 * - Owns an ordered list of root-level element ids (children of the canvas).
 * - Free elements always live here regardless of original parent.
 *
 * Satisfies SRP: SceneModel only manages the tree structure and lookup.
 * It does NOT render, dispatch events, or apply commands.
 *
 * All mutation methods return `this` for fluent chaining.
 * Commands call these methods directly; the EditorEngine notifies via EventBus.
 */
export class SceneModel {
  constructor(props = {}) {
    /** @type {Map<string, import('./ElementModel.js').ElementModel>} */
    this._elements = new Map();

    /**
     * Ordered root-level element ids.
     * Root = direct children of the canvas (not nested in any Box).
     * Includes: free elements + non-nested top-level elements.
     * @type {string[]}
     */
    this.rootIds = props.rootIds ?? [];

    /** Canvas metadata */
    this.width = props.width ?? 1200;
    this.height = props.height ?? 800;
    this.background = props.background ?? '#f0f0f0';

    /** Restore elements from JSON if provided */
    if (props.elements) {
      props.elements.forEach((el) => this._elements.set(el.id, el));
    }
  }

  // ─── Element CRUD ────────────────────────────────────────────────────

  /**
   * Add an element to the scene.
   * If parentId is null → added to root.
   * If parentId is set → added to that box's children.
   * @param {import('./ElementModel.js').ElementModel} element
   */
  addElement(element) {
    this._elements.set(element.id, element);
    if (!element.parentId || element.free) {
      this._addToRoot(element.id, element.zIndex);
    } else {
      const parent = this.getElementById(element.parentId);
      if (parent instanceof BoxModel) {
        parent.addChild(element.id);
      }
    }
    return this;
  }

  /**
   * Remove an element (and all its descendants) from the scene.
   * @param {string} id
   */
  removeElement(id) {
    const element = this.getElementById(id);
    if (!element) return this;

    // Recursively remove children first
    if (element.children) {
      [...element.children].forEach((childId) => this.removeElement(childId));
    }

    // Remove from parent's child list
    if (element.parentId && !element.free) {
      const parent = this.getElementById(element.parentId);
      if (parent instanceof BoxModel) {
        parent.removeChild(id);
      }
    } else {
      this.rootIds = this.rootIds.filter((rid) => rid !== id);
    }

    this._elements.delete(id);
    return this;
  }

  /**
   * Replace an element model in-place (used by commands for undo/redo).
   * @param {import('./ElementModel.js').ElementModel} element
   */
  replaceElement(element) {
    if (!this._elements.has(element.id)) {
      throw new Error(`[SceneModel] replaceElement: element "${element.id}" not found`);
    }
    this._elements.set(element.id, element);
    return this;
  }

  /** @returns {import('./ElementModel.js').ElementModel|undefined} */
  getElementById(id) {
    return this._elements.get(id);
  }

  /** @returns {import('./ElementModel.js').ElementModel[]} */
  getAllElements() {
    return [...this._elements.values()];
  }

  /** @returns {import('./ElementModel.js').ElementModel[]} Root-level elements in zIndex order */
  getRootElements() {
    return this.rootIds
      .map((id) => this._elements.get(id))
      .filter(Boolean)
      .sort((a, b) => a.zIndex - b.zIndex);
  }

  /**
   * Get direct children of a box, sorted by zIndex.
   * @param {string} boxId
   * @returns {import('./ElementModel.js').ElementModel[]}
   */
  getChildren(boxId) {
    const box = this.getElementById(boxId);
    if (!(box instanceof BoxModel)) return [];
    return box.children
      .map((id) => this._elements.get(id))
      .filter(Boolean)
      .sort((a, b) => a.zIndex - b.zIndex);
  }

  // ─── Free mode ───────────────────────────────────────────────────────

  /**
   * Make an element free: detach from parent, attach to root canvas.
   * @param {string} id
   * @param {{ x: number, y: number }} canvasPos - absolute position on canvas
   */
  freeElement(id, canvasPos) {
    const el = this.getElementById(id);
    if (!el || el.free) return this;

    // Store original parent for potential un-free
    el._originalParentId = el.parentId;

    // Remove from parent's child list
    if (el.parentId) {
      const parent = this.getElementById(el.parentId);
      if (parent instanceof BoxModel) {
        parent.removeChild(id);
      }
    } else {
      this.rootIds = this.rootIds.filter((rid) => rid !== id);
    }

    // Attach to root
    el.parentId = null;
    el.free = true;
    el.x = canvasPos.x;
    el.y = canvasPos.y;
    this._addToRoot(id, el.zIndex);

    return this;
  }

  /**
   * Un-free an element: try to re-nest into element below (or back to original parent).
   * @param {string} id
   * @param {string|null} targetParentId
   */
  unfreeElement(id, targetParentId = null) {
    const el = this.getElementById(id);
    if (!el || !el.free) return this;

    // Remove from root
    this.rootIds = this.rootIds.filter((rid) => rid !== id);

    const newParentId = targetParentId ?? el._originalParentId ?? null;
    el.free = false;
    el._originalParentId = null;
    el.parentId = newParentId;

    if (newParentId) {
      const parent = this.getElementById(newParentId);
      if (parent instanceof BoxModel) {
        parent.addChild(id);
      }
    } else {
      this._addToRoot(id, el.zIndex);
    }

    return this;
  }

  // ─── Layer reordering ────────────────────────────────────────────────

  /**
   * Change zIndex of an element relative to its siblings.
   * @param {string} id
   * @param {'up'|'down'|'top'|'bottom'|number} direction
   */
  reorder(id, direction) {
    const el = this.getElementById(id);
    if (!el) return this;

    const siblings = this._getSiblings(el);
    const maxZ = siblings.reduce((m, s) => Math.max(m, s.zIndex), 0);
    const minZ = siblings.reduce((m, s) => Math.min(m, s.zIndex), 0);

    switch (direction) {
      case 'up':
        el.zIndex = Math.min(el.zIndex + 1, maxZ + 1);
        break;
      case 'down':
        el.zIndex = Math.max(el.zIndex - 1, minZ - 1);
        break;
      case 'top':
        el.zIndex = maxZ + 1;
        break;
      case 'bottom':
        el.zIndex = minZ - 1;
        break;
      default:
        if (typeof direction === 'number') el.zIndex = direction;
    }
    return this;
  }

  // ─── Serialization ───────────────────────────────────────────────────

  toJSON() {
    return {
      width: this.width,
      height: this.height,
      background: this.background,
      rootIds: [...this.rootIds],
      elements: [...this._elements.values()].map((el) => el.toJSON()),
    };
  }

  static fromJSON(json, ElementModel) {
    const scene = new SceneModel({
      width: json.width,
      height: json.height,
      background: json.background,
      rootIds: json.rootIds,
    });
    (json.elements ?? []).forEach((elJson) => {
      const el = ElementModel.fromJSON(elJson);
      scene._elements.set(el.id, el);
    });
    return scene;
  }

  // ─── Private helpers ─────────────────────────────────────────────────

  _addToRoot(id, zIndex = 0) {
    if (!this.rootIds.includes(id)) {
      this.rootIds.push(id);
    }
  }

  _getSiblings(el) {
    if (el.parentId && !el.free) {
      const parent = this.getElementById(el.parentId);
      if (parent instanceof BoxModel) {
        return parent.children.map((id) => this.getElementById(id)).filter(Boolean);
      }
    }
    return this.rootIds.map((id) => this.getElementById(id)).filter(Boolean);
  }
}
