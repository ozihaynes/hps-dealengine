/**
 * ArvConfidenceContent — Slice 15
 *
 * Expanded content for ARV Confidence card showing:
 * - ARV range (low/mid/high)
 * - Visual band representation
 * - Confidence level
 * - Source attribution
 *
 * @module components/dashboard/confidence/cards/ArvConfidenceContent
 * @version 1.0.0 (Slice 15)
 */

"use client";

import { memo } from "react";
import type { ArvBand } from "@/components/dashboard/arv";
import { cn } from "@/components/ui";
import { safeNumber, formatCurrency } from "@/lib/utils/numbers";

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface ArvConfidenceContentProps {
  data: ArvBand | null;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const CONFIDENCE_COLORS = {
  high: { bg: "bg-emerald-500/20", text: "text-emerald-400", border: "border-emerald-500/30" },
  medium: { bg: "bg-amber-500/20", text: "text-amber-400", border: "border-amber-500/30" },
  low: { bg: "bg-red-500/20", text: "text-red-400", border: "border-red-500/30" },
} as const;

const SOURCE_LABELS: Record<string, string> = {
  comps: "Comparable Sales",
  avm: "Automated Valuation",
  hybrid: "Hybrid (Comps + AVM)",
  manual: "Manual Entry",
};

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export const ArvConfidenceContent = memo(function ArvConfidenceContent({
  data,
}: ArvConfidenceContentProps): JSX.Element {
  if (!data) {
    return (
      <div className="text-center py-4 text-sm text-zinc-500">
        No ARV data available
      </div>
    );
  }

  const low = safeNumber(data.arv_low);
  const mid = safeNumber(data.arv_mid);
  const high = safeNumber(data.arv_high);

  const spread = low !== null && high !== null ? high - low : null;
  const spreadPct = mid !== null && spread !== null && mid > 0
    ? (spread / mid) * 100
    : null;

  const confidence = data.confidence ?? "low";
  const confidenceStyle = CONFIDENCE_COLORS[confidence] ?? CONFIDENCE_COLORS.low;

  return (
    <div className="space-y-3" data-testid="arv-confidence-content">
      {/* Confidence + Source header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-zinc-400">Confidence</span>
          <span className={cn(
            "px-2 py-0.5 text-xs font-medium rounded border capitalize",
            confidenceStyle.bg, confidenceStyle.text, confidenceStyle.border
          )}>
            {confidence}
          </span>
        </div>
        {data.source && (
          <span className="text-xs text-zinc-500">
            {SOURCE_LABELS[data.source] ?? data.source}
          </span>
        )}
      </div>

      {/* ARV Range visualization */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-zinc-500">
          <span>Low</span>
          <span>Mid</span>
          <span>High</span>
        </div>

        {/* Visual bar */}
        <div className="relative h-10 bg-zinc-800 rounded-lg overflow-hidden">
          {/* Range gradient */}
          <div
            className="absolute top-0 bottom-0 bg-gradient-to-r from-amber-500/20 via-emerald-500/30 to-amber-500/20"
            style={{ left: "5%", right: "5%" }}
          />

          {/* Mid marker */}
          <div className="absolute top-0 bottom-0 w-0.5 bg-emerald-500 left-1/2 transform -translate-x-1/2" />

          {/* Values */}
          <div className="absolute inset-0 flex items-center justify-between px-3 text-sm">
            <span className="text-zinc-300 font-medium">
              {formatCurrency(low)}
            </span>
            <span className="text-emerald-400 font-bold text-lg">
              {formatCurrency(mid)}
            </span>
            <span className="text-zinc-300 font-medium">
              {formatCurrency(high)}
            </span>
          </div>
        </div>
      </div>

      {/* Spread info */}
      {spread !== null && spreadPct !== null && (
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-700/50">
          <div className="text-sm">
            <span className="text-zinc-500 block text-xs">Range Spread</span>
            <span className="text-zinc-300 font-medium">
              {formatCurrency(spread)}
            </span>
          </div>
          <div className="text-sm">
            <span className="text-zinc-500 block text-xs">Spread %</span>
            <span className={cn(
              "font-medium",
              spreadPct <= 10 ? "text-emerald-400" :
              spreadPct <= 15 ? "text-amber-400" : "text-red-400"
            )}>
              {spreadPct.toFixed(1)}%
            </span>
          </div>
        </div>
      )}

      {/* Confidence interpretation */}
      <div className="pt-2 border-t border-zinc-700/50 text-xs text-zinc-400">
        {confidence === "high" && "Strong comp support. ARV estimate is reliable."}
        {confidence === "medium" && "Moderate confidence. Review comps for accuracy."}
        {confidence === "low" && "Limited data. ARV estimate has higher uncertainty."}
      </div>
    </div>
  );
});

export default ArvConfidenceContent;
