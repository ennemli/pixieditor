import type { ISnapStrategy, SnapContext, SnapStrategyResult } from '../ISnapStrategy.js';
import type { Rect, SnapGuide } from '../../types/index.js';
import { layoutResolver } from '../../layout/LayoutResolver.js';
export class ElementSnapStrategy implements ISnapStrategy {
  snap(rect: Rect, ctx: SnapContext): SnapStrategyResult {
    const { document: doc, movingIds, threshold: t } = ctx;
    let dx = 0, dy = 0;
    const guides: SnapGuide[] = [];
    const rx1 = rect.x, rx2 = rect.x + rect.width, rcx = rect.x + rect.width / 2;
    const ry1 = rect.y, ry2 = rect.y + rect.height, rcy = rect.y + rect.height / 2;
    for (const el of Object.values(doc.elements)) {
      if (movingIds.has(el.id) || !el.visible) continue;
      const w = layoutResolver.resolveSize(el.style.width, doc.width);
      const h = layoutResolver.resolveSize(el.style.height, doc.height);
      const ex1 = el.style.x, ex2 = ex1 + w, ecx = ex1 + w / 2;
      const ey1 = el.style.y, ey2 = ey1 + h, ecy = ey1 + h / 2;
      for (const [from, to] of [[rx1,ex1],[rx1,ex2],[rx2,ex1],[rx2,ex2],[rcx,ecx]] as [number,number][]) {
        if (Math.abs(from - to) < t) { dx = to - from; guides.push({ orientation: 'vertical', position: to, start: Math.min(ry1,ey1), end: Math.max(ry2,ey2) }); break; }
      }
      for (const [from, to] of [[ry1,ey1],[ry1,ey2],[ry2,ey1],[ry2,ey2],[rcy,ecy]] as [number,number][]) {
        if (Math.abs(from - to) < t) { dy = to - from; guides.push({ orientation: 'horizontal', position: to, start: Math.min(rx1,ex1), end: Math.max(rx2,ex2) }); break; }
      }
    }
    return { deltaX: dx, deltaY: dy, guides };
  }
}
