let _counter = 0;

export function generateId(prefix = 'el'): string {
  _counter += 1;
  return `${prefix}_${Date.now().toString(36)}_${_counter.toString(36)}`;
}
