"use client";

/**
 * Deals Page — Card-based Deal Portfolio
 *
 * Features:
 * - Responsive card grid (1-4 columns)
 * - Verdict-based theming per card
 * - URL-synced filtering (verdict, date, status, sort, search)
 * - Pipeline summary with counts
 * - Empty state handling
 *
 * @module app/(app)/deals/page
 * @version 2.0.0 (Slice 19 — Card Layout)
 */

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FileSpreadsheetIcon, PlusIcon } from "lucide-react";

import { Button, Modal, cn } from "@/components/ui";
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
import { invokeValuationRun } from "@/lib/valuation";

// Slice 19 Components
import {
  DealCard,
  DealsList,
  DealsFilter,
  PipelineSummary,
  type DealCardData,
} from "@/components/deals";
import { useDealsFilter } from "@/lib/hooks/useDealsFilter";

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

type DealsStatus =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; orgId: string; deals: DbDeal[] };

// ═══════════════════════════════════════════════════════════════════════════
// DATA TRANSFORMATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Transform DbDeal to DealCardData for card display
 */
function dbDealToCardData(deal: DbDeal): DealCardData {
  // Extract values from payload if available
  const payload = deal.payload as Record<string, unknown> | null;
  const clearance = payload?.net_clearance as Record<string, unknown> | null;
  const geometry = payload?.price_geometry as Record<string, unknown> | null;
  const gates = payload?.risk_gates as Record<string, unknown> | null;
  const gatesSummary = gates?.summary as Record<string, unknown> | null;

  return {
    id: deal.id,
    address:
      deal.address ??
      [deal.city, deal.state].filter(Boolean).join(", ") ??
      "Unknown Address",
    clientName: deal.client_name ?? deal.clientName,
    verdict: (payload?.verdict as string) ?? null,
    netClearance: (clearance?.best_net as number) ?? null,
    zopa: (geometry?.zopa as number) ?? null,
    gatesPassed:
      (gatesSummary?.pass_count as number) ??
      (8 - ((gatesSummary?.fail_count as number) ?? 0)),
    gatesTotal: 8,
    updatedAt: deal.updated_at,
    createdAt: deal.created_at,
  };
}

/**
 * Transform DbDeal to filter-compatible format
 */
function dbDealToFilterable(deal: DbDeal) {
  const payload = deal.payload as Record<string, unknown> | null;
  const clearance = payload?.net_clearance as Record<string, unknown> | null;

  return {
    id: deal.id,
    verdict: (payload?.verdict as string) ?? null,
    created_at: deal.created_at,
    updated_at: deal.updated_at,
    archived_at: null, // DbDeal doesn't have archived_at, assume active
    net_clearance: (clearance?.best_net as number) ?? null,
    address:
      deal.address ?? [deal.city, deal.state].filter(Boolean).join(", "),
    client_name: deal.client_name ?? deal.clientName,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export default function DealsPage() {
  const router = useRouter();
  const { setDbDeal, setDeal } = useDealSession();

  // State
  const [status, setStatus] = useState<DealsStatus>({ kind: "loading" });
  const [creating, setCreating] = useState(false);
  const [isNewDealModalOpen, setIsNewDealModalOpen] = useState(false);
  const [newDeal, setNewDeal] = useState(createEmptyDealForm());
  const [createError, setCreateError] = useState<string | null>(null);

  // Filter hook
  const {
    filters,
    setFilter,
    resetFilters,
    filterDeals,
    getPipelineCounts,
    hasActiveFilters,
  } = useDealsFilter();

  // ─────────────────────────────────────────────────────────────────────────
  // Data Loading
  // ─────────────────────────────────────────────────────────────────────────

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
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Unable to load deals for your org. Please check your memberships and try again.";
      console.error("[/deals] load deals error", err);
      setStatus({ kind: "error", message });
    }
  }, []);

  useEffect(() => {
    void loadDeals();
  }, [loadDeals]);

  // ─────────────────────────────────────────────────────────────────────────
  // Derived Data
  // ─────────────────────────────────────────────────────────────────────────

  const { filteredDeals, pipelineCounts, cardData } = useMemo(() => {
    if (status.kind !== "ready") {
      return {
        filteredDeals: [],
        pipelineCounts: {
          total: 0,
          pursue: 0,
          needsEvidence: 0,
          pass: 0,
          pending: 0,
        },
        cardData: [],
      };
    }

    // Transform to filterable format
    const filterableDeals = status.deals.map(dbDealToFilterable);

    // Get counts before filtering
    const counts = getPipelineCounts(filterableDeals);

    // Apply filters
    const filtered = filterDeals(filterableDeals);

    // Map filtered IDs back to original deals and transform to card data
    const filteredIds = new Set(filtered.map((d) => d.id));
    const cards = status.deals
      .filter((d) => filteredIds.has(d.id))
      .map(dbDealToCardData);

    // Sort cards based on filter sort order
    const sortedCards = [...cards].sort((a, b) => {
      const aIdx = filtered.findIndex((f) => f.id === a.id);
      const bIdx = filtered.findIndex((f) => f.id === b.id);
      return aIdx - bIdx;
    });

    return {
      filteredDeals: filtered,
      pipelineCounts: counts,
      cardData: sortedCards,
    };
  }, [status, filterDeals, getPipelineCounts]);

  // ─────────────────────────────────────────────────────────────────────────
  // Handlers
  // ─────────────────────────────────────────────────────────────────────────

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
          setDeal(inserted.payload as Parameters<typeof setDeal>[0]);
        } catch {
          // tolerate malformed payload; user can re-run analyze
        }
      }

      setIsNewDealModalOpen(false);
      setNewDeal(createEmptyDealForm());
      setCreateError(null);

      // Trigger valuation run and navigate
      invokeValuationRun(inserted.id, "base").catch((err) =>
        console.warn("[/deals] valuation run failed", err)
      );
      router.push(`/overview?dealId=${inserted.id}`);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Unable to create deal. Please try again.";
      console.error("[/deals] create deal error", err);
      setCreateError(message);
    } finally {
      setCreating(false);
    }
  }, [newDeal, router, setDbDeal, setDeal, status]);

  const handleQuickAction = useCallback(
    (dealId: string) => {
      if (status.kind !== "ready") return;
      const deal = status.deals.find((d) => d.id === dealId);
      if (!deal) return;

      setDbDeal(deal);
      if (deal.payload) {
        try {
          setDeal(deal.payload as Parameters<typeof setDeal>[0]);
        } catch {
          // ignore malformed payload
        }
      }
      router.push(`/overview?dealId=${deal.id}`);
    },
    [status, router, setDbDeal, setDeal]
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Render: Loading
  // ─────────────────────────────────────────────────────────────────────────

  if (status.kind === "loading") {
    return (
      <main className="p-6 lg:p-0 space-y-6">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-zinc-100">Deals</h1>
        </header>
        <DealsList deals={[]} isLoading={true} />
      </main>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render: Error
  // ─────────────────────────────────────────────────────────────────────────

  if (status.kind === "error") {
    return (
      <main className="p-6 lg:p-0 space-y-6">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-zinc-100">Deals</h1>
        </header>
        <div
          className="rounded-lg border border-red-500/40 bg-red-500/10 p-6 text-center"
          role="alert"
        >
          <p className="text-sm text-red-400 mb-4">{status.message}</p>
          <Button
            variant="neutral"
            onClick={() => void loadDeals()}
            className="min-h-[44px]"
          >
            Retry
          </Button>
        </div>
      </main>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render: Ready
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <main className="p-6 lg:p-0 space-y-6">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-zinc-100">Deals</h1>
        <div className="flex items-center gap-3">
          <Link
            href="/import/wizard"
            className={cn(
              "flex items-center gap-2",
              "h-11 min-h-[44px] px-4",
              "rounded-lg text-sm font-medium",
              "bg-zinc-800 hover:bg-zinc-700",
              "border border-zinc-700 hover:border-zinc-600",
              "text-zinc-200",
              "transition-colors duration-150"
            )}
          >
            <FileSpreadsheetIcon className="w-4 h-4 text-blue-400" />
            <span className="hidden sm:inline">Bulk Import</span>
          </Link>
          <Button
            variant="primary"
            onClick={() => {
              setCreateError(null);
              setNewDeal(createEmptyDealForm());
              setIsNewDealModalOpen(true);
            }}
            disabled={creating}
            className="h-11 min-h-[44px] px-4"
          >
            <PlusIcon className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">New Deal</span>
            <span className="sm:hidden">New</span>
          </Button>
        </div>
      </header>

      {/* Pipeline Summary */}
      <PipelineSummary counts={pipelineCounts} />

      {/* Filters */}
      <DealsFilter
        filters={filters}
        onFilterChange={setFilter}
        onReset={resetFilters}
        hasActiveFilters={hasActiveFilters}
      />

      {/* Deals Grid */}
      <DealsList
        deals={cardData}
        isLoading={false}
        hasFilters={hasActiveFilters}
        onResetFilters={resetFilters}
        onQuickAction={handleQuickAction}
      />

      {/* New Deal Modal */}
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
