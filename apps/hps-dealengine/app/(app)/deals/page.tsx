"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

import { getSupabaseClient } from "@/lib/supabaseClient";
import { useDealSession, type DbDeal } from "@/lib/dealSessionContext";

type DealsStatus =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; orgId: string; deals: DbDeal[] };

export default function DealsPage() {
  const router = useRouter();
  const { setDbDeal, setDeal } = useDealSession();

  const [status, setStatus] = useState<DealsStatus>({ kind: "loading" });
  const [creating, setCreating] = useState(false);

  const loadDeals = useCallback(async () => {
    const supabase = getSupabaseClient();

    setStatus({ kind: "loading" });

    // 1) Resolve caller org via RPC
    const { data: orgId, error: orgError } = await supabase.rpc("get_caller_org");

    if (orgError) {
      console.error("[/deals] get_caller_org error", orgError);
      setStatus({
        kind: "error",
        message: "Unable to resolve your organization. Please check memberships.",
      });
      return;
    }

    if (!orgId) {
      setStatus({
        kind: "error",
        message: "No organization found for your user.",
      });
      return;
    }

    // 2) Fetch deals for this org
    const { data, error } = await supabase
      .from("deals")
      .select(
        "id, org_id, created_by, created_at, updated_at, address, city, state, zip, payload"
      )
      .eq("org_id", orgId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[/deals] select deals error", error);
      setStatus({
        kind: "error",
        message: "Unable to load deals for your org.",
      });
      return;
    }

    setStatus({
      kind: "ready",
      orgId,
      deals: (data ?? []) as DbDeal[],
    });
  }, []);

  useEffect(() => {
    void loadDeals();
  }, [loadDeals]);

  const handleCreateDeal = useCallback(async () => {
    if (status.kind !== "ready") return;

    setCreating(true);
    const supabase = getSupabaseClient();

    const label = `Untitled deal ${new Date().toLocaleDateString()}`;

    const { data, error } = await supabase
      .from("deals")
      .insert({
        org_id: status.orgId,
        address: label,
      })
      .select(
        "id, org_id, created_by, created_at, updated_at, address, city, state, zip, payload"
      )
      .single();

    if (error) {
      console.error("[/deals] create deal error", error);
      setCreating(false);
      // Keep the page usable even if create fails.
      return;
    }

    const inserted = data as DbDeal;

    setStatus((prev) => {
      if (prev.kind !== "ready") return prev;
      return {
        ...prev,
        deals: [inserted, ...prev.deals],
      };
    });

    setDbDeal(inserted);
    setCreating(false);

    // For now, send the user into Overview for the selected deal.
    router.push("/overview");
  }, [router, setDbDeal, status]);

  const handleSelectDeal = useCallback(
    (deal: DbDeal) => {
      setDbDeal(deal);
      if (deal.payload) {
        try {
          setDeal(deal.payload as any);
        } catch {
          // ignore malformed payload; user can re-run analyze
        }
      }
      router.push("/overview");
    },
    [router, setDbDeal, setDeal]
  );

  if (status.kind === "loading") {
    return (
      <main className="p-6">
        <h1 className="text-xl font-semibold mb-4">Deals</h1>
        <div className="text-sm text-gray-500">Loading deals…</div>
      </main>
    );
  }

  if (status.kind === "error") {
    return (
      <main className="p-6">
        <h1 className="text-xl font-semibold mb-4">Deals</h1>
        <div className="rounded-md border border-red-500/40 bg-red-500/5 p-4 text-sm text-red-600">
          {status.message}
        </div>
        <button
          type="button"
          className="mt-4 inline-flex items-center rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
          onClick={() => void loadDeals()}
        >
          Retry
        </button>
      </main>
    );
  }

  // Ready state
  return (
    <main className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Deals</h1>
        <button
          type="button"
          className="inline-flex items-center rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-blue-500 disabled:bg-blue-400 disabled:cursor-not-allowed"
          onClick={() => void handleCreateDeal()}
          disabled={creating}
        >
          {creating ? "Creating…" : "New Deal"}
        </button>
      </div>

      {status.deals.length === 0 ? (
        <div className="rounded-md border border-dashed border-gray-400/50 bg-gray-900/40 p-6 text-sm text-gray-300">
          <p className="font-medium mb-1">No deals yet.</p>
          <p className="text-xs text-gray-400">
            Click <span className="font-semibold">New Deal</span> to create your first deal for this
            organization.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-md border border-gray-800 bg-gray-950/40">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-900/60 text-gray-300 text-xs uppercase tracking-wide">
              <tr>
                <th className="px-4 py-2 text-left">Address</th>
                <th className="px-4 py-2 text-left hidden sm:table-cell">
                  City / State
                </th>
                <th className="px-4 py-2 text-left hidden md:table-cell">
                  Created
                </th>
              </tr>
            </thead>
            <tbody>
              {status.deals.map((deal) => (
                <tr
                  key={deal.id}
                  className="cursor-pointer border-t border-gray-800 hover:bg-gray-900/40"
                  onClick={() => handleSelectDeal(deal)}
                >
                  <td className="px-4 py-2 align-middle">
                    <div className="font-medium text-gray-100">
                      {deal.address ?? "Untitled deal"}
                    </div>
                    <div className="text-xs text-gray-500 md:hidden">
                      {[deal.city, deal.state, deal.zip].filter(Boolean).join(", ")}
                    </div>
                  </td>
                  <td className="px-4 py-2 align-middle hidden sm:table-cell text-gray-300">
                    {[deal.city, deal.state, deal.zip].filter(Boolean).join(", ")}
                  </td>
                  <td className="px-4 py-2 align-middle hidden md:table-cell text-xs text-gray-400">
                    {new Date(deal.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
