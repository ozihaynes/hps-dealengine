import { computeUnderwriting } from './compute_underwriting';
import type { UnderwriteContext, UnderwriteResult, DecisionTrace, InfoNeeded } from './types';

function collectNullPaths(obj: any, base = ''): string[] {
  const paths: string[] = [];
  if (obj && typeof obj === 'object') {
    for (const [k, v] of Object.entries(obj)) {
      const p = base ? `${base}.${k}` : k;
      if (v === null || v === undefined) {
        paths.push(p);
      } else if (typeof v === 'object') {
        paths.push(...collectNullPaths(v as any, p));
      }
    }
  }
  return paths;
}

export function computeUnderwritingWithTrace(
  deal: any,
  policy: any,
  ctx: UnderwriteContext = {}
): UnderwriteResult {
  const trace: DecisionTrace = [];
  const missing = collectNullPaths(policy);
  const infoNeeded: InfoNeeded[] = missing.map((path) => ({ kind: 'INFO_NEEDED', path }));

  const base = computeUnderwriting(deal, policy as any) as UnderwriteResult;

  if (ctx.provenance) {
    trace.push({
      rule: 'POLICY_COMPLETENESS_CHECK',
      used: { missing },
      note: 'Null/undefined policy keys should be set in Sandbox.',
    });
    trace.push({
      rule: 'ENGINE_RUN',
      used: { asOfDate: ctx.asOfDate ?? null },
      note: 'Wrapped existing computeUnderwriting to attach trace and infoNeeded.',
    });
  }

  return {
    ...base,
    trace: ctx.provenance ? [...(base.trace ?? []), ...trace] : base.trace,
    infoNeeded: [...(base.infoNeeded ?? []), ...infoNeeded],
  };
}
