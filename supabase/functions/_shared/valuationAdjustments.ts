export type AdjustmentType = "time" | "sqft" | "beds" | "baths" | "lot" | "year_built";

export type AdjustmentLineItem = {
  type: AdjustmentType;
  subject_value: number | string | null;
  comp_value: number | string | null;
  delta_units_raw: number | null;
  delta_units_capped: number | null;
  unit_value: number | null;
  amount_raw: number | null;
  amount_capped: number | null;
  applied: boolean;
  skip_reason: string | null;
  source: "policy";
  notes: string | null;
};

type AdjustmentsPolicy = {
  rounding?: { cents?: number | null } | null;
  missing_field_behavior?: "skip" | string | null;
  enabled_types?: AdjustmentType[] | null;
  caps?: {
    beds_delta_cap?: number | null;
    baths_delta_cap?: number | null;
    year_delta_cap?: number | null;
    lot_delta_cap_ratio?: number | null;
    sqft_basis_allowed_delta_ratio?: number | null;
  } | null;
  unit_values?: {
    beds?: number | null;
    baths?: number | null;
    lot_per_sqft?: number | null;
    year_built_per_year?: number | null;
  } | null;
  version?: string | null;
};

type SubjectShape = {
  sqft?: number | null;
  beds?: number | null;
  baths?: number | null;
  lot_sqft?: number | null;
  year_built?: number | null;
};

type BuildCompAdjustedValueInput = {
  subject: SubjectShape;
  comp: Record<string, any>;
  policy: AdjustmentsPolicy | null | undefined;
  asOf?: string | null;
};

const allowedTypes: AdjustmentType[] = ["time", "sqft", "beds", "baths", "lot", "year_built"];
const sortOrder: AdjustmentType[] = ["time", "sqft", "beds", "baths", "lot", "year_built"];

const safeNumber = (value: unknown): number | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" && value.trim() === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
};

export const roundMoney = (value: number | null, cents: number): number | null => {
  if (value === null || value === undefined) return null;
  const roundedCents = Number.isInteger(cents) ? Math.max(0, Math.min(6, cents)) : 2;
  const factor = Math.pow(10, roundedCents);
  return Math.round(value * factor) / factor;
};

const normalizeEnabledTypes = (types: AdjustmentType[] | null | undefined): AdjustmentType[] => {
  const provided = Array.isArray(types) ? types : [];
  const filtered = provided
    .map((t) => (allowedTypes.includes(t as AdjustmentType) ? (t as AdjustmentType) : null))
    .filter((t): t is AdjustmentType => !!t);
  if (filtered.length > 0) return filtered;
  return allowedTypes;
};

const defaultCaps = {
  beds_delta_cap: 2,
  baths_delta_cap: 2,
  year_delta_cap: 20,
  lot_delta_cap_ratio: 0.5,
  sqft_basis_allowed_delta_ratio: 0.5,
};

const defaultUnitValues = {
  beds: 0,
  baths: 0,
  lot_per_sqft: 0,
  year_built_per_year: 0,
};

export function weightedMedianDeterministic(
  samples: Array<{ value: number; weight: number; id: string }>,
  cents: number = 2,
): number | null {
  if (!samples.length) return null;
  const normalized = samples
    .map((s, idx) => ({
      value: s.value,
      weight: Math.max(1, Number.isFinite(s.weight) ? s.weight : 1),
      id: s.id ?? `idx-${idx}`,
      order: idx,
    }))
    .sort((a, b) => {
      if (a.value !== b.value) return a.value - b.value;
      if (a.id < b.id) return -1;
      if (a.id > b.id) return 1;
      return a.order - b.order;
    });
  const totalWeight = normalized.reduce((acc, cur) => acc + cur.weight, 0);
  let cumulative = 0;
  for (const s of normalized) {
    cumulative += s.weight;
    if (cumulative >= totalWeight / 2) {
      return roundMoney(s.value, cents);
    }
  }
  return roundMoney(normalized[normalized.length - 1].value, cents);
}

export function buildCompAdjustedValue(input: BuildCompAdjustedValueInput) {
  const { subject, comp, policy, asOf } = input;
  const roundingCents = Number.isInteger(policy?.rounding?.cents ?? null) ? Number(policy?.rounding?.cents) : 2;
  const missingBehavior = (policy?.missing_field_behavior ?? "skip") as string;
  const enabledTypes = normalizeEnabledTypes(policy?.enabled_types);
  const caps = {
    beds_delta_cap: safeNumber(policy?.caps?.beds_delta_cap) ?? defaultCaps.beds_delta_cap,
    baths_delta_cap: safeNumber(policy?.caps?.baths_delta_cap) ?? defaultCaps.baths_delta_cap,
    year_delta_cap: safeNumber(policy?.caps?.year_delta_cap) ?? defaultCaps.year_delta_cap,
    lot_delta_cap_ratio: safeNumber(policy?.caps?.lot_delta_cap_ratio) ?? defaultCaps.lot_delta_cap_ratio,
    sqft_basis_allowed_delta_ratio:
      safeNumber(policy?.caps?.sqft_basis_allowed_delta_ratio) ?? defaultCaps.sqft_basis_allowed_delta_ratio,
  };
  const unitValues = {
    beds: safeNumber(policy?.unit_values?.beds) ?? defaultUnitValues.beds,
    baths: safeNumber(policy?.unit_values?.baths) ?? defaultUnitValues.baths,
    lot_per_sqft: safeNumber(policy?.unit_values?.lot_per_sqft) ?? defaultUnitValues.lot_per_sqft,
    year_built_per_year: safeNumber(policy?.unit_values?.year_built_per_year) ?? defaultUnitValues.year_built_per_year,
  };

  const base_price_raw = safeNumber(comp.price);
  const time_adjusted_price = safeNumber((comp as any).price_adjusted) ?? base_price_raw;
  const subjectSqft = safeNumber(subject?.sqft);
  const compSqft = safeNumber((comp as any)?.sqft);

  const sqftDeltaUnits = subjectSqft != null && compSqft != null ? subjectSqft - compSqft : null;
  const sqftDeltaRatio =
    subjectSqft && compSqft && subjectSqft > 0 ? Math.abs(sqftDeltaUnits ?? 0) / subjectSqft : null;
  const sqftThreshold = caps.sqft_basis_allowed_delta_ratio ?? defaultCaps.sqft_basis_allowed_delta_ratio;

  const sqftHasValues = subjectSqft != null && compSqft != null && subjectSqft > 0 && compSqft > 0;
  const sqftDeltaOk = sqftDeltaRatio != null && sqftDeltaRatio <= sqftThreshold;
  const sqftCanApply = sqftHasValues && sqftDeltaOk && time_adjusted_price != null;
  const useSqftBasis = sqftCanApply;

  const value_basis_before_adjustments =
    useSqftBasis && time_adjusted_price != null && compSqft
      ? roundMoney((time_adjusted_price / compSqft) * subjectSqft!, roundingCents)
      : roundMoney(time_adjusted_price, roundingCents);
  const value_basis_method = useSqftBasis ? "ppsf_subject" : "time_adjusted_price";

  const adjustments: AdjustmentLineItem[] = [];

  const addAdjustment = (item: AdjustmentLineItem) => {
    adjustments.push({
      ...item,
      amount_raw: item.amount_raw != null ? roundMoney(item.amount_raw, roundingCents) : null,
      amount_capped: item.amount_capped != null ? roundMoney(item.amount_capped, roundingCents) : null,
      unit_value: item.unit_value != null ? roundMoney(item.unit_value, roundingCents) : null,
      delta_units_raw: item.delta_units_raw != null ? roundMoney(item.delta_units_raw, roundingCents) : null,
      delta_units_capped: item.delta_units_capped != null ? roundMoney(item.delta_units_capped, roundingCents) : null,
    });
  };

  // Time adjustment entry is always present
  const timeFactor =
    safeNumber((comp as any)?.market_time_adjustment?.factor) ??
    safeNumber((comp as any)?.market_time_adjustment_factor);
  const timeAppliedFlag = (comp as any)?.market_time_adjustment?.applied === true;
  const timeCanApply = timeAppliedFlag && base_price_raw != null && timeFactor != null;
  const timeDeltaUnits = timeCanApply ? timeFactor! - 1 : null;
  const timeAmount = timeCanApply && timeDeltaUnits != null ? base_price_raw! * timeDeltaUnits : null;
  const timeSkipReason = timeCanApply
    ? null
    : base_price_raw == null
    ? "missing_comp_price"
    : "missing_time_adjustment";

  addAdjustment({
    type: "time",
    subject_value: asOf ?? null,
    comp_value: base_price_raw,
    delta_units_raw: timeDeltaUnits,
    delta_units_capped: timeDeltaUnits,
    unit_value: base_price_raw,
    amount_raw: timeAmount,
    amount_capped: timeAmount,
    applied: !!timeCanApply,
    skip_reason: timeSkipReason,
    source: "policy",
    notes: timeCanApply
      ? `factor=${timeFactor}; delta=${timeDeltaUnits}; price=${base_price_raw}`
      : "time adjustment not applied",
  });

  // Sqft adjustment entry is always present
  const sqftUnitValue = time_adjusted_price != null && compSqft ? time_adjusted_price / compSqft : null;
  const sqftAmount = sqftCanApply && sqftUnitValue != null && sqftDeltaUnits != null ? sqftUnitValue * sqftDeltaUnits : null;
  const sqftSkipReason = !sqftHasValues
    ? "missing_sqft"
    : !sqftDeltaOk
    ? "sqft_delta_too_large"
    : time_adjusted_price == null
    ? "missing_time_adjusted_price"
    : null;

  addAdjustment({
    type: "sqft",
    subject_value: subjectSqft,
    comp_value: compSqft,
    delta_units_raw: sqftDeltaUnits,
    delta_units_capped: sqftDeltaUnits,
    unit_value: sqftUnitValue,
    amount_raw: sqftAmount,
    amount_capped: sqftAmount,
    applied: !!sqftCanApply,
    skip_reason: sqftSkipReason,
    source: "policy",
    notes: sqftCanApply
      ? `basis=ppsf_subject; delta_ratio=${sqftDeltaRatio}`
      : `basis=time_adjusted_price; reason=${sqftSkipReason}`,
  });

  const featureAdjustments: Array<{
    type: AdjustmentType;
    subjectVal: number | null;
    compVal: number | null;
    cap: number | null;
    unit: number | null;
    delta: number | null;
    missingKey: string;
  }> = [
    {
      type: "beds",
      subjectVal: safeNumber(subject?.beds),
      compVal: safeNumber((comp as any)?.beds),
      cap: caps.beds_delta_cap,
      unit: unitValues.beds,
      delta:
        safeNumber(subject?.beds) != null && safeNumber((comp as any)?.beds) != null
          ? safeNumber(subject?.beds)! - safeNumber((comp as any)?.beds)!
          : null,
      missingKey: "missing_beds",
    },
    {
      type: "baths",
      subjectVal: safeNumber(subject?.baths),
      compVal: safeNumber((comp as any)?.baths),
      cap: caps.baths_delta_cap,
      unit: unitValues.baths,
      delta:
        safeNumber(subject?.baths) != null && safeNumber((comp as any)?.baths) != null
          ? safeNumber(subject?.baths)! - safeNumber((comp as any)?.baths)!
          : null,
      missingKey: "missing_baths",
    },
    {
      type: "year_built",
      subjectVal: safeNumber(subject?.year_built),
      compVal: safeNumber((comp as any)?.year_built),
      cap: caps.year_delta_cap,
      unit: unitValues.year_built_per_year,
      delta:
        safeNumber(subject?.year_built) != null && safeNumber((comp as any)?.year_built) != null
          ? safeNumber(subject?.year_built)! - safeNumber((comp as any)?.year_built)!
          : null,
      missingKey: "missing_year_built",
    },
  ];

  const subjectLotSqft = safeNumber(subject?.lot_sqft);
  const compLotSqft = safeNumber((comp as any)?.lot_sqft ?? (comp as any)?.lot_size);
  const lotCapAbs =
    subjectLotSqft != null && caps.lot_delta_cap_ratio != null ? Math.abs(subjectLotSqft * caps.lot_delta_cap_ratio) : null;
  featureAdjustments.push({
    type: "lot",
    subjectVal: subjectLotSqft,
    compVal: compLotSqft,
    cap: lotCapAbs,
    unit: unitValues.lot_per_sqft,
    delta: subjectLotSqft != null && compLotSqft != null ? subjectLotSqft - compLotSqft : null,
    missingKey: subjectLotSqft == null ? "missing_subject_lot_sqft" : "missing_comp_lot_sqft",
  });

  const featureTypes = new Set<AdjustmentType>(["beds", "baths", "lot", "year_built"]);

  for (const adj of featureAdjustments) {
    if (!enabledTypes.includes(adj.type)) continue;
    const hasValues = adj.delta != null && adj.subjectVal != null && adj.compVal != null;
    const unitIsZero = adj.unit === 0;
    const cappedDelta = adj.cap != null && adj.delta != null ? Math.max(-adj.cap, Math.min(adj.cap, adj.delta)) : adj.delta;
    const applied = hasValues && !unitIsZero && adj.unit != null;
    const amountRaw = applied && adj.unit != null && adj.delta != null ? adj.unit * adj.delta : null;
    const amountCapped = applied && adj.unit != null && cappedDelta != null ? adj.unit * cappedDelta : amountRaw;
    addAdjustment({
      type: adj.type,
      subject_value: adj.subjectVal,
      comp_value: adj.compVal,
      delta_units_raw: adj.delta,
      delta_units_capped: cappedDelta,
      unit_value: adj.unit,
      amount_raw: amountRaw,
      amount_capped: amountCapped,
      applied: !!applied,
      skip_reason:
        applied || missingBehavior !== "skip"
          ? null
          : !hasValues
          ? adj.missingKey
          : unitIsZero
          ? "unit_value_zero"
          : "not_applied",
      source: "policy",
      notes: null,
    });
  }

  // Ensure deterministic ordering
  const typeOrder = new Map<AdjustmentType, number>();
  sortOrder.forEach((t, idx) => typeOrder.set(t, idx));
  adjustments.sort((a, b) => (typeOrder.get(a.type)! - typeOrder.get(b.type)!));

  const adjustmentsSum = adjustments
    .filter((a) => a.applied && featureTypes.has(a.type))
    .reduce((acc, cur) => acc + (cur.amount_capped ?? 0), 0);

  const adjusted_value =
    value_basis_before_adjustments != null ? roundMoney(value_basis_before_adjustments + adjustmentsSum, roundingCents) : null;

  return {
    base_price_raw: roundMoney(base_price_raw, roundingCents),
    time_adjusted_price: roundMoney(time_adjusted_price, roundingCents),
    value_basis_before_adjustments,
    value_basis_method,
    adjustments,
    adjusted_value,
  };
}
