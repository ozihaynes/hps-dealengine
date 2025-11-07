export function aivSafetyCap(aiv, capPct) {
  const a = typeof aiv === 'number' && Number.isFinite(aiv) ? aiv : null;
  const p = typeof capPct === 'number' && Number.isFinite(capPct) ? capPct : null;
  if (a === null || p === null) return null;
  return a * p;
}
