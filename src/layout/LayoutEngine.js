import { TailwindSizer } from './TailwindSizer.js';
import { BoxModel } from '../model/Elements.js';

/**
 * LayoutEngine — Single Responsibility: computes resolved pixel bounds.
 *
 * Returns a ResolvedBoundsMap: elementId → { x, y, width, height }
 *
 * Rules:
 *  - Free elements: positioned at (el.x, el.y) on the canvas; size resolved against canvas.
 *  - Non-free elements: size resolved against parent's INNER bounds (after padding).
 *                       position is determined by parent's layout mode (block / flex).
 *  - Root elements (parentId = null, free = false): positioned at (el.x, el.y) on canvas.
 *
 * This is a pure function — it does NOT mutate any models.
 */
export class LayoutEngine {
  /**
   * @param {import('../model/SceneModel.js').SceneModel} scene
   * @returns {Map<string, Bounds>} elementId → resolved bounds in canvas space
   */
  static computeAll(scene) {
    /** @type {Map<string, Bounds>} */
    const resolved = new Map();

    const canvasBounds = { x: 0, y: 0, width: scene.width, height: scene.height };

    // Process root elements first, then recurse into boxes
    const rootEls = scene.getRootElements();
    rootEls.forEach((el) => {
      LayoutEngine._resolveElement(el, canvasBounds, scene, resolved);
    });

    return resolved;
  }

  /**
   * @param {import('../model/ElementModel.js').ElementModel} el
   * @param {Bounds} parentBounds - parent's bounds in canvas space
   * @param {import('../model/SceneModel.js').SceneModel} scene
   * @param {Map<string, Bounds>} resolved
   */
  static _resolveElement(el, parentBounds, scene, resolved) {
    if (!el.visible) return;

    const { width, height } = TailwindSizer.resolveElement(el, {
      width: parentBounds.width,
      height: parentBounds.height,
    });

    let x, y;

    if (el.free) {
      // Free: absolute canvas coordinates
      x = el.x;
      y = el.y;
    } else {
      // Non-free: offset within parent
      x = parentBounds.x + el.x;
      y = parentBounds.y + el.y;
    }

    const bounds = { x, y, width, height };
    resolved.set(el.id, bounds);

    // Recurse into box children
    if (el instanceof BoxModel && el.children.length > 0) {
      const pad = el.style.padding;
      const innerBounds = {
        x: x + pad.left,
        y: y + pad.top,
        width: Math.max(0, width - pad.left - pad.right),
        height: Math.max(0, height - pad.top - pad.bottom),
      };

      LayoutEngine._layoutChildren(el, innerBounds, scene, resolved);
    }
  }

  /**
   * Layout children of a box according to its display mode.
   */
  static _layoutChildren(box, innerBounds, scene, resolved) {
    const children = scene.getChildren(box.id);
    const isFlex = box.style.display === 'flex';

    if (isFlex) {
      LayoutEngine._flexLayout(box, children, innerBounds, scene, resolved);
    } else {
      LayoutEngine._blockLayout(children, innerBounds, scene, resolved);
    }
  }

  /**
   * Block layout: children stacked vertically, each at (x=0, y=accumulated).
   * A child's own el.x / el.y is used as an offset from the flow position.
   */
  static _blockLayout(children, innerBounds, scene, resolved) {
    let cursor = 0;
    children.forEach((child) => {
      if (child.free) {
        // Free children lay themselves out on canvas
        LayoutEngine._resolveElement(child, innerBounds, scene, resolved);
        return;
      }
      const { height } = TailwindSizer.resolveElement(child, innerBounds);
      const childParentBounds = {
        ...innerBounds,
        y: innerBounds.y + cursor,
      };
      LayoutEngine._resolveElement(child, childParentBounds, scene, resolved);
      cursor += height + (child.style?.margin?.bottom ?? 0);
    });
  }

  /**
   * Flex layout: positions children according to flexDirection, gap, justify, align.
   */
  static _flexLayout(box, children, innerBounds, scene, resolved) {
    const isRow = box.style.flexDirection !== 'column';
    const gap = box.style.gap ?? 0;
    const resolvedSizes = children
      .filter((c) => !c.free)
      .map((c) => TailwindSizer.resolveElement(c, innerBounds));

    let cursor = 0;
    let freeIdx = 0;

    children.forEach((child) => {
      if (child.free) {
        LayoutEngine._resolveElement(child, innerBounds, scene, resolved);
        return;
      }
      const size = resolvedSizes[freeIdx++];
      const childBounds = {
        x: isRow ? innerBounds.x + cursor : innerBounds.x + child.x,
        y: isRow ? innerBounds.y + child.y : innerBounds.y + cursor,
        width: size.width,
        height: size.height,
      };
      resolved.set(child.id, childBounds);

      if (child instanceof BoxModel) {
        const pad = child.style.padding;
        const innerChild = {
          x: childBounds.x + pad.left,
          y: childBounds.y + pad.top,
          width: Math.max(0, childBounds.width - pad.left - pad.right),
          height: Math.max(0, childBounds.height - pad.top - pad.bottom),
        };
        LayoutEngine._layoutChildren(child, innerChild, scene, resolved);
      }

      cursor += (isRow ? size.width : size.height) + gap;
    });
  }
}

/**
 * @typedef {{ x: number, y: number, width: number, height: number }} Bounds
 */
