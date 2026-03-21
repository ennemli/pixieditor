import type { EditorState } from './editor.types';
import type { SnapConfig } from './editor.types';

// ---------------------------------------------------------------------------
// Theme — all CSS custom properties the panels consume
// ---------------------------------------------------------------------------

export interface EditorTheme {
  // Surfaces
  panelBg?: string;
  panelBorder?: string;
  panelText?: string;
  panelTextMuted?: string;
  panelHover?: string;
  panelActive?: string;

  // Accent
  accent?: string;
  accentHover?: string;
  accentText?: string;

  // Canvas workspace background (outside the canvas)
  workspaceBg?: string;

  // Selection handles / guides
  selectionColor?: string;
  selectionHandleColor?: string;
  guideColor?: string;

  // Typography
  fontFamily?: string;
  fontSize?: string;

  // Border radius tokens
  radiusSm?: string;
  radiusMd?: string;
  radiusLg?: string;

  // Raw CSS injected into the shadow root (escape hatch)
  customCSS?: string;
}

// ---------------------------------------------------------------------------
// Consumer-defined menu bar items
// ---------------------------------------------------------------------------

export interface MenubarItem {
  id: string;
  label: string;
  /** Items in the same group are visually grouped together */
  group: string;
  icon?: string;         // SVG string or URL
  shortcut?: string;     // e.g. "Ctrl+E"
  callback: (state: EditorState) => void;
}

// ---------------------------------------------------------------------------
// Consumer-defined export formats
// ---------------------------------------------------------------------------

export interface ExportFormat {
  id: string;
  label: string;
  extension?: string;
  /** Called with a deep-clone of the current editor state */
  callback: (state: EditorState) => void | Promise<void>;
}

// ---------------------------------------------------------------------------
// Top-level editor configuration
// ---------------------------------------------------------------------------

export interface EditorConfig {
  /** Host element — the editor mounts inside this */
  container: HTMLElement;

  /** Initial canvas dimensions */
  width?: number;
  height?: number;

  theme?: EditorTheme;

  menubarItems?: MenubarItem[];
  exportFormats?: ExportFormat[];

  snap?: Partial<SnapConfig>;

  /** Serialised state produced by editor.getState() */
  initialState?: Partial<EditorState>;

  /** Override panel components entirely (advanced) */
  panels?: {
    left?: HTMLElement | null;
    right?: HTMLElement | null;
  };
}

// ---------------------------------------------------------------------------
// Interfaces used as SOLID contracts between modules
// ---------------------------------------------------------------------------

/** Any object that can render / sync an element to PixiJS */
export interface IElementRenderer {
  elementId: string;
  mount(): void;
  update(changes: Record<string, unknown>): void;
  destroy(): void;
}

/** Snap provider — each strategy implements this */
export interface ISnapProvider {
  getSnapPoints(
    x: number,
    y: number,
    width: number,
    height: number,
    excludeId?: string
  ): SnapResult;
}

export interface SnapResult {
  x: number;
  y: number;
  guides: SnapGuide[];
}

export interface SnapGuide {
  orientation: 'horizontal' | 'vertical';
  position: number; // canvas px
  start: number;
  end: number;
}

/** Format handler — each CSS-equivalent format implements this */
export interface IFormatHandler {
  readonly key: string;
  apply(container: HTMLElement | null, value: unknown): void;
  applyToPixi?(displayObject: unknown, value: unknown): void;
}
