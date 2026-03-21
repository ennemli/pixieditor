import type {
  CanvasConfig,
  EditorState,
  ElementTemplate,
  IExportFormat,
  IMenuBarItem,
  SnapConfig,
  ThemeConfig,
  DEFAULT_THEME,
} from '../models/types';
import type { IFormatDefinition } from '../models/types';

export interface EditorConfig {
  /** Container element — Editor will fill it */
  container: HTMLElement;

  /** Initial canvas dimensions and background */
  canvas?: Partial<CanvasConfig>;

  /** Snap configuration defaults */
  snap?: Partial<SnapConfig>;

  /** Theme override — merged with DEFAULT_THEME */
  theme?: Partial<ThemeConfig>;

  /** Element templates shown in the left panel */
  templates?: ElementTemplate[];

  /** Custom export formats shown in the Export menu */
  exportFormats?: IExportFormat[];

  /** Custom menu bar items */
  menuBarItems?: IMenuBarItem[];

  /** Custom format definitions to register alongside built-ins */
  customFormats?: IFormatDefinition[];

  /** Initial editor state (for loading saved documents) */
  initialState?: Partial<EditorState>;

  /** Callback fired whenever state changes */
  onChange?: (state: EditorState) => void;
}

export const DEFAULT_CANVAS: CanvasConfig = {
  width: 1200,
  height: 800,
  backgroundColor: '#ffffff',
  zoom: 1,
  panX: 0,
  panY: 0,
};

export const DEFAULT_SNAP: SnapConfig = {
  enabled: true,
  grid: false,
  gridSize: 8,
  canvasEdges: true,
  elementEdges: true,
  smartGuides: true,
  threshold: 6,
};
