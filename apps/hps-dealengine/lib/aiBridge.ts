"use client";

import { Postures } from "@hps-internal/contracts";
import { getSupabaseClient } from "./supabaseClient";
import type {
  AiBridgeResult,
  AiTone,
  NegotiationPlaybookResult,
  NegotiatorChatResult,
  NegotiatorTone,
} from "./ai/types";

function safeError(message: string): AiBridgeResult {
  return {
    persona: "dealAnalyst",
    summary: message,
    sources: [],
    ok: false,
  };
}

export async function askDealAnalyst(params: {
  dealId: string;
  runId: string;
  posture?: (typeof Postures)[number];
  userPrompt: string;
  tone?: AiTone;
  isStale?: boolean;
  threadId?: string | null;
}): Promise<AiBridgeResult> {
  if (!params.dealId || !params.runId) {
    return safeError("dealId and runId are required for deal analyst.");
  }

  try {
    const res = await fetch("/api/agents/analyst", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dealId: params.dealId,
        runId: params.runId,
        question: params.userPrompt,
        isStale: params.isStale ?? false,
        threadId: params.threadId ?? null,
      }),
    });

    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.ok) {
      return {
        persona: "dealAnalyst",
        summary: json?.error ?? "Analyst is unavailable. Please try again.",
        sources: [],
        ok: false,
        threadId: json?.threadId ?? params.threadId ?? null,
      };
    }

    return {
      persona: "dealAnalyst",
      summary: json.answer ?? "Analysis ready.",
      sources: [],
      ok: true,
      threadId: json.threadId ?? params.threadId ?? null,
      provider: "hps-analyst-v2",
      model: json.model ?? null,
    };
  } catch (err: any) {
    return {
      persona: "dealAnalyst",
      summary: err?.message ?? "Analyst is unavailable. Please try again.",
      sources: [],
      ok: false,
      threadId: params.threadId ?? null,
    };
  }
}

export async function askDealStrategist(params: {
  userPrompt: string;
  posture?: string;
  sandboxSettings?: unknown;
  route?: string;
  tone?: AiTone;
  focusArea?: string | null;
  timeRange?: { from?: string; to?: string } | null;
  threadId?: string | null;
}): Promise<AiBridgeResult> {
  const focusArea = params.focusArea ?? "sandbox";
  const timeRange = params.timeRange ?? null;

  try {
    const supabase = getSupabaseClient();
    const { data } = await supabase.auth.getSession();
    const accessToken = data.session?.access_token;
    if (!accessToken) {
      return {
        persona: "dealStrategist",
        summary: "You are not signed in. Please refresh and sign in again.",
        sources: [],
        ok: false,
        threadId: params.threadId ?? null,
      };
    }

    const res = await fetch("/api/agents/strategist", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        question: params.userPrompt,
        focusArea,
        timeRange,
        threadId: params.threadId ?? null,
      }),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.ok) {
      return {
        persona: "dealStrategist",
        summary: json?.error ?? "Strategist is unavailable. Please try again.",
        sources: [],
        ok: false,
        threadId: json?.threadId ?? params.threadId ?? null,
      };
    }
    return {
      persona: "dealStrategist",
      summary: json.answer ?? "Strategy ready.",
      sources: [],
      ok: true,
      threadId: json.threadId ?? params.threadId ?? null,
      provider: "hps-strategist-v2",
      model: json.model ?? null,
    };
  } catch (err: any) {
    return {
      persona: "dealStrategist",
      summary: err?.message ?? "Strategist is unavailable. Please try again.",
      sources: [],
      ok: false,
      threadId: params.threadId ?? null,
    };
  }
}

/** @deprecated legacy wrapper; prefer askDealAnalyst/askDealStrategist */
export async function fetchStrategistAnalysis(params: {
  dealId: string;
  runId: string;
  posture?: (typeof Postures)[number];
  prompt: string;
}) {
  return askDealAnalyst({
    dealId: params.dealId,
    runId: params.runId,
    posture: params.posture,
    userPrompt: params.prompt,
  });
}

export async function askDealNegotiatorGeneratePlaybook(params: {
  dealId: string;
  runId: string;
}): Promise<NegotiationPlaybookResult> {
  if (!params.dealId || !params.runId) {
    throw new Error("dealId and runId are required for deal negotiator.");
  }

  const res = await fetch("/api/agents/negotiator", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      dealId: params.dealId,
      question: "Generate full negotiation playbook.",
      runId: params.runId,
    }),
  }).catch(() => null);

  if (res && res.ok) {
    const json = await res.json().catch(() => null);
    if (json?.ok && json?.answer) {
      return {
        persona: "dealNegotiator",
        mode: "generate_playbook",
        runId: params.runId,
        logicRowIds: [],
        sections: {
          anchor: null,
          script: null,
          pivot: null,
          all: [{ id: "playbook", module: "competence", scenarioLabel: "auto", triggerPhrase: "", scriptBody: json.answer }],
        },
      };
    }
  }

  return {
    persona: "dealNegotiator",
    mode: "generate_playbook",
    runId: params.runId,
    logicRowIds: [],
    sections: { anchor: null, script: null, pivot: null, all: [] },
  };
}

export async function askDealNegotiatorChat(params: {
  dealId: string;
  runId: string | null;
  logicRowIds?: string[] | null;
  userMessage: string;
  tone?: NegotiatorTone;
  sellerContext?: string | null;
  threadId?: string | null;
}): Promise<NegotiatorChatResult> {
  const buildMessage = (role: "assistant" | "user" | "system", content: string) => ({ role, content });

  if (!params.dealId) {
    return {
      persona: "dealNegotiator",
      mode: "chat",
      runId: params.runId ?? null,
      logicRowIds: params.logicRowIds ?? [],
      messages: [],
      ok: false,
      threadId: params.threadId ?? null,
    };
  }
  if (!params.userMessage.trim()) {
    return {
      persona: "dealNegotiator",
      mode: "chat",
      runId: params.runId ?? null,
      logicRowIds: params.logicRowIds ?? [],
      messages: [],
      ok: false,
      threadId: params.threadId ?? null,
    };
  }

  try {
    const res = await fetch("/api/agents/negotiator", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dealId: params.dealId,
        question: params.userMessage,
        sellerContext: params.sellerContext ?? null,
        runId: params.runId ?? null,
        threadId: params.threadId ?? null,
      }),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.ok) {
      return {
        persona: "dealNegotiator",
        mode: "chat",
        runId: params.runId ?? null,
      logicRowIds: params.logicRowIds ?? [],
      messages: [buildMessage("assistant", json?.error ?? "Negotiator is unavailable. Please try again.")],
      ok: false,
      threadId: json?.threadId ?? params.threadId ?? null,
    };
  }
    return {
      persona: "dealNegotiator",
      mode: "chat",
      runId: params.runId ?? null,
      logicRowIds: params.logicRowIds ?? [],
      messages: [buildMessage("assistant", json.answer ?? "Negotiation guidance ready.")],
      ok: true,
      threadId: json.threadId ?? params.threadId ?? null,
      provider: "hps-negotiator-v2",
      model: json.model ?? null,
    };
  } catch (err: any) {
    return {
      persona: "dealNegotiator",
      mode: "chat",
      runId: params.runId ?? null,
      logicRowIds: params.logicRowIds ?? [],
      messages: [buildMessage("assistant", err?.message ?? "Negotiator is unavailable. Please try again.")],
      ok: false,
      threadId: params.threadId ?? null,
    };
  }
}
