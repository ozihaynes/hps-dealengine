/**
 * Deal Verdict Schema — V2.5 Wholesaler Dashboard
 *
 * Derives PURSUE / NEEDS_EVIDENCE / PASS recommendation from
 * workflow state, risk gates, spread, and confidence.
 *
 * Note: Named "DealVerdict" to avoid conflict with snapshot.ts Verdict enum.
 *
 * Trace Frame: VERDICT_DERIVATION
 */
import { z } from "zod";

/** Deal verdict recommendation values */
export const DealVerdictRecommendationSchema = z.enum([
  "pursue",
  "needs_evidence",
  "pass",
]);

/** Complete deal verdict output for decision-making */
export const DealVerdictSchema = z
  .object({
    /** Final recommendation: pursue (go), needs_evidence (wait), pass (no-go) */
    recommendation: DealVerdictRecommendationSchema,

    /** Human-readable rationale for the recommendation */
    rationale: z.string(),

    /** List of factors blocking pursue status */
    blocking_factors: z.array(z.string()),

    /** Confidence in recommendation as percentage 0-100 */
    confidence_pct: z.number().min(0).max(100),

    /** Primary reason code for recommendation */
    primary_reason_code: z.string().nullable().optional(),

    /** Whether deal meets minimum spread requirements */
    spread_adequate: z.boolean().nullable().optional(),

    /** Whether all critical evidence is present */
    evidence_complete: z.boolean().nullable().optional(),

    /** Whether risk gates allow progression */
    risk_acceptable: z.boolean().nullable().optional(),
  })
  .strict();

export type DealVerdictRecommendation = z.infer<typeof DealVerdictRecommendationSchema>;
export type DealVerdict = z.infer<typeof DealVerdictSchema>;
