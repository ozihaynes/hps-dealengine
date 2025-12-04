"use client";

import React from "react";

import type { EvidenceViewModel } from "@/lib/overviewRiskTimeline";
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

export function DataEvidenceCard({ evidence }: { evidence: EvidenceViewModel }) {
  const badge = badgeForConfidence(evidence.confidenceGrade);
  const hasFreshness =
    evidence.missingKinds.length > 0 || evidence.staleKinds.length > 0;

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
        <Badge color={badge.color}>Confidence: {badge.label}</Badge>
      </div>

      {evidence.confidenceReasons.length > 0 && (
        <div className="rounded-lg border border-white/5 bg-white/5 p-3">
          <p className="label-xs uppercase text-text-secondary mb-1">Reasons</p>
          <ul className="list-disc pl-4 space-y-1 text-sm text-text-secondary">
            {evidence.confidenceReasons.map((reason, idx) => (
              <li key={idx} className="text-text-primary">
                {reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      {!hasFreshness ? (
        <p className="text-sm text-text-secondary">
          Evidence complete and fresh. No gaps flagged.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
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
        </div>
      )}
    </GlassCard>
  );
}
