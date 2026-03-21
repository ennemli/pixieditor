import { StyleModel } from './StyleModel.js';
import { generateId } from '../utils/IdGenerator.js';

/**
 * ElementModel — Abstract Base (Template Method Pattern)
 *
 * All editor elements (Box, Image, Text) extend this.
 * Concrete subclasses implement type, defaultStyle(), and toJSON()/fromJSON().
 *
 * Key concepts:
 * - `free`: when true, element escapes all ancestors and sits on root canvas,
 *           positioned absolutely via (x, y). When false, positioned by parent layout.
 * - `width`/`height`: can be a pixel number OR a Tailwind-style fraction string
 *                     ('1/2', 'full', '3/5', 'auto') resolved at render time.
 * - `zIndex`: controls paint order among siblings (or root canvas when free).
 * - `parentId`: null → child of root canvas. string → child of that BoxModel.
 */
export class ElementModel {
  /**
   * @param {object} props
   */
  constructor(props = {}) {
    /** @type {string} Unique element identifier */
    this.id = props.id ?? generateId();

    /** @type {'box'|'image'|'text'} */
    this.type = props.type ?? 'box';

    /** @type {string|null} Parent element id, null = root canvas */
    this.parentId = props.parentId ?? null;

    // ─── Position ──────────────────────────────────────────────────────
    /**
     * x/y position.
     * When free=true → absolute position on root canvas (px).
     * When free=false → offset within parent flow (px or 0 for flow layout).
     */
    this.x = props.x ?? 0;
    this.y = props.y ?? 0;

    // ─── Size ──────────────────────────────────────────────────────────
    /**
     * width/height can be:
     *   - number (px)
     *   - string fraction: '1/2', '1/3', '2/5', '3/4'
     *   - 'full'   → 100% of parent
     *   - 'auto'   → determined by content
     *   - 'half'   → alias for '1/2'
     */
    this.width = props.width ?? 200;
    this.height = props.height ?? 120;

    // ─── Layering ──────────────────────────────────────────────────────
    /** Paint order within the same parent. Higher = on top. */
    this.zIndex = props.zIndex ?? 0;

    // ─── Free mode ─────────────────────────────────────────────────────
    /**
     * When true:
     *  1. Element is removed from parent's layout flow.
     *  2. Element attaches to root canvas as a direct child.
     *  3. Positioned via (this.x, this.y) as absolute canvas coordinates.
     *
     * Set via: drag attempt, properties panel toggle.
     * Remembered: original parentId is stored so it can be re-nested if un-freed.
     */
    this.free = props.free ?? false;

    /**
     * When free becomes true, we remember where this element came from.
     * If the user un-frees, we can put it back (or drop it into the element below).
     */
    this._originalParentId = props._originalParentId ?? null;

    // ─── State ─────────────────────────────────────────────────────────
    this.locked = props.locked ?? false;
    this.visible = props.visible ?? true;
    this.name = props.name ?? this._defaultName();

    // ─── Style ─────────────────────────────────────────────────────────
    this.style = props.style instanceof StyleModel
      ? props.style
      : new StyleModel({ ...this._defaultStyle(), ...(props.style ?? {}) });
  }

  // ─── Template Methods (override in subclasses) ──────────────────────

  /** @returns {object} Default style props for this element type */
  _defaultStyle() {
    return {};
  }

  /** @returns {string} */
  _defaultName() {
    return `${this.type}-${this.id.slice(-4)}`;
  }

  // ─── Style mutation (returns new instance) ──────────────────────────

  /**
   * Returns a clone of this element with merged style.
   * Used by StyleCommand — never mutate style directly.
   * @param {object} styleOverrides
   * @returns {ElementModel}
   */
  withStyle(styleOverrides) {
    const clone = this.clone();
    clone.style = this.style.merge(styleOverrides);
    return clone;
  }

  // ─── Serialization ──────────────────────────────────────────────────

  /** @returns {object} Plain JSON-serializable representation */
  toJSON() {
    return {
      id: this.id,
      type: this.type,
      parentId: this.parentId,
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
      zIndex: this.zIndex,
      free: this.free,
      _originalParentId: this._originalParentId,
      locked: this.locked,
      visible: this.visible,
      name: this.name,
      style: this.style.toJSON(),
    };
  }

  /** Shallow clone — subclasses should call super then copy their own props */
  clone() {
    const json = this.toJSON();
    // Don't re-generate id — clone is used for undo/redo snapshots
    return ElementModel.fromJSON(json);
  }

  /**
   * Factory — delegates to concrete subclass based on type.
   * Import lazily to avoid circular deps.
   */
  static fromJSON(json) {
    const { type } = json;
    switch (type) {
      case 'box':   return BoxModel.fromJSON(json);
      case 'image': return ImageModel.fromJSON(json);
      case 'text':  return TextModel.fromJSON(json);
      default:      throw new Error(`[ElementModel] Unknown type: "${type}"`);
    }
  }
}

// ─── Lazy circular-dep imports ─────────────────────────────────────────────
// These are resolved at runtime, not module-load time, to avoid circular deps.
let BoxModel, ImageModel, TextModel;

export function registerModels(box, image, text) {
  BoxModel = box;
  ImageModel = image;
  TextModel = text;
}
