/**
 * Portfolio Engine Utilities
 *
 * Pure functions extracted from usePortfolioData and useOverviewData hooks
 * for testability. These functions handle all business logic and can be
 * tested independently of React hooks.
 *
 * KEY PRINCIPLE: All calculations must be deterministic - same inputs
 * always produce same outputs.
 *
 * @module lib/engine/portfolio-utils
 * @version 1.0.0 (Slice 17 - Unit Tests)
 */

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type VerdictType = "GO" | "PROCEED_WITH_CAUTION" | "HOLD" | "PASS";
export type DealStatus = "active" | "under_contract" | "closed" | "archived";

export interface DealSummary {
  id: string;
  address: string;
  city: string | null;
  state: string | null;
  zip: string | null;
  status: DealStatus;
  created_at: string;
  updated_at: string;
  last_run_at: string | null;
  closeability_index: number;
  urgency_score: number;
  risk_adjusted_spread: number;
  buyer_demand_index: number;
  verdict: VerdictType;
  has_analysis: boolean;
  arv: number | null;
}

export interface VerdictGroup {
  verdict: VerdictType;
  count: number;
  deals: DealSummary[];
  totalSpread: number;
  avgCloseability: number;
}

export interface PortfolioMetrics {
  totalDeals: number;
  analyzedDeals: number;
  pendingDeals: number;
  totalPipelineValue: number;
  totalSpreadOpportunity: number;
  avgCloseability: number;
  avgUrgency: number;
  byVerdict: {
    GO: number;
    PROCEED_WITH_CAUTION: number;
    HOLD: number;
    PASS: number;
  };
  byStatus: {
    active: number;
    under_contract: number;
    closed: number;
    archived: number;
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// DEFAULT VALUES
// ═══════════════════════════════════════════════════════════════════════════

export const DEFAULT_METRICS: PortfolioMetrics = {
  totalDeals: 0,
  analyzedDeals: 0,
  pendingDeals: 0,
  totalPipelineValue: 0,
  totalSpreadOpportunity: 0,
  avgCloseability: 0,
  avgUrgency: 0,
  byVerdict: { GO: 0, PROCEED_WITH_CAUTION: 0, HOLD: 0, PASS: 0 },
  byStatus: { active: 0, under_contract: 0, closed: 0, archived: 0 },
};

// ═══════════════════════════════════════════════════════════════════════════
// VERDICT DERIVATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Derives a verdict based on closeability, urgency, and spread.
 *
 * BUSINESS RULES:
 * 1. High urgency (>=90) + Low closeability (<60) = PASS (time crunch, unlikely to close)
 * 2. High closeability (>=80) + Good spread (>=30k) = GO (ready to pursue)
 * 3. Medium closeability (>=60) + Decent spread (>=15k) = PROCEED_WITH_CAUTION
 * 4. Low-medium closeability (>=40) = HOLD (needs more work)
 * 5. Everything else = PASS
 *
 * @param closeability - Closeability index (0-100)
 * @param urgency - Urgency score (0-100)
 * @param spread - Risk-adjusted spread in dollars
 * @returns VerdictType
 */
export function deriveVerdict(
  closeability: number,
  urgency: number,
  spread: number
): VerdictType {
  // Rule 1: Time crunch with low probability - don't pursue
  if (urgency >= 90 && closeability < 60) return "PASS";

  // Rule 2: High closeability + good spread = GO
  if (closeability >= 80 && spread >= 30000) return "GO";

  // Rule 3: Medium closeability + decent spread = proceed carefully
  if (closeability >= 60 && spread >= 15000) return "PROCEED_WITH_CAUTION";

  // Rule 4: Low-medium closeability = hold for now
  if (closeability >= 40) return "HOLD";

  // Rule 5: Default to PASS
  return "PASS";
}

// ═══════════════════════════════════════════════════════════════════════════
// METRICS COMPUTATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Computes aggregate portfolio metrics from a list of deals.
 *
 * DETERMINISM: This function must produce identical outputs for identical inputs.
 * All calculations use simple arithmetic with no external dependencies.
 *
 * @param deals - Array of DealSummary objects
 * @returns PortfolioMetrics
 */
export function computeMetrics(deals: DealSummary[]): PortfolioMetrics {
  if (deals.length === 0) return DEFAULT_METRICS;

  const analyzedDeals = deals.filter((d) => d.has_analysis);
  const totalPipelineValue = deals.reduce((sum, d) => sum + (d.arv ?? 0), 0);
  const totalSpreadOpportunity = deals.reduce((sum, d) => sum + d.risk_adjusted_spread, 0);

  const sumCloseability = analyzedDeals.reduce((sum, d) => sum + d.closeability_index, 0);
  const sumUrgency = analyzedDeals.reduce((sum, d) => sum + d.urgency_score, 0);

  const byVerdict = {
    GO: deals.filter((d) => d.verdict === "GO").length,
    PROCEED_WITH_CAUTION: deals.filter((d) => d.verdict === "PROCEED_WITH_CAUTION").length,
    HOLD: deals.filter((d) => d.verdict === "HOLD").length,
    PASS: deals.filter((d) => d.verdict === "PASS").length,
  };

  const byStatus = {
    active: deals.filter((d) => d.status === "active").length,
    under_contract: deals.filter((d) => d.status === "under_contract").length,
    closed: deals.filter((d) => d.status === "closed").length,
    archived: deals.filter((d) => d.status === "archived").length,
  };

  return {
    totalDeals: deals.length,
    analyzedDeals: analyzedDeals.length,
    pendingDeals: deals.length - analyzedDeals.length,
    totalPipelineValue,
    totalSpreadOpportunity,
    avgCloseability: analyzedDeals.length > 0 ? Math.round(sumCloseability / analyzedDeals.length) : 0,
    avgUrgency: analyzedDeals.length > 0 ? Math.round(sumUrgency / analyzedDeals.length) : 0,
    byVerdict,
    byStatus,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// VERDICT GROUPING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Groups deals by verdict and computes group-level metrics.
 *
 * @param deals - Array of DealSummary objects
 * @returns Array of VerdictGroup objects (always 4, in order: GO, PWC, HOLD, PASS)
 */
export function groupByVerdict(deals: DealSummary[]): VerdictGroup[] {
  const verdicts: VerdictType[] = ["GO", "PROCEED_WITH_CAUTION", "HOLD", "PASS"];

  return verdicts.map((verdict) => {
    const groupDeals = deals.filter((d) => d.verdict === verdict);
    const totalSpread = groupDeals.reduce((sum, d) => sum + d.risk_adjusted_spread, 0);
    const avgCloseability =
      groupDeals.length > 0
        ? Math.round(groupDeals.reduce((sum, d) => sum + d.closeability_index, 0) / groupDeals.length)
        : 0;

    return {
      verdict,
      count: groupDeals.length,
      deals: groupDeals,
      totalSpread,
      avgCloseability,
    };
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// FORMATTERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Formats a number as currency with K/M suffixes.
 *
 * @param value - Number to format
 * @returns Formatted string (e.g., "$1.5M", "$250K", "$500")
 */
export function formatCurrency(value: number): string {
  const absValue = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (absValue >= 1_000_000) {
    return `$${sign}${(absValue / 1_000_000).toFixed(1)}M`;
  }
  if (absValue >= 1_000) {
    return `$${sign}${(absValue / 1_000).toFixed(0)}K`;
  }
  return `$${value.toLocaleString()}`;
}

/**
 * Formats a number as a percentage.
 *
 * @param value - Number to format (0-100)
 * @returns Formatted string (e.g., "75%")
 */
export function formatPercent(value: number): string {
  return `${Math.round(value)}%`;
}

/**
 * Formats a date string as relative time.
 *
 * @param dateString - ISO date string
 * @returns Relative time string (e.g., "2h ago", "3d ago")
 */
export function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 1) return "Just now";
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return date.toLocaleDateString();
}

// ═══════════════════════════════════════════════════════════════════════════
// SCORE CLAMPING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Clamps a score to valid 0-100 range.
 *
 * @param value - Raw score value
 * @returns Clamped value between 0 and 100
 */
export function clampScore(value: number): number {
  return Math.min(100, Math.max(0, value));
}

/**
 * Safely extracts a numeric value from unknown data with fallback.
 *
 * @param data - Unknown data object
 * @param keys - Array of keys to try in order
 * @param fallback - Default value if no key found
 * @returns Extracted number or fallback
 */
export function extractNumber(
  data: Record<string, unknown> | null | undefined,
  keys: string[],
  fallback: number = 0
): number {
  if (!data) return fallback;

  for (const key of keys) {
    const value = data[key];
    if (value !== undefined && value !== null) {
      const num = Number(value);
      if (!Number.isNaN(num)) {
        return num;
      }
    }
  }

  return fallback;
}
