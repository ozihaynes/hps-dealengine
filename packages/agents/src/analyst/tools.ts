import { buildAnalystRunContextFromRow } from "./runContext";
import type { AnalystRunContext, AnalystRunFetchInput } from "./types";
import { createSupabaseRlsClient } from "../supabase/supabaseRlsClient";

const RunRowSelect = `
  id,
  org_id,
  deal_id,
  input,
  output,
  trace,
  policy_snapshot,
  created_at
`;

export async function loadAnalystRunContext(
  params: AnalystRunFetchInput & { accessToken: string },
): Promise<AnalystRunContext | null> {
  const { orgId, userId, dealId, runId, accessToken } = params;
  const supabase = createSupabaseRlsClient(accessToken);

  const { data: deal, error: dealError } = await supabase
    .from("deals")
    .select("id, org_id, updated_at")
    .eq("id", dealId)
    .maybeSingle();

  if (dealError) throw dealError;
  if (!deal) return null;

  let runQuery = supabase.from("runs").select(RunRowSelect).eq("deal_id", dealId).eq("org_id", deal.org_id);
  if (runId) {
    runQuery = runQuery.eq("id", runId);
  } else {
    runQuery = runQuery.order("created_at", { ascending: false }).limit(1);
  }

  const { data: runRows, error: runError } = await runQuery;
  if (runError) throw runError;
  const run = Array.isArray(runRows) ? runRows[0] : null;
  if (!run) return null;

  const dealUpdatedAt = deal.updated_at ? new Date(deal.updated_at).getTime() : null;
  const runCreatedAt = run.created_at ? new Date(run.created_at).getTime() : null;
  const isStale = Boolean(
    params.allowStale !== true &&
      dealUpdatedAt !== null &&
      runCreatedAt !== null &&
      dealUpdatedAt > runCreatedAt,
  );

  return buildAnalystRunContextFromRow(run as any, { orgId, userId, isStale });
}

/**
 * MCP/Agents SDK-ready wrapper so the tool can be exposed directly if desired.
 */
// Placeholder for future direct tool wiring in Agents SDK.
export const loadAnalystRunContextTool = {
  name: "hps.loadAnalystRunContext",
  description: "Load the latest deterministic underwriting run for a deal (RLS enforced).",
};
