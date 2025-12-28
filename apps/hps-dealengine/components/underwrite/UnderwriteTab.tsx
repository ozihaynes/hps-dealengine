import React from "react";
import type { Deal, EngineCalculations, SandboxConfig } from "../../types";
import { GlassCard, Button, InputField, SelectField, ToggleSwitch, Icon, Modal, Badge } from "../ui";
import { Tooltip } from "../ui/tooltip";
import ScenarioModeler from "./ScenarioModeler";
import DoubleCloseCalculator from "./DoubleCloseCalculator";
import { num, fmt$ } from "../../utils/helpers";
import { Icons } from "../../constants";
import { getLastAnalyzeResult, subscribeAnalyzeResult } from "../../lib/analyzeBus";
import type { PropertySnapshot, ValuationRun } from "@hps-internal/contracts";
import CompsPanel from "./CompsPanel";
import OfferMenu from "../offers/OfferMenu";
import ConfidenceUnlock from "../offers/ConfidenceUnlock";
import { useDealSession } from "@/lib/dealSessionContext";
import type { DealContractRow } from "@/lib/dealContracts";

const fmtPercent = (value: number | null | undefined, opts?: { decimals?: number }) => {
  if (value == null || !Number.isFinite(Number(value))) return "-";
  const decimals = opts?.decimals ?? 1;
  return `${(Number(value) * 100).toFixed(decimals)}%`;
};

const UnderwritingSection: React.FC<{ title: string; children: React.ReactNode; icon: string }> = ({
  title,
  icon,
  children,
}) => (
  <GlassCard className="p-5 md:p-6 space-y-4">
    <h3 className="text-lg font-bold text-text-primary flex items-center gap-3">
      <Icon d={icon} size={20} className="text-accent-blue" />
      <span>{title}</span>
    </h3>
    {children}
  </GlassCard>
);

const FieldGroup: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="space-y-3 p-4 info-card rounded-lg">
    <h4 className="label-xs uppercase tracking-wider text-accent-blue/80 pb-2 mb-3 border-b border-line">
      {title}
    </h4>
    {children}
  </div>
);

interface UnderwriteTabProps {
  deal: Deal;
  dealContract?: DealContractRow | null;
  calc: EngineCalculations;
  setDealValue: (path: string, value: any) => void;
  sandbox: SandboxConfig;
  canEditPolicy: boolean;
  onRequestOverride: (tokenKey: string, newValue: unknown) => void;
  valuationRun?: ValuationRun | null;
  valuationSnapshot?: PropertySnapshot | null;
  minClosedComps?: number | null;
  onRefreshValuation?: (forceRefresh?: boolean) => void;
  refreshingValuation?: boolean;
  valuationError?: string | null;
  valuationStatus?: string | null;
  onApplySuggestedArv?: () => void;
  applyingSuggestedArv?: boolean;
  onOverrideMarketValue?: (
    field: "arv" | "as_is_value",
    value: number,
    reason: string,
    valuationRunId?: string | null,
  ) => Promise<void>;
  overrideStatus?: string | null;
  overrideError?: string | null;
  overrideSaving?: boolean;
  autosaveStatus?: {
    state: "idle" | "saving" | "saved" | "error";
    lastSavedAt: string | null;
    error: string | null;
  };
}

const UnderwriteTab: React.FC<UnderwriteTabProps> = ({
  deal,
  dealContract,
  calc,
  setDealValue,
  sandbox,
  canEditPolicy,
  onRequestOverride,
  valuationRun,
  valuationSnapshot,
  minClosedComps,
  onRefreshValuation,
  refreshingValuation,
  valuationError,
  valuationStatus,
  onApplySuggestedArv,
  applyingSuggestedArv,
  onOverrideMarketValue,
  overrideStatus,
  overrideError,
  overrideSaving,
  autosaveStatus,
}) => {
  const { saveWorkingStateNow } = useDealSession();
  const baseDeal = (deal as any) ?? {};
  const sandboxAny = sandbox as any;

  const property = (baseDeal.property ??
    ({
      occupancy: "owner",
      county: "",
      old_roof_flag: false,
      is_homestead: false,
      is_foreclosure_sale: false,
      is_redemption_period_sale: false,
    } as any)) as any;
  const dealIdFromUrl =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("dealId")
      : null;
  const occupancyStorageKey = dealIdFromUrl
    ? `hps-underwrite-occupancy:${dealIdFromUrl}`
    : null;
  const [storedOccupancy, setStoredOccupancy] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!occupancyStorageKey) return;
    try {
      const raw = sessionStorage.getItem(occupancyStorageKey);
      if (raw) setStoredOccupancy(raw);
    } catch {
      // ignore storage read errors
    }
  }, [occupancyStorageKey]);

  const status = (baseDeal.status ??
    ({
      insurability: "bindable",
      structural_or_permit_risk_flag: false,
      major_system_failure_flag: false,
    } as any)) as any;

  const confidence = (baseDeal.confidence ??
    ({
      no_access_flag: false,
      reinstatement_proof_flag: false,
    } as any)) as any;

  const title = (baseDeal.title ?? {}) as any;

  const policy = (baseDeal.policy ?? {}) as any;

  const costs = (baseDeal.costs ?? {}) as any;
  if (!costs.monthly) {
    costs.monthly = {};
  }

  const debt = (baseDeal.debt ?? { juniors: [] }) as any;
  if (!Array.isArray(debt.juniors)) {
    debt.juniors = [];
  }

  const market = (baseDeal.market ?? {}) as any;
  const legal = (baseDeal.legal ?? {}) as any;
  const timeline = (baseDeal.timeline ?? {}) as any;
  const suggestedArv = valuationRun?.output?.suggested_arv ?? null;
  const suggestedArvMethod = valuationRun?.output?.suggested_arv_source_method ?? "comps_median_v1";
  const suggestedArvCompKindUsed = valuationRun?.output?.suggested_arv_comp_kind_used ?? null;
  const suggestedArvCompCountUsed = valuationRun?.output?.suggested_arv_comp_count_used ?? null;
  const arvRangeLow = valuationRun?.output?.arv_range_low ?? null;
  const arvRangeHigh = valuationRun?.output?.arv_range_high ?? null;
  const selectedCompIds = Array.isArray(valuationRun?.output?.selected_comp_ids)
    ? (valuationRun?.output?.selected_comp_ids ?? []).map((id) => id?.toString?.() ?? "").filter(Boolean)
    : [];
  const selectionSummary: any = valuationRun?.output?.selection_summary ?? null;
  const ladderSummary = selectionSummary?.ladder ?? {};
  const ladderStages: string[] = Array.isArray(ladderSummary?.stages)
    ? ladderSummary.stages
        .map((s: any) => (typeof s === "string" ? s : s?.name ?? null))
        .filter((s: any): s is string => typeof s === "string")
    : [];
  const stopReason = ladderSummary?.stop_reason ?? selectionSummary?.stop_reason ?? null;
  const outlierRemovedIds: string[] = Array.isArray(selectionSummary?.outliers?.removed_ids)
    ? selectionSummary.outliers.removed_ids
    : [];
  const outlierRemovedCount = outlierRemovedIds.length;
  const avmReferencePrice =
    (valuationRun as any)?.output?.avm_reference_price ??
    (valuationRun as any)?.output?.avmPrice ??
    (market as any)?.avm_price ??
    null;
  const avmReferenceLow =
    (valuationRun as any)?.output?.avm_reference_range_low ??
    (market as any)?.avm_price_range_low ??
    null;
  const avmReferenceHigh =
    (valuationRun as any)?.output?.avm_reference_range_high ??
    (market as any)?.avm_price_range_high ??
    null;
  const contractPriceRaw = dealContract?.executed_contract_price ?? null;
  const contractPriceExecuted =
    contractPriceRaw == null || String(contractPriceRaw).trim().length === 0
      ? null
      : Number(contractPriceRaw);
  const valuationBasis = market.valuation_basis ?? "";
  const compCount = valuationRun?.output?.comp_count ?? null;
  const valuationConfidence = valuationRun?.output?.valuation_confidence ?? null;
  const compStats = valuationRun?.output?.comp_set_stats ?? null;
  const provenance = valuationRun?.provenance ?? null;
  const valuationWarningCodes = Array.isArray(valuationRun?.output?.warning_codes)
    ? (valuationRun.output.warning_codes ?? []).filter((w): w is string => typeof w === "string")
    : [];
  const valuationWarnings = valuationWarningCodes.length
    ? valuationWarningCodes
    : Array.isArray(valuationRun?.output?.warnings)
    ? (valuationRun?.output?.warnings ?? []).filter((w): w is string => typeof w === "string")
    : [];
  const displayMinComps =
    minClosedComps ??
    (valuationRun as any)?.provenance?.min_closed_comps_required ??
    (valuationRun as any)?.input?.min_closed_comps_required ??
    null;
  const suggestedApplied = Boolean(
    market?.arv_source === "valuation_run" &&
      valuationRun?.id &&
      market?.arv_valuation_run_id === valuationRun.id,
  );
  const compsFromSnapshot = valuationSnapshot?.comps;
  const comps = React.useMemo(
    () => (Array.isArray(compsFromSnapshot) ? compsFromSnapshot : []),
    [compsFromSnapshot],
  );
  const marketSnapshot: any = (valuationSnapshot as any)?.market ?? null;
  const closedSalesCount = comps.filter((c: any) => (c as any)?.comp_kind === "closed_sale").length;
  const listingCount = comps.filter((c: any) => (c as any)?.comp_kind === "sale_listing").length;
  const suggestedArvBasis = valuationRun?.output?.suggested_arv_basis ?? null;
  const ensembleWeights = (valuationRun?.output as any)?.ensemble_weights ?? null;
  const ensembleCapValue = (valuationRun?.output as any)?.ensemble_cap_value ?? null;
  const ensembleCapApplied = (valuationRun?.output as any)?.ensemble_cap_applied === true;
  const uncertaintyRangeLow = (valuationRun?.output as any)?.uncertainty_range_low ?? null;
  const uncertaintyRangeHigh = (valuationRun?.output as any)?.uncertainty_range_high ?? null;
  const uncertaintyRangePct = (valuationRun?.output as any)?.uncertainty_range_pct ?? null;
  const compStatusCounts = React.useMemo(
    () =>
      comps.reduce(
        (acc, comp) => {
          const statusRaw = (comp.status || "").toString().toLowerCase();
          if (
            statusRaw.includes("inactive") ||
            statusRaw.includes("expired") ||
            statusRaw.includes("off")
          ) {
            acc.inactive += 1;
          } else if (statusRaw.includes("active")) {
            acc.active += 1;
          } else if (statusRaw) {
            acc.other += 1;
          } else {
            acc.unknown += 1;
          }
          return acc;
        },
        { active: 0, inactive: 0, other: 0, unknown: 0 },
      ),
    [comps],
  );
  const compsGating = displayMinComps != null ? closedSalesCount < displayMinComps : false;
  const providerLabel =
    provenance?.provider_name ??
    valuationSnapshot?.provider ??
    provenance?.source ??
    valuationSnapshot?.source ??
    "-";
  const snapshotAsOf = valuationSnapshot?.as_of
    ? new Date(valuationSnapshot.as_of).toLocaleDateString()
    : "-";
  const marketSnapshotAsOf =
    (marketSnapshot?.as_of && new Date(marketSnapshot.as_of).toLocaleDateString()) || snapshotAsOf;
  const marketSnapshotSource = marketSnapshot?.source ?? providerLabel;
  const [overrideTarget, setOverrideTarget] = React.useState<"arv" | "as_is_value" | null>(null);
  const [overrideValue, setOverrideValue] = React.useState<string>("");
  const [overrideReason, setOverrideReason] = React.useState<string>("");
  const [overrideLocalError, setOverrideLocalError] = React.useState<string | null>(null);
  const [overrideSubmitting, setOverrideSubmitting] = React.useState(false);
  const overrideReasonId = React.useId();
  const overrideReasonHelpId = `${overrideReasonId}-help`;

  // Live engine outputs from Edge (via /underwrite/debug analyzeBus)
  const [analysisOutputs, setAnalysisOutputs] = React.useState<any | null>(null);

  React.useEffect(() => {
    const last = getLastAnalyzeResult();
    if (last && (last as any).outputs) {
      setAnalysisOutputs((last as any).outputs);
    }

    const unsubscribe = subscribeAnalyzeResult((result) => {
      setAnalysisOutputs((result as any)?.outputs ?? null);
    });

    // Ensure cleanup returns void, not boolean
    return () => {
      unsubscribe();
    };
  }, []);

  const addJuniorLien = () => {
    const newLien: any = { id: Date.now(), type: "Judgment", balance: "", per_diem: "", good_thru: "" };
    const juniors = (debt.juniors || []) as any[];
    setDealValue("debt.juniors", [...juniors, newLien]);
  };

  const updateJuniorLien = (index: number, field: string, value: any) => {
    const juniors = (debt.juniors || []) as any[];
    const updatedJuniors = [...juniors];
    if (!updatedJuniors[index]) updatedJuniors[index] = {};
    (updatedJuniors[index] as any)[field] = value;
    setDealValue("debt.juniors", updatedJuniors);
  };

  const removeJuniorLien = (index: number) => {
    const juniors = (debt.juniors || []) as any[];
    setDealValue(
      "debt.juniors",
      juniors.filter((_: any, i: number) => i !== index),
    );
  };

  const arvWarning =
    num(market.arv) > 0 &&
    num(market.as_is_value) > 0 &&
    num(market.arv) < num(market.as_is_value)
      ? "ARV is less than As-Is Value. This is unusual and may indicate a data entry error."
      : null;

  const handleApplySuggested = () => {
    if (onApplySuggestedArv) {
      onApplySuggestedArv();
    } else if (suggestedArv != null) {
      setDealValue("market.arv", suggestedArv);
    }
  };

  const openOverrideModal = (field: "arv" | "as_is_value") => {
    setOverrideTarget(field);
    const current = field === "arv" ? market.arv : market.as_is_value;
    setOverrideValue(current ?? "");
    setOverrideReason("");
    setOverrideLocalError(null);
  };

  const closeOverrideModal = () => {
    setOverrideTarget(null);
    setOverrideValue("");
    setOverrideReason("");
    setOverrideLocalError(null);
  };

  const handleOverrideSubmit = async () => {
    if (!overrideTarget) return;
    const numeric = Number(overrideValue);
    if (!Number.isFinite(numeric)) {
      setOverrideLocalError("Enter a valid number.");
      return;
    }
    const trimmedReason = overrideReason.trim();
    if (trimmedReason.length < 10) {
      setOverrideLocalError("Reason must be at least 10 characters.");
      return;
    }
    if (!onOverrideMarketValue) {
      setOverrideLocalError("Override handler is unavailable.");
      return;
    }
    setOverrideSubmitting(true);
    setOverrideLocalError(null);
    try {
      await onOverrideMarketValue(overrideTarget, numeric, trimmedReason, valuationRun?.id ?? null);
      closeOverrideModal();
    } catch (err: any) {
      setOverrideLocalError(err?.message ?? "Failed to save override");
    } finally {
      setOverrideSubmitting(false);
    }
  };

  const warningCopy: Record<string, string> = {
    missing_correlation_signal: "Correlation unavailable; confidence capped at C.",
  };

  const getMinSpreadPlaceholder = () => {
    const arv = num(market.arv, 0);
    const bands: any[] = Array.isArray(sandboxAny.minSpreadByArvBand)
      ? sandboxAny.minSpreadByArvBand
      : [];
    const applicableBand = bands.find((b) => arv <= b.maxArv) || bands[bands.length - 1];
    if (!applicableBand) return "Policy Default";
    return `${fmt$(applicableBand.minSpread, 0)} (Policy)`;
  };

  const commissionItems: any[] = Array.isArray(sandboxAny.listingCostModelSellerCostLineItems)
    ? sandboxAny.listingCostModelSellerCostLineItems
    : [];
  const commissionDefault = commissionItems.find((i) => i.item === "Commissions")?.defaultPct || 6;
  const concessionsDefault = commissionItems.find((i) => i.item === "Seller Concessions")?.defaultPct || 2;
  const sellCloseDefault = commissionItems.find((i) => i.item === "Title & Stamps")?.defaultPct || 1.5;

  const aivSafetyCap =
    analysisOutputs && typeof (analysisOutputs as any).aivSafetyCap === "number"
      ? ((analysisOutputs as any).aivSafetyCap as number)
      : null;

  const carryMonths =
    analysisOutputs && typeof (analysisOutputs as any).carryMonths === "number"
      ? ((analysisOutputs as any).carryMonths as number)
      : null;

  // Engine outputs alias (Offer Menu + Ghost Fee UX must bind to outputs only)
  const o = (analysisOutputs as any) ?? null;
  const offerMenuCash = o?.offer_menu_cash ?? null;
  const offerMenuFeeMetadata = offerMenuCash?.fee_metadata ?? null;
  const hviUnlocks = o?.hvi_unlocks ?? null;

  const LockedHint = ({
    tokenKey,
    newValue,
  }: {
    tokenKey: string;
    newValue: unknown;
  }) =>
    !canEditPolicy ? (
      <div className="flex items-center justify-between rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-text-secondary">
        <span>Locked (policy)</span>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onRequestOverride(tokenKey, newValue)}
        >
          Request override
        </Button>
      </div>
    ) : null;

  return (
    <div className="flex flex-col gap-6">
      {/* Market & Valuation */}
      <UnderwritingSection title="Market & Valuation" icon={Icons.barChart}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2 text-sm text-text-secondary">
            <span className="font-semibold text-text-primary">Valuation Confidence:</span>
            <span className="text-lg font-semibold text-text-primary">
              {valuationConfidence ?? "-"}
            </span>
            <span className="rounded border border-white/10 px-2 py-1 text-xs">
              {compCount ?? comps.length ?? 0} comps{" "}
              {displayMinComps != null ? `(min ${displayMinComps})` : "(policy missing)"}
            </span>
            {compsGating && (
              <span className="rounded border border-amber-400/40 bg-amber-400/10 px-2 py-1 text-xs text-amber-100">
                Informational only: insufficient closed-sale comps
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="neutral"
              size="sm"
              onClick={() => onRefreshValuation?.(true)}
              disabled={refreshingValuation || !onRefreshValuation}
            >
              {refreshingValuation ? "Refreshing..." : "Refresh Valuation"}
            </Button>
          </div>
        </div>

        {valuationError && (
          <div className="rounded-md border border-red-400/40 bg-red-500/10 px-3 py-2 text-sm text-red-100">
            {valuationError}
          </div>
        )}
        {valuationStatus && (
          <div className="rounded-md border border-emerald-400/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
            {valuationStatus}
          </div>
        )}
        {!valuationRun && displayMinComps == null && (
          <div className="rounded-md border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
            Policy token missing: valuation.min_closed_comps_required
          </div>
        )}

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="info-card rounded-lg border border-white/5 bg-white/5 p-4 space-y-3">
            <div className="flex items-center justify-between text-xs uppercase tracking-wide text-text-secondary">
              <span>Facts</span>
              {suggestedApplied && (
                <span className="rounded border border-emerald-400/40 px-2 py-1 text-[11px] text-emerald-200">
                  Applied
                </span>
              )}
            </div>
            {autosaveStatus && (
              <div className="text-[11px] text-text-secondary">
                {autosaveStatus.state === "saving" && "Saving..."}
                {autosaveStatus.state === "error" &&
                  (autosaveStatus.error ? `Error: ${autosaveStatus.error}` : "Save error")}
                {autosaveStatus.state !== "saving" &&
                  autosaveStatus.state !== "error" &&
                  (autosaveStatus.lastSavedAt ? "Saved" : null)}
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <InputField
                label="ARV"
                type="number"
                prefix="$"
                value={market.arv ?? ""}
                disabled
                warning={arvWarning}
                helpKey="arv"
              />
              <InputField
                label="As-Is Value"
                type="number"
                prefix="$"
                value={market.as_is_value ?? ""}
                disabled
                warning={arvWarning}
                helpKey="aiv"
              />
              <SelectField
                label="Valuation Basis"
                value={valuationBasis}
                onChange={(e: any) => setDealValue("market.valuation_basis", e.target.value)}
              >
                <option value="">Select basis</option>
                <option value="rentcast_avm">RentCast AVM (with comparable sale listings)</option>
                <option value="manual_override">Manual override</option>
              </SelectField>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="neutral"
                onClick={() => openOverrideModal("arv")}
                disabled={overrideSaving}
              >
                Override ARV
              </Button>
              <Button
                size="sm"
                variant="neutral"
                onClick={() => openOverrideModal("as_is_value")}
                disabled={overrideSaving}
              >
                Override As-Is Value
              </Button>
            </div>
            {overrideError && (
              <div className="rounded-md border border-red-400/40 bg-red-500/10 px-3 py-2 text-xs text-red-100">
                {overrideError}
              </div>
            )}
            {overrideStatus && (
              <div className="rounded-md border border-blue-400/40 bg-blue-500/10 px-3 py-2 text-xs text-blue-100">
                {overrideStatus}
              </div>
            )}
            <div className="space-y-2 text-xs text-text-secondary">
              <div className="rounded-md border border-white/10 bg-white/5 p-3 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="space-y-1">
                    <div className="text-sm font-semibold text-text-primary">
                      Suggested ARV (method: {suggestedArvMethod})
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className="flex items-center gap-2">
                        {suggestedArvBasis === "ensemble_v1" ? (
                          <Badge color="blue" className="text-[11px] uppercase tracking-wide">
                            Ensemble
                          </Badge>
                        ) : null}
                        {suggestedArv != null ? fmt$(suggestedArv, 0) : "—"}{" "}
                        {arvRangeLow != null && arvRangeHigh != null
                          ? `(range ${fmt$(arvRangeLow, 0)} – ${fmt$(arvRangeHigh, 0)})`
                          : ""}
                      </span>
                      {uncertaintyRangeLow != null && uncertaintyRangeHigh != null ? (
                        <span className="rounded border border-white/10 px-2 py-1">
                          Uncertainty: {fmt$(uncertaintyRangeLow, 0)} – {fmt$(uncertaintyRangeHigh, 0)}{" "}
                          {uncertaintyRangePct != null ? `(${fmtPercent(uncertaintyRangePct)})` : ""}
                        </span>
                      ) : null}
                      {ensembleWeights ? (
                        <span className="rounded border border-white/10 px-2 py-1">
                          weights: comps {fmtPercent((ensembleWeights as any).comps ?? null)} / avm{" "}
                          {fmtPercent((ensembleWeights as any).avm ?? null)}
                        </span>
                      ) : null}
                      {ensembleCapValue != null ? (
                        <span className="rounded border border-white/10 px-2 py-1">
                          Ceiling: {fmt$(ensembleCapValue, 0)} {ensembleCapApplied ? "(applied)" : "(not applied)"}
                        </span>
                      ) : null}
                      <span className="rounded border border-white/10 px-2 py-1">
                        Comps: {suggestedArvCompKindUsed ?? "-"} ·{" "}
                        {suggestedArvCompCountUsed ?? 0} used
                      </span>
                      <span className="rounded border border-white/10 px-2 py-1">
                        Selection: {ladderStages.length > 0 ? ladderStages.join(" -> ") : "stages unknown"} (stop:{" "}
                        {stopReason ?? "n/a"})
                      </span>
                      <span className="rounded border border-white/10 px-2 py-1">
                        Outliers removed: {outlierRemovedCount}
                      </span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="neutral"
                    onClick={handleApplySuggested}
                    disabled={applyingSuggestedArv || suggestedApplied || suggestedArv == null}
                  >
                    {suggestedApplied
                      ? "Applied"
                      : applyingSuggestedArv
                      ? "Applying..."
                      : "Use Suggested ARV"}
                  </Button>
                </div>
                {valuationWarnings.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {valuationWarnings.map((w) => (
                      <span
                        key={w}
                        className="rounded border border-amber-400/40 bg-amber-500/10 px-2 py-1 text-[11px] text-amber-100"
                      >
                        {w.replace(/_/g, " ")}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-md border border-white/10 bg-white/5 p-3 space-y-2">
                <div className="text-sm font-semibold text-text-primary">AVM Reference (RentCast)</div>
                <div className="flex flex-wrap gap-2">
                  <span>
                    {avmReferencePrice != null ? fmt$(avmReferencePrice, 0) : "—"}{" "}
                    {avmReferenceLow != null && avmReferenceHigh != null
                      ? `(range ${fmt$(avmReferenceLow, 0)} – ${fmt$(avmReferenceHigh, 0)})`
                      : ""}
                  </span>
                  <span className="rounded border border-white/10 px-2 py-1">
                    Provider: {providerLabel} {provenance?.stub ? "(stub)" : ""}
                  </span>
                  <span className="rounded border border-white/10 px-2 py-1">As of: {snapshotAsOf}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="info-card rounded-lg border border-white/5 bg-white/5 p-4 space-y-3">
            <div className="text-xs uppercase tracking-wide text-text-secondary">Market</div>
            <div className="space-y-2 text-sm text-text-secondary">
              <div className="flex items-center gap-2">
                <span className="w-40 text-text-primary">Contract Price (Executed)</span>
                <span
                  className="rounded border border-white/10 px-2 py-1"
                  data-testid="executed-contract-price"
                >
                  {contractPriceExecuted != null && Number.isFinite(contractPriceExecuted)
                    ? fmt$(contractPriceExecuted, 0)
                    : "—"}
                </span>
                {(contractPriceExecuted == null ||
                  !Number.isFinite(contractPriceExecuted)) && (
                  <Tooltip content="Set when the deal is marked Under Contract.">
                    <span className="sr-only">No contract price yet</span>
                  </Tooltip>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="w-40 text-text-primary">DOM (Zip, days)</span>
                {marketSnapshot?.dom_zip_days != null ? (
                  <span className="rounded border border-white/10 px-2 py-1">
                    {marketSnapshot.dom_zip_days}
                  </span>
                ) : (
                  <Tooltip content="Not available from v1 provider; planned in v2.">
                    <span className="rounded border border-white/10 px-2 py-1">—</span>
                  </Tooltip>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="w-40 text-text-primary">MOI (Zip, months)</span>
                {marketSnapshot?.moi_zip_months != null ? (
                  <span className="rounded border border-white/10 px-2 py-1">
                    {marketSnapshot.moi_zip_months}
                  </span>
                ) : (
                  <Tooltip content="Not available from v1 provider; planned in v2.">
                    <span className="rounded border border-white/10 px-2 py-1">—</span>
                  </Tooltip>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="w-40 text-text-primary">Price-to-List %</span>
                {marketSnapshot?.price_to_list_pct != null ? (
                  <span className="rounded border border-white/10 px-2 py-1">
                    {`${Number(marketSnapshot.price_to_list_pct * 100).toFixed(1)}%`}
                  </span>
                ) : (
                  <Tooltip content="Not available from v1 provider; planned in v2.">
                    <span className="rounded border border-white/10 px-2 py-1">—</span>
                  </Tooltip>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="w-40 text-text-primary">Local Discount (20th %)</span>
                {marketSnapshot?.local_discount_pct_p20 != null ? (
                  <span className="rounded border border-white/10 px-2 py-1">
                    {`${Number(marketSnapshot.local_discount_pct_p20 * 100).toFixed(1)}%`}
                  </span>
                ) : (
                  <Tooltip content="Not available from v1 provider; planned in v2.">
                    <span className="rounded border border-white/10 px-2 py-1">—</span>
                  </Tooltip>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="w-40 text-text-primary">Flood / SFHA</span>
                <span className="rounded border border-white/10 px-2 py-1">
                  Not connected (v1)
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded border border-white/10 px-2 py-1">
                  Source: {marketSnapshotSource ?? "-"}
                </span>
                <span className="rounded border border-white/10 px-2 py-1">
                  As of: {marketSnapshotAsOf}
                </span>
              </div>
            </div>
          </div>

          <div className="info-card rounded-lg border border-white/5 bg-white/5 p-4 space-y-3">
            <div className="text-xs uppercase tracking-wide text-text-secondary">Comps</div>
            <div className="text-sm font-semibold text-text-primary">
              Comparable sale listings (RentCast)
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm text-text-secondary">
              <span className="font-semibold text-text-primary">{comps.length} listings</span>
              {displayMinComps != null ? (
                <span className="rounded border border-white/10 px-2 py-1 text-xs">min {displayMinComps}</span>
              ) : (
                <span className="rounded border border-amber-400/40 px-2 py-1 text-xs text-amber-100">
                  valuation.min_closed_comps_required missing
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-text-secondary">
              <span>Active: {compStatusCounts.active}</span>
              <span>Inactive: {compStatusCounts.inactive}</span>
              <span>Other: {compStatusCounts.other}</span>
              <span>Unknown: {compStatusCounts.unknown}</span>
            </div>
            {compStats && (
              <div className="text-xs text-text-secondary">
                Listing stats: {compCount ?? "-"} listings, med dist {compStats.median_distance_miles ?? "-"} mi, med
                corr {compStats.median_correlation ?? "-"}, med days-old {compStats.median_days_old ?? "-"}
              </div>
            )}
            <div className="flex flex-wrap gap-2 text-xs text-text-secondary">
              <span className="rounded border border-white/10 px-2 py-1">Provider: {providerLabel}</span>
              <span className="rounded border border-white/10 px-2 py-1">As of: {snapshotAsOf}</span>
              {valuationSnapshot?.stub && (
                <span className="rounded border border-amber-400/40 px-2 py-1 text-amber-100">Stub data</span>
              )}
            </div>
            {compsGating && (
              <div className="rounded-md border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-xs text-amber-100">
                Insufficient comparable sale listings. Valuation is informational only.
              </div>
            )}
          </div>

          <div className="info-card rounded-lg border border-white/5 bg-white/5 p-4 space-y-3">
            <div className="text-xs uppercase tracking-wide text-text-secondary">Confidence</div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-semibold text-text-primary">
                {valuationConfidence ?? "-"}
              </span>
              <span className="text-xs text-text-secondary">Valuation Confidence</span>
            </div>
            <div className="text-xs text-text-secondary">
              {compCount != null
                ? `${compCount} comps scored${displayMinComps != null ? ` / min ${displayMinComps}` : ""}`
                : "No valuation run yet."}
            </div>
            {valuationWarnings.length > 0 && (
              <ul className="list-disc space-y-1 pl-4 text-xs text-amber-100">
                {valuationWarnings.map((w) => (
                  <li key={w}>{warningCopy[w] ?? w}</li>
                ))}
              </ul>
            )}
            {compsGating && (
              <div className="text-xs text-amber-100">
                Confidence capped until comps meet policy thresholds.
              </div>
            )}
          </div>
        </div>
      </UnderwritingSection>

      {valuationSnapshot && Array.isArray(valuationSnapshot.comps) && (
        <CompsPanel
          comps={valuationSnapshot.comps as any}
          snapshot={valuationSnapshot}
          minClosedComps={displayMinComps}
          onRefresh={(force) => onRefreshValuation?.(force)}
          refreshing={refreshingValuation}
          selectedCompIds={selectedCompIds}
          selectedCompsDetailed={(valuationRun?.output as any)?.selected_comps as any}
          selectionVersion={(valuationRun?.output as any)?.selection_version ?? null}
          selectionDiagnostics={(valuationRun?.output as any)?.selection_diagnostics as any}
        />
      )}

      <OfferMenu offerMenuCash={offerMenuCash} />
      <ConfidenceUnlock hviUnlocks={hviUnlocks} />

      {/* Property & Risk */}
      <UnderwritingSection title="Property & Risk" icon={Icons.shield}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-3">
            <SelectField
              label="Occupancy"
              value={storedOccupancy ?? property.occupancy}
              dataTestId="uw-occupancy"
              onChange={(e: any) => {
                const nextValue = e.target.value;
                setDealValue("property.occupancy", nextValue);
                setStoredOccupancy(nextValue);
                if (occupancyStorageKey) {
                  try {
                    sessionStorage.setItem(occupancyStorageKey, nextValue);
                  } catch {
                    // ignore storage write errors
                  }
                }
                setTimeout(() => {
                  void saveWorkingStateNow();
                }, 0);
              }}
            >
              <option value="owner">Owner</option>
              <option value="tenant">Tenant</option>
              <option value="vacant">Vacant</option>
            </SelectField>

            <SelectField
              label="Insurance Bindability"
              value={status.insurability}
              onChange={(e: any) => setDealValue("status.insurability", e.target.value)}
            >
              <option value="bindable">Bindable</option>
              <option value="conditional">Conditional</option>
              <option value="unbindable">Unbindable</option>
            </SelectField>

            <InputField
              label="County"
              value={property.county}
              dataTestId="uw-county"
              onChange={(e: any) => {
                const nextValue = e.target.value;
                setDealValue("property.county", nextValue);
                setTimeout(() => {
                  void saveWorkingStateNow();
                }, 0);
              }}
            />

            <div id="property.evidence.roof_age">
              <InputField
                label="Roof Age (years)"
                type="number"
                value={property?.evidence?.roof_age ?? ""}
                onChange={(e: any) => {
                  const raw = (e.target as HTMLInputElement).value ?? "";
                  const trimmed = raw.trim();
                  if (trimmed.length === 0) {
                    setDealValue("property.evidence.roof_age", null);
                    return;
                  }
                  const next = Number(trimmed);
                  setDealValue(
                    "property.evidence.roof_age",
                    Number.isFinite(next) ? next : null,
                  );
                }}
              />
            </div>

            <div id="property.evidence.hvac_year">
              <InputField
                label="HVAC Year"
                type="number"
                value={property?.evidence?.hvac_year ?? ""}
                onChange={(e: any) => {
                  const raw = (e.target as HTMLInputElement).value ?? "";
                  const trimmed = raw.trim();
                  if (trimmed.length === 0) {
                    setDealValue("property.evidence.hvac_year", null);
                    return;
                  }
                  const next = Number(trimmed);
                  setDealValue(
                    "property.evidence.hvac_year",
                    Number.isFinite(next) ? next : null,
                  );
                }}
              />
            </div>

            <div id="property.evidence.four_point">
              <SelectField
                label="4-Point Inspection"
                value={
                  typeof property?.evidence?.four_point?.inspected === "boolean"
                    ? property.evidence.four_point.inspected
                      ? "true"
                      : "false"
                    : ""
                }
                onChange={(e: any) => {
                  const raw = (e.target as HTMLSelectElement).value;
                  if (raw === "") {
                    setDealValue("property.evidence.four_point.inspected", null);
                    return;
                  }
                  setDealValue("property.evidence.four_point.inspected", raw === "true");
                }}
              >
                <option value="">Unknown</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </SelectField>
            </div>
          </div>

          <div className="info-card space-y-3 p-4">
            <ToggleSwitch
              label="No Interior Access"
              checked={!!confidence.no_access_flag}
              onChange={() =>
                setDealValue("confidence.no_access_flag", !confidence.no_access_flag)
              }
            />
            <ToggleSwitch
              label="Structural/Permit/WDO Risk"
              checked={!!status.structural_or_permit_risk_flag}
              onChange={() =>
                setDealValue(
                  "status.structural_or_permit_risk_flag",
                  !status.structural_or_permit_risk_flag,
                )
              }
            />
            <ToggleSwitch
              label="Old Roof (>20 years)"
              checked={!!property.old_roof_flag}
              onChange={() => setDealValue("property.old_roof_flag", !property.old_roof_flag)}
            />
          </div>

          <div className="info-card space-y-3 p-4">
            <ToggleSwitch
              label="Major System Failure"
              checked={!!status.major_system_failure_flag}
              onChange={() =>
                setDealValue(
                  "status.major_system_failure_flag",
                  !status.major_system_failure_flag,
                )
              }
            />
            <ToggleSwitch
              label="Reinstatement Proof"
              checked={!!confidence.reinstatement_proof_flag}
              onChange={() =>
                setDealValue(
                  "confidence.reinstatement_proof_flag",
                  !confidence.reinstatement_proof_flag,
                )
              }
            />
            <ToggleSwitch
              label="Homestead Status"
              checked={!!property.is_homestead}
              onChange={() => setDealValue("property.is_homestead", !property.is_homestead)}
            />
          </div>
        </div>
      </UnderwritingSection>

      {/* Debt & Liens */}
      <UnderwritingSection title="Debt & Liens" icon={Icons.briefcase}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FieldGroup title="Senior Lien Payoff">
            <div className="grid grid-cols-2 gap-3 items-end">
              <InputField
                label="Senior Principal"
                type="number"
                prefix="$"
                value={debt.senior_principal ?? ""}
                onChange={(e: any) => setDealValue("debt.senior_principal", e.target.value)}
                disabled={!canEditPolicy}
              />
              <InputField
                label="Senior Per Diem"
                type="number"
                prefix="$"
                min="0"
                value={debt.senior_per_diem ?? ""}
                onChange={(e: any) => setDealValue("debt.senior_per_diem", e.target.value)}
                disabled={!canEditPolicy}
              />
              <InputField
                label="Payoff Good-Thru"
                type="date"
                value={debt.good_thru_date ?? ""}
                onChange={(e: any) => setDealValue("debt.good_thru_date", e.target.value)}
                disabled={!canEditPolicy}
              />
              <ToggleSwitch
                label="Payoff Confirmed"
                checked={!!debt.payoff_is_confirmed}
                onChange={() =>
                  canEditPolicy &&
                  setDealValue("debt.payoff_is_confirmed", !debt.payoff_is_confirmed)
                }
              />
              <InputField
                label="Protective Advances"
                type="number"
                prefix="$"
                min="0"
                value={debt.protective_advances ?? ""}
                onChange={(e: any) => setDealValue("debt.protective_advances", e.target.value)}
                disabled={!canEditPolicy}
              />
              <LockedHint tokenKey="debt" newValue={debt} />
            </div>
          </FieldGroup>

          <FieldGroup title="Other Encumbrances & Title">
            <div className="grid grid-cols-2 gap-3 items-end">
              <InputField
                label="Title Cure Cost"
                type="number"
                prefix="$"
                min="0"
                value={title.cure_cost ?? ""}
                onChange={(e: any) => setDealValue("title.cure_cost", e.target.value)}
                disabled={!canEditPolicy}
              />
              <InputField
                label="Title Risk %"
                type="number"
                suffix="%"
                min="0"
                max="3"
                value={Number(title.risk_pct ?? 0) * 100}
                onChange={(e: any) => setDealValue("title.risk_pct", e.target.value)}
                disabled={!canEditPolicy}
              />
              <InputField
                label="HOA Estoppel Fee"
                type="number"
                prefix="$"
                min="0"
                value={debt.hoa_estoppel_fee ?? ""}
                onChange={(e: any) => setDealValue("debt.hoa_estoppel_fee", e.target.value)}
                disabled={!canEditPolicy}
              />
              <LockedHint tokenKey="title" newValue={title} />
            </div>
          </FieldGroup>
        </div>

        <div className="mt-6">
          <div className="flex justify-between items-center mb-2">
            <h4 className="label-xs uppercase tracking-wider text-accent-blue/80">Junior Liens</h4>
            <Button
              size="sm"
              variant="neutral"
              onClick={addJuniorLien}
              disabled={!canEditPolicy}
            >
              + Add Lien
            </Button>
          </div>

          <div className="space-y-2">
            {(debt.juniors || []).map((lien: any, index: number) => (
              <div
                key={lien.id || index}
                className="info-card grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2 items-end p-2"
              >
                <InputField
                  label="Type"
                  placeholder="HELOC, etc"
                  value={lien.type || ""}
                  onChange={(e: any) => updateJuniorLien(index, "type", e.target.value)}
                  disabled={!canEditPolicy}
                />
                <InputField
                  label="Balance"
                  type="number"
                  prefix="$"
                  value={lien.balance}
                  onChange={(e: any) => updateJuniorLien(index, "balance", e.target.value)}
                  disabled={!canEditPolicy}
                />
                <InputField
                  label="Per Diem"
                  type="number"
                  prefix="$"
                  value={lien.per_diem}
                  onChange={(e: any) => updateJuniorLien(index, "per_diem", e.target.value)}
                  disabled={!canEditPolicy}
                />
                <InputField
                  label="Good-Thru"
                  type="date"
                  value={lien.good_thru || ""}
                  onChange={(e: any) => updateJuniorLien(index, "good_thru", e.target.value)}
                  disabled={!canEditPolicy}
                />
                <Button
                  size="sm"
                  variant="danger"
                  className="h-[38px] w-full"
                  onClick={() => removeJuniorLien(index)}
                  disabled={!canEditPolicy}
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
          {!canEditPolicy && (
            <div className="text-[11px] text-text-secondary">
              Junior liens locked; request override to change payoff assumptions.
            </div>
          )}
        </div>
      </UnderwritingSection>

      {/* Policy & Fees */}
      <UnderwritingSection title="Policy & Fees" icon={Icons.sliders}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <InputField
            label="Assignment Fee Target"
            type="number"
            prefix="$"
            value={policy.assignment_fee_target ?? ""}
            onChange={(e: any) => {
              const raw = (e.target as HTMLInputElement).value ?? "";
              const trimmed = raw.trim();
              if (trimmed.length === 0) {
                setDealValue("policy.assignment_fee_target", null);
                return;
              }
              const next = Number(trimmed);
              setDealValue(
                "policy.assignment_fee_target",
                Number.isFinite(next) ? next : null,
              );
            }}
            placeholder={
              offerMenuFeeMetadata?.policy_band_amount != null
                ? `Policy: ${fmt$(offerMenuFeeMetadata.policy_band_amount, 0)}`
                : "Policy: -"
            }
            disabled={!canEditPolicy}
          />
          <LockedHint
            tokenKey="policy.assignment_fee_target"
            newValue={policy.assignment_fee_target ?? null}
          />
          {offerMenuFeeMetadata ? (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-text-secondary">
              <span>
                Policy: {fmt$(offerMenuFeeMetadata.policy_band_amount ?? null, 0)} | Effective:{" "}
                {fmt$(offerMenuFeeMetadata.effective_amount ?? null, 0)}
              </span>
              {offerMenuFeeMetadata.source === "user_override" ? (
                <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[11px] font-semibold text-amber-200">
                  Override
                </span>
              ) : offerMenuFeeMetadata.source === "policy_band" ? (
                <span className="rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-[11px] font-semibold text-text-secondary">
                  Policy default
                </span>
              ) : null}
            </div>
          ) : null}

          <InputField
            label="List Commission Override %"
            type="number"
            suffix="%"
            value={
              costs.list_commission_pct != null
                ? costs.list_commission_pct * 100
                : ""
            }
            onChange={(e: any) => {
              const raw = e.target.value;
              setDealValue(
                "costs.list_commission_pct",
                raw == null || raw === "" ? null : parseFloat(raw) / 100,
              );
            }}
            placeholder={`${commissionDefault}% (Policy)`}
            disabled={!canEditPolicy}
          />
          <LockedHint
            tokenKey="costs.list_commission_pct"
            newValue={costs.list_commission_pct ?? null}
          />

          <InputField
            label="Sell Close Costs %"
            type="number"
            suffix="%"
            value={Number(costs.sell_close_pct ?? 0) * 100}
            onChange={(e: any) => {
              const raw = e.target.value;
              setDealValue(
                "costs.sell_close_pct",
                raw == null || raw === "" ? null : parseFloat(raw) / 100,
              );
            }}
            min="0"
            max="30"
            step="0.1"
            placeholder={`${sellCloseDefault}% (Policy)`}
            disabled={!canEditPolicy}
          />
          <LockedHint
            tokenKey="costs.sell_close_pct"
            newValue={costs.sell_close_pct ?? null}
          />

          <InputField
            label="Seller Concessions %"
            type="number"
            suffix="%"
            value={Number(costs.concessions_pct ?? 0) * 100}
            onChange={(e: any) => {
              const raw = e.target.value;
              setDealValue(
                "costs.concessions_pct",
                raw == null || raw === "" ? null : parseFloat(raw) / 100,
              );
            }}
            min="0"
            max="30"
            step="0.1"
            placeholder={`${concessionsDefault}% (Policy)`}
            disabled={!canEditPolicy}
          />
          <LockedHint
            tokenKey="costs.concessions_pct"
            newValue={costs.concessions_pct ?? null}
          />

          <InputField
            label="Safety Margin on AIV %"
            type="number"
            suffix="%"
            value={Number(policy.safety_on_aiv_pct ?? 0) * 100}
            onChange={(e: any) => {
              const raw = e.target.value;
              setDealValue(
                "policy.safety_on_aiv_pct",
                raw == null || raw === "" ? null : parseFloat(raw) / 100,
              );
            }}
            min="0"
            max="10"
            step="0.1"
            placeholder={`${sandboxAny.aivSafetyCapPercentage || 3}% (Policy)`}
            disabled={!canEditPolicy}
          />
          <LockedHint
            tokenKey="policy.safety_on_aiv_pct"
            newValue={policy.safety_on_aiv_pct ?? null}
          />

          <InputField
            label="Min Spread"
            type="number"
            prefix="$"
            value={policy.min_spread ?? ""}
            onChange={(e: any) => setDealValue("policy.min_spread", e.target.value)}
            placeholder={getMinSpreadPlaceholder()}
            disabled={!canEditPolicy}
          />
          <LockedHint
            tokenKey="policy.min_spread"
            newValue={policy.min_spread ?? null}
          />

          <InputField
            label="Monthly Interest"
            type="number"
            prefix="$"
            min="0"
            value={costs.monthly.interest ?? ""}
            onChange={(e: any) => setDealValue("costs.monthly.interest", e.target.value)}
            disabled={!canEditPolicy}
          />
          <LockedHint
            tokenKey="costs.monthly.interest"
            newValue={costs.monthly.interest ?? null}
          />

          <ToggleSwitch
            label="Costs Are Annual"
            checked={!!policy.costs_are_annual}
            onChange={() =>
              setDealValue("policy.costs_are_annual", !policy.costs_are_annual)
            }
          />
        </div>
      </UnderwritingSection>

      {/* Timeline & Legal */}
      <UnderwritingSection title="Timeline & Legal" icon={Icons.alert}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 items-end">
          <div className="pt-4 md:col-span-2">
            <ToggleSwitch
              label="Foreclosure Sale (Certificate of Title Issued)"
              checked={!!property.is_foreclosure_sale}
              onChange={() =>
                setDealValue(
                  "property.is_foreclosure_sale",
                  !property.is_foreclosure_sale,
                )
              }
            />
          </div>
          <div className="pt-4 md:col-span-2">
            <ToggleSwitch
              label="10-Day Redemption Period Applies"
              checked={!!property.is_redemption_period_sale}
              onChange={() =>
                setDealValue(
                  "property.is_redemption_period_sale",
                  !property.is_redemption_period_sale,
                )
              }
            />
          </div>

          <InputField
            label="Case No."
            value={legal.case_no ?? ""}
            onChange={(e: any) => setDealValue("legal.case_no", e.target.value)}
          />
          <InputField
            label="Auction Date"
            type="date"
            value={timeline.auction_date ?? ""}
            onChange={(e: any) => setDealValue("timeline.auction_date", e.target.value)}
          />
          <InputField
            label="Planned Close"
            type="number"
            suffix="days"
            value={policy.planned_close_days ?? ""}
            onChange={(e: any) => setDealValue("policy.planned_close_days", e.target.value)}
            disabled={!canEditPolicy}
          />
          <LockedHint
            tokenKey="policy.planned_close_days"
            newValue={policy.planned_close_days ?? null}
          />
          <InputField
            label="Manual Days to Money"
            placeholder="Overrides auto-calc"
            type="number"
            suffix="days"
            min="0"
            value={policy.manual_days_to_money ?? ""}
            onChange={(e: any) =>
              setDealValue(
                "policy.manual_days_to_money",
                e.target.value === "" ? null : e.target.value,
              )
            }
            disabled={!canEditPolicy}
          />
          <LockedHint
            tokenKey="policy.manual_days_to_money"
            newValue={policy.manual_days_to_money ?? null}
          />
        </div>
      </UnderwritingSection>

      {/* Scenario Modeler */}
      <UnderwritingSection title="Scenario Modeler" icon={Icons.lightbulb}>
        <ScenarioModeler deal={deal} setDealValue={setDealValue} sandbox={sandbox} calc={calc} />
      </UnderwritingSection>

      {/* Double Close Calculator */}
      <UnderwritingSection title="HPS Double Closing Cost Calculator" icon={Icons.calculator}>
        <DoubleCloseCalculator deal={deal} calc={calc} setDealValue={setDealValue} />
      </UnderwritingSection>

      <Modal
        open={overrideTarget !== null}
        onClose={closeOverrideModal}
        title={overrideTarget === "arv" ? "Override ARV" : "Override As-Is Value"}
      >
        <div className="space-y-3">
          <InputField
            label={overrideTarget === "arv" ? "ARV" : "As-Is Value"}
            type="number"
            prefix="$"
            value={overrideValue}
            onChange={(e: any) => {
              const raw = e.target.value;
              setOverrideValue(raw == null ? "" : raw);
            }}
          />
          <div className="space-y-1">
            <label htmlFor={overrideReasonId} className="text-sm text-text-primary">
              Reason (required)
            </label>
            <textarea
              id={overrideReasonId}
              aria-describedby={overrideReasonHelpId}
              className="w-full rounded-md border border-white/10 bg-white/5 px-2 py-2 text-sm text-text-primary focus:border-accent-blue/60 focus:outline-none"
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              minLength={10}
              rows={3}
            />
            <p id={overrideReasonHelpId} className="text-[11px] text-text-secondary">
              Minimum 10 characters.
            </p>
          </div>
          {overrideLocalError && (
            <div className="rounded-md border border-red-400/40 bg-red-500/10 px-3 py-2 text-xs text-red-100">
              {overrideLocalError}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={closeOverrideModal} disabled={overrideSubmitting}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleOverrideSubmit}
              disabled={overrideSubmitting}
            >
              {overrideSubmitting || overrideSaving ? "Saving..." : "Save Override"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default UnderwriteTab;
