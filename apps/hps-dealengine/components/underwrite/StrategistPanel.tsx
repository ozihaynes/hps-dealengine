import React, { useState } from "react";
import { Button, GlassCard } from "../ui";
import { fetchStrategistAnalysis } from "@/lib/aiBridge";
import type { AiBridgeAnalysis } from "@hps-internal/contracts";

type StrategistPanelProps = {
  dealId?: string;
  runId?: string;
  posture?: "conservative" | "base" | "aggressive";
  runOutput?: unknown;
  runTrace?: unknown;
  policySnapshot?: unknown;
  evidenceSummary?: Array<{ kind?: string; id?: string; label?: string; uri?: string }>;
  defaultPrompt?: string;
  contextHint?: string;
};

const guardrailCopy =
  "AI is advisory only. It cannot change numbers, policies, or offers. Do not accept numeric suggestions without verifying against engine output and policy.";

export const StrategistPanel: React.FC<StrategistPanelProps> = ({
  dealId,
  runId,
  posture,
  runOutput,
  runTrace,
  policySnapshot,
  evidenceSummary = [],
  defaultPrompt,
  contextHint,
}) => {
  const [prompt, setPrompt] = useState(
    defaultPrompt ??
      "What are the top 3 risks and what evidence should we collect next?"
  );
  const [response, setResponse] = useState<AiBridgeAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const missingRun = !dealId || !runId || !posture;
  const strategistDisabled = false;

  React.useEffect(() => {
    if (defaultPrompt) {
      setPrompt(defaultPrompt);
    }
  }, [defaultPrompt]);

  const handleAsk = async () => {
    setError(null);
    setResponse(null);
    setLoading(true);
    try {
      if (strategistDisabled) {
        setError("Strategist is temporarily disabled while we finish v1.");
        return;
      }
      if (missingRun) {
        setError("Run a calculation and save a run before asking the strategist.");
        return;
      }
      const fullPrompt = contextHint
        ? `${contextHint}\n\nUser request: ${prompt}`
        : prompt;
      const res = await fetchStrategistAnalysis({
        dealId,
        runId,
        posture,
        prompt: fullPrompt,
      });
      setResponse(res.analysis);
    } catch (err: any) {
      setError(err?.message ?? "Failed to call AI bridge.");
      setResponse(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <GlassCard className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-text-primary">Strategist (AI)</h3>
          <p className="text-xs text-text-secondary">
            Advisory only. Uses current run output/trace and policy snapshot.
          </p>
        </div>
        <Button
          size="sm"
          variant="neutral"
          disabled={loading || missingRun || strategistDisabled}
          onClick={handleAsk}
        >
          {strategistDisabled ? "Strategist disabled" : loading ? "Thinking..." : "Ask"}
        </Button>
      </div>

      <textarea
        className="w-full rounded border border-border-subtle bg-surface-elevated px-3 py-2 text-sm text-text-primary focus:border-accent-blue focus:outline-none"
        rows={3}
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
      />

      <div className="text-[11px] text-amber-200 bg-amber-500/10 border border-amber-500/30 rounded px-3 py-2">
        {missingRun
          ? "Run a calculation and save a run before asking the strategist."
          : guardrailCopy}
      </div>

      {error && (
        <div className="rounded-md border border-red-500/40 bg-red-500/5 px-3 py-2 text-xs text-red-200">
          {error}
        </div>
      )}

      {response && (
        <div className="rounded-md border border-border-subtle bg-slate-950/40 px-3 py-2 text-sm text-text-primary space-y-2">
          <div className="text-[11px] uppercase tracking-wide text-text-secondary">
            AI Guidance (non-authoritative)
          </div>
          <div className="whitespace-pre-wrap leading-relaxed text-text-primary">
            {response.summary || "No content returned."}
          </div>
        </div>
      )}
    </GlassCard>
  );
};

export default StrategistPanel;
