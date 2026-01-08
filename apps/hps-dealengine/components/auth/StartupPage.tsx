"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Modal } from "../ui";
import { useRouter } from "next/navigation";
import { PlusIcon, UploadIcon, CalculatorIcon, CheckIcon, Loader2Icon } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { useDealSession, type DbDeal } from "@/lib/dealSessionContext";
import {
  createDealWithClientInfo,
  createEmptyDealForm,
  fetchDealsForOrg,
  resolveOrgId,
  validateNewDealForm,
} from "@/lib/deals";
import NewDealForm from "../deals/NewDealForm";
import DealsTable from "../deals/DealsTable";
// PAUSED_V2: Auto-valuation disabled - import commented out
// import { invokeValuationRun } from "@/lib/valuation";

interface StartupPageProps {
  onEnter?: () => void;
}

type StartupDealRow = DbDeal;

const StartupPage: React.FC<StartupPageProps> = ({ onEnter }) => {
  const router = useRouter();
  const { setDbDeal, setDeal } = useDealSession();

  const [step, setStep] = useState(0);
  // New Deal Modal State
  const [isNewDealModalOpen, setIsNewDealModalOpen] = useState(false);
  const [newDeal, setNewDeal] = useState(createEmptyDealForm());
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const [deals, setDeals] = useState<StartupDealRow[]>([]);
  const [dealsLoading, setDealsLoading] = useState(true);
  const [dealsError, setDealsError] = useState<string | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);

  useEffect(() => {
    const timers = [
      setTimeout(() => setStep(1), 300),
      setTimeout(() => setStep(2), 800),
      setTimeout(() => setStep(3), 1400),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadDeals = async () => {
      setDealsLoading(true);
      setDealsError(null);

      try {
        const supabase = getSupabaseClient();
        const { data: session } = await supabase.auth.getSession();
        if (!session?.session) {
          throw new Error("Not signed in");
        }

        const callerOrgId = await resolveOrgId(supabase);
        if (!isMounted) return;
        setOrgId(callerOrgId);

        const rows = await fetchDealsForOrg(supabase, callerOrgId);
        if (!isMounted) return;
        setDeals(rows);
      } catch (err) {
        console.error("[startup] load deals error", err);
        if (!isMounted) return;
        setDealsError("Unable to load deals for your org.");
      } finally {
        if (isMounted) {
          setDealsLoading(false);
        }
      }
    };

    void loadDeals();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleRunNewDeal = async () => {
    setCreateError(null);
    const validationError = validateNewDealForm(newDeal);
    if (validationError) {
      setCreateError(validationError);
      return;
    }

    setCreating(true);
    const supabase = getSupabaseClient();

    try {
      const callerOrgId = orgId ?? (await resolveOrgId(supabase));
      if (!orgId) {
        setOrgId(callerOrgId);
      }

      const inserted = await createDealWithClientInfo({
        supabase,
        orgId: callerOrgId,
        clientName: newDeal.clientName,
        clientPhone: newDeal.clientPhone,
        clientEmail: newDeal.clientEmail,
        propertyStreet: newDeal.propertyStreet,
        propertyCity: newDeal.propertyCity,
        propertyState: newDeal.propertyState,
        propertyPostalCode: newDeal.propertyPostalCode,
      });

      setDeals((prev) => [inserted, ...prev]);
      setDbDeal(inserted);
      if (inserted.payload) {
        try {
          setDeal(inserted.payload as any);
        } catch {
          // tolerate malformed payload; user can re-run analyze
        }
      }

      if (process.env.NODE_ENV !== "production") {
        console.log("[startup] created deal", { dealId: inserted.id });
      }

      setIsNewDealModalOpen(false);
      setNewDeal(createEmptyDealForm());

      if (onEnter) {
        onEnter();
      }

      // PAUSED_V2: Auto-valuation disabled for free data architecture pivot
      // Re-enable when provider strategy finalized
      // invokeValuationRun(inserted.id, "base").catch((err) =>
      //   console.warn("[startup] valuation run failed", err),
      // );

      router.push(`/underwrite?dealId=${inserted.id}`);
      router.refresh();
    } catch (err: any) {
      console.error("[startup] create deal error", err);
      setCreateError(err?.message ?? "Unable to create deal. Please try again.");
    } finally {
      setCreating(false);
    }
  };

  const handleSelectDeal = (deal: StartupDealRow) => {
    setDbDeal(deal);
    if (deal.payload) {
      try {
        setDeal(deal.payload as any);
      } catch {
        // ignore malformed payload; user can re-run analyze
      }
    }

    if (onEnter) {
      onEnter();
    }

    router.push(`/overview?dealId=${deal.id}`);
    router.refresh();
  };

  const handleRetryLoadDeals = () => {
    setDealsError(null);
    setDealsLoading(true);
    const reload = async () => {
      try {
        const supabase = getSupabaseClient();
        const { data: session } = await supabase.auth.getSession();
        if (!session?.session) {
          throw new Error("Not signed in");
        }
        const callerOrgId = orgId ?? (await resolveOrgId(supabase));
        const rows = await fetchDealsForOrg(supabase, callerOrgId);
        setOrgId(callerOrgId);
        setDeals(rows);
      } catch (err) {
        console.error("[startup] retry load deals error", err);
        setDealsError("Unable to load deals for your org.");
      } finally {
        setDealsLoading(false);
      }
    };
    void reload();
  };

  return (
    <div className="w-full max-w-5xl mx-auto animate-fade-in">
      {/* Welcome Section */}
      <section
        className={`text-center max-w-xl mx-auto mb-10 pt-4 transition-all duration-700 transform ${
          step >= 1 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        }`}
      >
        {/* Status Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-6">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-medium text-emerald-400">System Online</span>
        </div>

        {/* Title */}
        <h1 className="text-3xl font-semibold text-white mb-2">Welcome Back</h1>

        {/* Subtitle */}
        <p className="text-slate-400 text-sm mb-8">Market data synced and ready</p>

        {/* Action Buttons */}
        <div
          className={`flex flex-col sm:flex-row gap-3 justify-center transition-all duration-700 delay-300 transform ${
            step >= 2 ? "opacity-100 scale-100" : "opacity-0 scale-95"
          }`}
        >
          {/* Primary Button - Run New Deal */}
          <button
            onClick={() => {
              setCreateError(null);
              setNewDeal(createEmptyDealForm());
              setIsNewDealModalOpen(true);
            }}
            className="
              inline-flex items-center justify-center gap-2
              px-6 py-3
              bg-sky-600 hover:bg-sky-500
              text-white text-sm font-medium
              rounded-lg
              shadow-lg shadow-sky-500/20
              hover:shadow-sky-500/30
              transition-all duration-150
            "
          >
            <CalculatorIcon className="w-4 h-4" />
            Run New Deal
          </button>

          {/* Secondary Button - Bulk Import */}
          <Link
            href="/import/wizard"
            className="
              inline-flex items-center justify-center gap-2
              px-6 py-3
              bg-slate-800/60 hover:bg-slate-700/60
              border border-slate-600/40 hover:border-slate-500/40
              text-slate-300 hover:text-white text-sm font-medium
              rounded-lg
              transition-all duration-150
            "
          >
            <UploadIcon className="w-4 h-4" />
            Bulk Import
            <span className="text-slate-500 text-xs ml-1">CSV, Excel, or JSON</span>
          </Link>
        </div>
      </section>

      {/* Deals Table Section */}
      <div
        className={`transition-all duration-700 delay-500 transform ${
          step >= 3 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        }`}
      >
        <DealsTable
          deals={deals}
          loading={dealsLoading}
          error={dealsError}
          onRetry={handleRetryLoadDeals}
          onRowClick={handleSelectDeal}
          actionsSlot={
            <button
              onClick={() => router.push("/deals")}
              className="
                h-9 px-4
                bg-slate-800/60
                border border-slate-600/40
                rounded-lg
                text-sm text-slate-300
                hover:border-slate-500/50 hover:text-white
                transition-all duration-150
                whitespace-nowrap
              "
            >
              View all deals
            </button>
          }
          emptyCta={
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={() => setIsNewDealModalOpen(true)}
                className="
                  inline-flex items-center gap-2
                  px-5 py-2.5
                  bg-sky-600 hover:bg-sky-500
                  text-white text-sm font-medium
                  rounded-lg
                  shadow-lg shadow-sky-500/20
                  transition-all duration-150
                "
              >
                <PlusIcon className="w-4 h-4" />
                Create new deal
              </button>
              <button
                onClick={() => router.push("/deals")}
                className="
                  px-5 py-2.5
                  bg-slate-800/60
                  border border-slate-600/40
                  rounded-lg
                  text-sm text-slate-300
                  hover:border-slate-500/50 hover:text-white
                  transition-all duration-150
                "
              >
                View all deals
              </button>
            </div>
          }
        />
      </div>

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
          onSubmit={handleRunNewDeal}
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
    </div>
  );
};

export default StartupPage;
