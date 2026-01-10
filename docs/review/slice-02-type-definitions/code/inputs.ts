/**
 * Underwrite Input Types - Engine function inputs
 * @module @hps-internal/contracts/underwrite/inputs
 * @slice 02 of 22
 */

import type {
  ReasonForSelling,
  SellerTimeline,
  DecisionMakerStatus,
  ForeclosureStatus,
  LienStatus,
  TaxStatus,
  PropertyCondition,
  DeferredMaintenance,
} from './enums';

// ═══════════════════════════════════════════════════════════════════════════════
// MOTIVATION SCORE INPUT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Input for computeMotivationScore engine function
 * @see apps/hps-dealengine/lib/engine/computeMotivationScore.ts
 */
export interface MotivationScoreInput {
  /** Primary reason for selling */
  reason_for_selling: ReasonForSelling | null;
  /** Seller's desired timeline */
  seller_timeline: SellerTimeline | null;
  /** Who can make the decision */
  decision_maker_status: DecisionMakerStatus | null;
  /** Is mortgage currently delinquent */
  mortgage_delinquent: boolean;
  /** Boost from foreclosure timeline (0-25) */
  foreclosure_boost: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FORECLOSURE TIMELINE INPUT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Input for computeForeclosureTimeline engine function
 * @see apps/hps-dealengine/lib/engine/computeForeclosureTimeline.ts
 */
export interface ForeclosureTimelineInput {
  /** Current foreclosure status */
  foreclosure_status: ForeclosureStatus | null;
  /** Days since first missed payment */
  days_delinquent: number | null;
  /** Date of first missed payment (ISO string) */
  first_missed_payment_date: string | null;
  /** Date lis pendens was filed (ISO string) */
  lis_pendens_date: string | null;
  /** Date judgment was entered (ISO string) */
  judgment_date: string | null;
  /** Scheduled auction date (ISO string) */
  auction_date: string | null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// LIEN RISK INPUT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Input for computeLienRisk engine function
 * @see apps/hps-dealengine/lib/engine/computeLienRisk.ts
 */
export interface LienRiskInput {
  /** HOA status */
  hoa_status: LienStatus | null;
  /** HOA arrears amount in dollars */
  hoa_arrears_amount: number | null;
  /** Monthly HOA assessment in dollars */
  hoa_monthly_assessment: number | null;
  /** CDD status */
  cdd_status: LienStatus | null;
  /** CDD arrears amount in dollars */
  cdd_arrears_amount: number | null;
  /** Property tax status */
  property_tax_status: TaxStatus | null;
  /** Property tax arrears amount in dollars */
  property_tax_arrears: number | null;
  /** Are municipal liens present */
  municipal_liens_present: boolean;
  /** Municipal lien amount in dollars */
  municipal_lien_amount: number | null;
  /** Has title search been completed */
  title_search_completed: boolean;
  /** Notes from title search */
  title_issues_notes: string | null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SYSTEMS STATUS INPUT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Input for computeSystemsStatus engine function
 * @see apps/hps-dealengine/lib/engine/computeSystemsStatus.ts
 */
export interface SystemsStatusInput {
  /** Overall property condition */
  overall_condition: PropertyCondition | null;
  /** Level of deferred maintenance */
  deferred_maintenance_level: DeferredMaintenance | null;
  /** Year roof was installed (4-digit year) */
  roof_year_installed: number | null;
  /** Year HVAC was installed (4-digit year) */
  hvac_year_installed: number | null;
  /** Year water heater was installed (4-digit year) */
  water_heater_year_installed: number | null;
}
