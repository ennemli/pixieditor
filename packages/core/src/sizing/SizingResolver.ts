import type { PositionValue, SizeValue } from '../models/types';

/**
 * Converts Tailwind-style sizing tokens to pixel values.
 *
 * Supported tokens:
 *   - number        → px value as-is
 *   - "full"        → 100% of parent dimension
 *   - "auto"        → 0 (caller handles content sizing)
 *   - "screen"      → window dimension
 *   - "1/2", "3/5"  → fractional percentage of parent
 */
export class SizingResolver {
  /**
   * Resolve a size value (width/height) against a parent dimension.
   */
  resolveSize(value: SizeValue, parentDimension: number): number {
    if (typeof value === 'number') return value;
    if (value === 'full') return parentDimension;
    if (value === 'auto') return 0;
    if (value === 'screen') return typeof window !== 'undefined' ? window.innerWidth : parentDimension;
    return this.parseFraction(value) * parentDimension;
  }

  /**
   * Resolve a position value (x/y) against a parent dimension.
   */
  resolvePosition(value: PositionValue, parentDimension: number): number {
    if (typeof value === 'number') return value;
    if (value === 'full') return parentDimension;
    if (value === 'auto') return 0;
    return this.parseFraction(value) * parentDimension;
  }

  /**
   * Parse a fraction string like "3/5" → 0.6
   */
  private parseFraction(value: string): number {
    const parts = value.split('/');
    if (parts.length !== 2) return 0;
    const numerator = parseFloat(parts[0]);
    const denominator = parseFloat(parts[1]);
    if (isNaN(numerator) || isNaN(denominator) || denominator === 0) return 0;
    return numerator / denominator;
  }

  /**
   * Given an element's transform and its parent's resolved rect,
   * return the element's resolved pixel rect.
   */
  resolveRect(
    transform: { x: PositionValue; y: PositionValue; width: SizeValue; height: SizeValue },
    parentWidth: number,
    parentHeight: number,
  ): { x: number; y: number; width: number; height: number } {
    return {
      x: this.resolvePosition(transform.x, parentWidth),
      y: this.resolvePosition(transform.y, parentHeight),
      width: this.resolveSize(transform.width, parentWidth),
      height: this.resolveSize(transform.height, parentHeight),
    };
  }
}

export const sizingResolver = new SizingResolver();
