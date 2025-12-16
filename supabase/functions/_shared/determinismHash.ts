/**
 * Recursively sorts object keys to produce deterministic JSON output.
 */
export function sortDeterministic(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortDeterministic);
  }
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(obj).sort()) {
      sorted[key] = sortDeterministic(obj[key]);
    }
    return sorted;
  }
  return value;
}

/**
 * Stable stringify that enforces deterministic key ordering.
 */
export function stableStringify(value: unknown): string {
  return JSON.stringify(sortDeterministic(value));
}

/**
 * SHA-256 hash (hex) over the deterministically stringified payload.
 */
const encoder = new TextEncoder();

export async function stableHash(value: unknown): Promise<string> {
  const canonical = stableStringify(value);
  const bytes = encoder.encode(canonical);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const asHex = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return asHex;
}
