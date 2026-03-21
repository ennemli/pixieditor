import type { EditorConfig, EditorTheme, SnapConfig, CanvasConfig } from '@/types';
export declare const DEFAULT_THEME: EditorTheme;
export declare const DEFAULT_SNAP: SnapConfig;
export declare const DEFAULT_CANVAS: CanvasConfig;
/**
 * Merges user config with defaults, ensuring all required fields are set.
 */
export declare function resolveConfig(config: EditorConfig): {
    canvas: {
        width: number;
        height: number;
        backgroundColor: string;
    };
    snap: {
        enabled: boolean;
        grid: boolean;
        gridSize: number;
        gridColor: string;
        elements: boolean;
        canvas: boolean;
        canvasEdges?: boolean;
        elementEdges?: boolean;
        smartGuides: boolean;
        threshold: number;
    };
    theme: {
        panelBackground: string;
        panelBorder: string;
        accent: string;
        text: string;
        textMuted: string;
        inputBackground?: string;
        fontFamily?: string;
        surface: string;
        surfaceHover: string;
        selectionColor: string;
        guideColor: string;
        gridColor: string;
    };
    menuItems: import("@/types").CustomMenuItem[];
    exportFormats: import("@/types").ExportFormat[];
    mountPanels: boolean;
};
