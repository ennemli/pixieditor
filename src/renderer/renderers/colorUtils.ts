/** Parse any CSS color to [r, g, b, a] (0-255 for rgb, 0-1 for a) */
export function parseColor(color: string): [number, number, number, number] {
  if (!color || color === 'transparent') return [0, 0, 0, 0];
  if (color.startsWith('#')) {
    const hex = color.slice(1);
    if (hex.length === 3) {
      const r = parseInt(hex[0]+hex[0], 16);
      const g = parseInt(hex[1]+hex[1], 16);
      const b = parseInt(hex[2]+hex[2], 16);
      return [r, g, b, 1];
    }
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    const a = hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1;
    return [r, g, b, a];
  }
  const rgba = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (rgba) return [+rgba[1], +rgba[2], +rgba[3], rgba[4] !== undefined ? +rgba[4] : 1];
  return [0, 0, 0, 1];
}

export function hexToNumber(hex: string): number {
  const [r, g, b] = parseColor(hex);
  return (r << 16) | (g << 8) | b;
}
