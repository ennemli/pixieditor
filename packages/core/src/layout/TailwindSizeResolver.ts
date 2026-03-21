import type { TailwindSize, PositionValue } from '../types/element.types';

/**
 * Resolves a TailwindSize token to an absolute pixel value.
 *
 * All relative tokens resolve against the parent's dimension.
 * Numeric values pass through as-is (px).
 *
 * Single Responsibility: only knows about size token → px conversion.
 */
export class TailwindSizeResolver {
  private static readonly FRACTION_MAP: Record<string, number> = {
    auto: 0,
    full: 1,
    '1/2': 0.5,
    '1/3': 1 / 3,
    '2/3': 2 / 3,
    '1/4': 0.25,
    '3/4': 0.75,
    '1/5': 0.2,
    '2/5': 0.4,
    '3/5': 0.6,
    '4/5': 0.8,
  };

  /**
   * Resolve a size/position token.
   * @param value  The TailwindSize or PositionValue token.
   * @param parentSize  The parent dimension in pixels (width or height).
   */
  static resolve(value: TailwindSize, parentSize: number): number {
    if (typeof value === 'number') return value;

    const fraction = this.FRACTION_MAP[value];
    if (fraction === undefined) {
      console.warn(`[TailwindSizeResolver] Unknown token "${value}", defaulting to 0`);
      return 0;
    }

    return Math.round(fraction * parentSize);
  }

  /**
   * Convert an absolute pixel value back to the closest Tailwind token
   * for a given parent size (useful for the properties panel display).
   */
  static toToken(px: number, parentSize: number): TailwindSize {
    if (parentSize === 0) return px;

    const ratio = px / parentSize;
    let closest: string | null = null;
    let closestDiff = Infinity;

    for (const [token, fraction] of Object.entries(this.FRACTION_MAP)) {
      const diff = Math.abs(fraction - ratio);
      if (diff < closestDiff) {
        closestDiff = diff;
        closest = token;
      }
    }

    // Only snap to token if within 2% tolerance
    if (closestDiff < 0.02 && closest) return closest as TailwindSize;
    return px;
  }
}
