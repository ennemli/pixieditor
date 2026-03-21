import { Events } from '../core/EventBus.js';
import { StyleCommand } from '../commands/Commands.js';

// ─────────────────────────────────────────────────────────────────────────────
// IFormat — Interface (Strategy Pattern)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * IFormat — Abstract format strategy.
 *
 * Each format knows:
 *  - Its id and display name
 *  - Which element types it applies to
 *  - How to apply itself (producing a StyleCommand)
 *  - How to read its current value from a StyleModel
 *  - What UI component should render it (component name for the panel)
 */
export class IFormat {
  constructor({ id, name, group, targets, component }) {
    this.id = id;
    this.name = name;
    this.group = group ?? 'general'; // UI grouping in the panel
    /** @type {string[]} element types this format applies to */
    this.targets = targets ?? ['box', 'text', 'image'];
    /** UI component hint for the panel to render */
    this.component = component ?? 'input';
  }

  /**
   * Apply this format to an element.
   * @param {object} params
   * @param {import('../model/SceneModel.js').SceneModel} params.scene
   * @param {import('../core/EventBus.js').EventBus} params.bus
   * @param {import('../core/History.js').History} params.history
   * @param {string} params.elementId
   * @param {*} params.value - format-specific value
   */
  apply({ scene, bus, history, elementId, value }) {
    throw new Error(`IFormat "${this.id}" must implement apply()`);
  }

  /**
   * Read the current value of this format from a StyleModel.
   * @param {import('../model/StyleModel.js').StyleModel} style
   * @returns {*}
   */
  read(style) {
    throw new Error(`IFormat "${this.id}" must implement read()`);
  }

  /** Returns true if this format applies to the given element type */
  appliesTo(type) {
    return this.targets.includes(type);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Concrete Formats
// ─────────────────────────────────────────────────────────────────────────────

export class BackgroundColorFormat extends IFormat {
  constructor() {
    super({ id: 'backgroundColor', name: 'Background Color', group: 'background',
            targets: ['box', 'text'], component: 'color-picker' });
  }
  apply({ scene, bus, history, elementId, value }) {
    history.execute(new StyleCommand(scene, bus, elementId, { backgroundColor: value }));
  }
  read(style) { return style.backgroundColor; }
}

export class BackgroundImageFormat extends IFormat {
  constructor() {
    super({ id: 'backgroundImage', name: 'Background Image', group: 'background',
            targets: ['box'], component: 'image-url' });
  }
  apply({ scene, bus, history, elementId, value }) {
    history.execute(new StyleCommand(scene, bus, elementId, {
      backgroundImage: value,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    }));
  }
  read(style) { return style.backgroundImage; }
}

export class BackgroundSizeFormat extends IFormat {
  constructor() {
    super({ id: 'backgroundSize', name: 'Background Size', group: 'background',
            targets: ['box'], component: 'select',
            options: ['cover', 'contain', 'auto'] });
  }
  apply({ scene, bus, history, elementId, value }) {
    history.execute(new StyleCommand(scene, bus, elementId, { backgroundSize: value }));
  }
  read(style) { return style.backgroundSize; }
}

export class ColorFormat extends IFormat {
  constructor() {
    super({ id: 'color', name: 'Text Color', group: 'typography',
            targets: ['text'], component: 'color-picker' });
  }
  apply({ scene, bus, history, elementId, value }) {
    history.execute(new StyleCommand(scene, bus, elementId, { color: value }));
  }
  read(style) { return style.color; }
}

export class OpacityFormat extends IFormat {
  constructor() {
    super({ id: 'opacity', name: 'Opacity', group: 'appearance',
            targets: ['box', 'text', 'image'], component: 'slider',
            min: 0, max: 1, step: 0.01 });
  }
  apply({ scene, bus, history, elementId, value }) {
    history.execute(new StyleCommand(scene, bus, elementId, { opacity: parseFloat(value) }));
  }
  read(style) { return style.opacity; }
}

export class PaddingFormat extends IFormat {
  constructor() {
    super({ id: 'padding', name: 'Padding', group: 'spacing',
            targets: ['box', 'text'], component: 'spacing-editor' });
  }
  apply({ scene, bus, history, elementId, value }) {
    // value: { top, right, bottom, left } or single number (all sides)
    const padding = typeof value === 'number'
      ? { top: value, right: value, bottom: value, left: value }
      : value;
    history.execute(new StyleCommand(scene, bus, elementId, { padding }));
  }
  read(style) { return style.padding; }
}

export class BorderRadiusFormat extends IFormat {
  constructor() {
    super({ id: 'borderRadius', name: 'Border Radius', group: 'border',
            targets: ['box', 'image', 'text'], component: 'slider',
            min: 0, max: 200, step: 1 });
  }
  apply({ scene, bus, history, elementId, value }) {
    history.execute(new StyleCommand(scene, bus, elementId, {
      borderRadius: parseInt(value, 10),
      circle: false, // border radius overrides circle
    }));
  }
  read(style) { return style.borderRadius; }
}

export class CircleFormat extends IFormat {
  constructor() {
    super({ id: 'circle', name: 'Circle', group: 'shape',
            targets: ['box', 'image'], component: 'toggle' });
  }
  apply({ scene, bus, history, elementId, value }) {
    history.execute(new StyleCommand(scene, bus, elementId, { circle: Boolean(value) }));
  }
  read(style) { return style.circle; }
}

export class BorderFormat extends IFormat {
  constructor() {
    super({ id: 'border', name: 'Border', group: 'border',
            targets: ['box', 'text', 'image'], component: 'border-editor' });
  }
  apply({ scene, bus, history, elementId, value }) {
    // value: { width, style, color }
    history.execute(new StyleCommand(scene, bus, elementId, {
      borderWidth: value.width ?? 0,
      borderStyle: value.style ?? 'solid',
      borderColor: value.color ?? '#000000',
    }));
  }
  read(style) {
    return { width: style.borderWidth, style: style.borderStyle, color: style.borderColor };
  }
}

export class BoxShadowFormat extends IFormat {
  constructor() {
    super({ id: 'boxShadow', name: 'Shadow', group: 'appearance',
            targets: ['box', 'image'], component: 'shadow-editor' });
  }
  apply({ scene, bus, history, elementId, value }) {
    history.execute(new StyleCommand(scene, bus, elementId, { boxShadow: value }));
  }
  read(style) { return style.boxShadow; }
}

// Typography formats
export class FontFamilyFormat extends IFormat {
  constructor() {
    super({ id: 'fontFamily', name: 'Font', group: 'typography',
            targets: ['text'], component: 'font-picker' });
  }
  apply({ scene, bus, history, elementId, value }) {
    history.execute(new StyleCommand(scene, bus, elementId, { fontFamily: value }));
  }
  read(style) { return style.fontFamily; }
}

export class FontSizeFormat extends IFormat {
  constructor() {
    super({ id: 'fontSize', name: 'Font Size', group: 'typography',
            targets: ['text'], component: 'number-input',
            min: 8, max: 200, step: 1 });
  }
  apply({ scene, bus, history, elementId, value }) {
    history.execute(new StyleCommand(scene, bus, elementId, { fontSize: parseInt(value, 10) }));
  }
  read(style) { return style.fontSize; }
}

export class FontWeightFormat extends IFormat {
  constructor() {
    super({ id: 'fontWeight', name: 'Font Weight', group: 'typography',
            targets: ['text'], component: 'select',
            options: ['100','200','300','400','500','600','700','800','900'] });
  }
  apply({ scene, bus, history, elementId, value }) {
    history.execute(new StyleCommand(scene, bus, elementId, { fontWeight: value }));
  }
  read(style) { return style.fontWeight; }
}

export class TextAlignFormat extends IFormat {
  constructor() {
    super({ id: 'textAlign', name: 'Text Align', group: 'typography',
            targets: ['text'], component: 'icon-select',
            options: ['left','center','right','justify'] });
  }
  apply({ scene, bus, history, elementId, value }) {
    history.execute(new StyleCommand(scene, bus, elementId, { textAlign: value }));
  }
  read(style) { return style.textAlign; }
}

export class LineHeightFormat extends IFormat {
  constructor() {
    super({ id: 'lineHeight', name: 'Line Height', group: 'typography',
            targets: ['text'], component: 'slider', min: 0.8, max: 4, step: 0.1 });
  }
  apply({ scene, bus, history, elementId, value }) {
    history.execute(new StyleCommand(scene, bus, elementId, { lineHeight: parseFloat(value) }));
  }
  read(style) { return style.lineHeight; }
}

export class OverflowFormat extends IFormat {
  constructor() {
    super({ id: 'overflow', name: 'Overflow', group: 'layout',
            targets: ['box'], component: 'select', options: ['visible','hidden'] });
  }
  apply({ scene, bus, history, elementId, value }) {
    history.execute(new StyleCommand(scene, bus, elementId, { overflow: value }));
  }
  read(style) { return style.overflow; }
}

// ─────────────────────────────────────────────────────────────────────────────
// FormatRegistry — Registry Pattern
// ─────────────────────────────────────────────────────────────────────────────

/**
 * FormatRegistry — owns all format instances.
 *
 * Open/Closed: consumers register custom formats without modifying existing code.
 * Used by the PropertiesPanel to discover which formats to show for a selected element.
 */
export class FormatRegistry {
  constructor() {
    /** @type {Map<string, IFormat>} */
    this._formats = new Map();
    this._registerDefaults();
  }

  _registerDefaults() {
    [
      new BackgroundColorFormat(),
      new BackgroundImageFormat(),
      new BackgroundSizeFormat(),
      new ColorFormat(),
      new OpacityFormat(),
      new PaddingFormat(),
      new BorderRadiusFormat(),
      new CircleFormat(),
      new BorderFormat(),
      new BoxShadowFormat(),
      new FontFamilyFormat(),
      new FontSizeFormat(),
      new FontWeightFormat(),
      new TextAlignFormat(),
      new LineHeightFormat(),
      new OverflowFormat(),
    ].forEach((f) => this.register(f));
  }

  /**
   * Register a format (including custom consumer formats).
   * @param {IFormat} format
   */
  register(format) {
    this._formats.set(format.id, format);
  }

  /**
   * Get formats applicable to a given element type.
   * @param {string} type - 'box' | 'text' | 'image'
   * @returns {IFormat[]}
   */
  getForElement(type) {
    return [...this._formats.values()].filter((f) => f.appliesTo(type));
  }

  /**
   * Get formats grouped for panel display.
   * @param {string} type
   * @returns {Map<string, IFormat[]>} group → formats
   */
  getGroupedForElement(type) {
    const groups = new Map();
    this.getForElement(type).forEach((f) => {
      if (!groups.has(f.group)) groups.set(f.group, []);
      groups.get(f.group).push(f);
    });
    return groups;
  }

  getById(id) {
    return this._formats.get(id);
  }

  getAll() {
    return [...this._formats.values()];
  }
}
