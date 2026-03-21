import { ElementModel } from './ElementModel.js';
import { StyleModel } from './StyleModel.js';

// ─────────────────────────────────────────────────────────────────────────────
// BoxModel
// ─────────────────────────────────────────────────────────────────────────────

/**
 * BoxModel — Container element
 *
 * Can nest any other element type including other Boxes.
 * Supports background image/color and all layout properties.
 * Children are positioned relative to this box unless they become free.
 */
export class BoxModel extends ElementModel {
  constructor(props = {}) {
    super({ type: 'box', ...props });
    /**
     * Ordered child element IDs.
     * Actual child models live in SceneModel._elements.
     * zIndex within children determines paint order.
     * @type {string[]}
     */
    this.children = props.children ?? [];
  }

  _defaultStyle() {
    return {
      backgroundColor: '#ffffff',
      borderRadius: 0,
      padding: { top: 8, right: 8, bottom: 8, left: 8 },
      overflow: 'visible',
    };
  }

  _defaultName() {
    return `Box`;
  }

  /** Add a child id (ordered). */
  addChild(id) {
    if (!this.children.includes(id)) {
      this.children = [...this.children, id];
    }
  }

  /** Remove a child id. */
  removeChild(id) {
    this.children = this.children.filter((c) => c !== id);
  }

  clone() {
    const json = this.toJSON();
    return BoxModel.fromJSON(json);
  }

  toJSON() {
    return { ...super.toJSON(), children: [...this.children] };
  }

  static fromJSON(json) {
    return new BoxModel({
      ...json,
      style: StyleModel.fromJSON(json.style ?? {}),
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ImageModel
// ─────────────────────────────────────────────────────────────────────────────

/**
 * ImageModel — Image element.
 * Can be placed standalone or nested inside a Box.
 * `src` is the image URL. `alt` for accessibility.
 * `objectFit` mirrors CSS object-fit: 'cover' | 'contain' | 'fill' | 'none'.
 */
export class ImageModel extends ElementModel {
  constructor(props = {}) {
    super({ type: 'image', ...props });
    this.src = props.src ?? '';
    this.alt = props.alt ?? '';
    this.objectFit = props.objectFit ?? 'cover';
  }

  _defaultStyle() {
    return {
      borderRadius: 0,
      opacity: 1,
    };
  }

  _defaultName() {
    return `Image`;
  }

  clone() {
    return ImageModel.fromJSON(this.toJSON());
  }

  toJSON() {
    return {
      ...super.toJSON(),
      src: this.src,
      alt: this.alt,
      objectFit: this.objectFit,
    };
  }

  static fromJSON(json) {
    return new ImageModel({
      ...json,
      style: StyleModel.fromJSON(json.style ?? {}),
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// TextModel
// ─────────────────────────────────────────────────────────────────────────────

/**
 * TextModel — Inline or block text element.
 *
 * Content stored as rich HTML string (produced by DOM overlay editor).
 * Bubble menu applies inline formatting (<strong>, <em>, color spans, etc.)
 * which is stored here and re-applied when the overlay initialises.
 *
 * `autoHeight`: when true, element grows vertically to fit content.
 */
export class TextModel extends ElementModel {
  constructor(props = {}) {
    super({ type: 'text', ...props });
    /** HTML content string */
    this.content = props.content ?? 'Text';
    /** Grow height to fit content when true */
    this.autoHeight = props.autoHeight ?? true;
    /** Inline editable (double-click to edit) */
    this.editable = props.editable ?? true;
  }

  _defaultStyle() {
    return {
      backgroundColor: null,
      color: '#1a1a1a',
      fontSize: 16,
      fontWeight: '400',
      fontFamily: 'Inter',
      textAlign: 'left',
      lineHeight: 1.5,
      letterSpacing: 0,
      padding: { top: 4, right: 4, bottom: 4, left: 4 },
    };
  }

  _defaultName() {
    return `Text`;
  }

  clone() {
    return TextModel.fromJSON(this.toJSON());
  }

  toJSON() {
    return {
      ...super.toJSON(),
      content: this.content,
      autoHeight: this.autoHeight,
      editable: this.editable,
    };
  }

  static fromJSON(json) {
    return new TextModel({
      ...json,
      style: StyleModel.fromJSON(json.style ?? {}),
    });
  }

  /** Plain text stripped of HTML tags (for search / accessibility). */
  get plainText() {
    return this.content.replace(/<[^>]*>/g, '');
  }
}
