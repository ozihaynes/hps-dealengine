export type SelectionSubject = {
  sqft?: number | null;
  beds?: number | null;
  baths?: number | null;
  year_built?: number | null;
  property_type?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

export type SelectionPolicy = {
  closed_sales_ladder?: Array<{ name?: string | null; radius_miles?: number | null; sale_date_range_days?: number | null }>;
  closed_sales_target_priced?: number | null;
  arv_comp_use_count?: number | null;
  selection_version?: string | null;
  selection_method?: string | null;
  range_method?: string | null;
  similarity_filters?: {
    max_sqft_pct_delta?: number | null;
    max_beds_delta?: number | null;
    max_baths_delta?: number | null;
    max_year_built_delta?: number | null;
    require_property_type_match?: boolean | null;
  } | null;
  outlier_ppsf?: {
    enabled?: boolean | null;
    method?: string | null;
    iqr_k?: number | null;
    min_samples?: number | null;
  } | null;
  weights?: {
    distance?: number | null;
    recency?: number | null;
    sqft?: number | null;
    bed_bath?: number | null;
    year_built?: number | null;
  } | null;
};

export type BasicComp = {
  id?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  comp_kind?: "closed_sale" | "sale_listing" | string | null;
  price?: number | null;
  sqft?: number | null;
  distance_miles?: number | null;
  close_date?: string | null;
  list_date?: string | null;
  as_of?: string | null;
  beds?: number | null;
  baths?: number | null;
  year_built?: number | null;
  property_type?: string | null;
  [key: string]: unknown;
};

export type SelectionResult<T extends BasicComp> = {
  suggested_arv: number | null;
  suggested_arv_range_low: number | null;
  suggested_arv_range_high: number | null;
  selected_comp_ids: string[];
  selected_comps: Array<
    T & {
      score: number;
      ppsf: number | null;
      days_old: number | null;
      abs_sqft_delta_pct: number | null;
    }
  >;
  warning_codes: string[];
  selection_summary: Record<string, unknown>;
  comp_kind_used: "closed_sale" | "sale_listing" | null;
  selection_version?: string | null;
  diagnostics?: SelectionDiagnostics | null;
};

export type SelectionDiagnostics = {
  version: string;
  counts: {
    total_candidates: number;
    after_filters: number;
    after_outlier_checks: number;
    selected: number;
    min_required: number | null;
  };
  filters: {
    reasons_count: Record<string, number>;
    missing_subject: string[];
    relaxations: string[];
    applied: Record<string, unknown>;
  };
  outliers: {
    method: string;
    bounds: { low: number; high: number } | null;
    flagged: Array<{
      comp_id: string;
      ppsf: number | null;
      secondary_signals: string[];
      kept_due_to_minimum: boolean;
    }>;
    removed_ids: string[];
  };
  warnings: string[];
};

type ScoredComp<T extends BasicComp> = {
  comp: T;
  score: number;
  ppsf: number | null;
  days_old: number | null;
  abs_sqft_delta_pct: number | null;
  excluded_reason: string | null;
  source_stage_name?: string | null;
  resolved_id: string;
  compatibility_group?: string | null;
  mismatch_signals?: string[];
};

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

const safeNumber = (value: unknown): number | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" && value.trim() === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
};

const canonicalizePropertyType = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const normalized = value.toLowerCase().replace(/[^a-z0-9]/g, "");
  return normalized.length > 0 ? normalized : null;
};

const canonicalizePropertyTypeGroup = (value: unknown): string | null => {
  const normalized = canonicalizePropertyType(value);
  if (!normalized) return null;
  if (normalized === "townhome" || normalized === "townhouse" || normalized === "th") return "sfr_townhome";
  if (normalized === "singlefamily" || normalized === "sfr") return "sfr_townhome";
  if (normalized.includes("condo") || normalized.includes("condominium")) return "condo";
  if (normalized.includes("duplex") || normalized.includes("triplex") || normalized.includes("quad")) return "small_multifamily";
  if (normalized.includes("manufactured") || normalized.includes("mobile")) return "manufactured";
  if (normalized.includes("land")) return "land";
  return "single_family";
};

const nearestRankQuantile = (values: number[], p: number): number | null => {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.max(0, Math.min(sorted.length - 1, Math.ceil(p * sorted.length) - 1));
  return sorted[idx];
};

const weightedMedian = (samples: Array<{ value: number; weight: number; id?: string }>): number | null => {
  if (!samples.length) return null;
  const normalized = samples.map((s, idx) => ({
    value: s.value,
    weight: Math.max(1, Number.isFinite(s.weight) ? s.weight : 1),
    order: idx,
    id: s.id ?? `idx-${idx}`,
  }));
  normalized.sort((a, b) => {
    if (a.value !== b.value) return a.value - b.value;
    if (a.id < b.id) return -1;
    if (a.id > b.id) return 1;
    return a.order - b.order;
  });
  const total = normalized.reduce((acc, cur) => acc + cur.weight, 0);
  let cumulative = 0;
  for (const s of normalized) {
    cumulative += s.weight;
    if (cumulative >= total / 2) {
      return s.value;
    }
  }
  return normalized[normalized.length - 1].value;
};

const daysBetween = (from: string | null | undefined, to: string | null | undefined): number | null => {
  if (!from || !to) return null;
  const tFrom = Date.parse(from);
  const tTo = Date.parse(to);
  if (!Number.isFinite(tFrom) || !Number.isFinite(tTo)) return null;
  const diffMs = tTo - tFrom;
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
};

const resolveId = (comp: BasicComp): string => {
  const id = comp.id?.toString().trim();
  if (id) return id;
  const keyParts = [
    comp.address ?? "",
    comp.close_date ?? (comp as any)?.list_date ?? "",
    safeNumber(comp.price)?.toString() ?? "",
  ].join("|");
  return keyParts || "unknown-comp";
};

function computeScore(opts: {
  comp: BasicComp;
  subject: SelectionSubject;
  weights: NonNullable<SelectionPolicy["weights"]> | null | undefined;
  filters: NonNullable<SelectionPolicy["similarity_filters"]> | null | undefined;
  recencyWindowDays: number;
  distanceWindowMiles: number;
  resolvedId: string;
}): { score: number; components: Record<string, number> } {
  const weights = opts.weights ?? {
    distance: 0.35,
    recency: 0.25,
    sqft: 0.25,
    bed_bath: 0.1,
    year_built: 0.05,
  };

  const filters = opts.filters ?? {};
  const subject = opts.subject ?? {};

  const scores: Record<string, number> = {};
  const subjSqft = safeNumber(subject.sqft);
  const compSqft = safeNumber((opts.comp as any)?.sqft);
  const sqftDeltaPct =
    subjSqft && compSqft && subjSqft > 0 ? Math.abs(compSqft - subjSqft) / subjSqft : null;
  scores.sqft =
    sqftDeltaPct == null || !filters.max_sqft_pct_delta
      ? 0.5
      : clamp01(1 - sqftDeltaPct / filters.max_sqft_pct_delta);

  const subjBeds = safeNumber(subject.beds);
  const compBeds = safeNumber((opts.comp as any)?.beds);
  const bedDelta = subjBeds != null && compBeds != null ? Math.abs(compBeds - subjBeds) : null;
  const subjBaths = safeNumber(subject.baths);
  const compBaths = safeNumber((opts.comp as any)?.baths);
  const bathDelta = subjBaths != null && compBaths != null ? Math.abs(compBaths - subjBaths) : null;
  const bedScore =
    bedDelta == null || !filters.max_beds_delta ? 0.5 : clamp01(1 - bedDelta / filters.max_beds_delta);
  const bathScore =
    bathDelta == null || !filters.max_baths_delta ? 0.5 : clamp01(1 - bathDelta / filters.max_baths_delta);
  scores.bed_bath = (bedScore + bathScore) / 2;

  const subjYear = safeNumber(subject.year_built);
  const compYear = safeNumber((opts.comp as any)?.year_built);
  const yearDelta = subjYear != null && compYear != null ? Math.abs(compYear - subjYear) : null;
  scores.year_built =
    yearDelta == null || !filters.max_year_built_delta
      ? 0.5
      : clamp01(1 - yearDelta / filters.max_year_built_delta);

  const dist = safeNumber(opts.comp.distance_miles);
  scores.distance =
    dist == null || opts.distanceWindowMiles <= 0
      ? 0.5
      : clamp01(1 - dist / opts.distanceWindowMiles);

  const daysOld = safeNumber((opts.comp as any)?.days_old);
  const recency = daysOld == null ? null : clamp01(1 - daysOld / opts.recencyWindowDays);
  scores.recency = recency == null ? 0.5 : recency;

  const weightSum =
    (weights.distance ?? 0) +
    (weights.recency ?? 0) +
    (weights.sqft ?? 0) +
    (weights.bed_bath ?? 0) +
    (weights.year_built ?? 0);

  const score =
    weightSum === 0
      ? 0
      : 100 *
        ((scores.distance * (weights.distance ?? 0) +
          scores.recency * (weights.recency ?? 0) +
          scores.sqft * (weights.sqft ?? 0) +
          scores.bed_bath * (weights.bed_bath ?? 0) +
          scores.year_built * (weights.year_built ?? 0)) /
          weightSum);

  return { score, components: scores };
}

export function runValuationSelectionV1_1<T extends BasicComp>(opts: {
  subject: SelectionSubject;
  comps: T[];
  policyValuation: SelectionPolicy;
  min_closed_comps_required: number;
  comp_kind: "closed_sale" | "sale_listing";
}): SelectionResult<T> {
  const policy = opts.policyValuation ?? {};
  const filters = policy.similarity_filters ?? {};
  const outlierCfg = policy.outlier_ppsf ?? {};
  const selectionMethod = policy.selection_method ?? "weighted_median_ppsf";
  const rangeMethod = policy.range_method ?? "p25_p75";
  const useCount = Number(policy.arv_comp_use_count ?? opts.min_closed_comps_required ?? 5);
  const recencyWindow =
    (policy.closed_sales_ladder ?? []).reduce<number>(
      (max, s) => Math.max(max, Number(s.sale_date_range_days ?? 0)),
      0,
    ) || 365;
  const distanceWindow =
    (policy.closed_sales_ladder ?? []).reduce<number>(
      (max, s) => Math.max(max, Number(s.radius_miles ?? 0)),
      0,
    ) || 5;

  const missingSubjectFlags: string[] = [];
  if (!safeNumber(opts.subject.sqft)) missingSubjectFlags.push("missing_subject_sqft");
  if (!safeNumber(opts.subject.beds)) missingSubjectFlags.push("missing_subject_beds");
  if (!safeNumber(opts.subject.baths)) missingSubjectFlags.push("missing_subject_baths");
  if (!safeNumber(opts.subject.year_built)) missingSubjectFlags.push("missing_subject_year_built");
  if (!opts.subject.property_type) missingSubjectFlags.push("missing_subject_property_type");
  missingSubjectFlags.sort();

  const exclusionCounts: Record<string, number> = {};
  const scored: ScoredComp<T>[] = opts.comps.map((comp) => {
    const resolved_id = resolveId(comp);
    let excluded: string | null = null;

    const subjPropertyType = canonicalizePropertyType(opts.subject.property_type);
    const compPropertyType = canonicalizePropertyType((comp as any)?.propertyType ?? (comp as any)?.property_type ?? null);
    if (!excluded && filters.require_property_type_match && subjPropertyType && compPropertyType) {
      if (subjPropertyType !== compPropertyType) {
        excluded = "property_type_mismatch";
      }
    }

    const subjSqft = safeNumber(opts.subject.sqft);
    const compSqft = safeNumber((comp as any)?.sqft);
    const absSqftDeltaPct =
      subjSqft && compSqft && subjSqft > 0 ? Math.abs(compSqft - subjSqft) / subjSqft : null;
    if (
      !excluded &&
      filters.max_sqft_pct_delta != null &&
      absSqftDeltaPct != null &&
      absSqftDeltaPct > filters.max_sqft_pct_delta
    ) {
      excluded = "sqft_delta_pct_gt_max";
    }

    // Beds/baths/year: soft penalties only (handled in score); no hard exclude

    const closeDate = (comp as any)?.close_date ?? (comp as any)?.list_date ?? null;
    const asOf = (comp as any)?.as_of ?? null;
    const days_old = (comp as any)?.days_old ?? daysBetween(closeDate, asOf);

    const priceRaw = safeNumber((comp as any)?.price);
    const priceAdjusted = safeNumber((comp as any)?.price_adjusted);
    const priceToUse = priceAdjusted ?? priceRaw;
    const sqftVal = safeNumber((comp as any)?.sqft);
    const ppsf = priceToUse != null && sqftVal != null && sqftVal > 0 ? priceToUse / sqftVal : null;

    const { score } = computeScore({
      comp,
      subject: opts.subject,
      weights: (policy as any)?.weights ?? null,
      filters,
      recencyWindowDays: recencyWindow,
      distanceWindowMiles: distanceWindow,
      resolvedId: resolved_id,
    });

    if (excluded) {
      exclusionCounts[excluded] = (exclusionCounts[excluded] ?? 0) + 1;
    }

    return {
      comp,
      score,
      ppsf,
      days_old,
      abs_sqft_delta_pct: absSqftDeltaPct,
      excluded_reason: excluded,
      source_stage_name: (comp as any)?.source_stage_name ?? null,
      resolved_id,
    };
  });

  let passedFilters = scored.filter((c) => c.excluded_reason === null);

  const ppsfSamples = passedFilters.filter((c) => c.ppsf != null).map((c) => c.ppsf as number);
  let outlierBounds: { low: number; high: number } | null = null;
  let outlierRemoved: string[] = [];
  let filteredAfterOutliers = [...passedFilters];

  const warning_codes: string[] = [...missingSubjectFlags];
  let failsoftApplied = false;

  if (outlierCfg.enabled && ppsfSamples.length >= Number(outlierCfg.min_samples ?? 0)) {
    const q1 = nearestRankQuantile(ppsfSamples, 0.25);
    const q3 = nearestRankQuantile(ppsfSamples, 0.75);
    if (q1 != null && q3 != null) {
      const iqr = q3 - q1;
      const k = Number(outlierCfg.iqr_k ?? 1.5);
      const low = q1 - k * iqr;
      const high = q3 + k * iqr;
      outlierBounds = { low, high };
      filteredAfterOutliers = passedFilters.filter((c) => {
        const ppsf = c.ppsf;
        const keep = ppsf == null || (ppsf >= low && ppsf <= high);
        if (!keep) {
          outlierRemoved.push(c.resolved_id);
        }
        return keep;
      });
    }
  }
  outlierRemoved = outlierRemoved.sort((a, b) => a.localeCompare(b));

  if (filteredAfterOutliers.length === 0 && passedFilters.length === 0 && scored.length > 0) {
    // Fail-soft: relax sqft hard exclude (keep property_type when both known) to avoid empty set
    passedFilters = scored
      .map((c) => ({
        ...c,
        excluded_reason:
          c.excluded_reason === "sqft_delta_pct_gt_max" ? null : c.excluded_reason,
      }))
      .filter((c) => c.excluded_reason === null);
    filteredAfterOutliers = [...passedFilters];
    warning_codes.push("failsoft_zero_after_filters");
    failsoftApplied = true;
  }

  const sorted = [...filteredAfterOutliers].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const kindA = (a.comp.comp_kind ?? "") === "closed_sale" ? 0 : 1;
    const kindB = (b.comp.comp_kind ?? "") === "closed_sale" ? 0 : 1;
    if (kindA !== kindB) return kindA - kindB;

    const closeA = Date.parse((a.comp as any).close_date ?? (a.comp as any).list_date ?? "") || 0;
    const closeB = Date.parse((b.comp as any).close_date ?? (b.comp as any).list_date ?? "") || 0;
    if (closeA !== closeB) return closeB - closeA;

    const distA = safeNumber(a.comp.distance_miles) ?? Infinity;
    const distB = safeNumber(b.comp.distance_miles) ?? Infinity;
    if (distA !== distB) return distA - distB;

    const sqftA = a.abs_sqft_delta_pct ?? Infinity;
    const sqftB = b.abs_sqft_delta_pct ?? Infinity;
    if (sqftA !== sqftB) return sqftA - sqftB;

    if (a.resolved_id < b.resolved_id) return -1;
    if (a.resolved_id > b.resolved_id) return 1;
    return 0;
  });

  const selectionCount = Math.max(1, Math.min(useCount, sorted.length));
  const selected = sorted.slice(0, selectionCount);

  const usingPpsf =
    selectionMethod === "weighted_median_ppsf" &&
    safeNumber(opts.subject.sqft) &&
    selected.some((c) => c.ppsf != null);

  const valueBasis = selected
    .map((c) => {
      const subjectSqft = safeNumber(opts.subject.sqft);
      const compPrice = safeNumber((c.comp as any)?.price_adjusted ?? (c.comp as any)?.price);
      const basisValue =
        usingPpsf && c.ppsf != null && subjectSqft
          ? c.ppsf * subjectSqft
          : compPrice;
      return basisValue != null
        ? {
            value: basisValue,
            weight: c.score,
            id: c.resolved_id,
          }
        : null;
    })
    .filter(Boolean) as Array<{ value: number; weight: number; id: string }>;

  const suggested_arv = weightedMedian(valueBasis);

  const quantilesBase = valueBasis.map((v) => v.value);
  const suggested_arv_range_low =
    rangeMethod === "p25_p75" ? nearestRankQuantile(quantilesBase, 0.25) : null;
  const suggested_arv_range_high =
    rangeMethod === "p25_p75" ? nearestRankQuantile(quantilesBase, 0.75) : null;

  warning_codes.sort();

  const selection_summary: Record<string, unknown> = {
    algorithm_version: "selection_v1_1",
    policy_used: {
      closed_sales_target_priced: policy.closed_sales_target_priced ?? null,
      arv_comp_use_count: useCount,
      selection_method: selectionMethod,
      range_method: rangeMethod,
      similarity_filters: filters,
      outlier_ppsf: outlierCfg,
      weights: policy.weights ?? null,
    },
    candidate_counts: {
      total: opts.comps.length,
      after_filters: passedFilters.length,
      after_outliers: filteredAfterOutliers.length,
    },
    filters: {
      reasons_count: Object.fromEntries(Object.entries(exclusionCounts).sort((a, b) => a[0].localeCompare(b[0]))),
      missing_subject: missingSubjectFlags,
    },
    failsoft: failsoftApplied ? { applied: true, reason: "zero_after_filters" } : { applied: false },
    soft_penalties: {
      beds_used: safeNumber(opts.subject.beds) != null,
      baths_used: safeNumber(opts.subject.baths) != null,
      year_used: safeNumber(opts.subject.year_built) != null,
    },
    outliers: {
      method: outlierCfg.method ?? "iqr",
      removed_ids: outlierRemoved,
      bounds: outlierBounds,
    },
    ranking: sorted.slice(0, 25).map((c) => ({
      comp_id: c.resolved_id,
      kind: c.comp.comp_kind ?? null,
      score: c.score,
      distance_miles: safeNumber(c.comp.distance_miles),
      days_old: c.days_old,
      ppsf: c.ppsf,
      abs_sqft_delta_pct: c.abs_sqft_delta_pct,
      source_stage_name: c.source_stage_name ?? null,
      excluded_reason: c.excluded_reason,
    })),
    selected: selected.map((c) => ({
      comp_id: c.resolved_id,
      kind: c.comp.comp_kind ?? null,
      score: c.score,
      distance_miles: safeNumber(c.comp.distance_miles),
      days_old: c.days_old,
      ppsf: c.ppsf,
      abs_sqft_delta_pct: c.abs_sqft_delta_pct,
      source_stage_name: c.source_stage_name ?? null,
    })),
  };

  return {
    suggested_arv,
    suggested_arv_range_low,
    suggested_arv_range_high,
    selected_comp_ids: selected.map((c) => c.resolved_id),
    selected_comps: selected.map((c) => ({
      ...(c.comp as T),
      id: c.resolved_id,
      score: c.score,
      ppsf: c.ppsf,
      days_old: c.days_old,
      abs_sqft_delta_pct: c.abs_sqft_delta_pct,
    })),
    warning_codes,
    selection_summary,
    selection_version: "selection_v1_1",
    diagnostics: null,
    comp_kind_used: opts.comp_kind,
  };
}

export function runValuationSelectionV1_3<T extends BasicComp>(opts: {
  subject: SelectionSubject;
  comps: T[];
  policyValuation: SelectionPolicy;
  min_closed_comps_required: number;
  comp_kind: "closed_sale" | "sale_listing";
}): SelectionResult<T> {
  const policy = opts.policyValuation ?? {};
  const filters = policy.similarity_filters ?? {};
  const outlierCfg = policy.outlier_ppsf ?? {};
  const selectionMethod = policy.selection_method ?? "weighted_median_ppsf";
  const rangeMethod = policy.range_method ?? "p25_p75";
  const useCount = Number(policy.arv_comp_use_count ?? opts.min_closed_comps_required ?? 5);
  const recencyWindow =
    (policy.closed_sales_ladder ?? []).reduce<number>(
      (max, s) => Math.max(max, Number(s.sale_date_range_days ?? 0)),
      0,
    ) || 365;
  const distanceWindow =
    (policy.closed_sales_ladder ?? []).reduce<number>(
      (max, s) => Math.max(max, Number(s.radius_miles ?? 0)),
      0,
    ) || 5;

  const minRequired = Math.max(1, Number(opts.min_closed_comps_required ?? 0), Number(useCount ?? 0));

  const missingSubjectFlags: string[] = [];
  if (!safeNumber(opts.subject.sqft)) missingSubjectFlags.push("missing_subject_sqft");
  if (!safeNumber(opts.subject.beds)) missingSubjectFlags.push("missing_subject_beds");
  if (!safeNumber(opts.subject.baths)) missingSubjectFlags.push("missing_subject_baths");
  if (!safeNumber(opts.subject.year_built)) missingSubjectFlags.push("missing_subject_year_built");
  if (!opts.subject.property_type) missingSubjectFlags.push("missing_subject_property_type");
  missingSubjectFlags.sort();

  const subjectTypeGroup = canonicalizePropertyTypeGroup(opts.subject.property_type);

  const exclusionCounts: Record<string, number> = {};
  const propertyTypeGroupWarnings: string[] = [];
  const scored: ScoredComp<T & { compatibility_group?: string | null; mismatch_signals?: string[] }>[] = opts.comps.map(
    (comp) => {
      const resolved_id = resolveId(comp);
      let excluded: string | null = null;
      const mismatchSignals: string[] = [];

      const subjPropertyType = canonicalizePropertyType(opts.subject.property_type);
      const compPropertyTypeRaw = canonicalizePropertyType((comp as any)?.propertyType ?? (comp as any)?.property_type ?? (comp as any)?.property_type_display ?? null);
      const compPropertyType = canonicalizePropertyTypeGroup((comp as any)?.propertyType ?? (comp as any)?.property_type ?? (comp as any)?.property_type_display ?? null);
      const requireTypeMatch = filters.require_property_type_match ?? false;
      const isTownhomeLike = (normalized: string | null) =>
        normalized === "townhome" || normalized === "townhouse" || normalized === "th";
      const isSfrLike = (normalized: string | null) => normalized === "singlefamily" || normalized === "sfr";
      const sfrTownhomeGroupMatch =
        subjectTypeGroup === "sfr_townhome" &&
        compPropertyType === "sfr_townhome" &&
        isTownhomeLike(subjPropertyType) !== isTownhomeLike(compPropertyTypeRaw) &&
        isSfrLike(subjPropertyType) !== isSfrLike(compPropertyTypeRaw);
      if (subjectTypeGroup && compPropertyType) {
        if (subjectTypeGroup !== compPropertyType) {
          mismatchSignals.push("type_mismatch");
          if (requireTypeMatch) {
            excluded = "property_type_mismatch";
          }
        } else if (sfrTownhomeGroupMatch) {
          mismatchSignals.push("property_type_group_match_sfr_townhome");
          propertyTypeGroupWarnings.push("property_type_group_match_sfr_townhome");
        }
      }

      const subjSqft = safeNumber(opts.subject.sqft);
      const compSqft = safeNumber((comp as any)?.sqft);
      const absSqftDeltaPct =
        subjSqft && compSqft && subjSqft > 0 ? Math.abs(compSqft - subjSqft) / subjSqft : null;
      if (
        !excluded &&
        filters.max_sqft_pct_delta != null &&
        absSqftDeltaPct != null &&
        absSqftDeltaPct > filters.max_sqft_pct_delta
      ) {
        excluded = "sqft_delta_pct_gt_max";
      } else if (absSqftDeltaPct != null) {
        const softSqftThreshold = filters.max_sqft_pct_delta ?? 0.35;
        if (absSqftDeltaPct > softSqftThreshold) mismatchSignals.push("sqft_delta_high");
      }

      const subjBeds = safeNumber(opts.subject.beds);
      const compBeds = safeNumber((comp as any)?.beds);
      const bedDelta = subjBeds != null && compBeds != null ? Math.abs(compBeds - subjBeds) : null;
      if (bedDelta != null && filters.max_beds_delta != null && bedDelta > filters.max_beds_delta) {
        mismatchSignals.push("beds_delta_high");
      }
      const subjBaths = safeNumber(opts.subject.baths);
      const compBaths = safeNumber((comp as any)?.baths);
      const bathDelta = subjBaths != null && compBaths != null ? Math.abs(compBaths - subjBaths) : null;
      if (bathDelta != null && filters.max_baths_delta != null && bathDelta > filters.max_baths_delta) {
        mismatchSignals.push("baths_delta_high");
      }

      const subjYear = safeNumber(opts.subject.year_built);
      const compYear = safeNumber((comp as any)?.year_built);
      const yearDelta = subjYear != null && compYear != null ? Math.abs(compYear - subjYear) : null;
      if (yearDelta != null && filters.max_year_built_delta != null && yearDelta > filters.max_year_built_delta) {
        mismatchSignals.push("year_built_delta_high");
      }

      const closeDate = (comp as any)?.close_date ?? (comp as any)?.list_date ?? null;
      const asOf = (comp as any)?.as_of ?? null;
      const days_old = (comp as any)?.days_old ?? daysBetween(closeDate, asOf);

      if (days_old != null && recencyWindow > 0 && days_old > recencyWindow) {
        mismatchSignals.push("recency_outside_window");
      }

      const priceRaw = safeNumber((comp as any)?.price);
      const priceAdjusted = safeNumber((comp as any)?.price_adjusted);
      const priceToUse = priceAdjusted ?? priceRaw;
      const sqftVal = safeNumber((comp as any)?.sqft);
      const ppsf = priceToUse != null && sqftVal != null && sqftVal > 0 ? priceToUse / sqftVal : null;

      const { score } = computeScore({
        comp,
        subject: opts.subject,
        weights: (policy as any)?.weights ?? null,
        filters,
        recencyWindowDays: recencyWindow,
        distanceWindowMiles: distanceWindow,
        resolvedId: resolved_id,
      });

      if (excluded) {
        exclusionCounts[excluded] = (exclusionCounts[excluded] ?? 0) + 1;
      }

      return {
        comp,
        score,
        ppsf,
        days_old,
        abs_sqft_delta_pct: absSqftDeltaPct,
        excluded_reason: excluded,
        source_stage_name: (comp as any)?.source_stage_name ?? null,
        resolved_id,
        compatibility_group: compPropertyType ?? null,
        mismatch_signals: mismatchSignals,
      };
    },
  );

  let passedFilters = scored.filter((c) => c.excluded_reason === null);

  const ppsfSamples = passedFilters.filter((c) => c.ppsf != null).map((c) => c.ppsf as number);
  let outlierBounds: { low: number; high: number } | null = null;
  let flaggedOutliers: {
    comp_id: string;
    ppsf: number | null;
    secondary_signals: string[];
    kept_due_to_minimum: boolean;
  }[] = [];
  let filteredAfterOutliers = [...passedFilters];

  const warning_codes: string[] = [...missingSubjectFlags];
  const relaxations: string[] = [];
  let failsoftApplied = false;

  if (outlierCfg.enabled && ppsfSamples.length >= Number(outlierCfg.min_samples ?? 0)) {
    const q1 = nearestRankQuantile(ppsfSamples, 0.25);
    const q3 = nearestRankQuantile(ppsfSamples, 0.75);
    if (q1 != null && q3 != null) {
      const iqr = q3 - q1;
      const k = Number(outlierCfg.iqr_k ?? 1.5);
      const low = q1 - k * iqr;
      const high = q3 + k * iqr;
      outlierBounds = { low, high };
      const flagged = passedFilters
        .filter((c) => c.ppsf != null && (c.ppsf < low || c.ppsf > high))
        .map((c) => ({
          ...c,
          deviation:
            c.ppsf == null
              ? 0
              : c.ppsf < low
              ? low - c.ppsf
              : c.ppsf > high
              ? c.ppsf - high
              : 0,
        }));

      const keepSet = new Set(passedFilters.map((c) => c.resolved_id));
      const flaggedDetailed = flagged
        .map((comp) => {
          const baseSignals = (comp.mismatch_signals ?? []).filter(
            (s) => s !== "property_type_group_match_sfr_townhome",
          );
          const distanceMiles = safeNumber(comp.comp.distance_miles);
          if (distanceMiles != null && distanceMiles > distanceWindow) baseSignals.push("distance_outside_window");
          return {
            comp_id: comp.resolved_id,
            ppsf: comp.ppsf,
            deviation: comp.deviation ?? 0,
            secondary_signals: baseSignals.sort(),
            score: comp.score,
          };
        })
        .sort((a, b) => {
          const aEligible = a.secondary_signals.length > 0;
          const bEligible = b.secondary_signals.length > 0;
          if (aEligible !== bEligible) return aEligible ? -1 : 1;
          if (a.deviation !== b.deviation) return b.deviation - a.deviation;
          if (a.score !== b.score) return a.score - b.score;
          return a.comp_id.localeCompare(b.comp_id);
        });

      for (const flaggedComp of flaggedDetailed) {
        if (!keepSet.has(flaggedComp.comp_id)) continue;
        const hasSecondary = flaggedComp.secondary_signals.length > 0;
        const wouldDropBelow = keepSet.size - 1 < minRequired;
        if (!hasSecondary) {
          flaggedOutliers.push({
            comp_id: flaggedComp.comp_id,
            ppsf: flaggedComp.ppsf,
            secondary_signals: flaggedComp.secondary_signals,
            kept_due_to_minimum: false,
          });
          relaxations.push("outlier_secondary_signal_missing");
          continue;
        }
        if (wouldDropBelow) {
          flaggedOutliers.push({
            comp_id: flaggedComp.comp_id,
            ppsf: flaggedComp.ppsf,
            secondary_signals: flaggedComp.secondary_signals,
            kept_due_to_minimum: true,
          });
          relaxations.push("outlier_guard_min_required");
          continue;
        }
        keepSet.delete(flaggedComp.comp_id);
        flaggedOutliers.push({
          comp_id: flaggedComp.comp_id,
          ppsf: flaggedComp.ppsf,
          secondary_signals: flaggedComp.secondary_signals,
          kept_due_to_minimum: false,
        });
      }

      filteredAfterOutliers = passedFilters.filter((c) => keepSet.has(c.resolved_id));
    }
  }
  flaggedOutliers = flaggedOutliers.sort((a, b) => a.comp_id.localeCompare(b.comp_id));

  if (filteredAfterOutliers.length === 0 && passedFilters.length === 0 && scored.length > 0) {
    passedFilters = scored
      .map((c) => ({
        ...c,
        excluded_reason: c.excluded_reason === "sqft_delta_pct_gt_max" ? null : c.excluded_reason,
      }))
      .filter((c) => c.excluded_reason === null);
    filteredAfterOutliers = [...passedFilters];
    warning_codes.push("failsoft_zero_after_filters");
    relaxations.push("sqft_filter_relaxed");
    failsoftApplied = true;
  }

  const sorted = [...filteredAfterOutliers].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const distA = safeNumber(a.comp.distance_miles) ?? Infinity;
    const distB = safeNumber(b.comp.distance_miles) ?? Infinity;
    if (distA !== distB) return distA - distB;

    const daysA = a.days_old ?? Infinity;
    const daysB = b.days_old ?? Infinity;
    if (daysA !== daysB) return daysA - daysB;

    const closeA = Date.parse((a.comp as any).close_date ?? (a.comp as any).list_date ?? "") || 0;
    const closeB = Date.parse((b.comp as any).close_date ?? (b.comp as any).list_date ?? "") || 0;
    if (closeA !== closeB) return closeB - closeA;

    const sqftA = a.abs_sqft_delta_pct ?? Infinity;
    const sqftB = b.abs_sqft_delta_pct ?? Infinity;
    if (sqftA !== sqftB) return sqftA - sqftB;

    if (a.resolved_id < b.resolved_id) return -1;
    if (a.resolved_id > b.resolved_id) return 1;
    return 0;
  });

  const selectionCount = Math.max(1, Math.min(useCount, sorted.length));
  const selected = sorted.slice(0, selectionCount);

  const usingPpsf =
    selectionMethod === "weighted_median_ppsf" &&
    safeNumber(opts.subject.sqft) &&
    selected.some((c) => c.ppsf != null);

  const valueBasis = selected
    .map((c) => {
      const subjectSqft = safeNumber(opts.subject.sqft);
      const compPrice = safeNumber((c.comp as any)?.price_adjusted ?? (c.comp as any)?.price);
      const basisValue =
        usingPpsf && c.ppsf != null && subjectSqft
          ? c.ppsf * subjectSqft
          : compPrice;
      return basisValue != null
        ? {
            value: basisValue,
            weight: c.score,
            id: c.resolved_id,
          }
        : null;
    })
    .filter(Boolean) as Array<{ value: number; weight: number; id: string }>;

  const suggested_arv = weightedMedian(valueBasis);

  const quantilesBase = valueBasis.map((v) => v.value);
  const suggested_arv_range_low =
    rangeMethod === "p25_p75" ? nearestRankQuantile(quantilesBase, 0.25) : null;
  const suggested_arv_range_high =
    rangeMethod === "p25_p75" ? nearestRankQuantile(quantilesBase, 0.75) : null;

  if (propertyTypeGroupWarnings.length > 0) {
    warning_codes.push(...propertyTypeGroupWarnings);
  }
  warning_codes.sort();

  const selection_summary: Record<string, unknown> = {
    algorithm_version: "selection_v1_3",
    policy_used: {
      closed_sales_target_priced: policy.closed_sales_target_priced ?? null,
      arv_comp_use_count: useCount,
      selection_method: selectionMethod,
      range_method: rangeMethod,
      similarity_filters: filters,
      outlier_ppsf: outlierCfg,
      weights: policy.weights ?? null,
    },
    candidate_counts: {
      total: opts.comps.length,
      after_filters: passedFilters.length,
      after_outliers: filteredAfterOutliers.length,
    },
    filters: {
      reasons_count: Object.fromEntries(Object.entries(exclusionCounts).sort((a, b) => a[0].localeCompare(b[0]))),
      missing_subject: missingSubjectFlags,
    },
    failsoft: failsoftApplied ? { applied: true, reason: "zero_after_filters" } : { applied: false },
    soft_penalties: {
      beds_used: safeNumber(opts.subject.beds) != null,
      baths_used: safeNumber(opts.subject.baths) != null,
      year_used: safeNumber(opts.subject.year_built) != null,
    },
    outliers: {
      method: outlierCfg.method ?? "iqr",
      removed_ids: flaggedOutliers.filter((f) => !f.kept_due_to_minimum && f.secondary_signals.length > 0).map((f) => f.comp_id).sort((a, b) => a.localeCompare(b)),
      bounds: outlierBounds,
    },
    ranking: sorted.slice(0, 25).map((c) => ({
      comp_id: c.resolved_id,
      kind: c.comp.comp_kind ?? null,
      score: c.score,
      distance_miles: safeNumber(c.comp.distance_miles),
      days_old: c.days_old,
      ppsf: c.ppsf,
      abs_sqft_delta_pct: c.abs_sqft_delta_pct,
      source_stage_name: c.source_stage_name ?? null,
      excluded_reason: c.excluded_reason,
    })),
    selected: selected.map((c) => ({
      comp_id: c.resolved_id,
      kind: c.comp.comp_kind ?? null,
      score: c.score,
      distance_miles: safeNumber(c.comp.distance_miles),
      days_old: c.days_old,
      ppsf: c.ppsf,
      abs_sqft_delta_pct: c.abs_sqft_delta_pct,
      source_stage_name: c.source_stage_name ?? null,
    })),
  };

  const diagnostics: SelectionDiagnostics = {
    version: "selection_v1_3",
    counts: {
      total_candidates: opts.comps.length,
      after_filters: passedFilters.length,
      after_outlier_checks: filteredAfterOutliers.length,
      selected: selected.length,
      min_required: minRequired,
    },
    filters: {
      reasons_count: Object.fromEntries(Object.entries(exclusionCounts).sort((a, b) => a[0].localeCompare(b[0]))),
      missing_subject: missingSubjectFlags,
      relaxations: Array.from(new Set(relaxations)).sort(),
      applied: {
        similarity_filters: filters,
        outlier_ppsf: outlierCfg,
        distance_window: distanceWindow,
        recency_window: recencyWindow,
      },
    },
    outliers: {
      method: outlierCfg.method ?? "iqr",
      bounds: outlierBounds,
      flagged: flaggedOutliers,
      removed_ids: flaggedOutliers
        .filter((f) => !f.kept_due_to_minimum && f.secondary_signals.length > 0)
        .map((f) => f.comp_id)
        .sort((a, b) => a.localeCompare(b)),
    },
    warnings: warning_codes,
  };

  return {
    suggested_arv,
    suggested_arv_range_low,
    suggested_arv_range_high,
    selected_comp_ids: selected.map((c) => c.resolved_id),
    selected_comps: selected.map((c) => ({
      ...(c.comp as T),
      id: c.resolved_id,
      score: c.score,
      ppsf: c.ppsf,
      days_old: c.days_old,
      abs_sqft_delta_pct: c.abs_sqft_delta_pct,
    })),
    warning_codes,
    selection_summary,
    selection_version: "selection_v1_3",
    diagnostics,
    comp_kind_used: opts.comp_kind,
  };
}

export function runValuationSelection<T extends BasicComp>(opts: {
  subject: SelectionSubject;
  comps: T[];
  policyValuation: SelectionPolicy;
  min_closed_comps_required: number;
  comp_kind: "closed_sale" | "sale_listing";
  version?: string | null;
}): SelectionResult<T> {
  const version =
    (opts as any)?.version ??
    (opts.policyValuation as any)?.selection_version ??
    (opts.policyValuation as any)?.selectionVersion ??
    "selection_v1_1";
  if (version === "selection_v1_3") {
    return runValuationSelectionV1_3(opts);
  }
  return runValuationSelectionV1_1(opts);
}
