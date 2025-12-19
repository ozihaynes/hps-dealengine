const safeNumber = (value: unknown): number | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" && value.trim() === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
};

export type PeriodParts = { year: number; quarter: number };

export const periodFromDate = (date: string | Date): string | null => {
  const d = typeof date === "string" ? new Date(date) : date;
  if (!d || Number.isNaN(d.getTime())) return null;
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth();
  const quarter = Math.floor(month / 3) + 1;
  return `${year}Q${quarter}`;
};

export const parsePeriodString = (period: string | null | undefined): PeriodParts | null => {
  if (!period || typeof period !== "string") return null;
  const match = period.match(/^(\d{4})Q([1-4])$/);
  if (!match) return null;
  return { year: Number(match[1]), quarter: Number(match[2]) };
};

export const comparePeriods = (a: string, b: string): number => {
  const pa = parsePeriodString(a);
  const pb = parsePeriodString(b);
  if (pa && pb) {
    if (pa.year !== pb.year) return pa.year - pb.year;
    return pa.quarter - pb.quarter;
  }
  return a.localeCompare(b);
};

export const sortPeriods = (periods: Iterable<string>): string[] =>
  Array.from(periods).filter(Boolean).sort(comparePeriods);

export const selectEffectiveAsOfPeriod = (
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

export const computeMarketTimeFactor = (
  effectiveAsOfValue: unknown,
  saleValue: unknown,
): number | null => {
  const asOf = safeNumber(effectiveAsOfValue);
  const sale = safeNumber(saleValue);
  if (asOf == null || sale == null || sale === 0) return null;
  return asOf / sale;
};
