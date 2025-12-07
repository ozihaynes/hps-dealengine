"use client";

import React from "react";

import type { OverviewGuardrailsView } from "@/lib/overviewGuardrails";
import { Badge, GlassCard } from "../ui";

type PillProps = {
  label: string;
  value: string;
  color: "green" | "blue" | "orange" | "red";
};

const Pill = ({ label, value, color }: PillProps) => (
  <div className="flex items-center justify-between gap-2 rounded-lg border border-white/5 bg-white/5 px-3 py-2">
    <span className="text-xs uppercase tracking-wide text-text-secondary">
      {label}
    </span>
    <Badge color={color}>{value}</Badge>
  </div>
);

const guardrailsBadge = (status: OverviewGuardrailsView["guardrailsStatus"]) => {
  switch (status) {
    case "ok":
      return { value: "OK", color: "green" as const };
    case "tight":
      return { value: "Tight", color: "orange" as const };
    case "broken":
      return { value: "Broken", color: "red" as const };
    default:
      return { value: "Unknown", color: "blue" as const };
  }
};

const riskBadge = (risk: OverviewGuardrailsView["riskPosture"]) => {
  switch (risk) {
    case "pass":
      return { value: "Pass", color: "green" as const };
    case "watch":
      return { value: "Watch", color: "orange" as const };
    case "fail":
      return { value: "Fail", color: "red" as const };
    default:
      return { value: "Unknown", color: "blue" as const };
  }
};

const confidenceBadge = (
  grade: OverviewGuardrailsView["confidenceGrade"],
) => {
  switch (grade) {
    case "A":
      return { value: "A", color: "green" as const };
    case "B":
      return { value: "B", color: "blue" as const };
    case "C":
      return { value: "C", color: "orange" as const };
    default:
      return { value: "—", color: "blue" as const };
  }
};

const workflowBadge = (
  state: OverviewGuardrailsView["workflowState"],
) => {
  switch (state) {
    case "ready_draft":
      return { value: "Ready (Draft)", color: "green" as const };
    case "needs_review":
      return { value: "Needs Review", color: "orange" as const };
    case "needs_run":
      return { value: "Needs Run", color: "blue" as const };
    default:
      return { value: "Needs Run", color: "blue" as const };
  }
};

export function DealHealthStrip({ view }: { view: OverviewGuardrailsView }) {
  const guardrail = guardrailsBadge(view.guardrailsStatus);
  const risk = riskBadge(view.riskPosture);
  const confidence = confidenceBadge(view.confidenceGrade);
  const workflow = workflowBadge(view.workflowState);

  return (
    <GlassCard className="p-3 md:p-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Pill label="Guardrails" value={guardrail.value} color={guardrail.color} />
        <Pill label="Risk" value={risk.value} color={risk.color} />
        <Pill label="Confidence" value={confidence.value} color={confidence.color} />
        <Pill label="Workflow" value={workflow.value} color={workflow.color} />
      </div>
    </GlassCard>
  );
}
