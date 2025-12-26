"use client";

import { getSupabaseClient } from "@/lib/supabaseClient";

type OfferPackagePayload = Record<string, unknown>;

type OfferPackageRow = {
  id: string;
  org_id: string;
  deal_id: string;
  run_id: string;
  template_version: string;
  policy_snapshot: unknown;
  arv_source: string | null;
  arv_as_of: string | null;
  arv_valuation_run_id: string | null;
  as_is_value_source: string | null;
  as_is_value_as_of: string | null;
  as_is_value_valuation_run_id: string | null;
  payload: OfferPackagePayload;
  payload_hash: string;
  created_at: string;
  updated_at: string;
};

export type { OfferPackageRow, OfferPackagePayload };

export async function generateOfferPackage(input: {
  dealId: string;
  runId: string;
  templateVersion?: "v1";
}): Promise<{ offerPackageId: string; payloadHash: string }> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.functions.invoke(
    "v1-offer-package-generate",
    {
      body: {
        deal_id: input.dealId,
        run_id: input.runId,
        template_version: input.templateVersion ?? "v1",
      },
    },
  );

  if (error) {
    const message = (data as any)?.message ?? (data as any)?.error ?? error.message;
    throw new Error(message ?? "Failed to generate offer package.");
  }

  const offerPackageId = (data as any)?.offer_package_id as string | undefined;
  const payloadHash = (data as any)?.payload_hash as string | undefined;

  if (!offerPackageId || !payloadHash) {
    throw new Error("Offer package generation returned an invalid response.");
  }

  return { offerPackageId, payloadHash };
}

export async function fetchOfferPackageById(
  id: string,
): Promise<OfferPackageRow | null> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("offer_packages")
    .select(
      "id, org_id, deal_id, run_id, template_version, policy_snapshot, arv_source, arv_as_of, arv_valuation_run_id, as_is_value_source, as_is_value_as_of, as_is_value_valuation_run_id, payload, payload_hash, created_at, updated_at",
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as OfferPackageRow) ?? null;
}
