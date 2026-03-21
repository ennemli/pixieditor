export function hexToNumber(hex: string): number {
  const cleaned = hex.replace('#', '');
  return parseInt(cleaned.length === 3
    ? cleaned.split('').map(c => c + c).join('') : cleaned, 16);
}

export function cssColorToPixi(css: string): { color: number; alpha: number } {
  if (css.startsWith('#')) return { color: hexToNumber(css), alpha: 1 };
  const m = css.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (m) {
    const r = parseInt(m[1]), g = parseInt(m[2]), b = parseInt(m[3]);
    return { color: (r << 16) | (g << 8) | b, alpha: m[4] !== undefined ? parseFloat(m[4]) : 1 };
  }
  return { color: 0x000000, alpha: 1 };
}
