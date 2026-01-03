/**
 * Comps Evidence Pack Schema — V2.5 Wholesaler Dashboard
 *
 * Detailed comparable sales data for display in CompsEvidencePack
 * component including adjustments and photos.
 *
 * Trace Frame: COMPS_EVIDENCE
 */
import { z } from "zod";

/** Individual price adjustment applied to a comp */
export const CompAdjustmentSchema = z
  .object({
    /** Adjustment factor name (e.g., "sqft", "condition", "age") */
    factor: z.string(),

    /** Adjustment amount in dollars (positive or negative) */
    amount: z.number(),

    /** Adjustment reason/description */
    description: z.string().nullable().optional(),
  })
  .strict();

/** Single comparable sale record */
export const CompRecordSchema = z
  .object({
    /** Full address of comparable */
    address: z.string(),

    /** Sale price */
    sale_price: z.number(),

    /** Sale date ISO string */
    sale_date: z.string(),

    /** Square footage */
    sqft: z.number(),

    /** Bedrooms */
    beds: z.number().int().nullable().optional(),

    /** Bathrooms */
    baths: z.number().nullable().optional(),

    /** Year built */
    year_built: z.number().int().nullable().optional(),

    /** Lot size in sqft */
    lot_sqft: z.number().nullable().optional(),

    /** Distance from subject in miles */
    distance_miles: z.number(),

    /** Age of sale in days */
    age_days: z.number().int(),

    /** Similarity score 0-100 */
    similarity_score: z.number().min(0).max(100),

    /** Price adjustments applied */
    adjustments: z.array(CompAdjustmentSchema),

    /** Total adjustment amount */
    total_adjustment: z.number().nullable().optional(),

    /** Adjusted sale price after adjustments */
    adjusted_price: z.number().nullable().optional(),

    /** Photo URL — nullable if unavailable */
    photo_url: z.string().url().nullable(),

    /** MLS number if available */
    mls_number: z.string().nullable().optional(),

    /** Property type */
    property_type: z.string().nullable().optional(),

    /** Whether comp was manually selected */
    manually_selected: z.boolean().nullable().optional(),
  })
  .strict();

/** Array of comparable sales */
export const CompsPackSchema = z.array(CompRecordSchema);

export type CompAdjustment = z.infer<typeof CompAdjustmentSchema>;
export type CompRecord = z.infer<typeof CompRecordSchema>;
export type CompsPack = z.infer<typeof CompsPackSchema>;
