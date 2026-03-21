/**
 * EventBus — Observer Pattern
 *
 * The central nervous system of the editor. All modules communicate exclusively
 * through this bus — no module holds a direct reference to another module.
 * This enforces loose coupling and satisfies the Dependency Inversion Principle.
 *
 * Supports: typed events, wildcard listeners, once(), and unsubscribe tokens.
 */
export class EventBus {
  constructor() {
    /** @type {Map<string, Set<Function>>} */
    this._listeners = new Map();
  }

  /**
   * Subscribe to an event.
   * @param {string} event
   * @param {Function} listener
   * @returns {Function} Unsubscribe function
   */
  on(event, listener) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set());
    }
    this._listeners.get(event).add(listener);
    return () => this.off(event, listener);
  }

  /** Unsubscribe a specific listener. */
  off(event, listener) {
    this._listeners.get(event)?.delete(listener);
  }

  /**
   * Subscribe once — auto-removes after first emission.
   * @returns {Function} Unsubscribe function
   */
  once(event, listener) {
    const unsub = this.on(event, (data) => {
      listener(data);
      unsub();
    });
    return unsub;
  }

  /**
   * Emit an event with optional payload.
   * Wildcard listeners ('*') receive ALL events as { event, data }.
   */
  emit(event, data) {
    this._listeners.get(event)?.forEach((l) => {
      try {
        l(data);
      } catch (err) {
        console.error(`[EventBus] Error in listener for "${event}":`, err);
      }
    });
    this._listeners.get('*')?.forEach((l) => {
      try {
        l({ event, data });
      } catch (err) {
        console.error('[EventBus] Error in wildcard listener:', err);
      }
    });
  }

  /** Remove all listeners. */
  clear() {
    this._listeners.clear();
  }
}

/**
 * Canonical event name constants.
 * Always import these instead of using raw strings to prevent typos.
 */
export const Events = Object.freeze({
  // ─── Scene ───────────────────────────────────────────────────────────
  SCENE_CHANGED: 'scene:changed',
  SCENE_LOADED: 'scene:loaded',

  // ─── Elements ─────────────────────────────────────────────────────────
  ELEMENT_ADDED: 'element:added',
  ELEMENT_REMOVED: 'element:removed',
  ELEMENT_MOVED: 'element:moved',
  ELEMENT_RESIZED: 'element:resized',
  ELEMENT_STYLE_CHANGED: 'element:style:changed',
  ELEMENT_FREE_CHANGED: 'element:free:changed',
  ELEMENT_REORDERED: 'element:reordered',
  ELEMENT_LOCKED: 'element:locked',
  ELEMENT_VISIBILITY_CHANGED: 'element:visibility:changed',

  // ─── Selection ────────────────────────────────────────────────────────
  SELECTION_CHANGED: 'selection:changed',

  // ─── History ──────────────────────────────────────────────────────────
  HISTORY_CHANGED: 'history:changed',

  // ─── Drag & Drop ──────────────────────────────────────────────────────
  DRAG_START: 'drag:start',
  DRAG_MOVE: 'drag:move',
  DRAG_END: 'drag:end',
  DROP_FROM_PANEL: 'drop:from:panel', // { type, x, y, targetId }

  // ─── Resize ───────────────────────────────────────────────────────────
  RESIZE_START: 'resize:start',
  RESIZE_MOVE: 'resize:move',
  RESIZE_END: 'resize:end',

  // ─── Text ─────────────────────────────────────────────────────────────
  TEXT_EDIT_START: 'text:edit:start',
  TEXT_EDIT_END: 'text:edit:end',
  TEXT_SELECTION_CHANGED: 'text:selection:changed',
  TEXT_FORMAT_APPLIED: 'text:format:applied',

  // ─── Snap ─────────────────────────────────────────────────────────────
  SNAP_GUIDES_CHANGED: 'snap:guides:changed',
  SNAP_TOGGLED: 'snap:toggled',

  // ─── Render ───────────────────────────────────────────────────────────
  RENDER_REQUESTED: 'render:requested',
  RENDER_COMPLETE: 'render:complete',

  // ─── Menubar ──────────────────────────────────────────────────────────
  MENU_EXPORT: 'menu:export',           // { formatName, handler }
  MENU_CUSTOM_ACTION: 'menu:custom:action', // { name, group }

  // ─── Panel ────────────────────────────────────────────────────────────
  PANEL_OPEN: 'panel:open',
  PANEL_CLOSE: 'panel:close',

  // ─── Canvas ───────────────────────────────────────────────────────────
  CANVAS_CLICK: 'canvas:click',
  CANVAS_READY: 'canvas:ready',
});
