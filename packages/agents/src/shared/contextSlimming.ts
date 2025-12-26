// Deterministic truncation helpers to keep agent prompts within context limits.

export function truncateString(value: string, maxChars: number): string {
  if (typeof value !== "string") return "";
  if (!Number.isFinite(maxChars) || maxChars <= 0) return "";
  if (value.length <= maxChars) return value;
  return `${value.slice(0, maxChars)} [truncated]`;
}

export function truncateArray<T>(arr: T[], maxItems: number): T[] {
  if (!Array.isArray(arr)) return [];
  if (!Number.isFinite(maxItems) || maxItems <= 0) return [];
  if (arr.length <= maxItems) return arr;
  return arr.slice(0, maxItems);
}
