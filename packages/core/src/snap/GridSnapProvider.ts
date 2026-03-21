import type { ISnapProvider, SnapResult } from '../types/plugin.types';
import type { EditorState } from '../types/editor.types';

/** Snaps element to nearest grid intersection. */
export class GridSnapProvider implements ISnapProvider {
  constructor(private readonly getState: () => EditorState) {}

  getSnapPoints(x: number, y: number, width: number, height: number): SnapResult {
    const { snap } = this.getState();
    if (!snap.grid) return { x, y, guides: [] };

    const g = snap.gridSize;
    const snappedX = Math.round(x / g) * g;
    const snappedY = Math.round(y / g) * g;

    return { x: snappedX, y: snappedY, guides: [] };
  }
}
