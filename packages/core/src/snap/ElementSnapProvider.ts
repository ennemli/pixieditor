import type { ISnapProvider, SnapResult, SnapGuide } from '../types/plugin.types';
import type { EditorState } from '../types/editor.types';
import { LayoutEngine } from '../layout/LayoutEngine';

/**
 * Snaps the dragged element's edges and center to the
 * edges and centers of all other elements on the canvas.
 */
export class ElementSnapProvider implements ISnapProvider {
  constructor(private readonly getState: () => EditorState) {}

  getSnapPoints(
    x: number,
    y: number,
    width: number,
    height: number,
    excludeId?: string
  ): SnapResult {
    const state = this.getState();
    if (!state.snap.elements) return { x, y, guides: [] };

    const threshold = state.snap.threshold;
    const allBounds = LayoutEngine.resolveAll(state);

    let snapX = x;
    let snapY = y;
    let bestDX = threshold + 1;
    let bestDY = threshold + 1;
    const guides: SnapGuide[] = [];

    for (const [id, bounds] of allBounds) {
      if (id === excludeId) continue;

      // X snap: left edge, center, right edge of target
      const xTargets = [
        bounds.x,
        bounds.x + bounds.width / 2 - width / 2,
        bounds.x + bounds.width - width,
        // Align right edge of dragged to left edge of target
        bounds.x - width,
        // Align left edge of dragged to right edge of target
        bounds.x + bounds.width,
      ];

      for (const tx of xTargets) {
        const d = Math.abs(x - tx);
        if (d < bestDX) {
          bestDX = d;
          snapX = tx;
          guides.push({
            orientation: 'vertical',
            position: tx,
            start: Math.min(y, bounds.y),
            end: Math.max(y + height, bounds.y + bounds.height),
          });
        }
      }

      // Y snap
      const yTargets = [
        bounds.y,
        bounds.y + bounds.height / 2 - height / 2,
        bounds.y + bounds.height - height,
        bounds.y - height,
        bounds.y + bounds.height,
      ];

      for (const ty of yTargets) {
        const d = Math.abs(y - ty);
        if (d < bestDY) {
          bestDY = d;
          snapY = ty;
          guides.push({
            orientation: 'horizontal',
            position: ty,
            start: Math.min(x, bounds.x),
            end: Math.max(x + width, bounds.x + bounds.width),
          });
        }
      }
    }

    return { x: snapX, y: snapY, guides };
  }
}
