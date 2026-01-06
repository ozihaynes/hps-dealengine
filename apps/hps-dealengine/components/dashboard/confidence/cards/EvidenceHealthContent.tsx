/**
 * EvidenceHealthContent — Slice 15
 *
 * Expanded content for Evidence Health card showing:
 * - Progress bar (collected/total)
 * - Evidence checklist with status indicators
 * - Critical missing/stale warnings
 *
 * @module components/dashboard/confidence/cards/EvidenceHealthContent
 * @version 1.0.0 (Slice 15)
 */

"use client";

import { memo } from "react";
import type { EvidenceHealth } from "@hps-internal/contracts";
import { cn } from "@/components/ui";

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface EvidenceHealthContentProps {
  data: EvidenceHealth | null;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const STATUS_STYLES = {
  fresh: { icon: "✓", color: "text-emerald-400", bg: "bg-emerald-500/20" },
  stale: { icon: "⚠", color: "text-amber-400", bg: "bg-amber-500/20" },
  missing: { icon: "✗", color: "text-red-400", bg: "bg-red-500/20" },
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export const EvidenceHealthContent = memo(function EvidenceHealthContent({
  data,
}: EvidenceHealthContentProps): JSX.Element {
  if (!data) {
    return (
      <div className="text-center py-4 text-sm text-slate-500">
        No evidence data available
      </div>
    );
  }

  const items = data.items ?? [];
  const freshCount = data.fresh_count ?? 0;
  const staleCount = data.stale_count ?? 0;
  const missingCount = data.missing_count ?? 0;
  const total = items.length || 5;
  const collected = freshCount + staleCount;
  const pct = total > 0 ? Math.round((freshCount / total) * 100) : 0;

  return (
    <div className="space-y-3" data-testid="evidence-health-content">
      {/* Health score + band */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-400">Health Score</span>
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-slate-100">
            {data.health_score ?? "—"}/100
          </span>
          {data.health_band && (
            <span className={cn(
              "px-2 py-0.5 text-xs rounded capitalize",
              data.health_band === "excellent" && "bg-emerald-500/20 text-emerald-400",
              data.health_band === "good" && "bg-blue-500/20 text-blue-400",
              data.health_band === "fair" && "bg-amber-500/20 text-amber-400",
              data.health_band === "poor" && "bg-red-500/20 text-red-400"
            )}>
              {data.health_band}
            </span>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div>
        <div className="flex justify-between text-xs mb-1">
          <span className="text-slate-400">
            {freshCount} fresh / {total} total
          </span>
          <span className="text-slate-300">{pct}% fresh</span>
        </div>
        <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              pct >= 80 ? "bg-emerald-500" :
              pct >= 60 ? "bg-blue-500" :
              pct >= 40 ? "bg-amber-500" : "bg-red-500"
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Status summary */}
      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <div className="p-2 rounded bg-emerald-500/10 border border-emerald-500/20">
          <div className="text-emerald-400 font-bold">{freshCount}</div>
          <div className="text-slate-500">Fresh</div>
        </div>
        <div className="p-2 rounded bg-amber-500/10 border border-amber-500/20">
          <div className="text-amber-400 font-bold">{staleCount}</div>
          <div className="text-slate-500">Stale</div>
        </div>
        <div className="p-2 rounded bg-red-500/10 border border-red-500/20">
          <div className="text-red-400 font-bold">{missingCount}</div>
          <div className="text-slate-500">Missing</div>
        </div>
      </div>

      {/* Evidence items list */}
      <div className="space-y-1.5 max-h-48 overflow-y-auto">
        {items.map((item, idx) => {
          const status = item.status ?? "missing";
          const style = STATUS_STYLES[status] ?? STATUS_STYLES.missing;

          return (
            <div
              key={item.evidence_type ?? idx}
              className="flex items-center justify-between text-sm"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="text-slate-300 truncate">
                  {item.label ?? item.evidence_type}
                </span>
                {item.is_critical && (
                  <span className="text-[10px] px-1 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30 shrink-0">
                    Critical
                  </span>
                )}
              </div>
              <span className={cn(
                "flex items-center gap-1 px-2 py-0.5 rounded text-xs shrink-0",
                style.bg, style.color
              )}>
                {style.icon} {status}
              </span>
            </div>
          );
        })}
      </div>

      {/* Critical warnings */}
      {(data.any_critical_missing || data.any_critical_stale) && (
        <div className="pt-2 border-t border-white/10 space-y-1">
          {data.any_critical_missing && data.missing_critical.length > 0 && (
            <div className="text-xs text-red-400">
              ⚠ Missing critical: {data.missing_critical.join(", ")}
            </div>
          )}
          {data.any_critical_stale && data.stale_critical.length > 0 && (
            <div className="text-xs text-amber-400">
              ⚠ Stale critical: {data.stale_critical.join(", ")}
            </div>
          )}
        </div>
      )}

      {/* Recommended action */}
      {data.recommended_action && (
        <div className="pt-2 border-t border-white/10">
          <span className="text-xs text-slate-400">
            {data.recommended_action}
          </span>
        </div>
      )}
    </div>
  );
});

export default EvidenceHealthContent;
