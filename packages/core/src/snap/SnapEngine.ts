import type { ISnapProvider, SnapResult, SnapGuide } from '../types/plugin.types';
import type { EditorState } from '../types/editor.types';

/**
 * SnapEngine orchestrates multiple ISnapProvider strategies.
 *
 * Open/Closed: new snap strategies just implement ISnapProvider and are
 * registered via addProvider() — no changes to this class.
 */
export class SnapEngine {
  private providers: ISnapProvider[] = [];

  addProvider(provider: ISnapProvider): void {
    this.providers.push(provider);
  }

  removeProvider(provider: ISnapProvider): void {
    this.providers = this.providers.filter((p) => p !== provider);
  }

  /**
   * Find the best snap position for a dragged element.
   * Returns snapped {x, y} and visual guide lines.
   */
  snap(
    x: number,
    y: number,
    width: number,
    height: number,
    state: EditorState,
    excludeId?: string
  ): SnapResult {
    if (!state.snap.enabled) {
      return { x, y, guides: [] };
    }

    let snapX = x;
    let snapY = y;
    let bestDX = state.snap.threshold + 1;
    let bestDY = state.snap.threshold + 1;
    const guides: SnapGuide[] = [];

    for (const provider of this.providers) {
      const result = provider.getSnapPoints(x, y, width, height, excludeId);

      const dx = Math.abs(result.x - x);
      const dy = Math.abs(result.y - y);

      if (dx < bestDX) {
        bestDX = dx;
        snapX = result.x;
      }
      if (dy < bestDY) {
        bestDY = dy;
        snapY = result.y;
      }

      guides.push(...result.guides);
    }

    return { x: snapX, y: snapY, guides };
  }
}
