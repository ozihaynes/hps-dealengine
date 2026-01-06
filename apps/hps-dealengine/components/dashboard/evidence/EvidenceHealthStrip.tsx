/**
 * EvidenceHealthStrip — Sub-Slice 9.8
 *
 * Horizontal strip displaying evidence freshness indicators:
 * - Fresh ✓ / Stale ⚠ / Missing ✗
 * - Age display (e.g., "2d ago", "15d ago")
 * - Overall health score badge
 *
 * All values from engine outputs via props — zero calculations.
 *
 * @defensive Handles null/undefined, invalid statuses, NaN ages
 * @traced data-testid for debugging and test selection
 */

import { memo } from "react";
import {
  type EvidenceHealth,
  type EvidenceItemHealth,
  type EvidenceFreshnessStatus,
} from "@hps-internal/contracts";
import { cn } from "@/components/ui";

// ─────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────

export interface EvidenceHealthStripProps {
  /** Evidence health from engine. Null → empty state */
  evidenceHealth: EvidenceHealth | null | undefined;
  /** Show recommended action */
  showAction?: boolean;
  /** Compact mode reduces padding */
  compact?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// ─────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────

type StatusKey = EvidenceFreshnessStatus | "unknown";

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
  fresh: {
    icon: "✓",
    label: "Fresh",
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/20",
    borderColor: "border-emerald-500/40",
    ariaLabel: "Data is fresh",
  },
  stale: {
    icon: "⚠",
    label: "Stale",
    color: "text-amber-400",
    bgColor: "bg-amber-500/20",
    borderColor: "border-amber-500/40",
    ariaLabel: "Data is stale",
  },
  missing: {
    icon: "✗",
    label: "Missing",
    color: "text-red-400",
    bgColor: "bg-red-500/20",
    borderColor: "border-red-500/40",
    ariaLabel: "Data is missing",
  },
  unknown: {
    icon: "○",
    label: "Unknown",
    color: "text-slate-400",
    bgColor: "bg-slate-500/20",
    borderColor: "border-slate-500/40",
    ariaLabel: "Status unknown",
  },
} as const;

type BandKey = "excellent" | "good" | "fair" | "poor" | "unknown";

const BAND_CONFIG: Record<
  BandKey,
  { label: string; color: string; bgColor: string; borderColor: string }
> = {
  excellent: {
    label: "Excellent",
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/20",
    borderColor: "border-emerald-500/40",
  },
  good: {
    label: "Good",
    color: "text-blue-400",
    bgColor: "bg-blue-500/20",
    borderColor: "border-blue-500/40",
  },
  fair: {
    label: "Fair",
    color: "text-amber-400",
    bgColor: "bg-amber-500/20",
    borderColor: "border-amber-500/40",
  },
  poor: {
    label: "Poor",
    color: "text-red-400",
    bgColor: "bg-red-500/20",
    borderColor: "border-red-500/40",
  },
  unknown: {
    label: "Unknown",
    color: "text-slate-400",
    bgColor: "bg-slate-500/20",
    borderColor: "border-slate-500/40",
  },
} as const;

const VALID_STATUSES: EvidenceFreshnessStatus[] = ["fresh", "stale", "missing"];
const VALID_BANDS: BandKey[] = ["excellent", "good", "fair", "poor"];

// ─────────────────────────────────────────────────────────────────────
// HELPER: Safe number with NaN/Infinity guard
// ─────────────────────────────────────────────────────────────────────

function safeNumber(value: number | null | undefined): number | null {
  if (value == null) return null;
  if (!Number.isFinite(value)) return null;
  return value;
}

// ─────────────────────────────────────────────────────────────────────
// HELPER: Get safe status (with fallback for invalid values)
// ─────────────────────────────────────────────────────────────────────

function getSafeStatus(status: string | null | undefined): StatusKey {
  if (!status) return "unknown";
  const lower = status.trim().toLowerCase();
  if (VALID_STATUSES.includes(lower as EvidenceFreshnessStatus)) {
    return lower as EvidenceFreshnessStatus;
  }
  return "unknown";
}

// ─────────────────────────────────────────────────────────────────────
// HELPER: Get safe band (with fallback for invalid values)
// ─────────────────────────────────────────────────────────────────────

function getSafeBand(band: string | null | undefined): BandKey {
  if (!band) return "unknown";
  const lower = band.trim().toLowerCase();
  if (VALID_BANDS.includes(lower as BandKey)) {
    return lower as BandKey;
  }
  return "unknown";
}

// ─────────────────────────────────────────────────────────────────────
// HELPER: Get safe label (with fallback for empty)
// ─────────────────────────────────────────────────────────────────────

function getSafeLabel(label: string | null | undefined): string {
  if (!label || label.trim() === "") return "Unknown";
  return label.trim();
}

// ─────────────────────────────────────────────────────────────────────
// HELPER: Format age in days
// ─────────────────────────────────────────────────────────────────────

function formatAgeDays(ageDays: number | null | undefined): string {
  const safe = safeNumber(ageDays);
  if (safe === null) return "—";
  if (safe < 0) return "—"; // Invalid negative age

  // Round FIRST to avoid format inconsistency
  const rounded = Math.round(safe);

  if (rounded === 0) return "Today";
  if (rounded === 1) return "1d ago";
  if (rounded >= 30) return "30+ days";

  return `${rounded}d ago`;
}

// ─────────────────────────────────────────────────────────────────────
// HELPER: Format health score
// ─────────────────────────────────────────────────────────────────────

function formatHealthScore(score: number | null | undefined): string {
  const safe = safeNumber(score);
  if (safe === null) return "—";
  return `${Math.round(safe)}%`;
}

// ─────────────────────────────────────────────────────────────────────
// HELPER: Format days until stale
// ─────────────────────────────────────────────────────────────────────

function formatDaysUntilStale(
  days: number | null | undefined,
  status: StatusKey
): string | null {
  if (status === "missing") return null;
  const safe = safeNumber(days);
  if (safe === null) return null;

  // Round FIRST to avoid "0d left" edge case
  const rounded = Math.round(safe);

  if (rounded < 0) return `${Math.abs(rounded)}d overdue`;
  if (rounded === 0) return "Due today";
  return `${rounded}d left`;
}

// ─────────────────────────────────────────────────────────────────────
// SUB-COMPONENT: Evidence Item Indicator
// ─────────────────────────────────────────────────────────────────────

interface ItemIndicatorProps {
  item: EvidenceItemHealth;
  compact: boolean;
}

function ItemIndicator({ item, compact }: ItemIndicatorProps): JSX.Element {
  const safeStatus = getSafeStatus(item.status);
  const safeLabel = getSafeLabel(item.label);
  const config = STATUS_CONFIG[safeStatus];
  const isCritical = item.is_critical === true;

  // Determine age display text based on status
  const ageText =
    safeStatus === "missing"
      ? "Missing"
      : formatAgeDays(item.age_days);

  // Days until stale indicator
  const daysUntilStale = formatDaysUntilStale(
    item.days_until_stale,
    safeStatus
  );

  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-lg border",
        config.borderColor,
        config.bgColor,
        compact ? "p-2 min-w-[64px]" : "p-3 min-w-[80px]",
        isCritical && safeStatus !== "fresh" && "ring-2 ring-red-500/50"
      )}
      data-testid={`evidence-item-${item.evidence_type}`}
      data-status={safeStatus}
      data-critical={isCritical}
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

      {/* Age */}
      <span
        className={cn(
          "text-center",
          compact ? "text-[9px]" : "text-[10px]",
          "text-slate-500 mt-0.5"
        )}
      >
        {ageText}
      </span>

      {/* Days until stale (for fresh/stale) */}
      {daysUntilStale && (
        <span
          className={cn(
            "text-center",
            compact ? "text-[8px]" : "text-[9px]",
            item.days_until_stale != null && item.days_until_stale < 0
              ? "text-red-400"
              : item.days_until_stale != null && item.days_until_stale <= 7
                ? "text-amber-400"
                : "text-slate-500"
          )}
        >
          {daysUntilStale}
        </span>
      )}

      {/* Critical indicator */}
      {isCritical && safeStatus !== "fresh" && (
        <span className="text-[8px] text-red-400 uppercase tracking-wider mt-0.5">
          Critical
        </span>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────

export const EvidenceHealthStrip = memo(function EvidenceHealthStrip({
  evidenceHealth,
  showAction = true,
  compact = false,
  className,
}: EvidenceHealthStripProps): JSX.Element {
  // ─────────────────────────────────────────────────────────────────
  // DEFENSIVE: Handle null/undefined evidence health
  // ─────────────────────────────────────────────────────────────────

  if (!evidenceHealth) {
    return (
      <div
        data-testid="evidence-health-strip"
        data-state="empty"
        className={cn(
          "rounded-xl border border-white/10 bg-blue-500/10 backdrop-blur-xl",
          "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]",
          compact ? "p-3" : "p-4",
          className
        )}
      >
        <h3 className="text-sm font-medium text-slate-300 mb-2">
          Evidence Health
        </h3>
        <p className="text-sm text-slate-500 italic text-center py-4">
          Evidence health not yet evaluated
        </p>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────
  // DEFENSIVE: Handle empty items array
  // ─────────────────────────────────────────────────────────────────

  if (
    !Array.isArray(evidenceHealth.items) ||
    evidenceHealth.items.length === 0
  ) {
    return (
      <div
        data-testid="evidence-health-strip"
        data-state="no-items"
        className={cn(
          "rounded-xl border border-white/10 bg-blue-500/10 backdrop-blur-xl",
          "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]",
          compact ? "p-3" : "p-4",
          className
        )}
      >
        <h3 className="text-sm font-medium text-slate-300 mb-2">
          Evidence Health
        </h3>
        <p className="text-sm text-slate-500 italic text-center py-4">
          No evidence items configured
        </p>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────
  // PROCESS DATA
  // ─────────────────────────────────────────────────────────────────

  const safeBand = getSafeBand(evidenceHealth.health_band);
  const bandConfig = BAND_CONFIG[safeBand];
  const scoreDisplay = formatHealthScore(evidenceHealth.health_score);

  // Check for anomalous score
  const safeScore = safeNumber(evidenceHealth.health_score);
  const isScoreAnomaly =
    safeScore !== null && (safeScore < 0 || safeScore > 100);

  // ─────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────

  return (
    <div
      data-testid="evidence-health-strip"
      data-state="loaded"
      data-band={safeBand}
      data-score={safeScore ?? "null"}
      data-fresh={evidenceHealth.fresh_count}
      data-stale={evidenceHealth.stale_count}
      data-missing={evidenceHealth.missing_count}
      data-any-critical-missing={evidenceHealth.any_critical_missing}
      data-any-critical-stale={evidenceHealth.any_critical_stale}
      className={cn(
        "rounded-xl border border-white/10 bg-blue-500/10 backdrop-blur-xl",
        "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]",
        compact ? "p-3" : "p-4",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-slate-300">Evidence Health</h3>
        <span
          className={cn(
            "text-xs font-medium px-2 py-0.5 rounded-full border flex items-center gap-1.5",
            bandConfig.color,
            bandConfig.bgColor,
            bandConfig.borderColor,
            isScoreAnomaly && "ring-1 ring-red-500"
          )}
          data-testid="evidence-health-badge"
        >
          {bandConfig.label}
          {scoreDisplay !== "—" && (
            <span className="opacity-80">- {scoreDisplay}</span>
          )}
        </span>
      </div>

      {/* Items Strip */}
      <div
        className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-600"
        data-testid="evidence-items-container"
        role="list"
        aria-label="Evidence item status indicators"
      >
        {evidenceHealth.items.map((item, index) => (
          <ItemIndicator
            key={item.evidence_type || `item-${index}`}
            item={item}
            compact={compact}
          />
        ))}
      </div>

      {/* Footer: Summary counts */}
      <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between">
        {/* Summary counts */}
        <div className="flex items-center gap-3 text-[10px]">
          <span className="flex items-center gap-1">
            <span className="text-emerald-400">✓</span>
            <span className="text-slate-500">
              {evidenceHealth.fresh_count} fresh
            </span>
          </span>
          {evidenceHealth.stale_count > 0 && (
            <span className="flex items-center gap-1">
              <span className="text-amber-400">⚠</span>
              <span className="text-slate-500">
                {evidenceHealth.stale_count} stale
              </span>
            </span>
          )}
          {evidenceHealth.missing_count > 0 && (
            <span className="flex items-center gap-1">
              <span className="text-red-400">✗</span>
              <span className="text-slate-500">
                {evidenceHealth.missing_count} missing
              </span>
            </span>
          )}
        </div>

        {/* Critical warning */}
        {(evidenceHealth.any_critical_missing ||
          evidenceHealth.any_critical_stale) && (
          <span
            className="text-[10px] text-red-400 flex items-center gap-1"
            data-testid="evidence-critical-warning"
          >
            <span aria-hidden="true">!</span>
            Critical evidence needs attention
          </span>
        )}
      </div>

      {/* Recommended action */}
      {showAction && evidenceHealth.recommended_action && (
        <div
          className="mt-2 pt-2 border-t border-white/10"
          data-testid="evidence-recommended-action"
        >
          <p className="text-xs text-slate-500">
            <span className="font-medium text-slate-400">Recommended:</span>{" "}
            {evidenceHealth.recommended_action}
          </p>
        </div>
      )}

      {/* Anomaly warning */}
      {isScoreAnomaly && (
        <p
          className="text-[10px] text-red-400 mt-2"
          data-testid="evidence-health-anomaly"
        >
          Warning: Health score outside expected 0-100 range
        </p>
      )}
    </div>
  );
});

// ─────────────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────────────

export default EvidenceHealthStrip;

// Re-export for testing
export {
  safeNumber,
  getSafeStatus,
  getSafeBand,
  getSafeLabel,
  formatAgeDays,
  formatHealthScore,
  formatDaysUntilStale,
  STATUS_CONFIG,
  BAND_CONFIG,
  VALID_STATUSES,
  VALID_BANDS,
};
