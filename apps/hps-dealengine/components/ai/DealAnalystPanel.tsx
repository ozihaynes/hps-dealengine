"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { askDealAnalyst } from "@/lib/aiBridge";
import type { AiBridgeResult } from "@/lib/ai/types";
import { useRunFreshness } from "@/lib/ai/useRunFreshness";
import { Button, GlassCard } from "@/components/ui";
import { useRouter } from "next/navigation";
import { useAiWindows } from "@/lib/ai/aiWindowsContext";
import { useDealSession } from "@/lib/dealSessionContext";
import { ArrowUpRight } from "lucide-react";

type DealAnalystPanelProps = {
  onClose?: () => void;
  onMinimize?: () => void;
};

export function DealAnalystPanel({
  onClose,
  onMinimize,
}: DealAnalystPanelProps) {
  const { dbDeal, lastRunId, posture } = useDealSession();
  const dealId = useMemo(() => dbDeal?.id ?? "", [dbDeal?.id]);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [runId, setRunId] = useState(lastRunId ?? "");
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AiBridgeResult | null>(null);
  const { status, lastRunAt, lastEditAt } = useRunFreshness();
  const [acknowledgedStale, setAcknowledgedStale] = useState(false);
  const router = useRouter();
  const warningRef = useRef<HTMLDivElement | null>(null);
  const { state, dispatch } = useAiWindows();
  const w = state.windows.dealAnalyst;
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const activeSession = useMemo(
    () => (w.activeSessionId ? w.sessions.find((s) => s.id === w.activeSessionId) ?? null : null),
    [w.activeSessionId, w.sessions],
  );
  const messages = activeSession?.messages ?? [];
  const hasMessages = messages.length > 0;
  const analystWelcomes = useMemo(
    () => [
      "Let's run the numbers!",
      "Deal time - show me the data!",
      "Ready for a quick verdict?",
    ],
    [],
  );
  const welcomeCopy = useMemo(
    () => analystWelcomes[Math.floor(Math.random() * analystWelcomes.length)],
    [analystWelcomes],
  );
  const tone = activeSession?.tone ?? "direct";
  const scrollToLatest = React.useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, []);

  useEffect(() => {
    setError(null);
    setResult(null);
    setAcknowledgedStale(false);
    setThreadId(null);
  }, []);

  useEffect(() => {
    setRunId(lastRunId ?? "");
  }, [lastRunId]);

  useEffect(() => {
    if (!w.activeSessionId) {
      const id = crypto.randomUUID();
      dispatch({
        type: "START_NEW_SESSION",
        id: "dealAnalyst",
        sessionId: id,
        context: { dealId, orgId: dbDeal?.org_id, runId, posture },
      });
    }
  }, [dealId, dispatch, dbDeal?.org_id, posture, runId, w.activeSessionId]);

  useEffect(() => {
    // Reset thread when switching deals or sessions
    setThreadId(null);
  }, [dealId, w.activeSessionId]);

  const onAsk = async (prompt: string) => {
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt) {
      return;
    }
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
    setQuestion("");
    const sessionId = w.activeSessionId ?? crypto.randomUUID();
    if (!w.activeSessionId) {
      dispatch({
        type: "START_NEW_SESSION",
        id: "dealAnalyst",
        sessionId,
        context: { dealId, orgId: dbDeal?.org_id, runId, posture },
      });
    }

    const now = new Date().toISOString();
    dispatch({
      type: "APPEND_MESSAGE",
      id: "dealAnalyst",
      message: { id: crypto.randomUUID(), role: "user", content: trimmedPrompt, createdAt: now },
    });
    scrollToLatest();

    try {
      const res = await askDealAnalyst({
        dealId,
        runId,
        posture,
        userPrompt: trimmedPrompt,
        tone,
        isStale,
        threadId,
      });
      if (res.threadId) {
        setThreadId(res.threadId);
      }
      if ((res as any)?.ok === false) {
        setError(res.summary ?? "Deal Analyst failed.");
        dispatch({
          type: "APPEND_MESSAGE",
          id: "dealAnalyst",
          message: {
            id: crypto.randomUUID(),
            role: "assistant",
            content: res.summary ?? "Deal Analyst failed.",
            createdAt: new Date().toISOString(),
          },
        });
      } else {
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
      }
    } catch (err: any) {
      setError(err?.message ?? "Deal Analyst failed.");
    } finally {
      setLoading(false);
    }
  };

  const isStale = status === "stale";
  const hasRunContext = Boolean(dealId && runId);
  const canAsk = hasRunContext && status !== "noRun" && status !== "unknown" && (!isStale || acknowledgedStale);
  const shouldShowAnalyzeGate =
    !hasRunContext || status === "noRun" || status === "unknown" || (isStale && !acknowledgedStale);
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
  const guidanceText =
    "Ask the Analyst for deal math-guardrails, risk gates, spreads, timeline, and next steps grounded in your latest Analyze run.";
  const trimmedQuestion = question.trim();
  const canSend = canAsk && Boolean(trimmedQuestion) && !loading;

  useEffect(() => {
    scrollToLatest();
  }, [messages.length, scrollToLatest]);

  return (
      <GlassCard className="flex h-full min-h-0 flex-col gap-3 p-4 text-text-primary">
        <div
          ref={scrollRef}
          className={`flex-1 min-h-0 space-y-3 pr-1 ${hasMessages ? "overflow-y-auto" : "overflow-hidden"}`}
        >
        {isStale && (
          <div
            ref={warningRef}
            className="rounded-lg border border-[color:var(--accent-orange)]/40 bg-[color:var(--accent-orange)]/15 px-3 py-2 text-xs text-[color:var(--text-accent-orange-light)]"
          >
            <div className="mb-2 font-semibold text-[color:var(--text-accent-orange-light)]">Stale data warning</div>
            <p className="text-[12px] text-[color:var(--text-accent-orange-light)]/90">
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
        )}

        {error && (
          <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-100">
            {error}
          </div>
        )}

        <div className="space-y-2 rounded-lg border border-[color:var(--glass-border)] bg-[color:var(--glass-bg)] px-3 py-2 text-xs text-text-secondary">
          {messages.length > 0 ? (
            <div className="flex flex-col gap-2">
              {messages.map((m) => (
                <div key={m.id} className={`flex ${m.role === "assistant" ? "justify-start" : "justify-end"}`}>
                  <div
                    className={`max-w-[90%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm ${
                      m.role === "assistant"
                        ? "bg-white/5 text-text-primary"
                        : "bg-accent-blue/20 text-text-primary"
                    }`}
                  >
                    <div className="mb-1 text-[10px] uppercase tracking-wide text-text-secondary">
                      {m.role === "user" ? "You" : "Analyst"}
                    </div>
                    {m.content ?? ""}
                  </div>
                </div>
              ))}
            </div>
            ) : (
              <div className="flex h-full w-full items-center justify-center py-12 text-lg text-text-secondary">
                {welcomeCopy}
              </div>
            )}
        </div>
      </div>

      <div className="mt-3 flex flex-col gap-2 border-t border-[color:var(--glass-border)] pt-3">
        <div className="relative">
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            className="w-full min-h-[96px] rounded-md border border-white/20 bg-white/8 p-3 pr-12 text-sm text-text-primary placeholder:text-text-secondary/70 shadow-inner outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue/40"
            rows={4}
            placeholder={guidanceText}
            disabled={status === "noRun"}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (!loading && canAsk) {
                  void onAsk(question);
                }
              }
            }}
          />
          <button
            type="button"
            onClick={() => onAsk(question)}
            disabled={loading || !canAsk}
            className={`absolute bottom-3 right-3 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-accent-blue/80 text-white shadow-lg backdrop-blur transition hover:bg-accent-blue ${
              loading || !canAsk ? "opacity-50 cursor-not-allowed" : ""
            }`}
            title={status === "noRun" ? "Run Analyze first" : "Ask Deal Analyst"}
          >
            <ArrowUpRight size={18} />
          </button>
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
        {shouldShowAnalyzeGate && <div className="text-[11px] text-text-secondary">Analyze the deal to chat.</div>}
      </div>
    </GlassCard>
  );
}

export default DealAnalystPanel;
