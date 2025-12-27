"use client";

export const dynamic = "force-dynamic";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, GlassCard, Icon, InputField, Modal } from "@/components/ui";
import OverviewTab from "@/components/overview/OverviewTab";
import { DealHealthStrip } from "@/components/overview/DealHealthStrip";
import { GuardrailsCard } from "@/components/overview/GuardrailsCard";
import { buildOverviewGuardrailsView } from "@/lib/overviewGuardrails";
import { StrategyPostureCard } from "@/components/overview/StrategyPostureCard";
import { buildStrategyViewModel } from "@/lib/overviewStrategy";
import {
  buildConfidenceView,
  buildEvidenceView,
  buildRiskView,
  buildTimelineView,
  buildWorkflowView,
} from "@/lib/overviewRiskTimeline";
import { RiskComplianceCard } from "@/components/overview/RiskComplianceCard";
import { TimelineCarryCard } from "@/components/overview/TimelineCarryCard";
import { DataEvidenceCard } from "@/components/overview/DataEvidenceCard";
import { ClientProfileModal } from "@/components/overview/ClientProfileModal";
import KnobFamilySummary from "@/components/overview/KnobFamilySummary";
import TopDealKpis from "@/components/overview/TopDealKpis";
import { createInitialEstimatorState } from "../../../lib/ui-v2-constants";
import type { Deal } from "../../../types";
import { DoubleClose, type DoubleCloseCalcs } from "../../../services/engine";
import { useDealSession } from "@/lib/dealSessionContext";
import {
  extractContactFromDeal,
  extractContactFromPayload,
  formatAddressLine,
} from "@/lib/deals";
import { Icons } from "@/constants";
import { generateOfferPackage } from "@/lib/offerPackages";
import {
  fetchDealContractByDealId,
  upsertDealContract,
  type DealContractRow,
} from "@/lib/dealContracts";
import { getSupabaseClient } from "@/lib/supabaseClient";

/**
 * Layout V1 spec (overview): hero KPIs at top, then a 2x2 grid of cards:
 * 1) Valuation & Floors (GuardrailsCard)
 * 2) Strategy & MAO (StrategyPostureCard)
 * 3) Timeline & Carry (TimelineCarryCard)
 * 4) Risk & Evidence (RiskComplianceCard + DataEvidenceCard stacked)
 * Keep hero strip + analytics cards canonical; no engine/policy changes here.
 */

/**
 * Ensure the Deal has the shape the overview cards + engine expect.
 * This tolerates partial shapes coming from UI-V2 or engine defaults.
 */
function normalizeDealShape(base?: any): Deal {
  const d: any = base ? structuredClone(base) : {};

  d.market = {
    arv: 0,
    as_is_value: 0,
    price_to_list_ratio: 0,
    local_discount_pct: 0,
    dom: 0,
    months_of_inventory: 0,
    ...(d.market ?? {}),
  };

  d.costs = {
    ...(d.costs ?? {}),
    double_close: d.costs?.double_close ?? {},
  };

  d.debt = {
    senior_principal: 0,
    ...(d.debt ?? {}),
  };

  return d as Deal;
}

/**
 * Build a robust initial Deal that matches what the overview cards expect.
 * Prefer UI-V2 estimator defaults; fall back to HPSEngine defaults,
 * then to a minimal defensive shape.
 */
function makeInitialDeal(): Deal {
  // 1) Try UI-V2 estimator state (design source of truth)
  try {
    const est: any =
      typeof createInitialEstimatorState === "function"
        ? createInitialEstimatorState()
        : {};

    if (est?.deal) return normalizeDealShape(est.deal);
    if (est?.state?.deal) return normalizeDealShape(est.state.deal);
    if (est?.estimator?.deal) return normalizeDealShape(est.estimator.deal);
  } catch {
    // swallow and fall through to engine defaults
  }

  // 2) Final defensive fallback: just the fields overview cards/engine touch
  return normalizeDealShape({
    market: {
      arv: 0,
      as_is_value: 0,
      price_to_list_ratio: 0,
      local_discount_pct: 0,
      dom: 0,
      months_of_inventory: 0,
    },
    costs: {
      double_close: {},
    },
    debt: {
      senior_principal: 0,
    },
  });
}

const USD_0 = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function fmtUsd0(value: number | null | undefined): string {
  if (value == null) return "—";
  return Number.isFinite(value) ? USD_0.format(value) : "—";
}

function toFiniteNumber(value: unknown): number | null {
  const n = typeof value === "string" ? Number(value) : Number(value);
  return Number.isFinite(n) ? n : null;
}

function getNestedValue(obj: unknown, path: string[]): unknown {
  let cur: unknown = obj;
  for (const key of path) {
    if (!cur || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[key];
  }
  return cur;
}

function getNumberNested(obj: unknown, path: string[]): number | null {
  const v = getNestedValue(obj, path);
  return toFiniteNumber(v);
}

export default function Page() {
  // Shared state coming from DealSession (same session as /underwrite)
  const {
    deal: rawDeal,
    lastAnalyzeResult,
    dbDeal,
    posture,
    lastRunId,
    isHydratingActiveDeal,
  } = useDealSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const dealIdFromUrl = searchParams?.get("dealId") ?? null;
  const orgId = dbDeal?.org_id ?? null;

  // Always normalize the shape so the overview cards + engine get what they expect
  const deal = useMemo(
    () => normalizeDealShape(rawDeal ?? makeInitialDeal()),
    [rawDeal],
  );
  const [isClientProfileOpen, setIsClientProfileOpen] = useState(false);
  const clientButtonRef = useRef<HTMLButtonElement | null>(null);
  const wasClientModalOpen = useRef(false);

  const contactInfo = useMemo(() => {
    return (
      extractContactFromPayload(deal as any) ??
      extractContactFromPayload(dbDeal?.payload ?? null) ??
      extractContactFromDeal(dbDeal)
    );
  }, [deal, dbDeal]);

  const hasContactInfo = useMemo(() => {
    if (!contactInfo) return false;
    const parts = [contactInfo.name, contactInfo.phone, contactInfo.email].map(
      (value) => (typeof value === "string" ? value.trim() : ""),
    );
    return parts.some((value) => value.length > 0);
  }, [contactInfo]);

  const contactName = hasContactInfo
    ? contactInfo?.name?.trim() || "Client"
    : "Client info not set";

  const clientProfile = useMemo(() => {
    const payload =
      typeof dbDeal?.payload === "object" && dbDeal?.payload !== null
        ? (dbDeal.payload as Record<string, unknown>)
        : null;
    const payloadContact =
      (payload as any)?.contact ?? (payload as any)?.client ?? null;
    const toOptional = (value: unknown): string | undefined => {
      const str = typeof value === "string" ? value.trim() : "";
      return str.length > 0 ? str : undefined;
    };
    const tagsCandidate =
      (payloadContact as any)?.tags ??
      (payload as any)?.client_tags ??
      (payload as any)?.tags ??
      null;
    const tags =
      Array.isArray(tagsCandidate) && tagsCandidate.length > 0
        ? tagsCandidate
            .map((tag) =>
              typeof tag === "string" ? tag.trim() : String(tag ?? "").trim(),
            )
            .filter((tag) => tag.length > 0)
        : null;

    return {
      name:
        toOptional(contactInfo?.name) ??
        toOptional((payloadContact as any)?.name) ??
        toOptional(dbDeal?.client_name),
      email:
        toOptional(contactInfo?.email) ??
        toOptional((payloadContact as any)?.email) ??
        toOptional(dbDeal?.client_email),
      phone:
        toOptional(contactInfo?.phone) ??
        toOptional((payloadContact as any)?.phone) ??
        toOptional(dbDeal?.client_phone),
      entityType:
        toOptional((payloadContact as any)?.entity_type) ??
        toOptional((payloadContact as any)?.type) ??
        toOptional((payload as any)?.entity_type),
      notes:
        toOptional((payloadContact as any)?.notes) ??
        toOptional((payload as any)?.notes),
      tags,
    };
  }, [
    contactInfo?.email,
    contactInfo?.name,
    contactInfo?.phone,
    dbDeal?.client_email,
    dbDeal?.client_name,
    dbDeal?.client_phone,
    dbDeal?.payload,
  ]);

  const propertyAddress = useMemo(() => {
    const primary = formatAddressLine({
      address: dbDeal?.address ?? "",
      city: dbDeal?.city ?? undefined,
      state: dbDeal?.state ?? undefined,
      zip: dbDeal?.zip ?? undefined,
    });

    if (primary) return primary;

    const property = (deal as any)?.property ?? {};
    const fallback = formatAddressLine({
      address: property.address ?? "",
      city: property.city ?? undefined,
      state: property.state ?? undefined,
      zip: property.zip ?? undefined,
    });

    return fallback || "Address not provided";
  }, [dbDeal?.address, dbDeal?.city, dbDeal?.state, dbDeal?.zip, deal]);

  useEffect(() => {
    if (dbDeal?.id && process.env.NODE_ENV !== "production") {
      console.log("[overview] rendering deal header", {
        dealId: dbDeal.id,
        clientName: contactInfo?.name ?? null,
      });
    }
  }, [dbDeal?.id, contactInfo?.name]);

  useEffect(() => {
    setIsClientProfileOpen(false);
  }, [dbDeal?.id]);

  useEffect(() => {
    if (wasClientModalOpen.current && !isClientProfileOpen) {
      clientButtonRef.current?.focus();
    }
    wasClientModalOpen.current = isClientProfileOpen;
  }, [isClientProfileOpen]);

  const loadDealContract = useCallback(async () => {
    if (!dbDeal?.id) {
      setDealContract(null);
      setDealContractError(null);
      return;
    }

    setDealContractLoading(true);
    setDealContractError(null);
    try {
      const row = await fetchDealContractByDealId(dbDeal.id);
      setDealContract(row);
    } catch (err: any) {
      console.error("[overview] deal contract load failed", err);
      setDealContractError(err?.message ?? "Failed to load deal contract status.");
    } finally {
      setDealContractLoading(false);
    }
  }, [dbDeal?.id]);

  useEffect(() => {
    void loadDealContract();
  }, [loadDealContract]);

  // Canonical outputs from the last analyze (from Edge/runs)
  const outputsAny = useMemo(
    () => (lastAnalyzeResult as any)?.outputs ?? lastAnalyzeResult ?? null,
    [lastAnalyzeResult],
  );
  const calc: any = useMemo(() => {
    const persisted = lastAnalyzeResult as any;
    return {
      ...(persisted?.calculations ?? {}),
      ...(outputsAny ?? {}),
    };
  }, [lastAnalyzeResult, outputsAny]);

  const guardrailsView = useMemo(
    () =>
      buildOverviewGuardrailsView({
        deal,
        lastAnalyzeResult: lastAnalyzeResult as any,
        calc,
      }),
    [deal, lastAnalyzeResult, calc],
  );

  const strategyView = useMemo(
    () => buildStrategyViewModel(outputsAny ?? null),
    [outputsAny],
  );

  const riskView = useMemo(
    () => buildRiskView(outputsAny ?? null),
    [outputsAny],
  );

  const confidenceView = useMemo(
    () => buildConfidenceView(outputsAny ?? null),
    [outputsAny],
  );

  const workflowView = useMemo(
    () => buildWorkflowView(outputsAny ?? null),
    [outputsAny],
  );
  const workflowReasons = workflowView.reasons ?? [];

  const [dealContract, setDealContract] = useState<DealContractRow | null>(null);
  const [dealContractError, setDealContractError] = useState<string | null>(null);
  const [dealContractLoading, setDealContractLoading] = useState(false);
  const [contractModalOpen, setContractModalOpen] = useState(false);
  const [contractPriceInput, setContractPriceInput] = useState<string>("");
  const [contractDateInput, setContractDateInput] = useState<string>("");
  const [contractNotesInput, setContractNotesInput] = useState<string>("");
  const [contractSaving, setContractSaving] = useState(false);
  const [contractSubmitError, setContractSubmitError] = useState<string | null>(null);
  const [contractSubmitSuccess, setContractSubmitSuccess] = useState<string | null>(null);

  const [offerGenerating, setOfferGenerating] = useState(false);

  const openContractModal = useCallback(() => {
    setContractSubmitError(null);
    setContractSubmitSuccess(null);
    if (dealContract) {
      const priceValue = dealContract.executed_contract_price;
      setContractPriceInput(priceValue != null ? String(priceValue) : "");
      setContractDateInput(dealContract.executed_contract_date ?? "");
      setContractNotesInput(dealContract.notes ?? "");
    } else {
      setContractPriceInput("");
      setContractDateInput("");
      setContractNotesInput("");
    }
    setContractModalOpen(true);
  }, [dealContract]);

  const handleSendOffer = useCallback(async () => {
    const dealId = dbDeal?.id ?? dealIdFromUrl ?? null;
    if (!dealId) {
      window.alert("Save a run first");
      return;
    }

    if (offerGenerating) return;

    try {
      setOfferGenerating(true);
      const supabase = getSupabaseClient();
      let resolvedRunId = lastRunId ?? null;
      if (!resolvedRunId) {
        const runQuery = supabase
          .from("runs")
          .select("id, created_at")
          .eq("deal_id", dealId);
        if (orgId) {
          runQuery.eq("org_id", orgId);
        }
        const { data: latestRun, error: runError } = await runQuery
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (runError) throw runError;
        resolvedRunId = (latestRun as { id?: string } | null)?.id ?? null;
      }
      if (!resolvedRunId) {
        window.alert("Analyze the deal before generating an offer package.");
        return;
      }

      const { offerPackageId } = await generateOfferPackage({
        dealId,
        runId: resolvedRunId,
      });
      router.push(`/offer-packages/${offerPackageId}?dealId=${dealId}`);
    } catch (err: any) {
      console.error("[overview] offer package generate failed", err);
      window.alert(err?.message ?? "Unable to generate offer package.");
    } finally {
      setOfferGenerating(false);
    }
  }, [dbDeal?.id, dealIdFromUrl, lastRunId, offerGenerating, router, orgId]);

  const handleSaveContract = useCallback(async () => {
    if (!dbDeal?.id) {
      setContractSubmitError("Deal is not loaded yet.");
      return;
    }

    if (contractSaving) return;

    const trimmedPrice =
      contractPriceInput == null || String(contractPriceInput).trim().length === 0
        ? null
        : contractPriceInput;
    const priceValue = trimmedPrice == null ? null : toFiniteNumber(trimmedPrice);

    if (priceValue == null) {
      setContractSubmitError("Executed contract price is required.");
      return;
    }

    setContractSubmitError(null);
    setContractSubmitSuccess(null);
    setContractSaving(true);

    try {
      await upsertDealContract({
        dealId: dbDeal.id,
        status: "under_contract",
        executedContractPrice: priceValue,
        executedContractDate:
          contractDateInput.trim().length > 0 ? contractDateInput.trim() : null,
        notes: contractNotesInput.trim().length > 0 ? contractNotesInput.trim() : null,
      });
      await loadDealContract();
      setContractSubmitSuccess("Deal marked under contract.");
      setContractModalOpen(false);
    } catch (err: any) {
      console.error("[overview] deal contract upsert failed", err);
      setContractSubmitError(err?.message ?? "Failed to save contract status.");
    } finally {
      setContractSaving(false);
    }
  }, [
    dbDeal?.id,
    contractSaving,
    contractPriceInput,
    contractDateInput,
    contractNotesInput,
    loadDealContract,
  ]);

  const timelineView = useMemo(
    () => buildTimelineView(outputsAny ?? null, calc),
    [outputsAny, calc],
  );

  const evidenceView = useMemo(
    () =>
      buildEvidenceView(
        outputsAny ?? null,
        (lastAnalyzeResult as any)?.trace ?? null,
      ),
    [outputsAny, lastAnalyzeResult],
  );

  // Double-close math (Florida-specific) - tolerate missing costs on deal
  const dcInput = ((deal as any).costs?.double_close ?? {}) as any;
  const dcAutofilled = DoubleClose.autofill(dcInput, { deal }, calc);
  const dcResult = DoubleClose.computeDoubleClose(dcAutofilled, {
    deal,
  }) as DoubleCloseCalcs;

  // "Has input" based on local deal, plus any DealSession-backed engine result
  const hasUserInput =
    Number((deal as any).market?.arv ?? 0) > 0 ||
    Number((deal as any).market?.as_is_value ?? 0) > 0 ||
    Number((deal as any).debt?.senior_principal ?? 0) > 0;

  const canAnalyze = hasUserInput || !!lastAnalyzeResult;
  const canSendOffer = Boolean(dbDeal?.id ?? dealIdFromUrl);
  const contractStatus = dealContract?.status ?? null;
  const contractStatusLabel =
    contractStatus === "under_contract"
      ? "Under Contract"
      : contractStatus === "closed"
      ? "Closed"
      : contractStatus === "cancelled"
      ? "Cancelled"
      : "Not Under Contract";
  const contractBadgeLabel =
    contractStatusLabel === "Not Under Contract" ? "Open" : contractStatusLabel;
  const contractPriceValue =
    dealContract?.executed_contract_price ?? null;
  const contractPriceNumber =
    contractPriceValue == null || String(contractPriceValue).trim().length === 0
      ? null
      : Number(contractPriceValue);
  const contractDateLabel =
    dealContract?.executed_contract_date ?? null;
  const contractBadgeClass =
    contractStatus === "under_contract"
      ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
      : contractStatus === "closed"
      ? "border-blue-400/30 bg-blue-400/10 text-blue-200"
      : contractStatus === "cancelled"
      ? "border-red-400/30 bg-red-400/10 text-red-200"
      : "border-white/15 bg-white/5 text-text-secondary";
const repairsTotal = useMemo(() => {
  const candidates: Array<number | null> = [
    getNumberNested(deal, ["repairs", "total"]),
    getNumberNested(deal, ["repairs_total"]),
    getNumberNested(deal, ["repairsTotal"]),
    getNumberNested(deal, ["costs", "repairs_base"]),
    getNumberNested(deal, ["costs", "repairs"]),
    getNumberNested(deal, ["quickEstimate", "total"]),
  ];
  for (const cand of candidates) {
    if (cand != null) return cand;
  }
  return null;
}, [deal]);

const propertySqft = useMemo(() => {
  return (
    getNumberNested(deal, ["property", "sqft"]) ??
    getNumberNested(deal, ["subject", "sqft"]) ??
    null
  );
}, [deal]);

const repairsPerSqft = useMemo(() => {
  if (!repairsTotal || repairsTotal <= 0) return null;
  if (!propertySqft || propertySqft <= 0) return null;
  return repairsTotal / propertySqft;
}, [repairsTotal, propertySqft]);

const riskCounts = useMemo(() => {
  const fail = riskView.gates.filter((g) => g.status === "fail").length;
  const watch = riskView.gates.filter((g) => g.status === "watch").length;
  const unknown = riskView.gates.filter((g) => g.status === "unknown").length;
  return { fail, watch, unknown };
}, [riskView.gates]);

const evidenceCounts = useMemo(() => {
  return {
    missing: evidenceView.missingKinds.length,
    stale: evidenceView.staleKinds.length,
    blocking: evidenceView.blockingKinds.length,
    placeholdersUsed: evidenceView.placeholdersUsed,
  };
}, [
  evidenceView.missingKinds.length,
  evidenceView.staleKinds.length,
  evidenceView.blockingKinds.length,
  evidenceView.placeholdersUsed,
]);


  return (
    <div className="flex flex-col gap-6">
        <div className="space-y-6">

          <GlassCard className="p-4 md:p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-6">
              <div className="flex h-full flex-col justify-center gap-1 md:gap-1.5">
                <p className="text-xs uppercase text-text-secondary">Property</p>
                <div className="text-lg font-semibold text-text-primary">
                  {propertyAddress}
                </div>
              </div>
              <div className="flex h-full flex-col items-start gap-1 md:items-end md:justify-center">
                <p className="text-xs uppercase text-text-secondary">Client</p>
                <button
                  type="button"
                  ref={clientButtonRef}
                  title="View client details"
                  aria-haspopup="dialog"
                  aria-expanded={isClientProfileOpen}
                  className="group relative inline-flex h-[28px] min-h-[28px] w-full items-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-[var(--accent-blue,#0096ff)] to-[#00b8ff] px-4 text-sm font-semibold leading-tight text-white shadow-[0_4px_12px_rgba(0,150,255,0.18)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_16px_rgba(0,150,255,0.22)] focus:outline-none focus:ring-2 focus:ring-accent-blue/40 focus:ring-offset-2 focus:ring-offset-black/30 md:w-auto md:px-5"
                  onClick={() => setIsClientProfileOpen(true)}
                >
                  <span className="absolute inset-0 translate-x-[-120%] bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-0 transition duration-700 ease-out group-hover:translate-x-[120%] group-hover:opacity-100" />
                  <Icon d={Icons.user} size={16} className="text-white" />
                  <span>{contactName}</span>
                  <span className="text-[11px] font-medium uppercase tracking-wide text-white/90">
                    View
                  </span>
                </button>
            </div>
          </div>
        </GlassCard>

        <ClientProfileModal
          open={isClientProfileOpen}
          onClose={() => setIsClientProfileOpen(false)}
          client={clientProfile}
          workflowState={workflowView.state}
          workflowReasons={workflowReasons}
          canSendOffer={canSendOffer}
          onSendOffer={handleSendOffer}
        />

        <Modal
          isOpen={contractModalOpen}
          onClose={() => setContractModalOpen(false)}
          title="Mark Under Contract"
          size="md"
        >
          <div className="space-y-4">
            <InputField
              label="Executed contract price"
              type="number"
              prefix="$"
              value={contractPriceInput}
              dataTestId="contract-executed-price"
              onChange={(e) => {
                const next = (e.target as HTMLInputElement).value as string | null;
                setContractPriceInput(next ?? "");
              }}
              placeholder=""
            />
            <InputField
              label="Executed contract date"
              type="date"
              value={contractDateInput}
              onChange={(e) => setContractDateInput(e.target.value)}
            />
            <InputField
              label="Notes"
              value={contractNotesInput}
              onChange={(e) => setContractNotesInput(e.target.value)}
            />
            {contractSubmitError && (
              <div className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs text-amber-200">
                {contractSubmitError}
              </div>
            )}
            <div className="flex items-center justify-end gap-2">
              <Button size="sm" variant="neutral" onClick={() => setContractModalOpen(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                variant="primary"
                disabled={contractSaving}
                dataTestId="contract-submit"
                onClick={handleSaveContract}
              >
                {contractSaving ? "Saving..." : "Mark Under Contract"}
              </Button>
            </div>
          </div>
        </Modal>

        <TopDealKpis
          arv={deal.market?.arv ?? null}
          offer={
            (lastAnalyzeResult as any)?.outputs?.primary_offer ??
            (lastAnalyzeResult as any)?.outputs?.instant_cash_offer ??
            (calc as any)?.instantCashOffer ??
            null
          }
          maoFinal={
            (lastAnalyzeResult as any)?.outputs?.primary_offer ??
            (lastAnalyzeResult as any)?.outputs?.mao_wholesale ??
            null
          }
          discountToArvPct={
            deal.market?.arv &&
            (lastAnalyzeResult as any)?.outputs?.primary_offer
              ? (deal.market.arv -
                  (lastAnalyzeResult as any).outputs.primary_offer) /
                deal.market.arv
              : null
          }
          discountToArvDollars={
            deal.market?.arv &&
            (lastAnalyzeResult as any)?.outputs?.primary_offer
              ? deal.market.arv -
                (lastAnalyzeResult as any).outputs.primary_offer
              : null
          }
          assignmentFee={(lastAnalyzeResult as any)?.outputs?.spread_cash ?? null}
          assignmentPolicyTargetPct={
            (() => {
              const trace = (lastAnalyzeResult as any)?.trace ?? [];
              const fee = Array.isArray(trace)
                ? trace.find((t: any) => t?.rule === "ASSIGNMENT_FEE_POLICY")
                : null;
              const target = fee?.details?.assignment_fee_target ?? null;
              const arv = deal.market?.arv ?? null;
              return arv && target != null ? target / arv : null;
            })()
          }
          assignmentPolicyMaxPct={
            (() => {
              const trace = (lastAnalyzeResult as any)?.trace ?? [];
              const fee = Array.isArray(trace)
                ? trace.find((t: any) => t?.rule === "ASSIGNMENT_FEE_POLICY")
                : null;
              return fee?.details?.max_publicized_pct_of_arv ?? null;
            })()
          }
          dtmDays={
            (lastAnalyzeResult as any)?.outputs?.timeline_summary
              ?.dtm_selected_days ??
            (lastAnalyzeResult as any)?.outputs?.timeline_summary?.days_to_money ??
            null
          }
          speedBand={
            (lastAnalyzeResult as any)?.outputs?.timeline_summary?.speed_band ?? null
          }
          riskOverall={(lastAnalyzeResult as any)?.outputs?.risk_summary?.overall ?? null}
          confidenceGrade={(lastAnalyzeResult as any)?.outputs?.confidence_grade ?? null}
          workflowState={(lastAnalyzeResult as any)?.outputs?.workflow_state ?? null}
        />

        <DealHealthStrip view={guardrailsView} />

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-12 lg:gap-6">
          <div className="lg:col-span-8">
            <GuardrailsCard view={guardrailsView} />
          </div>
          <div className="lg:col-span-4">
            <StrategyPostureCard view={strategyView} />
          </div>
          <div className="lg:col-span-8">
            <TimelineCarryCard timeline={timelineView} />
          </div>
          <div className="flex flex-col gap-4 lg:col-span-4 lg:gap-6">
            <RiskComplianceCard risk={riskView} />
            <DataEvidenceCard
              evidence={evidenceView}
              confidence={confidenceView}
              workflow={workflowView}
            />
          </div>
        </div>

        <div className="space-y-6 lg:grid lg:grid-cols-12 lg:gap-6 lg:space-y-0">
          <div className="lg:col-span-8">
            <OverviewTab
              deal={deal}
              calc={calc}
              flags={{}}
              hasUserInput={canAnalyze}
            />
          </div>
          
<div className="lg:col-span-4">
    <div className="space-y-6 lg:sticky lg:top-24">
    <KnobFamilySummary runOutput={lastAnalyzeResult ?? null} />

    <GlassCard className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs uppercase text-text-secondary">Deal status</div>
          <div className="mt-1 text-sm font-semibold text-text-primary">
            {contractStatusLabel}
          </div>
        </div>
        <span
          className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${contractBadgeClass}`}
        >
          {contractBadgeLabel}
        </span>
      </div>

      <div className="mt-4 grid gap-3">
        <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
          <div className="text-[11px] uppercase tracking-wide text-text-secondary">
            Executed price
          </div>
          <div className="mt-0.5 text-sm font-semibold text-text-primary">
            {contractPriceNumber != null && Number.isFinite(contractPriceNumber)
              ? fmtUsd0(contractPriceNumber)
              : "—"}
          </div>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
          <div className="text-[11px] uppercase tracking-wide text-text-secondary">
            Executed date
          </div>
          <div className="mt-0.5 text-sm font-semibold text-text-primary">
            {contractDateLabel ?? "—"}
          </div>
        </div>
      </div>

      {dealContract?.notes ? (
        <div className="mt-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-text-secondary">
          {dealContract.notes}
        </div>
      ) : null}

      {dealContractLoading ? (
        <div className="mt-3 text-xs text-text-secondary">
          Loading contract status...
        </div>
      ) : null}

      {dealContractError ? (
        <div className="mt-3 rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs text-amber-200">
          {dealContractError}
        </div>
      ) : null}

      {contractSubmitSuccess ? (
        <div className="mt-3 rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-xs text-emerald-200">
          {contractSubmitSuccess}
        </div>
      ) : null}

      <div className="mt-3 flex items-center justify-end">
        <Button
          size="sm"
          variant="primary"
          dataTestId="cta-mark-under-contract"
          disabled={!dbDeal?.id || isHydratingActiveDeal}
          onClick={openContractModal}
        >
          {contractStatus === "under_contract" ? "Update Contract" : "Mark Under Contract"}
        </Button>
      </div>
    </GlassCard>

    {/* Desktop-only: fill dead space with high-signal, actionable cards */}
    <div className="hidden lg:block space-y-6">
      <GlassCard className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs uppercase text-text-secondary">
              Deal gate
            </div>
            <div className="mt-1 text-sm font-semibold text-text-primary">
              Buy box / guardrails
            </div>
          </div>
          <span
            className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
              guardrailsView.guardrailsStatus === "ok"
                ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
                : guardrailsView.guardrailsStatus === "tight"
                ? "border-amber-400/30 bg-amber-400/10 text-amber-200"
                : guardrailsView.guardrailsStatus === "broken"
                ? "border-red-400/30 bg-red-400/10 text-red-200"
                : "border-white/15 bg-white/5 text-text-secondary"
            }`}
          >
            {guardrailsView.guardrailsStatus === "ok"
              ? "OK"
              : guardrailsView.guardrailsStatus === "tight"
              ? "Tight"
              : guardrailsView.guardrailsStatus === "broken"
              ? "Broken"
              : "Unknown"}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
            <div className="text-[11px] uppercase tracking-wide text-text-secondary">
              Floor
            </div>
            <div className="mt-0.5 text-sm font-semibold text-text-primary">
              {fmtUsd0(guardrailsView.floor)}
            </div>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
            <div className="text-[11px] uppercase tracking-wide text-text-secondary">
              Ceiling
            </div>
            <div className="mt-0.5 text-sm font-semibold text-text-primary">
              {fmtUsd0(guardrailsView.ceiling)}
            </div>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
            <div className="text-[11px] uppercase tracking-wide text-text-secondary">
              Offer
            </div>
            <div className="mt-0.5 text-sm font-semibold text-text-primary">
              {fmtUsd0(guardrailsView.offer)}
            </div>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
            <div className="text-[11px] uppercase tracking-wide text-text-secondary">
              Spread
            </div>
            <div className="mt-0.5 text-sm font-semibold text-text-primary">
              {fmtUsd0(guardrailsView.spread)}
            </div>
          </div>
        </div>

        <div className="mt-3 text-xs text-text-secondary">
          Risk:{" "}
          <span className="font-semibold text-text-primary">
            {riskView.overallStatus}
          </span>{" "}
          · Confidence:{" "}
          <span className="font-semibold text-text-primary">
            {confidenceView.grade}
          </span>
        </div>
      </GlassCard>

      <GlassCard className="p-4">
        <div className="text-xs uppercase text-text-secondary">
          Signals
        </div>
        <div className="mt-1 text-sm font-semibold text-text-primary">
          Next actions
        </div>

        <div className="mt-4 space-y-3 text-xs">
          <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
            <div className="text-[11px] uppercase tracking-wide text-text-secondary">
              Workflow
            </div>
            <div className="mt-0.5 font-medium text-text-primary">
              {workflowView.label}
            </div>
            {workflowReasons.length > 0 && (
              <ul className="mt-2 list-disc space-y-1 pl-4 text-text-secondary">
                {workflowReasons.slice(0, 3).map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
            <div className="text-[11px] uppercase tracking-wide text-text-secondary">
              Risk gates
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-red-400/30 bg-red-400/10 px-2 py-0.5 text-[11px] font-semibold text-red-200">
                Fail {riskCounts.fail}
              </span>
              <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[11px] font-semibold text-amber-200">
                Watch {riskCounts.watch}
              </span>
              <span className="rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-[11px] font-semibold text-text-secondary">
                Unknown {riskCounts.unknown}
              </span>
            </div>
          </div>

          <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
            <div className="text-[11px] uppercase tracking-wide text-text-secondary">
              Evidence
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[11px] font-semibold text-amber-200">
                Missing {evidenceCounts.missing}
              </span>
              <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[11px] font-semibold text-amber-200">
                Stale {evidenceCounts.stale}
              </span>
              <span className="rounded-full border border-red-400/30 bg-red-400/10 px-2 py-0.5 text-[11px] font-semibold text-red-200">
                Blocking {evidenceCounts.blocking}
              </span>
            </div>
            {evidenceCounts.placeholdersUsed && (
              <div className="mt-2 text-text-secondary">
                Placeholders used (allowed by policy).
              </div>
            )}
          </div>
        </div>
      </GlassCard>

      <GlassCard className="p-4">
        <div className="text-xs uppercase text-text-secondary">
          Repairs snapshot
        </div>
        <div className="mt-1 text-sm font-semibold text-text-primary">
          Budget quick read
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
            <div className="text-[11px] uppercase tracking-wide text-text-secondary">
              Total
            </div>
            <div className="mt-0.5 text-sm font-semibold text-text-primary">
              {fmtUsd0(repairsTotal)}
            </div>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
            <div className="text-[11px] uppercase tracking-wide text-text-secondary">
              $ / sqft
            </div>
            <div className="mt-0.5 text-sm font-semibold text-text-primary">
              {repairsPerSqft != null ? `$${repairsPerSqft.toFixed(2)}` : "—"}
            </div>
          </div>
        </div>

        <div className="mt-3 text-xs text-text-secondary">
          Sqft:{" "}
          <span className="font-semibold text-text-primary">
            {propertySqft != null ? Math.round(propertySqft).toLocaleString() : "—"}
          </span>
          {" · "}Posture:{" "}
          <span className="font-semibold text-text-primary">
            {posture || "base"}
          </span>
        </div>
      </GlassCard>
    </div>
  </div>
</div>
        </div>
      </div>
    </div>
  );
}
