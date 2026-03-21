import type { SnapConfig, SnapResult, Rect, DocumentState } from '../types/index.js';
export declare class SnapEngine {
    private _config;
    private readonly _strategies;
    constructor(config: SnapConfig);
    setConfig(patch: Partial<SnapConfig>): void;
    getConfig(): SnapConfig;
    snap(proposedRect: Rect, movingIds: Set<string>, document: DocumentState): SnapResult;
}
