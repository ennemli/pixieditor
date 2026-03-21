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
export class LayoutResolver {
  private readonly _baseFontSize = 16;

  resolveSize(
    value: string | number,
    parentSize: number,
    viewportSize: number = 0
  ): number {
    if (typeof value === 'number') return value;

    const v = value.trim().toLowerCase();

    if (v === 'full')   return parentSize;
    if (v === 'auto')   return 0;
    if (v === 'screen') return viewportSize;
    if (v === '0')      return 0;

    // Fraction: '1/2', '3/5', '2/3'
    const fractionMatch = v.match(/^(\d+)\/(\d+)$/);
    if (fractionMatch) {
      return (parseInt(fractionMatch[1]) / parseInt(fractionMatch[2])) * parentSize;
    }

    // Percentage: '50%'
    if (v.endsWith('%')) {
      return (parseFloat(v) / 100) * parentSize;
    }

    // px
    if (v.endsWith('px')) return parseFloat(v);

    // rem
    if (v.endsWith('rem')) return parseFloat(v) * this._baseFontSize;

    // em (treat as rem for simplicity)
    if (v.endsWith('em')) return parseFloat(v) * this._baseFontSize;

    // Bare number string
    const n = parseFloat(v);
    return isNaN(n) ? 0 : n;
  }

  /**
   * Resolve both width and height in a single call.
   */
  resolveDimensions(
    width: string | number,
    height: string | number,
    parentWidth: number,
    parentHeight: number
  ): { width: number; height: number } {
    return {
      width: this.resolveSize(width, parentWidth),
      height: this.resolveSize(height, parentHeight),
    };
  }

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
  } {
    if (style.isCircle) {
      const r = Math.min(resolvedWidth, resolvedHeight) / 2;
      return { topLeft: r, topRight: r, bottomRight: r, bottomLeft: r };
    }
    return {
      topLeft: style.borderRadiusTopLeft,
      topRight: style.borderRadiusTopRight,
      bottomRight: style.borderRadiusBottomRight,
      bottomLeft: style.borderRadiusBottomLeft,
    };
  }
}

export const layoutResolver = new LayoutResolver();
