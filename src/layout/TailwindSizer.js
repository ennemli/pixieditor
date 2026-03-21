/**
 * TailwindSizer — Strategy Pattern
 *
 * Resolves Tailwind-inspired size tokens to pixel values at render time.
 * Tokens are resolved relative to the PARENT element's resolved dimensions.
 * For free elements (no parent), falls back to canvas dimensions.
 *
 * Supported tokens:
 *   'full'      → 100% of parent
 *   'half'      → 50% of parent (alias for '1/2')
 *   'auto'      → 0 (content-driven, rendered by layout engine)
 *   '1/2'       → 50%
 *   '1/3'       → 33.333%
 *   '2/3'       → 66.666%
 *   '1/4'       → 25%
 *   '3/4'       → 75%
 *   '1/5'       → 20%
 *   '2/5'       → 40%
 *   '3/5'       → 60%
 *   '4/5'       → 80%
 *   number      → px value as-is
 */
export class TailwindSizer {
  /** @type {Map<string, number>} */
  static _fractionCache = new Map();

  /**
   * Resolve a size token to pixels given the parent's resolved dimension.
   * @param {string|number} token
   * @param {number} parentSize - parent width or height in px
   * @returns {number} resolved px value
   */
  static resolve(token, parentSize) {
    if (typeof token === 'number') return token;
    if (typeof token !== 'string') return 0;

    const normalized = token.trim().toLowerCase();

    switch (normalized) {
      case 'full':   return parentSize;
      case 'half':   return parentSize * 0.5;
      case 'auto':   return 0; // layout engine handles this
      case '0':      return 0;
    }

    // Fraction pattern: numerator/denominator
    const cached = TailwindSizer._fractionCache.get(normalized);
    if (cached !== undefined) return parentSize * cached;

    const fractionMatch = normalized.match(/^(\d+)\/(\d+)$/);
    if (fractionMatch) {
      const ratio = parseInt(fractionMatch[1], 10) / parseInt(fractionMatch[2], 10);
      TailwindSizer._fractionCache.set(normalized, ratio);
      return parentSize * ratio;
    }

    // Percentage string: '50%'
    const percentMatch = normalized.match(/^(\d+(?:\.\d+)?)%$/);
    if (percentMatch) {
      const ratio = parseFloat(percentMatch[1]) / 100;
      TailwindSizer._fractionCache.set(normalized, ratio);
      return parentSize * ratio;
    }

    // Plain number string: '120'
    const num = parseFloat(normalized);
    if (!isNaN(num)) return num;

    console.warn(`[TailwindSizer] Unknown size token: "${token}", defaulting to 0`);
    return 0;
  }

  /**
   * Resolve both width and height of an element given parent bounds.
   * @param {import('../model/ElementModel.js').ElementModel} el
   * @param {{ width: number, height: number }} parentBounds
   * @returns {{ width: number, height: number }}
   */
  static resolveElement(el, parentBounds) {
    return {
      width: TailwindSizer.resolve(el.width, parentBounds.width),
      height: TailwindSizer.resolve(el.height, parentBounds.height),
    };
  }

  /**
   * Check if a token is a Tailwind-style string (not raw px).
   * @param {string|number} token
   * @returns {boolean}
   */
  static isToken(token) {
    return typeof token === 'string';
  }
}
