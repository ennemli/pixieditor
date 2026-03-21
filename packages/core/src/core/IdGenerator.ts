let _counter = 0;

/**
 * Generates short unique IDs for elements.
 * Uses crypto.randomUUID when available, falls back to a timestamp+counter.
 */
export function generateId(prefix = 'el'): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `${prefix}_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;
  }
  return `${prefix}_${Date.now().toString(36)}_${(++_counter).toString(36)}`;
}
