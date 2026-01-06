/**
 * PortfolioDashboard Component
 *
 * Multi-deal command center providing bird's-eye view of entire deal pipeline.
 * Displays aggregate metrics, verdict distribution, and deal grid with
 * filtering and sorting capabilities.
 *
 * DESIGN PRINCIPLES:
 * - Glass morphism aesthetic matching Command Center
 * - Information hierarchy: metrics → filters → deal grid
 * - Mobile-first responsive layout
 * - Accessible with keyboard navigation
 *
 * @module dashboard/PortfolioDashboard
 * @version 1.0.0 (Slice 16 - Portfolio Dashboard)
 */

"use client";

import React from "react";
import { cn } from "@/components/ui";
import { usePortfolioData } from "./usePortfolioData";
import { PortfolioHeader } from "./PortfolioHeader";
import { PortfolioPulse } from "./PortfolioPulse";
import { DealPipelineGrid } from "./DealPipelineGrid";
import { PortfolioSkeleton } from "./PortfolioSkeleton";

// ═══════════════════════════════════════════════════════════════════════════
// ERROR STATE
// ═══════════════════════════════════════════════════════════════════════════

interface ErrorStateProps {
  message: string;
  onRetry: () => void;
}

function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div
      className="flex flex-col items-center justify-center min-h-[400px] p-8 rounded-xl"
      style={{
        backgroundColor: "var(--glass-bg)",
        backdropFilter: "blur(var(--blur-md))",
        border: "1px solid var(--glass-border)",
      }}
      role="alert"
    >
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
        style={{ backgroundColor: "rgba(239, 68, 68, 0.15)" }}
      >
        <svg
          className="w-8 h-8"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          style={{ color: "var(--accent-red)" }}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>
      <h3
        className="text-lg font-semibold mb-2"
        style={{ color: "var(--text-primary)" }}
      >
        Unable to Load Portfolio
      </h3>
      <p
        className="text-sm text-center mb-6 max-w-md"
        style={{ color: "var(--text-secondary)" }}
      >
        {message}
      </p>
      <button
        onClick={onRetry}
        className="px-6 py-2.5 rounded-lg font-medium transition-all"
        style={{
          backgroundColor: "var(--accent-green)",
          color: "white",
        }}
      >
        Try Again
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// EMPTY STATE
// ═══════════════════════════════════════════════════════════════════════════

function EmptyState() {
  return (
    <div
      className="flex flex-col items-center justify-center min-h-[400px] p-8 rounded-xl"
      style={{
        backgroundColor: "var(--glass-bg)",
        backdropFilter: "blur(var(--blur-md))",
        border: "1px solid var(--glass-border)",
      }}
    >
      <div
        className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
        style={{ backgroundColor: "rgba(59, 130, 246, 0.1)" }}
      >
        <svg
          className="w-10 h-10"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          style={{ color: "var(--accent-blue)" }}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
          />
        </svg>
      </div>
      <h3
        className="text-xl font-semibold mb-2"
        style={{ color: "var(--text-primary)" }}
      >
        No Deals Yet
      </h3>
      <p
        className="text-sm text-center mb-6 max-w-md"
        style={{ color: "var(--text-secondary)" }}
      >
        Start building your pipeline by creating your first deal. Each deal will
        appear here with its analysis metrics and verdict.
      </p>
      <a
        href="/deals/new"
        className="px-6 py-2.5 rounded-lg font-medium transition-all inline-flex items-center gap-2"
        style={{
          backgroundColor: "var(--accent-green)",
          color: "white",
        }}
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Create First Deal
      </a>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// NO RESULTS STATE
// ═══════════════════════════════════════════════════════════════════════════

interface NoResultsStateProps {
  onClearFilters: () => void;
}

function NoResultsState({ onClearFilters }: NoResultsStateProps) {
  return (
    <div
      className="flex flex-col items-center justify-center min-h-[300px] p-8 rounded-xl"
      style={{
        backgroundColor: "var(--glass-bg)",
        backdropFilter: "blur(var(--blur-md))",
        border: "1px solid var(--glass-border)",
      }}
    >
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
        style={{ backgroundColor: "rgba(156, 163, 175, 0.1)" }}
      >
        <svg
          className="w-8 h-8"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          style={{ color: "var(--text-muted)" }}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>
      <h3
        className="text-lg font-semibold mb-2"
        style={{ color: "var(--text-primary)" }}
      >
        No Matching Deals
      </h3>
      <p
        className="text-sm text-center mb-4"
        style={{ color: "var(--text-secondary)" }}
      >
        Try adjusting your filters or search query.
      </p>
      <button
        onClick={onClearFilters}
        className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
        style={{
          backgroundColor: "var(--surface-2)",
          color: "var(--text-primary)",
        }}
      >
        Clear Filters
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export function PortfolioDashboard() {
  const {
    deals,
    metrics,
    isLoading,
    error,
    refresh,
    sort,
    setSort,
    filters,
    setFilters,
    filteredDeals,
  } = usePortfolioData();

  // Clear all filters
  const handleClearFilters = () => {
    setFilters({
      status: "all",
      verdict: "all",
      hasAnalysis: "all",
      searchQuery: "",
    });
  };

  // Loading state
  if (isLoading) {
    return <PortfolioSkeleton />;
  }

  // Error state
  if (error) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <ErrorState message={error} onRetry={refresh} />
      </div>
    );
  }

  // Empty state (no deals at all)
  if (deals.length === 0) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <PortfolioHeader
          totalDeals={0}
          onRefresh={refresh}
          isRefreshing={false}
        />
        <div className="mt-6">
          <EmptyState />
        </div>
      </div>
    );
  }

  return (
    <div className={cn("p-4 sm:p-6 max-w-7xl mx-auto space-y-6")}>
      {/* Header with title, search, and actions */}
      <PortfolioHeader
        totalDeals={metrics.totalDeals}
        onRefresh={refresh}
        isRefreshing={isLoading}
        searchQuery={filters.searchQuery}
        onSearchChange={(query) => setFilters({ searchQuery: query })}
      />

      {/* Aggregate metrics pulse bar */}
      <PortfolioPulse metrics={metrics} />

      {/* Filter bar */}
      <div
        className="flex flex-wrap items-center gap-3 p-4 rounded-xl"
        style={{
          backgroundColor: "var(--glass-bg)",
          backdropFilter: "blur(var(--blur-md))",
          border: "1px solid var(--glass-border)",
        }}
      >
        {/* Status filter */}
        <div className="flex items-center gap-2">
          <label
            className="text-xs font-medium uppercase tracking-wider"
            style={{ color: "var(--text-muted)" }}
          >
            Status
          </label>
          <select
            value={filters.status}
            onChange={(e) => setFilters({ status: e.target.value as typeof filters.status })}
            className="px-3 py-1.5 rounded-lg text-sm"
            style={{
              backgroundColor: "var(--surface-2)",
              color: "var(--text-primary)",
              border: "1px solid var(--glass-border)",
            }}
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="under_contract">Under Contract</option>
            <option value="closed">Closed</option>
            <option value="archived">Archived</option>
          </select>
        </div>

        {/* Verdict filter */}
        <div className="flex items-center gap-2">
          <label
            className="text-xs font-medium uppercase tracking-wider"
            style={{ color: "var(--text-muted)" }}
          >
            Verdict
          </label>
          <select
            value={filters.verdict}
            onChange={(e) => setFilters({ verdict: e.target.value as typeof filters.verdict })}
            className="px-3 py-1.5 rounded-lg text-sm"
            style={{
              backgroundColor: "var(--surface-2)",
              color: "var(--text-primary)",
              border: "1px solid var(--glass-border)",
            }}
          >
            <option value="all">All</option>
            <option value="GO">GO</option>
            <option value="PROCEED_WITH_CAUTION">Proceed with Caution</option>
            <option value="HOLD">HOLD</option>
            <option value="PASS">PASS</option>
          </select>
        </div>

        {/* Analysis filter */}
        <div className="flex items-center gap-2">
          <label
            className="text-xs font-medium uppercase tracking-wider"
            style={{ color: "var(--text-muted)" }}
          >
            Analysis
          </label>
          <select
            value={String(filters.hasAnalysis)}
            onChange={(e) => {
              const val = e.target.value;
              setFilters({
                hasAnalysis: val === "all" ? "all" : val === "true",
              });
            }}
            className="px-3 py-1.5 rounded-lg text-sm"
            style={{
              backgroundColor: "var(--surface-2)",
              color: "var(--text-primary)",
              border: "1px solid var(--glass-border)",
            }}
          >
            <option value="all">All</option>
            <option value="true">Analyzed</option>
            <option value="false">Pending</option>
          </select>
        </div>

        {/* Sort controls */}
        <div className="flex items-center gap-2 ml-auto">
          <label
            className="text-xs font-medium uppercase tracking-wider"
            style={{ color: "var(--text-muted)" }}
          >
            Sort
          </label>
          <select
            value={sort.field}
            onChange={(e) => setSort(e.target.value as typeof sort.field)}
            className="px-3 py-1.5 rounded-lg text-sm"
            style={{
              backgroundColor: "var(--surface-2)",
              color: "var(--text-primary)",
              border: "1px solid var(--glass-border)",
            }}
          >
            <option value="updated">Last Updated</option>
            <option value="verdict">Verdict</option>
            <option value="closeability">Closeability</option>
            <option value="urgency">Urgency</option>
            <option value="spread">Spread</option>
            <option value="address">Address</option>
          </select>
          <button
            onClick={() => setSort(sort.field, sort.direction === "asc" ? "desc" : "asc")}
            className="p-1.5 rounded-lg transition-colors"
            style={{
              backgroundColor: "var(--surface-2)",
              color: "var(--text-primary)",
            }}
            aria-label={`Sort ${sort.direction === "asc" ? "descending" : "ascending"}`}
          >
            {sort.direction === "asc" ? (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between">
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Showing{" "}
          <span style={{ color: "var(--text-primary)" }} className="font-medium">
            {filteredDeals.length}
          </span>{" "}
          of {deals.length} deals
        </p>
        {(filters.status !== "all" ||
          filters.verdict !== "all" ||
          filters.hasAnalysis !== "all" ||
          filters.searchQuery) && (
          <button
            onClick={handleClearFilters}
            className="text-sm font-medium transition-colors"
            style={{ color: "var(--accent-blue)" }}
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Deal grid or no results */}
      {filteredDeals.length > 0 ? (
        <DealPipelineGrid deals={filteredDeals} />
      ) : (
        <NoResultsState onClearFilters={handleClearFilters} />
      )}
    </div>
  );
}

export default PortfolioDashboard;
