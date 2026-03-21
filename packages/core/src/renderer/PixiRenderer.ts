import {
  Application,
  Container,
  Graphics,
  Sprite,
  Text,
  TextStyle,
  Texture,
  ColorMatrixFilter,
  type FederatedPointerEvent,
} from 'pixi.js';
import type {
  AnyElementModel,
  BoxElementModel,
  CanvasConfig,
  EditorState,
  ElementId,
  ImageElementModel,
  ResolvedRect,
  SnapGuide,
  TextElementModel,
} from '../models/types';
import { sizingResolver } from '../sizing/SizingResolver';

// ─── IRenderer ────────────────────────────────────────────────────────────────

export interface IRenderer {
  init(container: HTMLElement): Promise<void>;
  render(state: EditorState): void;
  showSnapGuides(guides: SnapGuide[]): void;
  clearSnapGuides(): void;
  showSelectionHandles(ids: ElementId[], state: EditorState): void;
  clearSelectionHandles(): void;
  getElementAtPoint(x: number, y: number, state: EditorState): ElementId | null;
  canvasToWorld(screenX: number, screenY: number): { x: number; y: number };
  worldToCanvas(worldX: number, worldY: number): { x: number; y: number };
  setZoom(zoom: number): void;
  setPan(panX: number, panY: number): void;
  destroy(): void;
  readonly app: Application;
  readonly stage: Container;
}

// ─── PixiRenderer ─────────────────────────────────────────────────────────────

const SELECTION_COLOR = 0x7c3aed;
const SELECTION_HANDLE_SIZE = 8;
const GUIDE_COLOR = 0xff4757;

export class PixiRenderer implements IRenderer {
  app!: Application;
  stage!: Container;

  /** Root container for all document elements */
  private worldContainer!: Container;
  /** Selection handles overlay */
  private selectionLayer!: Graphics;
  /** Snap guide lines overlay */
  private guideLayer!: Graphics;
  /** Grid layer (behind world) */
  private gridLayer!: Graphics;

  /** Map from elementId → PixiJS Container */
  private nodeMap = new Map<ElementId, Container>();
  /** Map from elementId → resolved rect (for hit testing and snap) */
  private rectMap = new Map<ElementId, ResolvedRect>();

  private containerEl!: HTMLElement;

  async init(container: HTMLElement): Promise<void> {
    this.containerEl = container;
    this.app = new Application();

    await this.app.init({
      resizeTo: container,
      backgroundColor: 0xf0f0f0,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });

    container.appendChild(this.app.canvas);
    this.app.canvas.style.position = 'absolute';
    this.app.canvas.style.top = '0';
    this.app.canvas.style.left = '0';

    this.stage = this.app.stage;
    this.gridLayer = new Graphics();
    this.worldContainer = new Container();
    this.selectionLayer = new Graphics();
    this.guideLayer = new Graphics();

    this.stage.addChild(this.gridLayer);
    this.stage.addChild(this.worldContainer);
    this.stage.addChild(this.selectionLayer);
    this.stage.addChild(this.guideLayer);
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  render(state: EditorState): void {
    this.drawGrid(state);
    this.syncElements(state);
  }

  showSnapGuides(guides: SnapGuide[]): void {
    this.guideLayer.clear();
    for (const guide of guides) {
      this.guideLayer.setStrokeStyle({ width: 1, color: GUIDE_COLOR, alpha: 0.8 });
      if (guide.axis === 'x') {
        this.guideLayer.moveTo(guide.position, guide.start);
        this.guideLayer.lineTo(guide.position, guide.end);
      } else {
        this.guideLayer.moveTo(guide.start, guide.position);
        this.guideLayer.lineTo(guide.end, guide.position);
      }
      this.guideLayer.stroke();
    }
  }

  clearSnapGuides(): void {
    this.guideLayer.clear();
  }

  showSelectionHandles(ids: ElementId[], state: EditorState): void {
    this.selectionLayer.clear();
    for (const id of ids) {
      const rect = this.getWorldRect(id, state);
      if (!rect) continue;

      // Convert world coords to stage coords
      const wc = this.worldContainer;
      const sx = rect.x * wc.scale.x + wc.x;
      const sy = rect.y * wc.scale.y + wc.y;
      const sw = rect.width * wc.scale.x;
      const sh = rect.height * wc.scale.y;

      // Dashed border
      this.selectionLayer.setStrokeStyle({ width: 2, color: SELECTION_COLOR });
      this.selectionLayer.rect(sx, sy, sw, sh);
      this.selectionLayer.stroke();

      // 8 handles
      const handles = this.getHandlePositions(sx, sy, sw, sh);
      for (const [hx, hy] of handles) {
        this.selectionLayer.setFillStyle({ color: 0xffffff });
        this.selectionLayer.setStrokeStyle({ width: 2, color: SELECTION_COLOR });
        this.selectionLayer.rect(
          hx - SELECTION_HANDLE_SIZE / 2,
          hy - SELECTION_HANDLE_SIZE / 2,
          SELECTION_HANDLE_SIZE,
          SELECTION_HANDLE_SIZE,
        );
        this.selectionLayer.fill();
        this.selectionLayer.stroke();
      }

      // Rotation handle (above top-center)
      const rotHx = sx + sw / 2;
      const rotHy = sy - 24;
      this.selectionLayer.setFillStyle({ color: SELECTION_COLOR });
      this.selectionLayer.circle(rotHx, rotHy, 5);
      this.selectionLayer.fill();
      // Stem
      this.selectionLayer.setStrokeStyle({ width: 1.5, color: SELECTION_COLOR });
      this.selectionLayer.moveTo(rotHx, sy);
      this.selectionLayer.lineTo(rotHx, rotHy);
      this.selectionLayer.stroke();
    }
  }

  clearSelectionHandles(): void {
    this.selectionLayer.clear();
  }

  getElementAtPoint(stageX: number, stageY: number, state: EditorState): ElementId | null {
    // Convert to world coords
    const wx = (stageX - this.worldContainer.x) / this.worldContainer.scale.x;
    const wy = (stageY - this.worldContainer.y) / this.worldContainer.scale.y;

    // Check in reverse zIndex order (topmost first)
    const allIds = [
      ...state.rootChildren,
      ...Object.values(state.elements)
        .filter((e) => e.free && !state.rootChildren.includes(e.id))
        .map((e) => e.id),
    ];

    const sorted = [...allIds].sort((a, b) => {
      return (state.elements[b]?.zIndex ?? 0) - (state.elements[a]?.zIndex ?? 0);
    });

    for (const id of sorted) {
      const rect = this.rectMap.get(id);
      if (!rect) continue;
      if (wx >= rect.x && wx <= rect.x + rect.width && wy >= rect.y && wy <= rect.y + rect.height) {
        return id;
      }
    }
    return null;
  }

  canvasToWorld(screenX: number, screenY: number): { x: number; y: number } {
    return {
      x: (screenX - this.worldContainer.x) / this.worldContainer.scale.x,
      y: (screenY - this.worldContainer.y) / this.worldContainer.scale.y,
    };
  }

  worldToCanvas(worldX: number, worldY: number): { x: number; y: number } {
    return {
      x: worldX * this.worldContainer.scale.x + this.worldContainer.x,
      y: worldY * this.worldContainer.scale.y + this.worldContainer.y,
    };
  }

  setZoom(zoom: number): void {
    this.worldContainer.scale.set(zoom);
  }

  setPan(panX: number, panY: number): void {
    this.worldContainer.x = panX;
    this.worldContainer.y = panY;
  }

  destroy(): void {
    this.app.destroy(true, { children: true });
  }

  // ── Private: Grid ──────────────────────────────────────────────────────────

  private drawGrid(state: EditorState): void {
    this.gridLayer.clear();
    if (!state.snap.grid) return;

    const { width, height, backgroundColor } = state.canvas;
    const gridSize = state.snap.gridSize;

    // Canvas background
    this.gridLayer.setFillStyle({ color: this.hexToNumber(backgroundColor) });
    this.gridLayer.rect(
      this.worldContainer.x,
      this.worldContainer.y,
      width * this.worldContainer.scale.x,
      height * this.worldContainer.scale.y,
    );
    this.gridLayer.fill();

    // Grid lines
    this.gridLayer.setStrokeStyle({ width: 0.5, color: 0xcccccc, alpha: 0.5 });
    for (let x = 0; x <= width; x += gridSize) {
      const sx = x * this.worldContainer.scale.x + this.worldContainer.x;
      this.gridLayer.moveTo(sx, this.worldContainer.y);
      this.gridLayer.lineTo(sx, height * this.worldContainer.scale.y + this.worldContainer.y);
    }
    for (let y = 0; y <= height; y += gridSize) {
      const sy = y * this.worldContainer.scale.y + this.worldContainer.y;
      this.gridLayer.moveTo(this.worldContainer.x, sy);
      this.gridLayer.lineTo(width * this.worldContainer.scale.x + this.worldContainer.x, sy);
    }
    this.gridLayer.stroke();
  }

  // ── Private: Element Sync ──────────────────────────────────────────────────

  private syncElements(state: EditorState): void {
    const liveIds = new Set(Object.keys(state.elements));

    // Remove stale nodes
    for (const [id, node] of this.nodeMap) {
      if (!liveIds.has(id)) {
        node.destroy({ children: true });
        this.nodeMap.delete(id);
        this.rectMap.delete(id);
      }
    }

    // Render root children in zIndex order
    const sorted = [...state.rootChildren].sort(
      (a, b) => (state.elements[a]?.zIndex ?? 0) - (state.elements[b]?.zIndex ?? 0),
    );

    for (const id of sorted) {
      const el = state.elements[id];
      if (el) this.syncElement(el, state, this.worldContainer, state.canvas.width, state.canvas.height);
    }
  }

  private syncElement(
    el: AnyElementModel,
    state: EditorState,
    parentContainer: Container,
    parentW: number,
    parentH: number,
  ): void {
    const rect = sizingResolver.resolveRect(el.transform, parentW, parentH);

    // Store resolved rect for hit testing and snap
    this.rectMap.set(el.id, { ...rect });

    let node = this.nodeMap.get(el.id);
    if (!node) {
      node = this.createNode(el);
      this.nodeMap.set(el.id, node);
      parentContainer.addChild(node);
    }

    this.applyTransform(node, rect, el.transform.rotation);
    this.applyFormats(node, el, rect);

    node.visible = el.visible;
    node.zIndex = el.zIndex;
    node.alpha = el.formats.opacity ?? 1;

    // Recurse for box children
    if (el.type === 'box') {
      const box = el as BoxElementModel;
      const sorted = [...box.children].sort(
        (a, b) => (state.elements[a]?.zIndex ?? 0) - (state.elements[b]?.zIndex ?? 0),
      );
      for (const childId of sorted) {
        const child = state.elements[childId];
        if (child && !child.free) {
          this.syncElement(child, state, node, rect.width, rect.height);
        }
      }
    }

    // Free elements are rendered at root level regardless of model parentId
    if (el.free && parentContainer !== this.worldContainer) {
      parentContainer.removeChild(node);
      this.worldContainer.addChild(node);
    }
  }

  private createNode(el: AnyElementModel): Container {
    switch (el.type) {
      case 'box':
        return new Container();
      case 'image':
        return new Container();
      case 'text':
        return new Container();
    }
  }

  private applyTransform(node: Container, rect: ResolvedRect, rotation: number): void {
    node.x = rect.x;
    node.y = rect.y;
    node.angle = rotation;
  }

  private applyFormats(node: Container, el: AnyElementModel, rect: ResolvedRect): void {
    // Clear previous graphics children
    node.removeChildren();

    const g = new Graphics();

    // Border radius
    const br = el.formats.borderRadius;
    const radius = br === 'circle' ? Math.min(rect.width, rect.height) / 2 : (br ?? 0);

    // Background
    if (el.formats.backgroundColor) {
      g.setFillStyle({ color: this.hexToNumber(el.formats.backgroundColor) });
    } else {
      g.setFillStyle({ color: 0xffffff, alpha: 0 });
    }

    g.roundRect(0, 0, rect.width, rect.height, radius);
    g.fill();

    // Border
    if (el.formats.border && el.formats.border.style !== 'none') {
      g.setStrokeStyle({
        width: el.formats.border.width,
        color: this.hexToNumber(el.formats.border.color),
      });
      g.roundRect(0, 0, rect.width, rect.height, radius);
      g.stroke();
    }

    node.addChild(g);

    // Background image (as Sprite)
    if (el.formats.backgroundImage || (el.type === 'image' && (el as ImageElementModel).src)) {
      const src = el.type === 'image' ? (el as ImageElementModel).src : el.formats.backgroundImage!;
      this.applyImage(node, src, rect);
    }

    // Text content
    if (el.type === 'text') {
      this.applyText(node, el as TextElementModel, rect);
    }
  }

  private applyImage(node: Container, src: string, rect: ResolvedRect): void {
    const texture = Texture.from(src);
    const sprite = new Sprite(texture);
    sprite.width = rect.width;
    sprite.height = rect.height;
    node.addChild(sprite);
  }

  private applyText(node: Container, el: TextElementModel, rect: ResolvedRect): void {
    const style = new TextStyle({
      fill: el.formats.color ?? '#000000',
      fontSize: el.formats.fontSize ?? 16,
      fontWeight: el.formats.fontWeight ?? '400',
      fontFamily: el.formats.fontFamily ?? 'Inter, sans-serif',
      fontStyle: el.formats.fontStyle ?? 'normal',
      align: el.formats.textAlign ?? 'left',
      wordWrap: true,
      wordWrapWidth: rect.width,
      lineHeight: el.formats.lineHeight,
      letterSpacing: el.formats.letterSpacing,
    });

    // Strip HTML tags for PixiJS display (DOM overlay used for editing)
    const plain = el.content.replace(/<[^>]+>/g, '');
    const text = new Text({ text: plain || el.placeholder || '', style });
    const p = el.formats.padding;
    const padLeft = typeof p === 'object' ? p.left : (p ?? 0);
    const padTop = typeof p === 'object' ? p.top : (p ?? 0);
    text.x = padLeft;
    text.y = padTop;
    node.addChild(text);
  }

  // ── Private: Geometry ──────────────────────────────────────────────────────

  private getHandlePositions(
    x: number,
    y: number,
    w: number,
    h: number,
  ): [number, number][] {
    return [
      [x, y],           // top-left
      [x + w / 2, y],   // top-center
      [x + w, y],       // top-right
      [x + w, y + h / 2], // mid-right
      [x + w, y + h],   // bottom-right
      [x + w / 2, y + h], // bottom-center
      [x, y + h],       // bottom-left
      [x, y + h / 2],   // mid-left
    ];
  }

  private getWorldRect(id: ElementId, state: EditorState): ResolvedRect | null {
    const el = state.elements[id];
    if (!el) return null;
    return this.rectMap.get(id) ?? null;
  }

  private hexToNumber(hex: string): number {
    return parseInt(hex.replace('#', ''), 16);
  }
}
