"use client";

import React from "react";

import type { StrategyViewModel } from "@/lib/overviewStrategy";
import { fmt$ } from "@/utils/helpers";
import { GlassCard, Badge, Icon } from "../ui";
import { Icons } from "@/constants";

const labelOrDash = (value: number | null, max = 0) =>
  value == null || !Number.isFinite(value) ? "—" : fmt$(value, max);

export function StrategyPostureCard({ view }: { view: StrategyViewModel }) {
  const shortfallPct =
    view.payoffProjected && view.shortfallToPayoff != null
      ? `${((view.shortfallToPayoff / view.payoffProjected) * 100).toFixed(1)}%`
      : null;

  return (
    <GlassCard className="p-4 md:p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Icon d={Icons.trending} size={18} className="text-accent-blue" />
          <div>
            <p className="label-xs uppercase text-text-secondary">Strategy & Posture</p>
            <p className="text-lg font-semibold text-text-primary">
              {view.primaryLabel}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge color={view.workflowBadge}>State: {view.workflowState}</Badge>
          <Badge color={view.confidenceBadge}>Confidence: {view.confidenceGrade}</Badge>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-lg border border-white/5 bg-white/5 p-3">
          <p className="label-xs uppercase text-text-secondary">Primary Offer</p>
          <p className="text-2xl font-bold text-text-primary font-mono">
            {labelOrDash(view.primaryMao, 0)}
          </p>
        </div>
        <div className="rounded-lg border border-white/5 bg-white/5 p-3">
          <p className="label-xs uppercase text-text-secondary">Projected Payoff</p>
          <p className="text-2xl font-bold text-text-primary font-mono">
            {labelOrDash(view.payoffProjected, 0)}
          </p>
          <p className="text-xs text-text-secondary mt-1">
            Shortfall: {labelOrDash(view.shortfallToPayoff, 0)}
            {shortfallPct ? ` (${shortfallPct})` : ""}
          </p>
        </div>
        <div className="rounded-lg border border-white/5 bg-white/5 p-3">
          <p className="label-xs uppercase text-text-secondary">Bands & Gap</p>
          <p className="text-sm text-text-primary">
            {view.bands.gapFlag
              ? "Gap detected between buyer/seller ranges."
              : view.bands.sweetSpot
              ? `Sweet spot near ${fmt$(view.bands.sweetSpot, 0)}`
              : "No band info"}
          </p>
          <p className="text-xs text-text-secondary">
            Seller band: {view.bands.rawSellerBand ?? "—"} · Buyer band:{" "}
            {view.bands.rawBuyerBand ?? "—"}
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-white/5 bg-white/5 p-3 space-y-2">
        <p className="label-xs uppercase text-text-secondary">MAOs by Path</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-sm">
          <div className="flex justify-between">
            <span>Wholesale</span>
            <span className="font-mono text-text-primary">
              {labelOrDash(view.maoBundle.wholesale, 0)}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Flip</span>
            <span className="font-mono text-text-primary">
              {labelOrDash(view.maoBundle.flip, 0)}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Wholetail</span>
            <span className="font-mono text-text-primary">
              {labelOrDash(view.maoBundle.wholetail, 0)}
            </span>
          </div>
          <div className="flex justify-between">
            <span>As-Is Cap</span>
            <span className="font-mono text-text-primary">
              {labelOrDash(view.maoBundle.asIsCap, 0)}
            </span>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-white/5 bg-white/5 p-3">
        <p className="label-xs uppercase text-text-secondary">Recommendation</p>
        <p className="text-sm text-text-primary">
          {view.recommendation ?? "No recommendation yet."}
        </p>
      </div>
    </GlassCard>
  );
}
