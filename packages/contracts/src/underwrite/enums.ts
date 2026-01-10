/**
 * Underwrite Enums - Match database enum values exactly
 * @module @hps-internal/contracts/underwrite/enums
 * @slice 02 of 22
 *
 * CRITICAL: These values MUST match the database enums created in Slice 01
 * Source: supabase/migrations/20260110_001_underwrite_enhancements.sql
 */

// ═══════════════════════════════════════════════════════════════════════════════
// REASON FOR SELLING (14 values - matches DB exactly)
// ═══════════════════════════════════════════════════════════════════════════════

export type ReasonForSelling =
  | 'foreclosure'
  | 'pre_foreclosure'
  | 'divorce'
  | 'probate'
  | 'relocation'
  | 'downsizing'
  | 'financial_distress'
  | 'tired_landlord'
  | 'inherited'
  | 'tax_lien'
  | 'code_violations'
  | 'health_issues'
  | 'job_loss'
  | 'other';

/** Options array for form selects with motivation weights */
export const REASON_FOR_SELLING_OPTIONS: readonly {
  value: ReasonForSelling;
  label: string;
  motivationWeight: number;
}[] = [
  { value: 'foreclosure', label: 'Foreclosure', motivationWeight: 100 },
  { value: 'pre_foreclosure', label: 'Pre-Foreclosure', motivationWeight: 90 },
  { value: 'divorce', label: 'Divorce', motivationWeight: 80 },
  { value: 'probate', label: 'Probate/Estate', motivationWeight: 70 },
  { value: 'financial_distress', label: 'Financial Distress', motivationWeight: 85 },
  { value: 'tax_lien', label: 'Tax Lien', motivationWeight: 85 },
  { value: 'code_violations', label: 'Code Violations', motivationWeight: 75 },
  { value: 'health_issues', label: 'Health Issues', motivationWeight: 70 },
  { value: 'job_loss', label: 'Job Loss', motivationWeight: 80 },
  { value: 'tired_landlord', label: 'Tired Landlord', motivationWeight: 60 },
  { value: 'inherited', label: 'Inherited Property', motivationWeight: 55 },
  { value: 'relocation', label: 'Relocation', motivationWeight: 50 },
  { value: 'downsizing', label: 'Downsizing', motivationWeight: 40 },
  { value: 'other', label: 'Other', motivationWeight: 30 },
] as const;

// ═══════════════════════════════════════════════════════════════════════════════
// SELLER TIMELINE (5 values - matches DB exactly)
// ═══════════════════════════════════════════════════════════════════════════════

export type SellerTimeline =
  | 'immediate'
  | 'urgent'
  | 'flexible'
  | 'no_rush'
  | 'testing_market';

/** Options array for form selects with timeline multipliers */
export const SELLER_TIMELINE_OPTIONS: readonly {
  value: SellerTimeline;
  label: string;
  multiplier: number;
}[] = [
  { value: 'immediate', label: 'Immediate (< 2 weeks)', multiplier: 1.5 },
  { value: 'urgent', label: 'Urgent (2-4 weeks)', multiplier: 1.3 },
  { value: 'flexible', label: 'Flexible (1-3 months)', multiplier: 1.0 },
  { value: 'no_rush', label: 'No Rush (3+ months)', multiplier: 0.7 },
  { value: 'testing_market', label: 'Testing Market', multiplier: 0.3 },
] as const;

// ═══════════════════════════════════════════════════════════════════════════════
// DECISION MAKER STATUS (6 values - matches DB exactly)
// ═══════════════════════════════════════════════════════════════════════════════

export type DecisionMakerStatus =
  | 'sole_owner'
  | 'joint_decision'
  | 'power_of_attorney'
  | 'estate_executor'
  | 'multiple_parties'
  | 'unknown';

/** Options array for form selects with decision factors */
export const DECISION_MAKER_OPTIONS: readonly {
  value: DecisionMakerStatus;
  label: string;
  factor: number;
}[] = [
  { value: 'sole_owner', label: 'Sole Owner/Decision Maker', factor: 1.0 },
  { value: 'joint_decision', label: 'Joint Decision (Spouse/Partner)', factor: 0.9 },
  { value: 'power_of_attorney', label: 'Power of Attorney', factor: 0.85 },
  { value: 'estate_executor', label: 'Estate Executor', factor: 0.8 },
  { value: 'multiple_parties', label: 'Multiple Parties', factor: 0.6 },
  { value: 'unknown', label: 'Unknown', factor: 0.7 },
] as const;

// ═══════════════════════════════════════════════════════════════════════════════
// FORECLOSURE STATUS (7 values - FL-specific stages, matches DB exactly)
// ═══════════════════════════════════════════════════════════════════════════════

export type ForeclosureStatus =
  | 'none'
  | 'pre_foreclosure'
  | 'lis_pendens_filed'
  | 'judgment_entered'
  | 'sale_scheduled'
  | 'post_sale_redemption'
  | 'reo_bank_owned';

/** Options array for form selects with stage numbers */
export const FORECLOSURE_STATUS_OPTIONS: readonly {
  value: ForeclosureStatus;
  label: string;
  stage: number;
}[] = [
  { value: 'none', label: 'Not in Foreclosure', stage: 0 },
  { value: 'pre_foreclosure', label: 'Pre-Foreclosure (Delinquent)', stage: 1 },
  { value: 'lis_pendens_filed', label: 'Lis Pendens Filed', stage: 2 },
  { value: 'judgment_entered', label: 'Judgment Entered', stage: 3 },
  { value: 'sale_scheduled', label: 'Sale Scheduled', stage: 4 },
  { value: 'post_sale_redemption', label: 'Post-Sale Redemption Period', stage: 5 },
  { value: 'reo_bank_owned', label: 'REO (Bank Owned)', stage: 6 },
] as const;

/**
 * FL Foreclosure Timeline Stages with statute references
 * @see FL 702.10 - Lis pendens filing
 * @see FL 45.031 - Final judgment procedure
 * @see FL 45.0315 - Redemption period
 */
export const FL_TIMELINE_STAGES: Record<
  ForeclosureStatus,
  {
    label: string;
    statuteRef: string;
    typicalDays: number | null;
  }
> = {
  none: { label: 'Not in Foreclosure', statuteRef: 'N/A', typicalDays: null },
  pre_foreclosure: { label: 'Pre-Foreclosure', statuteRef: 'FL 702.10(1)', typicalDays: 90 },
  lis_pendens_filed: { label: 'Lis Pendens Filed', statuteRef: 'FL 702.10(2)', typicalDays: 180 },
  judgment_entered: { label: 'Judgment Entered', statuteRef: 'FL 45.031', typicalDays: 270 },
  sale_scheduled: { label: 'Sale Scheduled', statuteRef: 'FL 45.031(1)', typicalDays: 300 },
  post_sale_redemption: { label: 'Redemption Period', statuteRef: 'FL 45.0315', typicalDays: 310 },
  reo_bank_owned: { label: 'REO Bank Owned', statuteRef: 'N/A', typicalDays: null },
};

// ═══════════════════════════════════════════════════════════════════════════════
// LIEN STATUS (5 values - matches DB exactly)
// ═══════════════════════════════════════════════════════════════════════════════

export type LienStatus = 'none' | 'current' | 'delinquent' | 'in_arrears' | 'unknown';

/** Options array for form selects */
export const LIEN_STATUS_OPTIONS: readonly {
  value: LienStatus;
  label: string;
}[] = [
  { value: 'none', label: 'No HOA/CDD' },
  { value: 'current', label: 'Current (Paid Up)' },
  { value: 'delinquent', label: 'Delinquent (< 6 months)' },
  { value: 'in_arrears', label: 'In Arrears (6+ months)' },
  { value: 'unknown', label: 'Unknown' },
] as const;

// ═══════════════════════════════════════════════════════════════════════════════
// TAX STATUS (6 values - matches DB exactly)
// ═══════════════════════════════════════════════════════════════════════════════

export type TaxStatus =
  | 'current'
  | 'delinquent_1_year'
  | 'delinquent_2_years'
  | 'delinquent_3_plus'
  | 'tax_deed_pending'
  | 'unknown';

/** Options array for form selects */
export const TAX_STATUS_OPTIONS: readonly {
  value: TaxStatus;
  label: string;
}[] = [
  { value: 'current', label: 'Current' },
  { value: 'delinquent_1_year', label: 'Delinquent (1 year)' },
  { value: 'delinquent_2_years', label: 'Delinquent (2 years)' },
  { value: 'delinquent_3_plus', label: 'Delinquent (3+ years)' },
  { value: 'tax_deed_pending', label: 'Tax Deed Pending' },
  { value: 'unknown', label: 'Unknown' },
] as const;

// ═══════════════════════════════════════════════════════════════════════════════
// PROPERTY CONDITION (6 values - matches DB exactly)
// ═══════════════════════════════════════════════════════════════════════════════

export type PropertyCondition =
  | 'excellent'
  | 'good'
  | 'fair'
  | 'poor'
  | 'distressed'
  | 'uninhabitable';

/** Options array for form selects */
export const PROPERTY_CONDITION_OPTIONS: readonly {
  value: PropertyCondition;
  label: string;
}[] = [
  { value: 'excellent', label: 'Excellent (Move-in Ready)' },
  { value: 'good', label: 'Good (Minor Updates)' },
  { value: 'fair', label: 'Fair (Cosmetic Work)' },
  { value: 'poor', label: 'Poor (Significant Repairs)' },
  { value: 'distressed', label: 'Distressed (Major Rehab)' },
  { value: 'uninhabitable', label: 'Uninhabitable' },
] as const;

// ═══════════════════════════════════════════════════════════════════════════════
// DEFERRED MAINTENANCE (5 values - matches DB exactly)
// ═══════════════════════════════════════════════════════════════════════════════

export type DeferredMaintenance = 'none' | 'minor' | 'moderate' | 'significant' | 'extensive';

/** Options array for form selects */
export const DEFERRED_MAINTENANCE_OPTIONS: readonly {
  value: DeferredMaintenance;
  label: string;
}[] = [
  { value: 'none', label: 'None' },
  { value: 'minor', label: 'Minor ($0-5K)' },
  { value: 'moderate', label: 'Moderate ($5K-15K)' },
  { value: 'significant', label: 'Significant ($15K-30K)' },
  { value: 'extensive', label: 'Extensive ($30K+)' },
] as const;

// ═══════════════════════════════════════════════════════════════════════════════
// ENGINE OUTPUT TYPES (Not in DB - used for computed results)
// ═══════════════════════════════════════════════════════════════════════════════

/** Timeline position for foreclosure engine output */
export type TimelinePosition =
  | 'not_in_foreclosure'
  | 'pre_foreclosure'
  | 'lis_pendens'
  | 'judgment'
  | 'sale_scheduled'
  | 'redemption_period'
  | 'reo_bank_owned';

/** Urgency level for deal prioritization */
export type UrgencyLevel = 'none' | 'low' | 'medium' | 'high' | 'critical';

/** Risk level for lien assessment */
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

/** Motivation level derived from score */
export type MotivationLevel = 'low' | 'medium' | 'high' | 'critical';

/** Confidence level for data completeness */
export type ConfidenceLevel = 'low' | 'medium' | 'high';

/** System condition for RUL assessment */
export type SystemCondition = 'good' | 'fair' | 'poor' | 'critical';
