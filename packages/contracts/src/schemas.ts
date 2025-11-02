import { z } from 'zod';

/** Strict token placeholder like <AIV_CAP_PCT> — never concrete numbers here. */
export const TokenString = z.string().regex(/^<[^<>]+>$/, 'Use token form like <AIV_CAP_PCT>');

/** Minimal, forward-compatible Deal contract:
 *  - org_id ties to RLS scoping downstream.
 *  - deal_id stable across runs.
 *  - address typed; inputs is an extensible bag aligned to SOT.
 */
export const DealContract = z.object({
  org_id: z.string().min(1),
  deal_id: z.string().min(1),
  address: z.object({
    line1: z.string().min(1),
    city: z.string().min(1),
    state: z.string().min(2).max(2),
    postal_code: z.string().min(3),
  }),
  /** Flexible payload; engine will read specific fields per SOT.
   *  Keep it open here to avoid accidental “policy invention”.
   */
  inputs: z.record(z.string(), z.unknown()),
});

/** Policy posture maps to your SOT postures */
export const PolicyPosture = z.enum(['conservative', 'base', 'aggressive']);

/** Tokens registry — include known keys + allow others as you expand */
export const PolicyTokens = z
  .object({
    AIV_CAP_PCT: TokenString.optional(),
    AIV_SOFT_MAX_AGE_DAYS: TokenString.optional(),
    DOM_TO_MONTHS_RULE: TokenString.optional(),
    CARRY_MONTHS_CAP: TokenString.optional(),
    LIST_COMM_PCT: TokenString.optional(),
    CONCESSIONS_PCT: TokenString.optional(),
    SELL_CLOSE_PCT: TokenString.optional(),
  })
  .catchall(TokenString);

/** Versioned Policy object */
export const Policy = z.object({
  posture: PolicyPosture,
  tokens: PolicyTokens,
  metadata: z
    .object({
      version_label: z.string().min(1).optional(),
      notes: z.string().optional(),
    })
    .partial(),
});

/** Trace entries emitted by the engine for auditability */
export const TraceItem = z.object({
  id: z.string(),
  stage: z.string().optional(),
  message: z.string(),
  /** tokens or trace refs that justify the numeric results */
  refs: z.array(z.string()).optional(),
  tokens: z.array(TokenString).optional(),
});

/** Engine output envelope */
export const RunOutput = z.object({
  deal_id: z.string(),
  policy_version_id: z.string().optional(),
  outputs: z.record(z.string(), z.unknown()),
  infoNeeded: z.array(z.string()).default([]),
  trace: z.array(TraceItem),
  hashes: z.object({
    inputs: z.string(),
    policy: z.string(),
    outputs: z.string(),
  }),
});

/** Standard error envelope for functions */
export const ApiError = z.object({
  ok: z.literal(false).optional(),
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
  infoNeeded: z.array(z.string()).optional(),
});

export type TDealContract = z.infer<typeof DealContract>;
export type TPolicy = z.infer<typeof Policy>;
export type TRunOutput = z.infer<typeof RunOutput>;
export type TTraceItem = z.infer<typeof TraceItem>;
export type TApiError = z.infer<typeof ApiError>;
