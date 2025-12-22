import { createSupabaseClient } from "./valuation.ts";

type SupabaseClient = ReturnType<typeof createSupabaseClient>;

export type MarketTimeAdjustmentConfig = {
  enabled?: boolean | null;
  min_days_old?: number | null;
};

const safeNumber = (value: unknown): number | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" && value.trim() === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
};

const dateToPeriod = (date: string | Date): string | null => {
  const d = typeof date === "string" ? new Date(date) : date;
  if (!d || Number.isNaN(d.getTime())) return null;
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth(); // 0-based
  const quarter = Math.floor(month / 3) + 1;
  return `${year}Q${quarter}`;
};

type PeriodParts = { year: number; quarter: number };

const parsePeriodString = (period: string | null | undefined): PeriodParts | null => {
  if (!period || typeof period !== "string") return null;
  const match = period.match(/^(\d{4})Q([1-4])$/);
  if (!match) return null;
  return { year: Number(match[1]), quarter: Number(match[2]) };
};

const comparePeriods = (a: string, b: string): number => {
  const pa = parsePeriodString(a);
  const pb = parsePeriodString(b);
  if (pa && pb) {
    if (pa.year !== pb.year) return pa.year - pb.year;
    return pa.quarter - pb.quarter;
  }
  return a.localeCompare(b);
};

const selectEffectiveAsOfPeriod = (
  requested: string | null,
  indexMap: Map<string, number>,
): { effectivePeriod: string | null; effectiveValue: number | null } => {
  const periods = Array.from(indexMap.keys()).filter(Boolean).sort(comparePeriods);
  if (periods.length === 0) return { effectivePeriod: null, effectiveValue: null };

  let effectivePeriod: string | null = null;
  if (requested) {
    const notAfterRequested = periods.filter((p) => comparePeriods(p, requested) <= 0);
    if (notAfterRequested.length > 0) {
      effectivePeriod = notAfterRequested[notAfterRequested.length - 1];
    }
  }

  if (!effectivePeriod) {
    effectivePeriod = periods[periods.length - 1];
  }

  return { effectivePeriod, effectiveValue: indexMap.get(effectivePeriod) ?? null };
};

const sortPeriods = (periods: Iterable<string>): string[] => Array.from(periods).filter(Boolean).sort(comparePeriods);
const MS_PER_DAY = 1000 * 60 * 60 * 24;

const parseFredCsv = (csv: string): Record<string, number> => {
  const lines = csv.trim().split(/\r?\n/);
  const map: Record<string, number> = {};
  for (let i = 1; i < lines.length; i++) {
    const [dateStr, valueStr] = lines[i].split(",");
    if (!dateStr || !valueStr) continue;
    const val = safeNumber(valueStr);
    if (val == null) continue;
    const period = dateToPeriod(dateStr);
    if (period) {
      map[period] = val;
    }
  }
  return map;
};

const fetchFredSeries = async (seriesId: string): Promise<Record<string, number>> => {
  const url = `https://fred.stlouisfed.org/graph/fredgraph.csv?id=${encodeURIComponent(seriesId)}`;
  const res = await fetch(url, { headers: { Accept: "text/csv" } });
  if (!res.ok) {
    throw new Error(`fred_fetch_failed_${res.status}`);
  }
  const text = await res.text();
  return parseFredCsv(text);
};

export const stateGeoKey = (state: string | null | undefined): { geoKey: string | null; seriesId: string | null } => {
  const code = state?.trim().toUpperCase();
  if (!code || code.length !== 2) return { geoKey: null, seriesId: null };
  return {
    geoKey: `state:${code}`,
    seriesId: `${code}STHPI`,
  };
};

type CacheKey = string;

const resolveCompKey = (comp: any): string => {
  const id = comp?.id?.toString?.().trim?.();
  if (id) return id;
  const address = comp?.address ?? comp?.formattedAddress ?? "";
  const closeDate = comp?.close_date ?? comp?.list_date ?? comp?.listedDate ?? "";
  const price = safeNumber(comp?.price) ?? "";
  const key = [address, closeDate, price].join("|");
  return key || "unknown-comp";
};

export async function fetchMarketIndexValues(opts: {
  supabase: SupabaseClient;
  orgId: string;
  geoKey: string;
  seriesId: string;
  periods: string[];
  source?: string;
  provider?: string;
  cache?: Map<CacheKey, Map<string, number>>;
}): Promise<Map<string, number>> {
  const source = opts.source ?? "fhfa";
  const provider = opts.provider ?? "fred";
  const periods = Array.from(new Set(opts.periods.filter(Boolean)));
  const cacheKey = `${opts.orgId}|${source}|${provider}|${opts.geoKey}|${opts.seriesId}`;

  const cacheMap = opts.cache ?? new Map<CacheKey, Map<string, number>>();
  const baseMap = cacheMap.get(cacheKey) ?? new Map<string, number>();

  const missingFromCache = periods.filter((p) => !baseMap.has(p));

  if (missingFromCache.length > 0) {
    const { data, error } = await opts.supabase
      .from("market_price_index")
      .select("period,index_value")
      .eq("org_id", opts.orgId)
      .eq("source", source)
      .eq("provider", provider)
      .eq("series_id", opts.seriesId)
      .eq("geo_key", opts.geoKey)
      .in("period", missingFromCache);

    if (!error && data) {
      for (const row of data) {
        if (row.period && row.index_value != null) {
          baseMap.set(row.period, Number(row.index_value));
        }
      }
    }

    const stillMissing = periods.filter((p) => !baseMap.has(p));
    if (stillMissing.length > 0) {
      let series: Record<string, number> = {};
      try {
        series = await fetchFredSeries(opts.seriesId);
      } catch (err) {
        console.warn("[market_index] FRED fetch failed", err);
      }
      const rowsToInsert: any[] = [];
      for (const p of stillMissing) {
        const val = series[p];
        if (val != null) {
          baseMap.set(p, val);
          rowsToInsert.push({
            org_id: opts.orgId,
            source,
            provider,
            series_id: opts.seriesId,
            geo_key: opts.geoKey,
            period: p,
            index_value: val,
            raw: {},
          });
        }
      }
      if (rowsToInsert.length > 0) {
        await opts.supabase
          .from("market_price_index")
          .upsert(rowsToInsert, { onConflict: "org_id,source,provider,series_id,geo_key,period", ignoreDuplicates: true });
      }
    }
  }

  cacheMap.set(cacheKey, baseMap);
  const filtered = new Map<string, number>();
  for (const p of periods) {
    const v = baseMap.get(p);
    if (v != null) {
      filtered.set(p, v);
    }
  }
  return filtered;
}

export async function applyMarketTimeAdjustment<T extends { price?: number | null; ppsf?: number | null; sqft?: number | null; close_date?: string | null }>(opts: {
  supabase: SupabaseClient;
  orgId: string;
  dealState: string | null;
  comps: T[];
  asOf: string;
  policy: MarketTimeAdjustmentConfig | null | undefined;
  cache?: Map<CacheKey, Map<string, number>>;
}): Promise<{
  comps: Array<
    T & {
      price_adjusted?: number | null;
      ppsf_adjusted?: number | null;
      market_time_adjustment?: Record<string, any>;
    }
  >;
  summary: Record<string, any>;
  warning_codes: string[];
}> {
  const policy = opts.policy ?? {};
  const enabled = !!policy.enabled;
  const minDays = Number.isFinite(Number(policy.min_days_old)) ? Number(policy.min_days_old) : 180;

  const warning_codes: string[] = [];
  const summary: Record<string, any> = {
    enabled,
    min_days_old: minDays,
    comps_candidate_count: opts.comps.length,
    comps_missing_close_date_count: 0,
    comps_missing_price_count: 0,
    comps_below_min_days_count: 0,
    comps_adjusted_count: 0,
    comps_missing_index_count: 0,
    geo_key: null,
    series_id: null,
    provider: "fred",
    source: "fhfa",
    index_values: {},
    close_periods_seen: [],
    as_of_period: null,
    requested_as_of_value: null,
    requested_as_of_period: null,
    effective_as_of_period: null,
    effective_as_of_value: null,
    periods_used: [],
  };

  if (!enabled) {
    return { comps: opts.comps, summary, warning_codes };
  }

  const { geoKey, seriesId } = stateGeoKey(opts.dealState);
  if (!geoKey || !seriesId) {
    warning_codes.push("missing_market_hpi");
    return { comps: opts.comps, summary, warning_codes };
  }
  summary.geo_key = geoKey;
  summary.series_id = seriesId;

  const requestedAsOfPeriod = dateToPeriod(opts.asOf);
  summary.as_of_period = requestedAsOfPeriod;
  summary.requested_as_of_period = requestedAsOfPeriod;

  const periodsNeeded = new Set<string>();
  if (requestedAsOfPeriod) periodsNeeded.add(requestedAsOfPeriod);

  const closePeriodsSeen = new Set<string>();
  const candidates: Array<{
    comp: T;
    price: number;
    sqft: number | null;
    closePeriod: string | null;
    daysOld: number;
  }> = [];
  const asOfTime = Date.parse(opts.asOf);

  for (const comp of opts.comps) {
    const price = safeNumber((comp as any).price);
    const priceMissing = price == null;
    const closeDate = (comp as any)?.close_date as string | null;
    const closePeriod = closeDate ? dateToPeriod(closeDate) : null;
    if (closePeriod) {
      closePeriodsSeen.add(closePeriod);
    }

    const parsedCloseDate = closeDate ? Date.parse(closeDate) : NaN;
    if (!closeDate || !Number.isFinite(parsedCloseDate)) {
      summary.comps_missing_close_date_count += 1;
      if (priceMissing) {
        summary.comps_missing_price_count += 1;
      }
      continue;
    }
    if (priceMissing) {
      summary.comps_missing_price_count += 1;
      continue;
    }

    if (!Number.isFinite(asOfTime)) {
      continue;
    }
    const daysOld = Math.max(0, Math.round((asOfTime - parsedCloseDate) / MS_PER_DAY));
    if (daysOld < minDays) {
      summary.comps_below_min_days_count += 1;
      continue;
    }

    if (closePeriod) {
      periodsNeeded.add(closePeriod);
    }

    candidates.push({
      comp,
      price,
      sqft: safeNumber((comp as any).sqft),
      closePeriod,
      daysOld,
    });
  }

  const indexMap =
    periodsNeeded.size > 0
      ? await fetchMarketIndexValues({
          supabase: opts.supabase,
          orgId: opts.orgId,
          geoKey,
          seriesId,
          periods: Array.from(periodsNeeded),
      cache: opts.cache,
      source: "fhfa",
      provider: "fred",
    })
      : new Map<string, number>();

  const requestedAsOfValue = requestedAsOfPeriod ? indexMap.get(requestedAsOfPeriod) ?? null : null;
  const { effectivePeriod, effectiveValue } = selectEffectiveAsOfPeriod(requestedAsOfPeriod, indexMap);

  const periodsUsed = sortPeriods(indexMap.keys());
  summary.close_periods_seen = sortPeriods(closePeriodsSeen);
  summary.periods_used = periodsUsed;
  summary.effective_as_of_period = effectivePeriod;
  summary.effective_as_of_value = effectiveValue;
  summary.requested_as_of_value = requestedAsOfValue;
  summary.index_values = {
    as_of_period: requestedAsOfPeriod,
    as_of_value: requestedAsOfValue,
    requested_as_of_period: requestedAsOfPeriod,
    requested_as_of_value: requestedAsOfValue,
    effective_as_of_period: effectivePeriod,
    effective_as_of_value: effectiveValue,
    periods: Object.fromEntries(
      Array.from(indexMap.entries()).sort((a, b) => comparePeriods(a[0], b[0])),
    ),
  };

  if (effectiveValue == null && candidates.length > 0) {
    if (!warning_codes.includes("missing_market_hpi_as_of_value")) {
      warning_codes.push("missing_market_hpi_as_of_value");
    }
  }

  const adjustedEntries = candidates.map((candidate) => {
    const compKey = resolveCompKey(candidate.comp);
    const saleValue = candidate.closePeriod ? indexMap.get(candidate.closePeriod) ?? null : null;
    const factor = saleValue != null && effectiveValue != null && saleValue !== 0 ? effectiveValue / saleValue : null;
    const adjustedPrice = factor != null ? candidate.price * factor : null;
    const adjustedPpsf = factor != null && candidate.sqft ? (adjustedPrice as number) / candidate.sqft : null;
    const applied = factor != null;

    const missingIndex = !applied && (effectiveValue == null || saleValue == null);
    if (applied) {
      summary.comps_adjusted_count += 1;
    } else if (missingIndex) {
      summary.comps_missing_index_count += 1;
      if (!warning_codes.includes("missing_market_hpi")) {
        warning_codes.push("missing_market_hpi");
      }
    }

    return {
      key: compKey,
      ...candidate.comp,
      price_adjusted: applied ? adjustedPrice : (candidate.comp as any).price_adjusted ?? null,
      ppsf_adjusted: applied ? adjustedPpsf : (candidate.comp as any).ppsf_adjusted ?? null,
      market_time_adjustment: {
        applied,
        series_id: seriesId,
        geo_key: geoKey,
        provider: "fred",
        source: "fhfa",
        close_period: candidate.closePeriod,
        sale_period: candidate.closePeriod,
        sale_value: saleValue,
        as_of_period: effectivePeriod,
        as_of_value: effectiveValue,
        hpi_close: saleValue,
        hpi_asof: effectiveValue,
        factor,
        adjusted_price: applied ? adjustedPrice : null,
        reason: applied
          ? null
          : effectiveValue == null
          ? "missing_as_of_value"
          : saleValue == null
          ? "missing_sale_index"
          : "insufficient_data",
      },
    };
  });

  const adjustedByKey = new Map<string, any>();
  for (const entry of adjustedEntries) {
    adjustedByKey.set(entry.key, entry);
  }
  const merged = opts.comps.map((comp) => {
    const key = resolveCompKey(comp);
    const found = adjustedByKey.get(key);
    if (found) {
      const { key: _k, ...rest } = found;
      return rest;
    }
    return comp;
  });

  warning_codes.sort();

  return { comps: merged, summary, warning_codes };
}

export const periodFromDate = dateToPeriod;
export const __test = { dateToPeriod, parseFredCsv };
