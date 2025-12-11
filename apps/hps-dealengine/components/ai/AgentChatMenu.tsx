"use client";

import React, { useMemo } from "react";
import { useAiWindows, sortSessionsForPersona } from "@/lib/ai/aiWindowsContext";
import { useDealSession } from "@/lib/dealSessionContext";
import type { AgentId } from "./AgentSessionHeader";
import type { AiTone } from "@/lib/ai/types";
import { deriveChatTitleFromMessage } from "@/lib/ai/chatTitle";

type AgentChatMenuProps = {
  agentId: AgentId;
  isOpen: boolean;
  onClose: () => void;
};

const agentWindowMap: Record<AgentId, "dealAnalyst" | "dealStrategist" | "dealNegotiator"> = {
  analyst: "dealAnalyst",
  strategist: "dealStrategist",
  negotiator: "dealNegotiator",
};

function ToneButtons({
  agentId,
  activeTone,
  onChange,
}: {
  agentId: AgentId;
  activeTone: string | undefined;
  onChange: (tone: string) => void;
}) {
  const options: { id: string; label: string }[] =
    agentId === "analyst"
      ? [
          { id: "direct", label: "Direct" },
          { id: "neutral", label: "Neutral" },
          { id: "empathetic", label: "Supportive" },
        ]
      : agentId === "strategist"
        ? [
            { id: "visionary", label: "Visionary" },
            { id: "neutral", label: "Neutral" },
            { id: "direct", label: "Blunt" },
          ]
        : [
            { id: "objective", label: "Objective" },
            { id: "empathetic", label: "Empathetic" },
            { id: "assertive", label: "Assertive" },
          ];

  return (
    <div className="space-y-2">
      <div className="text-[11px] uppercase tracking-wide text-text-secondary">Tone</div>
      <div className="inline-flex rounded-full border border-[color:var(--glass-border)] bg-[color:var(--glass-bg)] p-0.5">
        {options.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={`px-2 py-0.5 rounded-full transition text-[10px] ${
              activeTone === opt.id
                ? "bg-[color:var(--accent-color)] text-[color:var(--text-primary)]"
                : "text-[color:var(--text-secondary)] hover:bg-[color:var(--glass-bg)]"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function AgentChatMenu({ agentId, isOpen, onClose }: AgentChatMenuProps) {
  const { state, dispatch } = useAiWindows();
  const { negotiationPlaybook, negotiatorMessages = [], negotiatorTone, setNegotiatorTone } = useDealSession();
  const windowId = agentWindowMap[agentId];
  const windowState = state.windows[windowId];
  const sessions = sortSessionsForPersona(windowState.sessions);

  const negotiatorTitle = useMemo(() => {
    const firstUser = negotiatorMessages.find((m) => m.role === "user");
    if (firstUser?.content) {
      return deriveChatTitleFromMessage(firstUser.content, "Negotiator Playbook");
    }
    return "Negotiator Playbook";
  }, [negotiatorMessages]);

  if (!isOpen) return null;

  const handleToneChange = (tone: string) => {
    if (agentId === "negotiator") {
      setNegotiatorTone?.(tone as any);
    } else {
      if (!windowState.activeSessionId) return;
      dispatch({ type: "SET_SESSION_TONE", id: windowId, sessionId: windowState.activeSessionId, tone: tone as AiTone });
    }
  };

  const activeTone =
    agentId === "negotiator"
      ? negotiatorTone
      : windowState.activeSessionId
        ? windowState.sessions.find((s) => s.id === windowState.activeSessionId)?.tone
        : undefined;

  const handleLoadSession = (sessionId: string) => {
    dispatch({ type: "LOAD_SESSION", id: windowId, sessionId });
    onClose();
  };

  const chatList =
    agentId === "negotiator"
      ? [
          {
            id: "negotiator-current",
            title: negotiatorTitle,
            disabled: !negotiationPlaybook,
            isActive: true,
          },
        ]
      : sessions.map((s) => {
          const firstUser = s.messages.find((m) => m.role === "user");
          const derived = firstUser?.content ? deriveChatTitleFromMessage(firstUser.content, "New Chat") : "New Chat";
          return {
            id: s.id,
            title: s.title?.trim() || derived,
            isActive: s.id === windowState.activeSessionId,
            disabled: false,
          };
        });

  return (
    <div className="absolute left-0 top-full z-[110] mt-2 w-72 rounded-lg border border-[color:var(--glass-border)] bg-[color:var(--glass-bg)] p-3 shadow-2xl">
      <div className="space-y-3">
        <ToneButtons agentId={agentId} activeTone={activeTone} onChange={handleToneChange} />
        <div className="space-y-2">
          <div className="text-[11px] uppercase tracking-wide text-text-secondary">Your Chats</div>
          <div className="space-y-1">
            {chatList.length === 0 && <div className="text-[11px] text-text-secondary">No saved chats yet.</div>}
            {chatList.map((s) => (
              <button
                key={s.id}
                type="button"
                disabled={s.disabled}
                onClick={() => (agentId === "negotiator" ? onClose() : handleLoadSession(s.id))}
                className={`w-full rounded-md border px-2 py-1 text-left text-sm transition ${
                  s.isActive
                    ? "border-[color:var(--accent-color)] bg-[color:var(--accent-color)]/10 text-text-primary"
                    : "border-[color:var(--glass-border)] text-text-secondary hover:border-[color:var(--accent-color)] hover:text-text-primary"
                } ${s.disabled ? "opacity-60 cursor-not-allowed" : ""}`}
              >
                {s.title}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AgentChatMenu;
