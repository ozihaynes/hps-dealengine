export const fmt$ = (n: any, max = 0): string =>
  isFinite(n)
    ? Number(n).toLocaleString(undefined, {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: max,
      })
    : '—';

export const num = (v: any, fallback = 0): number => {
  const x = parseFloat(String(v).replace(/[^0-9.-]+/g, ''));
  return isFinite(x) ? x : fallback;
};

export const clamp = (n: number, lo: number, hi: number): number => Math.min(Math.max(n, lo), hi);

export const roundHeadline = (n: any): number => (isFinite(n) ? Math.round(n / 100) * 100 : 0);

export const getDealHealth = (
  spread: number,
  minSpread: number
): { label: string; color: 'green' | 'blue' | 'orange' | 'red' } => {
  if (!isFinite(spread)) return { label: 'Enter Data', color: 'blue' };
  if (spread >= minSpread) return { label: 'Healthy Spread', color: 'green' };
  if (spread >= 0) return { label: 'Below Minimum', color: 'orange' };
  return { label: 'Shortfall / Negative', color: 'red' };
};
