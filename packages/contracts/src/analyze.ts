import { z } from "zod";

/** Minimal inputs for current engine slices; extend as engine grows */
export const AnalyzeInputSchema = z.object({
  arv: z.number().nullable().optional(),
  aiv: z.number().nullable().optional(),
  dom_zip_days: z.number().nullable().optional(),
  moi_zip_months: z.number().nullable().optional(),
  price_to_list_pct: z.number().nullable().optional(),
  local_discount_pct: z.number().nullable().optional(),
  options: z.object({ trace: z.boolean().default(true) }).default({ trace: true }),
}).strict();

export type AnalyzeInput = z.infer<typeof AnalyzeInputSchema>;

/** Output surface matching UI cards */
export const AnalyzeResultSchema = z.object({
  outputs: z.object({
    arv: z.number().nullable(),
    aiv: z.number().nullable(),
    buyer_ceiling: z.number().nullable(),
    respect_floor: z.number().nullable(),
    wholesale_fee: z.number().nullable(),
    wholesale_fee_dc: z.number().nullable(),
    market_temp_score: z.number().nullable(),
    window_floor_to_offer: z.number().nullable(),
    headroom_offer_to_ceiling: z.number().nullable(),
    cushion_vs_payoff: z.number().nullable(),
    seller_script_cash: z.string().nullable(),
  }).strict(),
  infoNeeded: z.array(z.string()).default([]),
  trace: z.any(),
}).strict();

export type AnalyzeResult = z.infer<typeof AnalyzeResultSchema>;
