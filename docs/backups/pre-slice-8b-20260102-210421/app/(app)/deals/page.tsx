"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FileSpreadsheetIcon } from "lucide-react";

import { Button, Modal } from "@/components/ui";
import NewDealForm from "@/components/deals/NewDealForm";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { useDealSession, type DbDeal } from "@/lib/dealSessionContext";
import {
  createDealWithClientInfo,
  createEmptyDealForm,
  fetchDealsForOrg,
  resolveOrgId,
  validateNewDealForm,
} from "@/lib/deals";
import DealsTable from "@/components/deals/DealsTable";
import { invokeValuationRun } from "@/lib/valuation";

type DealsStatus =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; orgId: string; deals: DbDeal[] };

export default function DealsPage() {
  const router = useRouter();
  const { setDbDeal, setDeal } = useDealSession();

  const [status, setStatus] = useState<DealsStatus>({ kind: "loading" });
  const [creating, setCreating] = useState(false);
  const [isNewDealModalOpen, setIsNewDealModalOpen] = useState(false);
  const [newDeal, setNewDeal] = useState(createEmptyDealForm());
  const [createError, setCreateError] = useState<string | null>(null);

  const loadDeals = useCallback(async () => {
    const supabase = getSupabaseClient();

    try {
      setStatus({ kind: "loading" });
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session) {
        throw new Error("Not signed in");
      }
      const orgId = await resolveOrgId(supabase);
      const rows = await fetchDealsForOrg(supabase, orgId);
      setStatus({
        kind: "ready",
        orgId,
        deals: rows,
      });
    } catch (err: any) {
      console.error("[/deals] load deals error", err);
      setStatus({
        kind: "error",
        message:
          err?.message ??
          "Unable to load deals for your org. Please check your memberships and try again.",
      });
    }
  }, []);

  useEffect(() => {
    void loadDeals();
  }, [loadDeals]);

  const handleCreateDeal = useCallback(async () => {
    if (status.kind !== "ready") return;

    const validationError = validateNewDealForm(newDeal);
    if (validationError) {
      setCreateError(validationError);
      return;
    }

    setCreating(true);
    const supabase = getSupabaseClient();

    try {
      const inserted = await createDealWithClientInfo({
        supabase,
        orgId: status.orgId,
        clientName: newDeal.clientName,
        clientPhone: newDeal.clientPhone,
        clientEmail: newDeal.clientEmail,
        propertyStreet: newDeal.propertyStreet,
        propertyCity: newDeal.propertyCity,
        propertyState: newDeal.propertyState,
        propertyPostalCode: newDeal.propertyPostalCode,
      });

      setStatus((prev) => {
        if (prev.kind !== "ready") return prev;
        return {
          ...prev,
          deals: [inserted, ...prev.deals],
        };
      });

      setDbDeal(inserted);
      if (inserted.payload) {
        try {
          setDeal(inserted.payload as any);
        } catch {
          // tolerate malformed payload; user can re-run analyze
        }
      }

      setIsNewDealModalOpen(false);
      setNewDeal(createEmptyDealForm());
      setCreateError(null);

      // For now, send the user into Overview for the selected deal.
      invokeValuationRun(inserted.id, "base").catch((err) =>
        console.warn("[/deals] valuation run failed", err),
      );
      router.push(`/overview?dealId=${inserted.id}`);
    } catch (err: any) {
      console.error("[/deals] create deal error", err);
      setCreateError(err?.message ?? "Unable to create deal. Please try again.");
    } finally {
      setCreating(false);
    }
  }, [newDeal, router, setDbDeal, setDeal, status]);

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
      router.push(`/overview?dealId=${deal.id}`);
    },
    [router, setDbDeal, setDeal]
  );

  const companyName =
    status.kind === "ready" && status.deals.length > 0
      ? status.deals[0].orgName ??
        status.deals[0].org_id?.slice(0, 8)?.concat("…") ??
        "Company"
      : "Company";

  if (status.kind === "loading") {
    return (
      <main className="p-6 lg:p-0">
        <h1 className="text-xl font-semibold mb-4">Deals</h1>
        <div className="text-sm text-gray-500">Loading deals…</div>
      </main>
    );
  }

  if (status.kind === "error") {
    return (
      <main className="p-6 lg:p-0">
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
    <main className="p-6 space-y-4 print-area lg:p-0 lg:space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Deals</h1>
      </div>

      <div className="text-sm text-gray-300 font-semibold">
        {companyName}
      </div>

      <DealsTable
        deals={status.deals}
        loading={false}
        error={null}
        onRowClick={handleSelectDeal}
        actionsSlot={
          <div className="flex items-center gap-2">
            <Link
              href="/import/wizard"
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm
                       bg-slate-700 hover:bg-slate-600
                       border border-slate-600 hover:border-slate-500
                       text-slate-200 font-medium rounded-md transition-colors whitespace-nowrap"
            >
              <FileSpreadsheetIcon className="w-4 h-4 text-blue-400" />
              Bulk Import
            </Link>
            <Button
              variant="primary"
              onClick={() => {
                setCreateError(null);
                setNewDeal(createEmptyDealForm());
                setIsNewDealModalOpen(true);
              }}
              disabled={creating}
              className="px-3 py-1.5 text-sm whitespace-nowrap"
            >
              {creating ? "Creating..." : "New Deal"}
            </Button>
          </div>
        }
        showPrintButton
        emptyCta={
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button variant="primary" onClick={() => setIsNewDealModalOpen(true)}>
              Create new deal
            </Button>
            <Link
              href="/import/wizard"
              className="flex items-center gap-2 px-4 py-2
                       bg-slate-700 hover:bg-slate-600
                       border border-slate-600 hover:border-blue-500/50
                       text-slate-200 hover:text-white font-medium rounded-lg transition-all"
            >
              <FileSpreadsheetIcon className="w-4 h-4 text-blue-400" />
              Bulk Import
            </Link>
            <Button variant="neutral" onClick={() => router.push("/startup")}>
              Go to Startup
            </Button>
          </div>
        }
      />

      <Modal
        isOpen={isNewDealModalOpen}
        onClose={() => {
          setIsNewDealModalOpen(false);
          setCreateError(null);
          setNewDeal(createEmptyDealForm());
        }}
        title="Start New Deal"
      >
        <NewDealForm
          values={newDeal}
          onChange={(next) => {
            setCreateError(null);
            setNewDeal(next);
          }}
          onSubmit={handleCreateDeal}
          submitting={creating}
          error={createError}
          submitLabel="Start Deal"
          onCancel={() => {
            setIsNewDealModalOpen(false);
            setCreateError(null);
            setNewDeal(createEmptyDealForm());
          }}
        />
      </Modal>
    </main>
  );
}
