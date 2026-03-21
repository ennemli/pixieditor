import type { SnapConfig, SnapResult, Rect, DocumentState } from '../types/index.js';
import type { SnapContext } from './ISnapStrategy.js';
import { GridSnapStrategy } from './strategies/GridSnapStrategy.js';
import { CanvasSnapStrategy } from './strategies/CanvasSnapStrategy.js';
import { ElementSnapStrategy } from './strategies/ElementSnapStrategy.js';
import { SmartGuideStrategy } from './strategies/SmartGuideStrategy.js';

export class SnapEngine {
  private _config: SnapConfig;
  private readonly _strategies = {
    grid: new GridSnapStrategy(),
    canvas: new CanvasSnapStrategy(),
    element: new ElementSnapStrategy(),
    smart: new SmartGuideStrategy(),
  };

  constructor(config: SnapConfig) { this._config = config; }

  setConfig(patch: Partial<SnapConfig>): void { this._config = { ...this._config, ...patch }; }
  getConfig(): SnapConfig { return this._config; }

  snap(proposedRect: Rect, movingIds: Set<string>, document: DocumentState): SnapResult {
    if (!this._config.enabled) return { x: proposedRect.x, y: proposedRect.y, guides: [] };

    const ctx: SnapContext = {
      document, movingIds,
      canvasWidth: document.width,
      canvasHeight: document.height,
      gridSize: this._config.gridSize,
      threshold: this._config.threshold,
    };

    let dx = 0, dy = 0;
    const guides: import('../types/index.js').SnapGuide[] = [];
    const apply = (r: import('./ISnapStrategy.js').SnapStrategyResult) => {
      dx += r.deltaX; dy += r.deltaY; guides.push(...r.guides);
    };

    const adjusted = () => ({ ...proposedRect, x: proposedRect.x + dx, y: proposedRect.y + dy });

    if (this._config.grid)        apply(this._strategies.grid.snap(proposedRect, ctx));
    if (this._config.canvas)      apply(this._strategies.canvas.snap(adjusted(), ctx));
    if (this._config.elements)    apply(this._strategies.element.snap(adjusted(), ctx));
    if (this._config.smartGuides) apply(this._strategies.smart.snap(adjusted(), ctx));

    return { x: proposedRect.x + dx, y: proposedRect.y + dy, guides };
  }
}
