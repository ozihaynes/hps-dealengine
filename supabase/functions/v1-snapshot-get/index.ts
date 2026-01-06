/**
 * v1-snapshot-get
 *
 * Retrieves the latest dashboard snapshot for a deal.
 *
 * GET /functions/v1/v1-snapshot-get?deal_id=UUID&include_trace=boolean
 *
 * Response: { ok: true, snapshot: DashboardSnapshot | null, is_stale: boolean, ... }
 *
 * Authentication: JWT required
 * RLS: Caller must have access to the deal via org membership
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

// ============================================================================
// CORS & RESPONSE HELPERS
// ============================================================================

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errorResponse(code: string, message: string, status = 400): Response {
  return jsonResponse({ ok: false, error: { code, message } }, status);
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Validate method
    if (req.method !== "GET") {
      return errorResponse("METHOD_NOT_ALLOWED", "Only GET requests accepted", 405);
    }

    // Get authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return errorResponse("UNAUTHORIZED", "Missing or invalid authorization", 401);
    }
    const token = authHeader.replace("Bearer ", "");

    // Parse query parameters
    const url = new URL(req.url);
    const dealId = url.searchParams.get("deal_id");
    const includeTrace = url.searchParams.get("include_trace") === "true";

    // Validate deal_id
    if (!dealId) {
      return errorResponse("INVALID_PAYLOAD", "deal_id query parameter is required");
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(dealId)) {
      return errorResponse("INVALID_PAYLOAD", "deal_id must be a valid UUID");
    }

    // Create Supabase client with user's JWT (RLS enforced)
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    // Verify deal access (RLS will enforce org membership)
    const { data: deal, error: dealError } = await supabase
      .from("deals")
      .select("id, org_id")
      .eq("id", dealId)
      .single();

    if (dealError || !deal) {
      console.error("Deal access error:", dealError);
      return errorResponse("DEAL_NOT_FOUND", "Deal not found or access denied", 404);
    }

    // Get the latest run for this deal (to check staleness)
    const { data: latestRuns, error: runError } = await supabase
      .from("runs")
      .select("id, created_at")
      .eq("deal_id", dealId)
      .order("created_at", { ascending: false })
      .limit(1);

    if (runError) {
      console.error("Run query error:", runError);
    }

    const latestRunId = latestRuns?.[0]?.id ?? null;

    // Build snapshot query
    const snapshotQuery = supabase
      .from("dashboard_snapshots")
      .select(includeTrace
        ? "*"
        : "id, org_id, deal_id, run_id, closeability_index, urgency_score, risk_adjusted_spread, buyer_demand_index, evidence_grade, payoff_buffer_pct, gate_health_score, verdict, verdict_reasons, urgency_band, market_temp_band, buyer_demand_band, payoff_buffer_band, gate_health_band, active_signals, signals_critical_count, signals_warning_count, signals_info_count, as_of, created_at, updated_at"
      )
      .eq("deal_id", dealId)
      .order("as_of", { ascending: false })
      .limit(1);

    const { data: snapshots, error: snapshotError } = await snapshotQuery;

    if (snapshotError) {
      console.error("Snapshot query error:", snapshotError);
      return errorResponse("DATABASE_ERROR", "Failed to retrieve snapshot", 500);
    }

    const snapshot = snapshots?.[0] ?? null;

    // Determine staleness
    // Stale if: snapshot exists AND latest run exists AND they don't match
    const snapshotRunId = snapshot?.run_id ?? null;
    const isStale = snapshot !== null && latestRunId !== null && snapshotRunId !== latestRunId;

    // Build response
    const response: Record<string, unknown> = {
      ok: true,
      snapshot: snapshot,
      as_of: snapshot?.as_of ?? null,
      is_stale: isStale,
      latest_run_id: latestRunId,
      snapshot_run_id: snapshotRunId,
    };

    // Add staleness details if stale
    if (isStale) {
      response.staleness_reason = "A newer analysis run exists. Regenerate snapshot for latest data.";
    }

    // Optionally strip computation_trace if not requested
    if (!includeTrace && snapshot?.computation_trace) {
      delete (snapshot as Record<string, unknown>).computation_trace;
    }

    return jsonResponse(response);

  } catch (error) {
    console.error("Unexpected error:", error);
    return errorResponse("INTERNAL_ERROR", "An unexpected error occurred", 500);
  }
});
