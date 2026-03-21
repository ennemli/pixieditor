import type {
  AnyElementModel,
  EditorState,
  ElementId,
  Formats,
  SnapGuide,
  Transform,
} from '../models/types';

/**
 * The complete event map for the editor.
 * Every subsystem communicates only through these typed events.
 */
export interface EditorEventMap {
  // ── State ─────────────────────────────────────────────────────────────────
  'state:changed': { state: EditorState; changedIds: ElementId[] };

  // ── Elements ──────────────────────────────────────────────────────────────
  'element:added': { element: AnyElementModel };
  'element:removed': { id: ElementId; parentId: string | null };
  'element:moved': { id: ElementId; transform: Transform };
  'element:resized': { id: ElementId; transform: Transform };
  'element:format-changed': { id: ElementId; formats: Formats };
  'element:free-changed': { id: ElementId; free: boolean };
  'element:reordered': { ids: ElementId[] };
  'element:visibility-changed': { id: ElementId; visible: boolean };
  'element:locked-changed': { id: ElementId; locked: boolean };
  'element:renamed': { id: ElementId; name: string };

  // ── Selection ─────────────────────────────────────────────────────────────
  'selection:changed': { selectedIds: ElementId[] };
  'selection:cleared': Record<string, never>;

  // ── Hover ─────────────────────────────────────────────────────────────────
  'hover:changed': { id: ElementId | null };

  // ── Interaction ───────────────────────────────────────────────────────────
  'drag:start': { id: ElementId };
  'drag:move': { id: ElementId; x: number; y: number; guides: SnapGuide[] };
  'drag:end': { id: ElementId };
  'resize:start': { id: ElementId };
  'resize:end': { id: ElementId };

  // ── Text Editing ──────────────────────────────────────────────────────────
  'text:edit-start': { id: ElementId };
  'text:edit-end': { id: ElementId; content: string };
  'text:selection': { id: ElementId; hasSelection: boolean };

  // ── History ───────────────────────────────────────────────────────────────
  'history:changed': { canUndo: boolean; canRedo: boolean };

  // ── Canvas ────────────────────────────────────────────────────────────────
  'canvas:zoom-changed': { zoom: number };
  'canvas:pan-changed': { panX: number; panY: number };

  // ── Snap ──────────────────────────────────────────────────────────────────
  'snap:config-changed': { enabled: boolean };

  // ── Panel ─────────────────────────────────────────────────────────────────
  'panel:left-toggle': { collapsed: boolean };
  'panel:right-toggle': { collapsed: boolean };
  'panel:right-tab-changed': { tab: 'properties' | 'layers' };

  // ── Drop from Panel ───────────────────────────────────────────────────────
  'drop:element-template': {
    templateId: string;
    canvasX: number;
    canvasY: number;
  };
}
