import type { DocumentState, Rect } from '../types/index.js';
export interface SnapContext {
    document: DocumentState;
    movingIds: Set<string>;
    canvasWidth: number;
    canvasHeight: number;
    gridSize: number;
    threshold: number;
}
export interface SnapStrategyResult {
    deltaX: number;
    deltaY: number;
    guides: import('../types/index.js').SnapGuide[];
}
export interface ISnapStrategy {
    snap(proposedRect: Rect, context: SnapContext): SnapStrategyResult;
}
