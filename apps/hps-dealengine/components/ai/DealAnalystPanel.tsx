"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { askDealAnalyst } from "@/lib/aiBridge";
import type { AiBridgeResult, AiTone } from "@/lib/ai/types";
import { useRunFreshness } from "@/lib/ai/useRunFreshness";
import { Button, GlassCard } from "@/components/ui";
import { useRouter } from "next/navigation";
import { useAiWindows } from "@/lib/ai/aiWindowsContext";
import { useDealSession } from "@/lib/dealSessionContext";

type DealAnalystPanelProps = {
  onClose?: () => void;
  onMinimize?: () => void;
};

type Message = { role: "user" | "assistant"; text: string };

function Section({ section }: { section?: { title: string; body: string } }) {
  if (!section) return null;
  return (
    <div className="space-y-1">
      <div className="text-[11px] uppercase tracking-wide text-text-secondary">{section.title}</div>
      <div className="text-sm text-text-primary whitespace-pre-wrap leading-relaxed">{section.body}</div>
    </div>
  );
}

export function DealAnalystPanel({
  onClose,
  onMinimize,
}: DealAnalystPanelProps) {
  const { dbDeal, lastRunId, posture } = useDealSession();
  const dealId = useMemo(() => dbDeal?.id ?? "", [dbDeal?.id]);
  const [runId, setRunId] = useState(lastRunId ?? "");
  const [question, setQuestion] = useState("Help me understand spread, guardrails, risk gates, and next steps.");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AiBridgeResult | null>(null);
  const { status, lastRunAt, lastEditAt } = useRunFreshness();
  const [acknowledgedStale, setAcknowledgedStale] = useState(false);
  const router = useRouter();
  const warningRef = useRef<HTMLDivElement | null>(null);
  const { state, dispatch } = useAiWindows();
  const w = state.windows.dealAnalyst;
  const activeSession = useMemo(
    () => (w.activeSessionId ? w.sessions.find((s) => s.id === w.activeSessionId) ?? null : null),
    [w.activeSessionId, w.sessions],
  );
  const tone = activeSession?.tone ?? "direct";

  useEffect(() => {
    setError(null);
    setResult(null);
    setAcknowledgedStale(false);
  }, []);

  useEffect(() => {
    setRunId(lastRunId ?? "");
  }, [lastRunId]);

  useEffect(() => {
    if (!w.activeSessionId) {
      const id = crypto.randomUUID();
      dispatch({ type: "START_NEW_SESSION", id: "dealAnalyst", sessionId: id });
    }
  }, [dispatch, w.activeSessionId]);

  const onAsk = async (prompt: string) => {
    const isStale = status === "stale";
    if (status === "noRun") {
      setError("Run Analyze at least once before asking the Deal Analyst.");
      return;
    }
    if (isStale && !acknowledgedStale) {
      setError("Re-run Analyze or acknowledge the stale data warning before asking.");
      warningRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    if (!dealId || !runId) {
      setError("Select a deal and run Analyze before asking the Deal Analyst.");
      return;
    }
    setLoading(true);
    setError(null);
    const sessionId = w.activeSessionId ?? crypto.randomUUID();
    if (!w.activeSessionId) {
      dispatch({ type: "START_NEW_SESSION", id: "dealAnalyst", sessionId });
    }

    const userMessage: Message = { role: "user", text: prompt };
    const now = new Date().toISOString();
    dispatch({
      type: "APPEND_MESSAGE",
      id: "dealAnalyst",
      message: { id: crypto.randomUUID(), role: "user", content: userMessage.text, createdAt: now },
    });

    try {
      const res = await askDealAnalyst({
        dealId,
        runId,
        posture,
        userPrompt: prompt,
        tone,
        isStale,
      });
      setResult(res);
      dispatch({
        type: "APPEND_MESSAGE",
        id: "dealAnalyst",
        message: {
          id: crypto.randomUUID(),
          role: "assistant",
          content: res.summary ?? "No summary returned.",
          createdAt: new Date().toISOString(),
        },
      });
    } catch (err: any) {
      setError(err?.message ?? "Deal Analyst failed.");
    } finally {
      setLoading(false);
    }
  };

  const sources = useMemo(() => result?.sources ?? [], [result]);
  const isStale = status === "stale";
  const canAsk = status !== "noRun" && (!isStale || acknowledgedStale);
  const runLabel =
    lastRunAt && !Number.isNaN(new Date(lastRunAt).getTime())
      ? new Date(lastRunAt).toLocaleString()
      : runId
        ? `run ${runId.slice(0, 8)}`
        : "last run";
  const editLabel =
    lastEditAt && !Number.isNaN(new Date(lastEditAt).getTime())
      ? new Date(lastEditAt).toLocaleString()
      : null;
  const messages = activeSession?.messages ?? [];
  const toneOptions: { id: AiTone; label: string }[] = [
    { id: "direct", label: "Direct" },
    { id: "neutral", label: "Neutral" },
    { id: "empathetic", label: "Supportive" },
  ];

  return (
    <div className="flex h-full flex-col gap-3 bg-transparent p-0 text-text-primary">
      <div className="flex items-center justify-between gap-2 border-b border-[color:var(--glass-border)] px-2 pb-2 text-xs text-text-secondary">
        <div className="space-y-0.5">
          <div className="font-semibold text-text-primary">Deal Analyst</div>
          <p className="text-[11px] text-text-secondary">Per-deal, per-run guidance. Uses last Analyze run; never recomputes numbers.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={() => onMinimize?.()}>
            Minimize
          </Button>
          <Button size="sm" variant="ghost" onClick={() => onClose?.()}>
            Close
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-3 px-2 text-[10px] text-text-secondary">
        <span>Tone:</span>
        <div className="inline-flex rounded-full border border-[color:var(--glass-border)] bg-[color:var(--glass-bg)] p-0.5">
          {toneOptions.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => {
                if (!w.activeSessionId) return;
                dispatch({ type: "SET_SESSION_TONE", id: "dealAnalyst", sessionId: w.activeSessionId, tone: opt.id });
              }}
              className={`px-2 py-0.5 rounded-full transition text-[10px] ${
                tone === opt.id
                  ? "bg-[color:var(--accent-color)] text-[color:var(--text-primary)]"
                  : "text-[color:var(--text-secondary)] hover:bg-[color:var(--glass-bg)]"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 px-2">
        {w.sessions.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => dispatch({ type: "LOAD_SESSION", id: "dealAnalyst", sessionId: s.id })}
            className={`rounded-full border px-2 py-0.5 text-[11px] ${s.id === w.activeSessionId ? "border-[color:var(--accent-color)] bg-[color:var(--accent-color)]/10 text-text-primary" : "border-[color:var(--glass-border)] text-text-secondary"}`}
          >
            {new Date(s.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </button>
        ))}
      </div>

      {isStale ? (
        <div
          ref={warningRef}
          className="mb-1 rounded-lg border border-yellow-500/40 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-100"
        >
          <div className="mb-2 font-semibold text-yellow-50">Stale data warning</div>
          <p className="text-[12px] text-yellow-50/90">
            Numbers are from your last Analyze run ({runLabel}). Inputs have changed
            {editLabel ? ` (edited ${editLabel})` : ""}. Re-run Analyze to refresh, or continue knowing advice is based on the last run.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button size="sm" variant="primary" onClick={() => router.push("/underwrite")}>
              Re-run Analyze
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setAcknowledgedStale(true)}>
              Ask anyway (use last run)
            </Button>
          </div>
        </div>
      ) : null}

      {status === "noRun" ? (
        <div className="mb-1 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
          Run Analyze at least once before asking the Analyst about this deal.
          <div className="mt-2 flex gap-2">
            <Button size="sm" variant="primary" onClick={() => router.push("/underwrite")}>
              Go to Underwrite
            </Button>
          </div>
        </div>
      ) : null}

      {error && (
        <div className="mb-1 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-100">
          {error}
        </div>
      )}

      <GlassCard className="space-y-2 p-3">
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          className="w-full rounded border border-border-subtle bg-surface-elevated px-3 py-2 text-sm text-text-primary focus:border-accent-blue focus:outline-none"
          rows={3}
          placeholder="Ask about spread, MAO, risk gates, timeline, negotiation stance..."
          disabled={status === "noRun"}
        />
        <div className="flex items-center gap-2">
          <Button size="sm" variant="primary" disabled={loading || !canAsk} onClick={() => onAsk(question)}>
            {loading ? "Thinking..." : status === "noRun" ? "Run Analyze first" : "Ask Deal Analyst"}
          </Button>
          <div className="text-[11px] text-text-secondary">
            {status === "noRun" ? "No run yet for this deal." : `Using ${runLabel} for deal ${dealId.slice(0, 8)}.`}
          </div>
        </div>
        {result?.followups && result.followups.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {result.followups.map((f, idx) => (
              <button
                key={`${f}-${idx}`}
                className="rounded-full border border-border-subtle px-3 py-1 text-[11px] text-text-secondary hover:border-accent-blue hover:text-accent-blue"
                onClick={() => {
                  setQuestion(f);
                  void onAsk(f);
                }}
              >
                {f}
              </button>
            ))}
          </div>
        )}
      </GlassCard>

      <div className="space-y-2 overflow-y-auto">
        {result ? (
          <GlassCard className="space-y-3 p-3">
            <div className="space-y-1">
              <div className="text-[11px] uppercase tracking-wide text-text-secondary">Summary</div>
              <div className="text-sm text-text-primary whitespace-pre-wrap leading-relaxed">{result.summary}</div>
            </div>
            <Section section={result.key_numbers} />
            <Section section={result.guardrails} />
            <Section section={result.risk_and_evidence} />
            <Section section={result.negotiation_playbook} />

            {sources.length > 0 && (
              <div className="space-y-1 border-t border-white/10 pt-2">
                <div className="text-[11px] uppercase tracking-wide text-text-secondary">Where this came from</div>
                <ul className="space-y-1 text-xs text-text-secondary">
                  {sources.map((s, idx) => (
                    <li key={`${s.ref}-${idx}`} className="flex items-center gap-2">
                      <span className="rounded bg-white/5 px-2 py-0.5 text-[10px] text-text-secondary">{s.kind}</span>
                      <span className="font-mono text-text-primary">{s.doc_id ?? s.ref}</span>
                      {typeof s.trust_tier === "number" && (
                        <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-text-secondary">
                          tier {s.trust_tier}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </GlassCard>
        ) : (
          <GlassCard className="p-3 text-sm text-text-secondary">
            Ask a question to see deal-specific analysis from the last run.
          </GlassCard>
        )}
      </div>

      {messages.length > 0 && (
        <div className="space-y-2 rounded border border-[color:var(--glass-border)] bg-[color:var(--glass-bg)] px-3 py-2 text-xs text-text-secondary">
          <div className="text-[11px] uppercase tracking-wide">History (this session)</div>
          <ul className="space-y-1 max-h-32 overflow-y-auto">
            {messages.map((m) => (
              <li key={m.id} className="flex gap-2">
                <span className="font-semibold text-text-primary">{m.role === "user" ? "You" : "Analyst"}:</span>
                <span className="text-text-secondary">{m.content ?? ""}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default DealAnalystPanel;
