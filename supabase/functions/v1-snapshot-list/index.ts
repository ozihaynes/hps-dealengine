/**
 * v1-snapshot-list
 *
 * Retrieves a paginated list of dashboard snapshots for the portfolio.
 * Supports filtering, sorting, and returns aggregates.
 *
 * GET /functions/v1/v1-snapshot-list?verdict=GO&urgency_band=critical&limit=50&offset=0&sort_by=urgency_score&sort_order=desc
 *
 * Response: { ok: true, snapshots: [], total: number, has_more: boolean, aggregates: {} }
 *
 * Authentication: JWT required
 * RLS: Returns only snapshots for deals the caller can access via org membership
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
// VALIDATION CONSTANTS
// ============================================================================

const VALID_VERDICTS = ["GO", "PROCEED_WITH_CAUTION", "HOLD", "PASS"] as const;
const VALID_URGENCY_BANDS = ["emergency", "critical", "active", "steady"] as const;
const VALID_SORT_FIELDS = ["urgency_score", "closeability_index", "risk_adjusted_spread", "as_of"] as const;
const VALID_SORT_ORDERS = ["asc", "desc"] as const;

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 50;

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

    // Filter parameters
    const verdictParam = url.searchParams.get("verdict");
    const urgencyBandParam = url.searchParams.get("urgency_band");

    // Pagination parameters
    const limitParam = url.searchParams.get("limit");
    const offsetParam = url.searchParams.get("offset");

    // Sort parameters
    const sortByParam = url.searchParams.get("sort_by") ?? "urgency_score";
    const sortOrderParam = url.searchParams.get("sort_order") ?? "desc";

    // Validate verdict filter
    if (verdictParam && !VALID_VERDICTS.includes(verdictParam as typeof VALID_VERDICTS[number])) {
      return errorResponse("INVALID_PAYLOAD", `Invalid verdict. Must be one of: ${VALID_VERDICTS.join(", ")}`);
    }

    // Validate urgency_band filter
    if (urgencyBandParam && !VALID_URGENCY_BANDS.includes(urgencyBandParam as typeof VALID_URGENCY_BANDS[number])) {
      return errorResponse("INVALID_PAYLOAD", `Invalid urgency_band. Must be one of: ${VALID_URGENCY_BANDS.join(", ")}`);
    }

    // Validate and parse pagination
    let limit = DEFAULT_LIMIT;
    if (limitParam) {
      const parsed = parseInt(limitParam, 10);
      if (isNaN(parsed) || parsed < 1 || parsed > MAX_LIMIT) {
        return errorResponse("INVALID_PAYLOAD", `Invalid limit. Must be between 1 and ${MAX_LIMIT}`);
      }
      limit = parsed;
    }

    let offset = 0;
    if (offsetParam) {
      const parsed = parseInt(offsetParam, 10);
      if (isNaN(parsed) || parsed < 0) {
        return errorResponse("INVALID_PAYLOAD", "Invalid offset. Must be a non-negative integer");
      }
      offset = parsed;
    }

    // Validate sort parameters
    if (!VALID_SORT_FIELDS.includes(sortByParam as typeof VALID_SORT_FIELDS[number])) {
      return errorResponse("INVALID_PAYLOAD", `Invalid sort_by. Must be one of: ${VALID_SORT_FIELDS.join(", ")}`);
    }

    if (!VALID_SORT_ORDERS.includes(sortOrderParam as typeof VALID_SORT_ORDERS[number])) {
      return errorResponse("INVALID_PAYLOAD", `Invalid sort_order. Must be one of: ${VALID_SORT_ORDERS.join(", ")}`);
    }

    // Create Supabase client with user's JWT (RLS enforced)
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    // Build snapshot query for summary list (excludes heavy fields)
    const selectFields = `
      id,
      deal_id,
      run_id,
      closeability_index,
      urgency_score,
      risk_adjusted_spread,
      buyer_demand_index,
      verdict,
      urgency_band,
      signals_critical_count,
      as_of
    `;

    let query = supabase
      .from("dashboard_snapshots")
      .select(selectFields, { count: "exact" });

    // Apply filters
    if (verdictParam) {
      query = query.eq("verdict", verdictParam);
    }
    if (urgencyBandParam) {
      query = query.eq("urgency_band", urgencyBandParam);
    }

    // Apply sorting
    const ascending = sortOrderParam === "asc";
    query = query.order(sortByParam, { ascending });

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    // Execute query
    const { data: snapshots, count, error: queryError } = await query;

    if (queryError) {
      console.error("Snapshot list query error:", queryError);
      return errorResponse("DATABASE_ERROR", "Failed to retrieve snapshots", 500);
    }

    const total = count ?? 0;
    const hasMore = offset + (snapshots?.length ?? 0) < total;

    // Fetch aggregates (separate queries for accuracy)
    // Note: These queries also respect RLS, so aggregates are org-scoped

    // Aggregate by verdict
    const { data: allSnapshots, error: aggError } = await supabase
      .from("dashboard_snapshots")
      .select("verdict, urgency_band, signals_critical_count");

    // Initialize counts
    const byVerdict: Record<string, number> = {};
    for (const v of VALID_VERDICTS) byVerdict[v] = 0;

    const byUrgencyBand: Record<string, number> = {};
    for (const b of VALID_URGENCY_BANDS) byUrgencyBand[b] = 0;

    let criticalSignalsTotal = 0;

    // Calculate aggregates from all snapshots
    if (!aggError && allSnapshots) {
      for (const row of allSnapshots) {
        if (row.verdict && row.verdict in byVerdict) {
          byVerdict[row.verdict]++;
        }
        if (row.urgency_band && row.urgency_band in byUrgencyBand) {
          byUrgencyBand[row.urgency_band]++;
        }
        criticalSignalsTotal += row.signals_critical_count ?? 0;
      }
    } else if (aggError) {
      console.error("Aggregate query error:", aggError);
    }

    // Build response
    const response = {
      ok: true,
      snapshots: snapshots ?? [],
      total,
      has_more: hasMore,
      pagination: {
        limit,
        offset,
        returned: snapshots?.length ?? 0,
      },
      filters: {
        verdict: verdictParam ?? null,
        urgency_band: urgencyBandParam ?? null,
      },
      sort: {
        by: sortByParam,
        order: sortOrderParam,
      },
      aggregates: {
        by_verdict: byVerdict,
        by_urgency_band: byUrgencyBand,
        critical_signals_total: criticalSignalsTotal,
      },
    };

    return jsonResponse(response);

  } catch (error) {
    console.error("Unexpected error:", error);
    return errorResponse("INTERNAL_ERROR", "An unexpected error occurred", 500);
  }
});
