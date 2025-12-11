"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { askDealStrategist } from "@/lib/aiBridge";
import type { AiBridgeResult } from "@/lib/ai/types";
import { GlassCard } from "@/components/ui";
import { useAiWindows } from "@/lib/ai/aiWindowsContext";
import { ArrowUpRight } from "lucide-react";
import { useDealSession } from "@/lib/dealSessionContext";

type DealStrategistPanelProps = {
  posture?: string;
  sandboxSettings?: unknown;
  onClose?: () => void;
  onMinimize?: () => void;
};

function Section({ section }: { section?: { title: string; body: string } }) {
  if (!section) return null;
  return (
    <div className="space-y-1">
      <div className="text-[11px] uppercase tracking-wide text-text-secondary">{section.title}</div>
      <div className="text-sm text-text-primary whitespace-pre-wrap leading-relaxed">{section.body}</div>
    </div>
  );
}

export function DealStrategistPanel({ posture, sandboxSettings, onClose, onMinimize }: DealStrategistPanelProps) {
  const pathname = usePathname();
  const { posture: sessionPosture, dbDeal, lastRunId } = useDealSession();
  const [threadId, setThreadId] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AiBridgeResult | null>(null);
  const { state, dispatch } = useAiWindows();
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

  useEffect(() => {
    setThreadId(null);
  }, [dbDeal?.id, w.activeSessionId]);

  React.useEffect(() => {
    if (!w.activeSessionId) {
      const id = crypto.randomUUID();
      dispatch({
        type: "START_NEW_SESSION",
        id: "dealStrategist",
        sessionId: id,
        context: { dealId: dbDeal?.id, orgId: dbDeal?.org_id, runId: lastRunId ?? undefined, posture: posture ?? sessionPosture },
      });
    }
  }, [dbDeal?.id, dbDeal?.org_id, dispatch, lastRunId, posture, sessionPosture, w.activeSessionId]);

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
  const guidanceText =
    "Ask the Strategist for policy and posture guidance-sandbox knobs, market tweaks, KPI framing, and how inputs and workflows move through the system.";
  const trimmedQuestion = question.trim();
  const canSend = Boolean(trimmedQuestion) && !loading;

  useEffect(() => {
    scrollToLatest();
  }, [messages.length, scrollToLatest]);

  return (
    <GlassCard className="flex h-full min-h-0 flex-col gap-3 p-4 text-text-primary">
      <div ref={scrollRef} className="flex-1 min-h-[260px] space-y-3 overflow-y-auto pr-1">
        {error && (
          <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-100">
            {error}
          </div>
        )}

        <div className="space-y-2 rounded-lg border border-[color:var(--glass-border)] bg-[color:var(--glass-bg)] px-3 py-2 text-xs text-text-secondary">
          {messages.length > 0 && (
            <div className="flex flex-col gap-2">
              {messages.map((m) => (
                <div key={m.id} className={`flex ${m.role === "assistant" ? "justify-start" : "justify-end"}`}>
                  <div
                    className={`max-w-[90%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm ${
                      m.role === "assistant" ? "bg-white/5 text-text-primary" : "bg-accent-blue/20 text-text-primary"
                    }`}
                  >
                    <div className="mb-1 text-[10px] uppercase tracking-wide text-text-secondary">
                      {m.role === "user" ? "You" : "Strategist"}
                    </div>
                    {m.content ?? ""}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-2 border-t border-[color:var(--glass-border)] pt-3">
        <div className="relative">
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            className="w-full min-h-[96px] rounded-md border border-white/10 bg-white/5 p-3 pr-12 text-sm text-text-secondary outline-none focus:border-accent-blue"
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
            className={`absolute bottom-3 right-3 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-accent-blue/80 text-white shadow-lg backdrop-blur transition hover:bg-accent-blue ${
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
    </GlassCard>
  );
}

export default DealStrategistPanel;
