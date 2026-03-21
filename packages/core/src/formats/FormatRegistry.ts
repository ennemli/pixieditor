import type { ElementType, FormatControl, FormatId, IFormatDefinition } from '../models/types';

// ─── FormatRegistry ───────────────────────────────────────────────────────────

/**
 * Registry for all format definitions.
 * Open for extension: consumers register custom formats.
 */
export class FormatRegistry {
  private readonly formats = new Map<FormatId, IFormatDefinition>();

  register(format: IFormatDefinition): void {
    this.formats.set(format.id, format);
  }

  unregister(id: FormatId): void {
    this.formats.delete(id);
  }

  get(id: FormatId): IFormatDefinition | undefined {
    return this.formats.get(id);
  }

  getAll(): IFormatDefinition[] {
    return Array.from(this.formats.values());
  }

  getForType(type: ElementType): IFormatDefinition[] {
    return this.getAll().filter(
      (f) => f.applicableTo === 'all' || f.applicableTo.includes(type),
    );
  }
}

// ─── Built-in Format Definitions ──────────────────────────────────────────────

export const BACKGROUND_COLOR_FORMAT: IFormatDefinition = {
  id: 'background-color',
  label: 'Background Color',
  icon: '🎨',
  applicableTo: 'all',
  controls: [
    { type: 'color', key: 'backgroundColor', label: 'Color' },
  ],
  defaults: { backgroundColor: '#ffffff' },
};

export const BACKGROUND_IMAGE_FORMAT: IFormatDefinition = {
  id: 'background-image',
  label: 'Background Image',
  icon: '🖼️',
  applicableTo: ['box'],
  controls: [
    { type: 'image-picker', key: 'backgroundImage', label: 'Image URL' },
    {
      type: 'select',
      key: 'backgroundSize',
      label: 'Size',
      options: [
        { label: 'Cover', value: 'cover' },
        { label: 'Contain', value: 'contain' },
        { label: 'Fill', value: 'fill' },
        { label: 'None', value: 'none' },
      ],
    },
    {
      type: 'select',
      key: 'backgroundRepeat',
      label: 'Repeat',
      options: [
        { label: 'No Repeat', value: 'no-repeat' },
        { label: 'Repeat', value: 'repeat' },
        { label: 'Repeat X', value: 'repeat-x' },
        { label: 'Repeat Y', value: 'repeat-y' },
      ],
    },
  ],
  defaults: { backgroundSize: 'cover', backgroundRepeat: 'no-repeat' },
};

export const COLOR_FORMAT: IFormatDefinition = {
  id: 'color',
  label: 'Text Color',
  icon: '✏️',
  applicableTo: ['text'],
  controls: [
    { type: 'color', key: 'color', label: 'Color' },
  ],
  defaults: { color: '#000000' },
};

export const PADDING_FORMAT: IFormatDefinition = {
  id: 'padding',
  label: 'Padding',
  icon: '📐',
  applicableTo: 'all',
  controls: [
    { type: 'number', key: 'padding', label: 'Padding (all)', min: 0, max: 200, step: 1 },
  ],
  defaults: { padding: { top: 0, right: 0, bottom: 0, left: 0 } },
};

export const CIRCLE_FORMAT: IFormatDefinition = {
  id: 'circle',
  label: 'Circle',
  icon: '⭕',
  applicableTo: 'all',
  controls: [
    { type: 'toggle', key: 'borderRadius', label: 'Circle shape' },
  ],
  defaults: { borderRadius: 'circle' },
};

export const BORDER_FORMAT: IFormatDefinition = {
  id: 'border',
  label: 'Border',
  icon: '▭',
  applicableTo: 'all',
  controls: [
    { type: 'number', key: 'border', label: 'Width', min: 0, max: 50, step: 1 },
    { type: 'color', key: 'border', label: 'Color' },
    {
      type: 'select',
      key: 'border',
      label: 'Style',
      options: [
        { label: 'Solid', value: 'solid' },
        { label: 'Dashed', value: 'dashed' },
        { label: 'Dotted', value: 'dotted' },
        { label: 'None', value: 'none' },
      ],
    },
  ],
  defaults: { border: { width: 1, color: '#000000', style: 'solid' } },
};

export const SHADOW_FORMAT: IFormatDefinition = {
  id: 'shadow',
  label: 'Shadow',
  icon: '🌑',
  applicableTo: 'all',
  controls: [
    { type: 'number', key: 'shadow', label: 'X', min: -100, max: 100, step: 1 },
    { type: 'number', key: 'shadow', label: 'Y', min: -100, max: 100, step: 1 },
    { type: 'number', key: 'shadow', label: 'Blur', min: 0, max: 100, step: 1 },
    { type: 'color', key: 'shadow', label: 'Color' },
  ],
  defaults: { shadow: { x: 2, y: 2, blur: 4, spread: 0, color: 'rgba(0,0,0,0.3)', inset: false } },
};

export const OPACITY_FORMAT: IFormatDefinition = {
  id: 'opacity',
  label: 'Opacity',
  icon: '💧',
  applicableTo: 'all',
  controls: [
    { type: 'slider', key: 'opacity', label: 'Opacity', min: 0, max: 1, step: 0.01 },
  ],
  defaults: { opacity: 1 },
};

export const FONT_FORMAT: IFormatDefinition = {
  id: 'font',
  label: 'Font',
  icon: '🔤',
  applicableTo: ['text'],
  controls: [
    { type: 'text', key: 'fontFamily', label: 'Font Family' },
    { type: 'number', key: 'fontSize', label: 'Size', min: 6, max: 200, step: 1 },
    {
      type: 'select',
      key: 'fontWeight',
      label: 'Weight',
      options: [
        { label: 'Thin (100)', value: '100' },
        { label: 'Light (300)', value: '300' },
        { label: 'Regular (400)', value: '400' },
        { label: 'Medium (500)', value: '500' },
        { label: 'SemiBold (600)', value: '600' },
        { label: 'Bold (700)', value: '700' },
        { label: 'ExtraBold (800)', value: '800' },
        { label: 'Black (900)', value: '900' },
      ],
    },
    {
      type: 'select',
      key: 'textAlign',
      label: 'Align',
      options: [
        { label: 'Left', value: 'left' },
        { label: 'Center', value: 'center' },
        { label: 'Right', value: 'right' },
        { label: 'Justify', value: 'justify' },
      ],
    },
    { type: 'number', key: 'lineHeight', label: 'Line Height', min: 0.5, max: 5, step: 0.1 },
    { type: 'number', key: 'letterSpacing', label: 'Letter Spacing', min: -10, max: 50, step: 0.5 },
    {
      type: 'select',
      key: 'textDecoration',
      label: 'Decoration',
      options: [
        { label: 'None', value: 'none' },
        { label: 'Underline', value: 'underline' },
        { label: 'Strikethrough', value: 'line-through' },
      ],
    },
  ],
  defaults: { fontSize: 16, fontWeight: '400', textAlign: 'left', lineHeight: 1.4 },
};

export const FLEX_FORMAT: IFormatDefinition = {
  id: 'flex',
  label: 'Layout',
  icon: '⬛',
  applicableTo: ['box'],
  controls: [
    {
      type: 'select',
      key: 'display',
      label: 'Display',
      options: [
        { label: 'Block', value: 'block' },
        { label: 'Flex', value: 'flex' },
        { label: 'Grid', value: 'grid' },
      ],
    },
    {
      type: 'select',
      key: 'flexDirection',
      label: 'Direction',
      options: [
        { label: 'Row', value: 'row' },
        { label: 'Column', value: 'column' },
        { label: 'Row Reverse', value: 'row-reverse' },
        { label: 'Column Reverse', value: 'column-reverse' },
      ],
    },
    {
      type: 'select',
      key: 'justifyContent',
      label: 'Justify',
      options: [
        { label: 'Start', value: 'flex-start' },
        { label: 'Center', value: 'center' },
        { label: 'End', value: 'flex-end' },
        { label: 'Space Between', value: 'space-between' },
        { label: 'Space Around', value: 'space-around' },
      ],
    },
    {
      type: 'select',
      key: 'alignItems',
      label: 'Align',
      options: [
        { label: 'Start', value: 'flex-start' },
        { label: 'Center', value: 'center' },
        { label: 'End', value: 'flex-end' },
        { label: 'Stretch', value: 'stretch' },
      ],
    },
    { type: 'number', key: 'gap', label: 'Gap', min: 0, max: 200, step: 1 },
  ],
  defaults: { display: 'flex', flexDirection: 'row', alignItems: 'flex-start', gap: 0 },
};

export const OVERFLOW_FORMAT: IFormatDefinition = {
  id: 'overflow',
  label: 'Overflow',
  icon: '🔲',
  applicableTo: ['box'],
  controls: [
    {
      type: 'select',
      key: 'overflow',
      label: 'Overflow',
      options: [
        { label: 'Visible', value: 'visible' },
        { label: 'Hidden', value: 'hidden' },
        { label: 'Scroll', value: 'scroll' },
      ],
    },
  ],
  defaults: { overflow: 'visible' },
};

/** Register all built-in formats onto a FormatRegistry */
export function registerBuiltinFormats(registry: FormatRegistry): void {
  [
    BACKGROUND_COLOR_FORMAT,
    BACKGROUND_IMAGE_FORMAT,
    COLOR_FORMAT,
    PADDING_FORMAT,
    CIRCLE_FORMAT,
    BORDER_FORMAT,
    SHADOW_FORMAT,
    OPACITY_FORMAT,
    FONT_FORMAT,
    FLEX_FORMAT,
    OVERFLOW_FORMAT,
  ].forEach((f) => registry.register(f));
}
