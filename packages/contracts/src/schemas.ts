import { z } from "zod";

/** -------- Core API Shapes (Zod) -------- */

export const InfoNeededItemSchema = z.object({
  path: z.string(),
  token: z.string().nullable().optional(),
  reason: z.string(),
  source_of_truth: z.enum(["investor_set", "team_policy_set", "external_feed"]).optional(),
});
export type InfoNeededItem = z.infer<typeof InfoNeededItemSchema>;

export const TraceItemSchema = z.object({
  rule: z.string(),
  used: z.array(z.string()).optional(),
  details: z.unknown().optional(),
});
export type TraceItem = z.infer<typeof TraceItemSchema>;

/** DealContract — minimal, forward-compatible (accepts additional fields) */
export const DealContractSchema = z.object({
  address: z.string().optional(),
  market: z.object({
    aiv: z.number().nullable().optional(),
    arv: z.number().nullable().optional(),
    dom_zip: z.number().nullable().optional(),
  }).partial().optional(),
}).passthrough();
export type DealContract = z.infer<typeof DealContractSchema>;

/** RunOutput — matches your /api/analyze shape today */
export const RunOutputSchema = z.object({
  ok: z.boolean(),
  infoNeeded: z.array(InfoNeededItemSchema).default([]),
  trace: z.array(TraceItemSchema).default([]),
  outputs: z.object({
    caps: z.object({
      aivCapApplied: z.boolean().optional(),
      aivCapValue: z.number().nullable().optional(),
    }).optional(),
    carry: z.object({
      monthsRule: z.string().nullable().optional(),
      monthsCap: z.number().nullable().optional(),
      rawMonths: z.number().nullable().optional(),
      carryMonths: z.number().nullable().optional(),
    }).optional(),
    fees: z.object({
      rates: z.object({
        list_commission_pct: z.number().optional(),
        concessions_pct: z.number().optional(),
        sell_close_pct: z.number().optional(),
      }).optional(),
      preview: z.object({
        base_price: z.number().optional(),
        list_commission_amount: z.number().optional(),
        concessions_amount: z.number().optional(),
        sell_close_amount: z.number().optional(),
        total_seller_side_costs: z.number().optional(),
      }).optional(),
    }).optional(),
    summaryNotes: z.array(z.string()).optional(),
  }).optional(),
});
export type RunOutput = z.infer<typeof RunOutputSchema>;

export const ApiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;
