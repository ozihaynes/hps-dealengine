"use client";

import React, { useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { askDealStrategist } from "@/lib/aiBridge";
import type { AiBridgeResult, AiTone } from "@/lib/ai/types";
import { Button, GlassCard } from "@/components/ui";
import { useAiWindows } from "@/lib/ai/aiWindowsContext";

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
  const [question, setQuestion] = useState("How should we tune spreads and guardrails for the current market?");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AiBridgeResult | null>(null);
  const { state, dispatch } = useAiWindows();
  const w = state.windows.dealStrategist;
  const activeSession = useMemo(
    () => (w.activeSessionId ? w.sessions.find((s) => s.id === w.activeSessionId) ?? null : null),
    [w.activeSessionId, w.sessions],
  );
  const tone = activeSession?.tone ?? "visionary";

  React.useEffect(() => {
    if (!w.activeSessionId) {
      const id = crypto.randomUUID();
      dispatch({ type: "START_NEW_SESSION", id: "dealStrategist", sessionId: id });
    }
  }, [dispatch, w.activeSessionId]);

  const onAsk = async (prompt: string) => {
    setLoading(true);
    setError(null);
    if (!w.activeSessionId) {
      const id = crypto.randomUUID();
      dispatch({ type: "START_NEW_SESSION", id: "dealStrategist", sessionId: id });
    }
    dispatch({
      type: "APPEND_MESSAGE",
      id: "dealStrategist",
      message: { id: crypto.randomUUID(), role: "user", content: prompt, createdAt: new Date().toISOString() },
    });
    try {
      const res = await askDealStrategist({
        userPrompt: prompt,
        posture,
        sandboxSettings,
        route: pathname,
        tone,
      });
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
    } catch (err: any) {
      setError(err?.message ?? "Deal Strategist failed.");
    } finally {
      setLoading(false);
    }
  };

  const sources = useMemo(() => result?.sources ?? [], [result]);
  const messages = activeSession?.messages ?? [];
  const toneOptions: { id: AiTone; label: string }[] = [
    { id: "visionary", label: "Visionary" },
    { id: "neutral", label: "Neutral" },
    { id: "direct", label: "Blunt" },
  ];

  return (
    <div className="flex h-full flex-col gap-3 bg-transparent p-0 text-text-primary">
      <div className="flex items-center justify-between gap-2 border-b border-[color:var(--glass-border)] px-2 pb-2 text-xs text-text-secondary">
        <div className="space-y-0.5">
          <div className="font-semibold text-text-primary">Deal Strategist</div>
          <p className="text-[11px] text-text-secondary">
            System-level guidance: sandbox knobs, posture, market temp, policies, and KPIs.
          </p>
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
                dispatch({ type: "SET_SESSION_TONE", id: "dealStrategist", sessionId: w.activeSessionId, tone: opt.id });
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
            onClick={() => dispatch({ type: "LOAD_SESSION", id: "dealStrategist", sessionId: s.id })}
            className={`rounded-full border px-2 py-0.5 text-[11px] ${s.id === w.activeSessionId ? "border-[color:var(--accent-color)] bg-[color:var(--accent-color)]/10 text-text-primary" : "border-[color:var(--glass-border)] text-text-secondary"}`}
          >
            {new Date(s.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-1 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-100">
          {error}
        </div>
      )}

      <GlassCard className="mb-3 space-y-2 p-3">
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          className="w-full rounded border border-border-subtle bg-surface-elevated px-3 py-2 text-sm text-text-primary focus:border-accent-blue focus:outline-none"
          rows={3}
          placeholder="Ask about policies, sandbox knobs, KPIs, and risk gates..."
        />
        <div className="flex items-center gap-2">
          <Button size="sm" variant="primary" disabled={loading} onClick={() => onAsk(question)}>
            {loading ? "Thinking..." : "Ask Deal Strategist"}
          </Button>
          <div className="text-[11px] text-text-secondary">Strategy + docs grounded; no deal math unless provided.</div>
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
            <Section section={result.system_guidance} />
            <Section section={result.guardrails} />

            {sources.length > 0 && (
              <div className="space-y-1 border-t border-white/10 pt-2">
                <div className="text-[11px] uppercase tracking-wide text-text-secondary">Sources</div>
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
            Ask a question to see system-level guidance (knobs, policies, KPIs).
          </GlassCard>
        )}
      </div>

      {messages.length > 0 && (
        <div className="space-y-2 rounded border border-[color:var(--glass-border)] bg-[color:var(--glass-bg)] px-3 py-2 text-xs text-text-secondary">
          <div className="text-[11px] uppercase tracking-wide">History (this session)</div>
          <ul className="space-y-1 max-h-32 overflow-y-auto">
            {messages.map((m) => (
              <li key={m.id} className="flex gap-2">
                <span className="font-semibold text-text-primary">{m.role === "user" ? "You" : "Strategist"}:</span>
                <span className="text-text-secondary">{m.content ?? ""}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default DealStrategistPanel;
