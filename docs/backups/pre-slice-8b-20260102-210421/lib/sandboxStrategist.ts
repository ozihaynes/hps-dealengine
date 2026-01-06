"use client";

import type {
  SandboxConfig,
  SandboxStrategistRequest,
  SandboxStrategistResponse,
} from "@hps-internal/contracts";

type SandboxStrategistThreadedRequest = SandboxStrategistRequest & {
  threadId?: string | null;
};

type SandboxStrategistThreadedResponse = SandboxStrategistResponse & {
  threadId?: string | null;
};

export async function askSandboxStrategist(
  input: SandboxStrategistThreadedRequest,
): Promise<SandboxStrategistThreadedResponse> {
  try {
    const response = await fetch("/api/agents/strategist", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        question: input.prompt,
        focusArea: "sandbox",
        timeRange: null,
        threadId: input.threadId ?? null,
      }),
    });

    if (!response.ok) {
      console.error(
        "[Sandbox Strategist] request failed",
        response.status,
        response.statusText,
      );
      return {
        ok: false,
        error: "Unable to get strategist answer. Please try again.",
        threadId: input.threadId ?? null,
      };
    }

    const data = (await response.json().catch(() => null)) as
      | {
          ok: true;
          threadId?: string | null;
          answer?: string;
          model?: string | null;
        }
      | { ok: false; error?: string; message?: string; threadId?: string | null }
      | null;

    if (!data || data.ok !== true) {
      const threadId = data?.threadId ?? input.threadId ?? null;
      const errorMessage =
        (data as any)?.message ||
        (data as any)?.error ||
        "Strategist is unavailable right now. Please try again.";
      console.error("[Sandbox Strategist] bad response", data);
      return {
        ok: false,
        error: errorMessage,
        threadId,
      };
    }

    return {
      ok: true,
      markdown: data.answer ?? "",
      provider: "openai-strategist-v2",
      model: data.model ?? "unknown",
      threadId: data.threadId ?? input.threadId ?? null,
    };
  } catch (err) {
    console.error("[Sandbox Strategist] fetch failed", err);
    return {
      ok: false,
      error: "Unable to get strategist answer. Please try again.",
      threadId: input.threadId ?? null,
    };
  }
}

export function buildStrategistPayload(
  prompt: string,
  posture: SandboxStrategistRequest["posture"],
  settings: SandboxConfig,
): SandboxStrategistRequest {
  return {
    prompt,
    posture,
    settings,
  };
}
