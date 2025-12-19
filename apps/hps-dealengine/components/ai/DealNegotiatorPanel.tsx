"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { askDealNegotiatorChat } from "@/lib/aiBridge";
import { useDealSession } from "@/lib/dealSessionContext";
import type { AiChatMessage } from "@/lib/ai/types";
import { Button } from "../ui";
import { ArrowUpRight } from "lucide-react";
import { useAiWindows } from "@/lib/ai/aiWindowsContext";

type DealNegotiatorPanelProps = {
  inline?: boolean;
};

export function DealNegotiatorPanel({ inline }: DealNegotiatorPanelProps) {
  const { dbDeal, lastRunId, negotiationPlaybook } = useDealSession();
  const { state, dispatch } = useAiWindows();
  const w = state.windows.dealNegotiator;
  const activeSession = useMemo(
    () => (w.activeSessionId ? w.sessions.find((s) => s.id === w.activeSessionId) ?? null : null),
    [w.activeSessionId, w.sessions],
  );

  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [threadId, setThreadId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const negotiatorWelcomes = useMemo(
    () => ["Let's get this signed!", "Need a killer counter?", "Objection? I've got you!"],
    [],
  );
  const welcomeCopy = useMemo(
    () => negotiatorWelcomes[Math.floor(Math.random() * negotiatorWelcomes.length)],
    [negotiatorWelcomes],
  );
  const messages = activeSession?.messages ?? [];
  const hasMessages = messages.length > 0;
  const canUseNegotiator = Boolean(negotiationPlaybook && negotiationPlaybook.logicRowIds.length > 0);
  const sendDisabled = isSending || !input.trim() || !canUseNegotiator || !dbDeal?.id;

  useEffect(() => {
    // Reset thread when switching deals or sessions
    if (activeSession?.id) {
      setThreadId(activeSession.id);
    } else {
      setThreadId(null);
    }
  }, [activeSession?.id, dbDeal?.id, lastRunId]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  const ensureSession = React.useCallback(() => {
    if (w.activeSessionId) return w.activeSessionId;
    const id = crypto.randomUUID();
    dispatch({
      type: "START_NEW_SESSION",
      id: "dealNegotiator",
      sessionId: id,
      context: { dealId: dbDeal?.id, orgId: dbDeal?.org_id, runId: lastRunId ?? undefined, posture: undefined },
    });
    setThreadId(id);
    return id;
  }, [dbDeal?.id, dbDeal?.org_id, dispatch, lastRunId, w.activeSessionId]);

  const handleSend = React.useCallback(async () => {
    if (!dbDeal?.id || !lastRunId || !input.trim()) {
      setError("Run Analyze first so the Negotiator can ground in the latest run.");
      return;
    }
    if (!canUseNegotiator) {
      setError("Generate the playbook to chat with the Negotiator.");
      return;
    }
    if (isSending) return;

    const sessionId = ensureSession();
    const text = input.trim();
    setInput("");
    setIsSending(true);
    setError(null);

    const userMessage: AiChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
      createdAt: new Date().toISOString(),
    };
    dispatch({ type: "APPEND_MESSAGE", id: "dealNegotiator", message: userMessage });

    try {
      const response = await askDealNegotiatorChat({
        dealId: dbDeal.id,
        runId: lastRunId ?? null,
        userMessage: text,
        threadId,
      });

      if (response.threadId) {
        setThreadId(response.threadId);
      }

      if ((response as any)?.ok === false) {
        const fallback: AiChatMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: response.messages?.[0]?.content ?? "The Negotiator is unavailable. Please try again.",
          createdAt: new Date().toISOString(),
        };
        dispatch({ type: "APPEND_MESSAGE", id: "dealNegotiator", message: fallback });
        setError(response.messages?.[0]?.content ?? "The Negotiator is unavailable. Please try again.");
        setIsSending(false);
        return;
      }

      const assistantMsgContent =
        response.messages.find((m) => m.role === "assistant")?.content ?? "Negotiation guidance ready.";

      dispatch({
        type: "APPEND_MESSAGE",
        id: "dealNegotiator",
        message: {
          id: crypto.randomUUID(),
          role: "assistant",
          content: assistantMsgContent,
          createdAt: new Date().toISOString(),
        },
      });
    } catch (err: any) {
      setError(err?.message ?? "The Negotiator is unavailable. Please try again.");
    } finally {
      setIsSending(false);
    }
  }, [dbDeal?.id, lastRunId, input, canUseNegotiator, isSending, ensureSession, dispatch, threadId]);

  return (
    <div className={inline ? "flex h-full min-h-0 flex-col p-3 md:p-4" : "flex h-full min-h-0 flex-col p-3"}>
      {error && (
        <div className="mt-2 rounded-md border border-brand-red-subtle bg-brand-red-subtle/20 px-3 py-2 text-xs text-brand-red-light">
          {error}
        </div>
      )}

        <div
          ref={scrollRef}
          tabIndex={0}
          onWheel={(e) => e.stopPropagation()}
          style={{ overscrollBehavior: "contain" }}
          className={`group/message mt-3 flex-1 min-h-[220px] space-y-3 rounded-xl border border-[color:var(--ai-window-divider)] bg-[color:var(--ai-window-surface)] px-3 py-3 pr-2 transition ${
            hasMessages ? "overflow-y-auto" : "overflow-hidden"
          } focus-within:border-[color:var(--ai-window-border-strong)] focus-within:ring-2 focus-within:ring-[color:var(--ai-window-focus-ring)] hover:border-[color:var(--ai-window-border)]`}
        >
          <div className="space-y-2 text-xs text-text-secondary">
            {hasMessages ? (
              <div className="flex flex-col gap-2">
                {messages.map((m) => (
                  <div key={m.id} className={`flex ${m.role === "assistant" ? "justify-start" : "justify-end"}`}>
                    <div
                      className={`max-w-[90%] whitespace-pre-wrap break-words rounded-lg px-3 py-2 text-sm leading-relaxed ${
                      m.role === "assistant" ? "bg-[color:var(--ai-message-assistant-bg)] border border-[color:var(--ai-message-assistant-border)] text-text-primary" : "bg-[color:var(--ai-message-user-bg)] border border-[color:var(--ai-message-user-border)] text-text-primary"
                    }`}
                    >
                      <div className="mb-1 text-[10px] uppercase tracking-wide text-text-secondary">
                        {m.role === "user" ? "You" : "Negotiator"}
                      </div>
                      <div className="prose prose-invert max-w-none break-words text-sm leading-relaxed [&_code]:bg-black/30 [&_code]:px-1 [&_code]:py-0.5 [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-black/30 [&_pre]:p-2">
                        {m.content}
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
            className="min-h-[96px] w-full rounded-md border border-[color:var(--ai-input-border)] bg-[color:var(--ai-input-bg)] p-3 pr-12 text-sm text-text-primary placeholder:text-text-secondary/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),inset_0_0_0_1px_rgba(0,0,0,0.35)] outline-none focus:border-[color:var(--ai-input-border-focus)] focus:ring-2 focus:ring-[color:var(--ai-window-focus-ring)]"
            placeholder="Ask the Negotiator for seller language, draft replies, handle objections, and sharpen offer positioning to communicate with your client."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (!sendDisabled) {
                  handleSend();
                }
              }
            }}
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={sendDisabled}
            className={`absolute bottom-3 right-3 inline-flex h-9 w-9 items-center justify-center rounded-full border border-[color:var(--ai-window-divider)] bg-[color:var(--ai-window-surface-2)] text-text-primary shadow-[0_10px_30px_rgba(0,0,0,0.35)] transition hover:border-[color:var(--ai-window-border-strong)] hover:bg-[color:var(--ai-window-surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ai-window-focus-ring)] ${
              sendDisabled ? "opacity-50 cursor-not-allowed" : ""
            }`}
            title="Send"
          >
            <ArrowUpRight size={18} />
          </button>
        </div>
        {!canUseNegotiator && <div className="text-[11px] text-text-secondary">Generate the playbook to chat.</div>}
      </div>
    </div>
  );
}

export default DealNegotiatorPanel;