"use client";

import React from "react";

import type { OverviewGuardrailsView } from "@/lib/overviewGuardrails";
import { fmt$ } from "@/utils/helpers";
import { GlassCard, Icon } from "../ui";
import StatCard from "./StatCard";
import { Icons } from "@/constants";

const formatCurrency = (value: number | null): string =>
  value == null || !Number.isFinite(value) ? "—" : fmt$(value, 0);

const formatDelta = (label: string, value: number | null) => {
  if (value == null || !Number.isFinite(value)) return `${label}: —`;
  return `${label}: ${fmt$(value, 0)}`;
};

export function GuardrailsCard({ view }: { view: OverviewGuardrailsView }) {
  const deltas = [
    formatDelta(
      view.windowFloorToOffer != null && view.windowFloorToOffer < 0
        ? "Below Floor"
        : "Window to Floor",
      view.windowFloorToOffer,
    ),
    formatDelta("Headroom to Ceiling", view.headroomOfferToCeiling),
    formatDelta("Cushion vs Payoff", view.cushionVsPayoff),
  ];

  return (
    <GlassCard className="p-4 md:p-5 space-y-4">
      <div className="flex items-center justify-start gap-3">
        <Icon d={Icons.shield} size={18} className="text-accent-blue" />
        <h3 className="text-lg font-semibold text-text-primary">
          Guardrails & Profit
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <StatCard
          label="Respect Floor"
          value={formatCurrency(view.floor)}
          icon={<Icon d={Icons.shield} size={18} className="text-accent-blue" />}
          helpKey="respect_floor"
        />
        <StatCard
          label="Current Offer"
          value={formatCurrency(view.offer)}
          icon={<Icon d={Icons.dollar} size={18} className="text-accent-blue" />}
        />
        <StatCard
          label="Buyer Ceiling"
          value={formatCurrency(view.ceiling)}
          icon={<Icon d={Icons.trending} size={18} className="text-accent-blue" />}
          helpKey="buyer_ceiling"
        />
      </div>

      <div className="rounded-lg border border-white/5 bg-white/5 px-3 py-2 text-sm text-text-secondary">
        <div className="flex flex-wrap gap-3">
          {deltas.map((text, idx) => (
            <span key={idx} className="flex items-center gap-1">
              <span className="text-text-primary/70">{text}</span>
            </span>
          ))}
        </div>
      </div>
    </GlassCard>
  );
}
