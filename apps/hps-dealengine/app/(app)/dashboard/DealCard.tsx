/**
 * DealCard Component
 *
 * Individual deal summary card for the Portfolio Dashboard. Displays
 * address, verdict badge, mini score gauges, and quick actions.
 *
 * DESIGN PRINCIPLES:
 * - Compact but informative
 * - Verdict-colored accent strip
 * - Hover state with actions revealed
 * - Touch-friendly tap targets
 *
 * @module dashboard/DealCard
 * @version 1.0.0 (Slice 16 - Portfolio Dashboard)
 */

"use client";

import React from "react";
import Link from "next/link";
import { cn } from "@/components/ui";
import type { DealSummary, VerdictType } from "./usePortfolioData";

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface DealCardProps {
  /** Deal summary data */
  deal: DealSummary;
  /** Additional className */
  className?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

const VERDICT_CONFIG: Record<
  VerdictType,
  { label: string; color: string; bgColor: string }
> = {
  GO: {
    label: "GO",
    color: "var(--accent-green)",
    bgColor: "rgba(34, 197, 94, 0.15)",
  },
  PROCEED_WITH_CAUTION: {
    label: "CAUTION",
    color: "var(--accent-yellow)",
    bgColor: "rgba(234, 179, 8, 0.15)",
  },
  HOLD: {
    label: "HOLD",
    color: "var(--accent-blue)",
    bgColor: "rgba(59, 130, 246, 0.15)",
  },
  PASS: {
    label: "PASS",
    color: "var(--accent-red)",
    bgColor: "rgba(239, 68, 68, 0.15)",
  },
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  active: { label: "Active", color: "var(--accent-green)" },
  under_contract: { label: "Under Contract", color: "var(--accent-blue)" },
  closed: { label: "Closed", color: "var(--text-muted)" },
  archived: { label: "Archived", color: "var(--text-muted)" },
};

function formatCurrency(value: number): string {
  if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(0)}K`;
  }
  return `$${value.toLocaleString()}`;
}

function formatTimeAgo(dateString: string): string {
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
// MINI SCORE GAUGE
// ═══════════════════════════════════════════════════════════════════════════

interface MiniGaugeProps {
  label: string;
  value: number;
  format?: "percent" | "currency";
  colorScale?: "verdict" | "urgency";
}

function MiniGauge({ label, value, format = "percent", colorScale = "verdict" }: MiniGaugeProps) {
  const displayValue = format === "currency" ? formatCurrency(value) : `${Math.round(value)}%`;

  const getColor = () => {
    if (format === "currency") return "var(--text-primary)";
    if (colorScale === "urgency") {
      if (value >= 80) return "var(--accent-red)";
      if (value >= 60) return "var(--accent-yellow)";
      return "var(--accent-green)";
    }
    // verdict scale
    if (value >= 70) return "var(--accent-green)";
    if (value >= 50) return "var(--accent-yellow)";
    return "var(--accent-red)";
  };

  return (
    <div className="flex flex-col items-center">
      <span
        className="text-sm font-bold tabular-nums"
        style={{ color: getColor() }}
      >
        {displayValue}
      </span>
      <span
        className="text-[10px] uppercase tracking-wider"
        style={{ color: "var(--text-muted)" }}
      >
        {label}
      </span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export function DealCard({ deal, className }: DealCardProps) {
  const verdictConfig = VERDICT_CONFIG[deal.verdict];
  const statusConfig = STATUS_CONFIG[deal.status] || STATUS_CONFIG.active;

  return (
    <Link
      href={`/overview?dealId=${deal.id}`}
      className={cn(
        "group relative block rounded-xl overflow-hidden transition-all duration-200",
        "hover:shadow-lg hover:-translate-y-0.5",
        className
      )}
      style={{
        backgroundColor: "var(--glass-bg)",
        backdropFilter: "blur(var(--blur-md))",
        border: "1px solid var(--glass-border)",
      }}
    >
      {/* Verdict accent strip */}
      <div
        className="absolute top-0 left-0 right-0 h-1"
        style={{ backgroundColor: verdictConfig.color }}
      />

      <div className="p-4 pt-5">
        {/* Header: Address + Status */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex-1 min-w-0">
            <h3
              className="font-semibold text-sm truncate"
              style={{ color: "var(--text-primary)" }}
              title={deal.address}
            >
              {deal.address}
            </h3>
            {(deal.city || deal.zip) && (
              <p
                className="text-xs truncate mt-0.5"
                style={{ color: "var(--text-secondary)" }}
              >
                {[deal.city, deal.state, deal.zip].filter(Boolean).join(", ")}
              </p>
            )}
          </div>
          
          {/* Status badge */}
          <span
            className="shrink-0 text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full"
            style={{
              color: statusConfig.color,
              backgroundColor: `${statusConfig.color}20`,
            }}
          >
            {statusConfig.label}
          </span>
        </div>

        {/* Verdict Badge */}
        <div className="flex items-center gap-2 mb-4">
          <span
            className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider"
            style={{
              color: verdictConfig.color,
              backgroundColor: verdictConfig.bgColor,
            }}
          >
            {verdictConfig.label}
          </span>
          {!deal.has_analysis && (
            <span
              className="text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full"
              style={{
                color: "var(--text-muted)",
                backgroundColor: "var(--surface-2)",
              }}
            >
              Pending Analysis
            </span>
          )}
        </div>

        {/* Mini Gauges */}
        {deal.has_analysis && (
          <div className="grid grid-cols-4 gap-2 mb-4">
            <MiniGauge label="Close" value={deal.closeability_index} />
            <MiniGauge label="Urgent" value={deal.urgency_score} colorScale="urgency" />
            <MiniGauge label="Spread" value={deal.risk_adjusted_spread} format="currency" />
            <MiniGauge label="Demand" value={deal.buyer_demand_index} />
          </div>
        )}

        {/* Footer: Last updated + Actions */}
        <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: "var(--glass-border)" }}>
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            {formatTimeAgo(deal.updated_at)}
          </span>
          
          {/* Quick actions - shown on hover */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                // Navigate to underwrite tab
                window.location.href = `/overview?dealId=${deal.id}&tab=underwrite`;
              }}
              className="p-1.5 rounded-lg transition-colors"
              style={{
                backgroundColor: "var(--surface-2)",
                color: "var(--text-secondary)",
              }}
              title="Run Analysis"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                />
              </svg>
            </button>
            <span
              className="text-xs font-medium"
              style={{ color: "var(--accent-blue)" }}
            >
              View →
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default DealCard;
