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
export declare function createEditor(config: EditorConfig): EditorAPI;
export type { EditorConfig, PanelConfig, ThemeConfig, EditorAPI, EditorEventName, EditorEventMap, DocumentState, AnyElement, BoxElement, ImageElement, TextElement, ElementType, ElementStyle, SelectionState, Rect, Point, SnapConfig, SnapResult, SnapGuide, IFormat, FormatValue, CustomMenuItem, ExportFormat, ShadowStyle, BorderStyle, TextAlign, ObjectFit, } from './types/index.js';
export { FormatRegistry } from './format/FormatRegistry.js';
export type { IFormat as IFormatInterface } from './format/IFormat.js';
export { layoutResolver, LayoutResolver } from './layout/LayoutResolver.js';
export { generateId } from './utils/IdGenerator.js';
export { deepClone } from './utils/deepClone.js';
export { DEFAULT_STYLE } from './utils/styleDefaults.js';
