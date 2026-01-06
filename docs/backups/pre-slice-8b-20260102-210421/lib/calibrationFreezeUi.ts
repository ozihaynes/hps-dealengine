export type NormalizeMarketKeyResult =
  | { ok: true; marketKey: string }
  | { ok: false; reason: string };

export function normalizeMarketKeyInput(input: string): NormalizeMarketKeyResult {
  const trimmed = input.trim();
  if (!trimmed) {
    return { ok: false, reason: "invalid_market_key" };
  }
  if (/^\d{5}$/.test(trimmed)) {
    return { ok: true, marketKey: `zip_${trimmed}` };
  }
  if (
    trimmed.startsWith("zip_") ||
    trimmed.startsWith("county_") ||
    trimmed.startsWith("msa_") ||
    trimmed.startsWith("market_unknown")
  ) {
    return { ok: true, marketKey: trimmed };
  }
  return { ok: false, reason: "invalid_market_key" };
}
