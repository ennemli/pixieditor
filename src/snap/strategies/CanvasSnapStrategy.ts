import type { ISnapStrategy, SnapContext, SnapStrategyResult } from '../ISnapStrategy.js';
import type { Rect, SnapGuide } from '../../types/index.js';
export class CanvasSnapStrategy implements ISnapStrategy {
  snap(rect: Rect, ctx: SnapContext): SnapStrategyResult {
    const { canvasWidth: cw, canvasHeight: ch, threshold: t } = ctx;
    let dx = 0, dy = 0;
    const guides: SnapGuide[] = [];
    const hTargets = [0, cw / 2 - rect.width / 2, cw - rect.width];
    const hGuidePos = [0, cw / 2, cw];
    for (let i = 0; i < hTargets.length; i++) {
      if (Math.abs(rect.x - hTargets[i]) < t) { dx = hTargets[i] - rect.x; guides.push({ orientation: 'vertical', position: hGuidePos[i], start: 0, end: ch }); break; }
    }
    const vTargets = [0, ch / 2 - rect.height / 2, ch - rect.height];
    const vGuidePos = [0, ch / 2, ch];
    for (let i = 0; i < vTargets.length; i++) {
      if (Math.abs(rect.y - vTargets[i]) < t) { dy = vTargets[i] - rect.y; guides.push({ orientation: 'horizontal', position: vGuidePos[i], start: 0, end: cw }); break; }
    }
    return { deltaX: dx, deltaY: dy, guides };
  }
}
