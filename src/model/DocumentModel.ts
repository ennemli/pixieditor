import type {
  DocumentState,
  AnyElement,
  ElementType,
  ElementStyle,
  BoxElement,
  ImageElement,
  TextElement,
} from '../types/index.js';
import { generateId } from '../utils/IdGenerator.js';
import { DEFAULT_STYLE, mergeStyle } from '../utils/styleDefaults.js';
import { deepClone } from '../utils/deepClone.js';

/**
 * DocumentModel owns all element data and enforces tree invariants.
 * It is the single source of truth — the renderer and panels only READ from it.
 *
 * Design: Repository + in-memory store with an immutable snapshot API.
 */
export class DocumentModel {
  private _state: DocumentState;

  constructor(initial?: Partial<Omit<DocumentState, 'id' | 'elements' | 'children'>>) {
    this._state = {
      id: generateId('doc'),
      name: initial?.name ?? 'Untitled',
      width: initial?.width ?? 1200,
      height: initial?.height ?? 800,
      backgroundColor: initial?.backgroundColor ?? '#ffffff',
      backgroundImage: initial?.backgroundImage ?? '',
      children: [],
      elements: {},
    };
  }

  // ─── Snapshot ───────────────────────────────────────────────────────────

  getSnapshot(): DocumentState {
    return deepClone(this._state);
  }

  loadSnapshot(snap: DocumentState): void {
    this._state = deepClone(snap);
  }

  // ─── Element Queries ────────────────────────────────────────────────────

  getElement(id: string): AnyElement | undefined {
    return this._state.elements[id];
  }

  getElementOrThrow(id: string): AnyElement {
    const el = this._state.elements[id];
    if (!el) throw new Error(`Element "${id}" not found`);
    return el;
  }

  getAllElements(): AnyElement[] {
    return Object.values(this._state.elements);
  }

  getChildren(parentId: string | null): AnyElement[] {
    const ids = parentId === null
      ? this._state.children
      : (this._state.elements[parentId] as BoxElement | undefined)?.children ?? [];
    return ids.map(id => this._state.elements[id]).filter(Boolean) as AnyElement[];
  }

  getRootChildren(): AnyElement[] {
    return this.getChildren(null);
  }

  /** Walk the full subtree in DFS order */
  walkSubtree(rootId: string | null, cb: (el: AnyElement) => void): void {
    const ids = rootId === null ? this._state.children
      : (this._state.elements[rootId] as BoxElement | undefined)?.children ?? [];
    for (const id of ids) {
      const el = this._state.elements[id];
      if (!el) continue;
      cb(el);
      if (el.type === 'box') this.walkSubtree(id, cb);
    }
  }

  /** Returns all ancestors from immediate parent up to root */
  getAncestors(id: string): AnyElement[] {
    const result: AnyElement[] = [];
    let current = this._state.elements[id];
    while (current?.parentId) {
      const parent = this._state.elements[current.parentId];
      if (!parent) break;
      result.push(parent);
      current = parent;
    }
    return result;
  }

  getDocument(): DocumentState {
    return this._state;
  }

  // ─── Element Mutations ──────────────────────────────────────────────────

  addElement(
    type: ElementType,
    parentId: string | null,
    stylePatch: Partial<ElementStyle> = {},
    extraProps: Record<string, unknown> = {}
  ): AnyElement {
    const id = generateId(type);
    const style = mergeStyle(
      { ...DEFAULT_STYLE, ...this._defaultStyleFor(type) },
      stylePatch
    );

    let el: AnyElement;
    switch (type) {
      case 'box':
        el = {
          id, type, name: 'Box', style,
          free: false, parentId,
          locked: false, visible: true,
          children: [],
          ...extraProps,
        } as BoxElement;
        break;
      case 'image':
        el = {
          id, type, name: 'Image', style,
          free: false, parentId,
          locked: false, visible: true,
          src: (extraProps.src as string) ?? '',
          alt: (extraProps.alt as string) ?? '',
          ...extraProps,
        } as ImageElement;
        break;
      case 'text':
        el = {
          id, type, name: 'Text', style,
          free: false, parentId,
          locked: false, visible: true,
          content: (extraProps.content as string) ?? 'Text',
          ...extraProps,
        } as TextElement;
        break;
    }

    this._state.elements[id] = el;
    this._appendToParent(id, parentId);
    return el;
  }

  removeElement(id: string): void {
    const el = this._state.elements[id];
    if (!el) return;
    // Remove from parent's children list
    this._removeFromParent(id, el.parentId);
    // Recursively remove subtree
    if (el.type === 'box') {
      for (const childId of [...el.children]) {
        this.removeElement(childId);
      }
    }
    delete this._state.elements[id];
  }

  updateStyle(id: string, patch: Partial<ElementStyle>): void {
    const el = this._state.elements[id];
    if (!el) return;
    el.style = { ...el.style, ...patch };
  }

  updateContent(id: string, content: string): void {
    const el = this._state.elements[id] as TextElement | undefined;
    if (el?.type === 'text') el.content = content;
  }

  updateSrc(id: string, src: string): void {
    const el = this._state.elements[id] as ImageElement | undefined;
    if (el?.type === 'image') el.src = src;
  }

  updateName(id: string, name: string): void {
    const el = this._state.elements[id];
    if (el) el.name = name;
  }

  setLocked(id: string, locked: boolean): void {
    const el = this._state.elements[id];
    if (el) el.locked = locked;
  }

  setVisible(id: string, visible: boolean): void {
    const el = this._state.elements[id];
    if (el) el.visible = visible;
  }

  /**
   * Make element free: reparent it to root and record absolute position.
   * Position is passed in (caller must resolve world coordinates first).
   */
  setFree(id: string, free: boolean, worldPos?: { x: number; y: number }): void {
    const el = this._state.elements[id];
    if (!el) return;

    if (free && !el.free) {
      // Remove from current parent, attach to root
      this._removeFromParent(id, el.parentId);
      el.parentId = null;
      el.free = true;
      if (worldPos) {
        el.style.x = worldPos.x;
        el.style.y = worldPos.y;
      }
      this._appendToParent(id, null);
    } else if (!free && el.free) {
      // Move back under a target parent (default: root keeping position)
      el.free = false;
      // parentId stays null (root) unless caller changes it
    }
  }

  /**
   * Reparent an element under a new parent.
   * If newParentId is null, element goes to root.
   */
  reparent(id: string, newParentId: string | null): void {
    const el = this._state.elements[id];
    if (!el) return;
    this._removeFromParent(id, el.parentId);
    el.parentId = newParentId;
    this._appendToParent(id, newParentId);
  }

  // ─── Layer Order ────────────────────────────────────────────────────────

  moveLayer(id: string, direction: 'up' | 'down' | 'top' | 'bottom'): void {
    const el = this._state.elements[id];
    if (!el) return;
    const siblings = el.parentId === null
      ? this._state.children
      : (this._state.elements[el.parentId] as BoxElement).children;

    const idx = siblings.indexOf(id);
    if (idx === -1) return;

    siblings.splice(idx, 1);
    switch (direction) {
      case 'up':    siblings.splice(Math.min(idx + 1, siblings.length), 0, id); break;
      case 'down':  siblings.splice(Math.max(idx - 1, 0), 0, id); break;
      case 'top':   siblings.push(id); break;
      case 'bottom':siblings.unshift(id); break;
    }
  }

  reorderLayer(id: string, targetId: string, position: 'before' | 'after'): void {
    const el = this._state.elements[id];
    const target = this._state.elements[targetId];
    if (!el || !target) return;

    const siblings = el.parentId === null
      ? this._state.children
      : (this._state.elements[el.parentId!] as BoxElement).children;

    const fromIdx = siblings.indexOf(id);
    if (fromIdx === -1) return;
    siblings.splice(fromIdx, 1);

    const toIdx = siblings.indexOf(targetId);
    const insertAt = position === 'before' ? toIdx : toIdx + 1;
    siblings.splice(Math.max(0, insertAt), 0, id);
  }

  // ─── Document Properties ────────────────────────────────────────────────

  setDocumentSize(width: number, height: number): void {
    this._state.width = width;
    this._state.height = height;
  }

  setDocumentBackground(color: string): void {
    this._state.backgroundColor = color;
  }

  setDocumentBackgroundImage(url: string): void {
    this._state.backgroundImage = url;
  }

  // ─── Private helpers ────────────────────────────────────────────────────

  private _appendToParent(id: string, parentId: string | null): void {
    if (parentId === null) {
      this._state.children.push(id);
    } else {
      const parent = this._state.elements[parentId] as BoxElement | undefined;
      if (parent?.type === 'box') parent.children.push(id);
    }
  }

  private _removeFromParent(id: string, parentId: string | null): void {
    if (parentId === null) {
      const idx = this._state.children.indexOf(id);
      if (idx !== -1) this._state.children.splice(idx, 1);
    } else {
      const parent = this._state.elements[parentId] as BoxElement | undefined;
      if (parent?.type === 'box') {
        const idx = parent.children.indexOf(id);
        if (idx !== -1) parent.children.splice(idx, 1);
      }
    }
  }

  private _defaultStyleFor(type: ElementType): Partial<ElementStyle> {
    switch (type) {
      case 'box':   return { backgroundColor: '#f0f0f0', width: 200, height: 150 };
      case 'image': return { width: 200, height: 150, objectFit: 'cover' };
      case 'text':  return { width: 150, height: 40, backgroundColor: 'transparent', fontSize: 16 };
    }
  }
}
