/**
 * Evidence Health Schema — V2.5 Wholesaler Dashboard
 *
 * Tracks freshness and completeness of 5 critical evidence types
 * required for confident underwriting decisions.
 *
 * PRD Evidence Types:
 * 1. Payoff Letter (30-day freshness)
 * 2. Title Commitment (60-day freshness)
 * 3. Insurance Quote (30-day freshness)
 * 4. Four-Point Inspection (90-day freshness)
 * 5. Repair Estimate (60-day freshness)
 *
 * @module contracts/evidenceHealth
 */

import { z } from "zod";

/**
 * Freshness status for a single evidence item.
 * - fresh: Within acceptable age threshold
 * - stale: Exists but older than threshold (needs refresh)
 * - missing: Never uploaded or no date available
 */
export const EvidenceFreshnessStatusSchema = z.enum([
  "fresh",
  "stale",
  "missing",
]);
export type EvidenceFreshnessStatus = z.infer<
  typeof EvidenceFreshnessStatusSchema
>;

/**
 * The 5 PRD-defined evidence types for underwriting.
 */
export const EvidenceTypeSchema = z.enum([
  "payoff_letter",
  "title_commitment",
  "insurance_quote",
  "four_point_inspection",
  "repair_estimate",
]);
export type EvidenceType = z.infer<typeof EvidenceTypeSchema>;

/**
 * Freshness assessment for a single evidence item.
 */
export const EvidenceItemHealthSchema = z.object({
  /** Evidence type identifier */
  evidence_type: EvidenceTypeSchema,
  /** Human-readable label */
  label: z.string(),
  /** Current freshness status */
  status: EvidenceFreshnessStatusSchema,
  /** Date evidence was obtained (null if missing) */
  obtained_date: z.string().nullable(),
  /** Age in days (null if missing) */
  age_days: z.number().nullable(),
  /** Freshness threshold for this type in days */
  freshness_threshold_days: z.number(),
  /** Days until stale (negative = already stale, null = missing) */
  days_until_stale: z.number().nullable(),
  /** Whether this evidence is critical for underwriting */
  is_critical: z.boolean(),
});
export type EvidenceItemHealth = z.infer<typeof EvidenceItemHealthSchema>;

/**
 * Aggregate evidence health for a deal.
 */
export const EvidenceHealthSchema = z.object({
  /** Health status for each of the 5 evidence types */
  items: z.array(EvidenceItemHealthSchema),
  /** Count of fresh items */
  fresh_count: z.number(),
  /** Count of stale items */
  stale_count: z.number(),
  /** Count of missing items */
  missing_count: z.number(),
  /** Overall health score (0-100) */
  health_score: z.number(),
  /** Health band classification */
  health_band: z.enum(["excellent", "good", "fair", "poor"]),
  /** Whether any critical evidence is missing */
  any_critical_missing: z.boolean(),
  /** Whether any critical evidence is stale */
  any_critical_stale: z.boolean(),
  /** List of missing critical evidence types */
  missing_critical: z.array(EvidenceTypeSchema),
  /** List of stale critical evidence types */
  stale_critical: z.array(EvidenceTypeSchema),
  /** Recommended action based on health */
  recommended_action: z.string(),
});
export type EvidenceHealth = z.infer<typeof EvidenceHealthSchema>;
