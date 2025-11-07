export function aivSafetyCap(
  aiv: number | null | undefined,
  capPct: number | null | undefined
): number | null {
  const a = typeof aiv === 'number' && Number.isFinite(aiv) ? aiv : null;
  const p = typeof capPct === 'number' && Number.isFinite(capPct) ? capPct : null;
  if (a === null || p === null) return null;
  return a * p;
}
