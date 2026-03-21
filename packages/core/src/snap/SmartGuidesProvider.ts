import type { ISnapProvider, SnapResult, SnapGuide } from '../types/plugin.types';
import type { EditorState } from '../types/editor.types';
import { LayoutEngine } from '../layout/LayoutEngine';

/**
 * Smart Guides — shows dynamic red/blue lines when edges or centers align.
 * Works on top of the element snap to provide visual feedback lines that
 * extend across the whole canvas.
 */
export class SmartGuidesProvider implements ISnapProvider {
  constructor(private readonly getState: () => EditorState) {}

  getSnapPoints(
    x: number,
    y: number,
    width: number,
    height: number,
    excludeId?: string
  ): SnapResult {
    const state = this.getState();
    if (!state.snap.smartGuides) return { x, y, guides: [] };

    const allBounds = LayoutEngine.resolveAll(state);
    const { canvas, snap } = state;
    const threshold = snap.threshold;
    const guides: SnapGuide[] = [];

    const dragCenterX = x + width / 2;
    const dragCenterY = y + height / 2;
    const dragRight = x + width;
    const dragBottom = y + height;

    for (const [id, b] of allBounds) {
      if (id === excludeId) continue;

      const bCX = b.x + b.width / 2;
      const bCY = b.y + b.height / 2;

      // Vertical guides (x alignment)
      const xChecks = [
        { drag: x,         target: b.x,       label: 'left-left' },
        { drag: x,         target: b.x + b.width, label: 'left-right' },
        { drag: dragCenterX, target: bCX,      label: 'cx-cx' },
        { drag: dragRight, target: b.x,        label: 'right-left' },
        { drag: dragRight, target: b.x + b.width, label: 'right-right' },
      ];

      for (const { drag, target } of xChecks) {
        if (Math.abs(drag - target) <= threshold) {
          guides.push({
            orientation: 'vertical',
            position: target,
            start: 0,
            end: canvas.height,
          });
        }
      }

      // Horizontal guides (y alignment)
      const yChecks = [
        { drag: y,          target: b.y },
        { drag: y,          target: b.y + b.height },
        { drag: dragCenterY, target: bCY },
        { drag: dragBottom, target: b.y },
        { drag: dragBottom, target: b.y + b.height },
      ];

      for (const { drag, target } of yChecks) {
        if (Math.abs(drag - target) <= threshold) {
          guides.push({
            orientation: 'horizontal',
            position: target,
            start: 0,
            end: canvas.width,
          });
        }
      }
    }

    // Deduplicate guides
    const seen = new Set<string>();
    const unique = guides.filter((g) => {
      const key = `${g.orientation}-${g.position}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return { x, y, guides: unique };
  }
}
