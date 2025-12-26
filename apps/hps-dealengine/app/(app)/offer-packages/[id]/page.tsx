"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { GlassCard, Button } from "@/components/ui";
import { fetchOfferPackageById, type OfferPackageRow } from "@/lib/offerPackages";

const USD_0 = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const fmtUsd0 = (value: number | null | undefined) => {
  if (value == null) return "-";
  return Number.isFinite(value) ? USD_0.format(value) : "-";
};

const fmtText = (value: unknown) => {
  if (typeof value === "string" && value.trim().length > 0) return value.trim();
  return "-";
};

export default function OfferPackagePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const dealId = searchParams?.get("dealId") ?? null;
  const offerPackageId =
    typeof params?.id === "string"
      ? params.id
      : Array.isArray(params?.id)
      ? params.id[0]
      : "";

  const [row, setRow] = useState<OfferPackageRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!offerPackageId) {
      setError("Offer package id not provided.");
      setLoading(false);
      return;
    }

    let active = true;
    const load = async () => {
      try {
        const data = await fetchOfferPackageById(offerPackageId);
        if (!active) return;
        if (!data) {
          setError("Offer package not found.");
          setLoading(false);
          return;
        }
        setRow(data);
        setLoading(false);
      } catch (err: any) {
        if (!active) return;
        setError(err?.message ?? "Unable to load offer package.");
        setLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [offerPackageId]);

  const payload = (row?.payload ?? {}) as Record<string, any>;
  const deal = (payload.deal ?? {}) as Record<string, any>;
  const dealAddress = (deal.address ?? {}) as Record<string, any>;
  const client = (deal.client ?? {}) as Record<string, any>;
  const offer = (payload.offer ?? {}) as Record<string, any>;
  const keyNumbers = (payload.key_numbers ?? {}) as Record<string, any>;
  const provenance = (payload.valuation_provenance ?? {}) as Record<string, any>;
  const policyHash = payload.policy_hash ?? null;

  const offerAmount = useMemo(
    () => fmtUsd0(Number(offer.amount)),
    [offer.amount],
  );

  const addressLine =
    fmtText(dealAddress.full) !== "-"
      ? fmtText(dealAddress.full)
      : fmtText(dealAddress.line1);

  const generatedAt = row?.created_at
    ? new Date(row.created_at).toLocaleString()
    : "-";

  if (loading) {
    return (
      <div className="text-sm text-text-secondary">Loading offer package...</div>
    );
  }

  if (error) {
    return (
      <GlassCard className="p-6">
        <div className="text-sm text-red-200">{error}</div>
      </GlassCard>
    );
  }

  return (
    <div className="offer-package-page space-y-6" data-testid="offer-package-page">
      <div className="flex flex-wrap items-center justify-between gap-3" data-print-hide>
        <div className="space-y-1">
          <p className="text-xs uppercase text-text-secondary">Offer Package</p>
          <h1 className="text-2xl font-semibold text-text-primary">Seller Offer</h1>
        </div>
        <div className="flex items-center gap-2">
          {dealId ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => router.push(`/overview?dealId=${dealId}`)}
            >
              Back to Dashboard
            </Button>
          ) : null}
          <Button size="sm" variant="primary" onClick={() => window.print()}>
            Print / Save PDF
          </Button>
        </div>
      </div>

      <GlassCard className="p-6 space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="md:col-span-2 space-y-2">
            <p className="text-xs uppercase text-text-secondary">Property</p>
            <div className="text-xl font-semibold text-text-primary">
              {addressLine}
            </div>
            <div className="text-sm text-text-secondary">
              {fmtText(dealAddress.city)} {fmtText(dealAddress.state)} {fmtText(dealAddress.zip)}
            </div>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase text-text-secondary">Offer Price</p>
            <div className="text-2xl font-semibold text-text-primary" data-testid="offer-package-amount">
              {offerAmount}
            </div>
            <p className="text-xs text-text-secondary mt-2">Currency: USD</p>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase text-text-secondary">Client</p>
            <div className="text-sm text-text-primary">{fmtText(client.name)}</div>
            <div className="text-xs text-text-secondary mt-1">{fmtText(client.phone)}</div>
            <div className="text-xs text-text-secondary">{fmtText(client.email)}</div>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase text-text-secondary">Key Numbers</p>
            <div className="text-sm text-text-primary">ARV: {fmtUsd0(keyNumbers.arv)}</div>
            <div className="text-sm text-text-primary">AIV: {fmtUsd0(keyNumbers.aiv)}</div>
            <div className="text-sm text-text-primary">
              Repairs: {fmtUsd0(keyNumbers.repairs)}
            </div>
            <div className="text-sm text-text-primary">
              Carry: {fmtText(keyNumbers.carry_months)} months
            </div>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase text-text-secondary">Terms</p>
            <div className="text-sm text-text-primary">Closing window: -</div>
            <div className="text-sm text-text-primary">Inspection period: -</div>
            <div className="text-sm text-text-primary">Assignment: -</div>
          </div>
        </div>
      </GlassCard>

      <GlassCard className="p-6 space-y-4">
        <div className="text-sm font-semibold text-text-primary">Provenance</div>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-xs text-text-secondary">
            <div>Run ID: {fmtText(row?.run_id)}</div>
            <div>Policy snapshot: {row?.policy_snapshot ? "present" : "missing"}</div>
            <div>Policy hash: {fmtText(policyHash)}</div>
            <div>Generated: {generatedAt}</div>
            <div>Payload hash: {fmtText(row?.payload_hash)}</div>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-xs text-text-secondary">
            <div>ARV source: {fmtText(provenance.arv_source)}</div>
            <div>ARV as of: {fmtText(provenance.arv_as_of)}</div>
            <div>ARV valuation run: {fmtText(provenance.arv_valuation_run_id)}</div>
            <div>As-is source: {fmtText(provenance.as_is_value_source)}</div>
            <div>As-is as of: {fmtText(provenance.as_is_value_as_of)}</div>
            <div>As-is valuation run: {fmtText(provenance.as_is_value_valuation_run_id)}</div>
          </div>
        </div>
      </GlassCard>

      <style jsx global>{`
        @media print {
          header,
          nav,
          footer,
          [data-print-hide] {
            display: none !important;
          }

          body {
            background: #ffffff !important;
            color: #0b1424 !important;
          }

          main {
            background: #ffffff !important;
          }

          .offer-package-page .info-card,
          .offer-package-page .glass-card,
          .offer-package-page .shadow,
          .offer-package-page .backdrop-blur {
            box-shadow: none !important;
          }
        }
      `}</style>
    </div>
  );
}
