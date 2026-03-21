import type { AnyElementModel, BoxElementModel } from '../types/element.types';
import type { EditorState } from '../types/editor.types';
import { TailwindSizeResolver } from './TailwindSizeResolver';

export interface ResolvedBounds {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
}

/**
 * LayoutEngine resolves every element's final pixel bounds.
 *
 * - Relative tokens resolve against parent dimensions.
 * - Free elements resolve against the root canvas.
 * - Children of boxes resolve against the box's resolved dimensions.
 *
 * Single Responsibility: pure coordinate resolution — no rendering.
 */
export class LayoutEngine {
  /**
   * Resolve the absolute canvas-space bounds for a given element.
   */
  static resolve(
    id: string,
    state: EditorState
  ): ResolvedBounds {
    const el = state.elements[id];
    if (!el) throw new Error(`LayoutEngine: element "${id}" not found`);

    const parentBounds = this.getParentBounds(el, state);

    const x = TailwindSizeResolver.resolve(el.transform.x, parentBounds.width);
    const y = TailwindSizeResolver.resolve(el.transform.y, parentBounds.height);
    const width = TailwindSizeResolver.resolve(el.transform.width, parentBounds.width);
    const height = TailwindSizeResolver.resolve(el.transform.height, parentBounds.height);

    return {
      x: parentBounds.x + x,
      y: parentBounds.y + y,
      width,
      height,
      rotation: el.transform.rotation,
      scaleX: el.transform.scaleX,
      scaleY: el.transform.scaleY,
    };
  }

  /**
   * Resolve every element and return a flat map.
   * Useful for the snap engine which needs all bounds.
   */
  static resolveAll(state: EditorState): Map<string, ResolvedBounds> {
    const map = new Map<string, ResolvedBounds>();
    for (const id of Object.keys(state.elements)) {
      try {
        map.set(id, this.resolve(id, state));
      } catch {
        // skip invalid
      }
    }
    return map;
  }

  // -------------------------------------------------------------------------

  private static getParentBounds(
    el: AnyElementModel,
    state: EditorState
  ): ResolvedBounds {
    // Free elements always resolve against the root canvas
    if (el.free || !el.parentId) {
      return {
        x: 0,
        y: 0,
        width: state.canvas.width,
        height: state.canvas.height,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
      };
    }

    return this.resolve(el.parentId, state);
  }
}
