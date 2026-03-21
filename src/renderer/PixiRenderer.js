import { Events } from '../core/EventBus.js';
import { LayoutEngine } from '../layout/LayoutEngine.js';
import { BoxModel, ImageModel, TextModel } from '../model/Elements.js';

/**
 * PixiRenderer — WebGL rendering via PixiJS.
 *
 * Architecture:
 *  - One PIXI.Container per element, keyed by element id.
 *  - Containers mirror the element tree: nested boxes = nested containers.
 *  - Free elements live in a dedicated top-level `_freeLayer` container.
 *  - Selection outlines + resize handles rendered in `_uiLayer` (always on top).
 *  - Smart guide lines rendered in `_guideLayer`.
 *
 * Rendering pipeline (per frame):
 *  1. LayoutEngine.computeAll() → resolvedBounds
 *  2. Diff scene tree → create/update/destroy PIXI containers
 *  3. Apply positions, sizes, styles to each container
 *  4. Update selection UI
 *  5. Draw snap guides
 *
 * Satisfies SRP: this class ONLY renders. It does not interpret events or
 * modify models — it reads the scene and emits PixiJS pointer events upward
 * to InteractionEngine via callbacks.
 */
export class PixiRenderer {
  /**
   * @param {object} params
   * @param {HTMLElement} params.container - DOM element to mount canvas into
   * @param {import('../model/SceneModel.js').SceneModel} params.scene
   * @param {import('../core/EventBus.js').EventBus} params.bus
   * @param {import('../core/Config.js').Config} params.config
   * @param {import('../interaction/SelectionManager.js').SelectionManager} params.selection
   */
  constructor({ container, scene, bus, config, selection }) {
    this._container = container;
    this._scene = scene;
    this._bus = bus;
    this._config = config;
    this._selection = selection;

    /** @type {PIXI.Application} */
    this._app = null;

    /** @type {Map<string, PIXI.Container>} elementId → PIXI container */
    this._nodes = new Map();

    /** @type {Map<string, import('../layout/LayoutEngine.js').Bounds>} */
    this._resolvedBounds = new Map();

    /** PIXI layers */
    this._rootLayer = null;
    this._freeLayer = null;
    this._guideLayer = null;
    this._uiLayer = null;

    this._guides = [];
    this._imageCache = new Map(); // url → PIXI.Texture

    // Pan/zoom state
    this._scale = 1;
    this._panX = 0;
    this._panY = 0;

    this._renderPending = false;
  }

  /**
   * Initialise PixiJS. Must be called once after construction.
   * Returns a promise that resolves when PIXI is ready.
   */
  async init() {
    // Dynamically import PixiJS (consumer must have it installed)
    const PIXI = await import('pixi.js');
    this._PIXI = PIXI;

    this._app = new PIXI.Application({
      width: this._config.canvas.width,
      height: this._config.canvas.height,
      backgroundColor: this._hexToNumber(this._config.canvas.background),
      resolution: this._config.canvas.resolution,
      autoDensity: true,
      antialias: true,
    });

    this._container.appendChild(this._app.view);
    this._app.view.style.display = 'block';

    // Layer order: root content → free elements → guides → UI handles
    this._rootLayer = new PIXI.Container();
    this._freeLayer = new PIXI.Container();
    this._guideLayer = new PIXI.Container();
    this._uiLayer = new PIXI.Container();

    this._app.stage.addChild(this._rootLayer);
    this._app.stage.addChild(this._freeLayer);
    this._app.stage.addChild(this._guideLayer);
    this._app.stage.addChild(this._uiLayer);

    // Canvas background (white page)
    this._canvasBackground = new PIXI.Graphics();
    this._app.stage.addChildAt(this._canvasBackground, 0);

    this._drawCanvasBackground();
    this._bindBusEvents();
    this._bindPixiPointerEvents();
    this._setupGrid();

    this._bus.emit(Events.CANVAS_READY);
    return this;
  }

  // ─── Rendering Pipeline ───────────────────────────────────────────────────

  /** Request a render on the next animation frame (debounced). */
  requestRender() {
    if (this._renderPending) return;
    this._renderPending = true;
    requestAnimationFrame(() => {
      this._renderPending = false;
      this._render();
    });
  }

  _render() {
    // 1. Recompute layout
    this._resolvedBounds = LayoutEngine.computeAll(this._scene);

    // 2. Sync element nodes
    this._syncNodes();

    // 3. Update selection UI
    this._renderSelectionUI();

    // 4. Render snap guides
    this._renderGuides();
  }

  // ─── Node Sync ───────────────────────────────────────────────────────────

  _syncNodes() {
    const PIXI = this._PIXI;
    const allIds = new Set(this._scene.getAllElements().map((e) => e.id));

    // Remove nodes for deleted elements
    for (const [id, node] of this._nodes) {
      if (!allIds.has(id)) {
        node.parent?.removeChild(node);
        node.destroy({ children: true });
        this._nodes.delete(id);
      }
    }

    // Create/update nodes for root elements
    const rootEls = this._scene.getRootElements();
    rootEls.forEach((el) => {
      this._syncElement(el, this._rootLayer);
    });

    // Ensure free elements are in freeLayer
    this._scene.getAllElements().forEach((el) => {
      if (el.free && this._nodes.has(el.id)) {
        const node = this._nodes.get(el.id);
        if (node.parent !== this._freeLayer) {
          node.parent?.removeChild(node);
          this._freeLayer.addChild(node);
        }
      }
    });
  }

  _syncElement(el, parentPixiContainer) {
    const PIXI = this._PIXI;
    const bounds = this._resolvedBounds.get(el.id);
    if (!bounds || !el.visible) {
      if (this._nodes.has(el.id)) this._nodes.get(el.id).visible = false;
      return;
    }

    let node = this._nodes.get(el.id);
    if (!node) {
      node = this._createNode(el);
      this._nodes.set(el.id, node);
      (el.free ? this._freeLayer : parentPixiContainer).addChild(node);
    }

    node.visible = true;
    node.x = bounds.x;
    node.y = bounds.y;
    node.zIndex = el.zIndex;
    node.alpha = el.style.opacity;

    // Type-specific rendering
    if (el instanceof BoxModel) this._renderBox(el, node, bounds);
    if (el instanceof ImageModel) this._renderImage(el, node, bounds);
    if (el instanceof TextModel) this._renderText(el, node, bounds);

    // Recurse into box children
    if (el instanceof BoxModel) {
      const children = this._scene.getChildren(el.id);
      const childContainer = node._childContainer ?? node;
      children.forEach((child) => this._syncElement(child, childContainer));
    }
  }

  _createNode(el) {
    const PIXI = this._PIXI;
    const container = new PIXI.Container();
    container.interactive = true;
    container.cursor = 'pointer';
    container.sortableChildren = true;

    // Store element id on the container for hit testing
    container._elementId = el.id;

    // Graphics for background/border
    container._bg = new PIXI.Graphics();
    container.addChild(container._bg);

    if (el instanceof BoxModel) {
      // Child container (respects padding offset)
      container._childContainer = new PIXI.Container();
      container.addChild(container._childContainer);
    }

    if (el instanceof TextModel) {
      container._text = new PIXI.Text('', {});
      container.addChild(container._text);
    }

    if (el instanceof ImageModel) {
      container._sprite = new PIXI.Sprite();
      container.addChild(container._sprite);
    }

    return container;
  }

  _renderBox(el, node, bounds) {
    const PIXI = this._PIXI;
    const g = node._bg;
    const style = el.style;
    const w = bounds.width;
    const h = bounds.height;

    g.clear();

    // Border
    if (style.borderWidth > 0) {
      g.lineStyle(style.borderWidth, this._hexToNumber(style.borderColor), 1);
    } else {
      g.lineStyle(0);
    }

    // Fill
    if (style.backgroundColor) {
      g.beginFill(this._hexToNumber(style.backgroundColor), style.opacity);
    } else {
      g.beginFill(0xffffff, 0); // transparent
    }

    // Shape
    const radius = style.circle
      ? Math.min(w, h) / 2
      : (style.borderRadius ?? 0);

    if (radius > 0) {
      g.drawRoundedRect(0, 0, w, h, radius);
    } else {
      g.drawRect(0, 0, w, h);
    }
    g.endFill();

    // Background image (render as sprite)
    if (style.backgroundImage) {
      this._applyBackgroundImage(node, style.backgroundImage, w, h);
    }

    // Padding offset for child container
    if (node._childContainer) {
      node._childContainer.x = style.padding.left;
      node._childContainer.y = style.padding.top;
    }
  }

  _renderText(el, node, bounds) {
    // Text is shown via PixiJS ONLY when NOT being edited.
    // During edit, the DOM overlay takes over.
    const text = node._text;
    if (!text) return;

    const style = el.style;
    const w = bounds.width;

    text.x = style.padding.left;
    text.y = style.padding.top;
    text.style = new this._PIXI.TextStyle({
      fontFamily: style.fontFamily,
      fontSize: style.fontSize,
      fontWeight: style.fontWeight,
      fontStyle: style.fontStyle,
      fill: style.color,
      align: style.textAlign,
      wordWrap: true,
      wordWrapWidth: w - style.padding.left - style.padding.right,
      lineHeight: style.fontSize * style.lineHeight,
      letterSpacing: style.letterSpacing,
    });

    // Strip HTML for PixiJS rendering (DOM overlay handles formatted version)
    text.text = el.content.replace(/<[^>]*>/g, '');

    // Background for text element
    const g = node._bg;
    g.clear();
    if (style.backgroundColor) {
      g.beginFill(this._hexToNumber(style.backgroundColor));
      g.drawRoundedRect(0, 0, bounds.width, bounds.height, style.borderRadius ?? 0);
      g.endFill();
    }
  }

  _renderImage(el, node, bounds) {
    const PIXI = this._PIXI;
    const sprite = node._sprite;
    if (!sprite || !el.src) return;

    sprite.width = bounds.width;
    sprite.height = bounds.height;

    if (!this._imageCache.has(el.src)) {
      const texture = PIXI.Texture.from(el.src);
      this._imageCache.set(el.src, texture);
      sprite.texture = texture;
    } else {
      sprite.texture = this._imageCache.get(el.src);
    }

    // Apply circle mask if needed
    if (el.style.circle) {
      const mask = new PIXI.Graphics();
      mask.beginFill(0xffffff);
      mask.drawCircle(bounds.width / 2, bounds.height / 2, Math.min(bounds.width, bounds.height) / 2);
      mask.endFill();
      node.addChild(mask);
      sprite.mask = mask;
    }
  }

  _applyBackgroundImage(node, url, w, h) {
    const PIXI = this._PIXI;
    if (!node._bgSprite) {
      node._bgSprite = new PIXI.Sprite();
      node.addChildAt(node._bgSprite, 1); // above bg graphics
    }
    node._bgSprite.width = w;
    node._bgSprite.height = h;
    if (!this._imageCache.has(url)) {
      const texture = PIXI.Texture.from(url);
      this._imageCache.set(url, texture);
      node._bgSprite.texture = texture;
    } else {
      node._bgSprite.texture = this._imageCache.get(url);
    }
  }

  // ─── Selection UI ─────────────────────────────────────────────────────────

  _renderSelectionUI() {
    const PIXI = this._PIXI;
    this._uiLayer.removeChildren();
    if (this._selection.count === 0) return;

    this._selection.ids.forEach((id) => {
      const bounds = this._resolvedBounds.get(id);
      if (!bounds) return;

      const el = this._scene.getElementById(id);

      // Selection outline
      const outline = new PIXI.Graphics();
      outline.lineStyle(2, 0x3b82f6, 1);
      outline.drawRect(bounds.x - 1, bounds.y - 1, bounds.width + 2, bounds.height + 2);
      this._uiLayer.addChild(outline);

      // Resize handles (8 points)
      const handles = [
        ['nw', bounds.x - 4, bounds.y - 4],
        ['n',  bounds.x + bounds.width/2 - 4, bounds.y - 4],
        ['ne', bounds.x + bounds.width - 4, bounds.y - 4],
        ['e',  bounds.x + bounds.width - 4, bounds.y + bounds.height/2 - 4],
        ['se', bounds.x + bounds.width - 4, bounds.y + bounds.height - 4],
        ['s',  bounds.x + bounds.width/2 - 4, bounds.y + bounds.height - 4],
        ['sw', bounds.x - 4, bounds.y + bounds.height - 4],
        ['w',  bounds.x - 4, bounds.y + bounds.height/2 - 4],
      ];

      handles.forEach(([handle, hx, hy]) => {
        const h = new PIXI.Graphics();
        h.beginFill(0xffffff);
        h.lineStyle(1.5, 0x3b82f6);
        h.drawRect(hx, hy, 8, 8);
        h.endFill();
        h.interactive = true;
        h.cursor = this._handleCursor(handle);
        h._handle = handle;
        h._elementId = id;
        this._uiLayer.addChild(h);
      });
    });
  }

  _handleCursor(h) {
    const map = { nw:'nw-resize', n:'n-resize', ne:'ne-resize', e:'e-resize',
                  se:'se-resize', s:'s-resize', sw:'sw-resize', w:'w-resize' };
    return map[h] ?? 'default';
  }

  // ─── Snap Guides ──────────────────────────────────────────────────────────

  _renderGuides() {
    const PIXI = this._PIXI;
    this._guideLayer.removeChildren();
    this._guides.forEach((guide) => {
      const g = new PIXI.Graphics();
      g.lineStyle(1, 0xef4444, 0.8); // red guide lines
      if (guide.type === 'vertical') {
        g.moveTo(guide.pos, 0);
        g.lineTo(guide.pos, this._config.canvas.height);
      } else if (guide.type === 'horizontal') {
        g.moveTo(0, guide.pos);
        g.lineTo(this._config.canvas.width, guide.pos);
      }
      this._guideLayer.addChild(g);
    });
  }

  // ─── Grid ─────────────────────────────────────────────────────────────────

  _setupGrid() {
    if (!this._config.snap.showGrid) return;
    const PIXI = this._PIXI;
    const grid = new PIXI.Graphics();
    const gs = this._config.snap.gridSize;
    const cw = this._config.canvas.width;
    const ch = this._config.canvas.height;

    grid.lineStyle(0.5, 0xd1d5db, 0.5);
    for (let x = 0; x <= cw; x += gs) { grid.moveTo(x, 0); grid.lineTo(x, ch); }
    for (let y = 0; y <= ch; y += gs) { grid.moveTo(0, y); grid.lineTo(cw, y); }

    this._app.stage.addChildAt(grid, 1);
    this._gridGraphics = grid;
  }

  _drawCanvasBackground() {
    const PIXI = this._PIXI;
    if (!this._canvasBackground) return;
    const g = this._canvasBackground;
    g.clear();
    g.beginFill(0xffffff);
    g.lineStyle(1, 0xe5e7eb);
    g.drawRect(0, 0, this._config.canvas.width, this._config.canvas.height);
    g.endFill();
  }

  // ─── PixiJS Pointer Events → InteractionEngine ───────────────────────────

  _bindPixiPointerEvents() {
    const stage = this._app.stage;
    stage.interactive = true;
    stage.hitArea = new this._PIXI.Rectangle(
      0, 0, this._config.canvas.width, this._config.canvas.height
    );

    stage.on('pointerdown', (e) => {
      const pos = this._stagePos(e);
      const hit = this._hitTest(e.target);
      if (hit) {
        this._bus.emit('_pixi:element:pointerdown', {
          id: hit, pos, shiftKey: e.originalEvent?.shiftKey
        });
      } else {
        this._bus.emit('_pixi:canvas:pointerdown', {
          pos, shiftKey: e.originalEvent?.shiftKey
        });
      }
    });

    stage.on('pointermove', (e) => {
      this._bus.emit('_pixi:pointermove', { pos: this._stagePos(e) });
    });

    stage.on('pointerup', (e) => {
      this._bus.emit('_pixi:pointerup', { pos: this._stagePos(e) });
    });

    stage.on('dblclick', (e) => {
      const hit = this._hitTest(e.target);
      if (hit) {
        this._bus.emit('_pixi:element:dblclick', { id: hit, pos: this._stagePos(e) });
      }
    });

    // Resize handles
    this._uiLayer.on('pointerdown', (e) => {
      if (e.target?._handle) {
        this._bus.emit('_pixi:handle:pointerdown', {
          id: e.target._elementId,
          handle: e.target._handle,
          pos: this._stagePos(e),
        });
        e.stopPropagation();
      }
    });
  }

  _stagePos(e) {
    const local = e.getLocalPosition(this._app.stage);
    return { x: local.x, y: local.y };
  }

  _hitTest(target) {
    let node = target;
    while (node) {
      if (node._elementId) return node._elementId;
      node = node.parent;
    }
    return null;
  }

  // ─── Bus bindings ─────────────────────────────────────────────────────────

  _bindBusEvents() {
    this._bus.on(Events.RENDER_REQUESTED, () => this.requestRender());
    this._bus.on(Events.SCENE_CHANGED, () => this.requestRender());
    this._bus.on(Events.ELEMENT_ADDED, () => this.requestRender());
    this._bus.on(Events.ELEMENT_REMOVED, () => this.requestRender());
    this._bus.on(Events.ELEMENT_MOVED, () => this.requestRender());
    this._bus.on(Events.ELEMENT_RESIZED, () => this.requestRender());
    this._bus.on(Events.ELEMENT_STYLE_CHANGED, () => this.requestRender());
    this._bus.on(Events.SELECTION_CHANGED, () => this.requestRender());
    this._bus.on(Events.SNAP_GUIDES_CHANGED, ({ guides }) => {
      this._guides = guides;
      this.requestRender();
    });
  }

  // ─── Utilities ────────────────────────────────────────────────────────────

  _hexToNumber(hex) {
    if (!hex || typeof hex !== 'string') return 0xffffff;
    return parseInt(hex.replace('#', ''), 16);
  }

  /** Returns the current resolved bounds map (used by InteractionEngine) */
  get resolvedBounds() { return this._resolvedBounds; }

  /** Resize the renderer when canvas config changes */
  resize(width, height) {
    this._app?.renderer.resize(width, height);
    this._drawCanvasBackground();
    this.requestRender();
  }

  destroy() {
    this._app?.destroy(true, { children: true });
  }
}
