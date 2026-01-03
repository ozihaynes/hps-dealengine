/**
 * Comp Quality Schema — V2.5 Wholesaler Dashboard
 *
 * Fannie Mae-style quality assessment of comparable sales
 * based on recency, proximity, and similarity.
 *
 * Trace Frame: COMP_QUALITY
 */
import { z } from "zod";

/** Quality band for display categorization */
export const CompQualityBandSchema = z.enum([
  "excellent",
  "good",
  "fair",
  "poor",
]);

/** Scoring methodology identifier */
export const CompQualityScoringMethodSchema = z.enum([
  "fannie_mae",
  "custom",
]);

/** Complete comp quality assessment */
export const CompQualitySchema = z
  .object({
    /** Number of comparable sales used */
    comp_count: z.number().int().min(0),

    /** Average distance from subject in miles */
    avg_distance_miles: z.number().min(0),

    /** Average age of comps in days */
    avg_age_days: z.number().min(0),

    /** Standard deviation of sqft as percentage of subject */
    sqft_variance_pct: z.number().min(0),

    /** Overall quality score 0-100 */
    quality_score: z.number().min(0).max(100),

    /** Quality band for display */
    quality_band: CompQualityBandSchema,

    /** Scoring methodology used */
    scoring_method: CompQualityScoringMethodSchema,

    /** Whether comp quality meets minimum threshold for confidence A */
    meets_confidence_threshold: z.boolean().nullable().optional(),

    /** Maximum distance among all comps */
    max_distance_miles: z.number().nullable().optional(),

    /** Maximum age among all comps in days */
    max_age_days: z.number().nullable().optional(),

    /** Detailed scoring breakdown */
    score_breakdown: z
      .object({
        recency_score: z.number().nullable().optional(),
        proximity_score: z.number().nullable().optional(),
        similarity_score: z.number().nullable().optional(),
      })
      .strict()
      .nullable()
      .optional(),
  })
  .strict();

export type CompQualityBand = z.infer<typeof CompQualityBandSchema>;
export type CompQualityScoringMethod = z.infer<typeof CompQualityScoringMethodSchema>;
export type CompQuality = z.infer<typeof CompQualitySchema>;
