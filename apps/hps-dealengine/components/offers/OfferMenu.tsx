import React from "react";

import { GlassCard } from "@/components/ui";

type CashGateStatus = "pass" | "shortfall" | "unknown";

type OfferMenuCashTier = {
  price: number | null;
  close_window_days: number | null;
  terms_posture_key: string | null;
  notes: string | null;
  cash_gate_status?: CashGateStatus | null;
  cash_deficit?: number | null;
};

type OfferMenuCash = {
  status: "CASH_OFFER" | "CASH_SHORTFALL" | null;
  spread_to_payoff: number | null;
  shortfall_amount: number | null;
  gap_flag?: "no_gap" | "narrow_gap" | "wide_gap" | null;
  fee_metadata: {
    policy_band_amount: number | null;
    effective_amount: number | null;
    source: "policy_band" | "user_override" | null;
  } | null;
  tiers: {
    fastpath: OfferMenuCashTier | null;
    standard: OfferMenuCashTier | null;
    premium: OfferMenuCashTier | null;
  } | null;
} | null;

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

function OfferMenuStatusPill(props: {
  status: "CASH_OFFER" | "CASH_SHORTFALL" | null | undefined;
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

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="text-sm font-semibold">{props.label}</div>
        <CashGatePill
          status={tier?.cash_gate_status ?? null}
          deficit={tier?.cash_deficit ?? null}
        />
      </div>

      <div className="mt-2 text-2xl font-semibold">{fmtUsd0(tier?.price ?? null)}</div>

      <div className="mt-1 text-xs text-muted-foreground">
        Close window: {fmtDays(tier?.close_window_days ?? null)}
      </div>

      {tier?.notes ? (
        <div className="mt-2 text-xs text-muted-foreground">{tier.notes}</div>
      ) : null}
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
