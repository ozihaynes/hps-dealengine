"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { askDealAnalyst } from "@/lib/aiBridge";
import type { AiBridgeResult } from "@/lib/ai/types";
import { useRunFreshness } from "@/lib/ai/useRunFreshness";
import { Button } from "@/components/ui";
import { useRouter } from "next/navigation";
import { useAiWindows } from "@/lib/ai/aiWindowsContext";
import { useDealSession } from "@/lib/dealSessionContext";
import { ArrowUpRight } from "lucide-react";

type DealAnalystPanelProps = {
  onClose?: () => void;
  onMinimize?: () => void;
};

type PanelError = {
  message: string;
  retryable: boolean;
  errorCode?: string | null;
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
  const [error, setError] = useState<PanelError | null>(null);
  const [result, setResult] = useState<AiBridgeResult | null>(null);
  const sendInFlightRef = useRef(false);
  const { status, lastRunAt, lastEditAt } = useRunFreshness();
  const [acknowledgedStale, setAcknowledgedStale] = useState(false);
  const router = useRouter();
  const warningRef = useRef<HTMLDivElement | null>(null);
  const lastPromptRef = useRef<string | null>(null);
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
      setThreadId(id);
    }
  }, [dealId, dispatch, dbDeal?.org_id, posture, runId, w.activeSessionId]);

  useEffect(() => {
    // Keep local threadId aligned to session id (persisted thread id)
    if (activeSession?.id) {
      setThreadId(activeSession.id);
    } else {
      setThreadId(null);
    }
  }, [activeSession?.id, dealId]);

  const onAsk = async (prompt: string, opts?: { isRetry?: boolean }) => {
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt) {
      return;
    }
    if (sendInFlightRef.current) {
      return;
    }
    const isStale = status === "stale";
    if (status === "noRun") {
      setError({ message: "Run Analyze at least once before asking the Deal Analyst.", retryable: false });
      return;
    }
    if (isStale && !acknowledgedStale) {
      setError({
        message: "Re-run Analyze or acknowledge the stale data warning before asking.",
        retryable: false,
      });
      warningRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    if (!dealId || !runId) {
      setError({ message: "Select a deal and run Analyze before asking the Deal Analyst.", retryable: false });
      return;
    }
    sendInFlightRef.current = true;
    lastPromptRef.current = trimmedPrompt;
    setLoading(true);
    setError(null);
    if (!opts?.isRetry) setQuestion("");
    const sessionId = w.activeSessionId ?? crypto.randomUUID();
    if (!w.activeSessionId) {
      dispatch({
        type: "START_NEW_SESSION",
        id: "dealAnalyst",
        sessionId,
        context: { dealId, orgId: dbDeal?.org_id, runId, posture },
      });
      setThreadId(sessionId);
    }

    const now = new Date().toISOString();
    if (!opts?.isRetry) {
      dispatch({
        type: "APPEND_MESSAGE",
        id: "dealAnalyst",
        message: { id: crypto.randomUUID(), role: "user", content: trimmedPrompt, createdAt: now },
      });
    }
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
        setError({
          message: res.summary ?? "Deal Analyst failed.",
          retryable: Boolean((res as any)?.retryable),
          errorCode: (res as any)?.error_code ?? null,
        });
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
      setError({ message: "Unexpected error. Try again.", retryable: true });
    } finally {
      setLoading(false);
      sendInFlightRef.current = false;
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
      <div className="flex h-full min-h-0 flex-col gap-3 p-1 text-text-primary">
        <div
          ref={scrollRef}
          tabIndex={0}
          onWheel={(e) => e.stopPropagation()}
          style={{ overscrollBehavior: "contain" }}
          className={`group/message flex-1 min-h-[220px] space-y-3 rounded-xl border border-[color:var(--ai-window-divider)] bg-[color:var(--ai-window-surface)] px-3 py-3 pr-2 transition ${
            hasMessages ? "overflow-y-auto" : "overflow-hidden"
          } focus-within:border-[color:var(--ai-window-border-strong)] focus-within:ring-2 focus-within:ring-[color:var(--ai-window-focus-ring)] hover:border-[color:var(--ai-window-border)]`}
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
            <div>{error.message}</div>
            {error.retryable && lastPromptRef.current && (
              <div className="mt-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onAsk(lastPromptRef.current ?? "", { isRetry: true })}
                  disabled={loading}
                >
                  Retry
                </Button>
              </div>
            )}
          </div>
        )}

        <div className="space-y-2 text-xs text-text-secondary">
          {messages.length > 0 ? (
            <div className="flex flex-col gap-2">
              {messages.map((m) => (
                <div key={m.id} className={`flex ${m.role === "assistant" ? "justify-start" : "justify-end"}`}>
                  <div
                    className={`max-w-[90%] whitespace-pre-wrap break-words rounded-lg px-3 py-2 text-sm leading-relaxed ${
                      m.role === "assistant" ? "bg-[color:var(--ai-message-assistant-bg)] border border-[color:var(--ai-message-assistant-border)] text-text-primary" : "bg-[color:var(--ai-message-user-bg)] border border-[color:var(--ai-message-user-border)] text-text-primary"
                    }`}
                  >
                    <div className="mb-1 text-[10px] uppercase tracking-wide text-text-secondary">
                      {m.role === "user" ? "You" : "Analyst"}
                    </div>
                    <div className="prose prose-invert max-w-none break-words text-sm leading-relaxed [&_code]:bg-black/30 [&_code]:px-1 [&_code]:py-0.5 [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-black/30 [&_pre]:p-2">
                      {m.content ?? ""}
                    </div>
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

      <div className="mt-2 flex flex-col gap-2 border-t border-[color:var(--ai-window-divider)] pt-3">
        <div className="relative">
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            className="w-full min-h-[96px] rounded-md border border-[color:var(--ai-input-border)] bg-[color:var(--ai-input-bg)] p-3 pr-12 text-sm text-text-primary placeholder:text-text-secondary/70 shadow-inner outline-none focus:border-[color:var(--ai-input-border-focus)] focus:ring-2 focus:ring-[color:var(--ai-window-focus-ring)]"
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
            className={`absolute bottom-3 right-3 inline-flex h-9 w-9 items-center justify-center rounded-full border border-[color:var(--ai-window-divider)] bg-[color:var(--ai-window-surface-2)] text-text-primary shadow-[0_10px_30px_rgba(0,0,0,0.35)] transition hover:border-[color:var(--ai-window-border-strong)] hover:bg-[color:var(--ai-window-surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ai-window-focus-ring)] ${
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
    </div>
  );
}

export default DealAnalystPanel;
