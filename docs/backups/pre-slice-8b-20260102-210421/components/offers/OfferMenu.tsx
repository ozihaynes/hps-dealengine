import React from "react";
import { GlassCard } from "@/components/ui";
import type { AnalyzeOutputs } from "@hps-internal/contracts";

type OfferMenuCash = AnalyzeOutputs["offer_menu_cash"];
type OfferMenuCashNonNull = NonNullable<OfferMenuCash>;
type OfferMenuCashTiers = NonNullable<OfferMenuCashNonNull["tiers"]>;
type OfferMenuCashTier = OfferMenuCashTiers["standard"];
type OfferMenuCashTierNonNull = NonNullable<OfferMenuCashTier>;
type OfferMenuTierEligibility = NonNullable<OfferMenuCashTierNonNull["eligibility"]>;
type CashGateStatus = OfferMenuCashTierNonNull["cash_gate_status"];
type GateStatus = OfferMenuTierEligibility["risk_gate_status"];
type OfferMenuStatus = OfferMenuCashNonNull["status"];

const USD0 = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function fmtUsd0(v: number | null | undefined): string {
  if (typeof v !== "number" || !Number.isFinite(v)) return "-";
  return USD0.format(v);
}

function fmtDays(v: number | null | undefined): string {
  if (typeof v !== "number" || !Number.isFinite(v)) return "-";
  return `${v} days`;
}

function fmtGateStatus(v: GateStatus | null | undefined): string {
  const s = v ?? null;
  if (s == null) return "-";
  if (s === "pass") return "Pass";
  if (s === "watch") return "Watch";
  if (s === "fail") return "Fail";
  return "Info needed";
}

function CashGatePill(props: {
  status: CashGateStatus | null | undefined;
  deficit: number | null | undefined;
}) {
  const status = props.status ?? null;

  if (status == null || status === "unknown") {
    return <span className="text-xs text-muted-foreground">Cash gate: -</span>;
  }

  if (status === "pass") {
    return (
      <span className="rounded-full bg-emerald-500/15 px-2 py-1 text-xs text-emerald-200">
        Cash gate: Pass
      </span>
    );
  }

  return (
    <span className="rounded-full bg-amber-500/15 px-2 py-1 text-xs text-amber-200">
      Cash gate: Shortfall ({fmtUsd0(props.deficit ?? null)})
    </span>
  );
}

function EligibilityPill(props: { eligibility: OfferMenuTierEligibility | null | undefined }) {
  const e = props.eligibility ?? null;

  if (e == null || e.enabled == null) {
    return <span className="text-xs text-muted-foreground">Eligibility: -</span>;
  }

  if (e.enabled === false) {
    const isNeedsInfo = e.evidence_gate_status === "info_needed";
    return (
      <span
        className={`rounded-full px-2 py-1 text-xs font-semibold ${
          isNeedsInfo
            ? "bg-amber-500/15 text-amber-200"
            : "bg-rose-500/15 text-rose-200"
        }`}
      >
        Eligibility: {isNeedsInfo ? "Needs info" : "Blocked"}
      </span>
    );
  }

  const isWatch = e.risk_gate_status === "watch" || e.evidence_gate_status === "watch";

  return (
    <span
      className={`rounded-full px-2 py-1 text-xs font-semibold ${
        isWatch ? "bg-amber-500/15 text-amber-200" : "bg-emerald-500/15 text-emerald-200"
      }`}
    >
      Eligibility: {isWatch ? "Review" : "Eligible"}
    </span>
  );
}

function EligibilityDetails(props: { eligibility: OfferMenuTierEligibility | null | undefined }) {
  const e = props.eligibility ?? null;
  if (e == null) return null;

  const blockingGateKeys = e.blocking_gate_keys ?? null;
  const blockingEvidenceKinds = e.blocking_evidence_kinds ?? null;
  const reasons = e.reasons ?? null;

  return (
    <div className="mt-2 text-xs text-muted-foreground">
      <div>
        Risk gate: {fmtGateStatus(e.risk_gate_status)} | Evidence gate:{" "}
        {fmtGateStatus(e.evidence_gate_status)}
      </div>

      {blockingGateKeys && blockingGateKeys.length > 0 ? (
        <div className="mt-1">- Blocking risk gates: {blockingGateKeys.join(", ")}</div>
      ) : null}

      {blockingEvidenceKinds && blockingEvidenceKinds.length > 0 ? (
        <div className="mt-1">- Blocking evidence: {blockingEvidenceKinds.join(", ")}</div>
      ) : null}

      {reasons && reasons.length > 0 ? (
        <div className="mt-1">- Reasons: {reasons.join(", ")}</div>
      ) : null}
    </div>
  );
}

function OfferMenuStatusPill(props: {
  status: OfferMenuStatus | null | undefined;
  spreadToPayoff: number | null | undefined;
  shortfallAmount: number | null | undefined;
}) {
  const status = props.status ?? null;

  if (status == null) {
    return (
      <span className="rounded-full bg-white/5 px-2 py-1 text-xs text-muted-foreground">
        Cash: -
      </span>
    );
  }

  if (status === "CASH_OFFER") {
    return (
      <span className="rounded-full bg-emerald-500/15 px-2 py-1 text-xs text-emerald-200">
        Cash Offer (Spread {fmtUsd0(props.spreadToPayoff ?? null)})
      </span>
    );
  }

  return (
    <span className="rounded-full bg-amber-500/15 px-2 py-1 text-xs text-amber-200">
      Cash (Shortfall {fmtUsd0(props.shortfallAmount ?? null)})
    </span>
  );
}

function TierCard(props: { label: string; tier: OfferMenuCashTier | null }) {
  const tier = props.tier;
  const isBlocked = tier?.eligibility?.enabled === false;

  return (
    <div
      className={`rounded-xl border border-white/10 bg-white/5 p-4 ${isBlocked ? "opacity-60" : ""}`}
      aria-disabled={isBlocked ? true : undefined}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="text-sm font-semibold">{props.label}</div>

        <div className="flex flex-col items-end gap-2">
          <EligibilityPill eligibility={tier?.eligibility ?? null} />
          <CashGatePill
            status={tier?.cash_gate_status ?? null}
            deficit={tier?.cash_deficit ?? null}
          />
        </div>
      </div>

      <div className="mt-2 text-2xl font-semibold">{fmtUsd0(tier?.price ?? null)}</div>

      <div className="mt-1 text-xs text-muted-foreground">
        Close window: {fmtDays(tier?.close_window_days ?? null)}
      </div>

      {tier?.notes ? <div className="mt-2 text-xs text-muted-foreground">{tier.notes}</div> : null}

      <EligibilityDetails eligibility={tier?.eligibility ?? null} />
    </div>
  );
}

export default function OfferMenu(props: { offerMenuCash: OfferMenuCash }) {
  const menu = props.offerMenuCash ?? null;
  const tiers = menu?.tiers ?? null;

  return (
    <GlassCard className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">Offer Menu</div>
          <div className="text-xs text-muted-foreground">
            Rendered from engine outputs (no UI math).
          </div>
        </div>

        <OfferMenuStatusPill
          status={menu?.status ?? null}
          spreadToPayoff={menu?.spread_to_payoff ?? null}
          shortfallAmount={menu?.shortfall_amount ?? null}
        />
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <TierCard label="FastPath" tier={tiers?.fastpath ?? null} />
        <TierCard label="Standard" tier={tiers?.standard ?? null} />
        <TierCard label="Premium" tier={tiers?.premium ?? null} />
      </div>
    </GlassCard>
  );
}
