import type { SupabaseClient } from "@supabase/supabase-js";

export type OrgMembershipRole = "analyst" | "manager" | "owner" | "vp";

/**
 * Fetch the caller's role for the given org. If orgId is omitted, fall back to
 * the first membership row visible via RLS for the caller (useful when no deal
 * is selected yet). Returns null on error or if no membership is found.
 */
export async function getActiveOrgMembershipRole(
  client: SupabaseClient,
  orgId?: string | null,
): Promise<OrgMembershipRole | null> {
  const query = client.from("memberships").select("role, org_id").limit(1);
  const scopedQuery = orgId ? query.eq("org_id", orgId) : query;

  const { data, error } = await scopedQuery.maybeSingle();

  if (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[orgMembership] role fetch failed", error);
    }
    return null;
  }

  const role = (data as any)?.role as OrgMembershipRole | undefined;
  return role ?? null;
}
