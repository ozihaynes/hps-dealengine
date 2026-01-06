/**
 * usePortfolioData Hook
 *
 * Fetches all deals for the current user and computes aggregate metrics
 * for the Portfolio Dashboard. Provides sorting, filtering, and grouping
 * capabilities.
 *
 * KEY BEHAVIORS:
 * - Fetches all deals via Supabase with RLS (user sees only their deals)
 * - Computes aggregate metrics (totals, averages, distributions)
 * - Groups deals by verdict for pipeline visualization
 * - Supports filtering by status, verdict, date range
 * - All operations are type-safe with proper null handling
 *
 * @module dashboard/usePortfolioData
 * @version 1.0.0 (Slice 16 - Portfolio Dashboard)
 */

"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { createBrowserClient } from "@supabase/ssr";

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

/** Verdict types for deal analysis */
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
  /** Last analysis run timestamp */
  last_run_at: string | null;
  /** L2 Scores from last analysis */
  closeability_index: number;
  urgency_score: number;
  risk_adjusted_spread: number;
  buyer_demand_index: number;
  /** Derived verdict */
  verdict: VerdictType;
  /** Has analysis been run? */
  has_analysis: boolean;
  /** ARV from last valuation */
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
  /** Total number of deals */
  totalDeals: number;
  /** Deals with analysis run */
  analyzedDeals: number;
  /** Deals awaiting analysis */
  pendingDeals: number;
  /** Total pipeline value (sum of ARVs) */
  totalPipelineValue: number;
  /** Total spread opportunity */
  totalSpreadOpportunity: number;
  /** Average closeability across all deals */
  avgCloseability: number;
  /** Average urgency across all deals */
  avgUrgency: number;
  /** Deals by verdict */
  byVerdict: {
    GO: number;
    PROCEED_WITH_CAUTION: number;
    HOLD: number;
    PASS: number;
  };
  /** Deals by status */
  byStatus: {
    active: number;
    under_contract: number;
    closed: number;
    archived: number;
  };
}

export type SortField = "address" | "verdict" | "closeability" | "urgency" | "spread" | "updated";
export type SortDirection = "asc" | "desc";

export interface FilterOptions {
  status: DealStatus | "all";
  verdict: VerdictType | "all";
  hasAnalysis: boolean | "all";
  searchQuery: string;
}

export interface PortfolioData {
  /** All deals for the user */
  deals: DealSummary[];
  /** Aggregated metrics */
  metrics: PortfolioMetrics;
  /** Deals grouped by verdict */
  verdictGroups: VerdictGroup[];
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: string | null;
  /** Refresh function */
  refresh: () => Promise<void>;
  /** Current sort */
  sort: { field: SortField; direction: SortDirection };
  /** Update sort */
  setSort: (field: SortField, direction?: SortDirection) => void;
  /** Current filters */
  filters: FilterOptions;
  /** Update filters */
  setFilters: (filters: Partial<FilterOptions>) => void;
  /** Filtered and sorted deals */
  filteredDeals: DealSummary[];
}

// ═══════════════════════════════════════════════════════════════════════════
// DEFAULT VALUES
// ═══════════════════════════════════════════════════════════════════════════

const DEFAULT_METRICS: PortfolioMetrics = {
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

const DEFAULT_FILTERS: FilterOptions = {
  status: "all",
  verdict: "all",
  hasAnalysis: "all",
  searchQuery: "",
};

// ═══════════════════════════════════════════════════════════════════════════
// VERDICT DERIVATION (matches useOverviewData logic)
// ═══════════════════════════════════════════════════════════════════════════

function deriveVerdict(
  closeability: number,
  urgency: number,
  spread: number
): VerdictType {
  if (urgency >= 90 && closeability < 60) return "PASS";
  if (closeability >= 80 && spread >= 30000) return "GO";
  if (closeability >= 60 && spread >= 15000) return "PROCEED_WITH_CAUTION";
  if (closeability >= 40) return "HOLD";
  return "PASS";
}

// ═══════════════════════════════════════════════════════════════════════════
// METRICS COMPUTATION
// ═══════════════════════════════════════════════════════════════════════════

function computeMetrics(deals: DealSummary[]): PortfolioMetrics {
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

function groupByVerdict(deals: DealSummary[]): VerdictGroup[] {
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
// HOOK
// ═══════════════════════════════════════════════════════════════════════════

export function usePortfolioData(): PortfolioData {
  const [deals, setDeals] = useState<DealSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sort, setSortState] = useState<{ field: SortField; direction: SortDirection }>({
    field: "updated",
    direction: "desc",
  });
  const [filters, setFiltersState] = useState<FilterOptions>(DEFAULT_FILTERS);

  // Create Supabase client
  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  );

  // Fetch deals
  const fetchDeals = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch deals with latest run info
      const { data: rawDeals, error: fetchError } = await supabase
        .from("deals")
        .select(
          `
          id,
          address,
          city,
          state,
          zip,
          status,
          created_at,
          updated_at,
          runs:runs(
            id,
            created_at,
            outputs
          )
        `
        )
        .order("updated_at", { ascending: false });

      if (fetchError) {
        throw new Error(fetchError.message);
      }

      // Transform to DealSummary with computed fields
      const transformedDeals: DealSummary[] = (rawDeals || []).map((deal) => {
        // Get latest run
        const runs = deal.runs as Array<{
          id: string;
          created_at: string;
          outputs: Record<string, unknown> | null;
        }> | null;
        
        const latestRun = runs && runs.length > 0
          ? runs.reduce((latest, run) =>
              new Date(run.created_at) > new Date(latest.created_at) ? run : latest
            )
          : null;

        const outputs = latestRun?.outputs ?? null;
        const hasAnalysis = !!outputs;

        // Extract scores with safe fallbacks
        const closeability = hasAnalysis
          ? Number(
              (outputs as Record<string, unknown>)?.closeability_index ??
              (outputs as Record<string, unknown>)?.closeability ??
              0
            )
          : 0;
        const urgency = hasAnalysis
          ? Number(
              (outputs as Record<string, unknown>)?.urgency_score ??
              (outputs as Record<string, unknown>)?.urgency ??
              0
            )
          : 0;
        const spread = hasAnalysis
          ? Number(
              (outputs as Record<string, unknown>)?.spread_cash ??
              (outputs as Record<string, unknown>)?.risk_adjusted_spread ??
              0
            )
          : 0;
        const demand = hasAnalysis
          ? Number(
              (outputs as Record<string, unknown>)?.buyer_demand_index ??
              (outputs as Record<string, unknown>)?.buyer_demand ??
              0
            )
          : 0;
        const arv = hasAnalysis
          ? Number((outputs as Record<string, unknown>)?.arv ?? 0) || null
          : null;

        // Derive verdict
        const verdict = hasAnalysis ? deriveVerdict(closeability, urgency, spread) : "HOLD";

        return {
          id: deal.id,
          address: deal.address,
          city: deal.city,
          state: deal.state,
          zip: deal.zip,
          status: (deal.status as DealStatus) || "active",
          created_at: deal.created_at,
          updated_at: deal.updated_at,
          last_run_at: latestRun?.created_at ?? null,
          closeability_index: Math.min(100, Math.max(0, closeability)),
          urgency_score: Math.min(100, Math.max(0, urgency)),
          risk_adjusted_spread: spread,
          buyer_demand_index: Math.min(100, Math.max(0, demand)),
          verdict,
          has_analysis: hasAnalysis,
          arv,
        };
      });

      setDeals(transformedDeals);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch deals";
      setError(message);
      console.error("[usePortfolioData] Fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  // Initial fetch
  useEffect(() => {
    fetchDeals();
  }, [fetchDeals]);

  // Compute metrics
  const metrics = useMemo(() => computeMetrics(deals), [deals]);

  // Group by verdict
  const verdictGroups = useMemo(() => groupByVerdict(deals), [deals]);

  // Apply filters
  const filteredDeals = useMemo(() => {
    let result = [...deals];

    // Status filter
    if (filters.status !== "all") {
      result = result.filter((d) => d.status === filters.status);
    }

    // Verdict filter
    if (filters.verdict !== "all") {
      result = result.filter((d) => d.verdict === filters.verdict);
    }

    // Has analysis filter
    if (filters.hasAnalysis !== "all") {
      result = result.filter((d) => d.has_analysis === filters.hasAnalysis);
    }

    // Search query
    if (filters.searchQuery.trim()) {
      const query = filters.searchQuery.toLowerCase();
      result = result.filter(
        (d) =>
          d.address.toLowerCase().includes(query) ||
          d.city?.toLowerCase().includes(query) ||
          d.zip?.includes(query)
      );
    }

    // Apply sort
    result.sort((a, b) => {
      let comparison = 0;

      switch (sort.field) {
        case "address":
          comparison = a.address.localeCompare(b.address);
          break;
        case "verdict":
          const verdictOrder: Record<VerdictType, number> = {
            GO: 0,
            PROCEED_WITH_CAUTION: 1,
            HOLD: 2,
            PASS: 3,
          };
          comparison = verdictOrder[a.verdict] - verdictOrder[b.verdict];
          break;
        case "closeability":
          comparison = a.closeability_index - b.closeability_index;
          break;
        case "urgency":
          comparison = a.urgency_score - b.urgency_score;
          break;
        case "spread":
          comparison = a.risk_adjusted_spread - b.risk_adjusted_spread;
          break;
        case "updated":
          comparison = new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
          break;
      }

      return sort.direction === "asc" ? comparison : -comparison;
    });

    return result;
  }, [deals, filters, sort]);

  // Sort handler
  const setSort = useCallback((field: SortField, direction?: SortDirection) => {
    setSortState((prev) => ({
      field,
      direction: direction ?? (prev.field === field && prev.direction === "desc" ? "asc" : "desc"),
    }));
  }, []);

  // Filters handler
  const setFilters = useCallback((newFilters: Partial<FilterOptions>) => {
    setFiltersState((prev) => ({ ...prev, ...newFilters }));
  }, []);

  return {
    deals,
    metrics,
    verdictGroups,
    isLoading,
    error,
    refresh: fetchDeals,
    sort,
    setSort,
    filters,
    setFilters,
    filteredDeals,
  };
}

export default usePortfolioData;
