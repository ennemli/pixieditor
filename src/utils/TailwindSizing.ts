import type { TailwindSize } from '@/types';

export function resolveTailwindSize(size: TailwindSize, parentSize: number): number {
  if (typeof size === 'number') return size;
  if (size === 'full') return parentSize;
  if (size === 'auto') return 0;
  const parts = size.split('/');
  if (parts.length === 2) {
    const num = parseFloat(parts[0]);
    const den = parseFloat(parts[1]);
    if (!isNaN(num) && !isNaN(den) && den !== 0) return (num / den) * parentSize;
  }
  console.warn(`[TailwindSizing] Cannot resolve "${size}", defaulting to 0`);
  return 0;
}

export const FRACTION_PRESETS: Record<string, number> = {
  'full': 1, '1/2': 0.5, '1/3': 1/3, '2/3': 2/3,
  '1/4': 0.25, '3/4': 0.75, '1/5': 0.2, '2/5': 0.4,
  '3/5': 0.6, '4/5': 0.8, '1/6': 1/6, '5/6': 5/6,
};
