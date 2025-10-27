/**
 * apps/dealengine/lib/contract-adapter.ts
 *
 * Normalizes incoming JSON payloads from forms/clients:
 * - numeric strings ("1_234.50", "1,234.50", "42") -> numbers
 * - "true"/"false" (any case) -> booleans
 * - trims strings
 * - walks arrays/objects recursively
 * Safe for unknown shapes; preserves null/undefined.
 */
export function normalizeValue(v: unknown): unknown {
  if (v == null) return v;
  if (Array.isArray(v)) return v.map(normalizeValue);
  if (typeof v === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
      out[k] = normalizeValue(val);
    }
    return out;
  }
  if (typeof v === 'string') {
    const s = v.trim();

    // boolean?
    const lower = s.toLowerCase();
    if (lower === 'true') return true;
    if (lower === 'false') return false;

    // number? allow commas/underscores/spaces
    const sn = s.replace(/[_ ,]/g, '');
    if (/^[+-]?\d+(\.\d+)?$/.test(sn)) {
      const n = Number(sn);
      if (!Number.isNaN(n)) return n;
    }

    return s; // fallthrough as trimmed string
  }
  return v; // number | boolean stays as-is
}

export function normalizePayload<T = unknown>(payload: T): T {
  return normalizeValue(payload) as T;
}
