import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import { createSupabaseClient } from "../_shared/valuation.ts";
import { DealContractUpsertInputSchema } from "@hps-internal/contracts";

type DealContractRow = {
  id: string;
};

serve(async (req: Request): Promise<Response> => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  if (req.method !== "POST") {
    return jsonResponse(
      req,
      { ok: false, error: "method_not_allowed", message: "Use POST" },
      405,
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonResponse(
      req,
      { ok: false, error: "invalid_json", message: "Body must be valid JSON" },
      400,
    );
  }

  const parsed = DealContractUpsertInputSchema.safeParse(body);
  if (!parsed.success) {
    return jsonResponse(
      req,
      { ok: false, error: "invalid_request", message: parsed.error.message },
      400,
    );
  }

  let supabase;
  try {
    supabase = createSupabaseClient(req);
  } catch (err: any) {
    return jsonResponse(
      req,
      { ok: false, error: "config_error", message: err?.message ?? "Supabase config missing" },
      500,
    );
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user?.id) {
    return jsonResponse(
      req,
      { ok: false, error: "unauthorized", message: "Valid JWT required" },
      401,
    );
  }

  const userId = userData.user.id;
  const payload = parsed.data;

  try {
    const { data: memberships, error: membershipError } = await supabase
      .from("memberships")
      .select("org_id")
      .eq("user_id", userId);

    if (membershipError) {
      console.error("[v1-deal-contract-upsert] memberships lookup failed", membershipError);
      return jsonResponse(
        req,
        { ok: false, error: "membership_lookup_failed", message: "Failed to resolve memberships" },
        500,
      );
    }

    const memberOrgIds = (memberships ?? [])
      .map((row: any) => row.org_id as string | null)
      .filter((id: string | null): id is string => !!id);

    if (memberOrgIds.length === 0) {
      return jsonResponse(
        req,
        { ok: false, error: "no_memberships", message: "No memberships found for user" },
        403,
      );
    }

    const { data: deal, error: dealError } = await supabase
      .from("deals")
      .select("id, org_id")
      .eq("id", payload.deal_id)
      .maybeSingle();

    if (dealError) {
      console.error("[v1-deal-contract-upsert] deal lookup failed", dealError);
      return jsonResponse(
        req,
        { ok: false, error: "deal_lookup_failed", message: "Failed to load deal" },
        500,
      );
    }

    if (!deal) {
      return jsonResponse(
        req,
        { ok: false, error: "deal_not_found", message: "Deal not found" },
        404,
      );
    }

    if (!memberOrgIds.includes(deal.org_id)) {
      return jsonResponse(
        req,
        { ok: false, error: "forbidden", message: "Deal does not belong to your org" },
        403,
      );
    }

    const { data: existing, error: existingError } = await supabase
      .from("deal_contracts")
      .select("id")
      .eq("org_id", deal.org_id)
      .eq("deal_id", payload.deal_id)
      .maybeSingle();

    if (existingError) {
      console.error("[v1-deal-contract-upsert] deal_contracts lookup failed", existingError);
      return jsonResponse(
        req,
        {
          ok: false,
          error: "deal_contract_lookup_failed",
          message: "Failed to check existing contract status",
        },
        500,
      );
    }

    const contractPayload = {
      status: payload.status,
      executed_contract_price: payload.executed_contract_price ?? null,
      executed_contract_date: payload.executed_contract_date ?? null,
      notes: payload.notes ?? null,
    };

    let row: DealContractRow | null = null;

    if (existing?.id) {
      const { data: updated, error: updateError } = await supabase
        .from("deal_contracts")
        .update(contractPayload)
        .eq("id", existing.id)
        .select("id")
        .maybeSingle();

      if (updateError) {
        console.error("[v1-deal-contract-upsert] update failed", updateError);
        return jsonResponse(
          req,
          { ok: false, error: "deal_contract_update_failed", message: updateError.message },
          500,
        );
      }

      row = updated ?? null;
    } else {
      const { data: inserted, error: insertError } = await supabase
        .from("deal_contracts")
        .insert({
          org_id: deal.org_id,
          deal_id: payload.deal_id,
          ...contractPayload,
          created_by: userId,
        })
        .select("id")
        .maybeSingle();

      if (insertError) {
        console.error("[v1-deal-contract-upsert] insert failed", insertError);
        return jsonResponse(
          req,
          { ok: false, error: "deal_contract_insert_failed", message: insertError.message },
          500,
        );
      }

      row = inserted ?? null;
    }

    if (!row?.id) {
      return jsonResponse(
        req,
        { ok: false, error: "deal_contract_missing", message: "Deal contract not saved" },
        500,
      );
    }

    return jsonResponse(req, { deal_contract_id: row.id }, 200);
  } catch (err: any) {
    console.error("[v1-deal-contract-upsert] error", err);
    return jsonResponse(
      req,
      {
        ok: false,
        error: "deal_contract_upsert_failed",
        message: err?.message ?? "Failed to save contract status",
      },
      500,
    );
  }
});
