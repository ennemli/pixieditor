import { Events } from '../core/EventBus.js';

/**
 * SelectionManager — Single Responsibility: owns the selection state.
 *
 * Supports multi-select (Shift+click).
 * Notifies the bus on every change so renderer and panels can react.
 */
export class SelectionManager {
  /**
   * @param {import('../core/EventBus.js').EventBus} bus
   */
  constructor(bus) {
    this._bus = bus;
    /** @type {Set<string>} */
    this._selected = new Set();
  }

  /** @returns {string[]} */
  get ids() {
    return [...this._selected];
  }

  /** @returns {string|null} First selected id (single-select case) */
  get primary() {
    return this._selected.size > 0 ? [...this._selected][0] : null;
  }

  get count() {
    return this._selected.size;
  }

  has(id) {
    return this._selected.has(id);
  }

  /**
   * Select a single element, deselecting all others.
   * @param {string} id
   */
  select(id) {
    this._selected.clear();
    this._selected.add(id);
    this._notify();
  }

  /**
   * Toggle an element in the selection (for Shift+click multi-select).
   * @param {string} id
   */
  toggle(id) {
    if (this._selected.has(id)) {
      this._selected.delete(id);
    } else {
      this._selected.add(id);
    }
    this._notify();
  }

  /**
   * Add multiple ids to the selection (rubber-band select).
   * @param {string[]} ids
   */
  addMany(ids) {
    ids.forEach((id) => this._selected.add(id));
    this._notify();
  }

  /**
   * Replace entire selection.
   * @param {string[]} ids
   */
  setAll(ids) {
    this._selected = new Set(ids);
    this._notify();
  }

  /** Deselect everything. */
  clear() {
    if (this._selected.size === 0) return;
    this._selected.clear();
    this._notify();
  }

  /** Remove a specific id from selection (e.g. when element is deleted). */
  remove(id) {
    this._selected.delete(id);
    this._notify();
  }

  _notify() {
    this._bus.emit(Events.SELECTION_CHANGED, {
      ids: this.ids,
      primary: this.primary,
      count: this.count,
    });
  }
}
