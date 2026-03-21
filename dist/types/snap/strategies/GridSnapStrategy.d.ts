import type { ISnapStrategy, SnapContext, SnapStrategyResult } from '../ISnapStrategy.js';
import type { Rect } from '../../types/index.js';
export declare class GridSnapStrategy implements ISnapStrategy {
    snap(rect: Rect, ctx: SnapContext): SnapStrategyResult;
}
