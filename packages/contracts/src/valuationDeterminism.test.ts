import { describe, expect, it } from "vitest";

import { computeValuationConfidence } from "./valuationConfidence";
import { stableHash } from "./determinismHash";
import { runValuationSelection, type BasicComp } from "./valuationSelection";

type SelectionPolicy = {
  min_closed_comps_required: number;
  selection_method: string;
  confidence_rubric: Record<
    string,
    {
      min_comps_multiplier?: number | null;
      min_median_correlation?: number | null;
      max_range_pct?: number | null;
    }
  >;
};

const subject = {
  sqft: 1320,
  beds: 3,
  baths: 2,
  year_built: 1992,
  property_type: "sfr",
  latitude: 28.5,
  longitude: -81.3,
};

const basePolicy: SelectionPolicy = {
  min_closed_comps_required: 2,
  selection_method: "weighted_median_ppsf",
  confidence_rubric: {
    A: { min_comps_multiplier: 1.5, min_median_correlation: 0.8 },
    B: { min_comps_multiplier: 1, min_median_correlation: 0.5 },
    C: {},
  },
};

const compsA: BasicComp[] = [
  {
    id: "c1",
    comp_kind: "closed_sale",
    price: 245000,
    sqft: 1320,
    distance_miles: 0.4,
    close_date: "2024-07-01",
    correlation: 0.74,
  },
  {
    id: "c2",
    comp_kind: "closed_sale",
    price: 255000,
    sqft: 1340,
    distance_miles: 0.6,
    close_date: "2024-06-15",
    correlation: 0.71,
  },
  {
    id: "c3",
    comp_kind: "closed_sale",
    price: 248000,
    sqft: 1290,
    distance_miles: 0.8,
    close_date: "2024-05-20",
    correlation: 0.68,
  },
];

const median = (nums: number[]): number | null => {
  if (!nums.length) return null;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
};

function buildOutputHash(comps: BasicComp[]): string {
  const selection = runValuationSelection({
    subject,
    comps,
    policyValuation: basePolicy as any,
    min_closed_comps_required: basePolicy.min_closed_comps_required,
    comp_kind: "closed_sale",
  });

  const used = selection.selected_comps ?? [];
  const stats = {
    median_distance_miles: median(
      used.map((c: any) => Number((c as any)?.distance_miles)).filter((n) => Number.isFinite(n)),
    ),
    median_correlation: median(
      used.map((c: any) => Number((c as any)?.correlation)).filter((n) => Number.isFinite(n)),
    ),
    median_days_old: median(
      used.map((c: any) => Number((c as any)?.days_old)).filter((n) => Number.isFinite(n)),
    ),
  };

  const warningCodes = selection.warning_codes ?? [];

  const selectionSummary = {
    ...(selection.selection_summary ?? {}),
    input_counts: {
      closed_sale_total: comps.filter((c) => c.comp_kind === "closed_sale").length,
      closed_sale_priced: comps.filter((c) => c.comp_kind === "closed_sale" && Number.isFinite(Number(c.price))).length,
      listing_total: comps.filter((c) => c.comp_kind === "sale_listing").length,
      listing_priced: comps.filter((c) => c.comp_kind === "sale_listing" && Number.isFinite(Number(c.price))).length,
    },
  };

  const confidence = computeValuationConfidence({
    suggested_arv: selection.suggested_arv,
    suggested_arv_range_low: selection.suggested_arv_range_low,
    suggested_arv_range_high: selection.suggested_arv_range_high,
    comp_kind_used: selection.comp_kind_used ?? null,
    comp_count_used: used.length,
    min_closed_comps_required: basePolicy.min_closed_comps_required,
    median_correlation: stats.median_correlation,
    selection_summary: selectionSummary,
    warning_codes: warningCodes,
    snapshot_stub: false,
    confidence_rubric: basePolicy.confidence_rubric,
  });

  const outputForHash = {
    suggested_arv: selection.suggested_arv ?? null,
    suggested_arv_range_low: selection.suggested_arv_range_low ?? null,
    suggested_arv_range_high: selection.suggested_arv_range_high ?? null,
    selected_comp_ids: selection.selected_comp_ids ?? [],
    selection_summary: selectionSummary,
    suggested_arv_source_method: `selection_v1_1_${basePolicy.selection_method}`,
    suggested_arv_comp_kind_used: selection.comp_kind_used ?? null,
    suggested_arv_comp_count_used: used.length,
    confidence_details: confidence,
    valuation_confidence: confidence.grade,
    comp_count: used.length,
    comp_set_stats: stats,
    warnings: warningCodes,
    warning_codes: warningCodes,
    messages: [],
    policy_hash: stableHash(basePolicy),
    snapshot_hash: stableHash({ subject, comps }),
  };

  return stableHash(outputForHash);
}

describe("valuation determinism", () => {
  it("produces identical output hashes for the same inputs", () => {
    const hashA = buildOutputHash(compsA);
    const hashB = buildOutputHash([...compsA].reverse());

    expect(hashA).toEqual(hashB);
    expect(hashA).toHaveLength(64);
  });
});
