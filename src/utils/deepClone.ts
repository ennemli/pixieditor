export function deepClone<T>(obj: T): T {
  // structuredClone is available in modern browsers/Node 17+
  if (typeof structuredClone === 'function') return structuredClone(obj);
  return JSON.parse(JSON.stringify(obj));
}
