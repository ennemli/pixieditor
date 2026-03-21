import { Events } from '../core/EventBus.js';

// ─────────────────────────────────────────────────────────────────────────────
// ISnapStrategy — Interface (Open/Closed: add snap types without editing engine)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Abstract snap strategy interface.
 * All snap strategies implement: getSnapPoints(context) → SnapResult[]
 */
export class ISnapStrategy {
  /**
   * @param {SnapContext} context
   * @returns {SnapResult[]}
   */
  getSnapPoints(_context) {
    throw new Error('ISnapStrategy.getSnapPoints must be implemented');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GridSnap
// ─────────────────────────────────────────────────────────────────────────────

export class GridSnap extends ISnapStrategy {
  /** @param {number} gridSize */
  constructor(gridSize) {
    super();
    this._gridSize = gridSize;
  }

  getSnapPoints({ x, y }) {
    const snappedX = Math.round(x / this._gridSize) * this._gridSize;
    const snappedY = Math.round(y / this._gridSize) * this._gridSize;
    return [
      { x: snappedX, y: snappedY, guides: [] },
    ];
  }

  set gridSize(v) { this._gridSize = v; }
  get gridSize() { return this._gridSize; }
}

// ─────────────────────────────────────────────────────────────────────────────
// EdgeSnap — canvas edges + center
// ─────────────────────────────────────────────────────────────────────────────

export class EdgeSnap extends ISnapStrategy {
  constructor(canvasWidth, canvasHeight, threshold) {
    super();
    this._cw = canvasWidth;
    this._ch = canvasHeight;
    this._threshold = threshold;
  }

  getSnapPoints({ x, y, width, height }) {
    const result = { x, y, guides: [] };
    const centerX = this._cw / 2;
    const centerY = this._ch / 2;

    // Snap left edge, right edge, center X
    const xCandidates = [
      { val: 0,            snap: x,           guide: 'x', pos: 0 },
      { val: this._cw,     snap: x + width,   guide: 'x', pos: this._cw },
      { val: centerX,      snap: x + width/2, guide: 'x', pos: centerX },
    ];
    for (const c of xCandidates) {
      if (Math.abs(c.snap - c.val) < this._threshold) {
        result.x = c.val - (c.snap - x);
        result.guides.push({ type: 'vertical', pos: c.pos });
        break;
      }
    }

    // Snap top edge, bottom edge, center Y
    const yCandidates = [
      { val: 0,           snap: y,           guide: 'y', pos: 0 },
      { val: this._ch,    snap: y + height,  guide: 'y', pos: this._ch },
      { val: centerY,     snap: y + height/2,guide: 'y', pos: centerY },
    ];
    for (const c of yCandidates) {
      if (Math.abs(c.snap - c.val) < this._threshold) {
        result.y = c.val - (c.snap - y);
        result.guides.push({ type: 'horizontal', pos: c.pos });
        break;
      }
    }

    return [result];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ElementSnap — snap to other elements' edges and centers
// ─────────────────────────────────────────────────────────────────────────────

export class ElementSnap extends ISnapStrategy {
  constructor(threshold) {
    super();
    this._threshold = threshold;
  }

  getSnapPoints({ x, y, width, height, elementId, resolvedBounds }) {
    const result = { x, y, guides: [] };
    const threshold = this._threshold;

    const right = x + width;
    const bottom = y + height;
    const midX = x + width / 2;
    const midY = y + height / 2;

    for (const [id, bounds] of resolvedBounds) {
      if (id === elementId) continue;

      const tRight = bounds.x + bounds.width;
      const tBottom = bounds.y + bounds.height;
      const tMidX = bounds.x + bounds.width / 2;
      const tMidY = bounds.y + bounds.height / 2;

      // X-axis snapping (left edge, right edge, center)
      const xPairs = [
        [x, bounds.x], [x, tRight], [right, bounds.x], [right, tRight],
        [midX, tMidX],
      ];
      for (const [mine, target] of xPairs) {
        if (Math.abs(mine - target) < threshold) {
          result.x = x + (target - mine);
          result.guides.push({ type: 'vertical', pos: target });
          break;
        }
      }

      // Y-axis snapping (top, bottom, center)
      const yPairs = [
        [y, bounds.y], [y, tBottom], [bottom, bounds.y], [bottom, tBottom],
        [midY, tMidY],
      ];
      for (const [mine, target] of yPairs) {
        if (Math.abs(mine - target) < threshold) {
          result.y = y + (target - mine);
          result.guides.push({ type: 'horizontal', pos: target });
          break;
        }
      }
    }

    return [result];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SmartGuides — dynamic alignment lines (equal spacing, distribution)
// ─────────────────────────────────────────────────────────────────────────────

export class SmartGuides extends ISnapStrategy {
  constructor(threshold) {
    super();
    this._threshold = threshold;
  }

  getSnapPoints({ x, y, width, height, elementId, resolvedBounds }) {
    const guides = [];
    const others = [...resolvedBounds.entries()]
      .filter(([id]) => id !== elementId)
      .map(([, b]) => b);

    if (others.length < 2) return [{ x, y, guides }];

    // Equal horizontal spacing detection
    const sortedByX = [...others].sort((a, b) => a.x - b.x);
    for (let i = 0; i < sortedByX.length - 1; i++) {
      const gap = sortedByX[i + 1].x - (sortedByX[i].x + sortedByX[i].width);
      const expectedX = (sortedByX[i].x + sortedByX[i].width) + gap;
      if (Math.abs(x - expectedX) < this._threshold) {
        guides.push({ type: 'distribution', axis: 'x', gap });
      }
    }

    return [{ x, y, guides }];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SnapEngine — Orchestrator (Composite of strategies)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * SnapEngine — Coordinates all snap strategies.
 *
 * Strategies are applied in order; the first meaningful snap wins per axis.
 * Smart guides are always collected (for visual display) but only applied
 * if they produce a snap closer than the threshold.
 *
 * Satisfies OCP: new snap strategies can be added without modifying this class.
 */
export class SnapEngine {
  /**
   * @param {import('../core/EventBus.js').EventBus} bus
   * @param {import('../core/Config.js').Config} config
   */
  constructor(bus, config) {
    this._bus = bus;
    this._enabled = config.snap.enabled;
    this._threshold = config.snap.threshold;

    /** @type {ISnapStrategy[]} */
    this._strategies = [];

    if (config.snap.grid) {
      this._gridSnap = new GridSnap(config.snap.gridSize);
      this._strategies.push(this._gridSnap);
    }
    if (config.snap.canvasEdges) {
      this._strategies.push(
        new EdgeSnap(config.canvas.width, config.canvas.height, config.snap.threshold)
      );
    }
    if (config.snap.elements) {
      this._strategies.push(new ElementSnap(config.snap.threshold));
    }
    if (config.snap.smartGuides) {
      this._smartGuides = new SmartGuides(config.snap.threshold);
      this._strategies.push(this._smartGuides);
    }

    /** Active guide lines to render this frame */
    this._activeGuides = [];
  }

  get enabled() { return this._enabled; }

  toggle(val) {
    this._enabled = val ?? !this._enabled;
    this._bus.emit(Events.SNAP_TOGGLED, { enabled: this._enabled });
  }

  /**
   * Snap a position during drag.
   * @param {SnapContext} context
   * @returns {{ x: number, y: number }}
   */
  snap(context) {
    if (!this._enabled) {
      this._clearGuides();
      return { x: context.x, y: context.y };
    }

    let x = context.x;
    let y = context.y;
    const guides = [];

    for (const strategy of this._strategies) {
      const results = strategy.getSnapPoints({ ...context, x, y });
      if (results.length > 0) {
        const r = results[0];
        x = r.x;
        y = r.y;
        guides.push(...(r.guides ?? []));
      }
    }

    this._activeGuides = guides;
    this._bus.emit(Events.SNAP_GUIDES_CHANGED, { guides });
    return { x, y };
  }

  clearGuides() {
    this._clearGuides();
  }

  _clearGuides() {
    if (this._activeGuides.length > 0) {
      this._activeGuides = [];
      this._bus.emit(Events.SNAP_GUIDES_CHANGED, { guides: [] });
    }
  }

  updateCanvasSize(width, height) {
    // Rebuild EdgeSnap with new canvas size
    this._strategies = this._strategies.filter((s) => !(s instanceof EdgeSnap));
    this._strategies.unshift(new EdgeSnap(width, height, this._threshold));
  }
}

/**
 * @typedef {Object} SnapContext
 * @property {number} x - current element x
 * @property {number} y - current element y
 * @property {number} width - element width
 * @property {number} height - element height
 * @property {string} elementId - id of element being dragged
 * @property {Map<string, import('../layout/LayoutEngine.js').Bounds>} resolvedBounds
 */

/**
 * @typedef {Object} SnapResult
 * @property {number} x
 * @property {number} y
 * @property {{ type: 'vertical'|'horizontal'|'distribution', pos: number }[]} guides
 */
