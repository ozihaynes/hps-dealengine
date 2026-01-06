/**
 * PortfolioPulse Component
 *
 * Aggregate metrics strip for the Portfolio Dashboard. Displays key
 * portfolio-level metrics including deal counts, verdicts distribution,
 * pipeline value, and average scores.
 *
 * DESIGN PRINCIPLES:
 * - Compact, scannable format
 * - Color-coded verdict distribution
 * - Currency and percentage formatting
 * - Responsive layout with wrapping
 *
 * @module dashboard/PortfolioPulse
 * @version 1.0.0 (Slice 16 - Portfolio Dashboard)
 */

"use client";

import React from "react";
import { cn } from "@/components/ui";
import type { PortfolioMetrics } from "./usePortfolioData";

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface PortfolioPulseProps {
  /** Portfolio metrics data */
  metrics: PortfolioMetrics;
  /** Additional className */
  className?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function formatCurrency(value: number): string {
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(0)}K`;
  }
  return `$${value.toLocaleString()}`;
}

// ═══════════════════════════════════════════════════════════════════════════
// METRIC CARD
// ═══════════════════════════════════════════════════════════════════════════

interface MetricCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  color?: string;
  icon?: React.ReactNode;
}

function MetricCard({ label, value, subValue, color, icon }: MetricCardProps) {
  return (
    <div className="flex flex-col min-w-[100px]">
      <div className="flex items-center gap-2">
        {icon && (
          <span style={{ color: color || "var(--text-muted)" }}>{icon}</span>
        )}
        <span
          className="text-xs font-medium uppercase tracking-wider"
          style={{ color: "var(--text-muted)" }}
        >
          {label}
        </span>
      </div>
      <span
        className="text-2xl font-bold tabular-nums"
        style={{ color: color || "var(--text-primary)" }}
      >
        {value}
      </span>
      {subValue && (
        <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
          {subValue}
        </span>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// VERDICT DISTRIBUTION
// ═══════════════════════════════════════════════════════════════════════════

interface VerdictDistributionProps {
  byVerdict: PortfolioMetrics["byVerdict"];
  total: number;
}

function VerdictDistribution({ byVerdict, total }: VerdictDistributionProps) {
  if (total === 0) return null;

  const segments = [
    { verdict: "GO", count: byVerdict.GO, color: "var(--accent-green)" },
    { verdict: "PWC", count: byVerdict.PROCEED_WITH_CAUTION, color: "var(--accent-yellow)" },
    { verdict: "HOLD", count: byVerdict.HOLD, color: "var(--accent-blue)" },
    { verdict: "PASS", count: byVerdict.PASS, color: "var(--accent-red)" },
  ].filter((s) => s.count > 0);

  return (
    <div className="flex flex-col gap-2 min-w-[180px]">
      <span
        className="text-xs font-medium uppercase tracking-wider"
        style={{ color: "var(--text-muted)" }}
      >
        Verdict Distribution
      </span>
      
      {/* Bar chart */}
      <div className="flex h-6 rounded-lg overflow-hidden">
        {segments.map((segment, idx) => {
          const width = (segment.count / total) * 100;
          return (
            <div
              key={segment.verdict}
              className="flex items-center justify-center text-xs font-bold transition-all"
              style={{
                width: `${width}%`,
                backgroundColor: segment.color,
                color: "white",
                minWidth: segment.count > 0 ? "24px" : "0",
              }}
              title={`${segment.verdict}: ${segment.count} deals (${Math.round(width)}%)`}
            >
              {width >= 15 && segment.count}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        {segments.map((segment) => (
          <div key={segment.verdict} className="flex items-center gap-1">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: segment.color }}
            />
            <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
              {segment.verdict === "PWC" ? "Caution" : segment.verdict}: {segment.count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export function PortfolioPulse({ metrics, className }: PortfolioPulseProps) {
  return (
    <div
      className={cn(
        "p-5 rounded-xl",
        className
      )}
      style={{
        backgroundColor: "var(--glass-bg)",
        backdropFilter: "blur(var(--blur-md))",
        border: "1px solid var(--glass-border)",
      }}
    >
      <div className="flex flex-wrap items-start justify-between gap-6">
        {/* Total Deals */}
        <MetricCard
          label="Total Deals"
          value={metrics.totalDeals}
          subValue={`${metrics.analyzedDeals} analyzed, ${metrics.pendingDeals} pending`}
          icon={
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
          }
        />

        {/* Pipeline Value */}
        <MetricCard
          label="Pipeline Value"
          value={formatCurrency(metrics.totalPipelineValue)}
          subValue="Total ARV"
          color="var(--accent-blue)"
          icon={
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          }
        />

        {/* Spread Opportunity */}
        <MetricCard
          label="Spread Opportunity"
          value={formatCurrency(metrics.totalSpreadOpportunity)}
          subValue="Total potential"
          color="var(--accent-green)"
          icon={
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
              />
            </svg>
          }
        />

        {/* Average Closeability */}
        <MetricCard
          label="Avg Closeability"
          value={`${metrics.avgCloseability}%`}
          subValue="Portfolio average"
          color={
            metrics.avgCloseability >= 70
              ? "var(--accent-green)"
              : metrics.avgCloseability >= 50
              ? "var(--accent-yellow)"
              : "var(--accent-red)"
          }
          icon={
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          }
        />

        {/* Verdict Distribution */}
        <VerdictDistribution byVerdict={metrics.byVerdict} total={metrics.totalDeals} />
      </div>
    </div>
  );
}

export default PortfolioPulse;
