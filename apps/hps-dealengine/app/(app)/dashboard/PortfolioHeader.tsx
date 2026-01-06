/**
 * PortfolioHeader Component
 *
 * Header section for the Portfolio Dashboard with title, deal count,
 * search input, and action buttons.
 *
 * @module dashboard/PortfolioHeader
 * @version 1.0.0 (Slice 16 - Portfolio Dashboard)
 */

"use client";

import React, { useState, useRef, useEffect } from "react";
import { cn } from "@/components/ui";

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface PortfolioHeaderProps {
  /** Total number of deals */
  totalDeals: number;
  /** Refresh callback */
  onRefresh: () => void;
  /** Whether refresh is in progress */
  isRefreshing: boolean;
  /** Current search query */
  searchQuery?: string;
  /** Search query change handler */
  onSearchChange?: (query: string) => void;
  /** Additional className */
  className?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export function PortfolioHeader({
  totalDeals,
  onRefresh,
  isRefreshing,
  searchQuery = "",
  onSearchChange,
  className,
}: PortfolioHeaderProps) {
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Focus search input when expanded
  useEffect(() => {
    if (isSearchExpanded && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchExpanded]);

  // Collapse search when empty and blurred
  const handleSearchBlur = () => {
    if (!searchQuery) {
      setIsSearchExpanded(false);
    }
  };

  return (
    <header className={cn("flex flex-col sm:flex-row sm:items-center gap-4", className)}>
      {/* Title and count */}
      <div className="flex-1">
        <div className="flex items-center gap-3">
          <h1
            className="text-2xl sm:text-3xl font-bold tracking-tight"
            style={{ color: "var(--text-primary)" }}
          >
            Portfolio
          </h1>
          {totalDeals > 0 && (
            <span
              className="px-3 py-1 rounded-full text-sm font-medium"
              style={{
                backgroundColor: "var(--accent-blue)",
                color: "white",
              }}
            >
              {totalDeals} {totalDeals === 1 ? "deal" : "deals"}
            </span>
          )}
        </div>
        <p
          className="text-sm mt-1"
          style={{ color: "var(--text-secondary)" }}
        >
          Pipeline overview and deal management
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        {/* Search */}
        <div
          className={cn(
            "relative flex items-center transition-all duration-300",
            isSearchExpanded ? "w-64" : "w-10"
          )}
        >
          {isSearchExpanded ? (
            <div className="relative w-full">
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange?.(e.target.value)}
                onBlur={handleSearchBlur}
                placeholder="Search deals..."
                className="w-full pl-10 pr-4 py-2 rounded-lg text-sm transition-colors"
                style={{
                  backgroundColor: "var(--surface-2)",
                  color: "var(--text-primary)",
                  border: "1px solid var(--glass-border)",
                }}
              />
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
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
              {searchQuery && (
                <button
                  onClick={() => {
                    onSearchChange?.("");
                    searchInputRef.current?.focus();
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded transition-colors"
                  style={{ color: "var(--text-muted)" }}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          ) : (
            <button
              onClick={() => setIsSearchExpanded(true)}
              className="p-2.5 rounded-lg transition-colors"
              style={{
                backgroundColor: "var(--surface-2)",
                color: "var(--text-secondary)",
              }}
              aria-label="Search deals"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </button>
          )}
        </div>

        {/* Refresh button */}
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className={cn(
            "p-2.5 rounded-lg transition-all",
            isRefreshing && "animate-spin"
          )}
          style={{
            backgroundColor: "var(--surface-2)",
            color: "var(--text-secondary)",
          }}
          aria-label="Refresh deals"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </button>

        {/* New deal button */}
        <a
          href="/deals/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all"
          style={{
            backgroundColor: "var(--accent-green)",
            color: "white",
          }}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span className="hidden sm:inline">New Deal</span>
        </a>
      </div>
    </header>
  );
}

export default PortfolioHeader;
