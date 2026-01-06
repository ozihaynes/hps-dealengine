/**
 * VerdictCard — Sub-Slice 9.2
 *
 * Dumb renderer displaying complete deal verdict with rationale,
 * blocking factors, and confidence. Composes VerdictChip internally.
 * All values from engine outputs via props — zero calculations.
 *
 * @defensive Handles null/undefined verdict with fallback UI
 * @traced data-testid for debugging and test selection
 */

import { type DealVerdict } from "@hps-internal/contracts";
import { cn } from "@/components/ui";
import { VerdictChip } from "./VerdictChip";

// ─────────────────────────────────────────────────────────────────────
// CONSTANTS (traced for debugging)
// ─────────────────────────────────────────────────────────────────────

const CONFIDENCE_THRESHOLDS = {
  high: 80,
  medium: 50,
} as const;

const CONFIDENCE_COLORS: Record<"high" | "medium" | "low" | "unknown", string> = {
  high: "text-emerald-400",
  medium: "text-amber-400",
  low: "text-red-400",
  unknown: "text-slate-400",
} as const;

// ─────────────────────────────────────────────────────────────────────
// HELPER: Safe number with NaN/Infinity guard
// ─────────────────────────────────────────────────────────────────────

function safeNumber(value: number | null | undefined): number | null {
  if (value == null) return null;
  if (!Number.isFinite(value)) return null;
  return value;
}

// ─────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────

export interface VerdictCardProps {
  /** Complete verdict object from engine. Null/undefined → fallback UI */
  verdict: DealVerdict | null | undefined;
  /** Card title override */
  title?: string;
  /** Show blocking factors section */
  showBlockingFactors?: boolean;
  /** Show confidence meter */
  showConfidence?: boolean;
  /** Compact mode reduces padding */
  compact?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// ─────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────

function getConfidenceLevel(
  pct: number | null | undefined
): "high" | "medium" | "low" | "unknown" {
  const safe = safeNumber(pct);
  if (safe === null) return "unknown";
  if (safe >= CONFIDENCE_THRESHOLDS.high) return "high";
  if (safe >= CONFIDENCE_THRESHOLDS.medium) return "medium";
  return "low";
}

function getConfidenceLabel(level: "high" | "medium" | "low" | "unknown"): string {
  const labels: Record<typeof level, string> = {
    high: "High",
    medium: "Medium",
    low: "Low",
    unknown: "Unknown",
  };
  return labels[level];
}

// ─────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────

export function VerdictCard({
  verdict,
  title = "Deal Verdict",
  showBlockingFactors = true,
  showConfidence = true,
  compact = false,
  className,
}: VerdictCardProps): JSX.Element {
  // DEFENSIVE: Handle null/undefined verdict
  if (!verdict) {
    return (
      <div
        data-testid="verdict-card"
        data-verdict="null"
        className={cn(
          // Matches Decision Hero Zone background
          "rounded-xl border border-white/10 bg-blue-500/10 backdrop-blur-xl",
          compact ? "p-3" : "p-4",
          className
        )}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-slate-300">{title}</h3>
          <VerdictChip recommendation={null} size="sm" />
        </div>
        <p className="text-sm text-slate-500 italic">
          Verdict not yet calculated
        </p>
      </div>
    );
  }

  // TRACED: Extract values from verdict
  const {
    recommendation,
    rationale,
    blocking_factors,
    confidence_pct,
  } = verdict;

  // DEFENSIVE: Normalize arrays
  const blockingFactors = Array.isArray(blocking_factors) ? blocking_factors : [];
  const hasBlockingFactors = blockingFactors.length > 0;

  // DEFENSIVE: Safe confidence percentage for display
  const safeConfidencePct = safeNumber(confidence_pct);

  // TRACED: Confidence level calculation
  const confidenceLevel = getConfidenceLevel(confidence_pct);
  const confidenceColor = CONFIDENCE_COLORS[confidenceLevel];
  const confidenceLabel = getConfidenceLabel(confidenceLevel);

  return (
    <div
      data-testid="verdict-card"
      data-verdict={recommendation ?? "unknown"}
      className={cn(
        // Matches Decision Hero Zone background
        "rounded-xl border border-white/10 bg-blue-500/10 backdrop-blur-xl",
        compact ? "p-3" : "p-4",
        className
      )}
    >
      {/* Header: Title + Chip */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-slate-300">{title}</h3>
        <VerdictChip
          recommendation={recommendation}
          confidencePct={confidence_pct}
          size="sm"
        />
      </div>

      {/* Rationale */}
      <div className="mb-3" data-testid="verdict-rationale">
        <p className="text-sm text-slate-400 leading-relaxed">
          {rationale || "No rationale provided"}
        </p>
      </div>

      {/* Blocking Factors */}
      {showBlockingFactors && hasBlockingFactors && (
        <div className="mb-3" data-testid="verdict-blocking-factors">
          <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">
            Blocking Factors
          </h4>
          <ul className="space-y-1">
            {blockingFactors.map((factor, idx) => (
              <li
                key={idx}
                className="flex items-start gap-2 text-sm text-red-400"
                data-testid="blocking-factor"
              >
                <span className="text-red-500 mt-0.5" aria-hidden="true">•</span>
                <span>{factor}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Confidence Meter */}
      {showConfidence && safeConfidencePct !== null && (
        <div data-testid="verdict-confidence">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-slate-500 uppercase tracking-wide">
              Confidence
            </span>
            <span className={cn("font-medium", confidenceColor)}>
              {confidenceLabel} ({Math.round(safeConfidencePct)}%)
            </span>
          </div>
          <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-300",
                confidenceLevel === "high" && "bg-emerald-500",
                confidenceLevel === "medium" && "bg-amber-500",
                confidenceLevel === "low" && "bg-red-500",
                confidenceLevel === "unknown" && "bg-slate-500"
              )}
              style={{ width: `${Math.min(100, Math.max(0, safeConfidencePct))}%` }}
              role="progressbar"
              aria-valuenow={safeConfidencePct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Confidence: ${Math.round(safeConfidencePct)}%`}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────────────

export default VerdictCard;

// Re-export constants for testing
export { safeNumber, CONFIDENCE_THRESHOLDS, CONFIDENCE_COLORS };
