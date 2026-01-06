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

const AI_ERROR_MESSAGES: Record<string, string> = {
  rate_limited: "Provider rate limiting. Try again in 30-60 seconds.",
  context_length_exceeded: "Request too large. Reduce notes/evidence or try again (we'll auto-trim).",
  invalid_api_key: "API key invalid or missing. Check OPENAI_API_KEY and try again.",
  insufficient_quota: "API quota exceeded. Check billing/usage, then retry.",
  dataset_missing: "Negotiation dataset missing/invalid. Restore the expected JSON and retry.",
  dataset_invalid: "Negotiation dataset missing/invalid. Restore the expected JSON and retry.",
  kb_registry_missing: "Strategist KB registry missing. Restore the registry and retry.",
  unknown_error: "Unexpected error. Try again.",
};

type AiErrorInfo = {
  errorCode: string | null;
  message: string;
  retryable: boolean;
};

function resolveAiErrorInfo(payload: any, fallbackMessage: string): AiErrorInfo {
  const rawCode = payload?.error_code ?? payload?.error ?? null;
  const errorCode =
    rawCode && AI_ERROR_MESSAGES[rawCode]
      ? rawCode
      : "unknown_error";
  const message =
    payload?.user_message ??
    AI_ERROR_MESSAGES[errorCode] ??
    fallbackMessage ??
    AI_ERROR_MESSAGES.unknown_error;
  const retryable =
    typeof payload?.retryable === "boolean"
      ? payload.retryable
      : Boolean(errorCode && AI_ERROR_MESSAGES[errorCode]);
  return { errorCode, message, retryable };
}

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
    const supabase = getSupabaseClient();
    const { data } = await supabase.auth.getSession();
    const accessToken = data.session?.access_token;
    if (!accessToken) {
      return {
        persona: "dealAnalyst",
        summary: "You are not signed in. Please refresh and sign in again.",
        sources: [],
        ok: false,
        threadId: params.threadId ?? null,
      };
    }

    const res = await fetch("/api/agents/analyst", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
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
      const errorInfo = resolveAiErrorInfo(
        json,
        "Analyst is unavailable. Please try again.",
      );
      return {
        persona: "dealAnalyst",
        summary: errorInfo.message,
        sources: [],
        ok: false,
        threadId: json?.threadId ?? params.threadId ?? null,
        error_code: errorInfo.errorCode,
        retryable: errorInfo.retryable,
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
    const errorInfo = resolveAiErrorInfo(null, AI_ERROR_MESSAGES.unknown_error);
    return {
      persona: "dealAnalyst",
      summary: errorInfo.message,
      sources: [],
      ok: false,
      threadId: params.threadId ?? null,
      error_code: errorInfo.errorCode,
      retryable: errorInfo.retryable,
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
      const errorInfo = resolveAiErrorInfo(
        json,
        "Strategist is unavailable. Please try again.",
      );
      return {
        persona: "dealStrategist",
        summary: errorInfo.message,
        sources: [],
        ok: false,
        threadId: json?.threadId ?? params.threadId ?? null,
        error_code: errorInfo.errorCode,
        retryable: errorInfo.retryable,
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
    const errorInfo = resolveAiErrorInfo(null, AI_ERROR_MESSAGES.unknown_error);
    return {
      persona: "dealStrategist",
      summary: errorInfo.message,
      sources: [],
      ok: false,
      threadId: params.threadId ?? null,
      error_code: errorInfo.errorCode,
      retryable: errorInfo.retryable,
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

  const supabase = getSupabaseClient();
  const { data } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token;
  if (!accessToken) {
    return {
      persona: "dealNegotiator",
      mode: "generate_playbook",
      runId: params.runId,
      logicRowIds: [],
      sections: { anchor: null, script: null, pivot: null, all: [] },
    };
  }

  const res = await fetch("/api/agents/negotiator", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      dealId: params.dealId,
      question: "Generate full negotiation playbook.",
      runId: params.runId,
    }),
  }).catch(() => null);

  const json = await res?.json().catch(() => null);
  const threadId = json?.threadId ?? null;

  if (!res || !json?.ok) {
    const errorInfo = resolveAiErrorInfo(
      json,
      "Negotiator is unavailable. Please try again.",
    );

    return {
      persona: "dealNegotiator",
      mode: "generate_playbook",
      runId: params.runId,
      logicRowIds: [],
      sections: { anchor: null, script: null, pivot: null, all: [] },
      ok: false,
      summary: errorInfo.message,
      threadId,
      error_code: errorInfo.errorCode,
      retryable: errorInfo.retryable,
    };
  }

  if (json?.answer) {
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
      ok: true,
      threadId,
      model: json?.model ?? null,
    };
  }

  return {
    persona: "dealNegotiator",
    mode: "generate_playbook",
    runId: params.runId,
    logicRowIds: [],
    sections: { anchor: null, script: null, pivot: null, all: [] },
    ok: false,
    summary: "Negotiator is unavailable. Please try again.",
    threadId,
    error_code: "unknown_error",
    retryable: true,
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
    const supabase = getSupabaseClient();
    const { data } = await supabase.auth.getSession();
    const accessToken = data.session?.access_token;
    if (!accessToken) {
      return {
        persona: "dealNegotiator",
        mode: "chat",
        runId: params.runId ?? null,
        logicRowIds: params.logicRowIds ?? [],
        messages: [buildMessage("assistant", "You are not signed in. Please refresh and sign in again.")],
        ok: false,
        threadId: params.threadId ?? null,
      };
    }

    const res = await fetch("/api/agents/negotiator", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
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
      const errorInfo = resolveAiErrorInfo(
        json,
        "Negotiator is unavailable. Please try again.",
      );
      const message = errorInfo.message;
      return {
        persona: "dealNegotiator",
        mode: "chat",
        runId: params.runId ?? null,
        logicRowIds: params.logicRowIds ?? [],
        messages: [buildMessage("assistant", message)],
        ok: false,
        threadId: json?.threadId ?? params.threadId ?? null,
        error_code: errorInfo.errorCode,
        retryable: errorInfo.retryable,
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
    const errorInfo = resolveAiErrorInfo(null, AI_ERROR_MESSAGES.unknown_error);
    return {
      persona: "dealNegotiator",
      mode: "chat",
      runId: params.runId ?? null,
      logicRowIds: params.logicRowIds ?? [],
      messages: [buildMessage("assistant", errorInfo.message)],
      ok: false,
      threadId: params.threadId ?? null,
      error_code: errorInfo.errorCode,
      retryable: errorInfo.retryable,
    };
  }
}
