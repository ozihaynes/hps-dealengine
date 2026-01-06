/**
 * Number Utility Functions
 *
 * Defensive number handling for financial calculations.
 * Guards against NaN, Infinity, null, and undefined.
 *
 * These functions are used by dashboard components for safe
 * display of financial values.
 *
 * @module lib/utils/numbers
 * @version 1.0.0 (Slice 14 Polish)
 */

// ═══════════════════════════════════════════════════════════════════════════
// SAFE NUMBER
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Safely extract a number, returning null for invalid values.
 *
 * Guards against:
 * - null
 * - undefined
 * - NaN
 * - Infinity
 * - -Infinity
 *
 * @param value - The value to validate
 * @returns The number if valid, null otherwise
 *
 * @example
 * safeNumber(42)        // 42
 * safeNumber(0)         // 0
 * safeNumber(-5000)     // -5000
 * safeNumber(null)      // null
 * safeNumber(undefined) // null
 * safeNumber(NaN)       // null
 * safeNumber(Infinity)  // null
 */
export function safeNumber(value: number | null | undefined): number | null {
  if (value == null) return null;
  if (!Number.isFinite(value)) return null;
  return value;
}

// ═══════════════════════════════════════════════════════════════════════════
// FORMAT CURRENCY
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Format a number as currency with K/M suffixes.
 *
 * Formatting rules:
 * - >= $999,500 → "$X.XM" (millions)
 * - >= $1,000 → "$XK" or "$X.XK" (thousands)
 * - < $1,000 → "$X" (whole dollars)
 * - Negative values → "-$X"
 * - null/undefined/NaN → "—" (em dash)
 *
 * Note: Values like $5,050 will display as "$5.1K" due to rounding
 * to one decimal place. This is intentional for readability in
 * dashboard displays where space is limited.
 *
 * @param value - The currency value to format
 * @returns Formatted string
 *
 * @example
 * formatCurrency(5000)      // "$5K"
 * formatCurrency(26500)     // "$26.5K"
 * formatCurrency(5050)      // "$5.1K" (rounded)
 * formatCurrency(1000000)   // "$1.0M"
 * formatCurrency(1500000)   // "$1.5M"
 * formatCurrency(-5000)     // "-$5K"
 * formatCurrency(500)       // "$500"
 * formatCurrency(null)      // "—"
 * formatCurrency(NaN)       // "—"
 */
export function formatCurrency(value: number | null | undefined): string {
  const safe = safeNumber(value);
  if (safe === null) return "—";

  const absValue = Math.abs(safe);
  const sign = safe < 0 ? "-" : "";

  // Handle millions (>= $999,500 to avoid "$1000K")
  if (absValue >= 999_500) {
    const millions = absValue / 1_000_000;
    return `${sign}$${millions.toFixed(1)}M`;
  }

  // Handle thousands (>= $1,000)
  if (absValue >= 1_000) {
    const thousands = absValue / 1_000;
    const formatted =
      thousands % 1 === 0 ? thousands.toFixed(0) : thousands.toFixed(1);
    return `${sign}$${formatted}K`;
  }

  // Handle small values
  return `${sign}$${Math.round(absValue).toLocaleString()}`;
}

// ═══════════════════════════════════════════════════════════════════════════
// FORMAT PERCENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Format a number as a percentage with one decimal place.
 *
 * @param pct - The percentage value (0-100 scale)
 * @returns Formatted string like "72.5%" or "—" for invalid
 *
 * @example
 * formatPercent(72.5)   // "72.5%"
 * formatPercent(100)    // "100.0%"
 * formatPercent(0)      // "0.0%"
 * formatPercent(null)   // "—"
 * formatPercent(-5)     // "—" (negative percentages invalid for display)
 */
export function formatPercent(pct: number | null | undefined): string {
  const safe = safeNumber(pct);
  if (safe === null) return "—";
  if (safe < 0) return "—";
  return `${safe.toFixed(1)}%`;
}
