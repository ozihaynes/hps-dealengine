/**
 * computeForeclosureTimeline - Calculate foreclosure timeline position and urgency
 * @module lib/engine/computeForeclosureTimeline
 * @slice 08 of 22
 *
 * Florida Statutes Referenced:
 * - FL 702.10: Foreclosure timeline procedures
 * - FL 45.031: Judicial sale requirements
 * - FL 45.0315: Right of redemption (10 days post-sale)
 *
 * Principles Applied:
 * - DETERMINISM: Same input → Same output (injectable referenceDate)
 * - PURITY: No side effects, no API calls
 * - AUDITABILITY: Track auction_date_source
 * - DEFENSIVE: Handle null dates, invalid strings, past dates
 */

import type {
  ForeclosureStatus,
  TimelinePosition,
  UrgencyLevel,
} from '@hps-internal/contracts';

// ═══════════════════════════════════════════════════════════════════════════════
// LOCAL TYPE EXTENSIONS (For engine-only use)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Extended foreclosure status that includes 'unknown' for incomplete data.
 * The contracts type has 7 values, we add 'unknown' for edge cases.
 */
export type ForeclosureStatusExtended = ForeclosureStatus | 'unknown';

/**
 * Source of auction date.
 */
export type AuctionDateSource = 'confirmed' | 'estimated' | 'unknown';

// ═══════════════════════════════════════════════════════════════════════════════
// FL TIMELINE STAGES (Policy-Driven Constants)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Florida foreclosure timeline stages with typical durations.
 * Based on FL judicial foreclosure process.
 */
export const FL_FORECLOSURE_STAGES: Record<
  ForeclosureStatusExtended,
  {
    position: TimelinePosition;
    typicalDays: number | null;
    statuteRef: string | null;
    urgency: UrgencyLevel;
    description: string;
  }
> = {
  none: {
    position: 'not_in_foreclosure',
    typicalDays: null,
    statuteRef: null,
    urgency: 'none',
    description: 'Not in foreclosure',
  },
  pre_foreclosure: {
    position: 'pre_foreclosure',
    typicalDays: 90,
    statuteRef: 'FL 702.10',
    urgency: 'medium',
    description: 'Pre-foreclosure: delinquent, no lis pendens yet',
  },
  lis_pendens_filed: {
    position: 'lis_pendens',
    typicalDays: 180,
    statuteRef: 'FL 702.10(1)',
    urgency: 'high',
    description: 'Lis pendens filed: lawsuit commenced',
  },
  judgment_entered: {
    position: 'judgment',
    typicalDays: 45,
    statuteRef: 'FL 702.10(5)',
    urgency: 'high',
    description: 'Final judgment of foreclosure entered',
  },
  sale_scheduled: {
    position: 'sale_scheduled',
    typicalDays: 30,
    statuteRef: 'FL 45.031(1)',
    urgency: 'critical',
    description: 'Foreclosure sale scheduled',
  },
  post_sale_redemption: {
    position: 'redemption_period',
    typicalDays: 10,
    statuteRef: 'FL 45.0315',
    urgency: 'critical',
    description: 'Post-sale: 10-day right of redemption period',
  },
  reo_bank_owned: {
    position: 'reo_bank_owned',
    typicalDays: null,
    statuteRef: null,
    urgency: 'none',
    description: 'REO: Bank-owned, foreclosure complete',
  },
  unknown: {
    position: 'pre_foreclosure',
    typicalDays: null,
    statuteRef: null,
    urgency: 'medium',
    description: 'Unknown foreclosure status',
  },
};

/**
 * Urgency thresholds in days until sale.
 */
export const URGENCY_THRESHOLDS = {
  CRITICAL: 30, // < 30 days = critical
  HIGH: 60, // 30-60 days = high
  MEDIUM: 120, // 60-120 days = medium
  // > 120 days = low
} as const;

/**
 * Motivation boost by urgency level.
 * Added to motivation score for foreclosure urgency.
 */
export const URGENCY_MOTIVATION_BOOST: Record<UrgencyLevel, number> = {
  none: 0,
  low: 5,
  medium: 10,
  high: 15,
  critical: 25,
};

// ═══════════════════════════════════════════════════════════════════════════════
// INPUT/OUTPUT INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Input for foreclosure timeline calculation.
 */
export interface ForeclosureTimelineInput {
  foreclosure_status: ForeclosureStatusExtended | null;
  days_delinquent: number | null;
  first_missed_payment_date: string | null;
  lis_pendens_date: string | null;
  judgment_date: string | null;
  auction_date: string | null;
}

/**
 * Key dates in the foreclosure process.
 */
export interface ForeclosureKeyDates {
  first_missed_payment: string | null;
  lis_pendens_filed: string | null;
  judgment_entered: string | null;
  auction_scheduled: string | null;
}

/**
 * Output of foreclosure timeline calculation.
 */
export interface ForeclosureTimelineOutput {
  /** Timeline position for visualization */
  timeline_position: TimelinePosition;
  /** Days until estimated/confirmed sale (null if not applicable) */
  days_until_estimated_sale: number | null;
  /** Urgency level */
  urgency_level: UrgencyLevel;
  /** Motivation boost to add to seller score */
  seller_motivation_boost: number;
  /** FL statute reference for current stage */
  statute_reference: string | null;
  /** Source of auction date */
  auction_date_source: AuctionDateSource;
  /** Key dates in the process */
  key_dates: ForeclosureKeyDates;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DATE UTILITIES (Pure, no external deps)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Parse ISO date string to Date object.
 * Returns null if invalid.
 */
function parseDate(dateStr: string | null): Date | null {
  if (!dateStr || dateStr.trim() === '') return null;

  // Try ISO format
  const date = new Date(dateStr);
  if (!Number.isNaN(date.getTime())) {
    return date;
  }

  return null;
}

/**
 * Calculate difference in days between two dates.
 * Returns positive if target is in future, negative if in past.
 */
function daysDiff(from: Date, to: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.floor((to.getTime() - from.getTime()) / msPerDay);
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Compute foreclosure timeline position and urgency.
 *
 * This is a PURE function - no side effects, deterministic output.
 * The referenceDate parameter allows injection for testing.
 *
 * @param input - Foreclosure status and dates
 * @param referenceDate - Date to calculate from (defaults to now, injectable for testing)
 * @returns Timeline position, days until sale, urgency level
 *
 * @example
 * ```ts
 * const result = computeForeclosureTimeline({
 *   foreclosure_status: 'sale_scheduled',
 *   days_delinquent: 180,
 *   first_missed_payment_date: '2025-07-15',
 *   lis_pendens_date: '2025-09-15',
 *   judgment_date: '2025-12-01',
 *   auction_date: '2026-02-01',
 * }, new Date('2026-01-15'));
 * // result.days_until_estimated_sale = 17
 * // result.urgency_level = 'critical'
 * ```
 */
export function computeForeclosureTimeline(
  input: ForeclosureTimelineInput,
  referenceDate: Date = new Date()
): ForeclosureTimelineOutput {
  const {
    foreclosure_status,
    first_missed_payment_date,
    lis_pendens_date,
    judgment_date,
    auction_date,
  } = input;

  // === STEP 1: Determine timeline position ===
  const status: ForeclosureStatusExtended = foreclosure_status ?? 'unknown';
  const stageInfo = FL_FORECLOSURE_STAGES[status] ?? FL_FORECLOSURE_STAGES.unknown;
  const timeline_position = stageInfo.position;

  // === STEP 2: Calculate days until sale ===
  let days_until_estimated_sale: number | null = null;
  let auction_date_source: AuctionDateSource = 'unknown';

  // Check for confirmed auction date first
  const parsedAuctionDate = parseDate(auction_date);
  if (parsedAuctionDate) {
    days_until_estimated_sale = daysDiff(referenceDate, parsedAuctionDate);
    auction_date_source = 'confirmed';
  } else if (stageInfo.typicalDays !== null) {
    // Estimate based on FL timeline stages
    days_until_estimated_sale = estimateDaysUntilSale(
      status,
      {
        lis_pendens_date,
        judgment_date,
      },
      referenceDate
    );
    if (days_until_estimated_sale !== null) {
      auction_date_source = 'estimated';
    }
  }

  // === STEP 3: Determine urgency level ===
  const urgency_level = deriveUrgencyLevel(days_until_estimated_sale, status);

  // === STEP 4: Calculate seller motivation boost ===
  const seller_motivation_boost = URGENCY_MOTIVATION_BOOST[urgency_level] ?? 0;

  // === STEP 5: Build key dates ===
  const key_dates: ForeclosureKeyDates = {
    first_missed_payment: first_missed_payment_date,
    lis_pendens_filed: lis_pendens_date,
    judgment_entered: judgment_date,
    auction_scheduled: auction_date,
  };

  // === RETURN: Full output ===
  return {
    timeline_position,
    days_until_estimated_sale,
    urgency_level,
    seller_motivation_boost,
    statute_reference: stageInfo.statuteRef,
    auction_date_source,
    key_dates,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS (Pure, deterministic)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Estimate days until sale based on FL timeline averages.
 */
function estimateDaysUntilSale(
  status: ForeclosureStatusExtended,
  dates: {
    lis_pendens_date: string | null;
    judgment_date: string | null;
  },
  referenceDate: Date
): number | null {
  const stageInfo = FL_FORECLOSURE_STAGES[status];
  if (!stageInfo || stageInfo.typicalDays === null) {
    return null;
  }

  // Calculate days elapsed in current stage
  let daysInCurrentStage = 0;

  if (status === 'lis_pendens_filed' && dates.lis_pendens_date) {
    const lisPendensDate = parseDate(dates.lis_pendens_date);
    if (lisPendensDate) {
      daysInCurrentStage = Math.max(0, daysDiff(lisPendensDate, referenceDate));
    }
  } else if (status === 'judgment_entered' && dates.judgment_date) {
    const judgmentDateParsed = parseDate(dates.judgment_date);
    if (judgmentDateParsed) {
      daysInCurrentStage = Math.max(0, daysDiff(judgmentDateParsed, referenceDate));
    }
  }

  // Calculate remaining days in current stage
  const remainingInStage = Math.max(0, stageInfo.typicalDays - daysInCurrentStage);

  // Add remaining stages' typical days
  let totalRemainingDays = remainingInStage;

  if (status === 'pre_foreclosure') {
    totalRemainingDays += FL_FORECLOSURE_STAGES.lis_pendens_filed.typicalDays ?? 0;
    totalRemainingDays += FL_FORECLOSURE_STAGES.judgment_entered.typicalDays ?? 0;
    totalRemainingDays += FL_FORECLOSURE_STAGES.sale_scheduled.typicalDays ?? 0;
  } else if (status === 'lis_pendens_filed') {
    totalRemainingDays += FL_FORECLOSURE_STAGES.judgment_entered.typicalDays ?? 0;
    totalRemainingDays += FL_FORECLOSURE_STAGES.sale_scheduled.typicalDays ?? 0;
  } else if (status === 'judgment_entered') {
    totalRemainingDays += FL_FORECLOSURE_STAGES.sale_scheduled.typicalDays ?? 0;
  }

  return totalRemainingDays;
}

/**
 * Derive urgency level from days until sale and status.
 */
function deriveUrgencyLevel(
  daysUntilSale: number | null,
  status: ForeclosureStatusExtended
): UrgencyLevel {
  // Not in foreclosure or already bank-owned = no urgency
  if (status === 'none' || status === 'reo_bank_owned') {
    return 'none';
  }

  // No estimated date available = use stage-based urgency
  if (daysUntilSale === null) {
    return FL_FORECLOSURE_STAGES[status]?.urgency ?? 'medium';
  }

  // Sale already passed = critical
  if (daysUntilSale < 0) {
    return 'critical';
  }

  // Use day thresholds
  if (daysUntilSale <= URGENCY_THRESHOLDS.CRITICAL) {
    return 'critical';
  }
  if (daysUntilSale <= URGENCY_THRESHOLDS.HIGH) {
    return 'high';
  }
  if (daysUntilSale <= URGENCY_THRESHOLDS.MEDIUM) {
    return 'medium';
  }

  return 'low';
}
