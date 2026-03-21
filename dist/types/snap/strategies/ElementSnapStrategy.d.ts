import type { ISnapStrategy, SnapContext, SnapStrategyResult } from '../ISnapStrategy.js';
import type { Rect } from '../../types/index.js';
export declare class ElementSnapStrategy implements ISnapStrategy {
    snap(rect: Rect, ctx: SnapContext): SnapStrategyResult;
}
