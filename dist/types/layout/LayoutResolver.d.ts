/**
 * Resolves Tailwind-style size values to pixel numbers.
 *
 * Supported formats:
 *  - number            → absolute pixels (100)
 *  - 'full'            → parentSize
 *  - 'auto'            → 0 (caller handles auto sizing)
 *  - 'screen'          → viewportSize
 *  - '1/2','3/5','2/3' → fraction of parentSize
 *  - '50%'             → fraction of parentSize
 *  - '100px'           → absolute pixels
 *  - '1.5rem'          → 1.5 * 16 = 24px
 */
export declare class LayoutResolver {
    private readonly _baseFontSize;
    resolveSize(value: string | number, parentSize: number, viewportSize?: number): number;
    /**
     * Resolve both width and height in a single call.
     */
    resolveDimensions(width: string | number, height: string | number, parentWidth: number, parentHeight: number): {
        width: number;
        height: number;
    };
    /**
     * Compute resolved border radius respecting the isCircle flag.
     */
    resolveBorderRadius(style: {
        isCircle: boolean;
        borderRadiusTopLeft: number;
        borderRadiusTopRight: number;
        borderRadiusBottomRight: number;
        borderRadiusBottomLeft: number;
        width: string | number;
        height: string | number;
    }, resolvedWidth: number, resolvedHeight: number): {
        topLeft: number;
        topRight: number;
        bottomRight: number;
        bottomLeft: number;
    };
}
export declare const layoutResolver: LayoutResolver;
