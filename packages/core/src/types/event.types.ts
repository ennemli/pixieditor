import type { AnyElementModel, ElementFormat, ElementTransform, ElementType } from './element.types';
import type { CanvasConfig, SnapConfig, EditorState } from './editor.types';

// ---------------------------------------------------------------------------
// Event map — maps event name → payload type
// ---------------------------------------------------------------------------

export interface EditorEventMap {
  // Element lifecycle
  'element:add':      { element: AnyElementModel };
  'element:remove':   { id: string };
  'element:update':   { id: string; changes: Partial<AnyElementModel> };

  // Selection
  'element:select':   { ids: string[] };
  'element:deselect': Record<string, never>;

  // Transform
  'element:move':     { id: string; x: number; y: number };
  'element:resize':   { id: string; transform: Partial<ElementTransform> };

  // Free mode
  'element:free':     { id: string };
  'element:unfree':   { id: string };

  // Format
  'element:format':   { id: string; format: Partial<ElementFormat> };

  // Layers
  'layer:reorder':    { id: string; newZIndex: number };
  'layer:parent':     { id: string; newParentId: string | null };

  // Text editing
  'text:editstart':   { id: string };
  'text:editend':     { id: string; content: string };

  // History
  'history:push':     { label?: string };
  'history:undo':     Record<string, never>;
  'history:redo':     Record<string, never>;

  // Canvas
  'canvas:update':    Partial<CanvasConfig>;
  'canvas:zoom':      { zoom: number; originX: number; originY: number };
  'canvas:pan':       { dx: number; dy: number };

  // Snap
  'snap:change':      Partial<SnapConfig>;

  // Global state change (panels re-render on this)
  'state:change':     EditorState;

  // Drag-from-panel drop onto canvas
  'panel:drop':       { type: ElementType; x: number; y: number; src?: string };
}

export type EditorEventType = keyof EditorEventMap;

export type EditorEventListener<K extends EditorEventType> = (
  payload: EditorEventMap[K]
) => void;
