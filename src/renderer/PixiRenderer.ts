import * as PIXI from 'pixi.js';
import type { DocumentState, AnyElement, SnapGuide, SelectionState, Rect } from '../types/index.js';
import type { IRenderer } from './IRenderer.js';
import { layoutResolver } from '../layout/LayoutResolver.js';
import { hexToNumber, parseColor } from './renderers/colorUtils.js';

/**
 * PixiRenderer — the WebGL rendering engine.
 * Each element maps to a PIXI.Container. Free elements live on the rootStage,
 * nested elements inside their parent's childContainer.
 *
 * Implements IRenderer (Dependency Inversion Principle).
 */
export class PixiRenderer implements IRenderer {
  private _app!: PIXI.Application;
  private _rootStage!: PIXI.Container;   // canvas root
  private _guideLayer!: PIXI.Graphics;
  private _selectionLayer!: PIXI.Graphics;
  private _gridLayer!: PIXI.Graphics;
  private _doc: DocumentState | null = null;

  /** Map elementId → PIXI.Container */
  private readonly _displayObjects = new Map<string, PIXI.Container>();

  private _showGrid = false;
  private _gridSize = 20;
  private _gridColor = 0xdddddd;

  mount(container: HTMLElement): void {
    this._app = new PIXI.Application({
      width: container.clientWidth,
      height: container.clientHeight,
      backgroundColor: 0xf3f4f6,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });
    container.appendChild(this._app.view as HTMLCanvasElement);

    this._rootStage = new PIXI.Container();
    this._app.stage.addChild(this._rootStage);

    this._gridLayer = new PIXI.Graphics();
    this._rootStage.addChild(this._gridLayer);

    this._guideLayer = new PIXI.Graphics();
    this._selectionLayer = new PIXI.Graphics();

    this._app.stage.addChild(this._guideLayer);
    this._app.stage.addChild(this._selectionLayer);

    // Handle resize
    const ro = new ResizeObserver(() => {
      this._app.renderer.resize(container.clientWidth, container.clientHeight);
      if (this._doc) this._drawGrid();
    });
    ro.observe(container);
  }

  render(doc: DocumentState): void {
    this._doc = doc;

    // Position canvas content (centered)
    const offX = Math.max(0, (this._app.renderer.width / this._app.renderer.resolution - doc.width) / 2);
    const offY = Math.max(0, (this._app.renderer.height / this._app.renderer.resolution - doc.height) / 2);
    this._rootStage.position.set(offX, offY);

    // Draw document background
    this._drawDocBackground(doc);
    this._drawGrid();

    // Full re-render: remove all old display objects
    const toRemove = [...this._displayObjects.keys()];
    for (const id of toRemove) this.removeElement(id);

    // Render root children in order
    this._renderChildren(doc.children, null, doc);
  }

  updateElement(element: AnyElement): void {
    if (!this._doc) return;
    const existing = this._displayObjects.get(element.id);
    if (existing) {
      this._syncElementDisplay(element, existing);
    } else {
      // New element — find parent container and add
      const parentContainer = this._getParentContainer(element);
      this._createDisplayObject(element, parentContainer, this._doc);
    }
  }

  removeElement(id: string): void {
    const obj = this._displayObjects.get(id);
    if (obj) {
      obj.parent?.removeChild(obj);
      obj.destroy({ children: true });
      this._displayObjects.delete(id);
    }
  }

  setSelection(selection: SelectionState): void {
    this._selectionLayer.clear();
    if (!selection.bounds || selection.ids.length === 0) return;

    const { x, y, width, height } = this._toScreenRect(selection.bounds);
    this._selectionLayer.lineStyle(2, 0x6366f1, 1);
    this._selectionLayer.drawRect(x, y, width, height);

    // Draw 8 resize handles
    const handles = this._getHandlePositions(x, y, width, height);
    for (const [hx, hy] of handles) {
      this._selectionLayer.beginFill(0xffffff);
      this._selectionLayer.lineStyle(2, 0x6366f1, 1);
      this._selectionLayer.drawRect(hx - 4, hy - 4, 8, 8);
      this._selectionLayer.endFill();
    }
  }

  setSnapGuides(guides: SnapGuide[]): void {
    this._guideLayer.clear();
    if (!this._doc) return;
    const offX = this._rootStage.x, offY = this._rootStage.y;

    for (const guide of guides) {
      this._guideLayer.lineStyle(1, 0x6366f1, 0.8);
      if (guide.orientation === 'vertical') {
        const x = guide.position + offX;
        this._guideLayer.moveTo(x, guide.start + offY);
        this._guideLayer.lineTo(x, guide.end + offY);
      } else {
        const y = guide.position + offY;
        this._guideLayer.moveTo(guide.start + offX, y);
        this._guideLayer.lineTo(guide.end + offX, y);
      }
    }
  }

  getWorldPosition(screenX: number, screenY: number): { x: number; y: number } {
    const bounds = (this._app.view as HTMLCanvasElement).getBoundingClientRect();
    const canvasX = (screenX - bounds.left) / (this._app.renderer.resolution || 1);
    const canvasY = (screenY - bounds.top) / (this._app.renderer.resolution || 1);
    return {
      x: canvasX - this._rootStage.x,
      y: canvasY - this._rootStage.y,
    };
  }

  getElementAt(worldX: number, worldY: number): string | null {
    if (!this._doc) return null;
    // Check in reverse order (top-most first)
    const allIds = Object.keys(this._doc.elements).reverse();
    for (const id of allIds) {
      const el = this._doc.elements[id];
      if (!el?.visible) continue;
      const w = layoutResolver.resolveSize(el.style.width, this._doc.width);
      const h = layoutResolver.resolveSize(el.style.height, this._doc.height);
      if (el.free || el.parentId === null) {
        if (worldX >= el.style.x && worldX <= el.style.x + w &&
            worldY >= el.style.y && worldY <= el.style.y + h) {
          return id;
        }
      }
    }
    return null;
  }

  getCanvas(): HTMLCanvasElement {
    return this._app.view as HTMLCanvasElement;
  }

  getStageOffset(): { x: number; y: number } {
    return { x: this._rootStage.x, y: this._rootStage.y };
  }

  showGrid(show: boolean, size = 20, color = '#dddddd'): void {
    this._showGrid = show;
    this._gridSize = size;
    this._gridColor = parseInt(color.replace('#', ''), 16);
    this._drawGrid();
  }

  destroy(): void {
    this._app.destroy(true, { children: true });
  }

  // ─── Private ─────────────────────────────────────────────────────────────

  private _docBg!: PIXI.Graphics;

  private _drawDocBackground(doc: DocumentState): void {
    if (!this._docBg) {
      this._docBg = new PIXI.Graphics();
      this._rootStage.addChildAt(this._docBg, 0);
    }
    this._docBg.clear();
    this._docBg.beginFill(hexToNumber(doc.backgroundColor));
    this._docBg.drawRect(0, 0, doc.width, doc.height);
    this._docBg.endFill();
  }

  private _drawGrid(): void {
    this._gridLayer.clear();
    if (!this._showGrid || !this._doc) return;
    const { width, height } = this._doc;
    this._gridLayer.lineStyle(1, this._gridColor, 0.5);
    for (let x = 0; x <= width; x += this._gridSize) {
      this._gridLayer.moveTo(x, 0); this._gridLayer.lineTo(x, height);
    }
    for (let y = 0; y <= height; y += this._gridSize) {
      this._gridLayer.moveTo(0, y); this._gridLayer.lineTo(width, y);
    }
  }

  private _renderChildren(ids: string[], parentContainer: PIXI.Container | null, doc: DocumentState): void {
    const container = parentContainer ?? this._rootStage;
    for (const id of ids) {
      const el = doc.elements[id];
      if (!el) continue;
      this._createDisplayObject(el, container, doc);
    }
  }

  private _createDisplayObject(el: AnyElement, parentContainer: PIXI.Container, doc: DocumentState): PIXI.Container {
    const container = new PIXI.Container();
    container.name = el.id;
    container.visible = el.visible;
    container.alpha = el.style.opacity;
    container.zIndex = el.style.zIndex;
    container.sortableChildren = true;

    // Position
    if (el.free) {
      container.position.set(el.style.x, el.style.y);
    } else {
      container.position.set(0, 0); // flex layout handled by parent
    }

    // Rotation
    container.angle = el.style.rotation;

    // Scale
    container.scale.set(el.style.scaleX, el.style.scaleY);

    const parentW = doc.width;
    const parentH = doc.height;
    const w = layoutResolver.resolveSize(el.style.width, parentW);
    const h = layoutResolver.resolveSize(el.style.height, parentH);

    // Draw element graphics
    const gfx = new PIXI.Graphics();
    container.addChild(gfx);
    this._drawElementGraphics(gfx, el, w, h);

    // Text overlay hint (actual editing is DOM)
    if (el.type === 'text') {
      const textObj = new PIXI.Text((el as any).content, {
        fontSize: el.style.fontSize,
        fill: el.style.color,
        fontFamily: el.style.fontFamily,
        fontWeight: el.style.fontWeight as any,
        align: el.style.textAlign as any,
        wordWrap: true,
        wordWrapWidth: w - el.style.paddingLeft - el.style.paddingRight,
        lineHeight: el.style.fontSize * el.style.lineHeight,
      });
      textObj.position.set(el.style.paddingLeft, el.style.paddingTop);
      container.addChild(textObj);
    }

    // Image
    if (el.type === 'image' && (el as any).src) {
      PIXI.Texture.fromURL((el as any).src).then(tex => {
        const sprite = new PIXI.Sprite(tex);
        sprite.width = w;
        sprite.height = h;
        gfx.mask = (() => {
          const m = new PIXI.Graphics();
          m.beginFill(0xffffff);
          m.drawRect(0, 0, w, h);
          m.endFill();
          container.addChild(m);
          return m;
        })();
        container.addChildAt(sprite, 1);
      });
    }

    // Box children
    if (el.type === 'box') {
      const childContainer = new PIXI.Container();
      childContainer.position.set(el.style.paddingLeft, el.style.paddingTop);
      container.addChild(childContainer);
      this._renderChildren((el as any).children ?? [], childContainer, doc);
    }

    // Interactivity
    container.eventMode = 'static';
    container.cursor = 'pointer';
    container.hitArea = new PIXI.Rectangle(0, 0, w, h);

    parentContainer.addChild(container);
    this._displayObjects.set(el.id, container);
    return container;
  }

  private _drawElementGraphics(gfx: PIXI.Graphics, el: AnyElement, w: number, h: number): void {
    const s = el.style;
    const br = layoutResolver.resolveBorderRadius(s, w, h);

    // Background
    if (s.backgroundColor !== 'transparent' && s.backgroundColor) {
      const [r, g, b, a] = parseColor(s.backgroundColor);
      gfx.beginFill((r << 16) | (g << 8) | b, a);
    } else {
      gfx.beginFill(0x000000, 0);
    }

    // Border
    if (s.border.width > 0 && s.border.style !== 'none') {
      gfx.lineStyle(s.border.width, hexToNumber(s.border.color), 1);
    }

    // Draw shape
    const allSame = br.topLeft === br.topRight && br.topRight === br.bottomRight && br.bottomRight === br.bottomLeft;
    if (s.isCircle || (allSame && br.topLeft > 0)) {
      if (s.isCircle) {
        gfx.drawCircle(w / 2, h / 2, Math.min(w, h) / 2);
      } else {
        gfx.drawRoundedRect(0, 0, w, h, br.topLeft);
      }
    } else if (!allSame) {
      // Approximate different corners with a path
      gfx.drawRoundedRect(0, 0, w, h, Math.max(br.topLeft, br.topRight, br.bottomRight, br.bottomLeft));
    } else {
      gfx.drawRect(0, 0, w, h);
    }
    gfx.endFill();
  }

  private _syncElementDisplay(el: AnyElement, container: PIXI.Container): void {
    // For now, full redraw of this element's graphics
    // In production you'd diff and patch
    const parent = container.parent;
    const idx = parent?.getChildIndex(container) ?? 0;
    this.removeElement(el.id);
    if (parent && this._doc) {
      const newContainer = this._createDisplayObject(el, parent, this._doc);
      parent.setChildIndex(newContainer, Math.min(idx, parent.children.length - 1));
    }
  }

  private _getParentContainer(el: AnyElement): PIXI.Container {
    if (el.parentId === null || el.free) return this._rootStage;
    const parentObj = this._displayObjects.get(el.parentId);
    // Find the childContainer inside the parent box
    if (parentObj) {
      const childContainer = parentObj.children.find(
        c => c instanceof PIXI.Container && c !== parentObj.children[0]
      ) as PIXI.Container | undefined;
      return childContainer ?? parentObj;
    }
    return this._rootStage;
  }

  private _toScreenRect(rect: Rect): Rect {
    return {
      x: rect.x + this._rootStage.x,
      y: rect.y + this._rootStage.y,
      width: rect.width,
      height: rect.height,
    };
  }

  private _getHandlePositions(x: number, y: number, w: number, h: number): [number, number][] {
    const cx = x + w / 2, cy = y + h / 2;
    return [
      [x, y], [cx, y], [x + w, y],
      [x, cy],           [x + w, cy],
      [x, y + h], [cx, y + h], [x + w, y + h],
    ];
  }
}
