import type { ISnapStrategy, SnapContext, SnapStrategyResult } from '../ISnapStrategy.js';
import type { Rect } from '../../types/index.js';
export class GridSnapStrategy implements ISnapStrategy {
  snap(rect: Rect, ctx: SnapContext): SnapStrategyResult {
    const g = ctx.gridSize;
    const snappedX = Math.round(rect.x / g) * g;
    const snappedY = Math.round(rect.y / g) * g;
    return { deltaX: snappedX - rect.x, deltaY: snappedY - rect.y, guides: [] };
  }
}
