import React from "react";
import type { Deal, EngineCalculations, SandboxConfig } from "../../types";
import { GlassCard, Button, InputField, SelectField, ToggleSwitch, Icon } from "../ui";
import { InfoTooltip } from "../ui/InfoTooltip";
import ScenarioModeler from "./ScenarioModeler";
import DoubleCloseCalculator from "./DoubleCloseCalculator";
import { num, fmt$ } from "../../utils/helpers";
import { Icons } from "../../constants";
import { getLastAnalyzeResult, subscribeAnalyzeResult } from "../../lib/analyzeBus";
import type { PropertySnapshot, ValuationRun } from "@hps-internal/contracts";
import CompsPanel from "./CompsPanel";

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
  calc: EngineCalculations;
  setDealValue: (path: string, value: any) => void;
  sandbox: SandboxConfig;
  canEditPolicy: boolean;
  onRequestOverride: (tokenKey: string, newValue: unknown) => void;
  valuationRun?: ValuationRun | null;
  valuationSnapshot?: PropertySnapshot | null;
  minClosedComps?: number | null;
  onRefreshValuation?: () => void;
  refreshingValuation?: boolean;
  valuationError?: string | null;
}

const UnderwriteTab: React.FC<UnderwriteTabProps> = ({
  deal,
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
}) => {
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
  const arvRangeLow = valuationRun?.output?.arv_range_low ?? null;
  const arvRangeHigh = valuationRun?.output?.arv_range_high ?? null;
  const compCount = valuationRun?.output?.comp_count ?? null;
  const valuationConfidence = valuationRun?.output?.valuation_confidence ?? null;
  const compStats = valuationRun?.output?.comp_set_stats ?? null;
  const provenance = valuationRun?.provenance ?? null;

  // Live engine outputs from Edge (via /underwrite/debug → analyzeBus)
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
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-text-secondary">
          <span className="font-semibold text-text-primary">Valuation Confidence:</span>{" "}
          {valuationConfidence ?? "-"}{" "}
          {compCount != null
            ? `(Comps: ${compCount}${
                minClosedComps != null ? ` / min ${minClosedComps}` : " / policy missing"
              })`
            : ""}
        </div>
        <div className="flex gap-2">
          <Button
            variant="neutral"
            size="sm"
            onClick={() => onRefreshValuation?.()}
            disabled={refreshingValuation || !onRefreshValuation}
          >
            {refreshingValuation ? "Refreshing..." : "Refresh Valuation"}
          </Button>
          {suggestedArv != null && (market.arv == null || market.arv === "") && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setDealValue("market.arv", suggestedArv)}
            >
              Use Suggested ARV
            </Button>
          )}
        </div>
      </div>
      {valuationError && (
        <div className="rounded-md border border-red-400/40 bg-red-500/10 px-3 py-2 text-sm text-red-100">
          {valuationError}
        </div>
      )}
      {minClosedComps == null && (
        <div className="rounded-md border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
          Policy token missing: valuation.min_closed_comps_required
        </div>
      )}

      {/* Market & Valuation */}
      <UnderwritingSection title="Market & Valuation" icon={Icons.barChart}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <InputField
            label="ARV"
            type="number"
            prefix="$"
            value={market.arv ?? ""}
            onChange={(e: any) => setDealValue("market.arv", e.target.value)}
            warning={arvWarning}
            helpKey="arv"
          />
          <InputField
            label="As-Is Value"
            type="number"
            prefix="$"
            value={market.as_is_value ?? ""}
            onChange={(e: any) => setDealValue("market.as_is_value", e.target.value)}
            warning={arvWarning}
            helpKey="aiv"
          />
          {/* Units in label to avoid suffix overlap */}
          <InputField
            label="DOM (Zip, days)"
            type="number"
            value={market.dom_zip ?? ""}
            onChange={(e: any) => setDealValue("market.dom_zip", e.target.value)}
          />
          <InputField
            label="MOI (Zip, months)"
            type="number"
            value={market.moi_zip ?? ""}
            onChange={(e: any) => setDealValue("market.moi_zip", e.target.value)}
          />
          <InputField
            label="Price-to-List %"
            type="number"
            suffix="%"
            value={
              market["price-to-list-pct"] != null
                ? Number(market["price-to-list-pct"]) * 100
                : null
            }
            onChange={(e: any) => {
              const raw = e.target.value;
              const next =
                raw === "" || raw === null || raw === undefined
                  ? null
                  : parseFloat(raw) / 100;
              setDealValue("market.price-to-list-pct", next);
            }}
          />
          <InputField
            label="Local Discount (20th %)"
            type="number"
            suffix="%"
            value={
              market.local_discount_20th_pct != null
                ? Number(market.local_discount_20th_pct) * 100
                : null
            }
            onChange={(e: any) => setDealValue("market.local_discount_20th_pct", e.target.value)}
          />
        </div>
        {suggestedArv != null && (
          <div className="flex flex-wrap items-center gap-3 text-sm text-text-secondary">
            <span>
              Suggested ARV:{" "}
              <span className="font-semibold text-text-primary">{fmt$(suggestedArv, 0)}</span>
            </span>
            {arvRangeLow != null && arvRangeHigh != null && (
              <span>
                Range: {fmt$(arvRangeLow, 0)} - {fmt$(arvRangeHigh, 0)}
              </span>
            )}
            <span>
              Valuation Confidence:{" "}
              <span className="font-semibold text-text-primary">
                {valuationConfidence ?? "-"}
              </span>
            </span>
            {compStats && (
              <span>
                Comp Stats: {compCount ?? "-"} comps, med dist {compStats.median_distance_miles ?? "-"} mi, med corr{" "}
                {compStats.median_correlation ?? "-"}, med days-old {compStats.median_days_old ?? "-"}
              </span>
            )}
            <span className="rounded border border-white/10 px-2 py-1">
              Provider: {provenance?.provider_name ?? provenance?.source ?? "-"}{" "}
              {provenance?.stub ? "(stub)" : ""}
            </span>
            <span className="rounded border border-white/10 px-2 py-1">
              As of: {valuationSnapshot?.as_of ? new Date(valuationSnapshot.as_of).toLocaleDateString() : "-"}
            </span>
            {market.arv != null && market.arv !== "" && (
              <Button
                size="sm"
                variant="neutral"
                onClick={() => setDealValue("market.arv", suggestedArv)}
              >
                Use Suggested
              </Button>
            )}
          </div>
        )}
      </UnderwritingSection>

      {valuationSnapshot && Array.isArray(valuationSnapshot.comps) && (
        <CompsPanel
          comps={valuationSnapshot.comps as any}
          snapshot={valuationSnapshot}
          minClosedComps={minClosedComps}
        />
      )}

      {/* Property & Risk */}
      <UnderwritingSection title="Property & Risk" icon={Icons.shield}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-3">
            <SelectField
              label="Occupancy"
              value={property.occupancy}
              onChange={(e: any) => setDealValue("property.occupancy", e.target.value)}
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
              onChange={(e: any) => setDealValue("property.county", e.target.value)}
            />
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
            onChange={(e: any) => setDealValue("policy.assignment_fee_target", e.target.value)}
            placeholder="Optional"
            disabled={!canEditPolicy}
          />
          <LockedHint
            tokenKey="policy.assignment_fee_target"
            newValue={policy.assignment_fee_target ?? null}
          />

          <InputField
            label="List Commission Override %"
            type="number"
            suffix="%"
            value={
              costs.list_commission_pct != null
                ? costs.list_commission_pct * 100
                : ""
            }
            onChange={(e: any) =>
              setDealValue(
                "costs.list_commission_pct",
                e.target.value === "" ? null : parseFloat(e.target.value) / 100,
              )
            }
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
            onChange={(e: any) =>
              setDealValue("costs.sell_close_pct", parseFloat(e.target.value) / 100)
            }
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
            onChange={(e: any) =>
              setDealValue("costs.concessions_pct", parseFloat(e.target.value) / 100)
            }
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
            onChange={(e: any) =>
              setDealValue("policy.safety_on_aiv_pct", parseFloat(e.target.value) / 100)
            }
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
    </div>
  );
};

export default UnderwriteTab;
