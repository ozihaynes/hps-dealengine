"use client";

import type {
  AiBridgeInput,
  AiBridgeResult,
} from "@hps-internal/contracts";
import { AiBridgeResultSchema } from "@hps-internal/contracts";
import { getSupabaseClient } from "@/lib/supabaseClient";

type AiBridgeSuccess = Extract<AiBridgeResult, { ok: true }>;

const STRATEGIST_ENABLED = true;
const STRATEGIST_DISABLED_MESSAGE =
  "Strategist is temporarily disabled while we finish v1.";

function friendlyMessage(payload: Partial<AiBridgeResult> | null, fallback: string) {
  const code = (payload as any)?.errorCode ?? (payload as any)?.error ?? null;
  const message = (payload as any)?.message ?? (payload as any)?.error ?? fallback;

  switch (code) {
    case "v1-ai-bridge-ENV-001":
    case "v1-ai-bridge-ENV-002":
      return `AI is not configured for this environment yet.${code ? ` (${code})` : ""}`;
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
      if (code && typeof message === "string" && message.length > 0) {
        return `${message} (${code})`;
      }
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
    const normalized = normalizeErrorPayload(fnData ?? (error as any)?.context?.body ?? null);
    const friendly = friendlyMessage(
      normalized,
      "AI bridge request failed.",
    );

    console.error("[aiBridge] v1-ai-bridge transport error", {
      errorCode: (normalized as any)?.errorCode,
      message: friendly,
    });

    throw new Error(friendly);
  }

  // Handle application-level errors (ok: false)
  const parsed = AiBridgeResultSchema.safeParse(fnData);
  if (!parsed.success) {
    console.error("[aiBridge] bad response from v1-ai-bridge", parsed.error, fnData);
    throw new Error("AI bridge request failed.");
  }

  if (!parsed.data.ok) {
    const body = parsed.data as Extract<AiBridgeResult, { ok: false }>;
    const friendly = friendlyMessage(body, "AI bridge request failed.");

    console.error("[aiBridge] v1-ai-bridge returned error", {
      errorCode: (body as any)?.errorCode,
      message: friendly,
    });

    throw new Error(friendly);
  }

  return parsed.data as AiBridgeSuccess;
}
