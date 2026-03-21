export function generateId(): string {
  return `el_${Math.random().toString(36).slice(2, 9)}_${Date.now().toString(36)}`;
}
