import type { ISnapStrategy, SnapContext, SnapStrategyResult } from '../ISnapStrategy.js';
import type { Rect, SnapGuide } from '../../types/index.js';
import { layoutResolver } from '../../layout/LayoutResolver.js';
export class SmartGuideStrategy implements ISnapStrategy {
  snap(rect: Rect, ctx: SnapContext): SnapStrategyResult {
    const guides: SnapGuide[] = [];
    const { document: doc, movingIds, threshold: t } = ctx;
    const others = Object.values(doc.elements).filter(el => !movingIds.has(el.id) && el.visible);
    if (others.length < 2) return { deltaX: 0, deltaY: 0, guides };
    let dx = 0, dy = 0;
    const rcx = rect.x + rect.width / 2;
    const rcy = rect.y + rect.height / 2;
    for (const el of others) {
      const w = layoutResolver.resolveSize(el.style.width, doc.width);
      const h = layoutResolver.resolveSize(el.style.height, doc.height);
      const cx = el.style.x + w / 2;
      const cy = el.style.y + h / 2;
      if (Math.abs(rcx - cx) < t) { dx = cx - rcx; guides.push({ orientation: 'vertical', position: cx, start: 0, end: ctx.canvasHeight }); break; }
      if (Math.abs(rcy - cy) < t) { dy = cy - rcy; guides.push({ orientation: 'horizontal', position: cy, start: 0, end: ctx.canvasWidth }); break; }
    }
    return { deltaX: dx, deltaY: dy, guides };
  }
}
