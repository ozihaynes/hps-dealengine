/**
 * Decision Hero Zone Tests — Slice 14
 *
 * Tests for:
 * - DecisionHero container rendering
 * - VerdictReveal animation states
 * - KeyMetricsTrio calculations
 * - PrimaryActionCTA verdict-contextual behavior
 * - Helper function edge cases
 *
 * @module tests/decisionHero
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
// Note: @testing-library/react requires jsdom environment. Component render tests are skipped.
// import { render, screen, fireEvent } from '@testing-library/react';
// import React from 'react';

// ═══════════════════════════════════════════════════════════════════════════
// GLOBAL MOCKS
// ═══════════════════════════════════════════════════════════════════════════

// Mock localStorage for Node environment
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

// @ts-expect-error - Mocking global
global.localStorage = localStorageMock;

// Mock window.location.search for URL params
Object.defineProperty(global, 'window', {
  value: {
    location: {
      search: '',
    },
    localStorage: localStorageMock,
  },
  writable: true,
});

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTION TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe('DecisionHero Helper Functions', () => {
  describe('getSafeVerdict', () => {
    it('returns valid verdicts correctly', async () => {
      const { getSafeVerdict } = await import('@/components/dashboard/hero');
      expect(getSafeVerdict('pursue')).toBe('pursue');
      expect(getSafeVerdict('needs_evidence')).toBe('needs_evidence');
      expect(getSafeVerdict('pass')).toBe('pass');
    });

    it('normalizes case', async () => {
      const { getSafeVerdict } = await import('@/components/dashboard/hero');
      expect(getSafeVerdict('PURSUE')).toBe('pursue');
      expect(getSafeVerdict('Pursue')).toBe('pursue');
      expect(getSafeVerdict('  pursue  ')).toBe('pursue');
    });

    it('returns unknown for invalid input', async () => {
      const { getSafeVerdict } = await import('@/components/dashboard/hero');
      expect(getSafeVerdict(null)).toBe('unknown');
      expect(getSafeVerdict(undefined)).toBe('unknown');
      expect(getSafeVerdict('')).toBe('unknown');
      expect(getSafeVerdict('invalid')).toBe('unknown');
    });
  });

  describe('safeNumber', () => {
    it('returns valid numbers', async () => {
      const { safeNumber } = await import('@/components/dashboard/hero');
      expect(safeNumber(42)).toBe(42);
      expect(safeNumber(0)).toBe(0);
      expect(safeNumber(-10)).toBe(-10);
      expect(safeNumber(3.14159)).toBe(3.14159);
    });

    it('returns null for invalid values', async () => {
      const { safeNumber } = await import('@/components/dashboard/hero');
      expect(safeNumber(null)).toBe(null);
      expect(safeNumber(undefined)).toBe(null);
      expect(safeNumber(NaN)).toBe(null);
      expect(safeNumber(Infinity)).toBe(null);
      expect(safeNumber(-Infinity)).toBe(null);
    });
  });

  describe('formatCurrency', () => {
    it('formats small amounts', async () => {
      const { formatCurrency } = await import('@/components/dashboard/hero');
      expect(formatCurrency(500)).toBe('$500');
      expect(formatCurrency(999)).toBe('$999');
    });

    it('formats thousands with K suffix', async () => {
      const { formatCurrency } = await import('@/components/dashboard/hero');
      expect(formatCurrency(5000)).toBe('$5K');
      expect(formatCurrency(26500)).toBe('$26.5K');
      expect(formatCurrency(100000)).toBe('$100K');
    });

    it('formats millions with M suffix', async () => {
      const { formatCurrency } = await import('@/components/dashboard/hero');
      expect(formatCurrency(1000000)).toBe('$1.0M');
      expect(formatCurrency(2500000)).toBe('$2.5M');
    });

    it('handles boundary at $999,500', async () => {
      const { formatCurrency } = await import('@/components/dashboard/hero');
      // Under boundary uses K
      expect(formatCurrency(999499)).toBe('$999.5K');
      // At or above boundary uses M
      expect(formatCurrency(999500)).toBe('$1.0M');
    });

    it('handles negative values', async () => {
      const { formatCurrency } = await import('@/components/dashboard/hero');
      expect(formatCurrency(-5000)).toBe('-$5K');
      expect(formatCurrency(-1500000)).toBe('-$1.5M');
    });

    it('returns em dash for null/undefined', async () => {
      const { formatCurrency } = await import('@/components/dashboard/hero');
      expect(formatCurrency(null)).toBe('—');
      expect(formatCurrency(undefined)).toBe('—');
    });
  });

  describe('formatPercent', () => {
    it('formats valid percentages', async () => {
      const { formatPercent } = await import('@/components/dashboard/hero');
      expect(formatPercent(50)).toBe('50.0%');
      expect(formatPercent(9.58)).toBe('9.6%');
      expect(formatPercent(100)).toBe('100.0%');
    });

    it('returns em dash for invalid values', async () => {
      const { formatPercent } = await import('@/components/dashboard/hero');
      expect(formatPercent(null)).toBe('—');
      expect(formatPercent(undefined)).toBe('—');
      expect(formatPercent(-10)).toBe('—');
    });
  });

  describe('getBestNet', () => {
    it('extracts net from recommended exit', async () => {
      const { getBestNet } = await import('@/components/dashboard/hero');

      const assignmentClearance = {
        recommended_exit: 'assignment' as const,
        assignment: { gross: 27000, costs: 500, net: 26500, margin_pct: 98.1, cost_breakdown: { title_fees: 0, closing_costs: 0, transfer_tax: 0, carry_costs: 0, other: 500 } },
        double_close: { gross: 34300, costs: 8460, net: 25840, margin_pct: 75.3, cost_breakdown: { title_fees: 0, closing_costs: 3500, transfer_tax: 0, carry_costs: 700, other: 4260 } },
        wholetail: { gross: 74200, costs: 47821, net: 26379, margin_pct: 35.6, cost_breakdown: { title_fees: 0, closing_costs: 3500, transfer_tax: 0, carry_costs: 5400, other: 38921 } },
        recommendation_reason: 'Test',
        wholetail_viable: true,
        min_spread_threshold: 15000,
      };

      const result = getBestNet(assignmentClearance);
      expect(result.net).toBe(26500);
      expect(result.exit).toBe('assignment');
    });

    it('returns null net for missing clearance', async () => {
      const { getBestNet } = await import('@/components/dashboard/hero');
      expect(getBestNet(null)).toEqual({ net: null, exit: 'unknown' });
      expect(getBestNet(undefined)).toEqual({ net: null, exit: 'unknown' });
    });
  });

  describe('getZopaDisplay', () => {
    it('formats valid ZOPA', async () => {
      const { getZopaDisplay } = await import('@/components/dashboard/hero');

      const geometry = {
        respect_floor: 177500,
        dominant_floor: 'investor' as const,
        floor_investor: 177500,
        floor_payoff: 152000,
        buyer_ceiling: 222300,
        seller_strike: 195000,
        zopa: 27300,
        zopa_pct_of_arv: 9.58,
        zopa_exists: true,
        zopa_band: 'moderate' as const,
        entry_point: 191150,
        entry_point_pct_of_zopa: 50.0,
        entry_posture: 'balanced' as const,
      };

      const result = getZopaDisplay(geometry);
      expect(result.exists).toBe(true);
      expect(result.zopa).toBe('$27.3K');
      expect(result.pctOfArv).toBe('9.6%');
    });

    it('returns "No ZOPA" when zopa_exists is false', async () => {
      const { getZopaDisplay } = await import('@/components/dashboard/hero');

      const geometry = {
        respect_floor: 177500,
        dominant_floor: 'investor' as const,
        floor_investor: 177500,
        floor_payoff: 152000,
        buyer_ceiling: 222300,
        seller_strike: 195000,
        zopa: 0,
        zopa_pct_of_arv: 0,
        zopa_exists: false,
        zopa_band: 'none' as const,
        entry_point: 191150,
        entry_point_pct_of_zopa: 0,
        entry_posture: 'balanced' as const,
      };

      const result = getZopaDisplay(geometry);
      expect(result.exists).toBe(false);
      expect(result.zopa).toBe('No ZOPA');
    });
  });

  describe('getGatesSummary', () => {
    it('counts gates correctly', async () => {
      const { getGatesSummary } = await import('@/components/dashboard/hero');

      const summary = {
        overall: 'pass' as const,
        gates: {
          insurability: { status: 'pass' as const, reason: null, severity: null, resolution_action: null, is_blocking: false },
          title: { status: 'pass' as const, reason: null, severity: null, resolution_action: null, is_blocking: false },
          flood: { status: 'pass' as const, reason: null, severity: null, resolution_action: null, is_blocking: false },
          bankruptcy: { status: 'pass' as const, reason: null, severity: null, resolution_action: null, is_blocking: false },
          liens: { status: 'pass' as const, reason: null, severity: null, resolution_action: null, is_blocking: false },
          condition: { status: 'pass' as const, reason: null, severity: null, resolution_action: null, is_blocking: false },
          market: { status: 'pass' as const, reason: null, severity: null, resolution_action: null, is_blocking: false },
          compliance: { status: 'pass' as const, reason: null, severity: null, resolution_action: null, is_blocking: false },
        },
        any_blocking: false,
        fail_count: 0,
        watch_count: 0,
        blocking_gates: [],
        attention_gates: [],
        reasons: [],
        max_severity: null,
      };

      const result = getGatesSummary(summary);
      expect(result.pass).toBe(8);
      expect(result.total).toBe(8);
      expect(result.blocking).toBe(0);
    });

    it('returns zeros for null summary', async () => {
      const { getGatesSummary } = await import('@/components/dashboard/hero');
      expect(getGatesSummary(null)).toEqual({ pass: 0, total: 0, blocking: 0 });
    });
  });

  describe('getConfidenceLevel', () => {
    it('returns correct levels', async () => {
      const { getConfidenceLevel } = await import('@/components/dashboard/hero');
      expect(getConfidenceLevel(92)).toBe('high');
      expect(getConfidenceLevel(80)).toBe('high');
      expect(getConfidenceLevel(79)).toBe('medium');
      expect(getConfidenceLevel(50)).toBe('medium');
      expect(getConfidenceLevel(49)).toBe('low');
      expect(getConfidenceLevel(0)).toBe('low');
    });

    it('returns null for null input', async () => {
      const { getConfidenceLevel } = await import('@/components/dashboard/hero');
      expect(getConfidenceLevel(null)).toBe(null);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// VERDICT CONFIG TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe('Verdict Configuration', () => {
  describe('VERDICT_THEME', () => {
    it('has theme for all verdict types', async () => {
      const { VERDICT_THEME } = await import('@/components/dashboard/hero');
      expect(VERDICT_THEME.pursue).toBeDefined();
      expect(VERDICT_THEME.needs_evidence).toBeDefined();
      expect(VERDICT_THEME.pass).toBeDefined();
      expect(VERDICT_THEME.unknown).toBeDefined();
    });

    it('pursue has emerald colors', async () => {
      const { VERDICT_THEME } = await import('@/components/dashboard/hero');
      expect(VERDICT_THEME.pursue.glowGradient).toContain('emerald');
      expect(VERDICT_THEME.pursue.borderColor).toContain('emerald');
    });

    it('needs_evidence has amber colors', async () => {
      const { VERDICT_THEME } = await import('@/components/dashboard/hero');
      expect(VERDICT_THEME.needs_evidence.glowGradient).toContain('amber');
      expect(VERDICT_THEME.needs_evidence.borderColor).toContain('amber');
    });
  });

  describe('VERDICT_CONFIG', () => {
    it('has config for all verdict types', async () => {
      const { VERDICT_CONFIG } = await import('@/components/dashboard/hero');
      expect(VERDICT_CONFIG.pursue).toBeDefined();
      expect(VERDICT_CONFIG.needs_evidence).toBeDefined();
      expect(VERDICT_CONFIG.pass).toBeDefined();
      expect(VERDICT_CONFIG.unknown).toBeDefined();
    });

    it('has correct labels', async () => {
      const { VERDICT_CONFIG } = await import('@/components/dashboard/hero');
      expect(VERDICT_CONFIG.pursue.label).toBe('PURSUE');
      expect(VERDICT_CONFIG.needs_evidence.label).toBe('NEEDS EVIDENCE');
      expect(VERDICT_CONFIG.pass.label).toBe('PASS');
      expect(VERDICT_CONFIG.unknown.label).toBe('ANALYZING');
    });
  });

  describe('CTA_CONFIG', () => {
    it('has config for all verdict types', async () => {
      const { CTA_CONFIG } = await import('@/components/dashboard/hero');
      expect(CTA_CONFIG.pursue).toBeDefined();
      expect(CTA_CONFIG.needs_evidence).toBeDefined();
      expect(CTA_CONFIG.pass).toBeDefined();
      expect(CTA_CONFIG.unknown).toBeDefined();
    });

    it('has correct CTA labels', async () => {
      const { CTA_CONFIG } = await import('@/components/dashboard/hero');
      expect(CTA_CONFIG.pursue.label).toBe('Generate Offer');
      expect(CTA_CONFIG.needs_evidence.label).toBe('Request Evidence');
      expect(CTA_CONFIG.pass.label).toBe('Archive Deal');
      expect(CTA_CONFIG.unknown.label).toBe('Analyzing...');
    });

    it('only needs_evidence shows secondary button', async () => {
      const { CTA_CONFIG } = await import('@/components/dashboard/hero');
      expect(CTA_CONFIG.pursue.showSecondary).toBe(false);
      expect(CTA_CONFIG.needs_evidence.showSecondary).toBe(true);
      expect(CTA_CONFIG.pass.showSecondary).toBe(false);
      expect(CTA_CONFIG.unknown.showSecondary).toBe(false);
    });

    it('only unknown is disabled by default', async () => {
      const { CTA_CONFIG } = await import('@/components/dashboard/hero');
      expect(CTA_CONFIG.pursue.disabled).toBe(false);
      expect(CTA_CONFIG.needs_evidence.disabled).toBe(false);
      expect(CTA_CONFIG.pass.disabled).toBe(false);
      expect(CTA_CONFIG.unknown.disabled).toBe(true);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// EXIT LABELS TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe('Exit Strategy Labels', () => {
  it('has all exit types', async () => {
    const { EXIT_LABELS } = await import('@/components/dashboard/hero');
    expect(EXIT_LABELS.assignment).toBe('Assignment');
    expect(EXIT_LABELS.double_close).toBe('Double Close');
    expect(EXIT_LABELS.wholetail).toBe('Wholetail');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// VARIANT STYLES TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe('Metric Card Variant Styles', () => {
  it('has all variants', async () => {
    const { VARIANT_STYLES } = await import('@/components/dashboard/hero');
    expect(VARIANT_STYLES.positive).toBeDefined();
    expect(VARIANT_STYLES.warning).toBeDefined();
    expect(VARIANT_STYLES.neutral).toBeDefined();
    expect(VARIANT_STYLES.negative).toBeDefined();
  });

  it('positive has emerald colors', async () => {
    const { VARIANT_STYLES } = await import('@/components/dashboard/hero');
    expect(VARIANT_STYLES.positive.border).toContain('emerald');
    expect(VARIANT_STYLES.positive.text).toContain('emerald');
  });

  it('warning has amber colors', async () => {
    const { VARIANT_STYLES } = await import('@/components/dashboard/hero');
    expect(VARIANT_STYLES.warning.border).toContain('amber');
    expect(VARIANT_STYLES.warning.text).toContain('amber');
  });

  it('negative has red colors', async () => {
    const { VARIANT_STYLES } = await import('@/components/dashboard/hero');
    expect(VARIANT_STYLES.negative.border).toContain('red');
    expect(VARIANT_STYLES.negative.text).toContain('red');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// CONFIDENCE COLORS TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe('Confidence Colors', () => {
  it('has all levels', async () => {
    const { CONFIDENCE_COLORS } = await import('@/components/dashboard/hero');
    expect(CONFIDENCE_COLORS.high).toBeDefined();
    expect(CONFIDENCE_COLORS.medium).toBeDefined();
    expect(CONFIDENCE_COLORS.low).toBeDefined();
  });

  it('uses correct colors per level', async () => {
    const { CONFIDENCE_COLORS } = await import('@/components/dashboard/hero');
    expect(CONFIDENCE_COLORS.high).toContain('emerald');
    expect(CONFIDENCE_COLORS.medium).toContain('amber');
    expect(CONFIDENCE_COLORS.low).toContain('red');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT RENDER TESTS
// ═══════════════════════════════════════════════════════════════════════════

// NOTE: Component render tests require jsdom environment which is not installed.
// To add component render tests:
// 1. Install jsdom: pnpm add -D jsdom
// 2. Add @vitest-environment jsdom directive to this file
// 3. Uncomment @testing-library/react import
// 4. Add tests using render, screen, fireEvent
//
// Tests to add (documented for future implementation):
// - VerdictReveal: renders with each verdict type, shows confidence badge, handles null
// - PrimaryActionCTA: renders with each verdict, click handlers, loading state, secondary button
// - KeyMetricsTrio: renders all cards, displays values correctly, handles null data
