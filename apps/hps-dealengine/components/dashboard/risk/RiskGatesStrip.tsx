/**
 * RiskGatesStrip — Sub-Slice 9.7
 *
 * Horizontal strip displaying risk gate indicators:
 * - Pass ✓ / Fail ✗ / Unknown ○
 * - Summary count badge
 * - Optional expandable details with reasons
 *
 * All values from engine outputs via props — zero calculations.
 *
 * @defensive Handles null/undefined, empty arrays, invalid statuses
 * @traced data-testid for debugging and test selection
 */

import { memo, useState } from "react";
import {
  type RiskGateResult,
  type RiskGatesResult,
  type RiskGateStatus,
  type RiskGateSeverity,
} from "@hps-internal/contracts";
import { cn } from "@/components/ui";

// ─────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────

export interface RiskGatesStripProps {
  /** Risk gates result from engine. Null → empty state */
  riskGates: RiskGatesResult | null | undefined;
  /** Show expandable details section */
  showDetails?: boolean;
  /** Start with details expanded */
  defaultExpanded?: boolean;
  /** Compact mode reduces padding */
  compact?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// ─────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────

type StatusKey = RiskGateStatus | "unknown";

const STATUS_CONFIG: Record<
  StatusKey,
  {
    icon: string;
    label: string;
    color: string;
    bgColor: string;
    borderColor: string;
    ariaLabel: string;
  }
> = {
  pass: {
    icon: "✓",
    label: "Passed",
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/20",
    borderColor: "border-emerald-500/40",
    ariaLabel: "Passed",
  },
  fail: {
    icon: "✗",
    label: "Failed",
    color: "text-red-400",
    bgColor: "bg-red-500/20",
    borderColor: "border-red-500/40",
    ariaLabel: "Failed",
  },
  unknown: {
    icon: "○",
    label: "Unknown",
    color: "text-slate-400",
    bgColor: "bg-slate-500/20",
    borderColor: "border-slate-500/40",
    ariaLabel: "Pending evaluation",
  },
} as const;

const SEVERITY_CONFIG: Record<
  RiskGateSeverity,
  { color: string; label: string }
> = {
  critical: { color: "text-red-500", label: "Critical" },
  major: { color: "text-orange-400", label: "Major" },
  minor: { color: "text-amber-400", label: "Minor" },
} as const;

const VALID_STATUSES: RiskGateStatus[] = ["pass", "fail", "unknown"];

// ─────────────────────────────────────────────────────────────────────
// HELPER: Get safe status (with fallback for invalid values)
// ─────────────────────────────────────────────────────────────────────

function getSafeStatus(status: string | null | undefined): StatusKey {
  if (!status) return "unknown";
  const lower = status.trim().toLowerCase();
  if (VALID_STATUSES.includes(lower as RiskGateStatus)) {
    return lower as RiskGateStatus;
  }
  return "unknown";
}

// ─────────────────────────────────────────────────────────────────────
// HELPER: Get safe label (with fallback for empty)
// ─────────────────────────────────────────────────────────────────────

function getSafeLabel(label: string | null | undefined): string {
  if (!label || label.trim() === "") return "Unknown Gate";
  return label.trim();
}

// ─────────────────────────────────────────────────────────────────────
// HELPER: Get summary badge color based on gate results
// ─────────────────────────────────────────────────────────────────────

function getSummaryColor(riskGates: RiskGatesResult): {
  color: string;
  bgColor: string;
  borderColor: string;
} {
  if (riskGates.fail_count > 0) {
    // Any failures → red
    return {
      color: "text-red-400",
      bgColor: "bg-red-500/20",
      borderColor: "border-red-500/40",
    };
  }
  if (riskGates.unknown_count > 0) {
    // Some unknown → slate
    return {
      color: "text-slate-400",
      bgColor: "bg-slate-500/20",
      borderColor: "border-slate-500/40",
    };
  }
  // All passed → green
  return {
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/20",
    borderColor: "border-emerald-500/40",
  };
}

// ─────────────────────────────────────────────────────────────────────
// HELPER: Format summary text with singular/plural handling
// ─────────────────────────────────────────────────────────────────────

function formatSummary(riskGates: RiskGatesResult): string {
  const total = riskGates.gates.length;
  const passed = riskGates.pass_count;
  const gateWord = total === 1 ? "gate" : "gates";
  return `${passed}/${total} ${gateWord} passed`;
}

// ─────────────────────────────────────────────────────────────────────
// SUB-COMPONENT: Gate Indicator
// ─────────────────────────────────────────────────────────────────────

interface GateIndicatorProps {
  gate: RiskGateResult;
  compact: boolean;
}

function GateIndicator({ gate, compact }: GateIndicatorProps): JSX.Element {
  const safeStatus = getSafeStatus(gate.status);
  const safeLabel = getSafeLabel(gate.label);
  const config = STATUS_CONFIG[safeStatus];
  const isBlocking = gate.is_blocking === true;

  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-lg border",
        config.borderColor,
        config.bgColor,
        compact ? "p-2 min-w-[60px]" : "p-3 min-w-[72px]",
        isBlocking && "ring-2 ring-red-500/50"
      )}
      data-testid={`risk-gate-${gate.gate}`}
      data-status={safeStatus}
      data-blocking={isBlocking}
      aria-label={`${safeLabel}: ${config.ariaLabel}`}
    >
      {/* Status Icon */}
      <span
        className={cn(
          "font-bold",
          compact ? "text-lg" : "text-xl",
          config.color
        )}
        aria-hidden="true"
      >
        {config.icon}
      </span>

      {/* Label */}
      <span
        className={cn(
          "text-center font-medium truncate w-full",
          compact ? "text-[10px]" : "text-xs",
          "text-slate-300 mt-1"
        )}
        title={safeLabel}
      >
        {safeLabel}
      </span>

      {/* Blocking indicator */}
      {isBlocking && (
        <span className="text-[8px] text-red-400 uppercase tracking-wider mt-0.5">
          Blocking
        </span>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// SUB-COMPONENT: Gate Details Row
// ─────────────────────────────────────────────────────────────────────

interface GateDetailRowProps {
  gate: RiskGateResult;
}

function GateDetailRow({ gate }: GateDetailRowProps): JSX.Element | null {
  const safeStatus = getSafeStatus(gate.status);
  const safeLabel = getSafeLabel(gate.label);
  const config = STATUS_CONFIG[safeStatus];

  // Only show details for non-pass gates with reasons
  if (safeStatus === "pass" || !gate.reason) {
    return null;
  }

  const severityConfig = gate.severity ? SEVERITY_CONFIG[gate.severity] : null;

  return (
    <div
      className="flex items-start gap-2 text-sm"
      data-testid={`risk-gate-detail-${gate.gate}`}
    >
      <span className={cn("font-bold flex-shrink-0", config.color)}>
        {config.icon}
      </span>
      <span className="text-slate-400 font-medium flex-shrink-0">
        {safeLabel}:
      </span>
      <span className={cn("text-slate-300", severityConfig?.color)}>
        {gate.reason}
      </span>
      {gate.severity && severityConfig && (
        <span
          className={cn(
            "text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wider flex-shrink-0",
            gate.severity === "critical"
              ? "text-red-400 bg-red-500/20"
              : gate.severity === "major"
                ? "text-orange-400 bg-orange-500/20"
                : "text-amber-400 bg-amber-500/20"
          )}
        >
          {severityConfig.label}
        </span>
      )}
      {gate.is_blocking && (
        <span className="text-[10px] text-red-400 bg-red-500/20 px-1.5 py-0.5 rounded uppercase tracking-wider flex-shrink-0">
          Blocking
        </span>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────

export const RiskGatesStrip = memo(function RiskGatesStrip({
  riskGates,
  showDetails = true,
  defaultExpanded = false,
  compact = false,
  className,
}: RiskGatesStripProps): JSX.Element {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  // ─────────────────────────────────────────────────────────────────
  // DEFENSIVE: Handle null/undefined risk gates
  // ─────────────────────────────────────────────────────────────────

  if (!riskGates) {
    return (
      <div
        data-testid="risk-gates-strip"
        data-state="empty"
        className={cn(
          "rounded-xl border border-white/10 bg-blue-500/10 backdrop-blur-xl",
          "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]",
          compact ? "p-3" : "p-4",
          className
        )}
      >
        <h3 className="text-sm font-medium text-slate-300 mb-2">Risk Gates</h3>
        <p className="text-sm text-slate-500 italic text-center py-4">
          Risk gates not yet evaluated
        </p>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────
  // DEFENSIVE: Handle empty gates array
  // ─────────────────────────────────────────────────────────────────

  if (!Array.isArray(riskGates.gates) || riskGates.gates.length === 0) {
    return (
      <div
        data-testid="risk-gates-strip"
        data-state="no-gates"
        className={cn(
          "rounded-xl border border-white/10 bg-blue-500/10 backdrop-blur-xl",
          "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]",
          compact ? "p-3" : "p-4",
          className
        )}
      >
        <h3 className="text-sm font-medium text-slate-300 mb-2">Risk Gates</h3>
        <p className="text-sm text-slate-500 italic text-center py-4">
          No risk gates configured for evaluation
        </p>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────
  // PROCESS GATES
  // ─────────────────────────────────────────────────────────────────

  const summaryColors = getSummaryColor(riskGates);
  const summaryText = formatSummary(riskGates);

  // Get gates with issues (for details section)
  const gatesWithIssues = riskGates.gates.filter((g) => {
    const status = getSafeStatus(g.status);
    return status !== "pass" && g.reason;
  });

  const hasDetailsToShow = gatesWithIssues.length > 0;

  // ─────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────

  return (
    <div
      data-testid="risk-gates-strip"
      data-state="loaded"
      data-passed={riskGates.pass_count}
      data-failed={riskGates.fail_count}
      data-total={riskGates.gates.length}
      data-any-blocking={riskGates.any_blocking}
      className={cn(
        "rounded-xl border border-white/10 bg-blue-500/10 backdrop-blur-xl",
        "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]",
        compact ? "p-3" : "p-4",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-slate-300">Risk Gates</h3>
        <span
          className={cn(
            "text-xs font-medium px-2 py-0.5 rounded-full border",
            summaryColors.color,
            summaryColors.bgColor,
            summaryColors.borderColor
          )}
          data-testid="risk-gates-summary"
        >
          {summaryText}
        </span>
      </div>

      {/* Gates Strip */}
      <div
        className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-600"
        data-testid="risk-gates-strip-container"
        role="list"
        aria-label="Risk gate status indicators"
      >
        {riskGates.gates.map((gate, index) => (
          <GateIndicator
            key={gate.gate || `gate-${index}`}
            gate={gate}
            compact={compact}
          />
        ))}
      </div>

      {/* Details Toggle + Section */}
      {showDetails && hasDetailsToShow && (
        <div className="mt-3 pt-3 border-t border-white/10">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs text-slate-400 hover:text-slate-300 flex items-center gap-1 transition-colors"
            aria-expanded={isExpanded}
            aria-controls="risk-gates-details"
            data-testid="risk-gates-toggle"
          >
            <span
              className={cn(
                "transition-transform duration-200",
                isExpanded && "rotate-90"
              )}
            >
              ▶
            </span>
            {isExpanded ? "Hide Details" : "Show Details"}
            <span className="text-slate-500">
              ({gatesWithIssues.length} issue
              {gatesWithIssues.length !== 1 ? "s" : ""})
            </span>
          </button>

          {isExpanded && (
            <div
              id="risk-gates-details"
              className="mt-2 space-y-2 bg-slate-900/50 rounded-lg p-3"
              data-testid="risk-gates-details"
            >
              {gatesWithIssues.map((gate, index) => (
                <GateDetailRow
                  key={gate.gate || `detail-${index}`}
                  gate={gate}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* No details message when all passed */}
      {showDetails &&
        !hasDetailsToShow &&
        riskGates.pass_count === riskGates.gates.length && (
          <div className="mt-3 pt-3 border-t border-white/10">
            <p
              className="text-xs text-emerald-400/80 flex items-center gap-1"
              data-testid="risk-gates-all-clear"
            >
              <span aria-hidden="true">✓</span>
              All risk gates passed — no issues identified
            </p>
          </div>
        )}

      {/* Recommended action if any blocking */}
      {riskGates.any_blocking && riskGates.recommended_action && (
        <div
          className="mt-3 pt-3 border-t border-white/10"
          data-testid="risk-gates-action"
        >
          <p className="text-xs text-red-400/80">
            <span className="font-medium">Recommended:</span>{" "}
            {riskGates.recommended_action}
          </p>
        </div>
      )}
    </div>
  );
});

// ─────────────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────────────

export default RiskGatesStrip;

// Re-export for testing
export {
  getSafeStatus,
  getSafeLabel,
  getSummaryColor,
  formatSummary,
  STATUS_CONFIG,
  SEVERITY_CONFIG,
  VALID_STATUSES,
};
