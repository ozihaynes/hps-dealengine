"use client";

import React from "react";

import type {
  ConfidenceViewModel,
  EvidenceViewModel,
  WorkflowViewModel,
} from "@/lib/overviewRiskTimeline";
import { GlassCard, Badge, Icon } from "../ui";
import { Icons } from "@/constants";

const badgeForConfidence = (grade: EvidenceViewModel["confidenceGrade"]) => {
  switch (grade) {
    case "A":
      return { color: "green" as const, label: "A" };
    case "B":
      return { color: "blue" as const, label: "B" };
    case "C":
      return { color: "orange" as const, label: "C" };
    default:
      return { color: "blue" as const, label: "Unknown" };
  }
};

const pillForWorkflow = (state: WorkflowViewModel["state"]) => {
  switch (state) {
    case "ReadyForOffer":
      return { color: "green" as const, label: "Ready for Offer" };
    case "NeedsReview":
      return { color: "orange" as const, label: "Needs Review" };
    case "NeedsInfo":
      return { color: "blue" as const, label: "Needs Info" };
    default:
      return { color: "blue" as const, label: "Unknown" };
  }
};

export function DataEvidenceCard({
  evidence,
  confidence,
  workflow,
}: {
  evidence: EvidenceViewModel;
  confidence: ConfidenceViewModel;
  workflow: WorkflowViewModel;
}) {
  const badge = badgeForConfidence(confidence.grade);
  const workflowBadge = pillForWorkflow(workflow.state);
  const hasFreshnessFlags =
    evidence.missingKinds.length > 0 ||
    evidence.staleKinds.length > 0 ||
    evidence.blockingKinds.length > 0;
  const hasFreshnessRows = evidence.freshnessRows.length > 0;
  const hasAnyFreshness = hasFreshnessFlags || hasFreshnessRows;
  const workflowSummary = (() => {
    if (workflow.state === "NeedsInfo") {
      if (evidence.blockingKinds.length > 0) {
        return `Needs Info - blocking evidence: ${evidence.blockingKinds.join(", ")}`;
      }
      return "Needs Info - blocking items outstanding.";
    }
    if (workflow.state === "NeedsReview") {
      return "Needs Review - borderline spread, watch gates, or degraded confidence.";
    }
    if (workflow.state === "ReadyForOffer") {
      return "Ready - critical evidence present and no hard gate failures.";
    }
    return "Workflow status unknown.";
  })();

  return (
    <GlassCard className="p-4 md:p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Icon d={Icons.lightbulb} size={18} className="text-accent-blue" />
          <div>
            <p className="label-xs uppercase text-text-secondary">Data & Evidence</p>
            <p className="text-lg font-semibold text-text-primary">Confidence & gaps</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge color={badge.color} dataTestId="confidence-badge">
            Confidence: {badge.label}
          </Badge>
          <Badge color={workflowBadge.color} dataTestId="workflow-pill">
            Workflow: {workflowBadge.label}
          </Badge>
        </div>
      </div>

      <div className="rounded-lg border border-white/5 bg-white/5 p-3 text-[12px] text-text-secondary">
        {workflowSummary}
        {evidence.placeholdersUsed && (
          <span className="ml-2 text-accent-orange">
            Placeholders used for {evidence.placeholderKinds.join(", ") || "missing evidence"}.
          </span>
        )}
        {!evidence.placeholdersAllowed && evidence.missingKinds.length > 0 && (
          <span className="ml-2 text-accent-orange">Placeholders disabled by policy.</span>
        )}
      </div>

      {(confidence.reasons.length > 0 || workflow.reasons.length > 0) && (
        <div className="rounded-lg border border-white/5 bg-white/5 p-3 space-y-3">
          {confidence.reasons.length > 0 && (
            <div>
              <p className="label-xs uppercase text-text-secondary mb-1">Confidence reasons</p>
              <ul className="list-disc pl-4 space-y-1 text-sm text-text-secondary">
                {confidence.reasons.map((reason, idx) => (
                  <li key={idx} className="text-text-primary">
                    {reason}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {workflow.reasons.length > 0 && (
            <div>
              <p className="label-xs uppercase text-text-secondary mb-1">Workflow reasons</p>
              <ul className="list-disc pl-4 space-y-1 text-sm text-text-secondary">
                {workflow.reasons.map((reason, idx) => (
                  <li key={idx} className="text-text-primary">
                    {reason}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {evidence.confidenceReasons.length > 0 && (
        <div className="rounded-lg border border-white/5 bg-white/5 p-3">
          <p className="label-xs uppercase text-text-secondary mb-1">Evidence confidence notes</p>
          <ul className="list-disc pl-4 space-y-1 text-sm text-text-secondary">
            {evidence.confidenceReasons.map((reason, idx) => (
              <li key={idx} className="text-text-primary">
                {reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      {!hasAnyFreshness ? (
        <p className="text-sm text-text-secondary">
          Evidence complete and fresh. No gaps flagged.
        </p>
      ) : (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-white/5 bg-white/5 p-3">
              <p className="label-xs uppercase text-text-secondary mb-1">Missing</p>
              {evidence.missingKinds.length === 0 ? (
                <p className="text-sm text-text-secondary">None</p>
              ) : (
                <ul className="list-disc pl-4 space-y-1 text-sm text-text-primary">
                  {evidence.missingKinds.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}
            </div>
            <div className="rounded-lg border border-white/5 bg-white/5 p-3">
              <p className="label-xs uppercase text-text-secondary mb-1">Stale</p>
              {evidence.staleKinds.length === 0 ? (
                <p className="text-sm text-text-secondary">None</p>
              ) : (
                <ul className="list-disc pl-4 space-y-1 text-sm text-text-primary">
                  {evidence.staleKinds.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}
            </div>
            <div className="rounded-lg border border-white/5 bg-white/5 p-3">
              <p className="label-xs uppercase text-text-secondary mb-1">Blocking</p>
              {evidence.blockingKinds.length === 0 ? (
                <p className="text-sm text-text-secondary">None</p>
              ) : (
                <ul className="list-disc pl-4 space-y-1 text-sm text-text-primary">
                  {evidence.blockingKinds.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {evidence.freshnessRows.length > 0 && (
            <div className="rounded-lg border border-white/5 bg-white/5 p-3">
              <p className="label-xs uppercase text-text-secondary mb-2">Evidence freshness</p>
              <div className="grid gap-2 text-[13px] md:grid-cols-2">
                {evidence.freshnessRows.map((row) => (
                  <div
                    key={row.kind}
                    className="flex items-center justify-between gap-2 rounded-md bg-white/5 px-2 py-1"
                    data-testid={`evidence-kind-${row.kind}`}
                  >
                    <div className="flex flex-col">
                      <span className="font-semibold text-text-primary">{row.label}</span>
                      <span className="text-[11px] text-text-secondary">
                        {row.ageDays != null ? `${row.ageDays}d old` : "No date"}
                      </span>
                    </div>
                    <Badge
                      color={row.status === "fresh" ? "green" : row.status === "stale" ? "orange" : "blue"}
                      dataTestId={`evidence-status-${row.kind}`}
                    >
                      {row.status}
                      {row.blocking ? " - blocking" : ""}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </GlassCard>
  );
}
