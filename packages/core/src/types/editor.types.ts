import type { AnyElementModel } from './element.types';

// ---------------------------------------------------------------------------
// Canvas
// ---------------------------------------------------------------------------

export interface CanvasConfig {
  width: number;
  height: number;
  backgroundColor: string;
  zoom: number;
  panX: number;
  panY: number;
}

// ---------------------------------------------------------------------------
// Snap
// ---------------------------------------------------------------------------

export interface SnapConfig {
  enabled: boolean;
  grid: boolean;
  gridSize: number;          // px
  elements: boolean;
  canvas: boolean;
  smartGuides: boolean;
  threshold: number;         // attraction distance in px
}

// ---------------------------------------------------------------------------
// History
// ---------------------------------------------------------------------------

export interface EditorSnapshot {
  elements: Record<string, AnyElementModel>;
  rootChildren: string[];
  timestamp: number;
  label?: string;
}

export interface HistoryState {
  past: EditorSnapshot[];
  future: EditorSnapshot[];
  maxSize: number;
}

// ---------------------------------------------------------------------------
// Root editor state  (single source of truth)
// ---------------------------------------------------------------------------

export interface EditorState {
  elements: Record<string, AnyElementModel>;

  /** IDs of elements whose logical parent is null (root canvas). */
  rootChildren: string[];

  selectedIds: string[];
  hoveredId: string | null;

  /** Element currently being edited in text mode */
  editingTextId: string | null;

  canvas: CanvasConfig;
  snap: SnapConfig;
  history: HistoryState;
}
