"use client";

import React from "react";
import { askDealNegotiatorChat } from "@/lib/aiBridge";
import { useDealSession } from "@/lib/dealSessionContext";
import type { AiChatMessage } from "@/lib/ai/types";
import { Button, GlassCard } from "../ui";
import { ArrowUpRight } from "lucide-react";

type DealNegotiatorPanelProps = {
  inline?: boolean;
};

export function DealNegotiatorPanel({ inline }: DealNegotiatorPanelProps) {
  const { dbDeal, lastRunId, negotiationPlaybook } = useDealSession();

  const [input, setInput] = React.useState("");
  const [isSending, setIsSending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [threadId, setThreadId] = React.useState<string | null>(null);
  const [messages, setMessages] = React.useState<AiChatMessage[]>([]);
  const scrollRef = React.useRef<HTMLDivElement | null>(null);

  const scrollToLatest = React.useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, []);

  React.useEffect(() => {
    // Reset conversation when switching deals
    setThreadId(null);
    setMessages([]);
    setError(null);
  }, [dbDeal?.id, lastRunId]);

  React.useEffect(() => {
    scrollToLatest();
  }, [messages.length, scrollToLatest]);

  const createMessage = React.useCallback(
    (role: "user" | "assistant" | "system", content: string): AiChatMessage => ({
      id: `${role}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      role,
      content,
      createdAt: new Date().toISOString(),
    }),
    [],
  );

  const canUseNegotiator = Boolean(negotiationPlaybook && negotiationPlaybook.logicRowIds.length > 0);
  const hasMessages = messages.length > 0;
  const sendDisabled = isSending || !input.trim() || !canUseNegotiator || !dbDeal?.id;

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

    const text = input.trim();
    setInput("");
    setIsSending(true);
    setError(null);

    const userMessage = createMessage("user", text);
    setMessages((prev) => [...prev, userMessage]);
    scrollToLatest();

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
      const fallback = createMessage(
        "assistant",
        response.messages?.[0]?.content ?? "The Negotiator is unavailable. Please try again.",
      );
      setMessages((prev) => [...prev, fallback]);
      setError(response.messages?.[0]?.content ?? "The Negotiator is unavailable. Please try again.");
      setIsSending(false);
      return;
    }

    const assistantMsgContent =
      response.messages.find((m) => m.role === "assistant")?.content ??
      "Negotiation guidance ready.";

    setMessages((prev) => [...prev, createMessage("assistant", assistantMsgContent)]);
    setIsSending(false);
  }, [canUseNegotiator, createMessage, dbDeal?.id, input, isSending, lastRunId, scrollToLatest, threadId]);

  return (
    <GlassCard className={inline ? "flex h-full min-h-0 flex-col p-3 md:p-4" : "flex h-full min-h-0 flex-col p-3"}>
      {error && (
        <div className="mt-2 rounded-md border border-brand-red-subtle bg-brand-red-subtle/20 px-3 py-2 text-xs text-brand-red-light">
          {error}
        </div>
      )}

      <div ref={scrollRef} className="mt-3 flex-1 min-h-[260px] space-y-3 overflow-y-auto pr-1">
        <div className="space-y-2 rounded-md border border-[color:var(--glass-border)] bg-[color:var(--glass-bg)] px-3 py-2">
          {hasMessages && (
            <div className="flex flex-col gap-2">
              {messages.map((m) => (
                <div key={m.id} className={`flex ${m.role === "assistant" ? "justify-start" : "justify-end"}`}>
                  <div
                    className={`max-w-[90%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm ${
                      m.role === "assistant" ? "bg-white/5 text-text-primary" : "bg-accent-blue/20 text-text-primary"
                    }`}
                  >
                    <div className="mb-1 text-[10px] uppercase tracking-wide text-text-secondary">
                      {m.role === "user" ? "You" : "Negotiator"}
                    </div>
                    {m.content}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-col gap-2 border-t border-[color:var(--glass-border)] pt-3">
        <div className="relative">
          <textarea
            className="min-h-[96px] w-full rounded-md border border-white/10 bg-white/5 p-3 pr-12 text-sm text-text-primary outline-none focus:border-accent-blue"
            placeholder="Ask the Negotiator for seller language—draft replies, handle objections, and sharpen offer positioning to communicate with your client."
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
            className={`absolute bottom-3 right-3 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-accent-blue/80 text-white shadow-lg backdrop-blur transition hover:bg-accent-blue ${
              sendDisabled ? "opacity-50 cursor-not-allowed" : ""
            }`}
            title="Send"
          >
            <ArrowUpRight size={18} />
          </button>
        </div>
        {!canUseNegotiator && <div className="text-[11px] text-text-secondary">Generate the playbook to chat.</div>}
      </div>
    </GlassCard>
  );
}

export default DealNegotiatorPanel;
