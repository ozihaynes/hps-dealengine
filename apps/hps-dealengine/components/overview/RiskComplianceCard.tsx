"use client";

import React from "react";

import type { RiskViewModel } from "@/lib/overviewRiskTimeline";
import { GlassCard, Badge, Icon } from "../ui";
import { Icons } from "@/constants";

const badgeForStatus = (
  status: RiskViewModel["overallStatus"] | RiskViewModel["gates"][number]["status"],
) => {
  switch (status) {
    case "pass":
      return { label: "Pass", color: "green" as const };
    case "watch":
      return { label: "Watch", color: "orange" as const };
    case "fail":
      return { label: "Fail", color: "red" as const };
    default:
      return { label: "Unknown", color: "blue" as const };
  }
};

export function RiskComplianceCard({ risk }: { risk: RiskViewModel }) {
  const hasData =
    risk.overallStatus !== "unknown" ||
    risk.gates.some((gate) => gate.status !== "unknown");

  const overallBadge = badgeForStatus(risk.overallStatus);

  return (
    <GlassCard className="p-4 md:p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Icon d={Icons.alert} size={18} className="text-accent-blue" />
          <div>
            <p className="label-xs uppercase text-text-secondary">Risk & Compliance</p>
            <p className="text-lg font-semibold text-text-primary">Gate status</p>
          </div>
        </div>
        <Badge color={overallBadge.color}>Risk: {overallBadge.label}</Badge>
      </div>

      {!hasData ? (
        <p className="text-sm text-text-secondary">
          No analyzed run yet — run the deal to surface risk and compliance gates.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {risk.gates.map((gate) => {
            const badge = badgeForStatus(gate.status);
            return (
              <div
                key={gate.key as string}
                className="rounded-lg border border-white/5 bg-white/5 p-3 space-y-1"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-text-primary">{gate.label}</p>
                  <Badge color={badge.color}>{badge.label}</Badge>
                </div>
                {gate.reason ? (
                  <p className="text-xs text-text-secondary leading-snug">{gate.reason}</p>
                ) : (
                  <p className="text-xs text-text-secondary">—</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </GlassCard>
  );
}
