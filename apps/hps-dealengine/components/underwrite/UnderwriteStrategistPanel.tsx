"use client";

import { useState } from "react";
import type { AiBridgeAnalysis } from "@hps-internal/contracts";

import { Button, GlassCard } from "@/components/ui";
import { fetchStrategistAnalysis } from "@/lib/aiBridge";

type Props = {
  open: boolean;
  onClose: () => void;
  dealId: string;
  runId: string;
  posture: "conservative" | "base" | "aggressive";
};

export default function UnderwriteStrategistPanel({
  open,
  onClose,
  dealId,
  runId,
  posture,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<AiBridgeAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const strategistDisabled = true;

  const loadAnalysis = async () => {
    setError(null);
    if (!dealId || !runId) {
      setError("Run not available yet. Save a run before asking Strategist.");
      return;
    }
    if (strategistDisabled) {
      setError("Strategist is temporarily disabled while we finish v1.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetchStrategistAnalysis({
        dealId,
        runId,
        posture,
        prompt: "Summarize risks, strengths, missing evidence, and next actions.",
      });
      setAnalysis(res.analysis);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to load strategist analysis.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <GlassCard className="relative mt-4 border border-white/10 bg-surface-elevated/60">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-semibold text-text-primary">
            AI Strategist (beta)
          </h3>
          <p className="text-xs text-text-secondary">
            Advisory only. Numbers come from engine + policy; this does not change calculations.
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={onClose}>
            Close
          </Button>
          <Button
            size="sm"
            variant="primary"
            onClick={loadAnalysis}
            disabled={loading || !runId || strategistDisabled}
          >
            {strategistDisabled ? "Strategist disabled" : loading ? "Loading..." : "Refresh"}
          </Button>
        </div>
      </div>

      {error && (
        <div className="mt-2 rounded border border-red-500/40 bg-red-500/5 px-3 py-2 text-xs text-red-200">
          {error}
        </div>
      )}

      {!analysis && !loading && !error && (
        <p className="mt-3 text-xs text-text-secondary">
          Run analyze and save a run, then refresh to see strategist guidance.
        </p>
      )}

      {analysis && (
        <div className="mt-3 space-y-3 text-sm text-text-primary">
          <Section title="Summary" items={[analysis.summary]} />
          <Section title="Strengths" items={analysis.strengths} />
          <Section title="Risks" items={analysis.risks} />
          <Section title="Questions" items={analysis.questions} />
          <Section title="Next Actions" items={analysis.nextActions} />
        </div>
      )}
    </GlassCard>
  );
}

function Section({ title, items }: { title: string; items: string[] }) {
  if (!items || items.length === 0) return null;
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
        {title}
      </p>
      <ul className="mt-1 space-y-1 text-sm text-text-primary">
        {items.map((item, idx) => (
          <li key={`${title}-${idx}`} className="leading-snug">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
