import { createHash } from "crypto";

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
export function stableHash(value: unknown): string {
  const canonical = stableStringify(value);
  return createHash("sha256").update(canonical).digest("hex");
}
