"use client";

import React from "react";

import type { RiskViewModel } from "@/lib/overviewRiskTimeline";
import type { GlossaryKey } from "@/lib/glossary";
import { GlassCard, Badge, Icon } from "../ui";
import { Icons } from "@/constants";
import { InfoTooltip } from "../ui/InfoTooltip";

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
  const gateHelpMap: Record<string, GlossaryKey> = {
    uninsurable: "uninsurable",
    fha_90_day_rule: "fha_90_day_rule",
    fema_50_percent_rule: "fema_50_percent_rule",
    firpta: "firpta",
    pace_assessment: "pace_assessment",
    condo_sirs_milestone: "condo_sirs_milestone",
    scra_verification: "scra_verification",
    risk_gate: "risk_gate",
  };

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
        <Badge color={overallBadge.color} data-testid="risk-overall-badge">
          Risk: {overallBadge.label}
        </Badge>
      </div>

      {!hasData ? (
        <p className="text-sm text-text-secondary">
          No analyzed run yet — run the deal to surface risk and compliance gates.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {risk.gates.map((gate) => {
            const badge = badgeForStatus(gate.status);
            const primaryReason = gate.reasons[0] ?? null;
            const disabled = gate.reasons.includes("disabled") || gate.status === "unknown";
            const gateHelpKey = gateHelpMap[gate.key as string];
            return (
              <div
                key={gate.key as string}
                className={`rounded-lg border border-white/5 bg-white/5 p-3 space-y-1 ${disabled ? "opacity-60" : ""}`}
                data-testid={`risk-gate-${gate.key as string}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-text-primary flex items-center gap-1">
                    {gate.label}
                    {gateHelpKey ? <InfoTooltip helpKey={gateHelpKey} /> : null}
                  </p>
                  <Badge color={badge.color}>{disabled ? "Disabled" : badge.label}</Badge>
                </div>
                {primaryReason ? (
                  <p className="text-xs text-text-secondary leading-snug">{primaryReason}</p>
                ) : (
                  <p className="text-xs text-text-secondary">-</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </GlassCard>
  );
}
