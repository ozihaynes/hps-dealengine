/**
 * CompQualityContent — Slice 15
 *
 * Expanded content for Comp Quality card showing:
 * - Score and quality band
 * - Comp count
 * - Average distance
 * - Recency (age in days)
 * - Sqft variance
 *
 * @module components/dashboard/confidence/cards/CompQualityContent
 * @version 1.0.0 (Slice 15)
 */

"use client";

import { memo } from "react";
import type { CompQuality } from "@hps-internal/contracts";
import { cn } from "@/components/ui";
import { safeNumber } from "@/lib/utils/numbers";

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface CompQualityContentProps {
  data: CompQuality | null;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

// SEMANTIC COLORS ONLY - no blue
const BAND_COLORS: Record<string, string> = {
  excellent: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  good: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25", // CHANGED from blue to emerald
  fair: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  poor: "bg-red-500/20 text-red-400 border-red-500/30",
};

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export const CompQualityContent = memo(function CompQualityContent({
  data,
}: CompQualityContentProps): JSX.Element {
  if (!data) {
    return (
      <div className="text-center py-4 text-sm text-slate-500">
        No comp quality data available
      </div>
    );
  }

  const score = safeNumber(data.quality_score);
  const band = data.quality_band ?? "unknown";
  const bandStyle = BAND_COLORS[band] ?? BAND_COLORS.poor;

  const metrics = [
    {
      label: "Comps Used",
      value: safeNumber(data.comp_count)?.toString() ?? "—"
    },
    {
      label: "Avg Distance",
      value: safeNumber(data.avg_distance_miles) !== null
        ? `${data.avg_distance_miles.toFixed(2)} mi`
        : "—"
    },
    {
      label: "Avg Age",
      value: safeNumber(data.avg_age_days) !== null
        ? `${Math.round(data.avg_age_days)} days`
        : "—"
    },
    {
      label: "Sqft Variance",
      value: safeNumber(data.sqft_variance_pct) !== null
        ? `${data.sqft_variance_pct.toFixed(1)}%`
        : "—"
    },
  ];

  return (
    <div className="space-y-3" data-testid="comp-quality-content">
      {/* Score + Band header */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-400">Quality Score</span>
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-slate-100">
            {score !== null ? `${Math.round(score)}/100` : "—"}
          </span>
          <span className={cn(
            "px-2 py-0.5 text-xs font-medium rounded border capitalize",
            bandStyle
          )}>
            {band}
          </span>
        </div>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-2 gap-2">
        {metrics.map((m) => (
          <div key={m.label} className="flex justify-between text-sm">
            <span className="text-slate-500">{m.label}</span>
            <span className="text-slate-300">{m.value}</span>
          </div>
        ))}
      </div>

      {/* Score breakdown (if available) */}
      {data.score_breakdown && (
        <div className="pt-2 border-t border-white/10 space-y-1">
          <span className="text-xs text-slate-500 block mb-2">Score Breakdown</span>
          <div className="grid grid-cols-3 gap-2 text-xs">
            {data.score_breakdown.recency_score != null && (
              <div className="text-center">
                <div className="text-slate-300 font-medium">
                  {Math.round(data.score_breakdown.recency_score)}
                </div>
                <div className="text-slate-500">Recency</div>
              </div>
            )}
            {data.score_breakdown.proximity_score != null && (
              <div className="text-center">
                <div className="text-slate-300 font-medium">
                  {Math.round(data.score_breakdown.proximity_score)}
                </div>
                <div className="text-slate-500">Proximity</div>
              </div>
            )}
            {data.score_breakdown.similarity_score != null && (
              <div className="text-center">
                <div className="text-slate-300 font-medium">
                  {Math.round(data.score_breakdown.similarity_score)}
                </div>
                <div className="text-slate-500">Similarity</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Method badge - neutral/slate color */}
      {data.scoring_method && (
        <div className="flex items-center gap-2 pt-2 border-t border-slate-700/50">
          <span className="text-xs text-slate-500">Method:</span>
          <span className="px-2 py-0.5 text-xs rounded bg-slate-700 text-slate-300 border border-slate-600">
            {data.scoring_method === "fannie_mae" ? "Fannie Mae" : data.scoring_method}
          </span>
        </div>
      )}
    </div>
  );
});

export default CompQualityContent;
