import type { ISnapProvider, SnapResult, SnapGuide } from '../types/plugin.types';
import type { EditorState } from '../types/editor.types';

/** Snaps element edges/center to the canvas edges and center. */
export class CanvasSnapProvider implements ISnapProvider {
  constructor(private readonly getState: () => EditorState) {}

  getSnapPoints(
    x: number,
    y: number,
    width: number,
    height: number
  ): SnapResult {
    const { snap, canvas } = this.getState();
    if (!snap.canvas) return { x, y, guides: [] };

    const cw = canvas.width;
    const ch = canvas.height;
    const threshold = snap.threshold;

    let snapX = x;
    let snapY = y;
    const guides: SnapGuide[] = [];

    // Horizontal snap points: left edge, center, right edge
    const xPoints = [
      { target: 0, label: 'left' },
      { target: cw / 2 - width / 2, label: 'cx' },
      { target: cw - width, label: 'right' },
    ];

    for (const { target } of xPoints) {
      if (Math.abs(x - target) <= threshold) {
        snapX = target;
        guides.push({ orientation: 'vertical', position: target, start: 0, end: ch });
        break;
      }
    }

    // Vertical snap points: top edge, center, bottom edge
    const yPoints = [
      { target: 0 },
      { target: ch / 2 - height / 2 },
      { target: ch - height },
    ];

    for (const { target } of yPoints) {
      if (Math.abs(y - target) <= threshold) {
        snapY = target;
        guides.push({ orientation: 'horizontal', position: target, start: 0, end: cw });
        break;
      }
    }

    return { x: snapX, y: snapY, guides };
  }
}
