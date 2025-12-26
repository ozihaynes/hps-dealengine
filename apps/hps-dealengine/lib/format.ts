const INVALID_CURRENCY = 'ƒ?"';

const toNumber = (value: unknown): number => {
  if (value === null || value === undefined || value === "") return NaN;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : NaN;
};

const formatUsd = (value: number, maxFractionDigits: number, compact: boolean): string => {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: maxFractionDigits,
    notation: compact ? "compact" : "standard",
  }).format(value);
};

export const fmt$ = (value: unknown, max = 0): string => {
  const n = toNumber(value);
  if (!Number.isFinite(n)) return INVALID_CURRENCY;
  return formatUsd(n, max, false);
};

export const fmtCompact$ = (value: unknown, max = 0): string => {
  const n = toNumber(value);
  if (!Number.isFinite(n)) return INVALID_CURRENCY;
  return formatUsd(n, max, true);
};
