/**
 * @pixieditor/core — Public API
 *
 * Usage:
 *   import { createEditor } from '@pixieditor/core';
 *
 *   const api = createEditor({
 *     container: document.getElementById('editor'),
 *     onReady: (api) => console.log('Editor ready', api),
 *   });
 */

export { Editor } from './core/Editor.js';

// ── Factory function ──────────────────────────────────────────────────────────
import { Editor } from './core/Editor.js';
import type { EditorConfig, EditorAPI } from './types/index.js';

/**
 * Create and mount a PixiEditor instance.
 *
 * @param config - EditorConfig
 * @returns EditorAPI — the fully mounted editor API
 *
 * @example
 * ```ts
 * const api = createEditor({
 *   container: document.getElementById('editor')!,
 *   document: { width: 1200, height: 800, name: 'My Design' },
 *   snap: { enabled: true, grid: true, gridSize: 20 },
 *   theme: { accent: '#6366f1' },
 *   menuItems: [
 *     { id: 'my-export', label: 'Export PNG', group: 'Export', callback: (api) => { ... } }
 *   ],
 *   exportFormats: [
 *     { id: 'png', label: 'Export PNG', handler: async (doc) => { ... return blob; } }
 *   ],
 *   onReady: (api) => {
 *     api.addElement('box', null, { x: 100, y: 100, width: 200, height: 100, backgroundColor: '#6366f1' });
 *   },
 * });
 * ```
 */
export function createEditor(config: EditorConfig): EditorAPI {
  const editor = new Editor(config);
  return editor.mount();
}

// ── Type exports ──────────────────────────────────────────────────────────────
export type {
  // Config
  EditorConfig,
  PanelConfig,
  ThemeConfig,
  // API
  EditorAPI,
  EditorEventName,
  EditorEventMap,
  // Document / Elements
  DocumentState,
  AnyElement,
  BoxElement,
  ImageElement,
  TextElement,
  ElementType,
  ElementStyle,
  // Selection
  SelectionState,
  Rect,
  Point,
  // Snap
  SnapConfig,
  SnapResult,
  SnapGuide,
  // Format
  IFormat,
  FormatValue,
  // Menu
  CustomMenuItem,
  ExportFormat,
  // Style helpers
  ShadowStyle,
  BorderStyle,
  TextAlign,
  ObjectFit,
} from './types/index.js';

// ── Format exports (for consumers building custom formats) ────────────────────
export { FormatRegistry } from './format/FormatRegistry.js';
export type { IFormat as IFormatInterface } from './format/IFormat.js';

// ── Utility exports ───────────────────────────────────────────────────────────
export { layoutResolver, LayoutResolver } from './layout/LayoutResolver.js';
export { generateId } from './utils/IdGenerator.js';
export { deepClone } from './utils/deepClone.js';
export { DEFAULT_STYLE } from './utils/styleDefaults.js';
