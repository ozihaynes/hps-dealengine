// apps/hps-dealengine/lib/edge.ts
// Typed client helpers for calling Edge Functions from the Next.js app.

"use client";

import type {
  AnalyzeInput,
  AnalyzeResult,
  PolicyOverrideRequestInput,
  PolicyOverrideRequestResult,
  PolicyOverrideApproveInput,
  PolicyOverrideApproveResult,
} from "@hps-internal/contracts";
import { getSupabase } from "./supabaseClient";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

// Local types for Runs until @hps-internal/contracts is updated
export interface SaveRunInput {
  orgId: string;
  dealId: string;
  deal: any; // Ideally DealContract
  sandbox: any;
  posture: "conservative" | "base" | "aggressive";
  outputs: unknown;
  trace: Array<{ key: string; label: string; details?: unknown }>;
  meta?: {
    engineVersion?: string;
    policyVersion?: string | null;
    source?: string;
    durationMs?: number;
  };
  policySnapshot?: unknown;
}

export interface SaveRunResult {
  ok: boolean;
  run?: {
    id: string;
    org_id: string;
    posture: string;
    input_hash?: string | null;
    output_hash?: string | null;
    policy_hash?: string | null;
    created_at?: string;
  };
  deduped?: boolean;
}

export interface ReplayRunResult {
  match: boolean;
  original_hash: string;
  replay_hash: string;
  diff: { message: string } | null;
}

export interface AiStrategistRequest {
  mode: "strategist";
  prompt: string;
  run?: { output?: unknown; trace?: unknown };
  policy?: unknown;
  evidence?: Array<{ kind?: string; id?: string; label?: string; uri?: string }>;
}

export interface AiStrategistResponse {
  ok: boolean;
  text?: string;
  mode?: string;
  guardrails?: string[];
  error?: string;
}

/* -------------------------------------------------------------------------- */
/* Core Functions - Analyze                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Low-level wrapper for the v1-analyze Edge Function.
 * Uses the caller-scoped Supabase client (anon key + RLS).
 */
async function invokeAnalyze(input: AnalyzeInput): Promise<AnalyzeResult> {
  const supabase = getSupabase();

  const { data, error } = await supabase.functions.invoke("v1-analyze", {
    body: input,
  });

  if (error) {
    console.error("[edge] v1-analyze failed", error);
    throw error;
  }

  if (!data) {
    throw new Error("v1-analyze returned no data");
  }

  // Function returns { ok, result }
  if ((data as any).ok && (data as any).result) {
    return (data as any).result as AnalyzeResult;
  }

  return data as AnalyzeResult;
}

/**
 * Primary client-side entry point for underwriting analysis.
 */
export async function analyze(input: AnalyzeInput): Promise<AnalyzeResult> {
  return invokeAnalyze(input);
}

/* -------------------------------------------------------------------------- */
/* Runs & Replay                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Persists a run to the database (public.runs) with full audit hashes.
 */
export async function saveRun(input: SaveRunInput): Promise<SaveRunResult> {
  const supabase = getSupabase();

  // Note: function name must match deployment (v1-runs-save)
  const { data, error } = await supabase.functions.invoke("v1-runs-save", {
    body: input,
  });

  if (error) {
    console.error("[edge] v1-runs-save failed", error);
    throw error;
  }

  return data as SaveRunResult;
}

/**
 * Re-executes a historical run to verify determinism.
 */
export async function replayRun(runId: string): Promise<ReplayRunResult> {
  const supabase = getSupabase();

  const { data, error } = await supabase.functions.invoke("v1-runs-replay", {
    body: { runId },
  });

  if (error) {
    console.error("[edge] v1-runs-replay failed", error);
    throw error;
  }

  return data as ReplayRunResult;
}

/* -------------------------------------------------------------------------- */
/* Policy Overrides                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Request a policy override (creates a pending row in public.policy_overrides).
 * RLS + org_id resolution are handled in the Edge Function using the caller JWT.
 */
export async function requestPolicyOverride(
  input: PolicyOverrideRequestInput,
): Promise<PolicyOverrideRequestResult> {
  const supabase = getSupabase();

  const { data, error } = await supabase.functions.invoke(
    "v1-policy-override-request",
    {
      body: input,
    },
  );

  if (error) {
    console.error("[edge] v1-policy-override-request failed", error);
    throw error;
  }

  return data as PolicyOverrideRequestResult;
}

/**
 * Approve or reject an existing override.
 * The Edge Function checks membership/org/role before updating the row.
 */
export async function approvePolicyOverride(
  input: PolicyOverrideApproveInput,
): Promise<PolicyOverrideApproveResult> {
  const supabase = getSupabase();

  const { data, error } = await supabase.functions.invoke(
    "v1-policy-override-approve",
    {
      body: input,
    },
  );

  if (error) {
    console.error("[edge] v1-policy-override-approve failed", error);
    throw error;
  }

  return data as PolicyOverrideApproveResult;
}

/* -------------------------------------------------------------------------- */
/* AI Strategist                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Calls v1-ai-bridge with caller JWT. Advisory-only; does not change numbers.
 */
export async function callAiStrategist(
  input: AiStrategistRequest,
): Promise<AiStrategistResponse> {
  const supabase = getSupabase();
  const { data, error } = await supabase.functions.invoke("v1-ai-bridge", {
    body: input,
  });
  if (error) {
    console.error("[edge] v1-ai-bridge failed", error);
    throw error;
  }
  return data as AiStrategistResponse;
}

// Re-export types so UI code can import them from "lib/edge" if desired.
export type {
  AnalyzeInput,
  AnalyzeResult,
  PolicyOverrideRequestInput,
  PolicyOverrideRequestResult,
  PolicyOverrideApproveInput,
  PolicyOverrideApproveResult,
} from "@hps-internal/contracts";
