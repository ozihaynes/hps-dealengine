/**
 * DealsFilter — Filter controls for deals list
 *
 * @module components/deals/DealsFilter
 * @version 1.0.0 (Slice 19)
 */

"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import { cn } from "@/components/ui";
import {
  FILTER_OPTIONS,
  type DealFilters,
  type VerdictFilter,
  type DateFilter,
  type StatusFilter,
  type SortOption,
} from "@/lib/hooks/useDealsFilter";

export interface DealsFilterProps {
  filters: DealFilters;
  onFilterChange: <K extends keyof DealFilters>(
    key: K,
    value: DealFilters[K]
  ) => void;
  onReset?: () => void;
  hasActiveFilters?: boolean;
  className?: string;
  testId?: string;
}

interface FilterSelectProps<T extends string> {
  label: string;
  value: T;
  options: readonly { readonly value: T; readonly label: string }[];
  onChange: (value: T) => void;
  testId?: string;
}

function FilterSelect<T extends string>({
  label,
  value,
  options,
  onChange,
  testId,
}: FilterSelectProps<T>) {
  return (
    <div className="flex flex-col gap-1">
      <label className="sr-only">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className={cn(
          "h-10 min-h-[44px] px-3", // Touch target 44px
          "rounded-lg text-sm",
          "bg-[var(--card-bg-solid)] border border-white/10",
          "text-slate-100",
          "focus:outline-none focus:ring-2 focus:ring-slate-500",
          "cursor-pointer"
        )}
        data-testid={testId}
        aria-label={label}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export const DealsFilter = memo(function DealsFilter({
  filters,
  onFilterChange,
  onReset,
  hasActiveFilters = false,
  className,
  testId,
}: DealsFilterProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("flex flex-wrap items-center gap-3", className)}
      data-testid={testId ?? "deals-filter"}
      role="search"
      aria-label="Filter deals"
    >
      {/* Search Input */}
      <div className="flex-1 min-w-[200px]">
        <label className="sr-only">Search deals</label>
        <input
          type="search"
          placeholder="Search by address or client..."
          value={filters.search}
          onChange={(e) => onFilterChange("search", e.target.value)}
          className={cn(
            "w-full h-10 min-h-[44px] px-3",
            "rounded-lg text-sm",
            "bg-[var(--card-bg-solid)] border border-white/10",
            "text-slate-100 placeholder:text-slate-500",
            "focus:outline-none focus:ring-2 focus:ring-slate-500"
          )}
          data-testid="deals-search-input"
        />
      </div>

      {/* Filter Selects */}
      <div className="flex flex-wrap items-center gap-2">
        <FilterSelect<VerdictFilter>
          label="Filter by verdict"
          value={filters.verdict}
          options={FILTER_OPTIONS.verdict}
          onChange={(v) => onFilterChange("verdict", v)}
          testId="filter-verdict"
        />

        <FilterSelect<DateFilter>
          label="Filter by date"
          value={filters.date}
          options={FILTER_OPTIONS.date}
          onChange={(v) => onFilterChange("date", v)}
          testId="filter-date"
        />

        <FilterSelect<StatusFilter>
          label="Filter by status"
          value={filters.status}
          options={FILTER_OPTIONS.status}
          onChange={(v) => onFilterChange("status", v)}
          testId="filter-status"
        />

        <FilterSelect<SortOption>
          label="Sort by"
          value={filters.sort}
          options={FILTER_OPTIONS.sort}
          onChange={(v) => onFilterChange("sort", v)}
          testId="filter-sort"
        />

        {/* Reset Button */}
        {hasActiveFilters && onReset && (
          <button
            type="button"
            onClick={onReset}
            className={cn(
              "h-10 min-h-[44px] px-3",
              "rounded-lg text-sm font-medium",
              "text-slate-400 hover:text-slate-100",
              "hover:bg-[var(--card-bg-hover)]",
              "transition-colors duration-150"
            )}
            data-testid="filter-reset"
          >
            Reset
          </button>
        )}
      </div>
    </motion.div>
  );
});

export default DealsFilter;
