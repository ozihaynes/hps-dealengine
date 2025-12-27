"use client";

import type {
  DealContractUpsertInput,
  DealContractUpsertResult,
} from "@hps-internal/contracts";
import { getSupabaseClient } from "@/lib/supabaseClient";

type DealContractRow = {
  id: string;
  org_id: string;
  deal_id: string;
  status: string;
  executed_contract_price: number | string | null;
  executed_contract_date: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type { DealContractRow };

export async function upsertDealContract(input: {
  dealId: string;
  status: DealContractUpsertInput["status"];
  executedContractPrice?: number | null;
  executedContractDate?: string | null;
  notes?: string | null;
}): Promise<DealContractUpsertResult> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.functions.invoke(
    "v1-deal-contract-upsert",
    {
      body: {
        deal_id: input.dealId,
        status: input.status,
        executed_contract_price: input.executedContractPrice ?? null,
        executed_contract_date: input.executedContractDate ?? null,
        notes: input.notes ?? null,
      },
    },
  );

  if (error) {
    const message = (data as any)?.message ?? (data as any)?.error ?? error.message;
    throw new Error(message ?? "Failed to save contract status.");
  }

  const dealContractId = (data as any)?.deal_contract_id as string | undefined;

  if (!dealContractId) {
    throw new Error("Deal contract save returned an invalid response.");
  }

  return { deal_contract_id: dealContractId };
}

export async function fetchDealContractByDealId(
  dealId: string,
): Promise<DealContractRow | null> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("deal_contracts")
    .select(
      "id, org_id, deal_id, status, executed_contract_price, executed_contract_date, notes, created_by, created_at, updated_at",
    )
    .eq("deal_id", dealId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as DealContractRow) ?? null;
}
