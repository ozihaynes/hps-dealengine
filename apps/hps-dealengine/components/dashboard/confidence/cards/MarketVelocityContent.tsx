/**
 * MarketVelocityContent — Slice 15
 *
 * Expanded content for Market Velocity card showing:
 * - Velocity band (hot/warm/balanced/cool/cold)
 * - DOM, MOI, Absorption Rate
 * - Sale/List ratio
 * - Liquidity score
 *
 * @module components/dashboard/confidence/cards/MarketVelocityContent
 * @version 1.0.0 (Slice 15)
 */

"use client";

import { memo } from "react";
import type { MarketVelocity } from "@hps-internal/contracts";
import { cn } from "@/components/ui";
import { safeNumber } from "@/lib/utils/numbers";

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface MarketVelocityContentProps {
  data: MarketVelocity | null;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

// SEMANTIC COLORS ONLY - no blue/cyan
// hot = good for sellers = emerald
// warm = moderate = amber
// balanced = neutral = slate
// cool = slowing = amber (transitional)
// cold = bad for sellers = slate (muted)
const BAND_CONFIG = {
  hot: { label: "Hot Market", color: "bg-emerald-500", text: "text-emerald-400", border: "border-emerald-500/30" },
  warm: { label: "Warm Market", color: "bg-amber-500", text: "text-amber-400", border: "border-amber-500/30" },
  balanced: { label: "Balanced", color: "bg-slate-400", text: "text-slate-300", border: "border-slate-400/30" },
  cool: { label: "Cool Market", color: "bg-amber-500", text: "text-amber-400", border: "border-amber-500/30" },
  cold: { label: "Cold Market", color: "bg-slate-500", text: "text-slate-400", border: "border-slate-500/30" },
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export const MarketVelocityContent = memo(function MarketVelocityContent({
  data,
}: MarketVelocityContentProps): JSX.Element {
  if (!data) {
    return (
      <div className="text-center py-4 text-sm text-slate-500">
        No market data available
      </div>
    );
  }

  const band = data.velocity_band ?? "cold";
  const bandConfig = BAND_CONFIG[band] ?? BAND_CONFIG.cold;

  const dom = safeNumber(data.dom_zip_days);
  const moi = safeNumber(data.moi_zip_months);
  const absorption = safeNumber(data.absorption_rate);
  const saleToList = safeNumber(data.sale_to_list_pct);
  const liquidity = safeNumber(data.liquidity_score);
  const cashBuyer = safeNumber(data.cash_buyer_share_pct);

  return (
    <div className="space-y-3" data-testid="market-velocity-content">
      {/* Band indicator */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={cn("w-3 h-3 rounded-full", bandConfig.color)} />
          <span className={cn("text-sm font-medium", bandConfig.text)}>
            {bandConfig.label}
          </span>
        </div>
        {liquidity !== null && (
          <div className="flex items-center gap-1 text-xs">
            <span className="text-slate-500">Liquidity:</span>
            <span className={cn(
              "font-medium",
              liquidity >= 70 ? "text-emerald-400" :
              liquidity >= 50 ? "text-amber-400" : "text-red-400"
            )}>
              {Math.round(liquidity)}
            </span>
          </div>
        )}
      </div>

      {/* Key metrics grid */}
      <div className="grid grid-cols-2 gap-3">
        <MetricBox
          label="Days on Market"
          value={dom !== null ? `${Math.round(dom)}` : "—"}
          subtext="ZIP avg"
          color={dom !== null && dom <= 30 ? "emerald" : dom !== null && dom <= 60 ? "amber" : "red"}
        />
        <MetricBox
          label="Months Inventory"
          value={moi !== null ? moi.toFixed(1) : "—"}
          subtext="MOI"
          color={moi !== null && moi <= 4 ? "emerald" : moi !== null && moi <= 6 ? "amber" : "red"}
        />
        <MetricBox
          label="Absorption Rate"
          value={absorption !== null ? absorption.toFixed(1) : "—"}
          subtext="sales/mo"
          color="slate"
        />
        <MetricBox
          label="Sale/List"
          value={saleToList !== null ? `${saleToList.toFixed(1)}%` : "—"}
          subtext="ratio"
          color={saleToList !== null && saleToList >= 98 ? "emerald" : saleToList !== null && saleToList >= 95 ? "amber" : "red"}
        />
      </div>

      {/* Additional info */}
      {(cashBuyer !== null || data.active_listings !== null || data.yoy_price_change_pct !== null) && (
        <div className="pt-2 border-t border-white/10 grid grid-cols-3 gap-2 text-xs text-center">
          {cashBuyer !== null && (
            <div>
              <div className="text-slate-300 font-medium">{cashBuyer.toFixed(0)}%</div>
              <div className="text-slate-500">Cash Buyers</div>
            </div>
          )}
          {data.active_listings !== null && (
            <div>
              <div className="text-slate-300 font-medium">{data.active_listings}</div>
              <div className="text-slate-500">Active</div>
            </div>
          )}
          {data.yoy_price_change_pct != null && (
            <div>
              <div className={cn(
                "font-medium",
                data.yoy_price_change_pct >= 0 ? "text-emerald-400" : "text-red-400"
              )}>
                {data.yoy_price_change_pct >= 0 ? "+" : ""}{data.yoy_price_change_pct.toFixed(1)}%
              </div>
              <div className="text-slate-500">YoY</div>
            </div>
          )}
        </div>
      )}

      {/* Data source */}
      {data.data_source && (
        <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs">
          <span className="text-slate-500">Source: {data.data_source}</span>
          {data.data_age_days !== null && (
            <span className="text-slate-500">{data.data_age_days}d ago</span>
          )}
        </div>
      )}
    </div>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// HELPER COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

interface MetricBoxProps {
  label: string;
  value: string;
  subtext: string;
  color: "emerald" | "amber" | "red" | "slate";
}

function MetricBox({ label, value, subtext, color }: MetricBoxProps) {
  // SEMANTIC COLORS ONLY - no blue
  const colorClasses = {
    emerald: "text-emerald-400",
    amber: "text-amber-400",
    red: "text-red-400",
    slate: "text-slate-300",
  };

  return (
    <div className="p-2 rounded-lg bg-slate-800/50 border border-white/10">
      <div className="text-xs text-slate-500 mb-1">{label}</div>
      <div className="flex items-baseline gap-1">
        <span className={cn("text-lg font-bold", colorClasses[color])}>
          {value}
        </span>
        <span className="text-xs text-slate-500">{subtext}</span>
      </div>
    </div>
  );
}

export default MarketVelocityContent;
