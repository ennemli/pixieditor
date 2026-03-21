import type { ISnapStrategy, SnapContext, SnapStrategyResult } from '../ISnapStrategy.js';
import type { Rect } from '../../types/index.js';
export declare class SmartGuideStrategy implements ISnapStrategy {
    snap(rect: Rect, ctx: SnapContext): SnapStrategyResult;
}
