// apps/hps-dealengine/lib/workingState.ts
// Helper utilities for persisting and restoring per-user deal working state.

"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  type RunInputEnvelope,
  hashJson,
} from "@hps-internal/contracts";

import type { Deal, SandboxConfig } from "../types";
import type { RepairRates } from "@hps-internal/contracts";

export type WorkingStatePayload = {
  deal?: Deal;
  sandbox?: SandboxConfig;
  repairProfile?: RepairRates | null;
  activeRepairProfileId?: string | null;
  activeOfferRunId?: string | null;
};

export type WorkingStateRow = {
  id: string;
  org_id: string;
  user_id: string;
  deal_id: string;
  posture: string;
  payload: WorkingStatePayload;
  source_run_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type RunWithInput = {
  id: string;
  org_id: string;
  deal_id?: string | null;
  posture: string;
  created_at?: string | null;
  input?: RunInputEnvelope | null;
  input_hash?: string | null;
  output?: unknown;
};

export function buildWorkingInputEnvelope(params: {
  dealId: string;
  posture: string;
  payload: WorkingStatePayload;
}): RunInputEnvelope {
  return {
    dealId: params.dealId,
    posture: params.posture,
    deal: params.payload?.deal ?? {},
    sandbox: params.payload?.sandbox ?? {},
    repairProfile:
      typeof params.payload?.repairProfile !== "undefined"
        ? params.payload?.repairProfile
        : null,
    meta: {},
  };
}

export function hashWorkingState(params: {
  dealId: string;
  posture: string;
  payload: WorkingStatePayload;
}): string {
  return hashJson(buildWorkingInputEnvelope(params));
}

export async function fetchWorkingState(
  supabase: SupabaseClient,
  params: { orgId: string; dealId: string; userId: string },
): Promise<WorkingStateRow | null> {
  const { data, error } = await supabase
    .from("deal_working_states")
    .select(
      "id, org_id, user_id, deal_id, posture, payload, source_run_id, created_at, updated_at",
    )
    .eq("org_id", params.orgId)
    .eq("deal_id", params.dealId)
    .eq("user_id", params.userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as WorkingStateRow) ?? null;
}

export async function upsertWorkingState(
  supabase: SupabaseClient,
  params: {
    orgId: string;
    dealId: string;
    userId: string;
    posture: string;
    payload: WorkingStatePayload;
    sourceRunId?: string | null;
  },
): Promise<WorkingStateRow> {
  const { data, error } = await supabase
    .from("deal_working_states")
    .upsert(
      {
        org_id: params.orgId,
        deal_id: params.dealId,
        user_id: params.userId,
        posture: params.posture,
        payload: params.payload ?? {},
        source_run_id: params.sourceRunId ?? null,
      },
      { onConflict: "org_id,user_id,deal_id" },
    )
    .select(
      "id, org_id, user_id, deal_id, posture, payload, source_run_id, created_at, updated_at",
    )
    .maybeSingle();

  if (error || !data) {
    throw error ?? new Error("Failed to upsert working state");
  }

  return data as WorkingStateRow;
}

export async function fetchLatestRunForDeal(
  supabase: SupabaseClient,
  params: { orgId: string; dealId: string },
): Promise<RunWithInput | null> {
  const { data, error } = await supabase
    .from("runs")
    .select(
      "id, org_id, deal_id, posture, created_at, input, input_hash, output",
    )
    .eq("org_id", params.orgId)
    .or(`deal_id.eq.${params.dealId},input->>dealId.eq.${params.dealId}`)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as RunWithInput) ?? null;
}
