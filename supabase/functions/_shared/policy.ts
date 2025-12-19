import type { SupabaseClient } from "./valuation.ts";

export type PolicyRow = {
  id: string;
  org_id: string;
  posture: string;
  policy_json: any;
  is_active?: boolean;
  created_at?: string;
};

export async function fetchActivePolicyForOrg(
  supabase: SupabaseClient,
  orgId: string,
  posture: string,
) {
  const { data, error } = await supabase
    .from("policies")
    .select("id, org_id, posture, policy_json, is_active, created_at")
    .eq("org_id", orgId)
    .eq("posture", posture)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(2);

  if (error) {
    console.error("[policy] fetch error", error);
    throw new Error("policy_fetch_failed");
  }

  if (!data || data.length === 0) {
    throw new Error("policy_not_found");
  }

  if (data.length > 1) {
    throw new Error("policy_multiple_active");
  }

  return data[0] as PolicyRow;
}
