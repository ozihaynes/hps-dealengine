"use client";

import type {
  AiBridgeInput,
  AiBridgeResult,
} from "@hps-internal/contracts";
import { AiBridgeResultSchema } from "@hps-internal/contracts";
import { getSupabaseClient } from "@/lib/supabaseClient";

type AiBridgeSuccess = Extract<AiBridgeResult, { ok: true }>;

const STRATEGIST_ENABLED = false;
const STRATEGIST_DISABLED_MESSAGE =
  "Strategist is temporarily disabled while we finish v1.";

function friendlyMessage(payload: Partial<AiBridgeResult> | null, fallback: string) {
  const code = (payload as any)?.errorCode ?? (payload as any)?.error ?? null;
  const message = (payload as any)?.message ?? (payload as any)?.error ?? fallback;

  switch (code) {
    case "v1-ai-bridge-ENV-001":
    case "v1-ai-bridge-ENV-002":
      return "AI is not configured for this environment yet.";
    case "v1-ai-bridge-RUN-NOT-FOUND-404":
      return "No saved run found. Run an analysis and save it before asking the strategist.";
    case "v1-ai-bridge-RUN-FORBIDDEN-403":
      return "You do not have access to this run.";
    case "v1-ai-bridge-RUN-LOAD-500":
      return message ?? "Unexpected error while loading run for this user.";
    case "v1-ai-bridge-EVIDENCE-403":
      return "Evidence for this run is not accessible for this user.";
    case "v1-ai-bridge-UPSTREAM-001":
      return "AI is temporarily unavailable. Please try again in a few minutes.";
    case "v1-ai-bridge-UNEXPECTED-001":
      return "Unexpected error in AI bridge. If this persists, contact support.";
    default:
      return message ?? "AI bridge failed.";
  }
}

function normalizeErrorPayload(body: unknown): Partial<AiBridgeResult> | null {
  if (body && typeof body === "object") {
    return body as Partial<AiBridgeResult>;
  }

  if (typeof body === "string") {
    try {
      const parsed = JSON.parse(body);
      if (parsed && typeof parsed === "object") return parsed as Partial<AiBridgeResult>;
    } catch {
      // ignore parse errors; fall through
    }
  }

  return null;
}

export async function fetchStrategistAnalysis(
  input: AiBridgeInput,
): Promise<AiBridgeSuccess> {
  if (!STRATEGIST_ENABLED) {
    throw new Error(STRATEGIST_DISABLED_MESSAGE);
  }

  const supabase = getSupabaseClient();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) {
    throw new Error("No Supabase session; please sign in.");
  }

  console.log("[aiBridge] calling v1-ai-bridge with payload:", {
    dealId: input.dealId,
    runId: input.runId,
    posture: input.posture,
  });

  const { data: fnData, error } = await supabase.functions.invoke("v1-ai-bridge", {
    body: input,
  });

  // Handle transport-level error (non-2xx)
  if (error) {
    // Supabase Functions error; try to pull a useful message from the context/body.
    const anyErr = error as any;

    let status: number | undefined;
    let body: unknown = fnData ?? anyErr?.context?.body ?? anyErr?.context?.error;
    let bodyMessage: string | undefined;
    let bodyError: string | undefined;

    try {
      status = anyErr?.context?.status ?? anyErr?.status;

      // Try to read a JSON body or error string from Supabase's context/response
      if (!body && anyErr?.context?.body) {
        if (typeof anyErr.context.body === "string") {
          try {
            const parsed = JSON.parse(anyErr.context.body);
            body = parsed;
          } catch {
            body = anyErr.context.body;
          }
        } else {
          body = anyErr.context.body;
        }
      }

      if (!body && anyErr?.context?.response) {
        try {
          body = await anyErr.context.response.clone()?.json();
        } catch {
          try {
            const txt = await anyErr.context.response.clone()?.text();
            body = normalizeErrorPayload(txt);
          } catch {
            body = anyErr.context.response;
          }
        }
      } else if (anyErr?.context?.error) {
        body = anyErr.context.error;
      } else if (fnData) {
        body = fnData;
      }

      if (body && typeof body === "object") {
        const asAny = body as any;
        if (typeof asAny.message === "string") {
          bodyMessage = asAny.message.trim();
        }
        if (typeof asAny.error === "string") {
          bodyError = asAny.error.trim();
        }
        if (typeof asAny.errorCode === "string" && !bodyError) {
          bodyError = asAny.errorCode.trim();
        }
      } else if (typeof body === "string") {
        bodyMessage = body.trim();
      }
    } catch {
      // Swallow parsing issues; we'll fall back below.
    }

    const serverMessage =
      (bodyMessage && bodyMessage.length > 0) ? bodyMessage :
      (bodyError && bodyError.length > 0) ? bodyError :
      // IMPORTANT: do NOT expose Supabase's generic "Edge Function returned a non-2xx status code"
      "AI bridge request failed.";

    console.error("[aiBridge] v1-ai-bridge transport error", {
      status,
      errorCode: (body as any)?.errorCode,
      bodyMessage,
      bodyError,
      // For debugging if needed, but avoid logging secrets:
      // rawError: anyErr,
    });

    throw new Error(serverMessage);
  }

  // Handle application-level errors (ok: false)
  const parsed = AiBridgeResultSchema.safeParse(fnData);
  if (!parsed.success) {
    console.error("[aiBridge] bad response from v1-ai-bridge", parsed.error, fnData);
    throw new Error("AI bridge request failed.");
  }

  if (!parsed.data.ok) {
    const body = parsed.data as Extract<AiBridgeResult, { ok: false }>;
    const serverMessage =
      typeof (body as any)?.message === "string" && (body as any).message.trim().length > 0
        ? (body as any).message.trim()
        : "AI bridge request failed.";

    console.error("[aiBridge] v1-ai-bridge returned error", {
      errorCode: (body as any)?.errorCode,
      message: serverMessage,
    });

    throw new Error(serverMessage);
  }

  return parsed.data as AiBridgeSuccess;
}
