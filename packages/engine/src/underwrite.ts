export interface UnderwriteInput {
  deal: Record<string, unknown>;
  policy?: Record<string, unknown>;
}

export interface UnderwriteResult {
  ok: boolean;
  math: Record<string, unknown>;
  echoes: {
    input: Record<string, unknown>;
    raw: { deal: Record<string, unknown>; policy: Record<string, unknown> };
  };
}

function normalizeDeal(deal: Record<string, unknown>): Record<string, unknown> {
  // Minimal normalization that matches your endpoint’s current behavior:
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(deal || {})) {
    if (typeof v === 'string') {
      const s = v.trim();
      if (/^\d{1,3}(,\d{3})*(\.\d+)?$/.test(s) || /^\d+(\.\d+)?$/.test(s)) {
        out[k] = Number(s.replace(/,/g, ''));
      } else if (/^(true|false)$/i.test(s)) {
        out[k] = /^true$/i.test(s);
      } else {
        out[k] = s;
      }
    } else {
      out[k] = v as unknown;
    }
  }
  return out;
}

export function computeUnderwrite(input: UnderwriteInput): UnderwriteResult {
  const dealNorm = normalizeDeal((input?.deal as Record<string, unknown>) || {});
  return {
    ok: true,
    math: {},
    echoes: {
      input: dealNorm,
      raw: { deal: dealNorm, policy: (input?.policy as Record<string, unknown>) || {} },
    },
  };
}
