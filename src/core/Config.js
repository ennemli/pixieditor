/**
 * Config — Value Object
 *
 * Immutable configuration for the editor. Passed to EditorEngine on init.
 * Consumer provides partial config; defaults fill in the rest.
 * Satisfies Open/Closed: consumers extend behavior via config, not subclassing.
 */
export class Config {
  /**
   * @param {Partial<EditorConfig>} options
   */
  constructor(options = {}) {
    /** Canvas dimensions and background */
    this.canvas = {
      width: options.canvas?.width ?? 1200,
      height: options.canvas?.height ?? 800,
      background: options.canvas?.background ?? '#f0f0f0',
      resolution: options.canvas?.resolution ?? window.devicePixelRatio ?? 1,
    };

    /** Snap configuration */
    this.snap = {
      enabled: options.snap?.enabled ?? true,
      grid: options.snap?.grid ?? true,
      gridSize: options.snap?.gridSize ?? 8,
      showGrid: options.snap?.showGrid ?? false,
      elements: options.snap?.elements ?? true,
      canvasEdges: options.snap?.canvasEdges ?? true,
      smartGuides: options.snap?.smartGuides ?? true,
      threshold: options.snap?.threshold ?? 6, // snap distance in px
    };

    /** History configuration */
    this.history = {
      maxSteps: options.history?.maxSteps ?? 100,
    };

    /** UI / panel configuration */
    this.ui = {
      theme: options.ui?.theme ?? 'dark',
      leftPanelWidth: options.ui?.leftPanelWidth ?? 260,
      rightPanelWidth: options.ui?.rightPanelWidth ?? 280,
      menubarHeight: options.ui?.menubarHeight ?? 44,
      fontStack: options.ui?.fontStack ?? "'Inter', system-ui, sans-serif",
    };

    /**
     * Custom menubar items.
     * @type {MenubarItem[]}
     * Each: { name: string, group: string, callback: (editor) => void }
     */
    this.menubar = {
      items: options.menubar?.items ?? [],
      /**
       * Custom export formats.
       * @type {ExportFormat[]}
       * Each: { name: string, handler: (sceneJson: object) => void }
       */
      exportFormats: options.menubar?.exportFormats ?? [],
    };

    /** Default element styles */
    this.defaults = {
      box: {
        width: 200,
        height: 120,
        style: {
          backgroundColor: '#ffffff',
          borderRadius: 0,
          padding: { top: 0, right: 0, bottom: 0, left: 0 },
        },
      },
      text: {
        width: 160,
        height: 40,
        style: {
          color: '#1a1a1a',
          fontSize: 16,
          fontWeight: '400',
          fontFamily: 'Inter',
          textAlign: 'left',
          lineHeight: 1.5,
        },
      },
      image: {
        width: 200,
        height: 150,
      },
    };
  }
}

/**
 * @typedef {Object} MenubarItem
 * @property {string} name
 * @property {string} group
 * @property {Function} callback
 */

/**
 * @typedef {Object} ExportFormat
 * @property {string} name
 * @property {Function} handler
 */
