import type { IRenderer } from '../renderer/PixiRenderer';
import type { EditorState, ElementId, ResolvedRect, SnapGuide } from '../models/types';
import type { EditorEventMap } from '../events/EditorEvents';
import type { EventBus } from '../events/EventBus';
import { SnapEngine } from '../snap/SnapEngine';
import { sizingResolver } from '../sizing/SizingResolver';

// ─── Resize Handle ────────────────────────────────────────────────────────────

export type ResizeHandle =
  | 'nw' | 'n' | 'ne'
  | 'e' | 'se' | 's' | 'sw' | 'w'
  | 'rotate';

// ─── IInteractionHandler ──────────────────────────────────────────────────────

export interface IInteractionHandler {
  readonly id: string;
  onPointerDown(e: PointerEvent, ctx: InteractionContext): void;
  onPointerMove(e: PointerEvent, ctx: InteractionContext): void;
  onPointerUp(e: PointerEvent, ctx: InteractionContext): void;
  onDoubleClick(e: MouseEvent, ctx: InteractionContext): void;
  onKeyDown(e: KeyboardEvent, ctx: InteractionContext): void;
}

export interface InteractionContext {
  getState(): EditorState;
  renderer: IRenderer;
  bus: EventBus<EditorEventMap>;
  snapEngine: SnapEngine;
  /** Emit a command request — Editor listens and executes */
  executeCommand(cmd: import('../commands/ICommand').ICommand): void;
  setActiveHandler(id: string | null): void;
  getOtherRects(excludeId: ElementId): Record<string, ResolvedRect>;
}

// ─── SelectHandler ────────────────────────────────────────────────────────────

export class SelectHandler implements IInteractionHandler {
  readonly id = 'select';

  onPointerDown(e: PointerEvent, ctx: InteractionContext): void {
    const state = ctx.getState();
    const worldPos = ctx.renderer.canvasToWorld(e.offsetX, e.offsetY);
    const hitId = ctx.renderer.getElementAtPoint(e.offsetX, e.offsetY, state);

    if (!hitId) {
      // Click on empty canvas — clear selection
      ctx.bus.emit('selection:changed', { selectedIds: [] });
      ctx.bus.emit('selection:cleared', {});
      return;
    }

    const el = state.elements[hitId];
    if (!el || el.locked) return;

    if (e.shiftKey) {
      // Multi-select toggle
      const next = state.selectedIds.includes(hitId)
        ? state.selectedIds.filter((id) => id !== hitId)
        : [...state.selectedIds, hitId];
      ctx.bus.emit('selection:changed', { selectedIds: next });
    } else if (!state.selectedIds.includes(hitId)) {
      ctx.bus.emit('selection:changed', { selectedIds: [hitId] });
    }
  }

  onPointerMove(_e: PointerEvent, _ctx: InteractionContext): void {}
  onPointerUp(_e: PointerEvent, _ctx: InteractionContext): void {}
  onDoubleClick(_e: MouseEvent, _ctx: InteractionContext): void {}
  onKeyDown(_e: KeyboardEvent, _ctx: InteractionContext): void {}
}

// ─── DragHandler ──────────────────────────────────────────────────────────────

export class DragHandler implements IInteractionHandler {
  readonly id = 'drag';

  private dragging = false;
  private dragId: ElementId | null = null;
  private startWorld = { x: 0, y: 0 };
  private startElementPos = { x: 0, y: 0 };

  onPointerDown(e: PointerEvent, ctx: InteractionContext): void {
    const state = ctx.getState();
    const hitId = ctx.renderer.getElementAtPoint(e.offsetX, e.offsetY, state);
    if (!hitId) return;

    const el = state.elements[hitId];
    if (!el || el.locked) return;

    this.dragId = hitId;
    this.dragging = false; // becomes true on first move
    this.startWorld = ctx.renderer.canvasToWorld(e.offsetX, e.offsetY);

    // Resolve element's current position in pixels
    const parentW = state.canvas.width;
    const parentH = state.canvas.height;
    const rect = sizingResolver.resolveRect(el.transform, parentW, parentH);
    this.startElementPos = { x: rect.x, y: rect.y };

    ctx.bus.emit('drag:start', { id: hitId });
  }

  onPointerMove(e: PointerEvent, ctx: InteractionContext): void {
    if (!this.dragId) return;

    const state = ctx.getState();
    const el = state.elements[this.dragId];
    if (!el) return;

    this.dragging = true;

    const worldPos = ctx.renderer.canvasToWorld(e.offsetX, e.offsetY);
    const dx = worldPos.x - this.startWorld.x;
    const dy = worldPos.y - this.startWorld.y;

    const rawX = this.startElementPos.x + dx;
    const rawY = this.startElementPos.y + dy;

    const parentW = state.canvas.width;
    const parentH = state.canvas.height;
    const width = sizingResolver.resolveSize(el.transform.width, parentW);
    const height = sizingResolver.resolveSize(el.transform.height, parentH);

    const rawRect: ResolvedRect = { x: rawX, y: rawY, width, height };
    const otherRects = ctx.getOtherRects(this.dragId);

    const snapped = ctx.snapEngine.snap(rawRect, {
      state,
      draggingId: this.dragId,
      otherRects,
      canvasWidth: state.canvas.width,
      canvasHeight: state.canvas.height,
      threshold: state.snap.threshold,
    });

    ctx.renderer.showSnapGuides(snapped.guides);
    ctx.bus.emit('drag:move', {
      id: this.dragId,
      x: snapped.x,
      y: snapped.y,
      guides: snapped.guides,
    });
  }

  onPointerUp(e: PointerEvent, ctx: InteractionContext): void {
    if (!this.dragId) return;

    if (this.dragging) {
      const state = ctx.getState();
      const worldPos = ctx.renderer.canvasToWorld(e.offsetX, e.offsetY);
      const dx = worldPos.x - this.startWorld.x;
      const dy = worldPos.y - this.startWorld.y;
      const rawX = this.startElementPos.x + dx;
      const rawY = this.startElementPos.y + dy;

      const { MoveCommand } = await import('../commands/commands');
      ctx.executeCommand(new MoveCommand(this.dragId, rawX, rawY, state));
    }

    ctx.renderer.clearSnapGuides();
    ctx.bus.emit('drag:end', { id: this.dragId });
    this.dragging = false;
    this.dragId = null;
  }

  onDoubleClick(_e: MouseEvent, _ctx: InteractionContext): void {}
  onKeyDown(_e: KeyboardEvent, _ctx: InteractionContext): void {}
}

// ─── ResizeHandler ────────────────────────────────────────────────────────────

export class ResizeHandler implements IInteractionHandler {
  readonly id = 'resize';

  private resizing = false;
  private activeHandle: ResizeHandle | null = null;
  private targetId: ElementId | null = null;
  private startRect: ResolvedRect | null = null;
  private startPointer = { x: 0, y: 0 };

  private readonly HANDLE_HIT_SIZE = 12;

  onPointerDown(e: PointerEvent, ctx: InteractionContext): void {
    const state = ctx.getState();
    if (state.selectedIds.length !== 1) return;
    const id = state.selectedIds[0];
    const el = state.elements[id];
    if (!el) return;

    const handle = this.getHitHandle(e.offsetX, e.offsetY, id, state, ctx);
    if (!handle) return;

    this.targetId = id;
    this.activeHandle = handle;
    this.startPointer = { x: e.offsetX, y: e.offsetY };
    this.startRect = this.getResolvedRect(id, state, ctx);
    this.resizing = true;
    ctx.bus.emit('resize:start', { id });
    e.stopPropagation();
  }

  onPointerMove(e: PointerEvent, ctx: InteractionContext): void {
    if (!this.resizing || !this.targetId || !this.startRect || !this.activeHandle) return;

    const dx = e.offsetX - this.startPointer.x;
    const dy = e.offsetY - this.startPointer.y;

    const next = this.computeResize(this.startRect, this.activeHandle, dx, dy);
    ctx.bus.emit('drag:move', { id: this.targetId, x: next.x, y: next.y, guides: [] });
  }

  onPointerUp(e: PointerEvent, ctx: InteractionContext): void {
    if (!this.resizing || !this.targetId || !this.startRect || !this.activeHandle) return;

    const state = ctx.getState();
    const dx = e.offsetX - this.startPointer.x;
    const dy = e.offsetY - this.startPointer.y;
    const next = this.computeResize(this.startRect, this.activeHandle, dx, dy);

    const { ResizeCommand } = await import('../commands/commands');
    ctx.executeCommand(new ResizeCommand(this.targetId, next, state));

    ctx.bus.emit('resize:end', { id: this.targetId });
    this.resizing = false;
    this.targetId = null;
    this.activeHandle = null;
    this.startRect = null;
  }

  onDoubleClick(_e: MouseEvent, _ctx: InteractionContext): void {}
  onKeyDown(_e: KeyboardEvent, _ctx: InteractionContext): void {}

  private computeResize(
    start: ResolvedRect,
    handle: ResizeHandle,
    dx: number,
    dy: number,
  ): { x: number; y: number; width: number; height: number } {
    let { x, y, width, height } = start;
    switch (handle) {
      case 'se': width += dx; height += dy; break;
      case 'sw': x += dx; width -= dx; height += dy; break;
      case 'ne': width += dx; y += dy; height -= dy; break;
      case 'nw': x += dx; y += dy; width -= dx; height -= dy; break;
      case 'e':  width += dx; break;
      case 'w':  x += dx; width -= dx; break;
      case 's':  height += dy; break;
      case 'n':  y += dy; height -= dy; break;
    }
    return { x, y, width: Math.max(10, width), height: Math.max(10, height) };
  }

  private getHitHandle(
    sx: number,
    sy: number,
    id: ElementId,
    state: EditorState,
    ctx: InteractionContext,
  ): ResizeHandle | null {
    const rect = this.getResolvedRect(id, state, ctx);
    if (!rect) return null;

    const cp = ctx.renderer.worldToCanvas(rect.x, rect.y);
    const ex = cp.x;
    const ey = cp.y;
    const ew = rect.width * state.canvas.zoom;
    const eh = rect.height * state.canvas.zoom;
    const h = this.HANDLE_HIT_SIZE;

    const handles: [ResizeHandle, number, number][] = [
      ['nw', ex, ey],
      ['n', ex + ew / 2, ey],
      ['ne', ex + ew, ey],
      ['e', ex + ew, ey + eh / 2],
      ['se', ex + ew, ey + eh],
      ['s', ex + ew / 2, ey + eh],
      ['sw', ex, ey + eh],
      ['w', ex, ey + eh / 2],
    ];

    for (const [name, hx, hy] of handles) {
      if (Math.abs(sx - hx) <= h && Math.abs(sy - hy) <= h) return name;
    }
    return null;
  }

  private getResolvedRect(id: ElementId, state: EditorState, ctx: InteractionContext): ResolvedRect | null {
    const el = state.elements[id];
    if (!el) return null;
    return sizingResolver.resolveRect(el.transform, state.canvas.width, state.canvas.height);
  }
}

// ─── TextEditHandler ──────────────────────────────────────────────────────────

/**
 * On double-click of a text element:
 *  1. Creates a contenteditable div positioned over the canvas element
 *  2. Synced to the element's canvas position
 *  3. On blur/Enter, writes content back as a SetPropertyCommand
 */
export class TextEditHandler implements IInteractionHandler {
  readonly id = 'text-edit';

  private overlay: HTMLDivElement | null = null;
  private editingId: ElementId | null = null;
  private canvasEl: HTMLCanvasElement | null = null;

  constructor(private readonly container: HTMLElement) {}

  onPointerDown(_e: PointerEvent, _ctx: InteractionContext): void {}
  onPointerMove(_e: PointerEvent, _ctx: InteractionContext): void {}
  onPointerUp(_e: PointerEvent, _ctx: InteractionContext): void {}

  onDoubleClick(e: MouseEvent, ctx: InteractionContext): void {
    const state = ctx.getState();
    const hitId = ctx.renderer.getElementAtPoint(e.offsetX, e.offsetY, state);
    if (!hitId) return;

    const el = state.elements[hitId];
    if (!el || el.type !== 'text' || el.locked) return;

    this.startEditing(hitId, ctx);
  }

  onKeyDown(e: KeyboardEvent, ctx: InteractionContext): void {
    if (e.key === 'Escape' && this.editingId) {
      this.stopEditing(ctx, false);
    }
  }

  private startEditing(id: ElementId, ctx: InteractionContext): void {
    const state = ctx.getState();
    const el = state.elements[id];
    if (!el || el.type !== 'text') return;

    this.editingId = id;
    ctx.bus.emit('text:edit-start', { id });

    const rect = sizingResolver.resolveRect(el.transform, state.canvas.width, state.canvas.height);
    const cp = ctx.renderer.worldToCanvas(rect.x, rect.y);
    const zoom = state.canvas.zoom;

    const div = document.createElement('div');
    div.contentEditable = 'true';
    div.innerHTML = el.content;
    div.style.cssText = `
      position: absolute;
      left: ${cp.x}px;
      top: ${cp.y}px;
      width: ${rect.width * zoom}px;
      min-height: ${rect.height * zoom}px;
      font-size: ${(el.formats.fontSize ?? 16) * zoom}px;
      font-family: ${el.formats.fontFamily ?? 'Inter, sans-serif'};
      font-weight: ${el.formats.fontWeight ?? '400'};
      color: ${el.formats.color ?? '#000000'};
      text-align: ${el.formats.textAlign ?? 'left'};
      background: transparent;
      border: 2px solid #7c3aed;
      outline: none;
      z-index: 9999;
      box-sizing: border-box;
      padding: 4px;
      word-wrap: break-word;
    `;

    div.addEventListener('blur', () => this.stopEditing(ctx, true));
    div.addEventListener('input', () => {
      ctx.bus.emit('text:selection', { id, hasSelection: !!window.getSelection()?.toString() });
    });

    this.container.appendChild(div);
    this.overlay = div;

    // Focus and select all
    requestAnimationFrame(() => {
      div.focus();
      document.execCommand('selectAll', false);
    });
  }

  private async stopEditing(ctx: InteractionContext, save: boolean): Promise<void> {
    if (!this.editingId || !this.overlay) return;

    if (save) {
      const content = this.overlay.innerHTML;
      const { SetPropertyCommand } = await import('../commands/commands');
      ctx.executeCommand(
        new SetPropertyCommand(this.editingId, 'content' as any, content, ctx.getState()),
      );
    }

    ctx.bus.emit('text:edit-end', { id: this.editingId, content: this.overlay.innerHTML });

    this.overlay.remove();
    this.overlay = null;
    this.editingId = null;
  }
}

// ─── DropHandler ──────────────────────────────────────────────────────────────

/**
 * Handles elements dragged from the left panel onto the canvas.
 * The left panel sets `data-transfer` with the template JSON.
 */
export class DropHandler {
  constructor(
    private readonly canvasEl: HTMLElement,
    private readonly bus: EventBus<EditorEventMap>,
    private readonly renderer: IRenderer,
  ) {
    this.canvasEl.addEventListener('dragover', this.onDragOver);
    this.canvasEl.addEventListener('drop', this.onDrop);
  }

  private onDragOver = (e: DragEvent): void => {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
  };

  private onDrop = (e: DragEvent): void => {
    e.preventDefault();
    const json = e.dataTransfer?.getData('application/pixieditor-template');
    if (!json) return;

    try {
      const template = JSON.parse(json);
      const rect = this.canvasEl.getBoundingClientRect();
      const world = this.renderer.canvasToWorld(e.clientX - rect.left, e.clientY - rect.top);
      this.bus.emit('drop:element-template', {
        templateId: template.id,
        canvasX: world.x,
        canvasY: world.y,
      });
    } catch {
      console.warn('[DropHandler] Invalid template JSON');
    }
  };

  destroy(): void {
    this.canvasEl.removeEventListener('dragover', this.onDragOver);
    this.canvasEl.removeEventListener('drop', this.onDrop);
  }
}

// ─── InteractionEngine ────────────────────────────────────────────────────────

/**
 * Mediates pointer events across multiple IInteractionHandler instances.
 * Handlers are prioritized: ResizeHandler > DragHandler > SelectHandler.
 */
export class InteractionEngine {
  private handlers: IInteractionHandler[];
  private activeHandlerId: string | null = null;
  private dropHandler!: DropHandler;

  constructor(
    private readonly canvasEl: HTMLElement,
    private readonly ctx: InteractionContext,
    container: HTMLElement,
  ) {
    this.handlers = [
      new ResizeHandler(),
      new DragHandler(),
      new SelectHandler(),
      new TextEditHandler(container),
    ];

    this.dropHandler = new DropHandler(canvasEl, ctx.bus, ctx.renderer);

    canvasEl.addEventListener('pointerdown', this.onPointerDown);
    canvasEl.addEventListener('pointermove', this.onPointerMove);
    canvasEl.addEventListener('pointerup', this.onPointerUp);
    canvasEl.addEventListener('dblclick', this.onDoubleClick);
    document.addEventListener('keydown', this.onKeyDown);
  }

  private onPointerDown = (e: PointerEvent): void => {
    this.canvasEl.setPointerCapture(e.pointerId);
    for (const handler of this.handlers) {
      handler.onPointerDown(e, this.ctx);
    }
  };

  private onPointerMove = (e: PointerEvent): void => {
    for (const handler of this.handlers) {
      handler.onPointerMove(e, this.ctx);
    }
  };

  private onPointerUp = (e: PointerEvent): void => {
    this.canvasEl.releasePointerCapture(e.pointerId);
    for (const handler of this.handlers) {
      handler.onPointerUp(e, this.ctx);
    }
  };

  private onDoubleClick = (e: MouseEvent): void => {
    for (const handler of this.handlers) {
      handler.onDoubleClick(e, this.ctx);
    }
  };

  private onKeyDown = (e: KeyboardEvent): void => {
    for (const handler of this.handlers) {
      handler.onKeyDown(e, this.ctx);
    }
  };

  destroy(): void {
    this.canvasEl.removeEventListener('pointerdown', this.onPointerDown);
    this.canvasEl.removeEventListener('pointermove', this.onPointerMove);
    this.canvasEl.removeEventListener('pointerup', this.onPointerUp);
    this.canvasEl.removeEventListener('dblclick', this.onDoubleClick);
    document.removeEventListener('keydown', this.onKeyDown);
    this.dropHandler.destroy();
  }
}
