import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import { createSupabaseClient } from "../_shared/valuation.ts";
import { hashJson } from "../_shared/contracts.ts";

type RequestBody = {
  deal_id: string;
  run_id: string;
  template_version?: "v1";
};

const DEFAULT_TEMPLATE_VERSION: RequestBody["template_version"] = "v1";

const pickString = (...values: unknown[]): string | null => {
  for (const value of values) {
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed.length > 0) return trimmed;
    }
  }
  return null;
};

const toNumberOrNull = (value: unknown): number | null => {
  const num = Number(value);
  if (!Number.isFinite(num)) return null;
  return num;
};

const formatAddress = (parts: {
  line1?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
}): string | null => {
  const line1 = pickString(parts.line1);
  const city = pickString(parts.city);
  const state = pickString(parts.state);
  const zip = pickString(parts.zip);

  const cityStateZip = [city, state, zip].filter(Boolean).join(" ");
  const segments = [line1, cityStateZip].filter(Boolean) as string[];
  if (segments.length === 0) return null;
  return segments.join(", ");
};

const extractMarketProvenance = (inputDeal: any) => {
  const market = inputDeal?.market ?? {};
  return {
    arv_source: pickString(market?.arv_source),
    arv_as_of: pickString(market?.arv_as_of),
    arv_valuation_run_id: pickString(market?.arv_valuation_run_id),
    as_is_value_source: pickString(market?.as_is_value_source),
    as_is_value_as_of: pickString(market?.as_is_value_as_of),
    as_is_value_valuation_run_id: pickString(market?.as_is_value_valuation_run_id),
  };
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

  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return jsonResponse(
      req,
      { ok: false, error: "invalid_json", message: "Body must be valid JSON" },
      400,
    );
  }

  if (!body?.deal_id || !body?.run_id) {
    return jsonResponse(
      req,
      {
        ok: false,
        error: "invalid_request",
        message: "deal_id and run_id are required",
      },
      400,
    );
  }

  const templateVersion = body.template_version ?? DEFAULT_TEMPLATE_VERSION;
  if (templateVersion !== "v1") {
    return jsonResponse(
      req,
      {
        ok: false,
        error: "invalid_template_version",
        message: "template_version must be 'v1'",
      },
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

  try {
    const { data: run, error: runError } = await supabase
      .from("runs")
      .select("id, org_id, deal_id, posture, input, output, policy_snapshot, policy_hash")
      .eq("id", body.run_id)
      .eq("deal_id", body.deal_id)
      .maybeSingle();

    if (runError) throw runError;
    if (!run) {
      return jsonResponse(
        req,
        { ok: false, error: "run_not_found", message: "Run not found for this deal" },
        404,
      );
    }

    if (!run.policy_snapshot) {
      return jsonResponse(
        req,
        {
          ok: false,
          error: "policy_snapshot_missing",
          message: "Run policy snapshot is required for offer packages",
        },
        400,
      );
    }

    const { data: deal, error: dealError } = await supabase
      .from("deals")
      .select(
        "id, org_id, address, city, state, zip, client_name, client_phone, client_email, payload",
      )
      .eq("id", body.deal_id)
      .maybeSingle();

    if (dealError) throw dealError;
    if (!deal) {
      return jsonResponse(
        req,
        { ok: false, error: "deal_not_found", message: "Deal not found" },
        404,
      );
    }

    if (deal.org_id !== run.org_id) {
      return jsonResponse(
        req,
        {
          ok: false,
          error: "org_mismatch",
          message: "Deal and run must belong to the same org",
        },
        400,
      );
    }

    const dealPayload = (deal as any).payload ?? {};
    const payloadContact = (dealPayload as any)?.contact ?? (dealPayload as any)?.client ?? {};
    const payloadProperty = (dealPayload as any)?.property ?? {};

    const addressLine1 = pickString(
      deal.address,
      payloadProperty.address,
      (dealPayload as any)?.address,
    );
    const addressCity = pickString(deal.city, payloadProperty.city, (dealPayload as any)?.city);
    const addressState = pickString(deal.state, payloadProperty.state, (dealPayload as any)?.state);
    const addressZip = pickString(deal.zip, payloadProperty.zip, (dealPayload as any)?.zip);

    const addressLine = formatAddress({
      line1: addressLine1,
      city: addressCity,
      state: addressState,
      zip: addressZip,
    });

    const contactName = pickString(payloadContact?.name, deal.client_name);
    const contactPhone = pickString(payloadContact?.phone, deal.client_phone);
    const contactEmail = pickString(payloadContact?.email, deal.client_email);

    const outputEnvelope = (run as any).output ?? {};
    const outputs = outputEnvelope?.outputs ?? null;
    const inputDeal = (run as any).input?.deal ?? {};

    const offerAmount =
      toNumberOrNull(outputs?.primary_offer) ??
      toNumberOrNull(outputs?.instant_cash_offer) ??
      null;

    const keyNumbers = {
      arv: toNumberOrNull(outputs?.arv) ?? toNumberOrNull(inputDeal?.arv),
      aiv: toNumberOrNull(outputs?.aiv) ?? toNumberOrNull(inputDeal?.aiv),
      repairs:
        toNumberOrNull(outputs?.repairs_with_contingency) ??
        toNumberOrNull(outputs?.repairs_total) ??
        toNumberOrNull(outputs?.repairs_base),
      carry_months:
        toNumberOrNull(outputs?.carryMonths) ??
        toNumberOrNull(outputs?.carry_months) ??
        toNumberOrNull(outputs?.timeline_summary?.carry_months),
      carry_total:
        toNumberOrNull(outputs?.timeline_summary?.carry_total_dollars) ??
        toNumberOrNull(outputs?.carry_total_dollars),
    };

    const valuationProvenance = extractMarketProvenance(inputDeal);

    const payload = {
      template_version: templateVersion,
      deal: {
        id: deal.id,
        address: {
          line1: addressLine1,
          city: addressCity,
          state: addressState,
          zip: addressZip,
          full: addressLine,
        },
        client: {
          name: contactName,
          phone: contactPhone,
          email: contactEmail,
        },
      },
      offer: {
        amount: offerAmount,
        currency: "USD",
      },
      key_numbers: keyNumbers,
      valuation_provenance: valuationProvenance,
      policy_snapshot: run.policy_snapshot,
      policy_hash: (run as any).policy_hash ?? null,
      run: {
        id: run.id,
        posture: (run as any).posture ?? null,
      },
    };

    const payloadHash = hashJson(payload);

    const insertRow = {
      org_id: run.org_id,
      deal_id: run.deal_id,
      run_id: run.id,
      template_version: templateVersion,
      policy_snapshot: run.policy_snapshot,
      arv_source: valuationProvenance.arv_source,
      arv_as_of: valuationProvenance.arv_as_of,
      arv_valuation_run_id: valuationProvenance.arv_valuation_run_id,
      as_is_value_source: valuationProvenance.as_is_value_source,
      as_is_value_as_of: valuationProvenance.as_is_value_as_of,
      as_is_value_valuation_run_id: valuationProvenance.as_is_value_valuation_run_id,
      payload,
      payload_hash: payloadHash,
      created_by: userId,
    };

    const { data: inserted, error: insertError } = await supabase
      .from("offer_packages")
      .insert(insertRow)
      .select("id, payload_hash")
      .maybeSingle();

    if (insertError) {
      const isConflict = (insertError as any)?.code === "23505";
      if (!isConflict) {
        console.error("[v1-offer-package-generate] insert error", insertError);
        throw insertError;
      }
    }

    let row = inserted;
    if (!row) {
      const { data: existing, error: existingError } = await supabase
        .from("offer_packages")
        .select("id, payload_hash")
        .eq("org_id", run.org_id)
        .eq("run_id", run.id)
        .eq("template_version", templateVersion)
        .maybeSingle();

      if (existingError) throw existingError;
      row = existing ?? null;
    }

    if (!row) {
      return jsonResponse(
        req,
        { ok: false, error: "offer_package_missing", message: "Offer package not found" },
        500,
      );
    }

    return jsonResponse(
      req,
      { ok: true, offer_package_id: row.id, payload_hash: row.payload_hash },
      200,
    );
  } catch (err: any) {
    console.error("[v1-offer-package-generate] error", err);
    return jsonResponse(
      req,
      {
        ok: false,
        error: "offer_package_generate_error",
        message: err?.message ?? "Failed to generate offer package",
      },
      500,
    );
  }
});
