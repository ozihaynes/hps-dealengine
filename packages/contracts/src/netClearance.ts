/**
 * Net Clearance Schema — V2.5 Wholesaler Dashboard
 *
 * Calculates "what clears to me" per exit strategy:
 * Assignment, Double Close, Wholetail.
 *
 * Trace Frame: NET_CLEARANCE
 */
import { z } from "zod";

/** Exit strategy types for disposition */
export const ExitStrategyTypeSchema = z.enum([
  "assignment",
  "double_close",
  "wholetail",
]);

/** Profit breakdown for a single exit strategy */
export const ClearanceBreakdownSchema = z
  .object({
    /** Gross profit before costs */
    gross: z.number(),

    /** Total costs for this exit strategy */
    costs: z.number(),

    /** Net profit after costs */
    net: z.number(),

    /** Net as percentage of gross */
    margin_pct: z.number(),

    /** Cost breakdown by category */
    cost_breakdown: z
      .object({
        title_fees: z.number().nullable().optional(),
        closing_costs: z.number().nullable().optional(),
        transfer_tax: z.number().nullable().optional(),
        carry_costs: z.number().nullable().optional(),
        other: z.number().nullable().optional(),
      })
      .strict()
      .nullable()
      .optional(),
  })
  .strict();

/** Complete net clearance analysis across exit strategies */
export const NetClearanceSchema = z
  .object({
    /** Assignment exit (simple wholesale) */
    assignment: ClearanceBreakdownSchema,

    /** Double close exit (buy then resell) */
    double_close: ClearanceBreakdownSchema,

    /** Wholetail exit (light rehab + retail) — nullable if not applicable */
    wholetail: ClearanceBreakdownSchema.nullable(),

    /** Engine-recommended exit strategy */
    recommended_exit: ExitStrategyTypeSchema,

    /** Rationale for recommendation */
    recommendation_reason: z.string(),

    /** Whether wholetail is viable for this deal */
    wholetail_viable: z.boolean().nullable().optional(),

    /** Minimum spread threshold used */
    min_spread_threshold: z.number().nullable().optional(),
  })
  .strict();

export type ExitStrategyType = z.infer<typeof ExitStrategyTypeSchema>;
export type ClearanceBreakdown = z.infer<typeof ClearanceBreakdownSchema>;
export type NetClearance = z.infer<typeof NetClearanceSchema>;
