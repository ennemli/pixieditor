import type { EditorConfig, EditorTheme, SnapConfig, CanvasConfig } from '@/types';

export const DEFAULT_THEME: EditorTheme = {
  panelBackground: '#1a1a1a',
  panelBorder: '#2e2e2e',
  accent: '#4f8ef7',
  text: '#f0f0f0',
  textMuted: '#888888',
  surface: '#242424',
  surfaceHover: '#2e2e2e',
  selectionColor: '#4f8ef7',
  guideColor: '#ff4d94',
  gridColor: '#2a2a2a',
};

export const DEFAULT_SNAP: SnapConfig = {
  enabled: true,
  grid: true,
  gridSize: 8,
  gridColor: '#2a2a2a',
  elements: true,
  canvas: true,
  smartGuides: true,
  canvasEdges: true,
  threshold: 6,
};

export const DEFAULT_CANVAS: CanvasConfig = {
  width: 1200,
  height: 800,
  backgroundColor: '#ffffff',
};

/**
 * Merges user config with defaults, ensuring all required fields are set.
 */
export function resolveConfig(config: EditorConfig) {
  return {
    canvas: { ...DEFAULT_CANVAS, ...config.canvas },
    snap: { ...DEFAULT_SNAP, ...config.snap },
    theme: { ...DEFAULT_THEME, ...config.theme },
    menuItems: config.menuItems ?? [],
    exportFormats: config.exportFormats ?? [],
    mountPanels: config.mountPanels ?? true,
  };
}
