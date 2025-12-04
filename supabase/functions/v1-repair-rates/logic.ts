export type RepairRateSetRow = {
  id: string;
  name: string;
  org_id: string;
  market_code: string;
  posture: string;
  as_of: string;
  source: string | null;
  version: string;
  is_active: boolean;
  is_default: boolean;
  repair_psf_tiers: Record<string, number> | null;
  repair_big5: Record<string, number> | null;
  line_item_rates: unknown;
};

type QueryResult = {
  data: RepairRateSetRow | null;
  error: any;
  fromProfile: boolean;
};

export async function fetchRepairRateSet(options: {
  supabase: any;
  selectColumns: string;
  orgId: string;
  marketCode: string;
  posture: string;
  profileId?: string | null;
}): Promise<QueryResult> {
  const { supabase, selectColumns, orgId, marketCode, posture, profileId } =
    options;

  if (profileId) {
    const { data, error } = await supabase
      .from("repair_rate_sets")
      .select(selectColumns)
      .eq("id", profileId)
      .eq("org_id", orgId)
      .eq("market_code", marketCode)
      .eq("posture", posture)
      .maybeSingle();

    return { data: data ?? null, error, fromProfile: true };
  }

  const { data, error } = await supabase
    .from("repair_rate_sets")
    .select(selectColumns)
    .eq("org_id", orgId)
    .eq("market_code", marketCode)
    .eq("posture", posture)
    .order("is_active", { ascending: false })
    .order("is_default", { ascending: false })
    .limit(1)
    .maybeSingle();

  return { data: data ?? null, error, fromProfile: false };
}
