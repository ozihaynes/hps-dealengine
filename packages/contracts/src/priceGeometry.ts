/**
 * Price Geometry Schema — V2.5 Wholesaler Dashboard
 *
 * Computes ZOPA (Zone of Possible Agreement), entry point,
 * and dominant floor for negotiation leverage visualization.
 *
 * Trace Frame: PRICE_GEOMETRY
 */
import { z } from "zod";

/** Which floor constraint is binding */
export const DominantFloorTypeSchema = z.enum([
  "investor",
  "payoff",
  "operational",
]);

/** Complete price geometry analysis for negotiation visualization */
export const PriceGeometrySchema = z
  .object({
    /** Hard lower bound: max(investor_floor, payoff_floor) */
    respect_floor: z.number(),

    /** Which floor is dominant/binding */
    dominant_floor: DominantFloorTypeSchema,

    /** Investor floor component (AIV * discount) */
    floor_investor: z.number().nullable().optional(),

    /** Payoff floor component (payoff + essentials) */
    floor_payoff: z.number().nullable().optional(),

    /** Maximum buyer can pay given margin/costs/carry */
    buyer_ceiling: z.number(),

    /** Seller's asking price (if known) */
    seller_strike: z.number().nullable(),

    /** Zone of Possible Agreement in dollars (ceiling - floor) */
    zopa: z.number().nullable(),

    /** ZOPA as percentage of ARV */
    zopa_pct_of_arv: z.number().nullable(),

    /** Whether viable negotiation room exists (zopa > 0) */
    zopa_exists: z.boolean(),

    /** Width classification of ZOPA */
    zopa_band: z.enum(["wide", "moderate", "narrow", "none"]).nullable().optional(),

    /** Posture-adjusted entry point within ZOPA */
    entry_point: z.number(),

    /** Entry point position within ZOPA as percentage (0 = floor, 100 = ceiling) */
    entry_point_pct_of_zopa: z.number(),

    /** Posture used for entry point calculation */
    entry_posture: z.enum(["aggressive", "balanced", "conservative"]).nullable().optional(),
  })
  .strict();

export type DominantFloorType = z.infer<typeof DominantFloorTypeSchema>;
export type PriceGeometry = z.infer<typeof PriceGeometrySchema>;
