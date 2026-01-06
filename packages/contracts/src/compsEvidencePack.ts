/**
 * Comps Evidence Pack Schema
 *
 * Defines the shape of comparable sales data for V2.5 Dashboard display.
 * Includes provenance (source, as_of, run_id) for audit trail.
 *
 * @module compsEvidencePack
 * @version 1.0.0
 */
import { z } from "zod";

// =============================================================================
// ADJUSTMENT LINE ITEM (for comp value adjustments)
// =============================================================================

/**
 * Schema for individual adjustment line items applied to a comp.
 * Each adjustment modifies the comp's value based on property differences.
 */
export const AdjustmentDisplaySchema = z
  .object({
    /** Adjustment type identifier (e.g., "sqft", "condition", "pool") */
    type: z.string().min(1),
    /** Human-readable label for display */
    label: z.string().min(1),
    /** Dollar amount of adjustment (positive = adds value, negative = subtracts) */
    amount: z.number(),
    /** Direction indicator for UI styling */
    direction: z.enum(["up", "down", "neutral"]),
  })
  .strict();

export type AdjustmentDisplay = z.infer<typeof AdjustmentDisplaySchema>;

// =============================================================================
// INDIVIDUAL COMP FOR DISPLAY
// =============================================================================

/**
 * Schema for a single comparable property displayed in the evidence pack.
 * Contains all data needed to render a comp card in the UI.
 */
export const CompDisplaySchema = z
  .object({
    // -------------------------------------------------------------------------
    // Identity
    // -------------------------------------------------------------------------
    /** Unique identifier for this comp */
    id: z.string().min(1),
    /** Full street address */
    address: z.string().nullable(),

    // -------------------------------------------------------------------------
    // Core metrics
    // -------------------------------------------------------------------------
    /** Sale or list price in dollars */
    price: z.number().nonnegative().nullable(),
    /** Price per square foot (calculated: price / sqft) */
    price_per_sqft: z.number().nonnegative().nullable(),
    /** Living area square footage */
    sqft: z.number().nonnegative().nullable(),
    /** Number of bedrooms */
    beds: z.number().int().nonnegative().nullable(),
    /** Number of bathrooms (can be 1.5, 2.5, etc.) */
    baths: z.number().nonnegative().nullable(),
    /** Year the property was built */
    year_built: z.number().int().nullable(),
    /** Lot size in square feet */
    lot_size: z.number().nonnegative().nullable(),

    // -------------------------------------------------------------------------
    // Similarity / Quality
    // -------------------------------------------------------------------------
    /** Distance from subject property in miles */
    distance_miles: z.number().nonnegative().nullable(),
    /** Days since sale/listing date */
    days_old: z.number().int().nonnegative().nullable(),
    /** Similarity score 0-100 (higher = more similar to subject) */
    similarity_score: z.number().min(0).max(100).nullable(),
    /** Raw correlation value from selection algorithm */
    correlation: z.number().nullable(),

    // -------------------------------------------------------------------------
    // Sale info
    // -------------------------------------------------------------------------
    /** Whether this is a closed sale or active listing */
    comp_kind: z.enum(["closed_sale", "sale_listing"]).nullable(),
    /** Sale or listing date (ISO string) */
    sale_date: z.string().nullable(),
    /** Days on market before sale */
    dom: z.number().int().nonnegative().nullable(),

    // -------------------------------------------------------------------------
    // Adjustments
    // -------------------------------------------------------------------------
    /** Value after all adjustments applied */
    adjusted_value: z.number().nonnegative().nullable(),
    /** Net adjustment as percentage of original price (can be negative) */
    net_adjustment_pct: z.number().nullable(),
    /** Individual adjustment line items */
    adjustments: z.array(AdjustmentDisplaySchema).nullable(),

    // -------------------------------------------------------------------------
    // Visual / Evidence
    // -------------------------------------------------------------------------
    /** URL to property photo for display */
    photo_url: z.string().nullable(),
    /** MLS listing number for reference */
    mls_number: z.string().nullable(),

    // -------------------------------------------------------------------------
    // Provenance (required for audit trail)
    // -------------------------------------------------------------------------
    /** Data source identifier (e.g., "RentCast", "ATTOM") */
    source: z.string().min(1),
    /** Timestamp when data was fetched (ISO string) */
    as_of: z.string().min(1),
  })
  .strict();

export type CompDisplay = z.infer<typeof CompDisplaySchema>;

// =============================================================================
// COMPS EVIDENCE PACK (AGGREGATED)
// =============================================================================

/**
 * Schema for the complete comps evidence pack.
 * Contains summary metrics, all comps, and provenance data.
 */
export const CompsEvidencePackSchema = z
  .object({
    // -------------------------------------------------------------------------
    // Summary
    // -------------------------------------------------------------------------
    /** Total number of comps in the pack */
    comp_count: z.number().int().nonnegative(),
    /** Type of comps used (closed_sale preferred, sale_listing fallback) */
    comp_kind_used: z.enum(["closed_sale", "sale_listing"]).nullable(),

    // -------------------------------------------------------------------------
    // Quality metrics (aggregated)
    // -------------------------------------------------------------------------
    /** Average similarity score across all comps (0-100) */
    avg_similarity_score: z.number().min(0).max(100).nullable(),
    /** Average distance in miles from subject */
    avg_distance_miles: z.number().nonnegative().nullable(),
    /** Average days since sale/listing */
    avg_days_old: z.number().nonnegative().nullable(),
    /** Lowest price among comps */
    price_range_low: z.number().nonnegative().nullable(),
    /** Highest price among comps */
    price_range_high: z.number().nonnegative().nullable(),
    /** Price range as percentage of median (indicates comp consistency) */
    price_variance_pct: z.number().nonnegative().nullable(),

    // -------------------------------------------------------------------------
    // The comps themselves
    // -------------------------------------------------------------------------
    /** Array of comparable properties */
    comps: z.array(CompDisplaySchema),

    // -------------------------------------------------------------------------
    // Selection metadata
    // -------------------------------------------------------------------------
    /** Version of selection algorithm used */
    selection_version: z.string().nullable(),
    /** Number of outliers removed during selection */
    outliers_removed_count: z.number().int().nonnegative().nullable(),
    /** Candidate count before applying filters */
    candidates_before_filters: z.number().int().nonnegative().nullable(),
    /** Candidate count after applying filters */
    candidates_after_filters: z.number().int().nonnegative().nullable(),

    // -------------------------------------------------------------------------
    // Evidence provenance
    // -------------------------------------------------------------------------
    /** Property snapshot ID this pack was derived from */
    snapshot_id: z.string().nullable(),
    /** Timestamp of the snapshot (ISO string) */
    snapshot_as_of: z.string().nullable(),
    /** Data provider name */
    provider: z.string().nullable(),

    // -------------------------------------------------------------------------
    // Trace linkage
    // -------------------------------------------------------------------------
    /** Valuation run ID for audit trail */
    valuation_run_id: z.string().nullable(),
  })
  .strict();

export type CompsEvidencePack = z.infer<typeof CompsEvidencePackSchema>;
