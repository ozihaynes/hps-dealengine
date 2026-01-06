/**
 * useDealsFilter — Filter state management for deals list
 *
 * Features:
 * - URL state sync (shareable filter links)
 * - Derived counts for pipeline summary
 * - Memoized filtering for performance
 * - Type-safe filter options
 *
 * @module lib/hooks/useDealsFilter
 * @version 1.0.0 (Slice 19)
 */

"use client";

import { useCallback, useMemo } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import {
  normalizeVerdict,
  type VerdictThemeKey,
} from "@/lib/constants/verdictThemes";

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type VerdictFilter = "ALL" | VerdictThemeKey;
export type DateFilter = "ALL" | "TODAY" | "WEEK" | "MONTH";
export type StatusFilter = "ALL" | "ACTIVE" | "ARCHIVED";
export type SortOption = "NEWEST" | "OLDEST" | "HIGHEST_NET" | "LOWEST_NET";

export interface DealFilters {
  verdict: VerdictFilter;
  date: DateFilter;
  status: StatusFilter;
  sort: SortOption;
  search: string;
}

export interface DealForFiltering {
  id: string;
  verdict?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  archived_at?: string | null;
  net_clearance?: number | null;
  address?: string | null;
  client_name?: string | null;
}

export interface PipelineCounts {
  total: number;
  pursue: number;
  needsEvidence: number;
  pass: number;
  pending: number;
}

export interface UseDealsFilterReturn {
  filters: DealFilters;
  setFilter: <K extends keyof DealFilters>(
    key: K,
    value: DealFilters[K]
  ) => void;
  resetFilters: () => void;
  filterDeals: <T extends DealForFiltering>(deals: T[]) => T[];
  getPipelineCounts: (deals: DealForFiltering[]) => PipelineCounts;
  hasActiveFilters: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const DEFAULT_FILTERS: DealFilters = {
  verdict: "ALL",
  date: "ALL",
  status: "ACTIVE",
  sort: "NEWEST",
  search: "",
};

export const FILTER_OPTIONS = {
  verdict: [
    { value: "ALL" as const, label: "All Verdicts" },
    { value: "PURSUE" as const, label: "Pursue" },
    { value: "NEEDS_EVIDENCE" as const, label: "Needs Evidence" },
    { value: "PASS" as const, label: "Pass" },
    { value: "PENDING" as const, label: "Pending" },
  ],
  date: [
    { value: "ALL" as const, label: "All Time" },
    { value: "TODAY" as const, label: "Today" },
    { value: "WEEK" as const, label: "This Week" },
    { value: "MONTH" as const, label: "This Month" },
  ],
  status: [
    { value: "ALL" as const, label: "All Status" },
    { value: "ACTIVE" as const, label: "Active" },
    { value: "ARCHIVED" as const, label: "Archived" },
  ],
  sort: [
    { value: "NEWEST" as const, label: "Newest First" },
    { value: "OLDEST" as const, label: "Oldest First" },
    { value: "HIGHEST_NET" as const, label: "Highest Net" },
    { value: "LOWEST_NET" as const, label: "Lowest Net" },
  ],
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

function isWithinDateRange(
  dateStr: string | null | undefined,
  range: DateFilter
): boolean {
  if (!dateStr || range === "ALL") return true;

  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return true;

  const now = new Date();
  const startOfDay = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );

  switch (range) {
    case "TODAY":
      return date >= startOfDay;
    case "WEEK": {
      const startOfWeek = new Date(startOfDay);
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
      return date >= startOfWeek;
    }
    case "MONTH": {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      return date >= startOfMonth;
    }
    default:
      return true;
  }
}

function matchesSearch(deal: DealForFiltering, search: string): boolean {
  if (!search.trim()) return true;
  const searchLower = search.toLowerCase();
  return !!(
    deal.address?.toLowerCase().includes(searchLower) ||
    deal.client_name?.toLowerCase().includes(searchLower) ||
    deal.id.toLowerCase().includes(searchLower)
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN HOOK
// ═══════════════════════════════════════════════════════════════════════════

export function useDealsFilter(): UseDealsFilterReturn {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Parse filters from URL
  const filters: DealFilters = useMemo(
    () => ({
      verdict:
        (searchParams?.get("verdict") as VerdictFilter) ??
        DEFAULT_FILTERS.verdict,
      date:
        (searchParams?.get("date") as DateFilter) ?? DEFAULT_FILTERS.date,
      status:
        (searchParams?.get("status") as StatusFilter) ??
        DEFAULT_FILTERS.status,
      sort:
        (searchParams?.get("sort") as SortOption) ?? DEFAULT_FILTERS.sort,
      search: searchParams?.get("search") ?? DEFAULT_FILTERS.search,
    }),
    [searchParams]
  );

  // Check if any non-default filters are active
  const hasActiveFilters = useMemo(
    () =>
      filters.verdict !== DEFAULT_FILTERS.verdict ||
      filters.date !== DEFAULT_FILTERS.date ||
      filters.status !== DEFAULT_FILTERS.status ||
      filters.sort !== DEFAULT_FILTERS.sort ||
      filters.search !== DEFAULT_FILTERS.search,
    [filters]
  );

  // Update URL with new filter value
  const setFilter = useCallback(
    <K extends keyof DealFilters>(key: K, value: DealFilters[K]) => {
      const params = new URLSearchParams(searchParams?.toString() ?? "");

      if (value === DEFAULT_FILTERS[key]) {
        params.delete(key);
      } else {
        params.set(key, String(value));
      }

      const queryString = params.toString();
      router.replace(
        queryString ? `${pathname}?${queryString}` : pathname ?? "/deals",
        { scroll: false }
      );
    },
    [searchParams, router, pathname]
  );

  // Reset all filters
  const resetFilters = useCallback(() => {
    router.replace(pathname ?? "/deals", { scroll: false });
  }, [router, pathname]);

  // Filter deals based on current filters
  const filterDeals = useCallback(
    <T extends DealForFiltering>(deals: T[]): T[] => {
      let filtered = [...deals];

      // Filter by verdict
      if (filters.verdict !== "ALL") {
        filtered = filtered.filter((deal) => {
          const normalized = normalizeVerdict(deal.verdict);
          return normalized === filters.verdict;
        });
      }

      // Filter by date
      if (filters.date !== "ALL") {
        filtered = filtered.filter((deal) =>
          isWithinDateRange(deal.updated_at ?? deal.created_at, filters.date)
        );
      }

      // Filter by status
      if (filters.status !== "ALL") {
        filtered = filtered.filter((deal) => {
          const isArchived = !!(deal as { archived_at?: string | null })
            .archived_at;
          return filters.status === "ARCHIVED" ? isArchived : !isArchived;
        });
      }

      // Filter by search
      if (filters.search) {
        filtered = filtered.filter((deal) =>
          matchesSearch(deal, filters.search)
        );
      }

      // Sort
      filtered.sort((a, b) => {
        switch (filters.sort) {
          case "OLDEST":
            return (
              new Date(a.created_at ?? 0).getTime() -
              new Date(b.created_at ?? 0).getTime()
            );
          case "HIGHEST_NET":
            return (b.net_clearance ?? 0) - (a.net_clearance ?? 0);
          case "LOWEST_NET":
            return (a.net_clearance ?? 0) - (b.net_clearance ?? 0);
          case "NEWEST":
          default:
            return (
              new Date(b.updated_at ?? b.created_at ?? 0).getTime() -
              new Date(a.updated_at ?? a.created_at ?? 0).getTime()
            );
        }
      });

      return filtered;
    },
    [filters]
  );

  // Calculate pipeline counts (before filtering)
  const getPipelineCounts = useCallback(
    (deals: DealForFiltering[]): PipelineCounts => {
      const counts: PipelineCounts = {
        total: deals.length,
        pursue: 0,
        needsEvidence: 0,
        pass: 0,
        pending: 0,
      };

      deals.forEach((deal) => {
        const verdict = normalizeVerdict(deal.verdict);
        switch (verdict) {
          case "PURSUE":
            counts.pursue++;
            break;
          case "NEEDS_EVIDENCE":
            counts.needsEvidence++;
            break;
          case "PASS":
            counts.pass++;
            break;
          default:
            counts.pending++;
        }
      });

      return counts;
    },
    []
  );

  return {
    filters,
    setFilter,
    resetFilters,
    filterDeals,
    getPipelineCounts,
    hasActiveFilters,
  };
}

export default useDealsFilter;
