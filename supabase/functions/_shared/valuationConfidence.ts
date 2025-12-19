type ConfidenceInput = {
  suggested_arv: number | null | undefined;
  suggested_arv_range_low: number | null | undefined;
  suggested_arv_range_high: number | null | undefined;
  comp_kind_used: "closed_sale" | "sale_listing" | null | undefined;
  comp_count_used: number | null | undefined;
  min_closed_comps_required?: number | null | undefined;
  median_correlation?: number | null | undefined;
  selection_summary?: any;
  warning_codes?: string[] | null;
  snapshot_stub?: boolean | null;
  confidence_rubric?: Record<
    string,
    {
      min_comps_multiplier?: number | null;
      min_median_correlation?: number | null;
      max_range_pct?: number | null;
    }
  > | null;
};

type ConfidenceResult = {
  grade: "A" | "B" | "C";
  reasons: string[];
  metrics: {
    comp_kind_used: "closed_sale" | "sale_listing" | null;
    comp_count_used: number;
    range_pct: number | null;
    outliers_removed_count: number | null;
    candidate_after_filters: number | null;
    candidate_after_outliers: number | null;
  };
};

const safeNumber = (v: unknown): number | null => {
  if (v === null || v === undefined) return null;
  if (typeof v === "string" && v.trim() === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
};

export function computeValuationConfidence(input: ConfidenceInput): ConfidenceResult {
  const reasons: string[] = [];
  const warningCodes = (input.warning_codes ?? []).filter(Boolean);
  const compCount = safeNumber(input.comp_count_used) ?? 0;
  const minClosed = safeNumber(input.min_closed_comps_required) ?? 0;
  const medianCorrelation = safeNumber(input.median_correlation);
  const rangeLow = safeNumber(input.suggested_arv_range_low);
  const rangeHigh = safeNumber(input.suggested_arv_range_high);
  const arv = safeNumber(input.suggested_arv);
  const rangePct =
    arv && rangeLow != null && rangeHigh != null && arv !== 0
      ? (rangeHigh - rangeLow) / arv
      : null;

  const selection = input.selection_summary ?? {};
  const afterFilters =
    safeNumber(selection?.candidate_counts?.after_filters) ??
    safeNumber(selection?.candidate_counts?.closed_sales_after_filters) ??
    null;
  const afterOutliers =
    safeNumber(selection?.candidate_counts?.after_outliers) ??
    safeNumber(selection?.candidate_counts?.closed_sales_after_outliers) ??
    null;
  const outliersRemoved = Array.isArray(selection?.outliers?.removed_ids)
    ? selection.outliers.removed_ids.length
    : safeNumber(selection?.outliers?.removed_count) ?? null;

  const hardDowngrade =
    warningCodes.includes("listing_based_comps_only") ||
    warningCodes.includes("insufficient_closed_sales_comps") ||
    warningCodes.includes("failsoft_zero_after_filters") ||
    input.snapshot_stub;

  let grade: "A" | "B" | "C" = "C";
  let wideRangeThreshold = 0.25;
  let correlationRequirement = false;

  const rubric = input.confidence_rubric ?? null;
  if (!hardDowngrade && rubric) {
    const bands: Array<{ grade: "A" | "B" | "C"; cfg: any }> = [
      { grade: "A", cfg: rubric["A"] },
      { grade: "B", cfg: rubric["B"] },
      { grade: "C", cfg: rubric["C"] ?? {} },
    ];

    for (const band of bands) {
      const minComps = Number.isFinite(Number(band.cfg?.min_comps_multiplier))
        ? Number(band.cfg.min_comps_multiplier) * (minClosed || 0)
        : null;
      const maxRange = safeNumber(band.cfg?.max_range_pct);
      if (maxRange != null) {
        wideRangeThreshold = maxRange;
      }
      // correlation is not enforced for closed_sales selection; treat as not applicable
      const corrReq = safeNumber(band.cfg?.min_median_correlation);
      if (corrReq != null) correlationRequirement = true;
      const compsOk = minComps == null ? true : compCount >= minComps;
      const rangeOk = maxRange == null || rangePct == null ? true : rangePct <= maxRange;
      const corrOk =
        corrReq == null
          ? true
          : medianCorrelation != null
          ? medianCorrelation >= corrReq
          : true;

      if (compsOk && rangeOk && corrOk) {
        grade = band.grade;
        break;
      }
    }
  } else if (!hardDowngrade) {
    // Default rubric
    if (compCount >= 8 && rangePct != null && rangePct <= 0.15) {
      grade = "A";
    } else if (compCount >= 5 && rangePct != null && rangePct <= 0.25) {
      grade = "B";
    } else {
      grade = "C";
    }
  }

  if (hardDowngrade) {
    grade = "C";
  }
  if (warningCodes.includes("listing_based_comps_only")) {
    reasons.push("listing_based_comps_only");
  }
  if (warningCodes.includes("insufficient_closed_sales_comps")) {
    reasons.push("insufficient_closed_sales_comps");
  }
  if (warningCodes.includes("failsoft_zero_after_filters")) {
    reasons.push("failsoft_zero_after_filters");
  }
  if (input.snapshot_stub) {
    reasons.push("snapshot_stub");
  }
  if (rangePct != null && rangePct > wideRangeThreshold) {
    reasons.push("wide_range");
  }
  if (compCount < 5 && grade !== "A") {
    reasons.push("low_comp_count");
  }
  if (rangePct == null) {
    reasons.push("range_missing");
  }
  if (correlationRequirement && medianCorrelation == null) {
    reasons.push("correlation_not_applicable");
  }

  const deduped = Array.from(new Set(reasons)).sort();

  return {
    grade,
    reasons: deduped,
    metrics: {
      comp_kind_used: input.comp_kind_used ?? null,
      comp_count_used: compCount,
      range_pct: rangePct,
      outliers_removed_count: outliersRemoved,
      candidate_after_filters: afterFilters,
      candidate_after_outliers: afterOutliers,
    },
  };
}
