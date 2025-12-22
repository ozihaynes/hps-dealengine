"use client";

import React from "react";

import type { TimelineViewModel } from "@/lib/overviewRiskTimeline";
import { fmt$ } from "@/utils/helpers";
import { GlassCard, Badge, Icon } from "../ui";
import { InfoTooltip } from "../ui/InfoTooltip";
import { Icons } from "@/constants";

const urgencyBadge = (
  tone: TimelineViewModel["urgencyTone"],
  label: string,
) => {
  switch (tone) {
    case "high":
      return { color: "red" as const, label };
    case "medium":
      return { color: "orange" as const, label };
    case "low":
      return { color: "green" as const, label };
    default:
      return { color: "blue" as const, label };
  }
};

const labelOrDash = (value: number | null, digits = 0) =>
  value == null || !Number.isFinite(value)
    ? "—"
    : digits > 0
    ? value.toFixed(digits)
    : `${value}`;

export function TimelineCarryCard({
  timeline,
}: {
  timeline: TimelineViewModel;
}) {
  const hasData =
    timeline.daysToMoney != null ||
    timeline.carryMonths != null ||
    timeline.carryTotal != null;
  const badge = urgencyBadge(timeline.urgencyTone, timeline.urgencyLabel);

  return (
    <GlassCard className="p-4 md:p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Icon d={Icons.briefcase} size={18} className="text-accent-blue" />
          <div>
            <p className="label-xs uppercase text-text-secondary">Timeline & Carry</p>
            <p className="text-lg font-semibold text-text-primary">
              Days to money and hold costs
            </p>
          </div>
        </div>
        <Badge color={badge.color} dataTestId="timeline-urgency">
          {badge.label}
        </Badge>
      </div>

          {!hasData ? (
            <p className="text-sm text-text-secondary">
              No timeline data yet — run the deal to compute days-to-money and carry.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border border-white/5 bg-white/5 p-3 space-y-1">
                <p className="label-xs uppercase text-text-secondary flex items-center gap-1">
                  Days to Money
                  <InfoTooltip helpKey="dtm" />
                </p>
                <p className="text-2xl font-bold font-mono text-text-primary" data-testid="timeline-dtm-value">
                  {labelOrDash(timeline.daysToMoney)}
                </p>
                <p className="text-xs text-text-secondary" data-testid="timeline-speed-band">
                  Speed: {timeline.speedBand ?? "-"}
                </p>
              </div>
              <div className="rounded-lg border border-white/5 bg-white/5 p-3 space-y-1">
                <p className="label-xs uppercase text-text-secondary flex items-center gap-1">
                  Carry Months
                  <InfoTooltip helpKey="carry_months" />
                </p>
                <p className="text-2xl font-bold font-mono text-text-primary" data-testid="timeline-carry-months">
                  {labelOrDash(timeline.carryMonths, 1)}
                </p>
            {timeline.auctionDate ? (
              <p className="text-xs text-text-secondary">
                Auction: {timeline.auctionDate}
              </p>
            ) : null}
          </div>
          <div className="rounded-lg border border-white/5 bg-white/5 p-3 space-y-1">
            <p className="label-xs uppercase text-text-secondary">Monthly Hold</p>
            <p className="text-2xl font-bold font-mono text-text-primary" data-testid="timeline-monthly-hold">
              {timeline.carryMonthly != null
                ? fmt$(timeline.carryMonthly, 0)
                : "-"}
            </p>
          </div>
          <div className="rounded-lg border border-white/5 bg-white/5 p-3 space-y-1">
            <p className="label-xs uppercase text-text-secondary">Total Carry</p>
            <p className="text-2xl font-bold font-mono text-text-primary" data-testid="timeline-total-carry">
              {timeline.carryTotal != null ? fmt$(timeline.carryTotal, 0) : "-"}
            </p>
          </div>
        </div>
      )}
    </GlassCard>
  );
}
