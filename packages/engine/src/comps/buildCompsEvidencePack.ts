/**
 * buildCompsEvidencePack
 *
 * Transforms raw valuation comps + selection metadata into
 * a display-ready evidence pack for the V2.5 Dashboard.
 *
 * DETERMINISM: Pure function, no side effects, no random, no Date.now()
 * PROVENANCE: Preserves source, as_of, snapshot_id from inputs
 * TRACE: Returns valuation_run_id for audit linkage
 *
 * @module comps/buildCompsEvidencePack
 * @version 1.1.0
 */

import type {
  CompsEvidencePack,
  CompDisplay,
  AdjustmentDisplay,
} from "@hps-internal/contracts";

// =============================================================================
// INPUT TYPE
// =============================================================================

/**
 * Input for building a comps evidence pack.
 * All provenance fields flow through to output for audit trail.
 */
export interface BuildCompsEvidencePackInput {
  /** Selected comps from valuation run output */
  selected_comps: unknown[] | null | undefined;

  /** Selection metadata */
  selection_version: string | null;
  comp_kind_used: "closed_sale" | "sale_listing" | null;
  outliers_removed_count: number | null;
  candidates_before_filters: number | null;
  candidates_after_filters: number | null;

  /** Provenance */
  snapshot_id: string | null;
  snapshot_as_of: string | null;
  provider: string | null;
  valuation_run_id: string | null;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Safely convert unknown to finite number.
 * Returns null for: null, undefined, NaN, Infinity, -Infinity, non-numeric strings.
 */
function safeNumber(val: unknown): number | null {
  if (val == null) return null;
  const n = Number(val);
  if (!Number.isFinite(n)) return null;
  return n;
}

/**
 * Safely convert to non-negative number.
 * Returns null for invalid values or negative numbers.
 */
function safeNonnegative(val: unknown): number | null {
  const n = safeNumber(val);
  if (n == null || n < 0) return null;
  return n;
}

/**
 * Safely convert to integer (rounds to nearest).
 * Returns null for invalid values.
 */
function safeInt(val: unknown): number | null {
  const n = safeNumber(val);
  if (n == null) return null;
  return Math.round(n);
}

/**
 * Safely convert to non-negative integer.
 * Returns null for invalid values or negative numbers.
 */
function safeNonnegativeInt(val: unknown): number | null {
  const n = safeNonnegative(val);
  if (n == null) return null;
  return Math.round(n);
}

/**
 * Safely convert to number and round to specified decimal places.
 */
function safeRound(val: unknown, decimals: number = 1): number | null {
  const n = safeNumber(val);
  if (n == null) return null;
  const factor = Math.pow(10, decimals);
  return Math.round(n * factor) / factor;
}

/**
 * Clamp a number to [min, max] range.
 */
function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

/**
 * Calculate median of number array.
 * Returns null for empty array.
 */
function median(arr: number[]): number | null {
  if (!arr.length) return null;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Calculate arithmetic mean of number array.
 * Returns null for empty array.
 */
function mean(arr: number[]): number | null {
  if (!arr.length) return null;
  return arr.reduce((sum, v) => sum + v, 0) / arr.length;
}

/**
 * Safely extract string from unknown value.
 * Returns null for non-string values.
 */
function safeString(val: unknown): string | null {
  if (val == null) return null;
  if (typeof val === "string") return val;
  return null;
}

/**
 * Safely extract non-empty string from unknown value.
 * Returns null for non-string or empty string values.
 */
function safeNonEmptyString(val: unknown): string | null {
  const s = safeString(val);
  if (s == null || s.length === 0) return null;
  return s;
}

// =============================================================================
// MAIN FUNCTION
// =============================================================================

/**
 * Transforms raw valuation comps into a display-ready evidence pack.
 *
 * @param input - Raw comps and metadata from valuation run
 * @returns CompsEvidencePack ready for V2.5 Dashboard display
 *
 * @example
 * ```typescript
 * const pack = buildCompsEvidencePack({
 *   selected_comps: valuationResult.comps,
 *   selection_version: "v1.2",
 *   comp_kind_used: "closed_sale",
 *   outliers_removed_count: 2,
 *   candidates_before_filters: 15,
 *   candidates_after_filters: 8,
 *   snapshot_id: "snap-123",
 *   snapshot_as_of: "2025-01-01T00:00:00Z",
 *   provider: "RentCast",
 *   valuation_run_id: "run-456",
 * });
 * ```
 */
export function buildCompsEvidencePack(
  input: BuildCompsEvidencePackInput
): CompsEvidencePack {
  const compsRaw = input.selected_comps;

  // Edge case: No comps or invalid input
  if (!Array.isArray(compsRaw) || compsRaw.length === 0) {
    return {
      comp_count: 0,
      comp_kind_used: input.comp_kind_used,
      avg_similarity_score: null,
      avg_distance_miles: null,
      avg_days_old: null,
      price_range_low: null,
      price_range_high: null,
      price_variance_pct: null,
      comps: [],
      selection_version: input.selection_version,
      outliers_removed_count: input.outliers_removed_count,
      candidates_before_filters: input.candidates_before_filters,
      candidates_after_filters: input.candidates_after_filters,
      snapshot_id: input.snapshot_id,
      snapshot_as_of: input.snapshot_as_of,
      provider: input.provider,
      valuation_run_id: input.valuation_run_id,
    };
  }

  // Transform each comp to display format
  const comps: CompDisplay[] = compsRaw.map((compRaw, index): CompDisplay => {
    const comp = compRaw as Record<string, unknown>;

    // Core metrics with schema-compliant types
    const price = safeNonnegative(comp.price);
    const sqft = safeNonnegative(comp.sqft);
    const pricePerSqft =
      price != null && sqft != null && sqft > 0
        ? Math.round(price / sqft)
        : null;

    // Calculate net adjustment percentage (can be negative)
    const adjustedValue = safeNonnegative(comp.adjusted_value);
    let netAdjustmentPct: number | null = null;
    if (price != null && adjustedValue != null && price > 0) {
      netAdjustmentPct = safeRound(((adjustedValue - price) / price) * 100);
    }

    // Transform adjustments array
    const rawAdjustments = Array.isArray(comp.adjustments)
      ? comp.adjustments
      : null;
    const adjustments: AdjustmentDisplay[] | null = rawAdjustments
      ? rawAdjustments.map((adj: unknown): AdjustmentDisplay => {
          const a = adj as Record<string, unknown>;
          const amount = safeNumber(a.amount) ?? 0;
          return {
            type: safeNonEmptyString(a.type) ?? "unknown",
            label:
              safeNonEmptyString(a.label) ??
              safeNonEmptyString(a.type) ??
              "Adjustment",
            amount,
            direction:
              amount > 0 ? "up" : amount < 0 ? "down" : "neutral",
          };
        })
      : null;

    // Extract photo URL from nested raw object if available
    const raw = comp.raw as Record<string, unknown> | undefined;
    let photoUrl: string | null = null;
    if (raw) {
      photoUrl = safeString(raw.photo_url);
      if (!photoUrl && Array.isArray(raw.photos) && raw.photos.length > 0) {
        photoUrl = safeString(raw.photos[0]);
      }
    }

    // Extract MLS number from raw
    let mlsNumber: string | null = null;
    if (raw) {
      mlsNumber = safeString(raw.mls_number) ?? safeString(raw.listing_id);
    }

    // Extract sale date (try multiple field names)
    const saleDate =
      safeString(comp.sale_date) ??
      safeString(comp.closed_date) ??
      safeString(comp.as_of);

    // Extract DOM (days on market)
    const dom =
      safeNonnegativeInt(comp.dom) ??
      (raw ? safeNonnegativeInt(raw.dom) : null);

    // Similarity score: normalize to 0-100 with clamping
    const score = safeNumber(comp.score);
    const correlation = safeNumber(comp.correlation);
    let similarityScore: number | null = null;
    if (score != null) {
      similarityScore = clamp(Math.round(score * 100), 0, 100);
    } else if (correlation != null) {
      similarityScore = clamp(Math.round(correlation * 100), 0, 100);
    }

    // Determine comp_kind with type safety
    let compKind: "closed_sale" | "sale_listing" | null = null;
    const rawKind = safeString(comp.comp_kind);
    if (rawKind === "closed_sale" || rawKind === "sale_listing") {
      compKind = rawKind;
    }

    // Deterministic ID: use existing or fallback to array index
    const compId = safeNonEmptyString(comp.id) ?? `comp-${index}`;

    // Provenance: as_of must be non-empty per schema
    const compAsOf =
      safeNonEmptyString(comp.as_of) ?? input.snapshot_as_of ?? "unknown";

    return {
      id: compId,
      address: safeString(comp.address),
      price,
      price_per_sqft: pricePerSqft,
      sqft,
      beds: safeNonnegativeInt(comp.beds),
      baths: safeNonnegative(comp.baths), // baths can be 1.5, 2.5, etc.
      year_built: safeInt(comp.year_built),
      lot_size: safeNonnegative(comp.lot_size),
      distance_miles: safeRound(safeNonnegative(comp.distance_miles)),
      days_old: safeNonnegativeInt(comp.days_old),
      similarity_score: similarityScore,
      correlation,
      comp_kind: compKind,
      sale_date: saleDate,
      dom,
      adjusted_value: adjustedValue,
      net_adjustment_pct: netAdjustmentPct,
      adjustments,
      photo_url: photoUrl,
      mls_number: mlsNumber,
      source: safeNonEmptyString(comp.source) ?? "unknown",
      as_of: compAsOf,
    };
  });

  // Calculate aggregates from transformed comps
  const prices = comps
    .map((c) => c.price)
    .filter((p): p is number => p != null);
  const distances = comps
    .map((c) => c.distance_miles)
    .filter((d): d is number => d != null);
  const daysOld = comps
    .map((c) => c.days_old)
    .filter((d): d is number => d != null);
  const similarities = comps
    .map((c) => c.similarity_score)
    .filter((s): s is number => s != null);

  const priceRangeLow = prices.length ? Math.min(...prices) : null;
  const priceRangeHigh = prices.length ? Math.max(...prices) : null;

  // Price variance as percentage of median
  let priceVariancePct: number | null = null;
  if (prices.length >= 2) {
    const priceMedian = median(prices);
    if (priceMedian != null && priceMedian > 0) {
      const variance = Math.max(...prices) - Math.min(...prices);
      const pct = (variance / priceMedian) * 100;
      priceVariancePct = safeRound(pct);
    }
  }

  // Calculate means with schema-compliant types
  const avgSimilarity = mean(similarities);
  const avgDistance = mean(distances);
  const avgDays = mean(daysOld);

  return {
    comp_count: comps.length,
    comp_kind_used: input.comp_kind_used,
    avg_similarity_score:
      avgSimilarity != null
        ? clamp(safeRound(avgSimilarity) ?? 0, 0, 100)
        : null,
    avg_distance_miles:
      avgDistance != null && avgDistance >= 0 ? safeRound(avgDistance) : null,
    avg_days_old: avgDays != null ? Math.round(Math.max(0, avgDays)) : null,
    price_range_low: priceRangeLow,
    price_range_high: priceRangeHigh,
    price_variance_pct: priceVariancePct,
    comps,
    selection_version: input.selection_version,
    outliers_removed_count: input.outliers_removed_count,
    candidates_before_filters: input.candidates_before_filters,
    candidates_after_filters: input.candidates_after_filters,
    snapshot_id: input.snapshot_id,
    snapshot_as_of: input.snapshot_as_of,
    provider: input.provider,
    valuation_run_id: input.valuation_run_id,
  };
}
