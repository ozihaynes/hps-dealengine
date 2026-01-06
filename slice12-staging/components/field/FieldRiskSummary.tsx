"use client";

import React from "react";
import { AlertTriangle, XCircle, AlertCircle, CheckCircle } from "lucide-react";
import type { FieldModeGate } from "@/lib/hooks/useFieldModeData";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FieldRiskSummaryProps {
  risks: FieldModeGate[];
  gatesSummary: {
    passed: number;
    total: number;
    blocking: number;
  };
}

// ---------------------------------------------------------------------------
// Status Config
// ---------------------------------------------------------------------------

const STATUS_CONFIG: Record<
  FieldModeGate["status"],
  {
    Icon: React.ComponentType<{ className?: string }>;
    bgClass: string;
    textClass: string;
    iconClass: string;
  }
> = {
  blocking: {
    Icon: XCircle,
    bgClass: "bg-red-500/10",
    textClass: "text-red-400",
    iconClass: "text-red-500",
  },
  fail: {
    Icon: XCircle,
    bgClass: "bg-red-500/10",
    textClass: "text-red-400",
    iconClass: "text-red-400",
  },
  warning: {
    Icon: AlertTriangle,
    bgClass: "bg-amber-500/10",
    textClass: "text-amber-400",
    iconClass: "text-amber-400",
  },
  pass: {
    Icon: CheckCircle,
    bgClass: "bg-emerald-500/10",
    textClass: "text-emerald-400",
    iconClass: "text-emerald-400",
  },
};

// ---------------------------------------------------------------------------
// Risk Row Component
// ---------------------------------------------------------------------------

function RiskRow({ risk }: { risk: FieldModeGate }) {
  const config = STATUS_CONFIG[risk.status];
  const Icon = config.Icon;

  return (
    <div
      className={`
        flex items-center gap-3
        rounded-lg
        ${config.bgClass}
        border border-white/5
        p-3
        min-h-[48px]
      `}
      role="listitem"
    >
      <Icon
        className={`w-5 h-5 flex-shrink-0 ${config.iconClass}`}
        aria-hidden="true"
      />
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${config.textClass} truncate`}>
          {risk.label}
        </p>
        {risk.reason && (
          <p className="text-xs text-text-tertiary truncate mt-0.5">
            {risk.reason}
          </p>
        )}
      </div>
      {risk.status === "blocking" && (
        <span className="flex-shrink-0 text-xs font-medium text-red-400 bg-red-500/20 px-2 py-0.5 rounded">
          BLOCKING
        </span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * FieldRiskSummary
 * 
 * Shows top 3 non-passing risk gates.
 * Clear visual hierarchy: blocking > fail > warning.
 * 
 * Principles Applied:
 * - Miller's Law: Max 3 items visible (chunked from full list)
 * - Color Psychology: Red=stop, Amber=caution
 * - Gestalt (Similarity): Same row structure for all risks
 * - Fitts's Law: Each row ≥48px height for touch
 * - WCAG: Color not sole indicator (icons + labels)
 */
export function FieldRiskSummary({
  risks,
  gatesSummary,
}: FieldRiskSummaryProps) {
  const { passed, total, blocking } = gatesSummary;

  // All gates pass state
  const allClear = risks.length === 0 && total > 0;

  return (
    <div
      className={`
        rounded-xl
        bg-surface-secondary/50
        border border-white/5
        backdrop-blur-sm
        p-4
      `}
      role="region"
      aria-label="Risk Summary"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-medium text-text-tertiary uppercase tracking-wider">
          Risk Gates
        </h3>
        <span
          className={`
            text-xs font-medium
            ${blocking > 0 ? "text-red-400" : passed === total ? "text-emerald-400" : "text-text-secondary"}
          `}
        >
          {passed}/{total} pass
          {blocking > 0 && ` • ${blocking} blocking`}
        </span>
      </div>

      {/* Risk List or All Clear */}
      {allClear ? (
        <div
          className={`
            flex items-center gap-3
            rounded-lg
            bg-emerald-500/10
            border border-emerald-500/20
            p-3
            min-h-[48px]
          `}
        >
          <CheckCircle
            className="w-5 h-5 text-emerald-400"
            aria-hidden="true"
          />
          <span className="text-sm font-medium text-emerald-400">
            All gates pass
          </span>
        </div>
      ) : risks.length === 0 ? (
        <div className="text-sm text-text-tertiary p-3">
          No risk data available
        </div>
      ) : (
        <div className="flex flex-col gap-2" role="list" aria-label="Top risks">
          {risks.map((risk) => (
            <RiskRow key={risk.id} risk={risk} />
          ))}
        </div>
      )}
    </div>
  );
}
