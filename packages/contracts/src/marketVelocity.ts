/**
 * Market Velocity Schema — V2.5 Wholesaler Dashboard
 *
 * Local market speed indicators: DOM, MOI, Absorption, SP-LP.
 * Drives carry assumptions and urgency signals.
 *
 * Trace Frame: MARKET_VELOCITY
 */
import { z } from "zod";

/** Market velocity classification bands */
export const VelocityBandSchema = z.enum([
  "hot", // DOM <=14, MOI <=2
  "warm", // DOM <=30, MOI <=4
  "balanced", // DOM <=60, MOI <=6
  "cool", // DOM <=90, MOI <=9
  "cold", // DOM >90 or MOI >9
]);

/** Complete market velocity metrics */
export const MarketVelocitySchema = z
  .object({
    /** Days on Market for ZIP */
    dom_zip_days: z.number().min(0),

    /** Months of Inventory for ZIP */
    moi_zip_months: z.number().min(0),

    /** Absorption rate (sales per month) — nullable if unavailable */
    absorption_rate: z.number().nullable(),

    /** Sale-to-list price ratio as percentage — nullable if unavailable */
    sale_to_list_pct: z.number().nullable(),

    /** Derived velocity band for display */
    velocity_band: VelocityBandSchema,

    /** Liquidity score 0-100 (higher = more liquid market) */
    liquidity_score: z.number().min(0).max(100),

    /** Cash buyer share in ZIP as percentage — nullable if unavailable */
    cash_buyer_share_pct: z.number().nullable(),

    /** Data freshness - days since market data was updated */
    data_age_days: z.number().nullable().optional(),

    /** Source of market velocity data */
    data_source: z.string().nullable().optional(),

    /** Year-over-year price change percentage */
    yoy_price_change_pct: z.number().nullable().optional(),

    /** Active listing count in ZIP */
    active_listings: z.number().int().nullable().optional(),
  })
  .strict();

export type VelocityBand = z.infer<typeof VelocityBandSchema>;
export type MarketVelocity = z.infer<typeof MarketVelocitySchema>;
