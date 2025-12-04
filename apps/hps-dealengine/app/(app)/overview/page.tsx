"use client";

export const dynamic = "force-dynamic";

import React, { useState, useMemo, useCallback, useEffect } from "react";
import OverviewTab from "@/components/overview/OverviewTab";
import { Button, GlassCard } from "@/components/ui";
import { DealHealthStrip } from "@/components/overview/DealHealthStrip";
import { GuardrailsCard } from "@/components/overview/GuardrailsCard";
import { buildOverviewGuardrailsView } from "@/lib/overviewGuardrails";
import { StrategyPostureCard } from "@/components/overview/StrategyPostureCard";
import { buildStrategyViewModel } from "@/lib/overviewStrategy";
import {
  buildEvidenceView,
  buildRiskView,
  buildTimelineView,
} from "@/lib/overviewRiskTimeline";
import { RiskComplianceCard } from "@/components/overview/RiskComplianceCard";
import { TimelineCarryCard } from "@/components/overview/TimelineCarryCard";
import { DataEvidenceCard } from "@/components/overview/DataEvidenceCard";

import { createInitialEstimatorState } from "../../../lib/ui-v2-constants";
import type { Deal } from "../../../types";

import { DoubleClose, type DoubleCloseCalcs } from "../../../services/engine";
import { fmt$ } from "../../../utils/helpers";
import { useDealSession } from "@/lib/dealSessionContext";
import StrategistPanel from "@/components/underwrite/StrategistPanel";
import { mergePostureAwareValues } from "@/lib/sandboxPolicy";
import { listEvidence } from "@/lib/evidence";
import {
  buildEvidenceStatus,
  type EvidenceKind,
} from "@/lib/evidenceFreshness";
import { listPolicyOverridesForDealOrRun } from "@/lib/policyOverrides";
import { summarizeStrategistContext } from "@/lib/strategistContext";
import {
  extractContactFromDeal,
  extractContactFromPayload,
  formatAddressLine,
} from "@/lib/deals";

/**
 * Ensure the Deal has the shape OverviewTab + engine expect.
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
 * Build a robust initial Deal that matches what OverviewTab expects.
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

  // 2) Final defensive fallback: just the fields OverviewTab/engine touch
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

export default function Page() {
  // Shared state coming from DealSession (same session as /underwrite)
  const {
    deal: rawDeal,
    lastAnalyzeResult,
    dbDeal,
    posture,
    lastRunId,
    sandbox,
  } = useDealSession();

  // Always normalize the shape so OverviewTab + engine get what they expect
  const deal = useMemo(
    () => normalizeDealShape(rawDeal ?? makeInitialDeal()),
    [rawDeal],
  );
  const effectiveSandbox = useMemo(
    () => mergePostureAwareValues(sandbox, posture),
    [sandbox, posture],
  );

  const [playbookContent, setPlaybookContent] = useState<string>("");
  const [analysisRun, setAnalysisRun] = useState(false);
  const [strategistPrompt, setStrategistPrompt] = useState<string>(
    "Provide a negotiation-ready strategy, risks, evidence gaps, and next actions for this deal.",
  );
  const [strategistContext, setStrategistContext] = useState<string>("");
  const [showContactCard, setShowContactCard] = useState(false);

  const contactInfo = useMemo(() => {
    return (
      extractContactFromPayload(deal as any) ??
      extractContactFromPayload(dbDeal?.payload ?? null) ??
      extractContactFromDeal(dbDeal)
    );
  }, [deal, dbDeal]);

  const hasContactInfo = useMemo(() => {
    if (!contactInfo) return false;
    const parts = [
      contactInfo.name,
      contactInfo.phone,
      contactInfo.email,
    ].map((value) => (typeof value === "string" ? value.trim() : ""));
    return parts.some((value) => value.length > 0);
  }, [contactInfo]);

  const contactName = hasContactInfo
    ? (contactInfo?.name?.trim() || "Client")
    : "Client info not set";
  const contactPhone = hasContactInfo && contactInfo?.phone
    ? contactInfo.phone
    : "Phone not provided";
  const contactEmail = hasContactInfo && contactInfo?.email
    ? contactInfo.email
    : "Email not provided";

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
    setShowContactCard(false);
  }, [dbDeal?.id, contactName]);

  // Canonical outputs from the last analyze (from Edge/runs)
  const calc: any = useMemo(() => {
    const persisted = lastAnalyzeResult as any;
    return {
      ...(persisted?.calculations ?? {}),
      ...(persisted?.outputs ?? {}),
    };
  }, [lastAnalyzeResult]);

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
    () => buildStrategyViewModel((lastAnalyzeResult as any)?.outputs ?? null),
    [lastAnalyzeResult],
  );

  const riskView = useMemo(
    () => buildRiskView((lastAnalyzeResult as any)?.outputs ?? null),
    [lastAnalyzeResult],
  );

  const timelineView = useMemo(
    () => buildTimelineView((lastAnalyzeResult as any)?.outputs ?? null, calc),
    [lastAnalyzeResult, calc],
  );

  const evidenceView = useMemo(
    () => buildEvidenceView((lastAnalyzeResult as any)?.outputs ?? null),
    [lastAnalyzeResult],
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

  // Build strategist context from run output + sandbox + evidence/overrides
  useEffect(() => {
    const load = async () => {
      if (!dbDeal?.id || !lastRunId) return;
      try {
        const evidence = await listEvidence({ dealId: dbDeal.id, runId: lastRunId });
        const evidenceStatus = buildEvidenceStatus(
          evidence,
          ["payoff_letter", "title_quote", "insurance_quote", "repair_bid"] as EvidenceKind[],
        );
        const overrides = await listPolicyOverridesForDealOrRun({
          dealId: dbDeal.id,
          runId: lastRunId,
          orgId: dbDeal.org_id,
          posture,
          approvedOnly: true,
          includeDealIdNullForPosture: true,
        });
        const approved = overrides.filter((o) => o.status === "approved");
        const contextText = summarizeStrategistContext({
          runOutput: lastAnalyzeResult ?? null,
          sandbox: effectiveSandbox,
          evidenceStatus,
          overrides: approved,
        });
        setStrategistContext(contextText);
      } catch (err) {
        console.error("[overview strategist] context load failed", err);
      }
    };
    void load();
  }, [dbDeal?.id, lastRunId, lastAnalyzeResult, effectiveSandbox]);

  const generatePlaybook = useCallback(() => {
    if (!canAnalyze) return;

    const buyerCeiling = Number(
      calc.buyerCeiling ?? calc.buyer_ceiling ?? 0,
    );
    const respectFloor = Number(
      calc.respectFloorPrice ?? calc.respect_floor ?? 0,
    );
    const wholesaleFee =
      isFinite(buyerCeiling) && isFinite(respectFloor)
        ? buyerCeiling - respectFloor
        : 0;

    const urgencyDays = Number(
      calc.urgencyDays ?? calc.carryMonths ?? 0,
    );
    const dcLoad =
      Number((dcResult as any).Extra_Closing_Load ?? 0) +
      Number((dcResult as any).Total_Double_Close_Cost ?? 0);

    const parts: string[] = [];

    parts.push(
      `<p><strong>Deal snapshot:</strong> Buyer ceiling ${fmt$(
        buyerCeiling,
        0,
      )}, Respect Floor ${fmt$(
        respectFloor,
        0,
      )}, implied spread ${fmt$(
        wholesaleFee,
        0,
      )} before double-close friction.</p>`,
    );

    if (dcLoad > 0) {
      parts.push(
        `<p><strong>Double-close load:</strong> Approx ${fmt$(
          dcLoad,
          0,
        )} in additional closing friction to account for. This reduces true spread to about ${fmt$(
          wholesaleFee - dcLoad,
          0,
        )}.</p>`,
      );
    }

    if (urgencyDays > 0) {
      parts.push(
        `<p><strong>Urgency:</strong> This deal has roughly ${urgencyDays.toFixed(
          0,
        )} days of runway before risk steps up. Present it as “we’re in a ${urgencyDays.toFixed(
          0,
        )}-day window before we have to re-underwrite and the number can move,” not as pressure.</p>`,
      );
    }

    parts.push(
      "<p><strong>Next steps:</strong> 1) Confirm payoffs and arrears. 2) Validate repair scope and timeline. 3) Align exit strategy with capital stack and local DOM.</p>",
    );

    setPlaybookContent(parts.join(""));
    setAnalysisRun(true);
  }, [canAnalyze, calc, dcResult]);

  // Auto-generate the playbook the first time we have a usable analysis
  useEffect(() => {
    if (!lastAnalyzeResult) return;
    if (!canAnalyze) return;
    if (playbookContent) return;

    generatePlaybook();
  }, [lastAnalyzeResult, canAnalyze, playbookContent, generatePlaybook]);

  return (
    <div className="flex flex-col gap-6">
      <GlassCard className="p-4 md:p-5">
        <div
          className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between"
          onMouseLeave={() => setShowContactCard(false)}
        >
          <div>
            <p className="text-xs uppercase text-text-secondary">Property</p>
            <div className="text-lg font-semibold text-text-primary">{propertyAddress}</div>
            {dbDeal?.id && (
              <p className="text-xs text-text-secondary">
                Deal ID {dbDeal.id.slice(0, 8)}…
              </p>
            )}
          </div>
          <div className="relative">
            <p className="text-xs uppercase text-text-secondary">Client</p>
            <button
              type="button"
              className="flex items-center gap-2 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-text-primary hover:border-accent-blue/60 hover:text-accent-blue"
              onClick={() => setShowContactCard((prev) => !prev)}
              onMouseEnter={() => setShowContactCard(true)}
            >
              {contactName}
            </button>
            {showContactCard && (
              <div className="absolute right-0 mt-2 w-64 rounded-lg border border-white/10 bg-surface-elevated/90 p-3 shadow-xl">
                <div className="flex flex-col gap-2 text-sm text-text-primary">
                  {hasContactInfo ? (
                    <>
                      <div>
                        <p className="text-[11px] uppercase text-text-secondary">Phone</p>
                        <p className="font-semibold">{contactPhone}</p>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase text-text-secondary">Email</p>
                        <p className="font-semibold break-words">{contactEmail}</p>
                      </div>
                    </>
                  ) : (
                    <p className="text-[13px] text-text-secondary">
                      Client info not available yet.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </GlassCard>

      <div className="flex flex-col gap-3 rounded-xl border border-white/5 bg-white/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-text-primary tracking-tight">
            Overview
          </h1>
          <p className="text-sm text-text-secondary">
            One-glance snapshot of where this deal sits in the corridor.
          </p>
        </div>

        <Button
          variant="primary"
          disabled={!canAnalyze}
          onClick={generatePlaybook}
        >
          Generate Playbook
        </Button>
      </div>

      <DealHealthStrip view={guardrailsView} />

      <div className="grid gap-4 lg:grid-cols-2">
        <GuardrailsCard view={guardrailsView} />
        <StrategyPostureCard view={strategyView} />
      </div>

      <RiskComplianceCard risk={riskView} />

      <div className="grid gap-4 lg:grid-cols-2">
        <TimelineCarryCard timeline={timelineView} />
        <DataEvidenceCard evidence={evidenceView} />
      </div>

      <div>
        <OverviewTab
          deal={deal}
          calc={calc}
          flags={{}}
          hasUserInput={canAnalyze}
          playbookContent={playbookContent}
          isAnalyzing={false}
          analysisRun={analysisRun}
        />
      </div>

      <div className="mt-6">
        <h2 className="text-lg font-semibold text-text-primary mb-2">
          Strategist (AI)
        </h2>
        <StrategistPanel
          dealId={dbDeal?.id}
          runId={lastRunId ?? undefined}
          posture={posture}
          runOutput={lastAnalyzeResult ?? null}
          runTrace={null}
          policySnapshot={null}
          evidenceSummary={[]}
          defaultPrompt={strategistPrompt}
          contextHint={strategistContext}
        />
      </div>
    </div>
  );
}
