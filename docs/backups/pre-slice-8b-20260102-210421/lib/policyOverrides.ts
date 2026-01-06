"use client";

import type {
  PolicyOverrideApproveInput,
  PolicyOverrideRequestInput,
} from "@hps-internal/contracts";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { buildOverrideOrFilter } from "./policyOverrides.helpers";
export { buildOverrideOrFilter } from "./policyOverrides.helpers";

export type PolicyOverride = {
  id: string;
  orgId: string;
  dealId: string | null;
  runId: string | null;
  posture: string;
  tokenKey: string;
  oldValue: unknown;
  newValue: unknown;
  justification: string | null;
  status: string;
  requestedBy: string | null;
  requestedAt: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
};

function mapRow(row: any): PolicyOverride {
  return {
    id: row.id,
    orgId: row.org_id,
    dealId: row.deal_id ?? null,
    runId: row.run_id ?? null,
    posture: row.posture,
    tokenKey: row.token_key,
    oldValue: row.old_value ?? null,
    newValue: row.new_value,
    justification: row.justification ?? null,
    status: row.status,
    requestedBy: row.requested_by ?? null,
    requestedAt: row.requested_at ?? null,
    approvedBy: row.approved_by ?? null,
    approvedAt: row.approved_at ?? null,
  };
}

async function getToken(): Promise<string> {
  const supabase = getSupabaseClient();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("No Supabase session; please sign in.");
  return token;
}

export async function requestPolicyOverride(
  input: PolicyOverrideRequestInput & { dealId?: string; oldValue?: unknown },
): Promise<PolicyOverride> {
  const supabase = getSupabaseClient();
  const token = await getToken();

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/v1-policy-override-request`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    },
  );

  if (!res.ok) {
    let message: string | null = null;
    try {
      const body = await res.clone().json();
      if (body && typeof body === "object") {
        const maybe = (body as any).message ?? (body as any).error;
        if (typeof maybe === "string") {
          message = maybe;
        }
      }
    } catch {
      // ignore JSON parse issues
    }

    if (!message) {
      const text = await res.text().catch(() => "");
      if (text) message = text;
    }

    throw new Error(
      message ?? `Failed to request override (status ${res.status})`,
    );
  }

  const json = await res.json();
  if (!json?.ok) throw new Error(json?.error ?? "Failed to request override");

  // Fetch full row for visibility
  const { data, error } = await supabase
    .from("policy_overrides")
    .select("*")
    .eq("id", json.overrideId)
    .maybeSingle();
  if (error || !data) {
    throw new Error(error?.message ?? "Override created but could not be loaded");
  }
  return mapRow(data);
}

export async function approvePolicyOverride(
  input: PolicyOverrideApproveInput,
): Promise<PolicyOverride> {
  const supabase = getSupabaseClient();
  const token = await getToken();

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/v1-policy-override-approve`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        overrideId: input.overrideId,
        action: input.decision === "approved" ? "approve" : "reject",
      }),
    },
  );

  if (!res.ok) {
    let message: string | null = null;
    try {
      const body = await res.clone().json();
      if (body && typeof body === "object") {
        const maybe = (body as any).message ?? (body as any).error;
        if (typeof maybe === "string") {
          message = maybe;
        }
      }
    } catch {
      // ignore JSON parse issues
    }

    if (!message) {
      const text = await res.text().catch(() => "");
      if (text) message = text;
    }

    throw new Error(
      message ?? `Failed to update override (status ${res.status})`,
    );
  }

  const json = await res.json();
  if (!json?.ok) throw new Error(json?.error ?? "Failed to update override");

  const { data, error } = await supabase
    .from("policy_overrides")
    .select("*")
    .eq("id", input.overrideId)
    .maybeSingle();
  if (error || !data) {
    throw new Error(error?.message ?? "Override updated but could not be loaded");
  }
  return mapRow(data);
}

export async function listPolicyOverridesForDealOrRun(args: {
  dealId?: string;
  orgId?: string;
  runId?: string | null;
  posture?: string | null;
  approvedOnly?: boolean;
  includeDealIdNullForPosture?: boolean;
}): Promise<PolicyOverride[]> {
  const supabase = getSupabaseClient();
  if (!args.dealId && !args.orgId) {
    return [];
  }

  let query = supabase
    .from("policy_overrides")
    .select(
      "id, org_id, deal_id, run_id, posture, token_key, old_value, new_value, justification, status, requested_by, requested_at, approved_by, approved_at",
    )
    .order("requested_at", { ascending: false });

  if (args.orgId) {
    query = query.eq("org_id", args.orgId);
  }
  if (args.posture) {
    query = query.eq("posture", args.posture);
  }
  if (args.approvedOnly) {
    query = query.eq("status", "approved");
  }

  const orFilter = buildOverrideOrFilter({
    runId: args.runId,
    dealId: args.dealId,
    includeDealIdNullForPosture: args.includeDealIdNullForPosture,
    posture: args.posture,
  });

  if (orFilter) {
    query = query.or(orFilter);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapRow);
}
