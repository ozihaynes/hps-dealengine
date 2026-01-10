/**
 * computeForeclosureTimeline Tests
 * @module lib/engine/computeForeclosureTimeline.test
 * @slice 08 of 22
 *
 * Test Categories:
 * - Determinism: Same input → Same output
 * - Timeline Position: Status to position mapping
 * - Days Until Sale: Confirmed vs estimated
 * - Urgency Level: Threshold-based derivation
 * - Motivation Boost: By urgency level
 * - Statute Reference: FL law citations
 * - Edge Cases: Null dates, past dates, invalid strings
 */

import { describe, it, expect } from 'vitest';
import {
  computeForeclosureTimeline,
  FL_FORECLOSURE_STAGES,
  URGENCY_THRESHOLDS,
  URGENCY_MOTIVATION_BOOST,
  type ForeclosureTimelineInput,
  type ForeclosureStatusExtended,
} from './computeForeclosureTimeline';

// ═══════════════════════════════════════════════════════════════════════════════
// TEST FIXTURES
// ═══════════════════════════════════════════════════════════════════════════════

/** Fixed reference date for deterministic tests */
const REF_DATE = new Date('2026-01-15T12:00:00Z');

/** Helper to create input with defaults */
const createInput = (
  overrides: Partial<ForeclosureTimelineInput> = {}
): ForeclosureTimelineInput => ({
  foreclosure_status: 'pre_foreclosure',
  days_delinquent: 90,
  first_missed_payment_date: '2025-10-15',
  lis_pendens_date: null,
  judgment_date: null,
  auction_date: null,
  ...overrides,
});

// ═══════════════════════════════════════════════════════════════════════════════
// DETERMINISM TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('computeForeclosureTimeline - Determinism', () => {
  it('returns identical output for identical input (10 iterations)', () => {
    const input = createInput({
      foreclosure_status: 'sale_scheduled',
      lis_pendens_date: '2025-09-15',
      judgment_date: '2025-12-01',
      auction_date: '2026-02-01',
    });

    const results = Array.from({ length: 10 }, () =>
      computeForeclosureTimeline(input, REF_DATE)
    );
    const firstResult = JSON.stringify(results[0]);

    results.forEach((result) => {
      expect(JSON.stringify(result)).toBe(firstResult);
    });
  });

  it('is a pure function (no side effects)', () => {
    const input = createInput();
    const inputCopy = JSON.stringify(input);

    computeForeclosureTimeline(input, REF_DATE);

    expect(JSON.stringify(input)).toBe(inputCopy);
  });

  it('uses injectable referenceDate for testing', () => {
    const input = createInput({ auction_date: '2026-02-01' });

    const result1 = computeForeclosureTimeline(input, new Date('2026-01-15T12:00:00Z'));
    const result2 = computeForeclosureTimeline(input, new Date('2026-01-25T12:00:00Z'));

    // Days difference depends on timezone, just verify the difference between the two
    expect(result2.days_until_estimated_sale!).toBeLessThan(result1.days_until_estimated_sale!);
    expect(result1.days_until_estimated_sale! - result2.days_until_estimated_sale!).toBe(10);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TIMELINE POSITION TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('computeForeclosureTimeline - Timeline Position', () => {
  it('maps "none" to "not_in_foreclosure"', () => {
    const result = computeForeclosureTimeline(
      createInput({ foreclosure_status: 'none' }),
      REF_DATE
    );
    expect(result.timeline_position).toBe('not_in_foreclosure');
  });

  it('maps "pre_foreclosure" to "pre_foreclosure"', () => {
    const result = computeForeclosureTimeline(
      createInput({ foreclosure_status: 'pre_foreclosure' }),
      REF_DATE
    );
    expect(result.timeline_position).toBe('pre_foreclosure');
  });

  it('maps "lis_pendens_filed" to "lis_pendens"', () => {
    const result = computeForeclosureTimeline(
      createInput({ foreclosure_status: 'lis_pendens_filed' }),
      REF_DATE
    );
    expect(result.timeline_position).toBe('lis_pendens');
  });

  it('maps "judgment_entered" to "judgment"', () => {
    const result = computeForeclosureTimeline(
      createInput({ foreclosure_status: 'judgment_entered' }),
      REF_DATE
    );
    expect(result.timeline_position).toBe('judgment');
  });

  it('maps "sale_scheduled" to "sale_scheduled"', () => {
    const result = computeForeclosureTimeline(
      createInput({ foreclosure_status: 'sale_scheduled' }),
      REF_DATE
    );
    expect(result.timeline_position).toBe('sale_scheduled');
  });

  it('maps "post_sale_redemption" to "redemption_period"', () => {
    const result = computeForeclosureTimeline(
      createInput({ foreclosure_status: 'post_sale_redemption' }),
      REF_DATE
    );
    expect(result.timeline_position).toBe('redemption_period');
  });

  it('maps "reo_bank_owned" to "reo_bank_owned"', () => {
    const result = computeForeclosureTimeline(
      createInput({ foreclosure_status: 'reo_bank_owned' }),
      REF_DATE
    );
    expect(result.timeline_position).toBe('reo_bank_owned');
  });

  it('maps null status to "pre_foreclosure" (unknown)', () => {
    const result = computeForeclosureTimeline(
      createInput({ foreclosure_status: null }),
      REF_DATE
    );
    expect(result.timeline_position).toBe('pre_foreclosure');
  });

  it('maps "unknown" status to "pre_foreclosure"', () => {
    const result = computeForeclosureTimeline(
      createInput({ foreclosure_status: 'unknown' }),
      REF_DATE
    );
    expect(result.timeline_position).toBe('pre_foreclosure');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// DAYS UNTIL SALE TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('computeForeclosureTimeline - Days Until Sale', () => {
  it('calculates correct days from confirmed auction date', () => {
    const result = computeForeclosureTimeline(
      createInput({
        foreclosure_status: 'sale_scheduled',
        auction_date: '2026-02-01T12:00:00Z', // Same timezone as REF_DATE
      }),
      REF_DATE
    );

    expect(result.days_until_estimated_sale).toBe(17);
    expect(result.auction_date_source).toBe('confirmed');
  });

  it('estimates days when no auction date provided', () => {
    const result = computeForeclosureTimeline(
      createInput({
        foreclosure_status: 'lis_pendens_filed',
        lis_pendens_date: '2025-12-15', // ~31 days ago from REF_DATE
      }),
      REF_DATE
    );

    expect(result.days_until_estimated_sale).toBeGreaterThan(0);
    expect(result.auction_date_source).toBe('estimated');
  });

  it('returns null for "none" status', () => {
    const result = computeForeclosureTimeline(
      createInput({ foreclosure_status: 'none' }),
      REF_DATE
    );

    expect(result.days_until_estimated_sale).toBeNull();
    expect(result.auction_date_source).toBe('unknown');
  });

  it('returns null for "reo_bank_owned" status', () => {
    const result = computeForeclosureTimeline(
      createInput({ foreclosure_status: 'reo_bank_owned' }),
      REF_DATE
    );

    expect(result.days_until_estimated_sale).toBeNull();
  });

  it('handles past auction date (negative days)', () => {
    const result = computeForeclosureTimeline(
      createInput({
        foreclosure_status: 'sale_scheduled',
        auction_date: '2026-01-01T12:00:00Z', // 14 days before REF_DATE
      }),
      REF_DATE
    );

    expect(result.days_until_estimated_sale).toBeLessThan(0);
    expect(result.days_until_estimated_sale).toBe(-14);
  });

  it('calculates remaining days in pre_foreclosure stage', () => {
    const result = computeForeclosureTimeline(
      createInput({
        foreclosure_status: 'pre_foreclosure',
      }),
      REF_DATE
    );

    // pre_foreclosure typical: 90 + lis_pendens: 180 + judgment: 45 + sale: 30 = 345
    expect(result.days_until_estimated_sale).toBe(345);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// URGENCY LEVEL TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('computeForeclosureTimeline - Urgency Level', () => {
  it('returns "critical" for < 30 days until sale', () => {
    const result = computeForeclosureTimeline(
      createInput({
        foreclosure_status: 'sale_scheduled',
        auction_date: '2026-02-01', // 17 days
      }),
      REF_DATE
    );

    expect(result.urgency_level).toBe('critical');
  });

  it('returns "critical" for exactly 30 days until sale', () => {
    const result = computeForeclosureTimeline(
      createInput({
        foreclosure_status: 'sale_scheduled',
        auction_date: '2026-02-14', // 30 days
      }),
      REF_DATE
    );

    expect(result.urgency_level).toBe('critical');
  });

  it('returns "high" for 31-60 days until sale', () => {
    const result = computeForeclosureTimeline(
      createInput({
        foreclosure_status: 'sale_scheduled',
        auction_date: '2026-02-28', // 44 days
      }),
      REF_DATE
    );

    expect(result.urgency_level).toBe('high');
  });

  it('returns "high" for exactly 60 days until sale', () => {
    const result = computeForeclosureTimeline(
      createInput({
        foreclosure_status: 'sale_scheduled',
        auction_date: '2026-03-16', // 60 days
      }),
      REF_DATE
    );

    expect(result.urgency_level).toBe('high');
  });

  it('returns "medium" for 61-120 days until sale', () => {
    const result = computeForeclosureTimeline(
      createInput({
        foreclosure_status: 'sale_scheduled',
        auction_date: '2026-04-15', // ~90 days
      }),
      REF_DATE
    );

    expect(result.urgency_level).toBe('medium');
  });

  it('returns "low" for > 120 days until sale', () => {
    const result = computeForeclosureTimeline(
      createInput({
        foreclosure_status: 'sale_scheduled',
        auction_date: '2026-06-01', // ~137 days
      }),
      REF_DATE
    );

    expect(result.urgency_level).toBe('low');
  });

  it('returns "none" for "none" status', () => {
    const result = computeForeclosureTimeline(
      createInput({ foreclosure_status: 'none' }),
      REF_DATE
    );

    expect(result.urgency_level).toBe('none');
  });

  it('returns "none" for "reo_bank_owned" status', () => {
    const result = computeForeclosureTimeline(
      createInput({ foreclosure_status: 'reo_bank_owned' }),
      REF_DATE
    );

    expect(result.urgency_level).toBe('none');
  });

  it('returns "critical" for past auction date', () => {
    const result = computeForeclosureTimeline(
      createInput({
        foreclosure_status: 'sale_scheduled',
        auction_date: '2026-01-01',
      }),
      REF_DATE
    );

    expect(result.urgency_level).toBe('critical');
  });

  it('uses stage-based urgency for lis_pendens_filed', () => {
    // lis_pendens_filed has a stage default urgency of 'high'
    // Even without dates, it can estimate days, so urgency comes from thresholds
    // The estimated days for lis_pendens (180 + 45 + 30 = 255) puts it in 'low' bucket
    const result = computeForeclosureTimeline(
      createInput({
        foreclosure_status: 'lis_pendens_filed',
        lis_pendens_date: null, // No date to estimate from
      }),
      REF_DATE
    );

    // With 255+ days estimated, urgency should be 'low' (> 120 days)
    expect(result.days_until_estimated_sale).toBe(255);
    expect(result.urgency_level).toBe('low');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// MOTIVATION BOOST TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('computeForeclosureTimeline - Motivation Boost', () => {
  it('returns 25 for "critical" urgency', () => {
    const result = computeForeclosureTimeline(
      createInput({
        foreclosure_status: 'sale_scheduled',
        auction_date: '2026-01-25', // 10 days
      }),
      REF_DATE
    );

    expect(result.seller_motivation_boost).toBe(25);
  });

  it('returns 15 for "high" urgency', () => {
    const result = computeForeclosureTimeline(
      createInput({
        foreclosure_status: 'sale_scheduled',
        auction_date: '2026-02-28', // 44 days
      }),
      REF_DATE
    );

    expect(result.seller_motivation_boost).toBe(15);
  });

  it('returns 10 for "medium" urgency', () => {
    const result = computeForeclosureTimeline(
      createInput({
        foreclosure_status: 'sale_scheduled',
        auction_date: '2026-04-15', // ~90 days
      }),
      REF_DATE
    );

    expect(result.seller_motivation_boost).toBe(10);
  });

  it('returns 5 for "low" urgency', () => {
    const result = computeForeclosureTimeline(
      createInput({
        foreclosure_status: 'sale_scheduled',
        auction_date: '2026-06-01', // ~137 days
      }),
      REF_DATE
    );

    expect(result.seller_motivation_boost).toBe(5);
  });

  it('returns 0 for "none" urgency', () => {
    const result = computeForeclosureTimeline(
      createInput({ foreclosure_status: 'none' }),
      REF_DATE
    );

    expect(result.seller_motivation_boost).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// STATUTE REFERENCE TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('computeForeclosureTimeline - Statute Reference', () => {
  it('returns FL 45.031(1) for "sale_scheduled"', () => {
    const result = computeForeclosureTimeline(
      createInput({ foreclosure_status: 'sale_scheduled' }),
      REF_DATE
    );

    expect(result.statute_reference).toBe('FL 45.031(1)');
  });

  it('returns FL 45.0315 for "post_sale_redemption"', () => {
    const result = computeForeclosureTimeline(
      createInput({ foreclosure_status: 'post_sale_redemption' }),
      REF_DATE
    );

    expect(result.statute_reference).toBe('FL 45.0315');
  });

  it('returns FL 702.10 for "pre_foreclosure"', () => {
    const result = computeForeclosureTimeline(
      createInput({ foreclosure_status: 'pre_foreclosure' }),
      REF_DATE
    );

    expect(result.statute_reference).toBe('FL 702.10');
  });

  it('returns FL 702.10(1) for "lis_pendens_filed"', () => {
    const result = computeForeclosureTimeline(
      createInput({ foreclosure_status: 'lis_pendens_filed' }),
      REF_DATE
    );

    expect(result.statute_reference).toBe('FL 702.10(1)');
  });

  it('returns FL 702.10(5) for "judgment_entered"', () => {
    const result = computeForeclosureTimeline(
      createInput({ foreclosure_status: 'judgment_entered' }),
      REF_DATE
    );

    expect(result.statute_reference).toBe('FL 702.10(5)');
  });

  it('returns null for "none" status', () => {
    const result = computeForeclosureTimeline(
      createInput({ foreclosure_status: 'none' }),
      REF_DATE
    );

    expect(result.statute_reference).toBeNull();
  });

  it('returns null for "reo_bank_owned" status', () => {
    const result = computeForeclosureTimeline(
      createInput({ foreclosure_status: 'reo_bank_owned' }),
      REF_DATE
    );

    expect(result.statute_reference).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// EDGE CASE TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('computeForeclosureTimeline - Edge Cases', () => {
  it('handles null foreclosure_status', () => {
    const result = computeForeclosureTimeline(
      createInput({ foreclosure_status: null }),
      REF_DATE
    );

    expect(result.timeline_position).toBe('pre_foreclosure');
    expect(result.urgency_level).toBe('medium');
  });

  it('handles all null dates', () => {
    const result = computeForeclosureTimeline(
      {
        foreclosure_status: 'pre_foreclosure',
        days_delinquent: null,
        first_missed_payment_date: null,
        lis_pendens_date: null,
        judgment_date: null,
        auction_date: null,
      },
      REF_DATE
    );

    expect(result.key_dates.first_missed_payment).toBeNull();
    expect(result.key_dates.lis_pendens_filed).toBeNull();
    expect(result.key_dates.judgment_entered).toBeNull();
    expect(result.key_dates.auction_scheduled).toBeNull();
  });

  it('handles invalid date string', () => {
    const result = computeForeclosureTimeline(
      createInput({ auction_date: 'not-a-valid-date' }),
      REF_DATE
    );

    expect(result.auction_date_source).not.toBe('confirmed');
  });

  it('handles empty string auction date', () => {
    const result = computeForeclosureTimeline(
      createInput({ auction_date: '' }),
      REF_DATE
    );

    expect(result.auction_date_source).not.toBe('confirmed');
  });

  it('handles whitespace-only auction date', () => {
    const result = computeForeclosureTimeline(
      createInput({ auction_date: '   ' }),
      REF_DATE
    );

    expect(result.auction_date_source).not.toBe('confirmed');
  });

  it('handles null days_delinquent', () => {
    const result = computeForeclosureTimeline(
      createInput({ days_delinquent: null }),
      REF_DATE
    );

    expect(result).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// KEY DATES TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('computeForeclosureTimeline - Key Dates', () => {
  it('returns all provided dates', () => {
    const result = computeForeclosureTimeline(
      createInput({
        first_missed_payment_date: '2025-07-15',
        lis_pendens_date: '2025-09-15',
        judgment_date: '2025-12-01',
        auction_date: '2026-02-01',
      }),
      REF_DATE
    );

    expect(result.key_dates).toEqual({
      first_missed_payment: '2025-07-15',
      lis_pendens_filed: '2025-09-15',
      judgment_entered: '2025-12-01',
      auction_scheduled: '2026-02-01',
    });
  });

  it('preserves null dates', () => {
    const result = computeForeclosureTimeline(
      createInput({
        first_missed_payment_date: '2025-07-15',
        lis_pendens_date: null,
        judgment_date: null,
        auction_date: null,
      }),
      REF_DATE
    );

    expect(result.key_dates.first_missed_payment).toBe('2025-07-15');
    expect(result.key_dates.lis_pendens_filed).toBeNull();
    expect(result.key_dates.judgment_entered).toBeNull();
    expect(result.key_dates.auction_scheduled).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('computeForeclosureTimeline - Constants', () => {
  it('FL_FORECLOSURE_STAGES covers all status types', () => {
    const statuses: ForeclosureStatusExtended[] = [
      'none',
      'pre_foreclosure',
      'lis_pendens_filed',
      'judgment_entered',
      'sale_scheduled',
      'post_sale_redemption',
      'reo_bank_owned',
      'unknown',
    ];

    statuses.forEach((status) => {
      expect(FL_FORECLOSURE_STAGES[status]).toBeDefined();
      expect(FL_FORECLOSURE_STAGES[status].position).toBeDefined();
      expect(FL_FORECLOSURE_STAGES[status].urgency).toBeDefined();
    });
  });

  it('URGENCY_THRESHOLDS are in descending order', () => {
    expect(URGENCY_THRESHOLDS.CRITICAL).toBeLessThan(URGENCY_THRESHOLDS.HIGH);
    expect(URGENCY_THRESHOLDS.HIGH).toBeLessThan(URGENCY_THRESHOLDS.MEDIUM);
  });

  it('URGENCY_MOTIVATION_BOOST covers all urgency levels', () => {
    const levels = ['none', 'low', 'medium', 'high', 'critical'] as const;

    levels.forEach((level) => {
      expect(URGENCY_MOTIVATION_BOOST[level]).toBeDefined();
      expect(typeof URGENCY_MOTIVATION_BOOST[level]).toBe('number');
    });
  });

  it('URGENCY_MOTIVATION_BOOST values increase with urgency', () => {
    expect(URGENCY_MOTIVATION_BOOST.none).toBe(0);
    expect(URGENCY_MOTIVATION_BOOST.low).toBeGreaterThan(URGENCY_MOTIVATION_BOOST.none);
    expect(URGENCY_MOTIVATION_BOOST.medium).toBeGreaterThan(URGENCY_MOTIVATION_BOOST.low);
    expect(URGENCY_MOTIVATION_BOOST.high).toBeGreaterThan(URGENCY_MOTIVATION_BOOST.medium);
    expect(URGENCY_MOTIVATION_BOOST.critical).toBeGreaterThan(URGENCY_MOTIVATION_BOOST.high);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// OUTPUT STRUCTURE TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('computeForeclosureTimeline - Output Structure', () => {
  it('returns all required output fields', () => {
    const result = computeForeclosureTimeline(createInput(), REF_DATE);

    expect(result).toHaveProperty('timeline_position');
    expect(result).toHaveProperty('days_until_estimated_sale');
    expect(result).toHaveProperty('urgency_level');
    expect(result).toHaveProperty('seller_motivation_boost');
    expect(result).toHaveProperty('statute_reference');
    expect(result).toHaveProperty('auction_date_source');
    expect(result).toHaveProperty('key_dates');
  });

  it('key_dates has correct structure', () => {
    const result = computeForeclosureTimeline(createInput(), REF_DATE);

    expect(result.key_dates).toHaveProperty('first_missed_payment');
    expect(result.key_dates).toHaveProperty('lis_pendens_filed');
    expect(result.key_dates).toHaveProperty('judgment_entered');
    expect(result.key_dates).toHaveProperty('auction_scheduled');
  });

  it('auction_date_source is one of valid values', () => {
    const result = computeForeclosureTimeline(createInput(), REF_DATE);

    expect(['confirmed', 'estimated', 'unknown']).toContain(result.auction_date_source);
  });

  it('timeline_position is a valid TimelinePosition', () => {
    const validPositions = [
      'not_in_foreclosure',
      'pre_foreclosure',
      'lis_pendens',
      'judgment',
      'sale_scheduled',
      'redemption_period',
      'reo_bank_owned',
    ];

    const result = computeForeclosureTimeline(createInput(), REF_DATE);
    expect(validPositions).toContain(result.timeline_position);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ESTIMATION ACCURACY TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('computeForeclosureTimeline - Estimation Accuracy', () => {
  it('accounts for days elapsed in lis_pendens stage', () => {
    const result = computeForeclosureTimeline(
      createInput({
        foreclosure_status: 'lis_pendens_filed',
        lis_pendens_date: '2025-12-15', // ~31 days ago from REF_DATE
      }),
      REF_DATE
    );

    // lis_pendens typical: 180, elapsed: 31, remaining: 149
    // + judgment: 45 + sale: 30 = 224 total
    expect(result.days_until_estimated_sale).toBe(224);
  });

  it('accounts for days elapsed in judgment stage', () => {
    const result = computeForeclosureTimeline(
      createInput({
        foreclosure_status: 'judgment_entered',
        judgment_date: '2026-01-01', // ~14 days ago from REF_DATE
      }),
      REF_DATE
    );

    // judgment typical: 45, elapsed: 14, remaining: 31
    // + sale: 30 = 61 total
    expect(result.days_until_estimated_sale).toBe(61);
  });

  it('returns typical days for sale_scheduled without elapsed calculation', () => {
    const result = computeForeclosureTimeline(
      createInput({
        foreclosure_status: 'sale_scheduled',
        auction_date: null,
      }),
      REF_DATE
    );

    // sale_scheduled typical: 30
    expect(result.days_until_estimated_sale).toBe(30);
  });
});
