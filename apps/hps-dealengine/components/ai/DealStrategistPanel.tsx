"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { askDealStrategist } from "@/lib/aiBridge";
import type { AiBridgeResult } from "@/lib/ai/types";
import { useAiWindows } from "@/lib/ai/aiWindowsContext";
import { ArrowUpRight } from "lucide-react";
import { useDealSession } from "@/lib/dealSessionContext";

type DealStrategistPanelProps = {
  posture?: string;
  sandboxSettings?: unknown;
  onClose?: () => void;
  onMinimize?: () => void;
};

export function DealStrategistPanel({ posture, sandboxSettings, onClose, onMinimize }: DealStrategistPanelProps) {
  const pathname = usePathname();
  const { posture: sessionPosture, dbDeal, lastRunId } = useDealSession();
  const [threadId, setThreadId] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AiBridgeResult | null>(null);
  const { state, dispatch } = useAiWindows();
  const strategistWelcomes = useMemo(
    () => [
      "What's the game plan?",
      "Let's tune the sandbox!",
      "Want a smarter approach?",
    ],
    [],
  );
  const welcomeCopy = useMemo(
    () => strategistWelcomes[Math.floor(Math.random() * strategistWelcomes.length)],
    [strategistWelcomes],
  );
  const w = state.windows.dealStrategist;
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const activeSession = useMemo(
    () => (w.activeSessionId ? w.sessions.find((s) => s.id === w.activeSessionId) ?? null : null),
    [w.activeSessionId, w.sessions],
  );
  const tone = activeSession?.tone ?? "visionary";
  const scrollToLatest = React.useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, []);

  React.useEffect(() => {
    if (!w.activeSessionId) {
      const id = crypto.randomUUID();
      dispatch({
        type: "START_NEW_SESSION",
        id: "dealStrategist",
        sessionId: id,
        context: { dealId: dbDeal?.id, orgId: dbDeal?.org_id, runId: lastRunId ?? undefined, posture: posture ?? sessionPosture },
      });
      setThreadId(id);
    }
  }, [dbDeal?.id, dbDeal?.org_id, dispatch, lastRunId, posture, sessionPosture, w.activeSessionId]);

  useEffect(() => {
    if (activeSession?.id) {
      setThreadId(activeSession.id);
    } else {
      setThreadId(null);
    }
  }, [activeSession?.id, dbDeal?.id]);

  const onAsk = async (prompt: string) => {
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt) {
      return;
    }
    const postureValue = posture ?? sessionPosture ?? "base";
    setLoading(true);
    setError(null);
    setQuestion("");
    if (!w.activeSessionId) {
      const id = crypto.randomUUID();
      dispatch({
        type: "START_NEW_SESSION",
        id: "dealStrategist",
        sessionId: id,
        context: { dealId: dbDeal?.id, orgId: dbDeal?.org_id, runId: lastRunId ?? undefined, posture: postureValue },
      });
      setThreadId(id);
    }
    dispatch({
      type: "APPEND_MESSAGE",
      id: "dealStrategist",
      message: { id: crypto.randomUUID(), role: "user", content: trimmedPrompt, createdAt: new Date().toISOString() },
    });
    scrollToLatest();
    try {
      const res = await askDealStrategist({
        userPrompt: trimmedPrompt,
        posture: postureValue,
        sandboxSettings,
        route: pathname,
        tone,
        focusArea: "sandbox",
        timeRange: null,
        threadId,
      });
      if (res.threadId) {
        setThreadId(res.threadId);
      }
      if ((res as any)?.ok === false) {
        setError(res.summary ?? "Deal Strategist failed.");
        dispatch({
          type: "APPEND_MESSAGE",
          id: "dealStrategist",
          message: {
            id: crypto.randomUUID(),
            role: "assistant",
            content: res.summary ?? "Deal Strategist failed.",
            createdAt: new Date().toISOString(),
          },
        });
      } else {
        setResult(res);
        dispatch({
          type: "APPEND_MESSAGE",
          id: "dealStrategist",
          message: {
            id: crypto.randomUUID(),
            role: "assistant",
            content: res.summary ?? "No summary returned.",
            createdAt: new Date().toISOString(),
          },
        });
      }
    } catch (err: any) {
      setError(err?.message ?? "Deal Strategist failed.");
    } finally {
      setLoading(false);
    }
  };

  const messages = activeSession?.messages ?? [];
  const hasMessages = messages.length > 0;
  const guidanceText =
    "Ask the Strategist for policy and posture guidance-sandbox knobs, market tweaks, KPI framing, and how inputs and workflows move through the system.";
  const trimmedQuestion = question.trim();
  const canSend = Boolean(trimmedQuestion) && !loading;

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
        {error && (
          <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-100">
            {error}
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
                      {m.role === "user" ? "You" : "Strategist"}
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
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (!loading && question.trim()) {
                  void onAsk(question);
                }
              }
            }}
          />
          <button
            type="button"
            onClick={() => onAsk(question)}
            disabled={!canSend}
            className={`absolute bottom-3 right-3 inline-flex h-9 w-9 items-center justify-center rounded-full border border-[color:var(--ai-window-divider)] bg-[color:var(--ai-window-surface-2)] text-text-primary shadow-[0_10px_30px_rgba(0,0,0,0.35)] transition hover:border-[color:var(--ai-window-border-strong)] hover:bg-[color:var(--ai-window-surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ai-window-focus-ring)] ${
              !canSend ? "opacity-50 cursor-not-allowed" : ""
            }`}
            title="Ask Deal Strategist"
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
      </div>
    </div>
  );
}

export default DealStrategistPanel;